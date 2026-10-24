#!/usr/bin/env python3
"""INDEPENDENT CASES — quality records brought to full depth (knowledge/methods/quality, 24 October 2026).
Every number in a record's "Worked case" is printed here by SciPy/NumPy, never by Faultline's code."""
import math
import numpy as np
from scipy import stats

print("# quality.acceptance-sampling-attributes — the OC curve of n=125, c=3 (and n=50, c=1)")
for n, c in [(125, 3), (50, 1), (200, 5)]:
    pts = {p: stats.binom.cdf(c, n, p) for p in [0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.10]}
    print(f"  n={n}, c={c}: " + ", ".join(f"p={p:.3f} Pa={pa:.3f}" for p, pa in pts.items()))
    # producer's risk at AQL 1%, consumer's at LQ 5%
    print(f"    at AQL 1.0%: Pa {stats.binom.cdf(c, n, 0.01):.3f} (producer's risk {1-stats.binom.cdf(c, n, 0.01):.3f}); LQ where Pa = 0.10: p = {next(p for p in np.arange(0.001, 0.3, 0.0005) if stats.binom.cdf(c, n, p) <= 0.10):.4f}")
# AOQ and ATI for n=125 c=3 with lot N=3000 and rectifying inspection
N = 3000; n, c = 125, 3
aoq = {p: p * stats.binom.cdf(c, n, p) * (N - n) / N for p in [0.01, 0.02, 0.03, 0.04, 0.05]}
print("  AOQ (N=3000, rectifying):", {k: round(v, 4) for k, v in aoq.items()}, "AOQL ~", round(max(p * stats.binom.cdf(c, n, p) * (N - n) / N for p in np.arange(0.001, 0.2, 0.0005)), 4))
print(f"  ATI at p=0.02: {n + (1 - stats.binom.cdf(c, n, 0.02)) * (N - n):.0f} of 3000")
# hypergeometric vs binomial for a small lot
print(f"  small lot N=200, n=50, c=1 at 5% defective (10 in the lot): hypergeometric Pa {stats.hypergeom.cdf(1, 200, 10, 50):.3f} vs binomial {stats.binom.cdf(1, 50, 0.05):.3f}")

print("\n# quality.acceptance-sampling-variables — k-method, one-sided lower limit (seal strength >= 10 N)")
# design: AQL p1 = 1% at Pa 0.95, LQ p2 = 8% at Pa 0.10; sigma unknown
z1, z2 = stats.norm.ppf(1 - 0.01), stats.norm.ppf(1 - 0.08); za, zb = stats.norm.ppf(0.95), stats.norm.ppf(0.90)
k = (z1 * zb + z2 * za) / (za + zb); n_sig_unknown = math.ceil(((za + zb) / (z1 - z2)) ** 2 * (1 + k * k / 2))
print(f"  k = {k:.3f}, n (sigma unknown) = {n_sig_unknown}; sigma known n = {math.ceil(((za + zb) / (z1 - z2)) ** 2)}")
xs = np.array([13.1, 12.4, 14.0, 11.8, 12.9, 13.5, 12.2, 13.8, 12.6, 13.0, 11.9, 13.3, 12.7, 13.6, 12.1, 13.2, 12.8, 13.9, 12.3, 13.4])
m, s = xs.mean(), xs.std(ddof=1); Q = (m - 10) / s
print(f"  sample of 20: mean {m:.3f}, s {s:.3f}, Q = (x-bar - L)/s = {Q:.3f} vs k {k:.3f} -> {'accept' if Q >= k else 'reject'}; implied fraction under 10 N ~ {stats.norm.sf(Q):.5f}")

print("\n# quality.sensory-difference — the triangle test (p0 = 1/3)")
for n, x in [(24, 12), (24, 13), (36, 17), (18, 10)]:
    p = stats.binom.sf(x - 1, n, 1/3)
    print(f"  {x} of {n} correct: p = {p:.4f} ({'difference shown at 5%' if p < 0.05 else 'not shown'}); minimum correct for 5%: {int(stats.binom.ppf(0.95, n, 1/3)) + 1}")
# proportion of distinguishers (Abbott) and its interval
n, x = 36, 17; pc = x / n; pd = (pc - 1/3) / (2/3); print(f"  36 trials, 17 correct: proportion distinguishing (Abbott) {pd:.3f}; 90% one-sided upper bound on pd {(stats.beta.ppf(0.90, x + 1, n - x) - 1/3) / (2/3):.3f}")
# power / sample size for a similarity test
pd_target = 0.3; pc_alt = 1/3 + 2/3 * pd_target
for n in [24, 36, 60, 90]:
    crit = int(stats.binom.ppf(0.95, n, 1/3)) + 1; power = stats.binom.sf(crit - 1, n, pc_alt); print(f"  n={n}: critical {crit}, power to find 30% distinguishers {power:.2f}")

print("\n# quality.fpy-rty — a four-step line: first pass yield each, rolled throughput yield")
fpy = {"slice": 0.985, "weigh": 0.96, "seal": 0.975, "label": 0.99}
rty = math.prod(fpy.values()); print(f"  FPY {fpy}; RTY {rty:.4f}; normalised yield per step {rty ** (1/4):.4f}")
print(f"  from DPU: seal DPU 0.025 -> FPY e^-0.025 = {math.exp(-0.025):.4f}; final yield (after rework) might be 0.995 while RTY is {rty:.3f} — the hidden factory {1 - rty:.3f}")
print(f"  10,000 packs in: {10000 * rty:.0f} right first time; {10000 * (1 - rty):.0f} reworked or lost")

print("\n# quality.complaints — CPMU and its Poisson bounds; is this month different?")
for c, units in [(7, 1_200_000), (12, 1_250_000), (3, 400_000)]:
    lo = 0 if c == 0 else stats.chi2.ppf(0.025, 2 * c) / 2 / units * 1e6; hi = stats.chi2.ppf(0.975, 2 * c + 2) / 2 / units * 1e6
    print(f"  {c} complaints on {units:,} units: CPMU {c/units*1e6:.2f} (95% {lo:.2f}-{hi:.2f})")
# u-chart limits around the 12-month mean
months_c = [7, 9, 6, 8, 11, 7, 12, 8, 9, 7, 10, 12]; months_u = [1.2e6] * 12; ubar = sum(months_c) / sum(months_u) * 1e6
print(f"  12-month mean CPMU {ubar:.2f}; u-chart UCL for a 1.2 M month {ubar + 3 * math.sqrt(ubar / 1.2):.2f}; a month at 12 complaints = {12/1.2:.2f} — inside")
print(f"  two rates: 12 on 1.25 M vs 7 on 1.2 M, exact Poisson comparison (binomial on 12 of 19 with p = 1.25/2.45): p = {2 * min(stats.binom.cdf(7, 19, 1.2/2.45), stats.binom.sf(6, 19, 1.2/2.45)):.3f}")

print("\n# quality.copq — PAF buckets, a week of one line")
buckets = {"prevention": 1800, "appraisal": 3200, "internal failure": 9400, "external failure": 2600}
tot = sum(buckets.values()); sales = 310000
for k, v in buckets.items(): print(f"  {k}: £{v:,} ({v/tot:.0%})")
print(f"  total £{tot:,} = {tot/sales:.1%} of sales; failure share {(buckets['internal failure']+buckets['external failure'])/tot:.0%}")

print("\n# quality.fmea — AP from S, O, D (AIAG-VDA 2019 table, from knowledge) and the old RPN")
def ap(S, O, D):
    # the handbook's action-priority table, abridged as the record states it; S 9-10 rows dominate
    if S >= 9:
        if O >= 6: return 'H'
        if O >= 4: return 'H' if D >= 2 else 'M'
        if O >= 2: return 'H' if D >= 5 else 'M' if D >= 2 else 'L'
        return 'L'
    if S >= 7:
        if O >= 8: return 'H'
        if O >= 6: return 'H' if D >= 2 else 'M'
        if O >= 4: return 'H' if D >= 5 else 'M'
        if O >= 2: return 'M' if D >= 5 else 'L'
        return 'L'
    if S >= 4:
        if O >= 8: return 'H' if D >= 5 else 'M'
        if O >= 6: return 'M' if D >= 2 else 'L'
        if O >= 4: return 'M' if D >= 5 else 'L'
        return 'L'
    if S >= 2:
        if O >= 8: return 'M' if D >= 5 else 'L'
        return 'L'
    return 'L'
for S, O, D in [(9, 3, 4), (6, 7, 3), (3, 9, 8), (8, 2, 9), (10, 1, 10)]:
    print(f"  S{S} O{O} D{D}: AP {ap(S, O, D)}, RPN {S*O*D}")

print("\n# quality.supplier-quality — PPM by supplier with its interval, and a trend")
for name, d, n in [("A", 14, 180_000), ("B", 3, 22_000), ("C", 0, 60_000)]:
    lo = 0 if d == 0 else stats.beta.ppf(0.025, d, n - d + 1); hi = stats.beta.ppf(0.975, d + 1, n - d)
    print(f"  {name}: {d} of {n:,} -> {d/n*1e6:.0f} ppm (95% {lo*1e6:.0f}-{hi*1e6:.0f})")
print(f"  B vs A: Fisher exact p {stats.fisher_exact([[3, 22000-3],[14, 180000-14]])[1]:.3f} — not shown different")

print("\n# quality.nonconformance-hold — what a hold costs")
packs, mat, labour, margin, days = 4800, 0.42, 0.11, 0.35, 6
print(f"  4,800 packs held 6 days: tied up £{packs*(mat+labour):,.0f} (materials+labour); if scrapped the loss is that plus the margin not earned £{packs*margin:,.0f} = £{packs*(mat+labour+margin):,.0f}; if released nothing but the review's hours; if reworked: labour again")
print(f"  carrying while held at 12% a year: £{packs*(mat+labour)*0.12*days/365:.2f} — small; the shelf life lost is the real cost: {days} of a 21-day life = {days/21:.0%}")

print("\n# quality.defect-concentration — faults by region of the pack (a 3x3 grid), is it uniform?")
grid = np.array([[2, 3, 14], [1, 2, 9], [2, 1, 3]])
chi2, p = stats.chisquare(grid.flatten()); print(f"  counts {grid.tolist()}; chi-square against uniform {chi2:.1f}, p {p:.2e}; right column holds {grid[:,2].sum()/grid.sum():.0%}")

print("\n# quality.check-sheet — a shift's tally by fault, the rate per 1,000 and its upper bound")
tally = {"seal wrinkle": 23, "weight low": 11, "label skew": 9, "print": 4, "other": 3}; inspected = 2400
for k, v in tally.items(): print(f"  {k}: {v} -> {v/inspected*1000:.1f} per 1,000 (95% upper {stats.beta.ppf(0.975, v + 1, inspected - v)*1000:.1f})")
tot = sum(tally.values()); print(f"  total {tot} on {inspected}: {tot/inspected:.2%} — the top two are {(23+11)/tot:.0%} of faults")
