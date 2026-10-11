import { describe, expect, it } from 'vitest'
import { FALLBACK_PROJECTS } from '@/projects/fallback'
import { selectProjects, toProject } from '@/projects/map'

describe('FALLBACK_PROJECTS', () => {
  it('holds the five seeded projects in order, three featured', () => {
    expect(FALLBACK_PROJECTS.map((p) => p.id)).toEqual(['feature-wall', 'tv-unit', 'slat-wall', 'marble-wall', 'tv-mount'])
    expect(FALLBACK_PROJECTS.filter((p) => p.featured).map((p) => p.id)).toEqual(['feature-wall', 'tv-unit', 'slat-wall'])
    for (const p of FALLBACK_PROJECTS) {
      expect(p.cover.src.startsWith('/brand/')).toBe(true)
      expect(p.cover.alt.length).toBeGreaterThan(10)
      expect(p.cover.width).toBeGreaterThan(0)
    }
    expect(FALLBACK_PROJECTS.find((p) => p.id === 'tv-unit')!.video).toEqual({ src: '/brand/hu-project.mp4' })
  })
})

describe('selectProjects', () => {
  const p = (id: string, order: number, featured: boolean) => ({ ...FALLBACK_PROJECTS[0], id, order, featured })
  it('sorts by order, filters featured, limits', () => {
    const list = [p('c', 30, true), p('a', 10, false), p('b', 20, true), p('d', 20, true)]
    expect(selectProjects(list).map((x) => x.id)).toEqual(['a', 'b', 'd', 'c'])
    expect(selectProjects(list, { featured: true, limit: 2 }).map((x) => x.id)).toEqual(['b', 'd'])
    expect(selectProjects([], { featured: true, limit: 3 })).toEqual([])
  })
})

describe('toProject', () => {
  const media = (filename: string, mimeType = 'image/jpeg') => ({ id: 1, url: `/api/media/file/${filename}`, alt: `Alt for ${filename}`, width: 800, height: 600, mimeType, filename })
  it('maps a populated doc', () => {
    const out = toProject({ id: 7, title: 'Wall', category: 'Accent wall', caption: null, description: 'A wall.', cover: media('c.jpg'), photos: [media('p1.jpg')], video: media('v.mp4', 'video/mp4'), featured: true, order: 5, published: true })
    expect(out).toEqual({ id: '7', title: 'Wall', category: 'Accent wall', caption: null, description: 'A wall.', cover: { src: '/api/media/file/c.jpg', alt: 'Alt for c.jpg', width: 800, height: 600 }, photos: [{ src: '/api/media/file/p1.jpg', alt: 'Alt for p1.jpg', width: 800, height: 600 }], video: { src: '/api/media/file/v.mp4' }, featured: true, order: 5 })
  })
  it('returns null without a usable cover and drops unpopulated photos', () => {
    expect(toProject({ id: 1, title: 'x', category: 'y', description: 'z', cover: 3, photos: [], order: 1 })).toBeNull()
    const out = toProject({ id: 2, title: 'x', category: 'y', description: 'z', cover: media('c.jpg'), photos: [5, media('p.jpg')], video: null, featured: false, order: 1 })
    expect(out!.photos).toHaveLength(1)
    expect(out!.video).toBeNull()
  })
})
