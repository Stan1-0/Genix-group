import { expect, test } from '@playwright/test'

const LOGISTICS = 'http://logistics.localhost:3000'
const HUB = 'http://localhost:3000'

test('division header: logo, nav, group link and quote button', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  const header = page.locator('header')
  await expect(header.getByRole('link', { name: 'Genix Logistics home' })).toBeVisible()
  await expect(header.getByRole('navigation', { name: 'Primary' }).getByRole('link')).toHaveText(['Services', 'Our work', 'About'])
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
  await expect(page.locator('footer').getByRole('link', { name: /Logistics|Home Upgrades|Multimedia/ })).toHaveCount(3)
})

test.describe('phones', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('menu button opens and closes the navigation', async ({ page }) => {
    await page.goto(LOGISTICS + '/')
    const button = page.getByRole('button', { name: 'Open menu' })
    await button.click()
    await expect(page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Services' })).toBeVisible()
    await page.getByRole('button', { name: 'Close menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toHaveCount(0)
  })

  test('quote bar: hidden over the hero, shown after it, hidden over the footer', async ({ page }) => {
    await page.goto(LOGISTICS + '/')
    const bar = page.getByTestId('quote-bar')
    await expect(bar).toHaveAttribute('data-off', 'true')
    // make the page long enough that the footer sits well below the hero
    await page.evaluate(() => document.querySelector('main')!.style.setProperty('min-height', '3000px'))
    await page.evaluate(() => window.scrollTo(0, (document.querySelector('[data-quote-bar-after]') as HTMLElement).offsetHeight + 200))
    await expect(bar).toHaveAttribute('data-off', 'false')
    await page.evaluate(() => document.querySelector('footer')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'true')
  })
})

test('no quote bar on desktop', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  await expect(page.getByTestId('quote-bar')).toBeHidden()
})
