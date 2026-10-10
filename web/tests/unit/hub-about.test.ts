import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ABOUT_HEADINGS, HubAbout } from '@/pages-home/hub/About'
import { SITES } from '@/sites/config'
import { toSiteData } from '@/sites/data-shape'

const html = (doc: Parameters<typeof toSiteData>[1] = null) =>
  renderToStaticMarkup(createElement(HubAbout, { data: toSiteData('hub', doc) }))

describe('HubAbout', () => {
  it('has one h1, the two h2s in order, and one main', () => {
    const out = html()
    expect(out.match(/<h1[ >]/g)).toHaveLength(1)
    expect([...out.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1])).toEqual([...ABOUT_HEADINGS])
    expect(out.match(/<main[ >]/g)).toHaveLength(1)
    expect(out).toContain('id="main"')
  })
  it('links each business to its own host and shows its tagline', () => {
    const out = html()
    for (const [key, name] of [['logistics', 'Genix Logistics'], ['homeupgrades', 'Genix Home Upgrades'], ['multimedia', 'Genix Multimedia']] as const) {
      expect(out).toMatch(new RegExp(`<a href="https?://${key}\\.[^"]+">${name}</a>`))
      expect(out).toContain(SITES[key].tagline)
    }
  })
  it('lists the existing promises and no opening hours, team or numbers', () => {
    const out = html()
    for (const p of ['A real person to call', 'Clear timelines', 'Price first', 'Care in every detail', 'No guesswork', 'For every kind of space', 'Your local project partner']) expect(out).toContain(p)
    expect(out).not.toMatch(/hours|team|founded|since \d{4}|years/i)
  })
  it('falls back to the group email and links it', () => {
    expect(html()).toContain('href="mailto:hello@thegenixgroup.com"')
    expect(html({ email: 'ops@example.com' })).toContain('href="mailto:ops@example.com"')
  })
  it('prints the mailing address only when street, city, state and ZIP are all set', () => {
    expect(html()).not.toContain('Address')
    expect(html({ address: { city: 'San Diego', state: 'CA' } })).not.toContain('Address')
    const full = html({ address: { street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '92101' } })
    expect(full).toContain('1 Harbor Dr, San Diego, CA 92101')
    expect(full.match(/Address/g)).toHaveLength(1)
  })
})
