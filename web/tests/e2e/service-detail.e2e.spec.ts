import { expect, test } from '@playwright/test'

const BASE = 'http://homeupgrades.localhost:3000/services'
const PAGES = {
  'accent-walls': { title: 'Accent walls & TV units', seo: 'Accent Walls & Custom TV Units in California', project: 'accent', property: 'home' },
  outdoor: { title: 'Outdoor builds', seo: 'Decks, Patios & Pergolas in California', project: 'outdoor', property: null },
  handyman: { title: 'Handyman services', seo: 'Handyman & TV Wall Mounting in California', project: 'other', property: null },
  reception: { title: 'Accent walls for reception areas', seo: 'Reception Accent Walls for Businesses in California', project: 'accent', property: 'business' },
} as const

for (const [slug, p] of Object.entries(PAGES)) {
  test(`${slug}: hero, fit cards, process, FAQs, form pre-selected, more services, metadata`, async ({ page }) => {
    await page.goto(`${BASE}/${slug}`)
    await expect(page.locator('h1')).toHaveText(p.title)
    await expect(page.locator('.svcd-crumbs a')).toHaveText(['Home', 'Services'])
    await expect(page.locator('.svcd-cards li')).toHaveCount(3)
    await expect(page.locator('.svcd-process .step')).toHaveCount(4)
    await expect(page.locator(`input[name="project"][value="${p.project}"]`)).toBeChecked()
    if (p.property) await expect(page.locator(`input[name="property"][value="${p.property}"]`)).toBeChecked()
    const more = await page.locator('.svcd-more a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(more).toHaveLength(3)
    expect(more).not.toContain(`/services/${slug}`)
    expect(await page.title()).toBe(`${p.seo} | Genix Home Upgrades`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}/${slug}`)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.some((t) => t.includes('"FAQPage"') && t.includes('"BreadcrumbList"'))).toBe(true)
    await expect(page.locator('main')).not.toContainText(/\bfree\b/i)
  })
}

test('FAQs open and close with the keyboard', async ({ page }) => {
  await page.goto(`${BASE}/handyman`)
  const first = page.locator('.svcd-faq details').first()
  await first.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(first).toHaveAttribute('open', '')
  await page.keyboard.press('Enter')
  await expect(first).not.toHaveAttribute('open', '')
})

test('Get a quote goes to the form on the page', async ({ page }) => {
  await page.goto(`${BASE}/outdoor`)
  await page.locator('.hero-actions a.btn-gold').click()
  await expect(page).toHaveURL(`${BASE}/outdoor#hu-quote-form`)
  await expect(page.locator('#hu-quote-form')).toBeInViewport()
})

test('phone: Get a quote lands on the form, below the sticky header', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(`${BASE}/handyman`)
  await page.locator('.hero-actions a.btn-gold').click()
  const form = page.locator('#hu-quote-form')
  await expect(form).toBeInViewport()
  await expect(async () => {
    const top = await form.evaluate((el) => el.getBoundingClientRect().top)
    const headerBottom = await page.locator('header').first().evaluate((el) => el.getBoundingClientRect().bottom)
    expect(top).toBeGreaterThanOrEqual(headerBottom)
  }).toPass()
})

test('a request sent from a detail page (no JS) becomes a Home Upgrades inquiry', async ({ browser }) => {
  const page = await (await browser.newContext({ javaScriptEnabled: false })).newPage()
  await page.goto(`${BASE}/handyman`)
  await page.check('input[name="property"][value="home"]')
  await page.check('input[name="timing"][value="soon"]')
  await page.fill('#hqZip', '92101')
  await page.fill('#hqNotes', 'Detail page e2e: hang two shelves and mount a TV')
  await page.fill('#hqName', 'E2E Service Detail')
  await page.fill('#hqPhone', '(619) 555-0100')
  await page.click('#hqSend')
  await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUP-\d{6}$/)
  await page.context().close()
})

for (const url of [`${BASE}/unknown`, `${BASE}/Outdoor`, 'http://logistics.localhost:3000/services/outdoor', 'http://homeupgrades.localhost:3000/services/freight', 'http://localhost:3000/services/moves', 'http://localhost:3000/services/outdoor', 'http://multimedia.localhost:3000/services/outdoor']) {
  test(`${url} is a 404`, async ({ page }) => {
    const res = await page.goto(url)
    expect(res?.status()).toBe(404)
  })
}

test('phone: no sideways scroll at 320 px and the pinned bar goes to the page form', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(`${BASE}/accent-walls`)
  await page.mouse.wheel(0, 1200)
  await expect(page.getByTestId('quote-bar').locator('a.btn-gold')).toHaveAttribute('href', '#hu-quote-form')
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

const LOG = 'http://logistics.localhost:3000/services'
const LOG_PAGES = {
  freight: { title: 'Freight & deliveries', seo: 'Freight, Pallet & Courier Delivery from San Diego', quote: '/contact?kind=business', other: '/services/moves' },
  moves: { title: 'Home & office moves', seo: 'Home & Office Movers in San Diego', quote: '/contact?kind=move', other: '/services/freight' },
} as const

for (const [slug, p] of Object.entries(LOG_PAGES)) {
  test(`logistics ${slug}: own page with search title, quote link, FAQs and Service JSON-LD`, async ({ page }) => {
    const res = await page.goto(`${LOG}/${slug}`)
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('data-site', 'logistics')
    await expect(page.locator('h1')).toHaveText(p.title)
    expect(await page.title()).toBe(`${p.seo} | Genix Logistics`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${LOG}/${slug}`)
    await expect(page.locator('.promises li')).toHaveCount(3)
    await expect(page.locator('.faq-list details')).toHaveCount(3)
    await expect(page.locator(`main a[href="${p.quote}"]`).first()).toBeVisible()
    await expect(page.locator(`main a[href="${p.other}"]`)).toHaveCount(1)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.some((t) => t.includes('"Service"') && t.includes('"Genix Logistics"') && t.includes('"FAQPage"'))).toBe(true)
  })
}

test('the Logistics services page links each service to its own page', async ({ page }) => {
  await page.goto(LOG)
  for (const slug of Object.keys(LOG_PAGES)) await expect(page.locator(`a.svcpage-more[href="/services/${slug}"]`)).toHaveCount(1)
})
