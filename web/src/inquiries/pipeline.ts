import type { Payload } from 'payload'
import { SITES, type SiteKey } from '@/sites/config'
import { hashIp, formatReference } from './format'
import { formFor } from './forms'
import { nextReference } from './reference'

export type QuoteResult =
  | { ok: true; reference: string; inquiryId: number | string | null }
  | { ok: false; fieldErrors?: Record<string, string>; error?: 'rate' | 'server' }

type Input = { site: SiteKey; raw: Record<string, unknown>; photoIds: string[]; ip: string; honeypot: string; startedAt: number | null }
type Deps = { payload: Payload; isBot: () => Promise<boolean>; now: () => Date; salt: string; production: boolean; verifyPhotos: (ids: string[]) => Promise<string[]> }

const TOO_FAST_MS = 2000
const LIMIT = 5
const WINDOW_MS = 10 * 60 * 1000
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown', ''])

// Looks like a real reference so bots can't tell they were filtered.
const fakeReference = (site: SiteKey) => formatReference(SITES[site].inquiryPrefix, 100 + Math.floor(Math.random() * 9000))

export async function processQuote(input: Input, deps: Deps): Promise<QuoteResult> {
  const now = deps.now()
  const today = new Date(now.getTime() - 8 * 3600_000).toISOString().slice(0, 10) // Pacific date (UTC-8, conservative)
  const def = formFor(input.site)
  const parsed = def.parse(input.raw, today)
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors }

  const tooFast = input.startedAt !== null && now.getTime() - input.startedAt < TOO_FAST_MS
  if (input.honeypot || tooFast || (await deps.isBot())) return { ok: true, reference: fakeReference(input.site), inquiryId: null }

  const ipHash = hashIp(input.ip || 'unknown', deps.salt)
  const exempt = !deps.production && LOOPBACK.has(input.ip)
  if (!exempt) {
    const since = new Date(now.getTime() - WINDOW_MS).toISOString()
    const { totalDocs } = await deps.payload.count({ collection: 'rate-hits', where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] } })
    if (totalDocs >= LIMIT) return { ok: false, error: 'rate' }
    await deps.payload.create({ collection: 'rate-hits', data: { ipHash } })
  }

  let data = parsed.data
  if (input.site === 'homeupgrades') {
    let photos: string[] = []
    try { photos = await deps.verifyPhotos(input.photoIds) } catch (err) { console.error('processQuote: photo verification failed', err) }
    data = { ...(data as object), photos } as typeof data
  }

  const c = def.contact(data)
  const reference = await nextReference(deps.payload, input.site)
  const doc = await deps.payload.create({
    collection: 'inquiries',
    data: {
      reference, division: input.site, type: def.inquiryType, status: 'new', summary: def.summary(data),
      name: c.name, phone: c.phone, email: c.email, notes: c.notes,
      details: def.details(data),
      ipHash,
    },
  })
  return { ok: true, reference, inquiryId: doc.id }
}
