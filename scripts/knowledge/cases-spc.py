#!/usr/bin/env python3
"""INDEPENDENT CASES — SPC records brought to full depth (knowledge/methods/spc, 24 October 2026).
Every number quoted in a record's "Worked case" is printed here by SciPy/NumPy, never by Faultline's own
code (knowledge/STANDARD.md, step 4). Run: python3 -I scripts/knowledge/cases-spc.py"""
import math
import numpy as np
from scipy import stats

print("# spc.cusum-ewma — fill weights, target 400.0 g, sigma 0.8 g; a +1.0 g shift from reading 21")
rng = np.random.default_rng(7)
x = 400.0 + 0.8 * rng.standard_normal(40)
x[20:] += 1.0
x = np.round(x, 1)
mu0, sigma = 400.0, 0.8
k, h = 0.5 * sigma, 5 * sigma
cp = cm = 0.0; first = None
for i, xi in enumerate(x, 1):
    cp = max(0.0, xi - (mu0 + k) + cp); cm = max(0.0, (mu0 - k) - xi + cm)
    if first is None and (cp > h or cm > h): first = (i, round(cp, 2), round(cm, 2))
print("  readings:", [float(v) for v in x])
print(f"  K = {k} g, H = {h} g; first signal at reading {first[0]} (C+ = {first[1]}, C- = {first[2]})")
lam, L = 0.2, 2.962
z = mu0; zs = []; ew_first = None
for i, xi in enumerate(x, 1):
    z = lam * xi + (1 - lam) * z; zs.append(z)
    w = L * sigma * math.sqrt(lam / (2 - lam) * (1 - (1 - lam) ** (2 * i)))
    if ew_first is None and abs(z - mu0) > w: ew_first = (i, round(z, 3), round(mu0 + w, 3))
print(f"  EWMA lambda {lam}, L {L}: steady-state half-width {L*sigma*math.sqrt(lam/(2-lam)):.4f} g; first signal at reading {ew_first[0]} (z = {ew_first[1]}, UCL = {ew_first[2]})")
# Shewhart on the same readings: the first point beyond 400 +/- 3*0.8
sh = next((i for i, xi in enumerate(x, 1) if abs(xi - mu0) > 3 * sigma), None)
print(f"  Shewhart (3 sigma = +/- 2.4 g) first point beyond: {sh}")
def arl_siegmund(k, h, delta):
    # Siegmund (1985) approximation, one-sided CUSUM, k and h in sigma units, delta the true shift in sigma
    d = delta - k; b = h + 1.166
    if abs(d) < 1e-9: return b * b
    return (math.exp(-2 * d * b) - 1 + 2 * d * b) / (2 * d * d)
print("  Siegmund ARL, one-sided CUSUM k=0.5, h=5: shift 0 ->", round(arl_siegmund(0.5, 5, 0), 1), "; shift 1 sigma ->", round(arl_siegmund(0.5, 5, 1.0), 2), "; two-sided ARL0 ~", round(arl_siegmund(0.5, 5, 0) / 2, 1))
print("  Shewhart ARL at a 1 sigma shift (3 sigma limits):", round(1 / (1 - (stats.norm.cdf(2) - stats.norm.cdf(-4))), 1), "; in control", round(1 / (2 * stats.norm.sf(3)), 1))

print("\n# spc.run-rules — the chance each rule fires on one in-control normal point (Western Electric / Nelson)")
p3 = 2 * stats.norm.sf(3); pA = stats.norm.sf(2); pB = stats.norm.sf(1); pC = stats.norm.cdf(1) - stats.norm.cdf(-1)
print(f"  one beyond 3 sigma: {p3:.5f} (ARL {1/p3:.0f})")
r2 = 2 * (3 * pA**2 * (1 - pA) + pA**3); print(f"  2 of 3 beyond 2 sigma, same side: {r2:.5f}")
r4 = 2 * (5 * pB**4 * (1 - pB) + pB**5); print(f"  4 of 5 beyond 1 sigma, same side: {r4:.5f}")
print(f"  8 in a row one side: {2 * 0.5**8:.5f}; 9 in a row (Nelson): {2 * 0.5**9:.5f}")
print(f"  15 in a row within 1 sigma: {pC**15:.6f}")
print("  combined false-alarm rate, rules 1-4 as independent (an upper bound):", round(1 - (1 - p3) * (1 - r2) * (1 - r4) * (1 - 2 * 0.5**8), 4))

print("\n# spc.pre-control — zone probabilities for a centred process at Cp = 1, 1.33 and 2 (tolerance = 6 sigma at Cp 1)")
for cp_ in [1.0, 1.33, 2.0]:
    t = 3 * cp_  # half tolerance in sigma
    g = stats.norm.cdf(t / 2) - stats.norm.cdf(-t / 2); r = 2 * stats.norm.sf(t); a = 1 - g - r
    print(f"  Cp {cp_}: green {g:.4f}, amber {a:.4f}, red {r:.5f}; five greens to set up {g**5:.4f}; a pair 'two amber same side' {2*(a/2)**2:.5f}")
print("  a process shifted +1.5 sigma at Cp 1: green", round(stats.norm.cdf(1.5 - 1.5) - stats.norm.cdf(-1.5 - 1.5), 4), "red", round(stats.norm.sf(3 - 1.5) + stats.norm.cdf(-3 - 1.5), 4))

print("\n# spc.machine-capability — 50 consecutive packs off a new bagger, 500 +/- 5 g")
rng = np.random.default_rng(3)
parts = np.round(501.2 + 0.9 * rng.standard_normal(50), 1)
m, s = parts.mean(), parts.std(ddof=1)
usl, lsl = 505, 495
cm = (usl - lsl) / (6 * s); cmk = min(usl - m, m - lsl) / (3 * s)
n = len(parts)
lo = cmk - stats.norm.ppf(0.95) * math.sqrt(1 / (9 * n) + cmk**2 / (2 * (n - 1)))
print(f"  mean {m:.3f}, s {s:.4f}, Cm {cm:.3f}, Cmk {cmk:.3f}, Bissell 95% lower bound on Cmk {lo:.3f}; passes 1.67? {cmk >= 1.67}, surely? {lo >= 1.67}")
print(f"  x-bar range: {parts.min()} to {parts.max()}; XmR limits {m - 2.66*np.mean(np.abs(np.diff(parts))):.2f} to {m + 2.66*np.mean(np.abs(np.diff(parts))):.2f}")

print("\n# spc.short-run — DNOM on two products on one filler (nominal 250 and 500), pooled XmR; Levene on the spreads")
rng = np.random.default_rng(11)
a = np.round(250 + 1.1 * rng.standard_normal(12), 1); b = np.round(500 + 1.3 * rng.standard_normal(10), 1)
ya = a - 250; yb = b - 500; y = np.concatenate([ya, yb])
mr = np.mean(np.abs(np.diff(y)))
print(f"  deviations: A {[float(v) for v in np.round(ya,1)]}, B {[float(v) for v in np.round(yb,1)]}")
print(f"  pooled: centre {y.mean():.3f}, MR-bar {mr:.3f}, limits {y.mean()-2.66*mr:.3f} to {y.mean()+2.66*mr:.3f}")
W, p = stats.levene(ya, yb, center='median'); print(f"  Levene W = {W:.3f}, p = {p:.3f} (spreads alike enough to pool when p > 0.05)")
print(f"  Z-MR: s_A {ya.std(ddof=1):.3f}, s_B {yb.std(ddof=1):.3f}; last B reading z = {(yb[-1])/yb.std(ddof=1):.3f}")

print("\n# spc.held-at-rate — 25 one-minute counts against a floor of 60 a minute")
rng = np.random.default_rng(5)
counts = np.clip(np.round(62 + 3 * rng.standard_normal(25)), 50, 75).astype(int)
counts[7] = 55; counts[8] = 54
met = counts >= 60
runs = []; run = 0
for v in met:
    run = run + 1 if v else 0; runs.append(run)
print("  counts:", [int(v) for v in counts])
print(f"  met {met.sum()} of 25 ({met.mean():.0%}); longest stretch {max(runs)} min; made {counts.sum()} of {60*25} expected ({counts.sum()/(60*25):.3f})")
ppk = (counts.mean() - 60) / (3 * counts.std(ddof=1))
print(f"  one-sided Ppk on the counts {ppk:.3f}; lag-1 autocorrelation {np.corrcoef(counts[:-1], counts[1:])[0,1]:.3f}")
