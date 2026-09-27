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
    check("[no-js] form keeps native validation", pg.get_attribute("#quote-form", "novalidate") is None)
    check("[no-js] ZIP has a native 5-digit pattern", pg.get_attribute("#qFrom", "pattern") == "[0-9]{5}")
    c.close()


def load_values(pg):
    return pg.evaluate("[...document.querySelectorAll('#qLoad option')].map(o => o.value)")


BUSINESS = ["", "pallets", "parcels", "truckload", "courier"]
MOVE = ["", "studio", "1-2bed", "3bed", "office"]


@test("form")
def t_form(b):
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    v = pg.is_visible
    check("[form] step 2 starts hidden", v("#qFrom") and not v("#qName"))
    check("[form] JS mode uses custom validation", pg.evaluate("document.getElementById('quote-form').noValidate") is True)
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


@test("tab-on-step2")
def t_tab_on_step2(b):
    c, pg, errs, failed = open_page(b, URL, **DESKTOP)
    v = pg.is_visible
    pg.fill("#qFrom", "92101"); pg.fill("#qTo", "92024"); pg.fill("#qDate", "2099-01-15")
    pg.select_option("#qLoad", "parcels")
    pg.click("#qNext")
    check("[tab-on-step2] reached step 2", v("#qName") and not v("#qFrom"))
    pg.click(".kind label:has-text('Plan a move')")
    check("[tab-on-step2] switching tabs mid-step-2 returns to step 1", v("#qFrom") and not v("#qName"))
    check("[tab-on-step2] ...with the move options loaded", load_values(pg) == MOVE, str(load_values(pg)))
    c.close()


@test("start-quote-reduced")
def t_start_quote_reduced(b):
    ctx = dict(DESKTOP, reduced_motion="reduce")
    c, pg, errs, failed = open_page(b, URL, **ctx)
    pg.evaluate("document.getElementById('quote').scrollIntoView()")
    pg.wait_for_timeout(300)
    pg.click("#quote [data-start-quote]")
    pg.wait_for_timeout(300)
    check("[start-quote-reduced] focus lands on the first field", pg.evaluate("document.activeElement.id") == "qFrom")
    top = pg.evaluate("document.getElementById('quote-form').getBoundingClientRect().top")
    check("[start-quote-reduced] the form scrolls into view without Lenis", 0 <= top < 400, f"{top:.0f}px")
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


if __name__ == "__main__":
    run(sys.argv)
