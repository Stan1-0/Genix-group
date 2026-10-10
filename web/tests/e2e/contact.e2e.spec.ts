import { expect, test } from '@playwright/test'

const LOG = 'http://logistics.localhost:3000/contact'

test('logistics /contact: heading, details card, the quote form, metadata', async ({ page }) => {
  await page.goto(LOG)
  await expect(page.locator('h1')).toContainText('Real people. Real answers.')
  await expect(page.locator('.contact-card a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('.contact-card .contact-reply')).toContainText('within two business days')
  await expect(page.locator('.contact-card')).not.toContainText(/hours/i)
  await expect(page.locator('#quote-form')).toHaveCount(1)
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Contact | Genix Logistics')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', LOG)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['multimedia.localhost:3000']) {
  test(`${host}/contact is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}/contact`)
    expect(res?.status()).toBe(404)
  })
}

test('a request sent from /contact becomes a Logistics inquiry (JS)', async ({ page }) => {
  await page.goto(LOG)
  await page.waitForTimeout(2200) // past the 2 s "too fast" guard
  await page.fill('#qFrom', '92101')
  await page.fill('#qTo', '92024')
  await page.check('#qFlex')
  await page.selectOption('#qLoad', 'parcels')
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Contact')
  await page.fill('#qEmail', 'e2e@test.local')
  await page.click('#qSend')
  await expect(page.locator('#qSent')).toBeVisible()
  await expect(page.locator('#qRef')).toHaveText(/^GX-LOG-\d{6}$/)
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('/contact posts and lands on the sent page', async ({ page }) => {
    await page.goto(LOG)
    await page.fill('#qFrom', '92101')
    await page.fill('#qTo', '92024')
    await page.check('#qFlex')
    await page.selectOption('#qLoad', 'parcels')
    await page.fill('#qName', 'E2E NoJS Contact')
    await page.fill('#qPhone', '(619) 555-0100')
    await page.click('#qSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-LOG-\d{6}$/)
    await expect(page.getByRole('heading', { name: 'Request received.' })).toBeVisible()
  })
})

test('the pinned quote bar never shows on /contact (phone), and nothing scrolls sideways at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(LOG)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(500)
  await expect(page.getByTestId('quote-bar')).toBeHidden()
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

const HU = 'http://homeupgrades.localhost:3000/contact'

test('homeupgrades /contact: heading, details card, the quote form, metadata', async ({ page }) => {
  await page.goto(HU)
  await expect(page.locator('h1')).toContainText("Let's talk about your space.")
  await expect(page.locator('.contact-card a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('.contact-card .contact-reply')).toContainText('to arrange a visit')
  await expect(page.locator('.contact-card')).not.toContainText(/hours/i)
  await expect(page.locator('#hu-quote-form')).toHaveCount(1)
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Contact | Genix Home Upgrades')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', HU)
})

test('a request sent from the Home Upgrades /contact becomes an inquiry (no JS)', async ({ browser }) => {
  const page = await (await browser.newContext({ javaScriptEnabled: false })).newPage()
  await page.goto(HU)
  // No JS: both steps are visible; the pills are radios.
  await page.check('input[name="project"][value="accent"]')
  await page.check('input[name="property"][value="home"]')
  await page.check('input[name="timing"][value="soon"]')
  await page.fill('#hqZip', '92101')
  await page.fill('#hqNotes', 'Contact page e2e: slatted wall behind the TV')
  await page.fill('#hqName', 'E2E Contact HU')
  await page.fill('#hqPhone', '(619) 555-0100')
  await page.click('#hqSend')
  await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUP-\d{6}$/)
  await expect(page.getByRole('heading', { name: 'Request received.' })).toBeVisible()
  await page.context().close()
})

test('the pinned quote bar never shows on the Home Upgrades /contact (phone), and nothing scrolls sideways at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(HU)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(500)
  await expect(page.getByTestId('quote-bar')).toBeHidden()
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

for (const [name, url, form] of [['logistics', LOG, '#quote-form'], ['homeupgrades', HU, '#hu-quote-form']] as const) {
  test(`${name} /contact: phone order is form then details; desktop keeps the card left of the form`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto(url)
    const phone = await page.evaluate((f) => ({
      form: document.querySelector(f)!.getBoundingClientRect().top,
      card: document.querySelector('.contact-card')!.getBoundingClientRect().top,
    }), form)
    expect(phone.form).toBeLessThan(phone.card)
    await page.setViewportSize({ width: 1280, height: 900 })
    const desk = await page.evaluate((f) => ({
      form: document.querySelector(f)!.getBoundingClientRect(),
      card: document.querySelector('.contact-card')!.getBoundingClientRect(),
    }), form)
    expect(desk.card.right).toBeLessThanOrEqual(desk.form.left)
  })
}
