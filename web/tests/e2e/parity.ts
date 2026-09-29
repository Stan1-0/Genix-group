import { expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

export const PROTOTYPE = 'http://localhost:4321'
export const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const

/** Hide fixed/sticky chrome so section screenshots aren't overlapped (compare the header first). */
export async function hideOverlays(page: Page) {
  await page.addStyleTag({ content: '.site-header, .quote-bar, [data-testid="quote-bar"] { visibility: hidden !important; } * { caret-color: transparent !important; }' })
}

/** Finished states (the context uses reducedMotion: 'reduce'), paused video, fonts in, lazy images loaded. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0 })
    await document.fonts.ready
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
    await Promise.all(Array.from(document.images).map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r }))))
  })
}

const OUT = path.join('test-results', 'parity')

/** At most `maxRatio` of pixels may differ (pixelmatch threshold 0.2); sizes may differ by ≤2px (height ≤1%). */
export async function expectSameLook(proto: Page, app: Page, selector: string, name: string, maxRatio = 0.02) {
  const a = PNG.sync.read(await proto.locator(selector).first().screenshot({ animations: 'disabled' }))
  const b = PNG.sync.read(await app.locator(selector).first().screenshot({ animations: 'disabled' }))
  const sizeOk = Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= Math.max(2, a.height * 0.01)
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  const crop = (p: PNG) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(p, o, 0, 0, w, h, 0, 0); return o }
  const ca = crop(a), cb = crop(b), diff = new PNG({ width: w, height: h })
  const ratio = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold: 0.2 }) / (w * h)
  if (!sizeOk || ratio > maxRatio) {
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(path.join(OUT, `${name}-prototype.png`), PNG.sync.write(a))
    fs.writeFileSync(path.join(OUT, `${name}-app.png`), PNG.sync.write(b))
    fs.writeFileSync(path.join(OUT, `${name}-diff.png`), PNG.sync.write(diff))
  }
  expect.soft(sizeOk, `${name}: size ${a.width}×${a.height} (prototype) vs ${b.width}×${b.height} (app)`).toBe(true)
  expect.soft(ratio, `${name}: ${(ratio * 100).toFixed(2)}% of pixels differ (limit ${maxRatio * 100}%), see ${OUT}/${name}-*.png`).toBeLessThanOrEqual(maxRatio)
}
