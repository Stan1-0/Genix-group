import { describe, expect, it } from 'vitest'
import { offlineMessage, quoteSendMode } from '@/pages-home/logistics/send-mode'

describe('quote form send mode', () => {
  it('is offline only on the production deployment', () => {
    expect(quoteSendMode('production')).toBe('offline')
    expect(quoteSendMode('preview')).toBe('preview')
    expect(quoteSendMode(undefined)).toBe('preview')
  })
  it('offers the phone when there is one', () => {
    expect(offlineMessage('(619) 555-0100')).toBe("We can't take requests online yet. Call us at (619) 555-0100 or email hello@thegenixgroup.com.")
    expect(offlineMessage(null)).toBe("We can't take requests online yet. Email hello@thegenixgroup.com.")
  })
})
