import type { CollectionConfig } from 'payload'
import { revalidateTag } from 'next/cache'
import { SITE_KEYS } from '@/sites/config'
import { anyone, canEditSite, isAdmin } from '@/payload/access'

export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'heroHeading', 'updatedAt'] },
  access: { read: anyone, create: isAdmin, delete: isAdmin, update: canEditSite },
  hooks: {
    afterChange: [
      ({ doc, context }) => {
        // Seed scripts and tests run outside Next.js and pass disableRevalidate.
        if (!context?.disableRevalidate) revalidateTag(`site:${doc.key}`, 'max')
        return doc
      },
    ],
  },
  fields: [
    { name: 'key', type: 'select', required: true, unique: true, options: SITE_KEYS.map((k) => ({ label: k, value: k })) },
    { name: 'heroHeading', type: 'text' },
    { name: 'heroSubheading', type: 'textarea' },
    { name: 'phone', type: 'text', admin: { description: 'US format, e.g. (619) 555-0100' } },
    { name: 'email', type: 'email' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'zip', type: 'text' },
      ],
    },
    {
      name: 'social',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'coverage',
      type: 'array',
      admin: { description: 'Areas served. ZIP ranges are the first three digits, e.g. California 900–961.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'zipFrom', type: 'number', min: 0, max: 999 },
        { name: 'zipTo', type: 'number', min: 0, max: 999 },
      ],
    },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
  ],
}
