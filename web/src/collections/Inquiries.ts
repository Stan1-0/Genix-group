import type { CollectionConfig } from 'payload'
import { SITE_KEYS, type SiteKey } from '@/sites/config'
import { canReadInquiry, isAdmin } from '@/payload/access'

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
    { name: 'reference', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'division', type: 'select', required: true, options: SITE_KEYS.map((k) => ({ label: k, value: k })), admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, defaultValue: 'quote', options: ['quote', 'contact', 'booking'], admin: { readOnly: true } },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'new',
      options: [{ label: 'New', value: 'new' }, { label: 'Contacted', value: 'contacted' }, { label: 'Closed', value: 'closed' }],
      admin: { position: 'sidebar' },
    },
    { name: 'summary', type: 'text', admin: { readOnly: true } },
    { name: 'name', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'phone', type: 'text', admin: { readOnly: true } },
    { name: 'email', type: 'text', admin: { readOnly: true } },
    { name: 'notes', type: 'textarea', admin: { readOnly: true } },
    { name: 'details', type: 'json', admin: { readOnly: true } },
    { name: 'emailSent', type: 'checkbox', defaultValue: false, label: 'Team email sent', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'customerEmailSent', type: 'checkbox', defaultValue: false, label: 'Customer email sent', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'emailAttempts', type: 'number', defaultValue: 0, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'lastEmailError', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'resend', type: 'ui', admin: { position: 'sidebar', components: { Field: '@/inquiries/admin/ResendButton#ResendButton' } } },
    { name: 'ipHash', type: 'text', admin: { hidden: true } },
  ],
}
