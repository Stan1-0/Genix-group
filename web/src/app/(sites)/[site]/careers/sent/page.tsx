import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteData } from '@/sites/data'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'
import { offlineMessage } from '@/inquiries/mode'

export const metadata: Metadata = { title: 'Application', robots: { index: false, follow: false } }

const REF = /^GX-[A-Z]{3}-\d{6}$/

/* Where the job application form lands (submitQuote redirects here for form=application). */
export default async function ApplicationSent({ params, searchParams }: { params: Promise<{ site: string }>; searchParams: Promise<{ ref?: string; error?: string }> }) {
  const { site } = await params
  if (site !== 'logistics') notFound()
  const { ref, error } = await searchParams
  const { phone } = await getSiteData('logistics')
  const ok = typeof ref === 'string' && REF.test(ref)
  const message = ok
    ? 'Thanks for applying. We read every application and will call you if your experience is a fit.'
    : error === 'offline' ? offlineMessage(phone)
    : error === 'rate' ? rateLimitedMessage(phone)
    : error === 'invalid' ? 'Some answers need another look. Go back to the form and check every field is filled in.'
    : serverErrorMessage(phone)
  return (
    <main id="main" className="wrap" style={{ paddingTop: 120, paddingBottom: 96 }}>
      <div className="label-card" style={{ maxWidth: 560 }}>
        <p className="label-ref mono"><span>{ok ? ref : 'Application'}</span></p>
        <h1 className="sent-title">{ok ? 'Application received.' : "Couldn't send."}</h1>
        <p>{message}</p>
        <p><a className="btn btn-ghost" href="/careers">Back to careers</a></p>
      </div>
    </main>
  )
}
