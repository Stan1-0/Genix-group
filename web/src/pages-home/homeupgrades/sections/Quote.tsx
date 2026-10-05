import { HuQuoteForm } from '@/components/motion/HuQuoteForm'
import { siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'
import { submitQuoteForm } from '@/inquiries/actions'
import { inquirySendMode, offlineMessage } from '@/inquiries/mode'
import { photoSettings } from '@/inquiries/photos'

const PRIVACY_URL = `${siteOrigin('hub')}/privacy`

/* Quote band: the tap-to-pick quote form from design/homeupgrades-home.html.
   Without JS it is one ordinary form (both steps showing, no photo block) posting to
   submitQuoteForm, which lands on /quote/sent. With JS, HuQuoteForm shows one step at a time,
   validates inline, uploads photos through /uploads and sends through submitQuote.
   The photo block only works when Cloudinary is configured (data-photos="on"). */
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
          <form className="hu-form" id="hu-quote-form" action={submitQuoteForm}
            data-photos={photoSettings(process.env) ? 'on' : 'off'}
            data-send-mode={inquirySendMode(process.env)} data-offline-message={offlineMessage(data.phone)} data-phone={data.phone ?? ''}>
            <input type="hidden" name="site" value="homeupgrades" />
            <input type="hidden" name="t" id="hqT" />
            <div className="hu-steps" id="hqSteps" aria-hidden="true"><span className="on"></span><span></span></div>
            <fieldset className="hu-step" data-step="1">
              <legend className="step-title" id="hqStep1Title" tabIndex={-1}>1 · The project</legend>
              <fieldset className="pills" id="hqProject" aria-describedby="hqProjectErr">
                <legend>What are we building?</legend>
                <label className="pill"><input type="radio" name="project" value="accent" required /> Accent wall &amp; TV unit</label>
                <label className="pill"><input type="radio" name="project" value="outdoor" /> Outdoor build</label>
                <label className="pill"><input type="radio" name="project" value="other" /> Something else</label>
                <p className="err" id="hqProjectErr"></p>
              </fieldset>
              <fieldset className="pills" id="hqProperty" aria-describedby="hqPropertyErr">
                <legend>For your…</legend>
                <label className="pill"><input type="radio" name="property" value="home" required /> Home</label>
                <label className="pill"><input type="radio" name="property" value="business" /> Business</label>
                <p className="err" id="hqPropertyErr"></p>
              </fieldset>
              <fieldset className="pills" id="hqTiming" aria-describedby="hqTimingErr">
                <legend>When to start</legend>
                <label className="pill"><input type="radio" name="timing" value="asap" required /> As soon as possible</label>
                <label className="pill"><input type="radio" name="timing" value="soon" /> In 1–3 months</label>
                <label className="pill"><input type="radio" name="timing" value="planning" /> Just planning</label>
                <p className="err" id="hqTimingErr"></p>
              </fieldset>
              <fieldset className="pills" id="hqBudget">
                <legend>Rough budget <span className="opt">· optional</span></legend>
                <label className="pill"><input type="radio" name="budget" value="under5" /> Under $5k</label>
                <label className="pill"><input type="radio" name="budget" value="5to15" /> $5–15k</label>
                <label className="pill"><input type="radio" name="budget" value="over15" /> $15k+</label>
                <label className="pill"><input type="radio" name="budget" value="unsure" /> Not sure</label>
              </fieldset>
              <div className="field">
                <label htmlFor="hqZip">Property ZIP</label>
                <input id="hqZip" name="zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} required aria-describedby="hqZipErr" />
                <p className="err" id="hqZipErr"></p>
              </div>
              <div className="form-actions js-only"><button type="button" className="btn btn-dark" id="hqNext">Continue <span aria-hidden="true">→</span></button></div>
            </fieldset>
            <fieldset className="hu-step" data-step="2">
              <legend className="step-title" id="hqStep2Title" tabIndex={-1}>2 · Your details</legend>
              <div className="field">
                <label htmlFor="hqNotes">Tell us about the space</label>
                <textarea id="hqNotes" name="notes" rows={4} minLength={10} maxLength={2000} required aria-describedby="hqNotesHint hqNotesErr"></textarea>
                <p className="hint" id="hqNotesHint">Room, size, what you have in mind.</p>
                <p className="err" id="hqNotesErr"></p>
              </div>
              <div className="photos" data-photos="" hidden>
                <p className="photos-label">Photos &amp; inspiration</p>
                <label className="drop" id="hqPhotos" htmlFor="hqPhotoInput">
                  <input type="file" id="hqPhotoInput" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple />
                  <span>Add up to 5 photos of your space or ideas you like.</span>
                </label>
                <ul className="photo-list" id="hqPhotoList" aria-live="polite"></ul>
                <p className="err" id="hqPhotosErr"></p>
              </div>
              <div className="field">
                <label htmlFor="hqLinks">Pinterest, Instagram or website links (optional)</label>
                <textarea id="hqLinks" name="links" rows={2} maxLength={1000}></textarea>
              </div>
              <div className="field"><label htmlFor="hqName">Name</label><input id="hqName" name="name" autoComplete="name" required aria-describedby="hqNameErr" /><p className="err" id="hqNameErr"></p></div>
              <div className="field-row">
                <div className="field"><label htmlFor="hqPhone">Phone</label><input id="hqPhone" name="phone" type="tel" autoComplete="tel" aria-describedby="hqPhoneErr hqContactHint" /><p className="err" id="hqPhoneErr"></p></div>
                <div className="field"><label htmlFor="hqEmail">Email</label><input id="hqEmail" name="email" type="email" autoComplete="email" aria-describedby="hqEmailErr hqContactHint" /><p className="err" id="hqEmailErr"></p></div>
              </div>
              <p className="hint" id="hqContactHint">Phone or email, whichever you prefer.</p>
              <fieldset className="pills" id="hqCallTime" hidden>
                <legend>Best time to call <span className="opt">· optional</span></legend>
                <label className="pill"><input type="radio" name="callTime" value="morning" /> Morning</label>
                <label className="pill"><input type="radio" name="callTime" value="afternoon" /> Afternoon</label>
                <label className="pill"><input type="radio" name="callTime" value="evening" /> Evening</label>
              </fieldset>
              <div className="hp" aria-hidden="true"><label htmlFor="hqHp">Leave this empty</label><input id="hqHp" name="company_site" tabIndex={-1} autoComplete="off" /></div>
              <p className="privacy">We use your details and photos only to reply to this request. Read our <a href={PRIVACY_URL}>privacy policy</a>.</p>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost js-only" id="hqBack">← Back</button>
                <button type="submit" className="btn btn-gold" id="hqSend">Send request <span aria-hidden="true">→</span></button>
              </div>
            </fieldset>
            <p className="sr-only" id="hqStatus" role="status" tabIndex={-1}></p>
            <div className="sent" id="hqSent" tabIndex={-1} hidden>
              <p className="sent-ref" id="hqRef">Request received</p>
              <p className="sent-title">Request received.</p>
              <p>We&apos;ll get back to you within two business days to arrange a visit.</p>
              <p className="sent-note">Forgot a photo? Just reply to our confirmation email with it.</p>
            </div>
          </form>
          <HuQuoteForm />
          <p className="quote-note">Serving California.</p>
        </div>
      </div>
    </section>
  )
}
