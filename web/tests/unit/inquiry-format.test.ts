import { describe, expect, it } from 'vitest'
import { formatReference, hashIp, quoteSummary, teamSubject } from '@/inquiries/format'
import { customerEmail, teamEmail } from '@/inquiries/email'
import { hubForm } from '@/inquiries/forms/hub'
import { logisticsForm } from '@/inquiries/forms/logistics'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'
import type { QuoteInput } from '@/inquiries/schema'

const q: QuoteInput = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: false, load: 'pallets', pallets: 2, name: 'Ana <Ruiz>', phone: '(619) 555-0100', email: 'ana@example.com', notes: 'Dock at back' }

describe('format', () => {
  it('pads references to six digits', () => {
    expect(formatReference('LOG', 1)).toBe('GX-LOG-000001')
    expect(formatReference('HUP', 123456)).toBe('GX-HUP-123456')
  })
  it('hashes IPs with the salt, deterministically', () => {
    expect(hashIp('203.0.113.9', 's1')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashIp('203.0.113.9', 's1')).toBe(hashIp('203.0.113.9', 's1'))
    expect(hashIp('203.0.113.9', 's1')).not.toBe(hashIp('203.0.113.9', 's2'))
  })
  it('summarises and builds the team subject', () => {
    expect(quoteSummary(q)).toBe('92101 → 92024 · 2 pallets')
    expect(quoteSummary({ ...q, load: '1-2bed', pallets: null })).toBe('92101 → 92024 · 1–2 bedroom home')
    expect(teamSubject('Logistics', q, 'GX-LOG-000001')).toBe('[Logistics] Quote · 92101 → 92024 · 2 pallets · GX-LOG-000001')
  })
})

describe('emails', () => {
  it('team email lists every answer and escapes HTML', () => {
    const e = teamEmail({ site: 'logistics', reference: 'GX-LOG-000001', rows: logisticsForm.answers(q), subjectDetails: logisticsForm.subjectDetails(q), phone: q.phone, adminUrl: 'https://thegenixgroup.com/admin/collections/inquiries/7' })
    expect(e.subject).toBe('[Logistics] Quote · 92101 → 92024 · 2 pallets · GX-LOG-000001')
    expect(e.html).toContain('Ana &lt;Ruiz&gt;')
    expect(e.html).toContain('href="tel:+16195550100"')
    expect(e.html).toContain('https://thegenixgroup.com/admin/collections/inquiries/7')
    expect(e.text).toContain('Notes: Dock at back')
  })
  it('customer email carries the promise, reference and phone', () => {
    const e = customerEmail({ site: 'logistics', reference: 'GX-LOG-000001', name: q.name, rows: logisticsForm.customerRows(q), phone: '(619) 555-0100' })
    expect(e.subject).toBe('We got your request · GX-LOG-000001')
    expect(e.text).toContain("We'll get back to you within two business days.")
    expect(e.text).toContain('(619) 555-0100')
  })
  it('customer email never carries the free-text notes', () => {
    const e = customerEmail({ site: 'logistics', reference: 'GX-LOG-000001', name: q.name, rows: logisticsForm.customerRows({ ...q, notes: 'Visit https://evil.example now' }), phone: null })
    expect(e.html).not.toContain('evil.example')
    expect(e.text).not.toContain('evil.example')
    expect(e.text).not.toContain('Notes')
    expect(e.text).toContain("What's moving: Pallets")
  })
  it('customer email caps the greeting name at 40 characters', () => {
    const long = 'A'.repeat(120)
    const e = customerEmail({ site: 'logistics', reference: 'GX-LOG-000001', name: `  ${long}  `, rows: logisticsForm.customerRows(q), phone: null })
    expect(e.text).toContain(`Thanks, ${'A'.repeat(40)}. `)
    expect(e.text).not.toContain('A'.repeat(41))
    expect(e.html).not.toContain('A'.repeat(41))
  })
})

describe('messages', () => {
  it('fall back to email without a phone', () => {
    expect(rateLimitedMessage('(619) 555-0100')).toBe('Too many requests. Please call us at (619) 555-0100.')
    expect(rateLimitedMessage(null)).toBe('Too many requests. Please email hello@thegenixgroup.com.')
    expect(serverErrorMessage('(619) 555-0100')).toBe("Couldn't send. Try again, or call (619) 555-0100.")
    expect(serverErrorMessage(null)).toBe("Couldn't send. Try again, or email hello@thegenixgroup.com.")
  })
})

describe('contact emails', () => {
  const m = { about: 'unsure' as const, name: 'Ana', email: 'ana@example.com', phone: '(619) 555-0100', message: 'Please call me <b>about</b> both' }
  it('team email says message, names the business and keeps the reference', () => {
    const e = teamEmail({ site: 'hub', kind: 'contact', reference: 'GX-HUB-000001', rows: hubForm.answers(m), subjectDetails: hubForm.subjectDetails(m), phone: m.phone, adminUrl: 'https://thegenixgroup.com/admin/collections/inquiries/9' })
    expect(e.subject).toBe('[Group] Message · Not sure · GX-HUB-000001')
    expect(e.html).toContain('New message · GX-HUB-000001')
    expect(e.text.startsWith('New message · GX-HUB-000001')).toBe(true)
    expect(e.html).toContain('Please call me &lt;b&gt;about&lt;/b&gt; both')
  })
  it('customer email says message, is signed by the group and never echoes the message or contact details', () => {
    const e = customerEmail({ site: 'hub', kind: 'contact', reference: 'GX-HUB-000001', name: m.name, rows: hubForm.customerRows(m), phone: null })
    expect(e.subject).toBe('We got your message · GX-HUB-000001')
    expect(e.text).toContain('The Genix Group')
    expect(e.text).not.toContain('Part of The Genix Group')
    for (const s of ['Please call me', 'ana@example.com', '555-0100']) expect(e.text).not.toContain(s)
  })
  it('quote emails keep their wording', () => {
    const t = teamEmail({ site: 'logistics', reference: 'GX-LOG-000001', rows: [['Name', 'Ana']], subjectDetails: 'x', phone: null, adminUrl: 'u' })
    expect(t.subject).toBe('[Logistics] Quote · x · GX-LOG-000001')
    expect(t.html).toContain('New quote request · GX-LOG-000001')
    const c = customerEmail({ site: 'logistics', reference: 'GX-LOG-000001', name: 'Ana', rows: [], phone: null })
    expect(c.subject).toBe('We got your request · GX-LOG-000001')
    expect(c.text).toContain('Genix Logistics · Part of The Genix Group')
  })
})
