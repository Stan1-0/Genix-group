# Division Services Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/services` pages to Genix Logistics and Genix Home Upgrades, each service with its own section and a "Get a quote" button that opens the division's `/contact` form with that service pre-selected.

**Architecture:** One typed data module holds every service (copy taken verbatim from the home pages) and builds the page's JSON-LD; one shared `ServicesPage` component renders it for either division. The two shared quote-form components gain an optional `preselect` prop that only the `/contact` route passes (parsed from the query with allow-lists), so the home forms stay byte-identical. Prototype first, then parity.

**Tech Stack:** Next.js 16.3.6, React 19, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-division-services-pages-design.md` (binding).

## Global Constraints

- All app code in `web/`; run commands from `web/`. Prototypes in repo-root `design/`. This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` before using route, `searchParams` or metadata APIs. `proxy.ts` rewrites `logistics.localhost:3000/services` → `/logistics/services`.
- `/services` renders for `logistics` and `homeupgrades` only; `hub`, `multimedia`, unknown → `notFound()`.
- **No new claims.** Every description, list, photo and quoting promise is copied verbatim from the existing site (values below). No prices, timelines, sizes, areas or guarantees beyond those.
- Home Upgrades has no Renovation section (not offered).
- Quote links: Logistics `/contact?kind=business` (freight), `/contact?kind=move` (moves); Home Upgrades `/contact?project=accent&property=home` (accent walls), `/contact?project=outdoor`, `/contact?project=other` (handyman), `/contact?project=accent&property=business` (reception); closing button `/contact`.
- Allow-lists: `kind` ∈ {business, move}; `project` ∈ {accent, outdoor, other}; `property` ∈ {home, business}. Anything else (arrays, junk) → not pre-selected. Raw query values are never rendered.
- **The home pages' form HTML must stay byte-identical** (they pass no `preselect`).
- Metadata: title "Services | Genix Logistics" / "Services | Genix Home Upgrades" via `pageMetadata(site, '/services', { title: 'Services', description })`, canonical `<division origin>/services`, indexable; `/services` added to that division's `pages` only.
- Own `<main id="main">`; no motion (no `MotionRoot`, no `data-reveal`/`data-split`). The pinned quote bar behaves as on other division pages (no `data-no-quote-bar`).
- New CSS prefixed `.svcpage-`, existing division tokens; no blur, no decorative pills, no new animation. Generated CSS only via `npm run port:css` (restore files that show only CRLF noise: `git diff -w --ignore-space-at-eol --stat -- <file>` empty → `git checkout -- <file>`). Parity 2% limit stays.
- Playwright `--reporter=line`, never concurrently with Vitest, never two Playwright commands at once; never `npm run build` with the dev server up; never kill node or docker processes. ECONNREFUSED/Postgres/Docker errors → STOP and report. Node can't resolve `*.localhost`: use Playwright `page` or `curl -H 'Host: …' http://127.0.0.1:3000/…`.
- Before touching `design/` run `git status --short design/`; uncommitted changes you didn't make → STOP (NEEDS_CONTEXT). Never revert/stash files you didn't change.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec)

1. The h1s reuse each home section's existing heading ("Two ways we help." / "Good things start with the right helping hand.") so no new copy is needed; the owner can change them.
2. One shared `ServicesPage` component renders both divisions from data (DRY); each division's CSS styles the same `.svcpage-*` classes.
3. "What to send us" lines restate the existing form fields / Quote-section wording; they make no new promise.

## Review Focus

1. **The home quote forms must not change** (byte-identical HTML; existing form specs pass) — Task 1.
2. **Junk or array query values** (`?kind=truck`, `?kind=move&kind=business`, `?project=<script>`) pre-select nothing and never appear in the HTML — Task 1.
3. **A pre-selected Logistics "move" with JS on** shows the move load options (not the business ones) — Task 1.
4. **Every Services "Get a quote" button lands on a form with that choice made**, and every footer/nav anchor exists on the page — Tasks 3–4.
5. **Phones:** no sideways scroll at 320 px; photos never overflow; Logistics sections read fine with no photo — Task 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `web/src/inquiries/forms/preselect.ts` (new) | `parseLogisticsPreselect`, `parseHuPreselect` + types |
| `web/src/components/forms/LogisticsQuoteForm.tsx`, `HuQuoteFormBlock.tsx` | optional `preselect` prop |
| `web/src/pages-home/logistics/Contact.tsx`, `homeupgrades/Contact.tsx`, `app/(sites)/[site]/contact/page.tsx` | thread `preselect` from the query |
| `web/src/sites/services.ts` (new) | `SERVICES`, `QUOTING`, `SERVICES_INTRO`, `servicesJsonLd` |
| `web/src/components/site/division/ServicesPage.tsx` (new) | renders a division's Services page |
| `web/src/app/(sites)/[site]/services/page.tsx` (new) | route + metadata |
| `design/logistics-services.html`, `design/homeupgrades-services.html` (new); `design/shared/style-logistics.css`, `design/shared/homeupgrades-home.css` | prototypes + `.svcpage-*` CSS |
| config, `DivisionFooter.tsx`, home `Lanes.tsx` / `Services.tsx`, home prototypes, README (Task 4) | links |

---

### Task 1: Pre-select a service on the division Contact forms

**Files:**
- Create: `web/src/inquiries/forms/preselect.ts`, `web/tests/unit/preselect.test.ts`, `web/tests/e2e/contact-preselect.e2e.spec.ts`
- Modify: `web/src/components/forms/LogisticsQuoteForm.tsx`, `web/src/components/forms/HuQuoteFormBlock.tsx`, `web/src/pages-home/logistics/Contact.tsx`, `web/src/pages-home/homeupgrades/Contact.tsx`, `web/src/app/(sites)/[site]/contact/page.tsx`

**Interfaces:**
- Produces: `type LogisticsPreselect = { kind?: 'business' | 'move' }`; `type HuPreselect = { project?: 'accent' | 'outdoor' | 'other'; property?: 'home' | 'business' }`; `type Query = Record<string, string | string[] | undefined>`; `parseLogisticsPreselect(q: Query): LogisticsPreselect`; `parseHuPreselect(q: Query): HuPreselect`; `LogisticsQuoteForm({ data, preselect? })`, `HuQuoteFormBlock({ data, preselect? })`, `LogisticsContact({ data, preselect? })`, `HomeUpgradesContact({ data, preselect? })`. Tasks 3–4 link to `/contact?…`.

- [ ] **Step 1: Capture the "before" form HTML of both HOME pages** (dev server on :3000). Save the `<form>` of `logistics.localhost:3000/` (`id="quote-form"`) and `homeupgrades.localhost:3000/` (`id="hu-quote-form"`) to the scratchpad (`curl -s -H 'Host: logistics.localhost:3000' http://127.0.0.1:3000/` and cut from `<form` containing the id to `</form>`), as `before-log.html` / `before-hu.html`.

- [ ] **Step 2: Write the failing unit tests** — `web/tests/unit/preselect.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseHuPreselect, parseLogisticsPreselect } from '@/inquiries/forms/preselect'

describe('parseLogisticsPreselect', () => {
  it('accepts business and move only', () => {
    expect(parseLogisticsPreselect({ kind: 'move' })).toEqual({ kind: 'move' })
    expect(parseLogisticsPreselect({ kind: 'business' })).toEqual({ kind: 'business' })
    for (const kind of ['truck', '', 'MOVE', '<script>', undefined]) expect(parseLogisticsPreselect({ kind })).toEqual({})
    expect(parseLogisticsPreselect({ kind: ['move', 'business'] })).toEqual({})
  })
})

describe('parseHuPreselect', () => {
  it('accepts the allowed project and property values independently', () => {
    expect(parseHuPreselect({ project: 'accent', property: 'business' })).toEqual({ project: 'accent', property: 'business' })
    expect(parseHuPreselect({ project: 'outdoor' })).toEqual({ project: 'outdoor' })
    expect(parseHuPreselect({ project: 'renovation', property: 'home' })).toEqual({ property: 'home' })
    expect(parseHuPreselect({ project: ['accent'], property: 'office' })).toEqual({})
    expect(parseHuPreselect({})).toEqual({})
  })
})
```

- [ ] **Step 3: Write the failing e2e** — `web/tests/e2e/contact-preselect.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const LOG = 'http://logistics.localhost:3000/contact'
const HU = 'http://homeupgrades.localhost:3000/contact'

test('Logistics ?kind=move checks Plan a move and shows the move load options', async ({ page }) => {
  await page.goto(`${LOG}?kind=move`)
  await expect(page.locator('input[name="kind"][value="move"]')).toBeChecked()
  const options = await page.locator('#qLoad option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean))
  expect(options).toEqual(['studio', '1-2bed', '3bed', 'office'])
})

test('Logistics junk or repeated kind falls back to the default', async ({ page }) => {
  for (const q of ['kind=truck', 'kind=move&kind=business', 'kind=%3Cscript%3E']) {
    await page.goto(`${LOG}?${q}`)
    await expect(page.locator('input[name="kind"][value="business"]')).toBeChecked()
    expect(await page.content()).not.toContain('<script>')
  }
})

test('Home Upgrades ?project and ?property check those pills', async ({ page }) => {
  await page.goto(`${HU}?project=accent&property=business`)
  await expect(page.locator('input[name="project"][value="accent"]')).toBeChecked()
  await expect(page.locator('input[name="property"][value="business"]')).toBeChecked()
  await page.goto(`${HU}?project=outdoor`)
  await expect(page.locator('input[name="project"][value="outdoor"]')).toBeChecked()
  await expect(page.locator('input[name="property"]:checked')).toHaveCount(0)
  await page.goto(`${HU}?project=renovation`)
  await expect(page.locator('input[name="project"]:checked')).toHaveCount(0)
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('pre-selection is in the server HTML', async ({ page }) => {
    await page.goto(`${LOG}?kind=move`)
    await expect(page.locator('input[name="kind"][value="move"]')).toBeChecked()
    await page.goto(`${HU}?project=other`)
    await expect(page.locator('input[name="project"][value="other"]')).toBeChecked()
  })
})
```

- [ ] **Step 4: Run them** — `npx vitest run tests/unit/preselect.test.ts` and `npx playwright test tests/e2e/contact-preselect.e2e.spec.ts --reporter=line` → FAIL.

- [ ] **Step 5: Implement.**

`web/src/inquiries/forms/preselect.ts`:

```ts
/** Which service a link to /contact pre-selects. Only allow-listed single values count; the raw
    query is never rendered. Used by the /contact route; the home pages never pre-select. */
export type Query = Record<string, string | string[] | undefined>
export type LogisticsPreselect = { kind?: 'business' | 'move' }
export type HuPreselect = { project?: 'accent' | 'outdoor' | 'other'; property?: 'home' | 'business' }

const pick = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined

export function parseLogisticsPreselect(q: Query): LogisticsPreselect {
  const kind = pick(q.kind, ['business', 'move'] as const)
  return kind ? { kind } : {}
}

export function parseHuPreselect(q: Query): HuPreselect {
  const project = pick(q.project, ['accent', 'outdoor', 'other'] as const)
  const property = pick(q.property, ['home', 'business'] as const)
  return { ...(project ? { project } : {}), ...(property ? { property } : {}) }
}
```

`LogisticsQuoteForm.tsx`: signature `({ data, preselect }: { data: SiteData; preselect?: LogisticsPreselect })`; the two kind radios become `defaultChecked={(preselect?.kind ?? 'business') === 'business'}` and `defaultChecked={preselect?.kind === 'move'}` (with no `preselect` this renders exactly the old HTML). The enhancer already starts from `kindOf()`; if JS mode doesn't show move loads for a pre-checked "move", fix it inside `QuoteForm.tsx`'s start-up (not by changing the markup).
`HuQuoteFormBlock.tsx`: signature `({ data, preselect }: { data: SiteData; preselect?: HuPreselect })`; add `defaultChecked={preselect?.project === '<value>'}` to each `project` radio and `defaultChecked={preselect?.property === '<value>'}` to each `property` radio (no `preselect` → no `checked` attribute → identical HTML). If `HuQuoteForm.tsx` keeps pill state in JS, make its start-up read the checked radios.
`logistics/Contact.tsx` and `homeupgrades/Contact.tsx`: accept `preselect?` and pass it to the form.
`contact/page.tsx`: `searchParams: Promise<Query>` (import `Query`); the hub branch keeps `isAbout((await searchParams).about)`; the logistics branch passes `preselect={parseLogisticsPreselect(await searchParams)}`, the homeupgrades branch `preselect={parseHuPreselect(await searchParams)}`.

- [ ] **Step 6: Verify.** `npx tsc --noEmit`; `npx vitest run`; re-capture the two HOME forms as `after-*.html` and `diff` against `before-*.html` → identical (paste the result). Then `npx playwright test tests/e2e/contact-preselect.e2e.spec.ts tests/e2e/contact.e2e.spec.ts tests/e2e/quote-submit.e2e.spec.ts tests/e2e/hu-quote.e2e.spec.ts tests/e2e/hub-contact.e2e.spec.ts --reporter=line` → pass.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "feat(contact): links can pre-select a service on the division quote forms"
```

---

### Task 2: Services data and structured data

**Files:**
- Create: `web/src/sites/services.ts`, `web/tests/unit/services.test.ts`

**Interfaces:**
- Produces: `type ServiceItem = { id: string; title: string; body: string; list: readonly string[]; image: { src: string; alt: string } | null; send: string; quoteHref: string }`; `type ServiceSite = 'logistics' | 'homeupgrades'`; `SERVICES: Record<ServiceSite, readonly ServiceItem[]>`; `SERVICES_INTRO: Record<ServiceSite, { h1: string; lede: string; description: string }>`; `QUOTING: Record<ServiceSite, readonly string[]>`; `servicesJsonLd(site: ServiceSite, data: SiteData, root?: string): Record<string, unknown>`. Task 3 renders these; Task 4 links to `/services#<id>`.

- [ ] **Step 1: Write the failing unit tests** — `web/tests/unit/services.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { QUOTING, SERVICES, SERVICES_INTRO, servicesJsonLd } from '@/sites/services'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'

describe('SERVICES', () => {
  it('lists the services in page order with the agreed anchors', () => {
    expect(SERVICES.logistics.map((s) => s.id)).toEqual(['freight', 'moves'])
    expect(SERVICES.homeupgrades.map((s) => s.id)).toEqual(['accent-walls', 'outdoor', 'handyman', 'reception'])
    expect(SERVICES.homeupgrades.map((s) => s.title)).not.toContain('Renovation')
  })
  it('sends each service to /contact with an allow-listed pre-selection', () => {
    expect(SERVICES.logistics.map((s) => s.quoteHref)).toEqual(['/contact?kind=business', '/contact?kind=move'])
    expect(SERVICES.homeupgrades.map((s) => s.quoteHref)).toEqual([
      '/contact?project=accent&property=home',
      '/contact?project=outdoor',
      '/contact?project=other',
      '/contact?project=accent&property=business',
    ])
  })
  it('has photos for Home Upgrades only, each with alt text', () => {
    expect(SERVICES.logistics.every((s) => s.image === null)).toBe(true)
    expect(SERVICES.homeupgrades.every((s) => s.image && s.image.alt.length > 10)).toBe(true)
  })
  it('makes no claims beyond the existing ones', () => {
    const all = JSON.stringify([SERVICES, SERVICES_INTRO, QUOTING])
    expect(all).not.toMatch(/\$\d|guarantee|insured|licensed|years|same day|24\/7|free/i)
  })
})

describe('servicesJsonLd', () => {
  it('is an ItemList of the page services with the division as provider', () => {
    const ld = servicesJsonLd('homeupgrades', toSiteData('homeupgrades', null), root) as { '@type': string; itemListElement: { position: number; item: { '@type': string; name: string; url: string; provider: { name: string } } }[] }
    expect(ld['@type']).toBe('ItemList')
    expect(ld.itemListElement).toHaveLength(4)
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, item: { '@type': 'Service', name: 'Accent walls & TV units', url: 'https://homeupgrades.thegenixgroup.com/services#accent-walls', provider: { name: 'Genix Home Upgrades' } } })
  })
})
```

(The claims regex guards against invented copy; "same-day" in the Logistics freight description is existing copy — the regex uses "same day" with a space so the verbatim "same-day" does not trip it. Check the real text and adjust the regex only if existing verbatim copy matches it.)

- [ ] **Step 2: Run** — `npx vitest run tests/unit/services.test.ts` → FAIL.

- [ ] **Step 3: Implement** `web/src/sites/services.ts`:

```ts
import { SITES, siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'

export type ServiceSite = 'logistics' | 'homeupgrades'
export type ServiceItem = { id: string; title: string; body: string; list: readonly string[]; image: { src: string; alt: string } | null; send: string; quoteHref: string }

/* Copy is verbatim from the home pages (logistics sections/Lanes.tsx, homeupgrades sections/Services.tsx and
   sections/Quote.tsx). Add nothing here that the sites don't already say. */
const LOG_SEND = "Send us the pickup and drop-off ZIP codes, the date (or say you're flexible) and what's moving."
const HU_SEND = 'A few photos and a sentence about what you want is enough to start.'

export const SERVICES: Record<ServiceSite, readonly ServiceItem[]> = {
  logistics: [
    { id: 'freight', title: 'Freight & deliveries', body: 'Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs across California.', list: ['Pallets & part loads', 'Full truckloads', 'Last-mile & courier'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=business' },
    { id: 'moves', title: 'Home & office moves', body: 'Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted.', list: ['Studio to 3+ bedrooms', 'Office moves', 'Local & long-distance moves'], image: null, send: LOG_SEND, quoteHref: '/contact?kind=move' },
  ],
  homeupgrades: [
    { id: 'accent-walls', title: 'Accent walls & TV units', body: 'Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting.', list: ['Marble panels', 'Accent walls', 'Customized TV unit'], image: { src: '/brand/hu-project-marble-wall.jpg', alt: 'Backlit marble TV wall with slatted wood surround' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=home' },
    { id: 'outdoor', title: 'Outdoor builds', body: 'Decks, patios and outdoor structures that turn a yard into usable space.', list: ['Decks', 'Patios', 'Pergolas'], image: { src: 'https://images.unsplash.com/photo-1656646549633-80ad4bd2ab40?w=900&q=70&auto=format&fit=crop', alt: 'A wooden deck with outdoor seating beside a house' }, send: HU_SEND, quoteHref: '/contact?project=outdoor' },
    { id: 'handyman', title: 'Handyman services', body: 'The small jobs that make a home work: fixes, fittings and finishing touches.', list: ['TV wall mounting', 'Repairs', 'Fittings'], image: { src: '/brand/hu-handyman.jpg', alt: 'Hands driving a screw into a door lock plate with a cordless screwdriver' }, send: HU_SEND, quoteHref: '/contact?project=other' },
    { id: 'reception', title: 'Accent walls for reception areas', body: 'The first thing visitors see, built to set the tone: a statement wall behind your front desk in stone, slatted wood and integrated lighting.', list: ['Reception walls', 'Stone & wood finishes', 'Feature lighting'], image: { src: 'https://images.unsplash.com/photo-1758448093806-88b2089068ab?w=900&q=70&auto=format&fit=crop', alt: 'A modern reception area with a stone and slatted-wood accent wall behind the front desk' }, send: HU_SEND, quoteHref: '/contact?project=accent&property=business' },
  ],
}

export const SERVICES_INTRO: Record<ServiceSite, { h1: string; lede: string; description: string }> = {
  logistics: {
    h1: 'Two ways we help.',
    lede: 'For businesses that ship every week, and for people moving once. Either way it starts with the same short form.',
    description: 'Genix Logistics services: freight and deliveries for businesses, and home and office moves. Get a quote with one short form.',
  },
  homeupgrades: {
    h1: 'Good things start with the right helping hand.',
    lede: 'One task or a whole to-do list. We make the next step simple.',
    description: 'Genix Home Upgrades services: accent walls and TV units, outdoor builds, handyman work and reception accent walls.',
  },
}

/* Existing promises only (logistics sections/Why.tsx + the sent copy; homeupgrades sections/Quote.tsx + the sent copy). */
export const QUOTING: Record<ServiceSite, readonly string[]> = {
  logistics: ['You see the price before we schedule anything.', "We'll get back to you within two business days with a price."],
  homeupgrades: ["We'll arrange a visit and send a written quote.", "We'll get back to you within two business days to arrange a visit."],
}

export function servicesJsonLd(site: ServiceSite, data: SiteData, root?: string): Record<string, unknown> {
  const origin = siteOrigin(site, root)
  const provider = { '@type': SITES[site].schemaType, name: SITES[site].name, url: `${origin}/` }
  const areaServed = data.areaServed ? { areaServed: { '@type': data.areaServed.type, name: data.areaServed.name } } : {}
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SITES[site].name} services`,
    itemListElement: SERVICES[site].map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Service', name: s.title, description: s.body, url: `${origin}/services#${s.id}`, provider, ...areaServed },
    })),
  }
}
```

Before committing, open `logistics/sections/Lanes.tsx`, `logistics/sections/Why.tsx`, `homeupgrades/sections/Services.tsx` and `homeupgrades/sections/Quote.tsx` and confirm every string above matches the existing copy character for character (fix the data, not the home files, if anything differs).

- [ ] **Step 4: Run** — `npx vitest run tests/unit/services.test.ts` → PASS; `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/sites/services.ts tests/unit/services.test.ts
git commit -m "feat(services): service list, quoting promises and structured data from the existing copy"
```

---

### Task 3: The Services pages (prototype, component, route, tests)

**Files:**
- Create: `design/logistics-services.html`, `design/homeupgrades-services.html`, `web/src/components/site/division/ServicesPage.tsx`, `web/src/app/(sites)/[site]/services/page.tsx`, `web/tests/e2e/services.e2e.spec.ts`
- Modify: `design/shared/style-logistics.css`, `design/shared/homeupgrades-home.css` (append `.svcpage-*`), `web/src/sites/config.ts` (both divisions' `pages` gain `/services`), `web/tests/e2e/parity.e2e.spec.ts`, `web/tests/e2e/quality.e2e.spec.ts`, `web/tests/unit/seo.test.ts`; regenerated generated CSS

**Interfaces:**
- Consumes: `SERVICES`, `SERVICES_INTRO`, `QUOTING`, `servicesJsonLd`, `ServiceSite` (Task 2); `JsonLd` (`@/components/site/JsonLd`); `pageMetadata`; `getSiteData`.
- Produces: `ServicesPage({ site, data }: { site: ServiceSite; data: SiteData })`; route `/<division>/services`.

Markup contract (prototype and app match):

```html
<main id="main">                                    <!-- prototype: id="top" -->
  <section class="svcpage-hero" id="services-top"><div class="wrap">
    <p class="label">Services</p>
    <h1 class="h-display">{SERVICES_INTRO[site].h1}</h1>
    <p class="body svcpage-lede">{SERVICES_INTRO[site].lede}</p>
  </div></section>
  <!-- one per service, in SERVICES order -->
  <section class="svcpage-item" id="{id}"><div class="wrap svcpage-grid">
    <div class="svcpage-copy">
      <h2 class="h-section">{title}</h2>
      <p class="body">{body}</p>
      <ul class="svcpage-list"><li>{each list item}</li></ul>
      <p class="svcpage-send"><strong>What to send us:</strong> {send}</p>
      <a class="btn btn-gold" href="{quoteHref}">Get a quote <span aria-hidden="true">→</span></a>
    </div>
    <!-- only when image -->
    <figure class="svcpage-media"><img src="{src}" alt="{alt}" loading="lazy" /></figure>
  </div></section>
  <section class="svcpage-quoting" id="quoting"><div class="wrap">
    <h2 class="h-section">How quoting works</h2>
    <ul class="svcpage-list"><li>{each QUOTING line}</li></ul>
    <a class="btn btn-gold" href="/contact">Get a quote <span aria-hidden="true">→</span></a>
  </div></section>
</main>
```

Images: render the way `homeupgrades/sections/Services.tsx` renders the same pictures (if it uses `next/image`, use it with the same props/`sizes`; if a plain `<img>`, use that). Check how the home handles the remote Unsplash URLs (`next.config.ts` `images.remotePatterns`) and reuse it.

- [ ] **Step 1: Write the failing e2e** — `web/tests/e2e/services.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const SITES = {
  logistics: { url: 'http://logistics.localhost:3000/services', title: 'Services | Genix Logistics', ids: ['freight', 'moves'], hrefs: ['/contact?kind=business', '/contact?kind=move'] },
  homeupgrades: { url: 'http://homeupgrades.localhost:3000/services', title: 'Services | Genix Home Upgrades', ids: ['accent-walls', 'outdoor', 'handyman', 'reception'], hrefs: ['/contact?project=accent&property=home', '/contact?project=outdoor', '/contact?project=other', '/contact?project=accent&property=business'] },
} as const

for (const [site, s] of Object.entries(SITES)) {
  test(`${site} /services: sections, quote links, metadata, JSON-LD`, async ({ page }) => {
    await page.goto(s.url)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(await page.locator('.svcpage-item').evaluateAll((els) => els.map((e) => e.id))).toEqual([...s.ids])
    expect(await page.locator('.svcpage-item a.btn').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([...s.hrefs])
    await expect(page.locator('#quoting a.btn')).toHaveAttribute('href', '/contact')
    await expect(page.locator('main#main')).toHaveCount(1)
    expect(await page.title()).toBe(s.title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', s.url)
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.some((t) => t.includes('"ItemList"') && t.includes('"Service"'))).toBe(true)
    await expect(page.locator('main')).not.toContainText('Renovation')
  })

  test(`${site} /services: a Get a quote button lands on the form with the choice made`, async ({ page }) => {
    await page.goto(s.url)
    await page.locator('.svcpage-item a.btn').last().click()
    await expect(page).toHaveURL(new RegExp(`/contact\\?`))
    if (site === 'logistics') await expect(page.locator('input[name="kind"][value="move"]')).toBeChecked()
    else {
      await expect(page.locator('input[name="project"][value="accent"]')).toBeChecked()
      await expect(page.locator('input[name="property"][value="business"]')).toBeChecked()
    }
  })

  test(`${site} /services: no sideways scroll at 320 px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(s.url)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
}

for (const host of ['localhost:3000', 'multimedia.localhost:3000']) {
  test(`${host}/services is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}/services`)
    expect(res?.status()).toBe(404)
  })
}
```

Add to `PARITY`: `{ site: 'logistics-services', proto: '/logistics-services.html', app: 'http://logistics.localhost:3000/services', chrome: true, sections: true }` and the same for `homeupgrades-services`. Add both URLs to `HOMES` in `quality.e2e.spec.ts`. In `seo.test.ts` add: logistics and homeupgrades sitemaps contain `/services</loc>`, hub and multimedia do not.

- [ ] **Step 2: Run to see them fail** — `npx playwright test tests/e2e/services.e2e.spec.ts --reporter=line`.

- [ ] **Step 3: Build the prototypes.** `design/logistics-services.html` from `design/logistics-contact.html` (head: title "Services | Genix Logistics", description = `SERVICES_INTRO.logistics.description`, canonical `https://logistics.thegenixgroup.com/services`, same stylesheets; header/footer as in logistics-contact.html; `<main id="top">` per the contract with the Logistics data; buttons link to `logistics-contact.html?kind=…`; no quote form, no `#quoteBar`? — keep the pinned quote bar markup and `shared/quote-bar.js` exactly as on `logistics-home.html` since the page has no form). `design/homeupgrades-services.html` the same from `design/homeupgrades-contact.html` (stylesheets incl. `shared/homeupgrades-home.css`; photos `assets/…` for local files and the Unsplash URLs as is). Append `.svcpage-*` rules to `design/shared/style-logistics.css` (scoped like that file) and `design/shared/homeupgrades-home.css` (as in that file): hero band like the Contact hero but light (Logistics: reuse the section spacing of `.sec`; Home Upgrades: the page's paper surface), `.svcpage-grid` two columns (copy 1fr / media 1fr, gap `clamp(32px, 5vw, 72px)`, align center) collapsing to one column ≤ 960 px with the copy first; when there is no `.svcpage-media` the copy spans the row with max-width ≈ 62ch (Logistics); alternate sections get the division's secondary surface for rhythm; `.svcpage-list` uses the existing tick/list style from the home (`ul.ticks` on Logistics, the card list on Home Upgrades), not pills; `.svcpage-media img` `aspect-ratio: 4/3; object-fit: cover; width: 100%`, radius as the home cards; `.svcpage-send` muted small text; `.svcpage-quoting` the closing band. `npm run port:css`. Screenshots of both prototypes at 1280/390 to the scratchpad; LOOK and describe (header legible, rhythm, photo sizes, phone stacking, contrast).

- [ ] **Step 4: Implement the app.** `web/src/components/site/division/ServicesPage.tsx` renders the contract from the data (`<JsonLd data={servicesJsonLd(site, data)} />` inside `<main>`). `web/src/app/(sites)/[site]/services/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServicesPage } from '@/components/site/division/ServicesPage'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'
import { SERVICES_INTRO } from '@/sites/services'

type Props = { params: Promise<{ site: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'logistics' && site !== 'homeupgrades') return {}
  return pageMetadata(site, '/services', { title: 'Services', description: SERVICES_INTRO[site].description })
}

// Services pages exist for the two divisions with services to list; everything else is a 404.
export default async function Services({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || (site !== 'logistics' && site !== 'homeupgrades')) notFound()
  return <ServicesPage site={site} data={await getSiteData(site)} />
}
```

`config.ts`: logistics `pages: ['/', '/contact', '/services']`, homeupgrades the same. `npm run port:css` (restore CRLF-only files).

- [ ] **Step 5: Run** — `npx tsc --noEmit`; `npx vitest run`; `npx playwright test tests/e2e/services.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/seo.e2e.spec.ts tests/e2e/sites.e2e.spec.ts --reporter=line` → pass (one solo re-run for a flaky parity phone spec). Fix real axe/contrast problems in the prototype CSS. Screenshot the app pages and compare with the prototypes.

- [ ] **Step 6: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(services): Logistics and Home Upgrades Services pages"
```

---

### Task 4: Links, docs, full run

**Files:**
- Modify: `web/src/sites/config.ts` (nav), `web/src/components/site/division/DivisionFooter.tsx` (`COLUMNS[*].services`), `web/src/pages-home/logistics/sections/Lanes.tsx`, `web/src/pages-home/homeupgrades/sections/Services.tsx` (an "All services" link), the four division prototypes (`*-home.html`, `*-contact.html`) and the two `*-services.html` (nav/footer hrefs), the prototype CSS for the new link if needed, `web/README.md`
- Create: `web/tests/e2e/services-links.e2e.spec.ts`

**Interfaces:** Consumes `/services` and its anchors. Produces links only.

- [ ] **Step 1: Write the failing test** — `web/tests/e2e/services-links.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const FOOTER = {
  logistics: [['Business freight', '/services#freight'], ['Last-mile & courier', '/services#freight'], ['Home & office moves', '/services#moves']],
  homeupgrades: [['Accent walls & TV units', '/services#accent-walls'], ['Outdoor builds', '/services#outdoor'], ['Handyman services', '/services#handyman']],
} as const

for (const [site, links] of Object.entries(FOOTER)) {
  const home = `http://${site}.localhost:3000/`
  test(`${site}: nav, footer and the home section link to /services`, async ({ page }) => {
    await page.goto(home)
    await expect(page.locator('nav#nav a', { hasText: /^Services$/ })).toHaveAttribute('href', '/services')
    for (const [label, href] of links) await expect(page.locator('footer a', { hasText: label })).toHaveAttribute('href', href)
    await expect(page.locator('#services a[href="/services"]')).toHaveCount(1)
    await page.locator('nav#nav a', { hasText: /^Services$/ }).click()
    await expect(page).toHaveURL(`${home}services`)
  })
  test(`${site}: every footer anchor exists on the Services page`, async ({ page }) => {
    await page.goto(`${home}services`)
    for (const [, href] of links) await expect(page.locator(href.slice('/services'.length))).toHaveCount(1)
  })
}
```

Run → FAIL.

- [ ] **Step 2: Implement.**
  - `config.ts`: logistics and homeupgrades nav `{ label: 'Services', href: '/#services' }` → `href: '/services'`.
  - `DivisionFooter.tsx` `COLUMNS`: logistics services `['Business freight', '/services#freight'], ['Last-mile & courier', '/services#freight'], ['Home & office moves', '/services#moves']`; homeupgrades `['Accent walls & TV units', '/services#accent-walls'], ['Outdoor builds', '/services#outdoor'], ['Handyman services', '/services#handyman']`.
  - Home sections: in `Lanes.tsx` and HU `sections/Services.tsx`, add inside the section's `.sec-head` (after the lede paragraph) `<a className="svcpage-more" href="/services">All services <span aria-hidden="true">→</span></a>` (with `data-reveal` like its siblings); same markup in the home prototypes (`href="logistics-services.html"` / `homeupgrades-services.html`); add a `.svcpage-more` rule to each division's prototype CSS (text link: 600 weight, underline offset, min-height 44px, inline-flex; visible focus), `npm run port:css`.
  - Prototypes: nav "Services" and the footer Services items → `*-services.html` / `*-services.html#<anchor>` in `*-home.html`, `*-contact.html`, `*-services.html`.
  - Grep `tests/` for `/#services` and division nav/footer expectations; update those that encode the old hrefs; list each change.
  - `web/README.md`: add "### Services pages" — "`/services` on Logistics and Home Upgrades is built from `web/src/sites/services.ts` (copy taken from the home pages; no claims the sites don't already make). Each 'Get a quote' button opens `/contact` with the service pre-selected (`?kind=` / `?project=` / `?property=`, allow-listed in `web/src/inquiries/forms/preselect.ts`). Change a service there and both the page and its structured data update."

- [ ] **Step 3: Run neighbours** — `npx playwright test tests/e2e/services-links.e2e.spec.ts tests/e2e/services.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/chrome.e2e.spec.ts tests/e2e/contact-links.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/logistics-home.e2e.spec.ts tests/e2e/homeupgrades-home.e2e.spec.ts --reporter=line` → pass. Header check at 961/1024/1280 and the 390 px menu (labels unchanged; only hrefs) — confirm no wrap/overflow.

- [ ] **Step 4: Verify (no full suite — the controller runs it).** `npx tsc --noEmit`; `npx vitest run`.

- [ ] **Step 5: Commit**

```bash
git add ../design web/src web/tests web/README.md
git commit -m "feat(services): nav, footer and home sections link to the Services pages"
```

---

## Self-review notes

- **Spec coverage:** pages, sections, verbatim copy, photos, send lines, quoting block, JSON-LD, metadata, sitemap, 404s (T2–T3); pre-selection with allow-lists and byte-identical homes (T1); nav/footer/home links and README (T4); prototypes + parity (T3–T4).
- **Review Focus → tests:** 1 → T1 Step 1/6 + existing form specs; 2 → T1 unit + e2e junk; 3 → T1 e2e move options; 4 → T3 click test + T4 anchor test; 5 → T3 320 px.
- **Names across tasks:** `Query`, `LogisticsPreselect`, `HuPreselect`, `parseLogisticsPreselect`, `parseHuPreselect`, `preselect`, `ServiceSite`, `ServiceItem`, `SERVICES`, `SERVICES_INTRO`, `QUOTING`, `servicesJsonLd`, `ServicesPage`, classes `.svcpage-hero/-item/-grid/-copy/-list/-send/-media/-quoting/-more`, anchors `freight, moves, accent-walls, outdoor, handyman, reception`.
- **BotID:** the Services pages have no form; quote buttons lead to `/contact`, already protected.
