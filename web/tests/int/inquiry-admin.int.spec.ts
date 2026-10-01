import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { resendInquiry } from '@/inquiries/deliver'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['inquiries', 'users'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('resendInquiry (admin button)', () => {
  it('lets an editor resend only inquiries of their divisions', async () => {
    await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: 'test-pass-1' } })
    const editor = await payload.create({ collection: 'users', data: { email: 'ed@test.local', password: 'test-pass-2', role: 'editor', divisions: ['homeupgrades'] } })
    const doc = await payload.create({ collection: 'inquiries', data: { reference: 'GX-LOG-000009', division: 'logistics', type: 'quote', status: 'new', name: 'Ana', phone: '(619) 555-0100', details: {}, summary: 's' } })
    const mailer = async () => {}
    await expect(resendInquiry(payload, doc.id, editor, mailer)).rejects.toThrow()
    await payload.update({ collection: 'users', id: editor.id, data: { divisions: ['logistics'] } })
    const ed2 = await payload.findByID({ collection: 'users', id: editor.id })
    await resendInquiry(payload, doc.id, ed2, mailer)
    expect((await payload.findByID({ collection: 'inquiries', id: doc.id })).emailSent).toBe(true)
  })
})
