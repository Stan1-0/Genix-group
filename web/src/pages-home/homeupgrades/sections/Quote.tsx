import { HuQuoteFormBlock } from '@/components/forms/HuQuoteFormBlock'
import type { SiteData } from '@/sites/data-shape'

/* Quote band: the tap-to-pick quote form from design/homeupgrades-home.html.
   The form itself (and its client enhancer) lives in HuQuoteFormBlock, shared with the Contact page. */
export function Quote({ data }: { data: SiteData }) {
  return (
    <section className="quote" id="quote">
      <div className="wrap">
        <div>
          <p className="label" data-reveal>
            Get a quote
          </p>
          <h2 className="h-display" data-split>
            Tell us about <span className="gold">the space.</span>
          </h2>
        </div>
        <div data-reveal>
          <p className="body">
            A few photos and a sentence about what you want is enough to start. We&apos;ll arrange a
            visit and send a written quote.
          </p>
          <HuQuoteFormBlock data={data} />
          <p className="quote-note">Serving California.</p>
        </div>
      </div>
    </section>
  )
}
