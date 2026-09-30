"""Usage: pip install potracer numpy pillow, then: python design/tools/trace_group_logo_v2.py

Redraw the new Genix Group logo (owner, 2026-09-29) as clean vector SVG.

Source: assets/source/genix group logo new.png (2000x1200). Layout (source px):
  mark        x 406-684, y 436-763   hexagon: house+hammer, camera, truck
  wordmark    x 735-1554, y 450-672  one big G shared by ENIX (top) and ROUP (bottom)
  descriptor  x 768-1517, y 732-763  "CONSTRUCTION | MULTIMEDIA | LOGISTICS" (kept as supplied)

Same method and colour treatment as trace_logo.py: per-ink coverage, traced at 6x;
geometric parts (hexagon, G/E/N/I, the X) as straight-edged polygons, curved parts
(ROUP, icons, truck, descriptor) as potrace Beziers. Colours as supplied (owner,
2026-09-30: keep the navy): navy lettering and house segment, black camera segment,
gold, grey truck.
"""
import numpy as np
from pathlib import Path
from PIL import Image
from tracelib import coverage, upmask, smooth, fill_holes, polygons, curves

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "assets" / "source" / "genix group logo new.png"
OUT = HERE.parent / "assets"
FILL = {"navy": "#012247", "dark": "#0B0B0C", "gold": "#C28A2C", "grey": "#3B4143", "white": "#FFFFFF"}  # navy = the logo's own (1,34,71)

img = np.array(Image.open(SRC).convert("RGBA")).astype(float)
rgb, alpha = img[..., :3], img[..., 3] / 255.0
cov = coverage(rgb, alpha, {"dark": [(1, 34, 71), (6, 54, 102), (12, 8, 0)], "gold": [(193, 136, 37), (198, 138, 30)], "grey": [(59, 65, 67)]})
cov["white"] = alpha * np.clip((rgb.min(-1) - 170) / 60, 0, 1) * (np.ptp(rgb, axis=-1) < 40)

# --- MARK (6 px margin) ------------------------------------------------------
MARK = (400, 430, 690, 770)
inkish = upmask(np.clip(cov["dark"] + cov["grey"], 0, 1), MARK)
gold = upmask(cov["gold"], MARK)
white = upmask(cov["white"], MARK)
gold_filled = fill_holes(gold)                              # bottom segment, solid under the truck
truck = smooth(inkish & gold_filled, 0.45)                  # dark ink sitting on the gold segment
dark_seg = inkish & ~gold_filled                            # the two upper segments
dark_seg_filled = fill_holes(dark_seg)
icons = smooth(dark_seg_filled & ~dark_seg, 0.35)           # white icons = holes in the segments
truck_white = smooth(white & gold_filled & ~truck, 0.35)    # the white G on the truck
# the two upper segments: navy (house, left) and black (camera, right), split at the white gap
gap = 543 - MARK[0]
cols = np.arange(dark_seg_filled.shape[1])[None, :] // 6
mark_layers = [
    ("navy", polygons(dark_seg_filled & (cols < gap), eps=0.9)),
    ("dark", polygons(dark_seg_filled & (cols >= gap), eps=0.9)),
    ("gold", polygons(gold_filled, eps=0.9)),
    ("white", curves(icons, turd=2)),
    ("grey", curves(truck, turd=3)),
    ("white", curves(truck_white, turd=2)),
]

# --- WORDMARK + DESCRIPTOR (one box, 6 px margin) ------------------------------
WORD = (729, 444, 1561, 770)
ROUP_TOP = 588 - WORD[1]          # gold above this row = the X's chevron; below = ROUP
DESC_TOP = 700 - WORD[1]          # below this row = the descriptor line
dark_w = upmask(cov["dark"], WORD); gold_w = upmask(cov["gold"], WORD)
rows = np.arange(dark_w.shape[0])[:, None] // 6
word_layers = [
    ("navy", polygons(dark_w & (rows < DESC_TOP))),                      # G E N I + the navy arms of the X
    ("gold", polygons(gold_w & (rows < ROUP_TOP))),                      # the gold chevron of the X
    ("gold", curves(gold_w & (rows >= ROUP_TOP) & (rows < DESC_TOP), turd=4)),  # ROUP
]
# Descriptor: each division in its own segment's colour from the mark (owner, 2026-09-30):
# CONSTRUCTION = house segment (navy), MULTIMEDIA = camera segment (black), LOGISTICS = truck
# segment (gold); the | separators stay navy. Word x-ranges in source px.
cols_w = np.arange(dark_w.shape[1])[None, :] // 6 + WORD[0]
desc = dark_w & (rows >= DESC_TOP)
for fill, x0, x1 in [("navy", 0, 1035), ("navy", 1035, 1070), ("dark", 1070, 1295), ("navy", 1295, 1334), ("gold", 1334, 9999)]:
    word_layers.append((fill, curves(desc & (cols_w >= x0) & (cols_w < x1), turd=1, alphamax=0.8)))

# --- write -------------------------------------------------------------------
def paths(layers, indent="  "):
    return "\n".join(f'{indent}<path fill="{FILL[n]}" fill-rule="evenodd" d="{d}"/>' for n, d in layers if d)

def svg(layers, box, title):
    w, h = box[2] - box[0], box[3] - box[1]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n{paths(layers)}\n</svg>\n')

(OUT / "genix-mark.svg").write_text(svg(mark_layers, MARK, "Genix Group mark"), encoding="utf-8")
(OUT / "genix-wordmark.svg").write_text(svg(word_layers, WORD, "Genix Group"), encoding="utf-8")
fx0, fy0, fx1, fy1 = MARK[0], min(MARK[1], WORD[1]), WORD[2], max(MARK[3], WORD[3])
fw, fh = fx1 - fx0, fy1 - fy0
(OUT / "genix-group-logo.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fw} {fh}" width="{fw}" height="{fh}" role="img" aria-label="The Genix Group">\n'
    f'  <title>The Genix Group</title>\n'
    f'  <g transform="translate({MARK[0] - fx0} {MARK[1] - fy0})">\n{paths(mark_layers, "    ")}\n  </g>\n'
    f'  <g transform="translate({WORD[0] - fx0} {WORD[1] - fy0})">\n{paths(word_layers, "    ")}\n  </g>\n</svg>\n', encoding="utf-8")

for f in ["genix-mark.svg", "genix-wordmark.svg", "genix-group-logo.svg"]:
    s = (OUT / f).read_text(encoding="utf-8")
    print(f, f"{len(s) / 1024:.1f} KB,", s.count("<path"), "paths")
print("sizes: mark", MARK[2] - MARK[0], "x", MARK[3] - MARK[1], "| wordmark", WORD[2] - WORD[0], "x", WORD[3] - WORD[1], "| full", fw, "x", fh)
