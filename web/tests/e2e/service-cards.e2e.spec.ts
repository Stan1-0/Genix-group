import { expect, test } from '@playwright/test'

const HOME = 'http://homeupgrades.localhost:3000/'

const CARDS = [
  { aud: 'home', title: 'Accent walls & TV units', slug: 'accent-walls' },
  { aud: 'home', title: 'Outdoor builds', slug: 'outdoor' },
  { aud: 'home', title: 'Handyman services', slug: 'handyman' },
  { aud: 'business', title: 'Accent walls for receptions & church auditoriums', slug: 'reception' },
]

for (const c of CARDS) {
  test(`home "What we do": the whole ${c.slug} card opens its service page`, async ({ page }) => {
    await page.goto(HOME)
    if (c.aud === 'business') {
      // a click before the page finishes starting can be undone by hydration, so retry until it sticks
      await expect(async () => {
        await page.locator('label[for="svc-aud-business"]').click()
        await expect(page.locator('#svc-aud-business')).toBeChecked({ timeout: 1000 })
      }).toPass()
    }
    const card = page.locator('.svc').filter({ has: page.getByRole('heading', { name: c.title, exact: true }) })
    // one link per card, named after the service
    await expect(card.getByRole('link')).toHaveCount(1)
    await expect(card.getByRole('link')).toHaveAccessibleName(`More about ${c.title}`)
    await card.scrollIntoViewIfNeeded()
    // tap the photo area (top-left of the card), not the link text: the stretched link answers
    await card.click({ position: { x: 40, y: 40 } })
    await expect(page).toHaveURL(`${HOME}services/${c.slug}`)
  })
}
