import { z } from 'zod'
import type { Contact, FormDef, Row } from './types'

export const HU_LABELS = {
  project: { accent: 'Accent wall & TV unit', outdoor: 'Outdoor build', other: 'Something else' },
  property: { home: 'Home', business: 'Business' },
  timing: { asap: 'As soon as possible', soon: 'In 1–3 months', planning: 'Just planning' },
  budget: { under5: 'Under $5k', '5to15': '$5–15k', over15: '$15k+', unsure: 'Not sure' },
  callTime: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
} as const

type Labels = typeof HU_LABELS
export type HuQuote = {
  project: keyof Labels['project']; property: keyof Labels['property']; timing: keyof Labels['timing']
  budget: keyof Labels['budget'] | null; zip: string; notes: string; links: string[]; photos: string[]
  callTime: keyof Labels['callTime'] | null; name: string; phone: string | null; email: string | null
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const pick = <K extends string>(map: Record<K, string>, v: unknown): K | null => (Object.hasOwn(map, str(v)) ? (str(v) as K) : null)
const email = z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)

/** Up to 5 http(s) URLs from free text (split on whitespace or commas); everything else dropped. */
export function parseLinks(text: string): string[] {
  const out: string[] = []
  for (const part of text.slice(0, 1000).split(/[\s,]+/)) {
    if (out.length === 5) break
    if (!/^https?:\/\//i.test(part)) continue
    try { new URL(part) } catch { continue }
    if (!out.includes(part)) out.push(part)
  }
  return out
}

const photoList = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).map(str).filter(Boolean)

const answers = (q: HuQuote): Row[] => [
  ['Project', HU_LABELS.project[q.project]],
  ['Property', HU_LABELS.property[q.property]],
  ['When to start', HU_LABELS.timing[q.timing]],
  ...(q.budget ? ([['Budget', HU_LABELS.budget[q.budget]]] as Row[]) : []),
  ['ZIP', q.zip],
  ['About the space', q.notes],
  ['Name', q.name],
  ...(q.phone ? ([['Phone', q.phone]] as Row[]) : []),
  ...(q.callTime ? ([['Best time to call', HU_LABELS.callTime[q.callTime]]] as Row[]) : []),
  ...(q.email ? ([['Email', q.email]] as Row[]) : []),
]

export const homeupgradesForm: FormDef<HuQuote> = {
  site: 'homeupgrades',
  inquiryType: 'quote',
  fields: ['project', 'property', 'timing', 'budget', 'zip', 'notes', 'links', 'callTime', 'name', 'phone', 'email'],
  parse(raw) {
    const errors: Record<string, string> = {}
    const project = pick(HU_LABELS.project, raw.project)
    if (!project) errors.project = "Choose what we're building."
    const property = pick(HU_LABELS.property, raw.property)
    if (!property) errors.property = 'Choose home or business.'
    const timing = pick(HU_LABELS.timing, raw.timing)
    if (!timing) errors.timing = "Choose when you'd like to start."
    const budget = pick(HU_LABELS.budget, raw.budget)
    const zip = str(raw.zip)
    if (!/^\d{5}$/.test(zip)) errors.zip = 'Enter a 5-digit ZIP code.'
    const notes = str(raw.notes)
    if (notes.length < 10) errors.notes = 'Tell us a little about the space.'
    const name = str(raw.name)
    if (!name) errors.name = 'Enter your name.'
    const phone = str(raw.phone) || null
    const mail = str(raw.email) || null
    if (!phone && !mail) errors.phone = 'Add a phone number or an email so we can reply.'
    else if (phone && (phone.length > 40 || phone.replace(/\D/g, '').length < 10)) errors.phone = 'Enter a phone number with area code.'
    if (mail && !email.safeParse(mail).success) errors.email = 'Enter an email like name@company.com.'
    if (Object.keys(errors).length) return { ok: false, errors }
    return {
      ok: true,
      data: {
        project: project!, property: property!, timing: timing!, budget, zip, notes: notes.slice(0, 2000),
        links: parseLinks(str(raw.links)), photos: [...new Set(photoList(raw.photos))],
        callTime: phone ? pick(HU_LABELS.callTime, raw.callTime) : null,
        name: name.slice(0, 120), phone, email: mail,
      },
    }
  },
  contact: (q) => ({ name: q.name, phone: q.phone, email: q.email, notes: q.notes }),
  details: (q) => ({ project: q.project, property: q.property, timing: q.timing, budget: q.budget, zip: q.zip, links: q.links, photos: q.photos, callTime: q.callTime }),
  fromStored: (d, c: Contact) => ({
    project: d.project as HuQuote['project'], property: d.property as HuQuote['property'], timing: d.timing as HuQuote['timing'],
    budget: (d.budget as HuQuote['budget']) ?? null, zip: String(d.zip ?? ''), notes: c.notes ?? '',
    links: Array.isArray(d.links) ? (d.links as string[]) : [], photos: Array.isArray(d.photos) ? (d.photos as string[]) : [],
    callTime: (d.callTime as HuQuote['callTime']) ?? null, name: c.name, phone: c.phone, email: c.email,
  }),
  summary: (q) => `${HU_LABELS.project[q.project]} · ${q.zip} · ${HU_LABELS.property[q.property]} · ${HU_LABELS.timing[q.timing]}`,
  subjectDetails: (q) => `${HU_LABELS.project[q.project]} · ${q.zip}`,
  answers,
  customerRows: (q) => answers(q).filter(([k]) => ['Project', 'Property', 'When to start', 'Budget', 'ZIP'].includes(k)),
}
