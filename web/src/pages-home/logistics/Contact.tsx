import { LogisticsQuoteForm } from '@/components/forms/LogisticsQuoteForm'
import { ContactCard } from '@/components/site/division/ContactCard'
import type { SiteData } from '@/sites/data-shape'

/* Contact page: the home hero's two-column layout with the details card under the lede and the
   same quote form on the right (design/logistics-contact.html). No motion: this page has no MotionRoot. */
export function LogisticsContact({ data }: { data: SiteData }) {
  return (
    <main id="main" data-no-quote-bar>
      <section className="hero on-dark contact-hero" id="hero">
        <div className="wrap">
          <div className="hero-copy">
            <p className="mono hero-eyebrow">Contact</p>
            <h1 className="h-display">Real people. <span className="gold">Real answers.</span></h1>
            <p className="lead">Send the route and what&apos;s moving, or call us. We&apos;ll come back with a price within two business days.</p>
            <ContactCard site="logistics" data={data} />
          </div>
          <LogisticsQuoteForm data={data} />
        </div>
      </section>
    </main>
  )
}
