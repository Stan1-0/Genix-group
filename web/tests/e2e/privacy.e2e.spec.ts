import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'
const HEADINGS = ['Who we are', 'What we collect', 'How we use it', 'Who handles it for us', 'Cookies and tracking', 'How long we keep it', 'Your choices', 'Children', 'Changes', 'Questions']

test('the hub serves the policy', async ({ page }) => {
  await page.goto(`${HUB}/privacy`)
  await expect(page.locator('h1')).toHaveText('Privacy policy')
  await expect(page.locator('.policy-updated')).toContainText('Last updated October 5, 2026')
  await expect(page.locator('.policy-body h2')).toHaveText(HEADINGS)
  await expect(page.locator('.policy-table thead th')).toHaveText(['Service', 'What it does for us', 'What it receives'])
  await expect(page.locator('.policy-table tbody th')).toHaveText(['Resend', 'Cloudinary', 'Vercel', 'Neon'])
  await expect(page.locator('.policy-body a[href="mailto:hello@thegenixgroup.com"]').first()).toBeVisible()
  expect(await page.title()).toBe('Privacy policy | The Genix Group')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy$/)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['logistics', 'homeupgrades', 'multimedia']) {
  test(`${host}: /privacy redirects permanently to the hub page`, async ({ page }) => {
    // Verified by logging page.on('response') for this URL: Payload's withPayload (next.config) adds
    // Accept-CH/Critical-CH: Sec-CH-Prefers-Color-Scheme to every response, and the browser's first reported
    // hop is a 307 whose Location is the same URL and which carries none of the server's headers (our proxy.ts
    // and permanentRedirect() never send one). That 307 is a browser-side restart, not app behaviour (the
    // cause being Critical-CH is inferred from those headers). The server's own 308 to the hub comes after
    // it, so the 308 cannot be asserted as the first hop; assert it appears, then the final landing.
    const statuses: { status: number; location: string | undefined }[] = []
    page.on('response', (r) => { if (r.url() === `http://${host}.localhost:3000/privacy`) statuses.push({ status: r.status(), location: r.headers()['location'] }) })
    await page.goto(`http://${host}.localhost:3000/privacy`)
    expect(statuses).toContainEqual({ status: 308, location: `${HUB}/privacy` })
    await expect(page).toHaveURL(`${HUB}/privacy`)
    await expect(page.locator('h1')).toHaveText('Privacy policy')
  })
}

test('no sideways scroll at 320 px and the provider table stacks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(`${HUB}/privacy`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const rows = await page.locator('.policy-table tbody tr').first().evaluate((tr) => getComputedStyle(tr).display)
  expect(rows).toBe('block')
})

test('only the hub sitemap lists it; robots does not block it', async ({ page }) => {
  await page.goto(`${HUB}/sitemap.xml`)
  expect(await page.content()).toContain('/privacy')
  await page.goto('http://homeupgrades.localhost:3000/sitemap.xml')
  expect(await page.content()).not.toContain('/privacy')
  await page.goto(`${HUB}/robots.txt`)
  expect(await page.textContent('body')).not.toMatch(/Disallow:\s*\/privacy/)
})
