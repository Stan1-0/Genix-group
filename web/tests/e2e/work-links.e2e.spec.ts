import { expect, test } from '@playwright/test'

const HOME = 'http://homeupgrades.localhost:3000/'

test('nav, footer and the home section link to /work', async ({ page }) => {
  await page.goto(HOME)
  await expect(page.locator('nav#nav a', { hasText: /^Our work$/ })).toHaveAttribute('href', '/work')
  await expect(page.locator('footer a', { hasText: /^Our work$/ })).toHaveAttribute('href', '/work')
  const all = page.locator('#work a[href="/work"]')
  await expect(all).toHaveCount(1)
  await all.scrollIntoViewIfNeeded()
  await expect(all).toHaveCSS('opacity', '1')
  await all.click()
  await expect(page).toHaveURL(`${HOME}work`)
})

test('Logistics has no Our work link', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  await expect(page.locator('a[href="/work"]')).toHaveCount(0)
})
