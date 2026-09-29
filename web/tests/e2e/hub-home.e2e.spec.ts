import { expect, test } from '@playwright/test'
import { expectBasics, settled, watchPage } from './basics'

/* Ported from design/tests/test_reel.py, test_dock.py and the hub part of test_split.py: the structure, no-JS and
   reduced-motion checks that need no motion. The reel, dock and headline-split behaviour is tested with Task 11.
   One check -> one expect. */
const URL = 'http://localhost:3000/'
const TITLE = 'The Genix Group | We Haul It. We Build It. We Show It.'

for (const [label, viewport, mobile] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
] as const) {
  test.describe(`structure (${label})`, () => {
    test.use({ viewport, isMobile: mobile, hasTouch: mobile, contextOptions: { reducedMotion: 'reduce' } })

    test('basics', async ({ page }) => {
      const seen = watchPage(page)
      await page.goto(URL, { waitUntil: 'load' })
      await settled(page)
      await expectBasics(page, seen)
    })

    test('title', async ({ page }) => {
      await page.goto(URL)
      await expect(page).toHaveTitle(TITLE)
    })

    test('section order', async ({ page }) => {
      await page.goto(URL)
      const ids = await page.evaluate(() => [...document.querySelectorAll('main > section, main > div > section')].map((s) => s.id))
      expect(ids).toEqual(['hero', 'about', 'div-move', 'div-make', 'div-tell', 'contact'])
    })

    test('every button has a name', async ({ page }) => {
      await page.goto(URL)
      const unnamed = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !(b.getAttribute('aria-label') || b.textContent!.trim())).length)
      expect(unnamed).toBe(0)
    })

    test('hero logo is the supplied artwork, untransformed', async ({ page }) => {
      await page.goto(URL)
      const logo = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLImageElement>('.lockup img')].map((i) => ({ src: i.getAttribute('src'), filter: getComputedStyle(i).filter, t: getComputedStyle(i).transform })),
      )
      expect(logo.every((l) => l.filter === 'none' && ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(l.t))).toBe(true)
      expect(logo.map((l) => l.src)).toEqual(['/brand/genix-mark.svg', '/brand/genix-wordmark.svg'])
    })

    test('reel is on the first screen', async ({ page }) => {
      await page.goto(URL)
      const box = (await page.locator('.reel-frame').boundingBox())!
      // On a phone the reel sits below the logo and headline (order asserted by the prototype); desktop shows it whole.
      if (!mobile) expect(box.y + box.height).toBeLessThanOrEqual(900)
      else expect(box.width).toBeGreaterThan(300)
    })

    test('reel opens on real Home Upgrades work', async ({ page }) => {
      await page.goto(URL)
      expect(await page.evaluate(() => document.querySelector<HTMLElement>('.reel .slide.on')!.dataset.name)).toBe('Home Upgrades')
    })

    test('only the active caption shows', async ({ page }) => {
      await page.goto(URL)
      const caps = await page.evaluate(() => [...document.querySelectorAll('.reel .slide')].map((s) => +getComputedStyle(s.querySelector('.reel-cap')!).opacity))
      expect(caps.filter((c) => c > 0.05)).toHaveLength(1)
    })

    test('route cards link to each division', async ({ page }) => {
      await page.goto(URL)
      const hrefs = await page.$$eval('.option', (els) => els.map((e) => e.getAttribute('href')!))
      expect(hrefs.map((h) => h.replace(/^https?:\/\/([a-z]+)\..*?(\/contact)$/, '$1$2'))).toEqual(['logistics/contact', 'homeupgrades/contact', 'multimedia/contact'])
    })

    test('Logistics panel uses the new tagline', async ({ page }) => {
      await page.goto(URL)
      await expect(page.locator('#div-move .lead')).toHaveText('Reliable Freight. Real People. On Time, Every Time.')
    })

    test('gold words keep their gold', async ({ page }) => {
      await page.goto(URL)
      const gold = await page.$$eval('.hero h1 .gold', (els) => els.map((e) => getComputedStyle(e).color))
      expect(gold).toEqual(['rgb(168, 116, 26)'])
    })

    test('headline reads the whole sentence', async ({ page }) => {
      await page.goto(URL)
      expect((await page.locator('.hero h1').textContent())!.replace(/\s+/g, ' ').trim()).toBe('We Haul It. We Build It. We Show It.')
    })

    test('headline is visible under reduced motion, not split', async ({ page }) => {
      await page.goto(URL)
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.hero h1')!).visibility)).toBe('visible')
    })

    test('all content visible under reduced motion', async ({ page }) => {
      await page.goto(URL)
      const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity === '0').length)
      expect(hidden).toBe(0)
    })

    test('no video autoplays under reduced motion', async ({ page }) => {
      await page.goto(URL)
      await page.waitForTimeout(500)
      expect(await page.evaluate(() => [...document.querySelectorAll('video')].every((v) => v.paused))).toBe(true)
    })

    test('at the top only the hero logo shows', async ({ page }) => {
      await page.goto(URL)
      await settled(page)
      const state = await page.evaluate(() => ({
        lock: getComputedStyle(document.querySelector('.lockup')!).visibility,
        head: getComputedStyle(document.querySelector('.site-header .logo')!).visibility,
      }))
      expect(state).toEqual({ lock: 'visible', head: 'hidden' })
    })
  })
}

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
  })

  test('headline visible', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
  })
  test('reel photo visible', async ({ page }) => {
    await expect(page.locator('.slide.on img')).toBeVisible()
  })
  test('panels readable', async ({ page }) => {
    await expect(page.locator('#div-make h3')).toBeVisible()
  })
  test('header logo and hero logo both visible', async ({ page }) => {
    await expect(page.locator('.site-header .logo')).toBeVisible()
    await expect(page.locator('.lockup')).toBeVisible()
  })
})
