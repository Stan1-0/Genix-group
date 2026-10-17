import 'server-only'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'
import { checkBotId } from 'botid/server'
import config from '@payload-config'
import { isSiteKey, siteOrigin, type SiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { FORM_SITES, formDataToRawFor, formFor } from './forms'
import { processQuote, type QuoteResult } from './pipeline'
import { createMailer, deliverInquiry } from './deliver'
import { inquirySendMode } from './mode'
import { botCheckFor } from './bot-check'
import { cloudinaryClient, photoSettings, verifyPhotos } from './photos'

/** Job applications share the pipeline; only Logistics has them, and they land on their own confirmation page. */
const formOf = (formData: FormData) => (formData.get('form') === 'application' ? ('application' as const) : undefined)
export const sentPathFor = (formData: FormData) => (formOf(formData) ? '/careers/sent' : '/quote/sent')

/** Where a plain (no-JS) post lands after `submitInquiry`. */
export function sentUrl(formData: FormData, outcome: QuoteResult | 'offline'): string {
  const base = sentPathFor(formData)
  if (outcome === 'offline') return `${base}?error=offline`
  if (outcome.ok) return `${base}?ref=${encodeURIComponent(outcome.reference)}`
  return `${base}?error=${outcome.fieldErrors ? 'invalid' : outcome.error}`
}

/**
 * Saves one form post and schedules its emails. `js` marks a post from a script enhancer, which carries a BotID
 * token; a plain post doesn't (the honeypot and rate limit cover it). 'offline' means the site takes no enquiries.
 */
export async function submitInquiry(formData: FormData, js: boolean): Promise<QuoteResult | 'offline'> {
  const siteRaw = String(formData.get('site') ?? '')
  const site: SiteKey = isSiteKey(siteRaw) && FORM_SITES.includes(siteRaw) ? siteRaw : 'logistics'
  const form = formOf(formData)
  if (form && site !== 'logistics') return { ok: false, error: 'server' }
  if (inquirySendMode(process.env) === 'offline') return 'offline'
  let result: QuoteResult
  let payload: Payload | null = null
  let phone: string | null = null
  try {
    const h = await headers()
    const ip = (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim()
    payload = await getPayload({ config })
    phone = (await getSiteData(site)).phone // resolved before saving, so nothing after the save can fail the request
    const t = Number(formData.get('t'))
    result = await processQuote(
      { site, form, raw: formDataToRawFor(formFor(site, form), formData), photoIds: formData.getAll('photos').map(String).slice(0, 10), ip, honeypot: String(formData.get('company_site') ?? ''), startedAt: Number.isFinite(t) && t > 0 ? t : null },
      {
        payload,
        isBot: botCheckFor(js, checkBotId),
        now: () => new Date(),
        salt: process.env.IP_HASH_SALT || 'dev-only-salt',
        production: process.env.VERCEL_ENV === 'production',
        verifyPhotos: (ids) => { const s = photoSettings(process.env); return verifyPhotos(ids, s ? cloudinaryClient(s) : null) },
      },
    )
  } catch (err) {
    console.error('submitInquiry failed', err)
    result = { ok: false, error: 'server' }
  }
  if (result.ok && result.inquiryId !== null && payload) {
    // Saved: from here on only log, never turn the success into a failure.
    try {
      const id = result.inquiryId
      const p = payload
      after(() => deliverInquiry(p, id, createMailer(process.env), { env: process.env, phone, adminOrigin: siteOrigin('hub'), photos: { settings: photoSettings(process.env), nowSec: Math.floor(Date.now() / 1000) } }).catch((e) => console.error('deliverInquiry', e)))
    } catch (err) {
      console.error('submitInquiry: scheduling delivery failed (the sweep will retry)', err)
    }
  }
  return result
}
