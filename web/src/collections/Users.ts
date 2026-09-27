import type { CollectionConfig } from 'payload'
import { SITE_KEYS } from '@/sites/config'
import { isAdmin, isAdminField, isAdminOrSelf } from '@/payload/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  access: { read: isAdminOrSelf, create: isAdmin, update: isAdminOrSelf, delete: isAdmin },
  hooks: {
    beforeChange: [
      async ({ req, operation, data }) => {
        // The very first account (created on /admin's "create first user" screen) must be an admin.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) return { ...data, role: 'admin' }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      // Not `required: true`: Payload's typegen would then mark `role` non-optional in the
      // generated create-input type even though it is always populated (by `defaultValue`,
      // or by the beforeChange hook above for the first user), breaking `tsc` at every
      // `payload.create({ collection: 'users', ... })` call site that omits it.
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: { update: isAdminField },
    },
    {
      name: 'divisions',
      type: 'select',
      hasMany: true,
      options: SITE_KEYS.map((k) => ({ label: k, value: k })),
      admin: { description: 'Editors can only edit these sites. Admins can edit all.' },
      access: { update: isAdminField },
    },
  ],
}
