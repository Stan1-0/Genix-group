# Home Pages Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the three approved prototype home pages (Logistics, Home Upgrades, Hub), with their headers, footers and behaviours, into the Next.js app so the app matches the design.

**Architecture:** Prototype CSS is copied by a script, scoped under `html[data-site="<key>"]`, and imported once by the site layout. Markup becomes server components with the prototype's classes, ids and `data-*` hooks. Each prototype script becomes a small client "enhancer" component that runs the ported logic in `useEffect` against that server markup, inside a `gsap.context`, with full cleanup. Screenshot-parity tests compare every section of the app with the prototype.

**Tech Stack:** Next.js 16.3.6 (App Router), React 19, Payload 3.90.2, Tailwind v4 (theme + utilities), gsap 3.13.0, lenis 1.3.4, three 0.180.0, postcss (build-time CSS port), Playwright 1.58 + pixelmatch/pngjs, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-home-pages-port-design.md` (parent: `docs/superpowers/specs/2026-09-27-genix-websites-design.md`)

## Global Constraints

- The prototypes in `design/` are the visual source of truth: `design/logistics-home.html`, `design/homeupgrades-home.html`, `design/hub-home.html`, `design/shared/`, `design/js/`, `design/assets/`. Never edit them in this plan; the owner edits them (format-on-save). Never revert, checkout or stash changes you didn't make; ask instead.
- Taglines, exact: Group "We Haul It. We Build It. We Show It."; Logistics "Reliable Freight. Real People. On Time, Every Time."; Home Upgrades "From Blueprint to Beautiful."; Multimedia "Your Story, Captured and Amplified."
- Title separators are pipes: `<Page> | <Site name>`, home `<Site name> | <Tagline>`.
- Logos are the supplied SVGs, used whole. The gold X in GENIX is a trademark: never masked, reshaped or recoloured.
- Copy is verbatim from the prototypes, including "Stock photo" labels and marked placeholders. No "licensed", "insured" or similar claims.
- `prefers-reduced-motion` and no-JS show every animated section in its finished state; pages are readable as server HTML.
- Every client behaviour cleans up fully on unmount (`gsap.context().revert()`, listeners removed via `AbortController`); React StrictMode double-invokes effects in dev, so setup → cleanup → setup must leave no duplicates.
- Libraries pinned exactly: `gsap@3.13.0`, `lenis@1.3.4`, `three@0.180.0`, `@types/three@0.180.0`; dev `pixelmatch@7.1.0`, `pngjs@7.0.0`, `@types/pngjs@6.0.5`, `@axe-core/playwright@4.10.2`.
- Logistics quote form is look-only (no network call); when `VERCEL_ENV === 'production'` Send shows: "We can't take requests online yet. Call us at <phone> or email hello@thegenixgroup.com." (the "Call us at <phone> or" part is omitted while the phone is empty).
- Local DB: Postgres on port 5434, `DATABASE_URL`; never touch other projects' containers (ArtisanHub on 5433). Dev schema push only runs against loopback DBs.
- Read the relevant guide in `web/node_modules/next/dist/docs/` before using a Next API you haven't used in this repo (see `web/AGENTS.md`).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Test commands run from `web/`: `npx tsc --noEmit`, `npm run test:unit`, `npm run test:int`, `npm run test:e2e`. The e2e run starts `npm run dev` (port 3000) and the prototype server (port 4321) itself.

## Rulings made while planning (spec ↔ repo)

1. **CSS loading:** all three scoped CSS files are imported by the site layout, so they load on every site (scoped, so they can't leak). The spec's "loaded only on that site's pages" isn't achievable with one shared `[site]` route without splitting root layouts; the cost is ~20 KB gzip of unused CSS per page.
2. **Tailwind preflight is dropped:** the prototypes ship their own resets, and preflight would alter them wherever they rely on browser defaults. Multimedia (still on foundation components) gets a scoped copy of the preflight rules it uses.
3. **`SwipeRow` isn't a component:** `.swipe` is CSS-only in `design/shared/genix.css`.
4. **Hub has no quote bar**, matching its prototype.
5. **Navs follow the prototypes** (in-page anchors, prefixed with `/` so they work from inner pages); `SITES[...].nav`, `cta` and the chrome e2e tests change to match.
6. **Gold headline phrase:** `SITES[key].heroGold` names the phrase; the admin heading renders it gold only while the heading still ends with it.
7. **Hub motion** ports the hub's own inline script (`HubMotion`), not `shared/genix.js`, as in the prototype.

## File map

```
web/scripts/port-css.ts                         CLI: regenerates the three CSS files from design/
web/src/pages-home/port-css.ts                  pure scoping logic (unit-tested)
web/src/pages-home/<site>/<site>.generated.css  GENERATED; never hand-edit
web/src/pages-home/<site>/<Site>Home.tsx        the home page (server)
web/src/pages-home/<site>/sections/*.tsx        one server component per prototype <section>
web/src/pages-home/gold.ts                      goldTail(heading, phrase)
web/src/pages-home/logistics/send-mode.ts       quoteSendMode / offlineMessage
web/src/components/motion/*.tsx                 client enhancers (one per behaviour)
web/src/components/site/division/*.tsx          prototype header/footer/quote bar (logistics, homeupgrades)
web/src/components/site/hub/*.tsx               prototype hub header/footer
web/public/brand/…                              prototype assets (copied)
web/tests/e2e/parity.ts                         screenshot comparison helpers
web/tests/e2e/parity.e2e.spec.ts                per-site parity checks
web/tests/e2e/<site>-home.e2e.spec.ts           behaviour tests ported from design/tests/
```

---

### Task 1: CSS port tooling, generated site CSS, assets, early head script

**Files:**
- Create: `web/src/pages-home/port-css.ts`, `web/scripts/port-css.ts`, `web/src/pages-home/{logistics,homeupgrades,hub}/*.generated.css`, `web/tests/unit/port-css.test.ts`, `web/tests/unit/port-tokens.test.ts`
- Modify: `web/package.json` (deps + `port:css` script), `web/src/app/(sites)/sites.css`, `web/src/app/(sites)/[site]/layout.tsx`
- Copy: prototype assets → `web/public/brand/`

**Interfaces:**
- Produces: `scopeSelector(selector: string, site: SiteKey): string | null`, `portCss(css: string, site: SiteKey): string`, `fontOverrides(site: SiteKey): string` (in `@/pages-home/port-css`); the generated CSS files; `EARLY_SCRIPT` constant in `web/src/pages-home/early-script.ts`.

- [ ] **Step 1: Install pinned dependencies**

```bash
cd web
npm install --save-exact gsap@3.13.0 lenis@1.3.4 three@0.180.0
npm install --save-exact --save-dev @types/three@0.180.0 pixelmatch@7.1.0 pngjs@7.0.0 @types/pngjs@6.0.5 @axe-core/playwright@4.10.2
```

- [ ] **Step 2: Write the failing scoping tests** — `web/tests/unit/port-css.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { fontOverrides, portCss, scopeSelector } from '@/pages-home/port-css'

const S = 'html[data-site="logistics"]'

describe('scopeSelector', () => {
  it('maps :root, html and the own division to the site root', () => {
    expect(scopeSelector(':root', 'logistics')).toBe(S)
    expect(scopeSelector('html', 'logistics')).toBe(S)
    expect(scopeSelector('html.lenis body', 'logistics')).toBe(`${S}.lenis body`)
    expect(scopeSelector('[data-division="logistics"]', 'logistics')).toBe(S)
    expect(scopeSelector('[data-division="logistics"] .hero', 'logistics')).toBe(`${S} .hero`)
  })
  it('drops rules for another division', () => {
    expect(scopeSelector('[data-division="homeupgrades"] .x', 'logistics')).toBeNull()
  })
  it('attaches html state classes to the root', () => {
    expect(scopeSelector('.h1-pending .hero h1', 'logistics')).toBe(`${S}.h1-pending .hero h1`)
    expect(scopeSelector('.js .menu-btn', 'logistics')).toBe(`${S}.js .menu-btn`)
    expect(scopeSelector('.js-motion [data-reveal]', 'logistics')).toBe(`${S}.js-motion [data-reveal]`)
  })
  it('prefixes everything else', () => {
    expect(scopeSelector('body', 'logistics')).toBe(`${S} body`)
    expect(scopeSelector('*::before', 'logistics')).toBe(`${S} *::before`)
    expect(scopeSelector('.hero > h1', 'logistics')).toBe(`${S} .hero > h1`)
    expect(scopeSelector('.javascript-free', 'logistics')).toBe(`${S} .javascript-free`)
  })
})

describe('portCss', () => {
  it('scopes rules inside @media, keeps keyframes, rewrites asset urls, drops emptied rules', () => {
    const out = portCss(
      `@media (max-width: 960px) { .a, [data-division="hub"] .b { color: red } }
       @keyframes spin { from { transform: none } to { transform: rotate(1turn) } }
       .c { background: url("../assets/hu-ba-finished.jpg") } .d { background: url(assets/x.svg) }
       [data-division="homeupgrades"] .gone { color: blue }`,
      'logistics',
    )
    expect(out).toContain(`${S} .a {`)
    expect(out).not.toContain('.b')
    expect(out).toContain('from { transform: none }')
    expect(out).toContain('url("/brand/hu-ba-finished.jpg")')
    expect(out).toContain('url(/brand/x.svg)')
    expect(out).not.toContain('.gone')
  })
})

describe('fontOverrides', () => {
  it('points the prototype font variables at next/font variables', () => {
    expect(fontOverrides('logistics')).toBe(
      `${S} { --f-display: var(--font-archivo), system-ui, sans-serif; --f-body: var(--font-archivo), system-ui, sans-serif; --f-mono: var(--font-plex-mono), ui-monospace, monospace; }`,
    )
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/unit/port-css.test.ts`
Expected: FAIL, "Cannot find package '@/pages-home/port-css'".

- [ ] **Step 4: Implement** — `web/src/pages-home/port-css.ts`

```ts
import postcss, { type AtRule, type Rule } from 'postcss'
import { SITE_KEYS, type SiteKey } from '@/sites/config'
import { FONT_VARS, THEMES } from '@/sites/themes'

/* Build-time only (scripts/port-css.ts and tests): turns prototype CSS into
   CSS scoped to one site. Never imported by app code. */

// Classes the prototypes toggle on <html>; selectors starting with them attach to the root.
const HTML_CLASSES = ['js', 'js-motion', 'h1-pending', 'lenis', 'lenis-smooth', 'lenis-stopped', 'lenis-scrolling', 'menu-open']

const root = (site: SiteKey) => `html[data-site="${site}"]`

export function scopeSelector(selector: string, site: SiteKey): string | null {
  const sel = selector.trim()
  const division = /^\[data-division="([a-z]+)"\]/.exec(sel)
  if (division) return division[1] === site ? root(site) + sel.slice(division[0].length) : null
  if (/^:root(?![\w-])/.test(sel)) return root(site) + sel.slice(':root'.length)
  if (/^html(?![\w-])/.test(sel)) return root(site) + sel.slice('html'.length)
  const cls = /^\.([\w-]+)/.exec(sel)
  if (cls && HTML_CLASSES.includes(cls[1])) return root(site) + sel
  return `${root(site)} ${sel}`
}

const inKeyframes = (rule: Rule) => {
  let p = rule.parent
  while (p && p.type !== 'root') {
    if (p.type === 'atrule' && /keyframes$/i.test((p as AtRule).name)) return true
    p = p.parent
  }
  return false
}

export function portCss(css: string, site: SiteKey): string {
  const tree = postcss.parse(css)
  tree.walkRules((rule) => {
    if (inKeyframes(rule)) return
    const scoped = rule.selectors.map((s) => scopeSelector(s, site)).filter((s): s is string => s !== null)
    if (scoped.length === 0) rule.remove()
    else rule.selectors = scoped
  })
  tree.walkDecls((decl) => {
    decl.value = decl.value.replace(/url\((['"]?)(?:\.\.\/)?assets\//g, 'url($1/brand/')
  })
  tree.walkAtRules((at) => {
    if (at.nodes && at.nodes.length === 0) at.remove()
  })
  return tree.toString()
}

export function fontOverrides(site: SiteKey): string {
  const t = THEMES[site]
  return `${root(site)} { --f-display: var(${FONT_VARS[t.fontDisplay]}), system-ui, sans-serif; --f-body: var(${FONT_VARS[t.fontBody]}), system-ui, sans-serif; --f-mono: var(${FONT_VARS[t.fontMono]}), ui-monospace, monospace; }`
}

export const PORTED_SITES = SITE_KEYS.filter((k) => k !== 'multimedia')
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/port-css.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Write the CLI** — `web/scripts/port-css.ts`

```ts
import fs from 'node:fs'
import path from 'node:path'
import { fontOverrides, portCss } from '../src/pages-home/port-css'
import type { SiteKey } from '../src/sites/config'

const DESIGN = path.resolve(import.meta.dirname, '../../design')
const OUT = path.resolve(import.meta.dirname, '../src/pages-home')
const file = (p: string) => fs.readFileSync(path.join(DESIGN, p), 'utf8')
const inlineStyle = (page: string) => {
  const m = /<style>([\s\S]*?)<\/style>/.exec(file(page))
  if (!m) throw new Error(`no <style> in ${page}`)
  return m[1]
}

// Same cascade order as each prototype's <head>.
const SOURCES: Record<Exclude<SiteKey, 'multimedia'>, () => string[]> = {
  logistics: () => [file('shared/genix.css'), file('shared/style-logistics.css')],
  homeupgrades: () => [file('shared/genix.css'), file('shared/style-homeupgrades.css'), inlineStyle('homeupgrades-home.html')],
  hub: () => [inlineStyle('hub-home.html')],
}

for (const [site, sources] of Object.entries(SOURCES) as [Exclude<SiteKey, 'multimedia'>, () => string[]][]) {
  const header = `/* GENERATED by web/scripts/port-css.ts from design/ — do not edit. Change the prototype, then run \`npm run port:css\`. */\n`
  const css = header + sources().map((s) => portCss(s, site)).join('\n') + '\n' + fontOverrides(site) + '\n'
  const target = path.join(OUT, site, `${site}.generated.css`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, css)
  console.log(`wrote ${path.relative(process.cwd(), target)} (${css.length} bytes)`)
}
```

Add to `web/package.json` scripts: `"port:css": "tsx scripts/port-css.ts"`. Run `npm run port:css`; expect three "wrote …" lines.

- [ ] **Step 7: Token consistency test** — `web/tests/unit/port-tokens.test.ts`. The layout sets theme variables inline on `<html>`, which beats the stylesheet, so any prototype token with the same name must have the same value.

```ts
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { PORTED_SITES } from '@/pages-home/port-css'
import { THEMES, themeVars } from '@/sites/themes'

function prototypeTokens(site: string): Map<string, string> {
  const css = fs.readFileSync(path.resolve(__dirname, `../../src/pages-home/${site}/${site}.generated.css`), 'utf8')
  const tokens = new Map<string, string>()
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type !== 'root' || rule.selector !== `html[data-site="${site}"]`) return
    rule.walkDecls(/^--/, (d) => tokens.set(d.prop, d.value.trim().toLowerCase()))
  })
  return tokens
}

describe('prototype tokens agree with the app themes', () => {
  for (const site of PORTED_SITES) {
    it(site, () => {
      const proto = prototypeTokens(site)
      const app = themeVars(THEMES[site]) as Record<string, string>
      const mismatches = Object.entries(app)
        .filter(([k, v]) => /^#[0-9a-f]{6}$/i.test(String(v)) && proto.has(k) && /^#[0-9a-f]{6}$/.test(proto.get(k)!) && proto.get(k) !== String(v).toLowerCase())
        .map(([k, v]) => `${k}: app ${v}, prototype ${proto.get(k)}`)
      expect(mismatches).toEqual([])
    })
  }
})
```

Run: `npx vitest run tests/unit/port-tokens.test.ts`. If it fails, the prototype value wins (it is the approved design): change `web/src/sites/themes.ts` to the prototype value, then run `npx vitest run tests/unit/themes.test.ts` (the contrast gate) and resolve any failure there the way the foundation did (record a ruling if a pair can't meet AA without changing the design, and stop to ask the controller). Expected end state: both files PASS.

- [ ] **Step 8: Drop preflight, import the site CSS, add the early script**

`web/src/app/(sites)/sites.css` — replace the first line `@import "tailwindcss";` with:

```css
/* No Tailwind preflight: the prototype CSS (imported by the layout) carries its own
   reset. Multimedia, still on foundation components, gets the preflight rules it uses. */
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

@layer base {
  html[data-site="multimedia"] *, html[data-site="multimedia"] ::before, html[data-site="multimedia"] ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; }
  html[data-site="multimedia"] a { color: inherit; text-decoration: inherit; }
  html[data-site="multimedia"] ol, html[data-site="multimedia"] ul { list-style: none; }
  html[data-site="multimedia"] :is(h1, h2, h3, h4, h5, h6) { font-size: inherit; font-weight: inherit; }
  html[data-site="multimedia"] :is(img, svg, video) { display: block; max-width: 100%; height: auto; }
  html[data-site="multimedia"] button { font: inherit; color: inherit; background: transparent; }
}
```

Keep the rest of `sites.css` unchanged.

`web/src/pages-home/early-script.ts`:

```ts
/* Runs in <head> before first paint (ported from each prototype's head script):
   marks JS as available and hides split headlines until SplitText has cut them.
   Never hidden for reduced motion; a timer reveals them if motion never loads. */
export const EARLY_SCRIPT = `document.documentElement.classList.add("js");if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("h1-pending");setTimeout(function(){document.documentElement.classList.remove("h1-pending")},3000)}`
```

`web/src/app/(sites)/[site]/layout.tsx`: add imports after `import '../sites.css'`:

```ts
import '@/pages-home/logistics/logistics.generated.css'
import '@/pages-home/homeupgrades/homeupgrades.generated.css'
import '@/pages-home/hub/hub.generated.css'
import { EARLY_SCRIPT } from '@/pages-home/early-script'
```

and change the `<html …>` opening to add `suppressHydrationWarning` (the early script adds classes before hydration) plus a head for the three ported sites:

```tsx
    <html lang="en" data-site={site} className={fontClassNames(theme)} style={themeVars(theme)} suppressHydrationWarning>
      {site !== 'multimedia' && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: EARLY_SCRIPT }} />
        </head>
      )}
```

- [ ] **Step 9: Copy prototype assets**

```bash
cd "$(git rev-parse --show-toplevel)"
grep -ohE "assets/[A-Za-z0-9_./-]+\.(svg|jpg|jpeg|png|webp|mp4|webm)" design/*.html design/shared/*.css design/js/*.js | sort -u | grep -v -- "-icons/" | while read f; do mkdir -p "web/public/brand/$(dirname "${f#assets/}")"; cp "design/$f" "web/public/brand/${f#assets/}"; done
ls web/public/brand
```

Expected: the logos (already present) plus the `hu-*` photos, `hu-project.mp4`, `logistics-truck.svg`, `genix-mark.svg`, `genix-wordmark.svg` and any hub media.

- [ ] **Step 10: Verify nothing regressed**

Run: `npx tsc --noEmit && npm run test:unit && npm run test:e2e`
Expected: tsc clean; unit all PASS; e2e 20 passed. (Pages look different because the prototype base styles now apply; the foundation e2e checks text and behaviour only.)

- [ ] **Step 11: Commit**

```bash
git add web/package.json web/package-lock.json web/scripts web/src/pages-home web/src/app web/tests/unit web/public/brand web/src/sites/themes.ts
git commit -m "feat(web): port prototype CSS (scoped per site), assets and head script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Motion core, gold headline helper, parity harness

**Files:**
- Create: `web/src/components/motion/gsap.ts`, `web/src/components/motion/useEnhance.ts`, `web/src/components/motion/MotionRoot.tsx`, `web/src/pages-home/gold.ts`, `web/src/pages-home/GoldHeading.tsx`, `web/tests/unit/gold.test.ts`, `web/tests/e2e/parity.ts`, `web/tests/e2e/parity.e2e.spec.ts`
- Modify: `web/playwright.config.ts`, `web/src/sites/config.ts` (add `heroGold`)

**Interfaces:**
- Consumes: Task 1's generated CSS and `EARLY_SCRIPT`.
- Produces: `gsap`, `ScrollTrigger`, `SplitText`, `prefersReducedMotion()` from `@/components/motion/gsap`; `useEnhance(setup: (signal: AbortSignal) => void | (() => void)): void`; `<MotionRoot />`; `goldTail(heading: string, phrase: string | null): [lead: string, gold: string | null]`; `<GoldHeading site={SiteKey} text={string} className? split? />`; `SiteConfig.heroGold: string | null`; parity helpers `PROTOTYPE`, `VIEWPORTS`, `hideOverlays(page)`, `settle(page)`, `expectSameLook(proto, app, selector, name, maxRatio?)`; the `PARITY` table in `parity.e2e.spec.ts`.

- [ ] **Step 1: Failing test for goldTail** — `web/tests/unit/gold.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { goldTail } from '@/pages-home/gold'

describe('goldTail', () => {
  it('splits off the gold phrase when the heading ends with it', () => {
    expect(goldTail('Reliable Freight. Real People. On Time, Every Time.', 'On Time, Every Time.')).toEqual(['Reliable Freight. Real People.', 'On Time, Every Time.'])
    expect(goldTail('From Blueprint to Beautiful.', 'to Beautiful.')).toEqual(['From Blueprint', 'to Beautiful.'])
  })
  it('leaves an edited heading plain', () => {
    expect(goldTail('Freight done right.', 'On Time, Every Time.')).toEqual(['Freight done right.', null])
    expect(goldTail('Anything', null)).toEqual(['Anything', null])
  })
})
```

Run: `npx vitest run tests/unit/gold.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 2: Implement**

`web/src/pages-home/gold.ts`:

```ts
/** The prototypes set the last phrase of each hero headline in gold. The heading text
    comes from the admin, so gold applies only while it still ends with that phrase. */
export function goldTail(heading: string, phrase: string | null): [string, string | null] {
  const text = heading.trim()
  if (!phrase || !text.endsWith(phrase) || text === phrase) return [text, null]
  return [text.slice(0, -phrase.length).trimEnd(), phrase]
}
```

`web/src/pages-home/GoldHeading.tsx`:

```tsx
import { SITES, type SiteKey } from '@/sites/config'
import { goldTail } from './gold'

/** Hero <h1>: the admin heading with the site's gold phrase, markup as in the prototypes. */
export function GoldHeading({ site, text, className, split = true }: { site: SiteKey; text: string; className?: string; split?: boolean }) {
  const [lead, gold] = goldTail(text, SITES[site].heroGold)
  return (
    <h1 className={className} data-split={split ? '' : undefined}>
      {lead}
      {gold && <>{' '}<span className="gold">{gold}</span></>}
    </h1>
  )
}
```

`web/src/sites/config.ts`: add `heroGold: string | null` to `SiteConfig` (doc comment: "Trailing phrase of the hero heading shown in gold (see pages-home/gold.ts)") and set `hub: 'We Show It.'`, `logistics: 'On Time, Every Time.'`, `homeupgrades: 'to Beautiful.'`, `multimedia: null`.

Run: `npx vitest run tests/unit/gold.test.ts tests/unit/sites.test.ts` — Expected: PASS.

- [ ] **Step 3: Motion core**

`web/src/components/motion/gsap.ts`:

```ts
'use client'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

export { gsap, ScrollTrigger, SplitText }
export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
```

`web/src/components/motion/useEnhance.ts`:

```ts
'use client'
import { useEffect } from 'react'

/** Runs a ported prototype script once after hydration. `setup` registers listeners with
    `{ signal }` and may return extra cleanup; both are undone on unmount (and between
    StrictMode's double invocation in dev). */
export function useEnhance(setup: (signal: AbortSignal) => void | (() => void)) {
  useEffect(() => {
    const ac = new AbortController()
    const cleanup = setup(ac.signal)
    return () => {
      ac.abort()
      cleanup?.()
    }
    // setup is a module-level behaviour; run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
```

`web/src/components/motion/MotionRoot.tsx` (ports `design/shared/genix.js` lines 23–69; the menu part moves to `SiteMenu` in Task 3):

```tsx
'use client'
import Lenis from 'lenis'
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText } from './gsap'
import { useEnhance } from './useEnhance'

declare global {
  interface Window { genixLenis?: Lenis }
}

/** Division-site motion from design/shared/genix.js: Lenis wheel smoothing, [data-split]
    headline lines, [data-reveal] quiet reveals. Reduced motion: nothing moves. */
export function MotionRoot() {
  useEnhance((signal) => {
    const root = document.documentElement
    if (prefersReducedMotion()) {
      root.classList.remove('h1-pending')
      return
    }
    root.classList.add('js-motion')
    const offset = -parseInt(getComputedStyle(root).getPropertyValue('--header')) || -76
    const lenis = new Lenis({ anchors: { offset } })
    window.genixLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)

    const splits: SplitText[] = []
    const ctx = gsap.context(() => {})
    document.fonts.ready.then(() => {
      if (signal.aborted) return
      ctx.add(() => {
        document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
          splits.push(
            SplitText.create(el, {
              type: 'lines',
              mask: 'lines',
              autoSplit: true,
              onSplit(self) {
                root.classList.remove('h1-pending')
                const inHero = !!el.closest('[data-hero]')
                return gsap.from(self.lines, {
                  yPercent: 110, duration: 1.05, ease: 'power4.out', stagger: 0.12,
                  delay: inHero ? 0.25 : 0,
                  scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 85%', once: true },
                })
              },
            }),
          )
        })
        root.classList.remove('h1-pending')
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.fromTo(el, { opacity: 0, y: 24 }, {
            opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          })
        })
      })
      if (document.readyState === 'complete') ScrollTrigger.refresh()
      else addEventListener('load', () => ScrollTrigger.refresh(), { once: true, signal })
    })

    return () => {
      splits.forEach((s) => s.revert())
      ctx.revert()
      gsap.ticker.remove(tick)
      lenis.destroy()
      delete window.genixLenis
      root.classList.remove('js-motion')
    }
  })
  return null
}
```

- [ ] **Step 4: Parity harness** — `web/tests/e2e/parity.ts`

```ts
import { expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

export const PROTOTYPE = 'http://localhost:4321'
export const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const

/** Hide fixed/sticky chrome so section screenshots aren't overlapped (compare the header first). */
export async function hideOverlays(page: Page) {
  await page.addStyleTag({ content: '.site-header, .quote-bar, [data-testid="quote-bar"] { visibility: hidden !important; } * { caret-color: transparent !important; }' })
}

/** Finished states (the context uses reducedMotion: 'reduce'), paused video, fonts in, lazy images loaded. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0 })
    await document.fonts.ready
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
    await Promise.all(Array.from(document.images).map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r }))))
  })
}

const OUT = path.join('test-results', 'parity')

/** At most `maxRatio` of pixels may differ (pixelmatch threshold 0.2); sizes may differ by ≤2px (height ≤1%). */
export async function expectSameLook(proto: Page, app: Page, selector: string, name: string, maxRatio = 0.02) {
  const a = PNG.sync.read(await proto.locator(selector).first().screenshot({ animations: 'disabled' }))
  const b = PNG.sync.read(await app.locator(selector).first().screenshot({ animations: 'disabled' }))
  const sizeOk = Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= Math.max(2, a.height * 0.01)
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  const crop = (p: PNG) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(p, o, 0, 0, w, h, 0, 0); return o }
  const ca = crop(a), cb = crop(b), diff = new PNG({ width: w, height: h })
  const ratio = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold: 0.2 }) / (w * h)
  if (!sizeOk || ratio > maxRatio) {
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(path.join(OUT, `${name}-prototype.png`), PNG.sync.write(a))
    fs.writeFileSync(path.join(OUT, `${name}-app.png`), PNG.sync.write(b))
    fs.writeFileSync(path.join(OUT, `${name}-diff.png`), PNG.sync.write(diff))
  }
  expect.soft(sizeOk, `${name}: size ${a.width}×${a.height} (prototype) vs ${b.width}×${b.height} (app)`).toBe(true)
  expect.soft(ratio, `${name}: ${(ratio * 100).toFixed(2)}% of pixels differ (limit ${maxRatio * 100}%), see ${OUT}/${name}-*.png`).toBeLessThanOrEqual(maxRatio)
}
```

`web/tests/e2e/parity.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { expectSameLook, hideOverlays, PROTOTYPE, settle, VIEWPORTS } from './parity'

/* Each ported site against its prototype. `chrome` (header + footer) turns on in Task 3;
   `sections` turns on in the task that ports that site's page body. */
const PARITY: { site: string; proto: string; app: string; chrome: boolean; sections: boolean }[] = [
  { site: 'logistics', proto: '/logistics-home.html', app: 'http://logistics.localhost:3000/', chrome: false, sections: false },
  { site: 'homeupgrades', proto: '/homeupgrades-home.html', app: 'http://homeupgrades.localhost:3000/', chrome: false, sections: false },
  { site: 'hub', proto: '/hub-home.html', app: 'http://localhost:3000/', chrome: false, sections: false },
]

test.describe.configure({ timeout: 180_000 })

// Harness self-check: a prototype compared with itself must pass.
test('parity harness: a page matches itself', async ({ browser }) => {
  const open = async () => {
    const page = await (await browser.newContext({ ...VIEWPORTS.desktop, reducedMotion: 'reduce' })).newPage()
    await page.goto(PROTOTYPE + '/logistics-home.html', { waitUntil: 'load' })
    await settle(page)
    return page
  }
  const [a, b] = [await open(), await open()]
  await expectSameLook(a, b, 'header.site-header', 'self-header', 0)
})

for (const p of PARITY) {
  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    test(`${p.site} ${vp}: looks like the prototype`, async ({ browser }) => {
      test.skip(!p.chrome && !p.sections, 'not ported yet')
      const open = async (url: string) => {
        const page = await (await browser.newContext({ ...opts, reducedMotion: 'reduce' })).newPage()
        await page.goto(url, { waitUntil: 'load' })
        return page
      }
      const proto = await open(PROTOTYPE + p.proto)
      const app = await open(p.app)
      await settle(proto)
      await settle(app)
      if (p.chrome) await expectSameLook(proto, app, 'header.site-header', `${p.site}-${vp}-header`)
      await hideOverlays(proto)
      await hideOverlays(app)
      if (p.sections) {
        const n = await proto.locator('main > section').count()
        expect(await app.locator('main > section').count(), 'same number of sections').toBe(n)
        for (let i = 0; i < n; i++) await expectSameLook(proto, app, `main > section >> nth=${i}`, `${p.site}-${vp}-section${i + 1}`)
      }
      if (p.chrome) await expectSameLook(proto, app, 'footer.site-footer', `${p.site}-${vp}-footer`)
    })
  }
}
```

`web/playwright.config.ts`: change `webServer` to an array, keeping the existing entry and adding the prototype server:

```ts
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:3000/admin', reuseExistingServer: true, timeout: 180_000 },
    { command: 'python -m http.server 4321 --directory ../design', url: 'http://localhost:4321/hub-home.html', reuseExistingServer: true, timeout: 30_000 },
  ],
```

- [ ] **Step 5: Run**

Run: `npx tsc --noEmit && npx vitest run tests/unit && npx playwright test tests/e2e/parity.e2e.spec.ts`
Expected: tsc clean, unit PASS; parity: the self-check passes and the six site tests are skipped ("not ported yet"). Then prove the harness catches differences: temporarily set the logistics row's `chrome: true`, rerun, and confirm the header/footer checks FAIL with images in `web/test-results/parity/` (the app still has the foundation header). Set it back to `false` before committing.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/motion web/src/pages-home/gold.ts web/src/pages-home/GoldHeading.tsx web/src/sites/config.ts web/tests web/playwright.config.ts
git commit -m "feat(web): motion core, gold headline helper, prototype parity harness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Prototype headers, footers, menu and quote bar

**Files:**
- Create: `web/src/components/site/division/DivisionHeader.tsx`, `DivisionFooter.tsx`, `DivisionQuoteBar.tsx` (client), `web/src/components/site/hub/HubHeader.tsx`, `HubFooter.tsx`, `web/src/components/motion/SiteMenu.tsx`, `web/src/components/site/SiteChrome.tsx`
- Modify: `web/src/app/(sites)/[site]/layout.tsx`, `web/src/sites/config.ts` (nav, cta), `web/tests/e2e/chrome.e2e.spec.ts`

**Interfaces:**
- Consumes: `useEnhance` (Task 2), `siteOrigin`, `SITES`, `SiteData`.
- Produces: `<SiteHeader site />`, `<SiteFooter site data />`, `<SiteQuoteBar site data />` exported from `SiteChrome.tsx` (they pick the prototype version for logistics/homeupgrades/hub and the foundation version for multimedia). Prototype markup keeps `id="siteHeader"`, `id="menuBtn"`, `id="nav"`, class `quote-bar`, `id="quoteBar"`.

- [ ] **Step 1: Config** — in `web/src/sites/config.ts` set (from the prototype headers):
  - logistics: `nav: [{Services,'/#services'},{How it works,'/#how'},{Where we go,'/#areas'}]`, `cta: { label: 'Get a quote', href: '/#quote-form' }`
  - homeupgrades: `nav: [{Services,'/#services'},{Our work,'/#work'},{How we work,'/#process'}]`, `cta: { label: 'Get a quote', href: '/#quote' }`
  - hub: `nav: [{Who we are,'/#about'},{Our businesses,'/#businesses'},{Get a quote,'/#contact'}]`, `cta: { label: 'Start a conversation', href: '/#contact' }`
  - multimedia: unchanged (`DIVISION_NAV`).

Update `web/tests/unit/sites.test.ts` if it asserts nav/cta; run `npx vitest run tests/unit/sites.test.ts` — PASS.

- [ ] **Step 2: Port the headers.** Translate the prototype header markup to JSX exactly (class → className, self-closing tags, `aria-*` unchanged), with these substitutions only:
  - `DivisionHeader` from `design/logistics-home.html` lines 96–128 (Home Upgrades lines 873–905 differ only in logo, nav and CTA, so drive them from `SITES[site]`): `href="#top"` → `href="/"`; logo `src="assets/…"` → `SITES[site].logo.src` with the prototype's `width`/`height`; nav links from `cfg.nav`; the hidden `.nav-extra` link = `cfg.cta`; `.parent-link` href → `siteOrigin('hub')`; the gold button → `cfg.cta`.
  - `HubHeader` from `design/hub-home.html` lines 1132–1169: two `<img>` (`/brand/genix-mark.svg`, `/brand/genix-wordmark.svg`) with the prototype classes and sizes; nav from `cfg.nav`; the hidden `.nav-contact` = `cfg.cta`; `.header-cta` = `cfg.cta` with the `↗` span.
  - Use plain `<img>` for these SVG logos (next/image adds wrappers that change layout); add `// eslint-disable-next-line @next/next/no-img-element` above each.

- [ ] **Step 3: Menu behaviour** — `web/src/components/motion/SiteMenu.tsx` ports `design/shared/genix.js` lines 8–21 and `design/hub-home.html` lines 1666–1680, plus Escape and focus return (spec §2):

```tsx
'use client'
import { useEnhance } from './useEnhance'

/** Mobile menu for the prototype headers: toggles header.menu-open; Escape closes and
    returns focus to the button; nav links close it. */
export function SiteMenu() {
  useEnhance((signal) => {
    const header = document.getElementById('siteHeader')
    const btn = document.getElementById('menuBtn')
    if (!header || !btn) return
    const extra = header.querySelector<HTMLElement>('.nav-extra, .nav-contact')
    const set = (open: boolean) => {
      header.classList.toggle('menu-open', open)
      btn.setAttribute('aria-expanded', String(open))
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
      if (extra) extra.hidden = !open
    }
    btn.addEventListener('click', () => set(!header.classList.contains('menu-open')), { signal })
    header.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => set(false), { signal }))
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('menu-open')) {
        set(false)
        btn.focus()
      }
    }, { signal })
    return () => set(false)
  })
  return null
}
```

Render `<SiteMenu />` inside both prototype headers.

- [ ] **Step 4: Port the footers.** `DivisionFooter` from `design/logistics-home.html` `<footer class="site-footer">` (line 633 to its `</footer>`) and `HubFooter` from `design/hub-home.html` line 1593 to its `</footer>`. Same translation rules; links to other sites use `siteOrigin(key)`; the email link uses `data.email`; where the prototype shows a phone placeholder, show `data.phone` when set, else the prototype's placeholder text verbatim. Keep `data-quote-bar-hide` on the footer element (quote bar rule). Home Upgrades' footer (line 1372) — if it differs from Logistics' in more than text/links, make `DivisionFooter` take a `site` prop and branch on the differing block only.

- [ ] **Step 5: Quote bar** — `DivisionQuoteBar.tsx` (client): the prototype markup `<div class="quote-bar" id="quoteBar" …>` exactly as in the Logistics/Home Upgrades prototypes (find it with `grep -n 'id="quoteBar"' design/*.html`), with `useEnhance` running `design/shared/quote-bar.js` lines 8–28 (listeners and the IntersectionObserver disconnected on cleanup). Keep `data-testid="quote-bar"` and set `data-off` alongside the `off` class so the existing chrome test can read it. `data-after` / `data-hide-over` values verbatim from each prototype.

- [ ] **Step 6: Wire the layout** — `SiteChrome.tsx` exports `SiteHeader`, `SiteFooter`, `SiteQuoteBar`:

```tsx
import type { SiteKey } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'
import { Header } from './Header'
import { Footer } from './Footer'
import { QuoteBar } from './QuoteBar'
import { SITES } from '@/sites/config'
import { DivisionHeader } from './division/DivisionHeader'
import { DivisionFooter } from './division/DivisionFooter'
import { DivisionQuoteBar } from './division/DivisionQuoteBar'
import { HubHeader } from './hub/HubHeader'
import { HubFooter } from './hub/HubFooter'

export function SiteHeader({ site }: { site: SiteKey }) {
  if (site === 'hub') return <HubHeader />
  if (site === 'multimedia') return <Header site={site} />
  return <DivisionHeader site={site} />
}

export function SiteFooter({ site, data }: { site: SiteKey; data: SiteData }) {
  if (site === 'hub') return <HubFooter data={data} />
  if (site === 'multimedia') return <Footer site={site} data={data} />
  return <DivisionFooter site={site} data={data} />
}

export function SiteQuoteBar({ site, data }: { site: SiteKey; data: SiteData }) {
  if (site === 'hub') return null // the hub prototype has no quote bar
  if (site === 'multimedia') return <QuoteBar href={SITES[site].cta.href} label={SITES[site].cta.label} phone={data.phone} />
  return <DivisionQuoteBar site={site} data={data} />
}
```

In `layout.tsx` replace `<Header …/>`, `<Footer …/>`, `<QuoteBar …/>` with `<SiteHeader site={site} />`, `<SiteFooter site={site} data={data} />`, `<SiteQuoteBar site={site} data={data} />` and drop the now-unused imports.

- [ ] **Step 7: Update the chrome e2e** — `web/tests/e2e/chrome.e2e.spec.ts`:
  - division header nav: `toHaveText(['Services', 'How it works', 'Where we go'])` (plus the hidden `.nav-extra`: use `.getByRole('link')` which ignores hidden elements).
  - menu test: after clicking "Open menu", expect `page.locator('#siteHeader')` toHaveClass(/menu-open/) and `page.locator('#nav').getByRole('link', { name: 'Services' })` visible; then press `Escape` → no `menu-open`, and `#menuBtn` focused (`await expect(page.locator('#menuBtn')).toBeFocused()`); click "Open menu" again and click "Close menu" → closed.
  - footer tests: keep the href assertions (sister sites via `siteOrigin`, `mailto:hello@thegenixgroup.com`), with link names as they appear in the prototype footers.
  - quote bar test: unchanged apart from nothing (it uses `data-testid` and `data-off`).
  - "hub footer lists all three divisions": adjust the name regex to the prototype hub footer's link texts.

- [ ] **Step 8: Run**

Run: `npx tsc --noEmit && npm run test:unit && npm run test:e2e`
First set `chrome: true` on all three `PARITY` rows. Expected: all PASS, including `parity.e2e.spec.ts` (header and footer on all three sites, both viewports). If a parity check fails, open `web/test-results/parity/*-diff.png`, fix the markup (not the tolerance), rerun.

- [ ] **Step 9: Commit**

```bash
git add web/src web/tests
git commit -m "feat(web): prototype headers, footers, menu and quote bar per site

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Logistics home — sections (server) and seed text

**Files:**
- Create: `web/src/pages-home/logistics/LogisticsHome.tsx`, `web/src/pages-home/logistics/sections/{Hero,Lanes,Road,Areas,Why,Faq,FinalQuote}.tsx`, `web/tests/e2e/logistics-home.e2e.spec.ts`
- Modify: `web/src/app/(sites)/[site]/page.tsx`, `web/src/seed/seed.ts`, `web/tests/e2e/parity.e2e.spec.ts` (logistics `sections: true`)

**Interfaces:**
- Consumes: `GoldHeading`, `MotionRoot`, `SiteData`, `siteJsonLd`, `JsonLd`.
- Produces: `LogisticsHome({ data }: { data: SiteData })`; the quote form markup with ids used by Task 5 (`quote-form`, `qFrom`, `qTo`, `qDate`, `qFlex`, `qLoad`, `qPallets`, `qName`, `qPhone`, `qEmail`, `qNotes`, `qNext`, `qBack`, `qSend`, `qStatus`, `qRef`, `qSent`, `qStep2Title` and the `*Err` spans) exactly as in the prototype; the road markup used by Task 6.

- [ ] **Step 1: Home page switch** — `web/src/app/(sites)/[site]/page.tsx`: keep metadata/params code; render by site:

```tsx
  if (site === 'logistics') return <LogisticsHome data={data} />
  if (site === 'homeupgrades') return <HomeUpgradesHome data={data} />
  if (site === 'hub') return <HubHome data={data} />
  // multimedia: foundation placeholder until its design exists
  return ( …existing JSX unchanged… )
```

For this task, `HomeUpgradesHome` and `HubHome` don't exist yet: add only the logistics branch now (Tasks 7 and 10 add theirs).

- [ ] **Step 2: Port the sections.** `LogisticsHome` renders `<main id="main">`, then `<JsonLd data={siteJsonLd('logistics', data)} />`, the seven sections in prototype order (`hero, services, how, areas, why, faq, quote`) and `<MotionRoot />`. Each section file is the JSX translation of its prototype `<section>` (`design/logistics-home.html`: hero 132–343, services 344–396, how 397–465, areas 466–494, why 495–532, faq 533–572, quote 573–632). Translation rules, exactly:
  1. `class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, `readonly` → `readOnly`, `maxlength` → `maxLength`, `inputmode` → `inputMode`, `autocomplete` → `autoComplete`, `novalidate` → `noValidate`, `aria-*`/`data-*` unchanged, boolean attributes as `{true}` or bare, `style="a:b"` → `style={{ a: 'b' }}`, `<!-- x -->` → `{/* x */}`, void elements self-closed.
  2. Text copied verbatim (keep entities as characters; `&nbsp;` → `{' '}`).
  3. The hero `<h1>` becomes `<GoldHeading site="logistics" text={data.heroHeading} className="h-display" />`; the hero lead paragraph uses `data.heroSubheading` when non-empty, else the prototype text.
  4. Images: photos (`.jpg`) → `next/image` `<Image src="/brand/…" width height alt sizes>` with the prototype's `alt` (and `priority` for the hero image if any); SVG art (`logistics-truck.svg`) → `<img>` with the eslint disable comment.
  5. Links: `href="#x"` stays (in-page); `hub-home.html` → `siteOrigin('hub')`; `tel:`/`mailto:` from `data.phone`/`data.email` where the prototype shows the placeholder number/email, else verbatim.
  6. Keep every `id`, `class`, `data-*`, `hidden`, `aria-*` exactly; the form keeps its native `pattern`, `required` and no `noValidate` (Task 5 sets it at runtime).

- [ ] **Step 3: Seed text** — `web/src/seed/seed.ts` logistics: `heroSubheading` = the prototype hero lead paragraph text (whitespace collapsed); add `seoDescription` = the prototype `<meta name="description">` content. Update the local record the same way (the seed never overwrites):

```bash
docker exec genix-postgres-1 psql -U postgres -d genix -c "update sites set hero_subheading='<lead text>', seo_description='<description>' where key='logistics';"
rm -rf web/.next/dev/cache/fetch-cache
```

- [ ] **Step 4: Behaviour tests (structure + no-JS)** — `web/tests/e2e/logistics-home.e2e.spec.ts`: port `t_structure` and `t_nojs` from `design/tests/test_logistics.py` one `check(...)` → one `expect(...)`, against `http://logistics.localhost:3000/` (desktop 1440×900 and phone 390×844 via `test.use`), with these substitutions: the title check expects `'Genix Logistics | Reliable Freight. Real People. On Time, Every Time.'`; `dataset.division` → `html[data-site="logistics"]`; the "icons and manifest load" check becomes "favicons respond 200" for the `<link rel="icon">` hrefs. No-JS: `test.use({ javaScriptEnabled: false })`.

- [ ] **Step 5: Turn on section parity** — set the logistics row's `sections: true` in `parity.e2e.spec.ts`.

- [ ] **Step 6: Run**

Run: `npx tsc --noEmit && npm run test:unit && npm run test:e2e`
Expected: all PASS. Parity failures → fix markup until green (never raise `maxRatio`). The foundation `sites.e2e` `h1` check still passes (GoldHeading text content equals the tagline).

- [ ] **Step 7: Commit**

```bash
git add web/src web/tests
git commit -m "feat(web): Logistics home page ported from the prototype

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Logistics quote form behaviour (look-only, production safety net)

**Files:**
- Create: `web/src/pages-home/logistics/send-mode.ts`, `web/tests/unit/send-mode.test.ts`, `web/src/components/motion/QuoteForm.tsx`
- Modify: `web/src/pages-home/logistics/sections/Hero.tsx` (render `<QuoteForm />`, add `data-send-mode` and `data-offline-message` on the form), `web/tests/e2e/logistics-home.e2e.spec.ts`

**Interfaces:**
- Produces: `quoteSendMode(vercelEnv: string | undefined): 'preview' | 'offline'`; `offlineMessage(phone: string | null): string`; `<QuoteForm />` (client, renders null, enhances `#quote-form`).

- [ ] **Step 1: Failing test** — `web/tests/unit/send-mode.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { offlineMessage, quoteSendMode } from '@/pages-home/logistics/send-mode'

describe('quote form send mode', () => {
  it('is offline only on the production deployment', () => {
    expect(quoteSendMode('production')).toBe('offline')
    expect(quoteSendMode('preview')).toBe('preview')
    expect(quoteSendMode(undefined)).toBe('preview')
  })
  it('offers the phone when there is one', () => {
    expect(offlineMessage('(619) 555-0100')).toBe("We can't take requests online yet. Call us at (619) 555-0100 or email hello@thegenixgroup.com.")
    expect(offlineMessage(null)).toBe("We can't take requests online yet. Email hello@thegenixgroup.com.")
  })
})
```

Run: `npx vitest run tests/unit/send-mode.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 2: Implement** — `web/src/pages-home/logistics/send-mode.ts`

```ts
/* The quote form is look-only until the enquiry pipeline exists (owner decision,
   2026-09-29). On the production deployment, Send must never pretend a request was received. */
export type SendMode = 'preview' | 'offline'

export function quoteSendMode(vercelEnv: string | undefined): SendMode {
  return vercelEnv === 'production' ? 'offline' : 'preview'
}

export function offlineMessage(phone: string | null): string {
  return phone
    ? `We can't take requests online yet. Call us at ${phone} or email hello@thegenixgroup.com.`
    : "We can't take requests online yet. Email hello@thegenixgroup.com."
}
```

Run the test — PASS. In `Hero.tsx`, add to the `<form id="quote-form">`: `data-send-mode={quoteSendMode(process.env.VERCEL_ENV)}` and `data-offline-message={offlineMessage(data.phone)}` (pass `data` into `Hero`).

- [ ] **Step 3: Port the behaviour** — `web/src/components/motion/QuoteForm.tsx`: a client component that returns `null` and, in `useEnhance`, runs `design/js/quote-form.js` (all 170 lines) with these changes only:
  - wrap the body so `document.getElementById('quote-form')` missing → return;
  - every `addEventListener` gets `{ signal }` (merge with existing options);
  - `window.genixLenis` is used as in the prototype (set by `MotionRoot`);
  - at the point where the prototype shows the confirmation (switches `#qRef` to "Request received" and reveals `#qSent`), first read `form.dataset.sendMode`: if `'offline'`, set `#qStatus` text to `form.dataset.offlineMessage`, keep the form as it is (nothing hidden, no "received"), move focus to `#qStatus` (give it `tabIndex=-1` in the markup if the prototype doesn't), and stop; otherwise continue with the prototype behaviour unchanged;
  - cleanup: restore the no-JS state the prototype changed at start-up (e.g. remove `noValidate`, unhide step 2) only if needed for StrictMode re-runs; verify by reloading in dev and walking the form twice.

Render `<QuoteForm />` at the end of `Hero.tsx`.

- [ ] **Step 4: Port the form tests** — in `logistics-home.e2e.spec.ts` port `t_hero`, `t_form`, `t_confirmation_scroll`, `t_tab_on_step2` and `t_start_quote_reduced` from `design/tests/test_logistics.py` (one `check` → one `expect`, same selectors, values and messages). Add:

```ts
test('offline mode: Send shows the call/email message and never "received"', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  await page.evaluate(() => { const f = document.getElementById('quote-form')!; f.dataset.sendMode = 'offline'; f.dataset.offlineMessage = "We can't take requests online yet. Email hello@thegenixgroup.com." })
  // fill step 1 and step 2 exactly as t_form's happy path does, then:
  await page.click('#qSend')
  await expect(page.locator('#qStatus')).toHaveText("We can't take requests online yet. Email hello@thegenixgroup.com.")
  await expect(page.locator('#qSent')).toBeHidden()
  await expect(page.locator('#qRef')).not.toHaveText('Request received')
})
```

(Replace the comment with the same fill steps used in the ported `t_form` happy path; extract them to a `fillValidRequest(page)` helper in the spec file and use it in both places.)

- [ ] **Step 5: Run**

Run: `npx tsc --noEmit && npm run test:unit && npx playwright test tests/e2e/logistics-home.e2e.spec.ts tests/e2e/parity.e2e.spec.ts`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src web/tests
git commit -m "feat(web): Logistics quote form behaviour (look-only; offline message in production)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Logistics road signature and lanes

**Files:**
- Create: `web/src/components/motion/RoadSection.tsx`
- Modify: `web/src/pages-home/logistics/sections/Road.tsx`, `web/tests/e2e/logistics-home.e2e.spec.ts`

- [ ] **Step 1: Port** `design/js/route.js` (26 lines) into `RoadSection.tsx` (client, returns null, `useEnhance`), creating its ScrollTrigger/tweens inside `gsap.context(() => {…}, document.getElementById('how'))` and returning `() => ctx.revert()`. Reduced motion: do nothing (the CSS finished state shows). Render it at the end of `Road.tsx`.
- [ ] **Step 2: Lane buttons** — if the "Get a price" / "Start a quote" buttons' behaviour lives in `quote-form.js`, it's already ported (Task 5); otherwise port it here with `useEnhance`.
- [ ] **Step 3: Port the remaining tests** — every remaining `t_*` function in `design/tests/test_logistics.py` (lanes, road/signature, pinned bar, no horizontal scroll at 390px), one `check` → one `expect`.
- [ ] **Step 4: Run** `npx tsc --noEmit && npm run test:e2e` — all PASS.
- [ ] **Step 5: Commit** `feat(web): Logistics road signature and lanes` (with the Co-Authored-By line).

---

### Task 7: Home Upgrades home — sections (server) and seed text

**Files:**
- Create: `web/src/pages-home/homeupgrades/HomeUpgradesHome.tsx`, `sections/{Hero,Services,Work,Build,Process,Quote}.tsx`, `web/tests/e2e/homeupgrades-home.e2e.spec.ts`
- Modify: `web/src/app/(sites)/[site]/page.tsx` (add the homeupgrades branch), `web/src/seed/seed.ts`, `parity.e2e.spec.ts` (homeupgrades `sections: true`)

- [ ] **Step 1: Port the sections** from `design/homeupgrades-home.html` (hero 909–990, services 991–1082, work 1083–1183, build 1184–1268, process 1269–1320, quote 1321–1371) with Task 4's translation rules 1–6. The hero `<h1>` → `<GoldHeading site="homeupgrades" text={data.heroHeading} className="h-display" />`. The inline `<script>` inside `#build` (lines 1188–1204) is NOT copied; Task 9 moves its decision into `Build3D`. Video (`hu-project.mp4`) keeps `poster`, `preload="none"` and the prototype's attributes. `HomeUpgradesHome` renders `<main id="main">`, JsonLd, sections, `<MotionRoot />`.
- [ ] **Step 2: Seed text** as Task 4 step 3, for `homeupgrades` (hero lead, meta description); update the local record and clear the fetch cache.
- [ ] **Step 3: Tests** — port the structure/no-JS parts of `design/tests/test_hu.py`, plus `design/tests/test_shared.py` and the Home Upgrades parts of `design/tests/test_split.py` (substitutions as Task 4 step 4).
- [ ] **Step 4:** set homeupgrades `sections: true`; run `npx tsc --noEmit && npm run test:unit && npm run test:e2e` — all PASS.
- [ ] **Step 5: Commit** `feat(web): Home Upgrades home page ported from the prototype`.

---

### Task 8: Home Upgrades interactions — before/after, project viewer, process line

**Files:**
- Create: `web/src/components/motion/{BeforeAfter,ProjectViewer,ProcessLine}.tsx`
- Modify: the owning section files; `web/tests/e2e/homeupgrades-home.e2e.spec.ts`

- [ ] **Step 1:** The last inline `<script>` of `design/homeupgrades-home.html` (starts at the line after `<script type="module">…</script>`, around line 1482) has three blocks marked by comments. Port the block from `// ---------- Before/after slider ----------` up to `// ---------- Project viewer ----------` into `BeforeAfter.tsx`; from `Project viewer` up to `// ---------- Process:` into `ProjectViewer.tsx`; from `Process: the gold line fills` to the end of the script into `ProcessLine.tsx`. Each: client, `useEnhance`, `import { Draggable } from 'gsap/Draggable'`, `import { InertiaPlugin } from 'gsap/InertiaPlugin'`, `import { Flip } from 'gsap/Flip'` and `gsap.registerPlugin(...)` in the component module where used; replace `window.gsap && window.Draggable` checks with `true` (always available) but keep the reduced-motion branches; tweens/Draggables inside `gsap.context`; `Draggable` instances `.kill()` in cleanup.
- [ ] **Step 2:** Port the interaction checks from `design/tests/test_hu.py` (slider pointer + keyboard, viewer open/close/Escape, process line).
- [ ] **Step 3:** Run `npx tsc --noEmit && npm run test:e2e` — all PASS.
- [ ] **Step 4: Commit** `feat(web): Home Upgrades before/after, project viewer, process line`.

---

### Task 9: Home Upgrades 3D build section

**Files:**
- Create: `web/src/components/motion/Build3D.tsx`, `web/src/components/motion/build3d.ts` (port of `design/js/build3d.js`)
- Modify: `web/src/pages-home/homeupgrades/sections/Build.tsx`, `web/tests/e2e/homeupgrades-home.e2e.spec.ts`

- [ ] **Step 1:** `build3d.ts` = `design/js/build3d.js` (261 lines) converted to TypeScript with `import * as THREE from 'three'` replacing the import-map import, exporting `mountBuild(section: HTMLElement): () => void` (return a cleanup that disposes renderer, geometries, materials, textures, removes the canvas and kills its ScrollTriggers). Keep all logic and numbers unchanged.
- [ ] **Step 2:** `Build3D.tsx` (client, returns null, `useEnhance`) = the decision script (homeupgrades-home.html lines 1188–1204: reduced motion off and WebGL available → add `is3d` to `#build`) followed by the loader (lines 1448–1481): arm on first scroll, `IntersectionObserver` with `rootMargin: '800px 0px'`, then `import('./build3d').then((m) => (dispose = m.mountBuild(section))).catch(fallback)`. Cleanup: disconnect the observer, call `dispose?.()`, remove `is3d`. Because the `is3d` class is added after hydration (not during parse as in the prototype), call `ScrollTrigger.refresh()` after adding it.
- [ ] **Step 3:** Port `design/tests/test_build_section.py`.
- [ ] **Step 4:** Run `npx tsc --noEmit && npm run test:e2e` — PASS. Check `npm run build` output: `three` must not be in the shared first-load JS (only in the lazily loaded chunk).
- [ ] **Step 5: Commit** `feat(web): Home Upgrades 3D build section, loaded on demand`.

---

### Task 10: Hub home — sections (server) and seed text

**Files:**
- Create: `web/src/pages-home/hub/HubHome.tsx`, `sections/*.tsx` (one per `<section>` in `design/hub-home.html` lines 1173–1592: hero, intro/about, the three division sections, route/contact), `web/tests/e2e/hub-home.e2e.spec.ts`
- Modify: `page.tsx` (hub branch), `web/src/seed/seed.ts`, `parity.e2e.spec.ts` (hub `sections: true`)

- [ ] **Step 1:** Port with Task 4's rules. The hero `<h1>` → `<GoldHeading site="hub" text={data.heroHeading} split={false} />` (the hub headline has no `data-split`; its own script masks it). Division panel links → `siteOrigin(key)`; the Logistics panel lead is the new Logistics tagline (the prototype already has it). Videos keep `poster`, `muted`, `playsInline`, `preload`, as in the prototype. `HubHome` renders `<main id="main">`, JsonLd, the sections — and no `MotionRoot` (Task 11 adds `HubMotion`).
- [ ] **Step 2:** Seed hub hero lead and meta description as Task 4 step 3; update local record; clear fetch cache.
- [ ] **Step 3:** Port the structure/no-JS checks from `design/tests/test_dock.py`, `test_reel.py` and the hub part of `test_split.py` that don't need motion.
- [ ] **Step 4:** hub `sections: true`; run `npx tsc --noEmit && npm run test:unit && npm run test:e2e` — PASS.
- [ ] **Step 5: Commit** `feat(web): Hub home page ported from the prototype`.

---

### Task 11: Hub motion — logo dock, reel, panels, videos

**Files:**
- Create: `web/src/components/motion/{HubMotion,LogoDock,HubReel,CaseVideos}.tsx`
- Modify: `HubHome.tsx`, `web/tests/e2e/hub-home.e2e.spec.ts`

- [ ] **Step 1:** Port from `design/hub-home.html`: lines 1666–1805 (after the menu part already in `SiteMenu`): case-study videos → `CaseVideos`, logo dock → `LogoDock` (plain JS in the prototype; keep it plain, no GSAP), hero reel → `HubReel`; lines 1810–1932 → `HubMotion` (its own Lenis, headline masks, load sequence, division panels inset→full bleed, quiet reveals). Same rules as earlier enhancers: `useEnhance`, `{ signal }` on listeners, `gsap.context` + revert, observers disconnected, `window.genixLenis` set by `HubMotion` (same name as `MotionRoot`). The logo's images animate whole; never reshape or recolour the mark.
- [ ] **Step 2:** Port the motion checks of `test_dock.py`, `test_reel.py`, `test_split.py` (hub).
- [ ] **Step 3:** Run `npx tsc --noEmit && npm run test:e2e` — PASS.
- [ ] **Step 4: Commit** `feat(web): Hub logo dock, reel, panels and videos`.

---

### Task 12: Services in structured data, quality sweep, docs

**Files:**
- Modify: `web/src/sites/config.ts` (`offers`), `web/src/sites/seo.ts`, `web/tests/unit/seo.test.ts`, `web/README.md`, `docs/superpowers/specs/2026-09-29-home-pages-port-design.md` (§3 note)
- Create: `web/tests/e2e/quality.e2e.spec.ts`

- [ ] **Step 1: Failing test** — append to the `siteJsonLd` describe in `web/tests/unit/seo.test.ts`:

```ts
  it('lists the division services as offers, as in the prototypes', () => {
    const ld = siteJsonLd('logistics', toSiteData('logistics', null), root)
    expect(ld.makesOffer).toEqual([
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Business freight' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Last-mile and courier delivery' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Home and office moves' } },
    ])
    expect(siteJsonLd('multimedia', toSiteData('multimedia', null), root)).not.toHaveProperty('makesOffer')
  })
```

Run `npx vitest run tests/unit/seo.test.ts` — FAIL.

- [ ] **Step 2: Implement** — `SiteConfig` gains `offers: string[]` (hub `[]`, logistics `['Business freight', 'Last-mile and courier delivery', 'Home and office moves']`, homeupgrades `['Renovation', 'Feature walls and TV units', 'Outdoor builds']`, multimedia `[]`). In `siteJsonLd`'s division return add:

```ts
    ...(cfg.offers.length ? { makesOffer: cfg.offers.map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })) } : {}),
```

Run the test — PASS.

- [ ] **Step 3: Quality e2e** — `web/tests/e2e/quality.e2e.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const HOMES = ['http://logistics.localhost:3000/', 'http://homeupgrades.localhost:3000/', 'http://localhost:3000/']

for (const url of HOMES) {
  test(`${url}: no console errors or failed requests`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
    page.on('requestfailed', (r) => problems.push(`${r.url()} ${r.failure()?.errorText}`))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } })
    expect(problems).toEqual([])
  })

  test(`${url}: no axe violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(url)
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
}
```

If axe reports a violation that the prototype also has (run the same check on `http://localhost:4321/<page>` to confirm), don't silently change the approved design: stop and report it to the controller with the rule id and nodes.

- [ ] **Step 4: Full verification**

Run: `npx tsc --noEmit && npm run test:unit && npm run test:int && npm run test:e2e && npm run build`
Expected: all green; build passes.

- [ ] **Step 5: Docs** — `web/README.md`: under Test, add "`npm run test:e2e` also serves `design/` on :4321 and compares every ported section with its prototype (`tests/e2e/parity.e2e.spec.ts`; diffs land in `test-results/parity/`). After changing a prototype's CSS run `npm run port:css`." In the port spec §3, add under the table: "`.swipe` rows are CSS-only; no `SwipeRow` component was needed (ruling, plan 2026-09-29)."

- [ ] **Step 6: Commit** `feat(web): services in structured data; quality checks; docs`.
