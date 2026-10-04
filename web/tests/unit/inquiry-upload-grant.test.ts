import { describe, expect, it } from 'vitest'
import { checkUploadRequest } from '@/inquiries/upload-grant'

describe('checkUploadRequest', () => {
  it('accepts images up to 10 MB', () => {
    expect(checkUploadRequest({ type: 'image/heic', size: 10_485_760 })).toEqual({ ok: true })
  })
  it.each([
    [{ type: 'application/pdf', size: 10 }],
    [{ type: 'image/jpeg', size: 10_485_761 }],
    [{ type: 'image/jpeg', size: 0 }],
    [{ type: 'image/jpeg' }],
    ['nonsense'],
  ])('refuses %j', (body) => {
    expect(checkUploadRequest(body)).toMatchObject({ ok: false, status: 400 })
  })
})