import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import { v2 as cloudinary } from 'cloudinary'
import config from '@/payload.config'
import { cleanupPhotos, retryUnsent } from '@/inquiries/deliver'
import { setPhotoClientFactory } from '@/collections/Inquiries'
import type { PhotoClient, ResourceType } from '@/inquiries/photos'

let payload: Payload
const pid = (c: string) => `genix-inquiries/${c.repeat(24)}`
const make = (photos: string[]) => payload.create({ collection: 'inquiries', data: { reference: `GX-HUP-${String(Math.random()).slice(2, 8)}`, division: 'homeupgrades', type: 'quote', status: 'new', name: 'Ana', email: 'a@b.co', summary: 's', details: { photos } } })
const OLD = '2026-01-01T00:00:00Z'
type Listing = Partial<Record<ResourceType, { public_id: string; created_at: string }[]>>
/** A fake Cloudinary account holding `assets` per resource type; records every list and destroy. */
function fakeAccount(assets: Listing) {
  const list = vi.fn(async (_prefix: string, _cursor?: string, type: ResourceType = 'image') => ({ resources: assets[type] ?? [] }))
  const destroy = vi.fn(async (_ids: string[], _type?: ResourceType) => {})
  const client: PhotoClient = { resources: async () => new Map(), list, destroy }
  return { client, list, destroy }
}

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'inquiries', where: { id: { exists: true } } }) })
afterEach(() => { setPhotoClientFactory(null); vi.restoreAllMocks() })

describe('photo cleanup', () => {
  it('keeps referenced photos and deletes old orphans', async () => {
    await make([pid('a')])
    const { client, destroy } = fakeAccount({ image: [{ public_id: pid('a'), created_at: OLD }, { public_id: pid('b'), created_at: OLD }] })
    expect(await cleanupPhotos(payload, client, new Date(), { production: true })).toBe(1)
    expect(destroy).toHaveBeenCalledWith([pid('b')], 'image')
  })
  it('does nothing when photos are off', async () => {
    expect(await cleanupPhotos(payload, null, new Date(), { production: true })).toBe(0)
  })
  it('does nothing (lists nothing) outside Production', async () => {
    const { client, list, destroy } = fakeAccount({ image: [{ public_id: pid('b'), created_at: OLD }], raw: [{ public_id: pid('r'), created_at: OLD }] })
    expect(await cleanupPhotos(payload, client, new Date(), { production: false })).toBe(0)
    expect(list).not.toHaveBeenCalled()
    expect(destroy).not.toHaveBeenCalled()
  })
  it('deletes every raw and video upload under the prefix, at any age', async () => {
    const fresh = new Date().toISOString()
    const { client, destroy } = fakeAccount({ raw: [{ public_id: pid('r'), created_at: fresh }], video: [{ public_id: pid('v'), created_at: OLD }] })
    expect(await cleanupPhotos(payload, client, new Date(), { production: true })).toBe(2)
    expect(destroy).toHaveBeenCalledWith([pid('r')], 'raw')
    expect(destroy).toHaveBeenCalledWith([pid('v')], 'video')
  })
  it('loads every reference in one unpaginated query before deleting', async () => {
    await make([pid('a')])
    const find = vi.spyOn(payload, 'find')
    const { client } = fakeAccount({ image: [{ public_id: pid('a'), created_at: OLD }] })
    await cleanupPhotos(payload, client, new Date(), { production: true })
    const calls = find.mock.calls.filter(([a]) => a.collection === 'inquiries')
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toMatchObject({ pagination: false, depth: 0, select: { details: true }, where: { division: { equals: 'homeupgrades' } } })
  })
})

describe('retryUnsent photo cleanup gate (Cloudinary Admin API stubbed, never real)', () => {
  const env = { CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: '1', CLOUDINARY_API_SECRET: 'test-not-real' }
  const sweep = (production?: boolean) => retryUnsent(payload, async () => {}, { env, phoneFor: async () => null, adminOrigin: 'https://thegenixgroup.com', now: new Date(), retryDelayMs: 0, production })
  it('skips photo cleanup unless told it is Production', async () => {
    const list = vi.spyOn(cloudinary.api, 'resources').mockResolvedValue({ resources: [] } as never)
    expect((await sweep()).photosDeleted).toBe(0)
    expect((await sweep(false)).photosDeleted).toBe(0)
    expect(list).not.toHaveBeenCalled()
  })
  it('lists image, raw and video uploads of the authenticated type on Production', async () => {
    const list = vi.spyOn(cloudinary.api, 'resources').mockResolvedValue({ resources: [] } as never)
    vi.spyOn(cloudinary.api, 'delete_resources').mockResolvedValue({} as never)
    expect((await sweep(true)).photosDeleted).toBe(0)
    expect(list.mock.calls.map(([o]) => [(o as { resource_type: string }).resource_type, (o as { type: string }).type, (o as { prefix: string }).prefix])).toEqual([
      ['image', 'authenticated', 'genix-inquiries/'], ['raw', 'authenticated', 'genix-inquiries/'], ['video', 'authenticated', 'genix-inquiries/'],
    ])
  })
})

describe('deleting an inquiry', () => {
  it('deletes its photos', async () => {
    const { client, destroy } = fakeAccount({})
    setPhotoClientFactory(() => client)
    const doc = await make([pid('c'), pid('d')])
    await payload.delete({ collection: 'inquiries', id: doc.id })
    expect(destroy).toHaveBeenCalledWith([pid('c'), pid('d')])
  })
  it('keeps a photo another inquiry still references, until that one goes too', async () => {
    const { client, destroy } = fakeAccount({})
    setPhotoClientFactory(() => client)
    const first = await make([pid('s'), pid('x')])
    const second = await make([pid('s')])
    await payload.delete({ collection: 'inquiries', id: first.id })
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenLastCalledWith([pid('x')])
    await payload.delete({ collection: 'inquiries', id: second.id })
    expect(destroy).toHaveBeenCalledTimes(2)
    expect(destroy).toHaveBeenLastCalledWith([pid('s')])
  })
  it('deletes nothing when every photo is shared', async () => {
    const { client, destroy } = fakeAccount({})
    setPhotoClientFactory(() => client)
    const first = await make([pid('s')])
    await make([pid('s')])
    await payload.delete({ collection: 'inquiries', id: first.id })
    expect(destroy).not.toHaveBeenCalled()
  })
})
