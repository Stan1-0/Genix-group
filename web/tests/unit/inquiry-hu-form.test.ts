import { describe, expect, it } from 'vitest'
import { homeupgradesForm as f, parseLinks } from '@/inquiries/forms/homeupgrades'

const TODAY = '2026-10-04'
const good = { project: 'accent', property: 'home', timing: 'soon', budget: '5to15', zip: '92101', notes: 'Living room wall, about 4 m wide.', links: '', photos: [], callTime: 'evening', name: 'Ana Ruiz', phone: '(619) 555-0100', email: '' }

describe('homeupgrades form', () => {
  it('accepts a complete request', () => {
    const r = f.parse(good, TODAY)
    expect(r.ok && r.data).toMatchObject({ project: 'accent', property: 'home', timing: 'soon', budget: '5to15', zip: '92101', callTime: 'evening', email: null, links: [], photos: [] })
  })
  it('uses the exact messages', () => {
    const r = f.parse({ zip: '921', notes: 'short', name: '', phone: '', email: '' }, TODAY)
    expect(r).toEqual({ ok: false, errors: {
      project: "Choose what we're building.", property: 'Choose home or business.', timing: "Choose when you'd like to start.",
      zip: 'Enter a 5-digit ZIP code.', notes: 'Tell us a little about the space.', name: 'Enter your name.',
      phone: 'Add a phone number or an email so we can reply.',
    } })
  })
  it('budget and call time are optional; call time needs a phone', () => {
    const r = f.parse({ ...good, budget: '', callTime: 'morning', phone: '', email: 'ana@example.com' }, TODAY)
    expect(r.ok && r.data).toMatchObject({ budget: null, callTime: null })
  })
  it('rejects unknown choices', () => {
    const r = f.parse({ ...good, project: 'kitchen', budget: 'lots' }, TODAY)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.errors.project).toBe("Choose what we're building.")
  })
  it('caps notes at 2000 characters', () => {
    const r = f.parse({ ...good, notes: 'x'.repeat(2500) }, TODAY)
    expect(r.ok && r.data.notes.length).toBe(2000)
  })
  it('keeps at most 5 http(s) links and drops the rest', () => {
    expect(parseLinks('https://pin.it/a\nnot a link\njavascript:alert(1)\nhttp://x.co/b, https://c.co/c https://d.co https://e.co https://f.co')).toEqual(['https://pin.it/a', 'http://x.co/b', 'https://c.co/c', 'https://d.co', 'https://e.co'])
  })
  it('rows: summary, subject, answers and customer rows', () => {
    const r = f.parse({ ...good, links: 'https://pin.it/a' }, TODAY)
    if (!r.ok) throw new Error('expected ok')
    expect(f.summary(r.data)).toBe('Accent wall & TV unit · 92101 · Home · In 1–3 months')
    expect(f.subjectDetails(r.data)).toBe('Accent wall & TV unit · 92101')
    expect(f.answers(r.data)).toContainEqual(['Best time to call', 'Evening'])
    expect(f.answers(r.data)).toContainEqual(['About the space', 'Living room wall, about 4 m wide.'])
    const customer = f.customerRows(r.data).map(([k]) => k)
    expect(customer).toEqual(['Project', 'Property', 'When to start', 'Budget', 'ZIP'])
  })
  it('stored details round-trip', () => {
    const r = f.parse(good, TODAY)
    if (!r.ok) throw new Error('expected ok')
    const back = f.fromStored(f.details(r.data), f.contact(r.data))
    expect(back).toEqual(r.data)
  })
})
