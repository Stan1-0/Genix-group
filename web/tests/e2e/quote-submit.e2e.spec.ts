import { expect, test } from '@playwright/test'

// Dev server runs in "preview" mode: submissions are saved to the local DB and emails go to the log.
const URL = 'http://logistics.localhost:3000/'

async function fillStep1(page: import('@playwright/test').Page) {
  await page.fill('#qFrom', '92101')
  await page.fill('#qTo', '92024')
  await page.check('#qFlex')
  await page.selectOption('#qLoad', 'parcels')
}

test('JS: a complete request gets a real reference', async ({ page }) => {
  await page.goto(URL)
  await page.waitForTimeout(2200) // past the 2 s "too fast" guard
  await fillStep1(page)
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Test')
  await page.fill('#qEmail', 'e2e@test.local')
  await page.click('#qSend')
  await expect(page.locator('#qSent')).toBeVisible()
  await expect(page.locator('#qRef')).toHaveText(/^GX-LOG-\d{6}$/)
  await expect(page.locator('#qSent')).toContainText('within two business days')
})

test('JS: server field errors show inline', async ({ page }) => {
  await page.goto(URL)
  await page.waitForTimeout(2200)
  await fillStep1(page)
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Test')
  await page.fill('#qPhone', '555-0100') // too short: client catches it first, same message as the server
  await page.click('#qSend')
  await expect(page.locator('#qPhoneErr')).toHaveText('Enter a phone number with area code.')
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('posts and lands on the sent page', async ({ page }) => {
    await page.goto(URL)
    await page.fill('#qFrom', '92101')
    await page.fill('#qTo', '92024')
    await page.check('#qFlex')
    await page.selectOption('#qLoad', 'parcels')
    await page.fill('#qName', 'E2E NoJS')
    await page.fill('#qPhone', '(619) 555-0100')
    await page.click('#qSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-LOG-\d{6}$/)
    await expect(page.getByRole('heading', { name: 'Request received.' })).toBeVisible()
  })
})

test('no-JS result page: offline mode shows the honest call/email message', async ({ page }) => {
  await page.goto(URL + 'quote/sent?error=offline')
  await expect(page.getByRole('heading', { name: "Couldn't send." })).toBeVisible()
  await expect(page.locator('main')).toContainText("We can't take requests online yet.")
  await expect(page.locator('main')).not.toContainText('Try again')
})

test('JS: a failed send shows a visible message; later announcements are screen-reader only again', async ({ page }) => {
  await page.goto(URL)
  await fillStep1(page)
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Test')
  await page.fill('#qEmail', 'e2e@test.local')
  await page.route(URL, (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()))
  await page.click('#qSend')
  const status = page.locator('#qStatus')
  await expect(status).toHaveText(/^Couldn't send\. Try again/)
  await expect(status).toBeVisible()
  expect(await status.getAttribute('style')).toContain('font-weight')
  await expect(page.locator('#qSend')).toBeEnabled()
  await page.fill('#qName', '')
  await page.click('#qSend')
  await expect(status).toHaveText('1 field needs attention.')
  await expect(status).toHaveClass(/sr-only/)
  expect(await status.getAttribute('style')).toBeNull()
})

test('JS: no answer within 15 s shows the error and re-enables Send', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto(URL)
  await fillStep1(page)
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Test')
  await page.fill('#qEmail', 'e2e@test.local')
  await page.route(URL, (route) => { if (route.request().method() !== 'POST') return route.continue() }) // POST never answered
  await page.click('#qSend')
  await expect(page.locator('#qSend')).toBeDisabled()
  await expect(page.locator('#qStatus')).toHaveText(/^Couldn't send\. Try again/, { timeout: 20_000 })
  await expect(page.locator('#qSend')).toBeEnabled()
  await expect(page.locator('#qSent')).toBeHidden()
})

test('the route section promises a price within two business days', async ({ page }) => {
  await page.goto(URL)
  await expect(page.locator('main')).not.toContainText('one business day')
  await expect(page.locator('main')).toContainText('we reply with a price within two business days')
})
