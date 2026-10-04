import { describe, expect, it } from 'vitest'
import { FORM_SITES, formFor } from '@/inquiries/forms'

const raw = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: '', load: 'pallets', pallets: '2', name: 'Ana', phone: '(619) 555-0100', email: 'ana@example.com', notes: 'Dock at back' }

describe('form definitions', () => {
  it('lists the sites that take quotes', () => {
    expect(FORM_SITES).toEqual(['logistics', 'homeupgrades'])
    expect(() => formFor('hub')).toThrow()
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
