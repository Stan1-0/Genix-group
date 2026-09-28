import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteKey } from './config'
import { toSiteData, type SiteData } from './data-shape'
import { shouldRethrowOnCmsFailure } from './build-phase'

/** Bump whenever SiteData's shape changes: cached entries can outlive a deploy,
    and an old-shape entry would otherwise be served until its tag is revalidated. */
const SITE_DATA_SHAPE = 2

async function readSite(key: SiteKey): Promise<SiteData> {
  const payload = await getPayload({ config })
  const res = await payload.find({ collection: 'sites', where: { key: { equals: key } }, limit: 1, depth: 0 })
  return toSiteData(key, res.docs[0] ?? null)
}

/** Cached per site; the Sites afterChange hook revalidates tag `site:<key>`.
    Errors are not cached: a CMS outage falls back to registry defaults at runtime,
    but fails the build during `next build`. */
export async function getSiteData(key: SiteKey): Promise<SiteData> {
  try {
    return await unstable_cache(() => readSite(key), ['site-data', `v${SITE_DATA_SHAPE}`, key], { tags: [`site:${key}`] })()
  } catch (err) {
    if (shouldRethrowOnCmsFailure(process.env.NEXT_PHASE)) throw err
    console.error(`getSiteData(${key}) failed; using defaults`, err)
    return toSiteData(key, null)
  }
}
