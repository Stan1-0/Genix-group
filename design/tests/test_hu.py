"""Test suite for design/homeupgrades-home.html."""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321/homeupgrades-home.html"
OUT = os.path.join(os.path.dirname(__file__), "shots"); os.makedirs(OUT, exist_ok=True)
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

def open_page(b, **ctx):
    c = b.new_context(**ctx); pg = c.new_page(); errs, failed = [], []
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("requestfailed", lambda r: r.failure != "net::ERR_ABORTED" and failed.append(f"{r.url} {r.failure}"))
    pg.on("response", lambda r: r.status >= 400 and failed.append(f"{r.status} {r.url}"))
    pg.goto(URL); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
    return c, pg, errs, failed

def basics(pg, label, errs, failed):
    check(f"[{label}] no console/page errors", not errs, "; ".join(errs[:3]))
    check(f"[{label}] no failed requests", not failed, "; ".join(failed[:3]))
    ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(f"[{label}] no horizontal overflow", ov <= 0, f"{ov}px")
    broken = pg.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map(i => i.src)")
    check(f"[{label}] images load", not broken, ", ".join(broken))
    missing = pg.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h))")
    check(f"[{label}] in-page links resolve", not missing, ", ".join(set(missing)))
    check(f"[{label}] exactly one h1", pg.locator("h1").count() == 1)
    no_alt = pg.evaluate("[...document.images].filter(i => !i.hasAttribute('alt')).length")
    check(f"[{label}] every image has alt", no_alt == 0)
    heads = pg.evaluate("[...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1])")
    skips = [f"{a}->{b_}" for a, b_ in zip(heads, heads[1:]) if b_ > a + 1]
    check(f"[{label}] no skipped heading levels", not skips, " ".join(map(str, heads)))

POS = "+document.getElementById('baHandle').getAttribute('aria-valuenow')"

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- Desktop ----------
    c, pg, errs, failed = open_page(b, viewport={"width": 1440, "height": 900})
    libs = pg.evaluate("({gsap: !!window.gsap, draggable: !!window.Draggable, inertia: !!window.InertiaPlugin, flip: !!window.Flip, split: !!window.SplitText, lenis: !!window.genixLenis})")
    check("[desktop] GSAP + Draggable + Inertia + Flip + SplitText + Lenis loaded", all(libs.values()), str(libs))
    check("[desktop] Lenis leaves touch scrolling native", pg.evaluate("window.genixLenis.options.syncTouch === false"))
    pg.screenshot(path=f"{OUT}/hu-desktop-hero.png")

    # regression: a click during the swing must win (the swing is cancelled, not replayed over it)
    c3 = b.new_context(viewport={"width": 1440, "height": 900}); p3 = c3.new_page()
    p3.goto(URL, wait_until="commit")
    p3.wait_for_function("+document.getElementById('baHandle').getAttribute('aria-valuenow') < 45", timeout=8000)
    bx = p3.locator("#ba").bounding_box()
    p3.mouse.click(bx["x"] + bx["width"] * 0.85, bx["y"] + bx["height"] / 2); p3.wait_for_timeout(2500)
    kept = p3.evaluate(POS); c3.close()
    check("[desktop] clicking during the swing keeps your position", 78 <= kept <= 92, f"{kept}%")

    # swing hint: watch from the moment the page starts loading (it's over in ~2s)
    c2 = b.new_context(viewport={"width": 1440, "height": 900}); p2 = c2.new_page()
    p2.goto(URL, wait_until="commit")
    samples = []
    for _ in range(40):
        try: samples.append(p2.evaluate(POS))
        except Exception: pass
        p2.wait_for_timeout(100)
    c2.close()
    check("[desktop] slider swings once to show it moves", samples and min(samples) < 45 and max(samples) > 55, f"range {min(samples)}–{max(samples)}")
    check("[desktop] …and settles back at 50%", samples[-1] == 50, str(samples[-1]))

    box = pg.locator("#ba").bounding_box()
    cy = box["y"] + box["height"] / 2
    # drag the handle to ~25%
    pg.mouse.move(box["x"] + box["width"] * 0.5, cy); pg.mouse.down()
    for f in [0.45, 0.4, 0.33, 0.27, 0.25]:
        pg.mouse.move(box["x"] + box["width"] * f, cy, steps=4); pg.wait_for_timeout(30)
    pg.wait_for_timeout(150); pg.mouse.up(); pg.wait_for_timeout(900)
    v = pg.evaluate(POS)
    check("[desktop] dragging moves the split", 15 <= v <= 35, f"{v}%")
    clip = pg.evaluate("getComputedStyle(document.querySelector('.ba-before')).clipPath")
    check("[desktop] mid-build image is clipped to the split", "inset" in clip, clip)
    # fling: fast drag right then release → inertia carries it further
    pg.mouse.move(box["x"] + box["width"] * 0.3, cy); pg.mouse.down()
    pg.mouse.move(box["x"] + box["width"] * 0.45, cy, steps=3); pg.mouse.up()
    right_after_release = pg.evaluate(POS); pg.wait_for_timeout(1200); settled = pg.evaluate(POS)
    check("[desktop] fling keeps gliding after release (inertia)", settled > right_after_release + 2, f"{right_after_release} → {settled}")
    # click to jump
    pg.mouse.click(box["x"] + box["width"] * 0.8, cy); pg.wait_for_timeout(300)
    v = pg.evaluate(POS)
    check("[desktop] clicking the image jumps the split there", 72 <= v <= 88, f"{v}%")
    # keyboard
    pg.locator("#baHandle").focus()
    pg.keyboard.press("Home"); home = pg.evaluate(POS)
    pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowRight"); arrows = pg.evaluate(POS)
    pg.keyboard.press("End"); end = pg.evaluate(POS)
    check("[desktop] keyboard: Home / arrows / End", (home, arrows, end) == (0, 10, 100), f"{home}, {arrows}, {end}")
    check("[desktop] slider announces its value", pg.evaluate("document.getElementById('baHandle').getAttribute('aria-valuetext')") == "100% mid-build")
    check("[desktop] slider focus is visible", pg.evaluate("getComputedStyle(document.querySelector('.ba-knob')).outlineStyle") != "none")

    # headline fits beside the slider; recent-work cards line up
    lines = pg.evaluate("document.querySelectorAll('.hero h1 > div').length")
    check("[desktop] hero headline ≤ 3 lines", 0 < lines <= 3, f"{lines} lines")
    hs = pg.evaluate("[...document.querySelectorAll('.work-grid > *')].map(e => Math.round(e.getBoundingClientRect().height))")
    check("[desktop] recent-work cards line up", len(set(hs)) == 1, str(hs))
    # project viewer
    pg.evaluate("document.getElementById('work').scrollIntoView()"); pg.wait_for_timeout(1200)
    # record the viewer photo's transform every frame from inside the page, so a
    # slow (software-rendered) frame can't make the test miss the animation
    pg.evaluate("""(() => { window.__tf = [];
        // start recording when the card is actually clicked, not on a fixed clock
        document.querySelector('.work-card').addEventListener('click', () => {
          const t0 = performance.now();
          const tick = () => { const m = document.querySelector('.viewer-media');
              if (m) window.__tf.push(getComputedStyle(m).transform);
              if (performance.now() - t0 < 2500) requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        }, { capture: true, once: true }); })()""")
    pg.locator(".work-card").first.click(); pg.wait_for_timeout(1500)
    tfs = pg.evaluate("window.__tf")
    moving = [t for t in tfs if t not in ("none", "matrix(1, 0, 0, 1, 0, 0)")]
    mid = {"tf": moving[0] if moving else "none", "open": pg.evaluate("document.getElementById('viewer').open")}
    pg.wait_for_timeout(700)
    pg.screenshot(path=f"{OUT}/hu-viewer.png")
    end_state = pg.evaluate("(() => { const m = document.querySelector('.viewer-media'), r = m.getBoundingClientRect(); return {tf: getComputedStyle(m).transform, w: r.width, title: document.getElementById('viewerTitle').textContent}; })()")
    check("[desktop] project opens in a dialog", mid and mid["open"], str(mid))
    check("[desktop] photo grows out of its card (Flip in progress)", len(moving) >= 3, f"{len(moving)} animated frames of {len(tfs)}")
    capv = pg.evaluate("(() => { const r = document.querySelector('.viewer-cap').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; })()")
    check("[desktop] viewer caption stays on screen", capv)
    check("[desktop] …and lands large", end_state["w"] > 700 and end_state["title"] == "Marble feature wall", str(end_state))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
    check("[desktop] Esc closes and returns focus to the card", not pg.evaluate("document.getElementById('viewer').open") and pg.evaluate("document.activeElement.classList.contains('work-card')"))
    pg.locator(".work-card").nth(1).click(); pg.wait_for_timeout(1500)
    vid = pg.evaluate("(() => { const v = document.querySelector('.viewer-media'); return {tag: v.tagName, playing: !v.paused, controls: v.controls}; })()")
    check("[desktop] video project plays with controls", vid == {"tag": "VIDEO", "playing": True, "controls": True}, str(vid))
    pg.locator("#viewerClose").click(); pg.wait_for_timeout(500)
    check("[desktop] close button closes and stops the video", not pg.evaluate("document.getElementById('viewer').open") and pg.locator(".viewer-media").count() == 0)

    # process line fills while scrolling
    pg.evaluate("document.getElementById('steps').scrollIntoView({block: 'start'})"); pg.wait_for_timeout(200)
    a_ = float(pg.evaluate("getComputedStyle(document.getElementById('steps')).getPropertyValue('--progress') || 1"))
    pg.evaluate("scrollBy(0, 500)"); pg.wait_for_timeout(900)
    b_ = float(pg.evaluate("getComputedStyle(document.getElementById('steps')).getPropertyValue('--progress') || 1"))
    check("[desktop] process line fills as you scroll", b_ > a_, f"{a_:.2f} → {b_:.2f}")
    pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(500)
    pg.keyboard.press("Tab")
    check("[desktop] keyboard focus visible", pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") not in ("none", ""))
    ph = pg.evaluate("[...document.querySelectorAll('.ph')].map(e => e.textContent.trim())")
    check("[desktop] placeholders are visibly marked", len(ph) >= 3, " | ".join(ph))
    pg.screenshot(path=f"{OUT}/hu-desktop-full.png", full_page=True)
    basics(pg, "desktop", errs, failed); c.close()

    # ---------- Mobile ----------
    dev = {k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"}
    c, pg, errs, failed = open_page(b, **dev)
    pg.screenshot(path=f"{OUT}/hu-mobile-hero.png")
    top = pg.evaluate("document.getElementById('ba').getBoundingClientRect().bottom <= innerHeight")
    check("[mobile] before/after is on the first screen", top)
    box = pg.locator("#ba").bounding_box(); cy = box["y"] + box["height"] / 2
    pg.touchscreen.tap(box["x"] + box["width"] * 0.2, cy); pg.wait_for_timeout(400)
    check("[mobile] tapping the image moves the split", pg.evaluate(POS) < 35, str(pg.evaluate(POS)))
    pg.locator("#menuBtn").click(); pg.wait_for_timeout(300)
    check("[mobile] menu opens with Get a quote", pg.locator(".nav").is_visible() and pg.locator(".nav-extra").is_visible())
    pg.locator(".nav a", has_text="Our work").click(); pg.wait_for_timeout(1200)
    check("[mobile] menu closes after a link", pg.locator("#menuBtn").get_attribute("aria-expanded") == "false")
    small = pg.evaluate("""[...document.querySelectorAll('a, button, [role=slider]')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
        return r.width && r.height && s.display !== 'none' && s.visibility !== 'hidden' && r.height < 40 && !e.closest('.site-footer, p'); }).map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height))""")
    check("[mobile] tap targets ≥ 40px", not small, ", ".join(small[:5]))
    pg.screenshot(path=f"{OUT}/hu-mobile-full.png", full_page=True)
    basics(pg, "mobile", errs, failed); c.close()

    # ---------- Reduced motion ----------
    c, pg, errs, failed = open_page(b, viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
    check("[reduced-motion] no smooth scrolling", not pg.evaluate("!!window.genixLenis"))
    s = [pg.evaluate(POS) for _ in range(5) if not pg.wait_for_timeout(200)]
    check("[reduced-motion] no swing animation", set(s) == {50}, str(s))
    pg.locator("#baHandle").focus(); pg.keyboard.press("ArrowLeft")
    check("[reduced-motion] slider still works by keyboard", pg.evaluate(POS) == 45)
    hidden = pg.evaluate("[...document.querySelectorAll('[data-reveal], [data-split]')].filter(e => getComputedStyle(e).opacity === '0' || getComputedStyle(e).visibility === 'hidden').length")
    check("[reduced-motion] all content visible", hidden == 0, f"{hidden} hidden")
    basics(pg, "reduced-motion", errs, failed); c.close()

    # ---------- No JavaScript ----------
    c = b.new_context(viewport={"width": 1280, "height": 800}, java_script_enabled=False); pg = c.new_page()
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    check("[no-js] headline, slider images and sections readable",
          pg.locator("h1").is_visible() and pg.locator(".ba img").first.is_visible() and pg.locator("#process h2").is_visible())
    check("[no-js] slider shows a 50/50 split", "50%" in pg.evaluate("getComputedStyle(document.getElementById('ba')).getPropertyValue('--pos')"))
    c.close(); b.close()

print(f"\n{sum(results)}/{len(results)} passed. Screenshots in {OUT}")
sys.exit(0 if all(results) else 1)
