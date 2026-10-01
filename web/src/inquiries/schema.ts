import { z } from 'zod'

/** Shared by the quote form enhancer (client) and submitQuote (server). Messages match the prototype. */
export const LOADS = {
  business: ['pallets', 'parcels', 'truckload', 'courier'],
  move: ['studio', '1-2bed', '3bed', 'office'],
} as const

export type QuoteInput = {
  kind: 'business' | 'move'
  from: string
  to: string
  date: string | null
  flexible: boolean
  load: string
  pallets: number | null
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}
type Field = 'from' | 'to' | 'date' | 'load' | 'pallets' | 'name' | 'phone' | 'email'
export type FieldErrors = Partial<Record<Field, string>>

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const zip = /^\d{5}$/
const email = z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)

export function formDataToRaw(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of ['kind', 'from', 'to', 'date', 'flexible', 'load', 'pallets', 'name', 'phone', 'email', 'notes']) out[k] = fd.get(k) ?? ''
  return out
}

export function parseQuote(raw: Record<string, unknown>, today: string): { ok: true; data: QuoteInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const kind = str(raw.kind) === 'move' ? 'move' : 'business'
  const from = str(raw.from), to = str(raw.to)
  if (!zip.test(from)) errors.from = 'Enter a 5-digit ZIP code.'
  if (!zip.test(to)) errors.to = 'Enter a 5-digit ZIP code.'

  const flexible = str(raw.flexible) !== ''
  const date = flexible ? null : str(raw.date) || null
  if (!flexible) {
    if (!date) errors.date = 'Pick a date, or tick Flexible.'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) errors.date = 'Pick a date from today on.'
  }

  const load = str(raw.load)
  if (!(LOADS[kind] as readonly string[]).includes(load)) errors.load = "Choose what's moving."
  let pallets: number | null = null
  if (load === 'pallets') {
    const n = Number(str(raw.pallets))
    if (Number.isInteger(n) && n >= 1 && n <= 26) pallets = n
    else errors.pallets = 'Enter 1 to 26 pallets.'
  }

  const name = str(raw.name)
  if (!name) errors.name = 'Enter your name.'
  const phone = str(raw.phone) || null
  const mail = str(raw.email) || null
  if (!phone && !mail) errors.phone = 'Add a phone number or an email so we can reply.'
  else if (phone && phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a phone number with area code.'
  if (mail && !email.safeParse(mail).success) errors.email = 'Enter an email like name@company.com.'

  if (Object.keys(errors).length) return { ok: false, errors }
  const notes = str(raw.notes).slice(0, 2000) || null
  return { ok: true, data: { kind, from, to, date, flexible, load, pallets, name: name.slice(0, 120), phone, email: mail, notes } }
}
