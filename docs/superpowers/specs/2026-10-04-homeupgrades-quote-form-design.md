# Home Upgrades quote form — design

**Date:** 2026-10-04 · **Status:** approved in brainstorming, awaiting spec review
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
Under the form: "We use your details and photos only to reply to this request."

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
1. On picking a file, the browser `POST`s `{ name, type, size }` to **`/uploads`** on the Home Upgrades host (route `web/src/app/(sites)/[site]/uploads/route.ts`, `homeupgrades` only, else 404).
2. The route checks: type ∈ JPEG / PNG / WebP / HEIC / HEIF, size ≤ 10 MB; BotID (`checkBotId`); rate limit 10 upload grants per ipHash per 10 min (rate-hits, distinct key prefix `up:`). It returns a **signed upload** (timestamp, signature, api key, folder `genix-inquiries`, `type=authenticated`, `public_id` = random 24-char id, `max_bytes`/allowed formats bound into the signature where Cloudinary supports it).
3. The browser uploads the file directly to Cloudinary, shows a thumbnail (from the upload response) with a remove ✕, and adds a hidden `photos` input with the public id. Remove ✕ just drops the input (the orphan is cleaned later).
4. On submit, the server validates each photo id: matches `^genix-inquiries/[A-Za-z0-9_-]{24}$`, ≤ 5, and exists in our account (Cloudinary Admin API lookup; type authenticated). Invalid ids are dropped silently (not an error to the visitor) and logged.

**Viewing:** signed delivery URLs for `type=authenticated` images with a transformation (thumbnail `c_fill,w_240,h_240`; full `c_limit,w_2000,f_jpg`) — HEIC delivered as JPG. Email links expire after 30 days; admin links are generated per view.

**Clean-up:** the daily cron also lists `genix-inquiries/` resources older than 24 h that no inquiry references and deletes them; deleting an inquiry (afterDelete hook) deletes its photos.

**Settings** (owner, Vercel): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Without all three the photo block is not rendered and `/uploads` returns 404; the form works with links only. Secrets never reach the browser (only the api key and signature).

## 4. Testing

- **Unit:** HU schema (each message; budget/callTime optional; links parsing ≤ 5 http(s); notes 10–2000); HU summary/subject/answers/customerRows (no free text in customer rows); photo-id validation (pattern, count); upload-grant rules (types, size, missing settings → disabled).
- **Integration** (Cloudinary stubbed): HU submission saves `GX-HUP-…` with details + photos; invalid photo ids dropped; Logistics behaviour unchanged (existing tests stay green); cleanup deletes only unreferenced > 24 h; afterDelete removes photos.
- **E2E:** pills → step 2 → send → real `GX-HUP-` reference; photo add/remove with Cloudinary mocked at the network level; no-JS post → `/quote/sent`; field errors; parity with the prototype (desktop + phone); links check.

## Out of scope

Video uploads; editing a request after sending; division Contact pages; per-division inboxes.
