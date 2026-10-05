import { expect, test } from '@playwright/test'

const HUB_PRIVACY = 'http://localhost:3000/privacy'
const HOMES = ['http://localhost:3000/', 'http://logistics.localhost:3000/', 'http://homeupgrades.localhost:3000/', 'http://multimedia.localhost:3000/']

for (const url of HOMES) {
  test(`${url}: the footer links to the hub's privacy policy`, async ({ page }) => {
    await page.goto(url)
    const link = page.locator('footer a', { hasText: 'Privacy policy' })
    await expect(link).toHaveCount(1)
    // An absolute hub URL: a relative /privacy from a division host would only redirect.
    await expect(link).toHaveAttribute('href', HUB_PRIVACY)
  })
}

test('the Logistics form line links the policy and no longer shows the email', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  const note = page.locator('.privacy-note')
  await expect(note).toContainText('We use your details only to reply to this request.')
  await expect(note.locator('a')).toHaveText('privacy policy')
  await expect(note.locator('a')).toHaveAttribute('href', HUB_PRIVACY)
  await expect(note).not.toContainText('hello@thegenixgroup.com')
})

test('the Home Upgrades form line links the policy', async ({ page }) => {
  await page.goto('http://homeupgrades.localhost:3000/')
  const note = page.locator('#hu-quote-form .privacy')
  await expect(note).toContainText('We use your details and photos only to reply to this request.')
  await expect(note.locator('a')).toHaveText('privacy policy')
  await expect(note.locator('a')).toHaveAttribute('href', HUB_PRIVACY)
})
