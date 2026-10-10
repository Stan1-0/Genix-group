import { expect, test } from '@playwright/test'

const FOOTER = {
  logistics: [['Business freight', '/services#freight'], ['Last-mile & courier', '/services#freight'], ['Home & office moves', '/services#moves']],
  homeupgrades: [['Accent walls & TV units', '/services#accent-walls'], ['Outdoor builds', '/services#outdoor'], ['Handyman services', '/services#handyman']],
} as const

for (const [site, links] of Object.entries(FOOTER)) {
  const home = `http://${site}.localhost:3000/`
  test(`${site}: nav, footer and the home section link to /services`, async ({ page }) => {
    await page.goto(home)
    await expect(page.locator('nav#nav a', { hasText: /^Services$/ })).toHaveAttribute('href', '/services')
    for (const [label, href] of links) await expect(page.locator('footer a', { hasText: label })).toHaveAttribute('href', href)
    await expect(page.locator('#services a[href="/services"]')).toHaveCount(1)
    await page.locator('nav#nav a', { hasText: /^Services$/ }).click()
    await expect(page).toHaveURL(`${home}services`)
  })
  test(`${site}: every footer anchor exists on the Services page`, async ({ page }) => {
    await page.goto(`${home}services`)
    for (const [, href] of links) await expect(page.locator(href.slice('/services'.length))).toHaveCount(1)
  })
}
