"""Checks for the hero-logo → header docking on design/hub-home.html."""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321/hub-home.html"
OUT = os.path.join(os.path.dirname(__file__), "shots")
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

STATE = """(() => {
  const vis = el => getComputedStyle(el).visibility === 'visible' && el.getBoundingClientRect().bottom > 0;
  const lock = document.querySelector('.lockup'), head = document.querySelector('.site-header .logo');
  const r = el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 10) / 10); };
  return { lockVisible: vis(lock), headVisible: vis(head),
           lockMark: r(lock.querySelector('.lockup-mark')), lockWord: r(lock.querySelector('.lockup-word')),
           headMark: r(head.querySelector('.logo-mark')), headWord: r(head.querySelector('.logo-word')),
           transform: getComputedStyle(lock).transform }; })()"""
DOCK_D = """(() => { const l = document.querySelector('.lockup'), t = l.style.transform; l.style.transform = 'none';
  const L = l.getBoundingClientRect(), H = document.querySelector('.site-header .logo-mark').getBoundingClientRect();
  l.style.transform = t; return L.top + scrollY - H.top; })()"""

def run(label, ctx, reduced=False):
    c = b.new_context(**ctx, reduced_motion="reduce" if reduced else "no-preference"); pg = c.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(2500)
    D = pg.evaluate(DOCK_D)
    s0 = pg.evaluate(STATE)
    check(f"[{label}] at the top: only the hero logo shows", s0["lockVisible"] and not s0["headVisible"], f"hero={s0['lockVisible']} header={s0['headVisible']}")
    pg.screenshot(path=f"{OUT}/dock-{label}-0.png")

    pg.evaluate(f"scrollTo(0, {D * 0.5})"); pg.wait_for_timeout(250)
    s1 = pg.evaluate(STATE)
    if not reduced:
        check(f"[{label}] halfway: logo shrinking, still one logo", s1["lockVisible"] and not s1["headVisible"] and s0["lockMark"][3] > s1["lockMark"][3] > s0["headMark"][3], f"mark height {s0['lockMark'][3]} → {s1['lockMark'][3]}")
        pg.screenshot(path=f"{OUT}/dock-{label}-half.png")
        # just before the swap the flying logo must sit on the header logo
        pg.evaluate(f"scrollTo(0, {D - 0.5})"); pg.wait_for_timeout(250)
        s2 = pg.evaluate(STATE)
        err = max(max(abs(a - b) for a, b in zip(s2["lockMark"], s2["headMark"])), max(abs(a - b) for a, b in zip(s2["lockWord"], s2["headWord"])))
        check(f"[{label}] lands exactly on the header logo", err <= 1.5, f"max offset {err:.1f}px  mark {s2['lockMark']} vs {s2['headMark']}; word {s2['lockWord']} vs {s2['headWord']}")
    else:
        check(f"[{label}] no movement for reduced motion", s1["transform"] == "none", s1["transform"])

    pg.evaluate(f"scrollTo(0, {D + 2})"); pg.wait_for_timeout(250)
    s3 = pg.evaluate(STATE)
    check(f"[{label}] docked: only the header logo shows", s3["headVisible"] and not s3["lockVisible"], f"hero={s3['lockVisible']} header={s3['headVisible']}")
    pg.screenshot(path=f"{OUT}/dock-{label}-docked.png")
    pg.evaluate("scrollTo(0, 2500)"); pg.wait_for_timeout(250)
    s4 = pg.evaluate(STATE)
    check(f"[{label}] further down: header logo stays", s4["headVisible"] and not s4["lockVisible"])
    pg.evaluate("scrollTo(0, 0)"); pg.wait_for_timeout(300)
    s5 = pg.evaluate(STATE)
    check(f"[{label}] back at the top: reverses cleanly", s5["lockVisible"] and not s5["headVisible"] and s5["lockMark"] == s0["lockMark"], f"{s5['lockMark']} vs {s0['lockMark']}")
    check(f"[{label}] no errors", not errs, "; ".join(errs[:3]))
    c.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    run("desktop", {"viewport": {"width": 1440, "height": 900}})
    run("laptop", {"viewport": {"width": 1024, "height": 700}})
    run("mobile", {k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"})
    run("reduced-motion", {"viewport": {"width": 1280, "height": 800}}, reduced=True)
    # no JS: both stay visible (nothing is hidden without the script)
    c = b.new_context(viewport={"width": 1280, "height": 800}, java_script_enabled=False); pg = c.new_page(); pg.goto(URL)
    check("[no-js] header logo and hero logo both visible", pg.locator(".site-header .logo").is_visible() and pg.locator(".lockup").is_visible())
    c.close(); b.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
