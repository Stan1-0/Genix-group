import { SITES, type SiteKey } from './config'

/** schema.org place types an editor can pick for the area served. */
export const AREA_TYPES = ['Country', 'State', 'City', 'AdministrativeArea'] as const
export type AreaType = (typeof AREA_TYPES)[number]

export type SiteData = {
  heroHeading: string
  heroSubheading: string
  phone: string | null
  email: string | null
  /** The whole area served (structured data), e.g. the United States. */
  areaServed: { type: AreaType; name: string } | null
  /** Optional regions to list on the site. */
  regions: string[]
  seoTitle: string | null
  seoDescription: string | null
}

type SiteDoc = {
  heroHeading?: string | null
  heroSubheading?: string | null
  phone?: string | null
  email?: string | null
  areaServed?: string | null
  areaServedType?: AreaType | null
  regions?: { name: string }[] | null
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
    areaServed: text(doc?.areaServed) ? { type: doc?.areaServedType ?? 'Country', name: doc!.areaServed!.trim() } : null,
    regions: (doc?.regions ?? []).map((r) => r.name.trim()).filter(Boolean),
    seoTitle: text(doc?.seoTitle),
    seoDescription: text(doc?.seoDescription),
  }
}
