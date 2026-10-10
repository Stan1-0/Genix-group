import type { Contact, FormDef, Parsed, Row } from './types'

/** The hub Contact form's "Which business is this about?" choices (value → label). */
export const ABOUT = {
  logistics: 'Genix Logistics',
  homeupgrades: 'Genix Home Upgrades',
  multimedia: 'Genix Multimedia',
  unsure: 'Not sure, or more than one',
} as const
export type About = keyof typeof ABOUT
const SHORT: Record<About, string> = { logistics: 'Logistics', homeupgrades: 'Home Upgrades', multimedia: 'Multimedia', unsure: 'Not sure' }
export const isAbout = (v: unknown): v is About => typeof v === 'string' && Object.hasOwn(ABOUT, v)

export type HubMessage = { about: About; name: string; email: string; phone: string | null; message: string }

/** Shared by the server parser and the client enhancer, so both say the same thing. */
export const HUB_MESSAGES = {
  about: 'Choose which business this is about.',
  name: 'Enter your name.',
  emailMissing: 'Enter your email so we can reply.',
  email: 'Enter an email like name@company.com.',
  phone: 'Enter a phone number with area code.',
  messageShort: 'Tell us a little more (at least 10 characters).',
  messageLong: 'Keep your message under 2,000 characters.',
} as const

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseHubMessage(raw: Record<string, unknown>): Parsed<HubMessage> {
  const errors: Record<string, string> = {}
  const about = str(raw.about)
  if (!isAbout(about)) errors.about = HUB_MESSAGES.about
  const name = str(raw.name)
  if (!name) errors.name = HUB_MESSAGES.name
  const email = str(raw.email)
  if (!email) errors.email = HUB_MESSAGES.emailMissing
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = HUB_MESSAGES.email
  const phone = str(raw.phone) || null
  if (phone && (phone.length > 40 || phone.replace(/\D/g, '').length < 10)) errors.phone = HUB_MESSAGES.phone
  const message = str(raw.message).replace(/\r\n?/g, '\n')
  if (message.length < 10) errors.message = HUB_MESSAGES.messageShort
  else if (message.length > 2000) errors.message = HUB_MESSAGES.messageLong
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, data: { about: about as About, name: name.slice(0, 120), email, phone, message } }
}

const answers = (m: HubMessage): Row[] => [
  ['About', ABOUT[m.about]],
  ['Name', m.name],
  ...(m.phone ? ([['Phone', m.phone]] as Row[]) : []),
  ['Email', m.email],
  ['Message', m.message],
]

export const hubForm: FormDef<HubMessage> = {
  site: 'hub',
  inquiryType: 'contact',
  fields: ['about', 'name', 'email', 'phone', 'message'],
  parse: (raw) => parseHubMessage(raw),
  contact: (m) => ({ name: m.name, phone: m.phone, email: m.email, notes: m.message }),
  details: (m) => ({ about: m.about }),
  fromStored: (d, c: Contact) => ({ about: isAbout(d.about) ? d.about : 'unsure', name: c.name, email: c.email ?? '', phone: c.phone, message: c.notes ?? '' }),
  summary: (m) => `Message · ${SHORT[m.about]}`,
  subjectDetails: (m) => SHORT[m.about],
  answers,
  customerRows: (m) => [['About', ABOUT[m.about]]],
}
