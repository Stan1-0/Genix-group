import { expect, test } from '@playwright/test'
import { expectBasics, settled, watchPage } from './basics'

/* Ported from design/tests/test_logistics.py: t_structure and t_nojs (one check -> one expect). */
const URL = 'http://logistics.localhost:3000/'

for (const [label, viewport, mobile] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
] as const) {
  test.describe(`structure (${label})`, () => {
    test.use({ viewport, isMobile: mobile, hasTouch: mobile })

    test('basics', async ({ page }) => {
      const seen = watchPage(page)
      await page.goto(URL, { waitUntil: 'load' })
      await settled(page)
      await expectBasics(page, seen)
    })

    if (mobile) {
      test('service lanes swipe sideways', async ({ page }) => {
        await page.goto(URL)
        const g = await page.evaluate(() => {
          const el = document.querySelector('.lane-grid')!
          return [el.scrollWidth, el.clientWidth]
        })
        expect(g[0]).toBeGreaterThan(g[1])
      })
    } else {
      test('title', async ({ page }) => {
        await page.goto(URL)
        expect(await page.title()).toBe('Genix Logistics | Reliable Freight. Real People. On Time, Every Time.')
      })

      test('division theme', async ({ page }) => {
        await page.goto(URL)
        await expect(page.locator('html[data-site="logistics"]')).toHaveCount(1)
      })

      test('section order', async ({ page }) => {
        await page.goto(URL)
        const ids = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => s.id))
        expect(ids).toEqual(['hero', 'services', 'how', 'areas', 'why', 'faq', 'quote'])
      })

      test('display type is Archivo 900 uppercase', async ({ page }) => {
        await page.goto(URL)
        const font = await page.evaluate(async () => {
          await document.fonts.ready
          const h = getComputedStyle(document.querySelector('h1')!)
          return [h.fontFamily, h.fontWeight, h.textTransform, document.fonts.check('900 40px Archivo')]
        })
        expect(String(font[0])).toContain('Archivo')
        expect(font[1]).toBe('900')
        expect(font[2]).toBe('uppercase')
        expect(font[3]).toBe(true)
      })

      test('favicons respond 200', async ({ page }) => {
        await page.goto(URL)
        const icons = await page.evaluate(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel~=icon], link[rel=apple-touch-icon]')].map((l) => l.href))
        expect(icons.length).toBeGreaterThan(0)
        // Fetched from the page: Node's resolver does not know *.localhost.
        for (const href of icons) expect(await page.evaluate(async (u) => (await fetch(u)).status, href), href).toBe(200)
      })

      test('hero is brand navy', async ({ page }) => {
        await page.goto(URL)
        expect(await page.evaluate(() => getComputedStyle(document.getElementById('hero')!).backgroundColor)).toBe('rgb(2, 34, 72)')
      })

      test('gold lane marking divides sections', async ({ page }) => {
        await page.goto(URL)
        const lane = await page.evaluate(() => getComputedStyle(document.getElementById('areas')!, '::before').backgroundImage)
        expect(lane).toContain('repeating-linear-gradient')
      })

      test('no unconfirmed insurance/licensing claim', async ({ page }) => {
        await page.goto(URL)
        const text = (await page.evaluate(() => document.body.innerText.toLowerCase())).replace('are loads insured', '')
        expect(text).not.toContain('insured')
        expect(text).not.toContain('licensed')
      })
    }
  })
}

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
  })

  test('both form steps visible', async ({ page }) => {
    await expect(page.locator('#qFrom')).toBeVisible()
    await expect(page.locator('#qName')).toBeVisible()
  })
  test('Continue and Back hidden (they need JS)', async ({ page }) => {
    await expect(page.locator('#qNext')).toBeHidden()
    await expect(page.locator('#qBack')).toBeHidden()
  })
  test('both kinds of load listed', async ({ page }) => {
    await expect(page.locator('#qLoad optgroup')).toHaveCount(2)
  })
  test('Send is available', async ({ page }) => {
    await expect(page.locator('#qSend')).toBeVisible()
  })
  test('headline visible', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
  })
  test('form keeps native validation', async ({ page }) => {
    expect(await page.getAttribute('#quote-form', 'novalidate')).toBeNull()
  })
  test('ZIP has a native 5-digit pattern', async ({ page }) => {
    expect(await page.getAttribute('#qFrom', 'pattern')).toBe('[0-9]{5}')
  })
  test('pallets field is visible without JS', async ({ page }) => {
    await expect(page.locator('#qPallets')).toBeVisible()
  })
})
