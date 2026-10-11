# Home Upgrades "Our work" — design

**Date:** 2026-10-11 · **Status:** approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-27-genix-websites-design.md` (Projects collection; Our work page; home "Recent work"), `2026-10-12-division-services-pages-design.md`.

## Understanding

The Home Upgrades home has a "Recent work" section with three hard-coded project cards (feature wall photo, custom TV unit video, slat-wall video) that open in a viewer dialog. The owner wants an Our work page at `homeupgrades.thegenixgroup.com/work` and to add new jobs themselves, without a code change.

## Decisions (owner, 2026-10-11)

- **Projects are added in the admin** (a Payload collection), not in code.
- **Home Upgrades only.** Logistics gets no Our work page (no collection field for it, no links); `/work` is a 404 on Logistics, the hub and Multimedia.
- **Seed five projects** from real material already in the repo: the three current Recent work projects plus the marble TV wall and the TV mount photos. Nothing is invented: titles, categories and descriptions come from the current captions and alt text, and the owner can edit them afterwards.

## The Projects collection

`web/src/collections/Projects.ts`, slug `projects`, admin group "Content" (next to Sites):

| Field | Type | Rules |
|---|---|---|
| `title` | text | required, ≤ 80 |
| `category` | text | required, ≤ 40 — the small line on cards ("Accent wall", "TV unit") |
| `description` | textarea | required, ≤ 300 — one or two sentences for the viewer |
| `cover` | upload → `media` | required (its `alt` is required by `media`) |
| `photos` | upload → `media`, `hasMany` | optional, max 8 |
| `video` | upload → `media` | optional; MP4 only (validated by MIME type) |
| `featured` | checkbox | "Show on the home page" |
| `order` | number | default 100; lower first |
| `published` | checkbox | default true; unpublished projects never appear |

- Access: read for anyone only when `published`; create/update/delete for logged-in staff (as Sites).
- Media: the existing `media` collection, stored in Vercel Blob in production (already required). Enable the Vercel Blob plugin's **client uploads** so videos over the 4.5 MB request limit upload straight from the browser. Add `imageSizes` to `media` (e.g. `card` 900 w, `full` 1800 w) so pages serve resized photos; the Blob host is added to `next.config` `images.remotePatterns`.
- `media` also accepts `video/mp4` (`mimeTypes`: images + `video/mp4`).
- A database migration creates the tables (`payload migrate:create`), as with earlier collections.
- **Freshness:** `afterChange`/`afterDelete` hooks call `revalidateTag('projects')`; the read function is `unstable_cache`d with that tag (same pattern as `site:<key>`).

## Reading projects

`web/src/projects/data.ts`: `getProjects({ featured?: boolean, limit?: number })` → published projects ordered by `order` then newest, mapped to a plain `Project` shape (title, category, description, cover {src, alt, width, height}, photos[], video {src, poster} | null).

**Fallback:** if the database has no published projects (e.g. production before the seed has run), both the home section and `/work` use `FALLBACK_PROJECTS` — the same five projects pointing at the static files already in `web/public/brand/`. So production never shows an empty section; once real projects exist, the database wins.

## Seeding

An idempotent script `web/src/seed/projects.ts` (`npm run seed:projects`) uploads the five projects' files from `web/public/brand/` into `media` and creates the five projects (skips any whose title already exists). Locally it runs against the dev DB; for production the owner runs it once with production env vars (README steps), or skips it and adds projects by hand — the fallback covers the gap.

Seeded projects (order, featured):
1. "Accent wall" · category "Accent wall" · photo `hu-project-feature-wall.jpg` (alt from the home card) · featured
2. "Custom TV unit" · "TV unit" · video `hu-project.mp4`, cover `hu-project-poster.jpg` · featured
3. "Accent wall" (slatted) · "Accent wall" · video `hu-project-slat-wall.mp4`, cover `hu-project-slat-wall.jpg` · featured
4. Marble TV wall · "Accent wall & TV unit" · `hu-project-marble-wall.jpg` · not featured
5. TV mount · "TV wall mounting" · `hu-tv-mount.jpg` · not featured
Descriptions: the viewer descriptions already on the home cards for 1–3; for 4–5, the existing alt text turned into a sentence. Titles for 3–5 are drafts the owner can rename in the admin.

## Pages

- **`/work`** (Home Upgrades): own `<main id="main">`, no motion beyond the existing viewer. Header (`.label` "Our work", h1 reusing the home section heading "Finished, not just started.", lede "Real projects by the Genix crew. Tap one to see it larger."), a grid of every published project card (same card markup and classes as the home's `.work-card`, with category + title), the same viewer `<dialog>` (photo or video, title, description), and a closing "Get a quote" → `/contact`. Title "Our work | Genix Home Upgrades", canonical `/work`, indexable, in the Home Upgrades sitemap only.
- **Viewer:** when a project has `photos`, the dialog shows previous/next buttons to step through cover + photos (keyboard ← →, labelled buttons); a video project plays its video as today.
- **Home "Recent work":** renders the featured projects (max 3) from `getProjects({ featured: true, limit: 3 })` with the existing markup, plus an "All our work →" link to `/work`. Seeded so it looks exactly as today; home parity stays green.

## Links

- Home Upgrades nav "Our work": `/#work` → `/work`. Footer Company "Our work": `/#work` → `/work`. Prototypes mirror.

## Prototype first

`design/homeupgrades-work.html` from the home/services prototypes (static five cards, the viewer), `.workpage-*` rules in `design/shared/homeupgrades-home.css`; the viewer prev/next added to the prototype's viewer script too. Port with `npm run port:css`; parity covers `/work` (seeded/fallback content = the prototype's five).

## Testing

- **Unit:** project mapping (cover/photos/video shape, alt carried), ordering, fallback when empty, MP4-only validation for `video`.
- **Int (Postgres):** creating/publishing/unpublishing a project changes `getProjects` output; `featured` + `limit`; `read` access hides unpublished from anonymous users.
- **E2E:** `/work` renders all published projects in order, viewer opens photo and video, prev/next steps through photos (with keyboard), Esc closes and returns focus; Logistics/hub/Multimedia `/work` 404; home Recent work shows the featured three and "All our work"; nav/footer link to `/work`; 320 px; axe + console; parity for `/work` and the home.
- **Admin smoke:** the Projects list and edit form load for a logged-in user (existing admin e2e pattern).
- README: adding a project, video size notes, running the production seed.

## Out of scope

Logistics/Multimedia projects; before/after pairs per project; YouTube/Vimeo links; filters/categories pages; per-project detail pages.
