# Privacy Policy Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one plain-language privacy policy for the whole Genix Group at `thegenixgroup.com/privacy` and link it from both quote forms and all four footers.

**Architecture:** The policy text lives in one typed module (`web/src/legal/privacy.tsx`) rendered by a new `[site]/privacy` route that serves the policy on the hub host and permanently redirects any division host to it. The hub's postal address (when fully set in the admin) is added to `SiteData`. Prototype-first for the small visual changes (form line, footers), then ported; the policy page itself is plain long-form text and has no prototype.

**Tech Stack:** Next.js 16.3.6 (App Router, `proxy.ts` host routing), Payload 3.90.2, React 19, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-privacy-page-design.md` (the policy text in its Appendix is binding verbatim).

## Global Constraints

- All app code lives in `web/`; run every command from `web/`. Prototypes are in the repo-root `design/`.
- This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` for `permanentRedirect`, route files and metadata before using them. `proxy.ts` rewrites every path to `/<site>/…` (e.g. `localhost:3000/privacy` → `/hub/privacy`; `homeupgrades.localhost:3000/privacy` → `/homeupgrades/privacy`).
- One policy at `https://thegenixgroup.com/privacy` (the hub host). Division hosts redirect there with status **308**. No per-site copies.
- Policy text is exactly the spec's Appendix (headings, sentences, the four-row provider table). "Last updated October 5, 2026" (`2026-10-05`). Entity name "The Genix Group". Contact `hello@thegenixgroup.com` (use the hub record's email when set).
- The hub address is shown **only when street, city, state and ZIP are all present**; never a partial address; no placeholders.
- Form privacy line wording: Logistics "We use your details only to reply to this request. Read our privacy policy."; Home Upgrades "We use your details and photos only to reply to this request. Read our privacy policy." The words "privacy policy" are the link. The Logistics line no longer contains the email address.
- Every link to the policy from a site uses the hub origin (`siteOrigin('hub') + '/privacy'` in the app; `https://thegenixgroup.com/privacy` in the static prototypes), never a relative `/privacy` (a relative link from a division host would only redirect).
- No cookie banner, no new animation, no new dependencies.
- CSS class prefix for the page is `.policy` (the footer already uses `.legal`, so that name is taken). Never hand-edit `*.generated.css`; run `npm run port:css` after changing prototype CSS.
- Run Playwright with `--reporter=line`; never run Playwright and Vitest at the same time. Never run `npm run build` while the dev server runs; never kill node processes. Node can't resolve `*.localhost`: check division-host behaviour in the browser (Playwright `page`), not with Node `fetch`/`request`.
- Never revert, stash or checkout files you didn't change (the owner edits `design/` in their editor). Test credentials only; never commit `web/.env`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec)

1. Page CSS prefix is `.policy`, not `.legal` (name collision with the footer's `.legal`).
2. The provider list is a real `<table>` on desktop that stacks into labelled blocks at ≤ 640 px with CSS (as the spec says); a test pins no horizontal scroll at 320 px.
3. The policy component takes the contact `email` and an optional `address` as props, so it is testable without the CMS.

## Review Focus

1. **A division host's `/privacy`** must end on the hub page, never render a division-styled policy; an unknown site key still 404s. → Task 2 e2e.
2. **A partly filled hub address** (e.g. only a city) must not print a half address. → Task 1 unit.
3. **A 320 px phone:** the provider table stacks, the long email address wraps, and the page doesn't scroll sideways. → Task 2 e2e.
4. **Indexing:** the page is in the hub sitemap only, isn't marked noindex, and `robots.txt` doesn't block it. → Task 2 e2e/unit.
5. **Links from a division host** must point at the hub origin (an absolute hub URL), not a relative path. → Task 3 e2e.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/legal/privacy.tsx` | The policy: `PRIVACY_UPDATED`, `PRIVACY_HEADINGS`, `PrivacyPolicy({ email, address })` |
| `src/legal/policy.css` | Scoped `.policy` styles (hub tokens), stacked table at ≤ 640 px |
| `src/sites/data-shape.ts`, `src/sites/data.ts` | `SiteData.address`, `formatAddress`, cache shape bump |
| `src/app/(sites)/[site]/privacy/page.tsx` | Route: hub renders; other hosts redirect |
| `src/sites/config.ts` | `SITES.hub.pages` gains `/privacy` (sitemap) |
| `src/components/site/hub/HubFooter.tsx`, `division/DivisionFooter.tsx`, the generic footer used for Multimedia | "Privacy policy" link |
| `src/pages-home/logistics/sections/Hero.tsx`, `src/pages-home/homeupgrades/sections/Quote.tsx` | form privacy line + link |
| `design/hub-home.html`, `design/logistics-home.html`, `design/homeupgrades-home.html` | prototype footer links + form lines |
| `vitest.config.mts` | (no change; unit tests use `createElement`, `.test.ts`) |

---

### Task 1: Policy module and hub address

**Files:**
- Create: `web/src/legal/privacy.tsx`, `web/tests/unit/privacy.test.ts`
- Modify: `web/src/sites/data-shape.ts`, `web/src/sites/data.ts` (`SITE_DATA_SHAPE = 3`), `web/tests/unit/data-shape.test.ts` (+ any fixture that builds a `SiteData`: tsc will list them)

**Interfaces:**
- Produces:
  - `type PostalAddress = { street: string; city: string; state: string; zip: string }` (exported from `data-shape.ts`)
  - `SiteData.address: PostalAddress | null`; `toSiteData` fills it only when all four parts are non-empty after trimming
  - `formatAddress(a: PostalAddress): string` → `"street, city, state zip"`
  - `PRIVACY_UPDATED = { iso: '2026-10-05', label: 'October 5, 2026' }`
  - `PRIVACY_HEADINGS: readonly string[]` — `['Who we are','What we collect','How we use it','Who handles it for us','Cookies and tracking','How long we keep it','Your choices','Children','Changes','Questions']`
  - `PrivacyPolicy({ email, address }: { email: string; address: PostalAddress | null }): JSX.Element` (the whole `<article class="policy-body">` incl. the `<h1>`)

- [ ] **Step 1: Write the failing tests** — `web/tests/unit/privacy.test.ts`

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PRIVACY_HEADINGS, PRIVACY_UPDATED, PrivacyPolicy } from '@/legal/privacy'
import { formatAddress, toSiteData } from '@/sites/data-shape'

const html = (address: Parameters<typeof PrivacyPolicy>[0]['address'] = null) =>
  renderToStaticMarkup(createElement(PrivacyPolicy, { email: 'hello@thegenixgroup.com', address }))

describe('PrivacyPolicy', () => {
  it('has the title, the date and every section heading in order', () => {
    const out = html()
    expect(out).toContain('<h1>Privacy policy</h1>')
    expect(out).toContain(`<time dateTime="${PRIVACY_UPDATED.iso}">${PRIVACY_UPDATED.label}</time>`)
    const headings = [...out.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1])
    expect(headings).toEqual([...PRIVACY_HEADINGS])
    expect(PRIVACY_UPDATED.label).toBe('October 5, 2026')
  })
  it('lists the four providers and states the three commitments', () => {
    const out = html()
    for (const p of ['Resend', 'Cloudinary', 'Vercel', 'Neon']) expect(out).toContain(`>${p}</th>`)
    expect(out).toContain('we never sell them')
    expect(out).toContain('We&#x27;ll reply within 45 days.')
    expect(out).toContain('including any photos you uploaded')
  })
  it('links the contact email', () => {
    expect(html()).toContain('href="mailto:hello@thegenixgroup.com"')
  })
  it('shows the mailing address only when the hub address is complete', () => {
    expect(html()).not.toContain('by mail at')
    const full = { street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '92101' }
    expect(html(full)).toContain('by mail at 1 Harbor Dr, San Diego, CA 92101')
  })
})

describe('hub address in site data', () => {
  const doc = (address: Record<string, string | null>) => toSiteData('hub', { address })
  it('is null unless street, city, state and ZIP are all filled in', () => {
    expect(doc({ city: 'San Diego', state: 'CA' }).address).toBeNull()
    expect(doc({ street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '  ' }).address).toBeNull()
    expect(toSiteData('hub', null).address).toBeNull()
  })
  it('trims and returns the four parts when complete', () => {
    const a = doc({ street: ' 1 Harbor Dr ', city: 'San Diego', state: 'CA', zip: '92101' }).address!
    expect(a).toEqual({ street: '1 Harbor Dr', city: 'San Diego', state: 'CA', zip: '92101' })
    expect(formatAddress(a)).toBe('1 Harbor Dr, San Diego, CA 92101')
  })
})
```

- [ ] **Step 2: Run it** — `npx vitest run tests/unit/privacy.test.ts` → FAIL (modules missing / `address` not in SiteDoc).

- [ ] **Step 3: Implement the address**

In `web/src/sites/data-shape.ts` add:

```ts
export type PostalAddress = { street: string; city: string; state: string; zip: string }
// SiteData: add   address: PostalAddress | null
// SiteDoc:  add   address?: { street?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null

/** The four address parts, or null unless every one is filled in (never a half address). */
function toAddress(a: SiteDoc['address']): PostalAddress | null {
  const street = text(a?.street)?.trim()
  const city = text(a?.city)?.trim()
  const state = text(a?.state)?.trim()
  const zip = text(a?.zip)?.trim()
  return street && city && state && zip ? { street, city, state, zip } : null
}

export const formatAddress = (a: PostalAddress) => `${a.street}, ${a.city}, ${a.state} ${a.zip}`
// in toSiteData's returned object: address: toAddress(doc?.address),
```

In `web/src/sites/data.ts`: `const SITE_DATA_SHAPE = 3` (cached entries of the old shape must not be served). Run `npx tsc --noEmit` and add `address: null` to any `SiteData` fixture it reports; update `tests/unit/data-shape.test.ts` expectations for the new field.

- [ ] **Step 4: Implement the policy** — `web/src/legal/privacy.tsx`

```tsx
import { formatAddress, type PostalAddress } from '@/sites/data-shape'

export const PRIVACY_UPDATED = { iso: '2026-10-05', label: 'October 5, 2026' } as const

/** Section headings in page order; the page and its tests share this list. */
export const PRIVACY_HEADINGS = [
  'Who we are',
  'What we collect',
  'How we use it',
  'Who handles it for us',
  'Cookies and tracking',
  'How long we keep it',
  'Your choices',
  'Children',
  'Changes',
  'Questions',
] as const

const PROVIDERS: [name: string, does: string, gets: string][] = [
  ['Resend', 'Sends our emails, including your confirmation', 'Your name, email address and a summary of your request'],
  ['Cloudinary', 'Stores the photos you upload (Home Upgrades) privately', 'Your photos'],
  ['Vercel', "Hosts our sites, counts visits without cookies, and checks that forms aren't filled in by bots", 'Technical details such as your IP address and browser, and the pages you open'],
  ['Neon', 'Our database, where requests are saved', 'Everything you submit in a form'],
]

/** The Genix Group privacy policy (docs/superpowers/specs/2026-10-05-privacy-page-design.md, Appendix). */
export function PrivacyPolicy({ email, address }: { email: string; address: PostalAddress | null }) {
  const mail = <a href={`mailto:${email}`}>{email}</a>
  const [who, collect, use, handles, cookies, keep, choices, children, changes, questions] = PRIVACY_HEADINGS
  return (
    <article className="policy-body">
      <h1>Privacy policy</h1>
      <p className="policy-updated">
        Last updated <time dateTime={PRIVACY_UPDATED.iso}>{PRIVACY_UPDATED.label}</time>
      </p>
      <p>
        This policy explains what The Genix Group collects when you use thegenixgroup.com and the sites of our businesses,
        what we do with it, and your choices. We&apos;ve kept it short on purpose.
      </p>

      <h2>{who}</h2>
      <p>
        The Genix Group runs three businesses: Genix Logistics (freight, courier runs and moves), Genix Home Upgrades (accent
        walls, TV units, outdoor builds and handyman work) and Genix Multimedia. In this policy, &quot;we&quot; means The
        Genix Group and those businesses. You can reach us at {mail}
        {address ? `, or by mail at ${formatAddress(address)}` : ''}.
      </p>

      <h2>{collect}</h2>
      <p>
        When you send a request through a form, we collect what you type: your name, your phone number or email, and the
        details of your request.
      </p>
      <ul>
        <li>
          <strong>Genix Logistics:</strong> where something is going from and to (ZIP codes), the date, what&apos;s moving, and
          any notes.
        </li>
        <li>
          <strong>Genix Home Upgrades:</strong> the kind of project, whether it&apos;s for a home or a business, when you&apos;d
          like to start, a rough budget if you give one, your property ZIP, your description, any links you add, the photos you
          upload, and a best time to call if you choose one.
        </li>
        <li>
          <strong>Genix Multimedia</strong> doesn&apos;t have a request form yet. If you email us, we keep your message.
        </li>
      </ul>
      <p>
        We also collect two technical things. To limit spam, we keep a scrambled (hashed) version of your IP address; it can&apos;t
        be turned back into your address. And our host counts visits and page speed in a way that doesn&apos;t use cookies and
        doesn&apos;t identify you.
      </p>

      <h2>{use}</h2>
      <p>
        We use your details only to reply to your request: to send you a confirmation, answer your questions, arrange a visit,
        give you a quote and do the work. We keep a record of the request so we can follow up. We use scrambled IP addresses only
        to limit spam. We don&apos;t send marketing emails, we don&apos;t use your details for advertising, and we never sell
        them.
      </p>

      <h2>{handles}</h2>
      <table className="policy-table">
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">What it does for us</th>
            <th scope="col">What it receives</th>
          </tr>
        </thead>
        <tbody>
          {PROVIDERS.map(([name, does, gets]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td data-label="What it does for us">{does}</td>
              <td data-label="What it receives">{gets}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        These companies handle your information to provide those services to us, under their own terms and privacy policies. We
        read your request in our own email inbox. We don&apos;t give your details to anyone else unless the law requires it.
      </p>

      <h2>{cookies}</h2>
      <p>
        We don&apos;t use advertising or tracking cookies, and there is no cookie banner because there is nothing to ask you
        about. (Our own staff get a login cookie when they sign in to manage the sites; visitors don&apos;t.) We don&apos;t track
        you across other websites, so a &quot;Do Not Track&quot; signal from your browser doesn&apos;t change how our sites work.
      </p>

      <h2>{keep}</h2>
      <p>
        We keep a request for as long as we need it to follow up and for our business records. If you ask us to delete it, we
        will, including any photos you uploaded. Photos that were uploaded but never sent with a request are removed
        automatically within a couple of days.
      </p>

      <h2>{choices}</h2>
      <p>
        You can ask us what we hold about you, to correct it, or to delete it. Email {mail} from the address you used and tell
        us what you need. We&apos;ll reply within 45 days. California law gives California residents these rights, and we&apos;ll
        honor a request from anyone. We won&apos;t treat you differently for asking.
      </p>

      <h2>{children}</h2>
      <p>
        Our sites are for adults arranging work. They aren&apos;t directed to children under 13, and we don&apos;t knowingly
        collect their information.
      </p>

      <h2>{changes}</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top. If the change is significant, we&apos;ll say so on this
        page.
      </p>

      <h2>{questions}</h2>
      <p>Write to {mail}.</p>
    </article>
  )
}
```

Adjust the test's expected apostrophe markup if React renders `&apos;` differently (`renderToStaticMarkup` emits `&#x27;`; keep the assertions matching the actual output, not the other way round).

- [ ] **Step 5: Run** — `npx vitest run tests/unit` → all pass; `npx tsc --noEmit` → 0.

- [ ] **Step 6: Commit**

```bash
git add src/legal src/sites/data-shape.ts src/sites/data.ts tests/unit
git commit -m "feat(legal): privacy policy text module and the hub's postal address in site data"
```

---

### Task 2: The `/privacy` route, styles, sitemap

**Files:**
- Create: `web/src/app/(sites)/[site]/privacy/page.tsx`, `web/src/legal/policy.css`, `web/tests/e2e/privacy.e2e.spec.ts`
- Modify: `web/src/sites/config.ts` (`SITES.hub.pages: ['/', '/privacy']`), `web/tests/e2e/quality.e2e.spec.ts` (axe + console tests for the privacy URL), any unit test asserting the hub's pages list

**Interfaces:**
- Consumes: `PrivacyPolicy`, `SiteData.address` (Task 1); `pageMetadata(site, path, { title, description })` (`@/sites/seo`); `siteOrigin`, `isSiteKey` (`@/sites/config`); `getSiteData` (`@/sites/data`).
- Produces: the route `GET /<site>/privacy` (hub → page; division → 308 to `${siteOrigin('hub')}/privacy`; unknown → 404).

- [ ] **Step 1: Write the failing e2e** — `web/tests/e2e/privacy.e2e.spec.ts`

```ts
import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'
const HEADINGS = ['Who we are', 'What we collect', 'How we use it', 'Who handles it for us', 'Cookies and tracking', 'How long we keep it', 'Your choices', 'Children', 'Changes', 'Questions']

test('the hub serves the policy', async ({ page }) => {
  await page.goto(`${HUB}/privacy`)
  await expect(page.locator('h1')).toHaveText('Privacy policy')
  await expect(page.locator('.policy-updated')).toContainText('Last updated October 5, 2026')
  await expect(page.locator('.policy-body h2')).toHaveText(HEADINGS)
  await expect(page.locator('.policy-table thead th')).toHaveText(['Service', 'What it does for us', 'What it receives'])
  await expect(page.locator('.policy-table tbody th')).toHaveText(['Resend', 'Cloudinary', 'Vercel', 'Neon'])
  await expect(page.locator('.policy-body a[href="mailto:hello@thegenixgroup.com"]').first()).toBeVisible()
  expect(await page.title()).toBe('Privacy policy | The Genix Group')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy$/)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['logistics', 'homeupgrades', 'multimedia']) {
  test(`${host}: /privacy redirects permanently to the hub page`, async ({ page }) => {
    const first = page.waitForResponse((r) => r.url() === `http://${host}.localhost:3000/privacy`)
    await page.goto(`http://${host}.localhost:3000/privacy`)
    expect((await first).status()).toBe(308)
    await expect(page).toHaveURL(`${HUB}/privacy`)
    await expect(page.locator('h1')).toHaveText('Privacy policy')
  })
}

test('no sideways scroll at 320 px and the provider table stacks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(`${HUB}/privacy`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const rows = await page.locator('.policy-table tbody tr').first().evaluate((tr) => getComputedStyle(tr).display)
  expect(rows).toBe('block')
})

test('only the hub sitemap lists it; robots does not block it', async ({ page }) => {
  await page.goto(`${HUB}/sitemap.xml`)
  expect(await page.content()).toContain('/privacy')
  await page.goto('http://homeupgrades.localhost:3000/sitemap.xml')
  expect(await page.content()).not.toContain('/privacy')
  await page.goto(`${HUB}/robots.txt`)
  expect(await page.textContent('body')).not.toMatch(/Disallow:\s*\/privacy/)
})
```

In `web/tests/e2e/quality.e2e.spec.ts` add (after the HOMES loops, matching their style) an axe test and a no-console-errors test for `http://localhost:3000/privacy` (copy the existing home tests' bodies, with `reducedMotion: 'reduce'` and `waitUntil: 'networkidle'`).

- [ ] **Step 2: Run it** — `npx playwright test tests/e2e/privacy.e2e.spec.ts --reporter=line` → FAIL (404s).

- [ ] **Step 3: Implement the route** — `web/src/app/(sites)/[site]/privacy/page.tsx`

```tsx
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import '@/legal/policy.css'
import { PrivacyPolicy } from '@/legal/privacy'
import { isSiteKey, siteOrigin } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'hub') return {}
  return pageMetadata('hub', '/privacy', {
    title: 'Privacy policy',
    description: 'What The Genix Group collects through its sites, what it does with it, and your choices.',
  })
}

// One policy for the whole group, on the hub host. Division hosts send visitors there.
export default async function PrivacyPage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site)) notFound()
  if (site !== 'hub') permanentRedirect(`${siteOrigin('hub')}/privacy`)
  const data = await getSiteData('hub')
  return (
    <main id="main" className="policy">
      <div className="wrap">
        <PrivacyPolicy email={data.email ?? 'hello@thegenixgroup.com'} address={data.address} />
      </div>
    </main>
  )
}
```

`web/src/legal/policy.css`:

```css
/* Privacy policy page (hub). Uses the hub tokens from hub.generated.css; every rule is under .policy. */
html[data-site="hub"] .policy { padding: clamp(112px, 14vw, 152px) 0 clamp(64px, 8vw, 104px); }
html[data-site="hub"] .policy-body { max-width: 68ch; }
html[data-site="hub"] .policy-body h1 { font: 600 clamp(36px, 5vw, 56px) / 1.05 var(--f-display); letter-spacing: -0.03em; color: var(--black); margin: 0 0 12px; }
html[data-site="hub"] .policy-updated { margin: 0 0 32px; color: var(--muted); font-size: 15px; }
html[data-site="hub"] .policy-body h2 { font: 600 clamp(22px, 2.4vw, 28px) / 1.2 var(--f-display); letter-spacing: -0.02em; color: var(--black); margin: 48px 0 12px; }
html[data-site="hub"] .policy-body p,
html[data-site="hub"] .policy-body li { font: 400 17px / 1.7 var(--f-body); color: var(--ink-2); overflow-wrap: anywhere; }
html[data-site="hub"] .policy-body p { margin: 0 0 16px; }
html[data-site="hub"] .policy-body ul { margin: 0 0 16px; padding-left: 1.2em; }
html[data-site="hub"] .policy-body li { margin: 6px 0; }
html[data-site="hub"] .policy-body strong { color: var(--ink); font-weight: 600; }
html[data-site="hub"] .policy-body a { color: var(--black); text-decoration: underline; text-underline-offset: 3px; }
html[data-site="hub"] .policy-body a:hover { color: var(--gold-text); }
html[data-site="hub"] .policy-body a:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
html[data-site="hub"] .policy-table { width: 100%; border-collapse: collapse; margin: 0 0 20px; font: 400 16px / 1.5 var(--f-body); color: var(--ink-2); }
html[data-site="hub"] .policy-table th,
html[data-site="hub"] .policy-table td { text-align: left; vertical-align: top; padding: 12px 16px 12px 0; border-bottom: 1px solid var(--line); }
html[data-site="hub"] .policy-table thead th { font-weight: 600; font-size: 14px; color: var(--muted); }
html[data-site="hub"] .policy-table tbody th { font-weight: 600; color: var(--ink); width: 18%; }
@media (max-width: 640px) {
  html[data-site="hub"] .policy-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  html[data-site="hub"] .policy-table,
  html[data-site="hub"] .policy-table tbody,
  html[data-site="hub"] .policy-table tr,
  html[data-site="hub"] .policy-table th,
  html[data-site="hub"] .policy-table td { display: block; width: auto; }
  html[data-site="hub"] .policy-table tr { padding: 14px 0; border-bottom: 1px solid var(--line); }
  html[data-site="hub"] .policy-table th,
  html[data-site="hub"] .policy-table td { border: 0; padding: 2px 0; }
  html[data-site="hub"] .policy-table td::before { content: attr(data-label); display: block; margin-top: 8px; font-size: 13px; font-weight: 600; color: var(--muted); }
}
```

In `web/src/sites/config.ts` set the hub's `pages: ['/', '/privacy']` (hub only). Check the exact token names (`--black`, `--ink`, `--ink-2`, `--muted`, `--line`, `--gold`, `--gold-text`, `--f-display`, `--f-body`) exist in `hub.generated.css`; use the real names if any differ. Confirm the fixed hub header doesn't cover the h1 (adjust the top padding, not the header).

- [ ] **Step 4: Run** — `npx playwright test tests/e2e/privacy.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/sites.e2e.spec.ts tests/e2e/seo.e2e.spec.ts --reporter=line` → pass; `npx vitest run tests/unit` and `npx tsc --noEmit` → pass. Take screenshots of `/privacy` at 1280 px and 390 px (into the scratchpad) and look at them: heading hierarchy, line length, table, footer.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(sites)/[site]/privacy" src/legal/policy.css src/sites/config.ts tests
git commit -m "feat(legal): /privacy page on the hub; division hosts redirect to it; in the sitemap"
```

---

### Task 3: Links from both forms and all footers

**Files (prototype first, then app):**
- Modify: `design/logistics-home.html` (`.privacy-note`, footer `.legal`), `design/homeupgrades-home.html` (`.privacy`, footer `.legal`), `design/hub-home.html` (footer `.legal`)
- Modify: `web/src/pages-home/logistics/sections/Hero.tsx` (~line 117), `web/src/pages-home/homeupgrades/sections/Quote.tsx` (~line 105), `web/src/components/site/hub/HubFooter.tsx`, `web/src/components/site/division/DivisionFooter.tsx`, and the generic footer Multimedia uses (find it via `web/src/components/site/SiteChrome.tsx`)
- Regenerate: `npm run port:css` if prototype CSS changes
- Test: `web/tests/e2e/privacy-links.e2e.spec.ts` (new); update `web/tests/e2e/logistics-home.e2e.spec.ts` lines ~123–124 only if the wording check needs the new sentence

**Interfaces:**
- Consumes: `siteOrigin('hub')` (`@/sites/config`).
- Produces: `PRIVACY_URL` = `${siteOrigin('hub')}/privacy` used in the app components; the prototypes use the literal `https://thegenixgroup.com/privacy`.

- [ ] **Step 1: Write the failing e2e** — `web/tests/e2e/privacy-links.e2e.spec.ts`

```ts
import { expect, test } from '@playwright/test'

const HUB_PRIVACY = 'http://localhost:3000/privacy'
const HOMES = ['http://localhost:3000/', 'http://logistics.localhost:3000/', 'http://homeupgrades.localhost:3000/', 'http://multimedia.localhost:3000/']

for (const url of HOMES) {
  test(`${url}: the footer links to the hub's privacy policy`, async ({ page }) => {
    await page.goto(url)
    const link = page.locator('footer a', { hasText: 'Privacy policy' })
    await expect(link).toHaveCount(1)
    // An absolute hub URL: a relative /privacy from a division host would only redirect.
    await expect(link).toHaveAttribute('href', HUB_PRIVACY)
  })
}

test('the Logistics form line links the policy and no longer shows the email', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  const note = page.locator('.privacy-note')
  await expect(note).toContainText('We use your details only to reply to this request.')
  await expect(note.locator('a')).toHaveText('privacy policy')
  await expect(note.locator('a')).toHaveAttribute('href', HUB_PRIVACY)
  await expect(note).not.toContainText('hello@thegenixgroup.com')
})

test('the Home Upgrades form line links the policy', async ({ page }) => {
  await page.goto('http://homeupgrades.localhost:3000/')
  const note = page.locator('#hu-quote-form .privacy')
  await expect(note).toContainText('We use your details and photos only to reply to this request.')
  await expect(note.locator('a')).toHaveText('privacy policy')
  await expect(note.locator('a')).toHaveAttribute('href', HUB_PRIVACY)
})
```

- [ ] **Step 2: Run it** — FAIL (no links yet).

- [ ] **Step 3: Prototype edits** (`design/`; the file is `design/…`, run from the repo root)
  - `logistics-home.html` `.privacy-note` (~line 321) becomes: `We use your details only to reply to this request. Read our <a href="https://thegenixgroup.com/privacy">privacy policy</a>.`
  - `homeupgrades-home.html` `.privacy` (~line 2089): `We use your details and photos only to reply to this request. Read our <a href="https://thegenixgroup.com/privacy">privacy policy</a>.`
  - Footers: add `<a href="https://thegenixgroup.com/privacy">Privacy policy</a>` to each `.legal` row — `hub-home.html` (~line 1693): inside the second span before "thegenixgroup.com" separated by `&nbsp;&nbsp;`; `logistics-home.html` (~line 683) and `homeupgrades-home.html` (~line 2178): after the sibling-business links in the second span, separated by `&nbsp;&nbsp;`. Style: inherit the footer link colour/underline (reuse the `.legal a` rule if one exists; otherwise add `.legal a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }` scoped to the footer). Check at 1280 px and 390 px that the row neither wraps awkwardly nor overflows.

- [ ] **Step 4: App edits** — mirror the prototypes exactly:
  - `Hero.tsx`: `<p className="mono privacy-note">We use your details only to reply to this request. Read our <a href={PRIVACY_URL}>privacy policy</a>.</p>`
  - `Quote.tsx`: `<p className="privacy">We use your details and photos only to reply to this request. Read our <a href={PRIVACY_URL}>privacy policy</a>.</p>`
  - `HubFooter.tsx`, `DivisionFooter.tsx`, and the Multimedia/generic footer: add `<a href={`${siteOrigin('hub')}/privacy`}>Privacy policy</a>` in the `.legal` row the same way. Define `const PRIVACY_URL = `${siteOrigin('hub')}/privacy`` at the top of each file that needs it (no new shared module).
  - Run `npm run port:css` (only if prototype CSS changed). Keep the logistics `.privacy-note` and HU `.privacy` link styling readable (underline, inherits colour) and keyboard-focusable.

- [ ] **Step 5: Run** — `npx playwright test tests/e2e/privacy-links.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/logistics-home.e2e.spec.ts tests/e2e/homeupgrades-home.e2e.spec.ts tests/e2e/hub-home.e2e.spec.ts tests/e2e/hu-quote.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/chrome.e2e.spec.ts --reporter=line` → pass (a known-flaky "clicking during the swing" / "dragging moves the split" test may need one re-run); `npx tsc --noEmit` → 0. Parity must pass for all three homes (desktop and phone) — fix real layout differences, don't loosen the test.

- [ ] **Step 6: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(legal): privacy policy links on both quote forms and all footers"
```

---

### Task 4: Docs and full verification

**Files:**
- Modify: `web/README.md` (new short section "Privacy policy")

- [ ] **Step 1:** Add to `web/README.md`:

```md
### Privacy policy
The group's privacy policy is `web/src/legal/privacy.tsx`, served at `thegenixgroup.com/privacy` (division sites redirect there; the quote forms and every footer link to it). When a new service provider handles visitors' data, a new kind of data is collected, or a new business gets a form, update the text and `PRIVACY_UPDATED` in that file. The hub's mailing address appears on the page only when street, city, state and ZIP are all filled in under Admin → Sites → hub.
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`; `npx vitest run`; then (not at the same time) `npx playwright test --reporter=line` (whole suite, ~15 min; reuses the dev server on :3000). Fix only failures this branch caused, with a test; report environmental flakes after one re-run.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: how to keep the privacy policy current"
```

---

## Self-review notes

- Spec coverage: one group page, text verbatim (T1); route, redirect, metadata, sitemap, styles, phone stacking (T2); form lines + footer links in prototypes and app (T3); README, tests, full run (T4). The three commitments are in the text and asserted in T1's unit test.
- Review Focus 1, 3, 4 → T2 e2e; 2 → T1 unit; 5 → T3 e2e.
- Names used across tasks: `PRIVACY_UPDATED`, `PRIVACY_HEADINGS`, `PrivacyPolicy`, `PostalAddress`, `formatAddress`, `SiteData.address`, `.policy`, `.policy-body`, `.policy-updated`, `.policy-table`, `PRIVACY_URL`.
