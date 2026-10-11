# Home Upgrades Service Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one page per Home Upgrades service (`/services/accent-walls`, `/outdoor`, `/handyman`, `/reception`) with a hero, benefit cards, the existing process, FAQs beside the real quote form (service pre-selected), related services and a closing band.

**Architecture:** The four services' detail copy lives as data on the existing `SERVICES.homeupgrades` items in `web/src/sites/services.ts`; one `ServiceDetailPage` component renders any of them; a dynamic route `[site]/services/[slug]` serves the four slugs on the Home Upgrades host only. The page embeds the existing `HuQuoteFormBlock` with `preselect`, so it posts to `/services/<slug>` — that path is added to BotID's protected list first.

**Tech Stack:** Next.js 16.3.6, React 19, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-homeupgrades-service-detail-pages-design.md` (binding; the Appendix copy is used verbatim).

## Global Constraints

- All app code in `web/`; run commands from `web/`. Prototypes in repo-root `design/`. This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` before using dynamic routes, `generateStaticParams` or metadata.
- Routes: `/services/<slug>` renders for `homeupgrades` and slug ∈ {`accent-walls`, `outdoor`, `handyman`, `reception`}; everything else `notFound()` (Logistics, hub, Multimedia hosts and unknown slugs).
- **Layout only from the owner's screenshot** — no copy, branding, phone number or claims from that site. All new copy is the spec Appendix, verbatim. No prices, timelines, "free", guarantees, licensing/insurance or years claims.
- **BotID:** `BOTID_PROTECT` gains `{ path: '/services/*', method: 'POST' }` (BotID matches `*` as `.*`); the pinned unit test updated. This lands in Task 1, before any page with a form exists.
- The embedded form is the existing `HuQuoteFormBlock` with `preselect`: accent-walls `{ project: 'accent', property: 'home' }`, outdoor `{ project: 'outdoor' }`, handyman `{ project: 'other' }`, reception `{ project: 'accent', property: 'business' }` — derived from each item's existing `quoteHref` with `parseHuPreselect`. One form per page; it sits in `<section id="quote">`.
- Pinned quote bar: the hero's buttons are in `.hero-actions` (the bar appears once they scroll away) and the form section is `#quote` (the bar hides over it; existing Home Upgrades rules); `<main data-quote-href="#quote">` so the bar's button scrolls to the page's form.
- Own `<main id="main">`; no motion (no `MotionRoot`, `data-reveal`, `data-split`). FAQs are native `<details>/<summary>`.
- Metadata: title "<Service title> | Genix Home Upgrades" via `pageMetadata('homeupgrades', '/services/<slug>', { title, description })`, canonical `https://homeupgrades.thegenixgroup.com/services/<slug>`, indexable; the four paths in `SITES.homeupgrades.pages`.
- JSON-LD: one `@graph` with `Service`, `FAQPage` and `BreadcrumbList`.
- Unsplash photos keep the existing "Stock photo" badge (`span.svc-stock`).
- New CSS prefixed `.svcd-`, existing HU tokens, no blur/pills/new animation; generated CSS only via `npm run port:css` (restore CRLF-noise-only files). Parity 2% stays.
- Playwright `--reporter=line`, never concurrently with Vitest, never two Playwright commands at once; never `npm run build` with the dev server up; never kill node/docker; ECONNREFUSED/Postgres/Docker errors → STOP and report.
- Before touching `design/`: `git status --short design/`; uncommitted changes you didn't make → STOP (NEEDS_CONTEXT). Never revert/stash files you didn't change.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec)

1. The process section reuses the home's copy through a shared `PROCESS` constant in `services.ts`; the home `Process.tsx` is not refactored (its markup has motion attributes the detail page must not have).
2. The pre-selection is derived from each item's existing `quoteHref` (one source of truth) rather than a second field.

## Review Focus

1. **A JS submission from a detail page in production** must not be dropped — `/services/*` in `BOTID_PROTECT` (Task 1 unit) and a real GX-HUP inquiry from each detail page in e2e (Task 2).
2. **Unknown slug, trailing slash, uppercase slug, or a Logistics host** → 404, never a broken page (Task 2 e2e).
3. **The form arrives with the right service chosen** on every page, with and without JS (Task 2 e2e).
4. **A visitor on a phone**: no sideways scroll at 320 px, FAQ open/close by keyboard, the pinned bar scrolls to the form and hides over it (Task 2 e2e).
5. **No invented claims** in any detail string (Task 1 unit copy guard).

---

## File Structure

| File | Responsibility |
|---|---|
| `web/src/inquiries/bot-check.ts` | `/services/*` protected |
| `web/src/sites/services.ts` | `ServiceDetail` data on HU items, `PROCESS`, `CLOSING`, `HU_SERVICE_SLUGS`, `huServiceBySlug`, `serviceDetailJsonLd` |
| `web/src/components/site/division/ServiceDetailPage.tsx` (new) | renders one service's page |
| `web/src/app/(sites)/[site]/services/[slug]/page.tsx` (new) | route, static params, metadata |
| `design/homeupgrades-service.html` (new), `design/shared/homeupgrades-home.css` | prototype + `.svcd-*` CSS |
| `web/src/components/site/division/ServicesPage.tsx`, `DivisionFooter.tsx`, `design/homeupgrades-services.html` + HU prototypes, README | links (Task 3) |

---

### Task 1: BotID path, detail data and structured data

**Files:**
- Modify: `web/src/inquiries/bot-check.ts`, `web/tests/unit/inquiry-bot-check.test.ts`, `web/src/sites/services.ts`
- Create: `web/tests/unit/service-detail.test.ts`

**Interfaces:**
- Produces: `type ServiceDetail = { eyebrow: string; lead: string; intro: string; fit: { label: string; h2: string; body: string; cards: readonly { title: string; line: string }[] }; faqs: readonly { q: string; a: string }[]; description: string }`; `ServiceItem.detail?: ServiceDetail` (HU items only); `HU_SERVICE_SLUGS: readonly string[]` (= HU ids); `huServiceBySlug(slug: string): ServiceItem | undefined` (exact match only); `PROCESS = { label, h2Lead, h2Gold, steps: readonly { title, body }[] }`; `CLOSING = { h2, lede }`; `serviceDetailJsonLd(item: ServiceItem, data: SiteData, root?: string): Record<string, unknown>` (`@graph` of Service, FAQPage, BreadcrumbList).

- [ ] **Step 1: Failing tests.** In `tests/unit/inquiry-bot-check.test.ts` change the pinned list to include `{ path: '/services/*', method: 'POST' }` after `/contact` (comment: Home Upgrades service detail pages). Create `tests/unit/service-detail.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CLOSING, HU_SERVICE_SLUGS, PROCESS, SERVICES, huServiceBySlug, serviceDetailJsonLd } from '@/sites/services'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'

describe('service detail data', () => {
  it('has a detail for every Home Upgrades service and none for Logistics', () => {
    expect(HU_SERVICE_SLUGS).toEqual(['accent-walls', 'outdoor', 'handyman', 'reception'])
    for (const s of SERVICES.homeupgrades) {
      const d = s.detail!
      expect(d.lead && d.intro && d.eyebrow && d.description).toBeTruthy()
      expect(d.fit.cards).toHaveLength(3)
      expect(d.faqs.length).toBeGreaterThanOrEqual(3)
      expect(d.description.length).toBeLessThanOrEqual(160)
    }
    expect(SERVICES.logistics.every((s) => s.detail === undefined)).toBe(true)
  })
  it('finds services by exact slug only', () => {
    expect(huServiceBySlug('outdoor')?.title).toBe('Outdoor builds')
    for (const bad of ['Outdoor', 'outdoor/', 'freight', '', 'constructor']) expect(huServiceBySlug(bad)).toBeUndefined()
  })
  it('reuses the home process and quote copy', () => {
    expect(PROCESS.steps.map((s) => s.title)).toEqual(['Site visit', 'Written quote', 'The build', 'Final walkthrough'])
    expect(CLOSING).toEqual({ h2: 'Tell us about the space.', lede: 'A few photos and a sentence about what you want is enough to start.' })
  })
  it('makes no new claims', () => {
    const all = JSON.stringify(SERVICES.homeupgrades.map((s) => s.detail))
    expect(all).not.toMatch(/\$\d|\bfree\b|guarantee|licensed|insured|\byears\b|same day|24\/7/i)
  })
})

describe('serviceDetailJsonLd', () => {
  it('is a graph of Service, FAQPage and BreadcrumbList', () => {
    const item = huServiceBySlug('handyman')!
    const ld = serviceDetailJsonLd(item, toSiteData('homeupgrades', null), root) as { '@graph': { '@type': string; [k: string]: unknown }[] }
    expect(ld['@graph'].map((n) => n['@type'])).toEqual(['Service', 'FAQPage', 'BreadcrumbList'])
    const faq = ld['@graph'][1] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    expect(faq.mainEntity).toHaveLength(item.detail!.faqs.length)
    const crumbs = ld['@graph'][2] as { itemListElement: { item: string }[] }
    expect(crumbs.itemListElement.map((c) => c.item)).toEqual([
      'https://homeupgrades.thegenixgroup.com/',
      'https://homeupgrades.thegenixgroup.com/services',
      'https://homeupgrades.thegenixgroup.com/services/handyman',
    ])
  })
})
```

Run `npx vitest run tests/unit/service-detail.test.ts tests/unit/inquiry-bot-check.test.ts` → FAIL.

- [ ] **Step 2: Implement.**
  - `bot-check.ts`: add `{ path: '/services/*', method: 'POST' }, // Home Upgrades service detail pages (each has a quote form)` after the `/contact` entry.
  - `services.ts`: add the `ServiceDetail` type and `detail?: ServiceDetail` to `ServiceItem`; add `detail` to each of the four HU items with the spec Appendix copy **verbatim** (eyebrow, lead, intro, fit label/h2/body, the three cards as `{ title, line }`, faqs `{ q, a }`, description). Add:

```ts
/* The home's "How a project runs" copy (homeupgrades sections/Process.tsx), reused on the service pages. */
export const PROCESS = {
  label: 'From “someday” to “let\'s do it”',
  h2Lead: 'Four steps, ',
  h2Gold: 'no surprises.',
  steps: [
    { title: 'Site visit', body: 'We walk the space with you, measure up and talk through what you want it to do.' },
    { title: 'Written quote', body: 'A clear, itemised quote and timeline before any work starts.' },
    { title: 'The build', body: 'The Genix crew does the work and keeps you updated as it goes.' },
    { title: 'Final walkthrough', body: "We go over the finished space together and put right anything that isn't." },
  ],
} as const

/* The home Quote section's heading and lede (homeupgrades sections/Quote.tsx). */
export const CLOSING = { h2: 'Tell us about the space.', lede: 'A few photos and a sentence about what you want is enough to start.' } as const

export const HU_SERVICE_SLUGS: readonly string[] = SERVICES.homeupgrades.map((s) => s.id)
export const huServiceBySlug = (slug: string): ServiceItem | undefined => SERVICES.homeupgrades.find((s) => s.id === slug)

export function serviceDetailJsonLd(item: ServiceItem, data: SiteData, root?: string): Record<string, unknown> {
  const origin = siteOrigin('homeupgrades', root)
  const url = `${origin}/services/${item.id}`
  const provider = { '@type': SITES.homeupgrades.schemaType, name: SITES.homeupgrades.name, url: `${origin}/` }
  const areaServed = data.areaServed ? { areaServed: { '@type': data.areaServed.type, name: data.areaServed.name } } : {}
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', name: item.title, description: item.detail?.description ?? item.body, url, provider, ...areaServed },
      { '@type': 'FAQPage', mainEntity: (item.detail?.faqs ?? []).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `${origin}/services` },
          { '@type': 'ListItem', position: 3, name: item.title, item: url },
        ],
      },
    ],
  }
}
```

Check the home `Process.tsx` strings once more and make `PROCESS` match them character for character (the label uses curly quotes).

- [ ] **Step 3: Run** — the two test files PASS; `npx vitest run` all pass; `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add src tests
git commit -m "feat(services): Home Upgrades service detail copy and structured data; BotID covers /services/*"
```

---

### Task 2: The service detail pages

**Files:**
- Create: `design/homeupgrades-service.html`, `web/src/components/site/division/ServiceDetailPage.tsx`, `web/src/app/(sites)/[site]/services/[slug]/page.tsx`, `web/tests/e2e/service-detail.e2e.spec.ts`
- Modify: `design/shared/homeupgrades-home.css` (`.svcd-*`), `web/src/sites/config.ts` (HU `pages` + the four paths), `web/tests/e2e/parity.e2e.spec.ts`, `web/tests/e2e/quality.e2e.spec.ts`, `web/tests/unit/seo.test.ts`; generated CSS

**Interfaces:**
- Consumes: Task 1 exports; `HuQuoteFormBlock({ data, preselect })` (`@/components/forms/HuQuoteFormBlock`); `parseHuPreselect` (`@/inquiries/forms/preselect`); `JsonLd`; `pageMetadata`; `getSiteData`.
- Produces: `ServiceDetailPage({ item, data }: { item: ServiceItem; data: SiteData })`; route `/homeupgrades/services/<slug>`.

Markup contract (prototype and app match):

```html
<main id="main" data-quote-href="#quote">              <!-- prototype: id="top" -->
  <section class="svcd-hero" id="service-top"><div class="wrap svcd-hero-grid">
    <div class="svcd-hero-copy">
      <nav class="svcd-crumbs" aria-label="Breadcrumb"><ol>
        <li><a href="/">Home</a></li><li><a href="/services">Services</a></li><li aria-current="page">{title}</li>
      </ol></nav>
      <p class="label">{eyebrow}</p>
      <h1 class="h-display">{title}</h1>
      <p class="svcd-lead">{lead}</p>
      <p class="body">{intro}</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="#quote">Get a quote <span aria-hidden="true">→</span></a>
        <a class="btn btn-ghost" href="tel:…">Call {phone}</a>   <!-- or the .ph placeholder as on the home -->
      </div>
    </div>
    <figure class="svcd-media"> next/image of item.image (+ span.svc-stock for Unsplash) </figure>
  </div></section>
  <section class="svcd-fit" id="fit"><div class="wrap">
    <p class="label">{fit.label}</p><h2 class="h-section">{fit.h2}</h2><p class="body">{fit.body}</p>
    <ul class="svcd-cards"><li><svg aria-hidden="true">check</svg><h3>{title}</h3><p>{line}</p></li> ×3</ul>
  </div></section>
  <section class="svcd-process" id="process"><div class="wrap">
    <p class="label">{PROCESS.label}</p><h2 class="h-section">{PROCESS.h2Lead}<span class="gold">{PROCESS.h2Gold}</span></h2>
    <ol class="steps"> <li class="step"><h3>…</h3><p>…</p></li> ×4 </ol>
  </div></section>
  <section class="svcd-faq-quote" id="quote"><div class="wrap svcd-faq-grid">
    <div class="svcd-faq"><p class="label">Questions</p><h2 class="h-section">Good to know.</h2>
      <details><summary>{q}</summary><p>{a}</p></details> ×n
    </div>
    <div class="svcd-form"> <HuQuoteFormBlock data preselect /> </div>
  </div></section>
  <section class="svcd-more" id="more"><div class="wrap">
    <p class="label">More services</p><h2 class="h-section">A few more possibilities.</h2>
    <ul class="svcd-more-grid"> <li><a href="/services/{id}"> image, h3 title, p body </a></li> ×3 (the other services) </ul>
  </div></section>
  <section class="svcd-close" id="close"><div class="wrap">
    <h2 class="h-section">{CLOSING.h2}</h2><p class="body">{CLOSING.lede}</p>
    <a class="btn btn-gold" href="#quote">Get a quote →</a> <a class="btn btn-ghost" href="tel:…">Call …</a>
  </div></section>
</main>
```

(The FAQ heading "Questions" / "Good to know." and "More services" / "A few more possibilities." are structural labels, not claims; the owner can change them in review.)

- [ ] **Step 1: Failing e2e** — `web/tests/e2e/service-detail.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const BASE = 'http://homeupgrades.localhost:3000/services'
const PAGES = {
  'accent-walls': { title: 'Accent walls & TV units', project: 'accent', property: 'home' },
  outdoor: { title: 'Outdoor builds', project: 'outdoor', property: null },
  handyman: { title: 'Handyman services', project: 'other', property: null },
  reception: { title: 'Accent walls for reception areas', project: 'accent', property: 'business' },
} as const

for (const [slug, p] of Object.entries(PAGES)) {
  test(`${slug}: hero, fit cards, process, FAQs, form pre-selected, more services, metadata`, async ({ page }) => {
    await page.goto(`${BASE}/${slug}`)
    await expect(page.locator('h1')).toHaveText(p.title)
    await expect(page.locator('.svcd-crumbs a')).toHaveText(['Home', 'Services'])
    await expect(page.locator('.svcd-cards li')).toHaveCount(3)
    await expect(page.locator('.svcd-process .step')).toHaveCount(4)
    await expect(page.locator(`input[name="project"][value="${p.project}"]`)).toBeChecked()
    if (p.property) await expect(page.locator(`input[name="property"][value="${p.property}"]`)).toBeChecked()
    const more = await page.locator('.svcd-more a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(more).toHaveLength(3)
    expect(more).not.toContain(`/services/${slug}`)
    expect(await page.title()).toBe(`${p.title} | Genix Home Upgrades`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}/${slug}`)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.some((t) => t.includes('"FAQPage"') && t.includes('"BreadcrumbList"'))).toBe(true)
    await expect(page.locator('main')).not.toContainText(/\bfree\b/i)
  })
}

test('FAQs open and close with the keyboard', async ({ page }) => {
  await page.goto(`${BASE}/handyman`)
  const first = page.locator('.svcd-faq details').first()
  await first.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(first).toHaveAttribute('open', '')
  await page.keyboard.press('Enter')
  await expect(first).not.toHaveAttribute('open', '')
})

test('Get a quote goes to the form on the page', async ({ page }) => {
  await page.goto(`${BASE}/outdoor`)
  await page.locator('.hero-actions a.btn-gold').click()
  await expect(page).toHaveURL(`${BASE}/outdoor#quote`)
  await expect(page.locator('#hu-quote-form')).toBeInViewport()
})

test('a request sent from a detail page (no JS) becomes a Home Upgrades inquiry', async ({ browser }) => {
  const page = await (await browser.newContext({ javaScriptEnabled: false })).newPage()
  await page.goto(`${BASE}/handyman`)
  await page.check('input[name="property"][value="home"]')
  await page.check('input[name="timing"][value="soon"]')
  await page.fill('#hqZip', '92101')
  await page.fill('#hqNotes', 'Detail page e2e: hang two shelves and mount a TV')
  await page.fill('#hqName', 'E2E Service Detail')
  await page.fill('#hqPhone', '(619) 555-0100')
  await page.click('#hqSend')
  await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUP-\d{6}$/)
  await page.context().close()
})

for (const url of [`${BASE}/unknown`, `${BASE}/Outdoor`, 'http://logistics.localhost:3000/services/outdoor', 'http://localhost:3000/services/outdoor', 'http://multimedia.localhost:3000/services/outdoor']) {
  test(`${url} is a 404`, async ({ page }) => {
    const res = await page.goto(url)
    expect(res?.status()).toBe(404)
  })
}

test('phone: no sideways scroll at 320 px and the pinned bar goes to the page form', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(`${BASE}/accent-walls`)
  await page.mouse.wheel(0, 1200)
  await expect(page.getByTestId('quote-bar').locator('a.btn-gold')).toHaveAttribute('href', '#quote')
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
```

(Check `hu-quote.e2e.spec.ts` for the real no-JS field names/values and match them; the pre-selected project means `project` is already checked.) Add `{ site: 'homeupgrades-service', proto: '/homeupgrades-service.html', app: 'http://homeupgrades.localhost:3000/services/accent-walls', chrome: true, sections: true }` to `PARITY`; add the four URLs to `HOMES` in `quality.e2e.spec.ts`; in `seo.test.ts` assert the HU sitemap contains `/services/accent-walls</loc>` … `/services/reception</loc>` and Logistics' does not. Run → FAIL.

- [ ] **Step 2: Prototype** `design/homeupgrades-service.html` from `design/homeupgrades-services.html` (head: title "Accent walls & TV units | Genix Home Upgrades", the Appendix description, canonical `https://homeupgrades.thegenixgroup.com/services/accent-walls`; header/footer as there; `<main id="top">` per the contract with the accent-walls data; the form block copied from `homeupgrades-contact.html` with `accent` + `home` pre-checked, plus its `js/hu-quote-form.js`; the pinned quote bar markup with its primary link `#quote` and `shared/quote-bar.js`; breadcrumb links to `homeupgrades-home.html` / `homeupgrades-services.html`; more-services cards to `homeupgrades-service.html` for all three (static prototype); every Appendix line wrapped as-is (mark draft copy with a `data-draft` attribute so the owner can spot it — the app does not render that attribute; parity is unaffected because it isn't visible). Append `.svcd-*` rules to `design/shared/homeupgrades-home.css`: hero two columns (copy / photo, photo `aspect-ratio: 4/5`, radius as the home cards), single column ≤ 960 px with the photo after the copy; breadcrumb small muted with `›` separators; `.svcd-lead` larger semibold; fit cards three columns ≥ 961 px (stack below), bordered like the home service cards, small check icon in the brand colour; the process reuses the home `.steps` look without motion; FAQ + form two columns ≥ 961 px (form in the sand card like the home Quote), stack below with the FAQ first; `details` with a +/− marker via `summary::after`, visible focus; more-services cards three columns with photo, title, line; closing band in the brand surface like the Services quoting band. `npm run port:css`. Screenshots 1280/390 to the scratchpad; LOOK and describe.

- [ ] **Step 3: App.** `ServiceDetailPage.tsx` renders the contract from `item` + `data` (phone `tel:` and placeholder exactly as the Home Upgrades hero does; images like `ServicesPage.tsx` does, incl. its `SIZES` map — extract that map to a small shared export in `ServicesPage.tsx` or `services.ts` rather than copying it; `JsonLd` with `serviceDetailJsonLd(item, data)` inside `<main>`; the form: `<HuQuoteFormBlock data={data} preselect={parseHuPreselect(Object.fromEntries(new URLSearchParams(item.quoteHref.split('?')[1] ?? '')))} />`). Route `web/src/app/(sites)/[site]/services/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServiceDetailPage } from '@/components/site/division/ServiceDetailPage'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'
import { HU_SERVICE_SLUGS, huServiceBySlug } from '@/sites/services'

type Props = { params: Promise<{ site: string; slug: string }> }

export const revalidate = 3600

export function generateStaticParams() {
  return HU_SERVICE_SLUGS.map((slug) => ({ site: 'homeupgrades', slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params
  const item = site === 'homeupgrades' ? huServiceBySlug(slug) : undefined
  if (!item?.detail) return {}
  return pageMetadata('homeupgrades', `/services/${slug}`, { title: item.title, description: item.detail.description })
}

// One page per Home Upgrades service; everything else is a 404.
export default async function ServiceDetail({ params }: Props) {
  const { site, slug } = await params
  const item = isSiteKey(site) && site === 'homeupgrades' ? huServiceBySlug(slug) : undefined
  if (!item?.detail) notFound()
  return <ServiceDetailPage item={item} data={await getSiteData('homeupgrades')} />
}
```

(Check how the existing `[site]` layout's `generateStaticParams` composes with a nested one in this Next version; if `dynamicParams` should be false for unknown slugs, set it — unknown slugs must 404 either way.) `config.ts`: HU `pages` add `'/services/accent-walls', '/services/outdoor', '/services/handyman', '/services/reception'`. Restore CRLF-only generated files after port:css.

- [ ] **Step 4: Run** — `npx tsc --noEmit`; `npx vitest run`; `npx playwright test tests/e2e/service-detail.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/seo.e2e.spec.ts tests/e2e/hu-quote.e2e.spec.ts tests/e2e/contact-preselect.e2e.spec.ts --reporter=line` → pass (one solo re-run allowed for a flaky parity phone / hu-quote spec). Fix real axe/contrast issues in the prototype CSS.

- [ ] **Step 5: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(services): Home Upgrades service detail pages"
```

---

### Task 3: Links and docs

**Files:**
- Modify: `web/src/components/site/division/ServicesPage.tsx` (HU: "More about" link), `web/src/components/site/division/DivisionFooter.tsx` (HU services → detail pages), `design/homeupgrades-services.html` and the other HU prototypes' footers, `web/README.md`
- Create: `web/tests/e2e/service-detail-links.e2e.spec.ts`

- [ ] **Step 1: Failing test** — `web/tests/e2e/service-detail-links.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const HU = 'http://homeupgrades.localhost:3000'

test('/services links each Home Upgrades service to its page', async ({ page }) => {
  await page.goto(`${HU}/services`)
  for (const slug of ['accent-walls', 'outdoor', 'handyman', 'reception']) {
    await expect(page.locator(`#${slug} a[href="/services/${slug}"]`)).toHaveCount(1)
  }
  await expect(page.locator('#accent-walls a.btn-gold')).toHaveAttribute('href', '/contact?project=accent&property=home') // quote button unchanged
})

test('the footer service links go to the detail pages', async ({ page }) => {
  await page.goto(`${HU}/`)
  for (const [label, href] of [['Accent walls & TV units', '/services/accent-walls'], ['Outdoor builds', '/services/outdoor'], ['Handyman services', '/services/handyman']]) {
    await expect(page.locator('footer a', { hasText: label })).toHaveAttribute('href', href)
  }
})

test('Logistics /services has no detail links', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/services')
  await expect(page.locator('a[href^="/services/"]')).toHaveCount(0)
})
```

Run → FAIL.

- [ ] **Step 2: Implement.** In `ServicesPage.tsx`, for items with `detail`, add after the quote button `<a className="svcpage-more" href={`/services/${s.id}`}>More about {s.title} <span aria-hidden="true">→</span></a>` (reuses the existing `.svcpage-more` style). `DivisionFooter.tsx` HU services → `/services/accent-walls`, `/services/outdoor`, `/services/handyman`. Prototypes: `homeupgrades-services.html` gets the same "More about" links (→ `homeupgrades-service.html` for accent walls; the other three to `homeupgrades-service.html` too, as the static template), and every HU prototype footer's service links → `homeupgrades-service.html`. Update existing expectations that encode the old footer hrefs (`services-links.e2e.spec.ts` asserts `/services#accent-walls` etc. for HU — change those to the detail URLs; list each change). README: add "### Home Upgrades service pages" — the four pages are built from `detail` on each Home Upgrades item in `web/src/sites/services.ts` (copy approved by the owner; no new claims); each has the Home Upgrades quote form with the service pre-selected; `/services/*` must stay in `BOTID_PROTECT`.

- [ ] **Step 3: Run** — `npx playwright test tests/e2e/service-detail-links.e2e.spec.ts tests/e2e/services-links.e2e.spec.ts tests/e2e/services.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/parity.e2e.spec.ts --reporter=line` → pass; `npx tsc --noEmit`; `npx vitest run`. (No full suite — the controller runs it.)

- [ ] **Step 4: Commit**

```bash
git add ../design web/src web/tests web/README.md
git commit -m "feat(services): link the Home Upgrades services to their own pages"
```

---

## Self-review notes

- **Spec coverage:** BotID, data/copy verbatim, JSON-LD graph (T1); route/404s, hero/fit/process/FAQ+form/more/closing, pre-selection, pinned bar, metadata, sitemap, prototype + parity, e2e incl. real inquiry (T2); /services + footer links, README (T3).
- **Review Focus → tests:** 1 → T1 BotID unit + T2 no-JS inquiry; 2 → T2 404 list incl. uppercase/Logistics/hub/Multimedia; 3 → T2 per-page pre-selection; 4 → T2 keyboard FAQ + phone bar/320 px; 5 → T1 copy guard + T2 "free" check.
- **Names:** `ServiceDetail`, `detail`, `PROCESS`, `CLOSING`, `HU_SERVICE_SLUGS`, `huServiceBySlug`, `serviceDetailJsonLd`, `ServiceDetailPage`, `.svcd-*`, `#quote`, `data-quote-href="#quote"`.
