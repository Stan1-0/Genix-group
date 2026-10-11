import { expect, test } from '@playwright/test'

// WCAG 1.4.11: the edge that shows where you type needs ≥ 3:1 against what surrounds it.
// The borders are translucent navy, so each is blended over the background it sits on before measuring.
const PAGES = [
  'http://logistics.localhost:3000/contact',
  'http://homeupgrades.localhost:3000/contact',
  'http://localhost:3000/contact',
]

const FIELDS =
  'form .field :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]), select, textarea)'

for (const url of PAGES) {
  test(`${url}: every text field border has ≥ 3:1 contrast`, async ({ page }) => {
    await page.goto(url)
    const results = await page.locator(FIELDS).evaluateAll((els) => {
      type RGBA = [number, number, number, number]
      const parse = (c: string): RGBA => {
        const m = c.match(/[\d.]+/g)!.map(Number)
        return [m[0], m[1], m[2], m[3] ?? 1]
      }
      const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA
      const lum = ([r, g, b]: RGBA) =>
        [r, g, b]
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
      const ratio = (a: RGBA, b: RGBA) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
        return (x + 0.05) / (y + 0.05)
      }
      // the first opaque-enough background at or above an element
      const bgOf = (el: Element | null): RGBA => {
        for (let n = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor)
          if (c[3] > 0) return c[3] === 1 ? c : over(c, bgOf(n.parentElement))
        }
        return [255, 255, 255, 1]
      }
      return els.map((el) => {
        const outside = bgOf(el.parentElement)
        const inside = bgOf(el)
        const edge = over(parse(getComputedStyle(el).borderBottomColor), outside)
        return { id: el.id || el.getAttribute('name'), ratio: Math.min(ratio(edge, outside), ratio(edge, inside)) }
      })
    })
    expect(results.length).toBeGreaterThan(2)
    for (const r of results) expect(r.ratio, `#${r.id}`).toBeGreaterThanOrEqual(3)
  })
}
