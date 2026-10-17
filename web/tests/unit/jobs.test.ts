import { describe, expect, it } from 'vitest'
import { JOBS, jobPostingJsonLd, openJobBySlug, openJobs } from '@/sites/jobs'
import { jobApplicationForm, parseJobApplication } from '@/inquiries/forms/job'
import { formFor } from '@/inquiries/forms'
import { customerEmail, teamEmail } from '@/inquiries/email'
import { sitemapXml } from '@/sites/seo'
import { llmsTxt } from '@/sites/llms'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'
const raw = { job: 'box-truck-driver', name: 'Sam Rivera', phone: '(619) 555-0142', email: '', license: 'class-c', experience: '1-2', record: 'yes', availability: 'full-time', source: 'indeed', notes: '' }

describe('jobs', () => {
  it('has the box truck driver role open on Logistics only', () => {
    expect(openJobs('logistics', '2026-10-17').map((j) => j.slug)).toEqual(['box-truck-driver'])
    for (const k of ['hub', 'homeupgrades', 'multimedia'] as const) expect(openJobs(k, '2026-10-17')).toEqual([])
  })
  it('drops a job after validThrough', () => {
    const j = JOBS[0]
    expect(openJobBySlug('logistics', j.slug, j.validThrough)).toBeDefined()
    const dayAfter = new Date(Date.parse(j.validThrough) + 86_400_000).toISOString().slice(0, 10)
    expect(openJobBySlug('logistics', j.slug, dayAfter)).toBeUndefined()
  })
  it('never uses a slug that clashes with /careers/apply or /careers/sent', () => {
    for (const j of JOBS) expect(['apply', 'sent']).not.toContain(j.slug)
    expect(new Set(JOBS.map((j) => j.slug)).size).toBe(JOBS.length)
  })
  it('shows the pay range in the summary (California pay transparency)', () => {
    for (const j of JOBS) expect(j.summary).toContain(`$${j.pay.min}–$${j.pay.max}`)
  })
  it('builds a JobPosting with the fields Google for Jobs requires', () => {
    const ld = jobPostingJsonLd(JOBS[0], root) as Record<string, any>
    expect(ld['@type']).toBe('JobPosting')
    for (const k of ['title', 'description', 'datePosted', 'validThrough', 'hiringOrganization', 'jobLocation', 'baseSalary', 'employmentType']) expect(ld[k]).toBeTruthy()
    expect(ld.url).toBe('https://logistics.thegenixgroup.com/careers/box-truck-driver')
    expect(ld.hiringOrganization).toMatchObject({ name: 'Genix Logistics', sameAs: 'https://logistics.thegenixgroup.com/' })
    expect(ld.jobLocation.address).toMatchObject({ addressLocality: 'San Diego', addressRegion: 'CA', addressCountry: 'US' })
    expect(ld.baseSalary.value).toEqual({ '@type': 'QuantitativeValue', minValue: 22, maxValue: 26, unitText: 'HOUR' })
  })
  it('lists careers and the open job on the Logistics sitemap and llms.txt only', () => {
    expect(sitemapXml('logistics', root)).toContain('<loc>https://logistics.thegenixgroup.com/careers/box-truck-driver</loc>')
    expect(sitemapXml('logistics', root)).toContain('<loc>https://logistics.thegenixgroup.com/careers</loc>')
    expect(sitemapXml('homeupgrades', root)).not.toContain('/careers')
    expect(llmsTxt('logistics', toSiteData('logistics', null), root)).toContain('[Box Truck Driver](https://logistics.thegenixgroup.com/careers/box-truck-driver): $22–$26 an hour')
  })
})

describe('job application form', () => {
  it('is picked by type and stored as an application', () => {
    expect(formFor('logistics', 'application')).toBe(jobApplicationForm)
    expect(formFor('logistics')).not.toBe(jobApplicationForm)
    expect(() => formFor('homeupgrades', 'application')).toThrow()
    expect(jobApplicationForm.inquiryType).toBe('application')
  })
  it('parses a valid application and round-trips through storage', () => {
    const r = parseJobApplication(raw)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const d = jobApplicationForm
    const back = d.fromStored(d.details(r.data), d.contact(r.data))
    expect(d.answers(back)).toEqual(d.answers(r.data))
    expect(d.summary(r.data)).toBe('Application · Box Truck Driver · 1–2 years')
  })
  it('requires a phone, every choice and an open job; email is optional', () => {
    const r = parseJobApplication({ ...raw, job: 'astronaut', phone: '555', license: 'pilot', experience: '', record: '', availability: '', source: '', email: 'not-an-email' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['availability', 'email', 'experience', 'job', 'license', 'phone', 'record', 'source'])
  })
  it('never asks about conviction history (California Fair Chance Act)', () => {
    expect(jobApplicationForm.fields.join(' ')).not.toMatch(/convict|criminal|felony|arrest/i)
  })
  it('keeps contact details and notes out of the applicant email rows', () => {
    const r = parseJobApplication({ ...raw, email: 'sam@example.com', notes: 'Call after 3' })
    if (!r.ok) throw new Error('parse failed')
    const rows = jobApplicationForm.customerRows(r.data).map(([k]) => k)
    expect(rows).toEqual(['Job', 'Availability'])
  })
  it('emails say "application", not "quote"', () => {
    const r = parseJobApplication(raw)
    if (!r.ok) throw new Error('parse failed')
    const d = jobApplicationForm
    const team = teamEmail({ site: 'logistics', kind: 'application', reference: 'GX-LOG-000042', rows: d.answers(r.data), subjectDetails: d.subjectDetails(r.data), phone: r.data.phone, adminUrl: 'u' })
    expect(team.subject).toBe('[Logistics] Job application · Box Truck Driver · Sam Rivera · GX-LOG-000042')
    const mine = customerEmail({ site: 'logistics', kind: 'application', reference: 'GX-LOG-000042', name: 'Sam', rows: d.customerRows(r.data), phone: null })
    expect(mine.subject).toBe('We got your application · GX-LOG-000042')
    expect(mine.text).toContain('We read every application')
  })
})
