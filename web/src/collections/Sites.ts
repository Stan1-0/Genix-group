import type { CollectionConfig } from 'payload'
import { revalidateTag } from 'next/cache'
import { SITE_KEYS } from '@/sites/config'
import { canEditSite, canReadSite, isAdmin, isAdminField } from '@/payload/access'

export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'heroHeading', 'updatedAt'] },
  access: { read: canReadSite, create: isAdmin, delete: isAdmin, update: canEditSite },
  hooks: {
    afterChange: [
      ({ doc, context }) => {
        // Seed scripts and tests run outside Next.js and pass disableRevalidate.
        if (!context?.disableRevalidate) revalidateTag(`site:${doc.key}`, 'max')
        return doc
      },
    ],
    afterDelete: [
      ({ doc, context }) => {
        // Seed scripts and tests run outside Next.js and pass disableRevalidate.
        if (!context?.disableRevalidate) revalidateTag(`site:${doc.key}`, 'max')
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'key',
      type: 'select',
      required: true,
      unique: true,
      options: SITE_KEYS.map((k) => ({ label: k, value: k })),
      // Editors can update the record they're assigned to, but never repoint
      // which division key it represents.
      access: { update: isAdminField },
    },
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
      type: 'collapsible',
      label: 'Coverage',
      fields: [
        {
          name: 'areaServed',
          type: 'text',
          admin: { description: 'The whole area you serve, e.g. "United States". Search engines read this.' },
        },
        {
          name: 'areaServedType',
          type: 'select',
          defaultValue: 'Country',
          options: [
            { label: 'Country', value: 'Country' },
            { label: 'State', value: 'State' },
            { label: 'City', value: 'City' },
            { label: 'Other area (e.g. a county)', value: 'AdministrativeArea' },
          ],
          admin: { condition: (data) => Boolean(data?.areaServed) },
        },
        {
          name: 'regions',
          type: 'array',
          // Keeps the table the old `coverage` list used, so the migration only drops its ZIP columns.
          dbName: 'sites_coverage',
          labels: { singular: 'Region', plural: 'Regions' },
          admin: { description: 'Optional places to list on the site, e.g. "California".' },
          fields: [{ name: 'name', type: 'text', required: true }],
        },
      ],
    },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
  ],
}
