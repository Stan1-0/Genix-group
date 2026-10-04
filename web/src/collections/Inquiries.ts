import type { CollectionConfig } from 'payload'
import { SITE_KEYS, type SiteKey } from '@/sites/config'
import { canReadInquiry, isAdmin } from '@/payload/access'
import type { PhotoClient } from '@/inquiries/photos'

let photoClientFactory: ((env: Record<string, string | undefined>) => PhotoClient | null) | null = null
/** Tests swap the Cloudinary client; null restores the real one. */
export function setPhotoClientFactory(f: typeof photoClientFactory) { photoClientFactory = f }
// photos.ts is `server-only`; it's loaded lazily so the Payload CLI (`payload migrate`, no react-server condition) can still load this config.
const photos = () => import('@/inquiries/photos')
async function makePhotoClient(env: Record<string, string | undefined>) {
  if (photoClientFactory) return photoClientFactory(env)
  const { cloudinaryClient, photoSettings } = await photos()
  const s = photoSettings(env)
  return s ? cloudinaryClient(s) : null
}

// System or visitor-supplied fields: nobody edits them through the API (the pipeline writes via the Local API, which skips access).
const locked = { update: () => false }

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'division', 'name', 'summary', 'status', 'emailSent', 'createdAt'],
    listSearchableFields: ['reference', 'name', 'email', 'phone'],
    group: 'Leads',
    components: { beforeListTable: ['@/inquiries/admin/InboxSummary#InboxSummary'] },
  },
  defaultSort: '-createdAt',
  access: { create: () => false, read: canReadInquiry, update: canReadInquiry, delete: isAdmin },
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        if (doc.division !== 'homeupgrades') return
        const { photoIdsOf } = await photos()
        const ids = photoIdsOf(doc.details)
        if (!ids.length) return
        const client = await makePhotoClient(process.env)
        if (!client) return
        try {
          // Never delete a photo another Home Upgrades enquiry still references; if this lookup fails, delete nothing.
          const { docs } = await req.payload.find({
            collection: 'inquiries', depth: 0, pagination: false, select: { details: true }, req,
            where: { and: [{ division: { equals: 'homeupgrades' } }, { id: { not_equals: doc.id } }] },
          })
          const shared = new Set(docs.flatMap((d) => photoIdsOf(d.details)))
          const mine = ids.filter((id) => !shared.has(id))
          if (mine.length) await client.destroy(mine)
        } catch (err) { console.error('Inquiries afterDelete: photo delete failed (cleanup cron will retry)', err) }
      },
    ],
  },
  endpoints: [
    {
      path: '/:id/resend',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const id = req.routeParams?.id as string
        const { resendInquiry, createMailer } = await import('@/inquiries/deliver')
        // Access-checked read first (not found / forbidden -> 404); it also gives the division for the customer email's phone number.
        let division: SiteKey
        try {
          const found = await req.payload.findByID({ collection: 'inquiries', id, depth: 0, overrideAccess: false, user: req.user })
          division = found.division as SiteKey
        } catch {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
        try {
          const { getSiteData } = await import('@/sites/data')
          const phone = (await getSiteData(division)).phone
          await resendInquiry(req.payload, id, req.user, createMailer(process.env), phone)
          const doc = await req.payload.findByID({ collection: 'inquiries', id, depth: 0 })
          return Response.json({ emailSent: doc.emailSent, customerEmailSent: doc.customerEmailSent, lastEmailError: doc.lastEmailError ?? null })
        } catch (err) {
          console.error('inquiry resend failed', err)
          return Response.json({ error: 'Could not resend' }, { status: 500 })
        }
      },
    },
  ],
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true, access: locked, admin: { readOnly: true } },
    { name: 'division', type: 'select', required: true, options: SITE_KEYS.map((k) => ({ label: k, value: k })), access: locked, admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, defaultValue: 'quote', options: ['quote', 'contact', 'booking'], access: locked, admin: { readOnly: true } },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'new',
      options: [{ label: 'New', value: 'new' }, { label: 'Contacted', value: 'contacted' }, { label: 'Closed', value: 'closed' }],
      admin: { position: 'sidebar' },
    },
    { name: 'summary', type: 'text', access: locked, admin: { readOnly: true } },
    { name: 'name', type: 'text', required: true, access: locked, admin: { readOnly: true } },
    { name: 'phone', type: 'text', access: locked, admin: { readOnly: true } },
    { name: 'email', type: 'text', access: locked, admin: { readOnly: true } },
    { name: 'notes', type: 'textarea', access: locked, admin: { readOnly: true } },
    { name: 'details', type: 'json', access: locked, admin: { readOnly: true } },
    { name: 'photoStrip', type: 'ui', admin: { components: { Field: '@/inquiries/admin/PhotoStrip#PhotoStrip' } } },
    { name: 'emailSent', type: 'checkbox', defaultValue: false, label: 'Team email sent', access: locked, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'customerEmailSent', type: 'checkbox', defaultValue: false, label: 'Customer email sent', access: locked, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'emailAttempts', type: 'number', defaultValue: 0, access: locked, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'lastEmailError', type: 'text', access: locked, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'resend', type: 'ui', admin: { position: 'sidebar', components: { Field: '@/inquiries/admin/ResendButton#ResendButton' } } },
    { name: 'ipHash', type: 'text', access: { read: () => false, update: () => false }, admin: { hidden: true } },
  ],
}
