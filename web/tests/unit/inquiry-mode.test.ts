import { describe, expect, it } from 'vitest'
import { inquirySendMode, offlineMessage } from '@/inquiries/mode'

const keys = { RESEND_API_KEY: 're_test_123', INQUIRY_TO: 'hello@thegenixgroup.com', IP_HASH_SALT: 'salt' }

describe('inquirySendMode', () => {
  it('is live wherever the email settings are present', () => {
    expect(inquirySendMode({ VERCEL_ENV: 'production', ...keys })).toBe('live')
    expect(inquirySendMode({ VERCEL_ENV: 'preview', ...keys })).toBe('live')
    expect(inquirySendMode({ ...keys })).toBe('live')
  })
  it('stays offline on production without them (never pretends to accept a request)', () => {
    expect(inquirySendMode({ VERCEL_ENV: 'production' })).toBe('offline')
    expect(inquirySendMode({ VERCEL_ENV: 'production', RESEND_API_KEY: 're_x' })).toBe('offline')
    expect(inquirySendMode({ VERCEL_ENV: 'production', RESEND_API_KEY: 're_x', INQUIRY_TO: 'a@b.co' })).toBe('offline') // no salt
  })
  it('previews elsewhere: saves, logs emails', () => {
    expect(inquirySendMode({ VERCEL_ENV: 'preview' })).toBe('preview')
    expect(inquirySendMode({})).toBe('preview')
  })
})

describe('offlineMessage', () => {
  it('offers the phone when there is one', () => {
    expect(offlineMessage('(619) 555-0100')).toBe("We can't take requests online yet. Call us at (619) 555-0100 or email hello@thegenixgroup.com.")
    expect(offlineMessage(null)).toBe("We can't take requests online yet. Email hello@thegenixgroup.com.")
  })
})
