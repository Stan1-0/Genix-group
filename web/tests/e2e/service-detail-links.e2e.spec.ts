import { expect, test } from '@playwright/test'

const HU = 'http://homeupgrades.localhost:3000'

test('/services links each Home Upgrades service to its page', async ({ page }) => {
  await page.goto(`${HU}/services`)
  for (const slug of ['accent-walls', 'outdoor', 'handyman', 'reception']) {
    await expect(page.locator(`#${slug} a[href="/services/${slug}"]`)).toHaveCount(1)
  }
  await expect(page.locator('#accent-walls a.btn-gold')).toHaveAttribute('href', '/contact?project=accent&property=home') // quote button unchanged
})

test('the footer service links go to the detail pages', async ({ page }) => {
  await page.goto(`${HU}/`)
  for (const [label, href] of [['Accent walls & TV units', '/services/accent-walls'], ['Outdoor builds', '/services/outdoor'], ['Handyman services', '/services/handyman']]) {
    await expect(page.locator('footer a', { hasText: label })).toHaveAttribute('href', href)
  }
})

test('Logistics /services has no detail links', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/services')
  await expect(page.locator('a[href^="/services/"]')).toHaveCount(0)
})
