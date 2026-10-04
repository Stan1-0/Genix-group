# Home Upgrades Quote Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-step, tap-to-pick quote form with optional Cloudinary photo uploads and inspiration links to the Home Upgrades home page, sending through the existing enquiry pipeline.

**Architecture:** The pipeline (`web/src/inquiries/`) becomes per-division: each site that takes quotes has a form definition (parse, summary, email rows, stored details). Logistics moves onto that interface unchanged; Home Upgrades gets its own. Photos upload straight from the browser to Cloudinary under a signature granted by a new `/uploads` route; only photo ids travel with the form and are verified server-side. The form is designed in the static prototype first, then ported and parity-tested.

**Tech Stack:** Next.js 16.3.6 (App Router, `proxy.ts` host routing), Payload 3.90.2 + Postgres, zod, resend, botid, cloudinary (Node SDK v2, new), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-homeupgrades-quote-form-design.md` (builds on `2026-09-30-enquiry-pipeline-design.md`).

## Global Constraints

- All app code lives in `web/`; run every command from `web/`. Prototype files live in the repo-root `design/`.
- This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` before using route handlers, Server Actions, `after`, `headers`. `proxy.ts` rewrites every path to `/<site>/…` (e.g. `homeupgrades.localhost:3000/uploads` → `/homeupgrades/uploads`).
- Logistics behaviour must not change: every existing unit/int/e2e test stays green (adjust only call signatures where Task 1 changes them).
- Visitor-facing strings are exact:
  - "Choose what we're building." · "Choose home or business." · "Choose when you'd like to start." · "Enter a 5-digit ZIP code." · "Tell us a little about the space." · "Enter your name." · "Add a phone number or an email so we can reply." · "Enter a phone number with area code." · "Enter an email like name@company.com."
  - Project labels: "Accent wall & TV unit" (`accent`) · "Outdoor build" (`outdoor`) · "Something else" (`other`). Property: "Home" · "Business". Timing: "As soon as possible" (`asap`) · "In 1–3 months" (`soon`) · "Just planning" (`planning`). Budget: "Under $5k" (`under5`) · "$5–15k" (`5to15`) · "$15k+" (`over15`) · "Not sure" (`unsure`). Call time: "Morning" · "Afternoon" · "Evening".
  - Confirmation: "Request received." / "We'll get back to you within two business days to arrange a visit." / "Forgot a photo? Just reply to our confirmation email with it."
  - Privacy line: "We use your details and photos only to reply to this request."
  - Photo hint: "Add up to 5 photos of your space or ideas you like." Links label: "Pinterest, Instagram or website links (optional)". Notes hint: "Room, size, what you have in mind."
- Reference prefix `HUP` (`GX-HUP-000001`). Team subject `[Home Upgrades] Quote · <project label> · <zip> · <reference>`.
- Photos: ≤ 5 per request; JPEG, PNG, WebP, HEIC, HEIF; ≤ 10 MB each (10_485_760 bytes); Cloudinary `type: 'authenticated'`; public id `genix-inquiries/<24 chars [A-Za-z0-9_-]>`; email full-size links expire after 30 days; upload grants rate-limited to 10 per ipHash per 10 minutes.
- Photos are disabled (no photo block rendered, `/uploads` → 404) unless `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are all set. The API secret never reaches the browser.
- The customer email never contains free text, links or photos.
- Never put real secrets in code, tests or chat. Test credentials only. `web/.env` is never committed.
- Don't commit dev-server rewrites of `next-env.d.ts`; DO commit `payload-types.ts` / `importMap.js` / generated CSS when this plan regenerates them. Never hand-edit `*.generated.css` (`npm run port:css` regenerates from the prototype).
- Run Playwright with `--reporter=line`; never run Playwright and Vitest at the same time. Never run `npm run build` while the dev server runs; never kill node processes.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec) — Task 10 folds these into the spec

1. **Thumbnails vs full size:** thumbnail URLs (email + admin) are Cloudinary *signed* delivery URLs for the authenticated asset (unguessable, non-expiring, 240×240 JPG). Full-size links are `private_download_url` links that expire (email: 30 days; admin: 1 hour, generated per view). Reason: Cloudinary's free plan can't time-limit delivery URLs, only download URLs.
2. **Public ids carry the folder:** the signed upload sets `public_id: 'genix-inquiries/<random>'` and no `folder` param (accounts with dynamic folders don't prefix ids from `folder`).
3. **Size is enforced twice:** the browser rejects > 10 MB before asking for a grant; on submit the server reads each photo's real `bytes` and `format` from the Admin API and drops (and deletes) anything over the limit or of the wrong format.
4. **Photo verification failure never fails the request:** if Cloudinary is unreachable on submit, photo ids are dropped (logged) and the enquiry is still saved.

## Review Focus

1. **Removing a photo before sending** — the removed photo must not be attached (its hidden input is gone); it becomes an orphan the cron deletes. → Task 8 e2e.
2. **An upload fails or Cloudinary is down** — the visitor sees "That photo didn't upload. Try again, or send without it." and can still send; no tile stays stuck "uploading". → Task 8 e2e.
3. **Pressing Send while a photo is still uploading** — Send waits for in-flight uploads (button shows "Uploading photos…") then sends; never sends a half-done id. → Task 8 e2e.
4. **Too many / wrong / huge files picked** — a 6th photo, a PDF, or a 12 MB image is refused in the browser with a clear message and no grant request. → Task 8 e2e (+ server-side in Tasks 3/6).
5. **The same photo id submitted twice, or a tampered id** — duplicates collapse to one; ids outside `genix-inquiries/` or unknown to the account are dropped; the enquiry still saves. → Task 4 int.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/inquiries/forms/types.ts` | `FormDef<T>` interface + `Row` type |
| `src/inquiries/forms/logistics.ts` | Logistics definition (wraps existing `schema.ts` / `format.ts`) |
| `src/inquiries/forms/homeupgrades.ts` | Home Upgrades definition (new parse, labels, rows) |
| `src/inquiries/forms/index.ts` | `FORM_SITES`, `formFor(site)` |
| `src/inquiries/photos.ts` | Cloudinary: settings, signing, id check, verify, URLs, cleanup; injectable client |
| `src/inquiries/email.ts` | generic `teamEmail` / `customerEmail` (rows + optional links/photos) |
| `src/inquiries/pipeline.ts` | `processQuote` uses `formFor(site)`; photos via injected `verifyPhotos` |
| `src/inquiries/deliver.ts` | rebuilds rows via `formFor`; photo URLs in team mail; orphan cleanup in sweep |
| `src/inquiries/actions.ts` | `FORM_SITES` from forms; passes photo verifier |
| `src/app/(sites)/[site]/uploads/route.ts` | upload grant (homeupgrades only) |
| `src/app/(sites)/[site]/quote/sent/page.tsx` | accept homeupgrades (its own copy) |
| `src/collections/Inquiries.ts` | `photos` field, afterDelete hook, `PhotoStrip` ui field |
| `src/inquiries/admin/PhotoStrip.tsx` | admin thumbnails |
| `design/homeupgrades-home.html`, `design/js/hu-quote-form.js` | prototype form (markup, CSS, behaviour with local-only photo previews) |
| `src/pages-home/homeupgrades/sections/Quote.tsx` | ported markup |
| `src/components/motion/HuQuoteForm.tsx` | enhancer: steps, validation, call-time reveal, uploads, submit |

---

### Task 1: Per-division form definitions (Logistics moved, behaviour unchanged)

**Files:**
- Create: `web/src/inquiries/forms/types.ts`, `web/src/inquiries/forms/logistics.ts`, `web/src/inquiries/forms/index.ts`
- Modify: `web/src/inquiries/email.ts`, `web/src/inquiries/pipeline.ts`, `web/src/inquiries/deliver.ts`, `web/src/inquiries/actions.ts`
- Test: `web/tests/unit/inquiry-forms.test.ts` (new); update call sites in `web/tests/unit/inquiry-format.test.ts`

**Interfaces:**
- Produces:
  - `type Row = [label: string, value: string]`
  - `type Contact = { name: string; phone: string | null; email: string | null; notes: string | null }`
  - `type Parsed<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> }`
  - `interface FormDef<T> { site: SiteKey; fields: readonly string[]; parse(raw: Record<string, unknown>, today: string): Parsed<T>; contact(d: T): Contact; details(d: T): Record<string, unknown>; fromStored(details: Record<string, unknown>, c: Contact): T; summary(d: T): string; subjectDetails(d: T): string; answers(d: T): Row[]; customerRows(d: T): Row[] }`
  - `FORM_SITES: readonly SiteKey[]` (`['logistics']` after this task; Task 4 adds homeupgrades), `formFor(site: SiteKey): FormDef<unknown>` (throws for a site without a form)
  - `formDataToRawFor(def, fd: FormData): Record<string, unknown>`
  - `teamEmail({ site, reference, rows, subjectDetails, phone, adminUrl, links?, photos? })`, `customerEmail({ site, reference, name, rows, phone, extraLine? })` — both → `EmailContent`
  - `QuoteResult` fieldErrors type widens to `Record<string, string>`.

- [ ] **Step 1: Write the failing test** — `web/tests/unit/inquiry-forms.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { FORM_SITES, formFor } from '@/inquiries/forms'

const raw = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: '', load: 'pallets', pallets: '2', name: 'Ana', phone: '(619) 555-0100', email: 'ana@example.com', notes: 'Dock at back' }

describe('form definitions', () => {
  it('lists the sites that take quotes', () => {
    expect(FORM_SITES).toContain('logistics')
    expect(() => formFor('hub')).toThrow()
  })
  it('logistics: parse → stored details → back gives the same rows', () => {
    const def = formFor('logistics')
    const r = def.parse(raw, '2026-10-01')
    if (!r.ok) throw new Error('expected ok')
    const back = def.fromStored(def.details(r.data), def.contact(r.data))
    expect(def.answers(back)).toEqual(def.answers(r.data))
    expect(def.summary(r.data)).toBe('92101 → 92024 · 2 pallets')
    expect(def.subjectDetails(r.data)).toBe('92101 → 92024 · 2 pallets')
  })
  it('logistics: customer rows never include contact details or notes', () => {
    const def = formFor('logistics')
    const r = def.parse(raw, '2026-10-01')
    if (!r.ok) throw new Error('expected ok')
    const labels = def.customerRows(r.data).map(([k]) => k)
    expect(labels).not.toContain('Notes')
    expect(labels).not.toContain('Phone')
    expect(labels).not.toContain('Email')
    expect(labels).not.toContain('Name')
  })
})
```

- [ ] **Step 2: Run it** — `npx vitest run tests/unit/inquiry-forms.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

`web/src/inquiries/forms/types.ts`

```ts
import type { SiteKey } from '@/sites/config'

export type Row = [label: string, value: string]
export type Contact = { name: string; phone: string | null; email: string | null; notes: string | null }
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> }

/** One division's quote form: how to read it, store it and show it in emails and the admin. */
export interface FormDef<T> {
  site: SiteKey
  fields: readonly string[]
  parse(raw: Record<string, unknown>, today: string): Parsed<T>
  contact(d: T): Contact
  details(d: T): Record<string, unknown>
  fromStored(details: Record<string, unknown>, c: Contact): T
  summary(d: T): string
  subjectDetails(d: T): string
  /** Every answer, for the team email and the admin (contact rows included). */
  answers(d: T): Row[]
  /** Structured choices only: never free text, links, photos or contact details. */
  customerRows(d: T): Row[]
}
```

`web/src/inquiries/forms/logistics.ts`

```ts
import { loadLabel, quoteSummary } from '../format'
import { parseQuote, type QuoteInput } from '../schema'
import type { Contact, FormDef, Row } from './types'

const answers = (q: QuoteInput): Row[] => [
  ['Type', q.kind === 'move' ? 'Move' : 'Business shipment'],
  ['From', q.from],
  ['To', q.to],
  ['Date', q.flexible ? 'Flexible' : (q.date ?? '')],
  ["What's moving", loadLabel(q.load)],
  ...(q.pallets ? ([['Pallets', String(q.pallets)]] as Row[]) : []),
  ['Name', q.name],
  ...(q.phone ? ([['Phone', q.phone]] as Row[]) : []),
  ...(q.email ? ([['Email', q.email]] as Row[]) : []),
  ...(q.notes ? ([['Notes', q.notes]] as Row[]) : []),
]

export const logisticsForm: FormDef<QuoteInput> = {
  site: 'logistics',
  fields: ['kind', 'from', 'to', 'date', 'flexible', 'load', 'pallets', 'name', 'phone', 'email', 'notes'],
  parse: (raw, today) => parseQuote(raw, today) as ReturnType<FormDef<QuoteInput>['parse']>,
  contact: (q) => ({ name: q.name, phone: q.phone, email: q.email, notes: q.notes }),
  details: (q) => ({ kind: q.kind, from: q.from, to: q.to, date: q.date, flexible: q.flexible, load: q.load, pallets: q.pallets }),
  fromStored: (d, c: Contact) => ({
    kind: d.kind === 'move' ? 'move' : 'business', from: String(d.from ?? ''), to: String(d.to ?? ''),
    date: (d.date as string | null) ?? null, flexible: Boolean(d.flexible), load: String(d.load ?? ''),
    pallets: (d.pallets as number | null) ?? null, ...c,
  }),
  summary: quoteSummary,
  subjectDetails: quoteSummary,
  answers,
  customerRows: (q) => answers(q).filter(([k]) => !['Name', 'Phone', 'Email', 'Notes'].includes(k)),
}
```

`web/src/inquiries/forms/index.ts`

```ts
import type { SiteKey } from '@/sites/config'
import { logisticsForm } from './logistics'
import type { FormDef } from './types'

const FORMS: Partial<Record<SiteKey, FormDef<unknown>>> = {
  logistics: logisticsForm as FormDef<unknown>,
}

export const FORM_SITES = Object.keys(FORMS) as SiteKey[]

export function formFor(site: SiteKey): FormDef<unknown> {
  const def = FORMS[site]
  if (!def) throw new Error(`no quote form for ${site}`)
  return def
}

export function formDataToRawFor(def: FormDef<unknown>, fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of def.fields) out[k] = fd.get(k) ?? ''
  return out
}

export type { FormDef, Row, Contact } from './types'
```

`web/src/inquiries/email.ts` — replace `answers`, `teamEmail`, `customerEmail` with generic versions (keep `esc`, `tel`, `table`, `shell`, `EmailContent`):

```ts
import { SITES, type SiteKey } from '@/sites/config'
import type { Row } from './forms/types'

export type EmailContent = { subject: string; html: string; text: string }
export type PhotoLink = { thumb: string; full: string }

// esc, tel, table, shell: unchanged from the current file

export function teamEmail(a: { site: SiteKey; reference: string; rows: Row[]; subjectDetails: string; phone: string | null; adminUrl: string; links?: string[]; photos?: PhotoLink[] }): EmailContent {
  const subject = `[${SITES[a.site].shortName}] Quote · ${a.subjectDetails} · ${a.reference}`
  const links = a.links ?? []
  const photos = a.photos ?? []
  const linksHtml = links.length ? `<p style="margin:20px 0 6px;font-weight:600">Inspiration links</p>${links.map((l) => `<p style="margin:0 0 4px"><a href="${esc(l)}" style="color:#012247">${esc(l)}</a></p>`).join('')}` : ''
  const photosHtml = photos.length ? `<p style="margin:20px 0 8px;font-weight:600">Photos (${photos.length})</p><p style="margin:0">${photos.map((p) => `<a href="${esc(p.full)}"><img src="${esc(p.thumb)}" width="120" height="120" alt="Photo" style="border-radius:8px;margin:0 6px 6px 0"></a>`).join('')}</p><p style="margin:4px 0 0;color:#625d55;font-size:13px">Full-size links expire after 30 days; the admin always has them.</p>` : ''
  const html = shell(`<p style="margin:0 0 16px;font-weight:700">New quote request · ${esc(a.reference)}</p>${table(a.rows, a.phone)}${linksHtml}${photosHtml}<p style="margin:20px 0 0"><a href="${esc(a.adminUrl)}" style="color:#012247">Open in the admin</a></p>`)
  const text = [
    `New quote request · ${a.reference}`, '', ...a.rows.map(([k, v]) => `${k}: ${v}`),
    ...(links.length ? ['', 'Inspiration links:', ...links] : []),
    ...(photos.length ? ['', `Photos (${photos.length}):`, ...photos.map((p) => p.full)] : []),
    '', `Admin: ${a.adminUrl}`,
  ].join('\n')
  return { subject, html, text }
}

export function customerEmail(a: { site: SiteKey; reference: string; name: string; rows: Row[]; phone: string | null; extraLine?: string }): EmailContent {
  const division = SITES[a.site].name
  const greet = a.name.trim().slice(0, 40)
  const promise = "We'll get back to you within two business days."
  const call = a.phone ? `Need us sooner? Call ${a.phone}.` : 'Need us sooner? Reply to this email.'
  const subject = `We got your request · ${a.reference}`
  const extra = a.extraLine ? `<p style="margin:12px 0 0">${esc(a.extraLine)}</p>` : ''
  const html = shell(`<p style="margin:0 0 12px">Thanks, ${esc(greet)}. ${promise}</p><p style="margin:0 0 16px">Your reference: <b>${esc(a.reference)}</b></p>${table(a.rows, null)}${extra}<p style="margin:20px 0 0">${esc(call)}</p><p style="margin:8px 0 0;color:#625d55">${esc(division)} · Part of The Genix Group</p>`)
  const text = [`Thanks, ${greet}. ${promise}`, '', `Your reference: ${a.reference}`, '', ...a.rows.map(([k, v]) => `${k}: ${v}`), ...(a.extraLine ? ['', a.extraLine] : []), '', call, `${division} · Part of The Genix Group`].join('\n')
  return { subject, html, text }
}
```

`web/src/inquiries/pipeline.ts` — replace `parseQuote` / `quoteSummary` use with the form definition (everything else unchanged):

```ts
import { formFor } from './forms'
// …
export type QuoteResult =
  | { ok: true; reference: string; inquiryId: number | string | null }
  | { ok: false; fieldErrors?: Record<string, string>; error?: 'rate' | 'server' }
// inside processQuote:
  const def = formFor(input.site)
  const parsed = def.parse(input.raw, today)
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors }
// … spam + rate limit unchanged …
  const c = def.contact(parsed.data)
  const reference = await nextReference(deps.payload, input.site)
  const doc = await deps.payload.create({
    collection: 'inquiries',
    data: {
      reference, division: input.site, type: 'quote', status: 'new', summary: def.summary(parsed.data),
      name: c.name, phone: c.phone, email: c.email, notes: c.notes,
      details: def.details(parsed.data), ipHash,
    },
  })
```

`web/src/inquiries/deliver.ts` — in `deliverInquiry` replace the `QuoteInput` rebuild and email calls:

```ts
import { formFor } from './forms'
// …
  const def = formFor(site)
  const contact = { name: doc.name, phone: doc.phone ?? null, email: doc.email ?? null, notes: doc.notes ?? null }
  const data = def.fromStored((doc.details ?? {}) as Record<string, unknown>, contact)
// team:
    const e = teamEmail({ site, reference: doc.reference, rows: def.answers(data), subjectDetails: def.subjectDetails(data), phone: contact.phone, adminUrl: `${opts.adminOrigin}/admin/collections/inquiries/${doc.id}` })
    // replyTo: contact.email ?? undefined
// customer (condition uses contact.email):
    const e = customerEmail({ site, reference: doc.reference, name: contact.name, rows: def.customerRows(data), phone: opts.phone })
```

`web/src/inquiries/actions.ts`: `import { FORM_SITES, formDataToRawFor, formFor } from './forms'`; drop the local `FORM_SITES` constant and the `formDataToRaw` import; `raw: formDataToRawFor(formFor(site), formData)`.

Update `web/tests/unit/inquiry-format.test.ts`: its `teamEmail` / `customerEmail` cases now call the new signatures using `logisticsForm` (import from `@/inquiries/forms/logistics`):

```ts
const e = teamEmail({ site: 'logistics', reference: 'GX-LOG-000001', rows: logisticsForm.answers(q), subjectDetails: logisticsForm.subjectDetails(q), phone: q.phone, adminUrl: 'https://thegenixgroup.com/admin/collections/inquiries/7' })
const c = customerEmail({ site: 'logistics', reference: 'GX-LOG-000001', name: q.name, rows: logisticsForm.customerRows(q), phone: '(619) 555-0100' })
```

Keep every existing assertion (subject text, escaping, tel link, notes absent from customer mail, 40-char greeting).

- [ ] **Step 4: Run** — `npx vitest run tests/unit` and `npx vitest run tests/int` → all pass (int tests prove Logistics delivery is unchanged); `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/inquiries tests/unit
git commit -m "refactor(inquiries): per-division form definitions (Logistics unchanged)"
```

---

### Task 2: Home Upgrades form definition

**Files:**
- Create: `web/src/inquiries/forms/homeupgrades.ts`
- Test: `web/tests/unit/inquiry-hu-form.test.ts`

**Interfaces:**
- Consumes: `FormDef`, `Row`, `Contact` (Task 1).
- Produces: `type HuQuote = { project: 'accent' | 'outdoor' | 'other'; property: 'home' | 'business'; timing: 'asap' | 'soon' | 'planning'; budget: 'under5' | '5to15' | 'over15' | 'unsure' | null; zip: string; notes: string; links: string[]; photos: string[]; callTime: 'morning' | 'afternoon' | 'evening' | null; name: string; phone: string | null; email: string | null }`; `homeupgradesForm: FormDef<HuQuote>`; `parseLinks(text: string): string[]`; `HU_LABELS` (label maps). `fields` includes `photos` read as a list (see Step 3); `formDataToRawFor` reads single values, so the HU definition's raw `photos` comes from `fd.getAll('photos')` — Task 4 passes it.

- [ ] **Step 1: Write the failing test** — `web/tests/unit/inquiry-hu-form.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { homeupgradesForm as f, parseLinks } from '@/inquiries/forms/homeupgrades'

const TODAY = '2026-10-04'
const good = { project: 'accent', property: 'home', timing: 'soon', budget: '5to15', zip: '92101', notes: 'Living room wall, about 4 m wide.', links: '', photos: [], callTime: 'evening', name: 'Ana Ruiz', phone: '(619) 555-0100', email: '' }

describe('homeupgrades form', () => {
  it('accepts a complete request', () => {
    const r = f.parse(good, TODAY)
    expect(r.ok && r.data).toMatchObject({ project: 'accent', property: 'home', timing: 'soon', budget: '5to15', zip: '92101', callTime: 'evening', email: null, links: [], photos: [] })
  })
  it('uses the exact messages', () => {
    const r = f.parse({ zip: '921', notes: 'short', name: '', phone: '', email: '' }, TODAY)
    expect(r).toEqual({ ok: false, errors: {
      project: "Choose what we're building.", property: 'Choose home or business.', timing: "Choose when you'd like to start.",
      zip: 'Enter a 5-digit ZIP code.', notes: 'Tell us a little about the space.', name: 'Enter your name.',
      phone: 'Add a phone number or an email so we can reply.',
    } })
  })
  it('budget and call time are optional; call time needs a phone', () => {
    const r = f.parse({ ...good, budget: '', callTime: 'morning', phone: '', email: 'ana@example.com' }, TODAY)
    expect(r.ok && r.data).toMatchObject({ budget: null, callTime: null })
  })
  it('rejects unknown choices', () => {
    const r = f.parse({ ...good, project: 'kitchen', budget: 'lots' }, TODAY)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.errors.project).toBe("Choose what we're building.")
  })
  it('caps notes at 2000 characters', () => {
    const r = f.parse({ ...good, notes: 'x'.repeat(2500) }, TODAY)
    expect(r.ok && r.data.notes.length).toBe(2000)
  })
  it('keeps at most 5 http(s) links and drops the rest', () => {
    expect(parseLinks('https://pin.it/a\nnot a link\njavascript:alert(1)\nhttp://x.co/b, https://c.co/c https://d.co https://e.co https://f.co')).toEqual(['https://pin.it/a', 'http://x.co/b', 'https://c.co/c', 'https://d.co', 'https://e.co'])
  })
  it('rows: summary, subject, answers and customer rows', () => {
    const r = f.parse({ ...good, links: 'https://pin.it/a' }, TODAY)
    if (!r.ok) throw new Error('expected ok')
    expect(f.summary(r.data)).toBe('Accent wall & TV unit · 92101 · Home · In 1–3 months')
    expect(f.subjectDetails(r.data)).toBe('Accent wall & TV unit · 92101')
    expect(f.answers(r.data)).toContainEqual(['Best time to call', 'Evening'])
    expect(f.answers(r.data)).toContainEqual(['About the space', 'Living room wall, about 4 m wide.'])
    const customer = f.customerRows(r.data).map(([k]) => k)
    expect(customer).toEqual(['Project', 'Property', 'When to start', 'Budget', 'ZIP'])
  })
  it('stored details round-trip', () => {
    const r = f.parse(good, TODAY)
    if (!r.ok) throw new Error('expected ok')
    const back = f.fromStored(f.details(r.data), f.contact(r.data))
    expect(back).toEqual(r.data)
  })
})
```

- [ ] **Step 2: Run it** — FAIL (module not found).

- [ ] **Step 3: Implement** — `web/src/inquiries/forms/homeupgrades.ts`

```ts
import { z } from 'zod'
import type { Contact, FormDef, Row } from './types'

export const HU_LABELS = {
  project: { accent: 'Accent wall & TV unit', outdoor: 'Outdoor build', other: 'Something else' },
  property: { home: 'Home', business: 'Business' },
  timing: { asap: 'As soon as possible', soon: 'In 1–3 months', planning: 'Just planning' },
  budget: { under5: 'Under $5k', '5to15': '$5–15k', over15: '$15k+', unsure: 'Not sure' },
  callTime: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
} as const

type Labels = typeof HU_LABELS
export type HuQuote = {
  project: keyof Labels['project']; property: keyof Labels['property']; timing: keyof Labels['timing']
  budget: keyof Labels['budget'] | null; zip: string; notes: string; links: string[]; photos: string[]
  callTime: keyof Labels['callTime'] | null; name: string; phone: string | null; email: string | null
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const pick = <K extends string>(map: Record<K, string>, v: unknown): K | null => (Object.hasOwn(map, str(v)) ? (str(v) as K) : null)
const email = z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)

/** Up to 5 http(s) URLs from free text (split on whitespace or commas); everything else dropped. */
export function parseLinks(text: string): string[] {
  const out: string[] = []
  for (const part of text.slice(0, 1000).split(/[\s,]+/)) {
    if (out.length === 5) break
    if (!/^https?:\/\//i.test(part)) continue
    try { new URL(part) } catch { continue }
    if (!out.includes(part)) out.push(part)
  }
  return out
}

const photoList = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).map(str).filter(Boolean)

const answers = (q: HuQuote): Row[] => [
  ['Project', HU_LABELS.project[q.project]],
  ['Property', HU_LABELS.property[q.property]],
  ['When to start', HU_LABELS.timing[q.timing]],
  ...(q.budget ? ([['Budget', HU_LABELS.budget[q.budget]]] as Row[]) : []),
  ['ZIP', q.zip],
  ['About the space', q.notes],
  ['Name', q.name],
  ...(q.phone ? ([['Phone', q.phone]] as Row[]) : []),
  ...(q.callTime ? ([['Best time to call', HU_LABELS.callTime[q.callTime]]] as Row[]) : []),
  ...(q.email ? ([['Email', q.email]] as Row[]) : []),
]

export const homeupgradesForm: FormDef<HuQuote> = {
  site: 'homeupgrades',
  fields: ['project', 'property', 'timing', 'budget', 'zip', 'notes', 'links', 'callTime', 'name', 'phone', 'email'],
  parse(raw) {
    const errors: Record<string, string> = {}
    const project = pick(HU_LABELS.project, raw.project)
    if (!project) errors.project = "Choose what we're building."
    const property = pick(HU_LABELS.property, raw.property)
    if (!property) errors.property = 'Choose home or business.'
    const timing = pick(HU_LABELS.timing, raw.timing)
    if (!timing) errors.timing = "Choose when you'd like to start."
    const budget = pick(HU_LABELS.budget, raw.budget)
    const zip = str(raw.zip)
    if (!/^\d{5}$/.test(zip)) errors.zip = 'Enter a 5-digit ZIP code.'
    const notes = str(raw.notes)
    if (notes.length < 10) errors.notes = 'Tell us a little about the space.'
    const name = str(raw.name)
    if (!name) errors.name = 'Enter your name.'
    const phone = str(raw.phone) || null
    const mail = str(raw.email) || null
    if (!phone && !mail) errors.phone = 'Add a phone number or an email so we can reply.'
    else if (phone && (phone.length > 40 || phone.replace(/\D/g, '').length < 10)) errors.phone = 'Enter a phone number with area code.'
    if (mail && !email.safeParse(mail).success) errors.email = 'Enter an email like name@company.com.'
    if (Object.keys(errors).length) return { ok: false, errors }
    return {
      ok: true,
      data: {
        project: project!, property: property!, timing: timing!, budget, zip, notes: notes.slice(0, 2000),
        links: parseLinks(str(raw.links)), photos: [...new Set(photoList(raw.photos))],
        callTime: phone ? pick(HU_LABELS.callTime, raw.callTime) : null,
        name: name.slice(0, 120), phone, email: mail,
      },
    }
  },
  contact: (q) => ({ name: q.name, phone: q.phone, email: q.email, notes: q.notes }),
  details: (q) => ({ project: q.project, property: q.property, timing: q.timing, budget: q.budget, zip: q.zip, links: q.links, photos: q.photos, callTime: q.callTime }),
  fromStored: (d, c: Contact) => ({
    project: d.project as HuQuote['project'], property: d.property as HuQuote['property'], timing: d.timing as HuQuote['timing'],
    budget: (d.budget as HuQuote['budget']) ?? null, zip: String(d.zip ?? ''), notes: c.notes ?? '',
    links: Array.isArray(d.links) ? (d.links as string[]) : [], photos: Array.isArray(d.photos) ? (d.photos as string[]) : [],
    callTime: (d.callTime as HuQuote['callTime']) ?? null, name: c.name, phone: c.phone, email: c.email,
  }),
  summary: (q) => `${HU_LABELS.project[q.project]} · ${q.zip} · ${HU_LABELS.property[q.property]} · ${HU_LABELS.timing[q.timing]}`,
  subjectDetails: (q) => `${HU_LABELS.project[q.project]} · ${q.zip}`,
  answers,
  customerRows: (q) => answers(q).filter(([k]) => ['Project', 'Property', 'When to start', 'Budget', 'ZIP'].includes(k)),
}
```

- [ ] **Step 4: Run** — `npx vitest run tests/unit/inquiry-hu-form.test.ts` → PASS; `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/inquiries/forms/homeupgrades.ts tests/unit/inquiry-hu-form.test.ts
git commit -m "feat(inquiries): Home Upgrades form definition"
```

---

### Task 3: Cloudinary photos module

**Files:**
- Create: `web/src/inquiries/photos.ts`
- Modify: `web/package.json` (`npm install cloudinary`), `web/.env.example`
- Test: `web/tests/unit/inquiry-photos.test.ts`

**Interfaces:**
- Produces:
  - `type PhotoSettings = { cloudName: string; apiKey: string; apiSecret: string }`
  - `photoSettings(env): PhotoSettings | null` (null unless all three set)
  - `PHOTO_PREFIX = 'genix-inquiries/'`, `MAX_PHOTOS = 5`, `MAX_PHOTO_BYTES = 10_485_760`, `PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']`, `PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']`
  - `isPhotoId(id: string): boolean` (`^genix-inquiries/[A-Za-z0-9_-]{24}$`)
  - `newPhotoId(): string`
  - `signUpload(s: PhotoSettings, nowSec: number): { uploadUrl: string; fields: Record<string, string>; publicId: string }`
  - `type PhotoClient = { resource(id: string): Promise<{ bytes: number; format: string } | null>; list(prefix: string, cursor?: string): Promise<{ resources: { public_id: string; created_at: string }[]; next_cursor?: string }>; destroy(ids: string[]): Promise<void> }`
  - `cloudinaryClient(s: PhotoSettings): PhotoClient`
  - `verifyPhotos(ids: string[], client: PhotoClient | null): Promise<string[]>` (dedup, pattern, ≤ 5, exists, ≤ 10 MB, allowed format; deletes oversized/wrong-format ones; never throws → `[]` on client error, logged)
  - `thumbUrl(s, id): string`, `fullUrl(s, id, expiresAtSec: number): string`
  - `deleteOrphans(client, referenced: Set<string>, now: Date): Promise<number>` (≥ 24 h old, not referenced)

- [ ] **Step 1: Install and read the SDK** — `npm install cloudinary`. Read `node_modules/cloudinary/types/index.d.ts` for `v2.utils.api_sign_request`, `v2.url` (options `type`, `sign_url`, `secure`, `transformation`, `format`), `v2.utils.private_download_url` (options `type`, `expires_at`), `v2.api.resource`, `v2.api.resources` (`type`, `prefix`, `max_results`, `next_cursor`), `v2.api.delete_resources`. Note any differences in the report and adapt only the bodies below.

- [ ] **Step 2: Write the failing test** — `web/tests/unit/inquiry-photos.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'
import { deleteOrphans, isPhotoId, newPhotoId, photoSettings, signUpload, verifyPhotos, type PhotoClient } from '@/inquiries/photos'

const S = { cloudName: 'demo-cloud', apiKey: '123456', apiSecret: 'test-secret-not-real' }
const id = (c: string) => `genix-inquiries/${c.repeat(24)}`

function fakeClient(over: Partial<PhotoClient> = {}): PhotoClient {
  return { resource: async () => ({ bytes: 1000, format: 'jpg' }), list: async () => ({ resources: [] }), destroy: vi.fn(async () => {}), ...over }
}

describe('photo settings', () => {
  it('needs all three values', () => {
    expect(photoSettings({ CLOUDINARY_CLOUD_NAME: 'a', CLOUDINARY_API_KEY: 'b' })).toBeNull()
    expect(photoSettings({ CLOUDINARY_CLOUD_NAME: 'a', CLOUDINARY_API_KEY: 'b', CLOUDINARY_API_SECRET: 'c' })).toEqual({ cloudName: 'a', apiKey: 'b', apiSecret: 'c' })
  })
})

describe('ids and signing', () => {
  it('generates and recognises our ids only', () => {
    const n = newPhotoId()
    expect(isPhotoId(n)).toBe(true)
    expect(isPhotoId('other/' + 'a'.repeat(24))).toBe(false)
    expect(isPhotoId('genix-inquiries/short')).toBe(false)
    expect(isPhotoId('genix-inquiries/' + 'a'.repeat(24) + '/../x')).toBe(false)
  })
  it('signs an authenticated upload without leaking the secret', () => {
    const g = signUpload(S, 1_791_000_000)
    expect(g.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload')
    expect(g.fields).toMatchObject({ api_key: '123456', timestamp: '1791000000', type: 'authenticated', public_id: g.publicId })
    expect(g.fields.signature).toMatch(/^[0-9a-f]{40}$/)
    expect(JSON.stringify(g)).not.toContain('test-secret-not-real')
    expect(isPhotoId(g.publicId)).toBe(true)
  })
})

describe('verifyPhotos', () => {
  it('dedups, drops foreign/unknown ids and caps at 5', async () => {
    const ids = [id('a'), id('a'), 'evil/' + 'b'.repeat(24), id('c'), id('d'), id('e'), id('f'), id('g')]
    const client = fakeClient({ resource: async (x) => (x === id('c') ? null : { bytes: 1000, format: 'jpg' }) })
    expect(await verifyPhotos(ids, client)).toEqual([id('a'), id('d'), id('e'), id('f'), id('g')])
  })
  it('drops and deletes oversized or wrong-format uploads', async () => {
    const destroy = vi.fn(async () => {})
    const client = fakeClient({ destroy, resource: async (x) => (x === id('a') ? { bytes: 20_000_000, format: 'jpg' } : x === id('b') ? { bytes: 10, format: 'pdf' } : { bytes: 10, format: 'heic' }) })
    expect(await verifyPhotos([id('a'), id('b'), id('c')], client)).toEqual([id('c')])
    expect(destroy).toHaveBeenCalledWith([id('a'), id('b')])
  })
  it('returns [] when photos are off or Cloudinary fails', async () => {
    expect(await verifyPhotos([id('a')], null)).toEqual([])
    expect(await verifyPhotos([id('a')], fakeClient({ resource: async () => { throw new Error('down') } }))).toEqual([])
  })
})

describe('deleteOrphans', () => {
  it('deletes only unreferenced uploads older than 24 h, across pages', async () => {
    const now = new Date('2026-10-05T12:00:00Z')
    const destroy = vi.fn(async () => {})
    const pages = [
      { resources: [{ public_id: id('a'), created_at: '2026-10-03T00:00:00Z' }, { public_id: id('b'), created_at: '2026-10-05T11:00:00Z' }], next_cursor: 'p2' },
      { resources: [{ public_id: id('c'), created_at: '2026-10-01T00:00:00Z' }] },
    ]
    const client = fakeClient({ destroy, list: async (_p, cursor) => (cursor ? pages[1] : pages[0]) })
    expect(await deleteOrphans(client, new Set([id('c')]), now)).toBe(1)
    expect(destroy).toHaveBeenCalledWith([id('a')])
  })
})
```

- [ ] **Step 3: Run it** — FAIL (module not found).

- [ ] **Step 4: Implement** — `web/src/inquiries/photos.ts`

```ts
import { randomBytes } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'

type Env = Record<string, string | undefined>
export type PhotoSettings = { cloudName: string; apiKey: string; apiSecret: string }
export type PhotoClient = {
  resource(id: string): Promise<{ bytes: number; format: string } | null>
  list(prefix: string, cursor?: string): Promise<{ resources: { public_id: string; created_at: string }[]; next_cursor?: string }>
  destroy(ids: string[]): Promise<void>
}

export const PHOTO_PREFIX = 'genix-inquiries/'
export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 10_485_760
export const PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
export const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const DAY_MS = 86_400_000
const ID = /^genix-inquiries\/[A-Za-z0-9_-]{24}$/

export function photoSettings(env: Env): PhotoSettings | null {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null
}

export const isPhotoId = (id: string) => ID.test(id)
export const newPhotoId = () => PHOTO_PREFIX + randomBytes(18).toString('base64url') // 24 chars

/** Signature for one direct browser upload; public id carries the folder (dynamic-folder accounts ignore `folder`). */
export function signUpload(s: PhotoSettings, nowSec: number) {
  const publicId = newPhotoId()
  const params = { public_id: publicId, timestamp: String(nowSec), type: 'authenticated', allowed_formats: PHOTO_FORMATS.join(',') }
  const signature = cloudinary.utils.api_sign_request(params, s.apiSecret)
  return { uploadUrl: `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, publicId, fields: { ...params, api_key: s.apiKey, signature } }
}

export function cloudinaryClient(s: PhotoSettings): PhotoClient {
  const auth = { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret }
  return {
    async resource(id) {
      try {
        const r = await cloudinary.api.resource(id, { ...auth, type: 'authenticated' })
        return { bytes: r.bytes, format: r.format }
      } catch (err) {
        if ((err as { error?: { http_code?: number } }).error?.http_code === 404) return null
        throw err
      }
    },
    async list(prefix, cursor) {
      const r = await cloudinary.api.resources({ ...auth, type: 'authenticated', prefix, max_results: 500, next_cursor: cursor })
      return { resources: r.resources.map((x: { public_id: string; created_at: string }) => ({ public_id: x.public_id, created_at: x.created_at })), next_cursor: r.next_cursor }
    },
    async destroy(ids) {
      if (ids.length) await cloudinary.api.delete_resources(ids, { ...auth, type: 'authenticated' })
    },
  }
}

/** Ids the visitor sent, filtered to real uploads of ours. Never throws: a Cloudinary outage drops the photos. */
export async function verifyPhotos(ids: string[], client: PhotoClient | null): Promise<string[]> {
  if (!client) return []
  const wanted = [...new Set(ids)].filter(isPhotoId)
  try {
    const ok: string[] = []
    const bad: string[] = []
    for (const id of wanted) {
      if (ok.length === MAX_PHOTOS) break
      const r = await client.resource(id)
      if (!r) continue
      if (r.bytes > MAX_PHOTO_BYTES || !PHOTO_FORMATS.includes(r.format.toLowerCase())) bad.push(id)
      else ok.push(id)
    }
    if (bad.length) await client.destroy(bad)
    return ok
  } catch (err) {
    console.error('verifyPhotos: dropping photos', err)
    return []
  }
}

export const thumbUrl = (s: PhotoSettings, id: string) =>
  cloudinary.url(id, { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret, type: 'authenticated', sign_url: true, secure: true, format: 'jpg', transformation: [{ crop: 'fill', width: 240, height: 240 }] })

export const fullUrl = (s: PhotoSettings, id: string, expiresAtSec: number) =>
  cloudinary.utils.private_download_url(id, 'jpg', { cloud_name: s.cloudName, api_key: s.apiKey, api_secret: s.apiSecret, type: 'authenticated', expires_at: expiresAtSec })

export async function deleteOrphans(client: PhotoClient, referenced: Set<string>, now: Date): Promise<number> {
  const cutoff = now.getTime() - DAY_MS
  const doomed: string[] = []
  let cursor: string | undefined
  do {
    const page = await client.list(PHOTO_PREFIX, cursor)
    for (const r of page.resources) if (!referenced.has(r.public_id) && Date.parse(r.created_at) < cutoff) doomed.push(r.public_id)
    cursor = page.next_cursor
  } while (cursor)
  for (let i = 0; i < doomed.length; i += 100) await client.destroy(doomed.slice(i, i + 100))
  return doomed.length
}
```

Append to `web/.env.example`:

```
# Cloudinary (Home Upgrades quote photos). Leave empty: the form works with links only.
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- [ ] **Step 5: Run** — `npx vitest run tests/unit/inquiry-photos.test.ts` → PASS; `npx tsc --noEmit` → 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/inquiries/photos.ts tests/unit/inquiry-photos.test.ts .env.example
git commit -m "feat(inquiries): Cloudinary photo signing, verification, URLs and cleanup"
```

---

### Task 4: Pipeline, emails and sent page for Home Upgrades

**Files:**
- Modify: `web/src/inquiries/forms/index.ts` (register homeupgrades), `web/src/inquiries/pipeline.ts`, `web/src/inquiries/deliver.ts`, `web/src/inquiries/actions.ts`, `web/src/app/(sites)/[site]/quote/sent/page.tsx`
- Test: `web/tests/int/inquiry-hu.int.spec.ts`; extend `web/tests/unit/inquiry-forms.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `processQuote` deps gain `verifyPhotos: (ids: string[]) => Promise<string[]>` (Logistics passes `async () => []`); input gains `photoIds: string[]`.
  - `deliverInquiry` opts gain `photos?: { settings: PhotoSettings | null; nowSec: number }`; team mail for HU includes links and photo links; customer mail for HU uses `extraLine: 'Forgot a photo? Just reply to this email with it.'`.

- [ ] **Step 1: Write the failing int test** — `web/tests/int/inquiry-hu.int.spec.ts`

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { processQuote } from '@/inquiries/pipeline'
import { deliverInquiry, type Mail } from '@/inquiries/deliver'

let payload: Payload
const raw = { project: 'accent', property: 'home', timing: 'soon', budget: '', zip: '92101', notes: 'Living room wall, about 4 m wide.', links: 'https://pin.it/abc', callTime: '', name: 'Ana', phone: '', email: 'ana@example.com' }
const pid = (c: string) => `genix-inquiries/${c.repeat(24)}`
const deps = (verify = async (ids: string[]) => ids) => ({ payload, isBot: async () => false, now: () => new Date(), salt: 's', production: false, verifyPhotos: verify })
const input = (photoIds: string[] = []) => ({ site: 'homeupgrades' as const, raw, photoIds, ip: '127.0.0.1', honeypot: '', startedAt: null })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { for (const c of ['inquiries', 'inquiry-counters', 'rate-hits'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } }) })

describe('Home Upgrades enquiries', () => {
  it('saves with GX-HUP numbering, details and verified photos', async () => {
    const r = await processQuote(input([pid('a'), pid('a'), pid('b')]), deps(async (ids) => [...new Set(ids)].slice(0, 1)))
    expect(r).toMatchObject({ ok: true, reference: 'GX-HUP-000001' })
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect(docs[0]).toMatchObject({ division: 'homeupgrades', summary: 'Accent wall & TV unit · 92101 · Home · In 1–3 months', notes: 'Living room wall, about 4 m wide.' })
    expect(docs[0].details).toMatchObject({ project: 'accent', links: ['https://pin.it/abc'], photos: [pid('a')] })
  })
  it('still saves when photo verification throws', async () => {
    const r = await processQuote(input([pid('a')]), deps(async () => { throw new Error('cloudinary down') }))
    expect(r.ok).toBe(true)
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect((docs[0].details as { photos: string[] }).photos).toEqual([])
  })
  it('emails the team with links and photos, the customer with choices only', async () => {
    const r = await processQuote(input([pid('a')]), deps())
    if (!r.ok || r.inquiryId === null) throw new Error('expected saved')
    const sent: Mail[] = []
    const settings = { cloudName: 'demo-cloud', apiKey: '1', apiSecret: 'test-secret-not-real' }
    await deliverInquiry(payload, r.inquiryId, async (m) => { sent.push(m) }, { env: {}, phone: null, adminOrigin: 'https://thegenixgroup.com', retryDelayMs: 0, photos: { settings, nowSec: 1_791_000_000 } })
    const [team, customer] = sent
    expect(team.subject).toBe('[Home Upgrades] Quote · Accent wall & TV unit · 92101 · GX-HUP-000001')
    expect(team.html).toContain('https://pin.it/abc')
    expect(team.html).toContain('Photos (1)')
    expect(customer.text).toContain('Forgot a photo? Just reply to this email with it.')
    expect(customer.text).not.toContain('Living room wall')
    expect(customer.text).not.toContain('pin.it')
    expect(customer.html).not.toContain('genix-inquiries')
  })
  it('logistics enquiries are unaffected', async () => {
    const r = await processQuote({ site: 'logistics', raw: { kind: 'business', from: '92101', to: '92024', date: '', flexible: 'on', load: 'parcels', pallets: '', name: 'Bo', phone: '(619) 555-0100', email: '', notes: '' }, photoIds: [pid('z')], ip: '127.0.0.1', honeypot: '', startedAt: null }, deps())
    expect(r).toMatchObject({ ok: true, reference: 'GX-LOG-000001' })
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect(docs[0].details).not.toHaveProperty('photos')
  })
})
```

Extend `tests/unit/inquiry-forms.test.ts`: `expect(FORM_SITES).toEqual(['logistics', 'homeupgrades'])`.

- [ ] **Step 2: Run** — FAIL (homeupgrades not registered / signatures).

- [ ] **Step 3: Implement**
  - `forms/index.ts`: add `homeupgrades: homeupgradesForm as FormDef<unknown>`.
  - `pipeline.ts`: `Input` gains `photoIds: string[]`; `Deps` gains `verifyPhotos`. After the rate limit, before saving:

```ts
  let data = parsed.data
  if (input.site === 'homeupgrades') {
    let photos: string[] = []
    try { photos = await deps.verifyPhotos(input.photoIds) } catch (err) { console.error('processQuote: photo verification failed', err) }
    data = { ...(data as object), photos } as typeof data
  }
```

   (use `data` for `contact`, `summary`, `details`). Existing pipeline int tests must pass `photoIds: []` and `verifyPhotos: async () => []` — update them.
  - `actions.ts`:

```ts
import { cloudinaryClient, photoSettings, verifyPhotos } from './photos'
// in processQuote call:
      { site, raw: { ...formDataToRawFor(formFor(site), formData), photos: formData.getAll('photos') }, photoIds: formData.getAll('photos').map(String), ip, honeypot: …, startedAt: … },
      { …, verifyPhotos: (ids) => { const s = photoSettings(process.env); return verifyPhotos(ids, s ? cloudinaryClient(s) : null) } },
// in after(): deliverInquiry(p, id, createMailer(process.env), { env: process.env, phone, adminOrigin: siteOrigin('hub'), photos: { settings: photoSettings(process.env), nowSec: Math.floor(Date.now() / 1000) } })
```

  - `deliver.ts`: `DeliverOpts` gains `photos?`. In the team block, for `site === 'homeupgrades'` build `links` and `photos` from `data`:

```ts
import { fullUrl, thumbUrl, type PhotoSettings } from './photos'
const THIRTY_DAYS = 30 * 86_400
// …
    const hu = site === 'homeupgrades' ? (data as { links: string[]; photos: string[] }) : null
    const ps = opts.photos?.settings ?? null
    const photoLinks = hu && ps ? hu.photos.map((id) => ({ thumb: thumbUrl(ps, id), full: fullUrl(ps, id, (opts.photos!.nowSec) + THIRTY_DAYS) })) : []
    const e = teamEmail({ …, links: hu?.links ?? [], photos: photoLinks })
// customer: extraLine: site === 'homeupgrades' ? 'Forgot a photo? Just reply to this email with it.' : undefined
```

   `retryUnsent` and `resendInquiry` pass `photos: { settings: photoSettings(opts.env ?? process.env), nowSec: Math.floor(Date.now() / 1000) }`.
  - `quote/sent/page.tsx`: allow `site === 'logistics' || site === 'homeupgrades'`; success message per site: Logistics unchanged; Home Upgrades `"We'll get back to you within two business days to arrange a visit. Forgot a photo? Just reply to our confirmation email with it."`; "Back to the form" link `/#quote` for Home Upgrades (Logistics keeps `/#quote-form`).

- [ ] **Step 4: Run** — `npx vitest run tests/int tests/unit` → all pass; `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/inquiries "src/app/(sites)/[site]/quote" tests
git commit -m "feat(inquiries): Home Upgrades quotes through the pipeline, with links and photos"
```

---

### Task 5: Photo lifecycle — admin thumbnails, delete hook, orphan cleanup

**Files:**
- Modify: `web/src/collections/Inquiries.ts`, `web/src/inquiries/deliver.ts` (`retryUnsent` → cleanup), `web/src/app/(sites)/[site]/cron/inquiries/route.ts`
- Create: `web/src/inquiries/admin/PhotoStrip.tsx`
- Generated: `web/src/app/(payload)/admin/importMap.js`
- Test: `web/tests/int/inquiry-photos-lifecycle.int.spec.ts`

**Interfaces:**
- Consumes: `photoSettings`, `cloudinaryClient`, `deleteOrphans`, `thumbUrl`, `fullUrl`, `PhotoClient` (Task 3).
- Produces: `cleanupPhotos(payload, client: PhotoClient | null, now: Date): Promise<number>` in `deliver.ts` (collects every `details.photos` id across inquiries, then `deleteOrphans`); `retryUnsent` result gains `photosDeleted`; `Inquiries` `afterDelete` deletes that inquiry's photos (`photoClientFactory` seam: module-level `let makePhotoClient = (env) => { const s = photoSettings(env); return s ? cloudinaryClient(s) : null }` with exported `setPhotoClientFactory(f)` for tests).

- [ ] **Step 1: Write the failing int test** — `web/tests/int/inquiry-photos-lifecycle.int.spec.ts`

```ts
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { cleanupPhotos } from '@/inquiries/deliver'
import { setPhotoClientFactory } from '@/collections/Inquiries'
import type { PhotoClient } from '@/inquiries/photos'

let payload: Payload
const pid = (c: string) => `genix-inquiries/${c.repeat(24)}`
const make = (photos: string[]) => payload.create({ collection: 'inquiries', data: { reference: `GX-HUP-${String(Math.random()).slice(2, 8)}`, division: 'homeupgrades', type: 'quote', status: 'new', name: 'Ana', email: 'a@b.co', summary: 's', details: { photos } } })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'inquiries', where: { id: { exists: true } } }) })
afterEach(() => setPhotoClientFactory(null))

describe('photo lifecycle', () => {
  it('cleanup keeps referenced photos and deletes old orphans', async () => {
    await make([pid('a')])
    const destroy = vi.fn(async () => {})
    const client: PhotoClient = {
      resource: async () => null,
      list: async () => ({ resources: [{ public_id: pid('a'), created_at: '2026-01-01T00:00:00Z' }, { public_id: pid('b'), created_at: '2026-01-01T00:00:00Z' }] }),
      destroy,
    }
    expect(await cleanupPhotos(payload, client, new Date())).toBe(1)
    expect(destroy).toHaveBeenCalledWith([pid('b')])
  })
  it('cleanup does nothing when photos are off', async () => {
    expect(await cleanupPhotos(payload, null, new Date())).toBe(0)
  })
  it('deleting an inquiry deletes its photos', async () => {
    const destroy = vi.fn(async () => {})
    setPhotoClientFactory(() => ({ resource: async () => null, list: async () => ({ resources: [] }), destroy }))
    const doc = await make([pid('c'), pid('d')])
    await payload.delete({ collection: 'inquiries', id: doc.id })
    expect(destroy).toHaveBeenCalledWith([pid('c'), pid('d')])
  })
})
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement**
  - `deliver.ts`:

```ts
import { cloudinaryClient, deleteOrphans, photoSettings, type PhotoClient } from './photos'

export async function cleanupPhotos(payload: Payload, client: PhotoClient | null, now: Date): Promise<number> {
  if (!client) return 0
  const referenced = new Set<string>()
  let page = 1
  for (;;) {
    const r = await payload.find({ collection: 'inquiries', where: { division: { equals: 'homeupgrades' } }, depth: 0, limit: 500, page, select: { details: true } })
    for (const d of r.docs) for (const id of ((d.details as { photos?: string[] } | null)?.photos ?? [])) referenced.add(id)
    if (!r.hasNextPage) break
    page++
  }
  return deleteOrphans(client, referenced, now)
}
```

   In `retryUnsent`, after pruning: `const s = photoSettings(opts.env); let photosDeleted = 0; try { photosDeleted = await cleanupPhotos(payload, s ? cloudinaryClient(s) : null, opts.now) } catch (err) { console.error('photo cleanup failed', err) }` and return `{ retried, pruned, photosDeleted }`. Update the existing `retryUnsent` test expectation to include `photosDeleted: 0`.
  - `Inquiries.ts`:

```ts
import { cloudinaryClient, photoSettings, type PhotoClient } from '@/inquiries/photos'
let photoClientFactory: ((env: Record<string, string | undefined>) => PhotoClient | null) | null = null
/** Tests swap the Cloudinary client; null restores the real one. */
export function setPhotoClientFactory(f: typeof photoClientFactory) { photoClientFactory = f }
const makePhotoClient = (env: Record<string, string | undefined>) => (photoClientFactory ? photoClientFactory(env) : (() => { const s = photoSettings(env); return s ? cloudinaryClient(s) : null })())
// collection config:
  hooks: {
    afterDelete: [
      async ({ doc }) => {
        const ids = ((doc.details as { photos?: string[] } | null)?.photos ?? []).filter(Boolean)
        const client = makePhotoClient(process.env)
        if (!ids.length || !client) return
        try { await client.destroy(ids) } catch (err) { console.error('Inquiries afterDelete: photo delete failed (cleanup cron will retry)', err) }
      },
    ],
  },
// fields (after `details`):
    { name: 'photoStrip', type: 'ui', admin: { components: { Field: '@/inquiries/admin/PhotoStrip#PhotoStrip' } } },
```

  - `web/src/inquiries/admin/PhotoStrip.tsx` (server component; check Payload 3.90.2's server `Field` props for `data`/`document` and adapt):

```tsx
import { fullUrl, photoSettings, thumbUrl } from '@/inquiries/photos'

/** Admin: thumbnails for a Home Upgrades enquiry's photos; full-size links last one hour. */
export function PhotoStrip({ data }: { data?: { details?: { photos?: string[] } } }) {
  const ids = data?.details?.photos ?? []
  const s = photoSettings(process.env)
  if (!ids.length) return null
  if (!s) return <p>{ids.length} photo(s) attached; Cloudinary settings are missing, so they can't be shown.</p>
  const exp = Math.floor(Date.now() / 1000) + 3600
  return (
    <div style={{ margin: '0 0 24px' }}>
      <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Photos ({ids.length})</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ids.map((id) => (
          <a key={id} href={fullUrl(s, id, exp)} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl(s, id)} width={120} height={120} alt="Customer photo" style={{ borderRadius: 8, objectFit: 'cover' }} />
          </a>
        ))}
      </div>
    </div>
  )
}
```

   Run `npm run payload generate:importmap`; commit the regenerated `importMap.js`.
  - Cron route: no change needed beyond `retryUnsent`'s new result (it returns `Response.json(result)`).

- [ ] **Step 4: Run** — `npx vitest run tests/int tests/unit` → pass; `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/collections/Inquiries.ts src/inquiries "src/app/(payload)/admin/importMap.js" tests
git commit -m "feat(inquiries): photo thumbnails in the admin, delete hook and daily orphan cleanup"
```

---

### Task 6: Upload grant route

**Files:**
- Create: `web/src/app/(sites)/[site]/uploads/route.ts`, `web/src/inquiries/upload-grant.ts`
- Modify: `web/src/instrumentation-client.ts` (protect `POST /uploads`)
- Test: `web/tests/unit/inquiry-upload-grant.test.ts`, `web/tests/int/inquiry-upload-grant.int.spec.ts`

**Interfaces:**
- Consumes: `photoSettings`, `signUpload`, `PHOTO_MIME`, `MAX_PHOTO_BYTES` (Task 3); `hashIp` (format.ts); `botCheckFor` pattern / `checkBotId`.
- Produces: `checkUploadRequest(body: unknown): { ok: true } | { ok: false; status: 400; error: string }` (type in `PHOTO_MIME`, `size` integer 1..MAX_PHOTO_BYTES); `grantUpload(input: { site: string; body: unknown; ip: string }, deps: { payload: Payload; env: Env; isBot: () => Promise<boolean>; now: Date; production: boolean }): Promise<{ status: number; json: unknown }>`. Statuses: 404 (not homeupgrades, or photos off), 400 (bad body), 403 (bot), 429 (rate), 200 `{ uploadUrl, fields, publicId }`.

- [ ] **Step 1: Write the failing tests**

`web/tests/unit/inquiry-upload-grant.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { checkUploadRequest } from '@/inquiries/upload-grant'

describe('checkUploadRequest', () => {
  it('accepts images up to 10 MB', () => {
    expect(checkUploadRequest({ type: 'image/heic', size: 10_485_760 })).toEqual({ ok: true })
  })
  it.each([
    [{ type: 'application/pdf', size: 10 }],
    [{ type: 'image/jpeg', size: 10_485_761 }],
    [{ type: 'image/jpeg', size: 0 }],
    [{ type: 'image/jpeg' }],
    ['nonsense'],
  ])('refuses %j', (body) => {
    expect(checkUploadRequest(body)).toMatchObject({ ok: false, status: 400 })
  })
})
```

`web/tests/int/inquiry-upload-grant.int.spec.ts`

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { grantUpload } from '@/inquiries/upload-grant'

let payload: Payload
const env = { CLOUDINARY_CLOUD_NAME: 'demo-cloud', CLOUDINARY_API_KEY: '1', CLOUDINARY_API_SECRET: 'test-secret-not-real', IP_HASH_SALT: 's' }
const body = { type: 'image/jpeg', size: 1000 }
const deps = (over = {}) => ({ payload, env, isBot: async () => false, now: new Date(), production: true, ...over })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'rate-hits', where: { id: { exists: true } } }) })

describe('grantUpload', () => {
  it('grants a signed upload on Home Upgrades only', async () => {
    const r = await grantUpload({ site: 'homeupgrades', body, ip: '203.0.113.9' }, deps())
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload' })
    expect(JSON.stringify(r.json)).not.toContain('test-secret-not-real')
    expect((await grantUpload({ site: 'logistics', body, ip: '203.0.113.9' }, deps())).status).toBe(404)
  })
  it('404 when photos are off; 400 bad body; 403 bot', async () => {
    expect((await grantUpload({ site: 'homeupgrades', body, ip: '1.1.1.1' }, deps({ env: {} }))).status).toBe(404)
    expect((await grantUpload({ site: 'homeupgrades', body: { type: 'application/pdf', size: 1 }, ip: '1.1.1.1' }, deps())).status).toBe(400)
    expect((await grantUpload({ site: 'homeupgrades', body, ip: '1.1.1.1' }, deps({ isBot: async () => true }))).status).toBe(403)
  })
  it('allows 10 grants per IP per 10 minutes', async () => {
    for (let i = 0; i < 10; i++) expect((await grantUpload({ site: 'homeupgrades', body, ip: '203.0.113.7' }, deps())).status).toBe(200)
    expect((await grantUpload({ site: 'homeupgrades', body, ip: '203.0.113.7' }, deps())).status).toBe(429)
  })
})
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement** — `web/src/inquiries/upload-grant.ts`

```ts
import type { Payload } from 'payload'
import { hashIp } from './format'
import { MAX_PHOTO_BYTES, PHOTO_MIME, photoSettings, signUpload } from './photos'

type Env = Record<string, string | undefined>
const LIMIT = 10
const WINDOW_MS = 10 * 60 * 1000
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown', ''])

export function checkUploadRequest(body: unknown): { ok: true } | { ok: false; status: 400; error: string } {
  const b = body as { type?: unknown; size?: unknown } | null
  const type = typeof b?.type === 'string' ? b.type.toLowerCase() : ''
  const size = typeof b?.size === 'number' ? b.size : NaN
  if (!PHOTO_MIME.includes(type)) return { ok: false, status: 400, error: 'Only JPG, PNG, WebP or HEIC photos.' }
  if (!Number.isInteger(size) || size < 1 || size > MAX_PHOTO_BYTES) return { ok: false, status: 400, error: 'Photos must be 10 MB or smaller.' }
  return { ok: true }
}

export async function grantUpload(
  input: { site: string; body: unknown; ip: string },
  deps: { payload: Payload; env: Env; isBot: () => Promise<boolean>; now: Date; production: boolean },
): Promise<{ status: number; json: unknown }> {
  const settings = photoSettings(deps.env)
  if (input.site !== 'homeupgrades' || !settings) return { status: 404, json: { error: 'Not found' } }
  const check = checkUploadRequest(input.body)
  if (!check.ok) return { status: 400, json: { error: check.error } }
  if (await deps.isBot()) return { status: 403, json: { error: 'Forbidden' } }
  // Distinct key from form submissions so photo grants never eat the form's quota.
  const ipHash = 'up:' + hashIp(input.ip || 'unknown', deps.env.IP_HASH_SALT || 'dev-only-salt')
  if (deps.production || !LOOPBACK.has(input.ip)) {
    const since = new Date(deps.now.getTime() - WINDOW_MS).toISOString()
    const { totalDocs } = await deps.payload.count({ collection: 'rate-hits', where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] } })
    if (totalDocs >= LIMIT) return { status: 429, json: { error: 'Too many uploads. Try again in a few minutes.' } }
    await deps.payload.create({ collection: 'rate-hits', data: { ipHash } })
  }
  return { status: 200, json: signUpload(settings, Math.floor(deps.now.getTime() / 1000)) }
}
```

`web/src/app/(sites)/[site]/uploads/route.ts`

```ts
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { checkBotId } from 'botid/server'
import config from '@payload-config'
import { grantUpload } from '@/inquiries/upload-grant'

// Home Upgrades photo uploads: grants a one-time signed Cloudinary upload (the browser sends the file there directly).
export async function POST(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  let body: unknown = null
  try { body = await req.json() } catch { /* handled as a bad request */ }
  const h = await headers()
  const ip = (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim()
  try {
    const payload = await getPayload({ config })
    const r = await grantUpload({ site, body, ip }, { payload, env: process.env, isBot: async () => (await checkBotId()).isBot, now: new Date(), production: process.env.VERCEL_ENV === 'production' })
    return Response.json(r.json, { status: r.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('uploads: grant failed', err)
    return Response.json({ error: 'Could not start the upload' }, { status: 500 })
  }
}
```

`web/src/instrumentation-client.ts`: `initBotId({ protect: [{ path: '/', method: 'POST' }, { path: '/uploads', method: 'POST' }] })`.

- [ ] **Step 4: Run** — `npx vitest run tests/unit tests/int` → pass; `npx tsc --noEmit` → 0. Check with the dev server: `curl.exe -s -o NUL -w "%{http_code}" -X POST -H "Host: homeupgrades.localhost:3000" -H "Content-Type: application/json" -d "{}" http://127.0.0.1:3000/uploads` → `404` (no Cloudinary settings locally).

- [ ] **Step 5: Commit**

```bash
git add src/inquiries/upload-grant.ts "src/app/(sites)/[site]/uploads" src/instrumentation-client.ts tests
git commit -m "feat(inquiries): signed Cloudinary upload grants for Home Upgrades photos"
```

---

### Task 7: Prototype the form (design source of truth)

**Files:**
- Modify: `design/homeupgrades-home.html` (quote band markup + styles in its `<style>`), add `<script src="js/hu-quote-form.js"></script>` after `shared/quote-bar.js`
- Create: `design/js/hu-quote-form.js`

**Interfaces:**
- Produces (the app port copies these exactly): form `#hu-quote-form` (`class="hu-form"`) inside `.quote .wrap`'s right column, replacing `.quote-actions` and `.quote-note`; element ids `hqProject*`, `hqSteps`, `hqNext`, `hqBack`, `hqSend`, `hqStatus`, `hqSent`, `hqRef`, `hqZip`, `hqNotes`, `hqLinks`, `hqName`, `hqPhone`, `hqEmail`, `hqCallTime` (fieldset), `hqPhotos` (drop area), `hqPhotoInput` (file input), `hqPhotoList`; error `<p class="err" id="<inputId>Err">`; pills = `<label class="pill"><input type="radio" name="project" value="accent"> Accent wall &amp; TV unit</label>` inside `<fieldset class="pills" id="hqProject">` with `<legend>`; photo block wrapped in `<div class="photos" data-photos hidden>` (shown by JS only when the page says photos are on: `<form data-photos="on">`).

- [ ] **Step 1: Markup** — in `design/homeupgrades-home.html` keep the label and `<h2>` column; in the right column keep `<p class="body">` and replace `.quote-actions` + `.quote-note` with:

```html
<form class="hu-form" id="hu-quote-form" action="#" method="post" data-photos="on" novalidate>
  <input type="hidden" name="site" value="homeupgrades" />
  <div class="hu-steps" id="hqSteps" aria-hidden="true"><span class="on"></span><span></span></div>
  <fieldset class="hu-step" data-step="1">
    <legend class="step-title" id="hqStep1Title" tabindex="-1">1 · The project</legend>
    <fieldset class="pills" id="hqProject" aria-describedby="hqProjectErr">
      <legend>What are we building?</legend>
      <label class="pill"><input type="radio" name="project" value="accent" required /> Accent wall &amp; TV unit</label>
      <label class="pill"><input type="radio" name="project" value="outdoor" /> Outdoor build</label>
      <label class="pill"><input type="radio" name="project" value="other" /> Something else</label>
      <p class="err" id="hqProjectErr"></p>
    </fieldset>
    <fieldset class="pills" id="hqProperty" aria-describedby="hqPropertyErr">
      <legend>For your…</legend>
      <label class="pill"><input type="radio" name="property" value="home" required /> Home</label>
      <label class="pill"><input type="radio" name="property" value="business" /> Business</label>
      <p class="err" id="hqPropertyErr"></p>
    </fieldset>
    <fieldset class="pills" id="hqTiming" aria-describedby="hqTimingErr">
      <legend>When to start</legend>
      <label class="pill"><input type="radio" name="timing" value="asap" required /> As soon as possible</label>
      <label class="pill"><input type="radio" name="timing" value="soon" /> In 1–3 months</label>
      <label class="pill"><input type="radio" name="timing" value="planning" /> Just planning</label>
      <p class="err" id="hqTimingErr"></p>
    </fieldset>
    <fieldset class="pills" id="hqBudget">
      <legend>Rough budget <span class="opt">· optional</span></legend>
      <label class="pill"><input type="radio" name="budget" value="under5" /> Under $5k</label>
      <label class="pill"><input type="radio" name="budget" value="5to15" /> $5–15k</label>
      <label class="pill"><input type="radio" name="budget" value="over15" /> $15k+</label>
      <label class="pill"><input type="radio" name="budget" value="unsure" /> Not sure</label>
    </fieldset>
    <div class="field">
      <label for="hqZip">Property ZIP</label>
      <input id="hqZip" name="zip" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" required aria-describedby="hqZipErr" />
      <p class="err" id="hqZipErr"></p>
    </div>
    <div class="form-actions js-only"><button type="button" class="btn btn-dark" id="hqNext">Continue <span aria-hidden="true">→</span></button></div>
  </fieldset>
  <fieldset class="hu-step" data-step="2">
    <legend class="step-title" id="hqStep2Title" tabindex="-1">2 · Your details</legend>
    <div class="field">
      <label for="hqNotes">Tell us about the space</label>
      <textarea id="hqNotes" name="notes" rows="4" minlength="10" maxlength="2000" required aria-describedby="hqNotesHint hqNotesErr"></textarea>
      <p class="hint" id="hqNotesHint">Room, size, what you have in mind.</p>
      <p class="err" id="hqNotesErr"></p>
    </div>
    <div class="photos" data-photos hidden>
      <p class="photos-label">Photos &amp; inspiration</p>
      <label class="drop" id="hqPhotos" for="hqPhotoInput">
        <input type="file" id="hqPhotoInput" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple />
        <span>Add up to 5 photos of your space or ideas you like.</span>
      </label>
      <ul class="photo-list" id="hqPhotoList" aria-live="polite"></ul>
      <p class="err" id="hqPhotosErr"></p>
    </div>
    <div class="field">
      <label for="hqLinks">Pinterest, Instagram or website links (optional)</label>
      <textarea id="hqLinks" name="links" rows="2" maxlength="1000"></textarea>
    </div>
    <div class="field"><label for="hqName">Name</label><input id="hqName" name="name" autocomplete="name" required aria-describedby="hqNameErr" /><p class="err" id="hqNameErr"></p></div>
    <div class="field-row">
      <div class="field"><label for="hqPhone">Phone</label><input id="hqPhone" name="phone" type="tel" autocomplete="tel" aria-describedby="hqPhoneErr hqContactHint" /><p class="err" id="hqPhoneErr"></p></div>
      <div class="field"><label for="hqEmail">Email</label><input id="hqEmail" name="email" type="email" autocomplete="email" aria-describedby="hqEmailErr hqContactHint" /><p class="err" id="hqEmailErr"></p></div>
    </div>
    <p class="hint" id="hqContactHint">Phone or email, whichever you prefer.</p>
    <fieldset class="pills" id="hqCallTime" hidden>
      <legend>Best time to call <span class="opt">· optional</span></legend>
      <label class="pill"><input type="radio" name="callTime" value="morning" /> Morning</label>
      <label class="pill"><input type="radio" name="callTime" value="afternoon" /> Afternoon</label>
      <label class="pill"><input type="radio" name="callTime" value="evening" /> Evening</label>
    </fieldset>
    <div class="hp" aria-hidden="true"><label for="hqHp">Leave this empty</label><input id="hqHp" name="company_site" tabindex="-1" autocomplete="off" /></div>
    <p class="privacy">We use your details and photos only to reply to this request.</p>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost js-only" id="hqBack">← Back</button>
      <button type="submit" class="btn btn-gold" id="hqSend">Send request <span aria-hidden="true">→</span></button>
    </div>
  </fieldset>
  <p class="sr-only" id="hqStatus" role="status" tabindex="-1"></p>
  <div class="sent" id="hqSent" tabindex="-1" hidden>
    <p class="sent-ref" id="hqRef">Request received</p>
    <p class="sent-title">Request received.</p>
    <p>We'll get back to you within two business days to arrange a visit.</p>
    <p class="sent-note">Forgot a photo? Just reply to our confirmation email with it.</p>
  </div>
</form>
```

- [ ] **Step 2: Styles** — in the page's `<style>` (all under the existing HU scoping the file already uses; follow its tokens `--brand` navy, gold, `--muted`, 12 px/18 px radii): `.hu-form` white card (radius 18px, soft shadow like `.svc`), padding 24px; `.hu-steps` two 4px bars (gold when `.on`); `.pills` no border, flex-wrap gap 8px, `legend` 12px uppercase label; `.pill` 44px min-height, radius 999px, 1px border, `input` visually hidden but focusable, `:has(input:checked)` navy fill + white text, `:has(input:focus-visible)` 2px gold outline; `.field` label/input/textarea like the site's existing inputs (radius 12px, 44px min-height); `.field-row` two columns ≥ 600px else one; `.drop` dashed 1.5px border radius 12px, centered text, hover/`.dragover` gold border; `.photo-list` grid of 72px tiles with ✕ remove button (32px, top-right) and an uploading state (`.tile[data-state="uploading"]` dimmed with a small spinner) and error state; `.err` red-brown text 13px (reuse the Logistics-form error colour token if the HU stylesheet has one, else `#b42318`); `.hint`, `.privacy`, `.opt` muted 13px; `.hp` off-screen; `.js-only` hidden without JS (`html:not(.js) .js-only{display:none}` — check how the page marks JS and follow it); `.sent` hidden-until-shown card. Phones (≤ 960px): the quote band already stacks; the form is full width.

- [ ] **Step 3: Behaviour** — `design/js/hu-quote-form.js` (plain script, IIFE, no modules): JS mode shows one step at a time; `Continue` validates step 1 with the exact messages; `Back`; typing a phone reveals `#hqCallTime` (hides and clears it when the phone is emptied); photo picking validates count (≤ 5 total: "You can add up to 5 photos."), type ("Only JPG, PNG, WebP or HEIC photos.") and size ("Photos must be 10 MB or smaller."), and adds tiles with a **local** preview (`URL.createObjectURL`; HEIC shows a generic photo icon) and a remove ✕ — the prototype never uploads; Send validates step 2 and shows the confirmation with reference `GX-HUP-000123`. Show `[data-photos]` only when the form has `data-photos="on"`.

- [ ] **Step 4: Check it** — serve the prototype (`python -m http.server 4321 --directory ../design` if not already running, or use the existing launch config) and open `http://localhost:4321/homeupgrades-home.html#quote` at 1280 px and 390 px. Screenshot both states (step 1, step 2 with two photo tiles, confirmation) for the report. Verify keyboard: Tab reaches every pill; Space selects; focus ring visible.

- [ ] **Step 5: Commit** (repo root)

```bash
git add design/homeupgrades-home.html design/js/hu-quote-form.js
git commit -m "design(homeupgrades): tap-to-pick quote form with photos and links"
```

---

### Task 8: Port the form into the app

**Files:**
- Modify: `web/src/pages-home/homeupgrades/sections/Quote.tsx`, `web/src/pages-home/homeupgrades/homeupgrades.generated.css` (via `npm run port:css` only)
- Create: `web/src/components/motion/HuQuoteForm.tsx`
- Test: `web/tests/e2e/hu-quote.e2e.spec.ts`; existing `parity.e2e.spec.ts`, `homeupgrades-home.e2e.spec.ts`, `links.e2e.spec.ts`

**Interfaces:**
- Consumes: `submitQuote`, `submitQuoteForm` (actions.ts), `inquirySendMode`, `offlineMessage` (mode.ts), `rateLimitedMessage`, `serverErrorMessage` (messages.ts), `photoSettings` (photos.ts) — only to decide `data-photos` server-side; never import `photos.ts` into the client component.
- Produces: `/uploads` client flow: `POST /uploads {type,size}` → `{uploadUrl, fields, publicId}` → `fetch(uploadUrl, { method: 'POST', body: FormData(fields + file) })` → hidden `<input type="hidden" name="photos" value=publicId>` inside the tile.

- [ ] **Step 1: Write the failing e2e** — `web/tests/e2e/hu-quote.e2e.spec.ts`

```ts
import { expect, test, type Page } from '@playwright/test'

// Dev server runs in "preview" mode. Cloudinary is never contacted: /uploads and the upload are mocked per test.
const URL = 'http://homeupgrades.localhost:3000/'
const IMG = { name: 'wall.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]) }

async function step1(page: Page) {
  await page.getByLabel('Accent wall & TV unit').check()
  await page.getByLabel('Home', { exact: true }).check()
  await page.getByLabel('In 1–3 months').check()
  await page.fill('#hqZip', '92101')
  await page.click('#hqNext')
}
async function step2(page: Page) {
  await page.fill('#hqNotes', 'Living room wall, about 4 m wide.')
  await page.fill('#hqName', 'E2E HU')
  await page.fill('#hqEmail', 'e2e-hu@test.local')
}
async function mockUploads(page: Page, opts: { failUpload?: boolean; slowMs?: number } = {}) {
  let n = 0
  await page.route('**/uploads', (r) => r.fulfill({ json: { uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload', publicId: `genix-inquiries/${'x'.repeat(23)}${n++}`, fields: { api_key: '1', timestamp: '1', signature: 'a'.repeat(40), public_id: 'p', type: 'authenticated' } } }))
  await page.route('https://api.cloudinary.com/**', async (r) => {
    if (opts.slowMs) await new Promise((res) => setTimeout(res, opts.slowMs))
    if (opts.failUpload) return r.fulfill({ status: 500, json: { error: { message: 'down' } } })
    return r.fulfill({ json: { public_id: 'p', secure_url: 'https://res.cloudinary.com/demo/x.jpg', bytes: 8, format: 'jpg' } })
  })
}

test('picks pills, sends, gets a GX-HUP reference', async ({ page }) => {
  await page.goto(URL + '#quote')
  await page.waitForTimeout(2200)
  await step1(page)
  await step2(page)
  await page.click('#hqSend')
  await expect(page.locator('#hqSent')).toBeVisible()
  await expect(page.locator('#hqRef')).toHaveText(/^GX-HUP-\d{6}$/)
  await expect(page.locator('#hqSent')).toContainText('Forgot a photo?')
})

test('step 1 errors use the exact messages', async ({ page }) => {
  await page.goto(URL + '#quote')
  await page.click('#hqNext')
  await expect(page.locator('#hqProjectErr')).toHaveText("Choose what we're building.")
  await expect(page.locator('#hqPropertyErr')).toHaveText('Choose home or business.')
  await expect(page.locator('#hqTimingErr')).toHaveText("Choose when you'd like to start.")
  await expect(page.locator('#hqZipErr')).toHaveText('Enter a 5-digit ZIP code.')
})

test('best time to call appears only with a phone', async ({ page }) => {
  await page.goto(URL + '#quote')
  await step1(page)
  await expect(page.locator('#hqCallTime')).toBeHidden()
  await page.fill('#hqPhone', '(619) 555-0100')
  await expect(page.locator('#hqCallTime')).toBeVisible()
  await page.fill('#hqPhone', '')
  await expect(page.locator('#hqCallTime')).toBeHidden()
})

test.describe('photos (Cloudinary mocked)', () => {
  test.skip(({}, info) => !process.env.E2E_PHOTOS, 'set E2E_PHOTOS=1 with CLOUDINARY_* test values in the dev server env to run')

  test('add then remove: the removed photo is not sent', async ({ page }) => {
    await mockUploads(page)
    await page.goto(URL + '#quote')
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [IMG, { ...IMG, name: 'b.jpg' }])
    await expect(page.locator('#hqPhotoList input[name="photos"]')).toHaveCount(2)
    await page.locator('#hqPhotoList button').first().click()
    await expect(page.locator('#hqPhotoList input[name="photos"]')).toHaveCount(1)
  })
  test('a failed upload shows a message and the form still sends', async ({ page }) => {
    await mockUploads(page, { failUpload: true })
    await page.goto(URL + '#quote')
    await page.waitForTimeout(2200)
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [IMG])
    await expect(page.locator('#hqPhotosErr')).toHaveText("That photo didn't upload. Try again, or send without it.")
    await expect(page.locator('#hqPhotoList [data-state="uploading"]')).toHaveCount(0)
    await step2(page)
    await page.click('#hqSend')
    await expect(page.locator('#hqSent')).toBeVisible()
  })
  test('Send waits for an upload in progress', async ({ page }) => {
    await mockUploads(page, { slowMs: 1500 })
    await page.goto(URL + '#quote')
    await page.waitForTimeout(2200)
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [IMG])
    await step2(page)
    await page.click('#hqSend')
    await expect(page.locator('#hqSend')).toContainText('Uploading photos…')
    await expect(page.locator('#hqSent')).toBeVisible({ timeout: 15_000 })
  })
  test('refuses a 6th photo, a PDF and a huge file before uploading', async ({ page }) => {
    let grants = 0
    await mockUploads(page)
    page.on('request', (r) => { if (r.url().endsWith('/uploads')) grants++ })
    await page.goto(URL + '#quote')
    await step1(page)
    await page.setInputFiles('#hqPhotoInput', [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') }])
    await expect(page.locator('#hqPhotosErr')).toHaveText('Only JPG, PNG, WebP or HEIC photos.')
    await page.setInputFiles('#hqPhotoInput', [{ name: 'big.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10_485_761) }])
    await expect(page.locator('#hqPhotosErr')).toHaveText('Photos must be 10 MB or smaller.')
    await page.setInputFiles('#hqPhotoInput', Array.from({ length: 6 }, (_, i) => ({ ...IMG, name: `${i}.jpg` })))
    await expect(page.locator('#hqPhotosErr')).toHaveText('You can add up to 5 photos.')
    await expect(page.locator('#hqPhotoList input[name="photos"]')).toHaveCount(5)
    expect(grants).toBe(5)
  })
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('both steps visible; posts and lands on the sent page', async ({ page }) => {
    await page.goto(URL + '#quote')
    await expect(page.locator('[data-photos]')).toBeHidden()
    await page.getByLabel('Outdoor build').check()
    await page.getByLabel('Business').check()
    await page.getByLabel('Just planning').check()
    await page.fill('#hqZip', '92024')
    await page.fill('#hqNotes', 'Deck for the back patio, roughly 20 by 12 feet.')
    await page.fill('#hqName', 'E2E NoJS HU')
    await page.fill('#hqPhone', '(619) 555-0100')
    await page.click('#hqSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-HUP-\d{6}$/)
  })
})
```

Note for the photo tests: the dev server runs from this checkout with whatever `web/.env` holds. To run them, the implementer adds **test-only** placeholder values (`CLOUDINARY_CLOUD_NAME=demo`, `CLOUDINARY_API_KEY=1`, `CLOUDINARY_API_SECRET=test-not-real`) to `web/.env` temporarily so the photo block renders, restarts nothing (Next reloads env on change), runs with `E2E_PHOTOS=1`, then removes them. Never commit `.env`. If the dev server doesn't pick up the env change, report it; the controller decides.

- [ ] **Step 2: Run** — `npx playwright test tests/e2e/hu-quote.e2e.spec.ts --reporter=line` → FAIL.

- [ ] **Step 3: Port markup** — `Quote.tsx` renders the prototype's form markup as JSX exactly (same ids, classes, copy), with: `action={submitQuoteForm}` instead of `action="#"`; `data-send-mode={inquirySendMode(process.env)}`, `data-offline-message={offlineMessage(data.phone)}`, `data-phone={data.phone ?? ''}`; `data-photos={photoSettings(process.env) ? 'on' : 'off'}`; hidden `<input type="hidden" name="t" id="hqT" />`; render `<HuQuoteForm />` after the form. Remove `novalidate` from the server markup (the enhancer sets `noValidate` in JS mode, as the Logistics form does). Run `npm run port:css` to bring the prototype styles across.

- [ ] **Step 4: Enhancer** — `HuQuoteForm.tsx` (`'use client'`, `useEnhance` like `QuoteForm.tsx`; read `QuoteForm.tsx` first and mirror its patterns for steps, `setErr`, `report`, `showStatus`/`quietStatus`, timeout race, offline handling, `e.preventDefault(); e.stopImmediatePropagation()`, cleanup). HU specifics:
  - Validation messages exactly as Global Constraints; step 1 checks the three required pill groups + ZIP; step 2 checks notes (≥ 10 chars), name, phone/email (same rules as Logistics).
  - Phone input toggles `#hqCallTime` hidden; emptying the phone clears its radios.
  - Photos (only when `form.dataset.photos === 'on'`; also unhide `[data-photos]`): on file pick, for each file in order — refuse when the total would exceed 5 (message "You can add up to 5 photos.", stop adding), wrong type ("Only JPG, PNG, WebP or HEIC photos."; accept `file.type` in the allowed list OR a `.heic/.heif` extension with empty type), > 10_485_760 bytes ("Photos must be 10 MB or smaller."); otherwise add a tile `data-state="uploading"` with a local preview, `POST /uploads` `{ type: file.type || 'image/heic', size: file.size }`, then `POST` the file to `uploadUrl` with the returned `fields` + `file`; on success set `data-state="done"` and append `<input type="hidden" name="photos" value={publicId}>` to the tile; on any failure remove the tile and show "That photo didn't upload. Try again, or send without it." Each tile's ✕ removes the tile (and its hidden input). Track in-flight uploads in a `Set<Promise>`.
  - Send: validate; if uploads are in flight, set the button text to "Uploading photos…", `await Promise.allSettled([...inFlight])`, then continue; build `FormData(form)` (includes `photos` inputs), `fd.set('js', '1')`, call `submitQuote` with the 15 s timeout race; success → hide steps, `#hqRef` = reference, show `#hqSent`, focus it; field errors → map keys `project|property|timing|zip` → step 1, others → step 2 (`hqProject…`, `hqZip`, `hqNotes`, `hqName`, `hqPhone`, `hqEmail`); rate/server → visible status message; restore the button text in `finally`.
  - Write `t` (`Date.now()`) on start; JS mode shows one step at a time.
- [ ] **Step 5: Run** — `npx playwright test tests/e2e/hu-quote.e2e.spec.ts tests/e2e/homeupgrades-home.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/quality.e2e.spec.ts --reporter=line` → pass (photo tests with `E2E_PHOTOS=1` as noted). Update any `homeupgrades-home` assertion that expected the old "Email about a project" button or the "full quote form comes with the Contact page" note, keeping the test's intent.
- [ ] **Step 6: Commit**

```bash
git add src/pages-home/homeupgrades src/components/motion/HuQuoteForm.tsx tests/e2e
git commit -m "feat(homeupgrades): quote form in the app — pills, photos via Cloudinary, links"
```

---

### Task 9: Docs and README

**Files:**
- Modify: `web/README.md` ("Enquiry emails" → add "Home Upgrades photos (Cloudinary)": create a free account; set the three variables in Vercel Production; without them the form works with links only; uploads are private, thumbnails signed, full-size links expire after 30 days, orphans deleted daily), `docs/superpowers/specs/2026-10-04-homeupgrades-quote-form-design.md` (fold in Rulings 1–4; Status → "matches the build").

- [ ] **Step 1:** Edit both files as described (edit sections in place; no changelog appendix).
- [ ] **Step 2: Commit**

```bash
git add web/README.md docs/superpowers/specs/2026-10-04-homeupgrades-quote-form-design.md
git commit -m "docs: Home Upgrades quote form spec matches the build; Cloudinary setup"
```

---

### Task 10: Full verification

- [ ] **Step 1:** `npx tsc --noEmit` → 0; `npx vitest run` → all pass; then `npx playwright test --reporter=line` → all pass (photo e2e skipped unless `E2E_PHOTOS=1`; run them once with the test-only env values as in Task 8 and record the result).
- [ ] **Step 2:** Fix only failures this branch caused (minimal, with a test). Report environmental flakes after one re-run instead of changing code.
- [ ] **Step 3:** Commit any fixes with messages describing the failure fixed.

---

## Self-review notes

- Spec coverage: form fields/messages/no-JS/confirmation (T7, T8), per-division pipeline (T1, T4), HU emails incl. links/photos and customer rules (T4), admin thumbnails (T5), Cloudinary signed upload + verification + URLs (T3, T6, T4), cleanup + delete hook (T5), settings gate (T3, T6, T8), tests (each task, T10), docs (T9).
- Review Focus 1–4 → Task 8 e2e; 5 → Task 3 unit (`verifyPhotos` dedup/tamper) and Task 4 int (verification failure still saves).
- Names used across tasks: `FormDef`, `Row`, `Contact`, `FORM_SITES`, `formFor`, `formDataToRawFor`, `logisticsForm`, `homeupgradesForm`, `HuQuote`, `parseLinks`, `HU_LABELS`, `photoSettings`, `PhotoSettings`, `PhotoClient`, `cloudinaryClient`, `signUpload`, `isPhotoId`, `newPhotoId`, `verifyPhotos`, `thumbUrl`, `fullUrl`, `deleteOrphans`, `cleanupPhotos`, `setPhotoClientFactory`, `checkUploadRequest`, `grantUpload`, `teamEmail`, `customerEmail`, `PhotoLink`, `processQuote` (`photoIds`, `verifyPhotos`), `deliverInquiry` (`photos` opt).
