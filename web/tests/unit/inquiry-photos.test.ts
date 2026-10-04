import { describe, expect, it, vi } from 'vitest'
import { deleteOrphans, isPhotoId, newPhotoId, photoSettings, signUpload, verifyPhotos, type PhotoClient } from '@/inquiries/photos'

const S = { cloudName: 'demo-cloud', apiKey: '123456', apiSecret: 'test-secret-not-real' }
const id = (c: string) => `genix-inquiries/${c.repeat(24)}`

function fakeClient(over: Partial<PhotoClient> = {}): PhotoClient {
  return { resource: async () => ({ bytes: 1000, format: 'jpg' }), list: async () => ({ resources: [] }), destroy: vi.fn(async () => {}), ...over }
}

describe('photo settings', () => {
  it('needs all three values', () => {
    expect(photoSettings({ CLOUDINARY_CLOUD_NAME: 'a', CLOUDINARY_API_KEY: 'b' })).toBeNull()
    expect(photoSettings({ CLOUDINARY_CLOUD_NAME: 'a', CLOUDINARY_API_KEY: 'b', CLOUDINARY_API_SECRET: 'c' })).toEqual({ cloudName: 'a', apiKey: 'b', apiSecret: 'c' })
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
    expect(g.fields).toMatchObject({ api_key: '123456', timestamp: '1791000000', type: 'authenticated', public_id: g.publicId })
    expect(g.fields.signature).toMatch(/^[0-9a-f]{40}$/)
    expect(JSON.stringify(g)).not.toContain('test-secret-not-real')
    expect(isPhotoId(g.publicId)).toBe(true)
  })
})

describe('verifyPhotos', () => {
  it('dedups, drops foreign/unknown ids and caps at 5', async () => {
    const ids = [id('a'), id('a'), 'evil/' + 'b'.repeat(24), id('c'), id('d'), id('e'), id('f'), id('g')]
    const client = fakeClient({ resource: async (x) => (x === id('c') ? null : { bytes: 1000, format: 'jpg' }) })
    expect(await verifyPhotos(ids, client)).toEqual([id('a'), id('d'), id('e'), id('f'), id('g')])
  })
  it('drops and deletes oversized or wrong-format uploads', async () => {
    const destroy = vi.fn(async () => {})
    const client = fakeClient({ destroy, resource: async (x) => (x === id('a') ? { bytes: 20_000_000, format: 'jpg' } : x === id('b') ? { bytes: 10, format: 'pdf' } : { bytes: 10, format: 'heic' }) })
    expect(await verifyPhotos([id('a'), id('b'), id('c')], client)).toEqual([id('c')])
    expect(destroy).toHaveBeenCalledWith([id('a'), id('b')])
  })
  it('returns [] when photos are off or Cloudinary fails', async () => {
    expect(await verifyPhotos([id('a')], null)).toEqual([])
    expect(await verifyPhotos([id('a')], fakeClient({ resource: async () => { throw new Error('down') } }))).toEqual([])
  })
})

describe('deleteOrphans', () => {
  it('deletes only unreferenced uploads older than 24 h, across pages', async () => {
    const now = new Date('2026-10-05T12:00:00Z')
    const destroy = vi.fn(async () => {})
    const pages = [
      { resources: [{ public_id: id('a'), created_at: '2026-10-03T00:00:00Z' }, { public_id: id('b'), created_at: '2026-10-05T11:00:00Z' }], next_cursor: 'p2' },
      { resources: [{ public_id: id('c'), created_at: '2026-10-01T00:00:00Z' }] },
    ]
    const client = fakeClient({ destroy, list: async (_p, cursor) => (cursor ? pages[1] : pages[0]) })
    expect(await deleteOrphans(client, new Set([id('c')]), now)).toBe(1)
    expect(destroy).toHaveBeenCalledWith([id('a')])
  })
})
