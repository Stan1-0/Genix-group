import { HuQuoteFormBlock } from '@/components/forms/HuQuoteFormBlock'
import { ContactCard } from '@/components/site/division/ContactCard'
import type { SiteData } from '@/sites/data-shape'

/* Contact page: the home Quote section's two-column layout with the details card under the heading and
   the same quote form beside it (design/homeupgrades-contact.html). No motion: no MotionRoot here. */
export function HomeUpgradesContact({ data }: { data: SiteData }) {
  return (
    <main id="main" data-no-quote-bar>
      <section className="quote contact-quote" id="quote">
        <div className="wrap">
          <div className="contact-copy">
            <p className="label">Contact</p>
            <h1 className="h-display">Let&apos;s talk about <span className="gold">your space.</span></h1>
          </div>
          <div className="contact-form">
            <p className="body">A few photos and a sentence about what you want is enough to start. We&apos;ll arrange a visit and send a written quote.</p>
            <HuQuoteFormBlock data={data} />
          </div>
          <ContactCard site="homeupgrades" data={data} />
        </div>
      </section>
    </main>
  )
}
