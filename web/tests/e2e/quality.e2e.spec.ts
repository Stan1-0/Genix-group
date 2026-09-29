import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const HOMES = ['http://logistics.localhost:3000/', 'http://homeupgrades.localhost:3000/', 'http://localhost:3000/']

for (const url of HOMES) {
  test(`${url}: no console errors or failed requests`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
    page.on('requestfailed', (r) => r.failure()?.errorText !== 'net::ERR_ABORTED' && problems.push(`${r.url()} ${r.failure()?.errorText}`))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } })
    expect(problems).toEqual([])
  })

  test(`${url}: no axe violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(url, { waitUntil: 'networkidle' })
    // Logistics: the quote form's step 2 is hidden by its client enhancer; scan only once that has run.
    const step2 = page.locator('fieldset[data-step="2"]')
    if (await step2.count()) await expect(step2).toBeHidden()
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
}
