import { expect, test } from '@playwright/test'

// Chromium resolves *.localhost to this machine. Needs `npm run seed` first.
const ORIGINS = {
  hub: 'http://localhost:3000',
  logistics: 'http://logistics.localhost:3000',
  homeupgrades: 'http://homeupgrades.localhost:3000',
  multimedia: 'http://multimedia.localhost:3000',
} as const
const HEADINGS = {
  hub: 'We Haul It. We Build It. We Show It.',
  logistics: 'Reliable Freight. Real People. On Time, Every Time.',
  homeupgrades: 'From Blueprint to Beautiful.',
  multimedia: 'Your Story, Captured and Amplified.',
} as const

for (const [site, origin] of Object.entries(ORIGINS) as [keyof typeof ORIGINS, string][]) {
  test(`${site}: home renders on its own host in its own theme`, async ({ page }) => {
    const res = await page.goto(origin + '/')
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('data-site', site)
    await expect(page.locator('h1')).toHaveText(HEADINGS[site])
  })

  test(`${site}: unknown paths get the site's own 404`, async ({ page }) => {
    const res = await page.goto(origin + '/no-such-page')
    expect(res?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('data-site', site)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("We couldn't find that page.")
  })
}

test('admin is served on the main domain only', async ({ page }) => {
  expect((await page.goto(ORIGINS.hub + '/admin'))?.status()).toBe(200)
  expect((await page.goto(ORIGINS.logistics + '/admin'))?.status()).toBe(404)
  expect((await page.goto(ORIGINS.multimedia + '/api/sites'))?.status()).toBe(404)
})

test('the hub cannot be used to reach a division page', async ({ page }) => {
  const res = await page.goto(ORIGINS.hub + '/logistics')
  expect(res?.status()).toBe(404)
  await expect(page.locator('html')).toHaveAttribute('data-site', 'hub')
})
