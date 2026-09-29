import { expect, type Page } from '@playwright/test'

/* Port of basics() in design/tests/harness.py: the checks every page shares.
   Usage: const seen = watchPage(page); await page.goto(...); await settled(page); await expectBasics(page, seen). */
export type Seen = { errors: string[]; failed: string[] }

export function watchPage(page: Page): Seen {
  const seen: Seen = { errors: [], failed: [] }
  page.on('console', (m) => m.type() === 'error' && seen.errors.push(m.text()))
  page.on('pageerror', (e) => seen.errors.push(String(e)))
  page.on('requestfailed', (r) => r.failure()?.errorText !== 'net::ERR_ABORTED' && seen.failed.push(`${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => r.status() >= 400 && seen.failed.push(`${r.status()} ${r.url()}`))
  return seen
}

/** Network idle, fonts ready and every non-lazy image finished (deterministic; no fixed sleep). */
export async function settled(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].filter((i) => i.loading !== 'lazy' && !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = () => r(null) })))
  })
}

export async function expectBasics(page: Page, seen: Seen) {
  expect.soft(seen.errors, 'no console/page errors').toEqual([])
  expect.soft(seen.failed, 'no failed requests').toEqual([])
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect.soft(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0)
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.src))
  expect.soft(broken, 'images load').toEqual([])
  const missing = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')!).filter((h) => h.length > 1 && !document.querySelector(h)),
  )
  expect.soft([...new Set(missing)].sort(), 'in-page links resolve').toEqual([])
  expect.soft(await page.locator('h1').count(), 'exactly one h1').toBe(1)
  const noAlt = await page.evaluate(() => [...document.images].filter((i) => !i.hasAttribute('alt')).length)
  expect.soft(noAlt, 'every image has alt').toBe(0)
  const heads = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1])))
  const skips = heads.flatMap((a, i) => (i + 1 < heads.length && heads[i + 1] > a + 1 ? [`${a}->${heads[i + 1]}`] : []))
  expect.soft(skips, `no skipped heading levels (${heads.join(' ')})`).toEqual([])
}
