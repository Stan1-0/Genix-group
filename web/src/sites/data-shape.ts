import { SITES, type SiteKey } from './config'

/** schema.org place types an editor can pick for the area served. */
export const AREA_TYPES = ['Country', 'State', 'City', 'AdministrativeArea'] as const
export type AreaType = (typeof AREA_TYPES)[number]

export type PostalAddress = { street: string; city: string; state: string; zip: string }

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
  /** The hub's postal address; null unless complete. */
  address: PostalAddress | null
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
  address?: { street?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null
}

const GROUP_EMAIL = 'hello@thegenixgroup.com'
const text = (v: string | null | undefined) => (v && v.trim() ? v : null)

/** The four address parts, or null unless every one is filled in (never a half address). */
function toAddress(a: SiteDoc['address']): PostalAddress | null {
  const street = text(a?.street)?.trim()
  const city = text(a?.city)?.trim()
  const state = text(a?.state)?.trim()
  const zip = text(a?.zip)?.trim()
  return street && city && state && zip ? { street, city, state, zip } : null
}

export const formatAddress = (a: PostalAddress) => `${a.street}, ${a.city}, ${a.state} ${a.zip}`

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
    address: toAddress(doc?.address),
  }
}
