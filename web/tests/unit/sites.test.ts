import { describe, expect, it } from 'vitest'
import { SITES, SITE_KEYS, isSiteKey, resolveSite, siteHost, siteOrigin } from '@/sites/config'

describe('site registry', () => {
  it('has the four sites with their exact names, taglines and prefixes', () => {
    expect(SITE_KEYS).toEqual(['hub', 'logistics', 'homeupgrades', 'multimedia'])
    expect(SITES.hub).toMatchObject({ name: 'The Genix Group', tagline: 'We Haul It. We Build It. We Show It.', inquiryPrefix: 'HUB' })
    expect(SITES.logistics).toMatchObject({ name: 'Genix Logistics', tagline: 'Reliable Freight. Real People. On Time, Every Time.', inquiryPrefix: 'LOG' })
    expect(SITES.homeupgrades).toMatchObject({ name: 'Genix Home Upgrades', tagline: 'From Blueprint to Beautiful.', inquiryPrefix: 'HUP' })
    expect(SITES.multimedia).toMatchObject({ name: 'Genix Multimedia', tagline: 'Your Story, Captured and Amplified.', inquiryPrefix: 'MED' })
  })

  it('recognises site keys', () => {
    expect(isSiteKey('logistics')).toBe(true)
    expect(isSiteKey('admin')).toBe(false)
    expect(isSiteKey(undefined)).toBe(false)
  })

  it('builds hosts and origins for production and local roots', () => {
    expect(siteHost('hub', 'thegenixgroup.com')).toBe('thegenixgroup.com')
    expect(siteHost('logistics', 'thegenixgroup.com')).toBe('logistics.thegenixgroup.com')
    expect(siteOrigin('homeupgrades', 'thegenixgroup.com')).toBe('https://homeupgrades.thegenixgroup.com')
    expect(siteOrigin('hub', 'localhost:3000')).toBe('http://localhost:3000')
    expect(siteOrigin('multimedia', 'localhost:3000')).toBe('http://multimedia.localhost:3000')
  })

  it('resolves a request host to a site', () => {
    expect(resolveSite('thegenixgroup.com', 'thegenixgroup.com')).toBe('hub')
    expect(resolveSite('www.thegenixgroup.com', 'thegenixgroup.com')).toBe('hub')
    expect(resolveSite('Logistics.TheGenixGroup.com', 'thegenixgroup.com')).toBe('logistics')
    expect(resolveSite('logistics.localhost:3000', 'localhost:3000')).toBe('logistics')
    expect(resolveSite('localhost:3000', 'localhost:3000')).toBe('hub')
    expect(resolveSite('genix-abc123.vercel.app', 'thegenixgroup.com')).toBeNull()
    expect(resolveSite('evil.com', 'thegenixgroup.com')).toBeNull()
  })
})
