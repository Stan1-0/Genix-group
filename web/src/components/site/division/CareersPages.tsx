import { JsonLd } from '@/components/site/JsonLd'
import { JobApplicationForm } from '@/components/forms/JobApplicationForm'
import { jobPath, jobPostingJsonLd, payLabel, type Job } from '@/sites/jobs'

/* Logistics careers: the list of open roles and one page per role (with its JobPosting JSON-LD and the application
   form). Built only from classes the Logistics services pages already use (svcpage-*, ticks, promises). No motion.
   The phone "Get a quote" bar is off here (data-no-quote-bar): these pages are for drivers, not customers. */

const TYPE: Record<Job['employmentType'][number], string> = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACTOR: 'Contract', TEMPORARY: 'Temporary' }
const facts = (j: Job) => [payLabel(j), j.employmentType.map((t) => TYPE[t]).join(' or '), `${j.location.locality}, ${j.location.region}`]

export function CareersPage({ jobs }: { jobs: Job[] }) {
  return (
    <main id="main" data-no-quote-bar>
      <section className="svcpage-hero" id="careers-top">
        <div className="wrap">
          <p className="label">Careers</p>
          <h1 className="h-display">Drive with Genix.</h1>
          <p className="body svcpage-lede">
            We move freight for San Diego businesses and homes for the families who live here. We&apos;re looking for drivers
            who take pride in careful, on-time work.
          </p>
        </div>
      </section>
      {jobs.length ? (
        jobs.map((j) => (
          <section className="svcpage-item" id={j.slug} key={j.slug}>
            <div className="wrap svcpage-grid">
              <div className="svcpage-copy">
                <h2 className="h-section">{j.title}</h2>
                <ul className="ticks">
                  {facts(j).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="body">{j.summary}</p>
                <a className="btn btn-gold" href={jobPath(j)}>
                  See the job and apply<span className="sr-only">: {j.title}</span> <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </section>
        ))
      ) : (
        <section className="svcpage-item" id="none">
          <div className="wrap">
            <h2 className="h-section">No open roles right now.</h2>
            <p className="body">Check back soon, or email hello@thegenixgroup.com and tell us about yourself.</p>
          </div>
        </section>
      )}
    </main>
  )
}

export function JobPage({ job }: { job: Job }) {
  return (
    <main id="main" data-no-quote-bar>
      <JsonLd data={jobPostingJsonLd(job)} />
      <section className="svcpage-hero" id="job-top">
        <div className="wrap">
          <nav aria-label="Breadcrumb">
            <p className="label">
              <a href="/">Home</a> / <a href="/careers">Careers</a> / <span aria-current="page">{job.title}</span>
            </p>
          </nav>
          <p className="mono">We&apos;re hiring · {facts(job).join(' · ')}</p>
          <h1 className="h-display">{job.title}</h1>
          <p className="body svcpage-lede">{job.summary}</p>
          <a className="btn btn-gold" href="#apply-form">
            Apply now <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
      <section className="svcpage-item" id="role">
        <div className="wrap svcpage-grid">
          <div className="svcpage-copy">
            <h2 className="h-section">What you&apos;ll do</h2>
            <ul className="ticks">
              {job.duties.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <h2 className="h-section" style={{ marginTop: 40 }}>What you need</h2>
            <ul className="ticks">
              {job.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="sec why" id="offer" aria-labelledby="offerTitle">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="label">What we offer</p>
              <h2 className="h-section" id="offerTitle">{payLabel(job)}, plus overtime.</h2>
            </div>
            <p className="body">{job.schedule}</p>
          </div>
          <ul className="promises">
            {job.offers.map((o) => (
              <li key={o}>
                <p>{o}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="svcpage-item" id="apply">
        <div className="wrap">
          <JobApplicationForm job={job} />
        </div>
      </section>
    </main>
  )
}
