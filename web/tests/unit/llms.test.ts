import { describe, expect, it } from 'vitest'
import { llmsTxt } from '@/sites/llms'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'

describe('llmsTxt', () => {
  it('tells AI assistants which division runs each service, with links to the service pages', () => {
    const txt = llmsTxt('hub', toSiteData('hub', null), root)
    expect(txt.startsWith('# The Genix Group\n\n> ')).toBe(true)
    expect(txt).toContain('## Genix Logistics: Freight, Courier & Moving Services in San Diego')
    expect(txt).toContain('Website: https://logistics.thegenixgroup.com/')
    expect(txt).toContain('[Home & office moves](https://logistics.thegenixgroup.com/services/moves)')
    expect(txt).toContain('[Handyman services](https://homeupgrades.thegenixgroup.com/services/handyman)')
    expect(txt).toContain('## Genix Multimedia')
    expect(txt).toContain('- Video production')
    expect(txt).toContain('https://thegenixgroup.com/contact')
  })
  it('describes a division, its services and its sister businesses', () => {
    const txt = llmsTxt('homeupgrades', toSiteData('homeupgrades', null), root)
    expect(txt.startsWith('# Genix Home Upgrades\n')).toBe(true)
    expect(txt).toContain('part of The Genix Group (https://thegenixgroup.com/)')
    expect(txt).toContain('[Outdoor builds](https://homeupgrades.thegenixgroup.com/services/outdoor)')
    expect(txt).toContain('- [Genix Logistics](https://logistics.thegenixgroup.com/)')
    expect(txt).not.toContain('- [Genix Home Upgrades](')
  })
  it('leaves out a contact page the site does not have', () => {
    expect(llmsTxt('multimedia', toSiteData('multimedia', null), root)).not.toContain('multimedia.thegenixgroup.com/contact')
  })
})
