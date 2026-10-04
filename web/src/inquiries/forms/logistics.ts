import { loadLabel, quoteSummary } from '../format'
import { parseQuote, type QuoteInput } from '../schema'
import type { Contact, FormDef, Row } from './types'

const answers = (q: QuoteInput): Row[] => [
  ['Type', q.kind === 'move' ? 'Move' : 'Business shipment'],
  ['From', q.from],
  ['To', q.to],
  ['Date', q.flexible ? 'Flexible' : (q.date ?? '')],
  ["What's moving", loadLabel(q.load)],
  ...(q.pallets ? ([['Pallets', String(q.pallets)]] as Row[]) : []),
  ['Name', q.name],
  ...(q.phone ? ([['Phone', q.phone]] as Row[]) : []),
  ...(q.email ? ([['Email', q.email]] as Row[]) : []),
  ...(q.notes ? ([['Notes', q.notes]] as Row[]) : []),
]

export const logisticsForm: FormDef<QuoteInput> = {
  site: 'logistics',
  fields: ['kind', 'from', 'to', 'date', 'flexible', 'load', 'pallets', 'name', 'phone', 'email', 'notes'],
  parse: (raw, today) => parseQuote(raw, today) as ReturnType<FormDef<QuoteInput>['parse']>,
  contact: (q) => ({ name: q.name, phone: q.phone, email: q.email, notes: q.notes }),
  details: (q) => ({ kind: q.kind, from: q.from, to: q.to, date: q.date, flexible: q.flexible, load: q.load, pallets: q.pallets }),
  fromStored: (d, c: Contact) => ({
    kind: d.kind === 'move' ? 'move' : 'business', from: String(d.from ?? ''), to: String(d.to ?? ''),
    date: (d.date as string | null) ?? null, flexible: Boolean(d.flexible), load: String(d.load ?? ''),
    pallets: (d.pallets as number | null) ?? null, ...c,
  }),
  summary: quoteSummary,
  subjectDetails: quoteSummary,
  answers,
  customerRows: (q) => answers(q).filter(([k]) => !['Name', 'Phone', 'Email', 'Notes'].includes(k)),
}
