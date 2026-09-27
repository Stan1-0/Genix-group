import { SITES, type SiteKey } from './config'

export type SiteData = {
  heroHeading: string
  heroSubheading: string
  phone: string | null
  email: string | null
  coverage: { name: string; zipFrom?: number | null; zipTo?: number | null }[]
  seoTitle: string | null
  seoDescription: string | null
}

type SiteDoc = {
  heroHeading?: string | null
  heroSubheading?: string | null
  phone?: string | null
  email?: string | null
  coverage?: { name: string; zipFrom?: number | null; zipTo?: number | null }[] | null
  seoTitle?: string | null
  seoDescription?: string | null
}

const GROUP_EMAIL = 'hello@thegenixgroup.com'
const text = (v: string | null | undefined) => (v && v.trim() ? v : null)

/** Merge a CMS record over registry defaults. Pure. */
export function toSiteData(key: SiteKey, doc: SiteDoc | null): SiteData {
  return {
    heroHeading: text(doc?.heroHeading) ?? SITES[key].tagline,
    heroSubheading: text(doc?.heroSubheading) ?? '',
    phone: text(doc?.phone),
    email: text(doc?.email) ?? GROUP_EMAIL,
    coverage: (doc?.coverage ?? []).map(({ name, zipFrom, zipTo }) => ({ name, zipFrom, zipTo })),
    seoTitle: text(doc?.seoTitle),
    seoDescription: text(doc?.seoDescription),
  }
}
