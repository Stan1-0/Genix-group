"""Usage: pip install potracer numpy pillow, then: python design/tools/trace_logistics_logo.py

Redraw the Genix Freight & Logistics logo as clean SVG from its PNG (assets/source/logistics-logo-original.png, 887x419).
Bands (source px): mark y 8-182 (truck, speed lines, gold G), wordmark
y 185-350 (GENIX + gold speed dashes), tagline y 352-412 (FREIGHT & LOGISTICS).
  truck, gold G, dashes, tagline      -> smooth curves
  wordmark letters E N I + the X      -> straight-edged polygons
  wordmark G                          -> curves (it is round)
The tagline's drop shadow is not traced: it is the tagline path again, offset
(1, 2) px, in near-black, painted underneath - the way it was built.
The gold X is a trademark: traced as-is, never reshaped.
"""
import numpy as np
from pathlib import Path
from PIL import Image
from tracelib import coverage, upmask, smooth, polygons, curves, components, dilate

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "assets" / "source" / "logistics-logo-original.png"
OUT = HERE.parent / "assets" / "genix-logistics-logo.svg"
FILLS = {"navy": "#022248", "gold": "#C28A2C", "grey": "#37404A", "shadow": "#141509"}
SHADOW = (1, 2)

rgba = np.array(Image.open(SRC).convert("RGBA")).astype(float)
alpha = rgba[..., 3] / 255
rgb = rgba[..., :3] * alpha[..., None] + 255 * (1 - alpha[..., None])   # onto white
# the tagline shadow is its own ink so it never gets mistaken for navy/grey edges
cov = coverage(rgb, np.ones(alpha.shape), {
    "gold": [(194, 136, 36)], "grey": [(55, 64, 70)], "navy": [(0, 34, 71)], "shadow": [(20, 21, 11)]}, bg=(255, 255, 255))
cov["shadow"][:352] = 0                       # shadow ink exists only under the tagline
for k in ("navy", "grey"):
    cov[k][352:] = 0                          # below y=352 anything dark is shadow

X0, Y0, X1, Y1 = 6, 8, 882, 413               # lockup bbox + 2px air
MARK, WORD, TAG = (138, Y0, 632, 183), (X0, 184, X1, 351), (150, 352, X1, Y1)
def off(box): return box[0] - X0, box[1] - Y0
layers = []                                   # (fill, d, extra-attrs)

# --- mark: truck + speed lines (grey), G + streak (gold).
# The truck's edges carry a light rim that colour-unmixing reads as half-ink
# (the trace flickers along it). Its gaps are truly transparent, so here the
# shape comes from alpha and only the colour split comes from hue.
r, g, b_ = (rgba[..., i] for i in range(3))
goldness = np.clip((r - b_ - 40) / 60, 0, 1)            # gold ~ R-B 158, grey ~ R-B -15
mark_gold, mark_grey = alpha * goldness, alpha * (1 - goldness)
dx, dy = off(MARK)
layers.append(("grey", curves(smooth(upmask(mark_grey, MARK), 0.35), turd=4, alphamax=0.8, dx=dx, dy=dy), ""))
layers.append(("gold", curves(smooth(upmask(mark_gold, MARK), 0.3), turd=2, alphamax=0.8, dx=dx, dy=dy), ""))

# --- wordmark: the round G as curves, the rest (E N I and the X arms) as polygons
wx0, wy0, wx1, wy1 = WORD
navy = cov["navy"][wy0:wy1, wx0:wx1]
lab, comps = components(navy >= 0.5)
big = [c for c in comps if c[1] > 200]
g_id = min(big, key=lambda c: c[2])[0]        # leftmost big letter = G
def band(m):
    full = np.zeros_like(cov["navy"]); full[wy0:wy1, wx0:wx1] = m; return full
g_mask, rest_mask = dilate(lab == g_id, 1), dilate((lab > 0) & (lab != g_id), 1)
dx, dy = off(WORD)
layers.append(("navy", curves(smooth(upmask(band(navy * g_mask), WORD), 0.3), turd=2, alphamax=0.75, dx=dx, dy=dy), ""))
layers.append(("navy", polygons(upmask(band(navy * rest_mask), WORD), eps=0.7, dx=dx, dy=dy), ""))
# gold in the wordmark band: speed dashes (x < 200, rounded ends) and the X (polygons)
gold_w = cov["gold"].copy(); gold_w[:wy0] = 0; gold_w[wy1:] = 0
dashes, xgold = gold_w.copy(), gold_w.copy()
dashes[:, 200:] = 0; xgold[:, :200] = 0
layers.append(("gold", curves(smooth(upmask(dashes, WORD), 0.4), turd=2, alphamax=1.0, dx=dx, dy=dy), ""))
layers.append(("gold", polygons(upmask(xgold, WORD), eps=0.7, dx=dx, dy=dy), ""))

# --- tagline: gold letters as curves; shadow = same path, offset, underneath
dx, dy = off(TAG)
tag = curves(smooth(upmask(cov["gold"], TAG), 0.4), turd=1, alphamax=0.9, dx=dx, dy=dy)  # letters ~45px tall: extra smoothing

W, H = X1 - X0, Y1 - Y0
body = "\n".join(f'  <path fill="{FILLS[f]}" fill-rule="evenodd"{extra} d="{d}"/>' for f, d, extra in layers if d)
# tagline: one path drawn twice via <use> (shadow underneath) instead of two copies
body += (f'\n  <defs><path id="tagline" fill-rule="evenodd" d="{tag}"/></defs>'
         f'\n  <use href="#tagline" fill="{FILLS["shadow"]}" transform="translate({SHADOW[0]} {SHADOW[1]})"/>'
         f'\n  <use href="#tagline" fill="{FILLS["gold"]}"/>')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Genix Freight &amp; Logistics">\n'
       f'  <title>Genix Freight &amp; Logistics</title>\n{body}\n</svg>\n')
OUT.write_text(svg, encoding="utf-8")
print(f"{OUT.name}  {W}x{H}  {len(svg) / 1024:.1f} KB  {svg.count('<path')} paths  G component {g_id} of {len(big)} big")
