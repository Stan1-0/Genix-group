import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const HOMES = ['http://logistics.localhost:3000/', 'http://homeupgrades.localhost:3000/', 'http://localhost:3000/']

for (const url of HOMES) {
  test(`${url}: no console errors or failed requests`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
    // Aborted requests are the browser cancelling its own work (the hub reel's video range request when it
    // pauses or scrolls away), not failures; basics.ts exempts them the same way.
    page.on('requestfailed', (r) => r.failure()?.errorText !== 'net::ERR_ABORTED' && problems.push(`${r.url()} ${r.failure()?.errorText}`))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } })
    expect(problems).toEqual([])
  })

  test(`${url}: no axe violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(url, { waitUntil: 'networkidle' })
    // Before JS runs, the Logistics quote form shows step 2, whose ghost `#qBack` button (white on the light
    // card) fails color-contrast. The prototype has the same markup and the same pre-JS state (an inherited
    // design issue, reported to the owner), so scan only once the enhancer has hidden step 2.
    if (url.startsWith('http://logistics.')) await expect(page.locator('fieldset[data-step="2"]')).toBeHidden()
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
}
