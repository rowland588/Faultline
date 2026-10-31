"""FC-144 impact and effort (the PICK chart) — independent worked cases.
Written apart from src/lib/ie/pick.ts; the unit test and the acceptance example carry these literals.
Quadrants (Lockheed Martin's PICK chart, by repute; the grid as the Lean Six Sigma sources print it):
  Implement = high impact, low effort · Challenge = high, high · Possible = low, low · Kill = low impact, high effort.
Faultline's cut (a choice, said on the page): impact 3 or more is high; effort 2 or less is low (the Pocket Toolbox case
in cases-sixsigma-visual.py puts film guide (3,1) and reel trolley (3,2) as quick wins, new unwind (4,5) a major project,
second operator (2,2) a fill-in). A 3 on either axis is 'on the line' and is said so."""
import math

def quad(i, e):
    hi, lo = i >= 3, e <= 2
    return "Implement" if hi and lo else "Challenge" if hi else "Possible" if lo else "Kill"

RANK = {"Implement": 0, "Challenge": 1, "Possible": 2, "Kill": 3}

def run(title, rows, rate=None):
    print("\n==", title)
    out = []
    for k, r in enumerate(rows):
        q = quad(r["i"], r["e"])
        border = r["i"] == 3 or r["e"] == 3
        out.append({**r, "q": q, "border": border, "k": k})
    out.sort(key=lambda r: (RANK[r["q"]], -r["i"], r["e"], -(r.get("v") or -1), r["k"]))
    for n, r in enumerate(out, 1):
        cost = None
        hrs, spend = r.get("h"), r.get("s")
        if (hrs is None or (hrs and rate is not None) or hrs == 0) and (hrs is not None or spend is not None):
            cost = (hrs or 0) * (rate if hrs else 0) + (spend or 0)
        pay = None
        if cost is not None and r.get("v"):
            pay = cost / r["v"] * 52
        print(f"  {n}. {r['n']:28s} impact {r['i']} effort {r['e']} {r['q']:9s}{' (on the line)' if r['border'] else ''}"
              f"  value {r.get('v')}  hours {r.get('h')}  cost {cost}  payback weeks {None if pay is None else round(pay, 2)}")
    counts = {q: sum(1 for r in out if r["q"] == q) for q in RANK}
    print("  counts", counts)
    imp = [r for r in out if r["q"] == "Implement"]
    vals = [r["v"] for r in imp if r.get("v") is not None]
    hrs = [r["h"] for r in imp if r.get("h") is not None]
    print("  implement: value a year", sum(vals) if vals else None, "of", len(vals), "of", len(imp),
          "· hours", sum(hrs) if hrs else None, "of", len(hrs), "· labour £", (sum(hrs) * rate) if hrs and rate is not None else None)
    return out

# 1 — the record's four film-break countermeasures, priced (£ a year, hours, other spend £), £18 an hour
run("film breaks, priced at £18 an hour", [
    dict(n="Film guide", i=3, e=1, v=6000, h=6),
    dict(n="Reel trolley", i=3, e=2, v=4500, h=20),
    dict(n="New unwind unit", i=4, e=5, v=30000, h=200, s=18000),
    dict(n="Second operator", i=2, e=2, v=2000, h=40),
], rate=18)

# 2 — a packing line, nothing priced, a 3 on the line
run("packing line, nothing priced", [
    dict(n="Sealer jaw spares kit", i=4, e=2),
    dict(n="Splice tape change", i=3, e=3),
    dict(n="Re-tune the auto-reject", i=2, e=4),
    dict(n="Rewrite the changeover checklist", i=2, e=1),
    dict(n="Replace the wrapper", i=5, e=5),
])
