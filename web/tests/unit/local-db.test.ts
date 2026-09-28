import { describe, expect, it } from 'vitest'
import { isLocalDatabase } from '@/payload/local-db'

describe('isLocalDatabase', () => {
  it('accepts loopback hosts', () => {
    expect(isLocalDatabase('postgres://postgres:postgres@127.0.0.1:5434/genix')).toBe(true)
    expect(isLocalDatabase('postgres://postgres:postgres@localhost:5434/genix_test')).toBe(true)
    expect(isLocalDatabase('postgresql://u:p@[::1]:5432/db')).toBe(true)
  })
  it('rejects remote, look-alike, empty and malformed URLs', () => {
    expect(isLocalDatabase('postgresql://u:p@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require')).toBe(false)
    expect(isLocalDatabase('postgres://u:p@localhost.example.com/db')).toBe(false)
    expect(isLocalDatabase('')).toBe(false)
    expect(isLocalDatabase(undefined)).toBe(false)
    expect(isLocalDatabase('not a url')).toBe(false)
  })
})
