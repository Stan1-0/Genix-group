import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('hub /about: headings, three businesses, find-us facts, metadata', async ({ page }) => {
  await page.goto(`${HUB}/about`)
  await expect(page.locator('h1')).toHaveText('One group. Three crews. One standard of work.')
  await expect(page.locator('main h2')).toHaveText(['Three businesses, one standard', 'Find us'])
  await expect(page.locator('.about-biz')).toHaveCount(3)
  await expect(page.locator('.about-biz h3 a')).toHaveText(['Genix Logistics', 'Genix Home Upgrades', 'Genix Multimedia'])
  const hrefs = await page.$$eval('.about-biz h3 a', (as) => as.map((a) => (a as HTMLAnchorElement).href))
  expect(hrefs[0]).toMatch(/^http:\/\/logistics\.localhost:3000\/?$/)
  expect(hrefs[1]).toMatch(/^http:\/\/homeupgrades\.localhost:3000\/?$/)
  expect(hrefs[2]).toMatch(/^http:\/\/multimedia\.localhost:3000\/?$/)
  await expect(page.locator('.about-cta')).toHaveAttribute('href', '/contact')
  await expect(page.locator('.facts a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('About | The Genix Group')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${HUB}/about`)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['logistics', 'homeupgrades', 'multimedia']) {
  test(`${host}.localhost /about is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}.localhost:3000/about`)
    expect(res?.status()).toBe(404)
  })
}

test('no sideways scroll at 320 px and the rows stack', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(`${HUB}/about`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const cols = await page.locator('.about-biz').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  expect(cols).toBe(1)
})

test('only the hub sitemap lists it', async ({ page }) => {
  await page.goto(`${HUB}/sitemap.xml`)
  expect(await page.content()).toContain('/about')
  await page.goto('http://logistics.localhost:3000/sitemap.xml')
  expect(await page.content()).not.toContain('/about')
})
