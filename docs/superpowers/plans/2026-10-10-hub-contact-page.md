# Hub Contact Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give The Genix Group a `thegenixgroup.com/contact` page with a short message form that runs through the existing enquiry pipeline, plus quick-route cards to each business.

**Architecture:** The pipeline already handles one form per site; the hub gets its own `FormDef` (`forms/hub.ts`) whose `inquiryType` is `'contact'`, and the pipeline/emails read the type from the form instead of hard-coding `'quote'`. The page is a hub branch of the existing `[site]/contact` route, prototype first, with a server-rendered form that works without JS and a small client enhancer that reuses the same parser for inline validation.

**Tech Stack:** Next.js 16.3.6, React 19, Payload 3.90.2, zod (existing), Resend (existing), Vercel BotID (existing), Vitest (unit + int against Docker Postgres :5434), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-hub-contact-page-design.md` (binding).

## Global Constraints

- All app code in `web/`; run commands from `web/`. Prototypes in repo-root `design/`. This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` before using route, searchParams or metadata APIs. `proxy.ts` rewrites `localhost:3000/contact` → `/hub/contact`.
- Form fields, in order: **about** (radio: `logistics` "Genix Logistics", `homeupgrades` "Genix Home Upgrades", `multimedia` "Genix Multimedia", `unsure` "Not sure, or more than one"), **name** (required, ≤120), **email** (required, valid), **phone** (optional; "Enter a phone number with area code."), **message** (required, 10–2,000 chars).
- Same spam protection as the quote forms: honeypot `company_site`, timing field `t` (2 s guard), BotID (`/contact` is already in `BOTID_PROTECT`, `web/src/inquiries/bot-check.ts` — keep it there), rate limit, hashed IP.
- Pipeline: hub inquiries saved with `division: 'hub'`, `type: 'contact'`, reference `GX-HUB-######`. Quote forms keep `type: 'quote'` and their exact email wording; their existing tests pass unchanged.
- Emails for `contact`: team subject `[Group] Message · <about short> · <ref>`, heading "New message · <ref>"; customer subject "We got your message · <ref>", signed "The Genix Group" (not "The Genix Group · Part of The Genix Group"). The customer email lists only the About choice — never the message, name, phone or email.
- Privacy line: "We use your details only to reply to this message. Read our privacy policy." — "privacy policy" links to `siteOrigin('hub') + '/privacy'`.
- `/contact` hub branch: `multimedia` and unknown site keys keep 404; logistics and homeupgrades keep their pages unchanged. `/contact` added to `SITES.hub.pages` (hub sitemap). Title "Contact | The Genix Group", canonical `https://thegenixgroup.com/contact` (`http://localhost:3000/contact` in dev), indexable. Own `<main id="main">`. No motion (no `data-reveal`/`data-split`, no `HubMotion`).
- Mailing address shows only when street, city, state and ZIP are all set (`data.address`, `formatAddress`).
- Generated CSS only via `npm run port:css` (restore generated files that only show CRLF noise: `git diff -w --ignore-space-at-eol --stat -- <file>` empty → `git checkout -- <file>`). Parity 2% limit stays.
- Playwright `--reporter=line`, never concurrently with Vitest; never `npm run build` with the dev server up; never kill node or docker processes. If anything fails with Postgres/ECONNREFUSED or a Docker error, STOP and report — it is the environment, not the code. Node can't resolve `*.localhost`: use Playwright `page`.
- Before touching a `design/` file run `git status --short design/`; uncommitted changes you didn't make → STOP, report NEEDS_CONTEXT. Never revert/stash files you didn't change. Never commit `web/.env`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec)

1. The About page's "Start a conversation" button (`.about-cta`, today `/#contact`) also moves to `/contact` (Task 4): the header button with the same label now goes there; the spec is silent.
2. The hub sent page gets its own hub-styled markup (`.contact-sent`), because `/quote/sent`'s current markup uses division classes (`label-card`) the hub CSS doesn't have.
3. The client enhancer validates with the same `parseHubMessage` the server uses, so client and server messages can't drift.
4. Copy marked "draft" (h1, lede, form title) is for the owner to review in the prototype; the route-card copy is reused verbatim from the hub home's Route section.

## Review Focus

1. **The quote forms must not change.** Logistics/Home Upgrades still save `type: 'quote'` and keep their exact email subjects/headings (Task 1 unit + existing int/e2e).
2. **Bad input saves nothing:** blank or whitespace-only fields, a 9- or 2,001-character message, an `about` value that isn't one of the four (Task 1 unit; Task 2 no-JS e2e).
3. **`?about=` with garbage** (`?about=hub`, `?about=<script>`) pre-selects nothing and doesn't break the page (Task 2 e2e).
4. **The confirmation email never echoes free text or contact details** (Task 1 unit).
5. **Every sent-page branch on the hub** (ok, invalid, rate, offline, server) is hub-styled with a back link to `/contact`, and the division sent pages are unchanged (Task 2 e2e + existing specs).

---

## File Structure

| File | Responsibility |
|---|---|
| `web/src/inquiries/forms/types.ts` | `FormDef.inquiryType` |
| `web/src/inquiries/forms/hub.ts` (new) | `ABOUT`, `HubMessage`, `HUB_MESSAGES`, `parseHubMessage`, `hubForm` |
| `web/src/inquiries/forms/{logistics,homeupgrades,index}.ts` | `inquiryType: 'quote'`; register `hub` |
| `web/src/inquiries/pipeline.ts`, `email.ts`, `deliver.ts` | type from the form; wording by kind |
| `web/src/pages-home/hub/Arrow.tsx` (new, moved) | the arrow icon shared by Route and Contact cards |
| `web/src/components/forms/HubMessageForm.tsx` (new) | the form markup (+ enhancer from Task 3) |
| `web/src/pages-home/hub/Contact.tsx` (new) | `HubContact({ data, about })` page body |
| `web/src/app/(sites)/[site]/contact/page.tsx`, `quote/sent/page.tsx` | hub branches |
| `web/src/components/motion/HubContactForm.tsx` (new, Task 3) | client enhancer |
| `design/hub-contact.html` (new), `design/shared/hub-home.css` | prototype + `.contact-*` rules |
| config, `HubFooter.tsx`, `Route.tsx`, `About.tsx`, prototypes, README (Task 4) | links |

---

### Task 1: Pipeline: the hub message form and per-form inquiry type

**Files:**
- Create: `web/src/inquiries/forms/hub.ts`
- Modify: `web/src/inquiries/forms/types.ts`, `forms/logistics.ts`, `forms/homeupgrades.ts`, `forms/index.ts`, `web/src/inquiries/pipeline.ts`, `web/src/inquiries/email.ts`, `web/src/inquiries/deliver.ts`
- Test: `web/tests/unit/inquiry-forms.test.ts`, `web/tests/unit/inquiry-format.test.ts`, `web/tests/int/inquiry-pipeline.int.spec.ts`

**Interfaces:**
- Produces: `FormDef<T>.inquiryType: 'quote' | 'contact'`; from `@/inquiries/forms/hub`: `ABOUT` (record of the four labels), `type About`, `type HubMessage = { about: About; name: string; email: string; phone: string | null; message: string }`, `HUB_MESSAGES`, `parseHubMessage(raw: Record<string, unknown>): Parsed<HubMessage>`, `hubForm: FormDef<HubMessage>`; `FORM_SITES` = `['logistics', 'homeupgrades', 'hub']`; `teamEmail({ …, kind? })`, `customerEmail({ …, kind? })` with `kind: 'quote' | 'contact'` defaulting to `'quote'`.

- [ ] **Step 1: Write the failing unit tests.**

In `web/tests/unit/inquiry-forms.test.ts` replace the first test with:

```ts
  it('lists the sites that take enquiries', () => {
    expect(FORM_SITES).toEqual(['logistics', 'homeupgrades', 'hub'])
    expect(() => formFor('multimedia')).toThrow()
    expect(formFor('logistics').inquiryType).toBe('quote')
    expect(formFor('homeupgrades').inquiryType).toBe('quote')
    expect(formFor('hub').inquiryType).toBe('contact')
  })
```

and append:

```ts
describe('hub message form', () => {
  const ok = { about: 'multimedia', name: ' Ana ', email: 'ana@example.com', phone: '', message: 'Can you film our opening night?' }
  const def = () => formFor('hub')
  it('parses a valid message and round-trips through storage', () => {
    const r = def().parse(ok, '2026-10-10')
    if (!r.ok) throw new Error('expected ok')
    expect(r.data).toEqual({ about: 'multimedia', name: 'Ana', email: 'ana@example.com', phone: null, message: 'Can you film our opening night?' })
    const back = def().fromStored(def().details(r.data), def().contact(r.data))
    expect(def().answers(back)).toEqual(def().answers(r.data))
    expect(def().summary(r.data)).toBe('Message · Multimedia')
    expect(def().subjectDetails(r.data)).toBe('Multimedia')
    expect(def().contact(r.data)).toEqual({ name: 'Ana', phone: null, email: 'ana@example.com', notes: 'Can you film our opening night?' })
  })
  it('requires about, name, email and a 10–2,000 character message', () => {
    const r = def().parse({ about: 'hub', name: '  ', email: '', phone: '555', message: 'too short' }, '2026-10-10')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors).toEqual({
      about: 'Choose which business this is about.',
      name: 'Enter your name.',
      email: 'Enter your email so we can reply.',
      phone: 'Enter a phone number with area code.',
      message: 'Tell us a little more (at least 10 characters).',
    })
    const long = def().parse({ ...ok, message: 'x'.repeat(2001), email: 'not-an-email' }, '2026-10-10')
    if (long.ok) throw new Error('expected errors')
    expect(long.errors).toEqual({ email: 'Enter an email like name@company.com.', message: 'Keep your message under 2,000 characters.' })
  })
  it('the customer rows carry only the About choice', () => {
    const r = def().parse({ ...ok, phone: '(619) 555-0100' }, '2026-10-10')
    if (!r.ok) throw new Error('expected ok')
    expect(def().customerRows(r.data)).toEqual([['About', 'Genix Multimedia']])
  })
})
```

In `web/tests/unit/inquiry-format.test.ts` append (reuse the file's existing imports; add `import { hubForm } from '@/inquiries/forms/hub'`):

```ts
describe('contact emails', () => {
  const m = { about: 'unsure' as const, name: 'Ana', email: 'ana@example.com', phone: '(619) 555-0100', message: 'Please call me <b>about</b> both' }
  it('team email says message, names the business and keeps the reference', () => {
    const e = teamEmail({ site: 'hub', kind: 'contact', reference: 'GX-HUB-000001', rows: hubForm.answers(m), subjectDetails: hubForm.subjectDetails(m), phone: m.phone, adminUrl: 'https://thegenixgroup.com/admin/collections/inquiries/9' })
    expect(e.subject).toBe('[Group] Message · Not sure · GX-HUB-000001')
    expect(e.html).toContain('New message · GX-HUB-000001')
    expect(e.text.startsWith('New message · GX-HUB-000001')).toBe(true)
    expect(e.html).toContain('Please call me &lt;b&gt;about&lt;/b&gt; both')
  })
  it('customer email says message, is signed by the group and never echoes the message or contact details', () => {
    const e = customerEmail({ site: 'hub', kind: 'contact', reference: 'GX-HUB-000001', name: m.name, rows: hubForm.customerRows(m), phone: null })
    expect(e.subject).toBe('We got your message · GX-HUB-000001')
    expect(e.text).toContain('The Genix Group')
    expect(e.text).not.toContain('Part of The Genix Group')
    for (const s of ['Please call me', 'ana@example.com', '555-0100']) expect(e.text).not.toContain(s)
  })
  it('quote emails keep their wording', () => {
    const t = teamEmail({ site: 'logistics', reference: 'GX-LOG-000001', rows: [['Name', 'Ana']], subjectDetails: 'x', phone: null, adminUrl: 'u' })
    expect(t.subject).toBe('[Logistics] Quote · x · GX-LOG-000001')
    expect(t.html).toContain('New quote request · GX-LOG-000001')
    const c = customerEmail({ site: 'logistics', reference: 'GX-LOG-000001', name: 'Ana', rows: [], phone: null })
    expect(c.subject).toBe('We got your request · GX-LOG-000001')
    expect(c.text).toContain('Genix Logistics · Part of The Genix Group')
  })
})
```

(Read the file first: if its existing imports differ, adapt the import lines only.)

- [ ] **Step 2: Write the failing int test.** In `web/tests/int/inquiry-pipeline.int.spec.ts` add inside the `processQuote` describe (reuse its `deps`/`input` helpers):

```ts
  it('saves a hub message as a contact with a GX-HUB reference', async () => {
    const hubRaw = { about: 'logistics', name: 'Ana', email: 'ana@example.com', phone: '', message: 'Two pallets to Phoenix next month?' }
    const r = await processQuote(input({ site: 'hub', raw: hubRaw }), deps())
    expect(r).toMatchObject({ ok: true, reference: 'GX-HUB-000001' })
    const { docs } = await payload.find({ collection: 'inquiries', where: { division: { equals: 'hub' } } })
    expect(docs[0]).toMatchObject({ division: 'hub', type: 'contact', name: 'Ana', email: 'ana@example.com', notes: 'Two pallets to Phoenix next month?', summary: 'Message · Logistics' })
  })
```

(`input`'s `site` type may be narrowed to `'logistics'`: widen it to `SiteKey` in the helper if TypeScript complains.)

- [ ] **Step 3: Run them** — `npx vitest run tests/unit/inquiry-forms.test.ts tests/unit/inquiry-format.test.ts tests/int/inquiry-pipeline.int.spec.ts` → FAIL (no hub form, no `kind`, type is `'quote'`). Docker Postgres must be up (int tests); a connection error means STOP and report.

- [ ] **Step 4: Implement.**

`forms/types.ts` — add to `FormDef<T>` (first member after `site`):

```ts
  /** Stored as the inquiry's `type`, and picks the email wording. */
  inquiryType: 'quote' | 'contact'
```

`forms/logistics.ts` and `forms/homeupgrades.ts`: add `inquiryType: 'quote',` after `site: …,`.

`forms/hub.ts`:

```ts
import type { Contact, FormDef, Parsed, Row } from './types'

/** The hub Contact form's "Which business is this about?" choices (value → label). */
export const ABOUT = {
  logistics: 'Genix Logistics',
  homeupgrades: 'Genix Home Upgrades',
  multimedia: 'Genix Multimedia',
  unsure: 'Not sure, or more than one',
} as const
export type About = keyof typeof ABOUT
const SHORT: Record<About, string> = { logistics: 'Logistics', homeupgrades: 'Home Upgrades', multimedia: 'Multimedia', unsure: 'Not sure' }
export const isAbout = (v: unknown): v is About => typeof v === 'string' && Object.hasOwn(ABOUT, v)

export type HubMessage = { about: About; name: string; email: string; phone: string | null; message: string }

/** Shared by the server parser and the client enhancer, so both say the same thing. */
export const HUB_MESSAGES = {
  about: 'Choose which business this is about.',
  name: 'Enter your name.',
  emailMissing: 'Enter your email so we can reply.',
  email: 'Enter an email like name@company.com.',
  phone: 'Enter a phone number with area code.',
  messageShort: 'Tell us a little more (at least 10 characters).',
  messageLong: 'Keep your message under 2,000 characters.',
} as const

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseHubMessage(raw: Record<string, unknown>): Parsed<HubMessage> {
  const errors: Record<string, string> = {}
  const about = str(raw.about)
  if (!isAbout(about)) errors.about = HUB_MESSAGES.about
  const name = str(raw.name)
  if (!name) errors.name = HUB_MESSAGES.name
  const email = str(raw.email)
  if (!email) errors.email = HUB_MESSAGES.emailMissing
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = HUB_MESSAGES.email
  const phone = str(raw.phone) || null
  if (phone && (phone.length > 40 || phone.replace(/\D/g, '').length < 10)) errors.phone = HUB_MESSAGES.phone
  const message = str(raw.message)
  if (message.length < 10) errors.message = HUB_MESSAGES.messageShort
  else if (message.length > 2000) errors.message = HUB_MESSAGES.messageLong
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, data: { about: about as About, name: name.slice(0, 120), email, phone, message } }
}

const answers = (m: HubMessage): Row[] => [
  ['About', ABOUT[m.about]],
  ['Name', m.name],
  ...(m.phone ? ([['Phone', m.phone]] as Row[]) : []),
  ['Email', m.email],
  ['Message', m.message],
]

export const hubForm: FormDef<HubMessage> = {
  site: 'hub',
  inquiryType: 'contact',
  fields: ['about', 'name', 'email', 'phone', 'message'],
  parse: (raw) => parseHubMessage(raw),
  contact: (m) => ({ name: m.name, phone: m.phone, email: m.email, notes: m.message }),
  details: (m) => ({ about: m.about }),
  fromStored: (d, c: Contact) => ({ about: isAbout(d.about) ? d.about : 'unsure', name: c.name, email: c.email ?? '', phone: c.phone, message: c.notes ?? '' }),
  summary: (m) => `Message · ${SHORT[m.about]}`,
  subjectDetails: (m) => SHORT[m.about],
  answers,
  customerRows: (m) => [['About', ABOUT[m.about]]],
}
```

`forms/index.ts`: `import { hubForm } from './hub'` and add `hub: hubForm as FormDef<unknown>,` as the third entry of `FORMS`.

`pipeline.ts`: replace `type: 'quote'` with `type: def.inquiryType`.

`email.ts`:
- `teamEmail` argument type gains `kind?: 'quote' | 'contact'`; inside: `const msg = a.kind === 'contact'`; `const subject = msg ? `[${SITES[a.site].shortName}] Message · ${a.subjectDetails} · ${a.reference}` : `[${SITES[a.site].shortName}] Quote · ${a.subjectDetails} · ${a.reference}``; `const heading = `${msg ? 'New message' : 'New quote request'} · ${a.reference}``; use `esc(heading)` in the html heading and `heading` as the first text line (replacing the two literal "New quote request · …" uses).
- `customerEmail` argument type gains `kind?: 'quote' | 'contact'`; `const subject = `We got your ${a.kind === 'contact' ? 'message' : 'request'} · ${a.reference}``; `const sign = a.site === 'hub' ? SITES.hub.name : `${division} · Part of The Genix Group``; use `sign` in both html and text in place of the `${division} · Part of The Genix Group` strings.

`deliver.ts`: pass `kind: def.inquiryType` in both the `teamEmail({ … })` and `customerEmail({ … })` calls.

- [ ] **Step 5: Run** — `npx tsc --noEmit` → 0; `npx vitest run` (all unit + int) → all pass. Any other test that asserted `FORM_SITES` or the literal `'quote'` type must still pass; if one encodes the old two-site list, update it and note it.

- [ ] **Step 6: Commit**

```bash
git add src/inquiries tests/unit tests/int
git commit -m "feat(inquiries): hub message form with its own contact type and email wording"
```

---

### Task 2: The hub Contact page and its no-JS path

**Files:**
- Create: `design/hub-contact.html`, `web/src/pages-home/hub/Arrow.tsx`, `web/src/components/forms/HubMessageForm.tsx`, `web/src/pages-home/hub/Contact.tsx`, `web/tests/e2e/hub-contact.e2e.spec.ts`
- Modify: `design/shared/hub-home.css` (append `.contact-*`), `web/src/pages-home/hub/sections/Route.tsx` (import Arrow), `web/src/app/(sites)/[site]/contact/page.tsx`, `web/src/app/(sites)/[site]/quote/sent/page.tsx`, `web/src/sites/config.ts` (`SITES.hub.pages: ['/', '/privacy', '/about', '/contact']`), `web/tests/e2e/contact.e2e.spec.ts` (hub no longer 404), `web/tests/e2e/parity.e2e.spec.ts`, `web/tests/e2e/quality.e2e.spec.ts`, `web/tests/unit/seo.test.ts`; regenerated `hub.generated.css`

**Interfaces:**
- Consumes: `ABOUT`, `isAbout`, `type About` (`@/inquiries/forms/hub`); `submitQuoteForm` (`@/inquiries/actions`); `inquirySendMode`, `offlineMessage` (`@/inquiries/mode`); `siteOrigin`, `SITES` (`@/sites/config`); `formatAddress`, `SiteData` (`@/sites/data-shape`); `pageMetadata`; `getSiteData`.
- Produces: `Arrow()` (`@/pages-home/hub/Arrow`); `HubMessageForm({ data, about }: { data: SiteData; about: About | null })`; `HubContact({ data, about }: { data: SiteData; about: About | null })`; `CONTACT_HEADINGS = ['Go straight to a business', 'Send us a message', 'Find us'] as const` (exported from `Contact.tsx`, the three `<h2>`s in order). Task 3 adds the enhancer inside `HubMessageForm`; Task 4 links here.

Page markup contract (prototype and app match; ids are what Task 3's enhancer uses):

```html
<main id="main">                                         <!-- prototype: id="top" -->
  <section class="contact-hero" id="contact-top"><div class="wrap">
    <p class="label">Contact</p>
    <h1>Talk to the group.</h1>
    <p class="body">Tell us what you need and we'll put the right team on it. Ready for a price? Go straight to the business.</p>
  </div></section>
  <section class="contact-routes" id="contact-routes"><div class="wrap">
    <h2>Go straight to a business</h2>
    <div class="options"> three <a class="option"> cards, markup identical to the home Route section's cards </div>
  </div></section>
  <section class="contact-message" id="contact-message"><div class="wrap contact-grid">
    <form class="contact-form" id="message" …> (below) </form>
    <div class="contact-details"><h2>Find us</h2><ul class="facts">
      <li><span>Head office</span><span>San Diego, CA</span></li>
      <li><span>Email</span><span><a href="mailto:hello@thegenixgroup.com">hello@thegenixgroup.com</a></span></li>
      <!-- only when all four parts are set --><li><span>Address</span><span>…</span></li>
    </ul></div>
  </div></section>
</main>
```

Cards (copy verbatim from `Route.tsx`, hrefs differ): Move "Ship something" / "Freight, haulage, last-mile delivery and courier." / "Get a freight quote" → `${siteOrigin('logistics')}/contact`; Make "Upgrade a space" / "Accent walls, TV units, outdoor builds and handyman jobs." / "Plan an upgrade" → `${siteOrigin('homeupgrades')}/contact`; Tell "Tell your story" / "Photography, videography, branding and design." / "Send us a message" → `/contact?about=multimedia#message`. Same `style` custom properties as in `Route.tsx`; no `data-reveal`.

- [ ] **Step 1: Move the arrow (no-op).** Create `web/src/pages-home/hub/Arrow.tsx` with the `Arrow` component currently defined in `Route.tsx` (exported), and import it in `Route.tsx` (delete the local definition). `npx tsc --noEmit` → 0.

- [ ] **Step 2: Write the failing e2e** — `web/tests/e2e/hub-contact.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('hub /contact: headings, three route cards, the form, details, metadata', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await expect(page.locator('h1')).toHaveText('Talk to the group.')
  await expect(page.locator('main h2')).toHaveText(['Go straight to a business', 'Send us a message', 'Find us'])
  const hrefs = await page.$$eval('.contact-routes .option', (as) => as.map((a) => (a as HTMLAnchorElement).href))
  expect(hrefs[0]).toBe('http://logistics.localhost:3000/contact')
  expect(hrefs[1]).toBe('http://homeupgrades.localhost:3000/contact')
  expect(hrefs[2]).toBe(`${HUB}/contact?about=multimedia#message`)
  await expect(page.locator('form#message input[name="about"]')).toHaveCount(4)
  await expect(page.locator('form#message input[name="site"]')).toHaveValue('hub')
  await expect(page.locator('form#message .privacy a')).toHaveAttribute('href', `${HUB}/privacy`)
  await expect(page.locator('.contact-details a[href^="mailto:"]')).toBeVisible()
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Contact | The Genix Group')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${HUB}/contact`)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

test('?about=multimedia pre-selects Multimedia; junk values select nothing', async ({ page }) => {
  await page.goto(`${HUB}/contact?about=multimedia`)
  await expect(page.locator('input[name="about"][value="multimedia"]')).toBeChecked()
  for (const junk of ['hub', '%3Cscript%3E', '']) {
    await page.goto(`${HUB}/contact?about=${junk}`)
    await expect(page.locator('input[name="about"]:checked')).toHaveCount(0)
    await expect(page.locator('h1')).toHaveText('Talk to the group.')
  }
})

test('the Multimedia card lands on the form with Multimedia chosen', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await page.locator('.contact-routes .option').nth(2).click()
  await expect(page).toHaveURL(`${HUB}/contact?about=multimedia#message`)
  await expect(page.locator('input[name="about"][value="multimedia"]')).toBeChecked()
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('a message posts and lands on the hub-styled sent page', async ({ page }) => {
    await page.goto(`${HUB}/contact`)
    await page.check('input[name="about"][value="unsure"]')
    await page.fill('#hcName', 'E2E Hub NoJS')
    await page.fill('#hcEmail', 'e2e@test.local')
    await page.fill('#hcMessage', 'Moving offices and need a new sign filmed.')
    await page.click('#hcSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUB-\d{6}$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Message received.')
    await expect(page.locator('main')).toContainText('We\'ll reply by email within two business days.')
    await expect(page.getByRole('link', { name: 'Back to the form' })).toHaveAttribute('href', '/contact')
  })
  test('an invalid post shows the hub error page with a way back', async ({ page }) => {
    await page.goto(`${HUB}/quote/sent?error=invalid`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Couldn't send.")
    await expect(page.getByRole('link', { name: 'Back to the form' })).toHaveAttribute('href', '/contact')
    for (const err of ['offline', 'rate', 'server']) {
      await page.goto(`${HUB}/quote/sent?error=${err}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Couldn't send.")
      await expect(page.locator('.contact-sent')).toHaveCount(1)
    }
  })
})

test('no sideways scroll at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(`${HUB}/contact`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('the hub sitemap lists /contact', async ({ page }) => {
  await page.goto(`${HUB}/sitemap.xml`)
  expect(await page.content()).toContain('thegenixgroup.com/contact')
})
```

(The sitemap URL uses the configured root; if dev builds sitemap URLs on `localhost:3000`, assert `'/contact</loc>'` instead. Check the existing `seo.e2e` for which form it uses.)

Also: in `web/tests/e2e/contact.e2e.spec.ts` the 404 loop `for (const host of ['localhost:3000', 'multimedia.localhost:3000'])` becomes `['multimedia.localhost:3000']` (the hub now has the page); add `{ site: 'hub-contact', proto: '/hub-contact.html', app: 'http://localhost:3000/contact', chrome: true, sections: true }` to `PARITY`; add `'http://localhost:3000/contact'` to `HOMES` in `quality.e2e.spec.ts`; in `seo.test.ts` change the existing "/contact on the division sitemaps…, never the hub or Multimedia" test to expect the hub too (`expect(sitemapXml('hub', root)).toContain('/contact</loc>')`, Multimedia still not).

- [ ] **Step 3: Run to see failures** — `npx playwright test tests/e2e/hub-contact.e2e.spec.ts --reporter=line` (404).

- [ ] **Step 4: Build the prototype** `design/hub-contact.html` from `design/hub-about.html` (same head pattern: title "Contact | The Genix Group", description, canonical `https://thegenixgroup.com/contact`, `shared/hub-home.css`, the menu-toggle script only; header/footer with `hub-home.html#…` / `hub-about.html` links as in hub-about.html) and `<main id="top">` per the contract, with the form markup below (static `action` omitted). Append `.contact-*` rules to `design/shared/hub-home.css` using existing tokens:
  - `.contact-hero` like `.about-hero` (white band, same h1 scale, lede ≈ 62ch, h1 clear of the sticky header); `.contact-routes` on `--paper`, `h2` like `.about-businesses h2`, the cards reuse `.options`/`.option` unchanged (3 columns ≥ 961 px; follow how the home `.options` collapses on phones).
  - `.contact-message` white band; `.contact-grid` two columns `minmax(0, 1.4fr) minmax(0, 1fr)`, gap `clamp(32px, 6vw, 96px)`, one column ≤ 960 px with the form first.
  - `.contact-form`: `h2` (form title) display scale; `.contact-about` fieldset with no default border/padding, legend as a field label, radio options as plain labelled rows (min-height 44px, `accent-color: var(--black)`), not pills; `.field` blocks (label 600 15px `--ink`, input/textarea full width, 1px `--line` border, 0 radius like the hub's square cards, 12px padding, 16px text, focus = the global ring); `.field-row` two columns ≥ 641 px; `.field.invalid input, .field.invalid textarea, .contact-about.invalid` border `#b3261e`; `.err` 14px `#b3261e`, empty → no margin; `.hint` muted; `.hp` hidden off-screen (`position:absolute; left:-10000px; width:1px; height:1px; overflow:hidden`); `.privacy` 14px muted with an underlined link; `.contact-send` the hub accent button (copy `.about-cta`'s look, min-height 54px); `.sent` panel (paper background, 24px padding; `.sent-ref` mono muted text, `.sent-title` 600 22px).
  - `.contact-details` reuses `.facts`; `.contact-sent` for the hub sent page (white band, `.wrap`, max-width 640px content, h1 display scale, `.label` above, the `.contact-send` button as the back link).
  - Phones: no sideways scroll at 320 px; long email wraps (`overflow-wrap: anywhere`).
  Run `npm run port:css` (restore CRLF-only files). Screenshots of the prototype at 1280 and 390 px to the scratchpad, LOOK and describe (h1 clear of header, cards, form legibility, errors visible, contrast ≥ 4.5:1, no gold text on white).

Form markup (prototype and app identical apart from attributes React needs):

```html
<form class="contact-form" id="message" action="…" aria-labelledby="messageTitle" data-send-mode="…" data-offline-message="…" data-phone="…">
  <input type="hidden" name="site" value="hub" />
  <input type="hidden" name="t" id="hcT" />
  <h2 id="messageTitle">Send us a message</h2>
  <fieldset class="contact-about" id="hcAbout" aria-describedby="hcAboutErr">
    <legend>Which business is this about?</legend>
    <label><input type="radio" name="about" value="logistics" required /> Genix Logistics</label>
    <label><input type="radio" name="about" value="homeupgrades" /> Genix Home Upgrades</label>
    <label><input type="radio" name="about" value="multimedia" /> Genix Multimedia</label>
    <label><input type="radio" name="about" value="unsure" /> Not sure, or more than one</label>
    <p class="err" id="hcAboutErr"></p>
  </fieldset>
  <div class="field"><label for="hcName">Name</label><input id="hcName" name="name" autocomplete="name" maxlength="120" required aria-describedby="hcNameErr" /><p class="err" id="hcNameErr"></p></div>
  <div class="field-row">
    <div class="field"><label for="hcEmail">Email</label><input id="hcEmail" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="hcEmailErr" /><p class="err" id="hcEmailErr"></p></div>
    <div class="field"><label for="hcPhone">Phone <span class="hint">(optional)</span></label><input id="hcPhone" name="phone" type="tel" autocomplete="tel" maxlength="40" aria-describedby="hcPhoneErr" /><p class="err" id="hcPhoneErr"></p></div>
  </div>
  <div class="field"><label for="hcMessage">Message</label><textarea id="hcMessage" name="message" rows="6" minlength="10" maxlength="2000" required aria-describedby="hcMessageHint hcMessageErr"></textarea><p class="hint" id="hcMessageHint">What you need, and any dates or places that matter.</p><p class="err" id="hcMessageErr"></p></div>
  <div class="hp" aria-hidden="true"><label for="hcHp">Leave this empty</label><input id="hcHp" name="company_site" tabindex="-1" autocomplete="off" /></div>
  <p class="privacy">We use your details only to reply to this message. Read our <a href="https://thegenixgroup.com/privacy">privacy policy</a>.</p>
  <button type="submit" class="contact-send" id="hcSend">Send message <span aria-hidden="true">↗</span></button>
  <p class="sr-only" id="hcStatus" role="status" tabindex="-1"></p>
  <div class="sent" id="hcSent" tabindex="-1" hidden>
    <p class="sent-ref" id="hcRef">Message received</p>
    <p class="sent-title">Message received.</p>
    <p>We'll reply by email within two business days.</p>
  </div>
</form>
```

- [ ] **Step 5: Implement the app.**

`web/src/components/forms/HubMessageForm.tsx` (server component, no `'use client'`): renders the form markup above in JSX — `action={submitQuoteForm}`, `data-send-mode={inquirySendMode(process.env)}`, `data-offline-message={offlineMessage(data.phone)}`, `data-phone={data.phone ?? ''}`, privacy href `${siteOrigin('hub')}/privacy`, radios generated from `ABOUT` with `defaultChecked={about === value}` and `required` on the first one only. (Task 3 adds `<HubContactForm />` after the form.)

`web/src/pages-home/hub/Contact.tsx`:

```tsx
import { HubMessageForm } from '@/components/forms/HubMessageForm'
import type { About } from '@/inquiries/forms/hub'
import { siteOrigin } from '@/sites/config'
import { formatAddress, type SiteData } from '@/sites/data-shape'
import { Arrow } from './Arrow'

/** The three <h2>s, in page order; the page and its tests share this list. */
export const CONTACT_HEADINGS = ['Go straight to a business', 'Send us a message', 'Find us'] as const

/* Hub Contact page (design/hub-contact.html). No motion. The cards reuse the home Route section's copy. */
export function HubContact({ data, about }: { data: SiteData; about: About | null }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  const cards = [
    { href: `${siteOrigin('logistics')}/contact`, c: 'var(--gold-text)', dark: 'var(--gold)', verb: 'Move', title: 'Ship something', body: 'Freight, haulage, last-mile delivery and courier.', go: 'Get a freight quote' },
    { href: `${siteOrigin('homeupgrades')}/contact`, c: 'var(--make)', dark: 'var(--make-light)', verb: 'Make', title: 'Upgrade a space', body: 'Accent walls, TV units, outdoor builds and handyman jobs.', go: 'Plan an upgrade' },
    { href: '/contact?about=multimedia#message', c: 'var(--tell)', dark: 'var(--tell-light)', verb: 'Tell', title: 'Tell your story', body: 'Photography, videography, branding and design.', go: 'Send us a message' },
  ]
  return (
    <main id="main">
      <section className="contact-hero" id="contact-top">
        <div className="wrap">
          <p className="label">Contact</p>
          <h1>Talk to the group.</h1>
          <p className="body">Tell us what you need and we&apos;ll put the right team on it. Ready for a price? Go straight to the business.</p>
        </div>
      </section>
      <section className="contact-routes" id="contact-routes">
        <div className="wrap">
          <h2>{CONTACT_HEADINGS[0]}</h2>
          <div className="options">
            {cards.map((k) => (
              <a key={k.verb} className="option" href={k.href} style={{ '--c': k.c, '--c-dark': k.dark } as React.CSSProperties}>
                <span className="verb">{k.verb}</span>
                <b>{k.title}</b>
                <p>{k.body}</p>
                <span className="go">{k.go}<Arrow /></span>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section className="contact-message" id="contact-message">
        <div className="wrap contact-grid">
          <HubMessageForm data={data} about={about} />
          <div className="contact-details">
            <h2>{CONTACT_HEADINGS[2]}</h2>
            <ul className="facts">
              <li><span>Head office</span><span>San Diego, CA</span></li>
              <li><span>Email</span><span><a href={`mailto:${email}`}>{email}</a></span></li>
              {data.address && <li><span>Address</span><span>{formatAddress(data.address)}</span></li>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
```

(The form's own `<h2 id="messageTitle">` is `CONTACT_HEADINGS[1]`; import the constant in `HubMessageForm` for its title.)

`contact/page.tsx`: add `searchParams: Promise<{ about?: string | string[] }>` to `Props`; add `hub: 'Contact The Genix Group: send a message, or go straight to Genix Logistics, Home Upgrades or Multimedia.'` to `DESCRIPTIONS`; `generateMetadata` and the page accept `'hub'` too; the page for `hub` reads `const raw = (await searchParams).about`, `const about = isAbout(raw) ? raw : null` (an array or anything else → `null`), and returns `<HubContact data={await getSiteData('hub')} about={about} />`. `multimedia`/unknown → `notFound()`; the division branches are unchanged.

`quote/sent/page.tsx`: allow `site === 'hub'`; for the hub return:

```tsx
<main id="main" className="contact-sent">
  <div className="wrap">
    <p className="label">{ok ? ref : 'Message'}</p>
    <h1>{ok ? 'Message received.' : "Couldn't send."}</h1>
    <p className="body">{message}</p>
    <a className="contact-send" href="/contact">Back to the form</a>
  </div>
</main>
```

with `message` for the hub `ok` case "We'll reply by email within two business days." and the same error branches as the divisions (offline/rate/invalid/server messages). Divisions render exactly as before.

`config.ts`: `SITES.hub.pages: ['/', '/privacy', '/about', '/contact']`.

- [ ] **Step 6: Run** — `npx tsc --noEmit`; `npx vitest run`; then `npx playwright test tests/e2e/hub-contact.e2e.spec.ts tests/e2e/contact.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/quote-submit.e2e.spec.ts tests/e2e/hu-quote.e2e.spec.ts tests/e2e/seo.e2e.spec.ts tests/e2e/hub-home.e2e.spec.ts --reporter=line` → pass (one flaky parity phone / hu-quote re-run alone allowed). Fix real axe contrast issues in the prototype CSS. Screenshot the app at 1280/390 and compare with the prototype.

- [ ] **Step 7: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(contact): hub Contact page with route cards and a message form (no-JS path)"
```

---

### Task 3: The form's JavaScript (inline validation, in-place thank-you)

**Files:**
- Create: `web/src/components/motion/HubContactForm.tsx`
- Modify: `web/src/components/forms/HubMessageForm.tsx` (render `<HubContactForm />` after the `</form>`), `design/hub-contact.html` (a small inline demo script), `web/tests/e2e/hub-contact.e2e.spec.ts`

**Interfaces:**
- Consumes: `parseHubMessage`, `HUB_MESSAGES` (`@/inquiries/forms/hub`); `submitQuote` (`@/inquiries/actions`); `rateLimitedMessage`, `serverErrorMessage` (`@/inquiries/messages`); `useEnhance` (`@/components/motion/useEnhance`); the ids from Task 2's form contract.
- Produces: `HubContactForm(): null` (client component).

- [ ] **Step 1: Write the failing e2e** (append to `hub-contact.e2e.spec.ts`):

```ts
test('JS: a complete message gets a GX-HUB reference in place', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await page.waitForTimeout(2200) // past the 2 s "too fast" guard
  await page.check('input[name="about"][value="logistics"]')
  await page.fill('#hcName', 'E2E Hub JS')
  await page.fill('#hcEmail', 'e2e@test.local')
  await page.fill('#hcMessage', 'Two pallets to Phoenix next month, please.')
  await page.click('#hcSend')
  await expect(page.locator('#hcSent')).toBeVisible()
  await expect(page.locator('#hcRef')).toHaveText(/^GX-HUB-\d{6}$/)
  await expect(page.locator('#hcSent')).toContainText('within two business days')
  await expect(page.locator('#hcName')).toBeHidden()
})

test('JS: inline errors match the server and focus the first problem', async ({ page }) => {
  await page.goto(`${HUB}/contact`)
  await page.fill('#hcPhone', '555-0100')
  await page.fill('#hcMessage', 'short')
  await page.click('#hcSend')
  await expect(page.locator('#hcAboutErr')).toHaveText('Choose which business this is about.')
  await expect(page.locator('#hcNameErr')).toHaveText('Enter your name.')
  await expect(page.locator('#hcEmailErr')).toHaveText('Enter your email so we can reply.')
  await expect(page.locator('#hcPhoneErr')).toHaveText('Enter a phone number with area code.')
  await expect(page.locator('#hcMessageErr')).toHaveText('Tell us a little more (at least 10 characters).')
  await expect(page.locator('input[name="about"]').first()).toBeFocused()
  await page.fill('#hcName', 'Ana')
  await expect(page.locator('#hcNameErr')).toHaveText('') // typing clears that field's error
  await expect(page.locator('#hcSent')).toBeHidden()
})
```

Run → FAIL (no enhancer: native validation blocks or the page navigates).

- [ ] **Step 2: Implement** `web/src/components/motion/HubContactForm.tsx`:

```tsx
'use client'
import { useEnhance } from './useEnhance'
import { submitQuote } from '@/inquiries/actions'
import { parseHubMessage } from '@/inquiries/forms/hub'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'

const SEND_TIMEOUT_MS = 15_000
const ORDER = ['about', 'name', 'email', 'phone', 'message'] as const
const FIELD_ID: Record<(typeof ORDER)[number], string> = { about: 'hcAbout', name: 'hcName', email: 'hcEmail', phone: 'hcPhone', message: 'hcMessage' }

/** Hub Contact form (design/hub-contact.html): validates with the same parser as the server, sends through
    submitQuote and shows the reference in place. Offline mode shows the call/email message and posts nothing. */
export function HubContactForm() {
  useEnhance((signal) => {
    const form = document.getElementById('message') as HTMLFormElement | null
    if (!form) return
    const $ = (id: string) => document.getElementById(id) as HTMLElement
    const status = $('hcStatus')
    const focusTarget = (k: (typeof ORDER)[number]) => (k === 'about' ? form.querySelector<HTMLInputElement>('input[name="about"]')! : $(FIELD_ID[k]))

    function setErr(k: (typeof ORDER)[number], msg: string) {
      $(FIELD_ID[k] + 'Err').textContent = msg
      const el = $(FIELD_ID[k])
      if (msg) el.setAttribute('aria-invalid', 'true')
      else el.removeAttribute('aria-invalid')
      ;(k === 'about' ? el : el.closest('.field'))!.classList.toggle('invalid', !!msg)
    }
    function showStatus(msg: string) {
      status.classList.remove('sr-only')
      status.textContent = msg
      status.focus()
    }
    function raw() {
      const fd = new FormData(form!)
      return Object.fromEntries(ORDER.map((k) => [k, fd.get(k) ?? '']))
    }
    function show(errors: Record<string, string>) {
      ORDER.forEach((k) => setErr(k, errors[k] ?? ''))
      const first = ORDER.find((k) => errors[k])
      if (first) focusTarget(first).focus()
      status.classList.add('sr-only')
      status.textContent = first ? `${ORDER.filter((k) => errors[k]).length} field(s) need attention.` : ''
    }

    form.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement
      const k = t.name === 'about' ? 'about' : ORDER.find((o) => FIELD_ID[o] === t.id)
      if (k) setErr(k, '')
    }, { signal })

    form.addEventListener('submit', (e) => {
      e.preventDefault(); e.stopImmediatePropagation() // only this path posts
      const parsed = parseHubMessage(raw())
      if (!parsed.ok) { show(parsed.errors); return }
      show({})
      if (($('hcHp') as HTMLInputElement).value) return
      if (form.dataset.sendMode === 'offline') { showStatus(form.dataset.offlineMessage ?? ''); return }
      const send = $('hcSend') as HTMLButtonElement
      send.disabled = true
      const fd = new FormData(form)
      fd.set('js', '1')
      const phone = form.dataset.phone || null
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), SEND_TIMEOUT_MS) })
      Promise.race([submitQuote(null, fd), timeout])
        .then((r) => {
          if (r.ok) {
            for (const el of form.querySelectorAll<HTMLElement>(':scope > :not(#hcSent):not(#hcStatus):not(input[type="hidden"])')) el.hidden = true
            $('hcRef').textContent = r.reference
            $('hcSent').hidden = false
            $('hcSent').focus()
            return
          }
          if (r.fieldErrors) { show(r.fieldErrors); return }
          showStatus(r.error === 'rate' ? rateLimitedMessage(phone) : serverErrorMessage(phone))
        })
        .catch(() => showStatus(serverErrorMessage(phone)))
        .finally(() => { clearTimeout(timer); send.disabled = false })
    }, { signal })

    form.noValidate = true // JS mode uses the inline messages; no-JS keeps native validation
    ;($('hcT') as HTMLInputElement).value = String(Date.now()) // the server's "too fast" guard
    return () => {
      form.noValidate = false
      ;($('hcT') as HTMLInputElement).value = ''
      status.classList.add('sr-only')
      status.textContent = ''
    }
  })
  return null
}
```

Read `web/src/components/motion/useEnhance.ts` first and match its callback contract (signal argument, optional cleanup return). Render `<HubContactForm />` right after `</form>` in `HubMessageForm.tsx`.

Prototype: add to `design/hub-contact.html` a short inline script (after the menu script) that, on submit, prevents default, checks the same five rules with the same messages, shows them in the `.err` paragraphs, and on success hides the fields and shows `#hcSent` with `#hcRef` = `GX-HUB-000123` (a static demo; no network). It must not run on page load beyond setting `form.noValidate = true`, so parity screenshots are unaffected.

- [ ] **Step 3: Run** — `npx tsc --noEmit`; `npx playwright test tests/e2e/hub-contact.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/parity.e2e.spec.ts --reporter=line` → pass.

- [ ] **Step 4: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(contact): hub message form validates inline and confirms in place"
```

---

### Task 4: Links, docs, full verification

**Files:**
- Modify: `web/src/sites/config.ts` (hub nav + cta), `web/src/components/site/hub/HubFooter.tsx`, `web/src/pages-home/hub/sections/Route.tsx` (route-alt line), `web/src/pages-home/hub/About.tsx` (`.about-cta` href), `design/hub-home.html`, `design/hub-about.html`, `design/hub-contact.html`, `web/tests/e2e/about.e2e.spec.ts` (CTA href), `web/README.md`
- Create: `web/tests/e2e/hub-contact-links.e2e.spec.ts`

**Interfaces:** Consumes the `/contact` page. Produces links only.

- [ ] **Step 1: Write the failing test** — `web/tests/e2e/hub-contact-links.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const HUB = 'http://localhost:3000'

test('header button, nav, footer and the home "not sure?" line reach /contact', async ({ page }) => {
  await page.goto(`${HUB}/`)
  await expect(page.locator('nav#nav a', { hasText: /^Contact$/ })).toHaveAttribute('href', '/contact')
  await expect(page.locator('nav#nav a', { hasText: /^Get a quote$/ })).toHaveCount(0)
  await expect(page.locator('a.header-cta')).toHaveAttribute('href', '/contact')
  await expect(page.locator('footer a', { hasText: /^Get a quote$/ })).toHaveAttribute('href', '/contact')
  const alt = page.locator('#contact .route-alt a[href="/contact"]')
  await expect(alt).toHaveCount(1)
  await expect(page.locator('#contact .route-alt a[href^="mailto:"]')).toHaveCount(1) // the email link stays
  await page.locator('a.header-cta').click()
  await expect(page).toHaveURL(`${HUB}/contact`)
  await expect(page.locator('h1')).toHaveText('Talk to the group.')
})

test('the home "What do you need?" cards are unchanged', async ({ page }) => {
  await page.goto(`${HUB}/`)
  await expect(page.locator('#contact .option')).toHaveCount(3)
})

test("About's Start a conversation goes to the Contact page", async ({ page }) => {
  await page.goto(`${HUB}/about`)
  await expect(page.locator('.about-cta')).toHaveAttribute('href', '/contact')
})
```

Run → FAIL.

- [ ] **Step 2: Implement.**
  - `config.ts` hub: nav item `{ label: 'Get a quote', href: '/#contact' }` → `{ label: 'Contact', href: '/contact' }`; `cta: { label: 'Start a conversation', href: '/contact' }`.
  - `HubFooter.tsx`: `<li><a href="/#contact">Get a quote</a></li>` → `href="/contact"`.
  - `Route.tsx` route-alt: `Need more than one, or not sure? <a href="/contact">Send us a message</a> or email <a href={`mailto:${email}`}>{email}</a> and we&apos;ll bring the right teams together.`
  - `About.tsx`: `.about-cta` href `/#contact` → `/contact`; update `about.e2e.spec.ts`'s CTA expectation to `/contact`.
  - Prototypes: in `hub-home.html`, `hub-about.html` and `hub-contact.html` change the nav "Get a quote" link to `<a href="hub-contact.html">Contact</a>`, the header CTA, the hidden `nav-contact` link and the footer "Get a quote" to `hub-contact.html`; in `hub-home.html` the route-alt line as above (`hub-contact.html`); in `hub-about.html` the `.about-cta` to `hub-contact.html`.
  - Grep `tests/` for `/#contact`, `Get a quote` on the hub and update expectations that encode the old hub hrefs; list each change in the report.
  - `web/README.md`: add "### Hub Contact form" — "`thegenixgroup.com/contact` takes a short message through the same pipeline as the quote forms. Its definition is `web/src/inquiries/forms/hub.ts` (fields, messages, email rows); inquiries are saved with division `hub`, type `contact` and a `GX-HUB-` reference. Any new page that hosts a form must be added to `BOTID_PROTECT` in `web/src/inquiries/bot-check.ts`."

- [ ] **Step 3: Run neighbours** — `npx playwright test tests/e2e/hub-contact-links.e2e.spec.ts tests/e2e/about.e2e.spec.ts tests/e2e/about-links.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/hub-home.e2e.spec.ts tests/e2e/chrome.e2e.spec.ts tests/e2e/parity.e2e.spec.ts --reporter=line` → pass. Check the hub header at 961, 1024, 1280 and the 390 px menu (prototype and app): no wrap/overflow.

- [ ] **Step 4: Full verification.** `npx tsc --noEmit`; `npx vitest run`; then (not concurrently) the whole Playwright suite in the background writing to a scratchpad file (`(npx playwright test --reporter=line > <file> 2>&1; echo "exit $?" >> <file>)` with run_in_background), checking the file with short reads. One re-run alone for a known-flaky spec. Report counts and failure names; fix only failures this branch caused, with a test.

- [ ] **Step 5: Commit**

```bash
git add ../design web/src web/tests web/README.md
git commit -m "feat(contact): hub header, nav, footer and home link to the Contact page"
```

---

## Self-review notes

- **Spec coverage:** form fields/validation/spam/privacy (T1 parse, T2 markup, T3 JS); pipeline type, GX-HUB, emails by type, customer email rule, sent page hub branch, admin unchanged (T1–T2); page sections, `?about` preselect, address rule, metadata, sitemap, no motion (T2); links incl. nav label change (T4); prototype + parity (T2–T4); README (T4); regression on quote forms (T1 tests + T2/T4 runs).
- **Review Focus → tests:** 1 → T1 "quote emails keep their wording" + `inquiryType` asserts + existing specs; 2 → T1 parse tests + T2 no-JS; 3 → T2 `?about` junk test; 4 → T1 customer email test; 5 → T2 sent-page branches.
- **Names across tasks:** `inquiryType`, `ABOUT`, `isAbout`, `About`, `HubMessage`, `HUB_MESSAGES`, `parseHubMessage`, `hubForm`, `kind`, `Arrow`, `HubMessageForm`, `HubContact`, `CONTACT_HEADINGS`, `HubContactForm`, ids `message`/`hc*`, classes `.contact-hero/.contact-routes/.contact-message/.contact-grid/.contact-form/.contact-about/.contact-details/.contact-send/.contact-sent`.
- **BotID:** `/contact` is already in `BOTID_PROTECT` (hotfix 97e78df); path matching is by pathname, so the hub form is covered.
