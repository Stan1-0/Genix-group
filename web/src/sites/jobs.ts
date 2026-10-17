import { SITES, siteOrigin, type SiteKey } from './config'

/* Open roles. A job with `open: false` (or past `validThrough`) drops off the careers page, the sitemap and llms.txt,
   and its page 404s. Each open job gets a schema.org JobPosting, which is what puts it in Google's job results.
   California: postings must show the pay range (Labor Code 432.3), and conviction history can't be asked before an
   offer (Fair Chance Act), so the application form never asks it. */
export type Job = {
  slug: string
  site: SiteKey
  open: boolean
  title: string
  /** schema.org employmentType values. */
  employmentType: readonly ('FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY')[]
  pay: { min: number; max: number; unit: 'HOUR' }
  location: { locality: string; region: string; postalCode: string; country: 'US' }
  /** ISO dates. Google drops a posting after validThrough, so renew it while the role is open. */
  datePosted: string
  validThrough: string
  /** One or two sentences: the card on /careers and the meta description. */
  summary: string
  schedule: string
  duties: readonly string[]
  requirements: readonly string[]
  offers: readonly string[]
}

export const JOBS: readonly Job[] = [
  {
    slug: 'box-truck-driver',
    site: 'logistics',
    open: true,
    title: 'Box Truck Driver',
    employmentType: ['FULL_TIME', 'PART_TIME'],
    pay: { min: 22, max: 26, unit: 'HOUR' },
    location: { locality: 'San Diego', region: 'CA', postalCode: '92101', country: 'US' },
    datePosted: '2026-10-17',
    validThrough: '2027-01-15',
    summary:
      'Drive a 16–26 ft box truck on local and regional routes from San Diego: business freight, courier runs and home moves. Non-CDL (Class C). $22–$26 an hour plus overtime.',
    schedule: 'Full-time or part-time. Weekday day shifts, usually starting between 6 and 8 am, with some Saturdays.',
    duties: [
      'Drive a 16–26 ft box truck (under 26,001 lbs) on local and regional routes',
      'Load, secure and unload pallets, parcels and household goods, using a pallet jack and dolly',
      'Deliver on time, get signatures and take delivery photos',
      'Keep customers and dispatch updated when plans change',
      'Do pre-trip and post-trip checks and keep the truck clean',
    ],
    requirements: [
      'A valid California driver’s license (Class C is enough; no CDL needed)',
      'A clean driving record for the last 3 years',
      'At least 1 year of box truck, straight truck or delivery van experience',
      'Able to lift up to 50 lbs and be on your feet for most of the shift',
      'Clear, friendly communication: you’re the face of Genix at the door',
      'At least 21 years old',
    ],
    offers: [
      '$22–$26 an hour, based on experience, plus overtime after 8 hours a day or 40 a week',
      'Paid sick leave',
      'Weekly pay',
      'A well-kept truck and the equipment for the job',
      'A real person at dispatch to call when plans change',
    ],
  },
]

const todayIso = () => new Date().toISOString().slice(0, 10)

export function openJobs(site: SiteKey, today: string = todayIso()): Job[] {
  return JOBS.filter((j) => j.site === site && j.open && j.validThrough >= today)
}

export const openJobBySlug = (site: SiteKey, slug: string, today?: string): Job | undefined =>
  openJobs(site, today).find((j) => j.slug === slug)

export const payLabel = (j: Job) => `$${j.pay.min}–$${j.pay.max} an hour`

export const jobPath = (j: Job) => `/careers/${j.slug}`

/** schema.org JobPosting: Google for Jobs reads this, so it must match what the page says. */
export function jobPostingJsonLd(j: Job, root?: string): Record<string, unknown> {
  const origin = siteOrigin(j.site, root)
  const list = (items: readonly string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: j.title,
    description: `<p>${j.summary}</p><p>${j.schedule}</p><p>What you’ll do:</p>${list(j.duties)}<p>What you need:</p>${list(j.requirements)}<p>What we offer:</p>${list(j.offers)}`,
    datePosted: j.datePosted,
    validThrough: `${j.validThrough}T23:59:59-08:00`,
    employmentType: [...j.employmentType],
    directApply: true,
    url: `${origin}${jobPath(j)}`,
    hiringOrganization: { '@type': 'Organization', name: SITES[j.site].name, sameAs: `${origin}/`, logo: SITES[j.site].logo ? `${origin}${SITES[j.site].logo!.src}` : undefined },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: j.location.locality, addressRegion: j.location.region, postalCode: j.location.postalCode, addressCountry: j.location.country },
    },
    baseSalary: { '@type': 'MonetaryAmount', currency: 'USD', value: { '@type': 'QuantitativeValue', minValue: j.pay.min, maxValue: j.pay.max, unitText: j.pay.unit } },
  }
}
