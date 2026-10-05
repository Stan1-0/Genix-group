# Division Contact pages (Logistics, Home Upgrades) — design

**Date:** 2026-10-05 · **Status:** approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-27-genix-websites-design.md` (each division has a Contact page), `2026-10-04-homeupgrades-quote-form-design.md`, `2026-09-30-enquiry-pipeline-design.md`.

## Understanding

Each division home already has a quote form (Logistics in the hero card, Home Upgrades in its Quote section), a footer Contact column and "Get a quote" buttons. The owner wants a real `/contact` page on Logistics and Home Upgrades as an extra landing spot (nav, footer, Google) that can take a request and shows how to reach the business.

## Decisions (owner, 2026-10-05)

- **Purpose:** the page holds the **existing quote form** (same fields, same Server Action, same Inquiries record) next to contact details. Not a separate "message us" form; not details-only.
- **Links:** add **Contact** to the header nav and the footer Company column of both divisions. "Get a quote" buttons and the pinned quote bar keep scrolling to the form on the home page.
- The home page keeps its own quote section; Contact is an addition, not a replacement.

## Approach

Extract each form once and render it on two pages.

- Logistics: move the hero's `<form id="quote-form">…</form>` (card markup, fields, privacy line, `QuoteForm` enhancer) into a shared component used by `Hero.tsx` and the Contact page.
- Home Upgrades: move the form block of `sections/Quote.tsx` (`#hu-quote-form`, steps, photos, sent panel, `HuQuoteForm` enhancer) into a shared component used by the home `Quote` section and the Contact page.
- Rejected: copying the markup into the Contact page (the two copies would drift; the form has just been through a long review).
- Nothing changes in the pipeline, emails, actions, Payload collections or the `/quote/sent` page. Each page contains exactly one instance of the form, so element ids stay unique.

## The page

- Route: `web/src/app/(sites)/[site]/contact/page.tsx`. Renders for `logistics` and `homeupgrades`; `hub`, `multimedia` and unknown keys call `notFound()` (hub Contact is separate work; Multimedia has no form).
- Layout (desktop): page header (small `.label` "Contact", one headline, one sentence), then two columns: the form (left), a details card (right). Phones: one column, form first, details beneath. Reading widths and tokens follow each division's home page.
- Details card: email (`data.email`, fallback `hello@thegenixgroup.com`), phone (`data.phone` as a `tel:` link, or the same `.ph` placeholder the footer uses when unset), service area (`data.areaServed`, or "Serving California" for Home Upgrades as on its home page), and a reply-time line reusing wording each home already has (Logistics: price within two business days; Home Upgrades: a visit within two business days). **No opening hours** (the data model holds none; do not invent them).
- Wording: headline and sentences are written in the prototype, in each division's existing voice; the owner reviews them there.
- The page renders its own `<main id="main">` (skip link target) and its footer carries `data-quote-bar-hide`, so the pinned quote bar stays off on this page (the form is already visible).
- Metadata: title "Contact | Genix Logistics" / "Contact | Genix Home Upgrades" (the layout's template adds the suffix), a one-sentence description, canonical `https://<division host>/contact`, indexable.
- Both division site configs list `/contact` in `pages`, so it appears in that site's `sitemap.xml` (not the hub's).

## Links

- Header nav (`SITES[site].nav`): add `{ label: 'Contact', href: '/contact' }` last, both divisions.
- Footer Company column (`DivisionFooter.tsx` `COLUMNS`): add `['Contact', '/contact']` to both divisions. Links are same-host paths.
- Header and footer links from the Contact page back to home anchors (`/#services`…) keep working because they are root-relative on the same host.

## Prototype first

- New static prototypes `design/logistics-contact.html` and `design/homeupgrades-contact.html`, using each division's existing CSS (`design/shared/…`) and the header/footer already in the home prototypes; the nav and footer edits are made in the home prototypes too (and the two new ones).
- Port to the app with `npm run port:css` as for the home pages (never hand-edit `*.generated.css`). The app page markup matches the prototype.
- Screenshot parity tests (2% limit, desktop and phone) cover both Contact pages.

## Testing

- **E2E** (`tests/e2e/contact.e2e.spec.ts`): both pages render on their hosts with h1, details card, one form; the hub and Multimedia `/contact` still return 404; a request sent from each Contact page creates an inquiry for the right division (reference prefix `GX-LOG-` / `GX-HU-`) and lands on `/quote/sent`; nav and footer Contact links resolve; no sideways scroll at 320 px; pinned quote bar not shown.
- **Quality:** both URLs added to the axe and console-error tests.
- **SEO:** unit/e2e expectations for each division sitemap include `/contact`; the hub sitemap does not; canonical and title asserted exactly.
- **Parity:** new Contact pages added; both home pages stay green after the form extraction (no visual change).
- **Existing tests** that drive the forms (`quote-submit`, `hu-quote`, logistics/homeupgrades home specs) must pass unchanged — they prove the extraction changed nothing.

## Out of scope

Hub Contact and About; Multimedia; a plain "message us" form and a `contact` inquiry type; Services, Our work and About pages; opening hours; changes to the quote pipeline or emails.
