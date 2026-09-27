import { describe, expect, it } from 'vitest'
import { toSiteData } from '@/sites/data-shape'

describe('toSiteData', () => {
  it('falls back to registry values when there is no CMS record', () => {
    expect(toSiteData('logistics', null)).toEqual({
      heroHeading: 'Reliable Freight. Real People. Right on Schedule.',
      heroSubheading: '',
      phone: null,
      email: 'hello@thegenixgroup.com',
      coverage: [],
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
      coverage: [{ name: 'California', zipFrom: 900, zipTo: 961 }],
      seoTitle: null,
      seoDescription: 'Group description',
    })
    expect(d.heroHeading).toBe('Custom heading')
    expect(d.heroSubheading).toBe('')
    expect(d.phone).toBe('(619) 555-0100')
    expect(d.email).toBe('hello@thegenixgroup.com')
    expect(d.coverage).toEqual([{ name: 'California', zipFrom: 900, zipTo: 961 }])
    expect(d.seoDescription).toBe('Group description')
  })
})
