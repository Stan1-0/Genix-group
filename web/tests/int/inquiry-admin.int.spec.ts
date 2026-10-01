import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { resendInquiry, type Mail } from '@/inquiries/deliver'

const sent: Mail[] = []
vi.mock('@/sites/data', () => ({ getSiteData: vi.fn(async () => ({ phone: null })) }))
// The endpoint builds its mailer with createMailer(process.env); swap just that for a recording stub.
vi.mock('@/inquiries/deliver', async (orig) => ({
  ...(await orig<typeof import('@/inquiries/deliver')>()),
  createMailer: () => async (m: Mail) => {
    sent.push(m)
  },
}))

let payload: Payload
let handler: (req: never) => Promise<Response>
const mk = (ref: string) =>
  payload.create({ collection: 'inquiries', data: { reference: ref, division: 'logistics', type: 'quote', status: 'new', name: 'Ana', phone: '(619) 555-0100', details: {}, summary: 's' } })
const call = (user: unknown, id: unknown) => handler({ user, payload, routeParams: { id } } as never)

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const { Inquiries } = await import('@/collections/Inquiries')
  handler = (Inquiries.endpoints as { handler: unknown }[])[0].handler as never
})
beforeEach(async () => {
  sent.length = 0
  for (const c of ['inquiries', 'users'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

async function users() {
  const admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: 'test-pass-1' } })
  const editor = await payload.create({ collection: 'users', data: { email: 'ed@test.local', password: 'test-pass-2', role: 'editor', divisions: ['homeupgrades'] } })
  return { admin, editor }
}

describe('resendInquiry (admin button)', () => {
  it('lets an editor resend only inquiries of their divisions', async () => {
    const { editor } = await users()
    const doc = await mk('GX-LOG-000009')
    const mailer = async (m: Mail) => { sent.push(m) }
    await expect(resendInquiry(payload, doc.id, editor, mailer)).rejects.toThrow(/not found/i)
    expect(sent).toHaveLength(0)
    const untouched = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect(untouched.emailSent).toBe(false)
    expect(untouched.emailAttempts).toBe(0)

    await payload.update({ collection: 'users', id: editor.id, data: { divisions: ['logistics'] } })
    const ed2 = await payload.findByID({ collection: 'users', id: editor.id })
    await resendInquiry(payload, doc.id, ed2, mailer)
    expect(sent.map((m) => m.idempotencyKey)).toContain('GX-LOG-000009:team')
    expect((await payload.findByID({ collection: 'inquiries', id: doc.id })).emailSent).toBe(true)
  })
})

describe('POST /inquiries/:id/resend endpoint', () => {
  it('401 without a user', async () => {
    const doc = await mk('GX-LOG-000010')
    expect((await call(null, doc.id)).status).toBe(401)
    expect(sent).toHaveLength(0)
  })
  it('404 for an editor of another division, and nothing is sent', async () => {
    const { editor } = await users()
    const doc = await mk('GX-LOG-000011')
    expect((await call(editor, doc.id)).status).toBe(404)
    expect((await call(editor, 999999)).status).toBe(404)
    expect(sent).toHaveLength(0)
    expect((await payload.findByID({ collection: 'inquiries', id: doc.id })).emailAttempts).toBe(0)
  })
  it('200 and emailSent for an admin', async () => {
    const { admin } = await users()
    const doc = await mk('GX-LOG-000012')
    const res = await call(admin, doc.id)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ emailSent: true, lastEmailError: null })
    expect(sent.map((m) => m.idempotencyKey)).toContain('GX-LOG-000012:team')
  })
  it('500 (not 404) when something other than the access check fails', async () => {
    const { admin } = await users()
    const doc = await mk('GX-LOG-000013')
    const { getSiteData } = await import('@/sites/data')
    vi.mocked(getSiteData).mockRejectedValueOnce(new Error('db down'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await call(admin, doc.id)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Could not resend' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
