# Home Upgrades service detail pages — design

**Date:** 2026-10-11 · **Status:** approved in brainstorming, awaiting spec review
**Builds on:** `2026-10-12-division-services-pages-design.md` (`/services`, `web/src/sites/services.ts`, `/contact` pre-selection), `2026-10-04-homeupgrades-quote-form-design.md` (the HU quote form), `2026-10-11-homeupgrades-our-work-design.md`.

## Understanding

The owner shared a screenshot of another company's service page (breadcrumb, hero with photo, benefit cards, process, FAQ beside a request form, related services, closing band) and asked for "something like this for the individual services". We take the **layout only** — no copy, branding, phone number or claims from that site.

## Decisions (owner, 2026-10-11)

- **Home Upgrades only:** four pages, one per service already on `/services`. Logistics keeps its single Services page.
- **Copy:** Claude drafts the new lines (lead, intro, benefit cards, FAQs) using only what the site already says; the owner approves them in the prototype. No prices, timelines, free-estimate or guarantee claims. Draft copy is in the Appendix.
- The division About pages remain paused.

## Pages

Route `web/src/app/(sites)/[site]/services/[slug]/page.tsx`; renders for `homeupgrades` and a known slug (`accent-walls`, `outdoor`, `handyman`, `reception` — the ids in `SERVICES.homeupgrades`); everything else `notFound()` (incl. all Logistics/hub/Multimedia hosts). Own `<main id="main">`, no new motion, HU tokens. `generateStaticParams` for the four slugs.

Sections (top to bottom):
1. **Hero:** breadcrumb nav (Home `/` › Services `/services` › *title*), eyebrow ("For your home · California" / "For your business · California" for Reception), `<h1>` service title, lead line, intro paragraph, buttons **Get a quote** (→ `#quote` on the page) and **Call** (`tel:` from `data.phone`, or the existing `.ph` placeholder), and the service photo (existing image; Unsplash images keep the "Stock photo" badge).
2. **Fit section:** label + `<h2>` + short paragraph + three benefit cards (icon, title, one line) — drafts.
3. **Process:** the existing "Four steps, no surprises" content (label "From “someday” to “let's do it”", h2, the four steps) verbatim, without motion.
4. **FAQ + form:** left: label "Questions" (draft h2) and 3–4 FAQ items as native `<details>/<summary>` (keyboard-accessible, no JS); right (`id="quote"`): the existing Home Upgrades quote form (`HuQuoteFormBlock`) with this service **pre-selected** (`preselect` from the service's quote mapping). One form per page; the pinned quote bar targets `#quote` on this page.
5. **More services:** "A few more possibilities" — the other three services as cards (photo, title, existing one-line description, link to their page).
6. **Closing band:** h2 + Get a quote (`#quote`) + Call.

Metadata: title "<Service title> | Genix Home Upgrades", description (draft, ≤ 160 chars), canonical `https://homeupgrades.thegenixgroup.com/services/<slug>`, indexable; the four URLs added to the Home Upgrades sitemap. JSON-LD: `Service` (name, description, provider, areaServed), `FAQPage` (the page's FAQs) and `BreadcrumbList`.

**BotID (required):** the form posts its Server Action to the page path, so the service pages must be in `BOTID_PROTECT` (`web/src/inquiries/bot-check.ts`) — add `{ path: '/services/*', method: 'POST' }` (check the BotID path-pattern syntax in `node_modules/botid`; if wildcards aren't supported, list the four paths) and update the pinned unit test. Without this, production silently drops JS submissions.

## Content

Extend `web/src/sites/services.ts`: each Home Upgrades `ServiceItem` gains `detail: { slug, eyebrow, lead, intro, fit: { label, h2, body, cards: [{ title, line }] x3 }, faqs: [{ q, a }], description }` (Logistics items have none). Existing fields (title, body, list, image, quoteHref) are reused. The process and closing-band copy are shared constants. All draft strings are listed in the Appendix and marked "draft" in the prototype for review.

## Links

- `/services` (HU): each service section gains "More about <title> →" to its detail page (the existing Get a quote button is unchanged).
- Footer (HU) service links → detail pages: Accent walls & TV units → `/services/accent-walls`, Outdoor builds → `/services/outdoor`, Handyman services → `/services/handyman`.
- Home "What we do" cards (HU): their "more" links currently go to `#quote`; leave them unchanged in this spec (owner can ask later).

## Prototype first

`design/homeupgrades-service.html` — the Accent walls page as the template, from the HU prototypes' header/footer and CSS; new rules prefixed `.svcd-` in `design/shared/homeupgrades-home.css`. Port with `npm run port:css`; parity covers `/services/accent-walls`. The other three pages render the same component with their data.

## Testing

- **Unit:** every HU service has complete `detail` data; slugs unique and equal to the ids; FAQ/Service/Breadcrumb JSON-LD shape; the copy guard (no `$`, "free", "guarantee", "licensed", "insured", "years", "same day", "24/7") over all detail strings.
- **E2E:** each of the four pages renders (h1, breadcrumb links, fit cards, four process steps, FAQs open/close with keyboard, more-services links to the other three, form present with the service pre-selected — `project`/`property` radios checked), Get a quote scrolls to `#quote`; unknown slug and any non-HU host → 404; a JS and a no-JS request sent from a detail page creates a `GX-HUP-` inquiry; JSON-LD present; 320 px no sideways scroll; axe + console; parity for accent-walls; links from `/services` and the footer.
- **BotID:** the pinned list includes the service paths.
- README: where the detail copy lives.

## Out of scope

Logistics detail pages; booking/preferred-date fields; prices; reviews/testimonials; changing the home "What we do" links; division About pages.

## Appendix — draft copy (for owner review)

Sources in brackets: existing site copy each line rests on. Shared across pages: Process section verbatim from the home; closing band h2 "Tell us about the space." (home Quote heading) with lede "A few photos and a sentence about what you want is enough to start." (home Quote).

### Accent walls & TV units (`accent-walls`)
- Eyebrow: For your home · California
- Lead: A wall built around how you use the room.
- Intro: Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting. We walk the space with you and agree the plan before any work starts. [services card; process: site visit, written quote]
- Fit label / h2: Made for your room / Designed around the way you live.
- Fit body: Tell us how you use the room — where you sit, what you watch, what you'd like on show — and we plan the wall around it. [approach: "listening to what you need"]
- Cards: **A clear plan first** — The design is agreed before work begins. [approach check] · **Wiring kept out of sight** — Cables and lighting planned into the wall. [card: hidden wiring, integrated lighting] · **Care in every detail** — Panels and finishes fitted thoughtfully. [promise]
- FAQs:
  - Can I send photos or ideas I've found? — Yes. Add up to five photos of your space and links to anything you like (Pinterest, Instagram or a website) in your request. [form]
  - How does the quote work? — We visit, measure up and send a clear, itemised written quote and timeline before any work starts. [process]
  - Do you build feature walls for businesses too? — Yes — see accent walls for reception areas. [reception service]
  - Where do you work? — We serve homes and businesses in California. [promise: Serving California; Residential & commercial]
- Meta description: Accent walls and TV units by Genix Home Upgrades: stone panels, slatted wood, hidden wiring and integrated lighting, planned with you in California.

### Outdoor builds (`outdoor`)
- Eyebrow: For your home · California
- Lead: Turn the yard into space you use.
- Intro: Decks, patios and outdoor structures that turn a yard into usable space. We visit, talk through what you want the space to do, and send a written quote before anything is built. [card; process]
- Fit label / h2: Made for outdoor living / Planned around how you'll use it.
- Fit body: Whether it's somewhere to sit, eat or simply get outside more, we start with how you want to use the space. [approach: listening to what you need]
- Cards: **A clear plan first** — Agreed before any work starts. · **No guesswork** — Clear, honest communication throughout. [promise] · **Finished properly** — A final walkthrough together at the end. [process]
- FAQs:
  - What can you build? — Decks, patios and outdoor structures such as pergolas. [card list]
  - I'm just planning — can I still ask? — Yes. Choose "Just planning" in the form and we'll talk it through. [form timing option]
  - How does the quote work? — We visit, measure up and send a clear, itemised written quote and timeline before any work starts. [process]
- Meta description: Outdoor builds by Genix Home Upgrades: decks, patios and pergolas that turn a California yard into usable space.

### Handyman services (`handyman`)
- Eyebrow: For your home · California
- Lead: One task or a whole to-do list. [services section lede]
- Intro: The small jobs that make a home work: fixes, fittings and finishing touches. Send us the list and we'll plan it together. [card; services lede]
- Fit label / h2: Small jobs, done well / The little things that make a home.
- Fit body: The shelf that needs hanging, the TV that needs mounting, the fitting that never got finished — put them in one request. [card list: TV wall mounting, repairs, fittings; approach card "It's the little things that make a home."]
- Cards: **Your list, your priorities** — Tell us what matters most. · **One request** — Several small jobs in one message. [services lede] · **Care in every detail** — Thoughtful craftsmanship. [promise]
- FAQs:
  - Can I include several jobs in one request? — Yes. List them in the description and add photos if they help. [services lede; form]
  - Do you mount TVs? — Yes, TV wall mounting is one of the jobs we do. [card list]
  - How does the quote work? — We visit, look at the jobs with you and send a clear, itemised written quote before any work starts. [process]
- Meta description: Handyman services by Genix Home Upgrades in California: TV wall mounting, repairs, fittings and the small jobs that make a home work.

### Accent walls for reception areas (`reception`)
- Eyebrow: For your business · California
- Lead: The first thing visitors see.
- Intro: The first thing visitors see, built to set the tone: a statement wall behind your front desk in stone, slatted wood and integrated lighting. [card]
- Fit label / h2: Made for your front desk / Set the tone from the door.
- Fit body: We plan the wall around your space and how people arrive, and agree the design with you before work begins. [process; approach check]
- Cards: **A clear plan first** — The design is agreed before work begins. · **Stone, wood and light** — Reception walls, stone & wood finishes, feature lighting. [card list] · **For every kind of space** — Residential & commercial. [promise]
- FAQs:
  - Can you match our brand? — Tell us about your brand and add photos or links in your request; we'll talk it through at the site visit. [form; process]
  - How does the quote work? — We visit, measure up and send a clear, itemised written quote and timeline before any work starts. [process]
  - Where do you work? — We serve businesses and homes in California. [promise]
- Meta description: Reception accent walls by Genix Home Upgrades: stone, slatted wood and integrated lighting behind your front desk, in California.
