import { HubContactForm } from '@/components/motion/HubContactForm'
import { submitQuoteForm } from '@/inquiries/actions'
import { ABOUT, type About } from '@/inquiries/forms/hub'
import { inquirySendMode, offlineMessage } from '@/inquiries/mode'
import { CONTACT_HEADINGS } from '@/pages-home/hub/contact-headings'
import { siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'

const PRIVACY_URL = `${siteOrigin('hub')}/privacy`

/* The hub Contact page's message form (design/hub-contact.html). Without JS it is an ordinary form
   posting to submitQuoteForm, which lands on /quote/sent. One instance per page: the ids are fixed. */
export function HubMessageForm({ data, about }: { data: SiteData; about: About | null }) {
  return (
    <>
    <form className="contact-form" id="message" action={submitQuoteForm} aria-labelledby="messageTitle"
      data-send-mode={inquirySendMode(process.env)} data-offline-message={offlineMessage(data.phone)} data-phone={data.phone ?? ''}>
      <input type="hidden" name="site" value="hub" />
      <input type="hidden" name="t" id="hcT" />
      <h2 id="messageTitle">{CONTACT_HEADINGS[1]}</h2>
      <fieldset className="contact-about" id="hcAbout" aria-describedby="hcAboutErr">
        <legend>Which business is this about?</legend>
        {(Object.keys(ABOUT) as About[]).map((value, i) => (
          <label key={value}>
            <input type="radio" name="about" value={value} defaultChecked={about === value} required={i === 0} /> {ABOUT[value]}
          </label>
        ))}
        <p className="err" id="hcAboutErr"></p>
      </fieldset>
      <div className="field"><label htmlFor="hcName">Name</label><input id="hcName" name="name" autoComplete="name" maxLength={120} required aria-describedby="hcNameErr" /><p className="err" id="hcNameErr"></p></div>
      <div className="field-row">
        <div className="field"><label htmlFor="hcEmail">Email</label><input id="hcEmail" name="email" type="email" autoComplete="email" maxLength={254} required aria-describedby="hcEmailErr" /><p className="err" id="hcEmailErr"></p></div>
        <div className="field"><label htmlFor="hcPhone">Phone <span className="hint">(optional)</span></label><input id="hcPhone" name="phone" type="tel" autoComplete="tel" maxLength={40} aria-describedby="hcPhoneErr" /><p className="err" id="hcPhoneErr"></p></div>
      </div>
      <div className="field"><label htmlFor="hcMessage">Message</label><textarea id="hcMessage" name="message" rows={6} minLength={10} maxLength={2000} required aria-describedby="hcMessageHint hcMessageErr"></textarea><p className="hint" id="hcMessageHint">What you need, and any dates or places that matter.</p><p className="err" id="hcMessageErr"></p></div>
      <div className="hp" aria-hidden="true"><label htmlFor="hcHp">Leave this empty</label><input id="hcHp" name="company_site" tabIndex={-1} autoComplete="off" /></div>
      <p className="privacy">We use your details only to reply to this message. Read our <a href={PRIVACY_URL}>privacy policy</a>.</p>
      <button type="submit" className="contact-send" id="hcSend">Send message <span aria-hidden="true">↗</span></button>
      <p className="sr-only" id="hcStatus" role="status" tabIndex={-1}></p>
      <div className="sent" id="hcSent" tabIndex={-1} hidden>
        <p className="sent-ref" id="hcRef">Message received</p>
        <p className="sent-title">Message received.</p>
        <p>We&apos;ll reply by email within two business days.</p>
      </div>
    </form>
    <HubContactForm />
    </>
  )
}
