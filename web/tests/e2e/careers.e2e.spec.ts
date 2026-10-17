import { expect, test } from '@playwright/test'

const LOG = 'http://logistics.localhost:3000'
const JOB = `${LOG}/careers/box-truck-driver`

async function fill(page: import('@playwright/test').Page, name: string) {
  await page.fill('#aName', name)
  await page.fill('#aPhone', '(619) 555-0199')
  for (const [id, v] of [['#aLicense', 'class-c'], ['#aExperience', '1-2'], ['#aRecord', 'yes'], ['#aAvailability', 'full-time'], ['#aSource', 'craigslist']]) await page.selectOption(id, v)
}

test('careers lists the open job and links to it', async ({ page }) => {
  const res = await page.goto(`${LOG}/careers`)
  expect(res?.status()).toBe(200)
  expect(await page.title()).toBe('Driver Jobs in San Diego | Genix Logistics')
  await expect(page.locator('#box-truck-driver h2')).toHaveText('Box Truck Driver')
  await expect(page.locator('#box-truck-driver')).toContainText('$22–$26 an hour')
  await expect(page.locator('a[href="/careers/box-truck-driver"]')).toHaveCount(1)
  await expect(page.locator('footer a', { hasText: 'Careers' })).toHaveAttribute('href', '/careers')
})

test('the job page shows pay, a JobPosting and the application form', async ({ page }) => {
  await page.goto(JOB)
  await expect(page.locator('h1')).toHaveText('Box Truck Driver')
  expect(await page.title()).toBe('Box Truck Driver Job in San Diego ($22–$26 an hour) | Genix Logistics')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', JOB)
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).find((d) => d['@type'] === 'JobPosting')
  expect(ld).toMatchObject({ title: 'Box Truck Driver', hiringOrganization: { name: 'Genix Logistics' }, baseSalary: { value: { minValue: 22, maxValue: 26, unitText: 'HOUR' } } })
  await expect(page.locator('#apply-form')).toHaveAttribute('action', '/careers/apply')
  await expect(page.locator('#apply-form')).not.toContainText(/convict|felony|criminal/i)
})

for (const js of [true, false]) {
  test.describe(`applying (JS ${js ? 'on' : 'off'})`, () => {
    test.use({ javaScriptEnabled: js })
    test('lands on the confirmation with a reference', async ({ page }) => {
      await page.goto(JOB)
      await fill(page, js ? 'E2E Driver JS' : 'E2E Driver')
      await Promise.all([page.waitForURL(/\/careers\/sent\?ref=GX-LOG-\d{6}$/), page.click('#apply-form button[type=submit]')])
      await expect(page.locator('h1')).toHaveText('Application received.')
      await expect(page.locator('html')).toHaveAttribute('data-site', 'logistics')
    })
  })
}

for (const url of [`${LOG}/careers/no-such-job`, 'http://homeupgrades.localhost:3000/careers', 'http://localhost:3000/careers', 'http://localhost:3000/careers/box-truck-driver']) {
  test(`${url} is a 404`, async ({ page }) => {
    expect((await page.goto(url))?.status()).toBe(404)
  })
}
