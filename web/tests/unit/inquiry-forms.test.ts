import { describe, expect, it } from 'vitest'
import { FORM_SITES, formFor } from '@/inquiries/forms'

const raw = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: '', load: 'pallets', pallets: '2', name: 'Ana', phone: '(619) 555-0100', email: 'ana@example.com', notes: 'Dock at back' }

describe('form definitions', () => {
  it('lists the sites that take enquiries', () => {
    expect(FORM_SITES).toEqual(['logistics', 'homeupgrades', 'hub'])
    expect(() => formFor('multimedia')).toThrow()
    expect(formFor('logistics').inquiryType).toBe('quote')
    expect(formFor('homeupgrades').inquiryType).toBe('quote')
    expect(formFor('hub').inquiryType).toBe('contact')
  })
  it('logistics: parse → stored details → back gives the same rows', () => {
    const def = formFor('logistics')
    const r = def.parse(raw, '2026-10-01')
    if (!r.ok) throw new Error('expected ok')
    const back = def.fromStored(def.details(r.data), def.contact(r.data))
    expect(def.answers(back)).toEqual(def.answers(r.data))
    expect(def.summary(r.data)).toBe('92101 → 92024 · 2 pallets')
    expect(def.subjectDetails(r.data)).toBe('92101 → 92024 · 2 pallets')
  })
  it('logistics: customer rows never include contact details or notes', () => {
    const def = formFor('logistics')
    const r = def.parse(raw, '2026-10-01')
    if (!r.ok) throw new Error('expected ok')
    const labels = def.customerRows(r.data).map(([k]) => k)
    expect(labels).not.toContain('Notes')
    expect(labels).not.toContain('Phone')
    expect(labels).not.toContain('Email')
    expect(labels).not.toContain('Name')
  })
})

describe('hub message form', () => {
  const ok = { about: 'multimedia', name: ' Ana ', email: 'ana@example.com', phone: '', message: 'Can you film our opening night?' }
  const def = () => formFor('hub')
  it('parses a valid message and round-trips through storage', () => {
    const r = def().parse(ok, '2026-10-10')
    if (!r.ok) throw new Error('expected ok')
    expect(r.data).toEqual({ about: 'multimedia', name: 'Ana', email: 'ana@example.com', phone: null, message: 'Can you film our opening night?' })
    const back = def().fromStored(def().details(r.data), def().contact(r.data))
    expect(def().answers(back)).toEqual(def().answers(r.data))
    expect(def().summary(r.data)).toBe('Message · Multimedia')
    expect(def().subjectDetails(r.data)).toBe('Multimedia')
    expect(def().contact(r.data)).toEqual({ name: 'Ana', phone: null, email: 'ana@example.com', notes: 'Can you film our opening night?' })
  })
  it('requires about, name, email and a 10–2,000 character message', () => {
    const r = def().parse({ about: 'hub', name: '  ', email: '', phone: '555', message: 'too short' }, '2026-10-10')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors).toEqual({
      about: 'Choose which business this is about.',
      name: 'Enter your name.',
      email: 'Enter your email so we can reply.',
      phone: 'Enter a phone number with area code.',
      message: 'Tell us a little more (at least 10 characters).',
    })
    const long = def().parse({ ...ok, message: 'x'.repeat(2001), email: 'not-an-email' }, '2026-10-10')
    if (long.ok) throw new Error('expected errors')
    expect(long.errors).toEqual({ email: 'Enter an email like name@company.com.', message: 'Keep your message under 2,000 characters.' })
  })
  it('the customer rows carry only the About choice', () => {
    const r = def().parse({ ...ok, phone: '(619) 555-0100' }, '2026-10-10')
    if (!r.ok) throw new Error('expected ok')
    expect(def().customerRows(r.data)).toEqual([['About', 'Genix Multimedia']])
  })
})
