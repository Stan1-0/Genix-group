# Home Upgrades "Our work" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner add Home Upgrades projects in the admin and show them on a new `homeupgrades.thegenixgroup.com/work` page and in the home "Recent work" section.

**Architecture:** A Payload `projects` collection (cover/photos/video in the existing `media` collection, stored in Vercel Blob) is read through one cached function `getProjects()` that maps docs to a plain `Project` shape and falls back to five static projects when the database has none. Shared `WorkCard` / viewer-dialog components render the cards on both the home and `/work`; the existing `ProjectViewer` gains photo stepping. Prototype first, parity for `/work`.

**Tech Stack:** Next.js 16.3.6, React 19, Payload 3.90.2 (`@payloadcms/storage-vercel-blob` 3.90.2), Postgres, GSAP (existing), Vitest (unit + int), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-homeupgrades-our-work-design.md` (binding).

## Global Constraints

- All app code in `web/`; run commands from `web/`. Prototypes in repo-root `design/`. This is NOT the Next.js in your training data: read `web/node_modules/next/dist/docs/` before using `unstable_cache`, route or metadata APIs; read Payload's docs in `web/node_modules/payload` / `@payloadcms/storage-vercel-blob` types before using collection/upload options.
- **Home Upgrades only.** `/work` renders for `homeupgrades`; `logistics`, `hub`, `multimedia`, unknown → `notFound()`. Nothing Logistics-related is added.
- Collection fields (exactly): `title` text required ≤ 80; `category` text required ≤ 40; `caption` text optional ≤ 60 (Ruling 1); `description` textarea required ≤ 300; `cover` upload→media required; `photos` upload→media hasMany max 8; `video` upload→media optional, MP4 only; `featured` checkbox (label "Show on the home page"); `order` number default 100; `published` checkbox default true.
- Access: anonymous read only where `published` is true; create/update/delete for logged-in staff. Unpublished projects never appear on any page.
- Media: existing `media` collection; `mimeTypes` = images + `video/mp4`; Vercel Blob plugin `clientUploads: true` so large videos upload from the browser.
- Freshness: `afterChange`/`afterDelete` on `projects` call `revalidateTag('projects', 'max')` (unless `context.disableRevalidate`); `getProjects` is `unstable_cache`d with tag `projects`.
- **Fallback:** when the database returns no published projects or the query throws, `getProjects` returns `FALLBACK_PROJECTS` (the five seeded projects using files in `web/public/brand/`), filtered/limited the same way. Production never shows an empty section.
- **No invented content.** Fallback/seed titles, categories, captions, descriptions and alts come from existing site copy (values in Task 1). Titles of projects 4–5 are drafts the owner can rename.
- The home "Recent work" must look the same as today with the fallback/seed data: its markup changes only in `data-title` on cards 2 and 3 (Ruling 2). Home parity stays green.
- `/work`: own `<main id="main">`; no new motion (the existing viewer only; no `data-reveal`/`data-split` on this page); title "Our work | Genix Home Upgrades" via `pageMetadata('homeupgrades', '/work', { title: 'Our work', description })`; canonical `/work`; indexable; in the Home Upgrades sitemap only.
- Tests never touch the real Blob store: Vitest runs with `BLOB_READ_WRITE_TOKEN` empty (Ruling 5). The dev database is not seeded by the plan (Ruling 4).
- New CSS prefixed `.workpage-` (and viewer prev/next `.viewer-nav`), existing Home Upgrades tokens; no blur, no pills, no new animation. Generated CSS only via `npm run port:css` (restore CRLF-noise-only files). Parity 2% limit stays.
- Playwright `--reporter=line`, never concurrently with Vitest, never two Playwright commands at once; never `npm run build` with the dev server up; never kill node or docker processes; ECONNREFUSED/Postgres/Docker errors → STOP and report.
- Before touching `design/` run `git status --short design/`; uncommitted changes you didn't make → STOP (NEEDS_CONTEXT). Never revert/stash files you didn't change. Never commit `web/.env` or uploaded files (`web/media/` must be git-ignored).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Rulings (plan vs spec)

1. Add an optional `caption` field: the home cards already show a third line ("Black panelling, gold inlays"); without it the seeded home could not look the same.
2. The viewer shows the project's `title`, so cards 2 and 3 change `data-title` ("Custom TV unit, start to finish" → "Custom TV unit"; "Slatted feature wall" → "Accent wall"); only the open dialog's heading differs.
3. No `imageSizes` on `media`: `next/image` already resizes `/api/media/file/**` (in `localPatterns`). If video playback/seeking from `/api/media/file/**` fails (no Range support), switch the Blob plugin to `disablePayloadAccessControl: true` (direct Blob URLs) and add `*.public.blob.vercel-storage.com` to `images.remotePatterns` — decide by testing in Task 1.
4. The dev DB stays unseeded: e2e and parity run on the fallback (identical to the prototype); the DB path is covered by int tests against the test DB; the viewer's photo stepping is e2e-tested by adding `data-gallery` to a card in the test.
5. Vitest env sets `BLOB_READ_WRITE_TOKEN: ''` so int-test uploads go to local disk, never the live store.

## Review Focus

1. **Production before the seed/migration runs:** an empty `projects` table or a missing table must show the fallback, not an error page or an empty section (Task 1 unit + int).
2. **Unpublished or draft projects** never appear to visitors, including via `/api/projects` (Task 1 int).
3. **A project with no photos, with photos, and with a video** each render and open correctly; a video upload > 4.5 MB is possible from the admin (Task 1 config; Task 3/4 e2e).
4. **The home "Recent work" with fewer than 3 featured projects** (0, 1, 2) still renders sensibly — 0 → fallback featured (Task 1 unit).
5. **Keyboard/screen-reader use of the viewer:** prev/next buttons labelled, ← → keys, Esc closes and returns focus to the card (Task 3 e2e).

---

## File Structure

| File | Responsibility |
|---|---|
| `web/src/collections/Projects.ts` (new) | the collection, access, revalidation hooks |
| `web/src/collections/Media.ts`, `web/src/payload.config.ts` | mp4 allowed; register Projects; Blob `clientUploads` |
| `web/src/migrations/<ts>_projects.ts/.json` (new), `index.ts` | schema migration |
| `web/src/projects/types.ts`, `fallback.ts`, `map.ts`, `data.ts` (new) | `Project` shape, fallback list, doc→Project, cached `getProjects` |
| `web/src/seed/projects.ts` (new), `package.json` | idempotent seed (`npm run seed:projects`) |
| `web/src/pages-home/homeupgrades/work/WorkCard.tsx`, `ViewerDialog.tsx` (new) | shared card + dialog markup |
| `web/src/components/motion/ProjectViewer.tsx` | photo stepping |
| `web/src/pages-home/homeupgrades/sections/Work.tsx` | home section reads featured projects |
| `web/src/pages-home/homeupgrades/WorkPage.tsx` (new), `web/src/app/(sites)/[site]/work/page.tsx` (new) | `/work` |
| `design/homeupgrades-work.html` (new), `design/shared/homeupgrades-home.css`, `design/homeupgrades-home.html` | prototype + CSS + viewer nav |
| config, `DivisionFooter.tsx`, README (Task 5) | links, docs |

---

### Task 1: Projects collection and `getProjects`

**Files:**
- Create: `web/src/collections/Projects.ts`, `web/src/projects/types.ts`, `web/src/projects/fallback.ts`, `web/src/projects/map.ts`, `web/src/projects/data.ts`, a migration via the Payload CLI, `web/tests/unit/projects.test.ts`, `web/tests/int/projects.int.spec.ts`
- Modify: `web/src/collections/Media.ts`, `web/src/payload.config.ts`, `web/src/migrations/index.ts` (by the CLI), `web/vitest.config.mts` (env), `web/.gitignore` (`/media/` if missing), `web/src/payload-types.ts` (`npm run generate:types`)

**Interfaces:**
- Produces:
  - `type ProjectImage = { src: string; alt: string; width: number; height: number }`
  - `type Project = { id: string; title: string; category: string; caption: string | null; description: string; cover: ProjectImage; photos: ProjectImage[]; video: { src: string } | null; featured: boolean; order: number }`
  - `FALLBACK_PROJECTS: readonly Project[]` (`@/projects/fallback`)
  - `toProject(doc: unknown): Project | null` (`@/projects/map`; null when the doc lacks a usable cover)
  - `selectProjects(list: readonly Project[], opts?: { featured?: boolean; limit?: number }): Project[]` (pure; sort by `order` asc, keep input order for ties; filter featured; limit)
  - `getProjects(opts?: { featured?: boolean; limit?: number }): Promise<Project[]>` (`@/projects/data`, server-only, cached with tag `projects`, falls back)

- [ ] **Step 1: Vitest never uses the real Blob store.** In `web/vitest.config.mts` add `BLOB_READ_WRITE_TOKEN: ''` to `test.env`. Make sure `/media/` (Payload's local upload dir) is in `web/.gitignore`. Run `npx vitest run` → still green (record the count).

- [ ] **Step 2: Write the failing unit tests** — `web/tests/unit/projects.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { FALLBACK_PROJECTS } from '@/projects/fallback'
import { selectProjects, toProject } from '@/projects/map'

describe('FALLBACK_PROJECTS', () => {
  it('holds the five seeded projects in order, three featured', () => {
    expect(FALLBACK_PROJECTS.map((p) => p.id)).toEqual(['feature-wall', 'tv-unit', 'slat-wall', 'marble-wall', 'tv-mount'])
    expect(FALLBACK_PROJECTS.filter((p) => p.featured).map((p) => p.id)).toEqual(['feature-wall', 'tv-unit', 'slat-wall'])
    for (const p of FALLBACK_PROJECTS) {
      expect(p.cover.src.startsWith('/brand/')).toBe(true)
      expect(p.cover.alt.length).toBeGreaterThan(10)
      expect(p.cover.width).toBeGreaterThan(0)
    }
    expect(FALLBACK_PROJECTS.find((p) => p.id === 'tv-unit')!.video).toEqual({ src: '/brand/hu-project.mp4' })
  })
})

describe('selectProjects', () => {
  const p = (id: string, order: number, featured: boolean) => ({ ...FALLBACK_PROJECTS[0], id, order, featured })
  it('sorts by order, filters featured, limits', () => {
    const list = [p('c', 30, true), p('a', 10, false), p('b', 20, true), p('d', 20, true)]
    expect(selectProjects(list).map((x) => x.id)).toEqual(['a', 'b', 'd', 'c'])
    expect(selectProjects(list, { featured: true, limit: 2 }).map((x) => x.id)).toEqual(['b', 'd'])
    expect(selectProjects([], { featured: true, limit: 3 })).toEqual([])
  })
})

describe('toProject', () => {
  const media = (filename: string, mimeType = 'image/jpeg') => ({ id: 1, url: `/api/media/file/${filename}`, alt: `Alt for ${filename}`, width: 800, height: 600, mimeType, filename })
  it('maps a populated doc', () => {
    const out = toProject({ id: 7, title: 'Wall', category: 'Accent wall', caption: null, description: 'A wall.', cover: media('c.jpg'), photos: [media('p1.jpg')], video: media('v.mp4', 'video/mp4'), featured: true, order: 5, published: true })
    expect(out).toEqual({ id: '7', title: 'Wall', category: 'Accent wall', caption: null, description: 'A wall.', cover: { src: '/api/media/file/c.jpg', alt: 'Alt for c.jpg', width: 800, height: 600 }, photos: [{ src: '/api/media/file/p1.jpg', alt: 'Alt for p1.jpg', width: 800, height: 600 }], video: { src: '/api/media/file/v.mp4' }, featured: true, order: 5 })
  })
  it('returns null without a usable cover and drops unpopulated photos', () => {
    expect(toProject({ id: 1, title: 'x', category: 'y', description: 'z', cover: 3, photos: [], order: 1 })).toBeNull()
    const out = toProject({ id: 2, title: 'x', category: 'y', description: 'z', cover: media('c.jpg'), photos: [5, media('p.jpg')], video: null, featured: false, order: 1 })
    expect(out!.photos).toHaveLength(1)
    expect(out!.video).toBeNull()
  })
})
```

- [ ] **Step 3: Run** — `npx vitest run tests/unit/projects.test.ts` → FAIL.

- [ ] **Step 4: Implement the shape, fallback and mapping.**

`web/src/projects/types.ts`:

```ts
export type ProjectImage = { src: string; alt: string; width: number; height: number }
export type Project = {
  id: string
  title: string
  category: string
  caption: string | null
  description: string
  cover: ProjectImage
  photos: ProjectImage[]
  video: { src: string } | null
  featured: boolean
  order: number
}
```

`web/src/projects/fallback.ts` (copy is from the current home cards / approach section; check the marble image's real pixel size with `node -e "require('sharp')('public/brand/hu-project-marble-wall.jpg').metadata().then(m=>console.log(m.width,m.height))"` and use it):

```ts
import type { Project } from './types'

/* The five seeded projects, served from public/brand when the database has none
   (e.g. production before `npm run seed:projects`). Copy comes from the home's Recent work cards. */
export const FALLBACK_PROJECTS: readonly Project[] = [
  { id: 'feature-wall', title: 'Accent wall', category: 'Accent wall', caption: 'Black panelling, gold inlays', description: 'Black diagonal panelling with gold inlay strips.', cover: { src: '/brand/hu-project-feature-wall.jpg', alt: 'Black accent wall with diagonal panelling and gold inlay strips', width: 1289, height: 1600 }, photos: [], video: null, featured: true, order: 10 },
  { id: 'tv-unit', title: 'Custom TV unit', category: 'TV unit', caption: 'Start to finish in 13 seconds', description: 'From cutting the panels to the finished, backlit wall.', cover: { src: '/brand/hu-project-poster.jpg', alt: 'Finished custom TV wall with warm LED backlighting', width: 900, height: 675 }, photos: [], video: { src: '/brand/hu-project.mp4' }, featured: true, order: 20 },
  { id: 'slat-wall', title: 'Accent wall', category: 'Accent wall', caption: 'Black slats, gold inlays, floating shelf', description: 'Black slats and diagonal gold inlays framing a floating shelf.', cover: { src: '/brand/hu-project-slat-wall.jpg', alt: 'Black feature wall with vertical slats, diagonal gold inlay strips and a floating shelf', width: 1200, height: 1600 }, photos: [], video: { src: '/brand/hu-project-slat-wall.mp4' }, featured: true, order: 30 },
  { id: 'marble-wall', title: 'Marble TV wall', category: 'Accent wall & TV unit', caption: null, description: 'Backlit marble TV wall with a slatted wood surround.', cover: { src: '/brand/hu-project-marble-wall.jpg', alt: 'Backlit marble TV wall with slatted wood surround', width: 0, height: 0 }, photos: [], video: null, featured: false, order: 40 },
  { id: 'tv-mount', title: 'TV wall mounting', category: 'TV wall mounting', caption: null, description: 'A slatted wood feature wall with a wall-mounted TV and floating console.', cover: { src: '/brand/hu-tv-mount.jpg', alt: 'Slatted wood feature wall with a wall-mounted TV and floating console', width: 3710, height: 1944 }, photos: [], video: null, featured: false, order: 50 },
]
```

(Replace the marble `width: 0, height: 0` with the real values before committing; the unit test requires width > 0.)

`web/src/projects/map.ts`:

```ts
import type { Project, ProjectImage } from './types'

type Media = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null; mimeType?: string | null }
const isMedia = (m: unknown): m is Media => typeof m === 'object' && m !== null && typeof (m as Media).url === 'string'
const image = (m: unknown): ProjectImage | null =>
  isMedia(m) && m.width && m.height ? { src: m.url!, alt: m.alt ?? '', width: m.width, height: m.height } : null

/** A Payload `projects` doc (depth ≥ 1) → Project; null when it has no usable cover. */
export function toProject(doc: unknown): Project | null {
  const d = doc as Record<string, unknown>
  const cover = image(d.cover)
  if (!cover) return null
  const photos = (Array.isArray(d.photos) ? d.photos : []).map(image).filter((p): p is ProjectImage => p !== null)
  const video = isMedia(d.video) && d.video.mimeType === 'video/mp4' ? { src: d.video.url! } : null
  return {
    id: String(d.id),
    title: String(d.title ?? ''),
    category: String(d.category ?? ''),
    caption: typeof d.caption === 'string' && d.caption.trim() ? d.caption : null,
    description: String(d.description ?? ''),
    cover,
    photos,
    video,
    featured: Boolean(d.featured),
    order: typeof d.order === 'number' ? d.order : 100,
  }
}

/** Sort by `order` (stable for ties), optionally keep only featured, optionally limit. */
export function selectProjects(list: readonly Project[], opts: { featured?: boolean; limit?: number } = {}): Project[] {
  const sorted = list.map((p, i) => [p, i] as const).sort((a, b) => a[0].order - b[0].order || a[1] - b[1]).map(([p]) => p)
  const kept = opts.featured ? sorted.filter((p) => p.featured) : sorted
  return opts.limit === undefined ? kept : kept.slice(0, opts.limit)
}
```

- [ ] **Step 5: Run** — unit tests PASS.

- [ ] **Step 6: The collection.** `web/src/collections/Projects.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { revalidateTag } from 'next/cache'
import { isLoggedIn } from '@/payload/access'

const refresh = ({ context }: { context?: Record<string, unknown> }) => {
  if (!context?.disableRevalidate) revalidateTag('projects', 'max')
}

/** Home Upgrades projects: the /work page and the home "Recent work" (featured). */
export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: { useAsTitle: 'title', group: 'Content', defaultColumns: ['title', 'category', 'featured', 'published', 'order'] },
  access: {
    read: ({ req }) => (req.user ? true : { published: { equals: true } }),
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  defaultSort: 'order',
  hooks: {
    afterChange: [({ context }) => refresh({ context })],
    afterDelete: [({ context }) => refresh({ context })],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 80 },
    { name: 'category', type: 'text', required: true, maxLength: 40, admin: { description: 'The small line on the card, e.g. "Accent wall".' } },
    { name: 'caption', type: 'text', maxLength: 60, admin: { description: 'Optional short line under the title on the card.' } },
    { name: 'description', type: 'textarea', required: true, maxLength: 300, admin: { description: 'One or two sentences shown when the project is opened.' } },
    { name: 'cover', type: 'upload', relationTo: 'media', required: true },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 8 },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional MP4 video. The cover photo is shown before it plays.' },
      validate: async (value, { req }) => {
        if (!value) return true
        const id = typeof value === 'object' ? (value as { id: string | number }).id : value
        const m = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
        return m?.mimeType === 'video/mp4' || 'Choose an MP4 video.'
      },
    },
    { name: 'featured', type: 'checkbox', label: 'Show on the home page', defaultValue: false },
    { name: 'order', type: 'number', defaultValue: 100, admin: { description: 'Lower numbers come first.' } },
    { name: 'published', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
```

(Check the Payload 3.90 `validate` signature for upload fields in `node_modules/payload` types and adapt; keep the rule "MP4 only".)

`Media.ts`: change `upload: true` to `upload: { mimeTypes: ['image/*', 'video/mp4'] }` (keep everything else).
`payload.config.ts`: add `Projects` to `collections` (after `Sites`); in `vercelBlobStorage({...})` add `clientUploads: true`.
Run `npm run generate:types`.

- [ ] **Step 7: Migration.** With the dev server running against the local DB (schema is `push`ed in dev), create the production migration: `npm run payload -- migrate:create projects`. Check the generated `up` creates `projects`, its relationship/`hasMany` table and the `media` changes only; commit it with the updated `migrations/index.ts`.

- [ ] **Step 8: `getProjects`.** `web/src/projects/data.ts`:

```ts
import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FALLBACK_PROJECTS } from './fallback'
import { selectProjects, toProject } from './map'
import type { Project } from './types'

async function readProjects(): Promise<Project[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'projects', where: { published: { equals: true } }, depth: 1, limit: 100, sort: 'order', overrideAccess: false })
  return docs.map(toProject).filter((p): p is Project => p !== null)
}

/** Published projects (ordered), or the five fallback projects when there are none or the read fails. */
export async function getProjects(opts: { featured?: boolean; limit?: number } = {}): Promise<Project[]> {
  let list: Project[] = []
  try {
    list = await unstable_cache(readProjects, ['projects', 'v1'], { tags: ['projects'] })()
  } catch (err) {
    console.error('getProjects: falling back to the static projects', err)
  }
  return selectProjects(list.length ? list : FALLBACK_PROJECTS, opts)
}
```

(Note: when the DB has projects, `featured` filtering applies to DB projects only; with 0 featured DB projects the home shows none — Review Focus 4 says "0 → fallback featured" only when the DB has no published projects at all. Keep that behaviour and test it.)

- [ ] **Step 9: Write the int tests** — `web/tests/int/projects.int.spec.ts` (follow `tests/int/sites.int.spec.ts` for setup; uploads go to local disk because the Blob token is empty):

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'
import { toProject, selectProjects } from '@/projects/map'

let payload: Payload
const png = async () => sharp({ create: { width: 8, height: 6, channels: 3, background: '#c28a2c' } }).png().toBuffer()
const upload = async (name: string) => {
  const data = await png()
  return payload.create({ collection: 'media', data: { alt: `Alt ${name}` }, file: { data, mimetype: 'image/png', name, size: data.length } })
}
const make = async (over: Record<string, unknown>) => {
  const cover = await upload(`c-${Math.random().toString(36).slice(2)}.png`)
  return payload.create({ collection: 'projects', data: { title: 'T', category: 'C', description: 'D long enough.', cover: cover.id, ...over }, context: { disableRevalidate: true } })
}

beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'projects', where: { id: { exists: true } }, context: { disableRevalidate: true } }) })

describe('projects collection', () => {
  it('anonymous reads see only published projects', async () => {
    await make({ title: 'Live', published: true })
    await make({ title: 'Draft', published: false })
    const anon = await payload.find({ collection: 'projects', overrideAccess: false, depth: 1 })
    expect(anon.docs.map((d) => d.title)).toEqual(['Live'])
  })
  it('maps populated docs and orders/limits featured ones', async () => {
    await make({ title: 'B', order: 20, featured: true })
    await make({ title: 'A', order: 10, featured: true })
    await make({ title: 'C', order: 5, featured: false })
    const { docs } = await payload.find({ collection: 'projects', depth: 1, overrideAccess: false })
    const list = docs.map(toProject).filter(Boolean) as NonNullable<ReturnType<typeof toProject>>[]
    expect(list[0].cover.src).toMatch(/^\/api\/media\/file\//)
    expect(selectProjects(list, { featured: true, limit: 1 }).map((p) => p.title)).toEqual(['A'])
  })
  it('refuses a non-MP4 video', async () => {
    const notVideo = await upload('still.png')
    await expect(make({ title: 'V', video: notVideo.id })).rejects.toThrow()
  })
})
```

(`getProjects` itself uses `unstable_cache`, which needs Next's runtime; it is covered by the unit-level `selectProjects`/fallback tests and the e2e. If you can call `getProjects` in Vitest without the cache, add a test that an empty table returns the five fallback projects.)

- [ ] **Step 10: Run** — `npx tsc --noEmit`; `npx vitest run` → all pass. Then in the dev server: log in to `/admin` (local test credentials only, from the project's seed/fixtures), check the Projects list and edit form load, upload one small MP4 and confirm it plays and seeks in the browser from its media URL (Ruling 3: if seeking fails, apply the `disablePayloadAccessControl` alternative now and note it). Delete any test project/media you created in the dev DB afterwards.

- [ ] **Step 11: Commit**

```bash
git add src tests vitest.config.mts .gitignore package.json
git commit -m "feat(projects): Projects collection, media video uploads and a cached projects reader with fallback"
```

---

### Task 2: Seed script

**Files:**
- Create: `web/src/seed/projects.ts`, `web/tests/int/projects-seed.int.spec.ts`
- Modify: `web/package.json` (`"seed:projects": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/projects.ts"`)

**Interfaces:**
- Consumes: `FALLBACK_PROJECTS` (Task 1).
- Produces: `seedProjects(payload: Payload, opts?: { dir?: string }): Promise<{ created: string[]; skipped: string[] }>` (exported for the test) and the script entry.

- [ ] **Step 1: Write the failing int test** — `web/tests/int/projects-seed.int.spec.ts`:

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { seedProjects } from '@/seed/projects'

let payload: Payload
beforeAll(async () => { payload = await getPayload({ config: await config }) })
beforeEach(async () => { await payload.delete({ collection: 'projects', where: { id: { exists: true } }, context: { disableRevalidate: true } }) })

describe('seedProjects', () => {
  it('creates the five projects once and skips them on a second run', async () => {
    const first = await seedProjects(payload)
    expect(first.created).toHaveLength(5)
    const { docs } = await payload.find({ collection: 'projects', depth: 1, sort: 'order', limit: 10 })
    expect(docs.map((d) => d.title)).toEqual(['Accent wall', 'Custom TV unit', 'Accent wall', 'Marble TV wall', 'TV wall mounting'])
    expect(docs.filter((d) => d.featured)).toHaveLength(3)
    expect(typeof docs[1].video === 'object' && (docs[1].video as { mimeType: string }).mimeType).toBe('video/mp4')
    const second = await seedProjects(payload)
    expect(second.created).toHaveLength(0)
    expect(second.skipped).toHaveLength(5)
  }, 120_000)
})
```

Run → FAIL.

- [ ] **Step 2: Implement** `web/src/seed/projects.ts`. For each `FALLBACK_PROJECTS` entry, in order: skip if a project with the same `order` and `title` exists; otherwise upload the cover (and the video when present) from `web/public/brand/<file>` into `media` (alt = the fallback alt; for videos alt = the project title), then create the project with `title, category, caption, description, cover, video, featured, order, published: true` and `context: { disableRevalidate: true }`. Use `path.resolve(process.cwd(), 'public/brand')` by default (overridable by `opts.dir`). The script entry (when run by `payload run`) calls `seedProjects(await getPayload({ config }))`, prints created/skipped, then calls `revalidateTag` is not available in a script — so print "Saved. The site picks this up within an hour, or immediately after the next deploy." (the pages are ISR with tag `projects`; a deploy also clears it). Exit 0.

- [ ] **Step 3: Run** — `npx vitest run tests/int/projects-seed.int.spec.ts` → PASS; full `npx vitest run` → pass. (Do not run `npm run seed:projects` against the dev DB — Ruling 4.)

- [ ] **Step 4: Commit**

```bash
git add src/seed/projects.ts tests/int/projects-seed.int.spec.ts package.json
git commit -m "feat(projects): seed the five Home Upgrades projects (idempotent)"
```

---

### Task 3: Shared cards, viewer photo stepping, home "Recent work" from projects

**Files:**
- Create: `web/src/pages-home/homeupgrades/work/WorkCard.tsx`, `web/src/pages-home/homeupgrades/work/ViewerDialog.tsx`, `web/tests/e2e/work-viewer.e2e.spec.ts`
- Modify: `web/src/pages-home/homeupgrades/sections/Work.tsx`, `web/src/components/motion/ProjectViewer.tsx`, `design/homeupgrades-home.html` (viewer prev/next markup + script, `data-title` of cards 2–3), `design/shared/homeupgrades-home.css` (`.viewer-nav`), generated CSS

**Interfaces:**
- Consumes: `Project` (`@/projects/types`), `getProjects` (`@/projects/data`).
- Produces: `WorkCard({ project, reveal }: { project: Project; reveal: boolean })` (a `<button class="work-card">` exactly like today's cards); `ViewerDialog()` (the `<dialog id="viewer">` with prev/next); `ProjectViewer` reads `data-gallery` (JSON array of `{src, alt}`) when present.

Card mapping (must reproduce today's markup byte-for-byte for the fallback, apart from Ruling 2): attributes in this order — `className="work-card"`, `data-reveal` (only when `reveal`), `data-kind={video ? 'video' : 'img'}`, `data-src={video ? video.src : cover.src}`, `data-poster={cover.src}` only for video, `data-title={title}`, `data-desc={description}`, `data-gallery={JSON.stringify([cover, ...photos].map(({src, alt}) => ({src, alt})))}` only when `photos.length > 0`; children: `<Image src={cover.src} alt={cover.alt} width height sizes="(max-width: 900px) 90vw, 33vw" loading="lazy" />`, the play badge `<span className="work-play">…</span>` only for video (same SVG), `<span className="work-cap"><small>{category}{video ? ' · video' : ''}</small><b>{title}</b>{caption && <span>{caption}</span>}</span>`.

Viewer dialog: today's markup plus, inside `.viewer-inner` after the media slot, `<div className="viewer-nav" id="viewerNav" hidden><button type="button" id="viewerPrev" aria-label="Previous photo">‹</button><span id="viewerCount" aria-live="polite"></span><button type="button" id="viewerNext" aria-label="Next photo">›</button></div>` (use the site's existing icon style for the arrows: inline SVG chevrons like the close button). Hidden unless the opened card has `data-gallery` with 2+ items.

- [ ] **Step 1: Capture the "before".** `curl -s -H 'Host: homeupgrades.localhost:3000' http://127.0.0.1:3000/` → cut from `<section class="work"` to the end of `</dialog>` → scratchpad `before-work.html`.

- [ ] **Step 2: Write the failing e2e** — `web/tests/e2e/work-viewer.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const HOME = 'http://homeupgrades.localhost:3000/'

test('home Recent work shows the three featured projects', async ({ page }) => {
  await page.goto(HOME)
  await expect(page.locator('#work .work-card b')).toHaveText(['Accent wall', 'Custom TV unit', 'Accent wall'])
  await expect(page.locator('#work .work-card').nth(1)).toHaveAttribute('data-kind', 'video')
})

test('the viewer steps through a gallery with buttons and arrow keys, Esc returns focus', async ({ page }) => {
  await page.goto(HOME)
  const card = page.locator('#work .work-card').first()
  await card.evaluate((el) => {
    el.setAttribute('data-gallery', JSON.stringify([
      { src: '/brand/hu-project-feature-wall.jpg', alt: 'First photo' },
      { src: '/brand/hu-tv-mount.jpg', alt: 'Second photo' },
      { src: '/brand/hu-project-marble-wall.jpg', alt: 'Third photo' },
    ]))
  })
  await card.click()
  const dlg = page.locator('dialog#viewer')
  await expect(dlg).toBeVisible()
  await expect(page.locator('#viewerNav')).toBeVisible()
  await expect(page.locator('#viewerCount')).toHaveText('1 / 3')
  await page.locator('#viewerNext').click()
  await expect(page.locator('#viewerCount')).toHaveText('2 / 3')
  await expect(dlg.locator('img.viewer-media')).toHaveAttribute('alt', 'Second photo')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#viewerCount')).toHaveText('3 / 3')
  await page.keyboard.press('ArrowRight') // wraps
  await expect(page.locator('#viewerCount')).toHaveText('1 / 3')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#viewerCount')).toHaveText('3 / 3')
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await expect(card).toBeFocused()
})

test('a single-photo project shows no prev/next; a video project plays', async ({ page }) => {
  await page.goto(HOME)
  await page.locator('#work .work-card').first().click()
  await expect(page.locator('#viewerNav')).toBeHidden()
  await page.keyboard.press('Escape')
  await page.locator('#work .work-card').nth(1).click()
  await expect(page.locator('dialog#viewer video.viewer-media')).toHaveAttribute('src', '/brand/hu-project.mp4')
  await expect(page.locator('#viewerNav')).toBeHidden()
})
```

Run → FAIL (no `#viewerNav`).

- [ ] **Step 3: Implement.** Create `WorkCard.tsx` and `ViewerDialog.tsx` per the contracts above. `Work.tsx` becomes `export async function Work()` rendering the same section header, `{(await getProjects({ featured: true, limit: 3 })).map((p) => <WorkCard key={p.id} project={p} reveal />)}` in `.work-grid`, then `<ViewerDialog />` and `<ProjectViewer />`. Check `HomeUpgradesHome.tsx` renders `<Work />` in an async-compatible way (server component). In `ProjectViewer.tsx`: on card click, read `card.dataset.gallery` → `JSON.parse` in try/catch → array of `{src, alt}`; if 2+ items, show `#viewerNav`, set `#viewerCount` "1 / n", wire prev/next buttons and ArrowLeft/ArrowRight on the dialog (wrap around) to swap the `<img>`'s `src`/`alt` (no Flip on step); otherwise hide `#viewerNav`. Remove listeners via the existing `signal`; reset the nav in `close` and cleanup. Prototype: add the same nav markup to the home dialog, the same behaviour to its viewer script, `.viewer-nav` CSS (bottom-centre over the media, 44 px buttons, existing tokens, visible focus) in `design/shared/homeupgrades-home.css`, and change cards 2–3 `data-title` per Ruling 2; `npm run port:css`.

- [ ] **Step 4: Verify the home markup.** Re-capture `after-work.html`; `diff before-work.html after-work.html` → only the two `data-title` values and the added `viewer-nav` block differ (paste the diff). Run `npx tsc --noEmit`; `npx vitest run`; `npx playwright test tests/e2e/work-viewer.e2e.spec.ts tests/e2e/homeupgrades-home.e2e.spec.ts tests/e2e/parity.e2e.spec.ts --reporter=line` (one solo re-run allowed for "clicking during the swing" / a parity phone spec).

- [ ] **Step 5: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(projects): home Recent work reads featured projects; viewer steps through photos"
```

---

### Task 4: The `/work` page

**Files:**
- Create: `design/homeupgrades-work.html`, `web/src/pages-home/homeupgrades/WorkPage.tsx`, `web/src/app/(sites)/[site]/work/page.tsx`, `web/tests/e2e/work.e2e.spec.ts`
- Modify: `design/shared/homeupgrades-home.css` (`.workpage-*`), `web/src/sites/config.ts` (homeupgrades `pages` + `/work`), `web/tests/e2e/parity.e2e.spec.ts`, `web/tests/e2e/quality.e2e.spec.ts`, `web/tests/unit/seo.test.ts`; generated CSS

**Interfaces:**
- Consumes: `getProjects`, `WorkCard`, `ViewerDialog`, `ProjectViewer`, `pageMetadata`.
- Produces: `WorkPage({ projects }: { projects: Project[] })`; route `/homeupgrades/work`.

Markup contract (prototype and app match):

```html
<main id="main">                                     <!-- prototype: id="top" -->
  <section class="workpage-hero" id="work-top"><div class="wrap">
    <p class="label">Our work</p>
    <h1 class="h-display">Finished, <span class="gold">not just started.</span></h1>
    <p class="body">Real projects by the Genix crew. Tap one to see it larger.</p>
  </div></section>
  <section class="work workpage-grid" id="work"><div class="wrap">
    <div class="work-grid"> {every published project: WorkCard reveal={false}} </div>
  </div></section>
  <section class="workpage-cta" id="work-cta"><div class="wrap">
    <h2 class="h-section">Want something like this?</h2>
    <a class="btn btn-gold" href="/contact">Get a quote <span aria-hidden="true">→</span></a>
  </div></section>
</main>
<!-- ViewerDialog + ProjectViewer after main (as on the home) -->
```

(The CTA heading "Want something like this?" is a draft; the owner reviews it in the prototype.)

- [ ] **Step 1: Write the failing e2e** — `web/tests/e2e/work.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const WORK = 'http://homeupgrades.localhost:3000/work'

test('/work lists every project in order and opens them', async ({ page }) => {
  await page.goto(WORK)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('.work-card b')).toHaveText(['Accent wall', 'Custom TV unit', 'Accent wall', 'Marble TV wall', 'TV wall mounting'])
  await expect(page.locator('.work-card[data-reveal]')).toHaveCount(0)
  await page.locator('.work-card').nth(3).click()
  await expect(page.locator('dialog#viewer')).toBeVisible()
  await expect(page.locator('#viewerTitle')).toHaveText('Marble TV wall')
  await page.keyboard.press('Escape')
  await expect(page.locator('#work-cta a.btn')).toHaveAttribute('href', '/contact')
  await expect(page.locator('main#main')).toHaveCount(1)
  expect(await page.title()).toBe('Our work | Genix Home Upgrades')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', WORK)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

for (const host of ['logistics.localhost:3000', 'localhost:3000', 'multimedia.localhost:3000']) {
  test(`${host}/work is a 404`, async ({ page }) => {
    const res = await page.goto(`http://${host}/work`)
    expect(res?.status()).toBe(404)
  })
}

test('no sideways scroll at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(WORK)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
```

Add `{ site: 'homeupgrades-work', proto: '/homeupgrades-work.html', app: 'http://homeupgrades.localhost:3000/work', chrome: true, sections: true }` to `PARITY`; add the URL to `HOMES` in `quality.e2e.spec.ts`; in `seo.test.ts` assert the homeupgrades sitemap contains `/work</loc>` and logistics/hub/multimedia do not. Run → FAIL.

- [ ] **Step 2: Prototype** `design/homeupgrades-work.html` from `design/homeupgrades-services.html` (head: title "Our work | Genix Home Upgrades", description, canonical `https://homeupgrades.thegenixgroup.com/work`; same stylesheets; header/footer as there; `<main id="top">` per the contract with the five fallback projects as static cards (same markup as the home cards, without `data-reveal`); the viewer dialog with prev/next and its script from `homeupgrades-home.html`; the pinned quote bar as on the services page, its primary link → `homeupgrades-contact.html`). Append `.workpage-*` rules to `design/shared/homeupgrades-home.css`: hero like the services hero; `.workpage-grid .work-grid` 3 columns ≥ 961 px, 2 at 641–960, 1 below (cards keep the home card look); `.workpage-cta` closing band like the services quoting band. `npm run port:css`. Screenshots at 1280/390 to the scratchpad; LOOK and describe.

- [ ] **Step 3: App.** `WorkPage.tsx` renders the contract (`<main id="main" data-quote-href="/contact">` so the pinned bar goes to `/contact`, as on Services) followed by `<ViewerDialog />` and `<ProjectViewer />`. `work/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WorkPage } from '@/pages-home/homeupgrades/WorkPage'
import { getProjects } from '@/projects/data'
import { isSiteKey } from '@/sites/config'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'homeupgrades') return {}
  return pageMetadata('homeupgrades', '/work', { title: 'Our work', description: 'Recent Genix Home Upgrades projects: accent walls, TV units and wall mounting, finished by our crew.' })
}

// Our work exists for Home Upgrades only.
export default async function Work({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || site !== 'homeupgrades') notFound()
  return <WorkPage projects={await getProjects()} />
}
```

`config.ts`: homeupgrades `pages: ['/', '/contact', '/services', '/work']`.

- [ ] **Step 4: Run** — `npx tsc --noEmit`; `npx vitest run`; `npx playwright test tests/e2e/work.e2e.spec.ts tests/e2e/work-viewer.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/quality.e2e.spec.ts tests/e2e/seo.e2e.spec.ts --reporter=line` → pass.

- [ ] **Step 5: Commit**

```bash
git add ../design web/src web/tests
git commit -m "feat(projects): Home Upgrades Our work page"
```

---

### Task 5: Links, docs

**Files:**
- Modify: `web/src/sites/config.ts` (homeupgrades nav "Our work" → `/work`), `web/src/components/site/division/DivisionFooter.tsx` (homeupgrades company "Our work" → `/work`), `web/src/pages-home/homeupgrades/sections/Work.tsx` ("All our work →" link), the Home Upgrades prototypes (`homeupgrades-home.html`, `-contact.html`, `-services.html`, `-work.html`: nav + footer + home link), `web/README.md`
- Create: `web/tests/e2e/work-links.e2e.spec.ts`

- [ ] **Step 1: Write the failing test** — `web/tests/e2e/work-links.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const HOME = 'http://homeupgrades.localhost:3000/'

test('nav, footer and the home section link to /work', async ({ page }) => {
  await page.goto(HOME)
  await expect(page.locator('nav#nav a', { hasText: /^Our work$/ })).toHaveAttribute('href', '/work')
  await expect(page.locator('footer a', { hasText: /^Our work$/ })).toHaveAttribute('href', '/work')
  const all = page.locator('#work a[href="/work"]')
  await expect(all).toHaveCount(1)
  await all.click()
  await expect(page).toHaveURL(`${HOME}work`)
})

test('Logistics has no Our work link', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  await expect(page.locator('a[href="/work"]')).toHaveCount(0)
})
```

Run → FAIL.

- [ ] **Step 2: Implement.** `config.ts` homeupgrades nav `{ label: 'Our work', href: '/#work' }` → `'/work'`; `DivisionFooter.tsx` homeupgrades company `['Our work', '/#work']` → `'/work'`; home `Work.tsx` header: add `<a className="svcpage-more" href="/work" data-reveal>All our work <span aria-hidden="true">→</span></a>` after the lede paragraph inside `.sec-head` (reuses the existing `.svcpage-more` style); the home prototype the same with `href="homeupgrades-work.html"`; all four HU prototypes' nav and footer "Our work" → `homeupgrades-work.html`. Grep `tests/` for `/#work` and update expectations that encode the old href; list each. `web/README.md`: add "### Our work (Home Upgrades projects)" — how to add a project in Admin → Content → Projects (cover required; up to 8 photos; optional MP4 video, uploads go straight to Blob so large files are fine; tick "Show on the home page" for up to three; lower Order first; untick Published to hide), that changes appear within seconds, the fallback behaviour, and the one-time production seed: "with the production env vars in `web/.env.production.local` (from `vercel env pull`), run `npm run seed:projects` once; it skips projects that already exist."

- [ ] **Step 3: Run** — `npx playwright test tests/e2e/work-links.e2e.spec.ts tests/e2e/links.e2e.spec.ts tests/e2e/chrome.e2e.spec.ts tests/e2e/parity.e2e.spec.ts tests/e2e/homeupgrades-home.e2e.spec.ts --reporter=line` → pass; `npx tsc --noEmit`; `npx vitest run`. (No full suite — the controller runs it.)

- [ ] **Step 4: Commit**

```bash
git add ../design web/src web/tests web/README.md
git commit -m "feat(projects): nav, footer and home link to Our work"
```

---

## Self-review notes

- **Spec coverage:** collection, access, media/mp4/client uploads, migration, revalidation, mapping, fallback (T1); seed (T2); shared cards, viewer stepping, home from featured (T3); `/work` page, metadata, sitemap, 404s, parity (T4); links + README incl. production seed (T5).
- **Review Focus → tests:** 1 → T1 `getProjects` fallback on empty/throw + T4/T3 e2e on an unseeded dev DB; 2 → T1 int anonymous read; 3 → T1 Step 10 manual + T3/T4 e2e (photo, video); 4 → T1 selectProjects + fallback; 5 → T3 e2e keys/Esc/focus.
- **Names across tasks:** `Project`, `ProjectImage`, `FALLBACK_PROJECTS`, `toProject`, `selectProjects`, `getProjects`, `seedProjects`, `WorkCard`, `ViewerDialog`, `WorkPage`, ids `viewerNav/viewerPrev/viewerNext/viewerCount`, `data-gallery`, classes `.workpage-*`, `.viewer-nav`.
- **BotID:** no forms added.
