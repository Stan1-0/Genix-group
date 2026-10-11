import { SITES, siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'

export type ServiceSite = 'logistics' | 'homeupgrades'
export type ServiceDetail = {
  eyebrow: string
  lead: string
  intro: string
  fit: { label: string; h2: string; body: string; cards: readonly { title: string; line: string }[] }
  faqs: readonly { q: string; a: string }[]
  description: string
}
export type ServiceItem = { id: string; title: string; body: string; list: readonly string[]; image: { src: string; alt: string } | null; send: string; quoteHref: string; detail?: ServiceDetail }

/* Copy is taken from the home pages (logistics sections/Lanes.tsx, homeupgrades sections/Services.tsx and
   sections/Quote.tsx), except the "What to send us" lines (which restate the form fields) and the meta
   descriptions. Add nothing here that the sites don't already say. */
const LOG_SEND = "Send us the pickup and drop-off ZIP codes, the date (or say you're flexible) and what's moving."
const HU_SEND = 'A few photos and a sentence about what you want is enough to start.'

export const SERVICES: Record<ServiceSite, readonly ServiceItem[]> = {
  logistics: [
    { id: 'freight', title: 'Freight & deliveries', body: 'Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs across California.', list: ['Pallets & part loads', 'Full truckloads', 'Last-mile & courier'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=business' },
    { id: 'moves', title: 'Home & office moves', body: 'Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted.', list: ['Studio to 3+ bedrooms', 'Office moves', 'Local & long-distance moves'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=move' },
  ],
  homeupgrades: [
    { id: 'accent-walls', title: 'Accent walls & TV units', body: 'Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting.', list: ['Marble panels', 'Accent walls', 'Customized TV unit'], image: { src: '/brand/hu-project-marble-wall.jpg', alt: 'Backlit marble TV wall with slatted wood surround' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=home',
      detail: {
      eyebrow: 'For your home · California',
      lead: 'A wall built around how you use the room.',
      intro: 'Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting. We walk the space with you and agree the plan before any work starts.',
      fit: {
        label: 'Made for your room',
        h2: 'Designed around the way you live.',
        body: 'Tell us how you use the room — where you sit, what you watch, what you\'d like on show — and we plan the wall around it.',
        cards: [
          { title: 'A clear plan first', line: 'The design is agreed before work begins.' },
          { title: 'Wiring kept out of sight', line: 'Cables and lighting planned into the wall.' },
          { title: 'Care in every detail', line: 'Panels and finishes fitted thoughtfully.' },
        ],
      },
      faqs: [
        { q: 'Can I send photos or ideas I\'ve found?', a: 'Yes. Add up to five photos of your space and links to anything you like (Pinterest, Instagram or a website) in your request.' },
        { q: 'How does the quote work?', a: 'We visit, measure up and send a clear, itemised written quote and timeline before any work starts.' },
        { q: 'Do you build feature walls for businesses too?', a: 'Yes — see accent walls for reception areas.' },
        { q: 'Where do you work?', a: 'We serve homes and businesses in California.' },
      ],
      description: 'Accent walls and TV units by Genix Home Upgrades: stone panels, slatted wood, hidden wiring and integrated lighting, planned with you in California.',
    },
    },
    { id: 'outdoor', title: 'Outdoor builds', body: 'Decks, patios and outdoor structures that turn a yard into usable space.', list: ['Decks', 'Patios', 'Pergolas'], image: { src: 'https://images.unsplash.com/photo-1656646549633-80ad4bd2ab40?w=900&q=70&auto=format&fit=crop', alt: 'A wooden deck with outdoor seating beside a house' }, send: HU_SEND, quoteHref: '/contact?project=outdoor',
      detail: {
      eyebrow: 'For your home · California',
      lead: 'Turn the yard into space you use.',
      intro: 'Decks, patios and outdoor structures that turn a yard into usable space. We visit, talk through what you want the space to do, and send a written quote before anything is built.',
      fit: {
        label: 'Made for outdoor living',
        h2: 'Planned around how you\'ll use it.',
        body: 'Whether it\'s somewhere to sit, eat or simply get outside more, we start with how you want to use the space.',
        cards: [
          { title: 'A clear plan first', line: 'Agreed before any work starts.' },
          { title: 'No guesswork', line: 'Clear, honest communication throughout.' },
          { title: 'Finished properly', line: 'A final walkthrough together at the end.' },
        ],
      },
      faqs: [
        { q: 'What can you build?', a: 'Decks, patios and outdoor structures such as pergolas.' },
        { q: 'I\'m just planning — can I still ask?', a: 'Yes. Choose "Just planning" in the form and we\'ll talk it through.' },
        { q: 'How does the quote work?', a: 'We visit, measure up and send a clear, itemised written quote and timeline before any work starts.' },
      ],
      description: 'Outdoor builds by Genix Home Upgrades: decks, patios and pergolas that turn a California yard into usable space.',
    },
    },
    { id: 'handyman', title: 'Handyman services', body: 'The small jobs that make a home work: fixes, fittings and finishing touches.', list: ['TV wall mounting', 'Repairs', 'Fittings'], image: { src: '/brand/hu-handyman.jpg', alt: 'Hands driving a screw into a door lock plate with a cordless screwdriver' }, send: HU_SEND, quoteHref: '/contact?project=other',
      detail: {
      eyebrow: 'For your home · California',
      lead: 'One task or a whole to-do list.',
      intro: 'The small jobs that make a home work: fixes, fittings and finishing touches. Send us the list and we\'ll plan it together.',
      fit: {
        label: 'Small jobs, done well',
        h2: 'The little things that make a home.',
        body: 'The shelf that needs hanging, the TV that needs mounting, the fitting that never got finished — put them in one request.',
        cards: [
          { title: 'Your list, your priorities', line: 'Tell us what matters most.' },
          { title: 'One request', line: 'Several small jobs in one message.' },
          { title: 'Care in every detail', line: 'Thoughtful craftsmanship.' },
        ],
      },
      faqs: [
        { q: 'Can I include several jobs in one request?', a: 'Yes. List them in the description and add photos if they help.' },
        { q: 'Do you mount TVs?', a: 'Yes, TV wall mounting is one of the jobs we do.' },
        { q: 'How does the quote work?', a: 'We visit, look at the jobs with you and send a clear, itemised written quote before any work starts.' },
      ],
      description: 'Handyman services by Genix Home Upgrades in California: TV wall mounting, repairs, fittings and the small jobs that make a home work.',
    },
    },
    { id: 'reception', title: 'Accent walls for reception areas', body: 'The first thing visitors see, built to set the tone: a statement wall behind your front desk in stone, slatted wood and integrated lighting.', list: ['Reception walls', 'Stone & wood finishes', 'Feature lighting'], image: { src: 'https://images.unsplash.com/photo-1758448093806-88b2089068ab?w=900&q=70&auto=format&fit=crop', alt: 'A modern reception area with a stone and slatted-wood accent wall behind the front desk' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=business',
      detail: {
      eyebrow: 'For your business · California',
      lead: 'The first thing visitors see.',
      intro: 'The first thing visitors see, built to set the tone: a statement wall behind your front desk in stone, slatted wood and integrated lighting.',
      fit: {
        label: 'Made for your front desk',
        h2: 'Set the tone from the door.',
        body: 'We plan the wall around your space and how people arrive, and agree the design with you before work begins.',
        cards: [
          { title: 'A clear plan first', line: 'The design is agreed before work begins.' },
          { title: 'Stone, wood and light', line: 'Reception walls, stone & wood finishes, feature lighting.' },
          { title: 'For every kind of space', line: 'Residential & commercial.' },
        ],
      },
      faqs: [
        { q: 'Can you match our brand?', a: 'Tell us about your brand and add photos or links in your request; we\'ll talk it through at the site visit.' },
        { q: 'How does the quote work?', a: 'We visit, measure up and send a clear, itemised written quote and timeline before any work starts.' },
        { q: 'Where do you work?', a: 'We serve businesses and homes in California.' },
      ],
      description: 'Reception accent walls by Genix Home Upgrades: stone, slatted wood and integrated lighting behind your front desk, in California.',
    },
    },
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

/* The home's "How a project runs" copy (homeupgrades sections/Process.tsx), reused on the service pages. */
export const PROCESS = {
  label: 'From “someday” to “let\'s do it”',
  h2Lead: 'Four steps, ',
  h2Gold: 'no surprises.',
  steps: [
    { title: 'Site visit', body: 'We walk the space with you, measure up and talk through what you want it to do.' },
    { title: 'Written quote', body: 'A clear, itemised quote and timeline before any work starts.' },
    { title: 'The build', body: 'The Genix crew does the work and keeps you updated as it goes.' },
    { title: 'Final walkthrough', body: "We go over the finished space together and put right anything that isn't." },
  ],
} as const

/* The home Quote section's heading and lede (homeupgrades sections/Quote.tsx). */
export const CLOSING = { h2: 'Tell us about the space.', lede: 'A few photos and a sentence about what you want is enough to start.' } as const

export const HU_SERVICE_SLUGS: readonly string[] = SERVICES.homeupgrades.map((s) => s.id)
export const huServiceBySlug = (slug: string): ServiceItem | undefined => SERVICES.homeupgrades.find((s) => s.id === slug)

export function serviceDetailJsonLd(item: ServiceItem, data: SiteData, root?: string): Record<string, unknown> {
  const origin = siteOrigin('homeupgrades', root)
  const url = `${origin}/services/${item.id}`
  const provider = { '@type': SITES.homeupgrades.schemaType, name: SITES.homeupgrades.name, url: `${origin}/` }
  const areaServed = data.areaServed ? { areaServed: { '@type': data.areaServed.type, name: data.areaServed.name } } : {}
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', name: item.title, description: item.detail?.description ?? item.body, url, provider, ...areaServed },
      { '@type': 'FAQPage', mainEntity: (item.detail?.faqs ?? []).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `${origin}/services` },
          { '@type': 'ListItem', position: 3, name: item.title, item: url },
        ],
      },
    ],
  }
}
