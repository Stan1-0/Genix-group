import type { CollectionConfig } from 'payload'

/** One row per division; nextReference() increments `value` atomically with raw SQL. */
export const InquiryCounters: CollectionConfig = {
  slug: 'inquiry-counters',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'division', type: 'text', required: true, unique: true },
    { name: 'value', type: 'number', required: true, defaultValue: 0 },
  ],
}
