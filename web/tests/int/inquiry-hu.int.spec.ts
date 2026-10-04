import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { processQuote } from '@/inquiries/pipeline'
import { deliverInquiry, type Mail } from '@/inquiries/deliver'

let payload: Payload
const raw = { project: 'accent', property: 'home', timing: 'soon', budget: '', zip: '92101', notes: 'Living room wall, about 4 m wide.', links: 'https://pin.it/abc', callTime: '', name: 'Ana', phone: '', email: 'ana@example.com' }
const pid = (c: string) => `genix-inquiries/${c.repeat(24)}`
const deps = (verify = async (ids: string[]) => ids) => ({ payload, isBot: async () => false, now: () => new Date(), salt: 's', production: false, verifyPhotos: verify })
const input = (photoIds: string[] = []) => ({ site: 'homeupgrades' as const, raw, photoIds, ip: '127.0.0.1', honeypot: '', startedAt: null })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { for (const c of ['inquiries', 'inquiry-counters', 'rate-hits'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } }) })

describe('Home Upgrades enquiries', () => {
  it('saves with GX-HUP numbering, details and verified photos', async () => {
    const r = await processQuote(input([pid('a'), pid('a'), pid('b')]), deps(async (ids) => [...new Set(ids)].slice(0, 1)))
    expect(r).toMatchObject({ ok: true, reference: 'GX-HUP-000001' })
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect(docs[0]).toMatchObject({ division: 'homeupgrades', summary: 'Accent wall & TV unit · 92101 · Home · In 1–3 months', notes: 'Living room wall, about 4 m wide.' })
    expect(docs[0].details).toMatchObject({ project: 'accent', links: ['https://pin.it/abc'], photos: [pid('a')] })
  })
  it('still saves when photo verification throws', async () => {
    const r = await processQuote(input([pid('a')]), deps(async () => { throw new Error('cloudinary down') }))
    expect(r.ok).toBe(true)
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect((docs[0].details as { photos: string[] }).photos).toEqual([])
  })
  it('emails the team with links and photos, the customer with choices only', async () => {
    const r = await processQuote(input([pid('a')]), deps())
    if (!r.ok || r.inquiryId === null) throw new Error('expected saved')
    const sent: Mail[] = []
    const settings = { cloudName: 'demo-cloud', apiKey: '1', apiSecret: 'test-secret-not-real' }
    await deliverInquiry(payload, r.inquiryId, async (m) => { sent.push(m) }, { env: {}, phone: null, adminOrigin: 'https://thegenixgroup.com', retryDelayMs: 0, photos: { settings, nowSec: 1_791_000_000 } })
    const [team, customer] = sent
    expect(team.subject).toBe('[Home Upgrades] Quote · Accent wall & TV unit · 92101 · GX-HUP-000001')
    expect(team.html).toContain('https://pin.it/abc')
    expect(team.html).toContain('Photos (1)')
    expect(customer.text).toContain('Forgot a photo? Just reply to this email with it.')
    expect(customer.text).not.toContain('Living room wall')
    expect(customer.text).not.toContain('pin.it')
    expect(customer.html).not.toContain('genix-inquiries')
  })
  it('logistics enquiries are unaffected', async () => {
    const r = await processQuote({ site: 'logistics', raw: { kind: 'business', from: '92101', to: '92024', date: '', flexible: 'on', load: 'parcels', pallets: '', name: 'Bo', phone: '(619) 555-0100', email: '', notes: '' }, photoIds: [pid('z')], ip: '127.0.0.1', honeypot: '', startedAt: null }, deps())
    expect(r).toMatchObject({ ok: true, reference: 'GX-LOG-000001' })
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect(docs[0].details).not.toHaveProperty('photos')
  })
})
