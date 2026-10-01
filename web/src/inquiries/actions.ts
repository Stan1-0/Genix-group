'use server'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { checkBotId } from 'botid/server'
import config from '@payload-config'
import { isSiteKey, siteOrigin, type SiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { formDataToRaw } from './schema'
import { processQuote, type QuoteResult } from './pipeline'
import { createMailer, deliverInquiry } from './deliver'
import { inquirySendMode } from './mode'

const FORM_SITES: SiteKey[] = ['logistics']

export async function submitQuote(_prev: QuoteResult | null, formData: FormData): Promise<QuoteResult> {
  const js = formData.get('js') === '1'
  const siteRaw = String(formData.get('site') ?? '')
  const site: SiteKey = isSiteKey(siteRaw) && FORM_SITES.includes(siteRaw) ? siteRaw : 'logistics'
  let result: QuoteResult
  if (inquirySendMode(process.env) === 'offline') {
    result = { ok: false, error: 'server' } // the enhancer never calls this in offline mode; a no-JS post lands here
  } else {
    try {
      const h = await headers()
      const ip = (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim()
      const payload = await getPayload({ config })
      const t = Number(formData.get('t'))
      result = await processQuote(
        { site, raw: formDataToRaw(formData), ip, honeypot: String(formData.get('company_site') ?? ''), startedAt: Number.isFinite(t) && t > 0 ? t : null },
        {
          payload,
          isBot: async () => (await checkBotId()).isBot,
          now: () => new Date(),
          salt: process.env.IP_HASH_SALT || 'dev-only-salt',
          production: process.env.VERCEL_ENV === 'production',
        },
      )
      if (result.ok && result.inquiryId !== null) {
        const id = result.inquiryId
        const phone = (await getSiteData(site)).phone
        after(() => deliverInquiry(payload, id, createMailer(process.env), { env: process.env, phone, adminOrigin: siteOrigin('hub') }).catch((e) => console.error('deliverInquiry', e)))
      }
    } catch (err) {
      console.error('submitQuote failed', err)
      result = { ok: false, error: 'server' }
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
