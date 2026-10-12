import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('hub: the open phone menu sits above the hero logo', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const nav = page.locator('.site-header .nav')
  await expect(nav).toBeVisible()
  const covered = await page.evaluate(() => {
    const nav = document.querySelector('.site-header .nav')!
    const n = nav.getBoundingClientRect()
    // every point of the hero lockup that lies under the open menu must hit the menu, not the logo
    const l = document.querySelector('.lockup')!.getBoundingClientRect()
    const pts: [number, number][] = []
    for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.1, 0.5, 0.9]) pts.push([l.x + l.width * fx, l.y + l.height * fy])
    return pts.filter(([x, y]) => y > n.top && y < n.bottom).map(([x, y]) => nav.contains(document.elementFromPoint(x, y)))
  })
  expect(covered.length).toBeGreaterThan(0)
  expect(covered.every(Boolean)).toBe(true)
  // with the hero logo covered, the header shows its own logo
  await expect(page.locator('.site-header .logo')).toBeVisible()
})

for (const url of ['http://homeupgrades.localhost:3000/', 'http://homeupgrades.localhost:3000/services/accent-walls']) {
  test(`${url}: the step circles sit inside the process card`, async ({ page }) => {
    await page.goto(url)
    const gaps = await page.locator(':is(.process, .svcd-process) .step').evaluateAll((steps) => {
      const card = steps[0].closest('.process, .svcd-process')!.getBoundingClientRect()
      return steps.map((s) => {
        const left = s.getBoundingClientRect().left + parseFloat(getComputedStyle(s, '::before').left)
        return left - card.left
      })
    })
    expect(gaps).toHaveLength(4)
    for (const g of gaps) expect(g).toBeGreaterThanOrEqual(12)
  })
}
