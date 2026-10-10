import { describe, expect, it } from 'vitest'
import { pageMetadata, robotsTxt, siteJsonLd, sitemapXml } from '@/sites/seo'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'

describe('pageMetadata', () => {
  it('uses "<Site> | <Tagline>" on the home page with an absolute canonical', () => {
    const m = pageMetadata('logistics', '/', {}, root)
    expect(m.title).toEqual({ absolute: 'Genix Logistics | Reliable Freight. Real People. On Time, Every Time.' })
    expect(m.alternates?.canonical).toBe('https://logistics.thegenixgroup.com/')
  })
  it('uses "<Page> | <Site>" elsewhere', () => {
    const m = pageMetadata('homeupgrades', '/services', { title: 'Services', description: 'What we do' }, root)
    expect(m.title).toEqual({ absolute: 'Services | Genix Home Upgrades' })
    expect(m.description).toBe('What we do')
    expect(m.alternates?.canonical).toBe('https://homeupgrades.thegenixgroup.com/services')
    expect(m.openGraph).toMatchObject({ url: 'https://homeupgrades.thegenixgroup.com/services', siteName: 'Genix Home Upgrades' })
  })
})

describe('sitemapXml / robotsTxt', () => {
  it('lists the site pages on the site host', () => {
    const xml = sitemapXml('multimedia', root)
    expect(xml).toContain('<loc>https://multimedia.thegenixgroup.com/</loc>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })
  it('lists /privacy on the hub sitemap only', () => {
    expect(sitemapXml('hub', root)).toContain('/privacy</loc>')
    expect(sitemapXml('logistics', root)).not.toContain('/privacy')
  })
  it('lists /about on the hub sitemap only', () => {
    expect(sitemapXml('hub', root)).toContain('/about</loc>')
    for (const k of ['logistics', 'homeupgrades', 'multimedia'] as const) expect(sitemapXml(k, root)).not.toContain('/about')
  })
  it('lists /contact on the hub and the division sitemaps that have the page, never Multimedia', () => {
    expect(sitemapXml('logistics', root)).toContain('/contact</loc>')
    expect(sitemapXml('homeupgrades', root)).toContain('/contact</loc>')
    expect(sitemapXml('hub', root)).toContain('/contact</loc>')
    expect(sitemapXml('multimedia', root)).not.toContain('/contact')
  })
  it('allows indexing only in production and points at the sitemap', () => {
    expect(robotsTxt('logistics', true, root)).toBe('User-agent: *\nAllow: /\n\nSitemap: https://logistics.thegenixgroup.com/sitemap.xml\n')
    expect(robotsTxt('logistics', false, root)).toBe('User-agent: *\nDisallow: /\n')
    expect(robotsTxt('hub', true, root)).toContain('Disallow: /admin')
  })
})

describe('siteJsonLd', () => {
  it('describes the hub as the parent of the three divisions', () => {
    const ld = siteJsonLd('hub', toSiteData('hub', null), root)
    expect(ld).toMatchObject({ '@type': 'Organization', name: 'The Genix Group', url: 'https://thegenixgroup.com/' })
    expect((ld.subOrganization as { name: string }[]).map((o) => o.name)).toEqual(['Genix Logistics', 'Genix Home Upgrades', 'Genix Multimedia'])
  })
  it('gives the hub the prototype address and area served', () => {
    const ld = siteJsonLd('hub', toSiteData('hub', null), root)
    expect(ld.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'San Diego', addressRegion: 'CA', addressCountry: 'US' })
    expect(ld.areaServed).toEqual({ '@type': 'Country', name: 'United States' })
  })
  it('gives a division its type, parent and area served', () => {
    const data = toSiteData('logistics', { areaServed: 'United States', areaServedType: 'Country', regions: [{ name: 'California' }] })
    const ld = siteJsonLd('logistics', data, root)
    expect(ld).toMatchObject({
      '@type': 'MovingCompany',
      name: 'Genix Logistics',
      slogan: 'Reliable Freight. Real People. On Time, Every Time.',
      parentOrganization: { name: 'The Genix Group', url: 'https://thegenixgroup.com/' },
      areaServed: { '@type': 'Country', name: 'United States' },
    })
  })
  it('leaves out areaServed when no area is set', () => {
    expect(siteJsonLd('multimedia', toSiteData('multimedia', null), root)).not.toHaveProperty('areaServed')
  })
  it('lists the division services as offers, as in the prototypes', () => {
    const ld = siteJsonLd('logistics', toSiteData('logistics', null), root)
    expect(ld.makesOffer).toEqual([
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Business freight' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Last-mile and courier delivery' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Home and office moves' } },
    ])
    expect(siteJsonLd('multimedia', toSiteData('multimedia', null), root)).not.toHaveProperty('makesOffer')
  })
})
