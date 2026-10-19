import { expect, test } from '@playwright/test'

const HOME = 'http://homeupgrades.localhost:3000/'

const CARDS = [
  { aud: 'home', title: 'Accent walls & TV units', slug: 'accent-walls' },
  { aud: 'home', title: 'Outdoor builds', slug: 'outdoor' },
  { aud: 'home', title: 'Handyman services', slug: 'handyman' },
  { aud: 'business', title: 'Accent walls for reception areas', slug: 'reception' },
]

for (const c of CARDS) {
  test(`home "What we do": the whole ${c.slug} card opens its service page`, async ({ page }) => {
    await page.goto(HOME)
    if (c.aud === 'business') await page.locator('label[for="svc-aud-business"]').click()
    const card = page.locator('.svc').filter({ has: page.getByRole('heading', { name: c.title, exact: true }) })
    // one link per card, named after the service
    await expect(card.getByRole('link')).toHaveCount(1)
    await expect(card.getByRole('link')).toHaveAccessibleName(`More about ${c.title}`)
    await card.scrollIntoViewIfNeeded()
    await card.locator('.svc-img').click() // the photo, not the link text
    await expect(page).toHaveURL(`${HOME}services/${c.slug}`)
  })
}
