import type { Tone } from '@/pages-home/gold'

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
  /** Home page <title> after the site name: what the site does, in the words people search for, and where. */
  seoTitle: string
  schemaType: 'Organization' | 'MovingCompany' | 'HomeAndConstructionBusiness' | 'ProfessionalService'
  logo: { src: string; width: number; height: number } | null
  icons: string
  nav: NavItem[]
  cta: NavItem
  /** Trailing phrase of the hero heading shown in gold (see pages-home/gold.ts) */
  heroGold: string | null
  /** Sentences of the hero heading shown in a division's colour (hub; see pages-home/gold.ts). */
  heroTones?: Readonly<Record<string, Tone>>
  /** What the site does, in one sentence (the hub's division panel copy). Used in structured data and llms.txt. */
  summary: string
  /** The services this site is the one to ask for, in the words people search with (schema.org knowsAbout). */
  knowsAbout: string[]
  /** Division services listed as schema.org offers (as in the prototypes) */
  offers: string[]
  /** Paths listed in the sitemap. Later phases add pages here as they ship. */
  pages: string[]
}


export const SITES: Record<SiteKey, SiteConfig> = {
  hub: {
    key: 'hub',
    name: 'The Genix Group',
    shortName: 'Group',
    subdomain: null,
    inquiryPrefix: 'HUB',
    tagline: 'We Haul It. We Build It. We Show It.',
    seoTitle: 'Freight, Home Upgrades & Multimedia, Based in San Diego',
    schemaType: 'Organization',
    logo: { src: '/brand/genix-group-logo.svg', width: 1161, height: 340 },
    icons: '/icons/hub',
    nav: [
      { label: 'Who we are', href: '/about' },
      { label: 'Our businesses', href: '/#businesses' },
      { label: 'Contact', href: '/contact' },
    ],
    cta: { label: 'Start a conversation', href: '/contact' },
    heroGold: null,
    heroTones: { 'We Haul It.': 'logistics', 'We Build It.': 'homeupgrades', 'We Show It.': 'multimedia' },
    summary: 'The Genix Group runs three specialist businesses across the US: freight and logistics, home upgrades, and multimedia.',
    knowsAbout: [],
    offers: [],
    pages: ['/', '/privacy', '/about', '/contact'],
  },
  logistics: {
    key: 'logistics',
    name: 'Genix Logistics',
    shortName: 'Logistics',
    subdomain: 'logistics',
    inquiryPrefix: 'LOG',
    tagline: 'Reliable Freight. Real People. On Time, Every Time.',
    seoTitle: 'Freight, Courier & Moving Services in San Diego',
    schemaType: 'MovingCompany',
    logo: { src: '/brand/genix-logistics-logo.svg', width: 876, height: 405 },
    icons: '/icons/logistics',
    nav: [
      { label: 'Services', href: '/services' },
      { label: 'How it works', href: '/#how' },
      { label: 'Where we go', href: '/#areas' },
      { label: 'Contact', href: '/contact' },
    ],
    cta: { label: 'Get a quote', href: '/#quote-form' },
    heroGold: 'On Time, Every Time.',
    summary: 'Business freight, courier runs and home or office moves anywhere in the USA, with clear timelines and a real person to call when plans change.',
    knowsAbout: ['Business freight', 'Pallet and part-load shipping', 'Full truckload shipping', 'Last-mile delivery', 'Courier delivery', 'Home moves', 'Office moves', 'Long-distance moves'],
    offers: ['Business freight', 'Last-mile and courier delivery', 'Home and office moves'],
    pages: ['/', '/contact', '/services', '/services/freight', '/services/moves'],
  },
  homeupgrades: {
    key: 'homeupgrades',
    name: 'Genix Home Upgrades',
    shortName: 'Home Upgrades',
    subdomain: 'homeupgrades',
    inquiryPrefix: 'HUP',
    tagline: 'From Blueprint to Beautiful.',
    seoTitle: 'Accent Walls, TV Units, Outdoor Builds & Handyman in California',
    schemaType: 'HomeAndConstructionBusiness',
    logo: { src: '/brand/genix-home-upgrades-logo.svg', width: 976, height: 722 },
    icons: '/icons/homeupgrades',
    nav: [
      { label: 'Services', href: '/services' },
      { label: 'Our work', href: '/work' },
      { label: 'How we work', href: '/#process' },
      { label: 'Contact', href: '/contact' },
    ],
    cta: { label: 'Get a quote', href: '/#quote' },
    heroGold: 'to Beautiful.',
    summary: 'Accent walls, TV units, outdoor builds and handyman jobs for homes, businesses and churches, from the first site visit to the final finish.',
    knowsAbout: ['Accent walls', 'Custom TV units', 'Marble wall panels', 'Decks', 'Patios', 'Pergolas', 'Handyman services', 'TV wall mounting', 'Reception accent walls', 'Church dome accent walls'],
    offers: ['Accent walls and TV units', 'Outdoor builds', 'Handyman services'],
    pages: ['/', '/contact', '/services', '/services/accent-walls', '/services/outdoor', '/services/handyman', '/services/reception', '/work'],
  },
  multimedia: {
    key: 'multimedia',
    name: 'Genix Multimedia',
    shortName: 'Multimedia',
    subdomain: 'multimedia',
    inquiryPrefix: 'MED',
    tagline: 'Your Story, Captured and Amplified.',
    seoTitle: 'Photography, Video Production & Branding',
    schemaType: 'ProfessionalService',
    logo: null, // no logo supplied yet: text wordmark
    icons: '/icons/hub',
    nav: [], // no pages beyond the home page yet: links would 404
    cta: { label: 'Get a quote', href: 'mailto:hello@thegenixgroup.com?subject=Genix%20Multimedia%20enquiry' }, // no contact page yet
    heroGold: null,
    summary: 'Photography, video, branding and design for businesses and the people behind them.',
    knowsAbout: ['Photography', 'Video production', 'Branding', 'Design'],
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
