import { siteOrigin } from '@/sites/config'
import type { Job } from '@/sites/jobs'
import { AVAILABILITY, EXPERIENCE, LICENSE, RECORD, SOURCE } from '@/inquiries/forms/job'

const PRIVACY_URL = `${siteOrigin('hub')}/privacy`

function Choices({ id, name, label, options, full }: { id: string; name: string; label: string; options: Record<string, string>; full?: boolean }) {
  return (
    <div className={full ? 'field full' : 'field'}>
      <label className="mono" htmlFor={id}>{label}</label>
      <select id={id} name={name} required defaultValue="">
        <option value="" disabled>Choose…</option>
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </div>
  )
}

/* Apply for a Logistics job. A plain HTML post to /careers/apply (route handler), which saves it as an enquiry of
   type "application", emails the team and 303s to /careers/sent. Phone-first and short: no résumé needed.
   Never add a question about conviction history (California Fair Chance Act). */
export function JobApplicationForm({ job }: { job: Job }) {
  return (
    <form className="label-card" id="apply-form" method="post" action="/careers/apply" aria-labelledby="applyTitle">
      <input type="hidden" name="site" value="logistics" />
      <input type="hidden" name="form" value="application" />
      <input type="hidden" name="job" value={job.slug} />
      <p className="label-ref mono">
        <span>Application · {job.title}</span>
        <span className="barcode" aria-hidden="true"></span>
      </p>
      <h2 className="h-section" id="applyTitle">Apply in two minutes.</h2>
      <p className="hint">No résumé needed. We&apos;ll call you to talk it through.</p>
      <div className="fields">
        <div className="field full">
          <label className="mono" htmlFor="aName">Name</label>
          <input id="aName" name="name" autoComplete="name" required maxLength={120} />
        </div>
        <div className="field">
          <label className="mono" htmlFor="aPhone">Phone</label>
          <input id="aPhone" name="phone" type="tel" autoComplete="tel" required />
        </div>
        <div className="field">
          <label className="mono" htmlFor="aEmail">Email (optional)</label>
          <input id="aEmail" name="email" type="email" autoComplete="email" />
        </div>
        <Choices id="aLicense" name="license" label="Your license" options={LICENSE} />
        <Choices id="aExperience" name="experience" label="Box truck experience" options={EXPERIENCE} />
        <Choices id="aRecord" name="record" label="Clean driving record, last 3 years?" options={RECORD} />
        <Choices id="aAvailability" name="availability" label="Looking for" options={AVAILABILITY} />
        <Choices id="aSource" name="source" label="Where did you hear about us?" options={SOURCE} full />
        <div className="field full">
          <label className="mono" htmlFor="aNotes">Anything else? (optional)</label>
          <textarea id="aNotes" name="notes" rows={3} maxLength={1000} placeholder="Who referred you, past employers, when you could start"></textarea>
        </div>
        <div className="hp" aria-hidden="true">
          <label htmlFor="aHp">Leave this empty</label>
          <input id="aHp" name="company_site" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="mono privacy-note hint">We use your details only to consider your application. Read our <a href={PRIVACY_URL}>privacy policy</a>.</p>
        <div className="form-actions">
          <button type="submit" className="btn btn-gold">
            Send application <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </form>
  )
}
