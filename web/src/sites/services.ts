import { SITES, siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'

export type ServiceSite = 'logistics' | 'homeupgrades'
export type ServiceItem = { id: string; title: string; body: string; list: readonly string[]; image: { src: string; alt: string } | null; send: string; quoteHref: string }

/* Copy is verbatim from the home pages (logistics sections/Lanes.tsx, homeupgrades sections/Services.tsx and
   sections/Quote.tsx). Add nothing here that the sites don't already say. */
const LOG_SEND = "Send us the pickup and drop-off ZIP codes, the date (or say you're flexible) and what's moving."
const HU_SEND = 'A few photos and a sentence about what you want is enough to start.'

export const SERVICES: Record<ServiceSite, readonly ServiceItem[]> = {
  logistics: [
    { id: 'freight', title: 'Freight & deliveries', body: 'Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs across California.', list: ['Pallets & part loads', 'Full truckloads', 'Last-mile & courier'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=business' },
    { id: 'moves', title: 'Home & office moves', body: 'Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted.', list: ['Studio to 3+ bedrooms', 'Office moves', 'Local & long-distance moves'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=move' },
  ],
  homeupgrades: [
    { id: 'accent-walls', title: 'Accent walls & TV units', body: 'Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting.', list: ['Marble panels', 'Accent walls', 'Customized TV unit'], image: { src: '/brand/hu-project-marble-wall.jpg', alt: 'Backlit marble TV wall with slatted wood surround' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=home' },
    { id: 'outdoor', title: 'Outdoor builds', body: 'Decks, patios and outdoor structures that turn a yard into usable space.', list: ['Decks', 'Patios', 'Pergolas'], image: { src: 'https://images.unsplash.com/photo-1656646549633-80ad4bd2ab40?w=900&q=70&auto=format&fit=crop', alt: 'A wooden deck with outdoor seating beside a house' }, send: HU_SEND, quoteHref: '/contact?project=outdoor' },
    { id: 'handyman', title: 'Handyman services', body: 'The small jobs that make a home work: fixes, fittings and finishing touches.', list: ['TV wall mounting', 'Repairs', 'Fittings'], image: { src: '/brand/hu-handyman.jpg', alt: 'Hands driving a screw into a door lock plate with a cordless screwdriver' }, send: HU_SEND, quoteHref: '/contact?project=other' },
    { id: 'reception', title: 'Accent walls for reception areas', body: 'The first thing visitors see, built to set the tone: a statement wall behind your front desk in stone, slatted wood and integrated lighting.', list: ['Reception walls', 'Stone & wood finishes', 'Feature lighting'], image: { src: 'https://images.unsplash.com/photo-1758448093806-88b2089068ab?w=900&q=70&auto=format&fit=crop', alt: 'A modern reception area with a stone and slatted-wood accent wall behind the front desk' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=business' },
  ],
}

export const SERVICES_INTRO: Record<ServiceSite, { h1: string; lede: string; description: string }> = {
  logistics: {
    h1: 'Two ways we help.',
    lede: 'For businesses that ship every week, and for people moving once. Either way it starts with the same short form.',
    description: 'Genix Logistics services: freight and deliveries for businesses, and home and office moves. Get a quote with one short form.',
  },
  homeupgrades: {
    h1: 'Good things start with the right helping hand.',
    lede: 'One task or a whole to-do list. We make the next step simple.',
    description: 'Genix Home Upgrades services: accent walls and TV units, outdoor builds, handyman work and reception accent walls.',
  },
}

/* Existing promises only (logistics sections/Why.tsx + the sent copy; homeupgrades sections/Quote.tsx + the sent copy). */
export const QUOTING: Record<ServiceSite, readonly string[]> = {
  logistics: ['You see the price before we schedule anything.', "We'll get back to you within two business days with a price."],
  homeupgrades: ["We'll arrange a visit and send a written quote.", "We'll get back to you within two business days to arrange a visit."],
}

export function servicesJsonLd(site: ServiceSite, data: SiteData, root?: string): Record<string, unknown> {
  const origin = siteOrigin(site, root)
  const provider = { '@type': SITES[site].schemaType, name: SITES[site].name, url: `${origin}/` }
  const areaServed = data.areaServed ? { areaServed: { '@type': data.areaServed.type, name: data.areaServed.name } } : {}
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SITES[site].name} services`,
    itemListElement: SERVICES[site].map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Service', name: s.title, description: s.body, url: `${origin}/services#${s.id}`, provider, ...areaServed },
    })),
  }
}
