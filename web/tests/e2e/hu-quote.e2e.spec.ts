import { expect, test, type Page } from '@playwright/test'

// Dev server runs in "preview" mode. Cloudinary is never contacted: /uploads and the upload are mocked per test.
const URL = 'http://homeupgrades.localhost:3000/'
const IMG = { name: 'wall.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]) }

async function step1(page: Page) {
  await page.locator('#hu-quote-form').getByLabel('Accent wall & TV unit').check()
  await page.locator('#hu-quote-form').getByLabel('Home', { exact: true }).check()
  await page.locator('#hu-quote-form').getByLabel('In 1–3 months').check()
  await page.fill('#hqZip', '92101')
  await page.click('#hqNext')
}
async function step2(page: Page) {
  await page.fill('#hqNotes', 'Living room wall, about 4 m wide.')
  await page.fill('#hqName', 'E2E HU')
  await page.fill('#hqEmail', 'e2e-hu@test.local')
}
async function mockUploads(page: Page, opts: { failUpload?: boolean; slowMs?: number } = {}) {
  let n = 0
  await page.route('**/uploads', (r) => r.fulfill({ json: { uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload', publicId: `genix-inquiries/${'x'.repeat(23)}${n++}`, fields: { api_key: '1', timestamp: '1', signature: 'a'.repeat(40), public_id: 'p', type: 'authenticated' } } }))
  await page.route('https://api.cloudinary.com/**', async (r) => {
    if (opts.slowMs) await new Promise((res) => setTimeout(res, opts.slowMs))
    if (opts.failUpload) return r.fulfill({ status: 500, json: { error: { message: 'down' } } })
    return r.fulfill({ json: { public_id: 'p', secure_url: 'https://res.cloudinary.com/demo/x.jpg', bytes: 8, format: 'jpg' } })
  })
}

test('picks pills, sends, gets a GX-HUP reference', async ({ page }) => {
  await page.goto(URL + '#quote')
  await page.waitForTimeout(2200)
  await step1(page)
  await step2(page)
  await page.click('#hqSend')
  await expect(page.locator('#hqSent')).toBeVisible()
  await expect(page.locator('#hqRef')).toHaveText(/^GX-HUP-\d{6}$/)
  await expect(page.locator('#hqSent')).toContainText('Forgot a photo?')
})

test('step 1 errors use the exact messages', async ({ page }) => {
  await page.goto(URL + '#quote')
  await page.click('#hqNext')
  await expect(page.locator('#hqProjectErr')).toHaveText("Choose what we're building.")
  await expect(page.locator('#hqPropertyErr')).toHaveText('Choose home or business.')
  await expect(page.locator('#hqTimingErr')).toHaveText("Choose when you'd like to start.")
  await expect(page.locator('#hqZipErr')).toHaveText('Enter a 5-digit ZIP code.')
})

test('best time to call appears only with a phone', async ({ page }) => {
  await page.goto(URL + '#quote')
  await page.waitForTimeout(2200) // let the section's reveal settle before clicking pills
  await step1(page)
  await expect(page.locator('#hqCallTime')).toBeHidden()
  await page.fill('#hqPhone', '(619) 555-0100')
  await expect(page.locator('#hqCallTime')).toBeVisible()
  await page.fill('#hqPhone', '')
  await expect(page.locator('#hqCallTime')).toBeHidden()
})

test.describe('photos (Cloudinary mocked)', () => {
  test.skip(!process.env.E2E_PHOTOS, 'set E2E_PHOTOS=1 with CLOUDINARY_* test values in the dev server env to run')

  test('add then remove: the removed photo is not sent', async ({ page }) => {
    await mockUploads(page)
    await page.goto(URL + '#quote')
    await page.waitForTimeout(2200)
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [IMG, { ...IMG, name: 'b.jpg' }])
    await expect(page.locator('#hqPhotoList input[name="photos"]')).toHaveCount(2)
    await page.locator('#hqPhotoList button').first().click()
    await expect(page.locator('#hqPhotoList input[name="photos"]')).toHaveCount(1)
  })
  test('a failed upload shows a message and the form still sends', async ({ page }) => {
    await mockUploads(page, { failUpload: true })
    await page.goto(URL + '#quote')
    await page.waitForTimeout(2200)
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [IMG])
    await expect(page.locator('#hqPhotosErr')).toHaveText("That photo didn't upload. Try again, or send without it.")
    await expect(page.locator('#hqPhotoList [data-state="uploading"]')).toHaveCount(0)
    await step2(page)
    await page.click('#hqSend')
    await expect(page.locator('#hqSent')).toBeVisible()
  })
  test('Send waits for an upload in progress', async ({ page }) => {
    await mockUploads(page, { slowMs: 1500 })
    await page.goto(URL + '#quote')
    await page.waitForTimeout(2200)
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [IMG])
    await step2(page)
    await page.click('#hqSend')
    await expect(page.locator('#hqSend')).toContainText('Uploading photos…')
    await expect(page.locator('#hqSent')).toBeVisible({ timeout: 15_000 })
  })
  test('without AbortSignal.timeout, a grant that never answers still gives up', async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true }) })
    await page.route('**/uploads', () => {}) // never answers
    await page.goto(URL + '#quote')
    await page.waitForTimeout(2200)
    await step1(page)
    await page.clock.install()
    await page.setInputFiles('#hqPhotoInput', [IMG])
    await expect(page.locator('#hqPhotoList [data-state="uploading"]')).toHaveCount(1)
    await page.clock.runFor(16_000) // past GRANT_TIMEOUT_MS
    await expect(page.locator('#hqPhotosErr')).toHaveText("That photo didn't upload. Try again, or send without it.")
    await expect(page.locator('#hqPhotoList [data-state="uploading"]')).toHaveCount(0)
  })
  test('refuses a 6th photo, a PDF and a huge file before uploading', async ({ page }) => {
    let grants = 0
    await mockUploads(page)
    page.on('request', (r) => { if (r.url().endsWith('/uploads')) grants++ })
    await page.goto(URL + '#quote')
    await page.waitForTimeout(2200)
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') }])
    await expect(page.locator('#hqPhotosErr')).toHaveText('Only JPG, PNG, WebP or HEIC photos.')
    await page.setInputFiles('#hqPhotoInput', [{ name: 'big.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10_485_761) }])
    await expect(page.locator('#hqPhotosErr')).toHaveText('Photos must be 10 MB or smaller.')
    await page.setInputFiles('#hqPhotoInput', Array.from({ length: 6 }, (_, i) => ({ ...IMG, name: `${i}.jpg` })))
    await expect(page.locator('#hqPhotosErr')).toHaveText('You can add up to 5 photos.')
    await expect(page.locator('#hqPhotoList input[name="photos"]')).toHaveCount(5)
    expect(grants).toBe(5)
  })
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('both steps visible; posts and lands on the sent page', async ({ page }) => {
    await page.goto(URL + '#quote')
    await expect(page.locator('#hu-quote-form [data-photos]')).toBeHidden() // the photo block (the form itself carries data-photos="on|off")
    await page.locator('#hu-quote-form').getByLabel('Outdoor build').check()
    await page.locator('#hu-quote-form').getByLabel('Business').check()
    await page.locator('#hu-quote-form').getByLabel('Just planning').check()
    await page.fill('#hqZip', '92024')
    await page.fill('#hqNotes', 'Deck for the back patio, roughly 20 by 12 feet.')
    await page.fill('#hqName', 'E2E NoJS HU')
    await page.fill('#hqPhone', '(619) 555-0100')
    await page.click('#hqSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUP-\d{6}(#quote)?$/) // a redirect keeps the page's #quote fragment
  })
})
