"""Usage: pip install potracer numpy pillow playwright, then (with the design
server NOT required): python design/tools/make_logistics_icons.py

Genix Logistics favicons + app icons from assets/source/logistics-logo-original.png.
The logo's mark (truck + speed lines) is ~3:1, too wide for a square tab icon:
  * tab sizes (svg, ico, 16/32/96 png): the gold "G" from the truck, traced to
    a vector, on a navy rounded tile
  * home-screen sizes (180/192/512): the whole truck on a white full-bleed
    square (iOS/Android mask the corners themselves)
Colours are the logo's own: navy #022248, gold #C28A2C (same as the group gold).
"""
import re
import numpy as np
from pathlib import Path
from PIL import Image
from tracelib import coverage, upmask, smooth, curves

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "assets" / "source" / "logistics-logo-original.png"
OUT = HERE.parent / "assets" / "logistics-icons"
NAVY, GOLD = "#022248", "#C28A2C"
OUT.mkdir(exist_ok=True)

rgba = np.array(Image.open(SRC).convert("RGBA")).astype(float)
alpha = rgba[..., 3] / 255
rgb = rgba[..., :3] * alpha[..., None] + 255 * (1 - alpha[..., None])  # onto white
cov = coverage(rgb, np.ones(alpha.shape), {"gold": [(194, 136, 36)], "grey": [(55, 64, 70)], "navy": [(0, 34, 71)]}, bg=(255, 255, 255))

# --- the G: gold ink on the truck, minus the speed streak that runs into its lower left
gold = cov["gold"].copy()
gold[:, :300] = 0; gold[125:, :] = 0
# The streak (y 104-115) merges into the G at x 330-339. Cut along the G's own
# bottom edge, which rises ~1px per column leftward from (340, 104).
for x in range(296, 340):
    gold[int(104 - (340 - x)):125, x] = 0
BOX = (296, 16, 452, 122)                # G bbox 300-446 x 22-116, plus a little air
d = curves(smooth(upmask(gold, BOX), 0.35), turd=3, alphamax=1.0, dx=BOX[0], dy=BOX[1])

# square tile centred on the G (source px coordinates)
gx0, gy0, gx1, gy1 = 300, 22, 446, 116
S = (gx1 - gx0) * 1.2                    # G fills ~83% of the tile width: legible at 16px
cx, cy = (gx0 + gx1) / 2, (gy0 + gy1) / 2
x0, y0 = cx - S / 2, cy - S / 2
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {y0:.2f} {S:.2f} {S:.2f}" width="512" height="512">\n'
       f'  <title>Genix Logistics</title>\n'
       f'  <rect x="{x0:.2f}" y="{y0:.2f}" width="{S:.2f}" height="{S:.2f}" rx="{S * 0.22:.2f}" fill="{NAVY}"/>\n'
       f'  <path fill="{GOLD}" fill-rule="evenodd" d="{d}"/>\n</svg>\n')
(OUT / "favicon.svg").write_text(svg, encoding="utf-8")

# rasterise the SVG once, large, then downsample (sharper than rendering tiny)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1024, "height": 1024})
    pg.set_content('<body style="margin:0">' + svg.replace('width="512" height="512"', 'width="1024" height="1024" style="display:block"') + "</body>")
    pg.screenshot(path=str(OUT / "_g-1024.png"), omit_background=True); b.close()
g = Image.open(OUT / "_g-1024.png").convert("RGBA")
for sz in (16, 32, 96):
    g.resize((sz, sz), Image.LANCZOS).save(OUT / f"favicon-{sz}x{sz}.png", optimize=True)
g.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
(OUT / "_g-1024.png").unlink()

# --- app icons: the whole truck on white, full bleed, rendered from the vector
# logo (genix-logistics-logo.svg, made by trace_logistics_logo.py) so 512px is sharp.
# Its coordinates are the PNG's minus (6, 8); the mark is PNG x 142-627, y 12-177.
logo = (HERE.parent / "assets" / "genix-logistics-logo.svg").read_text(encoding="utf-8")
mx, my, mw, mh = 142 - 6, 12 - 8, 486, 166
for name, sz in [("apple-touch-icon.png", 180), ("android-chrome-192x192.png", 192), ("android-chrome-512x512.png", 512)]:
    w = sz * 0.88; pad = (sz - w) / sz / 0.88 * mw / 2                  # side padding in logo units
    vb_w = mw + 2 * pad; vb_x, vb_y = mx - pad, my + mh / 2 - vb_w / 2   # square viewBox centred on the truck
    mark_paths = "".join(re.findall(r"<path [^>]*/>", logo)[:2])        # truck (grey) + G (gold) only
    tile = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x:.2f} {vb_y:.2f} {vb_w:.2f} {vb_w:.2f}" '
            f'style="display:block;width:{sz}px;height:{sz}px">{mark_paths}</svg>')
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": sz, "height": sz})
        pg.set_content(f'<body style="margin:0;background:#fff">{tile}</body>')
        pg.screenshot(path=str(OUT / name)); b.close()

(OUT / "site.webmanifest").write_text("""{
  "name": "Genix Logistics",
  "short_name": "Genix Logistics",
  "icons": [
    { "src": "android-chrome-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "android-chrome-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ],
  "theme_color": "#022248",
  "background_color": "#ffffff",
  "display": "browser"
}
""", encoding="utf-8")
for f in sorted(OUT.iterdir()):
    print(f"{f.name:30} {f.stat().st_size / 1024:6.1f} KB")
