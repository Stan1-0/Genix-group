"""Shared helpers for redrawing raster logos as clean SVG.

Lessons baked in (from tracing the group logo):
  * potracer traces the *False* pixels, so ink must be passed as ~mask.
  * PIL's floodfill silently does nothing on an image that shares a read-only
    numpy buffer, so fill_holes() copies first.
  * Edge pixels are ink blended with the background; unmix them (coverage)
    instead of snapping to the nearest colour, or you get halo fringes.
"""
import numpy as np
import potrace
from PIL import Image, ImageDraw, ImageFilter

UP = 6  # trace at 6x the source resolution


def coverage(rgb, alpha, inks, bg=(252, 252, 252)):
    """Per-ink coverage 0..1: each pixel explained as t*ink + (1-t)*background.
    inks: {name: [(r,g,b), ...]}  ->  {name: HxW float array}"""
    bg = np.array(bg, float)
    best_err = np.full(alpha.shape, np.inf); best_ink = np.full(alpha.shape, "", object); best_t = np.zeros(alpha.shape)
    for name, cols in inks.items():
        for c in cols:
            v = bg - np.array(c, float)
            t = np.clip(((bg - rgb) @ v) / (v @ v), 0, 1)
            err = np.linalg.norm(rgb - (bg - t[..., None] * v), axis=-1)
            m = err < best_err
            best_err[m], best_ink[m], best_t[m] = err[m], name, t[m]
    return {n: np.where(best_ink == n, best_t * alpha, 0.0) for n in inks}


def upmask(m, box):
    """Crop a coverage map to box, upscale UPx (bicubic), threshold at the 50% edge."""
    x0, y0, x1, y1 = box
    big = Image.fromarray((np.clip(m[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8), "L")
    return np.array(big.resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.BICUBIC)) >= 128


def smooth(bits, r):
    """Gaussian-smooth a mask (r in source px) and re-threshold: removes steps and slivers."""
    im = Image.fromarray(bits.astype(np.uint8) * 255, "L").filter(ImageFilter.GaussianBlur(r * UP))
    return np.array(im) >= 128


def fill_holes(bits):
    # .copy(): fromarray can share a read-only buffer, and floodfill then silently does nothing
    inv = Image.fromarray(np.pad(~bits, 1, constant_values=True).astype(np.uint8) * 255, "L").copy()
    ImageDraw.floodfill(inv, (0, 0), 128)
    return bits | (np.array(inv)[1:-1, 1:-1] == 255)


def _rdp(pts, eps):
    pts = np.asarray(pts, float)
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; ab = b - a; n = np.hypot(*ab)
    d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / n if n else np.hypot(*(pts - a).T)
    i = int(d.argmax())
    if d[i] > eps: return np.vstack([_rdp(pts[:i + 1], eps)[:-1], _rdp(pts[i:], eps)])
    return np.array([a, b])


def _xy(p): return (p.x, p.y) if hasattr(p, "x") else (p[0], p[1])


def polygons(bits, eps=0.55, turd=12, dx=0.0, dy=0.0):
    """Straight-edged outlines (potrace optimal polygon + RDP; eps in source px).
    dx/dy offset the output (source px) so crops land in a shared coordinate space."""
    if not bits.any(): return ""
    plist = potrace.Bitmap(~bits).trace(turdsize=turd * UP * UP, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=0.0, opticurve=False)
    out = []
    for curve in plist:
        pts = [_xy(curve.start_point)]
        for seg in curve:
            pts += [_xy(seg.c), _xy(seg.end_point)] if seg.is_corner else [_xy(seg.end_point)]
        pts = np.array(pts) / UP
        far = int(np.hypot(*(pts - pts[0]).T).argmax())
        ring = np.vstack([_rdp(pts[:far + 1], eps)[:-1], _rdp(np.vstack([pts[far:], pts[:1]]), eps)[:-1]])
        out.append("M" + "L".join(f"{x + dx:.2f} {y + dy:.2f}" for x, y in ring) + "Z")
    return "".join(out)


def curves(bits, turd=6, alphamax=1.0, dx=0.0, dy=0.0):
    """Smooth outlines (potrace Beziers). alphamax < 1 keeps more corners sharp."""
    if not bits.any(): return ""
    opts = dict(turdsize=turd * UP * UP, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=alphamax)
    plist = None
    for tol in (0.25, 0.2, 0.3, 0.15, 0.35):  # potracer's curve-joining can hit a math edge case; retry
        try: plist = potrace.Bitmap(~bits).trace(**opts, opticurve=True, opttolerance=tol); break
        except ValueError: pass
    if plist is None: plist = potrace.Bitmap(~bits).trace(**opts, opticurve=False)
    f = lambda p: "{:.2f} {:.2f}".format(*(np.array(_xy(p)) / UP + (dx, dy)))
    out = []
    for curve in plist:
        out.append("M" + f(curve.start_point))
        for seg in curve:
            out.append("L" + f(seg.c) + "L" + f(seg.end_point) if seg.is_corner else "C" + f(seg.c1) + " " + f(seg.c2) + " " + f(seg.end_point))
        out.append("Z")
    return "".join(out)


def svg(layers, w, h, title, fills):
    """layers: [(fill_name, path_d), ...] painted in order."""
    body = "\n".join(f'  <path fill="{fills[n]}" fill-rule="evenodd" d="{d}"/>' for n, d in layers if d)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n{body}\n</svg>\n')


def components(mask):
    """Label 4-connected components of a boolean mask (source resolution).
    Returns (labels, [(id, pixel_count, x0, y0, x1, y1), ...])."""
    from collections import deque
    H, W = mask.shape; lab = np.zeros((H, W), int); out = []; n = 0
    for y in range(H):
        for x in range(W):
            if mask[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n; ys, xs = [], []
                while q:
                    cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                out.append((n, len(ys), min(xs), min(ys), max(xs), max(ys)))
    return lab, out


def dilate(mask, px=1):
    """Grow a boolean mask by px (so a component keeps its soft anti-aliased edge)."""
    im = Image.fromarray(mask.astype(np.uint8) * 255, "L").filter(ImageFilter.MaxFilter(2 * px + 1))
    return np.array(im) >= 128
