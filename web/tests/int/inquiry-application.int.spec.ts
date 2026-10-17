import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { processQuote } from '@/inquiries/pipeline'
import { deliverInquiry, type Mail } from '@/inquiries/deliver'

let payload: Payload
const NOW = new Date()
const raw = { job: 'box-truck-driver', name: 'Sam Rivera', phone: '(619) 555-0142', email: 'sam@example.com', license: 'class-c', experience: '3plus', record: 'yes', availability: 'either', source: 'referral', notes: 'Referred by Luis' }
const deps = () => ({ payload, isBot: async () => false, now: () => NOW, salt: 'test-salt', production: true, verifyPhotos: async () => [] as string[] })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => {
  for (const c of ['inquiries', 'inquiry-counters', 'rate-hits'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('job applications', () => {
  it('are saved as Logistics enquiries of type application and emailed with application wording', async () => {
    const r = await processQuote({ site: 'logistics', form: 'application', raw, photoIds: [], ip: '203.0.113.20', honeypot: '', startedAt: NOW.getTime() - 30_000 }, deps())
    expect(r).toMatchObject({ ok: true, reference: 'GX-LOG-000001' })
    if (!r.ok || r.inquiryId === null) throw new Error('not saved')
    const doc = await payload.findByID({ collection: 'inquiries', id: r.inquiryId })
    expect(doc).toMatchObject({ division: 'logistics', type: 'application', name: 'Sam Rivera', phone: '(619) 555-0142', summary: 'Application · Box Truck Driver · 3+ years', notes: 'Referred by Luis' })
    expect(doc.details).toMatchObject({ job: 'box-truck-driver', license: 'class-c', source: 'referral' })

    const sent: Mail[] = []
    await deliverInquiry(payload, doc.id, async (m) => { sent.push(m) }, { env: {}, phone: null, adminOrigin: 'https://thegenixgroup.com', retryDelayMs: 0 })
    expect(sent[0].subject).toBe('[Logistics] Job application · Box Truck Driver · Sam Rivera · GX-LOG-000001')
    expect(sent[0].text).toContain('Heard about it: A friend or one of our drivers')
    expect(sent[1].subject).toBe('We got your application · GX-LOG-000001')
  })
  it('rejects an application for a job that is not open', async () => {
    const r = await processQuote({ site: 'logistics', form: 'application', raw: { ...raw, job: 'pilot' }, photoIds: [], ip: '203.0.113.21', honeypot: '', startedAt: null }, deps())
    expect(r).toMatchObject({ ok: false, fieldErrors: { job: 'This job is no longer open.' } })
  })
})
