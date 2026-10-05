import { expect, test } from '@playwright/test'

for (const host of ['logistics', 'homeupgrades']) {
  const home = `http://${host}.localhost:3000/`
  test(`${host}: header nav and footer link to /contact`, async ({ page }) => {
    await page.goto(home)
    const nav = page.locator('nav#nav a', { hasText: /^Contact$/ })
    await expect(nav).toHaveCount(1)
    await expect(nav).toHaveAttribute('href', '/contact')
    const foot = page.locator('footer a', { hasText: /^Contact$/ })
    await expect(foot).toHaveCount(1)
    await expect(foot).toHaveAttribute('href', '/contact')
    await nav.click()
    await expect(page).toHaveURL(`${home}contact`)
    await expect(page.locator('h1')).toBeVisible()
  })

  test(`${host}: the Contact page's own nav still reaches the home sections`, async ({ page }) => {
    await page.goto(`${home}contact`)
    const first = page.locator('nav#nav a').first()
    await expect(first).toHaveAttribute('href', /^\/#/)
    await expect(page.locator('nav#nav a', { hasText: /^Contact$/ })).toHaveCount(1)
  })
}

test('the header nav fits at 1024 px (no overflow with the extra link)', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  for (const host of ['logistics', 'homeupgrades']) {
    await page.goto(`http://${host}.localhost:3000/`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
})
