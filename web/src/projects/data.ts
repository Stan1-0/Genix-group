import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FALLBACK_PROJECTS } from './fallback'
import { selectProjects, toProject } from './map'
import type { Project } from './types'

async function readProjects(): Promise<Project[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'projects', where: { published: { equals: true } }, depth: 1, limit: 100, sort: 'order', overrideAccess: false })
  return docs.map(toProject).filter((p): p is Project => p !== null)
}

/** Published projects (ordered), or the five fallback projects when there are none or the read fails. */
export async function getProjects(opts: { featured?: boolean; limit?: number } = {}): Promise<Project[]> {
  let list: Project[] = []
  try {
    list = await unstable_cache(readProjects, ['projects', 'v1'], { tags: ['projects'] })()
  } catch (err) {
    console.error('getProjects: falling back to the static projects', err)
  }
  return selectProjects(list.length ? list : FALLBACK_PROJECTS, opts)
}
