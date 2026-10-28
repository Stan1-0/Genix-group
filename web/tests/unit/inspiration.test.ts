import { describe, expect, it } from 'vitest'
import { INSPIRATION_SERVICES, inspirationFor, toInspiration } from '@/inspiration/map'
import { FALLBACK_INSPIRATION } from '@/inspiration/fallback'
import { SERVICES } from '@/sites/services'
import { Inspiration } from '@/collections/Inspiration'

const doc = (over: Record<string, unknown> = {}) => ({
  id: 7, service: 'outdoor', style: 'Cedar pergola', caption: '  Shade for the patio.  ', order: 20, published: true,
  image: { url: '/api/media/file/pergola.jpg', alt: 'A cedar pergola over a stone patio', width: 1600, height: 1200 },
  ...over,
})

describe('toInspiration', () => {
  it('maps a published doc with its image', () => {
    expect(toInspiration(doc())).toEqual({
      id: '7', service: 'outdoor', style: 'Cedar pergola', caption: 'Shade for the patio.', order: 20,
      image: { src: '/api/media/file/pergola.jpg', alt: 'A cedar pergola over a stone patio', width: 1600, height: 1200 },
    })
  })
  it('falls back to the style for missing alt text and drops docs it cannot show', () => {
    expect(toInspiration(doc({ image: { url: '/x.jpg', alt: '', width: 10, height: 10 } }))?.image.alt).toBe('Cedar pergola')
    expect(toInspiration(doc({ image: { url: '/x.svg', alt: 'x', width: null, height: null } }))).toBeNull()
    expect(toInspiration(doc({ image: 3 }))).toBeNull()
    expect(toInspiration(doc({ style: '  ' }))).toBeNull()
  })
})

describe('inspirationFor', () => {
  const own = [toInspiration(doc({ id: 1, order: 30, style: 'B' }))!, toInspiration(doc({ id: 2, order: 10, style: 'A' }))!]
  it("uses the service's own photos, in order, instead of the starters", () => {
    expect(inspirationFor('outdoor', own).map((p) => p.style)).toEqual(['A', 'B'])
    expect(inspirationFor('accent-walls', own).every((p) => p.service === 'accent-walls')).toBe(true)
  })
  it('falls back to starter photos, or none for a service without suitable ones', () => {
    expect(inspirationFor('accent-walls', [])[0].style).toBe('Backlit marble & slatted wood')
    expect(inspirationFor('handyman', [])).toEqual([])
  })
  it('shows nothing on a service page without an Inspiration section, even with published photos', () => {
    const handyman = [toInspiration(doc({ id: 3, service: 'handyman', style: 'Shelves' }))!]
    expect(inspirationFor('handyman', handyman)).toEqual([])
    expect(inspirationFor('handyman', [])).toEqual([])
  })
  it('caps the gallery', () => {
    const many = Array.from({ length: 12 }, (_, i) => toInspiration(doc({ id: i, style: `S${i}` }))!)
    expect(inspirationFor('outdoor', many, 8)).toHaveLength(8)
  })
})

describe('starter photos and admin collection', () => {
  it('point at real services, with alt text, and are local brand photos or credited Unsplash photos', () => {
    const ids = SERVICES.homeupgrades.map((s) => s.id)
    for (const p of FALLBACK_INSPIRATION) {
      expect(ids).toContain(p.service)
      expect(p.image.alt.length).toBeGreaterThan(10)
      expect(p.style.length).toBeLessThanOrEqual(40)
      expect((p.caption ?? '').length).toBeLessThanOrEqual(120)
      if (p.image.src.startsWith('/brand/')) continue
      expect(p.image.src).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?/)
      expect(p.credit?.url).toMatch(/^https:\/\/unsplash\.com\/@[\w-]+\?utm_source=genix_group&utm_medium=referral$/)
    }
    expect(new Set(FALLBACK_INSPIRATION.map((p) => p.id)).size).toBe(FALLBACK_INSPIRATION.length)
  })
  it('give every service with a section starter photos, within the gallery cap', () => {
    for (const id of INSPIRATION_SERVICES) expect(inspirationFor(id, []).length).toBeGreaterThanOrEqual(5)
    expect(inspirationFor('accent-walls', []).length).toBe(8)
  })
  it('offers only the services with an Inspiration section in the admin', () => {
    const service = Inspiration.fields.find((f) => 'name' in f && f.name === 'service') as unknown as {
      options: { value: string }[]
      filterOptions: (a: { options: { value: string }[] }) => { value: string }[]
    }
    expect(service.options.map((o) => o.value)).toEqual(SERVICES.homeupgrades.map((s) => s.id))
    expect(service.filterOptions({ options: service.options }).map((o) => o.value)).toEqual(['accent-walls', 'outdoor', 'reception'])
    for (const id of INSPIRATION_SERVICES) expect(SERVICES.homeupgrades.map((s) => s.id)).toContain(id)
    for (const p of FALLBACK_INSPIRATION) expect(INSPIRATION_SERVICES).toContain(p.service)
  })
})
