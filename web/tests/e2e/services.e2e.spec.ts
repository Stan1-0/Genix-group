import { expect, test } from '@playwright/test'

const SITES = {
  logistics: { proto: 'http://localhost:4321/logistics-services.html', home: 'http://logistics.localhost:3000/', homeBar: '/#quote-form', url: 'http://logistics.localhost:3000/services', title: 'Services | Genix Logistics', ids: ['freight', 'moves'], hrefs: ['/contact?kind=business', '/contact?kind=move'] },
  homeupgrades: { proto: 'http://localhost:4321/homeupgrades-services.html', home: 'http://homeupgrades.localhost:3000/', homeBar: '/#quote', url: 'http://homeupgrades.localhost:3000/services', title: 'Services | Genix Home Upgrades', ids: ['accent-walls', 'outdoor', 'handyman', 'reception'], hrefs: ['/contact?project=accent&property=home', '/contact?project=outdoor', '/contact?project=other', '/contact?project=accent&property=business'] },
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

  test(`${site} /services: section stripes alternate and match the prototype`, async ({ page }) => {
    const bgs = async (url: string) => {
      await page.goto(url)
      return page.locator('.svcpage-item').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))
    }
    const app = await bgs(s.url)
    expect(app[0]).not.toBe(app[1])
    if (app.length > 2) expect(app[2]).toBe(app[0])
    expect(await bgs(s.proto)).toEqual(app)
  })

  test(`${site}: the pinned quote bar goes to /contact on /services and stays on the home anchor at home`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    const barHref = async (url: string, y: number) => {
      await page.goto(url)
      await page.evaluate((top) => window.scrollTo(0, top), y)
      const link = page.locator('[data-testid="quote-bar"] a.btn-gold')
      await expect(page.locator('[data-testid="quote-bar"]')).toHaveAttribute('data-off', 'false')
      return link.getAttribute('href')
    }
    expect(await barHref(s.url, 500)).toBe('/contact')
    expect(await barHref(s.home, 1600)).toBe(s.homeBar)
  })

  test(`${site} /services: each service's Get a quote link has its own accessible name`, async ({ page }) => {
    await page.goto(s.url)
    const names = await page.locator('.svcpage-item a.btn').evaluateAll((as) => as.map((a) => (a.textContent ?? '').replace(/\s+/g, ' ').trim()))
    expect(new Set(names).size).toBe(names.length)
    names.forEach((n) => expect(n).toMatch(/^Get a quote for .+ →$/))
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
