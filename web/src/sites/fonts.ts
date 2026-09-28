import { Archivo, Hanken_Grotesk, IBM_Plex_Mono, Plus_Jakarta_Sans, Schibsted_Grotesk } from 'next/font/google'
import type { FontKey, Theme } from './themes'

// Variable names must match FONT_VARS in themes.ts.
const schibsted = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-schibsted', display: 'swap' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' })

const FONTS: Record<FontKey, { variable: string }> = { schibsted, hanken, plexMono, jakarta, archivo }

/** Class names defining only the font variables this theme uses. */
export function fontClassNames(t: Theme): string {
  return [...new Set([t.fontDisplay, t.fontBody, t.fontMono])].map((k) => FONTS[k].variable).join(' ')
}
