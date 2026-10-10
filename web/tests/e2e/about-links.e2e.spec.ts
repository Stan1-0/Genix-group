import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('hub header, footer and the home intro all reach /about', async ({ page }) => {
  await page.goto(`${HUB}/`)
  const nav = page.locator('nav#nav a', { hasText: /^Who we are$/ })
  await expect(nav).toHaveCount(1)
  await expect(nav).toHaveAttribute('href', '/about')
  const foot = page.locator('footer a', { hasText: /^Who we are$/ })
  await expect(foot).toHaveCount(1)
  await expect(foot).toHaveAttribute('href', '/about')
  const more = page.locator('#about a', { hasText: 'More about the group' })
  await expect(more).toHaveCount(1)
  await expect(more).toHaveAttribute('href', '/about')
  await nav.click()
  await expect(page).toHaveURL(`${HUB}/about`)
  await expect(page.locator('h1')).toBeVisible()
})

test('the home page keeps its own intro section', async ({ page }) => {
  await page.goto(`${HUB}/`)
  await expect(page.locator('section#about h2')).toHaveText('One group. Three crews. One standard of work.')
})

test("the About page's header still reaches the home sections", async ({ page }) => {
  await page.goto(`${HUB}/about`)
  await expect(page.locator('nav#nav a', { hasText: /^Our businesses$/ })).toHaveAttribute('href', '/#businesses')
  await expect(page.locator('nav#nav a', { hasText: /^Who we are$/ })).toHaveAttribute('href', '/about')
})
