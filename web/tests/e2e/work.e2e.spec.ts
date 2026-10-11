import { expect, test } from '@playwright/test'

const WORK = 'http://homeupgrades.localhost:3000/work'

test('/work lists every project in order and opens them', async ({ page }) => {
  await page.goto(WORK)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('.work-card b')).toHaveText(['Accent wall', 'Custom TV unit', 'Accent wall', 'Marble TV wall', 'TV wall mounting'])
  await expect(page.locator('.work-card[data-reveal]')).toHaveCount(0)
  await page.locator('.work-card').nth(3).click()
  await expect(page.locator('dialog#viewer')).toBeVisible()
  await expect(page.locator('#viewerTitle')).toHaveText('Marble TV wall')
  await page.keyboard.press('Escape')
  await expect(page.locator('#work-cta a.btn')).toHaveAttribute('href', '/contact')
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Our work | Genix Home Upgrades')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', WORK)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['logistics.localhost:3000', 'localhost:3000', 'multimedia.localhost:3000']) {
  test(`${host}/work is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}/work`)
    expect(res?.status()).toBe(404)
  })
}

test('no sideways scroll at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(WORK)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
