# Enquiry Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Logistics quote form really send: save each enquiry in Payload, email the group inbox and the customer through Resend, block spam, retry failed emails, and give staff an admin inbox.

**Architecture:** A Next.js Server Action (`submitQuote`) validates with a shared zod schema, runs spam checks, saves an `inquiries` row with an atomic per-division reference, and schedules email delivery with `after()` so the visitor never waits on Resend. Pure pipeline code (`processQuote`, `deliverInquiry`) takes its dependencies as arguments so integration tests run it against the test database with stubbed email/bot checks. A daily Vercel cron and an admin "Send email again" button retry unsent emails.

**Tech Stack:** Next.js 16.3.6 (App Router, proxy.ts host routing), Payload 3.90.2 + Postgres, zod, resend, botid, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-enquiry-pipeline-design.md` (refines §4a of `2026-09-27-genix-websites-design.md`).

## Global Constraints

- All app code lives in `web/`; run every command from `web/`.
- This is NOT the Next.js in your training data: read the relevant guide in `web/node_modules/next/dist/docs/` before using `after`, `headers`, `redirect` or Server Actions. `proxy.ts` (not middleware) rewrites every path to `/<site>/…`.
- Visitor-facing strings are exact:
  - "Enter a 5-digit ZIP code." · "Pick a date, or tick Flexible." · "Pick a date from today on." · "Choose what's moving." · "Enter 1 to 26 pallets." · "Enter your name." · "Add a phone number or an email so we can reply." · "Enter a phone number with area code." · "Enter an email like name@company.com."
  - Rate limited: "Too many requests. Please call us at <phone>." (no phone: "Too many requests. Please email hello@thegenixgroup.com.")
  - Server error: "Couldn't send. Try again, or call <phone>." (no phone: "Couldn't send. Try again, or email hello@thegenixgroup.com.")
  - Customer promise: "We'll get back to you within two business days."
  - Privacy line under the form: "We use your details only to reply to this request."
- Reference format `GX-<PREFIX>-<6 digits>`, prefix from `SITES[site].inquiryPrefix` (`LOG`, `HUP`, `MED`, `HUB`).
- Emails: team mail To `INQUIRY_TO`, From `Genix <Division> <INQUIRY_FROM>`, Reply-To customer email; auto-reply Reply-To `INQUIRY_TO`. Idempotency keys `<reference>:team` / `<reference>:customer`.
- Daily cron `0 14 * * *`, max 5 email attempts, rate limit 5 per ipHash per 10 minutes, bot "too fast" threshold 2000 ms.
- Never put real secrets in code, tests or chat. Test credentials only. `web/.env` is never committed.
- Don't commit dev-server rewrites of `next-env.d.ts`; DO commit `payload-types.ts` / `importMap.js` / migrations when this plan regenerates them.
- Run Playwright with `--reporter=line`. Never run `npm run build` in `web/` while the dev server is running.
- Local DB: Docker `genix-postgres-1` on :5434 (dev DB `genix`, test DB `genix_test`). After direct SQL edits send one request with `Cache-Control: no-cache` to refresh the dev server's site-data cache.

### Rulings (plan vs spec) — the spec is patched to match

1. **References:** the counter row is incremented atomically on its own (`INSERT … ON CONFLICT … RETURNING`); it is not in a transaction with the inquiry insert. A failed insert leaves a gap in the sequence; references stay unique. Gaps are harmless for a lead number.
2. **No-JS results:** the page is static, so it cannot re-render the form with server errors. A no-JS POST is redirected (303) to `/quote/sent?ref=…` on success or `/quote/sent?error=invalid|rate|server` otherwise; that page shows the message and a "Back to the form" link. Native `required`/`pattern` validation still runs before a no-JS post.
3. **Admin "new" count:** shown as a summary line above the Inquiries list ("3 new · 1 email not sent"), not a nav badge (Payload's nav would need a full custom Nav).
4. **Rate limit exemption:** outside production, loopback IPs (`127.0.0.1`, `::1`, unknown) are not rate-limited, so the e2e suite (many submissions from one machine) keeps working. Integration tests cover the limiter.
5. **"Too fast" check:** the render time can't be baked into a static page; the enhancer writes `t` (ms since epoch at hydration). Missing `t` (no JS) skips this check; honeypot, BotID and the rate limit still apply.
6. **Logistics `kind` values** are the form's real ones: `business` | `move`.
7. **Admin e2e** (find the reference in /admin) is replaced by integration tests on the saved row; e2e covers the visitor flows.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/inquiries/schema.ts` | zod schema + `quoteFieldErrors()` shared by client and server; exact messages |
| `src/inquiries/format.ts` | `formatReference`, `hashIp`, `quoteSummary`, `teamSubject` (pure) |
| `src/inquiries/email.ts` | `teamEmail`, `customerEmail` → `{ subject, html, text }` (pure) |
| `src/inquiries/mode.ts` | `inquirySendMode(env)` → `live` / `preview` / `offline`; `offlineMessage` |
| `src/inquiries/reference.ts` | `nextReference(payload, site)` — atomic counter |
| `src/inquiries/pipeline.ts` | `processQuote(input, deps)` — spam, rate limit, save |
| `src/inquiries/deliver.ts` | `deliverInquiry(payload, id, mailer)`, `createMailer(env)`, `retryUnsent(payload, mailer)` |
| `src/inquiries/actions.ts` | `'use server'` `submitQuote(prev, formData)` — thin wrapper |
| `src/inquiries/messages.ts` | visitor-facing `rateLimitedMessage`, `serverErrorMessage` |
| `src/collections/Inquiries.ts`, `InquiryCounters.ts`, `RateHits.ts` | Payload collections |
| `src/payload/access.ts` | + `canReadInquiry` |
| `src/inquiries/admin/ResendButton.tsx`, `InboxSummary.tsx` | admin UI |
| `src/app/(sites)/[site]/quote/sent/page.tsx` | no-JS result page |
| `src/app/(sites)/[site]/cron/inquiries/route.ts` | daily cron |
| `src/pages-home/logistics/sections/Hero.tsx`, `src/components/motion/QuoteForm.tsx` | form wiring |
| `src/pages-home/logistics/send-mode.ts` | removed; replaced by `src/inquiries/mode.ts` |

---

### Task 1: Dependencies, send mode and environment

**Files:**
- Modify: `web/package.json` (via npm)
- Create: `web/src/inquiries/mode.ts`
- Delete: `web/src/pages-home/logistics/send-mode.ts`, `web/tests/unit/send-mode.test.ts`
- Create: `web/tests/unit/inquiry-mode.test.ts`
- Modify: `web/src/pages-home/logistics/sections/Hero.tsx` (import path only), `web/.env.example`, `web/README.md`

**Interfaces:**
- Produces: `type SendMode = 'live' | 'preview' | 'offline'`; `inquirySendMode(env: Record<string, string | undefined>): SendMode`; `offlineMessage(phone: string | null): string` (unchanged text).

- [ ] **Step 1: Install packages**

Run: `npm install zod resend botid`
Expected: three packages added to `dependencies`. Then read `node_modules/resend/dist/index.d.ts` for the `emails.send(payload, options?)` signature (confirm `idempotencyKey` option) and `node_modules/botid/README.md` for `checkBotId` / `initBotId` / `withBotId`. Note any differences from this plan in the task report.

- [ ] **Step 2: Write the failing test** — `web/tests/unit/inquiry-mode.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { inquirySendMode, offlineMessage } from '@/inquiries/mode'

const keys = { RESEND_API_KEY: 're_test_123', INQUIRY_TO: 'hello@thegenixgroup.com', IP_HASH_SALT: 'salt' }

describe('inquirySendMode', () => {
  it('is live wherever the email settings are present', () => {
    expect(inquirySendMode({ VERCEL_ENV: 'production', ...keys })).toBe('live')
    expect(inquirySendMode({ VERCEL_ENV: 'preview', ...keys })).toBe('live')
    expect(inquirySendMode({ ...keys })).toBe('live')
  })
  it('stays offline on production without them (never pretends to accept a request)', () => {
    expect(inquirySendMode({ VERCEL_ENV: 'production' })).toBe('offline')
    expect(inquirySendMode({ VERCEL_ENV: 'production', RESEND_API_KEY: 're_x' })).toBe('offline')
    expect(inquirySendMode({ VERCEL_ENV: 'production', RESEND_API_KEY: 're_x', INQUIRY_TO: 'a@b.co' })).toBe('offline') // no salt
  })
  it('previews elsewhere: saves, logs emails', () => {
    expect(inquirySendMode({ VERCEL_ENV: 'preview' })).toBe('preview')
    expect(inquirySendMode({})).toBe('preview')
  })
})

describe('offlineMessage', () => {
  it('offers the phone when there is one', () => {
    expect(offlineMessage('(619) 555-0100')).toBe("We can't take requests online yet. Call us at (619) 555-0100 or email hello@thegenixgroup.com.")
    expect(offlineMessage(null)).toBe("We can't take requests online yet. Email hello@thegenixgroup.com.")
  })
})
```

- [ ] **Step 3: Run it** — `npx vitest run tests/unit/inquiry-mode.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement** — `web/src/inquiries/mode.ts`

```ts
type Env = Record<string, string | undefined>
export type SendMode = 'live' | 'preview' | 'offline'

/** live: email settings present — save and send for real.
    offline: the production deployment without them — the form says it can't take requests yet.
    preview: everywhere else — save, and write emails to the server log. */
export function inquirySendMode(env: Env): SendMode {
  const production = env.VERCEL_ENV === 'production'
  const hasMail = Boolean(env.RESEND_API_KEY && env.INQUIRY_TO)
  if (hasMail && (!production || env.IP_HASH_SALT)) return 'live'
  return production ? 'offline' : 'preview'
}

export function offlineMessage(phone: string | null): string {
  return phone
    ? `We can't take requests online yet. Call us at ${phone} or email hello@thegenixgroup.com.`
    : "We can't take requests online yet. Email hello@thegenixgroup.com."
}
```

Delete `src/pages-home/logistics/send-mode.ts` and `tests/unit/send-mode.test.ts`. In `Hero.tsx` replace the import with `import { inquirySendMode, offlineMessage } from '@/inquiries/mode'` and `data-send-mode={quoteSendMode(process.env.VERCEL_ENV)}` with `data-send-mode={inquirySendMode(process.env)}`. In `QuoteForm.tsx` nothing changes yet (it only checks `=== 'offline'`).

- [ ] **Step 5: Env docs** — append to `web/.env.example`:

```
# Enquiry emails (Resend). Leave empty locally: emails are written to the server log.
RESEND_API_KEY=
# Group inbox that receives every enquiry
INQUIRY_TO=hello@thegenixgroup.com
# Sending address on the Resend-verified domain (no mailbox needed)
INQUIRY_FROM=quotes@thegenixgroup.com
# Random 32+ characters; salts the stored IP hash. Required for the live form in production
IP_HASH_SALT=
# Random string; Vercel sends it to the daily cron route
CRON_SECRET=
```

In `web/README.md`, under the "Deploy (Vercel)" section, add a subsection:

```md
### Enquiry emails
The quote form stays look-only on production until `RESEND_API_KEY`, `INQUIRY_TO` and `IP_HASH_SALT` are set.
1. Resend: add and verify the domain `thegenixgroup.com` (add its DNS records in Vercel → Domains).
2. Vercel → Settings → Environment Variables (Production): `RESEND_API_KEY`, `INQUIRY_TO=hello@thegenixgroup.com`,
   `INQUIRY_FROM=quotes@thegenixgroup.com`, `IP_HASH_SALT` (e.g. `openssl rand -hex 32`), `CRON_SECRET` (same way).
3. Redeploy. Failed emails are retried daily at 14:00 UTC and from the "Send email again" button in /admin.
```

- [ ] **Step 6: Verify** — `npx vitest run tests/unit` → all pass; `npx tsc --noEmit` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/inquiries/mode.ts src/pages-home/logistics tests/unit .env.example README.md
git commit -m "feat(inquiries): send mode (live/preview/offline) and email settings"
```

---

### Task 2: Shared validation schema

**Files:**
- Create: `web/src/inquiries/schema.ts`, `web/tests/unit/inquiry-schema.test.ts`

**Interfaces:**
- Produces:
  - `type QuoteInput = { kind: 'business' | 'move'; from: string; to: string; date: string | null; flexible: boolean; load: string; pallets: number | null; name: string; phone: string | null; email: string | null; notes: string | null }`
  - `type FieldErrors = Partial<Record<'from' | 'to' | 'date' | 'load' | 'pallets' | 'name' | 'phone' | 'email', string>>`
  - `parseQuote(raw: Record<string, unknown>, today: string): { ok: true; data: QuoteInput } | { ok: false; errors: FieldErrors }` (`today` = `YYYY-MM-DD`)
  - `formDataToRaw(fd: FormData): Record<string, unknown>`
  - `LOADS: { business: string[]; move: string[] }`

- [ ] **Step 1: Write the failing test** — `web/tests/unit/inquiry-schema.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { formDataToRaw, parseQuote } from '@/inquiries/schema'

const TODAY = '2026-10-01'
const good = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: '', load: 'pallets', pallets: '2', name: 'Ana Ruiz', phone: '(619) 555-0100', email: '', notes: '' }

describe('parseQuote', () => {
  it('accepts a complete business quote and normalises it', () => {
    const r = parseQuote(good, TODAY)
    expect(r).toEqual({ ok: true, data: { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: false, load: 'pallets', pallets: 2, name: 'Ana Ruiz', phone: '(619) 555-0100', email: null, notes: null } })
  })
  it('uses the prototype messages', () => {
    const r = parseQuote({ kind: 'business', from: '921', to: '', date: '', flexible: '', load: '', pallets: '', name: ' ', phone: '', email: '' }, TODAY)
    expect(r).toEqual({ ok: false, errors: {
      from: 'Enter a 5-digit ZIP code.', to: 'Enter a 5-digit ZIP code.', date: 'Pick a date, or tick Flexible.',
      load: "Choose what's moving.", name: 'Enter your name.', phone: 'Add a phone number or an email so we can reply.',
    } })
  })
  it('checks dates, pallets, phone and email formats', () => {
    const r = parseQuote({ ...good, date: '2026-09-30', pallets: '27', phone: '555-0100', email: 'ana@' }, TODAY)
    expect(r).toEqual({ ok: false, errors: {
      date: 'Pick a date from today on.', pallets: 'Enter 1 to 26 pallets.',
      phone: 'Enter a phone number with area code.', email: 'Enter an email like name@company.com.',
    } })
  })
  it('flexible drops the date; non-pallet loads drop pallets', () => {
    const r = parseQuote({ ...good, flexible: 'on', date: '', load: 'parcels', pallets: '99' }, TODAY)
    expect(r.ok && r.data).toMatchObject({ flexible: true, date: null, load: 'parcels', pallets: null })
  })
  it('rejects a load from the other tab', () => {
    const r = parseQuote({ ...good, kind: 'move', load: 'pallets' }, TODAY)
    expect(r).toEqual({ ok: false, errors: { load: "Choose what's moving." } })
  })
})

describe('formDataToRaw', () => {
  it('reads the form fields by name', () => {
    const fd = new FormData()
    for (const [k, v] of Object.entries(good)) fd.set(k, v)
    expect(formDataToRaw(fd)).toMatchObject({ kind: 'business', from: '92101', pallets: '2' })
  })
})
```

- [ ] **Step 2: Run it** — `npx vitest run tests/unit/inquiry-schema.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — `web/src/inquiries/schema.ts`

```ts
import { z } from 'zod'

/** Shared by the quote form enhancer (client) and submitQuote (server). Messages match the prototype. */
export const LOADS = {
  business: ['pallets', 'parcels', 'truckload', 'courier'],
  move: ['studio', '1-2bed', '3bed', 'office'],
} as const

export type QuoteInput = {
  kind: 'business' | 'move'
  from: string
  to: string
  date: string | null
  flexible: boolean
  load: string
  pallets: number | null
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}
type Field = 'from' | 'to' | 'date' | 'load' | 'pallets' | 'name' | 'phone' | 'email'
export type FieldErrors = Partial<Record<Field, string>>

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const zip = /^\d{5}$/
const email = z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)

export function formDataToRaw(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of ['kind', 'from', 'to', 'date', 'flexible', 'load', 'pallets', 'name', 'phone', 'email', 'notes']) out[k] = fd.get(k) ?? ''
  return out
}

export function parseQuote(raw: Record<string, unknown>, today: string): { ok: true; data: QuoteInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const kind = str(raw.kind) === 'move' ? 'move' : 'business'
  const from = str(raw.from), to = str(raw.to)
  if (!zip.test(from)) errors.from = 'Enter a 5-digit ZIP code.'
  if (!zip.test(to)) errors.to = 'Enter a 5-digit ZIP code.'

  const flexible = str(raw.flexible) !== ''
  const date = flexible ? null : str(raw.date) || null
  if (!flexible) {
    if (!date) errors.date = 'Pick a date, or tick Flexible.'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) errors.date = 'Pick a date from today on.'
  }

  const load = str(raw.load)
  if (!(LOADS[kind] as readonly string[]).includes(load)) errors.load = "Choose what's moving."
  let pallets: number | null = null
  if (load === 'pallets') {
    const n = Number(str(raw.pallets))
    if (Number.isInteger(n) && n >= 1 && n <= 26) pallets = n
    else errors.pallets = 'Enter 1 to 26 pallets.'
  }

  const name = str(raw.name)
  if (!name) errors.name = 'Enter your name.'
  const phone = str(raw.phone) || null
  const mail = str(raw.email) || null
  if (!phone && !mail) errors.phone = 'Add a phone number or an email so we can reply.'
  else if (phone && phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a phone number with area code.'
  if (mail && !email.safeParse(mail).success) errors.email = 'Enter an email like name@company.com.'

  if (Object.keys(errors).length) return { ok: false, errors }
  const notes = str(raw.notes).slice(0, 2000) || null
  return { ok: true, data: { kind, from, to, date, flexible, load, pallets, name: name.slice(0, 120), phone, email: mail, notes } }
}
```

- [ ] **Step 4: Run it** — same command → PASS. `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/inquiries/schema.ts tests/unit/inquiry-schema.test.ts
git commit -m "feat(inquiries): shared quote schema with the prototype's messages"
```

---

### Task 3: Pure formatting and email builders

**Files:**
- Create: `web/src/inquiries/format.ts`, `web/src/inquiries/email.ts`, `web/src/inquiries/messages.ts`
- Test: `web/tests/unit/inquiry-format.test.ts`

**Interfaces:**
- Consumes: `QuoteInput` (Task 2), `SITES`, `SiteKey` from `@/sites/config`.
- Produces:
  - `formatReference(prefix: string, n: number): string`
  - `hashIp(ip: string, salt: string): string` (hex HMAC-SHA-256)
  - `loadLabel(load: string): string`
  - `quoteSummary(q: QuoteInput): string` → `92101 → 92024 · 2 pallets`
  - `teamSubject(division: string, q: QuoteInput, reference: string): string`
  - `type EmailContent = { subject: string; html: string; text: string }`
  - `teamEmail(args: { site: SiteKey; reference: string; q: QuoteInput; adminUrl: string }): EmailContent`
  - `customerEmail(args: { site: SiteKey; reference: string; q: QuoteInput; phone: string | null }): EmailContent`
  - `rateLimitedMessage(phone: string | null): string`, `serverErrorMessage(phone: string | null): string`

- [ ] **Step 1: Write the failing test** — `web/tests/unit/inquiry-format.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { formatReference, hashIp, quoteSummary, teamSubject } from '@/inquiries/format'
import { customerEmail, teamEmail } from '@/inquiries/email'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'
import type { QuoteInput } from '@/inquiries/schema'

const q: QuoteInput = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: false, load: 'pallets', pallets: 2, name: 'Ana <Ruiz>', phone: '(619) 555-0100', email: 'ana@example.com', notes: 'Dock at back' }

describe('format', () => {
  it('pads references to six digits', () => {
    expect(formatReference('LOG', 1)).toBe('GX-LOG-000001')
    expect(formatReference('HUP', 123456)).toBe('GX-HUP-123456')
  })
  it('hashes IPs with the salt, deterministically', () => {
    expect(hashIp('203.0.113.9', 's1')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashIp('203.0.113.9', 's1')).toBe(hashIp('203.0.113.9', 's1'))
    expect(hashIp('203.0.113.9', 's1')).not.toBe(hashIp('203.0.113.9', 's2'))
  })
  it('summarises and builds the team subject', () => {
    expect(quoteSummary(q)).toBe('92101 → 92024 · 2 pallets')
    expect(quoteSummary({ ...q, load: '1-2bed', pallets: null })).toBe('92101 → 92024 · 1–2 bedroom home')
    expect(teamSubject('Logistics', q, 'GX-LOG-000001')).toBe('[Logistics] Quote · 92101 → 92024 · 2 pallets · GX-LOG-000001')
  })
})

describe('emails', () => {
  it('team email lists every answer and escapes HTML', () => {
    const e = teamEmail({ site: 'logistics', reference: 'GX-LOG-000001', q, adminUrl: 'https://thegenixgroup.com/admin/collections/inquiries/7' })
    expect(e.subject).toBe('[Logistics] Quote · 92101 → 92024 · 2 pallets · GX-LOG-000001')
    expect(e.html).toContain('Ana &lt;Ruiz&gt;')
    expect(e.html).toContain('href="tel:+16195550100"')
    expect(e.html).toContain('https://thegenixgroup.com/admin/collections/inquiries/7')
    expect(e.text).toContain('Notes: Dock at back')
  })
  it('customer email carries the promise, reference and phone', () => {
    const e = customerEmail({ site: 'logistics', reference: 'GX-LOG-000001', q, phone: '(619) 555-0100' })
    expect(e.subject).toBe('We got your request · GX-LOG-000001')
    expect(e.text).toContain("We'll get back to you within two business days.")
    expect(e.text).toContain('(619) 555-0100')
  })
})

describe('messages', () => {
  it('fall back to email without a phone', () => {
    expect(rateLimitedMessage('(619) 555-0100')).toBe('Too many requests. Please call us at (619) 555-0100.')
    expect(rateLimitedMessage(null)).toBe('Too many requests. Please email hello@thegenixgroup.com.')
    expect(serverErrorMessage('(619) 555-0100')).toBe("Couldn't send. Try again, or call (619) 555-0100.")
    expect(serverErrorMessage(null)).toBe("Couldn't send. Try again, or email hello@thegenixgroup.com.")
  })
})
```

- [ ] **Step 2: Run it** — `npx vitest run tests/unit/inquiry-format.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `web/src/inquiries/format.ts`

```ts
import { createHmac } from 'node:crypto'
import type { QuoteInput } from './schema'

export const formatReference = (prefix: string, n: number) => `GX-${prefix}-${String(n).padStart(6, '0')}`

export const hashIp = (ip: string, salt: string) => createHmac('sha256', salt).update(ip).digest('hex')

const LOAD_LABELS: Record<string, string> = {
  pallets: 'Pallets', parcels: 'Parcels or boxes', truckload: 'Full truckload', courier: 'Same-day courier',
  studio: 'Studio', '1-2bed': '1–2 bedroom home', '3bed': '3+ bedroom home', office: 'Office',
}
export const loadLabel = (load: string) => LOAD_LABELS[load] ?? load

export function quoteSummary(q: QuoteInput): string {
  const what = q.load === 'pallets' && q.pallets ? `${q.pallets} pallet${q.pallets === 1 ? '' : 's'}` : loadLabel(q.load)
  return `${q.from} → ${q.to} · ${what}`
}

export const teamSubject = (division: string, q: QuoteInput, reference: string) => `[${division}] Quote · ${quoteSummary(q)} · ${reference}`
```

`web/src/inquiries/messages.ts`

```ts
export const rateLimitedMessage = (phone: string | null) =>
  phone ? `Too many requests. Please call us at ${phone}.` : 'Too many requests. Please email hello@thegenixgroup.com.'

export const serverErrorMessage = (phone: string | null) =>
  phone ? `Couldn't send. Try again, or call ${phone}.` : "Couldn't send. Try again, or email hello@thegenixgroup.com."
```

`web/src/inquiries/email.ts`

```ts
import { SITES, type SiteKey } from '@/sites/config'
import { loadLabel, teamSubject } from './format'
import type { QuoteInput } from './schema'

export type EmailContent = { subject: string; html: string; text: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tel = (p: string) => `tel:+${(p.replace(/\D/g, '').length === 10 ? '1' : '') + p.replace(/\D/g, '')}`

function answers(q: QuoteInput): [string, string][] {
  return [
    ['Type', q.kind === 'move' ? 'Move' : 'Business shipment'],
    ['From', q.from],
    ['To', q.to],
    ['Date', q.flexible ? 'Flexible' : (q.date ?? '')],
    ["What's moving", loadLabel(q.load)],
    ...(q.pallets ? ([['Pallets', String(q.pallets)]] as [string, string][]) : []),
    ['Name', q.name],
    ...(q.phone ? ([['Phone', q.phone]] as [string, string][]) : []),
    ...(q.email ? ([['Email', q.email]] as [string, string][]) : []),
    ...(q.notes ? ([['Notes', q.notes]] as [string, string][]) : []),
  ]
}

function table(rows: [string, string][], phone: string | null): string {
  const cell = 'padding:6px 12px 6px 0;vertical-align:top'
  return `<table style="border-collapse:collapse;font:15px/1.5 Arial,sans-serif;color:#111110">${rows
    .map(([k, v]) => {
      const value = k === 'Phone' && phone ? `<a href="${tel(phone)}" style="color:#012247">${esc(v)}</a>` : esc(v)
      return `<tr><th align="left" style="${cell};color:#625d55;font-weight:600">${esc(k)}</th><td style="${cell}">${value}</td></tr>`
    })
    .join('')}</table>`
}

const shell = (body: string) =>
  `<div style="max-width:560px;margin:0 auto;padding:24px;border-top:4px solid #c28a2c;font:15px/1.5 Arial,sans-serif;color:#111110">${body}</div>`

export function teamEmail({ site, reference, q, adminUrl }: { site: SiteKey; reference: string; q: QuoteInput; adminUrl: string }): EmailContent {
  const rows = answers(q)
  const subject = teamSubject(SITES[site].shortName, q, reference)
  const html = shell(`<p style="margin:0 0 16px;font-weight:700">New quote request · ${esc(reference)}</p>${table(rows, q.phone)}<p style="margin:20px 0 0"><a href="${esc(adminUrl)}" style="color:#012247">Open in the admin</a></p>`)
  const text = [`New quote request · ${reference}`, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', `Admin: ${adminUrl}`].join('\n')
  return { subject, html, text }
}

export function customerEmail({ site, reference, q, phone }: { site: SiteKey; reference: string; q: QuoteInput; phone: string | null }): EmailContent {
  const name = SITES[site].name
  const rows = answers(q).filter(([k]) => !['Name', 'Phone', 'Email'].includes(k))
  const promise = "We'll get back to you within two business days."
  const call = phone ? `Need us sooner? Call ${phone}.` : 'Need us sooner? Reply to this email.'
  const subject = `We got your request · ${reference}`
  const html = shell(`<p style="margin:0 0 12px">Thanks, ${esc(q.name)}. ${promise}</p><p style="margin:0 0 16px">Your reference: <b>${esc(reference)}</b></p>${table(rows, null)}<p style="margin:20px 0 0">${esc(call)}</p><p style="margin:8px 0 0;color:#625d55">${esc(name)} · Part of The Genix Group</p>`)
  const text = [`Thanks, ${q.name}. ${promise}`, '', `Your reference: ${reference}`, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', call, `${name} · Part of The Genix Group`].join('\n')
  return { subject, html, text }
}
```

- [ ] **Step 4: Run it** — PASS; `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/inquiries/format.ts src/inquiries/email.ts src/inquiries/messages.ts tests/unit/inquiry-format.test.ts
git commit -m "feat(inquiries): references, IP hash, summaries and email bodies"
```

---

### Task 4: Collections, access and migration

**Files:**
- Create: `web/src/collections/Inquiries.ts`, `web/src/collections/InquiryCounters.ts`, `web/src/collections/RateHits.ts`
- Modify: `web/src/payload/access.ts`, `web/src/payload.config.ts`
- Generated (commit): `web/src/payload-types.ts`, `web/src/migrations/<timestamp>_inquiries.{ts,json}`, `web/src/migrations/index.ts`
- Test: `web/tests/int/inquiries.int.spec.ts`

**Interfaces:**
- Produces: collection slugs `inquiries`, `inquiry-counters`, `rate-hits`; `canReadInquiry: Access`; Inquiry fields exactly as in the spec table plus `summary` (text, read-only) and `customerEmailSent`.

- [ ] **Step 1: Write the failing integration test** — `web/tests/int/inquiries.int.spec.ts`

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

// Runs against genix_test (vitest.config). Test-only credentials.
let payload: Payload
const base = { reference: 'GX-LOG-000001', division: 'logistics', type: 'quote', name: 'Ana', phone: '(619) 555-0100', details: {}, summary: '92101 → 92024 · Pallets' } as const

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['inquiries', 'inquiry-counters', 'rate-hits', 'users'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('inquiries collection', () => {
  it('defaults status and delivery fields', async () => {
    const doc = await payload.create({ collection: 'inquiries', data: base })
    expect([doc.status, doc.emailSent, doc.customerEmailSent, doc.emailAttempts]).toEqual(['new', false, false, 0])
  })
  it('keeps references unique', async () => {
    await expect(payload.create({ collection: 'inquiries', data: base })).rejects.toThrow()
  })
  it('refuses creates through the API (no overrideAccess)', async () => {
    await expect(payload.create({ collection: 'inquiries', data: { ...base, reference: 'GX-LOG-000002' }, overrideAccess: false })).rejects.toThrow()
  })
  it('shows editors only their divisions', async () => {
    await payload.create({ collection: 'inquiries', data: { ...base, reference: 'GX-HUP-000001', division: 'homeupgrades' } })
    const admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: 'test-pass-1' } })
    const editor = await payload.create({ collection: 'users', data: { email: 'ed@test.local', password: 'test-pass-2', role: 'editor', divisions: ['homeupgrades'] } })
    const asEditor = await payload.find({ collection: 'inquiries', overrideAccess: false, user: editor })
    expect(asEditor.docs.map((d) => d.reference)).toEqual(['GX-HUP-000001'])
    const asAdmin = await payload.find({ collection: 'inquiries', overrideAccess: false, user: admin })
    expect(asAdmin.totalDocs).toBe(2)
  })
})
```

- [ ] **Step 2: Run it** — `npx vitest run tests/int/inquiries.int.spec.ts` → FAIL (collection `inquiries` not found).

- [ ] **Step 3: Access** — append to `web/src/payload/access.ts`

```ts
/** Admins see every inquiry; editors only their assigned divisions; the public nothing. */
export const canReadInquiry: Access = ({ req }) => {
  const u = staff(req.user)
  if (!u) return false
  if (u.role === 'admin') return true
  const divisions = u.divisions ?? []
  return divisions.length ? ({ division: { in: divisions } } as Where) : false
}
```

- [ ] **Step 4: Collections**

`web/src/collections/Inquiries.ts`

```ts
import type { CollectionConfig } from 'payload'
import { SITE_KEYS } from '@/sites/config'
import { canReadInquiry, isAdmin } from '@/payload/access'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'division', 'name', 'summary', 'status', 'emailSent', 'createdAt'],
    listSearchableFields: ['reference', 'name', 'email', 'phone'],
    group: 'Leads',
  },
  defaultSort: '-createdAt',
  access: { create: () => false, read: canReadInquiry, update: canReadInquiry, delete: isAdmin },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'division', type: 'select', required: true, options: SITE_KEYS.map((k) => ({ label: k, value: k })), admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, defaultValue: 'quote', options: ['quote', 'contact', 'booking'], admin: { readOnly: true } },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'new',
      options: [{ label: 'New', value: 'new' }, { label: 'Contacted', value: 'contacted' }, { label: 'Closed', value: 'closed' }],
      admin: { position: 'sidebar' },
    },
    { name: 'summary', type: 'text', admin: { readOnly: true } },
    { name: 'name', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'phone', type: 'text', admin: { readOnly: true } },
    { name: 'email', type: 'text', admin: { readOnly: true } },
    { name: 'notes', type: 'textarea', admin: { readOnly: true } },
    { name: 'details', type: 'json', admin: { readOnly: true } },
    { name: 'emailSent', type: 'checkbox', defaultValue: false, label: 'Team email sent', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'customerEmailSent', type: 'checkbox', defaultValue: false, label: 'Customer email sent', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'emailAttempts', type: 'number', defaultValue: 0, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'lastEmailError', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'ipHash', type: 'text', admin: { hidden: true } },
  ],
}
```

`web/src/collections/InquiryCounters.ts`

```ts
import type { CollectionConfig } from 'payload'

/** One row per division; nextReference() increments `value` atomically with raw SQL. */
export const InquiryCounters: CollectionConfig = {
  slug: 'inquiry-counters',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'division', type: 'text', required: true, unique: true },
    { name: 'value', type: 'number', required: true, defaultValue: 0 },
  ],
}
```

`web/src/collections/RateHits.ts`

```ts
import type { CollectionConfig } from 'payload'

/** One row per accepted submission, for the 5-per-10-minutes limit. Pruned daily by the cron. */
export const RateHits: CollectionConfig = {
  slug: 'rate-hits',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [{ name: 'ipHash', type: 'text', required: true, index: true }],
}
```

In `web/src/payload.config.ts`: import the three and set `collections: [Users, Media, Sites, Inquiries, InquiryCounters, RateHits]`.

- [ ] **Step 5: Generate types and migration**

Run: `npm run payload generate:types` → `src/payload-types.ts` gains `Inquiry`, `InquiryCounter`, `RateHit`.
Run: `npm run payload migrate:create inquiries` → new files in `src/migrations/`. Open the `.ts` file and check it creates `inquiries`, `inquiry_counters` (unique index on `division`), `rate_hits` (index on `ip_hash`) and nothing else. If it also contains unrelated drift, stop and report it.

- [ ] **Step 6: Run the tests** — `npx vitest run tests/int/inquiries.int.spec.ts tests/int/sites.int.spec.ts` → PASS (the test DB is push-synced). `npx tsc --noEmit` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/collections src/payload/access.ts src/payload.config.ts src/payload-types.ts src/migrations tests/int/inquiries.int.spec.ts
git commit -m "feat(inquiries): Inquiries, counters and rate-hit collections with division access"
```

---

### Task 5: References, rate limit and the save pipeline

**Files:**
- Create: `web/src/inquiries/reference.ts`, `web/src/inquiries/pipeline.ts`
- Test: `web/tests/int/inquiry-pipeline.int.spec.ts`

**Interfaces:**
- Consumes: `parseQuote`, `QuoteInput`, `FieldErrors` (Task 2); `formatReference`, `hashIp`, `quoteSummary` (Task 3); collections (Task 4).
- Produces:
  - `nextReference(payload: Payload, site: SiteKey): Promise<string>`
  - `type QuoteResult = { ok: true; reference: string; inquiryId: number | string | null } | { ok: false; fieldErrors?: FieldErrors; error?: 'rate' | 'server' }` (`inquiryId` null for a fake success)
  - `processQuote(input: { site: SiteKey; raw: Record<string, unknown>; ip: string; honeypot: string; startedAt: number | null }, deps: { payload: Payload; isBot: () => Promise<boolean>; now: () => Date; salt: string; production: boolean }): Promise<QuoteResult>`

- [ ] **Step 1: Write the failing test** — `web/tests/int/inquiry-pipeline.int.spec.ts`

```ts
import { beforeEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { nextReference } from '@/inquiries/reference'
import { processQuote } from '@/inquiries/pipeline'

let payload: Payload
const NOW = new Date('2026-10-01T16:00:00Z')
const raw = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: '', load: 'pallets', pallets: '2', name: 'Ana', phone: '(619) 555-0100', email: 'ana@example.com', notes: '' }
const deps = () => ({ payload, isBot: async () => false, now: () => NOW, salt: 'test-salt', production: true })
const input = (over: Partial<Parameters<typeof processQuote>[0]> = {}) => ({ site: 'logistics' as const, raw, ip: '203.0.113.9', honeypot: '', startedAt: NOW.getTime() - 30_000, ...over })

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => {
  for (const c of ['inquiries', 'inquiry-counters', 'rate-hits'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('nextReference', () => {
  it('counts per division', async () => {
    expect(await nextReference(payload, 'logistics')).toBe('GX-LOG-000001')
    expect(await nextReference(payload, 'logistics')).toBe('GX-LOG-000002')
    expect(await nextReference(payload, 'homeupgrades')).toBe('GX-HUP-000001')
  })
  it('never hands out the same number twice under concurrency', async () => {
    const refs = await Promise.all(Array.from({ length: 10 }, () => nextReference(payload, 'logistics')))
    expect(new Set(refs).size).toBe(10)
  })
})

describe('processQuote', () => {
  it('saves a valid quote with its reference, summary and hashed IP', async () => {
    const r = await processQuote(input(), deps())
    expect(r).toMatchObject({ ok: true, reference: 'GX-LOG-000001' })
    const { docs } = await payload.find({ collection: 'inquiries' })
    expect(docs[0]).toMatchObject({ reference: 'GX-LOG-000001', division: 'logistics', type: 'quote', name: 'Ana', summary: '92101 → 92024 · 2 pallets', emailSent: false })
    expect(docs[0].ipHash).toMatch(/^[0-9a-f]{64}$/)
    expect(docs[0].details).toMatchObject({ kind: 'business', from: '92101', pallets: 2 })
  })
  it('returns field errors and saves nothing', async () => {
    const r = await processQuote(input({ raw: { ...raw, from: '1' } }), deps())
    expect(r).toEqual({ ok: false, fieldErrors: { from: 'Enter a 5-digit ZIP code.' } })
    expect((await payload.count({ collection: 'inquiries' })).totalDocs).toBe(0)
  })
  it.each([
    ['honeypot', { honeypot: 'http://spam' }, false],
    ['bot', {}, true],
    ['too fast', { startedAt: NOW.getTime() - 500 }, false],
  ])('gives %s a fake success and saves nothing', async (_n, over, bot) => {
    const r = await processQuote(input(over), { ...deps(), isBot: async () => bot })
    expect(r.ok && r.reference).toMatch(/^GX-LOG-\d{6}$/)
    expect(r.ok && r.inquiryId).toBeNull()
    expect((await payload.count({ collection: 'inquiries' })).totalDocs).toBe(0)
  })
  it('refuses the 6th submission from one IP within 10 minutes', async () => {
    for (let i = 0; i < 5; i++) expect((await processQuote(input(), deps())).ok).toBe(true)
    expect(await processQuote(input(), deps())).toEqual({ ok: false, error: 'rate' })
    expect((await processQuote(input({ ip: '198.51.100.1' }), deps())).ok).toBe(true)
  })
  it('does not rate-limit loopback outside production', async () => {
    for (let i = 0; i < 7; i++) expect((await processQuote(input({ ip: '127.0.0.1' }), { ...deps(), production: false })).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run it** — `npx vitest run tests/int/inquiry-pipeline.int.spec.ts` → FAIL (modules not found).

- [ ] **Step 3: Implement** — `web/src/inquiries/reference.ts`

```ts
import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { SITES, type SiteKey } from '@/sites/config'
import { formatReference } from './format'

/** Atomic per-division counter: one statement, so concurrent submissions never share a number.
    A failed insert afterwards leaves a gap, which is fine for a lead reference. */
export async function nextReference(payload: Payload, site: SiteKey): Promise<string> {
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: { value: string | number }[] }> } }).drizzle
  const res = await db.execute(sql`
    INSERT INTO inquiry_counters (division, value, updated_at, created_at)
    VALUES (${site}, 1, now(), now())
    ON CONFLICT (division) DO UPDATE SET value = inquiry_counters.value + 1, updated_at = now()
    RETURNING value`)
  return formatReference(SITES[site].inquiryPrefix, Number(res.rows[0].value))
}
```

`web/src/inquiries/pipeline.ts`

```ts
import type { Payload } from 'payload'
import { SITES, type SiteKey } from '@/sites/config'
import { hashIp, formatReference, quoteSummary } from './format'
import { parseQuote, type FieldErrors } from './schema'
import { nextReference } from './reference'

export type QuoteResult =
  | { ok: true; reference: string; inquiryId: number | string | null }
  | { ok: false; fieldErrors?: FieldErrors; error?: 'rate' | 'server' }

type Input = { site: SiteKey; raw: Record<string, unknown>; ip: string; honeypot: string; startedAt: number | null }
type Deps = { payload: Payload; isBot: () => Promise<boolean>; now: () => Date; salt: string; production: boolean }

const TOO_FAST_MS = 2000
const LIMIT = 5
const WINDOW_MS = 10 * 60 * 1000
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown', ''])

// Looks like a real reference so bots can't tell they were filtered.
const fakeReference = (site: SiteKey) => formatReference(SITES[site].inquiryPrefix, 100 + Math.floor(Math.random() * 9000))

export async function processQuote(input: Input, deps: Deps): Promise<QuoteResult> {
  const now = deps.now()
  const today = new Date(now.getTime() - 8 * 3600_000).toISOString().slice(0, 10) // Pacific date (UTC-8, conservative)
  const parsed = parseQuote(input.raw, today)
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.errors }

  const tooFast = input.startedAt !== null && now.getTime() - input.startedAt < TOO_FAST_MS
  if (input.honeypot || tooFast || (await deps.isBot())) return { ok: true, reference: fakeReference(input.site), inquiryId: null }

  const ipHash = hashIp(input.ip || 'unknown', deps.salt)
  const exempt = !deps.production && LOOPBACK.has(input.ip)
  if (!exempt) {
    const since = new Date(now.getTime() - WINDOW_MS).toISOString()
    const { totalDocs } = await deps.payload.count({ collection: 'rate-hits', where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] } })
    if (totalDocs >= LIMIT) return { ok: false, error: 'rate' }
    await deps.payload.create({ collection: 'rate-hits', data: { ipHash } })
  }

  const q = parsed.data
  const reference = await nextReference(deps.payload, input.site)
  const doc = await deps.payload.create({
    collection: 'inquiries',
    data: {
      reference, division: input.site, type: 'quote', summary: quoteSummary(q),
      name: q.name, phone: q.phone, email: q.email, notes: q.notes,
      details: { kind: q.kind, from: q.from, to: q.to, date: q.date, flexible: q.flexible, load: q.load, pallets: q.pallets },
      ipHash,
    },
  })
  return { ok: true, reference, inquiryId: doc.id }
}
```

Note: `payload.create` here runs with the Local API default `overrideAccess: true`, which is why the collection's `create: () => false` doesn't block it.

- [ ] **Step 4: Run it** — PASS. If the counter test fails on the table/column name, read `src/migrations/*_inquiries.ts` for the real names and fix the SQL.

- [ ] **Step 5: Commit**

```bash
git add src/inquiries/reference.ts src/inquiries/pipeline.ts tests/int/inquiry-pipeline.int.spec.ts
git commit -m "feat(inquiries): atomic references, spam checks, rate limit, save-first pipeline"
```

---

### Task 6: Email delivery and retries

**Files:**
- Create: `web/src/inquiries/deliver.ts`
- Test: `web/tests/int/inquiry-deliver.int.spec.ts`

**Interfaces:**
- Consumes: `teamEmail`, `customerEmail` (Task 3); `getSiteData` from `@/sites/data` is NOT used here (server-only cache); phone is passed in.
- Produces:
  - `type Mail = { from: string; to: string; replyTo?: string; subject: string; html: string; text: string; idempotencyKey: string }`
  - `type Mailer = (m: Mail) => Promise<void>` (throws on failure)
  - `createMailer(env: Record<string, string | undefined>): Mailer` — Resend when `RESEND_API_KEY` set, else logs
  - `deliverInquiry(payload: Payload, id: number | string, mailer: Mailer, opts: { env: Record<string, string | undefined>; phone: string | null; adminOrigin: string }): Promise<void>`
  - `retryUnsent(payload: Payload, mailer: Mailer, opts: { env: Record<string, string | undefined>; phoneFor: (site: SiteKey) => Promise<string | null>; adminOrigin: string; now: Date }): Promise<{ retried: number; pruned: number }>`

- [ ] **Step 1: Write the failing test** — `web/tests/int/inquiry-deliver.int.spec.ts`

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { deliverInquiry, retryUnsent, type Mail } from '@/inquiries/deliver'

let payload: Payload
const env = { INQUIRY_TO: 'hello@thegenixgroup.com', INQUIRY_FROM: 'quotes@thegenixgroup.com' }
const opts = { env, phone: '(619) 555-0100', adminOrigin: 'https://thegenixgroup.com' }
const details = { kind: 'business', from: '92101', to: '92024', date: '2026-10-05', flexible: false, load: 'pallets', pallets: 2 }
async function make(over: Record<string, unknown> = {}) {
  return payload.create({ collection: 'inquiries', data: { reference: `GX-LOG-${String(Math.random()).slice(2, 8)}`, division: 'logistics', type: 'quote', name: 'Ana', phone: '(619) 555-0100', email: 'ana@example.com', details, summary: 's', ...over } })
}

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { for (const c of ['inquiries', 'rate-hits'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } }) })

describe('deliverInquiry', () => {
  it('sends team and customer mail with idempotency keys and marks both sent', async () => {
    const sent: Mail[] = []
    const doc = await make()
    await deliverInquiry(payload, doc.id, async (m) => { sent.push(m) }, opts)
    expect(sent.map((m) => [m.to, m.replyTo, m.idempotencyKey])).toEqual([
      ['hello@thegenixgroup.com', 'ana@example.com', `${doc.reference}:team`],
      ['ana@example.com', 'hello@thegenixgroup.com', `${doc.reference}:customer`],
    ])
    expect(sent[0].from).toBe('Genix Logistics <quotes@thegenixgroup.com>')
    const after = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect([after.emailSent, after.customerEmailSent, after.emailAttempts]).toEqual([true, true, 1])
  })
  it('retries once immediately, then records the failure without throwing', async () => {
    let calls = 0
    const doc = await make({ email: null })
    await deliverInquiry(payload, doc.id, async () => { calls++; throw new Error('resend down') }, opts)
    expect(calls).toBe(2)
    const after = await payload.findByID({ collection: 'inquiries', id: doc.id })
    expect([after.emailSent, after.emailAttempts, after.lastEmailError]).toEqual([false, 1, 'resend down'])
  })
  it('skips mails already sent', async () => {
    const sent: Mail[] = []
    const doc = await make({ emailSent: true })
    await deliverInquiry(payload, doc.id, async (m) => { sent.push(m) }, opts)
    expect(sent.map((m) => m.idempotencyKey)).toEqual([`${doc.reference}:customer`])
  })
})

describe('retryUnsent', () => {
  it('retries only unsent inquiries under 5 attempts and prunes old rate hits', async () => {
    const a = await make()
    await make({ emailSent: true, customerEmailSent: true })
    await make({ emailAttempts: 5 })
    await payload.create({ collection: 'rate-hits', data: { ipHash: 'x' } })
    const sent: Mail[] = []
    const r = await retryUnsent(payload, async (m) => { sent.push(m) }, { env, phoneFor: async () => null, adminOrigin: 'https://thegenixgroup.com', now: new Date(Date.now() + 2 * 86_400_000) })
    expect(r).toEqual({ retried: 1, pruned: 1 })
    expect(sent.every((m) => m.idempotencyKey.startsWith(a.reference))).toBe(true)
  })
})
```

- [ ] **Step 2: Run it** — `npx vitest run tests/int/inquiry-deliver.int.spec.ts` → FAIL.

- [ ] **Step 3: Implement** — `web/src/inquiries/deliver.ts`

```ts
import type { Payload } from 'payload'
import { Resend } from 'resend'
import { SITES, type SiteKey } from '@/sites/config'
import { customerEmail, teamEmail } from './email'
import type { QuoteInput } from './schema'

type Env = Record<string, string | undefined>
export type Mail = { from: string; to: string; replyTo?: string; subject: string; html: string; text: string; idempotencyKey: string }
export type Mailer = (m: Mail) => Promise<void>

const MAX_ATTEMPTS = 5

export function createMailer(env: Env): Mailer {
  if (!env.RESEND_API_KEY) {
    return async (m) => { console.info(`[inquiry email: not sent, no RESEND_API_KEY] to=${m.to} subject="${m.subject}"\n${m.text}`) }
  }
  const resend = new Resend(env.RESEND_API_KEY)
  return async (m) => {
    const { error } = await resend.emails.send(
      { from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, html: m.html, text: m.text },
      { idempotencyKey: m.idempotencyKey },
    )
    if (error) throw new Error(error.message)
  }
}

async function twice(fn: () => Promise<void>) {
  try { await fn() } catch { await fn() }
}

export async function deliverInquiry(payload: Payload, id: number | string, mailer: Mailer, opts: { env: Env; phone: string | null; adminOrigin: string }): Promise<void> {
  const doc = await payload.findByID({ collection: 'inquiries', id })
  const site = doc.division as SiteKey
  const d = (doc.details ?? {}) as Partial<QuoteInput>
  const q: QuoteInput = {
    kind: d.kind === 'move' ? 'move' : 'business', from: d.from ?? '', to: d.to ?? '', date: d.date ?? null, flexible: Boolean(d.flexible),
    load: d.load ?? '', pallets: d.pallets ?? null, name: doc.name, phone: doc.phone ?? null, email: doc.email ?? null, notes: doc.notes ?? null,
  }
  const from = `Genix ${SITES[site].shortName} <${opts.env.INQUIRY_FROM || 'quotes@thegenixgroup.com'}>`
  const inbox = opts.env.INQUIRY_TO || 'hello@thegenixgroup.com'
  const update: Record<string, unknown> = { emailAttempts: (doc.emailAttempts ?? 0) + 1 }
  const errors: string[] = []

  if (!doc.emailSent) {
    const e = teamEmail({ site, reference: doc.reference, q, adminUrl: `${opts.adminOrigin}/admin/collections/inquiries/${doc.id}` })
    try {
      await twice(() => mailer({ from, to: inbox, replyTo: q.email ?? undefined, ...e, idempotencyKey: `${doc.reference}:team` }))
      update.emailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  if (q.email && !doc.customerEmailSent) {
    const e = customerEmail({ site, reference: doc.reference, q, phone: opts.phone })
    try {
      await twice(() => mailer({ from, to: q.email!, replyTo: inbox, ...e, idempotencyKey: `${doc.reference}:customer` }))
      update.customerEmailSent = true
    } catch (err) { errors.push((err as Error).message) }
  }
  update.lastEmailError = errors.length ? errors.join(' | ').slice(0, 500) : null
  await payload.update({ collection: 'inquiries', id: doc.id, data: update })
}

export async function retryUnsent(payload: Payload, mailer: Mailer, opts: { env: Env; phoneFor: (site: SiteKey) => Promise<string | null>; adminOrigin: string; now: Date }) {
  const { docs } = await payload.find({
    collection: 'inquiries', limit: 100, depth: 0,
    where: { and: [{ emailAttempts: { less_than: MAX_ATTEMPTS } }, { or: [{ emailSent: { equals: false } }, { and: [{ customerEmailSent: { equals: false } }, { email: { exists: true } }] }] }] },
  })
  for (const doc of docs) {
    await deliverInquiry(payload, doc.id, mailer, { env: opts.env, phone: await opts.phoneFor(doc.division as SiteKey), adminOrigin: opts.adminOrigin })
  }
  const cutoff = new Date(opts.now.getTime() - 86_400_000).toISOString()
  const pruned = await payload.delete({ collection: 'rate-hits', where: { createdAt: { less_than: cutoff } } })
  return { retried: docs.length, pruned: pruned.docs.length }
}
```

If Resend's types differ (Step 1 of Task 1), adapt `createMailer` only.

- [ ] **Step 4: Run it** — PASS. `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/inquiries/deliver.ts tests/int/inquiry-deliver.int.spec.ts
git commit -m "feat(inquiries): Resend delivery with idempotency, immediate retry and sweep"
```

---

### Task 7: Server action, form wiring and the no-JS result page

**Files:**
- Create: `web/src/inquiries/actions.ts`, `web/src/app/(sites)/[site]/quote/sent/page.tsx`, `web/src/instrumentation-client.ts` (BotID; merge if one exists)
- Modify: `web/next.config.ts` (wrap with `withBotId`), `web/src/pages-home/logistics/sections/Hero.tsx`, `web/src/components/motion/QuoteForm.tsx`, `web/src/sites/config.ts` (no change to `pages`: the sent page is not in the sitemap)
- Test: `web/tests/e2e/quote-submit.e2e.spec.ts`; update `web/tests/e2e/logistics-home.e2e.spec.ts` where it asserts the old fake confirmation text or the no-JS note

**Interfaces:**
- Consumes: `processQuote`, `QuoteResult` (Task 5); `deliverInquiry`, `createMailer` (Task 6); `inquirySendMode` (Task 1); `rateLimitedMessage`, `serverErrorMessage` (Task 3); `getSiteData(site)`; `siteOrigin('hub')`.
- Produces: `submitQuote(prev: QuoteResult | null, formData: FormData): Promise<QuoteResult>` — with `js=1` returns the result; without it redirects. `submitQuoteForm(formData: FormData): Promise<void>` — the form's `action`.

- [ ] **Step 1: Read the Next docs** — `node_modules/next/dist/docs/` guides for Server Actions (`'use server'`, `redirect` inside actions, progressive enhancement), `after`, and `headers`. Read `node_modules/botid/README.md` for Next.js setup. Note deviations in the report.

- [ ] **Step 2: Write the failing e2e test** — `web/tests/e2e/quote-submit.e2e.spec.ts`

```ts
import { expect, test } from '@playwright/test'

// Dev server runs in "preview" mode: submissions are saved to the local DB and emails go to the log.
const URL = 'http://logistics.localhost:3000/'

async function fillStep1(page: import('@playwright/test').Page) {
  await page.fill('#qFrom', '92101')
  await page.fill('#qTo', '92024')
  await page.check('#qFlex')
  await page.selectOption('#qLoad', 'parcels')
}

test('JS: a complete request gets a real reference', async ({ page }) => {
  await page.goto(URL)
  await page.waitForTimeout(2200) // past the 2 s "too fast" guard
  await fillStep1(page)
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Test')
  await page.fill('#qEmail', 'e2e@test.local')
  await page.click('#qSend')
  await expect(page.locator('#qSent')).toBeVisible()
  await expect(page.locator('#qRef')).toHaveText(/^GX-LOG-\d{6}$/)
  await expect(page.locator('#qSent')).toContainText('within two business days')
})

test('JS: server field errors show inline', async ({ page }) => {
  await page.goto(URL)
  await page.waitForTimeout(2200)
  await fillStep1(page)
  await page.click('#qNext')
  await page.fill('#qName', 'E2E Test')
  await page.fill('#qPhone', '555-0100') // too short: client catches it first, same message as the server
  await page.click('#qSend')
  await expect(page.locator('#qPhoneErr')).toHaveText('Enter a phone number with area code.')
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('posts and lands on the sent page', async ({ page }) => {
    await page.goto(URL)
    await page.fill('#qFrom', '92101')
    await page.fill('#qTo', '92024')
    await page.check('#qFlex')
    await page.selectOption('#qLoad', 'parcels')
    await page.fill('#qName', 'E2E NoJS')
    await page.fill('#qPhone', '(619) 555-0100')
    await page.click('#qSend')
    await expect(page).toHaveURL(/\/quote\/sent\?ref=GX-LOG-\d{6}$/)
    await expect(page.getByRole('heading', { name: 'Request received.' })).toBeVisible()
  })
})
```

- [ ] **Step 3: Run it** — `npx playwright test tests/e2e/quote-submit.e2e.spec.ts --reporter=line` → FAIL (reference stays "Request received"; no-JS does nothing).

- [ ] **Step 4: Server action** — `web/src/inquiries/actions.ts`

```ts
'use server'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { checkBotId } from 'botid/server'
import config from '@payload-config'
import { isSiteKey, siteOrigin, type SiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { formDataToRaw } from './schema'
import { processQuote, type QuoteResult } from './pipeline'
import { createMailer, deliverInquiry } from './deliver'
import { inquirySendMode } from './mode'

const FORM_SITES: SiteKey[] = ['logistics']

export async function submitQuote(_prev: QuoteResult | null, formData: FormData): Promise<QuoteResult> {
  const js = formData.get('js') === '1'
  const siteRaw = String(formData.get('site') ?? '')
  const site: SiteKey = isSiteKey(siteRaw) && FORM_SITES.includes(siteRaw) ? siteRaw : 'logistics'
  let result: QuoteResult
  if (inquirySendMode(process.env) === 'offline') {
    result = { ok: false, error: 'server' } // the enhancer never calls this in offline mode; a no-JS post lands here
  } else {
    try {
      const h = await headers()
      const ip = (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim()
      const payload = await getPayload({ config })
      const t = Number(formData.get('t'))
      result = await processQuote(
        { site, raw: formDataToRaw(formData), ip, honeypot: String(formData.get('company_site') ?? ''), startedAt: Number.isFinite(t) && t > 0 ? t : null },
        {
          payload,
          isBot: async () => (await checkBotId()).isBot,
          now: () => new Date(),
          salt: process.env.IP_HASH_SALT || 'dev-only-salt',
          production: process.env.VERCEL_ENV === 'production',
        },
      )
      if (result.ok && result.inquiryId !== null) {
        const id = result.inquiryId
        const phone = (await getSiteData(site)).phone
        after(() => deliverInquiry(payload, id, createMailer(process.env), { env: process.env, phone, adminOrigin: siteOrigin('hub') }).catch((e) => console.error('deliverInquiry', e)))
      }
    } catch (err) {
      console.error('submitQuote failed', err)
      result = { ok: false, error: 'server' }
    }
  }
  if (js) return result
  if (result.ok) redirect(`/quote/sent?ref=${encodeURIComponent(result.reference)}`)
  redirect(`/quote/sent?error=${result.fieldErrors ? 'invalid' : result.error}`)
}
```

- [ ] **Step 5: BotID setup** — follow `node_modules/botid/README.md`: wrap the export in `web/next.config.ts` with `withBotId(...)`, and create `web/src/instrumentation-client.ts`:

```ts
import { initBotId } from 'botid/client/core'

// The quote form posts its Server Action to the Logistics home page.
initBotId({ protect: [{ path: '/', method: 'POST' }] })
```

(BotID reports `isBot: false` in local development.)

- [ ] **Step 6: Form markup** — in `Hero.tsx`:
  - In `actions.ts` also export the one-argument form action used by a plain (no-JS) post:
    ```ts
    export async function submitQuoteForm(formData: FormData): Promise<void> {
      await submitQuote(null, formData) // no `js` field, so submitQuote redirects to /quote/sent
    }
    ```
  - `import { submitQuoteForm } from '@/inquiries/actions'` and replace the form's `action="#" method="dialog"` with `action={submitQuoteForm}`.
  - Inside the form add `<input type="hidden" name="site" value="logistics" />` and `<input type="hidden" name="t" id="qT" />`.
  - Replace `<p className="mono no-js-note">Online requests aren&apos;t available yet — call or email us.</p>` with `<p className="mono privacy-note">We use your details only to reply to this request. Questions? <a href="mailto:hello@thegenixgroup.com">hello@thegenixgroup.com</a></p>`.
  - In `#qSent`, replace `We&apos;ll call you back <span className="ph">within one business day</span> with a price.` with `We&apos;ll get back to you within two business days with a price.`
  - Apply the same two text changes to `design/logistics-home.html` so parity holds, then `npm run port:css` only if CSS changed (it should not).

- [ ] **Step 7: Enhancer** — in `QuoteForm.tsx`:
  - `import { submitQuote } from '@/inquiries/actions'` and `import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'`.
  - At start (after `form.noValidate = true`): `$('qT').value = String(Date.now())`.
  - In the `submit` listener, first line becomes `e.preventDefault(); e.stopImmediatePropagation()` (stops React's own form-action handling so only this path posts).
  - Replace the block from `form.querySelector<HTMLElement>('.kind')!.hidden = true` to the end of the handler with:

```ts
      const send = $('qSend') as unknown as HTMLButtonElement
      send.disabled = true
      const fd = new FormData(form)
      fd.set('js', '1')
      const phone = form.dataset.phone || null
      submitQuote(null, fd)
        .then((r) => {
          if (r.ok) {
            form.querySelector<HTMLElement>('.kind')!.hidden = true
            step1.hidden = true
            step2.hidden = true
            $('qRef').textContent = r.reference
            $('qSent').hidden = false
            status.textContent = ''
            bringIntoView()
            $('qSent').focus({ preventScroll: true })
            return
          }
          if (r.fieldErrors) {
            const order = ['from', 'to', 'date', 'load', 'pallets', 'name', 'phone', 'email'] as const
            const ids: Record<string, string> = { from: 'qFrom', to: 'qTo', date: 'qDate', load: 'qLoad', pallets: 'qPallets', name: 'qName', phone: 'qPhone', email: 'qEmail' }
            const bad = order.filter((k) => r.fieldErrors![k]).map((k) => { const el = $(ids[k]); setErr(el, r.fieldErrors![k]!); return el })
            if (bad.some((el) => step1.contains(el))) goStep(1)
            report(bad)
            return
          }
          status.classList.remove('sr-only')
          status.textContent = r.error === 'rate' ? rateLimitedMessage(phone) : serverErrorMessage(phone)
          status.focus()
        })
        .catch(() => {
          status.classList.remove('sr-only')
          status.textContent = serverErrorMessage(phone)
          status.focus()
        })
        .finally(() => { send.disabled = false })
```

  - Add `data-phone={data.phone ?? ''}` to the `<form>` in `Hero.tsx`.
  - In the cleanup function add `$('qT').value = ''` and `status.classList.add('sr-only')` stays.
  - Update the doc comment at the top: the form now sends through `submitQuote`; offline mode still shows the call/email message.

- [ ] **Step 8: No-JS result page** — `web/src/app/(sites)/[site]/quote/sent/page.tsx`

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'

export const metadata: Metadata = { title: 'Request', robots: { index: false, follow: false } }

const REF = /^GX-[A-Z]{3}-\d{6}$/

export default async function QuoteSent({ params, searchParams }: { params: Promise<{ site: string }>; searchParams: Promise<{ ref?: string; error?: string }> }) {
  const { site } = await params
  if (!isSiteKey(site) || site !== 'logistics') notFound()
  const { ref, error } = await searchParams
  const { phone } = await getSiteData(site)
  const ok = typeof ref === 'string' && REF.test(ref)
  const message = ok
    ? "We'll get back to you within two business days with a price."
    : error === 'rate' ? rateLimitedMessage(phone)
    : error === 'invalid' ? 'Some answers need another look. Go back to the form and check the highlighted fields.'
    : serverErrorMessage(phone)
  return (
    <main id="main" className="wrap" style={{ padding: '120px 0 96px' }}>
      <div className="label-card" style={{ maxWidth: 560 }}>
        <p className="label-ref mono"><span>{ok ? ref : 'Quote request'}</span></p>
        <h1 className="sent-title">{ok ? 'Request received.' : "Couldn't send."}</h1>
        <p>{message}</p>
        <p><a className="btn btn-ghost" href="/#quote-form">Back to the form</a></p>
      </div>
    </main>
  )
}
```

Check how `src/app/(sites)/[site]/[...rest]/page.tsx` renders the logistics chrome/theme and match its wrapper so the page gets the header, footer and styles; adjust class names if the logistics CSS scopes `.label-card` under a parent.

- [ ] **Step 9: Update existing tests** — run `npx playwright test tests/e2e/logistics-home.e2e.spec.ts --reporter=line`; update assertions that expect the fake "Request received" without a server call, the removed no-JS note, or `within one business day`. Keep each test's intent. Add a links check: `tests/e2e/links.e2e.spec.ts` needs no change.

- [ ] **Step 10: Run** — `npx playwright test tests/e2e/quote-submit.e2e.spec.ts tests/e2e/logistics-home.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/quality.e2e.spec.ts --reporter=line` → all pass. `npx vitest run tests/unit` and `npx tsc --noEmit` → pass.

- [ ] **Step 11: Commit**

```bash
git add src/inquiries/actions.ts "src/app/(sites)/[site]/quote" src/instrumentation-client.ts next.config.ts src/pages-home/logistics src/components/motion/QuoteForm.tsx ../design/logistics-home.html tests/e2e package.json package-lock.json
git commit -m "feat(logistics): quote form sends through submitQuote; no-JS result page; BotID"
```

---

### Task 8: Daily cron, admin resend button and inbox summary

**Files:**
- Create: `web/src/app/(sites)/[site]/cron/inquiries/route.ts`, `web/src/inquiries/admin/ResendButton.tsx`, `web/src/inquiries/admin/InboxSummary.tsx`
- Modify: `web/vercel.json`, `web/src/collections/Inquiries.ts` (endpoint, ui field, `beforeListTable`), `web/src/sites/routing.ts` only if `/cron/…` needs to bypass anything (it should not)
- Generated (commit): `web/src/app/(payload)/admin/importMap.js`
- Test: `web/tests/int/inquiry-admin.int.spec.ts`

**Interfaces:**
- Consumes: `retryUnsent`, `deliverInquiry`, `createMailer` (Task 6); `canReadInquiry` (Task 4); `getSiteData`.
- Produces: `GET /cron/inquiries` (hub host; `Authorization: Bearer <CRON_SECRET>`); `POST /api/inquiries/:id/resend` (logged-in staff with read access to that inquiry); `resendInquiry(payload: Payload, id: number | string, user: unknown, mailer: Mailer, phone?: string | null): Promise<void>` in `deliver.ts`.

- [ ] **Step 1: Write the failing test** — `web/tests/int/inquiry-admin.int.spec.ts`

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { resendInquiry } from '@/inquiries/deliver'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['inquiries', 'users'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('resendInquiry (admin button)', () => {
  it('lets an editor resend only inquiries of their divisions', async () => {
    await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: 'test-pass-1' } })
    const editor = await payload.create({ collection: 'users', data: { email: 'ed@test.local', password: 'test-pass-2', role: 'editor', divisions: ['homeupgrades'] } })
    const doc = await payload.create({ collection: 'inquiries', data: { reference: 'GX-LOG-000009', division: 'logistics', type: 'quote', name: 'Ana', phone: '(619) 555-0100', details: {}, summary: 's' } })
    const mailer = async () => {}
    await expect(resendInquiry(payload, doc.id, editor, mailer)).rejects.toThrow()
    await payload.update({ collection: 'users', id: editor.id, data: { divisions: ['logistics'] } })
    const ed2 = await payload.findByID({ collection: 'users', id: editor.id })
    await resendInquiry(payload, doc.id, ed2, mailer)
    expect((await payload.findByID({ collection: 'inquiries', id: doc.id })).emailSent).toBe(true)
  })
})
```

- [ ] **Step 2: Run it** → FAIL (`resendInquiry` not exported).

- [ ] **Step 3: Implement `resendInquiry`** — append to `web/src/inquiries/deliver.ts`

```ts
import type { TypedUser } from 'payload'

/** Admin button: checks the user may read this inquiry (throws otherwise), then delivers now. */
export async function resendInquiry(payload: Payload, id: number | string, user: TypedUser | unknown, mailer: Mailer, phone: string | null = null) {
  await payload.findByID({ collection: 'inquiries', id, overrideAccess: false, user: user as TypedUser })
  await deliverInquiry(payload, id, mailer, { env: process.env, phone, adminOrigin: process.env.NEXT_PUBLIC_SERVER_URL || '' })
}
```

(If `TypedUser` isn't exported by this Payload version, use the generated `User` type from `@/payload-types`.)

- [ ] **Step 4: Endpoint, button, summary** — in `Inquiries.ts` add:

```ts
  endpoints: [
    {
      path: '/:id/resend',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const id = req.routeParams?.id as string
        try {
          const { resendInquiry, createMailer } = await import('@/inquiries/deliver')
          await resendInquiry(req.payload, id, req.user, createMailer(process.env))
          const doc = await req.payload.findByID({ collection: 'inquiries', id, depth: 0 })
          return Response.json({ emailSent: doc.emailSent, customerEmailSent: doc.customerEmailSent, lastEmailError: doc.lastEmailError ?? null })
        } catch {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
      },
    },
  ],
```

and to `fields` (after `lastEmailError`):

```ts
    { name: 'resend', type: 'ui', admin: { position: 'sidebar', components: { Field: '@/inquiries/admin/ResendButton#ResendButton' } } },
```

and to `admin`: `components: { beforeListTable: ['@/inquiries/admin/InboxSummary#InboxSummary'] }`.

`web/src/inquiries/admin/ResendButton.tsx`

```tsx
'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

export function ResendButton() {
  const { id } = useDocumentInfo()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle')
  const [note, setNote] = useState('')
  if (!id) return null
  async function resend() {
    setState('sending')
    const res = await fetch(`/api/inquiries/${id}/resend`, { method: 'POST', credentials: 'include' })
    const body = (await res.json().catch(() => ({}))) as { emailSent?: boolean; lastEmailError?: string | null }
    setState(res.ok && body.emailSent ? 'done' : 'failed')
    setNote(res.ok ? (body.emailSent ? 'Email sent. Reload to see the updated status.' : `Still not sent: ${body.lastEmailError ?? 'unknown error'}`) : 'Could not resend.')
  }
  return (
    <div style={{ marginBottom: 24 }}>
      <button type="button" className="btn btn--style-secondary btn--size-small" onClick={resend} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send email again'}
      </button>
      {note && <p role="status" style={{ marginTop: 8 }}>{note}</p>}
    </div>
  )
}
```

`web/src/inquiries/admin/InboxSummary.tsx`

```tsx
import type { Payload, TypedUser } from 'payload'

/** Above the Inquiries list: "3 new · 1 email not sent", scoped by the viewer's access. */
export async function InboxSummary({ payload, user }: { payload: Payload; user?: TypedUser }) {
  const scope = { overrideAccess: false, user } as const
  const [fresh, unsent] = await Promise.all([
    payload.count({ collection: 'inquiries', where: { status: { equals: 'new' } }, ...scope }),
    payload.count({ collection: 'inquiries', where: { emailSent: { equals: false } }, ...scope }),
  ])
  const parts = [`${fresh.totalDocs} new`]
  if (unsent.totalDocs) parts.push(`⚠ ${unsent.totalDocs} email${unsent.totalDocs === 1 ? '' : 's'} not sent`)
  return <p style={{ margin: '0 0 16px', fontWeight: 600 }}>{parts.join(' · ')}</p>
}
```

Check which props Payload 3.90.2 passes to `beforeListTable` server components (look at `node_modules/@payloadcms/ui` / `@payloadcms/next` types for `BeforeListTableServerProps`); if `user` isn't passed, read it from `req` in the props. Then run `npm run payload generate:importmap` and commit the regenerated `importMap.js`.

- [ ] **Step 5: Cron route** — `web/src/app/(sites)/[site]/cron/inquiries/route.ts`

```ts
import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteKey } from '@/sites/config'
import { siteOrigin } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { createMailer, retryUnsent } from '@/inquiries/deliver'

// Vercel Cron (vercel.json) calls /cron/inquiries daily; proxy.ts rewrites it to /hub/cron/inquiries.
export async function GET(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (site !== 'hub') return new Response('Not found', { status: 404 })
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  const payload = await getPayload({ config })
  const result = await retryUnsent(payload, createMailer(process.env), {
    env: process.env,
    phoneFor: async (s: SiteKey) => (await getSiteData(s)).phone,
    adminOrigin: siteOrigin('hub'),
    now: new Date(),
  })
  return Response.json(result)
}
```

`web/vercel.json`:

```json
{
  "buildCommand": "npm run build:vercel",
  "crons": [{ "path": "/cron/inquiries", "schedule": "0 14 * * *" }]
}
```

- [ ] **Step 6: Verify the cron route locally** — with the dev server running and `CRON_SECRET` unset: `curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/cron/inquiries` → `401`. Add a line to `tests/e2e/sites.e2e.spec.ts`: `request.get('http://localhost:3000/cron/inquiries')` → status 401.

- [ ] **Step 7: Run** — `npx vitest run tests/int tests/unit` → pass; `npx tsc --noEmit` → exit 0; `npx playwright test tests/e2e/sites.e2e.spec.ts --reporter=line` → pass. Log into `/admin` locally and check the Inquiries list shows the summary line and an inquiry shows "Send email again" (screenshot for the report).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(sites)/[site]/cron" src/inquiries src/collections/Inquiries.ts "src/app/(payload)/admin/importMap.js" vercel.json tests
git commit -m "feat(inquiries): daily retry cron, admin resend button and inbox summary"
```

---

### Task 9: Full verification and docs

**Files:**
- Modify: `web/README.md` (known issues / enquiry section final check), `docs/superpowers/specs/2026-09-30-enquiry-pipeline-design.md` (rulings 1–7 folded in)

- [ ] **Step 1:** `npx tsc --noEmit`, `npx vitest run` (unit + int), `npx playwright test --reporter=line` (whole suite) → all green. Fix anything this plan broke.
- [ ] **Step 2:** Patch the spec with the Rulings section of this plan (references may have gaps; no-JS result page; list summary instead of nav badge; loopback exemption; `t` only with JS; kind `business|move`; admin e2e → int tests).
- [ ] **Step 3:** Commit: `git commit -am "docs: enquiry pipeline spec matches the build"`.

---

## Self-review notes

- Spec coverage: data (T4), references (T5), validation (T2), spam + rate limit (T5, T7 BotID), save-first (T5), emails + idempotency + retry (T6), daily cron + admin button (T8), live/offline switch (T1, T7), privacy line (T7), env docs (T1), tests (every task, full run T9).
- Names used across tasks: `inquirySendMode`, `parseQuote`, `formDataToRaw`, `QuoteInput`, `FieldErrors`, `formatReference`, `hashIp`, `quoteSummary`, `teamSubject`, `teamEmail`, `customerEmail`, `rateLimitedMessage`, `serverErrorMessage`, `nextReference`, `processQuote`, `QuoteResult`, `Mail`, `Mailer`, `createMailer`, `deliverInquiry`, `retryUnsent`, `resendInquiry`, `submitQuote`.
