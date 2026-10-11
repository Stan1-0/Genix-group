import type { CollectionConfig, UploadFieldSingleValidation } from 'payload'
import { revalidateTag } from 'next/cache'
import { isLoggedIn } from '@/payload/access'

const refresh = ({ context }: { context?: Record<string, unknown> }) => {
  // Seed scripts and tests run outside Next.js and pass disableRevalidate.
  if (!context?.disableRevalidate) revalidateTag('projects', 'max')
}

/** MP4 only: the media collection also accepts images, which are not valid here. */
const mp4Only: UploadFieldSingleValidation = async (value, { req }) => {
  if (!value) return true
  const id = typeof value === 'object' ? (value as { id: string | number }).id : (value as string | number)
  const m = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
  return m?.mimeType === 'video/mp4' || 'Choose an MP4 video.'
}

/** Home Upgrades projects: the /work page and the home "Recent work" (featured). */
export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: { useAsTitle: 'title', group: 'Content', defaultColumns: ['title', 'category', 'featured', 'published', 'order'] },
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
    { name: 'title', type: 'text', required: true, maxLength: 80 },
    { name: 'category', type: 'text', required: true, maxLength: 40, admin: { description: 'The small line on the card, e.g. "Accent wall".' } },
    { name: 'caption', type: 'text', maxLength: 60, admin: { description: 'Optional short line under the title on the card.' } },
    { name: 'description', type: 'textarea', required: true, maxLength: 300, admin: { description: 'One or two sentences shown when the project is opened.' } },
    { name: 'cover', type: 'upload', relationTo: 'media', required: true },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 8 },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional MP4 video. The cover photo is shown before it plays.' },
      validate: mp4Only,
    },
    { name: 'featured', type: 'checkbox', label: 'Show on the home page', defaultValue: false },
    { name: 'order', type: 'number', defaultValue: 100, admin: { description: 'Lower numbers come first.' } },
    { name: 'published', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
