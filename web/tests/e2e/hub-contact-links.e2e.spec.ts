import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('header button, nav, footer and the home "not sure?" line reach /contact', async ({ page }) => {
  await page.goto(`${HUB}/`)
  await expect(page.locator('nav#nav a', { hasText: /^Contact$/ })).toHaveAttribute('href', '/contact')
  await expect(page.locator('nav#nav a', { hasText: /^Get a quote$/ })).toHaveCount(0)
  await expect(page.locator('a.header-cta')).toHaveAttribute('href', '/contact')
  await expect(page.locator('footer a', { hasText: /^Get a quote$/ })).toHaveAttribute('href', '/contact')
  const alt = page.locator('#contact .route-alt a[href="/contact"]')
  await expect(alt).toHaveCount(1)
  await expect(page.locator('#contact .route-alt a[href^="mailto:"]')).toHaveCount(1) // the email link stays
  await page.locator('a.header-cta').click()
  await expect(page).toHaveURL(`${HUB}/contact`)
  await expect(page.locator('h1')).toHaveText('Talk to the group.')
})

test('the home "What do you need?" cards are unchanged', async ({ page }) => {
  await page.goto(`${HUB}/`)
  await expect(page.locator('#contact .option')).toHaveCount(3)
})

test("About's Start a conversation goes to the Contact page", async ({ page }) => {
  await page.goto(`${HUB}/about`)
  await expect(page.locator('.about-cta')).toHaveAttribute('href', '/contact')
})
