# Home pages port: prototypes into the Next.js app — design

Date: 2026-09-29 · Status: approved in brainstorming (sections 1–4), awaiting spec review
Parent spec: `docs/superpowers/specs/2026-09-27-genix-websites-design.md` (this reorders its §6 build order).

## 0. Decision and scope

The owner reordered the build (2026-09-29): before the enquiry pipeline and inner pages, the three
approved prototype home pages are ported into the app so the live app matches the settled design.

In scope: the home pages of Logistics, Home Upgrades and the Hub, their headers/footers, and the
shared behaviours they use. Out of scope: the enquiry pipeline (4a), inner pages (Services, Our work,
About, Contact, Privacy stay on the foundation's simple layout), Multimedia (no design yet).

Visual source of truth: `design/logistics-home.html`, `design/homeupgrades-home.html`,
`design/hub-home.html` with `design/shared/`, `design/js/`, `design/assets/`.

## 1. Approach: faithful port

The prototype CSS is treated as the specification and moved nearly verbatim; markup is translated to
JSX with the same classes, ids and `data-*` hooks; each behaviour becomes one small client component.
Rejected: a Tailwind rewrite (≈3× the work, high risk of drifting from the approved design) and
embedding the prototype HTML (throwaway; not editable; fights routing, themes and SEO).

Accepted cost: page bodies use the prototype CSS while the shell and inner pages use Tailwind, until
a later tidy-up.

## 2. Structure

```
web/src/app/(sites)/[site]/page.tsx     picks the site's home component
web/src/pages-home/
  logistics/     LogisticsHome.tsx + logistics.css   (from shared/genix.css + shared/style-logistics.css)
  homeupgrades/  HomeUpgradesHome.tsx + homeupgrades.css (from the page's inline <style>)
  hub/           HubHome.tsx + hub.css               (from the page's inline <style>)
  <site>/sections/*.tsx                  one server component per prototype <section>
web/src/components/motion/              one client component per behaviour (section 3)
web/public/brand/…                      prototype images, video, logos, copied unchanged
```

- **CSS:** copied verbatim, every rule scoped under `html[data-site="<key>"]`, loaded only on that
  site's pages. Prototype colour variables map to the existing theme tokens where the values match;
  any new text/background pair is added to the WCAG contrast gate.
- **Header and footer:** the shared `Header`/`Footer` take the prototype markup and classes with a
  per-site variant (the hub's docking logo; Logistics and Home Upgrades navs). The mobile menu keeps
  the foundation's accessible behaviour (Escape closes it, focus returns to the toggle).
- **Server first:** sections are server components; only interactive pieces are client components.
- **Other pages** keep the foundation layout until their phase.

## 3. Motion and interaction

| Component | Used by | Behaviour (from) |
|---|---|---|
| `MotionRoot` | all three | Lenis wheel smoothing on desktop driving ScrollTrigger; `[data-split]` line reveals; `[data-reveal]` quiet reveals (`shared/genix.js`, hub inline script) |
| `QuoteBar` | Logistics, Home Upgrades | pinned "Get a quote / Call" bar ≤960px, hidden over the hero form, quote section and footer (`shared/quote-bar.js`); replaces the foundation version |
| `SwipeRow` | Logistics, Home Upgrades | sideways card rows on phones (`.swipe`) |
| `HubHero`, `LogoDock` | Hub | reel unveil, headline masks, logo docking into the header on scroll; the logo's images move whole, never reshaped |
| `DivisionPanels` | Hub | photo opens from a framed inset to full bleed |
| `BeforeAfter` | Home Upgrades | pointer + keyboard always; Draggable + Inertia fling and one arrival swing |
| `ProjectViewer` | Home Upgrades | native `<dialog>`, Flip grow-from-card |
| `Build3D` | Home Upgrades | Three.js loaded by dynamic import only near its section (`js/build3d.js`) |
| `ProcessLine` | Home Upgrades | gold line fills as the steps are read |
| `RoadSection` | Logistics | truck along the road, stops fill, DELIVERED stamp; scrubbed, no pinning (`js/route.js`) |
| `QuoteForm` | Logistics | two steps, tabs, validation and messages (`js/quote-form.js`); look-only Send (section 5) |

`.swipe` rows are CSS-only; no `SwipeRow` component was needed (ruling, plan 2026-09-29).

Rules:
- `prefers-reduced-motion` and no-JS show every animated section in its finished state; pages are
  fully readable as server HTML.
- Each component scopes its animations in `gsap.context()` and reverts on unmount.
- Libraries from npm, pinned to the prototypes' versions: `gsap` 3.13.0 (SplitText, Draggable,
  InertiaPlugin, Flip, ScrollTrigger), `lenis` 1.3.4, `three` 0.180.0; each loaded only on the pages
  that use it.
- Server HTML equals the prototype's pre-JS state: no hydration mismatches, no flashes.

## 4. Content, images, head

- **Admin-editable:** hero heading and subheading (Sites record). The seed uses the prototypes' exact
  hero wording; the local dev records are updated to match.
- **Built in (until their collections exist):** all other copy, verbatim from the prototypes,
  including the nationwide Logistics wording. "Stock photo" labels and marked proof placeholders stay.
- **Images:** `next/image` (AVIF/WebP, sizes, lazy below the fold, eager hero). Video (hub reel, Home
  Upgrades project) keeps its poster and loads on demand. Logos: the supplied SVGs, whole; the gold X
  is never masked, reshaped or recoloured.
- **Fonts:** every family the prototypes use is self-hosted through `next/font`; no font CDN links.
- **Links:** cross-site links come from the site registry (`siteOrigin`); in-page anchors keep the
  prototype ids (`#services`, `#quote-form`, …).
- **Head:** titles, canonical, share images and JSON-LD stay with the foundation's SEO modules; the
  prototypes' hand-written `<head>` tags are not copied.

## 5. Logistics quote form before the pipeline (owner decision)

The form is look-only until the enquiry pipeline phase; the owner will not put Logistics live before
then. Behaviour matches the prototype: the reference line changes to the confirmation text, announced
via `aria-live`, with no network call.

Safety net: when `VERCEL_ENV === 'production'`, Send instead shows "We can't take requests online
yet. Call us at <phone> or email hello@thegenixgroup.com." (phone from the Sites record, omitted while
empty). The server passes this flag to the form; a unit test covers both branches.

## 6. Build order

1. Shared shell: headers/footers, `MotionRoot`, `QuoteBar`, `SwipeRow`, fonts, asset copy.
2. Logistics home.
3. Home Upgrades home.
4. Hub home.

Then the parent spec's phase 2 resumes (enquiry pipeline, Logistics inner pages), then the other
sites' inner pages, then Multimedia.

## 7. Testing and done

- **Visual parity:** Playwright loads each prototype (`http://localhost:4321/…`) and its app page
  (`http://<site>.localhost:3000/`) at 390×844 and 1440×900 with `reducedMotion: 'reduce'` (finished
  states), videos paused, fonts loaded. Screenshots are compared per section by id/landmark:
  at most 2% of pixels may differ (pixelmatch threshold 0.2). A failure saves the diff image.
- **Behaviour:** the `design/tests/` suites are ported to TypeScript Playwright against the app hosts:
  form steps, tabs and validation messages; road progress, unchanged section height and stamp;
  pinned-bar rules; before/after slider (pointer and keyboard); project viewer; reduced motion; no-JS;
  no horizontal scroll at 390px.
- **Quality:** no console errors or failed requests; axe on the three pages; contrast gate for new
  pairs; keyboard walk through the form and menus; existing suites stay green (tsc, unit, int, e2e).
- **Done:** all of the above pass and the owner has reviewed the three pages in the browser.
