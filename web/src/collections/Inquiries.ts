import type { CollectionConfig } from 'payload'
import { SITE_KEYS } from '@/sites/config'
import { canReadInquiry, isAdmin } from '@/payload/access'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'division', 'name', 'summary', 'status', 'emailSent', 'createdAt'],
    listSearchableFields: ['reference', 'name', 'email', 'phone'],
    group: 'Leads',
  },
  defaultSort: '-createdAt',
  access: { create: () => false, read: canReadInquiry, update: canReadInquiry, delete: isAdmin },
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
    { name: 'ipHash', type: 'text', admin: { hidden: true } },
  ],
}
