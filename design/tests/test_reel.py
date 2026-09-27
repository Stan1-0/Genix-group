"""Regression suite for design/hub-home.html (logo lockup + footage reel)."""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4321/hub-home.html"
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
    pg.goto(URL); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(2500)
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
    check(f"[{label}] every image has alt", no_alt == 0, f"{no_alt} missing")
    unnamed = pg.evaluate("[...document.querySelectorAll('button')].filter(b => !(b.getAttribute('aria-label') || b.textContent.trim())).length")
    check(f"[{label}] every button has a name", unnamed == 0, f"{unnamed} unnamed")

REEL = """(() => { const sl=[...document.querySelectorAll('.reel .slide')];
  const op = sl.map(x => +getComputedStyle(x).opacity), cap = sl.map(x => +getComputedStyle(x.querySelector('.reel-cap')).opacity);
  return { on: sl.findIndex(x => x.classList.contains('on')), names: sl.map(x => x.dataset.name), op, cap,
           label: document.getElementById('nowName').textContent,
           pressed: [...document.querySelectorAll('.now-dots button')].map(b => b.getAttribute('aria-pressed')) }; })()"""

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- Desktop ----------
    c, pg, errs, failed = open_page(b, viewport={"width": 1440, "height": 900})
    pg.screenshot(path=f"{OUT}/reel-desktop.png")
    logo = pg.evaluate("[...document.querySelectorAll('.lockup img')].map(i => ({src: i.getAttribute('src'), filter: getComputedStyle(i).filter, t: getComputedStyle(i).transform}))")
    check("[desktop] hero logo is the supplied artwork, untransformed",
          all(l["filter"] == "none" and l["t"] in ("none", "matrix(1, 0, 0, 1, 0, 0)") for l in logo) and {l["src"] for l in logo} == {"assets/genix-mark.svg", "assets/genix-wordmark.svg"}, str(logo))
    reel_box = pg.locator(".reel-frame").bounding_box()
    check("[desktop] reel on the first screen", reel_box["y"] + reel_box["height"] <= 900, f"bottom {reel_box['y'] + reel_box['height']:.0f}")
    # Reel checks on a fresh page, timed from load: the reel auto-advances every
    # 4.2s, so checking after "network idle + 2.5s" raced the first advance.
    rp = c.new_page(); rp.goto(URL, wait_until="load")
    r = rp.evaluate(REEL)
    check("[desktop] opens on real Home Upgrades work", r["names"][r["on"]] == "Home Upgrades", r["names"][r["on"]])
    try:
        rp.wait_for_function("(() => { const v = document.querySelector('.reel video'); return !v.paused && v.classList.contains('playing'); })()", timeout=3000)
        playing = True
    except Exception:
        playing = False
    check("[desktop] Home Upgrades video playing", playing)
    rp.locator(".now-dots button").nth(2).click(); rp.wait_for_timeout(100)
    early = rp.evaluate(REEL)
    rp.wait_for_timeout(1400)
    late = rp.evaluate(REEL)
    check("[desktop] dot selects the slide", late["names"][late["on"]] == "Multimedia" and late["pressed"] == ["false", "false", "true"], str(late["pressed"]))
    check("[desktop] label waits for the picture", early["label"] == "Home Upgrades", f"100ms after click: {early['label']}")
    check("[desktop] label matches the picture once it's in", late["label"] == "Multimedia", late["label"])
    check("[desktop] only the active caption shows", sum(1 for x in late["cap"] if x > 0.05) == 1, str(late["cap"]))
    rp.close()

    # sample a full auto-advance: never a dip, never two captions
    dips = doubles = 0
    for _ in range(40):
        s = pg.evaluate(REEL)
        dips += max(s["op"]) < 0.99
        doubles += sum(1 for x in s["cap"] if x > 0.05) > 1
        pg.wait_for_timeout(150)
    check("[desktop] crossfades never dip to black", dips == 0, f"{dips} frames")
    check("[desktop] never two captions at once", doubles == 0, f"{doubles} frames")

    # panels + routes
    for key in ["move", "make", "tell"]:
        pg.evaluate(f"document.getElementById('div-{key}').scrollIntoView()"); pg.wait_for_timeout(1300)
        clip = pg.evaluate(f"getComputedStyle(document.querySelector('#div-{key} .panel-media')).clipPath")
        check(f"[desktop] {key} panel opens fully", clip in ("none", "inset(0%)", "inset(0px)"), clip)
    hrefs = pg.eval_on_selector_all(".option", "els => els.map(e => e.getAttribute('href'))")
    check("[desktop] route cards link to each division", hrefs == [f"https://{d}.thegenixgroup.com/contact" for d in ("logistics", "homeupgrades", "multimedia")], str(hrefs))
    reel_video_paused = pg.evaluate("document.querySelector('.reel video').paused")
    check("[desktop] reel video pauses when scrolled away", reel_video_paused)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300); pg.keyboard.press("Tab")
    check("[desktop] keyboard focus visible", pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") not in ("none", ""))
    basics(pg, "desktop", errs, failed); c.close()

    # ---------- Mobile ----------
    dev = {k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"}
    c, pg, errs, failed = open_page(b, **dev)
    pg.screenshot(path=f"{OUT}/reel-mobile.png")
    m = pg.evaluate("""(() => { const q = s => document.querySelector(s).getBoundingClientRect();
        const l = q('.lockup'), f = q('.reel-frame'), h = q('h1'); return { vh: innerHeight, lb: l.bottom, ft: f.top, fb: f.bottom, ht: h.top }; })()""")
    check("[mobile] order is logo → reel → headline", m["lb"] <= m["ft"] and m["fb"] <= m["ht"], str(m))
    check("[mobile] reel fully on the first screen", m["fb"] <= m["vh"], f"reel bottom {m['fb']:.0f} / {m['vh']}")
    check("[mobile] desktop nav hidden", not pg.locator(".nav").is_visible())
    pg.locator("#menuBtn").click(); pg.wait_for_timeout(300)
    check("[mobile] menu opens", pg.locator(".nav").is_visible())
    pg.locator(".nav a", has_text="Our businesses").click(); pg.wait_for_timeout(1200)
    check("[mobile] menu closes after a link", pg.locator("#menuBtn").get_attribute("aria-expanded") == "false")
    small = pg.evaluate("""[...document.querySelectorAll('a, button')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
        return r.width && r.height && s.display !== 'none' && r.height < 40 && !e.closest('.site-footer, .facts, p'); }).map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height))""")
    check("[mobile] tap targets ≥ 40px", not small, ", ".join(small[:5]))
    basics(pg, "mobile", errs, failed); c.close()

    # ---------- Reduced motion ----------
    c, pg, errs, failed = open_page(b, viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
    r1 = pg.evaluate(REEL); pg.wait_for_timeout(5000); r2 = pg.evaluate(REEL)
    check("[reduced-motion] reel doesn't auto-advance", r1["on"] == r2["on"], f"{r1['on']} → {r2['on']}")
    check("[reduced-motion] no video autoplay", pg.evaluate("[...document.querySelectorAll('video')].every(v => v.paused)"))
    pg.locator(".now-dots button").nth(0).click(); pg.wait_for_timeout(100)
    r3 = pg.evaluate(REEL)
    check("[reduced-motion] dots still work, instantly", r3["names"][r3["on"]] == "Logistics" and r3["label"] == "Logistics", f"{r3['names'][r3['on']]} / {r3['label']}")
    hidden = pg.evaluate("[...document.querySelectorAll('[data-reveal]')].filter(e => getComputedStyle(e).opacity === '0').length")
    check("[reduced-motion] all content visible", hidden == 0, f"{hidden} hidden")
    basics(pg, "reduced-motion", errs, failed); c.close()

    # ---------- No JavaScript ----------
    c = b.new_context(viewport={"width": 1280, "height": 800}, java_script_enabled=False); pg = c.new_page()
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    check("[no-js] headline, reel photo and panels readable",
          pg.locator("h1").is_visible() and pg.locator(".slide.on img").is_visible() and pg.locator("#div-make h3").is_visible())
    c.close(); b.close()

print(f"\n{sum(results)}/{len(results)} passed. Screenshots in {OUT}")
sys.exit(0 if all(results) else 1)
