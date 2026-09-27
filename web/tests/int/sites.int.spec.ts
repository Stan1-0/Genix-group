import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

// Runs against the genix_test database (see vitest.config.mts). Test-only credentials.
let payload: Payload
const context = { disableRevalidate: true }

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'sites', where: { id: { exists: true } }, context })
  await payload.delete({ collection: 'users', where: { id: { exists: true } } })
})

describe('users', () => {
  it('makes the first user an admin and later users editors', async () => {
    const first = await payload.create({ collection: 'users', data: { email: 'first@test.local', password: 'test-pass-1' } })
    expect(first.role).toBe('admin')
    const second = await payload.create({ collection: 'users', data: { email: 'second@test.local', password: 'test-pass-2' } })
    expect(second.role).toBe('editor')
  })
})

describe('sites', () => {
  it('allows only one record per site key', async () => {
    await payload.create({ collection: 'sites', data: { key: 'logistics', heroHeading: 'L' }, context })
    await expect(payload.create({ collection: 'sites', data: { key: 'logistics' }, context })).rejects.toThrow()
  })

  it('limits an editor to the divisions they are assigned', async () => {
    const hub = await payload.create({ collection: 'sites', data: { key: 'hub' }, context })
    const logistics = (await payload.find({ collection: 'sites', where: { key: { equals: 'logistics' } } })).docs[0]
    const editor = await payload.create({
      collection: 'users',
      data: { email: 'editor@test.local', password: 'test-pass-3', role: 'editor', divisions: ['logistics'] },
    })
    await expect(
      payload.update({ collection: 'sites', id: hub.id, data: { heroHeading: 'nope' }, user: editor, overrideAccess: false, context }),
    ).rejects.toThrow()
    const updated = await payload.update({
      collection: 'sites', id: logistics.id, data: { heroHeading: 'yes' }, user: editor, overrideAccess: false, context,
    })
    expect(updated.heroHeading).toBe('yes')
  })

  it('lets anyone read sites (public site content)', async () => {
    const res = await payload.find({ collection: 'sites', overrideAccess: false })
    expect(res.totalDocs).toBeGreaterThan(0)
  })

  it('limits an editor to reading only their assigned divisions', async () => {
    const editor = (await payload.find({ collection: 'users', where: { email: { equals: 'editor@test.local' } } })).docs[0]
    const res = await payload.find({ collection: 'sites', user: editor, overrideAccess: false })
    expect(res.docs.map((d) => d.key)).toEqual(['logistics'])
  })
})
