import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('hub /contact: headings, three route cards, the form, details, metadata', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await expect(page.locator('h1')).toHaveText('Talk to the group.')
  await expect(page.locator('main h2')).toHaveText(['Go straight to a business', 'Send us a message', 'Find us'])
  const hrefs = await page.$$eval('.contact-routes .option', (as) => as.map((a) => (a as HTMLAnchorElement).href))
  expect(hrefs[0]).toBe('http://logistics.localhost:3000/contact')
  expect(hrefs[1]).toBe('http://homeupgrades.localhost:3000/contact')
  expect(hrefs[2]).toBe(`${HUB}/contact?about=multimedia#message`)
  await expect(page.locator('form#message input[name="about"]')).toHaveCount(4)
  await expect(page.locator('form#message input[name="site"]')).toHaveValue('hub')
  await expect(page.locator('form#message .privacy a')).toHaveAttribute('href', `${HUB}/privacy`)
  await expect(page.locator('.contact-details a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Contact | The Genix Group')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${HUB}/contact`)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

test('?about=multimedia pre-selects Multimedia; junk values select nothing', async ({ page }) => {
  await page.goto(`${HUB}/contact?about=multimedia`)
  await expect(page.locator('input[name="about"][value="multimedia"]')).toBeChecked()
  for (const junk of ['hub', '%3Cscript%3E', '']) {
    await page.goto(`${HUB}/contact?about=${junk}`)
    await expect(page.locator('input[name="about"]:checked')).toHaveCount(0)
    await expect(page.locator('h1')).toHaveText('Talk to the group.')
  }
})

test('the Multimedia card lands on the form with Multimedia chosen', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await page.locator('.contact-routes .option').nth(2).click()
  await expect(page).toHaveURL(`${HUB}/contact?about=multimedia#message`)
  await expect(page.locator('input[name="about"][value="multimedia"]')).toBeChecked()
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('a message posts and lands on the hub-styled sent page', async ({ page }) => {
    await page.goto(`${HUB}/contact`)
    await page.check('input[name="about"][value="unsure"]')
    await page.fill('#hcName', 'E2E Hub NoJS')
    await page.fill('#hcEmail', 'e2e@test.local')
    await page.fill('#hcMessage', 'Moving offices and need a new sign filmed.')
    await page.click('#hcSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUB-\d{6}$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Message received.')
    await expect(page.locator('main')).toContainText("We'll reply by email within two business days.")
    await expect(page.getByRole('link', { name: 'Back to the form' })).toHaveAttribute('href', '/contact')
  })
  test('an invalid post shows the hub error page with a way back', async ({ page }) => {
    await page.goto(`${HUB}/quote/sent?error=invalid`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Couldn't send.")
    await expect(page.getByRole('link', { name: 'Back to the form' })).toHaveAttribute('href', '/contact')
    for (const err of ['offline', 'rate', 'server']) {
      await page.goto(`${HUB}/quote/sent?error=${err}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Couldn't send.")
      await expect(page.locator('.contact-sent')).toHaveCount(1)
    }
  })
})

test('no sideways scroll at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(`${HUB}/contact`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('the hub sitemap lists /contact', async ({ page }) => {
  await page.goto(`${HUB}/sitemap.xml`)
  expect(await page.content()).toContain('/contact</loc>')
})

test('JS: a complete message gets a GX-HUB reference in place', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await page.waitForTimeout(2200) // past the 2 s "too fast" guard
  await page.check('input[name="about"][value="logistics"]')
  await page.fill('#hcName', 'E2E Hub JS')
  await page.fill('#hcEmail', 'e2e@test.local')
  await page.fill('#hcMessage', 'Two pallets to Phoenix next month, please.')
  await page.click('#hcSend')
  await expect(page.locator('#hcSent')).toBeVisible()
  await expect(page.locator('#hcRef')).toHaveText(/^GX-HUB-\d{6}$/)
  await expect(page.locator('#hcSent')).toContainText('within two business days')
  await expect(page.locator('#hcName')).toBeHidden()
})

test('JS: inline errors match the server and focus the first problem', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await page.fill('#hcPhone', '555-0100')
  await page.fill('#hcMessage', 'short')
  await page.click('#hcSend')
  await expect(page.locator('#hcAboutErr')).toHaveText('Choose which business this is about.')
  await expect(page.locator('#hcNameErr')).toHaveText('Enter your name.')
  await expect(page.locator('#hcEmailErr')).toHaveText('Enter your email so we can reply.')
  await expect(page.locator('#hcPhoneErr')).toHaveText('Enter a phone number with area code.')
  await expect(page.locator('#hcMessageErr')).toHaveText('Tell us a little more (at least 10 characters).')
  await expect(page.locator('#hcName')).toBeFocused()
  await page.fill('#hcName', 'Ana')
  await expect(page.locator('#hcNameErr')).toHaveText('') // typing clears that field's error
  await expect(page.locator('#hcSent')).toBeHidden()
})
