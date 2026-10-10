import { HubMessageForm } from '@/components/forms/HubMessageForm'
import type { About } from '@/inquiries/forms/hub'
import { siteOrigin } from '@/sites/config'
import { formatAddress, type SiteData } from '@/sites/data-shape'
import { Arrow } from './Arrow'
import { CONTACT_HEADINGS } from './contact-headings'

export { CONTACT_HEADINGS }

/* Hub Contact page (design/hub-contact.html). No motion. The cards reuse the home Route section's copy. */
export function HubContact({ data, about }: { data: SiteData; about: About | null }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  const cards = [
    { href: `${siteOrigin('logistics')}/contact`, c: 'var(--gold-text)', dark: 'var(--gold)', verb: 'Move', title: 'Ship something', body: 'Freight, haulage, last-mile delivery and courier.', go: 'Get a freight quote' },
    { href: `${siteOrigin('homeupgrades')}/contact`, c: 'var(--make)', dark: 'var(--make-light)', verb: 'Make', title: 'Upgrade a space', body: 'Accent walls, TV units, outdoor builds and handyman jobs.', go: 'Plan an upgrade' },
    { href: '/contact?about=multimedia#message', c: 'var(--tell)', dark: 'var(--tell-light)', verb: 'Tell', title: 'Tell your story', body: 'Photography, videography, branding and design.', go: 'Send us a message' },
  ]
  return (
    <main id="main">
      <section className="contact-hero" id="contact-top">
        <div className="wrap">
          <p className="label">Contact</p>
          <h1>Talk to the group.</h1>
          <p className="body">Tell us what you need and we&apos;ll put the right team on it. Ready for a price? Go straight to the business.</p>
        </div>
      </section>
      <section className="contact-routes" id="contact-routes">
        <div className="wrap">
          <h2>{CONTACT_HEADINGS[0]}</h2>
          <div className="options">
            {cards.map((k) => (
              <a key={k.verb} className="option" href={k.href} style={{ '--c': k.c, '--c-dark': k.dark } as React.CSSProperties}>
                <span className="verb">{k.verb}</span>
                <b>{k.title}</b>
                <p>{k.body}</p>
                <span className="go">{k.go}<Arrow /></span>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section className="contact-message" id="contact-message">
        <div className="wrap contact-grid">
          <HubMessageForm data={data} about={about} />
          <div className="contact-details">
            <h2>{CONTACT_HEADINGS[2]}</h2>
            <ul className="facts">
              <li><span>Head office</span><span>San Diego, CA</span></li>
              <li><span>Email</span><span><a href={`mailto:${email}`}>{email}</a></span></li>
              {data.address && <li><span>Address</span><span>{formatAddress(data.address)}</span></li>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
