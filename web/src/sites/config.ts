/* Site registry: the single source of truth for structure. Content staff can
   edit (hero copy, contact details, coverage, SEO text) lives in Payload. */

export const SITE_KEYS = ['hub', 'logistics', 'homeupgrades', 'multimedia'] as const
export type SiteKey = (typeof SITE_KEYS)[number]
export const DIVISION_KEYS = ['logistics', 'homeupgrades', 'multimedia'] as const satisfies readonly SiteKey[]

export type NavItem = { label: string; href: string }

export type SiteConfig = {
  key: SiteKey
  name: string
  shortName: string
  subdomain: string | null
  inquiryPrefix: 'HUB' | 'LOG' | 'HUP' | 'MED'
  tagline: string
  schemaType: 'Organization' | 'MovingCompany' | 'HomeAndConstructionBusiness' | 'ProfessionalService'
  logo: { src: string; width: number; height: number } | null
  icons: string
  nav: NavItem[]
  cta: NavItem
  /** Trailing phrase of the hero heading shown in gold (see pages-home/gold.ts) */
  heroGold: string | null
  /** Division services listed as schema.org offers (as in the prototypes) */
  offers: string[]
  /** Paths listed in the sitemap. Later phases add pages here as they ship. */
  pages: string[]
}

const DIVISION_NAV: NavItem[] = [
  { label: 'Services', href: '/services' },
  { label: 'Our work', href: '/our-work' },
  { label: 'About', href: '/about' },
]

export const SITES: Record<SiteKey, SiteConfig> = {
  hub: {
    key: 'hub',
    name: 'The Genix Group',
    shortName: 'Group',
    subdomain: null,
    inquiryPrefix: 'HUB',
    tagline: 'We Haul It. We Build It. We Show It.',
    schemaType: 'Organization',
    logo: { src: '/brand/genix-group-logo.svg', width: 1288, height: 421 },
    icons: '/icons/hub',
    nav: [
      { label: 'Who we are', href: '/#about' },
      { label: 'Our businesses', href: '/#businesses' },
      { label: 'Get a quote', href: '/#contact' },
    ],
    cta: { label: 'Start a conversation', href: '/#contact' },
    heroGold: 'We Show It.',
    offers: [],
    pages: ['/'],
  },
  logistics: {
    key: 'logistics',
    name: 'Genix Logistics',
    shortName: 'Logistics',
    subdomain: 'logistics',
    inquiryPrefix: 'LOG',
    tagline: 'Reliable Freight. Real People. On Time, Every Time.',
    schemaType: 'MovingCompany',
    logo: { src: '/brand/genix-logistics-logo.svg', width: 876, height: 405 },
    icons: '/icons/logistics',
    nav: [
      { label: 'Services', href: '/#services' },
      { label: 'How it works', href: '/#how' },
      { label: 'Where we go', href: '/#areas' },
    ],
    cta: { label: 'Get a quote', href: '/#quote-form' },
    heroGold: 'On Time, Every Time.',
    offers: ['Business freight', 'Last-mile and courier delivery', 'Home and office moves'],
    pages: ['/'],
  },
  homeupgrades: {
    key: 'homeupgrades',
    name: 'Genix Home Upgrades',
    shortName: 'Home Upgrades',
    subdomain: 'homeupgrades',
    inquiryPrefix: 'HUP',
    tagline: 'From Blueprint to Beautiful.',
    schemaType: 'HomeAndConstructionBusiness',
    logo: { src: '/brand/genix-home-upgrades-logo.svg', width: 976, height: 722 },
    icons: '/icons/homeupgrades',
    nav: [
      { label: 'Services', href: '/#services' },
      { label: 'Our work', href: '/#work' },
      { label: 'How we work', href: '/#process' },
    ],
    cta: { label: 'Get a quote', href: '/#quote' },
    heroGold: 'to Beautiful.',
    offers: ['Renovation', 'Feature walls and TV units', 'Outdoor builds'],
    pages: ['/'],
  },
  multimedia: {
    key: 'multimedia',
    name: 'Genix Multimedia',
    shortName: 'Multimedia',
    subdomain: 'multimedia',
    inquiryPrefix: 'MED',
    tagline: 'Your Story, Captured and Amplified.',
    schemaType: 'ProfessionalService',
    logo: null, // no logo supplied yet: text wordmark
    icons: '/icons/hub',
    nav: DIVISION_NAV,
    cta: { label: 'Get a quote', href: '/contact' },
    heroGold: null,
    offers: [],
    pages: ['/'],
  },
}

export function isSiteKey(value: unknown): value is SiteKey {
  return typeof value === 'string' && (SITE_KEYS as readonly string[]).includes(value)
}

const defaultRoot = () => process.env.ROOT_DOMAIN || 'thegenixgroup.com'

export function siteHost(key: SiteKey, root: string = defaultRoot()): string {
  const sub = SITES[key].subdomain
  return sub ? `${sub}.${root}` : root
}

export function siteOrigin(key: SiteKey, root: string = defaultRoot()): string {
  const host = siteHost(key, root)
  const local = host === 'localhost' || host.startsWith('localhost:') || /\.localhost(:\d+)?$/.test(host)
  return `${local ? 'http' : 'https'}://${host}`
}

export function resolveSite(host: string, root: string = defaultRoot()): SiteKey | null {
  const h = host.trim().toLowerCase()
  const r = root.toLowerCase()
  if (h === r || h === `www.${r}`) return 'hub'
  for (const key of SITE_KEYS) {
    const sub = SITES[key].subdomain
    if (sub && h === `${sub}.${r}`) return key
  }
  return null
}
