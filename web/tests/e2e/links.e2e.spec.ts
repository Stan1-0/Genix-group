import { expect, test } from '@playwright/test'

// Every link on each home page that points into this app (any *.localhost site) must load,
// and a #fragment must land on an element that exists. Cross-site buttons (hub → division)
// pointed at /contact pages that were never built; this catches that class of break.
// Opened in the browser, not Node: Node can't resolve *.localhost.
const HOMES = [
  'http://localhost:3000/',
  'http://logistics.localhost:3000/',
  'http://homeupgrades.localhost:3000/',
  'http://multimedia.localhost:3000/',
]

for (const home of HOMES) {
  test(`${home}: every in-app link resolves`, async ({ page, context }) => {
    test.setTimeout(180_000)
    await page.goto(home)
    const hrefs = await page.$$eval('a[href]', (as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).href))])
    const inApp = hrefs.filter((h) => /^https?:\/\/([a-z]+\.)?localhost:3000\//.test(h) && !/\/(admin|api)(\/|$)/.test(h))
    expect(inApp.length).toBeGreaterThan(0)

    const broken: string[] = []
    const probe = await context.newPage()
    for (const href of inApp) {
      const url = new URL(href)
      const res = await probe.goto(url.origin + url.pathname + url.search)
      if (!res || res.status() >= 400) {
        broken.push(`${href} → ${res?.status() ?? 'no response'}`)
        continue
      }
      const id = decodeURIComponent(url.hash.slice(1))
      if (id && !(await probe.evaluate((i) => !!document.getElementById(i), id))) broken.push(`${href} → no #${id}`)
    }
    expect(broken).toEqual([])
  })
}
