# Hub About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a real About page for The Genix Group at `thegenixgroup.com/about` (hub only) and point the hub nav, footer and home intro at it.

**Architecture:** The page text lives in code (`HubAbout` component, like the privacy page) and reads names, taglines and origins from `SITES`/`siteOrigin`, so it follows config. Prototype first: the hub's inline CSS moves unchanged into a shared file, `design/hub-about.html` is built from it, then the app page is ported with screenshot parity. The nav/footer/intro links are the last task.

**Tech Stack:** Next.js 16.3.6 (App Router, `proxy.ts` host routing), React 19, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-hub-about-page-design.md` (binding).

## Global Constraints

- All app code lives in `web/`; run every command from `web/`. Prototypes are in the repo-root `design/`. This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` before using route or metadata APIs. `proxy.ts` rewrites every path to `/<site>/…` (`localhost:3000/about` → `/hub/about`).
- `/about` exists on the **hub only**. `logistics`, `homeupgrades`, `multimedia` and unknown site keys → `notFound()` (404).
- Content: the group story from what the sites already say. **No team, no founding year, no numbers, no testimonials; nothing invented.** Text is in code, not the admin.
- The hub mailing address shows **only when street, city, state and ZIP are all present** (`data.address`, `formatAddress` from `@/sites/data-shape`, as on the privacy page).
- Links: the hub header "Who we are" and the footer Group "Who we are" → `/about`; the home page keeps its `#about` intro and gains "More about the group →" → `/about`. Nothing is removed from the home page. The hub header CTA, "Our businesses" and "Get a quote" items are unchanged.
- No motion on the About page: no `MotionRoot`/`HubMotion`/`LogoDock`/`HubReel`, no `data-reveal`/`data-split`. No new dependencies, no blur/glass, no decorative pills.
- Metadata via `pageMetadata('hub', '/about', { title: 'About', description })` → title "About | The Genix Group", canonical `https://thegenixgroup.com/about` (`http://localhost:3000/about` in dev), indexable. `/about` is added to `SITES.hub.pages` (hub sitemap only).
- The page renders its own `<main id="main">` (skip-link target). Reading widths and tokens follow the hub home (black + gold; division dots `--move`, `--make`, `--tell`).
- Generated CSS only via `npm run port:css`; never hand-edit `*.generated.css`; `hub-overrides.css` is for hand-written overrides only. If `git status` shows a generated file modified but `git diff -w --ignore-space-at-eol --stat -- <file>` is empty (CRLF noise), restore it with `git checkout -- <file>`.
- Prototype/app parity: screenshot parity (2% pixel limit in `tests/e2e/parity.e2e.spec.ts`) stays; fix real differences, never loosen it.
- Playwright always `--reporter=line`, never concurrently with Vitest; never `npm run build` while the dev server runs; never kill node processes. Node can't resolve `*.localhost`: test those hosts through Playwright `page` (or `curl -H 'Host: …' http://127.0.0.1:3000/…`).
- The owner edits `design/` in their editor: before touching a `design/` file run `git status --short design/`; if it has uncommitted changes you didn't make, STOP and report NEEDS_CONTEXT. Never revert, stash or checkout files you didn't change. Never commit `web/.env`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec)

1. The spec lists nav/footer/intro link edits under "Links"; the plan does them last (Task 3) so Tasks 1–2 leave the hub home untouched and its parity green.
2. The About prototype keeps only the scripts it needs (the mobile-menu toggle); the hub's reel, dock, GSAP and Lenis are not loaded (no motion on this page).
3. Copy below (headline, ledes, row lines) is a draft in the hub's voice; promise titles are copied verbatim from the existing Logistics and Home Upgrades pages. The owner reviews wording in the prototype.

## Review Focus

1. **The CSS move must not change the hub home.** Generated hub CSS byte-identical after the move (Task 1).
2. **A hub address with only some parts** must never print a half address; with all four it prints once (Task 2 unit).
3. **Business links must go to each business's own host,** not a relative path (Task 2 unit + e2e).
4. **`/about` on any non-hub host is a 404, the hub sitemap lists it and no other sitemap does** (Task 2 e2e/unit).
5. **A 320 px phone:** no sideways scroll, rows stack, long email wraps; and the header nav with "Who we are" → `/about` still works from the About page itself (Tasks 2–3 e2e).

---

## File Structure

| File | Responsibility |
|---|---|
| `design/shared/hub-home.css` (new, moved) | The hub home prototype's inline CSS, shared with the About prototype; gains `.about-*` rules in Task 2 |
| `design/hub-about.html` (new) | About prototype |
| `web/scripts/port-css.ts` | Hub source reads the moved file |
| `web/src/pages-home/hub/About.tsx` (new) | `HubAbout({ data })` page body |
| `web/src/app/(sites)/[site]/about/page.tsx` (new) | Route: hub renders, others 404; metadata |
| `web/src/sites/config.ts` | `SITES.hub.pages` gains `/about`; Task 3: nav "Who we are" → `/about` |
| `web/src/components/site/hub/HubFooter.tsx`, `web/src/pages-home/hub/sections/Intro.tsx` | Task 3 links |
| `design/hub-home.html` | Task 3: nav, footer, intro link |
| tests: `tests/unit/hub-about.test.ts`, `tests/unit/seo.test.ts`, `tests/e2e/about.e2e.spec.ts`, `tests/e2e/about-links.e2e.spec.ts`, `tests/e2e/parity.e2e.spec.ts`, `tests/e2e/quality.e2e.spec.ts` | see tasks |

---

### Task 1: Move the hub prototype CSS into a shared file (no-op)

**Files:**
- Create: `design/shared/hub-home.css`
- Modify: `design/hub-home.html` (replace the inline `<style>` with a `<link>`), `web/scripts/port-css.ts`

**Interfaces:**
- Produces: `design/shared/hub-home.css` (the verbatim body of the hub's single `<style>…</style>` block, lines ~93–1164 of `design/hub-home.html`); `port-css.ts` hub source `() => [file('shared/hub-home.css')]`. Task 2's prototype links this file and appends `.about-*` rules to it.

- [ ] **Step 1: Capture the "before".** `git status --short ../design/hub-home.html` must be clean (else NEEDS_CONTEXT). Copy `web/src/pages-home/hub/hub.generated.css` to the scratchpad as `hub-before.css`.

- [ ] **Step 2: Move the CSS.** Confirm `design/hub-home.html` has exactly one `<style>` element. Move its content (between the tags, unchanged, including the leading/trailing newline handling so the generated CSS stays identical) into new `design/shared/hub-home.css`, and replace the `<style>…</style>` element with `<link rel="stylesheet" href="shared/hub-home.css" />` at the same position in `<head>`.

- [ ] **Step 3: Point the porter at it.** In `web/scripts/port-css.ts` change the hub entry to `hub: () => [file('shared/hub-home.css')],`. `inlineStyle` is now unused by every site: delete the helper.

- [ ] **Step 4: Verify the no-op.** `npm run port:css`; then `diff <scratchpad>/hub-before.css src/pages-home/hub/hub.generated.css && echo IDENTICAL` → `IDENTICAL` (paste the result). `git status` must show only `design/hub-home.html`, `design/shared/hub-home.css`, `web/scripts/port-css.ts` (restore other generated files if CRLF noise only). Run `npx tsc --noEmit` → 0 and `npx playwright test tests/e2e/parity.e2e.spec.ts --reporter=line -g hub` → pass.

- [ ] **Step 5: Commit**

```bash
git add ../design web/scripts
git commit -m "refactor(design): hub page CSS lives in a shared file so the About prototype can use it"
```

---

### Task 2: The About page (prototype, component, route, tests)

**Files:**
- Create: `design/hub-about.html`, `web/src/pages-home/hub/About.tsx`, `web/src/app/(sites)/[site]/about/page.tsx`, `web/tests/unit/hub-about.test.ts`, `web/tests/e2e/about.e2e.spec.ts`
- Modify: `design/shared/hub-home.css` (append `.about-*` rules), `web/src/sites/config.ts` (`pages: ['/', '/privacy', '/about']`), `web/tests/unit/seo.test.ts`, `web/tests/e2e/parity.e2e.spec.ts`, `web/tests/e2e/quality.e2e.spec.ts`; regenerated `web/src/pages-home/hub/hub.generated.css` via `npm run port:css`

**Interfaces:**
- Consumes: `SITES`, `siteOrigin(key)`, `SiteKey` from `@/sites/config`; `SiteData`, `formatAddress` from `@/sites/data-shape`; `pageMetadata` from `@/sites/seo`; `getSiteData` from `@/sites/data`.
- Produces: `HubAbout({ data }: { data: SiteData }): JSX.Element` (renders a `<main id="main">` containing three `<section>`s); `ABOUT_HEADINGS = ['Three businesses, one standard', 'Find us'] as const` (the two `<h2>`s, in order); the route `GET /hub/about`. Task 3 links to `/about`.

Markup contract (prototype and app must match; classes are what tests and parity rely on):

```html
<main id="main">                               <!-- prototype: <main id="top"> -->
  <section class="about-hero" id="about-top">
    <div class="wrap">
      <p class="label">About</p>
      <h1>One group. Three crews. One standard of work.</h1>
      <p class="body">We run freight, home upgrades and multimedia under one roof, so the care you get from one Genix business is the care you get from all of them. One conversation can cover the move, the build and the photos.</p>
    </div>
  </section>
  <section class="about-businesses" id="about-businesses">
    <div class="wrap">
      <h2>Three businesses, one standard</h2>
      <ul class="about-biz-list">
        <li class="about-biz" style="--c: var(--move)">      <!-- Logistics -->
          <p class="about-verb"><span class="dot" aria-hidden="true"></span>Move</p>
          <div>
            <h3><a href="https://logistics.thegenixgroup.com">Genix Logistics</a></h3>
            <p class="about-tag">Reliable Freight. Real People. On Time, Every Time.</p>
            <p class="body">Business freight, courier runs and home or office moves anywhere in the USA.</p>
            <ul class="about-promises"><li>A real person to call</li><li>Clear timelines</li><li>Price first</li></ul>
          </div>
        </li>
        <li class="about-biz" style="--c: var(--make)">…Home Upgrades…</li>
        <li class="about-biz" style="--c: var(--tell)">…Multimedia (no promises list)…</li>
      </ul>
    </div>
  </section>
  <section class="about-find" id="about-find">
    <div class="wrap">
      <h2>Find us</h2>
      <ul class="facts">                          <!-- reuses the home intro's .facts rows -->
        <li><span>Head office</span><span>San Diego, CA</span></li>
        <li><span>Serving</span><span>Customers across the USA</span></li>
        <li><span>Email</span><span><a href="mailto:hello@thegenixgroup.com">hello@thegenixgroup.com</a></span></li>
        <!-- only when all four address parts are set: --><li><span>Address</span><span>1 Harbor Dr, San Diego, CA 92101</span></li>
      </ul>
      <a class="about-cta" href="/#contact">Start a conversation <span aria-hidden="true">↗</span></a>
    </div>
  </section>
</main>
```

Exact row copy (use verbatim):
- Logistics — verb `Move`, name `Genix Logistics`, tagline `SITES.logistics.tagline`, body "Business freight, courier runs and home or office moves anywhere in the USA.", promises "A real person to call", "Clear timelines", "Price first".
- Home Upgrades — verb `Make`, name `Genix Home Upgrades`, tagline `SITES.homeupgrades.tagline`, body "Accent walls, TV units, outdoor builds and handyman jobs for homes and commercial buildings.", promises "Care in every detail", "No guesswork", "For every kind of space", "Your local project partner".
- Multimedia — verb `Tell`, name `Genix Multimedia`, tagline `SITES.multimedia.tagline`, body "Photography, video, branding and design for businesses and the people behind them.", no promises list.

- [ ] **Step 1: Write the failing unit tests** — `web/tests/unit/hub-about.test.ts`

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ABOUT_HEADINGS, HubAbout } from '@/pages-home/hub/About'
import { SITES } from '@/sites/config'
import { toSiteData } from '@/sites/data-shape'

const html = (doc: Parameters<typeof toSiteData>[1] = null) =>
  renderToStaticMarkup(createElement(HubAbout, { data: toSiteData('hub', doc) }))

describe('HubAbout', () => {
  it('has one h1, the two h2s in order, and one main', () => {
    const out = html()
    expect(out.match(/<h1[ >]/g)).toHaveLength(1)
    expect([...out.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1])).toEqual([...ABOUT_HEADINGS])
    expect(out.match(/<main[ >]/g)).toHaveLength(1)
    expect(out).toContain('id="main"')
  })
  it('links each business to its own host and shows its tagline', () => {
    const out = html()
    for (const [key, name] of [['logistics', 'Genix Logistics'], ['homeupgrades', 'Genix Home Upgrades'], ['multimedia', 'Genix Multimedia']] as const) {
      expect(out).toMatch(new RegExp(`<a href="https?://${key}\\.[^"]+">${name}</a>`))
      expect(out).toContain(SITES[key].tagline)
    }
  })
  it('lists the existing promises and no opening hours, team or numbers', () => {
    const out = html()
    for (const p of ['A real person to call', 'Clear timelines', 'Price first', 'Care in every detail', 'No guesswork', 'For every kind of space', 'Your local project partner']) expect(out).toContain(p)
    expect(out).not.toMatch(/hours|team|founded|since \d{4}|years/i)
  })
  it('falls back to the group email and links it', () => {
    expect(html()).toContain('href="mailto:hello@thegenixgroup.com"')
    expect(html({ email: 'ops@example.com' })).toContain('href="mailto:ops@example.com"')
  })
  it('prints the mailing address only when street, city, state and ZIP are all set', () => {
    expect(html()).not.toContain('Address')
    expect(html({ address: { city: 'San Diego', state: 'CA' } })).not.toContain('Address')
    const full = html({ address: { street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '92101' } })
    expect(full).toContain('1 Harbor Dr, San Diego, CA 92101')
    expect(full.match(/Address/g)).toHaveLength(1)
  })
})
```

Adapt the `toSiteData` doc shapes to the real `SiteDoc` in `web/src/sites/data-shape.ts` and match real escaped output (React renders `'` as `&#x27;`); change the test to the actual output, never the page wording.

- [ ] **Step 2: Run it** — `npx vitest run tests/unit/hub-about.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement the component** — `web/src/pages-home/hub/About.tsx`

```tsx
import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { formatAddress, type SiteData } from '@/sites/data-shape'

/** The two <h2>s, in page order; the page and its tests share this list. */
export const ABOUT_HEADINGS = ['Three businesses, one standard', 'Find us'] as const

type Biz = { key: Exclude<SiteKey, 'hub'>; verb: string; color: string; body: string; promises: string[] }

/* Promise titles are copied from the Logistics "Why" list and the Home Upgrades promise strip. */
const BUSINESSES: Biz[] = [
  { key: 'logistics', verb: 'Move', color: 'var(--move)', body: 'Business freight, courier runs and home or office moves anywhere in the USA.', promises: ['A real person to call', 'Clear timelines', 'Price first'] },
  { key: 'homeupgrades', verb: 'Make', color: 'var(--make)', body: 'Accent walls, TV units, outdoor builds and handyman jobs for homes and commercial buildings.', promises: ['Care in every detail', 'No guesswork', 'For every kind of space', 'Your local project partner'] },
  { key: 'multimedia', verb: 'Tell', color: 'var(--tell)', body: 'Photography, video, branding and design for businesses and the people behind them.', promises: [] },
]

/* About page (design/hub-about.html). No motion: this page renders no MotionRoot/HubMotion. */
export function HubAbout({ data }: { data: SiteData }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  return (
    <main id="main">
      <section className="about-hero" id="about-top">
        <div className="wrap">
          <p className="label">About</p>
          <h1>One group. Three crews. One standard of work.</h1>
          <p className="body">
            We run freight, home upgrades and multimedia under one roof, so the care you get from one Genix business is
            the care you get from all of them. One conversation can cover the move, the build and the photos.
          </p>
        </div>
      </section>
      <section className="about-businesses" id="about-businesses">
        <div className="wrap">
          <h2>{ABOUT_HEADINGS[0]}</h2>
          <ul className="about-biz-list">
            {BUSINESSES.map((b) => (
              <li className="about-biz" key={b.key} style={{ '--c': b.color } as React.CSSProperties}>
                <p className="about-verb">
                  <span className="dot" aria-hidden="true"></span>
                  {b.verb}
                </p>
                <div>
                  <h3><a href={siteOrigin(b.key)}>{SITES[b.key].name}</a></h3>
                  <p className="about-tag">{SITES[b.key].tagline}</p>
                  <p className="body">{b.body}</p>
                  {b.promises.length > 0 && (
                    <ul className="about-promises">
                      {b.promises.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="about-find" id="about-find">
        <div className="wrap">
          <h2>{ABOUT_HEADINGS[1]}</h2>
          <ul className="facts">
            <li><span>Head office</span><span>San Diego, CA</span></li>
            <li><span>Serving</span><span>Customers across the USA</span></li>
            <li><span>Email</span><span><a href={`mailto:${email}`}>{email}</a></span></li>
            {data.address && <li><span>Address</span><span>{formatAddress(data.address)}</span></li>}
          </ul>
          <a className="about-cta" href="/#contact">
            Start a conversation <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run it** — `npx vitest run tests/unit/hub-about.test.ts` → PASS.

- [ ] **Step 5: Build the prototype.** `design/hub-about.html`: copy the `<head>` of `design/hub-home.html` (title "About | The Genix Group", a one-sentence description, canonical `https://thegenixgroup.com/about`, icons, fonts, the one stylesheet link `shared/hub-home.css`; drop JSON-LD and the inline `h1-pending` script), the header and footer verbatim except that home anchors (`#top`, `#businesses`, `#contact`, `#about`) become `hub-home.html#…`, the "Who we are" nav and footer links become `hub-about.html`, and the logo links go to `hub-home.html`; `<main id="top">` per the markup contract (include the address row as a comment-free static example: omit it in the prototype, since the default record has no address); scripts: only what the mobile menu needs (read the inline script near the end of `hub-home.html` and keep just the menu-toggle part; no GSAP/Lenis, no reel/dock code). Append `.about-*` rules to `design/shared/hub-home.css` using existing tokens only:
  - `.about-hero` white band like `.intro` (`padding: clamp(80px, 11vw, 150px) 0 clamp(48px, 6vw, 80px)`), `h1` in the same display scale as `.intro h2` (`font: 600 clamp(38px, 5vw, 72px)/1 var(--f-display); letter-spacing: -0.04em`), `.body` max-width ≈ 62ch in `--ink-2`, margin under the header so the sticky header never covers the h1.
  - `.about-businesses` on `--paper` (check the hub's paper token), `h2` in the display scale used elsewhere (smaller than h1); `.about-biz-list` a bordered list (top hairline `var(--line)`), each `.about-biz` a two-column grid (`minmax(88px, 140px) 1fr`, gap `clamp(20px, 4vw, 56px)`), hairline bottom border, padding 32px 0; `.about-verb` mono label (as `.facts li span:first-child`: `font: 500 12px/1.6 var(--f-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted)`) with `.dot` (10px circle, `background: var(--c)`, inline-block, margin-right 8px); `h3` display 600 ~28–32px with the link inheriting colour and underlined on hover (visible focus ring); `.about-tag` mono muted line; `.about-promises` a plain list with a small gold dash marker (`::before`, 14px × 2px `var(--gold)`) — not pills; `.body` in `--ink-2`.
  - `.about-find` white band, reuses `.facts`; `.about-cta` the hub's accent button look (copy the rules of `.header-cta`/`.btn-accent`, min-height 54px, `↗` span), links styled to match the page; at ≤ 640px the `.about-biz` grid collapses to one column (verb above the content) and `.facts li` already wraps; long email uses `overflow-wrap: anywhere`.
  Acceptance (screenshots at 1280 and 390 px to the scratchpad; LOOK at them and describe in the report): h1 clear of the header; three rows readable with division dots; no horizontal scroll at 320 px; console clean; contrast ≥ 4.5:1 for all text (gold only as marker/dot, never as text on white).

- [ ] **Step 6: Write the failing e2e + parity + quality + seo entries.**

`web/tests/e2e/about.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('hub /about: headings, three businesses, find-us facts, metadata', async ({ page }) => {
  await page.goto(`${HUB}/about`)
  await expect(page.locator('h1')).toHaveText('One group. Three crews. One standard of work.')
  await expect(page.locator('main h2')).toHaveText(['Three businesses, one standard', 'Find us'])
  await expect(page.locator('.about-biz')).toHaveCount(3)
  await expect(page.locator('.about-biz h3 a')).toHaveText(['Genix Logistics', 'Genix Home Upgrades', 'Genix Multimedia'])
  const hrefs = await page.$$eval('.about-biz h3 a', (as) => as.map((a) => (a as HTMLAnchorElement).href))
  expect(hrefs[0]).toMatch(/^http:\/\/logistics\.localhost:3000\/?$/)
  expect(hrefs[1]).toMatch(/^http:\/\/homeupgrades\.localhost:3000\/?$/)
  expect(hrefs[2]).toMatch(/^http:\/\/multimedia\.localhost:3000\/?$/)
  await expect(page.locator('.about-cta')).toHaveAttribute('href', '/#contact')
  await expect(page.locator('.facts a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('About | The Genix Group')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${HUB}/about`)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['logistics', 'homeupgrades', 'multimedia']) {
  test(`${host}.localhost /about is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}.localhost:3000/about`)
    expect(res?.status()).toBe(404)
  })
}

test('no sideways scroll at 320 px and the rows stack', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(`${HUB}/about`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const cols = await page.locator('.about-biz').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  expect(cols).toBe(1)
})

test('only the hub sitemap lists it', async ({ page }) => {
  await page.goto(`${HUB}/sitemap.xml`)
  expect(await page.content()).toContain('/about')
  await page.goto('http://logistics.localhost:3000/sitemap.xml')
  expect(await page.content()).not.toContain('/about')
})
```

`web/tests/e2e/parity.e2e.spec.ts`: add `{ site: 'hub-about', proto: '/hub-about.html', app: 'http://localhost:3000/about', chrome: true, sections: true }` to `PARITY`.
`web/tests/e2e/quality.e2e.spec.ts`: add `'http://localhost:3000/about'` to `HOMES` (read the file: it must feed both the console-error and the axe test; if axe has its own list add it there too).
`web/tests/unit/seo.test.ts`: add

```ts
  it('lists /about on the hub sitemap only', () => {
    expect(sitemapXml('hub', root)).toContain('/about</loc>')
    for (const k of ['logistics', 'homeupgrades', 'multimedia'] as const) expect(sitemapXml(k, root)).not.toContain('/about')
  })
```

- [ ] **Step 7: Run to see them fail** — `npx playwright test tests/e2e/about.e2e.spec.ts --reporter=line` (404) and `npx vitest run tests/unit/seo.test.ts`.

- [ ] **Step 8: Implement the route.** `web/src/app/(sites)/[site]/about/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HubAbout } from '@/pages-home/hub/About'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'hub') return {}
  return pageMetadata('hub', '/about', {
    title: 'About',
    description: 'The Genix Group runs Genix Logistics, Genix Home Upgrades and Genix Multimedia from San Diego, serving customers across the USA.',
  })
}

// The group's About page lives on the hub; the other sites 404 until they have their own.
export default async function AboutPage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || site !== 'hub') notFound()
  const data = await getSiteData('hub')
  return <HubAbout data={data} />
}
```

  In `config.ts` set `SITES.hub.pages: ['/', '/privacy', '/about']`. Run `npm run port:css` (restore CRLF-noise-only generated files).

- [ ] **Step 9: Run** — `npx tsc --noEmit`; `npx vitest run`; `npx playwright test tests/e2e/about.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/sites.e2e.spec.ts tests/e2e/seo.e2e.spec.ts --reporter=line` → all pass (re-run a flaky parity phone spec once alone). Axe covers `/about`; fix real contrast problems in the prototype CSS, not in the test.

- [ ] **Step 10: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(about): hub About page with the three businesses and how to reach the group"
```

---

### Task 3: Nav, footer and home-intro links; docs; full verification

**Files:**
- Modify: `web/src/sites/config.ts` (hub nav "Who we are" → `/about`), `web/src/components/site/hub/HubFooter.tsx` (Group "Who we are" → `/about`), `web/src/pages-home/hub/sections/Intro.tsx` (add link), `design/hub-home.html` (nav, footer, intro link), `design/hub-about.html` (already points at itself; verify), `design/shared/hub-home.css` (`.intro .more` rule), `web/README.md`, any existing test asserting the old hub nav/footer href
- Create: `web/tests/e2e/about-links.e2e.spec.ts`

**Interfaces:**
- Consumes: the `/about` page from Task 2. Produces: the links; nothing later depends on them.

- [ ] **Step 1: Write the failing test** — `web/tests/e2e/about-links.e2e.spec.ts`

```ts
import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('hub header, footer and the home intro all reach /about', async ({ page }) => {
  await page.goto(`${HUB}/`)
  const nav = page.locator('nav#nav a', { hasText: /^Who we are$/ })
  await expect(nav).toHaveCount(1)
  await expect(nav).toHaveAttribute('href', '/about')
  const foot = page.locator('footer a', { hasText: /^Who we are$/ })
  await expect(foot).toHaveCount(1)
  await expect(foot).toHaveAttribute('href', '/about')
  const more = page.locator('#about a', { hasText: 'More about the group' })
  await expect(more).toHaveCount(1)
  await expect(more).toHaveAttribute('href', '/about')
  await nav.click()
  await expect(page).toHaveURL(`${HUB}/about`)
  await expect(page.locator('h1')).toBeVisible()
})

test('the home page keeps its own intro section', async ({ page }) => {
  await page.goto(`${HUB}/`)
  await expect(page.locator('section#about h2')).toHaveText('One group. Three crews. One standard of work.')
})

test("the About page's header still reaches the home sections", async ({ page }) => {
  await page.goto(`${HUB}/about`)
  await expect(page.locator('nav#nav a', { hasText: /^Our businesses$/ })).toHaveAttribute('href', '/#businesses')
  await expect(page.locator('nav#nav a', { hasText: /^Who we are$/ })).toHaveAttribute('href', '/about')
})
```

Run → FAIL.

- [ ] **Step 2: Implement.**
  - `config.ts`: hub nav item `{ label: 'Who we are', href: '/#about' }` → `href: '/about'`.
  - `HubFooter.tsx`: `<li><a href="/#about">Who we are</a></li>` → `href="/about"`.
  - `Intro.tsx`: after the `<ul className="facts" data-reveal>…</ul>` add `<a className="more" href="/about" data-reveal>More about the group <span aria-hidden="true">→</span></a>`.
  - `design/hub-home.html`: nav `<a href="#about">Who we are</a>` → `href="hub-about.html"`; footer Group link the same; after the intro's `<ul class="facts" data-reveal>…</ul>` add `<a class="more" href="hub-about.html" data-reveal>More about the group <span aria-hidden="true">→</span></a>`. Append to `design/shared/hub-home.css` an `.intro .more` rule (inline-flex, gap 8px, min-height 44px, margin-top 24px, `font: 600 16px/1 var(--f-body)`, black text, 1px underline via `border-bottom` that turns gold on hover, visible focus ring). `npm run port:css` (restore CRLF-noise-only files).
  - `design/hub-about.html`: confirm its nav/footer "Who we are" link to `hub-about.html` and the other links go to `hub-home.html#…` (Task 2 set this).
  - Grep `tests/` for `Who we are`, `#about`, `/#about` and update any hub expectation that encodes the old nav/footer href (a test that encodes the nav list is legitimate to update; note each change in the report).
  - `web/README.md`: add a short section "About page": "The group's About page is `web/src/pages-home/hub/About.tsx`, served at `thegenixgroup.com/about`. It reuses names, taglines and origins from `SITES`, and promise wording from the Logistics and Home Upgrades pages. Update the text there when a promise or business changes. Division and Multimedia About pages don't exist yet (`/about` is a 404 there). The mailing address shows only when street, city, state and ZIP are all set under Admin → Sites → hub."

- [ ] **Step 3: Run the new test and neighbours** — `npx playwright test tests/e2e/about-links.e2e.spec.ts tests/e2e/about.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/hub-home.e2e.spec.ts tests/e2e/chrome.e2e.spec.ts tests/e2e/parity.e2e.spec.ts --reporter=line` → pass (`links.e2e` now follows `/about` from the hub home and must find it 200). Check the hub header at 961, 1024 and 1280 px and the 390 px mobile menu in prototype and app: no wrap or overflow (the nav label set is unchanged, only an href changed).

- [ ] **Step 4: Full verification.** `npx tsc --noEmit`; `npx vitest run`; then (not concurrently) the whole suite `npx playwright test --reporter=line` (~15 min; dev server on :3000; run it in the background writing to a file in the scratchpad and poll the file with short checks; re-run a known-flaky spec once alone: "clicking during the swing", "dragging moves the split", parity phone specs, hu-quote). Report pass/fail counts and failure names. Fix only failures this branch caused, with a test.

- [ ] **Step 5: Commit**

```bash
git add ../design web/src web/tests web/README.md
git commit -m "feat(about): Who we are links to the About page from the hub nav, footer and home intro"
```

---

## Self-review notes

- **Spec coverage:** hub-only route and 404s (T2); content: header, three businesses with existing taglines/promises, Find us with the address rule (T2); metadata, canonical, hub-only sitemap (T2); nav/footer/intro links with the home intro kept (T3); CSS move byte-identical (T1); prototype-first + parity (T2–T3); README, axe/console, links, unit (T2–T3).
- **Review Focus → tests:** 1 → T1 Step 4; 2 → T2 unit; 3 → T2 unit + e2e; 4 → T2 e2e + seo unit; 5 → T2 e2e (320 px) + T3 e2e (header from About).
- **Names used across tasks:** `HubAbout`, `ABOUT_HEADINGS`, `.about-hero`, `.about-biz`, `.about-biz-list`, `.about-verb`, `.about-tag`, `.about-promises`, `.about-find`, `.about-cta`, `.intro .more`.
