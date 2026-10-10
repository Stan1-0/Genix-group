import { beforeEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { nextReference } from '@/inquiries/reference'
import { processQuote } from '@/inquiries/pipeline'
import type { SiteKey } from '@/sites/config'

let payload: Payload
// Real clock: rate-hits rows get a real createdAt, so a frozen NOW would fall outside the window.
const NOW = new Date()
const DAY = new Date(NOW.getTime() + 4 * 86_400_000).toISOString().slice(0, 10)
const raw = { kind: 'business', from: '92101', to: '92024', date: DAY, flexible: '', load: 'pallets', pallets: '2', name: 'Ana', phone: '(619) 555-0100', email: 'ana@example.com', notes: '' }
const deps = () => ({ payload, isBot: async () => false, now: () => NOW, salt: 'test-salt', production: true, verifyPhotos: async () => [] as string[] })
const input = (over: Partial<Parameters<typeof processQuote>[0]> = {}) => ({ site: 'logistics' as SiteKey, raw, photoIds: [] as string[], ip: '203.0.113.9', honeypot: '', startedAt: NOW.getTime() - 30_000, ...over })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => {
  for (const c of ['inquiries', 'inquiry-counters', 'rate-hits'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('nextReference', () => {
  it('counts per division', async () => {
    expect(await nextReference(payload, 'logistics')).toBe('GX-LOG-000001')
    expect(await nextReference(payload, 'logistics')).toBe('GX-LOG-000002')
    expect(await nextReference(payload, 'homeupgrades')).toBe('GX-HUP-000001')
  })
  it('never hands out the same number twice under concurrency', async () => {
    const refs = await Promise.all(Array.from({ length: 10 }, () => nextReference(payload, 'logistics')))
    expect(new Set(refs).size).toBe(10)
  })
})

describe('processQuote', () => {
  it('saves a hub message as a contact with a GX-HUB reference', async () => {
    const hubRaw = { about: 'logistics', name: 'Ana', email: 'ana@example.com', phone: '', message: 'Two pallets to Phoenix next month?' }
    const r = await processQuote(input({ site: 'hub', raw: hubRaw }), deps())
    expect(r).toMatchObject({ ok: true, reference: 'GX-HUB-000001' })
    const { docs } = await payload.find({ collection: 'inquiries', where: { division: { equals: 'hub' } } })
    expect(docs[0]).toMatchObject({ division: 'hub', type: 'contact', name: 'Ana', email: 'ana@example.com', notes: 'Two pallets to Phoenix next month?', summary: 'Message · Logistics' })
  })
  it('saves a valid quote with its reference, summary and hashed IP', async () => {
    const r = await processQuote(input(), deps())
    expect(r).toMatchObject({ ok: true, reference: 'GX-LOG-000001' })
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect(docs[0]).toMatchObject({ reference: 'GX-LOG-000001', division: 'logistics', type: 'quote', name: 'Ana', summary: '92101 → 92024 · 2 pallets', emailSent: false })
    expect(docs[0].ipHash).toMatch(/^[0-9a-f]{64}$/)
    expect(docs[0].details).toMatchObject({ kind: 'business', from: '92101', pallets: 2 })
  })
  it('returns field errors and saves nothing', async () => {
    const r = await processQuote(input({ raw: { ...raw, from: '1' } }), deps())
    expect(r).toEqual({ ok: false, fieldErrors: { from: 'Enter a 5-digit ZIP code.' } })
    expect((await payload.count({ collection: 'inquiries' })).totalDocs).toBe(0)
  })
  it.each([
    ['honeypot', { honeypot: 'http://spam' }, false],
    ['bot', {}, true],
    ['too fast', { startedAt: NOW.getTime() - 500 }, false],
  ])('gives %s a fake success and saves nothing', async (_n, over, bot) => {
    const r = await processQuote(input(over), { ...deps(), isBot: async () => bot })
    expect(r.ok && r.reference).toMatch(/^GX-LOG-\d{6}$/)
    expect(r.ok && r.inquiryId).toBeNull()
    expect((await payload.count({ collection: 'inquiries' })).totalDocs).toBe(0)
  })
  it('refuses the 6th submission from one IP within 10 minutes', async () => {
    for (let i = 0; i < 5; i++) expect((await processQuote(input(), deps())).ok).toBe(true)
    expect(await processQuote(input(), deps())).toEqual({ ok: false, error: 'rate' })
    expect((await processQuote(input({ ip: '198.51.100.1' }), deps())).ok).toBe(true)
  })
  it('does not rate-limit loopback outside production', async () => {
    for (let i = 0; i < 7; i++) expect((await processQuote(input({ ip: '127.0.0.1' }), { ...deps(), production: false })).ok).toBe(true)
  })
})
