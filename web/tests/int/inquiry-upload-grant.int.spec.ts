import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { grantUpload } from '@/inquiries/upload-grant'

let payload: Payload
const env = { CLOUDINARY_CLOUD_NAME: 'demo-cloud', CLOUDINARY_API_KEY: '1', CLOUDINARY_API_SECRET: 'test-secret-not-real', IP_HASH_SALT: 's' }
const body = { type: 'image/jpeg', size: 1000 }
const deps = (over = {}) => ({ payload, env, isBot: async () => false, now: new Date(), production: true, ...over })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'rate-hits', where: { id: { exists: true } } }) })

describe('grantUpload', () => {
  it('grants a signed upload on Home Upgrades only', async () => {
    const r = await grantUpload({ site: 'homeupgrades', body, ip: '203.0.113.9' }, deps())
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload' })
    expect(JSON.stringify(r.json)).not.toContain('test-secret-not-real')
    expect((await grantUpload({ site: 'logistics', body, ip: '203.0.113.9' }, deps())).status).toBe(404)
  })
  it('404 when photos are off; 400 bad body; 403 bot', async () => {
    expect((await grantUpload({ site: 'homeupgrades', body, ip: '1.1.1.1' }, deps({ env: {} }))).status).toBe(404)
    expect((await grantUpload({ site: 'homeupgrades', body: { type: 'application/pdf', size: 1 }, ip: '1.1.1.1' }, deps())).status).toBe(400)
    expect((await grantUpload({ site: 'homeupgrades', body, ip: '1.1.1.1' }, deps({ isBot: async () => true }))).status).toBe(403)
  })
  it('allows 10 grants per IP per 10 minutes', async () => {
    for (let i = 0; i < 10; i++) expect((await grantUpload({ site: 'homeupgrades', body, ip: '203.0.113.7' }, deps())).status).toBe(200)
    expect((await grantUpload({ site: 'homeupgrades', body, ip: '203.0.113.7' }, deps())).status).toBe(429)
  })
})