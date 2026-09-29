import type { CSSProperties } from 'react'
import type { SiteKey } from './config'

/* Per-site skins. Layout is shared; these tokens differ. Colours come from the
   approved prototypes in design/. Pure module: safe to import in unit tests. */

export type FontKey = 'schibsted' | 'hanken' | 'plexMono' | 'jakarta' | 'archivo'

export const FONT_VARS: Record<FontKey, string> = {
  schibsted: '--font-schibsted',
  hanken: '--font-hanken',
  plexMono: '--font-plex-mono',
  jakarta: '--font-jakarta',
  archivo: '--font-archivo',
}

export type Theme = {
  brand: string
  brandDeep: string
  heading: string
  paper: string
  ink: string
  ink2: string
  muted: string
  line: string
  onBrandMuted: string
  gold: string
  goldText: string
  goldDisplay: string
  link: string
  radius: string
  fontDisplay: FontKey
  fontBody: FontKey
  fontMono: FontKey
}

const GOLD = { gold: '#c28a2c', goldText: '#8a5e10', goldDisplay: '#a8741a' }
const NEUTRAL = { ink: '#111110', ink2: '#3f3c37', muted: '#625d55', line: '#dcd8cf' }

export const THEMES: Record<SiteKey, Theme> = {
  hub: {
    ...GOLD, ...NEUTRAL,
    brand: '#0b0b0c', brandDeep: '#000000', heading: '#111110', paper: '#f5f3ee',
    onBrandMuted: '#bfb7a7', link: '#111110', radius: '0px',
    fontDisplay: 'schibsted', fontBody: 'hanken', fontMono: 'plexMono',
  },
  homeupgrades: {
    ...GOLD, ...NEUTRAL, ink2: '#3a3a3a', muted: '#666666', // prototype values (approved design)
    brand: '#022248', brandDeep: '#01152e', heading: '#022248', paper: '#fdfdf7',
    onBrandMuted: '#b8c4d6', link: '#0072c6', radius: '12px',
    fontDisplay: 'jakarta', fontBody: 'jakarta', fontMono: 'jakarta',
  },
  logistics: {
    ...GOLD, ...NEUTRAL,
    brand: '#022248', brandDeep: '#01152e', heading: '#022248', paper: '#f7f5ef',
    onBrandMuted: '#b9c4d3', link: '#022248', radius: '6px',
    fontDisplay: 'archivo', fontBody: 'archivo', fontMono: 'plexMono',
  },
  multimedia: {
    // placeholder until the Multimedia logo and design exist; darkened from the
    // original #5a1f4d prototype plum to clear 4.5:1 against gold (text-gold on
    // bg-brand eyebrows, text-heading on bg-gold CTAs)
    ...GOLD, ...NEUTRAL,
    brand: '#44173a', brandDeep: '#2f1029', heading: '#44173a', paper: '#f7f4f6',
    onBrandMuted: '#e8d3e2', link: '#44173a', radius: '8px',
    fontDisplay: 'schibsted', fontBody: 'hanken', fontMono: 'plexMono',
  },
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG 2.x contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const face = (key: FontKey, fallback: string) => `var(${FONT_VARS[key]}), ${fallback}`

export function themeVars(t: Theme): CSSProperties {
  return {
    '--brand': t.brand,
    '--brand-deep': t.brandDeep,
    '--heading': t.heading,
    '--paper': t.paper,
    '--ink': t.ink,
    '--ink-2': t.ink2,
    '--muted': t.muted,
    '--line': t.line,
    '--on-brand-muted': t.onBrandMuted,
    '--gold': t.gold,
    '--gold-text': t.goldText,
    '--gold-display': t.goldDisplay,
    '--link': t.link,
    '--radius': t.radius,
    '--font-display-face': face(t.fontDisplay, 'system-ui, sans-serif'),
    '--font-body-face': face(t.fontBody, 'system-ui, sans-serif'),
    '--font-mono-face': face(t.fontMono, 'ui-monospace, monospace'),
  } as CSSProperties
}
