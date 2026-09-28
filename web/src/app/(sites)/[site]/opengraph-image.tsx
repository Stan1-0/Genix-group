import { ImageResponse } from 'next/og'
import { SITES, SITE_KEYS, isSiteKey } from '@/sites/config'
import { THEMES } from '@/sites/themes'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'The Genix Group'

export function generateStaticParams() {
  return SITE_KEYS.map((site) => ({ site }))
}

export default async function OpengraphImage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  const key = isSiteKey(site) ? site : 'hub'
  const cfg = SITES[key]
  const t = THEMES[key]
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: t.brand, color: '#ffffff' }}>
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: t.gold }}>{cfg.name}</div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.02, maxWidth: 980 }}>{cfg.tagline}</div>
        <div style={{ display: 'flex', width: 220, height: 8, background: t.gold }} />
      </div>
    ),
    size,
  )
}
