import { GoldHeading } from '../../GoldHeading'
import { QuoteForm } from '@/components/motion/QuoteForm'
import type { SiteData } from '@/sites/data-shape'
import { offlineMessage, quoteSendMode } from '../send-mode'

const LEAD = 'Business deliveries and home moves, priced before we lift anything, with a real person to call when plans change.'

/* Hero: the quote starter. Form behaviour is attached by the quote-form enhancer. */
export function Hero({ data }: { data: SiteData }) {
  return (
    <section className="hero on-dark" id="hero" data-hero>
      <div className="wrap">
        <div className="hero-copy">
          <p className="mono hero-eyebrow">Based in San Diego · Nationwide</p>
          <GoldHeading site="logistics" text={data.heroHeading} className="h-display" />
          <p className="lead">{data.heroSubheading || LEAD}</p>
        </div>

        <form className="label-card quote-form" id="quote-form" action="#" method="dialog" aria-labelledby="formTitle"
          data-send-mode={quoteSendMode(process.env.VERCEL_ENV)} data-offline-message={offlineMessage(data.phone)}>
          <p className="label-ref mono">
            <span id="qRef">Quote request · New</span>
            <span className="barcode" aria-hidden="true"></span>
          </p>
          <h2 className="sr-only" id="formTitle">Get a price</h2>
          <fieldset className="kind">
            <legend className="sr-only">What do you need moved?</legend>
            <label>
              <input type="radio" name="kind" value="business" defaultChecked /> Ship for your business
            </label>
            <label>
              <input type="radio" name="kind" value="move" /> Plan a move
            </label>
          </fieldset>

          <fieldset className="fields" data-step="1" aria-labelledby="qStep1Title">
            <h3 className="step-title" id="qStep1Title" tabIndex={-1}>1 · The route</h3>
            <div className="field">
              <label className="mono" htmlFor="qFrom">Pickup ZIP</label>
              <input id="qFrom" name="from" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" title="5-digit ZIP code" required aria-describedby="qFromErr" />
              <p className="err" id="qFromErr"></p>
            </div>
            <div className="field">
              <label className="mono" htmlFor="qTo">Drop-off ZIP</label>
              <input id="qTo" name="to" inputMode="numeric" pattern="[0-9]{5}" title="5-digit ZIP code" required aria-describedby="qToErr" />
              <p className="err" id="qToErr"></p>
            </div>
            <div className="field">
              <label className="mono" htmlFor="qDate">Date</label>
              <input id="qDate" name="date" type="date" aria-describedby="qDateErr" />
              <label className="flex-date">
                <input type="checkbox" id="qFlex" name="flexible" /> Flexible
              </label>
              <p className="err" id="qDateErr"></p>
            </div>
            <div className="field">
              <label className="mono" htmlFor="qLoad">What&apos;s moving</label>
              <select id="qLoad" name="load" required aria-describedby="qLoadErr">
                <option value="">Choose…</option>
                <optgroup label="Business" data-kind="business">
                  <option value="pallets">Pallets</option>
                  <option value="parcels">Parcels or boxes</option>
                  <option value="truckload">Full truckload</option>
                  <option value="courier">Same-day courier</option>
                </optgroup>
                <optgroup label="Move" data-kind="move">
                  <option value="studio">Studio</option>
                  <option value="1-2bed">1–2 bedroom home</option>
                  <option value="3bed">3+ bedroom home</option>
                  <option value="office">Office</option>
                </optgroup>
              </select>
              <p className="err" id="qLoadErr"></p>
            </div>
            <div className="field full" id="qPalletsField">
              <label className="mono" htmlFor="qPallets">How many pallets</label>
              <input id="qPallets" name="pallets" type="number" min={1} max={26} inputMode="numeric" aria-describedby="qPalletsErr" />
              <p className="err" id="qPalletsErr"></p>
            </div>
            <div className="form-actions js-only">
              <button type="button" className="btn btn-gold" id="qNext">
                Continue <span aria-hidden="true">→</span>
              </button>
            </div>
          </fieldset>

          <fieldset className="fields" data-step="2" aria-labelledby="qStep2Title">
            <h3 className="step-title" id="qStep2Title" tabIndex={-1}>2 · Your details</h3>
            <div className="field full">
              <label className="mono" htmlFor="qName">Name</label>
              <input id="qName" name="name" autoComplete="name" required aria-describedby="qNameErr" />
              <p className="err" id="qNameErr"></p>
            </div>
            <div className="field">
              <label className="mono" htmlFor="qPhone">Phone</label>
              <input id="qPhone" name="phone" type="tel" autoComplete="tel" aria-describedby="qPhoneErr qContactHint" />
              <p className="err" id="qPhoneErr"></p>
            </div>
            <div className="field">
              <label className="mono" htmlFor="qEmail">Email</label>
              <input id="qEmail" name="email" type="email" autoComplete="email" aria-describedby="qEmailErr qContactHint" />
              <p className="err" id="qEmailErr"></p>
            </div>
            <p className="hint" id="qContactHint">Phone or email, whichever you prefer.</p>
            <div className="field full">
              <label className="mono" htmlFor="qNotes">Notes (optional)</label>
              <textarea id="qNotes" name="notes" rows={3}></textarea>
            </div>
            <div className="hp" aria-hidden="true">
              <label htmlFor="qHp">Leave this empty</label>
              <input id="qHp" name="company_site" tabIndex={-1} autoComplete="off" />
            </div>
            <p className="mono no-js-note">Online requests aren&apos;t available yet — call or email us.</p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost js-only" id="qBack">← Back</button>
              <button type="submit" className="btn btn-gold" id="qSend">
                Send request <span aria-hidden="true">→</span>
              </button>
            </div>
          </fieldset>

          <div className="sent" id="qSent" tabIndex={-1} hidden>
            <p className="sent-title">Request received.</p>
            <p>
              We&apos;ll call you back <span className="ph">within one business day</span> with a price.
            </p>
          </div>
          <p className="sr-only" id="qStatus" aria-live="polite" tabIndex={-1}></p>
        </form>
      </div>
      <QuoteForm />
    </section>
  )
}
