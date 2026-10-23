import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { inspirationFor, toInspiration } from './map'
import type { InspirationPhoto } from './types'

async function readInspiration(): Promise<InspirationPhoto[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'inspiration', where: { published: { equals: true } }, depth: 1, limit: 200, sort: 'order', overrideAccess: false })
  return docs.map(toInspiration).filter((p): p is InspirationPhoto => p !== null)
}

/** Inspiration for one service page: its published photos, else the starters. A failed read uses the starters. */
export async function getInspiration(service: string): Promise<InspirationPhoto[]> {
  let published: InspirationPhoto[] = []
  try {
    published = await unstable_cache(readInspiration, ['inspiration', 'v1'], { tags: ['inspiration'] })()
  } catch (err) {
    console.error('getInspiration: falling back to the starter photos', err)
  }
  return inspirationFor(service, published)
}
