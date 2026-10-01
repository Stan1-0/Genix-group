import type { CollectionConfig } from 'payload'

/** One row per accepted submission, for the 5-per-10-minutes limit. Pruned daily by the cron. */
export const RateHits: CollectionConfig = {
  slug: 'rate-hits',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [{ name: 'ipHash', type: 'text', required: true, index: true }],
}
