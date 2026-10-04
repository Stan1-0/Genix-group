import { randomBytes } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'

type Env = Record<string, string | undefined>
export type PhotoSettings = { cloudName: string; apiKey: string; apiSecret: string }
export type ResourceType = 'image' | 'raw' | 'video'
export type PhotoClient = {
  /** One Admin API lookup; ids Cloudinary doesn't know are simply absent from the map. */
  resources(ids: string[]): Promise<Map<string, { bytes: number; format: string }>>
  list(prefix: string, cursor?: string, resourceType?: ResourceType): Promise<{ resources: { public_id: string; created_at: string }[]; next_cursor?: string }>
  destroy(ids: string[], resourceType?: ResourceType): Promise<void>
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
/** The photo ids stored on an enquiry's `details` (tolerates missing or malformed JSON). */
export const photoIdsOf = (details: unknown): string[] => {
  const p = (details as { photos?: unknown } | null | undefined)?.photos
  return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
}
export const newPhotoId = () => PHOTO_PREFIX + randomBytes(18).toString('base64url') // 24 chars

/**
 * Signature for one direct browser upload; public id carries the folder (dynamic-folder accounts ignore `folder`).
 * `overwrite: false` stops a replayed grant from replacing a photo already attached to an enquiry.
 */
export function signUpload(s: PhotoSettings, nowSec: number) {
  const publicId = newPhotoId()
  const params = { public_id: publicId, timestamp: String(nowSec), type: 'authenticated', allowed_formats: PHOTO_FORMATS.join(','), overwrite: 'false' }
  const signature = cloudinary.utils.api_sign_request(params, s.apiSecret)
  return { uploadUrl: `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, publicId, fields: { ...params, api_key: s.apiKey, signature } }
}

export function cloudinaryClient(s: PhotoSettings): PhotoClient {
  const auth = { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret }
  return {
    async resources(ids) {
      // Unknown ids are left out of the response (no 404), so they're absent from the map.
      const r = await cloudinary.api.resources_by_ids(ids, { ...auth, type: 'authenticated' })
      return new Map(r.resources.map((x) => [x.public_id, { bytes: x.bytes, format: x.format }]))
    },
    async list(prefix, cursor, resourceType = 'image') {
      const r = await cloudinary.api.resources({ ...auth, resource_type: resourceType, type: 'authenticated', prefix, max_results: 500, next_cursor: cursor })
      return { resources: r.resources.map((x: { public_id: string; created_at: string }) => ({ public_id: x.public_id, created_at: x.created_at })), next_cursor: r.next_cursor }
    },
    async destroy(ids, resourceType = 'image') {
      if (ids.length) await cloudinary.api.delete_resources(ids, { ...auth, type: 'authenticated', resource_type: resourceType })
    },
  }
}

/** How many submitted ids are looked up at all (a form sends at most MAX_PHOTOS; the rest is noise). */
const MAX_LOOKUP = 10

/** Ids the visitor sent, filtered to real uploads of ours. Never throws: a Cloudinary outage drops the photos. */
export async function verifyPhotos(ids: string[], client: PhotoClient | null): Promise<string[]> {
  if (!client) return []
  const wanted = [...new Set(ids)].filter(isPhotoId).slice(0, MAX_LOOKUP)
  if (!wanted.length) return []
  let found: Map<string, { bytes: number; format: string }>
  try {
    found = await client.resources(wanted)
  } catch (err) {
    console.error('verifyPhotos: dropping photos', err)
    return []
  }
  const ok: string[] = []
  const bad: string[] = []
  for (const id of wanted) {
    const r = found.get(id)
    if (!r) continue
    if (r.bytes > MAX_PHOTO_BYTES || !PHOTO_FORMATS.includes(String(r.format).toLowerCase())) bad.push(id)
    else if (ok.length < MAX_PHOTOS) ok.push(id)
  }
  // A failed delete leaves an orphan for the daily clean-up; it must not cost the visitor their good photos.
  if (bad.length) try { await client.destroy(bad) } catch (err) { console.error('verifyPhotos: could not delete rejected uploads', err) }
  return ok
}

export const thumbUrl = (s: PhotoSettings, id: string) =>
  cloudinary.url(id, { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret, type: 'authenticated', sign_url: true, secure: true, format: 'jpg', transformation: [{ crop: 'fill', width: 240, height: 240 }] })

export const fullUrl = (s: PhotoSettings, id: string, expiresAtSec: number) =>
  // The typings omit the per-call credentials, but the implementation reads them from `options`.
  cloudinary.utils.private_download_url(id, 'jpg', { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret, type: 'authenticated', expires_at: expiresAtSec } as Parameters<typeof cloudinary.utils.private_download_url>[2])

/** Below this many orphans the circuit breaker never trips (a quiet week can leave a handful). */
const BREAKER_MIN = 10

/**
 * Deletes image uploads older than 24 h that no enquiry references. Circuit breaker: if more than half of the
 * old photos (and more than 10) look unreferenced, the reference list is probably wrong (wrong DATABASE_URL,
 * another account's keys), so it deletes nothing and logs instead.
 */
export async function deleteOrphans(client: PhotoClient, referenced: Set<string>, now: Date): Promise<number> {
  const cutoff = now.getTime() - DAY_MS
  const doomed: string[] = []
  let considered = 0
  let cursor: string | undefined
  do {
    const page = await client.list(PHOTO_PREFIX, cursor, 'image')
    for (const r of page.resources) {
      if (!(Date.parse(r.created_at) < cutoff)) continue
      considered++
      if (!referenced.has(r.public_id)) doomed.push(r.public_id)
    }
    cursor = page.next_cursor
  } while (cursor)
  if (doomed.length > BREAKER_MIN && doomed.length > considered * 0.5) {
    console.error(`photo cleanup aborted: ${doomed.length} of ${considered} old photos look unreferenced — check DATABASE_URL / Cloudinary keys`)
    return 0
  }
  for (let i = 0; i < doomed.length; i += 100) await client.destroy(doomed.slice(i, i + 100), 'image')
  return doomed.length
}

/** Raw and video uploads under our prefix are never legitimate (a replayed grant); deletes them all, any age. */
export async function deleteStrays(client: PhotoClient): Promise<number> {
  let n = 0
  for (const type of ['raw', 'video'] as const) {
    const ids: string[] = []
    let cursor: string | undefined
    do {
      const page = await client.list(PHOTO_PREFIX, cursor, type)
      for (const r of page.resources) ids.push(r.public_id)
      cursor = page.next_cursor
    } while (cursor)
    for (let i = 0; i < ids.length; i += 100) await client.destroy(ids.slice(i, i + 100), type)
    n += ids.length
  }
  return n
}
