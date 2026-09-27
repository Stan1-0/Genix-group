"""Usage: pip install potracer numpy pillow, then: python design/tools/trace_hu_logo.py

Redraw the Genix Home Upgrade logo as clean SVG from its JPEG.
Bands (source px): icon y 95-530 (house, hammer, plane), wordmark y 555-735
(GENIX), tagline y 760-812 ("HOME UPGRADE" + gold rules).
  wordmark -> straight-edged polygons (geometric letters)
  icon, tagline -> smooth curves
Colours are the logo's own: navy + gold (division logos keep navy).
"""
import numpy as np
from pathlib import Path
from PIL import Image
from tracelib import coverage, upmask, smooth, polygons, curves, svg, components, dilate

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "assets" / "logo-home-upgrades.jpg"
OUT = HERE.parent / "assets"
FILLS = {"navy": "#022248", "gold": "#C28A2C"}

img = np.array(Image.open(SRC).convert("RGB")).astype(float)
alpha = np.ones(img.shape[:2])
# JPEG noise: the near-black and the blue-black readings are all the same navy
cov = coverage(img, alpha, {"navy": [(2, 34, 72), (12, 18, 50)], "gold": [(196, 135, 34), (205, 145, 45), (180, 140, 45)]}, bg=(255, 255, 255))

X0, X1 = 284, 1260
ICON, WORD, TAG = (X0, 92, X1, 532), (X0, 552, X1, 738), (X0, 758, X1, 814)

layers = []
def band_dxdy(box): return box[0] - X0, box[1] - ICON[1]   # all bands share the lockup's coordinates

# --- icon: split navy into straight-edged parts (house, wall, window panes) and
# curved parts (hammer head, plane). Rule, from the component list: every
# straight part reaches below y=335 in the source; every curved part ends above it.
ix0, iy0, ix1, iy1 = ICON
navy_icon = cov["navy"][iy0:iy1, ix0:ix1]
lab, comps = components(navy_icon >= 0.5)
geo_ids = [c[0] for c in comps if c[5] + iy0 > 335]
geo = dilate(np.isin(lab, geo_ids), 1)
curvy = dilate((lab > 0) & ~np.isin(lab, geo_ids), 1)
def masked(m, keep):
    full = np.zeros_like(cov["navy"]); full[iy0:iy1, ix0:ix1] = m * keep; return full
dx, dy = band_dxdy(ICON)
layers.append(("navy", polygons(upmask(masked(navy_icon, geo), ICON), eps=0.8, dx=dx, dy=dy)))
layers.append(("navy", curves(smooth(upmask(masked(navy_icon, curvy), ICON), 0.5), turd=2, alphamax=1.0, dx=dx, dy=dy)))  # extra smoothing: the plane's thin edge
layers.append(("gold", curves(smooth(upmask(cov["gold"], ICON), 0.45), turd=4, alphamax=1.0, dx=dx, dy=dy)))

# --- wordmark: straight-edged polygons; tagline: small curves
for box, mode in [(WORD, "polygons"), (TAG, "curves")]:
    dx, dy = band_dxdy(box)
    for ink in ("navy", "gold"):
        bits = upmask(cov[ink], box)
        d = polygons(bits, eps=0.8, dx=dx, dy=dy) if mode == "polygons" else curves(smooth(bits, 0.3), turd=2, alphamax=0.9, dx=dx, dy=dy)
        layers.append((ink, d))
print("icon parts: straight", sorted(geo_ids), "| curved", sorted(c[0] for c in comps if c[0] not in geo_ids))

W, H = X1 - X0, TAG[3] - ICON[1]
(OUT / "genix-home-upgrades-logo.svg").write_text(svg(layers, W, H, "Genix Home Upgrade", FILLS), encoding="utf-8")
s = (OUT / "genix-home-upgrades-logo.svg").read_text(encoding="utf-8")
print(f"genix-home-upgrades-logo.svg  {W}x{H}  {len(s) / 1024:.1f} KB  {s.count('<path')} paths  {s.count('M')} shapes")
