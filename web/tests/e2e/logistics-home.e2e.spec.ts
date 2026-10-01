import { expect, test, type Page } from '@playwright/test'
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
  test('form posts to the server and says how details are used', async ({ page }) => {
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#quote-form')!.method)).toBe('post')
    await expect(page.locator('.privacy-note')).toBeVisible()
    await expect(page.locator('.privacy-note')).toContainText('We use your details only to reply to this request.')
  })
  test('pallets field is visible without JS', async ({ page }) => {
    await expect(page.locator('#qPallets')).toBeVisible()
  })
})

/* Ported from design/tests/test_logistics.py: t_hero, t_form, t_confirmation_scroll,
   t_tab_on_step2, t_start_quote_reduced (one check -> one expect). */
const BUSINESS = ['', 'pallets', 'parcels', 'truckload', 'courier']
const MOVE = ['', 'studio', '1-2bed', '3bed', 'office']
const loadValues = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLOptionElement>('#qLoad option')].map((o) => o.value))
const activeId = (page: Page) => page.evaluate(() => document.activeElement?.id)
const gotoForm = async (page: Page) => {
  await page.goto(URL, { waitUntil: 'load' })
  // Enhancement runs after hydration: wait until the script has switched on custom validation.
  await expect(page.locator('#quote-form')).toHaveJSProperty('noValidate', true)
}

/** Step 1 then step 2 as in t_form's happy path, ending on the filled step 2. */
async function fillValidRequest(page: Page) {
  await page.fill('#qFrom', '10001')
  await page.fill('#qTo', '92101')
  await page.check('#qFlex')
  await page.selectOption('#qLoad', 'pallets')
  await page.fill('#qPallets', '4')
  await page.click('#qNext')
  await page.fill('#qName', 'Dana')
  await page.fill('#qEmail', 'dana@shop.com')
}

test.describe('hero (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('headline and step 1 fit the first screen', async ({ page }) => {
    await gotoForm(page)
    const r = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      return { h1: Math.round(q('h1').bottom), tabs: Math.round(q('.kind').top), next: Math.round(q('#qNext').bottom) }
    })
    expect(r.h1).toBeLessThan(r.tabs)
    expect(r.next).toBeLessThanOrEqual(844)
  })
  test('form controls are at least 40px tall', async ({ page }) => {
    await gotoForm(page)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#quote-form [data-step="1"] input:not([type=checkbox]), #quote-form select, #qNext, .kind label')]
        .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 40).map((e) => e.id || e.textContent!.trim()))
    expect(small).toEqual([])
  })
})

test.describe('hero (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('form looks like a shipping label', async ({ page }) => {
    await gotoForm(page)
    const look = await page.evaluate(() => {
      const f = getComputedStyle(document.getElementById('quote-form')!)
      const m = getComputedStyle(document.querySelector('.field > label')!)
      return [f.borderTopStyle, f.backgroundColor, m.fontFamily, !!document.querySelector('#quote-form .barcode')]
    })
    expect(look[0]).toBe('dashed')
    expect(look[1]).toBe('rgb(247, 245, 239)')
    expect(String(look[2])).toContain('IBM Plex Mono')
    expect(look[3]).toBe(true)
  })
  test('headline left, form right on desktop', async ({ page }) => {
    await gotoForm(page)
    const cols = await page.evaluate(() => {
      const h = document.querySelector('h1')!.getBoundingClientRect(), f = document.getElementById('quote-form')!.getBoundingClientRect()
      return [Math.round(h.right), Math.round(f.left)]
    })
    expect(cols[0]).toBeLessThanOrEqual(cols[1])
  })
  test('selected tab is navy', async ({ page }) => {
    await gotoForm(page)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.kind label:has(input:checked)')!).backgroundColor)).toBe('rgb(2, 34, 72)')
  })
})

test.describe('form (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('walk through the whole form', async ({ page }) => {
    const seen = watchPage(page)
    await gotoForm(page)
    const vis = (s: string) => page.locator(s).isVisible()
    expect((await vis('#qFrom')) && !(await vis('#qName')), 'step 2 starts hidden').toBe(true)
    expect(await page.evaluate(() => (document.getElementById('quote-form') as HTMLFormElement).noValidate), 'JS mode uses custom validation').toBe(true)
    expect(await loadValues(page), 'business options by default').toEqual(BUSINESS)
    await page.fill('#qFrom', '92a10 1x')
    expect(await page.inputValue('#qFrom'), 'ZIP keeps digits only').toBe('92101')
    await page.fill('#qFrom', '921'); await page.click('#qNext')
    expect(await page.textContent('#qFromErr'), 'short ZIP flagged').toBe('Enter a 5-digit ZIP code.')
    await page.fill('#qFrom', '92101')
    await page.focus('#qFrom')
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('qFrom')!).borderBottomColor), 'focus underline is heading navy, not gold').toBe('rgb(2, 34, 72)')
    await page.fill('#qDate', '2099-01-15')
    await page.click(".kind label:has-text('Plan a move')")
    expect(await loadValues(page), 'the move tab swaps the options').toEqual(MOVE)
    expect((await page.inputValue('#qFrom')) === '92101' && (await page.inputValue('#qDate')) === '2099-01-15', 'switching tabs keeps ZIP and date').toBe(true)

    await page.fill('#qFrom', ''); await page.fill('#qDate', '')
    await page.click('#qNext')
    const bad = await page.evaluate(() => [...document.querySelectorAll('[data-step="1"] .err')].filter((e) => e.textContent).map((e) => e.id))
    expect(bad, 'empty step 1 flags ZIPs, date and load').toEqual(['qFromErr', 'qToErr', 'qDateErr', 'qLoadErr'])
    expect(await activeId(page), 'focus jumps to the first problem').toBe('qFrom')
    await expect(page.locator('#qStatus'), 'problems announced').toHaveText('4 fields need attention.')
    expect(await page.getAttribute('#qFrom', 'aria-invalid'), 'invalid fields are marked').toBe('true')

    await page.fill('#qDate', '2020-01-01'); await page.click('#qNext')
    expect(await page.textContent('#qDateErr'), 'past date rejected').toBe('Pick a date from today on.')
    await page.check('#qFlex')
    expect((await page.isDisabled('#qDate')) && (await page.inputValue('#qDate')) === '', 'Flexible disables the date').toBe(true)

    await page.fill('#qFrom', '10001'); await page.fill('#qTo', '92101')
    expect(await page.locator('#qArea').count(), 'no outside-area note (nationwide)').toBe(0)

    await page.click(".kind label:has-text('Ship for your business')")
    await page.selectOption('#qLoad', 'pallets')
    expect(await vis('#qPallets'), 'pallet count appears for pallets').toBe(true)
    await page.click('#qNext')
    expect(await page.textContent('#qPalletsErr'), 'pallet count required').toBe('Enter 1 to 26 pallets.')
    await page.fill('#qPallets', '4'); await page.click('#qNext')
    expect(await vis('#qName'), 'a New York route continues').toBe(true)
    expect(await activeId(page), 'focus moves to the step 2 heading').toBe('qStep2Title')
    await page.click('#qBack')
    expect((await page.inputValue('#qFrom')) === '10001' && (await page.inputValue('#qPallets')) === '4', 'Back keeps step 1 answers').toBe(true)

    await page.click('#qNext'); await page.click('#qSend')
    expect(await page.textContent('#qNameErr'), 'name required').toBe('Enter your name.')
    expect(await page.textContent('#qPhoneErr'), 'a way to reply required').toBe('Add a phone number or an email so we can reply.')
    await page.fill('#qName', 'Dana'); await page.fill('#qEmail', 'dana@'); await page.click('#qSend')
    expect(await page.textContent('#qEmailErr'), 'bad email flagged').toBe('Enter an email like name@company.com.')
    await page.fill('#qEmail', 'dana@shop.com'); await page.click('#qSend')
    await expect(page.locator('#qSent'), 'the server confirms the request').toBeVisible({ timeout: 15_000 })
    expect(!(await vis('#qName')) && !(await vis('.kind')), 'confirmation replaces the form').toBe(true)
    await expect(page.locator('#qRef'), 'label shows the request reference').toHaveText(/^GX-LOG-\d{6}$/)
    expect(await activeId(page), 'confirmation focused').toBe('qSent')
    await expect(page.locator('#qSent'), 'reply promise').toContainText('within two business days')
    expect(await page.textContent('.sent-title'), 'confirmation heading').toBe('Request received.')
    expect(seen.errors, 'no console errors').toEqual([])
  })

  test('offline mode: Send shows the call/email message and never "received"', async ({ page }) => {
    await gotoForm(page)
    const msg = "We can't take requests online yet. Email hello@thegenixgroup.com."
    await page.evaluate((m) => { const f = document.getElementById('quote-form')!; f.dataset.sendMode = 'offline'; f.dataset.offlineMessage = m }, msg)
    await fillValidRequest(page)
    const posts: string[] = []
    page.on('request', (r) => { if (r.method() === 'POST') posts.push(r.url()) })
    await page.click('#qSend')
    await expect(page.locator('#qStatus')).toHaveText(msg)
    await expect(page.locator('#qStatus')).toBeVisible()
    expect(await activeId(page)).toBe('qStatus')
    await expect(page.locator('#qSent')).toBeHidden()
    await expect(page.locator('#qRef')).not.toHaveText(/^GX-/)
    await expect(page.locator('#qName')).toBeVisible()
    expect(posts, 'nothing is sent').toEqual([])
  })

  test('tab-on-step2: switching tabs mid-step-2 returns to step 1', async ({ page }) => {
    await gotoForm(page)
    await page.fill('#qFrom', '92101'); await page.fill('#qTo', '92024'); await page.fill('#qDate', '2099-01-15')
    await page.selectOption('#qLoad', 'parcels')
    await page.click('#qNext')
    expect((await page.locator('#qName').isVisible()) && !(await page.locator('#qFrom').isVisible()), 'reached step 2').toBe(true)
    await page.click(".kind label:has-text('Plan a move')")
    expect((await page.locator('#qFrom').isVisible()) && !(await page.locator('#qName').isVisible()), 'back on step 1').toBe(true)
    expect(await loadValues(page), 'move options loaded').toEqual(MOVE)
  })
})

test.describe('confirmation scroll (short phone)', () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  test('confirmation lands below the sticky header and in view', async ({ page }) => {
    await gotoForm(page)
    await page.fill('#qFrom', '92101'); await page.fill('#qTo', '92024')
    await page.check('#qFlex')
    await page.selectOption('#qLoad', 'parcels')
    await page.click('#qNext')
    await page.fill('#qName', 'Dana'); await page.fill('#qPhone', '619 555 0142')
    await page.click('#qSend')
    await expect(page.locator('#qSent')).toBeVisible({ timeout: 15_000 })
    const measure = () => page.evaluate(() => {
      const ref = document.getElementById('qRef')!.getBoundingClientRect()
      const title = document.querySelector('.sent-title')!.getBoundingClientRect()
      return { refTop: ref.top, titleTop: title.top, titleBottom: title.bottom, vh: innerHeight, scrolling: !!window.genixLenis?.isScrolling }
    })
    // Lenis's smooth scroll settles: wait for the confirmation to sit where the assertions below want it, then for Lenis to idle.
    await expect.poll(async () => { const m = await measure(); return !m.scrolling && m.refTop >= 76 && m.titleTop >= 0 && m.titleBottom <= m.vh }, { timeout: 10_000 }).toBe(true)
    const r = await measure()
    expect(r.refTop, '#qRef below the sticky header').toBeGreaterThanOrEqual(76)
    expect(r.titleTop).toBeGreaterThanOrEqual(0)
    expect(r.titleBottom).toBeLessThanOrEqual(r.vh)
  })
})

test.describe('start quote (reduced motion)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: 'reduce' } })
  test('focus lands on the first field and the form scrolls into view without Lenis', async ({ page }) => {
    await gotoForm(page)
    await page.evaluate(() => document.getElementById('quote')!.scrollIntoView())
    await page.click('#quote [data-start-quote]')
    await expect.poll(() => activeId(page)).toBe('qFrom')
    await expect.poll(() => page.evaluate(() => document.getElementById('quote-form')!.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0)
    expect(await page.evaluate(() => document.getElementById('quote-form')!.getBoundingClientRect().top)).toBeLessThan(400)
  })
})

/* Safety net: production relies on Hero rendering these attributes (dev is "preview", so Send saves and confirms). */
test('quote form carries its send-mode wiring', async ({ page }) => {
  await page.goto(URL, { waitUntil: 'load' })
  await expect(page.locator('#quote-form')).toHaveAttribute('data-send-mode', 'preview')
  expect(await page.getAttribute('#quote-form', 'data-offline-message')).toMatch(/^We can't take requests online yet\./)
})

/* Ported from t_keyboard, t_lanes, t_signature (road) and t_bar. */
test.describe('keyboard (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('the form works from the keyboard alone', async ({ page }) => {
    await gotoForm(page)
    const kb = page.keyboard
    await page.focus('#qFrom'); await kb.type('92101'); await kb.press('Tab'); await kb.type('92024')
    await page.focus('#qFlex'); await kb.press('Space')
    await kb.press('Tab')
    expect(await activeId(page), 'Tab reaches the load menu').toBe('qLoad')
    await kb.press('ArrowDown'); await kb.press('ArrowDown')
    expect(await page.inputValue('#qLoad'), 'arrow keys choose the load').toBe('parcels')
    await kb.press('Tab')
    expect(await activeId(page), 'Tab reaches Continue').toBe('qNext')
    await kb.press('Enter')
    expect(await activeId(page), 'Enter moves to step 2').toBe('qStep2Title')
    await kb.press('Tab'); await kb.type('Dana'); await kb.press('Tab'); await kb.type('619 555 0142'); await kb.press('Enter')
    await expect(page.locator('#qSent')).toBeVisible({ timeout: 15_000 })
    expect(await activeId(page), 'Enter sends').toBe('qSent')
  })
})

test.describe('lanes (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('lane buttons pick the tab and Start a quote focuses the first field', async ({ page }) => {
    await gotoForm(page)
    await page.click('a[data-kind=move]')
    // Lenis's smooth scroll settles: the form has arrived (see the bounds asserted below) and Lenis is idle.
    await expect.poll(() => page.evaluate(() => !window.genixLenis?.isScrolling && document.getElementById('quote-form')!.getBoundingClientRect().top < 400), { timeout: 10_000 }).toBe(true)
    const top = await page.evaluate(() => document.getElementById('quote-form')!.getBoundingClientRect().top)
    expect(top, 'form brought into view').toBeGreaterThanOrEqual(0)
    expect(top).toBeLessThan(400)
    expect(await page.isChecked('input[name=kind][value=move]'), "'Price a move' selects Plan a move").toBe(true)
    expect(await loadValues(page), 'move options loaded').toEqual(MOVE)
    await page.click('a[data-kind=business]')
    expect(await page.isChecked('input[name=kind][value=business]'), 'switching back selects business').toBe(true)
    expect(await loadValues(page), 'business options restored').toEqual(BUSINESS)
    await page.click('#quote [data-start-quote]')
    await expect.poll(() => activeId(page), { message: "'Start a quote' focuses the first field" }).toBe('qFrom')
  })
})

const ROAD = () => {
  const r = document.querySelector('[data-road]')!
  const t = document.querySelector('.road-truck')!.getBoundingClientRect()
  return {
    p: parseFloat(getComputedStyle(r).getPropertyValue('--p')),
    live: r.classList.contains('is-live'),
    done: r.classList.contains('is-done'),
    passed: document.querySelectorAll('[data-stop].is-passed').length,
    x: Math.round(t.left),
    y: Math.round(t.top + scrollY),
    stamp: +getComputedStyle(document.querySelector('.stamp')!).opacity,
  }
}

/** Scroll to three points along the road (start, middle, end) and sample each once the scrub has caught up. */
async function roadPositions(page: Page, vh: number) {
  const top = await page.evaluate(() => document.querySelector('[data-road]')!.getBoundingClientRect().top + scrollY)
  const h = await page.evaluate(() => (document.querySelector('[data-road]') as HTMLElement).offsetHeight)
  const out = []
  for (const y of [top - vh * 0.75 - 60, top + h / 2 - vh * 0.6, top + h - vh * 0.45 + 120]) {
    await page.evaluate((y) => scrollTo(0, y), y)
    await roadSettled(page)
    out.push(await page.evaluate(ROAD))
  }
  return out
}

/** The scrub (0.5s) has caught up when --p equals the progress the current scroll position calls for
    (ScrollTrigger start "top 75%", end "bottom 45%") and the stamp's transition has stopped changing. */
async function roadSettled(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const r = document.querySelector('[data-road]')!
    const box = r.getBoundingClientRect()
    const start = box.top + scrollY - innerHeight * 0.75
    const end = box.bottom + scrollY - innerHeight * 0.45
    const want = Math.max(0, Math.min(1, (scrollY - start) / (end - start)))
    return Math.abs(parseFloat(getComputedStyle(r).getPropertyValue('--p')) - want) < 0.005
  }), { message: 'road scrub caught up with the scroll', timeout: 10_000 }).toBe(true)
  await page.evaluate(async () => {
    const stamp = document.querySelector('.stamp')!
    let last = '', still = 0
    while (still < 10) { // ten unchanged frames: the stamp transition is over
      await new Promise((r) => requestAnimationFrame(r))
      const now = getComputedStyle(stamp).opacity
      still = now === last ? still + 1 : 0
      last = now
    }
  })
}

test.describe('road signature (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('truck drives, stops light, stamp lands once, no pinning', async ({ page }) => {
    await gotoForm(page)
    const h0 = await page.evaluate(() => document.getElementById('how')!.offsetHeight)
    const [start, mid, end] = await roadPositions(page, 900)
    expect(start.live, 'animation is live').toBe(true)
    expect(start.p, 'truck starts at the first stop').toBeLessThan(0.02)
    expect(start.passed).toBe(1)
    expect(start.x).toBeLessThan(mid.x)
    expect(mid.x, 'truck drives as you scroll').toBeLessThan(end.x)
    expect(end.passed, 'stops light up as it passes').toBe(4)
    expect(end.done).toBe(true)
    expect(end.stamp, 'DELIVERED stamp lands at the end').toBeGreaterThan(0.95)
    expect(start.stamp).toBeLessThan(0.05)
    await page.evaluate(() => scrollTo(0, 0))
    await roadSettled(page)
    expect((await page.evaluate(ROAD)).stamp, 'stamp stays after scrolling back to the start').toBeGreaterThan(0.95)
    expect(await page.evaluate(() => document.getElementById('how')!.offsetHeight), 'section height unchanged').toBe(h0)
    await expect(page.locator('.pin-spacer'), 'no pinning').toHaveCount(0)
  })
})

test.describe('road (reduced motion)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: 'reduce' } })
  test('finished road shown', async ({ page }) => {
    await gotoForm(page)
    const s = await page.evaluate(ROAD)
    expect(s.live).toBe(false)
    expect(s.stamp).toBe(1)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.stop-dot')!).backgroundColor)).toBe('rgb(194, 138, 44)')
  })
})

test.describe('road (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('runs top to bottom, truck drives down, no horizontal scroll', async ({ page }) => {
    await gotoForm(page)
    const line = await page.evaluate(() => {
      const r = document.querySelector('.road-line')!.getBoundingClientRect()
      return [Math.round(r.width), Math.round(r.height)]
    })
    expect(line[0], 'road is a vertical line').toBeLessThanOrEqual(6)
    expect(line[1]).toBeGreaterThan(300)
    const [start, mid, end] = await roadPositions(page, 844)
    expect(start.y).toBeLessThan(mid.y)
    expect(mid.y, 'truck drives down').toBeLessThan(end.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'no horizontal page scroll').toBeLessThanOrEqual(0)
  })
})

test.describe('pinned bar (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const barOff = (page: Page) => page.evaluate(() => document.getElementById('quoteBar')!.classList.contains('off'))
  /** Scroll to an anchor and wait for the bar to reach `want` (the bar reacts a frame or two after the scroll). */
  const barAt = async (page: Page, sel: string, want: boolean, message: string, extra = 0) => {
    await page.evaluate(([s, e]) => scrollTo(0, document.querySelector(s as string)!.getBoundingClientRect().top + scrollY + (e as number)), [sel, extra])
    await expect.poll(() => barOff(page), { message, timeout: 8000 }).toBe(want)
  }
  test('shows after the form, hides over #quote and footer, button focuses first field', async ({ page }) => {
    await gotoForm(page)
    expect(await barOff(page), 'hidden while the hero form is on screen').toBe(true)
    await barAt(page, '#services', false, 'shows once the form has scrolled away', 200)
    await barAt(page, '#quote', true, 'hides over the final quote section')
    await barAt(page, '.site-footer', true, 'hides over the footer')
    await barAt(page, '#areas', false, 'shows again at the areas section')
    await page.click('#quoteBar [data-start-quote]')
    await expect.poll(() => activeId(page), { message: 'button goes to the form and focuses the first field' }).toBe('qFrom')
  })
})

test.describe('pinned bar (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('no bar on desktop', async ({ page }) => {
    await gotoForm(page)
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('quoteBar')!).display !== 'none')).toBe(false)
  })
})

const firstFamily = (page: import('@playwright/test').Page, sel: string) => page.evaluate((s) => getComputedStyle(document.querySelector(s)!).fontFamily.split(',')[0].trim().replace(/["']/g, ''), sel)

// The prototype's --f-mono is IBM Plex Mono; a theme change must not swap it silently.
test('Logistics mono labels use IBM Plex Mono', async ({ page }) => {
  await page.goto(URL)
  expect(await firstFamily(page, '.site-footer h2')).toMatch(/Plex.Mono/)
})
