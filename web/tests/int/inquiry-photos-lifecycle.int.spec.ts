import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { cleanupPhotos } from '@/inquiries/deliver'
import { setPhotoClientFactory } from '@/collections/Inquiries'
import type { PhotoClient } from '@/inquiries/photos'

let payload: Payload
const pid = (c: string) => `genix-inquiries/${c.repeat(24)}`
const make = (photos: string[]) => payload.create({ collection: 'inquiries', data: { reference: `GX-HUP-${String(Math.random()).slice(2, 8)}`, division: 'homeupgrades', type: 'quote', status: 'new', name: 'Ana', email: 'a@b.co', summary: 's', details: { photos } } })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'inquiries', where: { id: { exists: true } } }) })
afterEach(() => setPhotoClientFactory(null))

describe('photo lifecycle', () => {
  it('cleanup keeps referenced photos and deletes old orphans', async () => {
    await make([pid('a')])
    const destroy = vi.fn(async () => {})
    const client: PhotoClient = {
      resource: async () => null,
      list: async () => ({ resources: [{ public_id: pid('a'), created_at: '2026-01-01T00:00:00Z' }, { public_id: pid('b'), created_at: '2026-01-01T00:00:00Z' }] }),
      destroy,
    }
    expect(await cleanupPhotos(payload, client, new Date())).toBe(1)
    expect(destroy).toHaveBeenCalledWith([pid('b')])
  })
  it('cleanup does nothing when photos are off', async () => {
    expect(await cleanupPhotos(payload, null, new Date())).toBe(0)
  })
  it('deleting an inquiry deletes its photos', async () => {
    const destroy = vi.fn(async () => {})
    setPhotoClientFactory(() => ({ resource: async () => null, list: async () => ({ resources: [] }), destroy }))
    const doc = await make([pid('c'), pid('d')])
    await payload.delete({ collection: 'inquiries', id: doc.id })
    expect(destroy).toHaveBeenCalledWith([pid('c'), pid('d')])
  })
})
