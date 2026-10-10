# Hub Contact page — design

**Date:** 2026-10-10 · **Status:** approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-27-genix-websites-design.md` (hub contact: name, email, phone optional, message; Inquiries type `contact`), `2026-09-30-enquiry-pipeline-design.md`, `2026-10-05-division-contact-pages-design.md`, `2026-10-06-hub-about-page-design.md`.

## Understanding

The hub has no form. Its home "What do you need?" section sends visitors to the Logistics and Home Upgrades quote forms and Multimedia to an email link; general questions only go by email. The owner wants a real Contact page on `thegenixgroup.com/contact` that takes a short message through the existing enquiry pipeline and still routes quote-ready visitors to the right business.

## Decisions (owner, 2026-10-10)

- **A short message form plus routing cards.** The form goes through the existing pipeline (saved in Admin → Leads, team email, customer confirmation). Above it, three "go straight to" cards.
- **Links:** header button "Start a conversation" and the footer's Group "Get a quote" → `/contact`; the nav item "Get a quote" becomes **"Contact"** → `/contact`. The home page keeps its "What do you need?" cards; its "Need more than one, or not sure?" line links to the form.
- Hub only. Division and Multimedia hosts keep their own `/contact` (Logistics, Home Upgrades) or 404 (Multimedia).

## The form

Fields (in order):
1. **Name** (required, ≤ 120 chars).
2. **Email** (required, valid address) — the reply goes by email.
3. **Phone** (optional; same validation and message as the quote forms: "Enter a phone number with area code.").
4. **Which business is this about?** (required radio): `logistics` "Genix Logistics", `homeupgrades` "Genix Home Upgrades", `multimedia` "Genix Multimedia", `unsure` "Not sure, or more than one". A `?about=<value>` query pre-selects a valid value.
5. **Message** (required, 10–2,000 chars).

Privacy line under the form, same pattern as the quote forms: "We use your details only to reply to this message. Read our [privacy policy]." (absolute hub URL). Same spam protection as the quote forms: honeypot `company_site`, the 2-second timing field `t`, Vercel BotID, rate limit, hashed IP.

- **Without JS:** posts through `submitQuoteForm` with `site=hub` and lands on the sent page.
- **With JS:** a small client enhancer validates inline (same messages as the server), sends through `submitQuote`, and shows an in-place thank-you with the reference ("Message received." / "We'll reply by email within two business days."). Offline mode (no send configured) shows the existing call/email message and posts nothing. One step; no photos.

## The pipeline (contained changes)

- **Form registry:** add `hub` → a `contactForm` `FormDef` (`web/src/inquiries/forms/hub.ts`) with its own parse/answers/customerRows. `FORM_SITES` then includes `hub`; `formFor('hub')` works.
- **Inquiry type per form:** `FormDef` gains `inquiryType: 'quote' | 'contact'` (logistics and homeupgrades `'quote'`, hub `'contact'`); `pipeline.ts` writes `type: def.inquiryType` instead of the literal `'quote'`.
- **Emails by type:** `teamEmail` heading/subject use "New message" / `[Group] Message · <about> · <ref>` for `contact` and keep "New quote request" / `[<Division>] Quote · …` for `quote`. `customerEmail` subject "We got your message · <ref>" for `contact`, unchanged for `quote`. The customer email lists only the "About" choice, never the message text or contact details (same rule as `customerRows`).
- **Reference:** `GX-HUB-000001` from `SITES.hub.inquiryPrefix` (`HUB`); no counter change needed.
- **Sent page** (`/quote/sent`): accepts `hub`, with message wording ("Message received." / "We'll reply by email within two business days.") and "Back to the form" → `/contact`. The error branches (offline, rate, invalid, server) work for the hub too.
- **actions.ts:** unknown or unsupported `site` values keep falling back as today; `hub` is now supported.
- **Admin:** contact inquiries show in Leads → Inquiries like the others (division `hub`, type `contact`); the existing answers table renders their rows; no new admin UI.
- The quote forms' behaviour, emails and stored shape must not change: their existing unit/e2e tests pass unchanged.

## The page

Route `web/src/app/(sites)/[site]/contact/page.tsx` (exists for logistics/homeupgrades): add the `hub` branch; `multimedia` and unknown keys still 404.

1. **Header:** `.label` "Contact", h1 (draft: "Talk to the group."), one lede: tell us what you need and we'll put the right team on it; for a quote, go straight to the business.
2. **Quick routes** (three cards, Move / Make / Tell as on the home page): Logistics → `https://logistics…/contact`, Home Upgrades → `https://homeupgrades…/contact` (via `siteOrigin`), Multimedia → `/contact?about=multimedia#message` (this page's form, pre-selected).
3. **Form + details:** the form (`id="message"`), and beside it a facts block (head office San Diego, CA; email; mailing address only when street, city, state and ZIP are all set — same rule as About/Privacy). Phones: one column, cards, form, then details.
- Own `<main id="main">`, no motion, metadata title "Contact | The Genix Group", canonical `https://thegenixgroup.com/contact`, indexable, `/contact` added to `SITES.hub.pages` (hub sitemap only).

## Links

- `SITES.hub.nav`: "Get a quote" → label **"Contact"**, href `/contact`. `SITES.hub.cta.href` → `/contact` (header button and the hidden mobile `nav-contact` link).
- `HubFooter` Group "Get a quote" → `/contact`.
- Home `Route.tsx` "Need more than one, or not sure?" line: add a link to `/contact` (keep the email link). The three home route cards are unchanged.
- Prototypes mirror all of this.

## Prototype first

`design/hub-contact.html` built from the shared hub CSS (`design/shared/hub-home.css`) and the home/about prototypes' header and footer; new rules prefixed `.contact-` (scoped, existing hub tokens; no blur, no decorative pills, no new animation). A small static form script in the prototype mirrors the app's inline validation. Port with `npm run port:css`. Parity covers the page.

## Testing

- **Unit:** hub form parse (required fields, email, optional phone, `about` values, message length), `inquiryType` per form, team/customer email wording by type (and quote wording unchanged), pipeline writes `type: 'contact'` for hub.
- **E2E** (`tests/e2e/hub-contact.e2e.spec.ts`): page renders (h1, three cards with correct hrefs, form, details, metadata); `?about=multimedia` pre-selects; JS send → in-place thank-you with `GX-HUB-\d{6}`; no-JS send → `/quote/sent?ref=GX-HUB-…` with message wording and a back link to `/contact`; server field errors inline; division and Multimedia hosts unaffected (Multimedia `/contact` still 404); hub sitemap lists `/contact`.
- **Links:** nav "Contact", header button, footer "Get a quote" and the home "not sure?" line reach `/contact`; existing hub nav/footer expectations updated.
- **Quality:** hub `/contact` in axe + console tests; 320 px no sideways scroll.
- **Parity:** hub Contact added; hub home and About stay green.
- **Regression:** `quote-submit`, `hu-quote`, pipeline and email unit tests pass unchanged.
- README: the hub form, its inquiry type, and where its wording lives.

## Out of scope

A Multimedia form; file uploads on the hub form; live chat/WhatsApp; changing the home "What do you need?" cards; changing quote forms or their emails.
