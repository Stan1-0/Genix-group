# The Genix Group websites — production design

Date: 2026-09-27 · Status: sections 1–3 approved 2026-09-25 (updated and re-approved 2026-09-27), section 4 approved 2026-09-27; awaiting spec review.
Scope: the production build of four sites — the group hub and three divisions — as one application. The static prototypes in `design/` are the visual reference.

## 0. Context

- **Brand:** The Genix Group (spelling "Genix"). Divisions: Genix Logistics, Genix Home Upgrades, Genix Multimedia. Never "Construction" for Home Upgrades.
- **Market:** USA; head office San Diego, California.
- **Domains:** `thegenixgroup.com` (hub), `logistics.thegenixgroup.com`, `homeupgrades.thegenixgroup.com`, `multimedia.thegenixgroup.com`.
- **Taglines (exact):** Group "We Haul It. We Build It. We Show It."; Logistics "Reliable Freight. Real People. Right on Schedule."; Home Upgrades "From Blueprint to Beautiful."; Multimedia "Your Story, Captured and Amplified."
- **Visual reference (source of truth for look and behaviour):** `design/hub-home.html`, `design/homeupgrades-home.html`, `design/logistics-home.html`, with their shared files in `design/shared/`, `design/js/`, `design/assets/`, and their Playwright suites in `design/tests/`.
- **Staff:** non-technical; edit content rarely.

## 1. Architecture

**Stack**
- Next.js 16 (App Router, TypeScript), Tailwind CSS v4.
- Payload CMS 3 embedded in the same app; admin at `thegenixgroup.com/admin` only (404 on subdomains).
- Postgres on Neon (Vercel Marketplace) for CMS content, inquiries and rate-limit counters.
- Vercel Blob for uploaded images and video.
- Resend for email. Vercel BotID for bot protection. Vercel Cron for email retries.
- Vercel hosting: one project, four domains.

**Request flow**
```
visitor → logistics.thegenixgroup.com/services
        → proxy.ts: host → site = "logistics"
        → app/(sites)/[site]/services/page.tsx
        → Payload query: services where division = "logistics"
        → rendered in the Logistics theme, cached
```

**Rendering:** marketing pages are static and revalidated on demand — a Payload `afterChange` hook revalidates only the affected site's pages, so edits appear within seconds. Forms use Server Actions (no separate API routes).

**Site registry — `sites.config.ts`, the single source of truth for structure**
```ts
{ key: "logistics", name: "Genix Logistics", host: "logistics.thegenixgroup.com",
  theme: "logistics", inquiryPrefix: "LOG", tagline: "Reliable Freight. Real People. Right on Schedule." }
```
Keys: `hub` (prefix `HUB`), `logistics` (`LOG`), `homeupgrades` (`HUP`), `multimedia` (`MED`). The proxy, themes, sitemaps, footers and the hub's division panels read from it. Adding a division = one entry + a theme file + CMS content.

**Admin access:** Payload users are Genix staff with role `admin` or `editor`; an editor can be limited to one or more divisions and then sees only that content and those inquiries.

**Pages per site**
| Site | Pages |
|---|---|
| Hub | Home, About, Contact, Privacy, 404 |
| Each division | Home, Services, Our work, About, Contact, Privacy, 404 |

## 2. Content model

**Rule:** anything structural lives in code (hosts, themes, layouts, form fields); anything staff might edit lives in Payload.

| Collection | Key fields | Used by |
|---|---|---|
| **Sites** (one record per site) | hero heading/subheading/media; about story; values; phone; email; address; social links; **coverage** (area served, e.g. "United States" for Logistics, plus an optional list of regions to show); default SEO title and description | hero, about, footer, contact, structured data |
| **Services** | division, title, slug, summary, body (rich text), image, order | Home service lanes, Services page |
| **Projects** | division, title, description, cover image, gallery, optional before/after pair, optional video (upload or YouTube/Vimeo URL), `featured` | Our work, "Recent work" on Home |
| **Team** | division (hub = group leadership), name, role, photo, bio, order | About pages — sections hide while empty |
| **FAQs** | division, question, answer, order | FAQ sections (+ FAQ structured data) |
| **Media** | file (Blob), **alt text required** | everything with an image |
| **Inquiries** | division, type (`quote` \| `contact` \| `booking`), reference (`GX-LOG-000123`), name, phone, email, message/notes, `details` (JSON, division-specific), status (`new` → `contacted` → `closed`), `emailSent`, `emailAttempts`, `ipHash`, createdAt | admin lead inbox |
| **Users** | email, role (admin \| editor), divisions | admin login |

Left out on purpose (YAGNI): client-logo strip, testimonials, blog, pricing tables, multi-language. Each can be added later as a collection.

**Forms are defined in code, one per division; shared fields get columns, division answers go in `details`:**
- **Logistics quote** (as prototyped in `design/logistics-home.html`): kind (`business` \| `move`); pickup ZIP; drop-off ZIP; date or `flexible`; load (business: pallets + count 1–26, parcels, full truckload, same-day courier; move: studio, 1–2 bedroom, 3+ bedroom, office); name; phone or email (at least one); notes. Logistics serves the whole USA (owner, 2026-09-27), so any valid 5-digit ZIP is accepted with no outside-area note.
- **Home Upgrades quote** and **Multimedia booking:** field sets are fixed when their Contact pages are prototyped (a prerequisite for those phases, section 6).
- **Hub contact:** name, email, phone (optional), message.

## 3. Design system and theming

- **Layout is shared; each site has its own skin.** Components are shared (header, footer, section heading, cards, forms, quote bar). Each site's look lives in its own theme file of tokens (colours, fonts, radii, surfaces) selected by `<html data-site="…">`, mirroring the prototypes' `[data-division]` style layers.

| Site | Colours | Type | Signature |
|---|---|---|---|
| Hub | black `#0B0B0C` + gold `#C28A2C` | Schibsted Grotesk, Hanken Grotesk, IBM Plex Mono | reel hero; logo docks into the header |
| Home Upgrades | navy `#022248` + gold; parchment `#FDFDF7`; sky blue `#0096F7` for links/details only | Plus Jakarta Sans (light headlines) | before/after slider; 3D "Watch the build" |
| Logistics | navy `#022248` + gold; paper `#F7F5EF`; truck grey `#37404A` | Archivo (900, wide) + IBM Plex Mono | shipping-label quote form; truck-on-the-road |
| Multimedia | to be decided (no logo yet; plum `#7A2E68` placeholder) | to be decided | to be decided |

- **Logos:** the supplied SVG lockups (`genix-group-logo.svg` / mark + wordmark, `genix-home-upgrades-logo.svg`, `genix-logistics-logo.svg`) are used whole. The gold X in GENIX is a trademark: never masked, reshaped or recoloured. Per-site favicons from `design/assets/*-icons/`.
- **Motion:** GSAP (ScrollTrigger, SplitText, Flip, Draggable) + Lenis for desktop wheel smoothing; the Home Upgrades 3D section (Three.js) loads only near its section. All motion is off with `prefers-reduced-motion`, and every animated section has a static finished state.
- **Phones:** pinned "Get a quote / Call" bar (≤960px), swipe rows for card sets — both as already shared in `design/shared/`.
- **Fonts** self-hosted with `next/font`.
- **Accessibility:** a unit test checks every theme's text/background pairs for WCAG AA (4.5:1 body, 3:1 large text and focus indicators); a failure breaks the build. 44px tap targets; visible focus; keyboard-complete forms.
- **Images:** `next/image` (AVIF/WebP, responsive sizes, lazy below the fold, blur placeholders).

## 4a. Forms and errors

**Submit pipeline (Server Action)**
1. **Validate** with one schema per form (zod), shared by client and server; messages match the prototypes (e.g. "Enter a 5-digit ZIP code.").
2. **Block spam:** hidden honeypot field; Vercel BotID check; rate limit of 5 submissions per IP hash per 10 minutes (counted in Postgres). Honeypot/bot hits get a fake success and are not saved.
3. **Save first:** insert into Inquiries with a reference `GX-<PREFIX>-<6-digit sequence>` (one sequence per division, zero-padded, e.g. `GX-LOG-000001`). Saving precedes email so an email failure never loses a lead.
4. **Email via Resend:**
   - **Team:** to `hello@thegenixgroup.com` (one group inbox, owner decision). Subject `[<Division>] <Type> · <key details>` e.g. `[Logistics] Quote · 92101 → 92024 · 2 pallets`. `Reply-To` = the customer's email when given.
   - **Customer auto-reply** (owner decision), only when an email was given: "We got your request", a summary of their answers, the reference, and the division's phone number.
5. **Email failure:** the inquiry stays saved with `emailSent = false`; a Vercel Cron job retries every 15 minutes (max 5 attempts); the admin inbox shows a warning badge on unsent inquiries.

**What the visitor sees**
| Situation | Response |
|---|---|
| Invalid field | inline message beside the field, focus to the first problem, summary announced politely |
| Rate limited | "Too many requests. Please call us at <phone>." |
| Server/database error | all input kept; "Couldn't send. Try again, or call <phone>." |
| Success | confirmation with the reference number, focused and announced |

Forms work without JavaScript (plain POST to the action; both steps shown).

**Privacy (California / CCPA):** a notice under every form — "We use your details only to reply to this request." + link to Privacy; a Privacy page per site (content from the Sites record); IPs stored only as a salted hash; no marketing opt-ins.

**Site errors:** a themed 404 per site linking to its main pages; a themed error boundary for 500s; if Payload/Postgres is unavailable, cached static pages keep serving.

## 4b. SEO and analytics

- **Per host:** `sitemap.xml` and `robots.txt`; canonical URLs on the site's own host (a page is never indexed under two hosts).
- **Titles:** `<Page> | <Site name>`; home pages use `<Site name> | <Tagline>`. Descriptions and Open Graph data from Payload with defaults from the Sites record.
- **Share images:** generated per page with `next/og` in the site's theme (logo, page title, tagline).
- **Structured data (JSON-LD):** hub `Organization` with the divisions as `subOrganization`; Logistics `MovingCompany`, Home Upgrades `HomeAndConstructionBusiness`, Multimedia `ProfessionalService` (revisit when designed); `areaServed` from each Sites record's coverage; `FAQPage` on FAQ sections.
- **Speed budget:** Lighthouse ≥ 90 on mobile; LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms; the 3D section and videos load on demand.
- **Analytics:** Vercel Web Analytics + Speed Insights (cookieless, so no consent banner); a custom event `quote_sent` with `division` and `type`.
- **Launch checklist (not code):** Google Search Console for all four hosts with sitemaps submitted; a Google Business Profile per customer-facing division.

## 5. Testing

- **Unit:** form schemas (every rule and message), reference-number formatting, theme contrast test, site resolution from host.
- **Integration:** the submit pipeline against a test database with Resend and BotID stubbed — save-before-email, fake success for bots, rate limit, email retry.
- **End to end (Playwright):** port the prototype suites in `design/tests/` to the real sites (they already encode the approved behaviour: form steps, validation, pinned bar, road animation, reduced motion, no-JS), run against preview deployments.
- **Accessibility:** axe checks on every page template; keyboard walk through each form.

## 6. Build order

Each phase ends deployable and tested:
1. **Foundation:** Next.js + Payload + Neon + Blob; `sites.config.ts`; `proxy.ts` host routing; themes; shared layout (header, footer, quote bar); 404/error pages; SEO plumbing (sitemaps, robots, canonical, titles, JSON-LD scaffold, share images); analytics.
2. **Logistics site** (fully prototyped): Home with the quote form and road section; Services, Our work, About, Contact, Privacy; the full inquiry pipeline (4a).
3. **Home Upgrades site:** Home (slider, 3D section, viewer); prerequisite — prototype the Contact page and fix its quote fields; then the remaining pages.
4. **Hub:** Home (reel), About, Contact.
5. **Multimedia:** prerequisite — logo and design; then all pages.

## 7. Open items (owner)

- Real phone numbers per division; callback time; FAQ answers (pickup timing, what we don't move, insurance); proof numbers and photos; Home Upgrades third project and non-stock service photos.
- Multimedia logo.
- Head office street address (for structured data and Business Profiles).
- Home Upgrades quote fields and Multimedia booking fields (decided while prototyping their Contact pages).
