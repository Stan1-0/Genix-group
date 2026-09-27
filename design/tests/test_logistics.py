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


if __name__ == "__main__":
    run(sys.argv)
