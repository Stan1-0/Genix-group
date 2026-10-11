import fs from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'
import { FALLBACK_PROJECTS } from '@/projects/fallback'

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' }

// Idempotent: a project already present with the same order AND title is skipped, never overwritten.
export async function seedProjects(payload: Payload, opts: { dir?: string } = {}): Promise<{ created: string[]; skipped: string[] }> {
  const dir = opts.dir ?? path.resolve(process.cwd(), 'public/brand')
  const context = { disableRevalidate: true }
  const created: string[] = []
  const skipped: string[] = []

  const upload = async (src: string, alt: string) => {
    const name = path.basename(src)
    const mimetype = MIME[path.extname(name).toLowerCase()]
    if (!mimetype) throw new Error(`Unsupported file type: ${name}`)
    const data = await fs.readFile(path.join(dir, name))
    const doc = await payload.create({ collection: 'media', data: { alt }, file: { data, name, mimetype, size: data.length }, context })
    return doc.id
  }

  for (const p of FALLBACK_PROJECTS) {
    const existing = await payload.find({ collection: 'projects', where: { and: [{ order: { equals: p.order } }, { title: { equals: p.title } }] }, limit: 1, depth: 0 })
    if (existing.totalDocs) {
      skipped.push(p.title)
      continue
    }
    const cover = await upload(p.cover.src, p.cover.alt)
    const video = p.video ? await upload(p.video.src, p.title) : undefined
    await payload.create({
      collection: 'projects',
      data: { title: p.title, category: p.category, caption: p.caption ?? undefined, description: p.description, cover, video, featured: p.featured, order: p.order, published: true },
      context,
    })
    created.push(p.title)
  }
  return { created, skipped }
}
