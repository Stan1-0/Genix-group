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

describe('BotID protected paths', () => {
  // A Server Action posts to the page its form is on. BotID only vouches for paths listed here;
  // in production every other path is checked without the browser's token and classed as a bot.
  it('covers every page with a quote form and the photo upload grant', async () => {
    const { BOTID_PROTECT } = await import('@/inquiries/bot-check')
    expect(BOTID_PROTECT).toEqual([
      { path: '/', method: 'POST' }, // division home pages
      { path: '/contact', method: 'POST' }, // division Contact pages
      { path: '/uploads', method: 'POST' }, // Home Upgrades photo upload grants
    ])
  })
})
