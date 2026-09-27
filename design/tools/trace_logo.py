"""Usage: pip install potracer numpy pillow, then: python design/tools/trace_logo.py

Redraw the Genix Group logo as clean vector SVG (v2).

Source: the original 2000x1200 PNG. Per-colour soft coverage from the
original's anti-aliasing (edge pixels unmixed from white), upscaled 6x,
thresholded at the true 50% edge, then traced per part:

  geometric parts (hexagon segments, GENIX letters, the X) -> straight-edged
      polygons, simplified with Ramer-Douglas-Peucker so the source's slight
      waviness becomes true straight lines
  curved parts (GROUP, the icons, the truck) -> potrace Bezier curves

Black-and-gold version (navy -> black). Tagline not included (the site sets
it as live text). White icon details are real white shapes, so the mark
reads correctly on any background.
"""
import numpy as np, potrace
from PIL import Image, ImageDraw
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "assets" / "source" / "genix-group-logo-original.png"
OUT = HERE.parent / "assets"
UP = 6
FILL = {"dark": "#0B0B0C", "gold": "#C28A2C", "grey": "#3B4143", "white": "#FFFFFF"}

img = np.array(Image.open(SRC).convert("RGBA")).astype(float)
rgb, alpha = img[..., :3], img[..., 3] / 255.0
WHITE = np.array([252.0, 252, 252])

# --- per-ink coverage: edge pixels are ink blended with white -----------------
INKS = {"dark": [(1, 34, 71), (12, 8, 0)], "gold": [(193, 136, 37), (200, 132, 24)], "grey": [(59, 65, 67)]}
best_err = np.full(alpha.shape, np.inf); best_ink = np.full(alpha.shape, "", object); best_t = np.zeros(alpha.shape)
for name, cols in INKS.items():
    for c in cols:
        v = WHITE - np.array(c, float)
        t = np.clip(((WHITE - rgb) @ v) / (v @ v), 0, 1)
        err = np.linalg.norm(rgb - (WHITE - t[..., None] * v), axis=-1)
        m = err < best_err
        best_err[m], best_ink[m], best_t[m] = err[m], name, t[m]
cov = {n: np.where(best_ink == n, best_t * alpha, 0.0) for n in INKS}
# white ink (icon details): bright, unsaturated, opaque
cov["white"] = alpha * np.clip((rgb.min(-1) - 170) / 60, 0, 1) * (np.ptp(rgb, axis=-1) < 40)

# --- helpers -----------------------------------------------------------------
def upmask(m, box):
    x0, y0, x1, y1 = box
    big = Image.fromarray((np.clip(m[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8), "L")
    return np.array(big.resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.BICUBIC)) >= 128

def fill_holes(bits):
    # .copy(): fromarray can share a read-only buffer, and floodfill then silently does nothing
    inv = Image.fromarray(np.pad(~bits, 1, constant_values=True).astype(np.uint8) * 255, "L").copy()
    ImageDraw.floodfill(inv, (0, 0), 128)
    return bits | (np.array(inv)[1:-1, 1:-1] == 255)

def rdp(pts, eps):
    pts = np.asarray(pts, float)
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; ab = b - a; n = np.hypot(*ab)
    d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / n if n else np.hypot(*(pts - a).T)
    i = int(d.argmax())
    if d[i] > eps: return np.vstack([rdp(pts[:i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.array([a, b])

def xy(p): return (p.x, p.y) if hasattr(p, "x") else (p[0], p[1])

def polygons(bits, eps=0.55, turd=12):
    """Straight-edged outlines: potrace's optimal polygon, then RDP (eps in original px)."""
    plist = potrace.Bitmap(~bits).trace(turdsize=turd * UP * UP, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                                        alphamax=0.0, opticurve=False)
    out = []
    for curve in plist:
        pts = [xy(curve.start_point)]
        for seg in curve:
            if seg.is_corner: pts += [xy(seg.c), xy(seg.end_point)]
            else: pts.append(xy(seg.end_point))
        pts = np.array(pts) / UP
        far = int(np.hypot(*(pts - pts[0]).T).argmax())  # closed ring: simplify both halves
        ring = np.vstack([rdp(pts[:far + 1], eps)[:-1], rdp(np.vstack([pts[far:], pts[:1]]), eps)[:-1]])
        out.append("M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in ring) + "Z")
    return "".join(out)

def curves(bits, turd=6):
    """Smooth outlines: potrace Beziers."""
    if not bits.any(): return ""
    opts = dict(turdsize=turd * UP * UP, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0)
    plist = None
    for tol in (0.25, 0.2, 0.3, 0.15, 0.35):  # potracer's curve-joining can hit a math edge case; retry
        try: plist = potrace.Bitmap(~bits).trace(**opts, opticurve=True, opttolerance=tol); break
        except ValueError: pass
    if plist is None: plist = potrace.Bitmap(~bits).trace(**opts, opticurve=False)
    f = lambda p: "{:.2f} {:.2f}".format(*(np.array(xy(p)) / UP))
    out = []
    for curve in plist:
        out.append("M" + f(curve.start_point))
        for seg in curve:
            out.append("L" + f(seg.c) + "L" + f(seg.end_point) if seg.is_corner else "C" + f(seg.c1) + " " + f(seg.c2) + " " + f(seg.end_point))
        out.append("Z")
    return "".join(out)

def box_mask(shape, keep):
    m = np.zeros(shape, bool); x0, y0, x1, y1 = [v * UP for v in keep]; m[y0:y1, x0:x1] = True; return m

# --- MARK --------------------------------------------------------------------
MARK = (272, 351, 632, 772)
from PIL import ImageFilter
def smooth(bits, r):
    """Gaussian-smooth a mask (r in original px) and re-threshold: removes
    pixel steps and slivers left by the low-res source."""
    im = Image.fromarray(bits.astype(np.uint8) * 255, "L").filter(ImageFilter.GaussianBlur(r * UP))
    return np.array(im) >= 128

inkish = upmask(np.clip(cov["dark"] + cov["grey"], 0, 1), MARK)  # dark + grey: no grey step at icon edges
gold = upmask(cov["gold"], MARK)
white = upmask(cov["white"], MARK)
gold_filled = fill_holes(gold)            # bottom segment, solid under the truck
truck = smooth(inkish & gold_filled, 0.45) # the truck = dark ink sitting on the gold segment
dark_seg = inkish & ~gold_filled           # the two upper segments
dark_seg_filled = fill_holes(dark_seg)
icons = smooth(dark_seg_filled & ~dark_seg, 0.35)  # white icons = holes in the segments
truck_white = smooth(white & gold_filled & ~truck, 0.35)  # the white G on the truck

mark_layers = [
    ("dark", polygons(dark_seg_filled, eps=0.9)),
    ("gold", polygons(gold_filled, eps=0.9)),
    ("white", curves(icons, turd=2)),
    ("grey", curves(truck, turd=3)),
    ("white", curves(truck_white, turd=2)),
]

# --- WORDMARK ----------------------------------------------------------------
WORD = (686, 406, 1560, 704)
GROUP_TOP = 595 - WORD[1]
dark_w = upmask(cov["dark"], WORD); gold_w = upmask(cov["gold"], WORD)
below = np.zeros(gold_w.shape, bool); below[GROUP_TOP * UP:] = True
word_layers = [
    ("dark", polygons(dark_w & ~below)),       # G E N I + the black arms of the X
    ("gold", polygons(gold_w & ~below)),       # the gold chevron of the X
    ("gold", curves(gold_w & below, turd=4)),  # GROUP
]

# --- write -------------------------------------------------------------------
def paths(layers, indent="  "):
    return "\n".join(f'{indent}<path fill="{FILL[n]}" fill-rule="evenodd" d="{d}"/>' for n, d in layers if d)
def svg(layers, box, title):
    w, h = box[2] - box[0], box[3] - box[1]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n{paths(layers)}\n</svg>\n')

(OUT / "genix-mark.svg").write_text(svg(mark_layers, MARK, "Genix Group mark"), encoding="utf-8")
(OUT / "genix-wordmark.svg").write_text(svg(word_layers, WORD, "Genix Group"), encoding="utf-8")
fw, fh = WORD[2] - MARK[0], MARK[3] - MARK[1]
(OUT / "genix-group-logo.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fw} {fh}" width="{fw}" height="{fh}" role="img" aria-label="The Genix Group">\n'
    f'  <title>The Genix Group</title>\n  <g>\n{paths(mark_layers, "    ")}\n  </g>\n'
    f'  <g transform="translate({WORD[0] - MARK[0]} {WORD[1] - MARK[1]})">\n{paths(word_layers, "    ")}\n  </g>\n</svg>\n', encoding="utf-8")

for f in ["genix-mark.svg", "genix-wordmark.svg", "genix-group-logo.svg"]:
    s = (OUT / f).read_text(encoding="utf-8")
    print(f, f"{len(s) / 1024:.1f} KB,", s.count("<path"), "paths,", s.count("M"), "shapes")
