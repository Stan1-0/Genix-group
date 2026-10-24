import type { CollectionConfig } from 'payload'
import { revalidateTag } from 'next/cache'
import { isLoggedIn } from '@/payload/access'
import { INSPIRATION_SERVICES } from '@/inspiration/map'
import { SERVICES } from '@/sites/services'
import { rasterOnly } from './Projects'

const refresh = ({ context }: { context?: Record<string, unknown> }) => {
  // Seed scripts and tests run outside Next.js and pass disableRevalidate.
  if (!context?.disableRevalidate) revalidateTag('inspiration', 'max')
}

/** Inspiration photos for a Home Upgrades service page: one style each ("Fluted wood", "Marble"...). When a service
    has none published, its page shows the built-in starter photos (src/inspiration/fallback.ts), or no section. */
export const Inspiration: CollectionConfig = {
  slug: 'inspiration',
  labels: { singular: 'Inspiration photo', plural: 'Inspiration' },
  admin: { useAsTitle: 'style', group: 'Content', defaultColumns: ['style', 'service', 'published', 'order'] },
  access: {
    read: ({ req }) => (req.user ? true : { published: { equals: true } }),
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  defaultSort: 'order',
  hooks: {
    afterChange: [({ doc, context }) => { refresh({ context }); return doc }],
    afterDelete: [({ doc, context }) => { refresh({ context }); return doc }],
  },
  fields: [
    {
      name: 'service',
      type: 'select',
      required: true,
      // Every service stays a DB option (no enum migration); only the pages with a section are offered.
      options: SERVICES.homeupgrades.map((s) => ({ label: s.title, value: s.id })),
      filterOptions: ({ options }) => options.filter((o) => INSPIRATION_SERVICES.includes(typeof o === 'string' ? o : o.value)),
      admin: { description: 'The service page this photo appears on.' },
    },
    { name: 'style', type: 'text', required: true, maxLength: 40, admin: { description: 'The style it shows, e.g. "Fluted wood" or "Backlit marble".' } },
    { name: 'image', type: 'upload', relationTo: 'media', required: true, validate: rasterOnly(true) as never, admin: { description: 'A JPG, PNG or WebP photo. Give it alt text in the media library.' } },
    { name: 'caption', type: 'text', maxLength: 120, admin: { description: 'Optional: one line shown when the photo is opened.' } },
    { name: 'order', type: 'number', defaultValue: 100, admin: { description: 'Lower numbers come first.' } },
    { name: 'published', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
