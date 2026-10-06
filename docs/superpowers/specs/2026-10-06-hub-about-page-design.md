# Hub About page — design

**Date:** 2026-10-06 · **Status:** approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-27-genix-websites-design.md` (the hub has Home, About, Contact, Privacy, 404), `2026-10-05-privacy-page-design.md` (code-held page text, hub-only route, address rule).

## Understanding

The hub nav's "Who we are" and the footer's Group link only jump to a short intro on the home page. The owner wants a real About page for The Genix Group at `thegenixgroup.com/about`.

## Decisions (owner, 2026-10-06)

- **Content:** the group story from what the sites already say. **No team, no founding year, no numbers, no testimonials** (none exist yet; nothing is invented). The text lives in code like the privacy page, not in the admin.
- **Links:** the hub header "Who we are" and the footer Group "Who we are" point to `/about`. The home page **keeps** its short `#about` intro and gains a "More about the group →" link under it. Nothing is removed from the home page.
- Hub only. On division and Multimedia hosts `/about` stays a 404 until their own About pages exist.

## The page

Route `web/src/app/(sites)/[site]/about/page.tsx`: `hub` renders; every other site key (and unknown keys) calls `notFound()`. The page renders its own `<main id="main">`, no motion (no `MotionRoot`/`HubMotion`, no `data-reveal`/`data-split`). The hub's header and footer wrap it as usual.

1. **Header section:** `.label` "About", `<h1>` (draft: "One group. Three crews. One standard of work."), lede reusing the home intro's claim: freight, home upgrades and multimedia under one roof, so the care you get from one Genix business is the care you get from all of them; one conversation can cover the move, the build and the photos.
2. **"Three businesses, one standard"** (`<h2>`): three rows labelled Move / Make / Tell as on the home page. Each row: business name (link to that business's own site via `siteOrigin(key)`), the tagline it already uses (`SITES[key].tagline`), and its existing one-line description (Logistics: business freight, courier runs and home or office moves anywhere in the USA; Home Upgrades: accent walls, TV units, outdoor builds and handyman jobs for homes and commercial buildings; Multimedia: photography, video, branding and design for businesses and the people behind them). Logistics and Home Upgrades also list the promises already on their sites (Logistics: a real person to call, clear timelines, price first; Home Upgrades: care in every detail, no guesswork, for every kind of space). Multimedia has none written, so it shows its description only. No new claims.
3. **"Find us"** (`<h2>`): head office San Diego, CA; serving customers across the USA; the group email (`data.email`, fallback `hello@thegenixgroup.com`); the mailing address **only when street, city, state and ZIP are all present** (the same rule and `SiteData.address` as the privacy page); a button "Start a conversation" linking to `/#contact`.
4. Headline and ledes are drafts in the hub's voice; the owner reviews them in the prototype.

Metadata: title "About | The Genix Group" (via `pageMetadata('hub', '/about', { title: 'About', description })`), canonical `https://thegenixgroup.com/about`, indexable. `/about` is added to the hub's `pages` so it appears in `sitemap.xml` (hub only).

## Links

- `SITES.hub.nav`: "Who we are" → `/about` (the other two items unchanged).
- `HubFooter.tsx` Group list: "Who we are" → `/about`.
- Home `Intro.tsx`: a "More about the group →" text link under the intro list, href `/about`; prototype and app together.
- `links.e2e.spec.ts` already follows in-app links from the hub home, so it must resolve the new ones.

## Prototype first

- New `design/hub-about.html` using the hub's styles. The hub prototype keeps all its CSS inline in `hub-home.html`, so (as done for Home Upgrades) move that `<style>` body **unchanged** into `design/shared/hub-home.css`, link it at the same position, and point `web/scripts/port-css.ts` at the file; the regenerated `hub.generated.css` must be byte-identical before any new rule is added.
- New `.about-*` rules (scoped, existing hub tokens: black + gold, division dots from `--move`/`--make`/`--tell`; no blur, no decorative pills, no new animation). Hub header and footer copied from the home prototype; nav/footer/home-intro links edited in both prototypes.
- Port with `npm run port:css` (never hand-edit generated CSS); `hub-overrides.css` stays for hand-written overrides only. Screenshot parity covers the About page (desktop and phone).

## Testing

- **E2E** (`tests/e2e/about.e2e.spec.ts`): hub `/about` shows the h1, the two `<h2>`s in order, three business rows whose links go to the right hosts, the "Start a conversation" link, one `<main id="main">`, title and canonical pinned exactly, no noindex, no sideways scroll at 320 px; `/about` on logistics, homeupgrades and multimedia hosts returns 404; the hub sitemap lists `/about`, a division sitemap does not.
- **Links:** nav, footer and the home intro's "More about the group" all resolve to `/about`; `links.e2e` stays green; the existing hub nav/footer assertions are updated to the new hrefs.
- **Quality:** the hub `/about` URL is added to the axe and console-error tests.
- **Unit:** the address rule is already unit-tested; `seo.test.ts` gets `/about` hub-only sitemap expectations.
- **Parity:** hub About added; the hub home stays green after the intro link and the CSS move.
- README note: where the About text lives and that division About pages don't exist yet.

## Out of scope

Hub Contact; division and Multimedia About pages; a Team collection or any people; admin-editable About text; founding story, numbers, testimonials; motion; a language/translation pass.
