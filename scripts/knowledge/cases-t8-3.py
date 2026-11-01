"""Independent worked cases for FC-133 (control plan) and FC-135 (product on hold) and FC-152 (fault tree).
A second implementation, plain Python: no Faultline code. Run: python3 scripts/knowledge/cases-t8-3.py
"""
from fractions import Fraction as F
from math import prod
import itertools

print("== FC-133 control plan: the wrapper (knowledge/methods/quality/control-plan.md worked case, and the spec's four-row plan)")
shift_min, wage, speed, pack_cost = 480, 25.0, 200.0, 0.40
# the record's worked case: seal strength every 30 min vs every 15 min, 5 min a check, £25/h, 200 packs/min
for every in (30, 15):
    checks = shift_min / every
    labour = checks * 5 / 60 * wage
    risk = every * speed
    print(f"  every {every} min: {checks:g} checks, labour £{labour:.4f} a shift, {risk:g} packs at risk, £{risk*pack_cost:.2f} at £0.40 a pack")
# the spec's plan: (every, minutes) per row; None where not given
rows = {"Seal strength": (30, 5), "Net weight": (60, 4), "Metal detector": (60, 3), "Date code": (None, None)}
lab = 0.0; checks_total = 0.0; labour_rows = 0
for name, (ev, mn) in rows.items():
    if ev:
        c = shift_min / ev; checks_total += c
        print(f"  {name}: {c:g} checks a shift, labour £{c*mn/60*wage:.4f}")
        lab += c * mn / 60 * wage; labour_rows += 1
print(f"  total checks a shift {checks_total:g}, labour £{lab:.4f} over {labour_rows} rows; worst at risk {60*speed:g} packs = £{60*speed*pack_cost:.2f}")
# with one row's minutes withheld (Net weight) the labour is only the other two
lab2 = (shift_min/30*5/60 + shift_min/60*3/60) * wage
print(f"  without Net weight's minutes: £{lab2:.4f}")

print("== FC-135 product on hold: the record's worked case, and the spec's six-hold register (today 2026-11-01)")
from datetime import date
cost, margin, carry, wage = 0.42 + 0.11, 0.35, 0.12, 25.0
# the record's case: 4,800 packs held 6 days on a failed seal check, 21 days of life
q, d, life = 4800, 6, 21
tied = q * cost
print(f"  tied up £{tied:.2f}; destroyed £{tied + q*margin:.2f}; carrying {carry:.0%} for {d} days £{tied*carry*d/365:.4f}; life used {d/life:.4%}")
today = date(2026, 11, 1)
holds = [  # name, qty, raised, decided, fate, hours, extra, loss/pack, disposal, life
    ("h1 Maris seal (open)", 4800, date(2026,10,26), None, None, 0, 0, 0, 0, 21),
    ("h2 King Edward date code (open)", 1200, date(2026,10,30), None, None, 0, 0, 0, 0, 14),
    ("h3 Baby metal (destroyed)", 3000, date(2026,10,20), date(2026,10,22), "destroy", 0, 0, 0, 150, 0),
    ("h4 Maris re-test (released)", 2400, date(2026,10,12), date(2026,10,13), "release", 2, 0, 0, 0, 0),
    ("h5 Tesco undersize (regraded)", 2000, date(2026,10,5), date(2026,10,9), "regrade", 0, 0, 0.08, 0, 0),
    ("h6 Maris re-seal (reworked)", 900, date(2026,10,1), date(2026,10,3), "rework", 4, 45, 0, 0, 0),
]
tied_t = carry_t = lost_t = 0.0
for n, qty, r, dec, fate, hrs, extra, lpp, disp, lf in holds:
    days = ((dec or today) - r).days
    if fate is None:
        t = qty * cost; c = t * carry * days / 365; tied_t += t; carry_t += c
        print(f"  {n}: {days} d, tied up £{t:.2f}, carried £{c:.4f}, life used {days/lf:.4%}")
    else:
        lost = {"destroy": qty*(cost+margin)+disp, "release": hrs*wage, "regrade": qty*lpp, "rework": hrs*wage+extra}[fate]
        lost_t += lost
        print(f"  {n}: {days} d, lost £{lost:.2f}")
print(f"  open tied up £{tied_t:.2f}, carried £{carry_t:.4f}; decided lost £{lost_t:.2f}; open packs {4800+1200}")

print("== FC-152 fault tree: minimal cut sets and the exact top probability, by brute force over every state of the basic events (no cut-set algebra)")
# The structure function is evaluated directly on each of the 2^n states; the minimal cut sets are the minimal sets of events whose failure alone makes the top true.
def tree_case(title, events, top_fn, p):
    names = list(events)
    n = len(names)
    def top(state): return top_fn(dict(zip(names, state)))
    states = list(itertools.product([0, 1], repeat=n))
    truth = {s: top(s) for s in states}
    # minimal cut sets: sets S (as the all-ones-on-S, zeros-elsewhere state) with top true and no proper subset's state true
    cuts = []
    for k in range(1, n + 1):
        for comb in itertools.combinations(range(n), k):
            s = tuple(1 if i in comb else 0 for i in range(n))
            if truth[s] and not any(set(c) <= set(comb) for c in cuts):
                cuts.append(comb)
    def prob(state):
        r = 1.0
        for i, v in enumerate(state): r *= p[names[i]] if v else 1 - p[names[i]]
        return r
    P = sum(prob(s) for s in states if truth[s])
    print(f"  {title}: {len(cuts)} minimal cut sets, sizes {sorted(len(c) for c in cuts)}, P(top) = {P:.10f}")
    rare = sum(prod([p[names[i]] for i in c]) for c in cuts)
    upper = 1 - prod([1 - prod([p[names[i]] for i in c]) for c in cuts])
    print(f"    rare-event sum {rare:.10f}, min-cut upper bound {upper:.10f}")
    out = {}
    for i, e in enumerate(names):
        hi = sum(prob(s) / (p[e] if s[i] else 1 - p[e]) * (1 if True else 0) for s in states if truth[s] and s[i] == 1)
        lo = sum(prob(s) / (p[e] if s[i] else 1 - p[e]) for s in states if truth[s] and s[i] == 0)
        # P(top | e=1) and P(top | e=0): the sums above already hold the other events' weights
        cs = [c for c in cuts if i in c]
        fv = sum(prob(s) for s in states if any(all(s[j] for j in c) for c in cs)) / P if cs else 0
        out[e] = (hi - lo, fv)
        print(f"    {e}: Birnbaum {hi - lo:.8f}  Fussell-Vesely {fv:.6f}  in {len(cs)} cuts")
    return cuts, P

E = {"screen": .02, "part": .01, "supplier": .005, "drift": .10, "missed": .05, "reject": .01, "bypass": .02}
def metal(s):
    a = s["screen"] or s["part"] or s["supplier"]
    b = (s["drift"] and s["missed"]) or s["reject"] or s["bypass"]
    return int(bool(a and b))
tree_case("metal in a pack (three ways in, three ways past the detector)", E, metal, E)
# a shared cause: one event under two branches — top = (A and B) or (C and D) with A and C the same event "x"
F = {"x": .1, "b": .2, "d": .3, "e": .05}
def shared(s): return int(bool((s["x"] and s["b"]) or (s["x"] and s["d"]) or s["e"]))
tree_case("a cause shared by two branches (x under both)", F, shared, F)
# a single point
G = {"u": .001, "v": .2, "w": .3}
def single(s): return int(bool(s["u"] or (s["v"] and s["w"])))
tree_case("a single point beside a pair", G, single, G)
