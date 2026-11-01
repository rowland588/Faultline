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

print("== FC-112 response surface: the record's frozen 13-run rotatable CCD (give-away g) and the outside-the-region case, by plain Gauss-Jordan least squares")
import math
SQ2 = math.sqrt(2)
def inv(A):
    n = len(A); M = [r[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, r in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        d = M[c][c]; M[c] = [v / d for v in M[c]]
        for r in range(n):
            if r != c:
                f = M[r][c]; M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [r[n:] for r in M]
def terms(x): return [1, *x, *[a * a for a in x], *[x[i] * x[j] for i in range(len(x)) for j in range(i + 1, len(x))]]
def ols(xs, ys):
    X = [terms(x) for x in xs]; p = len(X[0]); n = len(ys)
    XtX = [[sum(X[i][a] * X[i][b] for i in range(n)) for b in range(p)] for a in range(p)]
    M = inv(XtX); Xty = [sum(X[i][a] * ys[i] for i in range(n)) for a in range(p)]
    b = [sum(M[a][c] * Xty[c] for c in range(p)) for a in range(p)]
    fit = [sum(X[i][a] * b[a] for a in range(p)) for i in range(n)]
    sse = sum((ys[i] - fit[i]) ** 2 for i in range(n)); ybar = sum(ys) / n; sst = sum((y - ybar) ** 2 for y in ys); df = n - p
    s = math.sqrt(sse / df); se = [s * math.sqrt(M[a][a]) for a in range(p)]
    h = [sum(X[i][a] * sum(M[a][c] * X[i][c] for c in range(p)) for a in range(p)) for i in range(n)]
    press = sum(((ys[i] - fit[i]) / (1 - h[i])) ** 2 for i in range(n))
    return dict(b=b, se=se, s=s, df=df, r2=1 - sse / sst, adj=1 - (sse / df) / (sst / (n - 1)), pred=1 - press / sst, sse=sse, M=M, X=X, p=p, n=n, F=((sst - sse) / (p - 1)) / (sse / df))
RUNS = [(-1,-1,1.483),(-1,1,1.277),(1,-1,1.561),(1,1,1.521),(0,-SQ2,1.493),(0,SQ2,1.267),(-SQ2,0,1.380),(SQ2,0,1.764),(0,0,1.084),(0,0,1.209),(0,0,1.115),(0,0,1.049),(0,0,1.080)]
r = ols([(a, b) for a, b, _ in RUNS], [y for *_, y in RUNS])
print("  b", [round(v, 4) for v in r['b']], "se", [round(v, 4) for v in r['se']])
print(f"  s {r['s']:.4f} on {r['df']} df, R2 {r['r2']:.4f}, adj {r['adj']:.4f}, predicted {r['pred']:.4f}, F {r['F']:.2f}")
# lack of fit from the five centre runs
cy = [1.084, 1.209, 1.115, 1.049, 1.080]; cm = sum(cy) / 5; sspe = sum((v - cm) ** 2 for v in cy)
print(f"  pure error SS {sspe:.4f} on 4 df; lack of fit SS {r['sse'] - sspe:.4f} on 3 df; F {((r['sse'] - sspe) / 3) / (sspe / 4):.3f}")
b = r['b']; b1 = b[1:3]; B = [[b[3], b[5] / 2], [b[5] / 2, b[4]]]
det = B[0][0] * B[1][1] - B[0][1] ** 2; Bi = [[B[1][1] / det, -B[0][1] / det], [-B[0][1] / det, B[0][0] / det]]
xs_ = [-0.5 * (Bi[i][0] * b1[0] + Bi[i][1] * b1[1]) for i in range(2)]
ystar = b[0] + 0.5 * (b1[0] * xs_[0] + b1[1] * xs_[1])
tr = B[0][0] + B[1][1]; disc = math.sqrt(tr * tr / 4 - det); eig = (tr / 2 - disc, tr / 2 + disc)
print(f"  stationary coded ({xs_[0]:.4f}, {xs_[1]:.4f}) = speed {60 + 15 * xs_[0]:.2f}, temperature {20 + 5 * xs_[1]:.2f}; y* {ystar:.4f}; eigenvalues {eig[0]:.4f}, {eig[1]:.4f}; radius {math.hypot(*xs_):.3f} of {SQ2:.3f}")
v = terms(xs_); q = sum(v[a] * sum(r['M'][a][c] * v[c] for c in range(6)) for a in range(6)); t7 = 2.364624   # t(0.975, 7 df) from the published table
print(f"  with t = {t7}: mean +/- {t7 * r['s'] * math.sqrt(q):.4f}, a single run +/- {t7 * r['s'] * math.sqrt(1 + q):.4f}")
# the outside-the-region case: a noise-free surface whose minimum is at (2.95, 0.71) — b0 1, b11 0.2, b22 0.15, b1 = -2*b11*2.95, b2 = -2*b22*0.71
f = lambda x: 1 + (-1.18) * x[0] + (-0.213) * x[1] + 0.2 * x[0] ** 2 + 0.15 * x[1] ** 2
Rmax = SQ2; best = min(((f((Rmax * math.cos(t), Rmax * math.sin(t))), t) for t in [i * 2 * math.pi / 100000 for i in range(100000)]))
print(f"  outside: stationary (2.95, 0.71) radius {math.hypot(2.95, 0.71):.3f} > {Rmax:.3f}; best on the edge at ({Rmax * math.cos(best[1]):.3f}, {Rmax * math.sin(best[1]):.3f}) y {best[0]:.4f}")
