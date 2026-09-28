import { describe, expect, it } from 'vitest'
import { shouldRethrowOnCmsFailure } from '@/sites/build-phase'

describe('shouldRethrowOnCmsFailure', () => {
  it('rethrows during the production build phase', () => {
    expect(shouldRethrowOnCmsFailure('phase-production-build')).toBe(true)
  })
  it('falls back at runtime and in other phases', () => {
    expect(shouldRethrowOnCmsFailure('phase-production-server')).toBe(false)
    expect(shouldRethrowOnCmsFailure('phase-development-server')).toBe(false)
    expect(shouldRethrowOnCmsFailure(undefined)).toBe(false)
  })
})
