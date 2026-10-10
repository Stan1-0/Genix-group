import { expect, test } from '@playwright/test'

const LOG = 'http://logistics.localhost:3000/contact'
const HU = 'http://homeupgrades.localhost:3000/contact'

test('Logistics ?kind=move checks Plan a move and shows the move load options', async ({ page }) => {
  await page.goto(`${LOG}?kind=move`)
  await expect(page.locator('input[name="kind"][value="move"]')).toBeChecked()
  await page.waitForFunction(() => 'genixQuote' in window) // the enhancer has started
  const options = await page.locator('#qLoad option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean))
  expect(options).toEqual(['studio', '1-2bed', '3bed', 'office'])
})

test('Logistics junk or repeated kind falls back to the default', async ({ page }) => {
  for (const q of ['kind=truck', 'kind=move&kind=business', 'kind=%3Cscript%3Ealert(1)%3C/script%3E']) {
    await page.goto(`${LOG}?${q}`)
    await expect(page.locator('input[name="kind"][value="business"]')).toBeChecked()
    expect(await page.content()).not.toContain('<script>alert(1)')
  }
})

test('Home Upgrades ?project and ?property check those pills', async ({ page }) => {
  await page.goto(`${HU}?project=accent&property=business`)
  await expect(page.locator('input[name="project"][value="accent"]')).toBeChecked()
  await expect(page.locator('input[name="property"][value="business"]')).toBeChecked()
  await page.goto(`${HU}?project=outdoor`)
  await expect(page.locator('input[name="project"][value="outdoor"]')).toBeChecked()
  await expect(page.locator('input[name="property"]:checked')).toHaveCount(0)
  await page.goto(`${HU}?project=renovation`)
  await expect(page.locator('input[name="project"]:checked')).toHaveCount(0)
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('pre-selection is in the server HTML', async ({ page }) => {
    await page.goto(`${LOG}?kind=move`)
    await expect(page.locator('input[name="kind"][value="move"]')).toBeChecked()
    await page.goto(`${HU}?project=other`)
    await expect(page.locator('input[name="project"][value="other"]')).toBeChecked()
  })
})
