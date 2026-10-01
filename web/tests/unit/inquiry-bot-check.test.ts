import { describe, expect, it, vi } from 'vitest'
import { botCheckFor } from '@/inquiries/bot-check'

describe('botCheckFor', () => {
  it('asks BotID for JS submissions', async () => {
    const check = vi.fn(async () => ({ isBot: true }))
    expect(await botCheckFor(true, check)()).toBe(true)
    expect(check).toHaveBeenCalledOnce()
  })
  it('never asks BotID for no-JS posts (they carry no token) and treats them as not bots', async () => {
    const check = vi.fn(async () => ({ isBot: true }))
    expect(await botCheckFor(false, check)()).toBe(false)
    expect(check).not.toHaveBeenCalled()
  })
})
