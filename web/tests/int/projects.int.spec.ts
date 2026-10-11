import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'
import { toProject, selectProjects } from '@/projects/map'
import { getProjects } from '@/projects/data'
import { FALLBACK_PROJECTS } from '@/projects/fallback'

// Runs against the genix_test database with BLOB_READ_WRITE_TOKEN empty (vitest.config.mts): uploads go to web/media/.
let payload: Payload
const png = async () => sharp({ create: { width: 8, height: 6, channels: 3, background: '#c28a2c' } }).png().toBuffer()
const upload = async (name: string) => {
  const data = await png()
  return payload.create({ collection: 'media', data: { alt: `Alt ${name}` }, file: { data, mimetype: 'image/png', name, size: data.length } })
}
const make = async (over: Record<string, unknown>) => {
  const cover = await upload(`c-${Math.random().toString(36).slice(2)}.png`)
  return payload.create({ collection: 'projects', data: { title: 'T', category: 'C', description: 'D long enough.', cover: cover.id, ...over }, context: { disableRevalidate: true } })
}

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'projects', where: { id: { exists: true } }, context: { disableRevalidate: true } }) })

describe('projects collection', () => {
  it('anonymous reads see only published projects', async () => {
    await make({ title: 'Live', published: true })
    await make({ title: 'Draft', published: false })
    const anon = await payload.find({ collection: 'projects', overrideAccess: false, depth: 1 })
    expect(anon.docs.map((d) => d.title)).toEqual(['Live'])
  })
  it('maps populated docs and orders/limits featured ones', async () => {
    await make({ title: 'B', order: 20, featured: true })
    await make({ title: 'A', order: 10, featured: true })
    await make({ title: 'C', order: 5, featured: false })
    const { docs } = await payload.find({ collection: 'projects', depth: 1, overrideAccess: false })
    const list = docs.map(toProject).filter(Boolean) as NonNullable<ReturnType<typeof toProject>>[]
    expect(list[0].cover.src).toMatch(/^\/api\/media\/file\//)
    expect(selectProjects(list, { featured: true, limit: 1 }).map((p) => p.title)).toEqual(['A'])
  })
  it('refuses a non-MP4 video', async () => {
    const notVideo = await upload('still.png')
    await expect(make({ title: 'V', video: notVideo.id })).rejects.toThrow()
  })
  it('stores uploads on local disk, not the live Blob store', async () => {
    const m = await upload('local-check.png')
    expect(m.url).toMatch(/^\/api\/media\/file\//)
  })
  it('getProjects serves the five fallback projects when there are no published projects (or the cache is unavailable)', async () => {
    await make({ title: 'Draft only', published: false })
    const all = await getProjects()
    expect(all.map((p) => p.id)).toEqual(FALLBACK_PROJECTS.map((p) => p.id))
    expect((await getProjects({ featured: true, limit: 3 })).map((p) => p.id)).toEqual(['feature-wall', 'tv-unit', 'slat-wall'])
  })
})
