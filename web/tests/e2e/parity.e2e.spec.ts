import { expect, test } from '@playwright/test'
import { expectSameLook, hideOverlays, PROTOTYPE, settle, VIEWPORTS } from './parity'

/* Each ported site against its prototype. `chrome` (header + footer) turns on in Task 3;
   `sections` turns on in the task that ports that site's page body. */
const PARITY: { site: string; proto: string; app: string; chrome: boolean; sections: boolean; extra?: string }[] = [
  { site: 'logistics', proto: '/logistics-home.html', app: 'http://logistics.localhost:3000/', chrome: true, sections: true },
  { site: 'homeupgrades', proto: '/homeupgrades-home.html', app: 'http://homeupgrades.localhost:3000/', chrome: true, sections: true },
  { site: 'hub', proto: '/hub-home.html', app: 'http://localhost:3000/', chrome: true, sections: true, extra: '#businesses > section' },
]

test.describe.configure({ timeout: 180_000 })

// Harness self-check: a prototype compared with itself must pass.
test('parity harness: a page matches itself', async ({ browser }) => {
  const open = async () => {
    const page = await (await browser.newContext({ ...VIEWPORTS.desktop, reducedMotion: 'reduce' })).newPage()
    await page.goto(PROTOTYPE + '/logistics-home.html', { waitUntil: 'load' })
    await settle(page)
    return page
  }
  const [a, b] = [await open(), await open()]
  try {
    await expectSameLook(a, b, 'header.site-header', 'self-header', 0)
  } finally {
    await a.context().close()
    await b.context().close()
  }
})

for (const p of PARITY) {
  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    test(`${p.site} ${vp}: looks like the prototype`, async ({ browser }) => {
      test.skip(!p.chrome && !p.sections, 'not ported yet')
      const open = async (url: string) => {
        const page = await (await browser.newContext({ ...opts, reducedMotion: 'reduce' })).newPage()
        await page.goto(url, { waitUntil: 'load' })
        return page
      }
      const proto = await open(PROTOTYPE + p.proto)
      const app = await open(p.app)
      try {
        await settle(proto)
        await settle(app)
        if (p.chrome) await expectSameLook(proto, app, 'header.site-header', `${p.site}-${vp}-header`)
        await hideOverlays(proto)
        await hideOverlays(app)
        if (p.sections) {
          const n = await proto.locator('main > section').count()
          expect(await app.locator('main > section').count(), 'same number of sections').toBe(n)
          for (let i = 0; i < n; i++) await expectSameLook(proto, app, `main > section >> nth=${i}`, `${p.site}-${vp}-section${i + 1}`)
        }
        if (p.sections && p.extra) {
          // Sections outside `main > section` (the hub's division panels sit inside div#businesses).
          const m = await proto.locator(p.extra).count()
          expect(await app.locator(p.extra).count(), 'same number of extra sections').toBe(m)
          expect(m, 'three panels').toBe(3)
          for (let i = 0; i < m; i++) await expectSameLook(proto, app, `${p.extra} >> nth=${i}`, `${p.site}-${vp}-panel${i + 1}`)
        }
        if (p.chrome) await expectSameLook(proto, app, 'footer.site-footer', `${p.site}-${vp}-footer`)
      } finally {
        await proto.context().close()
        await app.context().close()
      }
    })
  }
}
