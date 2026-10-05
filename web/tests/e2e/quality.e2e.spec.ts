import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const HOMES = ['http://logistics.localhost:3000/', 'http://homeupgrades.localhost:3000/', 'http://localhost:3000/']

for (const url of HOMES) {
  test(`${url}: no console errors or failed requests`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
    // Aborted requests are the browser cancelling its own work (the hub reel's video range request when it
    // pauses or scrolls away), not failures; basics.ts exempts them the same way.
    page.on('requestfailed', (r) => r.failure()?.errorText !== 'net::ERR_ABORTED' && problems.push(`${r.url()} ${r.failure()?.errorText}`))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } })
    expect(problems).toEqual([])
  })

  test(`${url}: no axe violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(url, { waitUntil: 'networkidle' })
    // Before JS runs, the Logistics quote form shows step 2, whose ghost `#qBack` button (white on the light
    // card) fails color-contrast. The prototype has the same markup and the same pre-JS state (an inherited
    // design issue, reported to the owner), so scan only once the enhancer has hidden step 2.
    if (url.startsWith('http://logistics.')) await expect(page.locator('fieldset[data-step="2"]')).toBeHidden()
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
}

test('hub privacy page: no console errors or failed requests', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  page.on('requestfailed', (r) => r.failure()?.errorText !== 'net::ERR_ABORTED' && problems.push(`${r.url()} ${r.failure()?.errorText}`))
  await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' })
  expect(problems).toEqual([])
})

test('hub privacy page: no axe violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('http://localhost:3000/privacy', { waitUntil: 'networkidle' })
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
})

const SITE_ORIGINS =['http://logistics.localhost:3000', 'http://homeupgrades.localhost:3000', 'http://localhost:3000', 'http://multimedia.localhost:3000']

for (const origin of SITE_ORIGINS) {
  test(`${origin}: 404 page has no axe violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const res = await page.goto(`${origin}/no-such-page`, { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(404)
    // Dev-only: Next's error-indicator portal (a link inside a <script> shell) sits before the skip link,
    // so axe no longer treats the skip link as one. It does not exist in production builds.
    await page.evaluate(() => document.querySelectorAll('script[data-nextjs-dev-overlay]').forEach((e) => e.remove()))
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })

  test(`${origin}: the focused skip link is visible`, async ({ page }) => {
    await page.goto(`${origin}/`, { waitUntil: 'load' })
    await page.keyboard.press('Tab')
    const skip = page.locator('a.skip-link')
    await expect(skip).toBeFocused()
    const box = await skip.boundingBox()
    expect(box!.width).toBeGreaterThan(40)
    expect(box!.height).toBeGreaterThan(20)
  })
}

test('hub 404 page shows the header logo', async ({ page }) => {
  await page.goto('http://localhost:3000/no-such-page', { waitUntil: 'networkidle' })
  await expect(page.locator('html')).not.toHaveClass(/logo-dock/)
  await expect(page.locator('.site-header .logo')).toBeVisible()
  await expect(page.locator('.site-header .logo-mark')).toHaveCSS('opacity', '1')
})

test('404 call to action is readable on ported sites', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/no-such-page', { waitUntil: 'networkidle' })
  const cta = page.locator('main a.cta')
  const [color, bg] = await cta.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor])
  expect(color).toBe('rgb(255, 255, 255)')
  expect(bg).not.toBe('rgba(0, 0, 0, 0)')
})

// The early script (js / h1-pending / logo-dock classes) must be a real <script> in the server HTML's <head>,
// executed while the document is parsed — a queued or client-rendered script would run after first paint and
// flash the unsplit headline and the hub header logo.
// (Not checked on 404s: Next renders those from its client error shell — see README known issues.)
for (const url of ['http://logistics.localhost:3000/', 'http://homeupgrades.localhost:3000/', 'http://localhost:3000/']) {
  test(`${url}: early script is an inline <script> in the served <head>`, async ({ page }) => {
    // Fetched from inside the page: Node's resolver doesn't know *.localhost.
    await page.goto(new URL('/robots.txt', url).href)
    const html = await page.evaluate(async (u) => (await fetch(u)).text(), url)
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head).toMatch(/<script[^>]*>[^<]*document\.documentElement\.classList\.add\("js"\)/)
  })
}

// Hero photos are the Largest Contentful Paint: they must load eagerly with high priority (Next 16 guidance),
// not lazily (next/image's default).
for (const [url, selector] of [
  ['http://localhost:3000/', '.hero img[src*="hu-project-feature-wall"], .hero img[srcset*="hu-project-feature-wall"]'],
  ['http://homeupgrades.localhost:3000/', '[data-hero] img:not([src$=".svg"])'],
] as const) {
  test(`${url}: hero photo loads eagerly`, async ({ page }) => {
    await page.goto(url)
    const img = page.locator(selector).first()
    await expect(img).toHaveAttribute('loading', 'eager')
    await expect(img).toHaveAttribute('fetchpriority', 'high')
  })
}
