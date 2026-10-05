import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContactCard } from '@/components/site/division/ContactCard'
import { toSiteData } from '@/sites/data-shape'

const html = (site: 'logistics' | 'homeupgrades', doc: Parameters<typeof toSiteData>[1]) =>
  renderToStaticMarkup(createElement(ContactCard, { site, data: toSiteData(site, doc) }))

describe('ContactCard', () => {
  it('uses the placeholder and fallbacks when the record is empty', () => {
    const out = html('logistics', null)
    expect(out).toContain('href="mailto:hello@thegenixgroup.com"')
    expect(out).toContain('<span class="ph">(000) 000-0000</span>')
    expect(out).not.toContain('tel:')
    expect(out).not.toContain('undefined')
    expect(out).toContain('We&#x27;ll get back to you within two business days with a price.')
  })
  it('links the phone and shows the stored email and area', () => {
    const out = html('logistics', { phone: '(619) 555-0100', email: 'ops@example.com', areaServed: 'United States' })
    expect(out).toContain('href="tel:6195550100"') // the href keeps digits (and a leading +) only
    expect(out).toContain('(619) 555-0100')
    expect(out).toContain('href="mailto:ops@example.com"')
    expect(out).toContain('United States')
  })
  it('has the Home Upgrades wording and fallback area', () => {
    const out = html('homeupgrades', null)
    expect(out).toContain('Serving California')
    expect(out).toContain('to arrange a visit')
    expect(out).not.toMatch(/hours/i)
  })
})
