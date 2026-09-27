import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isLoggedIn } from '@/payload/access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isAdmin },
  upload: true,
  fields: [{ name: 'alt', type: 'text', required: true, admin: { description: 'Describe the image for people who cannot see it.' } }],
}
