import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import type { Inquiry } from '@/payload-types'

// Runs against genix_test (vitest.config). Test-only credentials.
let payload: Payload
// status/delivery fields are omitted on purpose: the test checks their defaults (payload-types marks defaulted fields required, hence the cast).
const base = { reference: 'GX-LOG-000001', division: 'logistics', type: 'quote', name: 'Ana', phone: '(619) 555-0100', details: {}, summary: '92101 → 92024 · Pallets' } as unknown as Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt'>

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['inquiries', 'inquiry-counters', 'rate-hits', 'users'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('inquiries collection', () => {
  it('defaults status and delivery fields', async () => {
    const doc = await payload.create({ collection: 'inquiries', data: base })
    expect([doc.status, doc.emailSent, doc.customerEmailSent, doc.emailAttempts]).toEqual(['new', false, false, 0])
  })
  it('keeps references unique', async () => {
    await expect(payload.create({ collection: 'inquiries', data: base })).rejects.toThrow()
  })
  it('refuses creates through the API (no overrideAccess)', async () => {
    await expect(payload.create({ collection: 'inquiries', data: { ...base, reference: 'GX-LOG-000002' }, overrideAccess: false })).rejects.toThrow()
  })
  it('shows editors only their divisions', async () => {
    await payload.create({ collection: 'inquiries', data: { ...base, reference: 'GX-HUP-000001', division: 'homeupgrades' } })
    const admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: 'test-pass-1' } })
    const editor = await payload.create({ collection: 'users', data: { email: 'ed@test.local', password: 'test-pass-2', role: 'editor', divisions: ['homeupgrades'] } })
    const asEditor = await payload.find({ collection: 'inquiries', overrideAccess: false, user: editor })
    expect(asEditor.docs.map((d) => d.reference)).toEqual(['GX-HUP-000001'])
    const asAdmin = await payload.find({ collection: 'inquiries', overrideAccess: false, user: admin })
    expect(asAdmin.totalDocs).toBe(2)
  })
  it('lets editors change only status; system fields and ipHash are locked', async () => {
    const doc = await payload.create({ collection: 'inquiries', data: { ...base, reference: 'GX-HUP-000002', division: 'homeupgrades', ipHash: 'h'.repeat(64) } })
    const editor = (await payload.find({ collection: 'users', where: { email: { equals: 'ed@test.local' } } })).docs[0]
    const admin = (await payload.find({ collection: 'users', where: { email: { equals: 'admin@test.local' } } })).docs[0]
    await payload.update({ collection: 'inquiries', id: doc.id, overrideAccess: false, user: editor, data: { division: 'logistics', emailSent: true, name: 'Mallory', status: 'contacted' } })
    const stored = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect([stored.division, stored.emailSent, stored.name, stored.status]).toEqual(['homeupgrades', false, 'Ana', 'contacted'])
    expect(stored.ipHash).toBe('h'.repeat(64))
    const asEditor = await payload.findByID({ collection: 'inquiries', id: doc.id, overrideAccess: false, user: editor })
    expect(asEditor).not.toHaveProperty('ipHash')
    const asAdmin = await payload.findByID({ collection: 'inquiries', id: doc.id, overrideAccess: false, user: admin })
    expect(asAdmin).not.toHaveProperty('ipHash')
  })
})
