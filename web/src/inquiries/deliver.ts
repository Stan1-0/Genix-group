import type { Payload, TypedUser } from 'payload'
import { Resend } from 'resend'
import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { customerEmail, teamEmail } from './email'
import type { QuoteInput } from './schema'

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
    collection: 'inquiries', depth: 0, limit: 50, pagination: false,
    // `like` is a case-insensitive contains in Postgres; the exact (lowercased) match is checked below.
    where: { and: [{ id: { not_equals: id } }, { email: { like: email } }, { customerEmailSent: { equals: true } }, { createdAt: { greater_than: new Date(Date.now() - DAY_MS).toISOString() } }] },
  })
  return docs.some((d) => d.email?.trim().toLowerCase() === email.trim().toLowerCase())
}

type DeliverOpts = { env: Env; phone: string | null; adminOrigin: string; retryDelayMs?: number }

export async function deliverInquiry(payload: Payload, id: number | string, mailer: Mailer, opts: DeliverOpts): Promise<void> {
  const doc = await payload.findByID({ collection: 'inquiries', id })
  const site = doc.division as SiteKey
  const d = (doc.details ?? {}) as Partial<QuoteInput>
  const q: QuoteInput = {
    kind: d.kind === 'move' ? 'move' : 'business', from: d.from ?? '', to: d.to ?? '', date: d.date ?? null, flexible: Boolean(d.flexible),
    load: d.load ?? '', pallets: d.pallets ?? null, name: doc.name, phone: doc.phone ?? null, email: doc.email ?? null, notes: doc.notes ?? null,
  }
  const from = `Genix ${SITES[site].shortName} <${opts.env.INQUIRY_FROM || 'quotes@thegenixgroup.com'}>`
  const inbox = opts.env.INQUIRY_TO || 'hello@thegenixgroup.com'
  const update: Record<string, unknown> = { emailAttempts: (doc.emailAttempts ?? 0) + 1 }
  const errors: string[] = []
  const delay = opts.retryDelayMs ?? RETRY_DELAY_MS

  if (!doc.emailSent) {
    const e = teamEmail({ site, reference: doc.reference, q, adminUrl: `${opts.adminOrigin}/admin/collections/inquiries/${doc.id}` })
    try {
      await twice(() => mailer({ from, to: inbox, replyTo: q.email ?? undefined, ...e, idempotencyKey: `${doc.reference}:team` }), delay)
      update.emailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  // At most one auto-reply per recipient per 24 h, so the form can't be used to mail an address repeatedly.
  // A skipped reply is marked sent so the sweep doesn't retry it.
  if (q.email && !doc.customerEmailSent && (await recentlyAutoReplied(payload, doc.id, q.email))) {
    update.customerEmailSent = true
    errors.push(CUSTOMER_SKIPPED)
  } else if (q.email && !doc.customerEmailSent) {
    const e = customerEmail({ site, reference: doc.reference, q, phone: opts.phone })
    try {
      await twice(() => mailer({ from, to: q.email!, replyTo: inbox, ...e, idempotencyKey: `${doc.reference}:customer` }), delay)
      update.customerEmailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  update.lastEmailError = errors.length ? errors.join(' | ').slice(0, 500) : null
  await payload.update({ collection: 'inquiries', id: doc.id, data: update })
}

export async function retryUnsent(payload: Payload, mailer: Mailer, opts: { env: Env; phoneFor: (site: SiteKey) => Promise<string | null>; adminOrigin: string; now: Date; retryDelayMs?: number }) {
  const { docs } = await payload.find({
    collection: 'inquiries', limit: 100, depth: 0, sort: 'createdAt',
    where: { and: [{ emailAttempts: { less_than: MAX_ATTEMPTS } }, { or: [{ emailSent: { equals: false } }, { and: [{ customerEmailSent: { equals: false } }, { email: { exists: true } }] }] }] },
  })
  for (const doc of docs) {
    await deliverInquiry(payload, doc.id, mailer, { env: opts.env, phone: await opts.phoneFor(doc.division as SiteKey), adminOrigin: opts.adminOrigin, retryDelayMs: opts.retryDelayMs })
  }
  const cutoff = new Date(opts.now.getTime() - DAY_MS).toISOString()
  const pruned = await payload.delete({ collection: 'rate-hits', where: { createdAt: { less_than: cutoff } } })
  return { retried: docs.length, pruned: pruned.docs.length }
}

/**
 * Admin button: checks the user may read this inquiry (throws otherwise), then delivers now.
 * The caller supplies the division phone (the endpoint looks it up) so this stays free of server-only site data.
 */
export async function resendInquiry(payload: Payload, id: number | string, user: unknown, mailer: Mailer, phone: string | null = null) {
  await payload.findByID({ collection: 'inquiries', id, depth: 0, overrideAccess: false, user: user as TypedUser })
  await deliverInquiry(payload, id, mailer, { env: process.env, phone, adminOrigin: siteOrigin('hub') })
}
