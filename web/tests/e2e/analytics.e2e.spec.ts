import { expect, test } from '@playwright/test'

const SCRIPT_PATTERN = /speed-insights|va\.vercel-scripts|_vercel/

test('analytics and speed insights load on site pages, not in the admin', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  // In development both components inject debug scripts from https://va.vercel-scripts.com/v1/…
  // (script.debug.js and speed-insights/script.debug.js) client-side after hydration, so poll for them.
  await expect
    .poll(async () => {
      const srcs = await page.locator('script[src]').evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src))
      return srcs.some((s) => SCRIPT_PATTERN.test(s))
    })
    .toBe(true)
  await page.goto('http://localhost:3000/admin')
  const adminSrcs = await page.locator('script[src]').evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src))
  expect(adminSrcs.some((s) => SCRIPT_PATTERN.test(s))).toBe(false)
})
