import type { Payload, TypedUser } from 'payload'
import { Resend } from 'resend'
import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { customerEmail, teamEmail } from './email'
import { formFor } from './forms'
import { cloudinaryClient, deleteOrphans, deleteStrays, fullUrl, photoIdsOf, photoSettings, thumbUrl, type PhotoClient, type PhotoSettings } from './photos'

type Env = Record<string, string | undefined>
export type Mail = { from: string; to: string; replyTo?: string; subject: string; html: string; text: string; idempotencyKey: string }
export type Mailer = (m: Mail) => Promise<void>

const MAX_ATTEMPTS = 5
/** Pause before the one immediate retry, so a brief provider blip can clear. Tests pass `retryDelayMs: 0`. */
export const RETRY_DELAY_MS = 1000
const DAY_MS = 86_400_000
export const CUSTOMER_SKIPPED = 'customer auto-reply skipped: one per address per 24 h'

export function createMailer(env: Env): Mailer {
  if (!env.RESEND_API_KEY) {
    return async (m) => {
      // Never report success when nothing was sent, so the row stays unsent and the sweep retries it.
      console.warn(`[inquiry email: not sent, no RESEND_API_KEY] to=${m.to} subject="${m.subject}"`)
      if (env.NODE_ENV !== 'production') console.info(m.text)
      throw new Error('not sent: no RESEND_API_KEY')
    }
  }
  const resend = new Resend(env.RESEND_API_KEY)
  return async (m) => {
    const { error } = await resend.emails.send(
      { from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, html: m.html, text: m.text },
      { idempotencyKey: m.idempotencyKey },
    )
    if (error) throw new Error(error.message)
  }
}

async function twice(fn: () => Promise<void>, delayMs: number) {
  try { await fn() } catch {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
    await fn()
  }
}

/** True when another inquiry to this address (case-insensitive) already got its auto-reply in the last 24 h. */
async function recentlyAutoReplied(payload: Payload, id: number | string, email: string): Promise<boolean> {
  const { docs } = await payload.find({
    collection: 'inquiries', depth: 0, limit: 50,
    // `like` is a case-insensitive contains in Postgres; the exact (lowercased) match is checked below.
    where: { and: [{ id: { not_equals: id } }, { email: { like: email } }, { customerEmailSent: { equals: true } }, { createdAt: { greater_than: new Date(Date.now() - DAY_MS).toISOString() } }] },
  })
  return docs.some((d) => d.email?.trim().toLowerCase() === email.trim().toLowerCase())
}

type DeliverOpts = { env: Env; phone: string | null; adminOrigin: string; retryDelayMs?: number; photos?: { settings: PhotoSettings | null; nowSec: number } }
const THIRTY_DAYS = 30 * 86_400
const photoOpts = (env: Env) => ({ settings: photoSettings(env), nowSec: Math.floor(Date.now() / 1000) })

export async function deliverInquiry(payload: Payload, id: number | string, mailer: Mailer, opts: DeliverOpts): Promise<void> {
  const doc = await payload.findByID({ collection: 'inquiries', id })
  const site = doc.division as SiteKey
  const def = formFor(site)
  const contact = { name: doc.name, phone: doc.phone ?? null, email: doc.email ?? null, notes: doc.notes ?? null }
  const data = def.fromStored((doc.details ?? {}) as Record<string, unknown>, contact)
  const from = `Genix ${SITES[site].shortName} <${opts.env.INQUIRY_FROM || 'quotes@thegenixgroup.com'}>`
  const inbox = opts.env.INQUIRY_TO || 'hello@thegenixgroup.com'
  const update: Record<string, unknown> = { emailAttempts: (doc.emailAttempts ?? 0) + 1 }
  const errors: string[] = []
  const delay = opts.retryDelayMs ?? RETRY_DELAY_MS

  if (!doc.emailSent) {
    const hu = site === 'homeupgrades' ? (data as { links: string[]; photos: string[] }) : null
    const ps = opts.photos?.settings ?? null
    const photoLinks = hu && ps && opts.photos ? hu.photos.map((id) => ({ thumb: thumbUrl(ps, id), full: fullUrl(ps, id, opts.photos!.nowSec + THIRTY_DAYS) })) : []
    const e = teamEmail({ site, kind: def.inquiryType, reference: doc.reference, rows: def.answers(data), subjectDetails: def.subjectDetails(data), phone: contact.phone, adminUrl: `${opts.adminOrigin}/admin/collections/inquiries/${doc.id}`, links: hu?.links ?? [], photos: photoLinks, unlinkedPhotos: hu && !photoLinks.length ? hu.photos.length : 0 })
    try {
      await twice(() => mailer({ from, to: inbox, replyTo: contact.email ?? undefined, ...e, idempotencyKey: `${doc.reference}:team` }), delay)
      update.emailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  // At most one auto-reply per recipient per 24 h, so the form can't be used to mail an address repeatedly.
  // A skipped reply is marked sent so the sweep doesn't retry it.
  if (contact.email && !doc.customerEmailSent && (await recentlyAutoReplied(payload, doc.id, contact.email))) {
    update.customerEmailSent = true
    errors.push(CUSTOMER_SKIPPED)
  } else if (contact.email && !doc.customerEmailSent) {
    const e = customerEmail({ site, kind: def.inquiryType, reference: doc.reference, name: contact.name, rows: def.customerRows(data), phone: opts.phone, extraLine: site === 'homeupgrades' ? 'Forgot a photo? Just reply to this email with it.' : undefined })
    try {
      await twice(() => mailer({ from, to: contact.email!, replyTo: inbox, ...e, idempotencyKey: `${doc.reference}:customer` }), delay)
      update.customerEmailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  update.lastEmailError = errors.length ? errors.join(' | ').slice(0, 500) : null
  await payload.update({ collection: 'inquiries', id: doc.id, data: update })
}

/** `production` gates photo clean-up: only the Production deployment may delete Cloudinary uploads (default off). */
export async function retryUnsent(payload: Payload, mailer: Mailer, opts: { env: Env; phoneFor: (site: SiteKey) => Promise<string | null>; adminOrigin: string; now: Date; retryDelayMs?: number; production?: boolean }) {
  const { docs } = await payload.find({
    collection: 'inquiries', limit: 100, depth: 0, sort: 'createdAt',
    where: { and: [{ emailAttempts: { less_than: MAX_ATTEMPTS } }, { or: [{ emailSent: { equals: false } }, { and: [{ customerEmailSent: { equals: false } }, { email: { exists: true } }] }] }] },
  })
  for (const doc of docs) {
    // One inquiry that can't be delivered (e.g. a division with no form definition) must not stop the rest.
    try {
      await deliverInquiry(payload, doc.id, mailer, { env: opts.env, phone: await opts.phoneFor(doc.division as SiteKey), adminOrigin: opts.adminOrigin, retryDelayMs: opts.retryDelayMs, photos: photoOpts(opts.env) })
    } catch (err) {
      console.error(`retryUnsent: delivery failed for inquiry ${doc.id}`, err)
    }
  }
  const cutoff = new Date(opts.now.getTime() - DAY_MS).toISOString()
  const pruned = await payload.delete({ collection: 'rate-hits', where: { createdAt: { less_than: cutoff } } })
  const s = photoSettings(opts.env)
  let photosDeleted = 0
  try { photosDeleted = await cleanupPhotos(payload, s ? cloudinaryClient(s) : null, opts.now, { production: opts.production ?? false }) } catch (err) { console.error('photo cleanup failed', err) }
  return { retried: docs.length, pruned: pruned.docs.length, photosDeleted }
}

/**
 * Deletes Cloudinary uploads that no enquiry references (see deleteOrphans for the age rule and circuit breaker),
 * plus any raw/video upload under our prefix. Production only: Preview and local share the Cloudinary account
 * but not the database, so their "unreferenced" photos are Production's live ones. Returns how many were removed.
 */
export async function cleanupPhotos(payload: Payload, client: PhotoClient | null, now: Date, opts: { production: boolean }): Promise<number> {
  if (!client || !opts.production) return 0
  // Every reference, in one query, before anything is deleted (offset paging could skip rows that move between pages).
  const { docs } = await payload.find({ collection: 'inquiries', where: { division: { equals: 'homeupgrades' } }, depth: 0, pagination: false, select: { details: true } })
  const referenced = new Set<string>()
  for (const d of docs) for (const id of photoIdsOf(d.details)) referenced.add(id)
  const orphans = await deleteOrphans(client, referenced, now)
  return orphans + (await deleteStrays(client))
}

/**
 * Admin button: checks the user may read this inquiry (throws otherwise), then delivers now.
 * The caller supplies the division phone (the endpoint looks it up) so this stays free of server-only site data.
 */
export async function resendInquiry(payload: Payload, id: number | string, user: unknown, mailer: Mailer, phone: string | null = null) {
  await payload.findByID({ collection: 'inquiries', id, depth: 0, overrideAccess: false, user: user as TypedUser })
  await deliverInquiry(payload, id, mailer, { env: process.env, phone, adminOrigin: siteOrigin('hub'), photos: photoOpts(process.env) })
}
