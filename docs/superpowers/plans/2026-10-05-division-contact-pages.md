# Division Contact Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Genix Logistics and Genix Home Upgrades a `/contact` page that holds the existing quote form beside the business's contact details, linked from each header nav and footer.

**Architecture:** Each division's quote form is moved out of its home section into one shared server component (form + its client enhancer), then rendered on both the home page and the new Contact page, so there is one pipeline and no copy to drift. Each Contact page is a single `<section>` that reuses the home page's own layout classes (Logistics: the dark two-column hero; Home Upgrades: the two-column Quote section) with a shared `ContactCard`. Prototype first (static HTML in `design/`), then ported, with screenshot parity tests as for the home pages.

**Tech Stack:** Next.js 16.3.6 (App Router, `proxy.ts` host routing), React 19, Payload 3.90.2 (unchanged), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-division-contact-pages-design.md` (binding).

## Global Constraints

- All app code lives in `web/`; run every command from `web/`. Prototypes are in the repo-root `design/`. This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` before using routing, metadata or Server Action APIs. `proxy.ts` rewrites every path to `/<site>/…` (`logistics.localhost:3000/contact` → `/logistics/contact`).
- Pages: `/contact` on `logistics` and `homeupgrades` hosts only. `hub`, `multimedia` and unknown site keys → `notFound()` (404).
- The page holds the **existing quote form**: same fields, same Server Actions (`submitQuoteForm`, `submitQuote`), same Inquiries record. Nothing changes in the pipeline, emails, Payload collections or `/quote/sent`.
- Each home page keeps its own quote section; "Get a quote" buttons and the pinned quote bar keep pointing at the home form. Header nav and footer Company column each gain **Contact** (`/contact`).
- Details card: email (`data.email`, fallback `hello@thegenixgroup.com`), phone (`data.phone` as `tel:` link, else the `.ph` placeholder `(000) 000-0000`, as in the footer), service area, and a reply-time line reusing existing wording. **No opening hours** (the data model has none; never invent them).
- The pinned quote bar stays off on the Contact page (the form is already on screen).
- No new animation: Contact pages render no `MotionRoot`, no `data-reveal` / `data-split` attributes. No new dependencies.
- Metadata via `pageMetadata(site, '/contact', { title: 'Contact', description })` → title "Contact | Genix Logistics" / "Contact | Genix Home Upgrades", canonical `<division origin>/contact`, indexable. `/contact` is added to that division's `pages` (its own `sitemap.xml`), never the hub's.
- A page renders its own `<main id="main">` (the skip link targets `#main`).
- Prototype/app parity: generated CSS only via `npm run port:css`, never hand-edited (`*.generated.css`). The 2% pixel limit in `tests/e2e/parity.e2e.spec.ts` stays; fix real differences, never loosen it.
- Playwright always with `--reporter=line`, never concurrently with Vitest; never `npm run build` while the dev server runs; never kill node processes. Node can't resolve `*.localhost`: test those hosts through Playwright `page` (or `curl -H 'Host: …' http://localhost:3000/…`).
- The owner edits `design/` in their editor: if a `design/` file you need to change has uncommitted changes you didn't make, STOP and report NEEDS_CONTEXT. Never revert, stash or checkout files you didn't change. Never commit `web/.env`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec)

1. The spec says the footer carries `data-quote-bar-hide`; that attribute only drives Multimedia's `QuoteBar`. The division bar (`DivisionQuoteBar`) uses selectors. The Contact `<main>` gets `data-no-quote-bar` and `DivisionQuoteBar` returns early when it exists.
2. Contact pages render no motion (no `MotionRoot`, no `data-reveal`/`data-split`): the spec forbids new animation and the home's reveals need `MotionRoot`.
3. To share the Home Upgrades form styles with the new prototype, the whole inline `<style>` of `design/homeupgrades-home.html` moves unchanged into `design/shared/homeupgrades-home.css`, linked at the same position (identical cascade). The generated CSS must come out byte-identical.
4. Reply-time line wording, headlines and ledes below are drafts in each division's existing voice; the owner reviews them in the prototype.

## Review Focus

1. **Extracting the forms must not change either home page.** The `<form>` HTML of both homes must be byte-identical before and after (Task 1), and the existing form specs pass unchanged.
2. **Header legibility on a page with no hero image** (Logistics: dark hero band; Home Upgrades: light page). Axe colour-contrast on both Contact pages at desktop width and 390 px, and a visual check (Tasks 2–3).
3. **The pinned quote bar must not appear on `/contact` on phones** (Task 2 e2e, also covers Home Upgrades in Task 3).
4. **No phone set / no area set / no email set:** the card shows the `.ph` placeholder and fallbacks, never an empty `tel:` link or "undefined" (Task 2 unit test).
5. **A request sent from `/contact` creates an inquiry for the right division** (`GX-LOG-` / `GX-HUP-` reference, check the real prefix in `SITES.*.inquiryPrefix`), with and without JavaScript, and `hub`/`multimedia` `/contact` return 404 (Tasks 2–3).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/forms/LogisticsQuoteForm.tsx` (new) | The Logistics quote `<form>` + `QuoteForm` enhancer, moved out of `Hero.tsx` |
| `src/components/forms/HuQuoteFormBlock.tsx` (new) | The Home Upgrades quote `<form>` + `HuQuoteForm` enhancer, moved out of `Quote.tsx` |
| `src/components/site/division/ContactCard.tsx` (new) | Details card shared by both Contact pages |
| `src/pages-home/logistics/Contact.tsx`, `src/pages-home/homeupgrades/Contact.tsx` (new) | The two page bodies |
| `src/app/(sites)/[site]/contact/page.tsx` (new) | Route: division → page, others 404; metadata |
| `src/components/site/division/DivisionQuoteBar.tsx` | Early return when `[data-no-quote-bar]` exists |
| `src/sites/config.ts` | `pages` and `nav` gain `/contact` / Contact for both divisions |
| `src/components/site/division/DivisionFooter.tsx` | Company column gains Contact |
| `design/logistics-contact.html`, `design/homeupgrades-contact.html` (new) | Prototypes |
| `design/shared/homeupgrades-home.css` (new, moved) | HU home inline CSS, shared with the Contact prototype |
| `design/shared/style-logistics.css`, `design/shared/style-homeupgrades.css` | `.contact-*` rules |
| `web/scripts/port-css.ts` | HU source list reads the moved CSS file |
| tests: `tests/unit/contact-card.test.ts`, `tests/unit/seo.test.ts`, `tests/e2e/contact.e2e.spec.ts`, `tests/e2e/contact-links.e2e.spec.ts`, `tests/e2e/parity.e2e.spec.ts`, `tests/e2e/quality.e2e.spec.ts` | see tasks |

---

### Task 1: Extract both quote forms into shared components (no visual change)

**Files:**
- Create: `web/src/components/forms/LogisticsQuoteForm.tsx`, `web/src/components/forms/HuQuoteFormBlock.tsx`
- Modify: `web/src/pages-home/logistics/sections/Hero.tsx`, `web/src/pages-home/homeupgrades/sections/Quote.tsx`

**Interfaces:**
- Produces: `LogisticsQuoteForm({ data }: { data: SiteData }): JSX.Element` — fragment of the `<form className="label-card quote-form" id="quote-form">…</form>` plus `<QuoteForm />`. `HuQuoteFormBlock({ data }: { data: SiteData }): JSX.Element` — fragment of the `<form className="hu-form" id="hu-quote-form">…</form>` plus `<HuQuoteForm />`. Both are server components (no `'use client'`), import `submitQuoteForm`, `inquirySendMode`, `offlineMessage`, `siteOrigin`, exactly as the files they come from.
- Consumes: nothing from other tasks. Tasks 2 and 3 render these on the Contact pages.

- [ ] **Step 1: Capture the "before" HTML of both forms.** Dev server on :3000 must be running. From `web/`, save each form's markup (use the scratchpad dir for output):

```bash
node -e "
const fs=require('fs');
const get=async(host)=>{const r=await fetch('http://127.0.0.1:3000/',{headers:{host}});return r.text()};
const form=(h,id)=>{const i=h.indexOf('<form');const s=h.indexOf('id=\"'+id+'\"');const a=h.lastIndexOf('<form',s);const b=h.indexOf('</form>',s)+7;return h.slice(a,b)};
(async()=>{
 fs.writeFileSync(process.env.OUT+'/before-log.html',form(await get('logistics.localhost:3000'),'quote-form'));
 fs.writeFileSync(process.env.OUT+'/before-hu.html',form(await get('homeupgrades.localhost:3000'),'hu-quote-form'));
})()" 
```
(set `OUT` to the scratchpad directory first; PowerShell: `$env:OUT='<scratchpad>'`). Check both files are non-empty (> 3 KB). The Node `fetch` with a `host` header works against 127.0.0.1 even though Node can't resolve `*.localhost`; if `host` is a forbidden header in your Node, use `curl -s -H 'Host: logistics.localhost:3000' http://127.0.0.1:3000/` instead and cut the form out the same way.

- [ ] **Step 2: Run the baseline specs green.** `npx playwright test tests/e2e/quote-submit.e2e.spec.ts tests/e2e/hu-quote.e2e.spec.ts --reporter=line` → all pass (record the count).

- [ ] **Step 3: Create `LogisticsQuoteForm.tsx`.** Cut lines 23–135 of `Hero.tsx` (the whole `<form className="label-card quote-form" …>…</form>`, verbatim) and the `<QuoteForm />` line (137) into:

```tsx
import { siteOrigin } from '@/sites/config'
import { QuoteForm } from '@/components/motion/QuoteForm'
import type { SiteData } from '@/sites/data-shape'
import { inquirySendMode, offlineMessage } from '@/inquiries/mode'
import { submitQuoteForm } from '@/inquiries/actions'

const PRIVACY_URL = `${siteOrigin('hub')}/privacy`

/* The Logistics quote form (hero card on the home page, the Contact page's right column).
   Without JS it posts to submitQuoteForm (lands on /quote/sent); with JS the quote-form enhancer
   validates inline and sends through submitQuote. One instance per page: the ids are fixed. */
export function LogisticsQuoteForm({ data }: { data: SiteData }) {
  return (
    <>
      {/* <form …> … </form> moved verbatim from Hero.tsx lines 23–135 */}
      <QuoteForm />
    </>
  )
}
```

Replace the comment line with the moved `<form>` element so the file contains the real markup (no placeholder left). In `Hero.tsx` replace the removed block with `<LogisticsQuoteForm data={data} />` (inside the `.wrap` div, where the form was), delete the `<QuoteForm />` line, and drop imports that are now unused (`siteOrigin`, `QuoteForm`, `inquirySendMode`, `offlineMessage`, `submitQuoteForm`, `PRIVACY_URL`); keep `GoldHeading`, `SiteData`, `LEAD`.

- [ ] **Step 4: Create `HuQuoteFormBlock.tsx`.** Cut lines 32–122 of `Quote.tsx` (the whole `<form className="hu-form" id="hu-quote-form" …>…</form>` and the `<HuQuoteForm />` line) into:

```tsx
import { HuQuoteForm } from '@/components/motion/HuQuoteForm'
import { siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'
import { submitQuoteForm } from '@/inquiries/actions'
import { inquirySendMode, offlineMessage } from '@/inquiries/mode'
import { photoSettings } from '@/inquiries/photos'

const PRIVACY_URL = `${siteOrigin('hub')}/privacy`

/* The Home Upgrades tap-to-pick quote form (home Quote section, Contact page).
   Without JS it is one ordinary form (both steps showing, no photo block) posting to submitQuoteForm,
   which lands on /quote/sent. With JS, HuQuoteForm shows one step at a time, validates inline,
   uploads photos through /uploads and sends through submitQuote. The photo block only works when
   Cloudinary is configured (data-photos="on"). One instance per page: the ids are fixed. */
export function HuQuoteFormBlock({ data }: { data: SiteData }) {
  return (
    <>
      {/* <form …> … </form> moved verbatim from Quote.tsx lines 32–121 */}
      <HuQuoteForm />
    </>
  )
}
```

Again replace the comment with the real moved `<form>`. In `Quote.tsx` keep the `<section className="quote" id="quote">` shell, the label/h2, the `<p className="body">`, then `<HuQuoteFormBlock data={data} />` and the `<p className="quote-note">Serving California.</p>`; remove now-unused imports and `PRIVACY_URL`; update the file's header comment to say the form lives in `HuQuoteFormBlock`.

- [ ] **Step 5: Prove nothing changed.** `npx tsc --noEmit` → 0. Re-capture the forms into `after-log.html` / `after-hu.html` with the Step 1 command (dev server hot-reloads; wait for the page to compile by loading each home once first). Then `diff before-log.html after-log.html && diff before-hu.html after-hu.html && echo IDENTICAL` → `IDENTICAL`. Re-run Step 2's command plus `npx playwright test tests/e2e/logistics-home.e2e.spec.ts tests/e2e/homeupgrades-home.e2e.spec.ts tests/e2e/parity.e2e.spec.ts --reporter=line` (re-run one flaky parity phone spec alone once if needed) → all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/forms src/pages-home/logistics/sections/Hero.tsx src/pages-home/homeupgrades/sections/Quote.tsx
git commit -m "refactor(forms): quote forms live in shared components so a second page can render them"
```

---

### Task 2: Logistics Contact page (prototype, shared card, route, tests)

**Files:**
- Create: `design/logistics-contact.html`, `web/src/components/site/division/ContactCard.tsx`, `web/src/pages-home/logistics/Contact.tsx`, `web/src/app/(sites)/[site]/contact/page.tsx`, `web/tests/unit/contact-card.test.ts`, `web/tests/e2e/contact.e2e.spec.ts`
- Modify: `design/shared/style-logistics.css` (append `.contact-*` rules), `web/src/components/site/division/DivisionQuoteBar.tsx`, `web/src/sites/config.ts` (logistics `pages: ['/', '/contact']`), `web/tests/unit/seo.test.ts`, `web/tests/e2e/parity.e2e.spec.ts`, `web/tests/e2e/quality.e2e.spec.ts`; regenerated `web/src/pages-home/logistics/logistics.generated.css` via `npm run port:css`

**Interfaces:**
- Consumes: `LogisticsQuoteForm({ data })` (Task 1); `pageMetadata(site, path, { title, description })` (`@/sites/seo`); `getSiteData` (`@/sites/data`); `isSiteKey`.
- Produces: `ContactCard({ site, data }: { site: 'logistics' | 'homeupgrades'; data: SiteData }): JSX.Element` (renders `<div className="contact-card">`; both sites' copy lives inside it); `LogisticsContact({ data })`; the route `GET /<site>/contact`; the `data-no-quote-bar` marker convention. Task 3 reuses all of these and fills in the Home Upgrades branches.

Markup contract (prototype and app must match; classes below are what tests and parity rely on):

```html
<main id="top" data-no-quote-bar>            <!-- app: <main id="main" data-no-quote-bar> -->
  <section class="hero on-dark contact-hero" id="hero">
    <div class="wrap">
      <div class="hero-copy">
        <p class="mono hero-eyebrow">Contact</p>
        <h1 class="h-display">Real people. <span class="gold">Real answers.</span></h1>
        <p class="lead">Send the route and what's moving, or call us. We'll come back with a price within two business days.</p>
        <div class="contact-card"> … (ContactCard, below) … </div>
      </div>
      <form class="label-card quote-form" id="quote-form" …>…</form>   <!-- identical to the home hero's form -->
    </div>
  </section>
</main>
```

`ContactCard` markup (both divisions):

```html
<div class="contact-card">
  <h2 class="contact-card-title">Reach us directly</h2>
  <dl>
    <div><dt>Email</dt><dd><a href="mailto:hello@thegenixgroup.com">hello@thegenixgroup.com</a></dd></div>
    <div><dt>Phone</dt><dd><a href="tel:+16195550100">(619) 555-0100</a></dd></div>   <!-- or <span class="ph">(000) 000-0000</span> -->
    <div><dt>Area</dt><dd>…</dd></div>
  </dl>
  <p class="contact-reply">…</p>
</div>
```

- [ ] **Step 1: Write the failing unit tests** — `web/tests/unit/contact-card.test.ts`

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContactCard } from '@/components/site/division/ContactCard'
import { toSiteData } from '@/sites/data-shape'

const html = (site: 'logistics' | 'homeupgrades', doc: Parameters<typeof toSiteData>[1]) =>
  renderToStaticMarkup(createElement(ContactCard, { site, data: toSiteData(site, doc) }))

describe('ContactCard', () => {
  it('uses the placeholder and fallbacks when the record is empty', () => {
    const out = html('logistics', null)
    expect(out).toContain('href="mailto:hello@thegenixgroup.com"')
    expect(out).toContain('<span class="ph">(000) 000-0000</span>')
    expect(out).not.toContain('tel:')
    expect(out).not.toContain('undefined')
    expect(out).toContain('We&#x27;ll get back to you within two business days with a price.')
  })
  it('links the phone and shows the stored email and area', () => {
    const out = html('logistics', { phone: '(619) 555-0100', email: 'ops@example.com', areaServed: 'United States' })
    expect(out).toContain('href="tel:6195550100"') // the href keeps digits (and a leading +) only
    expect(out).toContain('(619) 555-0100')
    expect(out).toContain('href="mailto:ops@example.com"')
    expect(out).toContain('United States')
  })
  it('has the Home Upgrades wording and fallback area', () => {
    const out = html('homeupgrades', null)
    expect(out).toContain('Serving California')
    expect(out).toContain('to arrange a visit')
    expect(out).not.toMatch(/hours/i)
  })
})
```

Adapt `toSiteData` doc fields to the real `SiteDoc` shape in `web/src/sites/data-shape.ts` (the keys are `phone`, `email`, `areaServed`), and match the real escaped output (React renders `'` as `&#x27;`); change the test to the actual output, never the card's wording.

- [ ] **Step 2: Run it** — `npx vitest run tests/unit/contact-card.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `ContactCard`** — `web/src/components/site/division/ContactCard.tsx`

```tsx
import type { SiteData } from '@/sites/data-shape'

type Site = 'logistics' | 'homeupgrades'

/** Per-division wording; the reply lines match each home page's own "request sent" copy. */
const COPY: Record<Site, { area: (data: SiteData) => string; reply: string }> = {
  logistics: {
    area: (d) => d.areaServed?.name ?? 'Based in San Diego · Nationwide',
    reply: "We'll get back to you within two business days with a price.",
  },
  homeupgrades: {
    area: (d) => `Serving ${d.areaServed?.name ?? 'California'}`,
    reply: "We'll get back to you within two business days to arrange a visit.",
  },
}

/** "Reach us directly" card for a division's Contact page (design/*-contact.html `.contact-card`). */
export function ContactCard({ site, data }: { site: Site; data: SiteData }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  const copy = COPY[site]
  return (
    <div className="contact-card">
      <h2 className="contact-card-title">Reach us directly</h2>
      <dl>
        <div>
          <dt>Email</dt>
          <dd><a href={`mailto:${email}`}>{email}</a></dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>
            {data.phone ? (
              <a href={`tel:${data.phone.replace(/[^+\d]/g, '')}`}>{data.phone}</a>
            ) : (
              <span className="ph">(000) 000-0000</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{copy.area(data)}</dd>
        </div>
      </dl>
      <p className="contact-reply">{copy.reply}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run it** — `npx vitest run tests/unit/contact-card.test.ts` → PASS.

- [ ] **Step 5: Build the prototype** `design/logistics-contact.html`. Copy `design/logistics-home.html` and cut it down: keep `<head>` (title "Contact | Genix Logistics", description, canonical `https://logistics.thegenixgroup.com/contact`, icons, fonts, the two stylesheet links) but drop the JSON-LD block; keep the header and footer verbatim except the header/footer links that point at `#…` anchors on the home page become `logistics-home.html#…` (so they work as static files) and the brand link becomes `logistics-home.html`; replace `<main>` with the markup contract above, using the form block copied verbatim from the home page's hero (`#quote-form`, ids unchanged); delete the pinned `#quoteBar` element; keep the script tags except `shared/quote-bar.js` and `js/route.js`. Append `.contact-*` CSS to `design/shared/style-logistics.css`, following that file's scoping convention (every rule scoped under `[data-division="logistics"]` if the file does it): `.contact-card` sits under the lede on the dark hero (translucent panel or hairline border, readable on navy), `dl` rows as label/value pairs (label small and muted, value larger; links gold on hover, visible focus), `.contact-card-title` a small heading, `.contact-reply` muted, `.ph` already styled by the site. At ≤ 960 px the hero stacks as it does on the home page (copy, card, then the form). Reuse existing tokens; no new colours, fonts or animation.
  Acceptance (check at 1280 and 390 px with screenshots to the scratchpad and describe them in the report): text contrast ≥ 4.5:1 on the navy band; no horizontal scroll at 320 px; the header is readable at the top of the page and after scrolling; the browser console is clean; the form works in the prototype exactly as on the home prototype.

- [ ] **Step 6: Write the failing e2e + parity + quality entries.**

`web/tests/e2e/contact.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const LOG = 'http://logistics.localhost:3000/contact'

test('logistics /contact: heading, details card, the quote form, metadata', async ({ page }) => {
  await page.goto(LOG)
  await expect(page.locator('h1')).toContainText('Real people. Real answers.')
  await expect(page.locator('.contact-card a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('.contact-card .contact-reply')).toContainText('within two business days')
  await expect(page.locator('.contact-card')).not.toContainText(/hours/i)
  await expect(page.locator('#quote-form')).toHaveCount(1)
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Contact | Genix Logistics')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', LOG)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['localhost:3000', 'multimedia.localhost:3000']) {
  test(`${host}/contact is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}/contact`)
    expect(res?.status()).toBe(404)
  })
}

test('a request sent from /contact becomes a Logistics inquiry (JS)', async ({ page }) => {
  await page.goto(LOG)
  await page.waitForTimeout(2200) // past the 2 s "too fast" guard
  await page.fill('#qFrom', '92101')
  await page.fill('#qTo', '92024')
  await page.check('#qFlex')
  await page.selectOption('#qLoad', 'parcels')
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Contact')
  await page.fill('#qEmail', 'e2e@test.local')
  await page.click('#qSend')
  await expect(page.locator('#qSent')).toBeVisible()
  await expect(page.locator('#qRef')).toHaveText(/^GX-LOG-\d{6}$/)
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('/contact posts and lands on the sent page', async ({ page }) => {
    await page.goto(LOG)
    await page.fill('#qFrom', '92101')
    await page.fill('#qTo', '92024')
    await page.check('#qFlex')
    await page.selectOption('#qLoad', 'parcels')
    await page.fill('#qName', 'E2E NoJS Contact')
    await page.fill('#qPhone', '(619) 555-0100')
    await page.click('#qSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-LOG-\d{6}$/)
    await expect(page.getByRole('heading', { name: 'Request received.' })).toBeVisible()
  })
})

test('the pinned quote bar never shows on /contact (phone), and nothing scrolls sideways at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(LOG)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(500)
  await expect(page.getByTestId('quote-bar')).toBeHidden()
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
```

`web/tests/e2e/parity.e2e.spec.ts`: add to `PARITY` `{ site: 'logistics-contact', proto: '/logistics-contact.html', app: 'http://logistics.localhost:3000/contact', chrome: true, sections: true }`.
`web/tests/e2e/quality.e2e.spec.ts`: add `'http://logistics.localhost:3000/contact'` to the `HOMES` list (it feeds both the console-error test and the axe test; read the file to confirm; if axe has its own list, add it there too).
`web/tests/unit/seo.test.ts`: add

```ts
  it('lists /contact on the division sitemaps that have the page, never the hub or Multimedia', () => {
    expect(sitemapXml('logistics', root)).toContain('/contact</loc>')
    expect(sitemapXml('hub', root)).not.toContain('/contact')
    expect(sitemapXml('multimedia', root)).not.toContain('/contact')
  })
```

- [ ] **Step 7: Run to see them fail** — `npx playwright test tests/e2e/contact.e2e.spec.ts --reporter=line` (404s) and `npx vitest run tests/unit/seo.test.ts` (sitemap).

- [ ] **Step 8: Implement.**
  - `web/src/pages-home/logistics/Contact.tsx`:

```tsx
import { LogisticsQuoteForm } from '@/components/forms/LogisticsQuoteForm'
import { ContactCard } from '@/components/site/division/ContactCard'
import type { SiteData } from '@/sites/data-shape'

/* Contact page: the home hero's two-column layout with the details card under the lede and the
   same quote form on the right (design/logistics-contact.html). No motion: this page has no MotionRoot. */
export function LogisticsContact({ data }: { data: SiteData }) {
  return (
    <main id="main" data-no-quote-bar>
      <section className="hero on-dark contact-hero" id="hero">
        <div className="wrap">
          <div className="hero-copy">
            <p className="mono hero-eyebrow">Contact</p>
            <h1 className="h-display">Real people. <span className="gold">Real answers.</span></h1>
            <p className="lead">Send the route and what&apos;s moving, or call us. We&apos;ll come back with a price within two business days.</p>
            <ContactCard site="logistics" data={data} />
          </div>
          <LogisticsQuoteForm data={data} />
        </div>
      </section>
    </main>
  )
}
```

  - `web/src/app/(sites)/[site]/contact/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LogisticsContact } from '@/pages-home/logistics/Contact'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

const DESCRIPTIONS = {
  logistics: "Contact Genix Logistics in San Diego for a freight, courier or move quote. Send the route and what's moving, or call us.",
} as const

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'logistics') return {}
  return pageMetadata(site, '/contact', { title: 'Contact', description: DESCRIPTIONS[site] })
}

// Contact exists on the two divisions that take quote requests; everything else is a 404.
export default async function ContactPage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || site !== 'logistics') notFound()
  const data = await getSiteData(site)
  return <LogisticsContact data={data} />
}
```

  - `DivisionQuoteBar.tsx`: as the first line inside the `useEnhance` callback add `if (document.querySelector('[data-no-quote-bar]')) return // this page already shows the form; the bar stays hidden`.
  - `config.ts`: logistics `pages: ['/', '/contact']`.
  - `npm run port:css`; confirm `git diff --stat` shows only the logistics generated CSS changed.

- [ ] **Step 9: Run** — `npx tsc --noEmit`; `npx vitest run`; then `npx playwright test tests/e2e/contact.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/sites.e2e.spec.ts tests/e2e/seo.e2e.spec.ts tests/e2e/quote-submit.e2e.spec.ts --reporter=line` → all pass (re-run a flaky parity phone spec once alone). Axe runs on `/contact` via quality; fix real contrast problems in the prototype CSS, not in the test.

- [ ] **Step 10: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(contact): Logistics /contact page with the quote form and contact details"
```

---

### Task 3: Home Upgrades Contact page

**Files:**
- Create: `design/shared/homeupgrades-home.css` (moved), `design/homeupgrades-contact.html`, `web/src/pages-home/homeupgrades/Contact.tsx`
- Modify: `design/homeupgrades-home.html` (replace the inline `<style>` with a `<link>`), `design/shared/style-homeupgrades.css` (`.contact-*` rules), `web/scripts/port-css.ts`, `web/src/app/(sites)/[site]/contact/page.tsx`, `web/src/sites/config.ts` (homeupgrades `pages`), `web/tests/e2e/contact.e2e.spec.ts`, `web/tests/e2e/parity.e2e.spec.ts`, `web/tests/e2e/quality.e2e.spec.ts`, `web/tests/unit/seo.test.ts`; regenerated `web/src/pages-home/homeupgrades/homeupgrades.generated.css`

**Interfaces:**
- Consumes: `HuQuoteFormBlock({ data })` (Task 1); `ContactCard({ site: 'homeupgrades', data })`, the route file and `data-no-quote-bar` convention (Task 2).
- Produces: `HomeUpgradesContact({ data })`; `/contact` on the `homeupgrades` host.

Markup contract (prototype and app match):

```html
<main id="top" data-no-quote-bar>          <!-- app: id="main" -->
  <section class="quote contact-quote" id="quote">
    <div class="wrap">
      <div>
        <p class="label">Contact</p>
        <h1 class="h-display">Let's talk about <span class="gold">your space.</span></h1>
        <div class="contact-card"> … ContactCard … </div>
      </div>
      <div>
        <p class="body">A few photos and a sentence about what you want is enough to start. We'll arrange a visit and send a written quote.</p>
        <form class="hu-form" id="hu-quote-form" …>…</form>     <!-- identical to the home's form -->
        <p class="quote-note">Serving California.</p>
      </div>
    </div>
  </section>
</main>
```

- [ ] **Step 1: Share the home CSS (mechanical, must be a no-op).** First check `git status --short ../design/homeupgrades-home.html` is clean (else NEEDS_CONTEXT). Save `web/src/pages-home/homeupgrades/homeupgrades.generated.css` to the scratchpad as `hu-before.css`. Move the whole content of the single inline `<style>…</style>` block of `design/homeupgrades-home.html` (between the tags, unchanged) into new `design/shared/homeupgrades-home.css`, and replace the `<style>` element with `<link rel="stylesheet" href="shared/homeupgrades-home.css" />` in the same place in `<head>`. In `web/scripts/port-css.ts` change the homeupgrades source to `file('shared/homeupgrades-home.css')` (keep `inlineStyle` for the hub). Run `npm run port:css`. Verify `diff hu-before.css web/src/pages-home/homeupgrades/homeupgrades.generated.css && echo IDENTICAL` → `IDENTICAL`. Run `npx playwright test tests/e2e/parity.e2e.spec.ts --reporter=line -g homeupgrades` → pass. Commit: `refactor(design): Home Upgrades page CSS lives in a shared file so the Contact prototype can use it`.

- [ ] **Step 2: Extend the failing tests.** In `contact.e2e.spec.ts` add (and in the "404" loop keep hub and multimedia):

```ts
const HU = 'http://homeupgrades.localhost:3000/contact'

test('homeupgrades /contact: heading, details card, the quote form, metadata', async ({ page }) => {
  await page.goto(HU)
  await expect(page.locator('h1')).toContainText("Let's talk about your space.")
  await expect(page.locator('.contact-card a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('.contact-card .contact-reply')).toContainText('to arrange a visit')
  await expect(page.locator('.contact-card')).not.toContainText(/hours/i)
  await expect(page.locator('#hu-quote-form')).toHaveCount(1)
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Contact | Genix Home Upgrades')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', HU)
})

test('a request sent from the Home Upgrades /contact becomes an inquiry (no JS)', async ({ browser }) => {
  const page = await (await browser.newContext({ javaScriptEnabled: false })).newPage()
  await page.goto(HU)
  // No JS: both steps are visible; the pills are radios.
  await page.check('input[name="project"][value="accent"]')
  await page.check('input[name="property"][value="home"]')
  await page.check('input[name="timing"][value="soon"]')
  await page.fill('#hqZip', '92101')
  await page.fill('#hqNotes', 'Contact page e2e: slatted wall behind the TV')
  await page.fill('#hqName', 'E2E Contact HU')
  await page.fill('#hqPhone', '(619) 555-0100')
  await page.click('#hqSend')
  await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUP-\d{6}$/)
  await expect(page.getByRole('heading', { name: 'Request received.' })).toBeVisible()
  await page.context().close()
})

test('the pinned quote bar never shows on the Home Upgrades /contact (phone), and nothing scrolls sideways at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(HU)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(500)
  await expect(page.getByTestId('quote-bar')).toBeHidden()
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
```

Check the real reference prefix (`SITES.homeupgrades.inquiryPrefix` is `HUP`; the quote-sent page's `REF` regex is `GX-[A-Z]{3}-\d{6}`) and the existing `hu-quote.e2e.spec.ts` for the correct no-JS field names/values; fix the test to the real ones, not the other way round. Add `{ site: 'homeupgrades-contact', proto: '/homeupgrades-contact.html', app: 'http://homeupgrades.localhost:3000/contact', chrome: true, sections: true }` to `PARITY`, `'http://homeupgrades.localhost:3000/contact'` to the quality list(s), and in `seo.test.ts` extend the new test: `expect(sitemapXml('homeupgrades', root)).toContain('/contact</loc>')`. Run them → FAIL.

- [ ] **Step 3: Prototype** `design/homeupgrades-contact.html`: copy `homeupgrades-home.html`'s `<head>` (title "Contact | Genix Home Upgrades", description, canonical `https://homeupgrades.thegenixgroup.com/contact`, icons, fonts and the three stylesheet links `shared/genix.css`, `shared/style-homeupgrades.css`, `shared/homeupgrades-home.css`; drop JSON-LD), the header and footer verbatim (home-page `#…` anchors become `homeupgrades-home.html#…`, brand link `homeupgrades-home.html`), `<main>` per the markup contract (form block copied verbatim from the home page's `#hu-quote-form`), no `#quoteBar`, scripts: those of the home page except `shared/quote-bar.js` and any inline script that only drives home sections; keep `js/hu-quote-form.js`. Append `.contact-*` rules to `design/shared/style-homeupgrades.css` (scoped `[data-division="homeupgrades"]` as in that file): card on the page's paper surface (the `.quote` section's own look), the same `dl` pairs as Logistics but in Home Upgrades tokens (navy headings, gold only for small accents, `.ph` placeholder as elsewhere), `.contact-reply` muted. **Header legibility:** the home header may rely on the hero image behind it; find how `.site-header` gets its background (read `style-homeupgrades.css` / `homeupgrades-home.css` / `genix.js`) and make it readable at the top of the Contact page without a hero (use the existing solid/scrolled state or add one scoped `.contact-…` rule; do not alter the home look). Acceptance as Task 2 Step 5 (contrast, 320 px, clean console, header legible at top and after scroll, screenshots at 1280 and 390 px described in the report).

- [ ] **Step 4: Implement the app page.** `web/src/pages-home/homeupgrades/Contact.tsx`:

```tsx
import { HuQuoteFormBlock } from '@/components/forms/HuQuoteFormBlock'
import { ContactCard } from '@/components/site/division/ContactCard'
import type { SiteData } from '@/sites/data-shape'

/* Contact page: the home Quote section's two-column layout with the details card under the heading and
   the same quote form beside it (design/homeupgrades-contact.html). No motion: no MotionRoot here. */
export function HomeUpgradesContact({ data }: { data: SiteData }) {
  return (
    <main id="main" data-no-quote-bar>
      <section className="quote contact-quote" id="quote">
        <div className="wrap">
          <div>
            <p className="label">Contact</p>
            <h1 className="h-display">Let&apos;s talk about <span className="gold">your space.</span></h1>
            <ContactCard site="homeupgrades" data={data} />
          </div>
          <div>
            <p className="body">A few photos and a sentence about what you want is enough to start. We&apos;ll arrange a visit and send a written quote.</p>
            <HuQuoteFormBlock data={data} />
            <p className="quote-note">Serving California.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
```

In `contact/page.tsx`: add `homeupgrades: 'Contact Genix Home Upgrades for accent walls, TV units, outdoor builds and handyman work in California. Send a few photos and we\'ll arrange a visit.'` to `DESCRIPTIONS`; `generateMetadata` and the page accept `'logistics' | 'homeupgrades'` (`if (site !== 'logistics' && site !== 'homeupgrades') …`); the page returns `site === 'logistics' ? <LogisticsContact data={data} /> : <HomeUpgradesContact data={data} />`; anything else `notFound()`. `config.ts`: homeupgrades `pages: ['/', '/contact']`. Run `npm run port:css`.

- [ ] **Step 5: Run** — `npx tsc --noEmit`; `npx vitest run`; `npx playwright test tests/e2e/contact.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/hu-quote.e2e.spec.ts tests/e2e/homeupgrades-home.e2e.spec.ts tests/e2e/seo.e2e.spec.ts --reporter=line` → all pass.

- [ ] **Step 6: Commit**

```bash
git add ../design web/src web/tests web/scripts
git commit -m "feat(contact): Home Upgrades /contact page with the quote form and contact details"
```

---

### Task 4: Nav and footer links, docs, full verification

**Files:**
- Modify: `web/src/sites/config.ts` (nav), `web/src/components/site/division/DivisionFooter.tsx` (`COLUMNS`), `design/logistics-home.html`, `design/homeupgrades-home.html`, `design/logistics-contact.html`, `design/homeupgrades-contact.html` (header nav + footer Company column), `web/README.md`
- Create: `web/tests/e2e/contact-links.e2e.spec.ts`

**Interfaces:**
- Consumes: the `/contact` pages from Tasks 2–3. Produces: the links; nothing later depends on them.

- [ ] **Step 1: Write the failing test** — `web/tests/e2e/contact-links.e2e.spec.ts`

```ts
import { expect, test } from '@playwright/test'

for (const host of ['logistics', 'homeupgrades']) {
  const home = `http://${host}.localhost:3000/`
  test(`${host}: header nav and footer link to /contact`, async ({ page }) => {
    await page.goto(home)
    const nav = page.locator('nav#nav a', { hasText: /^Contact$/ })
    await expect(nav).toHaveCount(1)
    await expect(nav).toHaveAttribute('href', '/contact')
    const foot = page.locator('footer a', { hasText: /^Contact$/ })
    await expect(foot).toHaveCount(1)
    await expect(foot).toHaveAttribute('href', '/contact')
    await nav.click()
    await expect(page).toHaveURL(`${home}contact`)
    await expect(page.locator('h1')).toBeVisible()
  })

  test(`${host}: the Contact page's own nav still reaches the home sections`, async ({ page }) => {
    await page.goto(`${home}contact`)
    const first = page.locator('nav#nav a').first()
    await expect(first).toHaveAttribute('href', /^\/#/)
    await expect(page.locator('nav#nav a', { hasText: /^Contact$/ })).toHaveCount(1)
  })
}

test('the header nav fits at 1024 px (no overflow with the extra link)', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  for (const host of ['logistics', 'homeupgrades']) {
    await page.goto(`http://${host}.localhost:3000/`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
})
```

Run → FAIL.

- [ ] **Step 2: Implement.**
  - `config.ts`: append `{ label: 'Contact', href: '/contact' }` to `nav` of `logistics` and `homeupgrades`.
  - `DivisionFooter.tsx` `COLUMNS`: append `['Contact', '/contact']` to both `company` lists.
  - Prototypes (all four files): in `<nav class="nav" id="nav">` add `<a href="…contact.html">Contact</a>` after the last nav link and before the hidden `nav-extra` anchor (`logistics-contact.html` / `homeupgrades-contact.html`; in the Contact prototypes the link points at its own page); in the footer's Company column add `<li><a href="…contact.html">Contact</a></li>` last. In the app, `nav#nav` and the footer render from the lists above, so prototype and app stay in parity.
  - Check the header at 961, 1024 and 1280 px and in the 390 px mobile menu (prototype and app): no wrap or overflow; if a four-link nav doesn't fit at 961–1100 px, shorten spacing in the prototype's nav rules (scoped to the division), then `npm run port:css`.
  - `web/README.md`: add a short section "Contact pages": "`/contact` on Logistics and Home Upgrades reuses each home page's quote form through `src/components/forms/*`. Change a form there once and both pages update. Hub and Multimedia have no Contact page yet (`/contact` is a 404 there)."

- [ ] **Step 3: Run the new test and the neighbours** — `npx playwright test tests/e2e/contact-links.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/chrome.e2e.spec.ts tests/e2e/parity.e2e.spec.ts --reporter=line` → pass (`links.e2e` now also follows the new `/contact` hrefs on the home pages and must find them 200).

- [ ] **Step 4: Full verification.** `npx tsc --noEmit`; `npx vitest run`; then (not concurrently) the whole suite `npx playwright test --reporter=line` (~15 min; dev server on :3000; re-run a failing known-flaky spec once alone: "clicking during the swing", "dragging moves the split", parity phone specs). Report pass/fail counts and any failure names. Fix only failures this branch caused, with a test.

- [ ] **Step 5: Commit**

```bash
git add ../design web/src web/tests web/README.md
git commit -m "feat(contact): Contact in the header nav and footer of Logistics and Home Upgrades"
```

---

## Self-review notes

- **Spec coverage:** one shared form per division, no pipeline change (T1); `/contact` on the two divisions only, 404 elsewhere, details card without hours, no pinned bar, metadata and sitemap (T2–T3); nav + footer links and README (T4); prototype-first with parity for both pages (T2–T3); extraction-safety via byte-identical form HTML and the unchanged form specs (T1); axe, console, 320 px, submissions with and without JS, hub/Multimedia 404 (T2–T3).
- **Review Focus → tests:** 1 → T1 Steps 1/5; 2 → T2/T3 acceptance + axe in `quality`; 3 → T2 e2e (and T3 for HU); 4 → T2 unit; 5 → T2/T3 e2e.
- **Names used across tasks:** `LogisticsQuoteForm`, `HuQuoteFormBlock`, `ContactCard`, `LogisticsContact`, `HomeUpgradesContact`, `data-no-quote-bar`, `.contact-card`, `.contact-reply`, `.contact-hero`, `.contact-quote`.
