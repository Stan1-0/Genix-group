import { describe, expect, it } from 'vitest'
import { toSiteData } from '@/sites/data-shape'

describe('toSiteData', () => {
  it('falls back to registry values when there is no CMS record', () => {
    expect(toSiteData('logistics', null)).toEqual({
      heroHeading: 'Reliable Freight. Real People. On Time, Every Time.',
      heroSubheading: '',
      phone: null,
      email: 'hello@thegenixgroup.com',
      areaServed: null,
      regions: [],
      seoTitle: null,
      seoDescription: null,
    })
  })
  it('prefers CMS values and ignores empty strings', () => {
    const d = toSiteData('hub', {
      heroHeading: 'Custom heading',
      heroSubheading: '',
      phone: '(619) 555-0100',
      email: null,
      areaServed: 'United States',
      areaServedType: 'Country',
      regions: [{ name: 'California' }, { name: ' ' }],
      seoTitle: null,
      seoDescription: 'Group description',
    })
    expect(d.heroHeading).toBe('Custom heading')
    expect(d.heroSubheading).toBe('')
    expect(d.phone).toBe('(619) 555-0100')
    expect(d.email).toBe('hello@thegenixgroup.com')
    expect(d.areaServed).toEqual({ type: 'Country', name: 'United States' })
    expect(d.regions).toEqual(['California'])
    expect(d.seoDescription).toBe('Group description')
  })
  it('treats a blank area as none and defaults the area type to Country', () => {
    expect(toSiteData('logistics', { areaServed: '  ', areaServedType: 'State' }).areaServed).toBeNull()
    expect(toSiteData('logistics', { areaServed: 'United States', areaServedType: null }).areaServed).toEqual({ type: 'Country', name: 'United States' })
  })
})
