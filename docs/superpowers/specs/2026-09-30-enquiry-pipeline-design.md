# Enquiry pipeline — design

**Date:** 2026-09-30 · **Status:** approved in brainstorming, awaiting spec review
**Parent spec:** `2026-09-27-genix-websites-design.md` §4a (this document refines it; where they differ, this one wins)
**Scope:** the send pipeline + switching on the existing Logistics quote form. Home Upgrades / Multimedia forms, division contact pages and Privacy pages are out of scope and will reuse this pipeline.

## Decisions (owner, 2026-09-30)

- Approach: a Next.js **Server Action** (`submitQuote`) — no separate API route.
- Vercel plan is **Hobby**: cron runs at most daily, so retries are immediate + daily sweep + a manual admin button (replaces §4a's 15-minute cron).
- Emails: team mail to **one group inbox** (`hello@thegenixgroup.com`), sent **from `quotes@thegenixgroup.com`**, Reply-To the customer (team mail) or `hello@` (auto-reply).
- Customer promise: **"We'll get back to you within two business days."**
- The live form stays look-only until `RESEND_API_KEY` and `INQUIRY_TO` are both set.

## 1. Data (Payload collections)

### `inquiries` (admin lead inbox)

| Field | Type | Notes |
|---|---|---|
| `reference` | text, unique, read-only | `GX-<PREFIX>-<6 digits>`, e.g. `GX-LOG-000001`; one sequence per division; prefix from `SITES[site].inquiryPrefix` |
| `division` | select (`SITE_KEYS`) | `logistics` this round |
| `type` | select `quote` \| `contact` \| `booking` | `quote` this round |
| `name` | text, required | |
| `phone`, `email` | text | at least one required (schema rule) |
| `details` | json | form-specific answers. Logistics: `kind` (`freight`\|`move`), `from`, `to` (5-digit ZIPs), `date` (ISO), `flexible` (bool), `load`, `pallets` (number, when shown) |
| `notes` | textarea | |
| `status` | select `new` → `contacted` → `closed`, default `new` | staff-editable |
| `emailSent` | checkbox, default false | true once the **team** email is accepted by Resend |
| `customerEmailSent` | checkbox, default false | true once the auto-reply is accepted (stays false when no email was given) |
| `emailAttempts` | number, default 0 | |
| `lastEmailError` | text, read-only | |
| `ipHash` | text, hidden | HMAC-SHA-256(IP, `IP_HASH_SALT`), hex |

Access (enforced in the collection, so it also covers REST/GraphQL):
- `create`: nobody through the API (`() => false`); the server action writes with `overrideAccess: true`.
- `read` / `update`: admins — all; editors — only `division ∈ user.divisions`.
- `delete`: admins only.

### Internal collections (hidden from the admin nav)

- `inquiry-counters`: `{ division (unique), value (number) }`. The next number is taken with one atomic `UPDATE … SET value = value + 1 … RETURNING value` (insert-on-conflict for the first row), inside the same transaction as the inquiry insert.
- `rate-hits`: `{ ipHash, createdAt }`, indexed on `(ipHash, createdAt)`. Rows older than 24 h are deleted by the daily cron.

Both go through Payload migrations; no hand-written schema.

## 2. Submit flow — `submitQuote(prevState, formData)`

1. **Validate** with a zod schema in `src/inquiries/schema.ts`, shared by the client enhancer and the server. Messages are the prototype's exact strings (e.g. "Enter a 5-digit ZIP code.", "Enter your name.", "Add a phone number or an email so we can reply.", "Enter a phone number with area code.", "Enter an email like name@company.com."). Invalid → return `{ ok: false, fieldErrors }`.
2. **Spam** — any of these returns a **fake success** (random-looking reference, nothing saved, no email):
   - honeypot `company_site` non-empty;
   - Vercel BotID `checkBotId()` reports a bot;
   - hidden timestamp `t` shows the form was submitted < 2 s after render.
3. **Rate limit**: > 5 `rate-hits` for this `ipHash` in the last 10 minutes → `{ ok: false, formError: "Too many requests. Please call us at <phone>." }` (phone from the Sites record; without one: "…Please email hello@thegenixgroup.com."). Otherwise record a hit.
4. **Save** the inquiry with its reference in one transaction.
5. **Email** (§3): one attempt + one immediate retry. Email errors never reach the visitor.
6. **Return** `{ ok: true, reference }`.

Unexpected server/DB error → `{ ok: false, formError: "Couldn't send. Try again, or call <phone>." }`; the client keeps every input.

### What the visitor sees

| | With JS (enhancer) | Without JS |
|---|---|---|
| Success | existing "Request received" card, `#qRef` shows the real reference; focused + announced | server redirects (303) to `/quote/sent?ref=GX-LOG-000001`: a small themed page with the same card |
| Field errors | inline, as today (client validation runs first; server errors map to the same fields) | the action returns errors; the no-JS page re-renders the form with messages and values kept |
| Rate limit / server error | message in the form's status line, inputs kept | same message on the returned page |

The form element changes from `action="#" method="dialog"` to the server action. The enhancer keeps its two-step UI and validation and calls the action instead of faking success.

### Live vs look-only

`quoteSendMode(env)` becomes:
- `live` — `RESEND_API_KEY` and `INQUIRY_TO` both set (any environment);
- `offline` — production without them: the honest "We can't take requests online yet…" message (current behaviour);
- `preview` — non-production without them: the pipeline runs and saves, emails go to the server log.

## 3. Emails (Resend)

New dependencies: `resend`, `zod`, `botid` (none installed today). HTML + plain-text bodies built by small functions in `src/inquiries/email.ts`, brand colours inline, no template library.

**Team email**
- To `INQUIRY_TO`; From `Genix <Division> <INQUIRY_FROM>`; Reply-To the customer's email when given.
- Subject: `[Logistics] Quote · 92101 → 92024 · 2 pallets · GX-LOG-000001` (builder omits missing parts).
- Body: table of every answer, `tel:` link for the phone, link to the inquiry in `/admin`.

**Customer auto-reply** (only when an email was given)
- To the customer; From as above; Reply-To `INQUIRY_TO`.
- Subject: `We got your request · GX-LOG-000001`.
- Body: "Thanks, <name>. We'll get back to you within two business days." + summary of their answers + reference + the division's phone.

**Delivery**
- The two emails are sent independently; only the team email sets `emailSent`.
- Each send uses a Resend idempotency key `<reference>:team` / `<reference>:customer`, so retries never duplicate.
- Failure: one immediate retry; still failing → `emailSent = false`, `emailAttempts` incremented, `lastEmailError` stored.
- **Daily cron** (`vercel.json`, `0 14 * * *` = 07:00 San Diego) → `GET /cron/inquiries` (protected by `CRON_SECRET`): re-sends inquiries with `emailSent = false` and `emailAttempts < 5`, then prunes `rate-hits` > 24 h. The customer auto-reply is retried while `customerEmailSent` is false and an email was given.
- **Admin button** "Send email again" on an inquiry re-runs the team (and pending customer) send immediately.
- Without `RESEND_API_KEY` (dev/preview): the sender logs the rendered email instead of sending.

## 4. Admin, settings, privacy

**Admin**
- Inquiries list: columns reference, division, name, summary, status, ⚠ unsent, received; filters status / division / unsent; default newest first.
- Detail view: all fields, delivery status, status select, "Send email again" button.
- Nav badge with the count of `new` inquiries.

**Environment variables** (owner sets in Vercel; documented in `.env.example` and the README deploy checklist)

| Name | Value |
|---|---|
| `RESEND_API_KEY` | from Resend |
| `INQUIRY_TO` | `hello@thegenixgroup.com` |
| `INQUIRY_FROM` | `quotes@thegenixgroup.com` |
| `IP_HASH_SALT` | random 32+ chars |
| `CRON_SECRET` | random; Vercel sends it to cron routes |

**Privacy:** under the form, "We use your details only to reply to this request." linking to `mailto:hello@thegenixgroup.com` until the Privacy page exists. No raw IPs stored; no marketing opt-ins.

## 5. Testing

- **Unit:** zod schema vs the prototype's messages; reference formatting; subject/summary builders; IP hash; `quoteSendMode`.
- **Integration** (test DB, Resend + BotID stubbed): save-before-email; honeypot/bot/too-fast → fake success, nothing saved; 6th submission in 10 min refused; concurrent submissions get distinct sequential references; cron re-sends only unsent and stops at 5 attempts; editor can't read another division's inquiries; API create is rejected.
- **E2E:** JS flow (both steps → real `GX-LOG-…` reference → visible in admin); no-JS post → `/quote/sent`; field errors; offline message when production lacks keys. Existing parity, a11y and link tests stay green.

## Out of scope

Home Upgrades and Multimedia forms; division contact pages; Privacy pages; per-division inboxes; editor notification preferences.
