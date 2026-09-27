import { describe, expect, it } from 'vitest'
import { SITE_KEYS } from '@/sites/config'
import { THEMES, contrast, themeVars } from '@/sites/themes'

describe('contrast()', () => {
  it('matches known WCAG values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrast('#0072c6', '#fdfdf7')).toBeGreaterThan(4.5)
  })
})

// A failing pair here fails `npm run build` (the prebuild script runs this file).
describe.each(SITE_KEYS)('theme %s meets WCAG AA', (key) => {
  const t = THEMES[key]
  const text: [string, string, string][] = [
    ['ink on paper', t.ink, t.paper],
    ['ink-2 on paper', t.ink2, t.paper],
    ['muted on paper', t.muted, t.paper],
    ['heading on paper', t.heading, t.paper],
    ['link on paper', t.link, t.paper],
    ['gold-text on paper', t.goldText, t.paper],
    ['white on brand', '#ffffff', t.brand],
    ['on-brand-muted on brand', t.onBrandMuted, t.brand],
  ]
  const large: [string, string, string][] = [
    ['gold-display on paper (large text)', t.goldDisplay, t.paper],
    ['gold on brand (large text)', t.gold, t.brand],
    ['focus ring (heading) on paper', t.heading, t.paper],
  ]
  it.each(text)('%s ≥ 4.5:1', (_label, fg, bg) => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5))
  it.each(large)('%s ≥ 3:1', (_label, fg, bg) => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3))
})

describe('themeVars()', () => {
  it('exposes the tokens as CSS custom properties', () => {
    const vars = themeVars(THEMES.logistics) as Record<string, string>
    expect(vars['--brand']).toBe('#022248')
    expect(vars['--paper']).toBe('#f7f5ef')
    expect(vars['--font-display-face']).toContain('var(--font-archivo)')
    expect(vars['--radius']).toBe('6px')
  })
})
