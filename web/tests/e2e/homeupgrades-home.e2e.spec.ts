import { expect, test } from '@playwright/test'
import { expectBasics, settled, watchPage } from './basics'

/* Ported from design/tests/test_hu.py (structure, tap targets, reduced motion, no-JS) and the Home Upgrades
   parts of test_shared.py (sideways swipe). One check -> one expect. The slider, project viewer, process line
   and Lenis checks belong to the enhancer tasks; the pinned quote bar is in chrome.e2e.spec.ts. */
const URL = 'http://homeupgrades.localhost:3000/'

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

    test('placeholders are visibly marked', async ({ page }) => {
      await page.goto(URL)
      // Three placeholders when no phone is set ([service area] + two Call buttons); with a phone the Call ones are real.
      const hasPhone = (await page.locator('a[href^="tel:"]:not([href="tel:+10000000000"])').count()) > 0
      expect(await page.locator('.ph').count()).toBeGreaterThanOrEqual(hasPhone ? 1 : 3)
    })

    if (mobile) {
      test('before/after is on the first screen', async ({ page }) => {
        await page.goto(URL)
        expect(await page.evaluate(() => document.getElementById('ba')!.getBoundingClientRect().bottom <= innerHeight)).toBe(true)
      })

      test('services swipe sideways', async ({ page }) => {
        await page.goto(URL)
        const g = await page.evaluate(() => {
          const el = document.querySelector('.svc-grid')!
          return [el.scrollWidth, el.clientWidth, getComputedStyle(el).gridAutoFlow]
        })
        expect(g[0]).toBeGreaterThan(g[1] as number)
        expect(g[2]).toBe('column')
      })

      test('tap targets are at least 40px', async ({ page }) => {
        await page.goto(URL, { waitUntil: 'load' })
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('a, button, [role=slider]')]
            .filter((e) => {
              const r = e.getBoundingClientRect(), s = getComputedStyle(e)
              return r.width && r.height && s.display !== 'none' && s.visibility !== 'hidden' && r.height < 40 && !e.closest('.site-footer, p') && !e.matches('.sr-only') /* the skip link only shows on focus */
            })
            .map((e) => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().height)}`),
        )
        expect(small).toEqual([])
      })
    } else {
      test('title', async ({ page }) => {
        await page.goto(URL)
        expect(await page.title()).toBe('Genix Home Upgrades | From Blueprint to Beautiful.')
      })

      test('division theme', async ({ page }) => {
        await page.goto(URL)
        await expect(page.locator('html[data-site="homeupgrades"]')).toHaveCount(1)
      })

      test('section order', async ({ page }) => {
        await page.goto(URL)
        const ids = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => s.id))
        expect(ids).toEqual(['', 'services', 'work', 'build', 'process', 'quote'])
      })

      test('favicons respond 200', async ({ page }) => {
        await page.goto(URL)
        const icons = await page.evaluate(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel~=icon], link[rel=apple-touch-icon]')].map((l) => l.href))
        expect(icons.length).toBeGreaterThan(0)
        // Fetched from the page: Node's resolver does not know *.localhost.
        for (const href of icons) expect(await page.evaluate(async (u) => (await fetch(u)).status, href), href).toBe(200)
      })

      test('hero headline is at most 3 lines', async ({ page }) => {
        await page.goto(URL, { waitUntil: 'load' })
        const lines = await page.evaluate(() => {
          const h = document.querySelector('.hero h1') as HTMLElement
          return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight))
        })
        expect(lines).toBeGreaterThan(0)
        expect(lines).toBeLessThanOrEqual(3)
      })

      test('recent-work cards line up', async ({ page }) => {
        await page.goto(URL, { waitUntil: 'load' })
        const hs = await page.evaluate(() => [...document.querySelectorAll('.work-grid > *')].map((e) => Math.round(e.getBoundingClientRect().height)))
        expect(new Set(hs).size).toBe(1)
      })

      test('keyboard focus is visible', async ({ page }) => {
        await page.goto(URL, { waitUntil: 'load' })
        await page.keyboard.press('Tab')
        expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toMatch(/^(none|)$/)
      })
    }
  })
}

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1280, height: 800 }, contextOptions: { reducedMotion: 'reduce' } })

  test('all content visible', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await settled(page)
    const hidden = await page.evaluate(
      () => [...document.querySelectorAll('[data-reveal], [data-split]')].filter((e) => getComputedStyle(e).opacity === '0' || getComputedStyle(e).visibility === 'hidden').length,
    )
    expect(hidden).toBe(0)
  })

  test('slider stays at 50%', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForTimeout(1000)
    expect(await page.getAttribute('#baHandle', 'aria-valuenow')).toBe('50')
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
  })

  test('headline readable', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
  })
  test('slider images readable', async ({ page }) => {
    await expect(page.locator('.ba img').first()).toBeVisible()
  })
  test('process section readable', async ({ page }) => {
    await expect(page.locator('#process h2')).toBeVisible()
  })
  test('slider shows a 50/50 split', async ({ page }) => {
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('ba')!).getPropertyValue('--pos'))).toContain('50%')
  })
})
