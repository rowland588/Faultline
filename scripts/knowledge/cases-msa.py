#!/usr/bin/env python3
"""INDEPENDENT CASES — measurement-system records brought to full depth (knowledge/methods/msa, 24 October 2026).
Every number in a record's "Worked case" is printed here by SciPy/NumPy, never by Faultline's code."""
import math
import numpy as np
from scipy import stats

print("# msa.type1-gauge — a bench scale checked 50 times on a 500.0 g reference; tolerance 10 g (495-505)")
rng = np.random.default_rng(31)
x = np.round(500.0 + 0.12 + 0.08 * rng.standard_normal(50), 2)
T = 10.0; ref = 500.0; m, s = x.mean(), x.std(ddof=1)
cg = 0.2 * T / (6 * s); cgk = (0.1 * T - abs(m - ref)) / (3 * s)
print(f"  mean {m:.4f}, s {s:.4f}, bias {m-ref:+.4f}; Cg {cg:.2f}, Cgk {cgk:.2f}; resolution 0.01 g = {0.01/T*100:.1f}% of T (<= 5% wanted)")
print(f"  6s as share of T: {6*s/T*100:.1f}%; bias t = {(m-ref)/(s/math.sqrt(50)):.2f} against t crit {stats.t.ppf(0.975,49):.2f} (bias real? {abs((m-ref)/(s/math.sqrt(50))) > stats.t.ppf(0.975,49)})")

print("\n# msa.gauge-rr — 10 packs x 3 operators x 2 trials, seal strength (N), crossed ANOVA")
rng = np.random.default_rng(41)
parts = np.array([12.0, 13.5, 11.2, 14.8, 12.6, 13.1, 11.8, 14.2, 12.9, 13.7])
op_bias = np.array([0.0, 0.35, -0.2]); data = np.zeros((10, 3, 2))
for i in range(10):
    for j in range(3):
        for k in range(2):
            data[i, j, k] = round(parts[i] + op_bias[j] + 0.25 * rng.standard_normal() + (0.15 * rng.standard_normal() if j == 1 else 0), 2)
p, o, r = 10, 3, 2
gm = data.mean(); pm = data.mean(axis=(1, 2)); om = data.mean(axis=(0, 2)); pom = data.mean(axis=2)
ssp = o * r * ((pm - gm) ** 2).sum(); sso = p * r * ((om - gm) ** 2).sum()
sspo = r * ((pom - pm[:, None] - om[None, :] + gm) ** 2).sum(); sse = ((data - pom[:, :, None]) ** 2).sum()
msp, mso, mspo, mse = ssp / (p - 1), sso / (o - 1), sspo / ((p - 1) * (o - 1)), sse / (p * o * (r - 1))
F_po = mspo / mse; p_po = stats.f.sf(F_po, (p - 1) * (o - 1), p * o * (r - 1))
print(f"  MS part {msp:.4f}, operator {mso:.4f}, part x op {mspo:.4f}, error {mse:.4f}; interaction F {F_po:.2f} p {p_po:.3f}")
if p_po > 0.05:  # pool the interaction (AIAG: drop it when p > 0.25 is the manual's rule; shown both ways)
    pooled = (sspo + sse) / ((p - 1) * (o - 1) + p * o * (r - 1))
    v_rep = pooled; v_op = max(0, (mso - pooled) / (p * r)); v_po = 0.0; v_part = max(0, (msp - pooled) / (o * r))
else:
    v_rep = mse; v_po = max(0, (mspo - mse) / r); v_op = max(0, (mso - mspo) / (p * r)); v_part = max(0, (msp - mspo) / (o * r))
v_grr = v_rep + v_op + v_po; v_tot = v_grr + v_part
print(f"  variance: repeatability {v_rep:.4f}, reproducibility {v_op + v_po:.4f} (operator {v_op:.4f}, interaction {v_po:.4f}), GRR {v_grr:.4f}, part {v_part:.4f}, total {v_tot:.4f}")
print(f"  %GRR of total variation (sigma ratio) {math.sqrt(v_grr/v_tot)*100:.1f}%; %contribution {v_grr/v_tot*100:.1f}%; of tolerance (6 sigma / 6 N) {6*math.sqrt(v_grr)/6*100:.1f}%; ndc {int(1.41*math.sqrt(v_part/v_grr))}")
print(f"  repeatability EV {math.sqrt(v_rep):.4f}, reproducibility AV {math.sqrt(v_op+v_po):.4f}, PV {math.sqrt(v_part):.4f}")

print("\n# msa.attribute-agreement — 50 packs, 3 inspectors, 2 looks each, a reference; kappa")
rng = np.random.default_rng(51)
truth = np.array([1] * 20 + [0] * 30)  # 1 = reject
def look(err): return np.where(rng.random(50) < err, 1 - truth, truth)
A1, A2 = look(0.06), look(0.06); B1, B2 = look(0.14), look(0.14); C1, C2 = look(0.08), look(0.08)
def kappa(a, b):
    po = (a == b).mean(); pe = a.mean() * b.mean() + (1 - a.mean()) * (1 - b.mean()); return (po - pe) / (1 - pe)
for name, (u, v) in {"A": (A1, A2), "B": (B1, B2), "C": (C1, C2)}.items():
    agree_self = (u == v).mean(); vs_ref = ((u == truth) & (v == truth)).mean()
    print(f"  {name}: agrees with self {agree_self:.0%}, both looks right vs reference {vs_ref:.0%}, kappa vs reference (look 1) {kappa(u, truth):.2f}")
allv = np.stack([A1, A2, B1, B2, C1, C2], axis=1); all_agree = (allv.min(axis=1) == allv.max(axis=1)).mean(); all_right = ((allv == truth[:, None]).all(axis=1)).mean()
print(f"  all six looks agree {all_agree:.0%}; all six right {all_right:.0%}")
# Fleiss kappa across the 6 looks
n_ij = np.stack([(allv == 1).sum(axis=1), (allv == 0).sum(axis=1)], axis=1); N, nraters = 50, 6
P_i = ((n_ij ** 2).sum(axis=1) - nraters) / (nraters * (nraters - 1)); P_bar = P_i.mean(); p_j = n_ij.sum(axis=0) / (N * nraters); P_e = (p_j ** 2).sum()
print(f"  Fleiss kappa over the six looks {(P_bar - P_e)/(1 - P_e):.2f}")
# miss and false alarm for B
miss = ((B1 == 0) & (truth == 1)).sum() / 20; fa = ((B1 == 1) & (truth == 0)).sum() / 30
print(f"  B's miss rate {miss:.0%} (rejects passed), false-alarm rate {fa:.0%} (good packs rejected)")

print("\n# msa.bias-linearity-stability — a temperature probe at 5 reference points, 10 readings each")
refs = np.array([0.0, 20.0, 40.0, 60.0, 80.0]); rng = np.random.default_rng(61)
bias_true = -0.15 + 0.004 * refs
readings = {r: np.round(r + b + 0.12 * rng.standard_normal(10), 2) for r, b in zip(refs, bias_true)}
biases = np.array([readings[r].mean() - r for r in refs]); sds = np.array([readings[r].std(ddof=1) for r in refs])
for r, b, sd in zip(refs, biases, sds):
    t = b / (sd / math.sqrt(10)); print(f"  ref {r:4.0f}: bias {b:+.3f} C, s {sd:.3f}, t {t:+.2f} (crit {stats.t.ppf(0.975, 9):.2f}) {'bias real' if abs(t) > stats.t.ppf(0.975, 9) else 'not shown'}")
lr = stats.linregress(refs, biases); print(f"  linearity: bias = {lr.intercept:+.4f} + {lr.slope:+.5f} x ref; slope p {lr.pvalue:.4f}, 95% CI {lr.slope - stats.t.ppf(0.975,3)*lr.stderr:+.5f} to {lr.slope + stats.t.ppf(0.975,3)*lr.stderr:+.5f}")
print(f"  bias at 75 C by the line {lr.intercept + lr.slope*75:+.3f} C; against a CCP limit at 75 C a probe reading 75.0 means product at {75 - (lr.intercept + lr.slope*75):.2f}")
# stability: 25 daily checks on the 60 C reference, XmR
rng = np.random.default_rng(71); daily = np.round(60 + 0.09 + 0.1 * rng.standard_normal(25), 2); daily[18:] += 0.3
mr = np.mean(np.abs(np.diff(daily[:18]))); c = daily[:18].mean()
print(f"  stability XmR from the first 18 days: centre {c:.3f}, limits {c-2.66*mr:.3f} to {c+2.66*mr:.3f}; days beyond: {[int(i+1) for i, v in enumerate(daily) if v > c+2.66*mr or v < c-2.66*mr]}")

print("\n# msa.calibration — the product at risk when a check fails")
print("  checks every 7 days, last good day 0, failed day 7 -> product of 7 days at risk; weekly rate 50,000 packs -> 50,000 to review")
print("  interval by the drift: a scale drifting 0.02 g a day with a 0.3 g allowed error -> ", round(0.3 / 0.02), "days before it may be out; a check at half that: 7 days")

print("\n# msa.measurement-uncertainty — a bench scale (GUM): resolution, repeatability, calibration certificate")
u_res = 0.01 / (2 * math.sqrt(3)); u_rep = 0.08 / math.sqrt(1); u_cal = 0.05 / 2; u_c = math.sqrt(u_res**2 + u_rep**2 + u_cal**2)
print(f"  u(resolution 0.01 g, rectangular) {u_res:.4f}; u(repeatability s 0.08, single reading) {u_rep:.4f}; u(certificate U 0.05 at k=2) {u_cal:.4f}; u_c {u_c:.4f} g; U (k=2) {2*u_c:.3f} g")
print(f"  the mean of 10 readings instead: u_rep {0.08/math.sqrt(10):.4f}, u_c {math.sqrt(u_res**2 + (0.08/math.sqrt(10))**2 + u_cal**2):.4f}, U {2*math.sqrt(u_res**2 + (0.08/math.sqrt(10))**2 + u_cal**2):.3f} g")
print(f"  guard band on a 400 g minimum at U 0.17: a reading must be >= {400 + 0.17:.2f} to be sure the pack is over 400")
