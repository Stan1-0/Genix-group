import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { seedProjects } from '@/seed/projects'

let payload: Payload
beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'projects', where: { id: { exists: true } }, context: { disableRevalidate: true } }) })

describe('seedProjects', () => {
  it('creates the five projects once and skips them on a second run', async () => {
    const first = await seedProjects(payload)
    expect(first.created).toHaveLength(5)
    const { docs } = await payload.find({ collection: 'projects', depth: 1, sort: 'order', limit: 10 })
    expect(docs.map((d) => d.title)).toEqual(['Accent wall', 'Custom TV unit', 'Accent wall', 'Marble TV wall', 'TV wall mounting'])
    expect(docs.filter((d) => d.featured)).toHaveLength(3)
    expect(typeof docs[1].video === 'object' && (docs[1].video as { mimeType: string }).mimeType).toBe('video/mp4')
    const second = await seedProjects(payload)
    expect(second.created).toHaveLength(0)
    expect(second.skipped).toHaveLength(5)
  }, 120_000)
})
