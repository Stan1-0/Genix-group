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

for (const width of [961, 1000, 1024]) {
  test(`the header nav fits at ${width} px (no overflow, no wrapping, with the extra link)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    for (const host of ['logistics', 'homeupgrades']) {
      await page.goto(`http://${host}.localhost:3000/`)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      const tops = await page.locator('nav#nav a:visible').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      expect(tops.length).toBeGreaterThanOrEqual(4)
      const heights = await page.locator('nav#nav a:visible').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
      expect(Math.max(...heights), `${host} at ${width}: no nav label wraps onto two lines`).toBeLessThan(32)
      expect(new Set(tops).size, `${host} at ${width}: nav links share one line`).toBe(1)
    }
  })
}
