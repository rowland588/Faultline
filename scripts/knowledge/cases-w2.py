#!/usr/bin/env python3
"""INDEPENDENT CASES — W2, charts on readings in order (knowledge/specs/FC-086-charts.md, 24 October 2026).
Every figure the chart tool's tests assert is printed here by SciPy/NumPy, never by Faultline's own code
(knowledge/STANDARD.md, step 4). The CUSUM/EWMA, run-rule, pre-control and short-run cases are in cases-spc.py;
this file adds the subgroup chart, the runs about the median, Sen's slope and the constants.
Run: python3 -I scripts/knowledge/cases-w2.py"""
import math
import numpy as np
from scipy import stats

print("== Control-chart constants (ASTM/ISO 7870-2 tables, from d2, d3, c4)")
# d2, d3 by numerical integration of the range distribution; c4 closed form
def d2d3(m):
    # E[R] and SD[R] of the range of m standard normals
    from scipy import integrate
    f = lambda w: 1 - (stats.norm.cdf(w + 0) ) # placeholder, replaced below
    # E[R] = ∫ [1 - (1-Φ(x))^m - Φ(x)^m] dx over all x
    ER = integrate.quad(lambda x: 1 - (1 - stats.norm.cdf(x))**m - stats.norm.cdf(x)**m, -10, 10)[0]
    # E[R^2] = 2∫∫_{x<y} ... use the known formula via order statistics: simulate exactly with quad on joint density is heavy; use high-n Monte Carlo as a check instead
    rng = np.random.default_rng(1); R = np.ptp(rng.standard_normal((400000, m)), axis=1)
    return ER, R.std()
for m in (2, 3, 4, 5):
    d2, d3 = d2d3(m); A2 = 3 / (d2 * math.sqrt(m)); D4 = 1 + 3 * d3 / d2; D3 = max(0.0, 1 - 3 * d3 / d2)
    c4 = math.sqrt(2 / (m - 1)) * math.gamma(m / 2) / math.gamma((m - 1) / 2)
    print(f"  m {m}: d2 {d2:.3f} (table {[1.128,1.693,2.059,2.326][m-2]}), d3 ≈ {d3:.3f}, A2 {A2:.3f}, D3 {D3:.3f}, D4 {D4:.3f} (±0.01 by Monte Carlo), c4 {c4:.4f}, A3 {3/(c4*math.sqrt(m)):.3f}")
print(f"  2.66 = 3/d2(2) = {3/1.128:.3f}; 3.267 = D4(2) = {1 + 3*0.8525/1.128:.3f}")

print("\n== X̄-R on subgroups of 4 (FC-087): six subgroups of fill weights")
G = [[400.2, 399.8, 400.5, 400.1], [399.9, 400.4, 400.0, 399.6], [400.3, 400.1, 399.7, 400.6], [400.8, 401.2, 400.9, 401.5], [400.0, 399.5, 400.2, 399.9], [400.4, 400.0, 400.3, 399.8]]
xb = [np.mean(g) for g in G]; R = [np.ptp(g) for g in G]; XB = np.mean(xb); RB = np.mean(R)
A2, D3, D4 = 0.729, 0.0, 2.282
print(f"  X̄ {np.round(xb,3).tolist()}; R {np.round(R,2).tolist()}; X̿ {XB:.4f} R̄ {RB:.4f}")
print(f"  X̄ limits {XB - A2*RB:.3f}–{XB + A2*RB:.3f}; R limits {D3*RB:.3f}–{D4*RB:.3f}; subgroup 4 mean {xb[3]:.3f} -> {'outside' if xb[3] > XB + A2*RB else 'inside'}")

print("\n== XmR on the CUSUM case's first 20 (the steady period), then the shifted 20 judged against them")
x = [400.0, 400.2, 399.8, 399.3, 399.6, 399.2, 400.0, 401.1, 399.6, 399.5, 400.4, 400.3, 400.1, 399.3, 400.0, 400.6, 398.9, 399.6, 398.5, 399.0, 399.5, 400.8, 400.0, 401.2, 401.1, 400.9, 399.0, 400.6, 401.0, 401.1, 399.8, 400.6, 400.2, 400.4, 401.8, 400.4, 401.0, 401.7, 400.5, 400.9]
st = np.array(x[:20]); mr = np.abs(np.diff(st)).mean(); c = st.mean()
print(f"  centre {c:.3f}, MR̄ {mr:.4f}, limits {c - 2.66*mr:.3f}–{c + 2.66*mr:.3f}, MR UCL {3.267*mr:.3f}")
later = np.array(x[20:]); beyond = [(21 + i, v) for i, v in enumerate(later) if v > c + 2.66*mr or v < c - 2.66*mr]
print(f"  frozen limits: later points beyond {beyond}; run of 8 above centre from reading {next((21+i for i in range(len(later)-7) if all(later[i:i+8] > c)), None)}")
# Nelson 2 (nine) and WE (eight) on one side, Nelson 3 six rising
def runs_one_side(v, c, n):
    out = []
    for i in range(len(v) - n + 1):
        w = v[i:i+n]
        if all(w > c) or all(w < c): out.append(i + 1)
    return out
allv = np.array(x)
print(f"  eight on one side (WE), start indices on all 40 against the frozen centre: {runs_one_side(allv, c, 8)[:3]}…")

print("\n== Runs about the median (stats.time-series-trend) — the critical runs table (Swed & Eisenhart, 5%)")
# minimum runs for n points (half above/below): n=12->4? compute exact via the runs distribution for n1=n2=n/2
def min_runs(n1, n2, alpha=0.05):
    from math import comb
    N = n1 + n2; total = comb(N, n1); probs = {}
    for r in range(2, N + 1):
        if r % 2 == 0:
            k = r // 2; p = 2 * comb(n1 - 1, k - 1) * comb(n2 - 1, k - 1)
        else:
            k = (r - 1) // 2; p = comb(n1 - 1, k) * comb(n2 - 1, k - 1) + comb(n1 - 1, k - 1) * comb(n2 - 1, k)
        probs[r] = p / total
    cum = 0; 
    for r in sorted(probs):
        cum += probs[r]
        if cum > alpha / 2: return r  # the smallest r with P(R ≤ r−1) ≤ α/2 ... report r-1 as 'fewer than r is a signal'
    return None
for n in (10, 12, 16, 20, 24, 30):
    r = min_runs(n // 2, n // 2); print(f"  n {n}: fewer than {r} runs is a signal (two-sided 5%)")

print("\n== Twelve weekly reject rates (cases-stats.py's series): Sen's slope and Mann–Kendall")
rr = np.array([2.1, 2.3, 1.9, 2.4, 2.2, 2.6, 2.5, 2.8, 2.7, 3.0, 2.9, 3.2]); wk = np.arange(1, 13)
slopes = [(rr[j] - rr[i]) / (j - i) for i in range(12) for j in range(i + 1, 12)]
tau, p = stats.kendalltau(wk, rr); S = sum(np.sign(rr[j] - rr[i]) for i in range(12) for j in range(i + 1, 12))
med = np.median(rr); above = rr > med; nruns = 1 + int((above[1:] != above[:-1]).sum())
print(f"  Sen's slope {np.median(slopes):.4f} a week; Kendall S {S:.0f}, τ {tau:.4f}, p {p:.5f}; runs about the median {med}: {nruns} (signal under {min_runs(6,6)})")
ls = stats.linregress(wk, rr); print(f"  least squares slope {ls.slope:.4f} p {ls.pvalue:.6f} R² {ls.rvalue**2:.3f}")

print("\n== Pre-control zones at Cp 1.33 and the first-off: five greens")
for cp in (1.0, 1.33, 2.0):
    s = 1 / (cp * 3) * 0.5  # tolerance ±t with t = 1 (half-tolerance), σ = t/(3·Cp)
    sig = 1 / (3 * cp); g = stats.norm.cdf(0.5 / sig) - stats.norm.cdf(-0.5 / sig); r = 2 * (1 - stats.norm.cdf(1 / sig))
    print(f"  Cp {cp}: green {g:.3%}, amber {1-g-r:.3%}, red {r:.3%}, five greens {g**5:.1%}")
