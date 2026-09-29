import { expect, test } from '@playwright/test'
import { expectBasics, settled, watchPage } from './basics'

/* Ported from design/tests/test_reel.py, test_dock.py and the hub part of test_split.py: the structure, no-JS and
   reduced-motion checks that need no motion (the motion checks are in the second half of this file).
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
    })

    test('hero logo files are the mark and wordmark', async ({ page }) => {
      await page.goto(URL)
      expect(await page.$$eval('.lockup img', (els) => els.map((i) => i.getAttribute('src')))).toEqual(['/brand/genix-mark.svg', '/brand/genix-wordmark.svg'])
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

    test('headline is visible under reduced motion', async ({ page }) => {
      await page.goto(URL)
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.hero h1')!).visibility)).toBe('visible')
    })

    test('headline is not split under reduced motion', async ({ page }) => {
      await page.goto(URL)
      // Only the gold span is a child element; SplitText would add line wrappers.
      expect(await page.$$eval('.hero h1 *', (els) => els.filter((e) => !e.classList.contains('gold')).length)).toBe(0)
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

  test('inert reel dots are hidden', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await expect(page.locator('#nowBar')).not.toBeVisible()
  })

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
  test('header logo visible', async ({ page }) => {
    await expect(page.locator('.site-header .logo')).toBeVisible()
  })
  test('hero logo visible', async ({ page }) => {
    await expect(page.locator('.lockup')).toBeVisible()
  })
})

/* Motion: ported from test_dock.py, test_reel.py and the hub part of test_split.py. One check -> one expect. */
const HERO_STATE = `(() => {
  const vis = (el) => getComputedStyle(el).visibility === 'visible' && el.getBoundingClientRect().bottom > 0;
  const lock = document.querySelector('.lockup'), head = document.querySelector('.site-header .logo');
  const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
  return { lockVisible: vis(lock), headVisible: vis(head),
           lockMark: r(lock.querySelector('.lockup-mark')), lockWord: r(lock.querySelector('.lockup-word')),
           headMark: r(head.querySelector('.logo-mark')), headWord: r(head.querySelector('.logo-word')),
           transform: getComputedStyle(lock).transform }; })()`
const DOCK_D = `(() => { const l = document.querySelector('.lockup'), t = l.style.transform; l.style.transform = 'none';
  const L = l.getBoundingClientRect(), H = document.querySelector('.site-header .logo-mark').getBoundingClientRect();
  l.style.transform = t; return L.top + scrollY - H.top; })()`
type Box = number[]
type HeroState = { lockVisible: boolean; headVisible: boolean; lockMark: Box; lockWord: Box; headMark: Box; headWord: Box; transform: string }

const REEL = `(() => { const sl=[...document.querySelectorAll('.reel .slide')];
  const op = sl.map((x) => +getComputedStyle(x).opacity), cap = sl.map((x) => +getComputedStyle(x.querySelector('.reel-cap')).opacity);
  return { on: sl.findIndex((x) => x.classList.contains('on')), names: sl.map((x) => x.dataset.name), op, cap,
           label: document.getElementById('nowName').textContent,
           pressed: [...document.querySelectorAll('.now-dots button')].map((b) => b.getAttribute('aria-pressed')) }; })()`
type ReelState = { on: number; names: string[]; op: number[]; cap: number[]; label: string; pressed: string[] }

const H1 = `(() => { const h = document.querySelector('.hero h1');
  const inner = [...h.querySelectorAll('div, span')].filter((e) => getComputedStyle(e).display === 'block' && e.textContent.trim());
  const moved = inner.map((e) => new DOMMatrix(getComputedStyle(e).transform).m42).filter((y) => Math.abs(y) > 0.5).length;
  return { vis: getComputedStyle(h).visibility, aria: h.getAttribute('aria-label'), text: h.textContent.replace(/\\s+/g, ' ').trim(),
           moved, pending: document.documentElement.classList.contains('h1-pending'),
           masks: [...h.children].filter((e) => getComputedStyle(e).overflow === 'clip' && e.querySelector('.h1-line')).length }; })()`
type H1State = { vis: string; aria: string | null; text: string; moved: number; pending: boolean; masks: number }
const FULL = 'We Haul It. We Build It. We Show It.'

type Pg = import('@playwright/test').Page
const settleMotion = async (page: Pg) => {
  await page.goto(URL, { waitUntil: 'load' })
  await settled(page)
  await page.waitForTimeout(2500)
}
const scrollTo = async (page: Pg, y: number) => {
  await page.evaluate((v) => window.scrollTo(0, v), y)
  await page.waitForTimeout(250)
}
const heroState = (page: Pg) => page.evaluate(HERO_STATE) as Promise<HeroState>
const logos = (s: HeroState) => ({ hero: s.lockVisible, header: s.headVisible })

for (const [label, viewport, mobile] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['laptop', { width: 1024, height: 700 }, false],
  ['phone', { width: 390, height: 844 }, true],
] as const) {
  test.describe(`logo dock (${label})`, () => {
    test.use({ viewport, isMobile: mobile, hasTouch: mobile })
    let D = 0
    let top: HeroState

    test.beforeEach(async ({ page }) => {
      await settleMotion(page)
      D = (await page.evaluate(DOCK_D)) as number
      top = await heroState(page)
    })

    test('at the top: only the hero logo shows', () => {
      expect(logos(top)).toEqual({ hero: true, header: false })
    })
    test('halfway: one logo, still the hero one', async ({ page }) => {
      await scrollTo(page, D * 0.5)
      expect(logos(await heroState(page))).toEqual({ hero: true, header: false })
    })
    test('halfway: logo shrinking toward the header logo', async ({ page }) => {
      await scrollTo(page, D * 0.5)
      const s = await heroState(page)
      expect(top.lockMark[3] > s.lockMark[3] && s.lockMark[3] > top.headMark[3]).toBe(true)
    })
    test('lands exactly on the header logo', async ({ page }) => {
      await scrollTo(page, D - 0.5)
      const s = await heroState(page)
      const err = Math.max(...s.lockMark.map((v, i) => Math.abs(v - s.headMark[i])), ...s.lockWord.map((v, i) => Math.abs(v - s.headWord[i])))
      expect(err).toBeLessThanOrEqual(1.5)
    })
    test('docked: only the header logo shows', async ({ page }) => {
      await scrollTo(page, D + 2)
      expect(logos(await heroState(page))).toEqual({ hero: false, header: true })
    })
    test('docked: html carries logo-docked', async ({ page }) => {
      await scrollTo(page, D + 2)
      expect(await page.evaluate(() => document.documentElement.classList.contains('logo-docked'))).toBe(true)
    })
    test('further down: header logo stays', async ({ page }) => {
      await scrollTo(page, 2500)
      expect(logos(await heroState(page))).toEqual({ hero: false, header: true })
    })
    test('back at the top: reverses cleanly', async ({ page }) => {
      await scrollTo(page, D + 2)
      await scrollTo(page, 0)
      await page.waitForTimeout(100)
      const s = await heroState(page)
      expect({ ...logos(s), mark: s.lockMark }).toEqual({ hero: true, header: false, mark: top.lockMark })
    })
  })
}

test.describe('logo dock (reduced motion)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, contextOptions: { reducedMotion: 'reduce' } })
  let D = 0
  test.beforeEach(async ({ page }) => {
    await settleMotion(page)
    D = (await page.evaluate(DOCK_D)) as number
  })
  test('at the top: only the hero logo shows', async ({ page }) => {
    expect(logos(await heroState(page))).toEqual({ hero: true, header: false })
  })
  test('no movement for reduced motion', async ({ page }) => {
    await scrollTo(page, D * 0.5)
    expect((await heroState(page)).transform).toBe('none')
  })
  test('docked: instant swap to the header logo', async ({ page }) => {
    await scrollTo(page, D + 2)
    expect(logos(await heroState(page))).toEqual({ hero: false, header: true })
  })
  test('further down: header logo stays', async ({ page }) => {
    await scrollTo(page, 2500)
    expect(logos(await heroState(page))).toEqual({ hero: false, header: true })
  })
  test('back at the top: reverses cleanly', async ({ page }) => {
    await scrollTo(page, D + 2)
    await scrollTo(page, 0)
    expect(logos(await heroState(page))).toEqual({ hero: true, header: false })
  })
})

test.describe('reel (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('opens on real Home Upgrades work (timed from load)', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    const r = (await page.evaluate(REEL)) as ReelState
    expect(r.names[r.on]).toBe('Home Upgrades')
  })
  test('Home Upgrades video playing', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForFunction(
      () => {
        const v = document.querySelector<HTMLVideoElement>('.reel video')!
        return !v.paused && v.classList.contains('playing')
      },
      undefined,
      { timeout: 5000 },
    )
  })

  test.describe('after picking the third dot', () => {
    let early: ReelState
    let late: ReelState
    test.beforeEach(async ({ page }) => {
      await page.goto(URL, { waitUntil: 'load' })
      // the dots are visible before hydration (as in the prototype); wait until the reel script has attached
      await page.waitForFunction(() => !document.getElementById('nowBar')!.hidden)
      await page.locator('.now-dots button').nth(2).click()
      await page.waitForTimeout(100)
      early = (await page.evaluate(REEL)) as ReelState
      await page.waitForTimeout(1400)
      late = (await page.evaluate(REEL)) as ReelState
    })
    test('dot selects the slide', () => {
      expect(late.names[late.on]).toBe('Multimedia')
    })
    test('dot marks itself pressed', () => {
      expect(late.pressed).toEqual(['false', 'false', 'true'])
    })
    test('label waits for the picture', () => {
      expect(early.label).toBe('Home Upgrades')
    })
    test('label matches the picture once it is in', () => {
      expect(late.label).toBe('Multimedia')
    })
    test('only the active caption shows', () => {
      expect(late.cap.filter((x) => x > 0.05)).toHaveLength(1)
    })
  })

  test('now bar is shown by script', async ({ page }) => {
    await settleMotion(page)
    await expect(page.locator('#nowBar')).toBeVisible()
  })
  test('reveal of the now bar shifts no layout', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'commit' })
    await page.locator('.reel').waitFor({ state: 'attached' })
    const before = await page.evaluate(() => document.querySelector('.reel')!.getBoundingClientRect().height)
    await page.waitForFunction(() => !document.getElementById('nowBar')!.hidden)
    expect(await page.evaluate(() => document.querySelector('.reel')!.getBoundingClientRect().height)).toBe(before)
  })

  test.describe('a full auto-advance', () => {
    let dips = 0
    let doubles = 0
    test.beforeEach(async ({ page }) => {
      await settleMotion(page)
      dips = doubles = 0
      for (let i = 0; i < 40; i++) {
        const s = (await page.evaluate(REEL)) as ReelState
        dips += Math.max(...s.op) < 0.99 ? 1 : 0
        doubles += s.cap.filter((x) => x > 0.05).length > 1 ? 1 : 0
        await page.waitForTimeout(150)
      }
    })
    test('crossfades never dip to black', () => {
      expect(dips).toBe(0)
    })
    test('never two captions at once', () => {
      expect(doubles).toBe(0)
    })
  })

  for (const key of ['move', 'make', 'tell']) {
    test(`${key} panel opens fully`, async ({ page }) => {
      await settleMotion(page)
      await page.evaluate((k) => document.getElementById(`div-${k}`)!.scrollIntoView(), key)
      await page.waitForTimeout(1300)
      const clip = await page.evaluate((k) => getComputedStyle(document.querySelector(`#div-${k} .panel-media`)!).clipPath, key)
      expect(['none', 'inset(0%)', 'inset(0px)']).toContain(clip)
    })
  }

  test('reel video pauses when scrolled away', async ({ page }) => {
    await settleMotion(page)
    await page.evaluate(() => document.getElementById('div-make')!.scrollIntoView())
    await page.waitForTimeout(1300)
    expect(await page.evaluate(() => document.querySelector<HTMLVideoElement>('.reel video')!.paused)).toBe(true)
  })

  test('keyboard focus visible', async ({ page }) => {
    await settleMotion(page)
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toMatch(/^(none|)$/)
  })

  test('Lenis is exposed as window.genixLenis', async ({ page }) => {
    await settleMotion(page)
    expect(await page.evaluate(() => typeof (window as unknown as { genixLenis?: object }).genixLenis)).toBe('object')
  })
})

test.describe('reel (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const boxes = (page: Pg) =>
    page.evaluate(() => {
      const q = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      const l = q('.lockup'), f = q('.reel-frame'), h = q('h1')
      return { vh: innerHeight, lb: l.bottom, ft: f.top, fb: f.bottom, ht: h.top }
    })
  test('order is logo, reel, headline', async ({ page }) => {
    await settleMotion(page)
    const m = await boxes(page)
    expect(m.lb <= m.ft && m.fb <= m.ht).toBe(true)
  })
  test('reel fully on the first screen', async ({ page }) => {
    await settleMotion(page)
    const m = await boxes(page)
    expect(m.fb).toBeLessThanOrEqual(m.vh)
  })
})

test.describe('reel (reduced motion)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, contextOptions: { reducedMotion: 'reduce' } })
  test('reel does not auto-advance', async ({ page }) => {
    await settleMotion(page)
    const r1 = (await page.evaluate(REEL)) as ReelState
    await page.waitForTimeout(5000)
    const r2 = (await page.evaluate(REEL)) as ReelState
    expect(r2.on).toBe(r1.on)
  })
  test('dots still work, instantly', async ({ page }) => {
    await settleMotion(page)
    await page.locator('.now-dots button').nth(0).click()
    await page.waitForTimeout(100)
    const r = (await page.evaluate(REEL)) as ReelState
    expect({ pic: r.names[r.on], label: r.label }).toEqual({ pic: 'Logistics', label: 'Logistics' })
  })
  test('case videos get play controls', async ({ page }) => {
    await settleMotion(page)
    expect(await page.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>('.case video')].every((v) => v.controls))).toBe(true)
  })
})

test.describe('headline split (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('lines are moving mid-animation', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'commit' })
    // sample from load until a line is caught mid-flight (animation timing depends on cache)
    let moved = 0
    for (let i = 0; i < 200 && !moved; i++) {
      moved = await page.evaluate(H1).then((s) => (s as H1State).moved, () => 0)
      if (!moved) await page.waitForTimeout(40)
    }
    expect(moved).toBeGreaterThan(0)
  })

  test.describe('once settled', () => {
    let end: H1State
    test.beforeEach(async ({ page }) => {
      await settleMotion(page)
      end = (await page.evaluate(H1)) as H1State
    })
    test('headline split into masked lines', () => {
      expect(end.masks).toBeGreaterThanOrEqual(2)
    })
    test('no duplicate split after StrictMode setup, cleanup, setup', async ({ page }) => {
      const n = await page.evaluate(() => ({ lines: document.querySelectorAll('.hero h1 .h1-line').length, masks: document.querySelectorAll('.hero h1 > *').length }))
      expect(n.lines).toBe(n.masks)
    })
    test('lines settle in place', () => {
      expect({ moved: end.moved, vis: end.vis, pending: end.pending }).toEqual({ moved: 0, vis: 'visible', pending: false })
    })
    test('screen readers get the whole sentence', () => {
      expect((end.aria ?? '').replace(/  /g, ' ').trim() === FULL || end.text === FULL).toBe(true)
    })
    test('descenders not clipped (mask at least 1.15em)', async ({ page }) => {
      const room = await page.evaluate(() => {
        const h = document.querySelector('.hero h1')!, fs = parseFloat(getComputedStyle(h).fontSize)
        return [...h.children].map((m) => m.getBoundingClientRect().height / fs)
      })
      expect(room.every((r) => r >= 1.15)).toBe(true)
    })
    test('line spacing unchanged (1em steps)', async ({ page }) => {
      const step = await page.evaluate(() => {
        const h = document.querySelector('.hero h1')!, fs = parseFloat(getComputedStyle(h).fontSize)
        const tops = [...h.children].map((m) => m.querySelector('.h1-line')!.getBoundingClientRect().top)
        return tops.slice(1).map((t, i) => (t - tops[i]) / fs)
      })
      expect(step.every((s) => Math.abs(s - 1) < 0.02)).toBe(true)
    })
    test('gold words keep their gold', async ({ page }) => {
      const gold = await page.$$eval('.hero h1 .gold', (els) => els.map((e) => getComputedStyle(e).color))
      // SplitText clones the span onto each line it spans, so there can be several; all must be gold
      expect(gold.length > 0 && gold.every((g) => g === 'rgb(168, 116, 26)')).toBe(true)
    })
    test('resize re-splits without replaying', async ({ page }) => {
      await page.setViewportSize({ width: 1000, height: 900 })
      await page.waitForTimeout(400)
      const rs = (await page.evaluate(H1)) as H1State
      expect({ moved: rs.moved, vis: rs.vis }).toEqual({ moved: 0, vis: 'visible' })
    })
  })
})

test.describe('headline split (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('headline settles and is visible', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForTimeout(3200)
    const m = (await page.evaluate(H1)) as H1State
    expect({ moved: m.moved, vis: m.vis }).toEqual({ moved: 0, vis: 'visible' })
  })
})

test.describe('motion has no errors', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('no console or page errors after scrolling the page', async ({ page }) => {
    const seen = watchPage(page)
    await settleMotion(page)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    expect(seen.errors).toEqual([])
  })
})
