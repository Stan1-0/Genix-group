import { randomBytes } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'

type Env = Record<string, string | undefined>
export type PhotoSettings = { cloudName: string; apiKey: string; apiSecret: string }
export type PhotoClient = {
  resource(id: string): Promise<{ bytes: number; format: string } | null>
  list(prefix: string, cursor?: string): Promise<{ resources: { public_id: string; created_at: string }[]; next_cursor?: string }>
  destroy(ids: string[]): Promise<void>
}

export const PHOTO_PREFIX = 'genix-inquiries/'
export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 10_485_760
export const PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
export const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const DAY_MS = 86_400_000
const ID = /^genix-inquiries\/[A-Za-z0-9_-]{24}$/

export function photoSettings(env: Env): PhotoSettings | null {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null
}

export const isPhotoId = (id: string) => ID.test(id)
export const newPhotoId = () => PHOTO_PREFIX + randomBytes(18).toString('base64url') // 24 chars

/** Signature for one direct browser upload; public id carries the folder (dynamic-folder accounts ignore `folder`). */
export function signUpload(s: PhotoSettings, nowSec: number) {
  const publicId = newPhotoId()
  const params = { public_id: publicId, timestamp: String(nowSec), type: 'authenticated', allowed_formats: PHOTO_FORMATS.join(',') }
  const signature = cloudinary.utils.api_sign_request(params, s.apiSecret)
  return { uploadUrl: `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, publicId, fields: { ...params, api_key: s.apiKey, signature } }
}

export function cloudinaryClient(s: PhotoSettings): PhotoClient {
  const auth = { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret }
  return {
    async resource(id) {
      try {
        const r = await cloudinary.api.resource(id, { ...auth, type: 'authenticated' })
        return { bytes: r.bytes, format: r.format }
      } catch (err) {
        if ((err as { error?: { http_code?: number } }).error?.http_code === 404) return null
        throw err
      }
    },
    async list(prefix, cursor) {
      const r = await cloudinary.api.resources({ ...auth, type: 'authenticated', prefix, max_results: 500, next_cursor: cursor })
      return { resources: r.resources.map((x: { public_id: string; created_at: string }) => ({ public_id: x.public_id, created_at: x.created_at })), next_cursor: r.next_cursor }
    },
    async destroy(ids) {
      if (ids.length) await cloudinary.api.delete_resources(ids, { ...auth, type: 'authenticated' })
    },
  }
}

/** Ids the visitor sent, filtered to real uploads of ours. Never throws: a Cloudinary outage drops the photos. */
export async function verifyPhotos(ids: string[], client: PhotoClient | null): Promise<string[]> {
  if (!client) return []
  const wanted = [...new Set(ids)].filter(isPhotoId)
  try {
    const ok: string[] = []
    const bad: string[] = []
    for (const id of wanted) {
      if (ok.length === MAX_PHOTOS) break
      const r = await client.resource(id)
      if (!r) continue
      if (r.bytes > MAX_PHOTO_BYTES || !PHOTO_FORMATS.includes(r.format.toLowerCase())) bad.push(id)
      else ok.push(id)
    }
    if (bad.length) await client.destroy(bad)
    return ok
  } catch (err) {
    console.error('verifyPhotos: dropping photos', err)
    return []
  }
}

export const thumbUrl = (s: PhotoSettings, id: string) =>
  cloudinary.url(id, { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret, type: 'authenticated', sign_url: true, secure: true, format: 'jpg', transformation: [{ crop: 'fill', width: 240, height: 240 }] })

export const fullUrl = (s: PhotoSettings, id: string, expiresAtSec: number) =>
  // The typings omit the per-call credentials, but the implementation reads them from `options`.
  cloudinary.utils.private_download_url(id, 'jpg', { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret, type: 'authenticated', expires_at: expiresAtSec } as Parameters<typeof cloudinary.utils.private_download_url>[2])

export async function deleteOrphans(client: PhotoClient, referenced: Set<string>, now: Date): Promise<number> {
  const cutoff = now.getTime() - DAY_MS
  const doomed: string[] = []
  let cursor: string | undefined
  do {
    const page = await client.list(PHOTO_PREFIX, cursor)
    for (const r of page.resources) if (!referenced.has(r.public_id) && Date.parse(r.created_at) < cutoff) doomed.push(r.public_id)
    cursor = page.next_cursor
  } while (cursor)
  for (let i = 0; i < doomed.length; i += 100) await client.destroy(doomed.slice(i, i + 100))
  return doomed.length
}
