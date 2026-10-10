# Division Services pages (Logistics, Home Upgrades) — design

**Date:** 2026-10-12 · **Status:** approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-27-genix-websites-design.md` (each division: Home, Services, Our work, About, Contact, Privacy), `2026-10-05-division-contact-pages-design.md` (shared quote-form components, `/contact`).

## Understanding

Each division home has a short services section (Logistics: two lanes; Home Upgrades: service cards). The owner wants a `/services` page per division that gives each service its own section and sends visitors to the quote form with that service already chosen. Our work pages are a separate, later spec.

## Decisions (owner, 2026-10-12)

- **Services first;** Our work gets its own spec (Logistics has no real project photos yet; nothing is invented).
- **Text in code** (like About/Privacy), not a Payload Services collection. That collection stays possible later.
- **Built only from what the sites already say:** existing descriptions, lists, photos and quoting promises. No new claims (no prices, timelines, sizes, areas or guarantees that aren't already on the sites).

## The pages

Route `web/src/app/(sites)/[site]/services/page.tsx`: renders for `logistics` and `homeupgrades`; `hub`, `multimedia` and unknown keys → `notFound()`. Own `<main id="main">`, no motion, the division's header/footer and existing tokens. Pinned quote bar behaves as on other division pages (no `data-no-quote-bar`: there is no form on this page).

1. **Header:** `.label` "Services", h1 (draft, in the division's voice), one lede reusing the home section's lede (Logistics: "For businesses that ship every week, and for people moving once. Either way it starts with the same short form." Home Upgrades: "One task or a whole to-do list. We make the next step simple.").
2. **One section per service** (`<section id="…">` with an `<h2>`), each containing: the existing description and list (verbatim from the home), the photo the home already uses for it (Home Upgrades only), a short "What to send us" line taken from the form's fields, and a **"Get a quote"** button to that division's `/contact` with the service pre-selected.
   - **Logistics**
     - `#freight` "Freight & deliveries" — "Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs across California." List: Pallets & part loads; Full truckloads; Last-mile & courier. Send: pickup and drop-off ZIPs, the date (or flexible), what's moving. Button → `/contact?kind=business`.
     - `#moves` "Home & office moves" — "Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted." List: Studio to 3+ bedrooms; Office moves; Local & long-distance moves. Send: the same. Button → `/contact?kind=move`.
   - **Home Upgrades** (Renovation stays out — not offered)
     - `#accent-walls` "Accent walls & TV units" — "Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting." List: Marble panels; Accent walls; Customized TV unit. Photo `/brand/hu-project-marble-wall.jpg`. Button → `/contact?project=accent&property=home`.
     - `#outdoor` "Outdoor builds" — "Decks, patios and outdoor structures that turn a yard into usable space." List: Decks; Patios; Pergolas. Photo: the home card's image. Button → `/contact?project=outdoor`.
     - `#handyman` "Handyman services" — "The small jobs that make a home work: fixes, fittings and finishing touches." List: TV wall mounting; Repairs; Fittings. Photo `/brand/hu-handyman.jpg`. Button → `/contact?project=other`.
     - `#reception` "Accent walls for reception areas" — "The first thing visitors see, built to set the tone: a statement wall behind your front desk in stone, slatted wood and integrated lighting." List: Reception walls; Stone & wood finishes; Feature lighting. Photo: the home card's image. Button → `/contact?project=accent&property=business`.
     - Send (all): a few photos of the space and a sentence about what you want (the existing Quote section wording).
3. **"How quoting works"** closing block, existing promises only. Logistics: you see the price before anything is scheduled; we reply with a price within two business days. Home Upgrades: we arrange a visit and send a written quote; we reply within two business days. A "Get a quote" button → `/contact`.

Metadata: title "Services | Genix Logistics" / "Services | Genix Home Upgrades" via `pageMetadata(site, '/services', { title: 'Services', description })`, canonical `<division origin>/services`, indexable; `/services` added to that division's `pages` (its sitemap only). JSON-LD: an `ItemList` of `Service` items (name, description, `provider` = the division's organisation, `areaServed` as already used by `siteJsonLd`) built from the same data as the page.

## Pre-selecting the service on `/contact`

- `LogisticsQuoteForm` and `HuQuoteFormBlock` gain an optional `preselect` prop. Logistics: `{ kind?: 'business' | 'move' }` sets the checked kind radio (default stays `business`), and the enhancer's existing `selectKind` logic keeps the load options consistent. Home Upgrades: `{ project?: 'accent' | 'outdoor' | 'other'; property?: 'home' | 'business' }` sets `defaultChecked` on those pill radios.
- Only the `/contact` route passes `preselect`, parsed from `searchParams` with allow-lists; anything else (arrays, junk) → nothing pre-selected. Reading `searchParams` happens only in the division branches that need it; division `/contact` becomes dynamic (accepted: it now depends on the query).
- **Home pages pass nothing: their form HTML must stay byte-identical** (before/after check, as in the contact-pages work).
- No-JS: the pre-selected radios are simply checked in the server HTML. JS: the enhancers start from the checked state (Logistics: `showOptions(kindOf())` already reads it).

## Links

- Division nav "Services" (`SITES[site].nav`): `/#services` → `/services`.
- Footer Services column (`DivisionFooter` `COLUMNS[site].services`): each item → `/services#<anchor>` (Logistics: Business freight → `#freight`, Last-mile & courier → `#freight`, Home & office moves → `#moves`; Home Upgrades: Accent walls & TV units → `#accent-walls`, Outdoor builds → `#outdoor`, Handyman services → `#handyman`).
- Home services sections: add an "All services →" link to `/services` (prototype and app); the sections are otherwise unchanged.
- Prototypes mirror all links (`*-services.html`).

## Prototype first

`design/logistics-services.html` and `design/homeupgrades-services.html` built from each division's CSS (`design/shared/style-logistics.css`; `design/shared/style-homeupgrades.css` + `design/shared/homeupgrades-home.css`) and the home prototypes' header/footer; new rules prefixed `.svcpage-` (scoped, existing tokens; no blur, no decorative pills, no new animation). Port with `npm run port:css`; parity covers both pages.

## Testing

- **E2E** (`tests/e2e/services.e2e.spec.ts`): both pages render (h1, every service section with its id, h2, list, quote link with the right query), hub and Multimedia `/services` are 404, metadata exact, sitemap per division only, JSON-LD lists the services, 320 px no sideways scroll.
- **Pre-selection:** `/contact?kind=move` checks "Plan a move" (and the move load options with JS); `/contact?project=outdoor` and `?project=accent&property=business` check those pills, with and without JS; junk values select nothing; following a Services "Get a quote" button lands on the form with the choice made; home form HTML byte-identical.
- **Links:** nav, footer and home "All services" reach `/services` (and anchors exist); existing nav/footer expectations updated.
- **Quality:** both pages in axe + console tests. **Parity:** both pages added; homes stay green. Existing quote-form specs pass unchanged.
- README: where the services text lives and how to change it.

## Out of scope

Our work pages; a Payload Services collection; new photos or claims; Multimedia; changing the home services sections beyond the "All services" link.
