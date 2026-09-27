# Genix Websites — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable Next.js 16 + Payload 3 app in `web/` that serves all four Genix sites from their own hosts, each in its own theme, with the shared header/footer/phone quote bar, themed 404 and error pages, SEO plumbing (titles, canonicals, sitemaps, robots, JSON-LD, share images) and analytics — ready for the division pages of later phases.

**Architecture:** One Next.js App Router app. `proxy.ts` maps the request host to a site key and rewrites to `app/(sites)/[site]/…`; Payload's admin and REST API live only on the main domain. Structure (hosts, names, taglines, nav, themes) is code in `src/sites/`; editable content (hero copy, contact details, coverage, SEO text) comes from a Payload `sites` collection, cached per site and revalidated by tag when edited.

**Tech Stack:** Next.js 16.3.x (App Router, TypeScript, React 19), Payload CMS 3.90.x (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/storage-vercel-blob`), Postgres 17 (Docker locally, Neon in production), Tailwind CSS v4, `next/font`, `next/og`, `@vercel/analytics`, `@vercel/speed-insights`, Vitest, Playwright. npm (pnpm is not installed).

**Spec:** `docs/superpowers/specs/2026-09-27-genix-websites-design.md` (this plan implements its §6 phase 1 "Foundation"; read §1, §3, §4b).

## Global Constraints

- The app lives in `web/` at the repo root; `design/` (static prototypes) is untouched by this plan.
- Hosts: hub `thegenixgroup.com`; `logistics.thegenixgroup.com`; `homeupgrades.thegenixgroup.com`; `multimedia.thegenixgroup.com`. Locally: `localhost:3000`, `logistics.localhost:3000`, `homeupgrades.localhost:3000`, `multimedia.localhost:3000`. The root is `process.env.ROOT_DOMAIN` (default `thegenixgroup.com`).
- Site keys, exactly: `hub`, `logistics`, `homeupgrades`, `multimedia`. Inquiry prefixes: `HUB`, `LOG`, `HUP`, `MED`.
- Names and taglines, exactly: The Genix Group — "We Haul It. We Build It. We Show It."; Genix Logistics — "Reliable Freight. Real People. Right on Schedule."; Genix Home Upgrades — "From Blueprint to Beautiful."; Genix Multimedia — "Your Story, Captured and Amplified."
- Titles: home `<Site name> | <Tagline>`; other pages `<Page> | <Site name>` (pipe separator).
- Payload admin and `/api` only on the main domain; any subdomain `/admin` or `/api/*` → 404.
- Logos are the supplied SVGs, used whole (the gold X in GENIX is a trademark: never masked, reshaped or recoloured). Multimedia has no logo yet: text wordmark.
- Theme colours (exact): hub brand `#0b0b0c`; Home Upgrades brand `#022248`, paper `#fdfdf7`, link `#0072c6`; Logistics brand `#022248`, paper `#f7f5ef`; Multimedia placeholder brand `#5a1f4d`; shared gold `#c28a2c`, gold-text `#8a5e10`, gold-display `#a8741a`.
- Every theme passes the contrast test (AA 4.5:1 for text, 3:1 for large text and focus indicators); the test runs before every `npm run build`.
- Next.js 16: the proxy file is `src/proxy.ts` exporting `function proxy` and `export const config = { matcher }` (verified in next@16.3.6: it reads `exportedConfig.config`); `params` are Promises; `revalidateTag(tag, 'max')` takes a profile.
- The site owner edits files in their own editor. Before each task run `git status`; never `git checkout`, `restore`, `stash` or `reset` files you did not change in this task — report unexpected changes instead.
- Test credentials only in local/test databases; never real passwords or production keys in code or chat.

---

## File map (all under `web/`)

| File | Responsibility |
|---|---|
| `docker-compose.yml`, `docker/init-test-db.sql` | local Postgres 17 on port 5433 with `genix` and `genix_test` databases |
| `.env.example` | documented env vars |
| `src/sites/config.ts` | site registry: keys, names, taglines, hosts, nav, CTA, logos, icons, schema types, pages; host helpers |
| `src/sites/routing.ts` | pure request routing decisions (host → site, path → rewrite/next/404) |
| `src/sites/themes.ts` | per-site colour/font/radius tokens, `themeVars()`, `contrast()` |
| `src/sites/fonts.ts` | `next/font` instances (Next-only; not imported by tests) |
| `src/sites/data-shape.ts` | `SiteData` type + pure `toSiteData()` merge with fallbacks |
| `src/sites/data.ts` | `getSiteData()` — cached Payload read |
| `src/sites/seo.ts` | `pageMetadata()`, `sitemapXml()`, `robotsTxt()`, `siteJsonLd()` |
| `src/proxy.ts` | thin wrapper applying `routing.ts` |
| `src/payload/access.ts` | access helpers |
| `src/collections/Users.ts`, `Media.ts`, `Sites.ts` | Payload collections |
| `src/payload.config.ts` | Payload config (from the template, edited) |
| `src/seed/seed.ts` | idempotent seed of the four `sites` records (+ optional dev admin) |
| `src/app/(sites)/sites.css` | Tailwind v4 entry + token mapping |
| `src/app/(sites)/[site]/layout.tsx` | root layout per site: `<html data-site>`, theme vars, fonts, header, footer, quote bar, analytics |
| `src/app/(sites)/[site]/page.tsx` | phase-1 home (hero from CMS) |
| `src/app/(sites)/[site]/[...rest]/page.tsx`, `not-found.tsx`, `error.tsx` | themed 404 / error |
| `src/app/(sites)/[site]/sitemap.xml/route.ts`, `robots.txt/route.ts`, `opengraph-image.tsx` | per-site SEO routes |
| `src/components/site/Logo.tsx`, `Header.tsx`, `MobileMenu.tsx`, `Footer.tsx`, `QuoteBar.tsx`, `JsonLd.tsx` | shared chrome |
| `public/brand/*.svg`, `public/icons/<site>/*` | logos and favicons copied from `design/assets/` |
| `tests/unit/*.test.ts` | Vitest unit tests (no DB) |
| `tests/int/*.int.spec.ts` | Vitest + Payload local API against `genix_test` |
| `tests/e2e/*.e2e.spec.ts` | Playwright against `npm run dev` |

---

### Task 1: Scaffold `web/` (Next.js 16 + Payload 3 + Postgres + Tailwind v4 + test runners)

**Files:**
- Create: `web/` via `create-payload-app` (blank template), then `web/docker-compose.yml`, `web/docker/init-test-db.sql`, `web/.env.example`, `web/README.md`, `web/postcss.config.mjs`
- Modify: `web/package.json` (scripts), `web/next.config.*` (allowed dev origins), `web/vitest.config.mts`, `web/playwright.config.ts`, `web/src/payload.config.ts` (db push flag)
- Delete: the template's `web/src/app/(frontend)/` and its e2e test

**Interfaces:**
- Produces: `npm run dev|build|test:unit|test:int|test:e2e|seed|generate:types|generate:importmap`; path aliases `@/*` → `src/*` and `@payload-config` → `src/payload.config.ts`; env `DATABASE_URI`, `PAYLOAD_SECRET`, `ROOT_DOMAIN`, `BLOB_READ_WRITE_TOKEN`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `ALLOW_INDEXING`.

- [ ] **Step 1: Check the tree and tools**

```bash
git status --short          # note any owner edits; do not touch them
node -v && npm -v && docker --version
npm view next version && npm view payload version
```
Expected: Node ≥ 20.9, Docker present; next 16.3.x, payload 3.90.x (if newer minors exist, use them only if `@payloadcms/next`'s peer range still includes that next version: `npm view @payloadcms/next peerDependencies`).

- [ ] **Step 2: Start local Postgres**

Create `web/docker-compose.yml` (create the `web/` folder first if the scaffold step needs an empty target, move this file in afterwards):

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: genix
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql:ro
volumes:
  pgdata: {}
```

`web/docker/init-test-db.sql`:

```sql
CREATE DATABASE genix_test;
```

Run: `docker compose -f web/docker-compose.yml up -d` → Expected: container healthy; `docker compose -f web/docker-compose.yml exec postgres psql -U postgres -c '\l'` lists `genix` and `genix_test`.

- [ ] **Step 3: Scaffold with the Payload blank template**

```bash
npx create-payload-app@3.90 web --template blank --db postgres --db-connection-string "postgres://postgres:postgres@127.0.0.1:5433/genix" --use-npm
```
If the CLI still prompts, answer: project name `web`, template `blank`, database `PostgreSQL`, connection string as above, package manager `npm`. If it refuses because `web/` is not empty, scaffold into `web-tmp/`, then move its contents into `web/` next to `docker-compose.yml` and `docker/`, and delete `web-tmp/`. Do not let it create a nested git repository (delete `web/.git` if one appears).

Then confirm the template layout exists: `web/src/payload.config.ts`, `web/src/collections/Users.ts`, `web/src/collections/Media.ts`, `web/src/app/(payload)/`, `web/src/app/(frontend)/`, `web/vitest.config.mts`, `web/playwright.config.ts`, `web/tests/`. Pin exact versions in `web/package.json` (`"next": "16.3.6"`, all `payload`/`@payloadcms/*` to the same exact `3.90.x`).

- [ ] **Step 4: Add the rest of the dependencies**

```bash
cd web
npm install @payloadcms/storage-vercel-blob@3.90.2 @vercel/analytics @vercel/speed-insights   # match the exact payload version in package.json
npm install -D tailwindcss @tailwindcss/postcss postcss
```

`web/postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

- [ ] **Step 5: Remove the template frontend**

Delete `web/src/app/(frontend)/` entirely and any template e2e spec that visits it (e.g. `web/tests/e2e/frontend.e2e.spec.ts`). Keep `web/src/app/(payload)/` untouched.

- [ ] **Step 6: Environment**

`web/.env.example`:

```bash
# Local Postgres from docker-compose.yml (port 5433)
DATABASE_URI=postgres://postgres:postgres@127.0.0.1:5433/genix
# Long random string; generate your own, never commit the real one
PAYLOAD_SECRET=replace-with-a-long-random-string
# Host the hub is served on. Local: localhost:3000; production: thegenixgroup.com
ROOT_DOMAIN=localhost:3000
# Vercel Blob token (leave empty locally: uploads then go to ./media)
BLOB_READ_WRITE_TOKEN=
# Optional local-only admin created by `npm run seed`
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
# Set to 1 only on the production deployment to allow search engines
ALLOW_INDEXING=
```

Copy it to `web/.env` (git-ignored by the template) with a generated `PAYLOAD_SECRET` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Confirm `web/.gitignore` ignores `.env` but not `.env.example`.

- [ ] **Step 7: Payload config: explicit schema push for dev/test**

In `web/src/payload.config.ts`, make the adapter:

```ts
db: postgresAdapter({
  pool: { connectionString: process.env.DATABASE_URI || '' },
  // dev and tests sync the schema automatically; production uses migrations (Task 9)
  push: process.env.NODE_ENV !== 'production',
}),
```

- [ ] **Step 8: Scripts, dev origins, test runners**

`web/package.json` scripts (keep the template's `generate:types`, `generate:importmap`, `payload`; the `cross-env NODE_OPTIONS=--no-deprecation` prefix the template uses may stay):

```json
{
  "dev": "cross-env NODE_OPTIONS=--no-deprecation next dev",
  "prebuild": "vitest run tests/unit/themes.test.ts",
  "build": "cross-env NODE_OPTIONS=--no-deprecation next build",
  "start": "next start",
  "test:unit": "vitest run tests/unit",
  "test:int": "vitest run tests/int",
  "test:e2e": "playwright test",
  "seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/seed.ts"
}
```
(`prebuild` references a test created in Task 3; until then `npm run build` fails at `prebuild` — expected, and fixed by Task 3.)

In `web/next.config.*` (the template wraps it in `withPayload`), add inside the Next config object:

```js
allowedDevOrigins: ['*.localhost'],
```

`web/vitest.config.mts` — keep the template's plugins (`vite-tsconfig-paths`, react) and set:

```ts
test: {
  environment: 'node',
  include: ['tests/unit/**/*.test.ts', 'tests/int/**/*.int.spec.ts'],
  env: {
    DATABASE_URI: process.env.TEST_DATABASE_URI ?? 'postgres://postgres:postgres@127.0.0.1:5433/genix_test',
    PAYLOAD_SECRET: 'test-secret-not-for-production',
    ROOT_DOMAIN: 'thegenixgroup.com',
  },
  fileParallelism: false,
},
```
If the template's `setupFiles` loads `.env`, remove that entry so tests never read the dev database.

`web/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.spec.ts',
  fullyParallel: false,
  use: { baseURL: 'http://localhost:3000' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/admin',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
```
Install the browser: `npx playwright install chromium`.

- [ ] **Step 9: README**

`web/README.md`:

````markdown
# Genix websites (Next.js 16 + Payload 3)

One app serves thegenixgroup.com and the three division subdomains.

## Run locally
```bash
docker compose up -d          # Postgres 17 on :5433 (dbs: genix, genix_test)
cp .env.example .env          # then set PAYLOAD_SECRET
npm install
npm run seed                  # the four site records (+ optional dev admin)
npm run dev
```
Sites: http://localhost:3000 (hub, admin at /admin), http://logistics.localhost:3000,
http://homeupgrades.localhost:3000, http://multimedia.localhost:3000.

## Test
`npm run test:unit` · `npm run test:int` (needs Docker Postgres) · `npm run test:e2e` (starts `npm run dev`).
````

- [ ] **Step 10: Verify the scaffold**

```bash
cd web
npx tsc --noEmit
npm run dev   # in the background
```
Open `http://localhost:3000/admin` → Payload's "create first user" screen renders (HTTP 200). Stop the dev server. Expected: no type errors.

- [ ] **Step 11: Commit**

```bash
git add web
git commit -m "chore(web): scaffold Next.js 16 + Payload 3 app with local Postgres and test runners"
```
(End every commit message with the repo's Co-Authored-By line if the session requires one.)

---

### Task 2: Site registry and request routing (pure, unit-tested)

**Files:**
- Create: `web/src/sites/config.ts`, `web/src/sites/routing.ts`
- Test: `web/tests/unit/sites.test.ts`, `web/tests/unit/routing.test.ts`

**Interfaces:**
- Produces (`config.ts`): `SITE_KEYS`, `type SiteKey`, `DIVISION_KEYS`, `type SiteConfig`, `SITES: Record<SiteKey, SiteConfig>`, `isSiteKey(v: unknown): v is SiteKey`, `siteHost(key, root?) → string`, `siteOrigin(key, root?) → string`, `resolveSite(host, root?) → SiteKey | null`.
- Produces (`routing.ts`): `type RouteDecision = { kind: 'next' } | { kind: 'rewrite'; pathname: string } | { kind: 'notFound' }`; `siteForRequest(host, { root, previewSite, allowPreview }) → SiteKey`; `routeRequest(site, pathname) → RouteDecision`.

- [ ] **Step 1: Write the failing tests**

`web/tests/unit/sites.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SITES, SITE_KEYS, isSiteKey, resolveSite, siteHost, siteOrigin } from '@/sites/config'

describe('site registry', () => {
  it('has the four sites with their exact names, taglines and prefixes', () => {
    expect(SITE_KEYS).toEqual(['hub', 'logistics', 'homeupgrades', 'multimedia'])
    expect(SITES.hub).toMatchObject({ name: 'The Genix Group', tagline: 'We Haul It. We Build It. We Show It.', inquiryPrefix: 'HUB' })
    expect(SITES.logistics).toMatchObject({ name: 'Genix Logistics', tagline: 'Reliable Freight. Real People. Right on Schedule.', inquiryPrefix: 'LOG' })
    expect(SITES.homeupgrades).toMatchObject({ name: 'Genix Home Upgrades', tagline: 'From Blueprint to Beautiful.', inquiryPrefix: 'HUP' })
    expect(SITES.multimedia).toMatchObject({ name: 'Genix Multimedia', tagline: 'Your Story, Captured and Amplified.', inquiryPrefix: 'MED' })
  })

  it('recognises site keys', () => {
    expect(isSiteKey('logistics')).toBe(true)
    expect(isSiteKey('admin')).toBe(false)
    expect(isSiteKey(undefined)).toBe(false)
  })

  it('builds hosts and origins for production and local roots', () => {
    expect(siteHost('hub', 'thegenixgroup.com')).toBe('thegenixgroup.com')
    expect(siteHost('logistics', 'thegenixgroup.com')).toBe('logistics.thegenixgroup.com')
    expect(siteOrigin('homeupgrades', 'thegenixgroup.com')).toBe('https://homeupgrades.thegenixgroup.com')
    expect(siteOrigin('hub', 'localhost:3000')).toBe('http://localhost:3000')
    expect(siteOrigin('multimedia', 'localhost:3000')).toBe('http://multimedia.localhost:3000')
  })

  it('resolves a request host to a site', () => {
    expect(resolveSite('thegenixgroup.com', 'thegenixgroup.com')).toBe('hub')
    expect(resolveSite('www.thegenixgroup.com', 'thegenixgroup.com')).toBe('hub')
    expect(resolveSite('Logistics.TheGenixGroup.com', 'thegenixgroup.com')).toBe('logistics')
    expect(resolveSite('logistics.localhost:3000', 'localhost:3000')).toBe('logistics')
    expect(resolveSite('localhost:3000', 'localhost:3000')).toBe('hub')
    expect(resolveSite('genix-abc123.vercel.app', 'thegenixgroup.com')).toBeNull()
    expect(resolveSite('evil.com', 'thegenixgroup.com')).toBeNull()
  })
})
```

`web/tests/unit/routing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { routeRequest, siteForRequest } from '@/sites/routing'

const root = 'thegenixgroup.com'

describe('siteForRequest', () => {
  it('uses the host when it is a known site', () => {
    expect(siteForRequest('logistics.thegenixgroup.com', { root, previewSite: 'multimedia', allowPreview: true })).toBe('logistics')
  })
  it('falls back to the hub for unknown hosts', () => {
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: null, allowPreview: true })).toBe('hub')
  })
  it('lets preview hosts pick a site, but only when allowed and valid', () => {
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: 'homeupgrades', allowPreview: true })).toBe('homeupgrades')
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: 'homeupgrades', allowPreview: false })).toBe('hub')
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: 'admin', allowPreview: true })).toBe('hub')
  })
})

describe('routeRequest', () => {
  it('rewrites site pages into the [site] segment', () => {
    expect(routeRequest('logistics', '/')).toEqual({ kind: 'rewrite', pathname: '/logistics' })
    expect(routeRequest('logistics', '/services')).toEqual({ kind: 'rewrite', pathname: '/logistics/services' })
    expect(routeRequest('hub', '/about')).toEqual({ kind: 'rewrite', pathname: '/hub/about' })
    expect(routeRequest('homeupgrades', '/sitemap.xml')).toEqual({ kind: 'rewrite', pathname: '/homeupgrades/sitemap.xml' })
  })
  it('passes through paths already inside the site segment (generated OG image URLs)', () => {
    expect(routeRequest('logistics', '/logistics/opengraph-image')).toEqual({ kind: 'next' })
  })
  it('does not let one site reach another site segment', () => {
    expect(routeRequest('hub', '/logistics')).toEqual({ kind: 'rewrite', pathname: '/hub/logistics' })
  })
  it('serves Payload only on the hub', () => {
    expect(routeRequest('hub', '/admin')).toEqual({ kind: 'next' })
    expect(routeRequest('hub', '/admin/collections/sites')).toEqual({ kind: 'next' })
    expect(routeRequest('hub', '/api/users/me')).toEqual({ kind: 'next' })
    expect(routeRequest('logistics', '/admin')).toEqual({ kind: 'notFound' })
    expect(routeRequest('multimedia', '/api/sites')).toEqual({ kind: 'notFound' })
  })
  it('does not treat look-alike paths as Payload', () => {
    expect(routeRequest('hub', '/administration')).toEqual({ kind: 'rewrite', pathname: '/hub/administration' })
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd web && npx vitest run tests/unit/sites.test.ts tests/unit/routing.test.ts`
Expected: FAIL — cannot resolve `@/sites/config` / `@/sites/routing`.

- [ ] **Step 3: Write `config.ts`**

`web/src/sites/config.ts`:

```ts
/* Site registry: the single source of truth for structure. Content staff can
   edit (hero copy, contact details, coverage, SEO text) lives in Payload. */

export const SITE_KEYS = ['hub', 'logistics', 'homeupgrades', 'multimedia'] as const
export type SiteKey = (typeof SITE_KEYS)[number]
export const DIVISION_KEYS = ['logistics', 'homeupgrades', 'multimedia'] as const satisfies readonly SiteKey[]

export type NavItem = { label: string; href: string }

export type SiteConfig = {
  key: SiteKey
  name: string
  shortName: string
  subdomain: string | null
  inquiryPrefix: 'HUB' | 'LOG' | 'HUP' | 'MED'
  tagline: string
  schemaType: 'Organization' | 'MovingCompany' | 'HomeAndConstructionBusiness' | 'ProfessionalService'
  logo: { src: string; width: number; height: number } | null
  icons: string
  nav: NavItem[]
  cta: NavItem
  /** Paths listed in the sitemap. Later phases add pages here as they ship. */
  pages: string[]
}

const DIVISION_NAV: NavItem[] = [
  { label: 'Services', href: '/services' },
  { label: 'Our work', href: '/our-work' },
  { label: 'About', href: '/about' },
]

export const SITES: Record<SiteKey, SiteConfig> = {
  hub: {
    key: 'hub',
    name: 'The Genix Group',
    shortName: 'Group',
    subdomain: null,
    inquiryPrefix: 'HUB',
    tagline: 'We Haul It. We Build It. We Show It.',
    schemaType: 'Organization',
    logo: { src: '/brand/genix-group-logo.svg', width: 1288, height: 421 },
    icons: '/icons/hub',
    nav: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
    cta: { label: 'Start a conversation', href: '/contact' },
    pages: ['/'],
  },
  logistics: {
    key: 'logistics',
    name: 'Genix Logistics',
    shortName: 'Logistics',
    subdomain: 'logistics',
    inquiryPrefix: 'LOG',
    tagline: 'Reliable Freight. Real People. Right on Schedule.',
    schemaType: 'MovingCompany',
    logo: { src: '/brand/genix-logistics-logo.svg', width: 876, height: 405 },
    icons: '/icons/logistics',
    nav: DIVISION_NAV,
    cta: { label: 'Get a quote', href: '/#quote-form' },
    pages: ['/'],
  },
  homeupgrades: {
    key: 'homeupgrades',
    name: 'Genix Home Upgrades',
    shortName: 'Home Upgrades',
    subdomain: 'homeupgrades',
    inquiryPrefix: 'HUP',
    tagline: 'From Blueprint to Beautiful.',
    schemaType: 'HomeAndConstructionBusiness',
    logo: { src: '/brand/genix-home-upgrades-logo.svg', width: 976, height: 722 },
    icons: '/icons/homeupgrades',
    nav: DIVISION_NAV,
    cta: { label: 'Get a quote', href: '/contact' },
    pages: ['/'],
  },
  multimedia: {
    key: 'multimedia',
    name: 'Genix Multimedia',
    shortName: 'Multimedia',
    subdomain: 'multimedia',
    inquiryPrefix: 'MED',
    tagline: 'Your Story, Captured and Amplified.',
    schemaType: 'ProfessionalService',
    logo: null, // no logo supplied yet: text wordmark
    icons: '/icons/hub',
    nav: DIVISION_NAV,
    cta: { label: 'Get a quote', href: '/contact' },
    pages: ['/'],
  },
}

export function isSiteKey(value: unknown): value is SiteKey {
  return typeof value === 'string' && (SITE_KEYS as readonly string[]).includes(value)
}

const defaultRoot = () => process.env.ROOT_DOMAIN || 'thegenixgroup.com'

export function siteHost(key: SiteKey, root: string = defaultRoot()): string {
  const sub = SITES[key].subdomain
  return sub ? `${sub}.${root}` : root
}

export function siteOrigin(key: SiteKey, root: string = defaultRoot()): string {
  const host = siteHost(key, root)
  const local = host === 'localhost' || host.startsWith('localhost:') || /\.localhost(:\d+)?$/.test(host)
  return `${local ? 'http' : 'https'}://${host}`
}

export function resolveSite(host: string, root: string = defaultRoot()): SiteKey | null {
  const h = host.trim().toLowerCase()
  const r = root.toLowerCase()
  if (h === r || h === `www.${r}`) return 'hub'
  for (const key of SITE_KEYS) {
    const sub = SITES[key].subdomain
    if (sub && h === `${sub}.${r}`) return key
  }
  return null
}
```

- [ ] **Step 4: Write `routing.ts`**

`web/src/sites/routing.ts`:

```ts
import { isSiteKey, resolveSite, type SiteKey } from './config'

export type RouteDecision = { kind: 'next' } | { kind: 'rewrite'; pathname: string } | { kind: 'notFound' }

/** Known hosts map to their site. Unknown hosts (e.g. Vercel preview URLs)
    get the hub, or — only where allowed — the site picked via ?site=. */
export function siteForRequest(
  host: string,
  opts: { root: string; previewSite: string | null | undefined; allowPreview: boolean },
): SiteKey {
  const known = resolveSite(host, opts.root)
  if (known) return known
  if (opts.allowPreview && isSiteKey(opts.previewSite)) return opts.previewSite
  return 'hub'
}

const isPayloadPath = (p: string) => p === '/admin' || p.startsWith('/admin/') || p === '/api' || p.startsWith('/api/')

export function routeRequest(site: SiteKey, pathname: string): RouteDecision {
  if (isPayloadPath(pathname)) return site === 'hub' ? { kind: 'next' } : { kind: 'notFound' }
  if (pathname === `/${site}` || pathname.startsWith(`/${site}/`)) return { kind: 'next' }
  return { kind: 'rewrite', pathname: `/${site}${pathname === '/' ? '' : pathname}` }
}
```

- [ ] **Step 5: Run the tests**

Run: `cd web && npx vitest run tests/unit/sites.test.ts tests/unit/routing.test.ts`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/sites/config.ts web/src/sites/routing.ts web/tests/unit/sites.test.ts web/tests/unit/routing.test.ts
git commit -m "feat(web): site registry and host-based request routing"
```

---

### Task 3: Themes, fonts and the contrast gate

**Files:**
- Create: `web/src/sites/themes.ts`, `web/src/sites/fonts.ts`, `web/src/app/(sites)/sites.css`
- Test: `web/tests/unit/themes.test.ts`

**Interfaces:**
- Consumes: `SiteKey`, `SITE_KEYS` from Task 2.
- Produces: `type FontKey = 'schibsted' | 'hanken' | 'plexMono' | 'jakarta' | 'archivo'`; `type Theme`; `THEMES: Record<SiteKey, Theme>`; `contrast(a: string, b: string) → number`; `themeVars(theme: Theme) → React.CSSProperties`; `fontClassNames(theme: Theme) → string` (in `fonts.ts`); Tailwind utilities `bg-brand`, `bg-brand-deep`, `text-heading`, `bg-paper`, `text-ink`, `text-ink-2`, `text-muted`, `border-line`, `text-on-brand-muted`, `bg-gold`/`text-gold`, `text-gold-text`, `text-gold-display`, `text-link`, `font-display`, `font-body`, `font-mono`, `rounded-site`.

- [ ] **Step 1: Write the failing test**

`web/tests/unit/themes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SITE_KEYS } from '@/sites/config'
import { THEMES, contrast, themeVars } from '@/sites/themes'

describe('contrast()', () => {
  it('matches known WCAG values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrast('#0072c6', '#fdfdf7')).toBeGreaterThan(4.5)
  })
})

// A failing pair here fails `npm run build` (the prebuild script runs this file).
describe.each(SITE_KEYS)('theme %s meets WCAG AA', (key) => {
  const t = THEMES[key]
  const text: [string, string, string][] = [
    ['ink on paper', t.ink, t.paper],
    ['ink-2 on paper', t.ink2, t.paper],
    ['muted on paper', t.muted, t.paper],
    ['heading on paper', t.heading, t.paper],
    ['link on paper', t.link, t.paper],
    ['gold-text on paper', t.goldText, t.paper],
    ['white on brand', '#ffffff', t.brand],
    ['on-brand-muted on brand', t.onBrandMuted, t.brand],
  ]
  const large: [string, string, string][] = [
    ['gold-display on paper (large text)', t.goldDisplay, t.paper],
    ['gold on brand (large text)', t.gold, t.brand],
    ['focus ring (heading) on paper', t.heading, t.paper],
  ]
  it.each(text)('%s ≥ 4.5:1', (_label, fg, bg) => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5))
  it.each(large)('%s ≥ 3:1', (_label, fg, bg) => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3))
})

describe('themeVars()', () => {
  it('exposes the tokens as CSS custom properties', () => {
    const vars = themeVars(THEMES.logistics) as Record<string, string>
    expect(vars['--brand']).toBe('#022248')
    expect(vars['--paper']).toBe('#f7f5ef')
    expect(vars['--font-display-face']).toContain('var(--font-archivo)')
    expect(vars['--radius']).toBe('6px')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd web && npx vitest run tests/unit/themes.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 3: Write `themes.ts`**

`web/src/sites/themes.ts`:

```ts
import type { CSSProperties } from 'react'
import type { SiteKey } from './config'

/* Per-site skins. Layout is shared; these tokens differ. Colours come from the
   approved prototypes in design/. Pure module: safe to import in unit tests. */

export type FontKey = 'schibsted' | 'hanken' | 'plexMono' | 'jakarta' | 'archivo'

export const FONT_VARS: Record<FontKey, string> = {
  schibsted: '--font-schibsted',
  hanken: '--font-hanken',
  plexMono: '--font-plex-mono',
  jakarta: '--font-jakarta',
  archivo: '--font-archivo',
}

export type Theme = {
  brand: string
  brandDeep: string
  heading: string
  paper: string
  ink: string
  ink2: string
  muted: string
  line: string
  onBrandMuted: string
  gold: string
  goldText: string
  goldDisplay: string
  link: string
  radius: string
  fontDisplay: FontKey
  fontBody: FontKey
  fontMono: FontKey
}

const GOLD = { gold: '#c28a2c', goldText: '#8a5e10', goldDisplay: '#a8741a' }
const NEUTRAL = { ink: '#111110', ink2: '#3f3c37', muted: '#625d55', line: '#dcd8cf' }

export const THEMES: Record<SiteKey, Theme> = {
  hub: {
    ...GOLD, ...NEUTRAL,
    brand: '#0b0b0c', brandDeep: '#000000', heading: '#111110', paper: '#f5f3ee',
    onBrandMuted: '#bfb7a7', link: '#111110', radius: '0px',
    fontDisplay: 'schibsted', fontBody: 'hanken', fontMono: 'plexMono',
  },
  homeupgrades: {
    ...GOLD, ...NEUTRAL,
    brand: '#022248', brandDeep: '#01152e', heading: '#022248', paper: '#fdfdf7',
    onBrandMuted: '#b8c4d6', link: '#0072c6', radius: '12px',
    fontDisplay: 'jakarta', fontBody: 'jakarta', fontMono: 'plexMono',
  },
  logistics: {
    ...GOLD, ...NEUTRAL,
    brand: '#022248', brandDeep: '#01152e', heading: '#022248', paper: '#f7f5ef',
    onBrandMuted: '#b9c4d3', link: '#022248', radius: '6px',
    fontDisplay: 'archivo', fontBody: 'archivo', fontMono: 'plexMono',
  },
  multimedia: {
    // placeholder until the Multimedia logo and design exist
    ...GOLD, ...NEUTRAL,
    brand: '#5a1f4d', brandDeep: '#3f1536', heading: '#5a1f4d', paper: '#f7f4f6',
    onBrandMuted: '#e8d3e2', link: '#5a1f4d', radius: '8px',
    fontDisplay: 'schibsted', fontBody: 'hanken', fontMono: 'plexMono',
  },
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG 2.x contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const face = (key: FontKey, fallback: string) => `var(${FONT_VARS[key]}), ${fallback}`

export function themeVars(t: Theme): CSSProperties {
  return {
    '--brand': t.brand,
    '--brand-deep': t.brandDeep,
    '--heading': t.heading,
    '--paper': t.paper,
    '--ink': t.ink,
    '--ink-2': t.ink2,
    '--muted': t.muted,
    '--line': t.line,
    '--on-brand-muted': t.onBrandMuted,
    '--gold': t.gold,
    '--gold-text': t.goldText,
    '--gold-display': t.goldDisplay,
    '--link': t.link,
    '--radius': t.radius,
    '--font-display-face': face(t.fontDisplay, 'system-ui, sans-serif'),
    '--font-body-face': face(t.fontBody, 'system-ui, sans-serif'),
    '--font-mono-face': face(t.fontMono, 'ui-monospace, monospace'),
  } as CSSProperties
}
```

- [ ] **Step 4: Run the test**

Run: `cd web && npx vitest run tests/unit/themes.test.ts` → Expected: all PASS (values pre-checked: the lowest are Home Upgrades link 4.87:1 and Multimedia gold on brand 4.01:1 against a 3:1 bar).

- [ ] **Step 5: Write the fonts module (Next-only)**

`web/src/sites/fonts.ts`:

```ts
import { Archivo, Hanken_Grotesk, IBM_Plex_Mono, Plus_Jakarta_Sans, Schibsted_Grotesk } from 'next/font/google'
import type { FontKey, Theme } from './themes'

// Variable names must match FONT_VARS in themes.ts.
const schibsted = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-schibsted', display: 'swap' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' })

const FONTS: Record<FontKey, { variable: string }> = { schibsted, hanken, plexMono, jakarta, archivo }

/** Class names defining only the font variables this theme uses. */
export function fontClassNames(t: Theme): string {
  return [...new Set([t.fontDisplay, t.fontBody, t.fontMono])].map((k) => FONTS[k].variable).join(' ')
}
```

- [ ] **Step 6: Write the Tailwind entry**

`web/src/app/(sites)/sites.css`:

```css
@import "tailwindcss";

/* Tokens come from themeVars() on <html>; Tailwind utilities read them. */
@theme inline {
  --color-brand: var(--brand);
  --color-brand-deep: var(--brand-deep);
  --color-heading: var(--heading);
  --color-paper: var(--paper);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-muted: var(--muted);
  --color-line: var(--line);
  --color-on-brand-muted: var(--on-brand-muted);
  --color-gold: var(--gold);
  --color-gold-text: var(--gold-text);
  --color-gold-display: var(--gold-display);
  --color-link: var(--link);
  --font-display: var(--font-display-face);
  --font-body: var(--font-body-face);
  --font-mono: var(--font-mono-face);
  --radius-site: var(--radius);
}

html { -webkit-text-size-adjust: 100%; scroll-padding-top: 76px; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--font-body-face); line-height: 1.6; }
:focus-visible { outline: 2px solid var(--heading); outline-offset: 3px; }
.on-brand :focus-visible { outline-color: var(--gold); }
```

- [ ] **Step 7: Confirm the build gate**

Run: `cd web && npm run prebuild` → Expected: PASS. Then temporarily change `THEMES.logistics.link` to `'#9999aa'`, run again → Expected: FAIL on "link on paper ≥ 4.5:1". Revert the change and re-run → PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/sites/themes.ts web/src/sites/fonts.ts "web/src/app/(sites)/sites.css" web/tests/unit/themes.test.ts
git commit -m "feat(web): per-site themes, fonts and a WCAG contrast gate before build"
```

---

### Task 4: Payload collections — Users, Media, Sites — access control, revalidation, seed

**Files:**
- Create: `web/src/payload/access.ts`, `web/src/collections/Sites.ts`, `web/src/seed/seed.ts`, `web/src/sites/data-shape.ts`, `web/src/sites/data.ts`
- Modify (replace contents): `web/src/collections/Users.ts`, `web/src/collections/Media.ts`; `web/src/payload.config.ts` (collections, Blob plugin)
- Generated: `web/src/payload-types.ts`, `web/src/app/(payload)/admin/importMap.js`
- Test: `web/tests/int/sites.int.spec.ts`, `web/tests/unit/data-shape.test.ts`

**Interfaces:**
- Consumes: `SITE_KEYS`, `SiteKey`, `SITES` (Task 2).
- Produces: collection slugs `users`, `media`, `sites`; `sites` fields `key, heroHeading, heroSubheading, phone, email, address{street,city,state,zip}, social[{label,url}], coverage[{name,zipFrom,zipTo}], seoTitle, seoDescription`; cache tag `site:<key>`; hook context flag `disableRevalidate`; `type SiteData`; `toSiteData(key, doc) → SiteData`; `getSiteData(key) → Promise<SiteData>`.

- [ ] **Step 1: Write the failing unit test (pure merge)**

`web/tests/unit/data-shape.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toSiteData } from '@/sites/data-shape'

describe('toSiteData', () => {
  it('falls back to registry values when there is no CMS record', () => {
    expect(toSiteData('logistics', null)).toEqual({
      heroHeading: 'Reliable Freight. Real People. Right on Schedule.',
      heroSubheading: '',
      phone: null,
      email: 'hello@thegenixgroup.com',
      coverage: [],
      seoTitle: null,
      seoDescription: null,
    })
  })
  it('prefers CMS values and ignores empty strings', () => {
    const d = toSiteData('hub', {
      heroHeading: 'Custom heading',
      heroSubheading: '',
      phone: '(619) 555-0100',
      email: null,
      coverage: [{ name: 'California', zipFrom: 900, zipTo: 961 }],
      seoTitle: null,
      seoDescription: 'Group description',
    })
    expect(d.heroHeading).toBe('Custom heading')
    expect(d.heroSubheading).toBe('')
    expect(d.phone).toBe('(619) 555-0100')
    expect(d.email).toBe('hello@thegenixgroup.com')
    expect(d.coverage).toEqual([{ name: 'California', zipFrom: 900, zipTo: 961 }])
    expect(d.seoDescription).toBe('Group description')
  })
})
```

- [ ] **Step 2: Write the failing integration test**

`web/tests/int/sites.int.spec.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

// Runs against the genix_test database (see vitest.config.mts). Test-only credentials.
let payload: Payload
const context = { disableRevalidate: true }

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'sites', where: { id: { exists: true } }, context })
  await payload.delete({ collection: 'users', where: { id: { exists: true } } })
})

describe('users', () => {
  it('makes the first user an admin and later users editors', async () => {
    const first = await payload.create({ collection: 'users', data: { email: 'first@test.local', password: 'test-pass-1' } })
    expect(first.role).toBe('admin')
    const second = await payload.create({ collection: 'users', data: { email: 'second@test.local', password: 'test-pass-2' } })
    expect(second.role).toBe('editor')
  })
})

describe('sites', () => {
  it('allows only one record per site key', async () => {
    await payload.create({ collection: 'sites', data: { key: 'logistics', heroHeading: 'L' }, context })
    await expect(payload.create({ collection: 'sites', data: { key: 'logistics' }, context })).rejects.toThrow()
  })

  it('limits an editor to the divisions they are assigned', async () => {
    const hub = await payload.create({ collection: 'sites', data: { key: 'hub' }, context })
    const logistics = (await payload.find({ collection: 'sites', where: { key: { equals: 'logistics' } } })).docs[0]
    const editor = await payload.create({
      collection: 'users',
      data: { email: 'editor@test.local', password: 'test-pass-3', role: 'editor', divisions: ['logistics'] },
    })
    await expect(
      payload.update({ collection: 'sites', id: hub.id, data: { heroHeading: 'nope' }, user: editor, overrideAccess: false, context }),
    ).rejects.toThrow()
    const updated = await payload.update({
      collection: 'sites', id: logistics.id, data: { heroHeading: 'yes' }, user: editor, overrideAccess: false, context,
    })
    expect(updated.heroHeading).toBe('yes')
  })

  it('lets anyone read sites (public site content)', async () => {
    const res = await payload.find({ collection: 'sites', overrideAccess: false })
    expect(res.totalDocs).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run both to verify they fail**

Run: `cd web && npx vitest run tests/unit/data-shape.test.ts tests/int/sites.int.spec.ts` (Docker Postgres running)
Expected: FAIL — `@/sites/data-shape` missing; `sites` collection unknown.

- [ ] **Step 4: Access helpers**

`web/src/payload/access.ts`:

```ts
import type { Access, FieldAccess, Where } from 'payload'

type StaffUser = { id: string | number; role?: 'admin' | 'editor' | null; divisions?: string[] | null }
const staff = (user: unknown) => (user ?? null) as StaffUser | null

export const anyone: Access = () => true
export const isLoggedIn: Access = ({ req }) => Boolean(req.user)
export const isAdmin: Access = ({ req }) => staff(req.user)?.role === 'admin'
export const isAdminField: FieldAccess = ({ req }) => staff(req.user)?.role === 'admin'

export const isAdminOrSelf: Access = ({ req }) => {
  const u = staff(req.user)
  if (!u) return false
  if (u.role === 'admin') return true
  return { id: { equals: u.id } } as Where
}

/** Admins edit every site record; editors only their assigned divisions. */
export const canEditSite: Access = ({ req }) => {
  const u = staff(req.user)
  if (!u) return false
  if (u.role === 'admin') return true
  const divisions = u.divisions ?? []
  return divisions.length ? ({ key: { in: divisions } } as Where) : false
}
```

- [ ] **Step 5: Collections**

`web/src/collections/Users.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { SITE_KEYS } from '@/sites/config'
import { isAdmin, isAdminField, isAdminOrSelf } from '@/payload/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  access: { read: isAdminOrSelf, create: isAdmin, update: isAdminOrSelf, delete: isAdmin },
  hooks: {
    beforeChange: [
      async ({ req, operation, data }) => {
        // The very first account (created on /admin's "create first user" screen) must be an admin.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) return { ...data, role: 'admin' }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: { update: isAdminField },
    },
    {
      name: 'divisions',
      type: 'select',
      hasMany: true,
      options: SITE_KEYS.map((k) => ({ label: k, value: k })),
      admin: { description: 'Editors can only edit these sites. Admins can edit all.' },
      access: { update: isAdminField },
    },
  ],
}
```

`web/src/collections/Media.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isLoggedIn } from '@/payload/access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isAdmin },
  upload: true,
  fields: [{ name: 'alt', type: 'text', required: true, admin: { description: 'Describe the image for people who cannot see it.' } }],
}
```

`web/src/collections/Sites.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { revalidateTag } from 'next/cache'
import { SITE_KEYS } from '@/sites/config'
import { anyone, canEditSite, isAdmin } from '@/payload/access'

export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'heroHeading', 'updatedAt'] },
  access: { read: anyone, create: isAdmin, delete: isAdmin, update: canEditSite },
  hooks: {
    afterChange: [
      ({ doc, context }) => {
        // Seed scripts and tests run outside Next.js and pass disableRevalidate.
        if (!context?.disableRevalidate) revalidateTag(`site:${doc.key}`, 'max')
        return doc
      },
    ],
  },
  fields: [
    { name: 'key', type: 'select', required: true, unique: true, options: SITE_KEYS.map((k) => ({ label: k, value: k })) },
    { name: 'heroHeading', type: 'text' },
    { name: 'heroSubheading', type: 'textarea' },
    { name: 'phone', type: 'text', admin: { description: 'US format, e.g. (619) 555-0100' } },
    { name: 'email', type: 'email' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'zip', type: 'text' },
      ],
    },
    {
      name: 'social',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'coverage',
      type: 'array',
      admin: { description: 'Areas served. ZIP ranges are the first three digits, e.g. California 900–961.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'zipFrom', type: 'number', min: 0, max: 999 },
        { name: 'zipTo', type: 'number', min: 0, max: 999 },
      ],
    },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
  ],
}
```

- [ ] **Step 6: Wire the config**

In `web/src/payload.config.ts`: import `Users`, `Media`, `Sites` and set `collections: [Users, Media, Sites]`; keep `admin.user: Users.slug`; add the Blob plugin:

```ts
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
// …inside buildConfig({ … }):
plugins: [
  vercelBlobStorage({
    enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    collections: { media: true },
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }),
],
```
Then run: `cd web && npm run generate:types && npm run generate:importmap`.

- [ ] **Step 7: Site data shape and cached reader**

`web/src/sites/data-shape.ts`:

```ts
import { SITES, type SiteKey } from './config'

export type SiteData = {
  heroHeading: string
  heroSubheading: string
  phone: string | null
  email: string | null
  coverage: { name: string; zipFrom?: number | null; zipTo?: number | null }[]
  seoTitle: string | null
  seoDescription: string | null
}

type SiteDoc = {
  heroHeading?: string | null
  heroSubheading?: string | null
  phone?: string | null
  email?: string | null
  coverage?: { name: string; zipFrom?: number | null; zipTo?: number | null }[] | null
  seoTitle?: string | null
  seoDescription?: string | null
}

const GROUP_EMAIL = 'hello@thegenixgroup.com'
const text = (v: string | null | undefined) => (v && v.trim() ? v : null)

/** Merge a CMS record over registry defaults. Pure. */
export function toSiteData(key: SiteKey, doc: SiteDoc | null): SiteData {
  return {
    heroHeading: text(doc?.heroHeading) ?? SITES[key].tagline,
    heroSubheading: text(doc?.heroSubheading) ?? '',
    phone: text(doc?.phone),
    email: text(doc?.email) ?? GROUP_EMAIL,
    coverage: (doc?.coverage ?? []).map(({ name, zipFrom, zipTo }) => ({ name, zipFrom, zipTo })),
    seoTitle: text(doc?.seoTitle),
    seoDescription: text(doc?.seoDescription),
  }
}
```

`web/src/sites/data.ts`:

```ts
import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteKey } from './config'
import { toSiteData, type SiteData } from './data-shape'

async function readSite(key: SiteKey): Promise<SiteData> {
  const payload = await getPayload({ config })
  const res = await payload.find({ collection: 'sites', where: { key: { equals: key } }, limit: 1, depth: 0 })
  return toSiteData(key, res.docs[0] ?? null)
}

/** Cached per site; the Sites afterChange hook revalidates tag `site:<key>`.
    Errors are not cached: a CMS outage falls back to registry defaults. */
export async function getSiteData(key: SiteKey): Promise<SiteData> {
  try {
    return await unstable_cache(() => readSite(key), ['site-data', key], { tags: [`site:${key}`] })()
  } catch (err) {
    console.error(`getSiteData(${key}) failed; using defaults`, err)
    return toSiteData(key, null)
  }
}
```
If `server-only` is not installed: `npm install server-only`.

- [ ] **Step 8: Seed script**

`web/src/seed/seed.ts`:

```ts
import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteKey } from '@/sites/config'

// Idempotent: creates missing site records, never overwrites edited ones.
const SEED: Record<SiteKey, { heroHeading: string; heroSubheading: string; coverage?: { name: string; zipFrom: number; zipTo: number }[] }> = {
  hub: {
    heroHeading: 'We Haul It. We Build It. We Show It.',
    heroSubheading: 'Logistics, home upgrades and multimedia: three specialist businesses, one group.',
  },
  logistics: {
    heroHeading: 'Reliable Freight. Real People. Right on Schedule.',
    heroSubheading: 'Business deliveries and home moves, priced before we lift anything, with a real person to call when plans change.',
    coverage: [
      { name: 'California', zipFrom: 900, zipTo: 961 },
      { name: 'Arizona', zipFrom: 850, zipTo: 865 },
      { name: 'Ohio', zipFrom: 430, zipTo: 459 },
    ],
  },
  homeupgrades: {
    heroHeading: 'From Blueprint to Beautiful.',
    heroSubheading: 'Renovations, feature walls and custom TV units, planned with you and built by our own crew.',
  },
  multimedia: {
    heroHeading: 'Your Story, Captured and Amplified.',
    heroSubheading: 'Photography, video, branding and design for businesses and the people behind them.',
  },
}

const payload = await getPayload({ config })
const context = { disableRevalidate: true }

for (const [key, data] of Object.entries(SEED) as [SiteKey, (typeof SEED)[SiteKey]][]) {
  const existing = await payload.find({ collection: 'sites', where: { key: { equals: key } }, limit: 1 })
  if (existing.totalDocs) {
    console.log(`sites/${key}: exists, left as is`)
    continue
  }
  await payload.create({ collection: 'sites', data: { key, email: 'hello@thegenixgroup.com', ...data }, context })
  console.log(`sites/${key}: created`)
}

// Local development only: an admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, if set and no users exist.
const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password } = process.env
if (email && password && process.env.NODE_ENV !== 'production') {
  const { totalDocs } = await payload.count({ collection: 'users' })
  if (!totalDocs) {
    await payload.create({ collection: 'users', data: { email, password } })
    console.log(`users/${email}: created (admin)`)
  }
}
process.exit(0)
```

- [ ] **Step 9: Run the tests**

Run: `cd web && npx vitest run tests/unit/data-shape.test.ts tests/int/sites.int.spec.ts`
Expected: all PASS. Then `npx tsc --noEmit` → no errors.

- [ ] **Step 10: Seed the dev database**

Set `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `web/.env` to throwaway local values, then `cd web && npm run seed`.
Expected: four `created` lines (a second run prints four `exists` lines).

- [ ] **Step 11: Commit**

```bash
git add web/src/payload web/src/collections web/src/seed web/src/sites/data-shape.ts web/src/sites/data.ts web/src/payload.config.ts web/src/payload-types.ts "web/src/app/(payload)/admin/importMap.js" web/tests/int/sites.int.spec.ts web/tests/unit/data-shape.test.ts web/package.json web/package-lock.json
git commit -m "feat(web): Payload users, media and sites with division-scoped access, revalidation and seed"
```

---

### Task 5: Host routing, per-site root layout, home, 404 and error pages

**Files:**
- Create: `web/src/proxy.ts`, `web/src/app/(sites)/[site]/layout.tsx`, `web/src/app/(sites)/[site]/page.tsx`, `web/src/app/(sites)/[site]/[...rest]/page.tsx`, `web/src/app/(sites)/[site]/not-found.tsx`, `web/src/app/(sites)/[site]/error.tsx`
- Copy: `design/assets/genix-group-logo.svg`, `genix-home-upgrades-logo.svg`, `genix-logistics-logo.svg` → `web/public/brand/`; `design/assets/hu-icons/*` → `web/public/icons/homeupgrades/`; `design/assets/logistics-icons/*` → `web/public/icons/logistics/`; `design/assets/genix-mark.svg` → `web/public/icons/hub/favicon.svg`, `design/assets/favicon-32.png` → `web/public/icons/hub/favicon-32x32.png`, `design/assets/apple-touch-icon.png` → `web/public/icons/hub/apple-touch-icon.png`
- Test: `web/tests/e2e/sites.e2e.spec.ts`

**Interfaces:**
- Consumes: `siteForRequest`, `routeRequest` (Task 2); `THEMES`, `themeVars`, `fontClassNames` (Task 3); `getSiteData` (Task 4).
- Produces: every site responds on its host; `<html data-site="<key>">`; `<main id="main">`; `h1` = hero heading; hero element carries `data-quote-bar-after`; themed 404 heading "We couldn't find that page."; cookie `genix-site` for preview hosts.

- [ ] **Step 1: Copy the brand assets**

```bash
mkdir -p web/public/brand web/public/icons/hub web/public/icons/homeupgrades web/public/icons/logistics
cp design/assets/genix-group-logo.svg design/assets/genix-home-upgrades-logo.svg design/assets/genix-logistics-logo.svg web/public/brand/
cp design/assets/hu-icons/* web/public/icons/homeupgrades/
cp design/assets/logistics-icons/* web/public/icons/logistics/
cp design/assets/genix-mark.svg web/public/icons/hub/favicon.svg
cp design/assets/favicon-32.png web/public/icons/hub/favicon-32x32.png
cp design/assets/apple-touch-icon.png web/public/icons/hub/apple-touch-icon.png
```

- [ ] **Step 2: Write the failing e2e test**

`web/tests/e2e/sites.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

// Chromium resolves *.localhost to this machine. Needs `npm run seed` first.
const ORIGINS = {
  hub: 'http://localhost:3000',
  logistics: 'http://logistics.localhost:3000',
  homeupgrades: 'http://homeupgrades.localhost:3000',
  multimedia: 'http://multimedia.localhost:3000',
} as const
const HEADINGS = {
  hub: 'We Haul It. We Build It. We Show It.',
  logistics: 'Reliable Freight. Real People. Right on Schedule.',
  homeupgrades: 'From Blueprint to Beautiful.',
  multimedia: 'Your Story, Captured and Amplified.',
} as const

for (const [site, origin] of Object.entries(ORIGINS) as [keyof typeof ORIGINS, string][]) {
  test(`${site}: home renders on its own host in its own theme`, async ({ page }) => {
    const res = await page.goto(origin + '/')
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('data-site', site)
    await expect(page.locator('h1')).toHaveText(HEADINGS[site])
  })

  test(`${site}: unknown paths get the site's own 404`, async ({ page }) => {
    const res = await page.goto(origin + '/no-such-page')
    expect(res?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('data-site', site)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("We couldn't find that page.")
  })
}

test('admin is served on the main domain only', async ({ page }) => {
  expect((await page.goto(ORIGINS.hub + '/admin'))?.status()).toBe(200)
  expect((await page.goto(ORIGINS.logistics + '/admin'))?.status()).toBe(404)
  expect((await page.goto(ORIGINS.multimedia + '/api/sites'))?.status()).toBe(404)
})

test('the hub cannot be used to reach a division page', async ({ page }) => {
  const res = await page.goto(ORIGINS.hub + '/logistics')
  expect(res?.status()).toBe(404)
  await expect(page.locator('html')).toHaveAttribute('data-site', 'hub')
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd web && npx playwright test tests/e2e/sites.e2e.spec.ts`
Expected: FAIL (no site routes yet; `/` is 404 everywhere).

- [ ] **Step 4: The proxy**

`web/src/proxy.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { routeRequest, siteForRequest } from '@/sites/routing'

const PREVIEW_COOKIE = 'genix-site'

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const root = process.env.ROOT_DOMAIN || 'thegenixgroup.com'
  // Preview deployments (unknown hosts) may pick a site with ?site=<key>, remembered in a cookie.
  const allowPreview = process.env.VERCEL_ENV !== 'production'
  const querySite = req.nextUrl.searchParams.get('site')
  const site = siteForRequest(host, {
    root,
    previewSite: querySite ?? req.cookies.get(PREVIEW_COOKIE)?.value,
    allowPreview,
  })

  const decision = routeRequest(site, req.nextUrl.pathname)
  let res: NextResponse
  if (decision.kind === 'notFound') {
    const url = req.nextUrl.clone()
    url.pathname = `/${site}/__not-found`
    res = NextResponse.rewrite(url, { status: 404 })
  } else if (decision.kind === 'rewrite') {
    const url = req.nextUrl.clone()
    url.pathname = decision.pathname
    res = NextResponse.rewrite(url)
  } else {
    res = NextResponse.next()
  }
  if (allowPreview && querySite) res.cookies.set(PREVIEW_COOKIE, querySite, { path: '/', sameSite: 'lax' })
  return res
}

export const config = {
  // Everything except Next internals and static brand files.
  matcher: ['/((?!_next/|brand/|icons/|favicon\\.ico).*)'],
}
```
(`/<site>/__not-found` hits the catch-all below and renders the site's themed 404; the explicit `status: 404` guarantees the status for Payload paths on subdomains.)

- [ ] **Step 5: Root layout per site**

`web/src/app/(sites)/[site]/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '../sites.css'
import { SITES, SITE_KEYS, isSiteKey, siteOrigin } from '@/sites/config'
import { THEMES, themeVars } from '@/sites/themes'
import { fontClassNames } from '@/sites/fonts'
import { getSiteData } from '@/sites/data'

type Props = { children: React.ReactNode; params: Promise<{ site: string }> }

export function generateStaticParams() {
  return SITE_KEYS.map((site) => ({ site }))
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { site } = await params
  if (!isSiteKey(site)) return {}
  const cfg = SITES[site]
  const data = await getSiteData(site)
  return {
    metadataBase: new URL(siteOrigin(site)),
    title: { default: `${cfg.name} | ${cfg.tagline}`, template: `%s | ${cfg.name}` },
    description: data.seoDescription ?? undefined,
    icons: {
      icon: [
        { url: `${cfg.icons}/favicon.svg`, type: 'image/svg+xml' },
        { url: `${cfg.icons}/favicon-32x32.png`, sizes: '32x32', type: 'image/png' },
      ],
      apple: `${cfg.icons}/apple-touch-icon.png`,
    },
  }
}

export default async function SiteLayout({ children, params }: Props) {
  const { site } = await params
  if (!isSiteKey(site)) notFound()
  const theme = THEMES[site]
  return (
    <html lang="en" data-site={site} className={fontClassNames(theme)} style={themeVars(theme)}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
```
(Header, footer, quote bar and analytics are added to this layout in Tasks 6 and 8.)

- [ ] **Step 6: Home, catch-all, not-found, error**

`web/src/app/(sites)/[site]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITES, SITE_KEYS, isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'

type Props = { params: Promise<{ site: string }> }

export function generateStaticParams() {
  return SITE_KEYS.map((site) => ({ site }))
}

export default async function HomePage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site)) notFound()
  const cfg = SITES[site]
  const data = await getSiteData(site)
  return (
    <main id="main">
      <section data-quote-bar-after className="on-brand bg-brand px-[clamp(16px,4vw,56px)] py-[clamp(64px,10vw,128px)] text-white">
        <div className="mx-auto max-w-[1320px]">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">{cfg.name}</p>
          <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(40px,6vw,88px)] font-bold leading-[0.98]">{data.heroHeading}</h1>
          {data.heroSubheading && <p className="mt-6 max-w-[48ch] text-lg text-on-brand-muted">{data.heroSubheading}</p>}
          <Link href={cfg.cta.href} className="mt-8 inline-flex min-h-[52px] items-center rounded-site bg-gold px-6 font-semibold text-heading">
            {cfg.cta.label} <span aria-hidden="true" className="ml-3">→</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
```

`web/src/app/(sites)/[site]/[...rest]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'

// Any path a site does not define renders that site's themed not-found page.
export default function UnknownPage() {
  notFound()
}
```

`web/src/app/(sites)/[site]/not-found.tsx`:

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,56px)] py-[clamp(72px,12vw,160px)]">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(36px,5vw,64px)] font-bold leading-none text-heading">We couldn&apos;t find that page.</h1>
      <p className="mt-6 max-w-[48ch] text-ink-2">It may have moved, or the link may be mistyped. The home page has everything we do.</p>
      <Link href="/" className="mt-8 inline-flex min-h-[52px] items-center rounded-site bg-brand px-6 font-semibold text-white">
        Go to the home page
      </Link>
    </main>
  )
}
```

`web/src/app/(sites)/[site]/error.tsx`:

```tsx
'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,56px)] py-[clamp(72px,12vw,160px)]">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Something went wrong</p>
      <h1 className="mt-4 font-display text-[clamp(36px,5vw,64px)] font-bold leading-none text-heading">This page didn&apos;t load.</h1>
      <p className="mt-6 max-w-[48ch] text-ink-2">Try again. If it keeps happening, the home page is still available.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-[52px] items-center rounded-site bg-brand px-6 font-semibold text-white">
          Try again
        </button>
        <a href="/" className="inline-flex min-h-[52px] items-center rounded-site border border-heading px-6 font-semibold text-heading">
          Go to the home page
        </a>
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Run the e2e test**

Run: `cd web && npm run seed && npx playwright test tests/e2e/sites.e2e.spec.ts`
Expected: all PASS. If a subdomain request fails with a cross-origin dev warning, confirm `allowedDevOrigins: ['*.localhost']` from Task 1 is inside the Next config passed to `withPayload`.

- [ ] **Step 8: Build check**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: contrast gate PASS, build succeeds (needs Docker Postgres running for static generation).

- [ ] **Step 9: Commit**

```bash
git add web/src/proxy.ts "web/src/app/(sites)" web/public/brand web/public/icons web/tests/e2e/sites.e2e.spec.ts
git commit -m "feat(web): host-based routing to per-site layouts with themed home, 404 and error pages"
```

---

### Task 6: Shared chrome — logo, header, mobile menu, footer, phone quote bar

**Files:**
- Create: `web/src/components/site/Logo.tsx`, `Header.tsx`, `MobileMenu.tsx`, `Footer.tsx`, `QuoteBar.tsx`
- Modify: `web/src/app/(sites)/[site]/layout.tsx` (render them)
- Test: `web/tests/e2e/chrome.e2e.spec.ts`

**Interfaces:**
- Consumes: `SITES`, `SITE_KEYS`, `DIVISION_KEYS`, `siteOrigin`, `type SiteKey` (Task 2); `getSiteData`, `type SiteData` (Task 4).
- Produces: `<Logo site className? />`, `<Header site />`, `<Footer site data />`, `<QuoteBar href label phone />`. Page markers (the quote-bar contract): the element the bar appears after carries `data-quote-bar-after`; elements it must not cover carry `data-quote-bar-hide`. The bar has `data-testid="quote-bar"` and `data-off="true|false"`.

- [ ] **Step 1: Write the failing e2e test**

`web/tests/e2e/chrome.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const LOGISTICS = 'http://logistics.localhost:3000'
const HUB = 'http://localhost:3000'

test('division header: logo, nav, group link and quote button', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  const header = page.locator('header')
  await expect(header.getByRole('link', { name: 'Genix Logistics home' })).toBeVisible()
  await expect(header.getByRole('navigation', { name: 'Primary' }).getByRole('link')).toHaveText(['Services', 'Our work', 'About'])
  await expect(header.getByRole('link', { name: /Part of The Genix Group/ })).toHaveAttribute('href', 'http://localhost:3000')
  await expect(header.getByRole('link', { name: 'Get a quote' })).toBeVisible()
})

test('multimedia has a text wordmark until its logo exists', async ({ page }) => {
  await page.goto('http://multimedia.localhost:3000/')
  await expect(page.locator('header').getByRole('link', { name: 'Genix Multimedia home' })).toContainText('Multimedia')
})

test('footer links to the sister divisions and shows the group email', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  const footer = page.locator('footer')
  await expect(footer.getByRole('link', { name: 'Home Upgrades' })).toHaveAttribute('href', 'http://homeupgrades.localhost:3000')
  await expect(footer.getByRole('link', { name: 'Multimedia' })).toHaveAttribute('href', 'http://multimedia.localhost:3000')
  await expect(footer.getByRole('link', { name: 'hello@thegenixgroup.com' })).toHaveAttribute('href', 'mailto:hello@thegenixgroup.com')
})

test('hub footer lists all three divisions', async ({ page }) => {
  await page.goto(HUB + '/')
  await expect(page.locator('footer').getByRole('link', { name: /Logistics|Home Upgrades|Multimedia/ })).toHaveCount(3)
})

test.describe('phones', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('menu button opens and closes the navigation', async ({ page }) => {
    await page.goto(LOGISTICS + '/')
    const button = page.getByRole('button', { name: 'Open menu' })
    await button.click()
    await expect(page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Services' })).toBeVisible()
    await page.getByRole('button', { name: 'Close menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toHaveCount(0)
  })

  test('quote bar: hidden over the hero, shown after it, hidden over the footer', async ({ page }) => {
    await page.goto(LOGISTICS + '/')
    const bar = page.getByTestId('quote-bar')
    await expect(bar).toHaveAttribute('data-off', 'true')
    // make the page long enough that the footer sits well below the hero
    await page.evaluate(() => document.querySelector('main')!.style.setProperty('min-height', '3000px'))
    await page.evaluate(() => window.scrollTo(0, (document.querySelector('[data-quote-bar-after]') as HTMLElement).offsetHeight + 200))
    await expect(bar).toHaveAttribute('data-off', 'false')
    await page.evaluate(() => document.querySelector('footer')!.scrollIntoView())
    await expect(bar).toHaveAttribute('data-off', 'true')
  })
})

test('no quote bar on desktop', async ({ page }) => {
  await page.goto(LOGISTICS + '/')
  await expect(page.getByTestId('quote-bar')).toBeHidden()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd web && npx playwright test tests/e2e/chrome.e2e.spec.ts` → Expected: FAIL (no header/footer).

- [ ] **Step 3: Components**

`web/src/components/site/Logo.tsx`:

```tsx
import Image from 'next/image'
import { SITES, type SiteKey } from '@/sites/config'

// Supplied SVG lockups are used whole (the gold X is a trademark). No logo yet → wordmark.
export function Logo({ site, className }: { site: SiteKey; className?: string }) {
  const { logo, shortName } = SITES[site]
  if (!logo) {
    return (
      <span className={`font-display text-xl font-bold tracking-tight text-heading ${className ?? ''}`}>
        GENIX <span className="font-normal text-gold-text">{shortName}</span>
      </span>
    )
  }
  return <Image src={logo.src} width={logo.width} height={logo.height} alt="" unoptimized priority className={className} />
}
```

`web/src/components/site/MobileMenu.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import type { NavItem } from '@/sites/config'

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-[961px]:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-site border border-line bg-paper"
      >
        <span aria-hidden="true" className="grid gap-[5px]">
          <span className="block h-0.5 w-[18px] bg-heading" />
          <span className="block h-0.5 w-[18px] bg-heading" />
          <span className="block h-0.5 w-[18px] bg-heading" />
        </span>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="absolute inset-x-0 top-[76px] border-b border-line bg-paper px-4 pb-5 pt-2">
          {items.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="block border-b border-line py-3.5 text-lg text-heading last:border-b-0">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
```

`web/src/components/site/Header.tsx`:

```tsx
import Link from 'next/link'
import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { Logo } from './Logo'
import { MobileMenu } from './MobileMenu'

export function Header({ site }: { site: SiteKey }) {
  const cfg = SITES[site]
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="relative mx-auto flex h-[76px] max-w-[1320px] items-center justify-between gap-6 px-[clamp(16px,4vw,56px)]">
        <Link href="/" aria-label={`${cfg.name} home`} className="inline-flex min-h-11 items-center">
          <Logo site={site} className="h-12 w-auto" />
        </Link>
        <nav aria-label="Primary" className="hidden gap-8 min-[961px]:flex">
          {cfg.nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-[15px] font-medium text-ink-2 hover:text-heading">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-5 min-[961px]:flex">
          {site !== 'hub' && (
            <a href={siteOrigin('hub')} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.1em] text-muted hover:text-heading">
              Part of The Genix Group ↗
            </a>
          )}
          <Link href={cfg.cta.href} className="inline-flex min-h-11 items-center rounded-site bg-gold px-[18px] text-[15px] font-semibold text-heading">
            {cfg.cta.label}
          </Link>
        </div>
        <MobileMenu items={[...cfg.nav, cfg.cta]} />
      </div>
    </header>
  )
}
```

`web/src/components/site/Footer.tsx`:

```tsx
import { DIVISION_KEYS, SITES, siteOrigin, type SiteKey } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'
import { Logo } from './Logo'

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`

export function Footer({ site, data }: { site: SiteKey; data: SiteData }) {
  const cfg = SITES[site]
  const sisters = DIVISION_KEYS.filter((k) => k !== site)
  return (
    <footer data-quote-bar-hide className="on-brand border-t-2 border-gold bg-brand py-16 text-[15px] text-white">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-[clamp(16px,4vw,56px)] min-[961px]:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="inline-block rounded-site bg-paper px-4 py-3">
            <Logo site={site} className="h-14 w-auto" />
          </span>
          {site !== 'hub' && (
            <a href={siteOrigin('hub')} className="mt-5 block text-on-brand-muted hover:underline">
              Part of <b className="font-semibold text-white">The Genix Group</b>
            </a>
          )}
        </div>
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-gold">Pages</h2>
          <ul className="grid gap-3">
            {cfg.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:underline">{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-gold">Contact</h2>
          <ul className="grid gap-3">
            {data.email && (
              <li><a href={`mailto:${data.email}`} className="hover:underline">{data.email}</a></li>
            )}
            {data.phone && (
              <li><a href={telHref(data.phone)} className="hover:underline">{data.phone}</a></li>
            )}
          </ul>
        </div>
        <div className="col-span-full flex flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-sm text-on-brand-muted">
          <span>© {new Date().getFullYear()} {cfg.name}{site !== 'hub' ? ', part of The Genix Group' : ''}</span>
          <span className="flex flex-wrap gap-4">
            {sisters.map((k) => (
              <a key={k} href={siteOrigin(k)} className="hover:text-white">{SITES[k].shortName}</a>
            ))}
          </span>
        </div>
      </div>
    </footer>
  )
}
```

`web/src/components/site/QuoteBar.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/* Phones (≤960px): slides in once [data-quote-bar-after] has scrolled away;
   stays away while any [data-quote-bar-hide] element is on screen.
   Ported from design/shared/quote-bar.js. */
export function QuoteBar({ href, label, phone }: { href: string; label: string; phone: string | null }) {
  const [off, setOff] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const wide = matchMedia('(min-width: 961px)')
    const after = document.querySelector('[data-quote-bar-after]')
    const watch = [after, ...Array.from(document.querySelectorAll('[data-quote-bar-hide]'))].filter(Boolean) as Element[]
    const seen = new Map<Element, boolean>()
    const update = () => {
      const passed = after ? after.getBoundingClientRect().bottom < 0 : true
      setOff(wide.matches || !passed || watch.some((el) => seen.get(el)))
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting))
      update()
    })
    watch.forEach((el) => io.observe(el))
    wide.addEventListener('change', update)
    update()
    return () => {
      io.disconnect()
      wide.removeEventListener('change', update)
    }
  }, [pathname])

  return (
    <div
      data-testid="quote-bar"
      data-off={off}
      inert={off}
      className={`fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-line bg-paper px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(2,34,72,0.08)] transition-transform duration-300 motion-reduce:transition-none min-[961px]:hidden ${off ? 'translate-y-[110%]' : ''}`}
    >
      <Link href={href} className="flex min-h-[52px] flex-1 items-center justify-center rounded-site bg-gold font-semibold text-heading">
        {label} <span aria-hidden="true" className="ml-2">→</span>
      </Link>
      {phone && (
        <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="flex min-h-[52px] items-center rounded-site border border-heading px-5 font-semibold text-heading">
          Call
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Render them in the layout**

In `web/src/app/(sites)/[site]/layout.tsx`: import `Header`, `Footer`, `QuoteBar` from `@/components/site/…`; fetch `const data = await getSiteData(site)` in `SiteLayout`; replace the body contents with:

```tsx
<body>
  <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2">
    Skip to content
  </a>
  <Header site={site} />
  {children}
  <Footer site={site} data={data} />
  <QuoteBar href={SITES[site].cta.href} label={SITES[site].cta.label} phone={data.phone} />
</body>
```

- [ ] **Step 5: Run the tests**

Run: `cd web && npx playwright test tests/e2e/chrome.e2e.spec.ts tests/e2e/sites.e2e.spec.ts`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/site "web/src/app/(sites)/[site]/layout.tsx" web/tests/e2e/chrome.e2e.spec.ts
git commit -m "feat(web): shared header, mobile menu, footer and phone quote bar"
```

---

### Task 7: SEO plumbing — titles, canonicals, sitemaps, robots, JSON-LD, share images

**Files:**
- Create: `web/src/sites/seo.ts`, `web/src/components/site/JsonLd.tsx`, `web/src/app/(sites)/[site]/sitemap.xml/route.ts`, `web/src/app/(sites)/[site]/robots.txt/route.ts`, `web/src/app/(sites)/[site]/opengraph-image.tsx`
- Modify: `web/src/app/(sites)/[site]/page.tsx` (metadata + JSON-LD)
- Test: `web/tests/unit/seo.test.ts`, `web/tests/e2e/seo.e2e.spec.ts`

**Interfaces:**
- Consumes: `SITES`, `DIVISION_KEYS`, `siteOrigin`, `SiteKey` (Task 2); `SiteData` (Task 4); `THEMES` (Task 3).
- Produces: `pageMetadata(site, path, opts?, root?) → Metadata`; `sitemapXml(site, root?) → string`; `robotsTxt(site, allowIndexing, root?) → string`; `siteJsonLd(site, data, root?) → Record<string, unknown>`; `<JsonLd data />`.

- [ ] **Step 1: Write the failing unit test**

`web/tests/unit/seo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pageMetadata, robotsTxt, siteJsonLd, sitemapXml } from '@/sites/seo'
import { toSiteData } from '@/sites/data-shape'

const root = 'thegenixgroup.com'

describe('pageMetadata', () => {
  it('uses "<Site> | <Tagline>" on the home page with an absolute canonical', () => {
    const m = pageMetadata('logistics', '/', {}, root)
    expect(m.title).toEqual({ absolute: 'Genix Logistics | Reliable Freight. Real People. Right on Schedule.' })
    expect(m.alternates?.canonical).toBe('https://logistics.thegenixgroup.com/')
  })
  it('uses "<Page> | <Site>" elsewhere', () => {
    const m = pageMetadata('homeupgrades', '/services', { title: 'Services', description: 'What we do' }, root)
    expect(m.title).toEqual({ absolute: 'Services | Genix Home Upgrades' })
    expect(m.description).toBe('What we do')
    expect(m.alternates?.canonical).toBe('https://homeupgrades.thegenixgroup.com/services')
    expect(m.openGraph).toMatchObject({ url: 'https://homeupgrades.thegenixgroup.com/services', siteName: 'Genix Home Upgrades' })
  })
})

describe('sitemapXml / robotsTxt', () => {
  it('lists the site pages on the site host', () => {
    const xml = sitemapXml('multimedia', root)
    expect(xml).toContain('<loc>https://multimedia.thegenixgroup.com/</loc>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })
  it('allows indexing only in production and points at the sitemap', () => {
    expect(robotsTxt('logistics', true, root)).toBe('User-agent: *\nAllow: /\n\nSitemap: https://logistics.thegenixgroup.com/sitemap.xml\n')
    expect(robotsTxt('logistics', false, root)).toBe('User-agent: *\nDisallow: /\n')
    expect(robotsTxt('hub', true, root)).toContain('Disallow: /admin')
  })
})

describe('siteJsonLd', () => {
  it('describes the hub as the parent of the three divisions', () => {
    const ld = siteJsonLd('hub', toSiteData('hub', null), root)
    expect(ld).toMatchObject({ '@type': 'Organization', name: 'The Genix Group', url: 'https://thegenixgroup.com/' })
    expect((ld.subOrganization as { name: string }[]).map((o) => o.name)).toEqual(['Genix Logistics', 'Genix Home Upgrades', 'Genix Multimedia'])
  })
  it('gives a division its type, parent and areas served', () => {
    const data = toSiteData('logistics', { coverage: [{ name: 'California' }, { name: 'Arizona' }, { name: 'Ohio' }] })
    const ld = siteJsonLd('logistics', data, root)
    expect(ld).toMatchObject({
      '@type': 'MovingCompany',
      name: 'Genix Logistics',
      slogan: 'Reliable Freight. Real People. Right on Schedule.',
      parentOrganization: { name: 'The Genix Group', url: 'https://thegenixgroup.com/' },
      areaServed: [{ '@type': 'State', name: 'California' }, { '@type': 'State', name: 'Arizona' }, { '@type': 'State', name: 'Ohio' }],
    })
  })
  it('leaves out areaServed when there is no coverage', () => {
    expect(siteJsonLd('multimedia', toSiteData('multimedia', null), root)).not.toHaveProperty('areaServed')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd web && npx vitest run tests/unit/seo.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 3: Write `seo.ts`**

`web/src/sites/seo.ts`:

```ts
import type { Metadata } from 'next'
import { DIVISION_KEYS, SITES, siteOrigin, type SiteKey } from './config'
import type { SiteData } from './data-shape'

export function pageMetadata(
  site: SiteKey,
  path: string,
  opts: { title?: string; description?: string | null } = {},
  root?: string,
): Metadata {
  const cfg = SITES[site]
  const title = opts.title ? `${opts.title} | ${cfg.name}` : `${cfg.name} | ${cfg.tagline}`
  const url = new URL(path, siteOrigin(site, root) + '/').toString()
  const description = opts.description ?? undefined
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: cfg.name, type: 'website' },
    twitter: { card: 'summary_large_image' },
  }
}

export function sitemapXml(site: SiteKey, root?: string): string {
  const origin = siteOrigin(site, root)
  const urls = SITES[site].pages.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function robotsTxt(site: SiteKey, allowIndexing: boolean, root?: string): string {
  if (!allowIndexing) return 'User-agent: *\nDisallow: /\n'
  const admin = site === 'hub' ? 'Disallow: /admin\nDisallow: /api/\n' : ''
  return `User-agent: *\nAllow: /\n${admin}\nSitemap: ${siteOrigin(site, root)}/sitemap.xml\n`
}

export function siteJsonLd(site: SiteKey, data: SiteData, root?: string): Record<string, unknown> {
  const cfg = SITES[site]
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': cfg.schemaType,
    name: cfg.name,
    url: `${siteOrigin(site, root)}/`,
    slogan: cfg.tagline,
    ...(data.email ? { email: data.email } : {}),
    ...(data.phone ? { telephone: data.phone } : {}),
  }
  if (site === 'hub') {
    return {
      ...base,
      subOrganization: DIVISION_KEYS.map((k) => ({ '@type': SITES[k].schemaType, name: SITES[k].name, url: `${siteOrigin(k, root)}/` })),
    }
  }
  const areaServed = data.coverage.map((c) => ({ '@type': 'State', name: c.name }))
  return {
    ...base,
    ...(areaServed.length ? { areaServed } : {}),
    parentOrganization: { '@type': 'Organization', name: SITES.hub.name, url: `${siteOrigin('hub', root)}/` },
  }
}
```

Note: the hub's robots output has `Allow: /` then the admin `Disallow` lines, then a blank line and the Sitemap line — the unit test checks the exact division form and that the hub contains `Disallow: /admin`.

- [ ] **Step 4: Run the unit test**

Run: `cd web && npx vitest run tests/unit/seo.test.ts` → Expected: all PASS.

- [ ] **Step 5: Routes, OG image, JSON-LD, page metadata**

`web/src/components/site/JsonLd.tsx`:

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify output is safe here except for "<", escaped to keep </script> out.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
```

`web/src/app/(sites)/[site]/sitemap.xml/route.ts`:

```ts
import { isSiteKey } from '@/sites/config'
import { sitemapXml } from '@/sites/seo'

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSiteKey(site)) return new Response('Not found', { status: 404 })
  return new Response(sitemapXml(site), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
```

`web/src/app/(sites)/[site]/robots.txt/route.ts`:

```ts
import { isSiteKey } from '@/sites/config'
import { robotsTxt } from '@/sites/seo'

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSiteKey(site)) return new Response('Not found', { status: 404 })
  const allowIndexing = process.env.ALLOW_INDEXING === '1'
  return new Response(robotsTxt(site, allowIndexing), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
```

`web/src/app/(sites)/[site]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'
import { SITES, SITE_KEYS, isSiteKey } from '@/sites/config'
import { THEMES } from '@/sites/themes'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'The Genix Group'

export function generateStaticParams() {
  return SITE_KEYS.map((site) => ({ site }))
}

export default async function OpengraphImage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  const key = isSiteKey(site) ? site : 'hub'
  const cfg = SITES[key]
  const t = THEMES[key]
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: t.brand, color: '#ffffff' }}>
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: t.gold }}>{cfg.name}</div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.02, maxWidth: 980 }}>{cfg.tagline}</div>
        <div style={{ display: 'flex', width: 220, height: 8, background: t.gold }} />
      </div>
    ),
    size,
  )
}
```

In `web/src/app/(sites)/[site]/page.tsx` add:

```tsx
import type { Metadata } from 'next'
import { JsonLd } from '@/components/site/JsonLd'
import { pageMetadata, siteJsonLd } from '@/sites/seo'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (!isSiteKey(site)) return {}
  const data = await getSiteData(site)
  return pageMetadata(site, '/', { description: data.seoDescription })
}
```
and render `<JsonLd data={siteJsonLd(site, data)} />` as the first child of `<main>`.

- [ ] **Step 6: Write the e2e test**

`web/tests/e2e/seo.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('logistics home: title, canonical, JSON-LD and share image', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  await expect(page).toHaveTitle('Genix Logistics | Reliable Freight. Real People. Right on Schedule.')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://logistics.localhost:3000/')
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
  expect(ld['@type']).toBe('MovingCompany')
  expect(ld.areaServed.map((a: { name: string }) => a.name)).toEqual(['California', 'Arizona', 'Ohio'])
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content')
  expect(og).toBeTruthy()
  const img = await page.goto(og!)
  expect(img?.status()).toBe(200)
  expect(img?.headers()['content-type']).toContain('image/png')
})

test('each host serves its own sitemap and robots.txt', async ({ page }) => {
  const res = await page.goto('http://homeupgrades.localhost:3000/sitemap.xml')
  expect(res?.status()).toBe(200)
  expect(await res!.text()).toContain('<loc>http://homeupgrades.localhost:3000/</loc>')
  const robots = await page.goto('http://homeupgrades.localhost:3000/robots.txt')
  expect(await robots!.text()).toBe('User-agent: *\nDisallow: /\n') // ALLOW_INDEXING is off locally
})
```

- [ ] **Step 7: Run all tests**

Run: `cd web && npx vitest run tests/unit && npx playwright test`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/sites/seo.ts web/src/components/site/JsonLd.tsx "web/src/app/(sites)/[site]" web/tests/unit/seo.test.ts web/tests/e2e/seo.e2e.spec.ts
git commit -m "feat(web): per-site titles, canonicals, sitemaps, robots, JSON-LD and share images"
```

---

### Task 8: Analytics and the full local verification

**Files:**
- Modify: `web/src/app/(sites)/[site]/layout.tsx`
- Test: `web/tests/e2e/analytics.e2e.spec.ts`

**Interfaces:**
- Consumes: the layout from Tasks 5–6.
- Produces: Vercel Web Analytics and Speed Insights on every site page (not in the admin).

- [ ] **Step 1: Write the failing test**

`web/tests/e2e/analytics.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('analytics and speed insights load on site pages, not in the admin', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  // In development both components inject debug scripts from /_vercel/… or the CDN.
  const srcs = await page.locator('script[src]').evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src))
  expect(srcs.some((s) => /insights|speed-insights|va\.vercel-scripts|_vercel/.test(s))).toBe(true)
  await page.goto('http://localhost:3000/admin')
  const adminSrcs = await page.locator('script[src]').evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src))
  expect(adminSrcs.some((s) => /speed-insights|va\.vercel-scripts/.test(s))).toBe(false)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd web && npx playwright test tests/e2e/analytics.e2e.spec.ts` → Expected: FAIL.

- [ ] **Step 3: Add the components**

In `web/src/app/(sites)/[site]/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
```
and render `<Analytics />` and `<SpeedInsights />` as the last children of `<body>`.

- [ ] **Step 4: Run the test**

Run: `cd web && npx playwright test tests/e2e/analytics.e2e.spec.ts` → Expected: PASS. If the dev-mode script URLs differ from the regex, inspect `srcs` and match the actual Vercel script hosts — the assertion must still distinguish site pages from the admin.

- [ ] **Step 5: Full verification**

```bash
cd web
npx tsc --noEmit
npm run test:unit
npm run test:int
npm run build
npm run test:e2e
```
Expected: every command succeeds. Then open each of the four local hosts in a browser at 390px and 1440px widths and confirm by eye: correct logo, colours and fonts per site; no horizontal scroll; the menu works on phones.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(sites)/[site]/layout.tsx" web/tests/e2e/analytics.e2e.spec.ts
git commit -m "feat(web): Vercel Web Analytics and Speed Insights on site pages"
```

---

### Task 9: Production migrations and first deployment (owner-assisted)

This task uses the owner's Vercel account, creates paid-plan resources and points DNS. **Before any `vercel` command that creates resources, adds domains or deploys, stop and get the owner's explicit go-ahead in chat.** Everything up to Step 2 is local.

**Files:**
- Create: `web/src/migrations/*` (generated)
- Modify: `web/src/payload.config.ts` (`prodMigrations`)

**Interfaces:**
- Consumes: the whole app.
- Produces: a Vercel project (root directory `web`) with Neon Postgres, a Blob store, env vars, a preview deployment, and later the four production domains.

- [ ] **Step 1: Generate the initial migration**

```bash
cd web
npx payload migrate:create initial
```
Expected: `src/migrations/<timestamp>_initial.ts` and `src/migrations/index.ts`.

- [ ] **Step 2: Run migrations in production builds**

In `web/src/payload.config.ts`:

```ts
import { migrations } from './migrations'
// …
db: postgresAdapter({
  pool: { connectionString: process.env.DATABASE_URI || '' },
  push: process.env.NODE_ENV !== 'production',
  prodMigrations: migrations,
}),
```
Run `npx tsc --noEmit && npm run build` → Expected: success. Commit:

```bash
git add web/src/migrations web/src/payload.config.ts
git commit -m "chore(web): initial Payload migration, applied on production start"
```

- [ ] **Step 3: (Owner go-ahead required) Create the Vercel project and storage**

With the owner's approval, from `web/`:
```bash
vercel link                                  # new project "genix-websites", root directory = web
vercel integration add neon                  # Neon Postgres; sets DATABASE_URL / POSTGRES_URL
vercel blob store add genix-media            # sets BLOB_READ_WRITE_TOKEN
```
Then set env vars for Production and Preview (values typed by the owner or generated; never echoed back in chat):
- `DATABASE_URI` = the Neon pooled connection string (same value as the integration's `DATABASE_URL`)
- `PAYLOAD_SECRET` = a new random 64-hex string
- `ROOT_DOMAIN` = `thegenixgroup.com`
- `ALLOW_INDEXING` = `1` for Production only

- [ ] **Step 4: (Owner go-ahead required) Preview deployment and smoke test**

```bash
vercel deploy
```
On the preview URL check: `/admin` shows "create first user" (the owner creates the first account — it becomes admin); `/?site=logistics` shows the Logistics home in its theme; `/robots.txt` says `Disallow: /`. Then run `npm run seed` against production data only if the owner agrees (with `DATABASE_URI` pointed at Neon), or let the owner fill the four Sites records in the admin.

- [ ] **Step 5: (Owner go-ahead required) Domains**

```bash
vercel domains add thegenixgroup.com
vercel domains add logistics.thegenixgroup.com
vercel domains add homeupgrades.thegenixgroup.com
vercel domains add multimedia.thegenixgroup.com
```
The owner adds the DNS records Vercel prints at their registrar. After DNS verifies: `vercel deploy --prod`, then check each host serves its own home, sitemap and robots (`Allow: /`). Record in the repo's README which Vercel project and Neon database are production.
