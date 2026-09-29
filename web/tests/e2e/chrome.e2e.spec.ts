import { expect, test } from '@playwright/test'

const LOGISTICS = 'http://logistics.localhost:3000'
const HUB = 'http://localhost:3000'

test('division header: logo, nav, group link and quote button', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  const header = page.locator('header')
  await expect(header.getByRole('link', { name: 'Genix Logistics home' })).toBeVisible()
  await expect(header.getByRole('navigation', { name: 'Primary' }).getByRole('link')).toHaveText(['Services', 'How it works', 'Where we go'])
  await expect(header.getByRole('link', { name: /Part of The Genix Group/ })).toHaveAttribute('href', 'http://localhost:3000')
  await expect(header.getByRole('link', { name: 'Get a quote' })).toBeVisible()
})

test('multimedia has a text wordmark until its logo exists', async ({ page }) => {
  await page.goto('http://multimedia.localhost:3000/')
  await expect(page.locator('header').getByRole('link', { name: 'Genix Multimedia home' })).toContainText('Multimedia')
})

test('footer links to the sister divisions and shows the group email', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  const footer = page.locator('footer')
  await expect(footer.getByRole('link', { name: 'Home Upgrades' })).toHaveAttribute('href', 'http://homeupgrades.localhost:3000')
  await expect(footer.getByRole('link', { name: 'Multimedia' })).toHaveAttribute('href', 'http://multimedia.localhost:3000')
  await expect(footer.getByRole('link', { name: 'hello@thegenixgroup.com' })).toHaveAttribute('href', 'mailto:hello@thegenixgroup.com')
})

test('hub footer lists all three divisions', async ({ page }) => {
  await page.goto(HUB + '/')
  await expect(page.locator('footer').getByRole('link', { name: /Genix (Logistics|Home Upgrades|Multimedia)/ })).toHaveCount(3)
})

test.describe('phones', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('menu button opens and closes the navigation', async ({ page }) => {
    await page.goto(LOGISTICS + '/')
    // The menu script attaches after hydration; retry the first click until it has.
    await expect(async () => {
      await page.locator('#menuBtn').click()
      await expect(page.locator('#siteHeader')).toHaveClass(/menu-open/, { timeout: 1000 })
    }).toPass({ timeout: 15_000 })
    await expect(page.locator('#nav').getByRole('link', { name: 'Services' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#siteHeader')).not.toHaveClass(/menu-open/)
    await expect(page.locator('#menuBtn')).toBeFocused()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('button', { name: 'Close menu' }).click()
    await expect(page.locator('#siteHeader')).not.toHaveClass(/menu-open/)
  })

  test('quote bar: appears after the quote form, hidden over #quote and the footer', async ({ page }) => {
    await page.goto(LOGISTICS + '/')
    const bar = page.getByTestId('quote-bar')
    await expect(bar).toHaveAttribute('data-off', 'true')
    await page.evaluate(() => window.scrollTo(0, (document.querySelector('#quote-form') as HTMLElement).getBoundingClientRect().bottom + window.scrollY + 200))
    await expect(bar).toHaveAttribute('data-off', 'false')
    await page.evaluate(() => document.querySelector('.site-footer')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'true')
  })
})

test.describe('Home Upgrades quote bar (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('off over the hero, on once the hero actions scroll away, off over #build, #quote and the footer', async ({ page }) => {
    await page.goto('http://homeupgrades.localhost:3000/')
    const bar = page.getByTestId('quote-bar')
    await expect(bar).toHaveAttribute('data-off', 'true')
    await page.evaluate(() => window.scrollTo(0, (document.querySelector('.hero-actions') as HTMLElement).getBoundingClientRect().bottom + window.scrollY + 200))
    await expect(bar).toHaveAttribute('data-off', 'false')
    await page.evaluate(() => document.querySelector('#build')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'true')
    await page.evaluate(() => document.querySelector('#services')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'false')
    await page.evaluate(() => document.querySelector('#quote')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'true')
    await page.evaluate(() => document.querySelector('#services')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'false')
    await page.evaluate(() => document.querySelector('.site-footer')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'true')
  })
})

test('no quote bar on desktop', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  await expect(page.getByTestId('quote-bar')).toBeHidden()
})
