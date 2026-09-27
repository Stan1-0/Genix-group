"""Checks for the SplitText headline on design/hub-home.html."""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321/hub-home.html"
OUT = os.path.join(os.path.dirname(__file__), "shots")
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

H1 = """(() => { const h = document.querySelector('.hero h1');
  const lines = [...h.querySelectorAll('[class*="line"]')].filter(e => !e.parentElement.closest('[class*="line"]') || e.parentElement.matches('[class*="mask"]'));
  const inner = [...h.querySelectorAll('div, span')].filter(e => getComputedStyle(e).display === 'block' && e.textContent.trim());
  const moved = inner.map(e => new DOMMatrix(getComputedStyle(e).transform).m42).filter(y => Math.abs(y) > 0.5).length;
  const gold = [...h.querySelectorAll('.gold')].map(e => getComputedStyle(e).color);
  return { vis: getComputedStyle(h).visibility, aria: h.getAttribute('aria-label'), text: h.textContent.replace(/\\s+/g, ' ').trim(),
           blocks: inner.length, moved, gold, pending: document.documentElement.classList.contains('h1-pending'),
           masks: [...h.children].filter(e => getComputedStyle(e).overflow === 'clip' && e.querySelector('.h1-line')).length }; })()"""
FULL = "We Haul It. We Build It. We Show It."

with sync_playwright() as p:
    b = p.chromium.launch()

    # Desktop: animation runs and settles
    c = b.new_context(viewport={"width": 1440, "height": 900}); pg = c.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    splitjs = []
    pg.on("response", lambda r: "SplitText" in r.url and splitjs.append(r.status))
    pg.goto(URL)
    # sample from load until a line is caught mid-flight (animation timing depends on cache)
    mid = {"moved": 0}
    for _ in range(60):
        mid = pg.evaluate(H1)
        if mid["moved"] > 0: break
        pg.wait_for_timeout(40)
    pg.screenshot(path=f"{OUT}/split-mid.png")
    pg.wait_for_timeout(2500)
    end = pg.evaluate(H1); pg.screenshot(path=f"{OUT}/split-end.png")
    check("SplitText plugin loads", splitjs == [200], str(splitjs))
    check("headline split into masked lines", end["masks"] >= 2, f"{end['masks']} masks")
    check("lines are moving mid-animation", mid["moved"] > 0, f"{mid['moved']} lines caught in motion")
    check("lines settle in place", end["moved"] == 0 and end["vis"] == "visible" and not end["pending"], str({k: end[k] for k in ('moved', 'vis', 'pending')}))
    check("screen readers get the whole sentence", (end["aria"] or "").replace("  ", " ").strip() == FULL or end["text"] == FULL, f"aria={end['aria']!r}")
    geo = pg.evaluate("""(() => { const h = document.querySelector('.hero h1'), fs = parseFloat(getComputedStyle(h).fontSize);
        const masks = [...h.children]; const tops = masks.map(m => m.querySelector('.h1-line').getBoundingClientRect().top);
        return { room: masks.map(m => m.getBoundingClientRect().height / fs), step: tops.slice(1).map((t, i) => (t - tops[i]) / fs) }; })()""")
    check("descenders not clipped (mask ≥ 1.15em)", all(r >= 1.15 for r in geo["room"]), str([round(r, 2) for r in geo["room"]]))
    check("line spacing unchanged (1em steps)", all(abs(s - 1) < 0.02 for s in geo["step"]), str([round(x, 3) for x in geo["step"]]))
    check("gold words keep their gold", end["gold"] and all(g == "rgb(168, 116, 26)" for g in end["gold"]), str(end["gold"]))

    # Resize: re-wraps without replaying
    pg.set_viewport_size({"width": 1000, "height": 900}); pg.wait_for_timeout(400)
    rs = pg.evaluate(H1)
    check("resize re-splits without replaying", rs["moved"] == 0 and rs["vis"] == "visible", f"{rs['moved']} lines offset after resize")
    check("no errors", not errs, "; ".join(errs[:3]))
    c.close()

    # Mobile
    d = {k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"}
    c = b.new_context(**d); pg = c.new_page(); pg.goto(URL); pg.wait_for_timeout(3200)
    m = pg.evaluate(H1); pg.screenshot(path=f"{OUT}/split-mobile.png")
    check("[mobile] headline settles and is visible", m["moved"] == 0 and m["vis"] == "visible", str({k: m[k] for k in ('moved', 'vis', 'masks')}))
    c.close()

    # Reduced motion: never hidden, never split
    c = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce"); pg = c.new_page()
    pg.goto(URL); pg.wait_for_timeout(150)
    r = pg.evaluate(H1)
    check("[reduced-motion] visible immediately, not split", r["vis"] == "visible" and r["masks"] == 0, str({k: r[k] for k in ('vis', 'masks', 'pending')}))
    c.close()

    # CDN down: headline still appears via the fallback timer
    c = b.new_context(viewport={"width": 1280, "height": 800}); pg = c.new_page()
    pg.route("**/cdn.jsdelivr.net/**", lambda route: route.abort())
    pg.goto(URL); pg.wait_for_timeout(500)
    hidden_early = pg.evaluate(H1)["vis"]
    pg.wait_for_timeout(3000)
    late = pg.evaluate(H1)
    check("[no GSAP] headline revealed by fallback", late["vis"] == "visible" and late["text"] == FULL, f"at 0.5s: {hidden_early}, at 3.5s: {late['vis']}")
    c.close()

    # No JS at all
    c = b.new_context(viewport={"width": 1280, "height": 800}, java_script_enabled=False); pg = c.new_page()
    pg.goto(URL); pg.wait_for_timeout(300)
    check("[no-js] headline visible", pg.locator(".hero h1").is_visible())
    c.close(); b.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
