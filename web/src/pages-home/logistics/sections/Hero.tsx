import { GoldHeading } from '../../GoldHeading'
import { LogisticsQuoteForm } from '@/components/forms/LogisticsQuoteForm'
import type { SiteData } from '@/sites/data-shape'

const LEAD = 'Business deliveries and home moves, priced before we lift anything, with a real person to call when plans change.'

/* Hero: the quote starter. Without JS the form posts to submitQuoteForm (lands on /quote/sent);
   with JS the quote-form enhancer validates inline and sends through submitQuote. The form lives in LogisticsQuoteForm. */
export function Hero({ data }: { data: SiteData }) {
  return (
    <section className="hero on-dark" id="hero" data-hero>
      <div className="wrap">
        <div className="hero-copy">
          <p className="mono hero-eyebrow">Based in San Diego · Nationwide</p>
          <GoldHeading site="logistics" text={data.heroHeading} className="h-display" />
          <p className="lead">{data.heroSubheading || LEAD}</p>
        </div>

        <LogisticsQuoteForm data={data} />
      </div>
    </section>
  )
}
