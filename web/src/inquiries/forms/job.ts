import { JOBS } from '@/sites/jobs'
import type { Contact, FormDef, Parsed, Row } from './types'

/* A driver's application for an open Logistics job (/careers/<slug>). Short and phone-first: drivers apply from
   their phone, so no résumé upload. California's Fair Chance Act: never ask about conviction history here. */
export const LICENSE = { 'class-c': 'Class C (regular license)', 'class-b': 'Class B CDL', 'class-a': 'Class A CDL' } as const
export const EXPERIENCE = { none: 'Less than 1 year', '1-2': '1–2 years', '3plus': '3+ years' } as const
export const RECORD = { yes: 'Yes', no: 'No' } as const
export const AVAILABILITY = { 'full-time': 'Full-time', 'part-time': 'Part-time', either: 'Either' } as const
export const SOURCE = {
  indeed: 'Indeed',
  google: 'Google',
  craigslist: 'Craigslist',
  facebook: 'Facebook',
  referral: 'A friend or one of our drivers',
  truck: 'Saw one of our trucks',
  other: 'Somewhere else',
} as const

type Choice<T> = keyof T
export type JobApplication = {
  job: string
  name: string
  phone: string
  email: string | null
  license: Choice<typeof LICENSE>
  experience: Choice<typeof EXPERIENCE>
  record: Choice<typeof RECORD>
  availability: Choice<typeof AVAILABILITY>
  source: Choice<typeof SOURCE>
  notes: string | null
}

export const JOB_MESSAGES = {
  job: 'This job is no longer open.',
  name: 'Enter your name.',
  phone: 'Enter a phone number with area code.',
  email: 'Enter an email like name@example.com, or leave it empty.',
  license: 'Choose the license you hold.',
  experience: 'Choose how much experience you have.',
  record: 'Answer whether your driving record is clean.',
  availability: 'Choose full-time, part-time or either.',
  source: 'Tell us where you heard about the job.',
  notes: 'Keep this under 1,000 characters.',
} as const

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const pick = <T extends object>(map: T, v: string): v is Extract<keyof T, string> => Object.hasOwn(map, v)
const jobTitle = (slug: string) => JOBS.find((j) => j.slug === slug)?.title ?? slug

export function parseJobApplication(raw: Record<string, unknown>): Parsed<JobApplication> {
  const errors: Record<string, string> = {}
  const job = str(raw.job)
  if (!JOBS.some((j) => j.slug === job && j.open)) errors.job = JOB_MESSAGES.job
  const name = str(raw.name)
  if (!name) errors.name = JOB_MESSAGES.name
  const phone = str(raw.phone)
  if (phone.length > 40 || phone.replace(/\D/g, '').length < 10) errors.phone = JOB_MESSAGES.phone
  const email = str(raw.email) || null
  if (email && (email.length > 254 || !EMAIL.test(email))) errors.email = JOB_MESSAGES.email
  const license = str(raw.license)
  if (!pick(LICENSE, license)) errors.license = JOB_MESSAGES.license
  const experience = str(raw.experience)
  if (!pick(EXPERIENCE, experience)) errors.experience = JOB_MESSAGES.experience
  const record = str(raw.record)
  if (!pick(RECORD, record)) errors.record = JOB_MESSAGES.record
  const availability = str(raw.availability)
  if (!pick(AVAILABILITY, availability)) errors.availability = JOB_MESSAGES.availability
  const source = str(raw.source)
  if (!pick(SOURCE, source)) errors.source = JOB_MESSAGES.source
  const notes = str(raw.notes).replace(/\r\n?/g, '\n') || null
  if (notes && notes.length > 1000) errors.notes = JOB_MESSAGES.notes
  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    data: {
      job, name: name.slice(0, 120), phone, email, notes,
      license: license as JobApplication['license'], experience: experience as JobApplication['experience'],
      record: record as JobApplication['record'], availability: availability as JobApplication['availability'],
      source: source as JobApplication['source'],
    },
  }
}

const answers = (a: JobApplication): Row[] => [
  ['Job', jobTitle(a.job)],
  ['License', LICENSE[a.license]],
  ['Truck experience', EXPERIENCE[a.experience]],
  ['Clean record (3 years)', RECORD[a.record]],
  ['Availability', AVAILABILITY[a.availability]],
  ['Heard about it', SOURCE[a.source]],
  ['Name', a.name],
  ['Phone', a.phone],
  ...(a.email ? ([['Email', a.email]] as Row[]) : []),
  ...(a.notes ? ([['Notes', a.notes]] as Row[]) : []),
]

const choice = <T extends object>(map: T, v: unknown, fallback: keyof T): keyof T => (typeof v === 'string' && Object.hasOwn(map, v) ? (v as keyof T) : fallback)

export const jobApplicationForm: FormDef<JobApplication> = {
  site: 'logistics',
  inquiryType: 'application',
  fields: ['job', 'name', 'phone', 'email', 'license', 'experience', 'record', 'availability', 'source', 'notes'],
  parse: (raw) => parseJobApplication(raw),
  contact: (a) => ({ name: a.name, phone: a.phone, email: a.email, notes: a.notes }),
  details: (a) => ({ job: a.job, license: a.license, experience: a.experience, record: a.record, availability: a.availability, source: a.source }),
  fromStored: (d, c: Contact) => ({
    job: String(d.job ?? ''), name: c.name, phone: c.phone ?? '', email: c.email, notes: c.notes,
    license: choice(LICENSE, d.license, 'class-c'), experience: choice(EXPERIENCE, d.experience, 'none'),
    record: choice(RECORD, d.record, 'no'), availability: choice(AVAILABILITY, d.availability, 'either'),
    source: choice(SOURCE, d.source, 'other'),
  }),
  summary: (a) => `Application · ${jobTitle(a.job)} · ${EXPERIENCE[a.experience]}`,
  subjectDetails: (a) => `${jobTitle(a.job)} · ${a.name}`,
  answers,
  customerRows: (a) => [['Job', jobTitle(a.job)], ['Availability', AVAILABILITY[a.availability]]],
}
