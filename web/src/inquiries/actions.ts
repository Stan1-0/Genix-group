'use server'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
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

export async function submitQuote(_prev: QuoteResult | null, formData: FormData): Promise<QuoteResult> {
  const js = formData.get('js') === '1'
  const siteRaw = String(formData.get('site') ?? '')
  const site: SiteKey = isSiteKey(siteRaw) && FORM_SITES.includes(siteRaw) ? siteRaw : 'logistics'
  // The enhancer never calls this in offline mode; a no-JS post gets the honest look-only message.
  if (inquirySendMode(process.env) === 'offline') {
    if (js) return { ok: false, error: 'server' }
    redirect('/quote/sent?error=offline')
  }
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
      { site, raw: formDataToRawFor(formFor(site), formData), ip, honeypot: String(formData.get('company_site') ?? ''), startedAt: Number.isFinite(t) && t > 0 ? t : null },
      {
        payload,
        // BotID only for JS submissions: a no-JS post carries no BotID token (honeypot + rate limit cover it).
        isBot: botCheckFor(js, checkBotId),
        now: () => new Date(),
        salt: process.env.IP_HASH_SALT || 'dev-only-salt',
        production: process.env.VERCEL_ENV === 'production',
      },
    )
  } catch (err) {
    console.error('submitQuote failed', err)
    result = { ok: false, error: 'server' }
  }
  if (result.ok && result.inquiryId !== null && payload) {
    // Saved: from here on only log, never turn the success into a failure.
    try {
      const id = result.inquiryId
      const p = payload
      after(() => deliverInquiry(p, id, createMailer(process.env), { env: process.env, phone, adminOrigin: siteOrigin('hub') }).catch((e) => console.error('deliverInquiry', e)))
    } catch (err) {
      console.error('submitQuote: scheduling delivery failed (the sweep will retry)', err)
    }
  }
  if (js) return result
  if (result.ok) redirect(`/quote/sent?ref=${encodeURIComponent(result.reference)}`)
  redirect(`/quote/sent?error=${result.fieldErrors ? 'invalid' : result.error}`)
}

/** The form's own action, used by a plain (no-JS) post. */
export async function submitQuoteForm(formData: FormData): Promise<void> {
  await submitQuote(null, formData) // no `js` field, so submitQuote redirects to /quote/sent
}
