import { FALLBACK_INSPIRATION } from './fallback'
import type { InspirationPhoto } from './types'

type Media = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null }
const isMedia = (m: unknown): m is Media => typeof m === 'object' && m !== null && typeof (m as Media).url === 'string'

/** A Payload `inspiration` doc (depth >= 1) -> InspirationPhoto; null when its image is missing or has no size. */
export function toInspiration(doc: unknown): InspirationPhoto | null {
  const d = doc as Record<string, unknown>
  const m = d.image
  if (!isMedia(m) || !m.width || !m.height) return null
  const style = String(d.style ?? '').trim()
  if (!style) return null
  return {
    id: String(d.id),
    service: String(d.service ?? ''),
    style,
    caption: typeof d.caption === 'string' && d.caption.trim() ? d.caption.trim() : null,
    image: { src: m.url!, alt: m.alt?.trim() || style, width: m.width, height: m.height },
    order: typeof d.order === 'number' ? d.order : 100,
  }
}

/** The service's published photos in order; the starter photos when it has none. At most `limit`. */
export function inspirationFor(service: string, published: readonly InspirationPhoto[], limit = 8): InspirationPhoto[] {
  const own = published.filter((p) => p.service === service)
  const source = own.length ? own : FALLBACK_INSPIRATION.filter((p) => p.service === service)
  return source
    .map((p, i) => [p, i] as const)
    .sort((a, b) => a[0].order - b[0].order || a[1] - b[1])
    .map(([p]) => p)
    .slice(0, limit)
}
