import type { Payload } from 'payload'
import { hashIp } from './format'
import { MAX_PHOTO_BYTES, PHOTO_MIME, photoSettings, signUpload } from './photos'

type Env = Record<string, string | undefined>
const LIMIT = 10
const WINDOW_MS = 10 * 60 * 1000
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown', ''])

export function checkUploadRequest(body: unknown): { ok: true } | { ok: false; status: 400; error: string } {
  const b = body as { type?: unknown; size?: unknown } | null
  const type = typeof b?.type === 'string' ? b.type.toLowerCase() : ''
  const size = typeof b?.size === 'number' ? b.size : NaN
  if (!PHOTO_MIME.includes(type)) return { ok: false, status: 400, error: 'Only JPG, PNG, WebP or HEIC photos.' }
  if (!Number.isInteger(size) || size < 1 || size > MAX_PHOTO_BYTES) return { ok: false, status: 400, error: 'Photos must be 10 MB or smaller.' }
  return { ok: true }
}

export async function grantUpload(
  input: { site: string; body: unknown; ip: string },
  deps: { payload: Payload; env: Env; isBot: () => Promise<boolean>; now: Date; production: boolean },
): Promise<{ status: number; json: unknown }> {
  const settings = photoSettings(deps.env)
  if (input.site !== 'homeupgrades' || !settings) return { status: 404, json: { error: 'Not found' } }
  const check = checkUploadRequest(input.body)
  if (!check.ok) return { status: 400, json: { error: check.error } }
  if (await deps.isBot()) return { status: 403, json: { error: 'Forbidden' } }
  // Distinct key from form submissions so photo grants never eat the form's quota.
  const ipHash = 'up:' + hashIp(input.ip || 'unknown', deps.env.IP_HASH_SALT || 'dev-only-salt')
  if (deps.production || !LOOPBACK.has(input.ip)) {
    const since = new Date(deps.now.getTime() - WINDOW_MS).toISOString()
    const { totalDocs } = await deps.payload.count({ collection: 'rate-hits', where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] } })
    if (totalDocs >= LIMIT) return { status: 429, json: { error: 'Too many uploads. Try again in a few minutes.' } }
    await deps.payload.create({ collection: 'rate-hits', data: { ipHash } })
  }
  return { status: 200, json: signUpload(settings, Math.floor(deps.now.getTime() / 1000)) }
}
