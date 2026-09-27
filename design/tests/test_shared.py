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
