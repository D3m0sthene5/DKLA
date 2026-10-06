#!/usr/bin/env python3
"""Draw each state's outline as a 24x24 icon path, from us-atlas states-10m.json (Census boundaries).

usage: state_outlines.py states-10m.json  ->  writes states.json beside this script ({state name: svg}).
"""
import json, math, sys
from pathlib import Path

topo = json.loads(Path(sys.argv[1]).read_text())
sx, sy = topo["transform"]["scale"]; tx, ty = topo["transform"]["translate"]
arcs = []
for arc in topo["arcs"]:
    x = y = 0; pts = []
    for dx, dy in arc:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)

def ring(ids):
    out = []
    for i in ids:
        pts = arcs[i] if i >= 0 else arcs[~i][::-1]
        out += pts if not out else pts[1:]
    return out

def area(r): return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1]))) / 2

def simplify(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; best, at = 0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]; dx, dy = b[0] - a[0], b[1] - a[1]; L = dx * dx + dy * dy
        t = 0 if not L else max(0, min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L))
        d = math.hypot(px - a[0] - t * dx, py - a[1] - t * dy)
        if d > best: best, at = d, i
    if best <= tol: return [a, b]
    return simplify(pts[:at + 1], tol)[:-1] + simplify(pts[at:], tol)

out = {}
for g in topo["objects"]["states"]["geometries"]:
    name = g["properties"]["name"]
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    rings = [ring(p[0]) for p in polys]                       # outer rings only
    rings = [[(x - 360 if x > 0 else x, y) for x, y in r] for r in rings]   # Aleutians across the date line
    lat = sum(y for r in rings for _, y in r) / sum(len(r) for r in rings)
    k = math.cos(math.radians(lat))
    rings = [[(x * k, -y) for x, y in r] for r in rings]
    big = max(area(r) for r in rings)
    rings = [r for r in rings if area(r) >= big * (0.012 if name in ("Hawaii", "Michigan") else 0.05)]
    xs = [x for r in rings for x, _ in r]; ys = [y for r in rings for _, y in r]
    w, h = max(xs) - min(xs), max(ys) - min(ys); s = 19 / max(w, h)
    ox, oy = 12 - (min(xs) + w / 2) * s, 12 - (min(ys) + h / 2) * s
    d = ""
    for r in rings:
        pts = [(x * s + ox, y * s + oy) for x, y in r]
        if pts[0] == pts[-1]: pts = pts[:-1]
        pts = simplify(pts + pts[:1], 0.22)[:-1]
        if len(pts) < 3: continue
        f = lambda v: ("%.1f" % v).rstrip("0").rstrip(".")
        d += "M" + "L".join(f(x) + " " + f(y) for x, y in pts) + "Z"
    out[name] = f'<path d="{d}"/>'
keep = {k: v for k, v in sorted(out.items()) if k not in ("District of Columbia", "Puerto Rico", "Guam", "American Samoa", "United States Virgin Islands", "Commonwealth of the Northern Mariana Islands")}
(Path(__file__).parent / "states.json").write_text(json.dumps(keep, indent=1), encoding="utf-8")
print(len(keep), "states;", "longest path", max(len(v) for v in keep.values()), "chars; total", sum(len(v) for v in keep.values()))
