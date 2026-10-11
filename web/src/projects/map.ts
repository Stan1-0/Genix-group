import type { Project, ProjectImage } from './types'

type Media = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null; mimeType?: string | null }
const isMedia = (m: unknown): m is Media => typeof m === 'object' && m !== null && typeof (m as Media).url === 'string'
const image = (m: unknown): ProjectImage | null =>
  isMedia(m) && m.width && m.height ? { src: m.url!, alt: m.alt ?? '', width: m.width, height: m.height } : null

/** A Payload `projects` doc (depth >= 1) -> Project; null when it has no usable cover. */
export function toProject(doc: unknown): Project | null {
  const d = doc as Record<string, unknown>
  const cover = image(d.cover)
  if (!cover) return null
  const photos = (Array.isArray(d.photos) ? d.photos : []).map(image).filter((p): p is ProjectImage => p !== null)
  const video = isMedia(d.video) && d.video.mimeType === 'video/mp4' ? { src: d.video.url! } : null
  return {
    id: String(d.id),
    title: String(d.title ?? ''),
    category: String(d.category ?? ''),
    caption: typeof d.caption === 'string' && d.caption.trim() ? d.caption : null,
    description: String(d.description ?? ''),
    cover,
    photos,
    video,
    featured: Boolean(d.featured),
    order: typeof d.order === 'number' ? d.order : 100,
  }
}

/** Sort by `order` (stable for ties), optionally keep only featured, optionally limit. */
export function selectProjects(list: readonly Project[], opts: { featured?: boolean; limit?: number } = {}): Project[] {
  const sorted = list.map((p, i) => [p, i] as const).sort((a, b) => a[0].order - b[0].order || a[1] - b[1]).map(([p]) => p)
  const kept = opts.featured ? sorted.filter((p) => p.featured) : sorted
  return opts.limit === undefined ? kept : kept.slice(0, opts.limit)
}

/** Featured projects (sorted, limited); when none is featured, the first `limit` projects instead. */
export function featuredOrFirst(list: readonly Project[], limit: number): Project[] {
  const featured = selectProjects(list, { featured: true, limit })
  return featured.length ? featured : selectProjects(list, { limit })
}
