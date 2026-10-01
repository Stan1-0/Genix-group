import { describe, expect, it } from 'vitest'
import { formDataToRaw, parseQuote } from '@/inquiries/schema'

const TODAY = '2026-10-01'
const good = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: '', load: 'pallets', pallets: '2', name: 'Ana Ruiz', phone: '(619) 555-0100', email: '', notes: '' }

describe('parseQuote', () => {
  it('accepts a complete business quote and normalises it', () => {
    const r = parseQuote(good, TODAY)
    expect(r).toEqual({ ok: true, data: { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: false, load: 'pallets', pallets: 2, name: 'Ana Ruiz', phone: '(619) 555-0100', email: null, notes: null } })
  })
  it('uses the prototype messages', () => {
    const r = parseQuote({ kind: 'business', from: '921', to: '', date: '', flexible: '', load: '', pallets: '', name: ' ', phone: '', email: '' }, TODAY)
    expect(r).toEqual({ ok: false, errors: {
      from: 'Enter a 5-digit ZIP code.', to: 'Enter a 5-digit ZIP code.', date: 'Pick a date, or tick Flexible.',
      load: "Choose what's moving.", name: 'Enter your name.', phone: 'Add a phone number or an email so we can reply.',
    } })
  })
  it('checks dates, pallets, phone and email formats', () => {
    const r = parseQuote({ ...good, date: '2026-09-30', pallets: '27', phone: '555-0100', email: 'ana@' }, TODAY)
    expect(r).toEqual({ ok: false, errors: {
      date: 'Pick a date from today on.', pallets: 'Enter 1 to 26 pallets.',
      phone: 'Enter a phone number with area code.', email: 'Enter an email like name@company.com.',
    } })
  })
  it('caps phone at 40 and email at 254 characters', () => {
    const phone = '(619) 555-0100' + ' x1'.repeat(10) // 44 chars, still >= 10 digits
    const email = `${'a'.repeat(250)}@x.com` // 256 chars
    expect(parseQuote({ ...good, phone, email: 'ana@example.com' }, TODAY)).toEqual({ ok: false, errors: { phone: 'Enter a phone number with area code.' } })
    expect(parseQuote({ ...good, email }, TODAY)).toEqual({ ok: false, errors: { email: 'Enter an email like name@company.com.' } })
    expect(parseQuote({ ...good, phone: '6'.repeat(40), email: `${'a'.repeat(248)}@x.com` }, TODAY).ok).toBe(true)
  })
  it('requires a real calendar date within the next two years', () => {
    expect(parseQuote({ ...good, date: '2026-02-30' }, TODAY)).toEqual({ ok: false, errors: { date: 'Pick a date from today on.' } })
    expect(parseQuote({ ...good, date: '2026-13-01' }, TODAY)).toEqual({ ok: false, errors: { date: 'Pick a date from today on.' } })
    expect(parseQuote({ ...good, date: '2028-10-02' }, TODAY)).toEqual({ ok: false, errors: { date: 'Pick a date within the next two years.' } })
    expect(parseQuote({ ...good, date: '2028-10-01' }, TODAY).ok).toBe(true)
    expect(parseQuote({ ...good, date: '2028-02-29' }, '2028-02-28').ok).toBe(true)
  })
  it('flexible drops the date; non-pallet loads drop pallets', () => {
    const r = parseQuote({ ...good, flexible: 'on', date: '', load: 'parcels', pallets: '99' }, TODAY)
    expect(r.ok && r.data).toMatchObject({ flexible: true, date: null, load: 'parcels', pallets: null })
  })
  it('rejects a load from the other tab', () => {
    const r = parseQuote({ ...good, kind: 'move', load: 'pallets' }, TODAY)
    expect(r).toEqual({ ok: false, errors: { load: "Choose what's moving." } })
  })
})

describe('formDataToRaw', () => {
  it('reads the form fields by name', () => {
    const fd = new FormData()
    for (const [k, v] of Object.entries(good)) fd.set(k, v)
    expect(formDataToRaw(fd)).toMatchObject({ kind: 'business', from: '92101', pallets: '2' })
  })
})
