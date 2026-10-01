import { describe, expect, it } from 'vitest'
import { cronAuthorized } from '@/inquiries/cron-auth'

describe('cronAuthorized', () => {
  it('rejects when the secret is unset or empty', () => {
    expect(cronAuthorized('Bearer x', undefined)).toBe(false)
    expect(cronAuthorized('Bearer ', '')).toBe(false)
    expect(cronAuthorized(null, undefined)).toBe(false)
  })
  it('rejects a missing or wrong header', () => {
    expect(cronAuthorized(null, 's3cret')).toBe(false)
    expect(cronAuthorized('Bearer nope', 's3cret')).toBe(false)
    expect(cronAuthorized('s3cret', 's3cret')).toBe(false)
  })
  it('accepts Bearer <secret>', () => {
    expect(cronAuthorized('Bearer s3cret', 's3cret')).toBe(true)
  })
})
