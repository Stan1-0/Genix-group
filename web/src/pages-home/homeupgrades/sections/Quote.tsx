import type { SiteData } from '@/sites/data-shape'
import { telHref } from './phone'

/* Quote band: email and call actions (the full form comes with the Contact page). */
export function Quote({ data }: { data: SiteData }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  return (
    <section className="quote" id="quote">
      <div className="wrap">
        <div>
          <p className="label" data-reveal>
            Let&apos;s make it happen
          </p>
          <h2 className="h-display" data-split>
            A small step toward <span className="gold"> a better space.</span>
          </h2>
        </div>
        <div data-reveal>
          <p className="body">
            A few photos and a sentence about what you want is enough to start. We&apos;ll arrange a
            visit and send a written quote.
          </p>
          <div className="quote-actions">
            <a className="btn btn-dark" href={`mailto:${email}?subject=Home%20upgrade%20quote`}>
              Get a Free Quote<span aria-hidden="true">→</span>
            </a>
            <a className="btn btn-ghost" href={telHref(data.phone)}>
              {data.phone ? (
                <>Call {data.phone}</>
              ) : (
                <span className="ph">Call (000) 000-0000</span>
              )}
            </a>
          </div>
          <p className="quote-note">
            Serving <span className="ph">[service area]</span>. The full quote form comes with the
            Contact page.
          </p>
        </div>
      </div>
    </section>
  )
}
