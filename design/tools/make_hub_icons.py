"""Usage: pip install pillow playwright, then: python design/tools/make_hub_icons.py

Genix Group (hub) favicons + app icons from the new group mark, assets/genix-mark.svg
(made by trace_group_logo_v2.py). Multimedia has no icons of its own yet and uses these.
  * tab sizes (svg, ico, 16/32/96 png): the hexagon mark on a transparent square
  * home-screen sizes (180/192/512): the mark on a paper full-bleed square
    (iOS/Android mask the corners themselves)
Writes assets/hub-icons/ and copies it to web/public/icons/hub/.
"""
import re
import shutil
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
MARK = (HERE.parent / "assets" / "genix-mark.svg").read_text(encoding="utf-8")
OUT = HERE.parent / "assets" / "hub-icons"
PUBLIC = HERE.parent.parent / "web" / "public" / "icons" / "hub"
PAPER = "#F5F3EE"   # the hub's page colour
OUT.mkdir(exist_ok=True)

w, h = (float(v) for v in re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', MARK).groups())
paths = "\n".join("  " + p for p in re.findall(r"<path [^>]*/>", MARK))


def square(fill_ratio, bg=None, title="The Genix Group"):
    """A square SVG with the mark centred, its height = fill_ratio of the side."""
    side = h / fill_ratio
    x0, y0 = w / 2 - side / 2, h / 2 - side / 2
    rect = f'  <rect x="{x0:.2f}" y="{y0:.2f}" width="{side:.2f}" height="{side:.2f}" fill="{bg}"/>\n' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {y0:.2f} {side:.2f} {side:.2f}" width="512" height="512">\n'
            f"  <title>{title}</title>\n{rect}{paths}\n</svg>\n")


def render(svg, size, path, transparent):
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": size, "height": size})
        pg.set_content('<body style="margin:0;background:transparent">'
                       + svg.replace('width="512" height="512"', f'width="{size}" height="{size}" style="display:block"') + "</body>")
        pg.screenshot(path=str(path), omit_background=transparent); b.close()


# --- tab icons: mark nearly fills the square so it reads at 16px
tab = square(0.98)
(OUT / "favicon.svg").write_text(tab, encoding="utf-8")
render(tab, 1024, OUT / "_big.png", transparent=True)   # render large once, then downsample
big = Image.open(OUT / "_big.png").convert("RGBA")
for sz in (16, 32, 96):
    big.resize((sz, sz), Image.LANCZOS).save(OUT / f"favicon-{sz}x{sz}.png", optimize=True)
big.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
(OUT / "_big.png").unlink()

# --- app icons: mark on paper, with room for the platform's corner mask
app = square(0.72, bg=PAPER)
for name, sz in [("apple-touch-icon.png", 180), ("android-chrome-192x192.png", 192), ("android-chrome-512x512.png", 512)]:
    render(app, sz, OUT / name, transparent=False)

(OUT / "site.webmanifest").write_text("""{
  "name": "The Genix Group",
  "short_name": "Genix Group",
  "icons": [
    { "src": "android-chrome-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "android-chrome-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ],
  "theme_color": "#0B0B0C",
  "background_color": "#F5F3EE",
  "display": "browser"
}
""", encoding="utf-8")

PUBLIC.mkdir(parents=True, exist_ok=True)
for f in sorted(OUT.iterdir()):
    shutil.copy2(f, PUBLIC / f.name)
    print(f"{f.name:30} {f.stat().st_size / 1024:6.1f} KB")
