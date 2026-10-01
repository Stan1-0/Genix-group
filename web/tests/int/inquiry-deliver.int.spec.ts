import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { deliverInquiry, retryUnsent, type Mail } from '@/inquiries/deliver'

let payload: Payload
const env = { INQUIRY_TO: 'hello@thegenixgroup.com', INQUIRY_FROM: 'quotes@thegenixgroup.com' }
const opts = { env, phone: '(619) 555-0100', adminOrigin: 'https://thegenixgroup.com' }
const details = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: false, load: 'pallets', pallets: 2 }
async function make(over: Record<string, unknown> = {}) {
  return payload.create({ collection: 'inquiries', data: { reference: `GX-LOG-${String(Math.random()).slice(2, 8)}`, division: 'logistics', type: 'quote', status: 'new', name: 'Ana', phone: '(619) 555-0100', email: 'ana@example.com', details, summary: 's', ...over } })
}

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { for (const c of ['inquiries', 'rate-hits'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } }) })

describe('deliverInquiry', () => {
  it('sends team and customer mail with idempotency keys and marks both sent', async () => {
    const sent: Mail[] = []
    const doc = await make()
    await deliverInquiry(payload, doc.id, async (m) => { sent.push(m) }, opts)
    expect(sent.map((m) => [m.to, m.replyTo, m.idempotencyKey])).toEqual([
      ['hello@thegenixgroup.com', 'ana@example.com', `${doc.reference}:team`],
      ['ana@example.com', 'hello@thegenixgroup.com', `${doc.reference}:customer`],
    ])
    expect(sent[0].from).toBe('Genix Logistics <quotes@thegenixgroup.com>')
    const after = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect([after.emailSent, after.customerEmailSent, after.emailAttempts]).toEqual([true, true, 1])
  })
  it('retries once immediately, then records the failure without throwing', async () => {
    let calls = 0
    const doc = await make({ email: null })
    await deliverInquiry(payload, doc.id, async () => { calls++; throw new Error('resend down') }, opts)
    expect(calls).toBe(2)
    const after = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect([after.emailSent, after.emailAttempts, after.lastEmailError]).toEqual([false, 1, 'resend down'])
  })
  it('skips mails already sent', async () => {
    const sent: Mail[] = []
    const doc = await make({ emailSent: true })
    await deliverInquiry(payload, doc.id, async (m) => { sent.push(m) }, opts)
    expect(sent.map((m) => m.idempotencyKey)).toEqual([`${doc.reference}:customer`])
  })
})

describe('retryUnsent', () => {
  it('retries only unsent inquiries under 5 attempts and prunes old rate hits', async () => {
    const a = await make()
    await make({ emailSent: true, customerEmailSent: true })
    await make({ emailAttempts: 5 })
    await payload.create({ collection: 'rate-hits', data: { ipHash: 'x' } })
    const sent: Mail[] = []
    const r = await retryUnsent(payload, async (m) => { sent.push(m) }, { env, phoneFor: async () => null, adminOrigin: 'https://thegenixgroup.com', now: new Date(Date.now() + 2 * 86_400_000) })
    expect(r).toEqual({ retried: 1, pruned: 1 })
    expect(sent.every((m) => m.idempotencyKey.startsWith(a.reference))).toBe(true)
  })
})
