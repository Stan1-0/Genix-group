import { describe, expect, it } from 'vitest'
import { CLOSING, HU_SERVICE_SLUGS, PROCESS, SERVICES, huServiceBySlug, serviceBySlug, serviceDetailJsonLd, serviceSlugs } from '@/sites/services'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'

describe('service detail data', () => {
  it('has a detail for every Logistics and Home Upgrades service', () => {
    expect(HU_SERVICE_SLUGS).toEqual(['accent-walls', 'outdoor', 'handyman', 'reception'])
    expect(serviceSlugs('logistics')).toEqual(['freight', 'moves'])
    for (const s of [...SERVICES.logistics, ...SERVICES.homeupgrades]) {
      const d = s.detail!
      expect(d.lead && d.intro && d.eyebrow && d.description).toBeTruthy()
      expect(d.fit.cards).toHaveLength(3)
      expect(d.faqs.length).toBeGreaterThanOrEqual(3)
      expect(d.description.length).toBeLessThanOrEqual(160)
    }
  })
  it('gives every service a search title that names the service and where', () => {
    for (const s of [...SERVICES.logistics, ...SERVICES.homeupgrades]) {
      expect(s.seoTitle).toMatch(/San Diego|California/)
      expect(`${s.seoTitle} | Genix Home Upgrades`.length).toBeLessThanOrEqual(80)
    }
  })
  it('finds services by exact slug only', () => {
    expect(huServiceBySlug('outdoor')?.title).toBe('Outdoor builds')
    for (const bad of ['Outdoor', 'outdoor/', 'freight', '', 'constructor']) expect(huServiceBySlug(bad)).toBeUndefined()
    expect(serviceBySlug('logistics', 'moves')?.title).toBe('Home & office moves')
    for (const bad of ['outdoor', 'Moves', '']) expect(serviceBySlug('logistics', bad)).toBeUndefined()
  })
  it('reuses the home process and quote copy', () => {
    expect(PROCESS.steps.map((s) => s.title)).toEqual(['Site visit', 'Written quote', 'The build', 'Final walkthrough'])
    expect(CLOSING).toEqual({ h2: 'Tell us about the space.', lede: 'A few photos and a sentence about what you want is enough to start.' })
  })
  it('makes no new claims', () => {
    const all = JSON.stringify([...SERVICES.logistics, ...SERVICES.homeupgrades].map((s) => [s.seoTitle, s.detail]))
    expect(all).not.toMatch(/\$\d|\bfree\b|guarantee|licensed|insured|\byears\b|same day|24\/7|\bbest\b|cheap/i)
  })
})

describe('serviceDetailJsonLd', () => {
  it('is a graph of Service, FAQPage and BreadcrumbList', () => {
    const item = huServiceBySlug('handyman')!
    const ld = serviceDetailJsonLd(item, toSiteData('homeupgrades', null), root) as { '@graph': { '@type': string; [k: string]: unknown }[] }
    expect(ld['@graph'].map((n) => n['@type'])).toEqual(['Service', 'FAQPage', 'BreadcrumbList'])
    const faq = ld['@graph'][1] as unknown as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    expect(faq.mainEntity).toHaveLength(item.detail!.faqs.length)
    const crumbs = ld['@graph'][2] as unknown as { itemListElement: { item: string }[] }
    expect(crumbs.itemListElement.map((c) => c.item)).toEqual([
      'https://homeupgrades.thegenixgroup.com/',
      'https://homeupgrades.thegenixgroup.com/services',
      'https://homeupgrades.thegenixgroup.com/services/handyman',
    ])
  })
})

describe('serviceDetailJsonLd for Logistics', () => {
  it('names Genix Logistics, part of The Genix Group, as the provider on its own subdomain', () => {
    const item = serviceBySlug('logistics', 'freight')!
    const ld = serviceDetailJsonLd(item, toSiteData('logistics', null), root, 'logistics') as { '@graph': { '@type': string; [k: string]: unknown }[] }
    expect(ld['@graph'][0]).toMatchObject({
      '@type': 'Service',
      url: 'https://logistics.thegenixgroup.com/services/freight',
      provider: { '@type': 'MovingCompany', name: 'Genix Logistics', parentOrganization: { name: 'The Genix Group' } },
    })
  })
})
