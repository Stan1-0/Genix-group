import type { SiteKey } from '@/sites/config'

export type Row = [label: string, value: string]
export type Contact = { name: string; phone: string | null; email: string | null; notes: string | null }
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> }

/** One division's quote form: how to read it, store it and show it in emails and the admin. */
export interface FormDef<T> {
  site: SiteKey
  fields: readonly string[]
  parse(raw: Record<string, unknown>, today: string): Parsed<T>
  contact(d: T): Contact
  details(d: T): Record<string, unknown>
  fromStored(details: Record<string, unknown>, c: Contact): T
  summary(d: T): string
  subjectDetails(d: T): string
  /** Every answer, for the team email and the admin (contact rows included). */
  answers(d: T): Row[]
  /** Structured choices only: never free text, links, photos or contact details. */
  customerRows(d: T): Row[]
}
