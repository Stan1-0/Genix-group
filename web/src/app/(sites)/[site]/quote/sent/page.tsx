import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'
import { offlineMessage } from '@/inquiries/mode'

export const metadata: Metadata = { title: 'Request', robots: { index: false, follow: false } }

const REF = /^GX-[A-Z]{3}-\d{6}$/

/* Where the quote form lands after a no-JS post (submitQuote redirects here). */
export default async function QuoteSent({ params, searchParams }: { params: Promise<{ site: string }>; searchParams: Promise<{ ref?: string; error?: string }> }) {
  const { site } = await params
  if (!isSiteKey(site) || (site !== 'logistics' && site !== 'homeupgrades' && site !== 'hub')) notFound()
  const hu = site === 'homeupgrades'
  const hub = site === 'hub'
  const { ref, error } = await searchParams
  const { phone } = await getSiteData(site)
  const ok = typeof ref === 'string' && REF.test(ref)
  const message = ok
    ? hub ? "We'll reply by email within two business days." : hu ? "We'll get back to you within two business days to arrange a visit. Forgot a photo? Just reply to our confirmation email with it." : "We'll get back to you within two business days with a price."
    : error === 'offline' ? offlineMessage(phone)
    : error === 'rate' ? rateLimitedMessage(phone)
    : error === 'invalid' ? 'Some answers need another look. Go back to the form and check the highlighted fields.'
    : serverErrorMessage(phone)
  if (hub) {
    return (
      <main id="main" className="contact-sent">
        <div className="wrap">
          <p className="label">{ok ? ref : 'Message'}</p>
          <h1>{ok ? 'Message received.' : "Couldn't send."}</h1>
          <p className="body">{message}</p>
          <a className="contact-send" href="/contact">Back to the form</a>
        </div>
      </main>
    )
  }
  return (
    <main id="main" className="wrap" style={{ paddingTop: 120, paddingBottom: 96 }}>
      <div className="label-card" style={{ maxWidth: 560 }}>
        <p className="label-ref mono"><span>{ok ? ref : 'Quote request'}</span></p>
        <h1 className="sent-title">{ok ? 'Request received.' : "Couldn't send."}</h1>
        <p>{message}</p>
        <p><a className="btn btn-ghost" href={hu ? '/#quote' : '/#quote-form'}>Back to the form</a></p>
      </div>
    </main>
  )
}
