# Genix Logistics Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the static prototype `design/logistics-home.html`: a "navy manifest" Logistics home page whose hero is a two-step quote form styled as a shipping label, with a scroll-driven "truck on the road" signature section.

**Architecture:** Same stack as the Home Upgrades prototype: a static HTML page that loads the shared `design/shared/genix.css` + `genix.js`, a division token block (`[data-division="logistics"]`) and its own style layer `design/shared/style-logistics.css`. Behaviour lives in three small plain scripts: `shared/quote-bar.js` (extracted from Home Upgrades, shared), `js/quote-form.js` (tabs, steps, validation) and `js/route.js` (the road animation). Tests are Playwright scripts in `design/tests/`, run against the local design server.

**Tech Stack:** HTML/CSS (CSS nesting, `:where()`, `:has()`), vanilla JS, GSAP 3.13 (ScrollTrigger, SplitText) + Lenis 1.3.4 from jsDelivr, Google Fonts (Archivo variable, IBM Plex Mono), Python 3 + Playwright for tests.

**Spec:** `docs/superpowers/specs/2026-09-27-logistics-site-design.md`

## Global Constraints

- Brand spelling **Genix**; the division is "Genix Logistics"; the sibling division is "Home Upgrades" (never "Construction").
- Tagline, exact: "San Diego Freight, Handled Right." Group tagline: "We Haul It. We Build It. We Show It."
- Colours: navy `#022248`, gold `#C28A2C`, truck grey `#37404A`, paper `#F7F5EF`, muted on navy `#B9C4D3`, label brown `#7A6A4A`. Small gold text on paper uses `--gold-text` (`#8a5e10`).
- Type: Archivo 900 at `font-stretch: 118%`, uppercase, for display; Archivo 400/600 body; IBM Plex Mono 500 uppercase, `letter-spacing: 0.12em`, for labels.
- Logo: `assets/genix-logistics-logo.svg`, used whole and unmodified (the gold X in GENIX is a trademark: never mask, reshape or recolour it).
- Motion: GSAP + ScrollTrigger + SplitText + Lenis only. No new libraries. The road animation has **no pinning and adds no scroll length**. Reduced motion shows the finished state.
- No unconfirmed claims ("licensed", "insured", response times, coverage). Anything the owner must confirm is wrapped in `class="ph"` (dashed gold placeholder style).
- Phone-first: at 390×844, no horizontal page scroll; the H1 and form step 1 fit the first screen.
- Prototype only: the form makes **no network call**. Comments mark where the real build POSTs to Payload `Inquiries` (`division: logistics`) and sends a Resend email.
- The design server must be running for every test: `python -m http.server 4321 --directory design` (or `.claude/launch.json` → "design-prototypes"). Run tests from the project root.
- The project is **not a git repository yet** (the owner deferred `git init`). Each task ends with a checkpoint; run the commit commands only if `git status` works.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `design/tests/harness.py` | create | shared test helpers: `check`, `open_page`, `basics`, `test` registry, `run`, `BAR` |
| `design/tests/test_shared.py` | create | characterisation tests for the shared phone patterns (on Home Upgrades) |
| `design/tests/test_logistics.py` | create | the Logistics suite, grown task by task |
| `design/tests/test_hu.py`, `test_build_section.py`, `test_reel.py`, `test_dock.py`, `test_split.py` | copy in | existing regression suites, brought into the repo unchanged |
| `design/tests/.gitignore` | create | ignore `shots/` |
| `design/shared/genix.css` | modify | + shared `.swipe` row and `.quote-bar` styles; + `[data-division="logistics"]` tokens |
| `design/shared/quote-bar.js` | create | pinned phone quote bar, configured by data attributes |
| `design/homeupgrades-home.html` | modify | use the shared swipe/bar (delete its inline copies) |
| `design/shared/style-logistics.css` | create | Logistics style layer |
| `design/logistics-home.html` | create | the page |
| `design/js/quote-form.js` | create | quote form behaviour; exposes `window.genixQuote` |
| `design/tools/make_logistics_truck.py` | create | cuts the road truck from the logo SVG |
| `design/assets/logistics-truck.svg` | generate | truck + gold G, light body for navy |
| `design/js/route.js` | create | the road animation |
| `design/hub-home.html` | modify | Logistics panel quote button → the prototype form |

---

### Task 1: Test harness in the repo + shared phone patterns

Home Upgrades has a pinned phone quote bar and swipe cards written inline. Logistics needs both, so they move into the shared files first, guarded by characterisation tests that pass before and after the move.

**Files:**
- Create: `design/tests/harness.py`, `design/tests/test_shared.py`, `design/tests/.gitignore`
- Copy in: `test_hu.py`, `test_build_section.py`, `test_reel.py`, `test_dock.py`, `test_split.py`
- Create: `design/shared/quote-bar.js`
- Modify: `design/shared/genix.css` (append), `design/homeupgrades-home.html` (CSS in the `@media (max-width: 960px)` block, the two quote-bar media rules, the quote-bar markup, the inline quote-bar script)

**Interfaces:**
- Produces: `harness.test(name)` decorator, `harness.run(argv)`, `harness.check(name, ok, detail="")`, `harness.open_page(browser, url, **context_options) -> (context, page, errors, failed_requests)`, `harness.basics(page, label, errors, failed)`, `harness.BAR` (JS expression → `{off: bool, shown: bool}`).
- Produces: CSS class `.swipe` (use on a grid inside `.wrap`); markup contract `<div class="quote-bar" id="quoteBar" data-after="<selector>" data-hide-over="<selector list>" hidden>` + `<script src="shared/quote-bar.js">`.

- [ ] **Step 1: Copy the existing suites into the repo**

```bash
mkdir -p design/tests
S="C:/Users/Stank/AppData/Local/Temp/claude/C--Users-Stank-Desktop-Projects-Genix-group/6eff1a2b-28ba-4d38-b060-58c652ee002d/scratchpad"
cp "$S"/test_hu.py "$S"/test_build_section.py "$S"/test_reel.py "$S"/test_dock.py "$S"/test_split.py design/tests/
printf 'shots/\n__pycache__/\n' > design/tests/.gitignore
```

- [ ] **Step 2: Write the harness**

`design/tests/harness.py`:

```python
"""Shared helpers for the design prototype suites.

Start the design server first:  python -m http.server 4321 --directory design
Then, from the project root:     python design/tests/test_logistics.py [test-name ...]
"""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4321/"
OUT = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(OUT, exist_ok=True)

# Pinned phone quote bar state: off = slid away, shown = rendered at all
BAR = ("(() => { const b = document.getElementById('quoteBar');"
       " return { off: b.classList.contains('off'), shown: getComputedStyle(b).display !== 'none' }; })()")

results = []
TESTS = {}


def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))


def test(name):
    def register(fn):
        TESTS[name] = fn
        return fn
    return register


def open_page(browser, url, **ctx):
    c = browser.new_context(**ctx)
    pg = c.new_page()
    errs, failed = [], []
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("requestfailed", lambda r: r.failure != "net::ERR_ABORTED" and failed.append(f"{r.url} {r.failure}"))
    pg.on("response", lambda r: r.status >= 400 and failed.append(f"{r.status} {r.url}"))
    pg.goto(url)
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(1500)
    return c, pg, errs, failed


def basics(pg, label, errs, failed):
    check(f"[{label}] no console/page errors", not errs, "; ".join(errs[:3]))
    check(f"[{label}] no failed requests", not failed, "; ".join(failed[:3]))
    ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(f"[{label}] no horizontal overflow", ov <= 0, f"{ov}px")
    broken = pg.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map(i => i.src)")
    check(f"[{label}] images load", not broken, ", ".join(broken))
    missing = pg.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h))")
    check(f"[{label}] in-page links resolve", not missing, ", ".join(sorted(set(missing))))
    check(f"[{label}] exactly one h1", pg.locator("h1").count() == 1)
    no_alt = pg.evaluate("[...document.images].filter(i => !i.hasAttribute('alt')).length")
    check(f"[{label}] every image has alt", no_alt == 0)
    heads = pg.evaluate("[...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1])")
    skips = [f"{a}->{b}" for a, b in zip(heads, heads[1:]) if b > a + 1]
    check(f"[{label}] no skipped heading levels", not skips, " ".join(map(str, heads)))


def run(argv):
    names = argv[1:] or list(TESTS)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for n in names:
            TESTS[n](b)
        b.close()
    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if results and all(results) else 1)
```

- [ ] **Step 3: Write the characterisation tests for the shared patterns**

`design/tests/test_shared.py`:

```python
"""Shared phone patterns (pinned quote bar, sideways swipe rows), checked on Home Upgrades."""
import sys
from harness import BASE, BAR, check, open_page, run, test

HU = BASE + "homeupgrades-home.html"
PHONE = dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)


def scroll_to(pg, sel, extra=0):
    pg.evaluate(f"scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY + {extra})")
    pg.wait_for_timeout(900)
    return pg.evaluate(BAR)


@test("hu-quote-bar")
def t_hu_bar(b):
    c, pg, errs, failed = open_page(b, HU, **PHONE)
    check("[hu] bar hidden on the first screen", pg.evaluate(BAR)["off"])
    check("[hu] bar shows past the hero", not scroll_to(pg, "#services", 300)["off"])
    check("[hu] bar hides over the quote section", scroll_to(pg, "#quote")["off"])
    check("[hu] bar hides over the footer", scroll_to(pg, ".site-footer")["off"])
    c.close()
    c, pg, errs, failed = open_page(b, HU, viewport={"width": 1440, "height": 900})
    check("[hu] no bar on desktop", not pg.evaluate(BAR)["shown"])
    c.close()


@test("hu-swipe")
def t_hu_swipe(b):
    c, pg, errs, failed = open_page(b, HU, **PHONE)
    g = pg.evaluate("(() => { const g = document.querySelector('.svc-grid');"
                    " return [g.scrollWidth, g.clientWidth, getComputedStyle(g).gridAutoFlow]; })()")
    check("[hu] services swipe sideways on phones", g[0] > g[1] and g[2] == "column", str(g))
    ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("[hu] no horizontal page scroll", ov <= 0, f"{ov}px")
    c.close()


if __name__ == "__main__":
    run(sys.argv)
```

- [ ] **Step 4: Run it to record the baseline (the patterns exist inline today)**

Run: `python design/tests/test_shared.py`
Expected: `7/7 passed`. These are characterisation tests: they must pass **before** the move. If any fails, stop and fix the test first.

- [ ] **Step 5: Add the shared styles**

Append to `design/shared/genix.css`:

```css

/* ---------- Phones: sideways swipe rows ----------
   Put .swipe on a grid inside .wrap. On phones its children become a
   horizontal snap row with the next card peeking in. `.wrap .swipe`
   outranks a page's own single-class grid rule. */
@media (max-width: 960px) {
  .wrap .swipe {
    grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: min(82%, 360px);
    overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none;
    margin-inline: calc(-1 * var(--gutter)); padding: 4px var(--gutter) 8px; scroll-padding-inline: var(--gutter);
  }
  .wrap .swipe::-webkit-scrollbar { display: none; }
  .wrap .swipe > * { scroll-snap-align: start; }
}

/* ---------- Phones: pinned "Get a quote" bar (shared/quote-bar.js) ---------- */
.quote-bar { display: none; } /* wider screens: the header's own button covers it */
@media (max-width: 960px) {
  .quote-bar:not([hidden]) {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; gap: 10px;
    padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom));
    background: var(--paper); border-top: 1px solid var(--line); box-shadow: 0 -8px 24px rgba(2, 34, 72, 0.08);
    transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .quote-bar .btn-gold { flex: 1; justify-content: center; }
  .quote-bar.off { transform: translateY(110%); }
}
@media (prefers-reduced-motion: reduce) { .quote-bar { transition: none; } }
```

- [ ] **Step 6: Add the shared script**

`design/shared/quote-bar.js`:

```js
/* Pinned "Get a quote" bar for phones (the bar's CSS lives in genix.css).
   Markup:
     <div class="quote-bar" id="quoteBar" data-after="SELECTOR" data-hide-over="SELECTORS" hidden>…</div>
   The bar slides in once [data-after] has scrolled above the viewport, and
   stays away while any [data-hide-over] element is on screen (things that
   already offer the action, or need the bottom of the screen). */
(() => {
  const bar = document.getElementById("quoteBar");
  if (!bar) return;
  const wide = matchMedia("(min-width: 961px)");
  const after = bar.dataset.after ? document.querySelector(bar.dataset.after) : null;
  const watch = [after, ...(bar.dataset.hideOver ? document.querySelectorAll(bar.dataset.hideOver) : [])].filter(Boolean);
  const seen = new Map();
  bar.hidden = false;
  bar.classList.add("off");
  bar.inert = true;
  const update = () => {
    const passed = after ? after.getBoundingClientRect().bottom < 0 : true;
    const off = wide.matches || !passed || watch.some((el) => seen.get(el));
    bar.classList.toggle("off", off);
    bar.inert = off; // off-screen links stay out of the tab order
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting));
    update();
  });
  watch.forEach((el) => io.observe(el));
  wide.addEventListener("change", update);
})();
```

- [ ] **Step 7: Switch Home Upgrades to the shared pieces**

In `design/homeupgrades-home.html`:

1. Inside `@media (max-width: 960px) { … }` delete these rules (the shared file now has them): the comment `/* services: swipe sideways … */`, the whole `.svc-grid { grid-template-columns: none; … }` rule, `.svc-grid::-webkit-scrollbar { display: none; }`, `.svc { scroll-snap-align: start; }`, `.quote-bar:not([hidden]) { … }`, `.quote-bar .btn-gold { … }` and `.quote-bar.off { … }`.
2. Delete these two lines:
   ```css
   @media (min-width: 961px) { .quote-bar { display: none; } } /* the header's own button covers wider screens */
   @media (prefers-reduced-motion: reduce) { .quote-bar { transition: none; } }
   ```
3. Change `<div class="svc-grid">` to `<div class="svc-grid swipe">`.
4. Change `<div class="quote-bar" id="quoteBar" hidden>` to
   ```html
   <div class="quote-bar" id="quoteBar" data-after=".hero-actions" data-hide-over="#build, #quote, .site-footer" hidden>
   ```
5. Delete the whole inline `<script>` that begins with the comment `// Pinned "Get a quote" bar (phones).` and put this line in its place:
   ```html
   <script src="shared/quote-bar.js"></script>
   ```

- [ ] **Step 8: Run the shared tests and the full Home Upgrades regression**

Run: `python design/tests/test_shared.py` → Expected: `7/7 passed`
Run: `python design/tests/test_hu.py` → Expected: `59/59 passed`
Run: `python design/tests/test_build_section.py` → Expected: `17/17 passed`
(Earlier sessions saw rare timing flakes in the Flip/video checks under software rendering. If one fails, rerun once before investigating.)

- [ ] **Step 9: Checkpoint**

```bash
git add design/tests design/shared/genix.css design/shared/quote-bar.js design/homeupgrades-home.html
git commit -m "refactor: share phone quote bar and swipe rows; move test suites into design/tests"
```

---

### Task 2: The Logistics page: tokens, markup, base style layer

**Files:**
- Modify: `design/shared/genix.css` (add the token block after the `[data-division="homeupgrades"]` block)
- Create: `design/shared/style-logistics.css`, `design/logistics-home.html`
- Create: `design/tests/test_logistics.py`

**Interfaces:**
- Consumes: `harness.*` from Task 1; `.swipe` from Task 1.
- Produces (element IDs and hooks the later tasks use): sections `#hero #services #how #areas #why #faq #quote` (in that order, direct children of `main#top`); form `#quote-form` with `#qRef`, `.kind` radios `name="kind"` (`business`|`move`), step fieldsets `[data-step="1"]` / `[data-step="2"]`, headings `#qStep1Title` / `#qStep2Title`, fields `#qFrom #qTo #qDate #qFlex #qLoad #qPalletsField #qPallets #qName #qPhone #qEmail #qNotes #qHp`, error slots `#<fieldId>Err`, `#qArea`, buttons `#qNext #qBack #qSend`, `#qSent`, `#qStatus`; lane links `a[data-kind]`; start links `[data-start-quote]`; road `[data-road]` with `ol.stops > li.stop[data-stop]` ×4; class `.js-only`; `html.js` set in the head.

- [ ] **Step 1: Write the failing structure test**

`design/tests/test_logistics.py`:

```python
"""Test suite for design/logistics-home.html (spec: docs/superpowers/specs/2026-09-27-logistics-site-design.md)."""
import sys
from harness import BASE, BAR, basics, check, open_page, run, test

URL = BASE + "logistics-home.html"
DESKTOP = dict(viewport={"width": 1440, "height": 900})
PHONE = dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)


@test("structure")
def t_structure(b):
    for label, ctx in (("desktop", DESKTOP), ("phone", PHONE)):
        c, pg, errs, failed = open_page(b, URL, **ctx)
        basics(pg, label, errs, failed)
        if label == "phone":
            g = pg.evaluate("(() => { const g = document.querySelector('.lane-grid'); return [g.scrollWidth, g.clientWidth]; })()")
            check("[phone] service lanes swipe sideways", g[0] > g[1], str(g))
        else:
            check("title", pg.title() == "Genix Logistics — San Diego Freight, Handled Right.", pg.title())
            check("division theme", pg.evaluate("document.documentElement.dataset.division") == "logistics")
            ids = pg.evaluate("[...document.querySelectorAll('main > section')].map(s => s.id)")
            check("section order", ids == ["hero", "services", "how", "areas", "why", "faq", "quote"], str(ids))
            font = pg.evaluate("""(async () => { await document.fonts.ready;
                const h = getComputedStyle(document.querySelector('h1'));
                return [h.fontFamily, h.fontWeight, h.textTransform, document.fonts.check('900 40px Archivo')]; })()""")
            check("display type is Archivo 900 uppercase", "Archivo" in font[0] and font[1] == "900" and font[2] == "uppercase" and font[3], str(font))
            icons = pg.evaluate("[...document.querySelectorAll('link[rel~=icon], link[rel=apple-touch-icon], link[rel=manifest]')].map(l => l.href)")
            bad = [h for h in icons if pg.request.get(h).status != 200]
            check("icons and manifest load", len(icons) == 4 and not bad, str(bad or icons))
            check("hero is brand navy", pg.evaluate("getComputedStyle(document.getElementById('hero')).backgroundColor") == "rgb(2, 34, 72)")
            lane = pg.evaluate("getComputedStyle(document.getElementById('areas'), '::before').backgroundImage")
            check("gold lane marking divides sections", "repeating-linear-gradient" in lane, lane[:60])
            text = pg.evaluate("document.body.innerText.toLowerCase()").replace("are loads insured", "")
            check("no unconfirmed insurance/licensing claim", "insured" not in text and "licensed" not in text)
        c.close()


if __name__ == "__main__":
    run(sys.argv)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python design/tests/test_logistics.py structure`
Expected: FAIL (404: `logistics-home.html` does not exist), many checks failing.

- [ ] **Step 3: Add the division tokens**

In `design/shared/genix.css`, directly after the closing `}` of the `[data-division="homeupgrades"]` block:

```css
[data-division="logistics"] {
  --brand: #022248;               /* the navy in the Logistics logo */
  --brand-deep: #01152e;
  --heading: #022248;
  --brand-line: rgba(255, 255, 255, 0.14);
  --on-brand-muted: #b9c4d3;
  --paper: #f7f5ef;               /* shipping-label paper */
  --f-display: "Archivo", system-ui, sans-serif;
  --f-body: "Archivo", system-ui, sans-serif;
}
```

- [ ] **Step 4: Create the base style layer**

`design/shared/style-logistics.css`:

```css
/* Genix Logistics style layer: "navy manifest".
   The language of a shipping label: dashed label cards, mono field labels,
   gold lane markings. Overrides of shared classes are scoped with
   [data-division="logistics"]; Logistics-only components sit inside
   :where([data-division="logistics"]) so the scope adds no specificity and
   shared utilities (e.g. .wrap .swipe on phones) still win. */

/* ---------- Overrides of shared classes ---------- */
[data-division="logistics"] { --truck: #37404a; --label-ink: #7a6a4a; --err: #b3261e; --r: 6px; }
[data-division="logistics"] body { font-size: 17px; }
[data-division="logistics"] .h-display,
[data-division="logistics"] .h-section { font-weight: 900; font-stretch: 118%; text-transform: uppercase; letter-spacing: -0.01em; line-height: 0.95; }
[data-division="logistics"] .h-display { font-size: clamp(36px, 5.4vw, 76px); }
[data-division="logistics"] .h-section { font-size: clamp(30px, 4.2vw, 58px); }
[data-division="logistics"] .gold { color: var(--gold-text); }
[data-division="logistics"] .on-dark .gold { color: var(--gold); }
[data-division="logistics"] .btn { border-radius: var(--r); font-weight: 800; font-stretch: 112%; text-transform: uppercase; letter-spacing: 0.04em; font-size: 15px; }
[data-division="logistics"] .brand img { height: 50px; mix-blend-mode: normal; }
[data-division="logistics"] .footer-logo { border-radius: var(--r); }
[data-division="logistics"] .part-of img { border-radius: 4px; }
[data-division="logistics"] .on-dark { background: var(--brand); color: var(--white); }
[data-division="logistics"] .on-dark .body { color: var(--on-brand-muted); }
[data-division="logistics"] [hidden] { display: none !important; }
html:not(.js) .js-only { display: none !important; }

/* ---------- Logistics components ---------- */
:where([data-division="logistics"]) {
  .mono { font: 500 11.5px/1.35 var(--f-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .sec { padding: clamp(72px, 10vw, 128px) 0; }
  .sec-head { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px 48px; align-items: end; margin-bottom: clamp(32px, 5vw, 56px); }
  .sec-head .body { margin: 0; max-width: 46ch; }

  /* gold lane marking along the top of a section */
  .lane-top { position: relative; }
  .lane-top::before {
    content: ""; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: min(var(--max) - 2 * var(--gutter), 100% - 2 * var(--gutter)); height: 4px;
    background: repeating-linear-gradient(to right, var(--gold) 0 28px, transparent 28px 48px);
  }

  /* two lanes of services */
  .lane-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .lane-card {
    display: flex; flex-direction: column; gap: 14px; padding: clamp(24px, 3vw, 36px);
    background: var(--white); border: 1px solid rgba(2, 34, 72, 0.14); border-top: 6px solid var(--heading); border-radius: var(--r);
  }
  .lane-card:nth-child(2) { border-top-color: var(--gold); }
  .lane-card h3 { margin: 0; font: 900 clamp(24px, 2.6vw, 34px)/1 var(--f-display); font-stretch: 118%; text-transform: uppercase; color: var(--heading); }
  .lane-card p { margin: 0; color: var(--ink-2); }
  .lane-tag { color: var(--label-ink); }
  .ticks { list-style: none; margin: 4px 0 8px; padding: 0; display: grid; gap: 8px; }
  .ticks li { display: flex; align-items: center; gap: 10px; font-weight: 600; color: var(--heading); }
  .ticks li::before { content: ""; flex: none; width: 14px; height: 4px; background: var(--gold); }
  .lane-card .btn { margin-top: auto; align-self: flex-start; }

  /* how a job runs: readable list; the road visuals arrive in Task 5 */
  .stops { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
  .stop { position: relative; }
  .stop .mono { margin: 0 0 8px; color: var(--gold); }
  .stop h3 { margin: 0 0 8px; font: 900 22px/1.05 var(--f-display); font-stretch: 118%; text-transform: uppercase; color: var(--white); }
  .stop p:not(.mono) { margin: 0; font-size: 16px; color: var(--on-brand-muted); }

  /* where we go */
  .areas .wrap { display: grid; grid-template-columns: 1fr 1.2fr; gap: 40px; align-items: start; }
  .area-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 24px; border-top: 2px solid var(--heading); }
  .area-list li { display: flex; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid rgba(2, 34, 72, 0.18); font-weight: 600; color: var(--heading); }
  .area-list li span { align-self: center; font: 500 12px/1 var(--f-mono); color: var(--label-ink); }

  /* why genix + proof slots */
  .why { background: var(--white); }
  .promises { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .promises li { padding-top: 18px; border-top: 4px solid var(--gold); }
  .promises h3 { margin: 0 0 8px; font: 900 22px/1.05 var(--f-display); font-stretch: 118%; text-transform: uppercase; color: var(--heading); }
  .promises p { margin: 0; color: var(--ink-2); }
  .proof { margin-top: 48px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .proof > div { display: grid; gap: 8px; padding: 22px; border-radius: var(--r); }
  .proof b { font: 900 40px/1 var(--f-display); font-stretch: 118%; color: var(--heading); }
  .proof span { font: 500 12px/1.3 var(--f-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--label-ink); }

  /* faq */
  .faq-list { max-width: 860px; border-top: 2px solid var(--heading); }
  .faq-list details { border-bottom: 1px solid rgba(2, 34, 72, 0.18); }
  .faq-list summary {
    display: flex; justify-content: space-between; align-items: center; gap: 16px; min-height: 44px; padding: 18px 0;
    list-style: none; cursor: pointer; font: 700 19px/1.3 var(--f-body); color: var(--heading);
  }
  .faq-list summary::-webkit-details-marker { display: none; }
  .faq-list summary::after { content: "+"; font: 500 24px/1 var(--f-mono); color: var(--gold-text); }
  .faq-list details[open] summary::after { content: "−"; }
  .faq-list details p { margin: 0 0 20px; max-width: 64ch; color: var(--ink-2); }

  /* final quote */
  .final .wrap { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; align-items: center; }

  @media (max-width: 960px) {
    .sec-head, .areas .wrap, .final .wrap { grid-template-columns: 1fr; }
    .promises, .proof { grid-template-columns: 1fr; }
  }
  @media (max-width: 760px) {
    .stops { grid-template-columns: 1fr; gap: 32px; }
  }
  @media (max-width: 560px) {
    .area-list { grid-template-columns: 1fr; }
  }
}
```

- [ ] **Step 5: Create the page**

`design/logistics-home.html`:

```html
<!doctype html>
<html lang="en" data-division="logistics">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Genix Logistics — San Diego Freight, Handled Right.</title>
    <meta
      name="description"
      content="Business freight, last-mile courier runs and home or office moves around San Diego County. Get a price in two short steps. Part of The Genix Group."
    />
    <link rel="canonical" href="https://logistics.thegenixgroup.com/" />
    <link rel="icon" href="assets/logistics-icons/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/svg+xml" href="assets/logistics-icons/favicon.svg" />
    <link rel="apple-touch-icon" sizes="180x180" href="assets/logistics-icons/apple-touch-icon.png" />
    <link rel="manifest" href="assets/logistics-icons/site.webmanifest" />
    <meta name="theme-color" content="#022248" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Genix Logistics" />
    <meta property="og:url" content="https://logistics.thegenixgroup.com/" />
    <meta property="og:title" content="Genix Logistics — San Diego Freight, Handled Right." />
    <meta property="og:description" content="Business freight, courier runs and moves around San Diego County. Part of The Genix Group." />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "MovingCompany",
        "name": "Genix Logistics",
        "url": "https://logistics.thegenixgroup.com/",
        "email": "hello@thegenixgroup.com",
        "areaServed": "San Diego County, CA",
        "parentOrganization": { "@type": "Organization", "name": "The Genix Group", "url": "https://thegenixgroup.com/" },
        "makesOffer": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Business freight" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Last-mile and courier delivery" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Home and office moves" } }
        ]
      }
    </script>
    <script>
      // Mark JS as available (buttons that only work with JS are hidden without it).
      // Hide split headlines until SplitText has cut them; never for reduced
      // motion, and a timer reveals them if scripts fail.
      document.documentElement.classList.add("js");
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("h1-pending");
        setTimeout(() => document.documentElement.classList.remove("h1-pending"), 3000);
      }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@500&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="shared/genix.css" />
    <link rel="stylesheet" href="shared/style-logistics.css" />
  </head>
  <body>
    <header class="site-header" id="siteHeader">
      <div class="wrap">
        <a class="brand" href="#top" aria-label="Genix Logistics home">
          <img src="assets/genix-logistics-logo.svg" alt="" width="876" height="405" />
        </a>
        <nav class="nav" id="nav" aria-label="Primary">
          <a href="#services">Services</a>
          <a href="#how">How it works</a>
          <a href="#areas">Where we go</a>
          <a href="#quote-form" class="nav-extra" hidden>Get a quote</a>
        </nav>
        <div class="header-end">
          <a class="parent-link" href="hub-home.html">Part of The Genix Group ↗</a>
          <a class="btn btn-gold btn-sm" href="#quote-form">Get a quote</a>
        </div>
        <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="nav" aria-label="Open menu"><span></span></button>
      </div>
    </header>

    <main id="top">
      <!-- Hero: the quote starter -->
      <section class="hero on-dark" id="hero" data-hero>
        <div class="wrap">
          <div class="hero-copy">
            <p class="mono hero-eyebrow">San Diego County · Freight · Moves</p>
            <h1 class="h-display" data-split>San Diego Freight, <span class="gold">Handled Right.</span></h1>
            <p class="lead">Business deliveries and home moves, priced before we lift anything, with a real person to call when plans change.</p>
          </div>

          <!-- Prototype: no network call. Real build: POST to Payload Inquiries (division: logistics) + Resend email. -->
          <form class="label-card quote-form" id="quote-form" action="#" method="post" novalidate aria-labelledby="formTitle">
            <p class="label-ref mono"><span id="qRef">Quote request · New</span><span class="barcode" aria-hidden="true"></span></p>
            <h2 class="sr-only" id="formTitle">Get a price</h2>
            <fieldset class="kind">
              <legend class="sr-only">What do you need moved?</legend>
              <label><input type="radio" name="kind" value="business" checked /> Ship for your business</label>
              <label><input type="radio" name="kind" value="move" /> Plan a move</label>
            </fieldset>

            <fieldset class="fields" data-step="1" aria-labelledby="qStep1Title">
              <h3 class="step-title" id="qStep1Title" tabindex="-1">1 · The route</h3>
              <div class="field">
                <label class="mono" for="qFrom">Pickup ZIP</label>
                <input id="qFrom" name="from" inputmode="numeric" autocomplete="postal-code" maxlength="5" required aria-describedby="qFromErr" />
                <p class="err" id="qFromErr"></p>
              </div>
              <div class="field">
                <label class="mono" for="qTo">Drop-off ZIP</label>
                <input id="qTo" name="to" inputmode="numeric" maxlength="5" required aria-describedby="qToErr" />
                <p class="err" id="qToErr"></p>
              </div>
              <p class="area-note" id="qArea" hidden>Outside our usual area, we'll still take a look.</p>
              <div class="field">
                <label class="mono" for="qDate">Date</label>
                <input id="qDate" name="date" type="date" aria-describedby="qDateErr" />
                <label class="flex-date"><input type="checkbox" id="qFlex" name="flexible" /> Flexible</label>
                <p class="err" id="qDateErr"></p>
              </div>
              <div class="field">
                <label class="mono" for="qLoad">What's moving</label>
                <select id="qLoad" name="load" required aria-describedby="qLoadErr">
                  <option value="">Choose…</option>
                  <optgroup label="Business" data-kind="business">
                    <option value="pallets">Pallets</option>
                    <option value="parcels">Parcels or boxes</option>
                    <option value="truckload">Full truckload</option>
                    <option value="courier">Same-day courier</option>
                  </optgroup>
                  <optgroup label="Move" data-kind="move">
                    <option value="studio">Studio</option>
                    <option value="1-2bed">1–2 bedroom home</option>
                    <option value="3bed">3+ bedroom home</option>
                    <option value="office">Office</option>
                  </optgroup>
                </select>
                <p class="err" id="qLoadErr"></p>
              </div>
              <div class="field full" id="qPalletsField" hidden>
                <label class="mono" for="qPallets">How many pallets</label>
                <input id="qPallets" name="pallets" type="number" min="1" max="26" inputmode="numeric" aria-describedby="qPalletsErr" />
                <p class="err" id="qPalletsErr"></p>
              </div>
              <div class="form-actions js-only">
                <button type="button" class="btn btn-gold" id="qNext">Continue <span aria-hidden="true">→</span></button>
              </div>
            </fieldset>

            <fieldset class="fields" data-step="2" aria-labelledby="qStep2Title">
              <h3 class="step-title" id="qStep2Title" tabindex="-1">2 · Your details</h3>
              <div class="field full">
                <label class="mono" for="qName">Name</label>
                <input id="qName" name="name" autocomplete="name" required aria-describedby="qNameErr" />
                <p class="err" id="qNameErr"></p>
              </div>
              <div class="field">
                <label class="mono" for="qPhone">Phone</label>
                <input id="qPhone" name="phone" type="tel" autocomplete="tel" aria-describedby="qPhoneErr qContactHint" />
                <p class="err" id="qPhoneErr"></p>
              </div>
              <div class="field">
                <label class="mono" for="qEmail">Email</label>
                <input id="qEmail" name="email" type="email" autocomplete="email" aria-describedby="qEmailErr qContactHint" />
                <p class="err" id="qEmailErr"></p>
              </div>
              <p class="hint" id="qContactHint">Phone or email, whichever you prefer.</p>
              <div class="field full">
                <label class="mono" for="qNotes">Notes (optional)</label>
                <textarea id="qNotes" name="notes" rows="3"></textarea>
              </div>
              <div class="hp" aria-hidden="true">
                <label for="qHp">Leave this empty</label>
                <input id="qHp" name="company_site" tabindex="-1" autocomplete="off" />
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-ghost js-only" id="qBack">← Back</button>
                <button type="submit" class="btn btn-gold" id="qSend">Send request <span aria-hidden="true">→</span></button>
              </div>
            </fieldset>

            <div class="sent" id="qSent" tabindex="-1" hidden>
              <p class="sent-title">Request received.</p>
              <p>We'll call you back <span class="ph">within one business day</span> with a price.</p>
            </div>
            <p class="sr-only" id="qStatus" aria-live="assertive"></p>
          </form>
        </div>
      </section>

      <!-- Two lanes of services -->
      <section class="sec lanes" id="services" aria-labelledby="servicesTitle">
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="label" data-reveal>What we move</p>
              <h2 class="h-section" id="servicesTitle" data-split>Two ways <span class="gold">we help.</span></h2>
            </div>
            <p class="body" data-reveal>For businesses that ship every week, and for people moving once. Either way it starts with the same short form.</p>
          </div>
          <div class="lane-grid swipe">
            <article class="lane-card" data-reveal>
              <p class="mono lane-tag">For businesses</p>
              <h3>Freight &amp; deliveries</h3>
              <p>Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs around San Diego.</p>
              <ul class="ticks"><li>Pallets &amp; part loads</li><li>Full truckloads</li><li>Last-mile &amp; courier</li></ul>
              <a class="btn btn-dark" href="#quote-form" data-kind="business">Get a business price <span aria-hidden="true">→</span></a>
            </article>
            <article class="lane-card" data-reveal>
              <p class="mono lane-tag">For moves</p>
              <h3>Home &amp; office moves</h3>
              <p>Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted.</p>
              <ul class="ticks"><li>Studio to 3+ bedrooms</li><li>Office moves</li><li>Local San Diego moves</li></ul>
              <a class="btn btn-dark" href="#quote-form" data-kind="move">Get a moving price <span aria-hidden="true">→</span></a>
            </article>
          </div>
        </div>
      </section>

      <!-- How a job runs (the road signature is added in Task 5) -->
      <section class="sec route on-dark" id="how" aria-labelledby="howTitle">
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="label">How a job runs</p>
              <h2 class="h-section" id="howTitle" data-split>Quote to <span class="gold">delivered.</span></h2>
            </div>
            <p class="body">Four stops, the same for a pallet or a three-bedroom move.</p>
          </div>
          <div class="road" data-road>
            <ol class="stops">
              <li class="stop" data-stop>
                <p class="mono">01 · Quote</p>
                <h3>We price it</h3>
                <p>You send the route; we reply with a price <span class="ph">within one business day</span>.</p>
              </li>
              <li class="stop" data-stop>
                <p class="mono">02 · Scheduled</p>
                <h3>Date confirmed</h3>
                <p>Pickup date and window agreed, <span class="ph">with a reminder the day before</span>.</p>
              </li>
              <li class="stop" data-stop>
                <p class="mono">03 · Picked up</p>
                <h3>On the road</h3>
                <p>Loaded and secured. <span class="ph">We text when the driver is on the way.</span></p>
              </li>
              <li class="stop" data-stop>
                <p class="mono">04 · Delivered</p>
                <h3>Signed for</h3>
                <p>Dropped off and signed for<span class="ph">, with photo proof on request</span>.</p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <!-- Where we go -->
      <section class="sec areas lane-top" id="areas" aria-labelledby="areasTitle">
        <div class="wrap">
          <div>
            <p class="label">Where we go</p>
            <h2 class="h-section" id="areasTitle" data-split>Around <span class="gold">San Diego County.</span></h2>
            <p class="body">Outside these areas? <a href="#quote-form" data-start-quote>Ask us</a>. We'll still take a look.</p>
          </div>
          <ul class="area-list ph" data-reveal>
            <li>Downtown &amp; central San Diego <span>921xx</span></li>
            <li>North County coastal <span>920xx</span></li>
            <li>North County inland <span>920xx</span></li>
            <li>East County <span>920xx</span></li>
            <li>South Bay <span>919xx</span></li>
            <li>Beach communities <span>921xx</span></li>
          </ul>
        </div>
      </section>

      <!-- Why Genix + proof slots (numbers and photos arrive later) -->
      <section class="sec why" id="why" aria-labelledby="whyTitle">
        <div class="wrap">
          <div class="sec-head">
            <div>
              <p class="label">Why Genix</p>
              <h2 class="h-section" id="whyTitle" data-split>Freight without <span class="gold">the guesswork.</span></h2>
            </div>
            <p class="body">What you can count on, from the first call to the signature.</p>
          </div>
          <ul class="promises">
            <li data-reveal><h3>A real person to call</h3><p>Call or text the team handling your load when plans change.</p></li>
            <li data-reveal><h3>Clear timelines</h3><p>A confirmed date and pickup window before anything moves.</p></li>
            <li data-reveal><h3>Price first</h3><p>You see the price before we schedule anything.</p></li>
          </ul>
          <div class="proof">
            <div class="ph"><b>—</b><span>Deliveries completed</span></div>
            <div class="ph"><b>—</b><span>Years on the road</span></div>
            <div class="ph"><b>—</b><span>Recent jobs: photos go here</span></div>
          </div>
        </div>
      </section>

      <!-- FAQ (answers are placeholders until the owner confirms them) -->
      <section class="sec faq lane-top" id="faq" aria-labelledby="faqTitle">
        <div class="wrap">
          <p class="label">Questions</p>
          <h2 class="h-section" id="faqTitle" data-split>Before <span class="gold">you ask.</span></h2>
          <div class="faq-list">
            <details><summary>How soon can you pick up?</summary><p class="ph">Same-day courier runs when a truck is free; most freight and moves are booked a few days ahead.</p></details>
            <details><summary>Which areas do you cover?</summary><p class="ph">San Diego County, and further on request. See the list above.</p></details>
            <details><summary>What won't you move?</summary><p class="ph">Hazardous materials, firearms, live animals and anything illegal to transport.</p></details>
            <details><summary>Are loads insured?</summary><p class="ph">To confirm before launch: what cover applies and up to what value.</p></details>
          </div>
        </div>
      </section>

      <!-- Final quote: a label card that points back to the hero form -->
      <section class="sec final lane-top" id="quote" aria-labelledby="quoteTitle">
        <div class="wrap">
          <div>
            <p class="label">Get a quote</p>
            <h2 class="h-section" id="quoteTitle" data-split>Ready when <span class="gold">you are.</span></h2>
            <p class="body">Tell us where it's going and what's moving. We'll come back with a price.</p>
          </div>
          <div class="label-card">
            <p class="label-ref mono"><span>Quote request · New</span><span class="barcode" aria-hidden="true"></span></p>
            <p class="final-line">Two short steps. No account needed.</p>
            <div class="final-actions">
              <a class="btn btn-gold" href="#quote-form" data-start-quote>Start a quote <span aria-hidden="true">→</span></a>
              <a class="btn btn-ghost" href="tel:+10000000000"><span class="ph">Call (000) 000-0000</span></a>
            </div>
            <p class="mono final-mail">Or email <a href="mailto:hello@thegenixgroup.com">hello@thegenixgroup.com</a></p>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <div class="brand-col">
          <a class="footer-logo" href="#top" aria-label="Genix Logistics home"><img src="assets/genix-logistics-logo.svg" alt="" width="876" height="405" /></a>
          <a class="part-of" href="hub-home.html"><img src="assets/genix-mark.svg" alt="" width="360" height="421" /><span>Part of <b>The Genix Group</b></span></a>
        </div>
        <div>
          <h2>Services</h2>
          <ul><li><a href="#services">Business freight</a></li><li><a href="#services">Last-mile &amp; courier</a></li><li><a href="#services">Home &amp; office moves</a></li></ul>
        </div>
        <div>
          <h2>Company</h2>
          <ul><li><a href="#how">How it works</a></li><li><a href="#areas">Where we go</a></li><li><a href="#faq">Questions</a></li></ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul>
            <li><a href="mailto:hello@thegenixgroup.com">hello@thegenixgroup.com</a></li>
            <li><span class="ph">(000) 000-0000</span></li>
            <li><a href="#quote-form">Get a quote</a></li>
          </ul>
        </div>
        <div class="legal">
          <span>© 2026 Genix Logistics, part of The Genix Group</span>
          <span>
            <a href="homeupgrades-home.html"><span class="dot" style="background: var(--gold)"></span>Home Upgrades</a> &nbsp;
            <a href="https://multimedia.thegenixgroup.com"><span class="dot" style="background: var(--tell)"></span>Multimedia</a>
          </span>
        </div>
      </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js"></script>
    <script src="shared/genix.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Run the structure test**

Run: `python design/tests/test_logistics.py structure`
Expected: all checks PASS. The form is unstyled at this stage (Task 3 styles it); that is fine.

- [ ] **Step 7: Checkpoint**

```bash
git add design/shared/genix.css design/shared/style-logistics.css design/logistics-home.html design/tests/test_logistics.py
git commit -m "feat(logistics): page structure, tokens and base style layer"
```

---

### Task 3: Hero layout and the shipping-label form (no JS behaviour yet)

**Files:**
- Modify: `design/shared/style-logistics.css` (append a second `:where()` block)
- Modify: `design/tests/test_logistics.py` (add `hero` and `nojs` tests above the `if __name__` line)

**Interfaces:**
- Consumes: the IDs/classes from Task 2.
- Produces: visual classes `.label-card .label-ref .barcode .kind .fields .step-title .field .err .flex-date .area-note .hint .form-actions .hp .sent .sent-title .final-line .final-actions .final-mail`; `.field.invalid` (set by Task 4).

- [ ] **Step 1: Write the failing tests**

Add to `design/tests/test_logistics.py` (before `if __name__ == "__main__":`):

```python
@test("hero")
def t_hero(b):
    c, pg, errs, failed = open_page(b, URL, **PHONE)
    r = pg.evaluate("""(() => { const q = s => document.querySelector(s).getBoundingClientRect();
        return { h1: Math.round(q('h1').bottom), tabs: Math.round(q('.kind').top), next: Math.round(q('#qNext').bottom) }; })()""")
    check("[hero/phone] headline and step 1 fit the first screen", r["h1"] < r["tabs"] and r["next"] <= 844, str(r))
    small = pg.evaluate("""[...document.querySelectorAll('#quote-form [data-step="1"] input:not([type=checkbox]), #quote-form select, #qNext, .kind label')]
        .filter(e => e.offsetParent && e.getBoundingClientRect().height < 40).map(e => e.id || e.textContent.trim())""")
    check("[hero/phone] form controls are at least 40px tall", not small, str(small))
    c.close()
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    look = pg.evaluate("""(() => { const f = getComputedStyle(document.getElementById('quote-form'));
        const m = getComputedStyle(document.querySelector('.field > label'));
        return [f.borderTopStyle, f.backgroundColor, m.fontFamily, !!document.querySelector('#quote-form .barcode')]; })()""")
    check("[hero] form looks like a shipping label", look[0] == "dashed" and look[1] == "rgb(247, 245, 239)" and "IBM Plex Mono" in look[2] and look[3], str(look))
    cols = pg.evaluate("""(() => { const h = document.querySelector('h1').getBoundingClientRect(), f = document.getElementById('quote-form').getBoundingClientRect();
        return [Math.round(h.right), Math.round(f.left)]; })()""")
    check("[hero] headline left, form right on desktop", cols[0] <= cols[1], str(cols))
    checked = pg.evaluate("getComputedStyle(document.querySelector('.kind label:has(input:checked)')).backgroundColor")
    check("[hero] selected tab is navy", checked == "rgb(2, 34, 72)", checked)
    c.close()


@test("nojs")
def t_nojs(b):
    c = b.new_context(java_script_enabled=False, **DESKTOP)
    pg = c.new_page()
    pg.goto(URL)
    pg.wait_for_load_state("load")
    check("[no-js] both form steps visible", pg.is_visible("#qFrom") and pg.is_visible("#qName"))
    check("[no-js] Continue and Back hidden (they need JS)", not pg.is_visible("#qNext") and not pg.is_visible("#qBack"))
    check("[no-js] both kinds of load listed", pg.locator("#qLoad optgroup").count() == 2)
    check("[no-js] Send is available", pg.is_visible("#qSend"))
    check("[no-js] headline visible", pg.is_visible("h1"))
    c.close()
```

- [ ] **Step 2: Run them to verify they fail**

Run: `python design/tests/test_logistics.py hero nojs`
Expected: FAIL on "form looks like a shipping label", "headline left, form right", "selected tab is navy", and the phone first-screen check. The no-JS checks may already pass; that is fine.

- [ ] **Step 3: Append the hero and form styles**

Append to `design/shared/style-logistics.css`:

```css

/* ---------- Hero + the shipping-label form ---------- */
:where([data-division="logistics"]) {
  .hero { padding: clamp(32px, 6vh, 80px) 0 clamp(56px, 9vh, 104px); }
  .hero .wrap { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(28px, 5vw, 72px); align-items: center; }
  .hero-eyebrow { margin: 0 0 16px; color: var(--gold); }
  .hero h1 { margin: 0 0 20px; }
  .hero .lead { margin: 0; max-width: 40ch; font-size: clamp(17px, 1.5vw, 20px); line-height: 1.5; color: var(--on-brand-muted); }

  /* the label: dashed edge inside a solid paper rim, reference line + barcode */
  .label-card {
    position: relative; display: grid; gap: 14px; margin: 8px; padding: 18px;
    background: var(--paper); color: var(--heading);
    border: 2px dashed rgba(2, 34, 72, 0.35); border-radius: 4px; outline: 8px solid var(--paper);
  }
  .label-ref { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; color: var(--label-ink); }
  .barcode {
    flex: 0 0 40%; height: 24px; opacity: 0.85;
    background: repeating-linear-gradient(90deg, var(--heading) 0 2px, transparent 2px 4px, var(--heading) 4px 7px, transparent 7px 9px);
  }

  /* tabs: a radio pair styled as a segmented control */
  .kind { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 0; padding: 4px; border: 1px solid rgba(2, 34, 72, 0.25); border-radius: var(--r); }
  .kind label {
    position: relative; display: grid; place-items: center; min-height: 44px; padding: 6px;
    border-radius: 4px; text-align: center; font-weight: 600; font-size: 15px; cursor: pointer;
  }
  .kind input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
  .kind label:has(input:checked) { background: var(--heading); color: var(--white); }
  .kind label:has(input:focus-visible) { outline: 2px solid var(--gold); outline-offset: 2px; }

  /* steps and fields: manifest rows */
  .fields { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0; }
  .step-title { grid-column: 1 / -1; margin: 2px 0 6px; font: 900 18px/1.1 var(--f-display); font-stretch: 118%; text-transform: uppercase; color: var(--heading); }
  .step-title:focus:not(:focus-visible) { outline: none; }
  .field { display: grid; align-content: start; gap: 4px; min-width: 0; padding: 10px 2px 12px; border-top: 1px solid rgba(2, 34, 72, 0.25); }
  .fields .full, .area-note, .hint, .form-actions { grid-column: 1 / -1; }
  .field > label.mono { color: var(--label-ink); }
  .field input:not([type="checkbox"]), .field select, .field textarea {
    width: 100%; min-height: 40px; padding: 4px 0; border: 0; border-bottom: 2px solid rgba(2, 34, 72, 0.2); border-radius: 0;
    background: transparent; color: var(--heading); font: 600 17px/1.3 var(--f-body);
  }
  .field textarea { min-height: 72px; resize: vertical; }
  .field :is(input, select, textarea):focus { outline: none; border-bottom-color: var(--gold); }
  .field.invalid :is(input, select, textarea) { border-bottom-color: var(--err); }
  .err { margin: 2px 0 0; color: var(--err); font-size: 14px; font-weight: 600; }
  .err:empty { display: none; }
  .flex-date { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .flex-date input { width: 18px; height: 18px; accent-color: var(--heading); }
  .area-note { margin: 0 0 4px; padding: 10px 12px; border-left: 4px solid var(--gold); background: rgba(194, 138, 44, 0.14); font-size: 15px; }
  .hint { margin: 0 0 6px; font-size: 14px; color: var(--label-ink); }
  .form-actions { display: flex; gap: 12px; padding-top: 12px; }
  .form-actions .btn-gold { flex: 1; justify-content: center; }
  .hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

  /* after sending */
  .sent { display: grid; gap: 8px; padding: 12px 2px; }
  .sent:focus { outline: none; }
  .sent-title { margin: 0; font: 900 26px/1 var(--f-display); font-stretch: 118%; text-transform: uppercase; color: var(--heading); }
  .sent p { margin: 0; }

  /* the final section's card */
  .final-line { margin: 0; font-size: 18px; font-weight: 600; }
  .final-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .final-mail { margin: 0; color: var(--label-ink); }
  .final-mail a { color: var(--heading); }

  @media (max-width: 960px) {
    .hero .wrap { grid-template-columns: 1fr; gap: 24px; }
  }
  @media (max-width: 560px) {
    .hero .lead { display: none; } /* phones: headline + form step 1 on the first screen; the lanes carry this message */
    .label-card { padding: 14px; }
    .kind label { font-size: 14px; }
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `python design/tests/test_logistics.py structure hero nojs`
Expected: all PASS. If the phone first-screen check fails by a few pixels, take a screenshot (`pg.screenshot(path="design/tests/shots/lg-hero-phone.png")`), then reduce `.hero` top padding (the `clamp(32px, …)` minimum) before touching type sizes. Keep the H1 and all four step-1 fields.

- [ ] **Step 5: Checkpoint**

```bash
git add design/shared/style-logistics.css design/tests/test_logistics.py
git commit -m "feat(logistics): hero layout and shipping-label quote form"
```

---

### Task 4: Quote form behaviour

**Files:**
- Create: `design/js/quote-form.js`
- Modify: `design/logistics-home.html` (add `<script src="js/quote-form.js"></script>` after `shared/genix.js`)
- Modify: `design/tests/test_logistics.py` (add `form`, `lanes`, `keyboard` tests)

**Interfaces:**
- Consumes: the form markup IDs from Task 2; `.field.invalid` and `[hidden]` rules from Tasks 2–3; `window.genixLenis` (optional) from `shared/genix.js`.
- Produces: `window.genixQuote = { selectKind(kind: "business"|"move"): void, validZip(v: string): boolean, isServedZip(v: string): boolean }`. Clicking `a[data-kind]` selects that tab; clicking `[data-start-quote]` focuses `#qFrom`.

- [ ] **Step 1: Write the failing tests**

Add to `design/tests/test_logistics.py`:

```python
def load_values(pg):
    return pg.evaluate("[...document.querySelectorAll('#qLoad option')].map(o => o.value)")


BUSINESS = ["", "pallets", "parcels", "truckload", "courier"]
MOVE = ["", "studio", "1-2bed", "3bed", "office"]


@test("form")
def t_form(b):
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    v = pg.is_visible
    check("[form] step 2 starts hidden", v("#qFrom") and not v("#qName"))
    check("[form] business options by default", load_values(pg) == BUSINESS, str(load_values(pg)))
    pg.fill("#qFrom", "92a10 1x")
    check("[form] ZIP keeps digits only", pg.input_value("#qFrom") == "92101", pg.input_value("#qFrom"))
    pg.fill("#qDate", "2099-01-15")
    pg.click(".kind label:has-text('Plan a move')")
    check("[form] the move tab swaps the options", load_values(pg) == MOVE, str(load_values(pg)))
    check("[form] switching tabs keeps ZIP and date", pg.input_value("#qFrom") == "92101" and pg.input_value("#qDate") == "2099-01-15")

    pg.fill("#qFrom", ""); pg.fill("#qDate", "")
    pg.click("#qNext")
    bad = pg.evaluate("[...document.querySelectorAll('[data-step=\"1\"] .err')].filter(e => e.textContent).map(e => e.id)")
    check("[form] empty step 1 flags ZIPs, date and load", bad == ["qFromErr", "qToErr", "qDateErr", "qLoadErr"], str(bad))
    check("[form] focus jumps to the first problem", pg.evaluate("document.activeElement.id") == "qFrom")
    check("[form] problems announced", pg.text_content("#qStatus") == "4 fields need attention.", pg.text_content("#qStatus"))
    check("[form] invalid fields are marked", pg.get_attribute("#qFrom", "aria-invalid") == "true")

    pg.fill("#qDate", "2020-01-01"); pg.click("#qNext")
    check("[form] past date rejected", pg.text_content("#qDateErr") == "Pick a date from today on.", pg.text_content("#qDateErr"))
    pg.check("#qFlex")
    check("[form] Flexible disables the date", pg.is_disabled("#qDate") and pg.input_value("#qDate") == "")

    pg.fill("#qFrom", "90210"); pg.fill("#qTo", "92101")
    check("[form] outside-area note shows", v("#qArea"))
    pg.fill("#qFrom", "92024")
    check("[form] note hides for San Diego ZIPs", not v("#qArea"))
    pg.fill("#qFrom", "90210")

    pg.click(".kind label:has-text('Ship for your business')")
    pg.select_option("#qLoad", "pallets")
    check("[form] pallet count appears for pallets", v("#qPallets"))
    pg.click("#qNext")
    check("[form] pallet count required", pg.text_content("#qPalletsErr") == "Enter 1 to 26 pallets.", pg.text_content("#qPalletsErr"))
    pg.fill("#qPallets", "4"); pg.click("#qNext")
    check("[form] an outside-area ZIP still continues", v("#qName"))
    check("[form] focus moves to the step 2 heading", pg.evaluate("document.activeElement.id") == "qStep2Title")
    pg.click("#qBack")
    check("[form] Back keeps step 1 answers", pg.input_value("#qFrom") == "90210" and pg.input_value("#qPallets") == "4")

    pg.click("#qNext"); pg.click("#qSend")
    check("[form] name and a way to reply are required",
          pg.text_content("#qNameErr") == "Enter your name."
          and pg.text_content("#qPhoneErr") == "Add a phone number or an email so we can reply.")
    pg.fill("#qName", "Dana"); pg.fill("#qEmail", "dana@"); pg.click("#qSend")
    check("[form] bad email flagged", pg.text_content("#qEmailErr") == "Enter an email like name@company.com.", pg.text_content("#qEmailErr"))
    pg.fill("#qEmail", "dana@shop.com"); pg.click("#qSend")
    check("[form] confirmation replaces the form", v("#qSent") and not v("#qName") and not v(".kind"))
    check("[form] label shows the request was received", pg.text_content("#qRef") == "Request received")
    check("[form] confirmation announced and focused",
          pg.text_content("#qStatus").startswith("Request received") and pg.evaluate("document.activeElement.id") == "qSent")
    check("[form] no console errors", not errs, "; ".join(errs[:3]))
    c.close()


@test("lanes")
def t_lanes(b):
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    pg.click("a[data-kind=move]")
    pg.wait_for_timeout(1400)
    check("[lanes] 'Get a moving price' selects Plan a move",
          pg.is_checked("input[name=kind][value=move]") and load_values(pg) == MOVE)
    top = pg.evaluate("document.getElementById('quote-form').getBoundingClientRect().top")
    check("[lanes] ...and brings the form into view", 0 <= top < 400, f"{top:.0f}px")
    pg.click("#quote [data-start-quote]")
    pg.wait_for_timeout(1400)
    check("[lanes] 'Start a quote' focuses the first field", pg.evaluate("document.activeElement.id") == "qFrom")
    c.close()


@test("keyboard")
def t_keyboard(b):
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    kb = pg.keyboard
    pg.focus("#qFrom"); kb.type("92101"); kb.press("Tab"); kb.type("92024")
    pg.focus("#qFlex"); kb.press("Space")
    kb.press("Tab")
    check("[keyboard] Tab reaches the load menu", pg.evaluate("document.activeElement.id") == "qLoad")
    kb.press("ArrowDown"); kb.press("ArrowDown")
    check("[keyboard] arrow keys choose the load", pg.input_value("#qLoad") == "parcels", pg.input_value("#qLoad"))
    kb.press("Tab")
    check("[keyboard] Tab reaches Continue", pg.evaluate("document.activeElement.id") == "qNext")
    kb.press("Enter")
    check("[keyboard] Enter moves to step 2", pg.evaluate("document.activeElement.id") == "qStep2Title")
    kb.press("Tab"); kb.type("Dana"); kb.press("Tab"); kb.type("619 555 0142"); kb.press("Enter")
    check("[keyboard] Enter sends", pg.is_visible("#qSent") and pg.evaluate("document.activeElement.id") == "qSent")
    c.close()
```

- [ ] **Step 2: Run them to verify they fail**

Run: `python design/tests/test_logistics.py form lanes keyboard`
Expected: FAIL. Without the script, step 2 is visible from the start and the options are not filtered.

- [ ] **Step 3: Write the behaviour**

`design/js/quote-form.js`:

```js
/* Genix Logistics quote form: two tabs (business / move), two steps,
   inline validation and the prototype confirmation.
   Without this script the form is one ordinary form with both steps showing.
   Prototype: nothing is sent. Real build: POST to Payload Inquiries
   (division: logistics) and email the team via Resend. */
(() => {
  const form = document.getElementById("quote-form");
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const step1 = form.querySelector('[data-step="1"]');
  const step2 = form.querySelector('[data-step="2"]');
  const load = $("qLoad");
  const status = $("qStatus");
  const placeholder = load.querySelector('option[value=""]');
  const groups = [...load.querySelectorAll("optgroup")].map((g) => ({ kind: g.dataset.kind, options: [...g.children] }));

  // ---- rules ----
  const validZip = (v) => /^\d{5}$/.test(v);
  // San Diego County ZIPs start 919-921 (placeholder until the owner's own list)
  const isServedZip = (v) => { const p = +v.slice(0, 3); return p >= 919 && p <= 921; };
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const validPhone = (v) => v.replace(/\D/g, "").length >= 10;
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // ---- errors ----
  function setErr(input, msg) {
    $(input.id + "Err").textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    input.closest(".field").classList.toggle("invalid", !!msg);
  }
  function report(bad) {
    if (!bad.length) { status.textContent = ""; return true; }
    status.textContent = bad.length === 1 ? "1 field needs attention." : `${bad.length} fields need attention.`;
    bad[0].focus();
    return false;
  }

  // ---- tabs: swap the "what's moving" options, keep everything else ----
  const kindOf = () => form.querySelector('input[name="kind"]:checked').value;
  function showOptions(kind) {
    const group = groups.find((g) => g.kind === kind);
    load.replaceChildren(placeholder, ...group.options);
    load.value = "";
    $("qPalletsField").hidden = true;
    setErr(load, "");
  }
  function goStep(n) {
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    (n === 2 ? $("qStep2Title") : $("qStep1Title")).focus({ preventScroll: true });
  }
  function selectKind(kind) {
    const radio = form.querySelector(`input[name="kind"][value="${kind}"]`);
    if (!radio || radio.checked) return;
    radio.checked = true;
    showOptions(kind);
    if (step1.hidden && !step2.hidden) goStep(1); // the load choice was reset: back to step 1
  }

  form.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "kind") showOptions(t.value);
    if (t === load) { $("qPalletsField").hidden = load.value !== "pallets"; setErr(load, ""); }
    if (t.id === "qFlex") {
      const date = $("qDate");
      date.disabled = t.checked;
      if (t.checked) { date.value = ""; setErr(date, ""); }
    }
  });
  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "qFrom" || t.id === "qTo") {
      t.value = t.value.replace(/\D/g, "").slice(0, 5);
      setErr(t, "");
      const zips = [$("qFrom").value, $("qTo").value];
      $("qArea").hidden = !zips.every(validZip) || zips.every(isServedZip);
    } else if (t.closest && t.closest(".field") && $(t.id + "Err")) {
      setErr(t, "");
    }
  });

  // ---- checks ----
  function checkStep1() {
    const bad = [];
    for (const zip of [$("qFrom"), $("qTo")]) {
      const msg = validZip(zip.value) ? "" : "Enter a 5-digit ZIP code.";
      setErr(zip, msg); if (msg) bad.push(zip);
    }
    const date = $("qDate");
    if (!$("qFlex").checked) {
      const msg = !date.value ? "Pick a date, or tick Flexible." : date.value < todayISO() ? "Pick a date from today on." : "";
      setErr(date, msg); if (msg) bad.push(date);
    }
    const loadMsg = load.value ? "" : "Choose what's moving.";
    setErr(load, loadMsg); if (loadMsg) bad.push(load);
    if (load.value === "pallets") {
      const pallets = $("qPallets"), n = +pallets.value;
      const msg = Number.isInteger(n) && n >= 1 && n <= 26 ? "" : "Enter 1 to 26 pallets.";
      setErr(pallets, msg); if (msg) bad.push(pallets);
    }
    return report(bad);
  }
  function checkStep2() {
    const bad = [];
    const name = $("qName");
    const nameMsg = name.value.trim() ? "" : "Enter your name.";
    setErr(name, nameMsg); if (nameMsg) bad.push(name);
    const phone = $("qPhone"), email = $("qEmail");
    const p = phone.value.trim(), m = email.value.trim();
    const neither = !p && !m ? "Add a phone number or an email so we can reply." : "";
    const phoneMsg = neither || (p && !validPhone(p) ? "Enter a phone number with area code." : "");
    const emailMsg = m && !validEmail(m) ? "Enter an email like name@company.com." : "";
    setErr(phone, phoneMsg); if (phoneMsg) bad.push(phone);
    setErr(email, emailMsg); if (emailMsg) bad.push(email);
    return report(bad);
  }

  // ---- steps and sending ----
  $("qNext").addEventListener("click", () => { if (checkStep1()) goStep(2); });
  $("qBack").addEventListener("click", () => goStep(1));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (step2.hidden) { if (checkStep1()) goStep(2); return; } // Enter pressed in step 1
    if (!checkStep2()) return;
    if ($("qHp").value) return; // bots fill the hidden field (the real build also checks server-side)
    form.querySelector(".kind").hidden = true;
    step1.hidden = true;
    step2.hidden = true;
    $("qRef").textContent = "Request received";
    $("qSent").hidden = false;
    status.textContent = "Request received. We'll call you back.";
    $("qSent").focus({ preventScroll: true });
  });

  // ---- links elsewhere on the page ----
  document.querySelectorAll("a[data-kind]").forEach((a) => a.addEventListener("click", () => selectKind(a.dataset.kind)));
  document.querySelectorAll("[data-start-quote]").forEach((a) =>
    a.addEventListener("click", () => { if (!$("qFrom").closest("[hidden]")) $("qFrom").focus({ preventScroll: true }); }));

  // ---- start: JS mode shows one step at a time ----
  step2.hidden = true;
  $("qDate").min = todayISO();
  showOptions(kindOf());

  window.genixQuote = { selectKind, validZip, isServedZip };
})();
```

- [ ] **Step 4: Load it on the page**

In `design/logistics-home.html`, directly after `<script src="shared/genix.js"></script>` add:

```html
    <script src="js/quote-form.js"></script>
```

- [ ] **Step 5: Run the tests**

Run: `python design/tests/test_logistics.py structure hero nojs form lanes keyboard`
Expected: all PASS.

- [ ] **Step 6: Checkpoint**

```bash
git add design/js/quote-form.js design/logistics-home.html design/tests/test_logistics.py
git commit -m "feat(logistics): two-step quote form with tabs and inline validation"
```

---

### Task 5: The road signature

**Files:**
- Create: `design/tools/make_logistics_truck.py`, generated `design/assets/logistics-truck.svg`
- Create: `design/js/route.js`
- Modify: `design/logistics-home.html` (road markup, script tag)
- Modify: `design/shared/style-logistics.css` (append a road block)
- Modify: `design/tests/test_logistics.py` (add `signature`)

**Interfaces:**
- Consumes: `[data-road]`, `.stops`, `li.stop[data-stop]` from Task 2; GSAP + ScrollTrigger (registered by `shared/genix.js`).
- Produces: the CSS custom property `--p` (0–1) on `[data-road]`; classes `.is-live` / `.is-done` on the road and `.is-passed` on stops.

- [ ] **Step 1: Write the failing test**

Add to `design/tests/test_logistics.py`:

```python
ROAD = """(() => { const r = document.querySelector('[data-road]'); const t = document.querySelector('.road-truck').getBoundingClientRect();
  return { p: parseFloat(getComputedStyle(r).getPropertyValue('--p')), live: r.classList.contains('is-live'), done: r.classList.contains('is-done'),
           passed: document.querySelectorAll('[data-stop].is-passed').length, x: Math.round(t.left), y: Math.round(t.top + scrollY),
           stamp: +getComputedStyle(document.querySelector('.stamp')).opacity }; })()"""


def road_positions(pg, vh):
    top = pg.evaluate("document.querySelector('[data-road]').getBoundingClientRect().top + scrollY")
    h = pg.evaluate("document.querySelector('[data-road]').offsetHeight")
    out = []
    for y in (top - vh * 0.75 - 60, top + h / 2 - vh * 0.6, top + h - vh * 0.45 + 120):
        pg.evaluate(f"scrollTo(0, {y})")
        pg.wait_for_timeout(1400)
        out.append(pg.evaluate(ROAD))
    return out


@test("signature")
def t_signature(b):
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    h0 = pg.evaluate("document.getElementById('how').offsetHeight")
    start, mid, end = road_positions(pg, 900)
    check("[road] animation is live", start["live"])
    check("[road] truck starts at the first stop", start["p"] < 0.02 and start["passed"] == 1, str(start))
    check("[road] truck drives as you scroll", start["x"] < mid["x"] < end["x"], f"{start['x']} {mid['x']} {end['x']}")
    check("[road] stops light up as it passes", end["passed"] == 4, f"{start['passed']} -> {end['passed']}")
    check("[road] DELIVERED stamp lands at the end", end["done"] and end["stamp"] > 0.95 and start["stamp"] < 0.05, f"{start['stamp']} -> {end['stamp']}")
    check("[road] no pinning, section height unchanged",
          pg.evaluate("document.getElementById('how').offsetHeight") == h0 and pg.locator(".pin-spacer").count() == 0)
    c.close()

    c, pg, errs, failed = open_page(b, URL, reduced_motion="reduce", **DESKTOP)
    s = pg.evaluate(ROAD)
    dot = pg.evaluate("getComputedStyle(document.querySelector('.stop-dot')).backgroundColor")
    check("[road/reduced motion] finished road shown", not s["live"] and s["stamp"] == 1 and dot == "rgb(194, 138, 44)", f"{s} {dot}")
    c.close()

    c, pg, errs, failed = open_page(b, URL, **PHONE)
    line = pg.evaluate("(() => { const r = document.querySelector('.road-line').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })()")
    check("[road/phone] road runs top to bottom", line[0] <= 6 and line[1] > 300, str(line))
    start, mid, end = road_positions(pg, 844)
    check("[road/phone] truck drives down", start["y"] < mid["y"] < end["y"], f"{start['y']} {mid['y']} {end['y']}")
    ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("[road/phone] no horizontal page scroll", ov <= 0, f"{ov}px")
    c.close()
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python design/tests/test_logistics.py signature`
Expected: FAIL / error: `.road-truck` does not exist yet.

- [ ] **Step 3: Generate the road truck**

`design/tools/make_logistics_truck.py`:

```python
"""Usage: python design/tools/make_logistics_truck.py

The small truck for the Logistics "How a job runs" road: the logo's mark
(truck + gold G) cut from genix-logistics-logo.svg. The truck body is
lightened so it reads on navy; the gold G is untouched. Mark bbox in logo
units: x 136-622, y 4-170."""
import re
from pathlib import Path

A = Path(__file__).resolve().parent.parent / "assets"
logo = (A / "genix-logistics-logo.svg").read_text(encoding="utf-8")
truck, g = re.findall(r"<path [^>]*/>", logo)[:2]
assert 'fill="#37404A"' in truck and 'fill="#C28A2C"' in g, "logo path order changed: re-check trace_logistics_logo.py"
truck = truck.replace('fill="#37404A"', 'fill="#E6E8EA"')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="136 4 486 166" width="486" height="166">\n  {truck}\n  {g}\n</svg>\n'
(A / "logistics-truck.svg").write_text(svg, encoding="utf-8")
print(f"logistics-truck.svg  {len(svg) / 1024:.1f} KB")
```

Run: `python design/tools/make_logistics_truck.py`
Expected: one line, `logistics-truck.svg` followed by a size of roughly 20–30 KB (the truck path is ~21 KB, the G ~3 KB).

- [ ] **Step 4: Add the road markup**

In `design/logistics-home.html`, inside `<div class="road" data-road>`, before `<ol class="stops">`, add:

```html
            <div class="road-line" aria-hidden="true"><span class="road-fill"></span></div>
            <img class="road-truck" src="assets/logistics-truck.svg" alt="" width="486" height="166" />
```

In each of the four `<li class="stop" data-stop>`, add as the first child:

```html
                <span class="stop-dot" aria-hidden="true"></span>
```

In the fourth stop, after its last `<p>`, add:

```html
                <span class="stamp" aria-hidden="true">Delivered</span>
```

Change the comment `<!-- How a job runs (the road signature is added in Task 5) -->` to `<!-- How a job runs: the truck drives the road as the section scrolls past (js/route.js) -->`.

- [ ] **Step 5: Append the road styles**

Append to `design/shared/style-logistics.css`:

```css

/* ---------- How a job runs: the road ----------
   --p (0-1) is the truck's progress; route.js drives it. Default 1 = the
   finished road (no JS / reduced motion). Desktop: left to right through
   the centres of the four stop columns. Phones: top to bottom. */
:where([data-division="logistics"]) {
  .road { --p: 1; position: relative; }
  .road-line {
    position: absolute; left: 12.5%; right: 12.5%; top: 62px; height: 4px;
    background: repeating-linear-gradient(to right, rgba(194, 138, 44, 0.3) 0 22px, transparent 22px 38px);
  }
  .road-fill {
    position: absolute; inset: 0; transform-origin: left center; transform: scaleX(var(--p));
    background: repeating-linear-gradient(to right, var(--gold) 0 22px, transparent 22px 38px);
  }
  .road-truck { position: absolute; z-index: 2; top: 18px; width: 120px; height: auto; left: calc(12.5% + var(--p) * 75% - 60px); }
  .stops { padding-top: 104px; }
  .stop { text-align: center; }
  .stop-dot {
    position: absolute; top: -50px; left: 50%; width: 20px; height: 20px; margin-left: -10px;
    border-radius: 50%; border: 3px solid var(--gold); background: var(--gold); transition: background-color 0.3s;
  }
  .road.is-live .stop:not(.is-passed) .stop-dot { background: var(--brand); }
  .stamp {
    display: inline-block; margin-top: 16px; padding: 6px 12px; border: 2.5px solid var(--gold); border-radius: 3px;
    color: var(--gold); font: 600 14px/1 var(--f-mono); letter-spacing: 0.16em; text-transform: uppercase; transform: rotate(-8deg);
  }
  .road.is-live .stamp { opacity: 0; transform: rotate(-8deg) scale(1.6); transition: opacity 0.25s, transform 0.35s cubic-bezier(0.2, 1.4, 0.4, 1); }
  .road.is-live.is-done .stamp { opacity: 1; transform: rotate(-8deg) scale(1); }

  @media (max-width: 760px) {
    /* road on the left at x = 42px, text from 72px */
    .road-line {
      left: 40px; right: auto; top: 0; bottom: 0; width: 4px; height: auto;
      background: repeating-linear-gradient(to bottom, rgba(194, 138, 44, 0.3) 0 22px, transparent 22px 38px);
    }
    .road-fill {
      transform-origin: center top; transform: scaleY(var(--p));
      background: repeating-linear-gradient(to bottom, var(--gold) 0 22px, transparent 22px 38px);
    }
    /* 84x29 truck turned to face down; its visual box is 29 wide, centred on the road */
    .road-truck { width: 84px; left: 0; top: calc(var(--p) * (100% - 84px) + 27.5px); transform: rotate(90deg); }
    .stops { padding: 0 0 0 72px; }
    .stop { text-align: left; }
    .stop-dot { top: 0; left: -40px; margin-left: 0; }
  }
}
```

- [ ] **Step 6: Write the animation**

`design/js/route.js`:

```js
/* "How a job runs": the truck drives the road as the section scrolls past.
   Scrubbed ScrollTrigger with no pin, so the section keeps its natural
   height. Stops light up as the truck reaches them; a DELIVERED stamp lands
   at the end. No GSAP or reduced motion: the CSS default (--p: 1) is the
   finished road. */
(() => {
  const road = document.querySelector("[data-road]");
  if (!road || !window.gsap || !window.ScrollTrigger) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(ScrollTrigger);
  const stops = [...road.querySelectorAll("[data-stop]")];
  const last = stops.length - 1;
  const mark = (p) => {
    stops.forEach((s, i) => s.classList.toggle("is-passed", p >= i / last - 0.001));
    road.classList.toggle("is-done", p >= 0.999);
  };
  road.classList.add("is-live");
  gsap.fromTo(road, { "--p": 0 }, {
    "--p": 1,
    ease: "none",
    scrollTrigger: { trigger: road, start: "top 75%", end: "bottom 45%", scrub: 0.5 },
    onUpdate() { mark(this.progress()); },
  });
  mark(0);
})();
```

In `design/logistics-home.html`, after `<script src="js/quote-form.js"></script>` add:

```html
    <script src="js/route.js"></script>
```

- [ ] **Step 7: Run the tests**

Run: `python design/tests/test_logistics.py`
Expected: all tests PASS (structure, hero, nojs, form, lanes, keyboard, signature).

- [ ] **Step 8: Checkpoint**

```bash
git add design/tools/make_logistics_truck.py design/assets/logistics-truck.svg design/js/route.js design/logistics-home.html design/shared/style-logistics.css design/tests/test_logistics.py
git commit -m "feat(logistics): scroll-driven road signature with delivered stamp"
```

---

### Task 6: Pinned quote bar, hub link, full regression and visual review

**Files:**
- Modify: `design/logistics-home.html` (bar markup + shared script)
- Modify: `design/hub-home.html` (Logistics panel quote button)
- Modify: `design/tests/test_logistics.py` (add `bar`, `hub`)

**Interfaces:**
- Consumes: `shared/quote-bar.js` and its CSS (Task 1); `[data-start-quote]` behaviour (Task 4).

- [ ] **Step 1: Write the failing tests**

Add to `design/tests/test_logistics.py`:

```python
def bar_at(pg, sel, extra=0):
    pg.evaluate(f"scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY + {extra})")
    pg.wait_for_timeout(900)
    return pg.evaluate(BAR)


@test("bar")
def t_bar(b):
    c, pg, errs, failed = open_page(b, URL, **PHONE)
    check("[bar] hidden while the hero form is on screen", pg.evaluate(BAR)["off"])
    check("[bar] shows once the form has scrolled away", not bar_at(pg, "#services", 200)["off"])
    check("[bar] hides over the final quote section", bar_at(pg, "#quote")["off"])
    check("[bar] hides over the footer", bar_at(pg, ".site-footer")["off"])
    bar_at(pg, "#areas")
    pg.click("#quoteBar [data-start-quote]")
    pg.wait_for_timeout(1400)
    check("[bar] its button goes to the form and focuses the first field", pg.evaluate("document.activeElement.id") == "qFrom")
    c.close()
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    check("[bar] no bar on desktop", not pg.evaluate(BAR)["shown"])
    c.close()


@test("hub")
def t_hub(b):
    c, pg, errs, failed = open_page(b, BASE + "hub-home.html", **DESKTOP)
    href = pg.get_attribute("#div-move a.btn-accent", "href")
    check("[hub] Logistics quote button opens the prototype form", href == "logistics-home.html#quote-form", str(href))
    check("[hub] prototype page is served", pg.request.get(URL).status == 200)
    c.close()
```

- [ ] **Step 2: Run them to verify they fail**

Run: `python design/tests/test_logistics.py bar hub`
Expected: FAIL / error (`#quoteBar` missing; hub href is the subdomain URL).

- [ ] **Step 3: Add the bar to the Logistics page**

In `design/logistics-home.html`, directly before `<footer class="site-footer">`:

```html
    <!-- Phones: "Get a quote" stays one tap away once the hero form scrolls off (shared/quote-bar.js) -->
    <div class="quote-bar" id="quoteBar" data-after="#quote-form" data-hide-over="#quote-form, #quote, .site-footer" hidden>
      <a class="btn btn-gold" href="#quote-form" data-start-quote>Get a quote <span aria-hidden="true">→</span></a>
      <a class="btn btn-ghost ph" href="tel:+10000000000" aria-label="Call Genix Logistics">Call</a>
    </div>
```

and after `<script src="shared/genix.js"></script>`:

```html
    <script src="shared/quote-bar.js"></script>
```

- [ ] **Step 4: Point the hub at the prototype**

In `design/hub-home.html`, in the Logistics panel (`id="div-move"`), change

```html
                  href="https://logistics.thegenixgroup.com/contact"
```

to

```html
                  href="logistics-home.html#quote-form"
```

and add this comment on the line above the `<a class="btn-accent"`:

```html
                <!-- prototype review link; the real build uses https://logistics.thegenixgroup.com/#quote-form -->
```

- [ ] **Step 5: Run the Logistics suite and every regression suite**

```bash
python design/tests/test_logistics.py
python design/tests/test_shared.py
python design/tests/test_hu.py
python design/tests/test_build_section.py
python design/tests/test_reel.py
python design/tests/test_dock.py
python design/tests/test_split.py
```
Expected: every suite ends with `N/N passed`. For a failure in an existing suite, rerun once (known software-rendering timing flakes in Flip/video checks); if it repeats, investigate with superpowers:systematic-debugging before continuing.

- [ ] **Step 6: Visual review**

Take full-page screenshots, then read them:

```bash
python - <<'EOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, ctx in (("desktop", dict(viewport={"width": 1440, "height": 900})),
                      ("phone", dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True))):
        pg = b.new_context(**ctx).new_page()
        pg.goto("http://localhost:4321/logistics-home.html"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
        h = pg.evaluate("document.documentElement.scrollHeight")
        for y in range(0, h, 500):  # walk the page so reveals and the road run
            pg.evaluate(f"scrollTo(0, {y})"); pg.wait_for_timeout(250)
        pg.evaluate("scrollTo(0, 0)"); pg.wait_for_timeout(800)
        pg.screenshot(path=f"design/tests/shots/lg-full-{name}.png", full_page=True)
    b.close()
EOF
```

Read `design/tests/shots/lg-full-desktop.png` and `lg-full-phone.png` and confirm:
- The hero reads as navy with a paper shipping label on it, and the H1 is heavy, wide and uppercase with "Handled Right." in gold.
- There is no overlap between the truck, the stop dots and the stop text (desktop and phone).
- Placeholder content (dashed gold outline) appears only on: the step captions, the area list, the proof slots, the FAQ answers, the phone numbers and the callback time.
- Nothing looks copied from Home Upgrades (no light Plus Jakarta headlines, no sky-blue links).

Fix anything that fails, then rerun `python design/tests/test_logistics.py`.

- [ ] **Step 7: Checkpoint**

```bash
git add design/logistics-home.html design/hub-home.html design/tests/test_logistics.py
git commit -m "feat(logistics): pinned phone quote bar and hub review link"
```
