"""Checks for the 3D 'Watch the build' section on the Home Upgrades home page."""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321/homeupgrades-home.html"
OUT = os.path.join(os.path.dirname(__file__), "shots")
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

STATE = "(() => { const s = window.__build && window.__build.state; if (!s) return null; const o = {}; for (const k of ['slats','marble','tv','console','light']) o[k] = s[k]; o.step = [...document.querySelectorAll('#build .step3d')].findIndex(e => e.classList.contains('on')); return o; })()"

def track(pg):
    return pg.evaluate("(() => { const b = document.getElementById('build'); return { top: b.offsetTop - 76, len: b.offsetHeight - innerHeight }; })()")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])

    # ---------- desktop ----------
    c = b.new_context(viewport={"width": 1440, "height": 900}); pg = c.new_page()
    three = []; errs = []
    pg.on("request", lambda r: "three" in r.url and "module" in r.url and three.append(r.url))
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
    check("section sits right after 'Recent work' (real work first)", pg.evaluate("(() => { let e = document.getElementById('work').nextElementSibling; while (e && e.tagName !== 'SECTION') e = e.nextElementSibling; return e && e.id; })()") == "build")
    check("3D mode chosen during page load", pg.evaluate("document.getElementById('build').classList.contains('is3d')"))
    check("Three.js NOT downloaded on first load", not three, f"{len(three)} requests")
    t = track(pg)
    pg.evaluate(f"scrollTo(0, {t['top'] - 1400})"); pg.wait_for_timeout(1800)
    check("Three.js loads as the section approaches", len(three) == 1 and pg.evaluate("window.__build && window.__build.mode") == "3d", f"{len(three)} requests")
    shots = {}
    for i, f in enumerate([0.0, 0.2, 0.4, 0.56, 0.7, 0.92]):
        pg.evaluate(f"scrollTo(0, {t['top'] + t['len'] * f})"); pg.wait_for_timeout(1400)
        shots[f] = pg.evaluate(STATE); pg.screenshot(path=f"{OUT}/home3d-{i}.png")
        print("   ", f, shots[f])
    s0, s9 = shots[0.0], shots[0.92]
    check("starts as a bare wall", s0["slats"] < 0.05 and s0["step"] == 0)
    check("fully built and lit near the end", all(s9[k] > 0.95 for k in ("slats", "marble", "tv", "console", "light")) and s9["step"] == 4)
    bars = pg.evaluate("[...document.querySelectorAll('#build .progress3d i')].map(i => +(i.style.getPropertyValue('--f') || 0))")
    check("progress bars fill as you scroll", len(bars) == 5 and all(v > 0.95 for v in bars), str([round(v, 2) for v in bars]))
    check("steps advance in order", [shots[f]["step"] for f in (0.0, 0.2, 0.4, 0.56, 0.7)] == [0, 1, 2, 3, 4], str([shots[f]["step"] for f in shots]))
    href = pg.evaluate("document.querySelector('#build .step3d[data-step=\"4\"] .cta').getAttribute('href')")
    check("final step's button goes to the quote section", href == "#quote" and pg.locator("#quote").count() == 1)
    # the page continues normally after the section
    pg.evaluate(f"scrollTo(0, {t['top'] + t['len'] + 200})"); pg.wait_for_timeout(1000)
    check("'How a project runs' follows the section", pg.evaluate("document.getElementById('build').nextElementSibling.id") == "process")
    check("no console/page errors", not errs, "; ".join(errs[:3]))
    check("no horizontal overflow", pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0)
    c.close()

    # ---------- mobile ----------
    d = {k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"}
    c = b.new_context(**d); pg = c.new_page(); pg.goto(URL); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1000)
    t = track(pg)
    pg.evaluate(f"scrollTo(0, {t['top'] - 1400})"); pg.wait_for_timeout(1800)
    pg.evaluate(f"scrollTo(0, {t['top'] + t['len'] * 0.92})"); pg.wait_for_timeout(1600)
    pg.screenshot(path=f"{OUT}/home3d-mobile-end.png")
    st = pg.evaluate(STATE)
    check("[mobile] builds and lights", st and st["light"] > 0.95, str(st))
    check("[mobile] no horizontal overflow", pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0)
    c.close()

    # ---------- reduced motion ----------
    c = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce"); pg = c.new_page()
    three.clear(); pg.on("request", lambda r: "three" in r.url and "module" in r.url and three.append(r.url))
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.evaluate("document.getElementById('build').scrollIntoView()"); pg.wait_for_timeout(1200)
    check("[reduced-motion] photo + steps instead of 3D", not pg.evaluate("document.getElementById('build').classList.contains('is3d')") and pg.locator("#build .fallback li").count() == 5 and pg.locator("#build .fallback img").is_visible())
    check("[reduced-motion] Three.js never downloaded", not three)
    c.close()

    # ---------- no JS ----------
    c = b.new_context(viewport={"width": 1280, "height": 800}, java_script_enabled=False); pg = c.new_page()
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.evaluate if False else None
    pg.locator("#build .fallback").scroll_into_view_if_needed()
    check("[no-js] photo + steps readable", pg.locator("#build .fallback img").is_visible() and pg.locator("#build .fallback li").count() == 5)
    c.close(); b.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
