"""Independent cases for W1 — the capability study's modes (knowledge/specs/FC-094-capability.md parts 2–4).

Run: python3 -I scripts/knowledge/cases-w1.py ; numbers pasted into src/lib/ie/__tests__/dist.test.ts and sample.test.ts.
"""
import numpy as np
from scipy import stats

print("== Rejects out of what was made (FC-098, spc.capability-attribute-proportion)")
runs = [(4800, 24), (5100, 31), (4650, 19), (5000, 28), (4900, 41), (5200, 22)]
N = sum(n for n, _ in runs); D = sum(d for _, d in runs); pbar = D / N
print(f"  N {N:,} D {D} p̄ {pbar:.5f} = {pbar*1e6:,.0f} per million; pass rate {1-pbar:.4%}")
lo = stats.beta.ppf(0.025, D, N - D + 1) if D else 0.0; hi = stats.beta.ppf(0.975, D + 1, N - D); up95 = stats.beta.ppf(0.95, D + 1, N - D)
print(f"  Clopper–Pearson 95% two-sided {lo:.5f}–{hi:.5f}; one-sided 95% upper {up95:.5f}")
for n, d in runs:
    p = d / n; s = np.sqrt(pbar * (1 - pbar) / n); print(f"    run n {n} d {d} p {p:.5f}  p-chart limits {max(0, pbar-3*s):.5f}–{pbar+3*s:.5f} {'OUT' if p > pbar+3*s or p < pbar-3*s else ''}")
z = np.array([(d/n - pbar) / np.sqrt(pbar*(1-pbar)/n) for n, d in runs]); mr = np.mean(np.abs(np.diff(z))); sz = mr / 1.128
print(f"  Laney: z {np.round(z,2).tolist()} MR̄(z) {mr:.3f} σz {sz:.3f} -> {'plain chart right (σz≈1)' if 0.8 < sz < 1.25 else 'Laney p′ limits ×σz'}")
Z = stats.norm.isf(pbar); print(f"  process Z {Z:.2f}, Ppk-equivalent {Z/3:.2f}; sigma level (+1.5) {Z+1.5:.2f}")
p0 = 0.01; print(f"  against p₀ {p0:.0%}: upper {up95:.5f} {'≤' if up95 <= p0 else '>'} p₀ -> {'MET' if up95 <= p0 else ('not shown yet' if pbar <= p0 else 'NOT MET')}")
p0 = 0.005; print(f"  against p₀ {p0:.1%}: p̄ {pbar:.5f} {'≤' if pbar <= p0 else '>'} p₀, upper {up95:.5f} -> {'MET' if up95 <= p0 else ('not shown yet' if pbar <= p0 else 'NOT MET')}; lower {lo:.5f} {'> p₀ clearly not met' if lo > p0 else ''}")
print(f"  zero rejects in 2,000: 95% upper {1-0.05**(1/2000):.5f}")

print("\n== Faults per item (FC-099, spc.capability-attribute-defects)")
insp = [(200, 9), (200, 14), (250, 11), (200, 6), (300, 17)]
Nn = sum(n for n, _ in insp); C = sum(c for _, c in insp); dpu = C / Nn
lo = stats.chi2.ppf(0.025, 2*C) / (2*Nn); hi = stats.chi2.ppf(0.975, 2*C+2) / (2*Nn); up95 = stats.chi2.ppf(0.95, 2*C+2) / (2*Nn)
print(f"  N {Nn} C {C} DPU {dpu:.4f}; exact 95% {lo:.4f}–{hi:.4f}; one-sided upper {up95:.4f}; share with ≥1 fault {1-np.exp(-dpu):.4f}")
for n, c in insp:
    u = c/n; s = np.sqrt(dpu/n); print(f"    inspection n {n} c {c} u {u:.4f}  u-chart {max(0,dpu-3*s):.4f}–{dpu+3*s:.4f}")
opp = 6; print(f"  DPMO with {opp} opportunities a unit: {1e6*C/(Nn*opp):,.0f}; Z {stats.norm.isf(C/(Nn*opp)):.2f}; sigma (+1.5) {stats.norm.isf(C/(Nn*opp))+1.5:.2f}")
print(f"  zero faults in 300: 95% upper DPU {-np.log(0.05)/300:.5f}")
print(f"  c-chart (equal n 200): c̄ {np.mean([9,14,6]):.2f} limits {max(0,np.mean([9,14,6])-3*np.sqrt(np.mean([9,14,6]))):.2f}–{np.mean([9,14,6])+3*np.sqrt(np.mean([9,14,6])):.2f}")

print("\n== Defect tally and Pareto (FC-124, FC-125)")
tally = {"open seal": 23, "mis-label": 9, "light pack": 31, "crushed": 4, "wrong date": 2}
cost = {"open seal": 0.42, "mis-label": 0.05, "light pack": 0.42, "crushed": 0.42, "wrong date": 0.05}
tot = sum(tally.values()); by_count = sorted(tally.items(), key=lambda kv: -kv[1]); cum = 0
for k, v in by_count: cum += v; print(f"  {k:10s} {v:3d} {v/tot:5.1%} cum {cum/tot:5.1%}")
by_money = sorted(((k, v*cost[k]) for k, v in tally.items()), key=lambda kv: -kv[1]); print("  by money: " + ", ".join(f"{k} £{m:.2f}" for k, m in by_money))
print(f"  the top two by count = {(by_count[0][1]+by_count[1][1])/tot:.0%}; by money the order is {[k for k,_ in by_money][:2]}")

print("\n== Held at a rate (FC-083) — see cases-spc.py; Cm/Cmk (FC-084)")
rng = np.random.default_rng(11); x = rng.normal(400.4, 0.9, 50); lo, hi = 398, 403
s = x.std(ddof=1); cm = (hi-lo)/(6*s); cmk = min(hi-x.mean(), x.mean()-lo)/(3*s)
print(f"  50 consecutive parts: mean {x.mean():.2f} s {s:.3f}; Cm {cm:.2f} Cmk {cmk:.2f} (acceptance ≥ 1.67 by the usual rule, said as the OEM's agreed figure)")

print("\n== Lowest legal fill (FC-157) — a nominal 400 g, s 2.1 g, TNE 3% = 12 g")
nom, s_, tne = 400, 2.1, 12
# rule 1 mean ≥ nominal; rule 2 at most 2.5% below nominal − TNE (T1) ; rule 3 none below nominal − 2 TNE (T2) — the mean that satisfies all three
t1_mean = nom - tne + stats.norm.isf(0.025) * s_  # mean such that P(x < nominal−TNE) = 2.5%
t2_mean = nom - 2*tne + stats.norm.isf(0.0001) * s_  # 'none' read as 1 in 10,000 at this spread (a choice, said)
target = max(nom, t1_mean, t2_mean)
print(f"  rule 1 needs mean ≥ {nom}; rule 2 needs ≥ {t1_mean:.2f}; rule 3 (none below T2, 1 in 10,000) needs ≥ {t2_mean:.2f} -> lowest target {target:.2f}")
print(f"  at a mean of 402.5 the give-away is {402.5-target:.2f} g a pack above the lowest; halving s to 1.05 moves the lowest target to {max(nom, nom-tne+stats.norm.isf(0.025)*1.05, nom-2*tne+stats.norm.isf(0.0001)*1.05):.2f}")

print("\n== Faults: Laney σz on the five inspections (the u-chart's z-scores' moving range)")
insp = [(200, 9), (200, 14), (250, 11), (200, 6), (300, 17)]
Nn = sum(n for n, _ in insp); C = sum(c for _, c in insp); dpu = C/Nn
z = np.array([(c/n - dpu)/np.sqrt(dpu/n) for n, c in insp]); sz = np.mean(np.abs(np.diff(z)))/1.128
print(f"  z {np.round(z,2).tolist()} σz {sz:.3f} -> {'Laney applies (outside 0.8–1.25)' if sz < 0.8 or sz > 1.25 else 'plain'}; first inspection widened limits {max(0, dpu-3*np.sqrt(dpu/200)*sz):.4f}–{dpu+3*np.sqrt(dpu/200)*sz:.4f}")

print("\n== A weigher's heads (FC-158): one-way ANOVA across heads, one head 6 g heavy")
heads = {1: [37.2, 37.9, 37.4, 38.1, 36.8], 2: [37.6, 37.1, 38.0, 37.3, 37.7], 3: [43.1, 43.8, 43.4, 43.9, 43.3], 4: [37.5, 36.9, 37.8, 37.2, 37.6]}
F, p = stats.f_oneway(*heads.values())
means = {h: np.mean(v) for h, v in heads.items()}; grand = np.mean([x for v in heads.values() for x in v])
far = max(means, key=lambda h: abs(means[h] - np.mean([means[o] for o in means if o != h])))
others = np.mean([means[o] for o in means if o != far])
print(f"  F {F:.3f} p {p:.2e}; head {far} mean {means[far]:.2f} against {others:.2f} on the others -> {means[far]-others:+.2f} g")
F2, p2 = stats.f_oneway(heads[1], heads[2], heads[4]); print(f"  heads 1, 2, 4 alone: F {F2:.3f} p {p2:.3f} (agree)")
print(f"  F cdf check: F(2.5; 3, 16) = {stats.f.cdf(2.5, 3, 16):.6f}; F(5.0; 2, 12) = {stats.f.cdf(5.0, 2, 12):.6f}")

print("\n== A CCP's guard band (FC-169): core at least 75 °C, the probe reads +0.14 high at 75")
ccp = [75.7, 76.9, 78.2, 77.4, 75.1, 79.0, 76.3, 75.08, 77.7, 74.8]
bias = 0.14; low = min(ccp); margin = low - 75; under = sum(1 for x in ccp if x < 75); guard = sum(1 for x in ccp if 75 <= x < 75 + bias)
print(f"  lowest {low} margin {margin:.2f}; true margin {margin - bias:.2f}; a check must read {75 + bias:.2f}; {under} deviation(s); {guard} reading(s) inside the guard band (75 ≤ x < 75.14)")

print("\n== Volume packs checked by weight (FC-163): 400 ml at 1.03 g/ml")
ml, dens = 400, 1.03; tne_ml = 0.03 * ml
print(f"  nominal {ml * dens:.1f} g; TNE {tne_ml:.0f} ml = {tne_ml * dens:.2f} g; T1 {ml*dens - tne_ml*dens:.2f} g, T2 {ml*dens - 2*tne_ml*dens:.2f} g")
