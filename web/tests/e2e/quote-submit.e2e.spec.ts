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
