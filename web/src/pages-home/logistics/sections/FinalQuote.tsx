import type { SiteData } from '@/sites/data-shape'

/* Final quote: a label card that points back to the hero form */
export function FinalQuote({ data }: { data: SiteData }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  return (
    <section className="sec final lane-top" id="quote" aria-labelledby="quoteTitle">
      <div className="wrap">
        <div>
          <p className="label">Get a quote</p>
          <h2 className="h-section" id="quoteTitle" data-split>
            Ready when <span className="gold">you are.</span>
          </h2>
          <p className="body">Tell us where it&apos;s going and what&apos;s moving. We&apos;ll come back with a price.</p>
        </div>
        <div className="label-card">
          <p className="label-ref mono">
            <span>Quote request · New</span>
            <span className="barcode" aria-hidden="true"></span>
          </p>
          <p className="final-line">Two short steps. No account needed.</p>
          <div className="final-actions">
            <a className="btn btn-gold" href="#quote-form" data-start-quote>
              Start a quote <span aria-hidden="true">→</span>
            </a>
            {data.phone ? (
              <a className="btn btn-ghost" href={`tel:${data.phone.replace(/[^+\d]/g, '')}`}>Call {data.phone}</a>
            ) : (
              <a className="btn btn-ghost" href="tel:+10000000000"><span className="ph">Call (000) 000-0000</span></a>
            )}
          </div>
          <p className="mono final-mail">
            Or email <a href={`mailto:${email}`}>{email}</a>
          </p>
        </div>
      </div>
    </section>
  )
}
