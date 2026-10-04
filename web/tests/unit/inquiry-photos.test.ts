import { afterEach, describe, expect, it, vi } from 'vitest'
import { v2 as cloudinary } from 'cloudinary'
import { cloudinaryClient, deleteOrphans, isPhotoId, newPhotoId, photoIdsOf, photoSettings, signUpload, verifyPhotos, type PhotoClient } from '@/inquiries/photos'
import { PhotoStrip } from '@/inquiries/admin/PhotoStrip'

const S = { cloudName: 'demo-cloud', apiKey: '123456', apiSecret: 'test-secret-not-real' }
const id = (c: string) => `genix-inquiries/${c.repeat(24)}`
const ok = { bytes: 1000, format: 'jpg' }
/** A fake Admin API lookup: every asked-for id exists as a small JPEG unless `info` says otherwise (null = unknown). */
const lookup = (info: (id: string) => { bytes: number; format: string } | null = () => ok) =>
  vi.fn(async (ids: string[]) => new Map(ids.flatMap((x) => { const r = info(x); return r ? [[x, r] as const] : [] })))

function fakeClient(over: Partial<PhotoClient> = {}): PhotoClient {
  return { resources: lookup(), list: async () => ({ resources: [] }), destroy: vi.fn(async () => {}), ...over }
}

afterEach(() => vi.restoreAllMocks())

describe('photo settings', () => {
  it('needs all three values', () => {
    expect(photoSettings({ CLOUDINARY_CLOUD_NAME: 'a', CLOUDINARY_API_KEY: 'b' })).toBeNull()
    expect(photoSettings({ CLOUDINARY_CLOUD_NAME: 'a', CLOUDINARY_API_KEY: 'b', CLOUDINARY_API_SECRET: 'c' })).toEqual({ cloudName: 'a', apiKey: 'b', apiSecret: 'c' })
  })
})

describe('photoIdsOf and the admin strip', () => {
  it('reads only an array of non-empty strings', () => {
    expect(photoIdsOf({ photos: [id('a'), '', 3, id('b')] })).toEqual([id('a'), id('b')])
    expect(photoIdsOf({ photos: 'genix-inquiries/x' })).toEqual([])
    expect(photoIdsOf(null)).toEqual([])
    expect(photoIdsOf(undefined)).toEqual([])
  })
  it('PhotoStrip renders nothing for malformed photos instead of crashing', () => {
    expect(PhotoStrip({ data: { details: { photos: 'genix-inquiries/x' } } })).toBeNull()
    expect(PhotoStrip({ data: { details: { photos: { 0: 'x' } } } })).toBeNull()
  })
})

describe('ids and signing', () => {
  it('generates and recognises our ids only', () => {
    const n = newPhotoId()
    expect(isPhotoId(n)).toBe(true)
    expect(isPhotoId('other/' + 'a'.repeat(24))).toBe(false)
    expect(isPhotoId('genix-inquiries/short')).toBe(false)
    expect(isPhotoId('genix-inquiries/' + 'a'.repeat(24) + '/../x')).toBe(false)
  })
  it('signs an authenticated upload without leaking the secret', () => {
    const g = signUpload(S, 1_791_000_000)
    expect(g.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload')
    expect(g.fields).toMatchObject({ api_key: '123456', timestamp: '1791000000', type: 'authenticated', public_id: g.publicId, overwrite: 'false' })
    expect(g.fields.signature).toMatch(/^[0-9a-f]{40}$/)
    expect(JSON.stringify(g)).not.toContain('test-secret-not-real')
    expect(isPhotoId(g.publicId)).toBe(true)
  })
  it('signs exactly allowed_formats, overwrite, public_id, timestamp and type', () => {
    const g = signUpload(S, 1_791_000_000)
    const { allowed_formats, overwrite, public_id, timestamp, type } = g.fields
    expect(g.fields.signature).toBe(cloudinary.utils.api_sign_request({ allowed_formats, overwrite, public_id, timestamp, type }, S.apiSecret))
    expect(Object.keys(g.fields).sort()).toEqual(['allowed_formats', 'api_key', 'overwrite', 'public_id', 'signature', 'timestamp', 'type'])
  })
})

describe('verifyPhotos', () => {
  it('dedups, drops foreign/unknown ids and caps at 5, in one lookup', async () => {
    const ids = [id('a'), id('a'), 'evil/' + 'b'.repeat(24), id('c'), id('d'), id('e'), id('f'), id('g')]
    const resources = lookup((x) => (x === id('c') ? null : ok))
    expect(await verifyPhotos(ids, fakeClient({ resources }))).toEqual([id('a'), id('d'), id('e'), id('f'), id('g')])
    expect(resources).toHaveBeenCalledTimes(1)
    expect(resources).toHaveBeenCalledWith([id('a'), id('c'), id('d'), id('e'), id('f'), id('g')])
  })
  it('looks up only the first 10 of our ids', async () => {
    const many = 'abcdefghijkl'.split('').map(id)
    const resources = lookup(() => null)
    await verifyPhotos(many, fakeClient({ resources }))
    expect(resources).toHaveBeenCalledWith(many.slice(0, 10))
  })
  it('asks nothing when no id is ours', async () => {
    const resources = lookup()
    expect(await verifyPhotos(['evil/' + 'b'.repeat(24)], fakeClient({ resources }))).toEqual([])
    expect(resources).not.toHaveBeenCalled()
  })
  it('drops and deletes oversized or wrong-format uploads', async () => {
    const destroy = vi.fn(async () => {})
    const resources = lookup((x) => (x === id('a') ? { bytes: 20_000_000, format: 'jpg' } : x === id('b') ? { bytes: 10, format: 'pdf' } : { bytes: 10, format: 'heic' }))
    expect(await verifyPhotos([id('a'), id('b'), id('c')], fakeClient({ destroy, resources }))).toEqual([id('c')])
    expect(destroy).toHaveBeenCalledWith([id('a'), id('b')])
  })
  it('keeps the valid photos when deleting the bad ones fails', async () => {
    const destroy = vi.fn(async () => { throw new Error('delete failed') })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const resources = lookup((x) => (x === id('a') ? { bytes: 10, format: 'pdf' } : ok))
    expect(await verifyPhotos([id('a'), id('b')], fakeClient({ destroy, resources }))).toEqual([id('b')])
    expect(destroy).toHaveBeenCalledWith([id('a')])
  })
  it('returns [] when photos are off or Cloudinary fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await verifyPhotos([id('a')], null)).toEqual([])
    expect(await verifyPhotos([id('a')], fakeClient({ resources: async () => { throw new Error('down') } }))).toEqual([])
  })
})

describe('cloudinaryClient (Admin API calls stubbed, never real)', () => {
  const auth = { cloud_name: 'demo-cloud', api_key: '123456', api_secret: 'test-secret-not-real' }
  it('verifies with one resources_by_ids call on authenticated assets', async () => {
    const spy = vi.spyOn(cloudinary.api, 'resources_by_ids').mockResolvedValue({ resources: [{ public_id: id('a'), bytes: 5, format: 'png' }] } as never)
    const m = await cloudinaryClient(S).resources([id('a'), id('b')])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith([id('a'), id('b')], { ...auth, type: 'authenticated' })
    expect([...m]).toEqual([[id('a'), { bytes: 5, format: 'png' }]])
  })
  it('passes resource_type to list and destroy (image by default)', async () => {
    const list = vi.spyOn(cloudinary.api, 'resources').mockResolvedValue({ resources: [] } as never)
    const del = vi.spyOn(cloudinary.api, 'delete_resources').mockResolvedValue({} as never)
    const c = cloudinaryClient(S)
    await c.list('genix-inquiries/')
    await c.list('genix-inquiries/', 'cur', 'raw')
    await c.destroy([id('a')])
    await c.destroy([id('b')], 'video')
    expect(list.mock.calls.map((x) => (x[0] as { resource_type: string }).resource_type)).toEqual(['image', 'raw'])
    expect(list.mock.calls[1][0]).toMatchObject({ type: 'authenticated', prefix: 'genix-inquiries/', next_cursor: 'cur' })
    expect(del.mock.calls).toEqual([[[id('a')], { ...auth, type: 'authenticated', resource_type: 'image' }], [[id('b')], { ...auth, type: 'authenticated', resource_type: 'video' }]])
  })
})

describe('deleteOrphans', () => {
  const now = new Date('2026-10-05T12:00:00Z')
  const old = (c: string) => ({ public_id: id(c), created_at: '2026-10-01T00:00:00Z' })
  const letters = 'abcdefghijklmnopqrst'.split('') // 20

  it('deletes only unreferenced uploads older than 24 h, across pages', async () => {
    const destroy = vi.fn(async () => {})
    const pages = [
      { resources: [{ public_id: id('a'), created_at: '2026-10-03T00:00:00Z' }, { public_id: id('b'), created_at: '2026-10-05T11:00:00Z' }], next_cursor: 'p2' },
      { resources: [{ public_id: id('c'), created_at: '2026-10-01T00:00:00Z' }] },
    ]
    const client = fakeClient({ destroy, list: async (_p, cursor) => (cursor ? pages[1] : pages[0]) })
    expect(await deleteOrphans(client, new Set([id('c')]), now)).toBe(1)
    expect(destroy).toHaveBeenCalledWith([id('a')], 'image')
  })
  it('aborts and deletes nothing when most old photos look unreferenced', async () => {
    const destroy = vi.fn(async () => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = fakeClient({ destroy, list: async () => ({ resources: letters.map(old) }) })
    expect(await deleteOrphans(client, new Set(), now)).toBe(0)
    expect(destroy).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('photo cleanup aborted: 20 of 20 old photos look unreferenced'))
  })
  it('still deletes a few orphans among mostly referenced photos', async () => {
    const destroy = vi.fn(async () => {})
    const client = fakeClient({ destroy, list: async () => ({ resources: letters.map(old) }) })
    expect(await deleteOrphans(client, new Set(letters.slice(0, 15).map(id)), now)).toBe(5)
    expect(destroy).toHaveBeenCalledWith(letters.slice(15).map(id), 'image')
  })
})
