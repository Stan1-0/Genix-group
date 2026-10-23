import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'
import { inspirationFor, toInspiration } from '@/inspiration/map'

// Runs against the genix_test database with BLOB_READ_WRITE_TOKEN empty (vitest.config.mts): uploads go to web/media/.
let payload: Payload
const upload = async (name: string, mimetype = 'image/png') => {
  const data = mimetype === 'image/png'
    ? await sharp({ create: { width: 8, height: 6, channels: 3, background: '#c28a2c' } }).png().toBuffer()
    : Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')
  return payload.create({ collection: 'media', data: { alt: `Alt ${name}` }, file: { data, mimetype, name, size: data.length } })
}
const make = (data: Record<string, unknown>) => payload.create({ collection: 'inspiration', data: data as never, context: { disableRevalidate: true } })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'inspiration', where: { id: { exists: true } }, context: { disableRevalidate: true } }) })

describe('inspiration collection', () => {
  it("an editor's published photo replaces the starters on that service only", async () => {
    const img = await upload('pergola.png')
    await make({ service: 'outdoor', style: 'Cedar pergola', image: img.id, order: 10 })
    await make({ service: 'outdoor', style: 'Hidden draft', image: img.id, published: false })
    const { docs } = await payload.find({ collection: 'inspiration', where: { published: { equals: true } }, depth: 1, overrideAccess: false })
    const published = docs.map(toInspiration).filter((p) => p !== null)
    expect(inspirationFor('outdoor', published).map((p) => p.style)).toEqual(['Cedar pergola'])
    expect(inspirationFor('outdoor', published)[0].image.src).toMatch(/^\/api\/media\/file\//)
    expect(inspirationFor('accent-walls', published)).toHaveLength(4) // still the starters
  })
  it('rejects an SVG (no size, so the card would vanish)', async () => {
    const svg = await upload('logo.svg', 'image/svg+xml')
    const err = await make({ service: 'outdoor', style: 'Logo', image: svg.id }).then(() => null, (e) => e)
    expect(err).not.toBeNull()
    expect(err.data.errors).toEqual([expect.objectContaining({ path: 'image', message: 'Use a JPG, PNG or WebP photo.' })])
  })
})
