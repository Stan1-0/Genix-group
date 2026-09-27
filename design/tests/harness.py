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
