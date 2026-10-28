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
/** `seoTitle` leads the page's <title> with the words people search for, plus where the division works. */
export type ServiceItem = { id: string; title: string; seoTitle: string; body: string; list: readonly string[]; image: { src: string; alt: string } | null; send: string; quoteHref: string; detail?: ServiceDetail }

/* Copy is taken from the home pages (logistics sections/Lanes.tsx, homeupgrades sections/Services.tsx and
   sections/Quote.tsx), except the "What to send us" lines (which restate the form fields) and the meta
   descriptions. Add nothing here that the sites don't already say. */
const LOG_SEND = "Send us the pickup and drop-off ZIP codes, the date (or say you're flexible) and what's moving."
const HU_SEND = 'A few photos and a sentence about what you want is enough to start.'

export const SERVICES: Record<ServiceSite, readonly ServiceItem[]> = {
  logistics: [
    { id: 'freight', title: 'Freight & deliveries', seoTitle: 'Freight, Pallet & Courier Delivery from San Diego', body: 'Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs across California.', list: ['Pallets & part loads', 'Full truckloads', 'Last-mile & courier'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=business',
      detail: {
      eyebrow: 'For businesses · Based in San Diego · Nationwide',
      lead: 'Freight without the guesswork.',
      intro: 'Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs. You see the price before we schedule anything.',
      fit: {
        label: 'Why Genix',
        h2: 'What you can count on.',
        body: 'From the first call to the signature.',
        cards: [
          { title: 'A real person to call', line: 'Call or text the team handling your load when plans change.' },
          { title: 'Clear timelines', line: 'A confirmed date and pickup window before anything moves.' },
          { title: 'Price first', line: 'You see the price before we schedule anything.' },
        ],
      },
      faqs: [
        { q: 'What can you ship?', a: 'Pallets, part loads and full truckloads, plus last-mile and courier runs.' },
        { q: 'Which areas do you cover?', a: "Anywhere in the United States. We're based in San Diego and run freight and moves coast to coast." },
        { q: 'How does the quote work?', a: "Send us the pickup and drop-off ZIP codes, the date and what's moving. We'll get back to you within two business days with a price." },
      ],
      description: 'Business freight from Genix Logistics in San Diego: pallets, part loads, full truckloads and last-mile courier runs, priced before anything moves.',
    },
    },
    { id: 'moves', title: 'Home & office moves', seoTitle: 'Home & Office Movers in San Diego', body: 'Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted.', list: ['Studio to 3+ bedrooms', 'Office moves', 'Local & long-distance moves'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=move',
      detail: {
      eyebrow: 'For moves · Based in San Diego · Nationwide',
      lead: 'Moved on the day we agree.',
      intro: 'Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted. Local and long-distance moves, studio to 3+ bedrooms.',
      fit: {
        label: 'Why Genix',
        h2: 'What you can count on.',
        body: 'From the first call to the signature.',
        cards: [
          { title: 'A real person to call', line: 'Call or text the team handling your move when plans change.' },
          { title: 'Clear timelines', line: 'A confirmed date and pickup window before anything moves.' },
          { title: 'Price first', line: 'You see the price before we schedule anything.' },
        ],
      },
      faqs: [
        { q: 'What size of move do you take on?', a: 'Studio to 3+ bedroom homes, and office moves.' },
        { q: 'Do you do long-distance moves?', a: "Yes. We're based in San Diego and run local and long-distance moves anywhere in the United States." },
        { q: 'How does the quote work?', a: "Send us the pickup and drop-off ZIP codes, the date (or say you're flexible) and what's moving. You see the price before we schedule anything." },
      ],
      description: 'Home and office moves from Genix Logistics in San Diego: studio to 3+ bedrooms, local and long-distance, priced before anything is lifted.',
    },
    },
  ],
  homeupgrades: [
    { id: 'accent-walls', title: 'Accent walls & TV units', seoTitle: 'Accent Walls & Custom TV Units in California', body: 'Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting.', list: ['Marble panels', 'Accent walls', 'Customized TV unit'], image: { src: '/brand/hu-project-marble-wall.jpg', alt: 'Backlit marble TV wall with slatted wood surround' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=home',
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
    { id: 'outdoor', title: 'Outdoor builds', seoTitle: 'Decks, Patios & Pergolas in California', body: 'Decks, patios and outdoor structures that turn a yard into usable space.', list: ['Decks', 'Patios', 'Pergolas'], image: { src: 'https://images.unsplash.com/photo-1656646549633-80ad4bd2ab40?w=900&q=70&auto=format&fit=crop', alt: 'A wooden deck with outdoor seating beside a house' }, send: HU_SEND, quoteHref: '/contact?project=outdoor',
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
    { id: 'handyman', title: 'Handyman services', seoTitle: 'Handyman & TV Wall Mounting in California', body: 'The small jobs that make a home work: fixes, fittings and finishing touches.', list: ['TV wall mounting', 'Repairs', 'Fittings'], image: { src: '/brand/hu-handyman.jpg', alt: 'Hands driving a screw into a door lock plate with a cordless screwdriver' }, send: HU_SEND, quoteHref: '/contact?project=other',
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
    { id: 'reception', title: 'Accent walls for receptions & church domes', seoTitle: 'Reception & Church Dome Accent Walls in California', body: 'The first thing visitors see, built to set the tone: a statement wall behind your front desk, or a church dome finished with decorative panels and lighting.', list: ['Reception walls', 'Church domes', 'Stone & wood finishes', 'Feature lighting'], image: { src: 'https://images.unsplash.com/photo-1758448093806-88b2089068ab?w=900&q=70&auto=format&fit=crop', alt: 'A modern reception area with a stone and slatted-wood accent wall behind the front desk' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=business',
      detail: {
      eyebrow: 'For businesses & churches · California',
      lead: 'The first thing visitors see.',
      intro: 'The first thing visitors see, built to set the tone: a statement wall behind your front desk, or a church dome finished with decorative panels and lighting.',
      fit: {
        label: 'Made for front desks and domes',
        h2: 'Set the tone from the door.',
        body: 'We plan the work around your space and how people arrive or gather, and agree the design with you before work begins.',
        cards: [
          { title: 'A clear plan first', line: 'The design is agreed before work begins.' },
          { title: 'Stone, wood and light', line: 'Reception walls, church domes, stone & wood finishes, feature lighting.' },
          { title: 'For every kind of space', line: 'Businesses & churches.' },
        ],
      },
      faqs: [
        { q: 'Can you match our brand?', a: 'Tell us about your brand and add photos or links in your request; we\'ll talk it through at the site visit.' },
        { q: 'Do you work on church domes?', a: 'Yes. Choose "Church" in the form, tell us about the dome and what you have in mind, and add photos. We look at size and access at the site visit.' },
        { q: 'How does the quote work?', a: 'We visit, measure up and send a clear, itemised written quote and timeline before any work starts.' },
        { q: 'Where do you work?', a: 'We serve businesses, churches and homes in California.' },
      ],
      description: 'Reception and church dome accent walls by Genix Home Upgrades: stone, slatted wood, decorative panels and integrated lighting, in California.',
    },
    },
  ],
}

export const SERVICES_INTRO: Record<ServiceSite, { h1: string; lede: string; description: string; seoTitle: string }> = {
  logistics: {
    seoTitle: 'Freight, Courier & Moving Services in San Diego',
    h1: 'Two ways we help.',
    lede: 'For businesses that ship every week, and for people moving once. Either way it starts with the same short form.',
    description: 'Genix Logistics services: freight and deliveries for businesses, and home and office moves. Get a quote with one short form.',
  },
  homeupgrades: {
    seoTitle: 'Accent Walls, TV Units, Outdoor Builds & Handyman Services in California',
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
      item: { '@type': 'Service', name: s.title, description: s.body, url: s.detail ? `${origin}/services/${s.id}` : `${origin}/services#${s.id}`, provider, ...areaServed },
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

export const isServiceSite = (site: string): site is ServiceSite => site === 'logistics' || site === 'homeupgrades'

/** Services with a page of their own at /services/<id>. */
export const serviceSlugs = (site: ServiceSite): readonly string[] => SERVICES[site].filter((s) => s.detail).map((s) => s.id)
export const serviceBySlug = (site: ServiceSite, slug: string): ServiceItem | undefined => SERVICES[site].find((s) => s.id === slug && s.detail)

export const HU_SERVICE_SLUGS: readonly string[] = serviceSlugs('homeupgrades')
export const huServiceBySlug = (slug: string): ServiceItem | undefined => serviceBySlug('homeupgrades', slug)

export function serviceDetailJsonLd(item: ServiceItem, data: SiteData, root?: string, site: ServiceSite = 'homeupgrades'): Record<string, unknown> {
  const origin = siteOrigin(site, root)
  const url = `${origin}/services/${item.id}`
  const parentOrganization = { '@type': 'Organization', name: SITES.hub.name, url: `${siteOrigin('hub', root)}/` }
  const provider = { '@type': SITES[site].schemaType, name: SITES[site].name, url: `${origin}/`, parentOrganization }
  const areaServed = data.areaServed ? { areaServed: { '@type': data.areaServed.type, name: data.areaServed.name } } : {}
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', name: item.title, serviceType: item.seoTitle, description: item.detail?.description ?? item.body, url, provider, ...areaServed },
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
