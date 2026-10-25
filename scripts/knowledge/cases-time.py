#!/usr/bin/env python3
"""INDEPENDENT CASES — the line balance family (time study, allowances, combination table, person-machine,
ECRS, ranked positional weight, standard data, learning curve) — 25 October 2026.
Every number a unit test of src/tools/linework or src/tools/analysis (learning) asserts is printed here by
plain arithmetic, NumPy or SciPy, never by Faultline's code. Run: python3 scripts/knowledge/cases-time.py"""
import math
import numpy as np
from scipy import stats

print("# 1 · a timed element: observed, rated, basic, standard, how sure, cycles needed")
laps = [6.1, 5.9, 6.0, 6.2, 5.8, 6.0]
n = len(laps); m = float(np.mean(laps)); s = float(np.std(laps, ddof=1))
t = stats.t.ppf(0.975, n - 1)
print(f"  n {n} mean {m:.4f} sd {s:.4f} t(5) {t:.3f} margin ±{100*t*s/math.sqrt(n)/m:.2f}% at 95%")
print(f"  rated 110 -> basic {m*1.10:.4f}; +14% allowance -> standard {m*1.10*1.14:.4f}")
print(f"  cycles needed for ±5% at 95%: {math.ceil((t*s/(0.05*m))**2)} (t exact); the table's t at 5 df is 2.571")
laps2 = [8.0, 8.2, 7.9, 8.1, 8.0, 7.8]
m2 = float(np.mean(laps2)); s2 = float(np.std(laps2, ddof=1)); t2 = stats.t.ppf(0.975, 5)
print(f"  Fold and tape: mean {m2:.4f} sd {s2:.4f} margin ±{100*t2*s2/math.sqrt(6)/m2:.2f}%")
laps3 = [4.0, 4.4, 4.2, 4.1]
m3 = float(np.mean(laps3)); s3 = float(np.std(laps3, ddof=1)); t3 = stats.t.ppf(0.975, 3)
print(f"  four laps {laps3}: mean {m3:.4f} sd {s3:.4f} margin ±{100*t3*s3/math.sqrt(4)/m3:.2f}%; needed {math.ceil((t3*s3/(0.05*m3))**2)}")
print(f"  the record's reading: observed 4.2 rated 95 -> basic {4.2*.95:.3f}; standard at 14% {4.2*.95*1.14:.3f}")

print("\n# 2 · allowances built from named parts (the knowledge record's worked case — the parts are the case's, not a table)")
parts = {"personal needs": 5, "basic fatigue": 4, "standing": 2, "load 5 kg": 1, "monotony": 1, "noise": 2}
a = sum(parts.values()); basic = 42.0
print(f"  allowance {a}% -> standard {basic*(1+a/100):.3f} s, {3600/(basic*(1+a/100)):.2f} an hour; the allowance part {basic*a/100:.2f} s of {basic*(1+a/100):.3f}")
std = basic*(1+a/100); share = std - basic
print(f"  rest share of the standard = {share/std:.4f}; at £15/h that is £{share*15/3600:.5f} a pack; at a 12 s takt (300 an hour) £{share*15/3600*300:.3f} an hour")

print("\n# 3 · the combination table: one person, one machine on a timeline")
elements = [("load", "work", 10), ("run", "machine", 30), ("inspect", "work", 12), ("walk", "walk", 4)]
t0 = 0.0; mfree = 0.0; segs = []
for name, kind, sec in elements:
    if kind == "machine":
        st = max(t0, mfree); segs.append((name, kind, st, st + sec)); mfree = st + sec
    else:
        segs.append((name, kind, t0, t0 + sec)); t0 += sec
pend = t0; cycle = max(pend, mfree)
print(f"  segments {[(n_,k,round(a_,1),round(b_,1)) for n_,k,a_,b_ in segs]}")
print(f"  person ends {pend}, machine ends {mfree}, cycle {cycle}; the person waits {cycle-pend} s for the machine; machine busy {30/cycle:.4f} of the cycle")
elements2 = [("load", "work", 10), ("run", "machine", 8), ("pack", "work", 20), ("walk", "walk", 3)]
t0 = 0.0; mfree = 0.0
for name, kind, sec in elements2:
    if kind == "machine":
        st = max(t0, mfree); mfree = st + sec
    else:
        t0 += sec
print(f"  second case: person ends {t0}, machine ends {mfree} -> cycle {max(t0,mfree)}, the machine waits {t0-mfree} s for the person")
print(f"  waiting for the machine at £15/h: 14 s -> £{14*15/3600:.4f} a cycle; of a 40 s cycle that is {14/40:.2%} of their pay, £{0.35*15:.2f} an hour")

print("\n# 4 · the person tending machines: N' = (l+m)/(l+w) — the knowledge record's case (minutes -> seconds)")
l, mm, w = 72.0, 360.0, 18.0
N = (l + mm) / (l + w); print(f"  l {l} m {mm} w {w} s: N' {N:.4f}")
for k in range(1, 7):
    cyc = max(l + mm, k * (l + w)); out = k * 3600 / cyc; idle = max(0, cyc - k * (l + w)); mw = max(0, cyc - (l + mm))
    cost = (20 + 35 * k) / 3600 * cyc / k
    print(f"  n={k}: cycle {cyc:.0f} s, machine-cycles an hour {out:.4f}, person idle {idle:.0f} s, each machine waits {mw:.0f} s, cost a machine-cycle £{cost:.4f}; operator alone £{20/3600*cyc/k:.4f}")
print(f"  5 against 4: output +{(5*3600/450)/(4*3600/432)-1:.4%}; at 10 packs a cycle and £0.25 a pack: +£{((5*3600/450)-(4*3600/432))*10*0.25:.2f} an hour")

print("\n# 5 · ranked positional weight (Helgeson and Birnie 1961), second implementation")
T = {"A": 6, "B": 4, "C": 5, "D": 3, "E": 7, "F": 2, "G": 4, "H": 3}
pred = {"A": [], "B": ["A"], "C": ["A"], "D": ["B"], "E": ["C"], "F": ["D", "E"], "G": ["F"], "H": ["G"]}
succ = {k: [j for j in T if k in pred[j]] for k in T}


def allsucc(k, seen=None):
    seen = set() if seen is None else seen
    for j in succ[k]:
        if j not in seen:
            seen.add(j); allsucc(j, seen)
    return seen


def rpw(T, pred, takt):
    succ_ = {k: [j for j in T if k in pred[j]] for k in T}

    def alls(k, seen=None):
        seen = set() if seen is None else seen
        for j in succ_[k]:
            if j not in seen:
                seen.add(j); alls(j, seen)
        return seen
    wt = {k: T[k] + sum(T[j] for j in alls(k)) for k in T}
    order = sorted(T, key=lambda k: (-wt[k], list(T).index(k)))
    done, stations, cur, load = set(), [], [], 0.0
    while len(done) < len(T):
        cand = [k for k in order if k not in done and all(p in done for p in pred[k])]
        fit = [k for k in cand if load + T[k] <= takt + 1e-9]
        if fit:
            k = fit[0]; cur.append(k); load += T[k]; done.add(k)
        else:
            if cur:
                stations.append((cur, load)); cur, load = [], 0.0
            else:  # nothing fits an empty station: an element longer than takt goes alone
                k = cand[0]; cur.append(k); load += T[k]; done.add(k)
    if cur:
        stations.append((cur, load))
    return wt, stations


wt, st = rpw(T, pred, 12)
print(f"  weights {wt}")
print(f"  takt 12: stations {[(''.join(c), l_) for c, l_ in st]}; people {len(st)}; theoretical minimum {math.ceil(sum(T.values())/12)}; efficiency (work / (people x longest)) {sum(T.values())/(len(st)*max(l_ for _, l_ in st)):.4f}; vs takt {sum(T.values())/(len(st)*12):.4f}")
wt, st = rpw(T, pred, 10)
print(f"  takt 10: stations {[(''.join(c), l_) for c, l_ in st]}; people {len(st)}; theoretical minimum {math.ceil(sum(T.values())/10)}")
T2 = {"P": 5, "Q": 5, "R": 5, "S": 3}; pr2 = {k: [] for k in T2}
wt, st = rpw(T2, pr2, 10); print(f"  no precedence, takt 10: {[(''.join(c), l_) for c, l_ in st]}")
T3 = {"X": 7, "Y": 7, "Z": 7}; pr3 = {"X": [], "Y": ["X"], "Z": ["Y"]}
wt, st = rpw(T3, pr3, 12); print(f"  chain 7+7+7, takt 12: {[(''.join(c), l_) for c, l_ in st]}")
T4 = {"L": 14, "M": 3}; pr4 = {"L": [], "M": ["L"]}
wt, st = rpw(T4, pr4, 12); print(f"  an element over takt alone, takt 12: {[(''.join(c), l_) for c, l_ in st]}")

print("\n# 6 · ECRS — the knowledge record's six elements and their money")
before = [6, 4, 18, 7, 9, 5]; after = [0, 2, 18, 0, 9, 1]
b, a_ = sum(before), sum(after)
print(f"  before {b} s, after {a_} s: {100*(1-a_/b):.2f}% less; against a 40 s takt {100*b/40:.1f}% -> {100*a_/40:.1f}% loaded; saved {b-a_} s")
rate = 15.0
print(f"  at £{rate}/h: £{(b-a_)*rate/3600:.5f} a pack, £{(b-a_)*rate/3600*1000:.2f} for every 1,000 packs; at a 40 s takt (90 an hour) £{(b-a_)*rate/3600*90:.3f} an hour")
print(f"  a £120 staging rack and belt move pays back in {120/((b-a_)*rate/3600*90):.2f} hours at takt")

print("\n# 7 · standard data — a new job from library elements (the record's case)")
lib = {"pick case from pallet": 3.2, "open case": 2.1, "place 12 packs": 9.6, "close and tape": 4.4, "walk 2 m": 1.4}
cnt = {"pick case from pallet": 1, "open case": 1, "place 12 packs": 2, "close and tape": 1, "walk 2 m": 2}
bs = sum(lib[k] * cnt[k] for k in cnt)
print(f"  basic {bs:.2f} s; at 11% {bs*1.11:.4f} s; {3600/(bs*1.11):.2f} an hour")
print(f"  a reused element timed elsewhere at observed 5.0, rated 110: basic {5.0*1.10:.2f}; here at 12%: {5.0*1.10*1.12:.3f}")

print("\n# 8 · the learning curve — Wright's unit-time form (the record's eight runs), SciPy")
runs = np.arange(1, 9); Tn = np.array([68, 58, 53, 49, 47, 45, 44, 43], dtype=float)
lr = stats.linregress(np.log(runs), np.log(Tn)); b_ = lr.slope; rate_ = 2 ** b_
T1 = math.exp(lr.intercept)
print(f"  b {b_:.5f}  T1 {T1:.4f}  rate {rate_:.5f}  R2 {lr.rvalue**2:.5f}  se(b) {lr.stderr:.5f}")
print(f"  run 16 {T1*16**b_:.3f}  run 32 {T1*32**b_:.3f}  run reaching 40 s: {math.ceil((40/T1)**(1/b_))}  (exact {(40/T1)**(1/b_):.4f})")
print(f"  mean of the first 8 {Tn.mean():.3f}; fitted total of the first 8 {sum(T1*k**b_ for k in range(1,9)):.3f}; at 40 s standard 8 runs {8*40}")
print(f"  extra time to learn over the first 8 runs against a 40 s standard: {sum(Tn)-8*40:.0f} s; at £15/h £{(sum(Tn)-8*40)*15/3600:.4f}")
ci = stats.t.ppf(0.975, 6) * lr.stderr
print(f"  95% interval for b: {b_-ci:.4f} to {b_+ci:.4f} -> rate {2**(b_-ci):.4f} to {2**(b_+ci):.4f}")
bb = math.log2(0.8); T80 = 100 * runs ** bb
l80 = stats.linregress(np.log(runs), np.log(T80)); print(f"  an exact 80% curve: slope {l80.slope:.6f} (log2 0.8 = {bb:.6f}), rate {2**l80.slope:.6f}")

print("\n# 8b · the learning curve — the standard's run and its interval, the plan, what learning costs (the same eight runs, standard 40 s)")
S = 40.0
need = lambda bb: math.ceil((S / T1) ** (1 / bb) - 1e-9)
b_lo, b_hi = b_ - ci, b_ + ci
print(f"  run reaching {S:.0f} s: {need(b_)}; by the slope's interval run {need(b_hi)} to run {need(b_lo)}; the first run read at or under it: {int(np.argmax(Tn <= S)) + 1 if (Tn <= S).any() else 'none yet'}")
nstar = need(b_)
avg_nstar = sum(T1 * k ** b_ for k in range(1, nstar + 1)) / nstar
extra = sum(max(0.0, T1 * k ** b_ - S) for k in range(1, nstar + 1))
print(f"  the first {nstar} runs average {avg_nstar:.3f} s on the curve (the eight read averaged {Tn.mean():.3f}); the extra over the standard to run {nstar}: {extra:.3f} s a unit")
print(f"  with 1,200 units a reading at £15/h: {extra*1200/3600:.2f} hours, £{extra*1200*15/3600:.2f}")
print(f"  run {2*8} {T1*16**b_:.3f}, run {4*8} {T1*32**b_:.3f}")
print(f"  the runs test on the residuals of the fit: see scipy-free count — residual signs {''.join('+' if r > 0 else '-' for r in (np.log(Tn) - (lr.intercept + lr.slope * np.log(runs))))}")
