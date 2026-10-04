# Home Upgrades quote form — design

**Date:** 2026-10-04 · **Status:** matches the build (branch `feat/hu-quote-form`)
**Builds on:** `2026-09-30-enquiry-pipeline-design.md` (the live Logistics pipeline). Everything not restated here — references, spam checks, rate limit, save-first, delivery, retries, daily cron, admin inbox, field access — is reused unchanged.

## Decisions (owner, 2026-10-04)

- Layout **B: tap-to-pick pills**, two steps, in the Home Upgrades "Tell us about the space." band (replaces the "Email about a project / Call" buttons).
- Extra questions: when to start, rough budget (optional), home or business, best time to call (only when a phone is given).
- Customers can add **inspiration**: up to 5 images **and** links. Images go to **Cloudinary** (owner's choice over Vercel Blob: HEIC→JPG conversion, thumbnails, private delivery).
- Signed photo links in emails expire after **30 days**; the admin always generates fresh ones.

## 1. The form

Lives in the Home Upgrades home page's quote band (`id="quote"`); every existing `#quote` link (nav "Get a quote", pinned phone bar) lands on it. Prototype first in `design/homeupgrades-home.html`, then ported (parity-tested).

**Step 1 · The project** (pills are styled radio inputs)

| Field | Name | Choices / rule | Required |
|---|---|---|---|
| What are we building? | `project` | `accent` Accent wall & TV unit · `outdoor` Outdoor build · `other` Something else | yes — "Choose what we're building." |
| For your… | `property` | `home` Home · `business` Business | yes — "Choose home or business." |
| When to start | `timing` | `asap` As soon as possible · `soon` In 1–3 months · `planning` Just planning | yes — "Choose when you'd like to start." |
| Rough budget | `budget` | `under5` Under $5k · `5to15` $5–15k · `over15` $15k+ · `unsure` Not sure | no |
| Property ZIP | `zip` | 5 digits | yes — "Enter a 5-digit ZIP code." |

**Step 2 · Your details**

| Field | Name | Rule |
|---|---|---|
| Tell us about the space | `notes` | required, 10–2000 chars — "Tell us a little about the space." Hint: "Room, size, what you have in mind." |
| Photos & inspiration | `photos` (hidden inputs, one per uploaded photo id) | optional, ≤ 5 images; JS only. "Add up to 5 photos of your space or ideas you like." |
| Inspiration links | `links` | optional textarea, ≤ 1000 chars; up to 5 `http(s)` URLs kept, others dropped. "Pinterest, Instagram or website links (optional)". |
| Name | `name` | required — "Enter your name." |
| Phone / Email | `phone`, `email` | at least one; same rules and messages as Logistics (phone ≤ 40, email ≤ 254) |
| Best time to call | `callTime` | `morning` · `afternoon` · `evening`; shown only once a phone is typed; optional |

Hidden: `site=homeupgrades`, honeypot `company_site`, `t` (render time, JS), `js=1` (JS submits).
Under the form: "We use your details and photos only to reply to this request." The band also keeps "Serving California." under the form.

The `<form>` has no `novalidate` in its markup; JS sets `noValidate` when it takes over, so visitors without JS keep the browser's native required/pattern checks. Selected pills have a high-contrast (forced-colors) outline.

**Confirmation** (JS: replaces the form; no-JS: `/quote/sent`): "Request received · GX-HUP-000001. We'll get back to you within two business days to arrange a visit. Forgot a photo? Just reply to our confirmation email with it."

**No JS:** both steps visible; pills are plain radios; the photo block is hidden (links box + reply note remain); posts to the server action → `/quote/sent?ref=…` (the sent page now accepts `homeupgrades` too).

**Offline / preview:** same `inquirySendMode` rules as Logistics.

## 2. Pipeline changes (generalise per division)

- **Form definitions per site** in `web/src/inquiries/forms/`: `logistics.ts` (moves the existing `parseQuote`/summary/subject/answers — behaviour unchanged) and `homeupgrades.ts` (new). Each exports `parse(raw, today)`, `summary(input)`, `subjectDetails(input)`, `answers(input)` (rows for emails/admin), `customerRows(input)` (structured choices only — never free text, links or photos).
- `processQuote` takes the site, picks its definition, stores `details` (HU: project, property, timing, budget, zip, callTime, links, photos) and `summary`.
- `submitQuote`: `FORM_SITES = ['logistics', 'homeupgrades']`.
- **Team email (HU):** subject `[Home Upgrades] Quote · Accent wall & TV unit · 92101 · GX-HUP-000001`; body: all answers, notes, links (as links), photo thumbnails each linking to the full-size image (signed, 30-day expiry).
- **Customer email (HU):** structured choices only + reference + "Forgot a photo? Reply to this email with it." + division phone. The one-per-address-per-24 h rule still applies.
- **Admin:** an inquiry with photos shows a thumbnail strip (fresh signed URLs on each view) in the edit view.

## 3. Photo uploads (Cloudinary)

**Flow (JS only):**
0. Browser-side: files over 10 MB, or of the wrong type, are refused before any grant is requested; picking the same photo twice collapses to one; preview URLs are released once the photo is sent; dropping a file outside the photo area doesn't navigate away from the page.
1. On picking a file, the browser `POST`s `{ name, type, size }` to **`/uploads`** on the Home Upgrades host (route `web/src/app/(sites)/[site]/uploads/route.ts`, `homeupgrades` only, else 404).
2. The route checks: type ∈ JPEG / PNG / WebP / HEIC / HEIF, size ≤ 10 MB; BotID (`checkBotId`); rate limit 10 upload grants per ipHash per 10 min (rate-hits, distinct key prefix `up:`). It returns a **signed upload** (timestamp, signature, api key, `type=authenticated`, `public_id` = `genix-inquiries/` + a random 24-char id; no separate `folder` parameter, because accounts with dynamic folders don't prefix ids from `folder`).
3. The browser uploads the file directly to Cloudinary, shows a thumbnail (from the upload response) with a remove ✕, and adds a hidden `photos` input with the public id. Remove ✕ just drops the input (the orphan is cleaned later).
4. On submit, only the first 10 photo ids sent are considered. The server validates each: matches `^genix-inquiries/[A-Za-z0-9_-]{24}$`, duplicates collapse, ≤ 5 kept, and it exists in our account (Cloudinary Admin API lookup; type authenticated). The server also reads each photo's real `bytes` and `format` from the Admin API and drops (and deletes) anything over 10 MB or of the wrong format, so size is enforced twice (browser and server). Invalid ids are dropped silently (not an error to the visitor) and logged.
5. **Verification never fails the request:** if Cloudinary is unreachable on submit, the photo ids are dropped (logged) and the enquiry is still saved.

**Viewing:** thumbnails (email and admin) are Cloudinary *signed* delivery URLs for the authenticated asset: unguessable, non-expiring, 240×240 JPG (`c_fill,w_240,h_240`), so HEIC shows as JPG. Full-size links are `private_download_url` links that expire: 30 days in the email, 1 hour in the admin (generated fresh on each view). Reason: Cloudinary's free plan can't time-limit delivery URLs, only download URLs.

**Clean-up:** the daily cron also lists `genix-inquiries/` resources older than 24 h that no inquiry references and deletes them; it continues past an inquiry it can't deliver rather than stopping. Deleting an inquiry (afterDelete hook) deletes its photos. Because the sweep deletes whatever the connected database doesn't reference, real Cloudinary keys belong only in Vercel Production, never in a local or preview environment.

**Settings** (owner, Vercel): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Without all three the photo block is not rendered and `/uploads` returns 404; the form works with links only. Secrets never reach the browser (only the api key and signature).

## 4. Testing

- **Unit:** HU schema (each message; budget/callTime optional; links parsing ≤ 5 http(s); notes 10–2000); HU summary/subject/answers/customerRows (no free text in customer rows); photo-id validation (pattern, count); upload-grant rules (types, size, missing settings → disabled).
- **Integration** (Cloudinary stubbed): HU submission saves `GX-HUP-…` with details + photos; invalid photo ids dropped; Logistics behaviour unchanged (existing tests stay green); cleanup deletes only unreferenced > 24 h; afterDelete removes photos.
- **E2E:** pills → step 2 → send → real `GX-HUP-` reference; photo add/remove with Cloudinary mocked at the network level; no-JS post → `/quote/sent`; field errors; parity with the prototype (desktop + phone); links check.

## Related change

At the owner's request, a four-item promise strip sits under the Home Upgrades hero: Care in every detail / Thoughtful craftsmanship; No guesswork / Clear, honest communication; For every kind of space / Residential & commercial; Your local project partner / Serving California.

## Out of scope

Video uploads; editing a request after sending; division Contact pages; per-division inboxes.
