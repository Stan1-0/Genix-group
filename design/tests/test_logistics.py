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
