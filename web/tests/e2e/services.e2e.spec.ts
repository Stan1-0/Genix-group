import { expect, test } from '@playwright/test'

const SITES = {
  logistics: { url: 'http://logistics.localhost:3000/services', title: 'Services | Genix Logistics', ids: ['freight', 'moves'], hrefs: ['/contact?kind=business', '/contact?kind=move'] },
  homeupgrades: { url: 'http://homeupgrades.localhost:3000/services', title: 'Services | Genix Home Upgrades', ids: ['accent-walls', 'outdoor', 'handyman', 'reception'], hrefs: ['/contact?project=accent&property=home', '/contact?project=outdoor', '/contact?project=other', '/contact?project=accent&property=business'] },
} as const

for (const [site, s] of Object.entries(SITES)) {
  test(`${site} /services: sections, quote links, metadata, JSON-LD`, async ({ page }) => {
    await page.goto(s.url)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(await page.locator('.svcpage-item').evaluateAll((els) => els.map((e) => e.id))).toEqual([...s.ids])
    expect(await page.locator('.svcpage-item a.btn').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([...s.hrefs])
    await expect(page.locator('#quoting a.btn')).toHaveAttribute('href', '/contact')
    await expect(page.locator('main#main')).toHaveCount(1)
    expect(await page.title()).toBe(s.title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', s.url)
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.some((t) => t.includes('"ItemList"') && t.includes('"Service"'))).toBe(true)
    await expect(page.locator('main')).not.toContainText('Renovation')
  })

  test(`${site} /services: a Get a quote button lands on the form with the choice made`, async ({ page }) => {
    await page.goto(s.url)
    await page.locator('.svcpage-item a.btn').last().click()
    await expect(page).toHaveURL(new RegExp(`/contact\\?`))
    if (site === 'logistics') await expect(page.locator('input[name="kind"][value="move"]')).toBeChecked()
    else {
      await expect(page.locator('input[name="project"][value="accent"]')).toBeChecked()
      await expect(page.locator('input[name="property"][value="business"]')).toBeChecked()
    }
  })

  test(`${site} /services: no sideways scroll at 320 px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(s.url)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
}

for (const host of ['localhost:3000', 'multimedia.localhost:3000']) {
  test(`${host}/services is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}/services`)
    expect(res?.status()).toBe(404)
  })
}
