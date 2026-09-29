import { describe, expect, it } from 'vitest'
import { assertProductionEnv, missingProductionEnv } from '@/payload/env'

const full = { NODE_ENV: 'production', PAYLOAD_SECRET: 's', DATABASE_URL: 'postgres://x', BLOB_READ_WRITE_TOKEN: 't' }

describe('missingProductionEnv', () => {
  it('is empty outside production', () => {
    expect(missingProductionEnv({ NODE_ENV: 'development' })).toEqual([])
    expect(missingProductionEnv({ NODE_ENV: 'test' })).toEqual([])
    expect(missingProductionEnv({})).toEqual([])
  })
  it('requires secret and database in production', () => {
    expect(missingProductionEnv({ NODE_ENV: 'production' })).toEqual(['PAYLOAD_SECRET', 'DATABASE_URL'])
  })
  it('requires the Blob token only on Vercel', () => {
    const { BLOB_READ_WRITE_TOKEN: _t, ...noBlob } = full
    expect(missingProductionEnv(noBlob)).toEqual([])
    expect(missingProductionEnv({ ...noBlob, VERCEL_ENV: 'production' })).toEqual(['BLOB_READ_WRITE_TOKEN'])
    expect(missingProductionEnv({ ...full, VERCEL_ENV: 'preview' })).toEqual([])
  })
  it('throws naming every missing variable', () => {
    expect(() => assertProductionEnv({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toThrow(
      /PAYLOAD_SECRET, DATABASE_URL, BLOB_READ_WRITE_TOKEN/,
    )
    expect(() => assertProductionEnv(full)).not.toThrow()
  })
})
