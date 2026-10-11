import { describe, expect, it } from 'vitest'
import { seedTarget } from '@/seed/target'

describe('seedTarget', () => {
  it('allows a local database without Blob', () => {
    const t = seedTarget({ DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5434/genix_test', BLOB_READ_WRITE_TOKEN: '' })
    expect(t).toMatchObject({ dbHost: '127.0.0.1', local: true, blob: false, ok: true })
  })
  it('allows a remote database with Blob', () => {
    const t = seedTarget({ DATABASE_URL: 'postgres://u:p@db.example.com:5432/x', BLOB_READ_WRITE_TOKEN: 'tok' })
    expect(t).toMatchObject({ dbHost: 'db.example.com', local: false, blob: true, ok: true })
  })
  it('refuses a remote database without Blob', () => {
    const t = seedTarget({ DATABASE_URL: 'postgres://u:p@db.example.com:5432/x', BLOB_READ_WRITE_TOKEN: '  ' })
    expect(t.ok).toBe(false)
    expect(t.reason).toMatch(/BLOB_READ_WRITE_TOKEN/)
  })
  it('refuses a missing or invalid DATABASE_URL', () => {
    expect(seedTarget({}).ok).toBe(false)
    expect(seedTarget({ DATABASE_URL: 'not a url', BLOB_READ_WRITE_TOKEN: 'tok' }).ok).toBe(false)
  })
  it('never puts credentials in the host or the reason', () => {
    const t = seedTarget({ DATABASE_URL: 'postgres://secretuser:secretpass@db.example.com:5432/x' })
    expect(JSON.stringify(t)).not.toMatch(/secretuser|secretpass/)
  })
})
