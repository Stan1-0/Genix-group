import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { createMailer, deliverInquiry, retryUnsent, type Mail } from '@/inquiries/deliver'

let payload: Payload
const env = { INQUIRY_TO: 'hello@thegenixgroup.com', INQUIRY_FROM: 'quotes@thegenixgroup.com' }
const opts = { env, phone: '(619) 555-0100', adminOrigin: 'https://thegenixgroup.com', retryDelayMs: 0 }
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

describe('customer auto-reply limit', () => {
  it('sends at most one customer auto-reply per address per 24 h; team mail still goes', async () => {
    const sent: Mail[] = []
    const mailer = async (m: Mail) => { sent.push(m) }
    const first = await make()
    await deliverInquiry(payload, first.id, mailer, opts)
    const second = await make({ email: 'ana@example.com' })
    await deliverInquiry(payload, second.id, mailer, opts)
    expect(sent.map((m) => m.idempotencyKey)).toEqual([`${first.reference}:team`, `${first.reference}:customer`, `${second.reference}:team`])
    const after = await payload.findByID({ collection: 'inquiries', id: second.id })
    expect([after.emailSent, after.customerEmailSent, after.lastEmailError]).toEqual([true, true, 'customer auto-reply skipped: one per address per 24 h'])
  })
  it('matches the address case-insensitively', async () => {
    const sent: Mail[] = []
    const mailer = async (m: Mail) => { sent.push(m) }
    await deliverInquiry(payload, (await make({ email: 'Ana@Example.com' })).id, mailer, opts)
    const second = await make({ email: 'ana@example.COM' })
    await deliverInquiry(payload, second.id, mailer, opts)
    expect(sent.filter((m) => m.idempotencyKey.endsWith(':customer'))).toHaveLength(1)
    expect((await payload.findByID({ collection: 'inquiries', id: second.id })).customerEmailSent).toBe(true)
  })
})

describe('deliverInquiry failure modes', () => {
  it('records a team failure while still sending the customer mail', async () => {
    const doc = await make()
    await deliverInquiry(payload, doc.id, async (m) => { if (m.idempotencyKey.endsWith(':team')) throw new Error('team boom') }, opts)
    const after = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect([after.emailSent, after.customerEmailSent, after.lastEmailError]).toEqual([false, true, 'team boom'])
  })
  it('waits retryDelayMs before the immediate retry', async () => {
    const at: number[] = []
    const doc = await make({ email: null })
    await deliverInquiry(payload, doc.id, async () => { at.push(Date.now()); throw new Error('down') }, { ...opts, retryDelayMs: 120 })
    expect(at).toHaveLength(2)
    expect(at[1] - at[0]).toBeGreaterThanOrEqual(100)
  })
  it('succeeds when the immediate retry works and clears lastEmailError', async () => {
    let calls = 0
    const doc = await make({ email: null, lastEmailError: 'old' })
    await deliverInquiry(payload, doc.id, async () => { if (calls++ === 0) throw new Error('blip') }, opts)
    const after = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect([calls, after.emailSent, after.lastEmailError ?? null]).toEqual([2, true, null])
  })
})

describe('createMailer', () => {
  it('rejects without RESEND_API_KEY so nothing is marked sent', async () => {
    const mail: Mail = { from: 'a', to: 'b', subject: 's', html: 'h', text: 't', idempotencyKey: 'k' }
    await expect(createMailer({ NODE_ENV: 'production' })(mail)).rejects.toThrow('not sent: no RESEND_API_KEY')
  })
})

describe('retryUnsent', () => {
  const sweepOpts = (now: Date) => ({ env, phoneFor: async () => null, adminOrigin: 'https://thegenixgroup.com', now, retryDelayMs: 0 })
  const later = () => new Date(Date.now() + 2 * 86_400_000)

  it('retries only unsent inquiries under 5 attempts and leaves the rest unchanged', async () => {
    const a = await make()
    const done = await make({ emailSent: true, customerEmailSent: true, email: 'done@example.com' })
    const maxed = await make({ emailAttempts: 5 })
    const noCustomer = await make({ emailSent: true, email: null })
    const sent: Mail[] = []
    const r = await retryUnsent(payload, async (m) => { sent.push(m) }, sweepOpts(later()))
    expect(r).toEqual({ retried: 1, pruned: 0 })
    expect(sent.every((m) => m.idempotencyKey.startsWith(a.reference))).toBe(true)
    const get = (id: number | string) => payload.findByID({ collection: 'inquiries', id })
    const ra = await get(a.id)
    expect([ra.emailSent, ra.customerEmailSent, ra.emailAttempts]).toEqual([true, true, 1])
    expect((await get(done.id)).emailAttempts).toBe(0)
    const rm = await get(maxed.id)
    expect([rm.emailSent, rm.emailAttempts]).toEqual([false, 5])
    expect((await get(noCustomer.id)).emailAttempts).toBe(0)
  })
  it('retries a row with only the customer mail pending, sending only that mail', async () => {
    const doc = await make({ emailSent: true })
    const sent: Mail[] = []
    const r = await retryUnsent(payload, async (m) => { sent.push(m) }, sweepOpts(new Date()))
    expect(r.retried).toBe(1)
    expect(sent.map((m) => m.idempotencyKey)).toEqual([`${doc.reference}:customer`])
  })
  it('does not retry a row that is sent and has no customer email', async () => {
    await make({ emailSent: true, email: null })
    const sent: Mail[] = []
    const r = await retryUnsent(payload, async (m) => { sent.push(m) }, sweepOpts(new Date()))
    expect([r.retried, sent.length]).toEqual([0, 0])
  })
  it('prunes rate hits older than a day and keeps fresh ones', async () => {
    await payload.create({ collection: 'rate-hits', data: { ipHash: 'old' } })
    const r1 = await retryUnsent(payload, async () => {}, sweepOpts(later()))
    expect(r1.pruned).toBe(1)
    await payload.create({ collection: 'rate-hits', data: { ipHash: 'fresh' } })
    const r2 = await retryUnsent(payload, async () => {}, sweepOpts(new Date()))
    expect(r2.pruned).toBe(0)
    const left = await payload.find({ collection: 'rate-hits', limit: 10 })
    expect(left.docs.map((h) => h.ipHash)).toEqual(['fresh'])
  })
})
