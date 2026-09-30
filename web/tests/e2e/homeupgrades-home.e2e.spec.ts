import { expect, test, type Page } from '@playwright/test'
import { expectBasics, settled, watchPage } from './basics'

/* Ported from design/tests/test_hu.py (structure, tap targets, reduced motion, no-JS) and the Home Upgrades
   parts of test_shared.py (sideways swipe). One check -> one expect. Also the slider, project viewer and process
   line interactions; the pinned quote bar is in chrome.e2e.spec.ts. */
const URL = 'http://homeupgrades.localhost:3000/'
const pos = (page: Page) => page.evaluate(() => +document.getElementById('baHandle')!.getAttribute('aria-valuenow')!)
const progress = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('steps')!).getPropertyValue('--progress') || '1'))

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

      test('tapping the image moves the split', async ({ page }) => {
        await page.goto(URL)
        const box = (await page.locator('#ba').boundingBox())!
        // A tap before hydration reaches no handler; retry the same tap until the slider is live.
        await expect(async () => {
          await page.touchscreen.tap(box.x + box.width * 0.2, box.y + box.height / 2)
          await expect.poll(() => pos(page), { timeout: 1500 }).toBeLessThan(35)
        }).toPass({ timeout: 30_000 })
      })

      test('tap targets are at least 40px', async ({ page }) => {
        await page.goto(URL, { waitUntil: 'load' })
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('a, button, [role=slider]')]
            .filter((e) => {
              const r = e.getBoundingClientRect(), s = getComputedStyle(e)
              return r.width && r.height && s.display !== 'none' && s.visibility !== 'hidden' && r.height < 40 && !e.closest('.site-footer, p') && !e.matches('.skip-link') /* the skip link only shows on focus */
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

test.describe('interactions (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Lenis leaves touch scrolling native', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await expect.poll(() => page.evaluate(() => window.genixLenis?.options.syncTouch)).toBe(false)
  })

  test('clicking during the swing keeps your position', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'commit' })
    // Wide bound: hydration on a loaded dev server can take a while; the swing itself is wall-clock.
    await page.waitForFunction(() => +document.getElementById('baHandle')!.getAttribute('aria-valuenow')! < 45, null, { timeout: 30_000 })
    const bx = (await page.locator('#ba').boundingBox())!
    await page.mouse.click(bx.x + bx.width * 0.85, bx.y + bx.height / 2)
    await page.waitForTimeout(2500)
    const kept = await pos(page)
    expect(kept).toBeGreaterThanOrEqual(78)
    expect(kept).toBeLessThanOrEqual(92)
  })

  // The swing is over in ~2s (after a 0.6s delay), so record every frame, from before the page's scripts run,
  // for 8s: a loaded machine's slow polling cannot step over a leg of the swing.
  async function swingSamples(page: Page) {
    await page.addInitScript(() => {
      const w = window as unknown as { __swing: number[] }
      w.__swing = []
      const t0 = performance.now()
      const tick = () => {
        const h = document.getElementById('baHandle')
        if (h) w.__swing.push(+h.getAttribute('aria-valuenow')!)
        if (performance.now() - t0 < 8000) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await page.goto(URL, { waitUntil: 'commit' })
    await page.waitForFunction(() => performance.now() > 8200)
    return page.evaluate(() => (window as unknown as { __swing: number[] }).__swing)
  }
  test('slider swings once to show it moves', async ({ page }) => {
    const s = await swingSamples(page)
    expect([Math.min(...s) < 45, Math.max(...s) > 55]).toEqual([true, true])
  })
  test('slider settles back at 50%', async ({ page }) => {
    const s = await swingSamples(page)
    expect(s[s.length - 1]).toBe(50)
  })

  test.describe('slider input', () => {
    let cy = 0
    let bx = { x: 0, width: 0 }
    test.beforeEach(async ({ page }) => {
      await page.goto(URL, { waitUntil: 'load' })
      await settled(page)
      const box = (await page.locator('#ba').boundingBox())!
      bx = box
      cy = box.y + box.height / 2
    })

    async function dragTo25(page: Page) {
      await page.mouse.move(bx.x + bx.width * 0.5, cy)
      await page.mouse.down()
      for (const f of [0.45, 0.4, 0.33, 0.27, 0.25]) {
        await page.mouse.move(bx.x + bx.width * f, cy, { steps: 4 })
        await page.waitForTimeout(30)
      }
      await page.waitForTimeout(150)
      await page.mouse.up()
    }

    test('dragging moves the split', async ({ page }) => {
      await dragTo25(page)
      await expect.poll(() => pos(page)).toBeGreaterThanOrEqual(15)
      expect(await pos(page)).toBeLessThanOrEqual(35)
    })

    test('mid-build image is clipped to the split', async ({ page }) => {
      await dragTo25(page)
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ba-before')!).clipPath)).toContain('inset')
    })

    test('fling keeps gliding after release (inertia)', async ({ page }) => {
      // Draggable derives the fling velocity from event timestamps, so a stall between the last move and the
      // release (a loaded machine) reads as "stopped". The same gesture is retried; the assertion is unchanged.
      await expect(async () => {
        await page.mouse.move(bx.x + bx.width * 0.3, cy)
        await page.mouse.down()
        // Paced moves: unpaced CDP moves land in one timestamp.
        for (const f of [0.35, 0.4, 0.45]) {
          await page.mouse.move(bx.x + bx.width * f, cy)
          await page.waitForTimeout(16)
        }
        await page.mouse.up()
        const right = await pos(page)
        await expect.poll(() => pos(page), { timeout: 2500 }).toBeGreaterThan(right + 2)
      }).toPass({ timeout: 30_000 })
    })

    test('clicking the image jumps the split there', async ({ page }) => {
      await page.mouse.click(bx.x + bx.width * 0.8, cy)
      await expect.poll(() => pos(page)).toBeGreaterThanOrEqual(72)
      expect(await pos(page)).toBeLessThanOrEqual(88)
    })

    test('keyboard: Home / arrows / End', async ({ page }) => {
      await page.locator('#baHandle').focus()
      await page.keyboard.press('Home')
      const home = await pos(page)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      const arrows = await pos(page)
      await page.keyboard.press('End')
      expect([home, arrows, await pos(page)]).toEqual([0, 10, 100])
    })

    test('slider announces its value', async ({ page }) => {
      await page.locator('#baHandle').focus()
      await page.keyboard.press('End')
      expect(await page.getAttribute('#baHandle', 'aria-valuetext')).toBe('100% mid-build')
    })

    test('slider focus is visible', async ({ page }) => {
      await page.locator('#baHandle').focus()
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ba-knob')!).outlineStyle)).not.toBe('none')
    })
  })

  test.describe('project viewer', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(URL, { waitUntil: 'load' })
      await settled(page)
      await page.evaluate(() => document.getElementById('work')!.scrollIntoView())
      await page.waitForTimeout(1200)
    })
    const isOpen = (page: Page) => page.evaluate(() => (document.getElementById('viewer') as HTMLDialogElement).open)

    test('project opens in a dialog', async ({ page }) => {
      await page.locator('.work-card').first().click()
      expect(await isOpen(page)).toBe(true)
    })

    test('photo grows out of its card (Flip in progress)', async ({ page }) => {
      // Record the photo's transform every frame from inside the page, so a slow frame cannot make the test miss it.
      await page.evaluate(() => {
        const w = window as unknown as { __tf: string[] }
        w.__tf = []
        document.querySelector('.work-card')!.addEventListener(
          'click',
          () => {
            const t0 = performance.now()
            const tick = () => {
              const m = document.querySelector('.viewer-media')
              if (m) w.__tf.push(getComputedStyle(m).transform)
              if (performance.now() - t0 < 2500) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          },
          { capture: true, once: true },
        )
      })
      await page.locator('.work-card').first().click()
      await page.waitForTimeout(1500)
      const moving = await page.evaluate(() => (window as unknown as { __tf: string[] }).__tf.filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)').length)
      expect(moving).toBeGreaterThanOrEqual(3)
    })

    test('viewer caption stays on screen', async ({ page }) => {
      await page.locator('.work-card').first().click()
      await page.waitForTimeout(2200)
      expect(
        await page.evaluate(() => {
          const r = document.querySelector('.viewer-cap')!.getBoundingClientRect()
          return r.bottom <= innerHeight && r.top >= 0
        }),
      ).toBe(true)
    })

    test('viewer lands large', async ({ page }) => {
      await page.locator('.work-card').first().click()
      await page.waitForTimeout(2200)
      // The first card is a portrait photo, so "large" means it fills most of the height or the width.
      const end = await page.evaluate(() => {
        const r = document.querySelector('.viewer-media')!.getBoundingClientRect()
        return { large: r.height > innerHeight * 0.7 || r.width > innerWidth * 0.55, title: document.getElementById('viewerTitle')!.textContent }
      })
      expect(end).toEqual({ large: true, title: 'Accent wall' })
    })

    test('Esc closes the viewer', async ({ page }) => {
      await page.locator('.work-card').first().click()
      await page.waitForTimeout(1200)
      await page.keyboard.press('Escape')
      await expect.poll(() => isOpen(page)).toBe(false)
    })

    test('Esc returns focus to the card', async ({ page }) => {
      await page.locator('.work-card').first().click()
      await page.waitForTimeout(1200)
      await page.keyboard.press('Escape')
      await expect.poll(() => page.evaluate(() => document.activeElement!.classList.contains('work-card'))).toBe(true)
    })

    test('video project plays with controls', async ({ page }) => {
      await page.locator('.work-card').nth(1).click()
      await expect
        .poll(() =>
          page.evaluate(() => {
            const v = document.querySelector('.viewer-media') as HTMLVideoElement
            return { tag: v.tagName, playing: !v.paused, controls: v.controls }
          }),
        )
        .toEqual({ tag: 'VIDEO', playing: true, controls: true })
    })

    test('close button closes the viewer', async ({ page }) => {
      await page.locator('.work-card').nth(1).click()
      await page.waitForTimeout(1200)
      await page.locator('#viewerClose').click()
      await expect.poll(() => isOpen(page)).toBe(false)
    })

    test('close button stops the video', async ({ page }) => {
      await page.locator('.work-card').nth(1).click()
      await page.waitForTimeout(1200)
      await page.locator('#viewerClose').click()
      await expect(page.locator('.viewer-media')).toHaveCount(0)
    })
  })

  test('process line fills as you scroll', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await settled(page)
    await page.evaluate(() => document.getElementById('steps')!.scrollIntoView({ block: 'start' }))
    await page.waitForTimeout(200)
    const before = await progress(page)
    await page.evaluate(() => scrollBy(0, 500))
    await expect.poll(() => progress(page)).toBeGreaterThan(before)
  })
})

test.describe('reduced motion interactions', () => {
  test.use({ viewport: { width: 1280, height: 800 }, contextOptions: { reducedMotion: 'reduce' } })

  test('no smooth scrolling', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    expect(await page.evaluate(() => !!window.genixLenis)).toBe(false)
  })

  test('slider still works by keyboard', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await page.locator('#baHandle').focus()
    await page.keyboard.press('ArrowLeft')
    expect(await pos(page)).toBe(45)
  })

  test('viewer opens without animation', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await page.locator('.work-card').first().click()
    await expect.poll(() => page.evaluate(() => (document.getElementById('viewer') as HTMLDialogElement).open)).toBe(true)
  })

  test('process line stays full', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => document.getElementById('steps')!.scrollIntoView())
    expect(await progress(page)).toBe(1)
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

/* "Watch the build" (3D). Ported from design/tests/test_build_section.py. Needs WebGL: Chromium software-renders via SwiftShader (launch args in playwright.config.ts).
   Three.js is recognised by its code ("KHR_parallel_shader_compile", a string only three's renderer contains) in the JS responses, since Next chunk URLs do not say "three".
   Differences from the prototype: `is3d` is added after hydration (not during parse), so that check polls. */
const STATE = () => {
  const s = window.__build?.state
  if (!s) return null
  return {
    slats: s.slats, marble: s.marble, tv: s.tv, console: s.console, light: s.light,
    step: [...document.querySelectorAll('#build .step3d')].findIndex((e) => e.classList.contains('on')),
  }
}
type BuildState = ReturnType<typeof STATE>
const track = (page: Page) => page.evaluate(() => { const b = document.getElementById('build')!; return { top: b.offsetTop - 76, len: b.offsetHeight - innerHeight } })
const watchThree = (page: Page) => {
  const found: Promise<boolean>[] = []
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script') found.push(r.text().then((t) => t.includes('KHR_parallel_shader_compile')).catch(() => false))
  })
  return async () => (await Promise.all(found)).filter(Boolean).length
}
const scrollAndWait = async (page: Page, y: number) => {
  await page.evaluate((v) => scrollTo(0, v), y)
  await page.waitForTimeout(1400)
}

test.describe('3D build (desktop)', () => {
  test.describe.configure({ mode: 'serial' })
  let page: Page
  let seen: ReturnType<typeof watchPage>
  let threeCount: () => Promise<number>
  let t: { top: number; len: number }
  const shots = new Map<number, NonNullable<BuildState>>()

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    page = await ctx.newPage()
    seen = watchPage(page)
    threeCount = watchThree(page)
    await page.goto(URL, { waitUntil: 'load' })
    await settled(page)
    await page.waitForTimeout(1500)
  })
  test.afterAll(async () => { await page.context().close() })

  test('section sits right after Recent work', async () => {
    expect(await page.evaluate(() => { let e = document.getElementById('work')!.nextElementSibling; while (e && e.tagName !== 'SECTION') e = e.nextElementSibling; return e?.id })).toBe('build')
  })
  test('3D mode chosen once the page is live', async () => {
    await expect(page.locator('#build.is3d')).toHaveCount(1)
  })
  test('Three.js NOT downloaded on first load', async () => {
    expect(await threeCount()).toBe(0)
  })
  test('Three.js loads as the section approaches', async () => {
    t = await track(page)
    await scrollAndWait(page, t.top - 1400)
    await expect.poll(() => page.evaluate(() => window.__build?.mode)).toBe('3d')
    expect(await threeCount()).toBeGreaterThanOrEqual(1)
  })
  test('exactly one canvas is mounted in the stage', async () => {
    expect(await page.locator('#build .stage canvas').count(), 'one WebGL canvas').toBe(1)
  })
  test('scroll through the build', async () => {
    for (const f of [0.0, 0.2, 0.4, 0.56, 0.7, 0.92]) {
      await scrollAndWait(page, t.top + t.len * f)
      shots.set(f, (await page.evaluate(STATE))!)
    }
    expect(shots.size).toBe(6)
  })
  test('starts as a bare wall', async () => {
    const s0 = shots.get(0)!
    expect([s0.slats < 0.05, s0.step]).toEqual([true, 0])
  })
  test('fully built and lit near the end', async () => {
    const s9 = shots.get(0.92)!
    expect([(['slats', 'marble', 'tv', 'console', 'light'] as const).every((k) => s9[k] > 0.95), s9.step]).toEqual([true, 4])
  })
  test('progress bars fill as you scroll', async () => {
    const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#build .progress3d i')].map((i) => +(i.style.getPropertyValue('--f') || 0)))
    expect([bars.length, bars.every((v) => v > 0.95)]).toEqual([5, true])
  })
  test('steps advance in order', async () => {
    expect([0.0, 0.2, 0.4, 0.56, 0.7].map((f) => shots.get(f)!.step)).toEqual([0, 1, 2, 3, 4])
  })
  test("final step's button goes to the quote section", async () => {
    const href = await page.evaluate(() => document.querySelector('#build .step3d[data-step="4"] .cta')!.getAttribute('href'))
    expect([href, await page.locator('#quote').count()]).toEqual(['#quote', 1])
  })
  test('How a project runs follows the section', async () => {
    await scrollAndWait(page, t.top + t.len + 200)
    expect(await page.evaluate(() => document.getElementById('build')!.nextElementSibling!.id)).toBe('process')
  })
  test('no console/page errors', async () => {
    expect(seen.errors).toEqual([])
  })
  test('no horizontal overflow', async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  })
})

test.describe('3D build (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  let page: Page
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
    page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'load' })
    await settled(page)
    await page.waitForTimeout(1000)
    const t = await track(page)
    await scrollAndWait(page, t.top - 1400)
    await scrollAndWait(page, t.top + t.len * 0.92)
    await page.waitForTimeout(300)
  })
  test.afterAll(async () => { await page.context().close() })

  test('[phone] builds and lights', async () => {
    const st = await page.evaluate(STATE)
    expect(st?.light ?? 0, 'light is on at the end of the track').toBeGreaterThan(0.95)
  })
  test('[phone] no horizontal overflow', async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'overflow px').toBeLessThanOrEqual(0)
  })
})

test.describe('3D build (reduced motion)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, contextOptions: { reducedMotion: 'reduce' } })
  let threeCount: () => Promise<number>

  test.beforeEach(async ({ page }) => {
    threeCount = watchThree(page)
    await page.goto(URL, { waitUntil: 'load' })
    await settled(page)
    await page.evaluate(() => document.getElementById('build')!.scrollIntoView())
    await page.waitForTimeout(1200)
  })

  test('photo and steps instead of 3D', async ({ page }) => {
    expect(await page.evaluate(() => document.getElementById('build')!.classList.contains('is3d')), 'is3d is off').toBe(false)
    expect(await page.locator('#build .fallback li').count(), 'five fallback steps').toBe(5)
    await expect(page.locator('#build .fallback img')).toBeVisible()
  })
  test('Three.js never downloaded', async () => {
    expect(await threeCount(), 'scripts containing Three.js').toBe(0)
  })
})

test.describe('3D build (no JavaScript)', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })

  test('photo and steps readable', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'load' })
    await page.locator('#build .fallback').scrollIntoViewIfNeeded()
    await expect(page.locator('#build .fallback img')).toBeVisible()
    expect(await page.locator('#build .fallback li').count()).toBe(5)
  })
})

const firstFamily = (page: import('@playwright/test').Page, sel: string) => page.evaluate((s) => getComputedStyle(document.querySelector(s)!).fontFamily.split(',')[0].trim().replace(/["']/g, ''), sel)

// The prototype sets --f-mono to Plus Jakarta Sans; a theme change must not swap it for Plex Mono.
test('mono-styled labels use the body font, as in the prototype', async ({ page }) => {
  await page.goto(URL)
  const body = await firstFamily(page, 'body')
  expect(body).toMatch(/Plus.Jakarta/)
  expect(await firstFamily(page, '.parent-link')).toBe(body)
  expect(await firstFamily(page, '.site-footer h2')).toBe(body)
})
