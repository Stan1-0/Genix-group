import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PRIVACY_HEADINGS, PRIVACY_UPDATED, PrivacyPolicy } from '@/legal/privacy'
import { formatAddress, toSiteData } from '@/sites/data-shape'

const html = (address: Parameters<typeof PrivacyPolicy>[0]['address'] = null) =>
  renderToStaticMarkup(createElement(PrivacyPolicy, { email: 'hello@thegenixgroup.com', address }))

describe('PrivacyPolicy', () => {
  it('has the title, the date and every section heading in order', () => {
    const out = html()
    expect(out).toContain('<h1>Privacy policy</h1>')
    expect(out).toContain(`<time dateTime="${PRIVACY_UPDATED.iso}">${PRIVACY_UPDATED.label}</time>`)
    const headings = [...out.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1])
    expect(headings).toEqual([...PRIVACY_HEADINGS])
    expect(PRIVACY_UPDATED.label).toBe('October 10, 2026')
  })
  it('lists the four providers and states the three commitments', () => {
    const out = html()
    for (const p of ['Resend', 'Cloudinary', 'Vercel', 'Neon']) expect(out).toContain(`>${p}</th>`)
    expect(out).toContain('we never sell them')
    expect(out).toContain('We&#x27;ll reply within 45 days.')
    expect(out).toContain('including any photos you uploaded')
  })
  it('covers the hub contact form and the Multimedia wording', () => {
    const out = html()
    expect(out).toContain('The Genix Group contact form:')
    expect(out).not.toContain('doesn&#x27;t have a request form yet')
  })
  it('links the contact email', () => {
    expect(html()).toContain('href="mailto:hello@thegenixgroup.com"')
  })
  it('shows the mailing address only when the hub address is complete', () => {
    expect(html()).not.toContain('by mail at')
    const full = { street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '92101' }
    expect(html(full)).toContain('by mail at 1 Harbor Dr, San Diego, CA 92101')
  })
})

describe('hub address in site data', () => {
  const doc = (address: Record<string, string | null>) => toSiteData('hub', { address })
  it('is null unless street, city, state and ZIP are all filled in', () => {
    expect(doc({ city: 'San Diego', state: 'CA' }).address).toBeNull()
    expect(doc({ street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '  ' }).address).toBeNull()
    expect(toSiteData('hub', null).address).toBeNull()
  })
  it('trims and returns the four parts when complete', () => {
    const a = doc({ street: ' 1 Harbor Dr ', city: 'San Diego', state: 'CA', zip: '92101' }).address!
    expect(a).toEqual({ street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '92101' })
    expect(formatAddress(a)).toBe('1 Harbor Dr, San Diego, CA 92101')
  })
})
