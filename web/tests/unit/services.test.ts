import { describe, expect, it } from 'vitest'
import { QUOTING, SERVICES, SERVICES_INTRO, servicesJsonLd } from '@/sites/services'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'

describe('SERVICES', () => {
  it('lists the services in page order with the agreed anchors', () => {
    expect(SERVICES.logistics.map((s) => s.id)).toEqual(['freight', 'moves'])
    expect(SERVICES.homeupgrades.map((s) => s.id)).toEqual(['accent-walls', 'outdoor', 'handyman', 'reception'])
    expect(SERVICES.homeupgrades.map((s) => s.title)).not.toContain('Renovation')
  })
  it('sends each service to /contact with an allow-listed pre-selection', () => {
    expect(SERVICES.logistics.map((s) => s.quoteHref)).toEqual(['/contact?kind=business', '/contact?kind=move'])
    expect(SERVICES.homeupgrades.map((s) => s.quoteHref)).toEqual([
      '/contact?project=accent&property=home',
      '/contact?project=outdoor',
      '/contact?project=other',
      '/contact?project=accent&property=business',
    ])
  })
  it('has photos for Home Upgrades only, each with alt text', () => {
    expect(SERVICES.logistics.every((s) => s.image === null)).toBe(true)
    expect(SERVICES.homeupgrades.every((s) => s.image && s.image.alt.length > 10)).toBe(true)
  })
  it('makes no claims beyond the existing ones', () => {
    const all = JSON.stringify([SERVICES, SERVICES_INTRO, QUOTING])
    expect(all).not.toMatch(/\$\d|guarantee|insured|licensed|years|same day|24\/7|free/i)
  })
})

describe('servicesJsonLd', () => {
  it('is an ItemList of the page services with the division as provider', () => {
    const ld = servicesJsonLd('homeupgrades', toSiteData('homeupgrades', null), root) as { '@type': string; itemListElement: { position: number; item: { '@type': string; name: string; url: string; provider: { name: string } } }[] }
    expect(ld['@type']).toBe('ItemList')
    expect(ld.itemListElement).toHaveLength(4)
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, item: { '@type': 'Service', name: 'Accent walls & TV units', url: 'https://homeupgrades.thegenixgroup.com/services#accent-walls', provider: { name: 'Genix Home Upgrades' } } })
  })
})
