import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteKey } from '@/sites/config'

// Idempotent: creates missing site records, never overwrites edited ones.
const SEED: Record<SiteKey, { heroHeading: string; heroSubheading: string; seoDescription?: string; areaServed?: string; areaServedType?: 'Country' }> = {
  hub: {
    heroHeading: 'We Haul It. We Build It. We Show It.',
    heroSubheading: 'Logistics, home upgrades and multimedia: three specialist businesses, one group.',
  },
  logistics: {
    heroHeading: 'Reliable Freight. Real People. On Time, Every Time.',
    heroSubheading: 'Business deliveries and home moves, priced before we lift anything, with a real person to call when plans change.',
    seoDescription: 'Business freight, last-mile courier runs and home or office moves anywhere in the USA, from our base in San Diego. Get a price in two short steps. Part of The Genix Group.',
    areaServed: 'United States',
    areaServedType: 'Country',
  },
  homeupgrades: {
    heroHeading: 'From Blueprint to Beautiful.',
    heroSubheading: 'Renovations, feature walls and custom TV units, planned with you and built by our own crew.',
  },
  multimedia: {
    heroHeading: 'Your Story, Captured and Amplified.',
    heroSubheading: 'Photography, video, branding and design for businesses and the people behind them.',
  },
}

const payload = await getPayload({ config })
const context = { disableRevalidate: true }

for (const [key, data] of Object.entries(SEED) as [SiteKey, (typeof SEED)[SiteKey]][]) {
  const existing = await payload.find({ collection: 'sites', where: { key: { equals: key } }, limit: 1 })
  if (existing.totalDocs) {
    console.log(`sites/${key}: exists, left as is`)
    continue
  }
  await payload.create({ collection: 'sites', data: { key, email: 'hello@thegenixgroup.com', ...data }, context })
  console.log(`sites/${key}: created`)
}

// Local development only: an admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, if set and no users exist.
const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password } = process.env
if (email && password && process.env.NODE_ENV !== 'production') {
  const { totalDocs } = await payload.count({ collection: 'users' })
  if (!totalDocs) {
    await payload.create({ collection: 'users', data: { email, password } })
    console.log(`users/${email}: created (admin)`)
  }
}
process.exit(0)
