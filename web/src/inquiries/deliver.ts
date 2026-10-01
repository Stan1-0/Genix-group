import type { Payload, TypedUser } from 'payload'
import { Resend } from 'resend'
import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { customerEmail, teamEmail } from './email'
import type { QuoteInput } from './schema'

type Env = Record<string, string | undefined>
export type Mail = { from: string; to: string; replyTo?: string; subject: string; html: string; text: string; idempotencyKey: string }
export type Mailer = (m: Mail) => Promise<void>

const MAX_ATTEMPTS = 5

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

async function twice(fn: () => Promise<void>) {
  try { await fn() } catch { await fn() }
}

export async function deliverInquiry(payload: Payload, id: number | string, mailer: Mailer, opts: { env: Env; phone: string | null; adminOrigin: string }): Promise<void> {
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

  if (!doc.emailSent) {
    const e = teamEmail({ site, reference: doc.reference, q, adminUrl: `${opts.adminOrigin}/admin/collections/inquiries/${doc.id}` })
    try {
      await twice(() => mailer({ from, to: inbox, replyTo: q.email ?? undefined, ...e, idempotencyKey: `${doc.reference}:team` }))
      update.emailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  if (q.email && !doc.customerEmailSent) {
    const e = customerEmail({ site, reference: doc.reference, q, phone: opts.phone })
    try {
      await twice(() => mailer({ from, to: q.email!, replyTo: inbox, ...e, idempotencyKey: `${doc.reference}:customer` }))
      update.customerEmailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  update.lastEmailError = errors.length ? errors.join(' | ').slice(0, 500) : null
  await payload.update({ collection: 'inquiries', id: doc.id, data: update })
}

export async function retryUnsent(payload: Payload, mailer: Mailer, opts: { env: Env; phoneFor: (site: SiteKey) => Promise<string | null>; adminOrigin: string; now: Date }) {
  const { docs } = await payload.find({
    collection: 'inquiries', limit: 100, depth: 0,
    where: { and: [{ emailAttempts: { less_than: MAX_ATTEMPTS } }, { or: [{ emailSent: { equals: false } }, { and: [{ customerEmailSent: { equals: false } }, { email: { exists: true } }] }] }] },
  })
  for (const doc of docs) {
    await deliverInquiry(payload, doc.id, mailer, { env: opts.env, phone: await opts.phoneFor(doc.division as SiteKey), adminOrigin: opts.adminOrigin })
  }
  const cutoff = new Date(opts.now.getTime() - 86_400_000).toISOString()
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
