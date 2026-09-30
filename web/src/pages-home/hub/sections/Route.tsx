import { siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'

const Arrow = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
)

/* Route: "What do you need?" and the shared email line. */
export function Route({ data }: { data: SiteData }) {
  const email = data.email || 'hello@thegenixgroup.com'
  return (
    <section className="route" id="contact">
      <div className="wrap">
        <p className="label" data-reveal>
          Start a conversation
        </p>
        <h2 data-reveal>
          What do you <span className="gold">need?</span>
        </h2>
        <div className="options">
          <a
            className="option"
            href={`${siteOrigin('logistics')}/contact`}
            style={{ '--c': 'var(--gold-text)', '--c-dark': 'var(--gold)' } as React.CSSProperties}
            data-reveal
          >
            <span className="verb">Move</span>
            <b>Ship something</b>
            <p>Freight, haulage, last-mile delivery and courier.</p>
            <span className="go">
              Get a freight quote
              <Arrow />
            </span>
          </a>
          <a
            className="option"
            href={`${siteOrigin('homeupgrades')}/contact`}
            style={{ '--c': 'var(--make)', '--c-dark': 'var(--make-light)' } as React.CSSProperties}
            data-reveal
          >
            <span className="verb">Make</span>
            <b>Upgrade a space</b>
            <p>Accent walls, TV units, fittings and outdoor builds.</p>
            <span className="go">
              Plan an upgrade
              <Arrow />
            </span>
          </a>
          <a
            className="option"
            href={`${siteOrigin('multimedia')}/contact`}
            style={{ '--c': 'var(--tell)', '--c-dark': 'var(--tell-light)' } as React.CSSProperties}
            data-reveal
          >
            <span className="verb">Tell</span>
            <b>Tell your story</b>
            <p>Photography, videography, branding and design.</p>
            <span className="go">
              Book a shoot
              <Arrow />
            </span>
          </a>
        </div>
        <p className="route-alt" data-reveal>
          Need more than one, or not sure? Email <a href={`mailto:${email}`}>{email}</a> and
          we&apos;ll bring the right teams together.
        </p>
      </div>
    </section>
  )
}
