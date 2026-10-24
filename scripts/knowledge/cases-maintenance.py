#!/usr/bin/env python3
"""INDEPENDENT CASES — maintenance records brought to full depth (knowledge/methods/maintenance, 24 October 2026).
Every number in a record's "Worked case" is printed here by SciPy/NumPy, never by Faultline's code."""
import math
import numpy as np
from scipy import stats, optimize

print("# maintenance.weibull — 12 seal-jaw heater failures (hours), median-rank regression and MLE")
t = np.array([310, 480, 560, 720, 790, 850, 940, 1010, 1100, 1250, 1380, 1620], dtype=float)
n = len(t); i = np.arange(1, n + 1); F = (i - 0.3) / (n + 0.4)
y = np.log(-np.log(1 - F)); x = np.log(t); lr = stats.linregress(x, y)
beta_rr = lr.slope; eta_rr = math.exp(-lr.intercept / lr.slope)
print(f"  median ranks F: {[round(float(v),3) for v in F]}")
print(f"  rank regression: beta {beta_rr:.3f}, eta {eta_rr:.0f} h, r {lr.rvalue:.4f}")
def nll(p):
    b, e = p
    if b <= 0 or e <= 0: return 1e9
    return -(stats.weibull_min.logpdf(t, b, scale=e)).sum()
res = optimize.minimize(nll, [2.0, 900.0], method='Nelder-Mead'); b_mle, e_mle = res.x
print(f"  MLE: beta {b_mle:.3f}, eta {e_mle:.0f} h")
for b, e, lab in [(beta_rr, eta_rr, 'RR'), (b_mle, e_mle, 'MLE')]:
    b10 = e * (-math.log(0.9)) ** (1 / b); mean = e * math.gamma(1 + 1 / b); print(f"  {lab}: B10 {b10:.0f} h, B50 {e * (math.log(2)) ** (1/b):.0f} h, mean life {mean:.0f} h, R(600 h) {math.exp(-(600/e)**b):.3f}")
# conditional: a heater at 500 h already — chance of failing in the next 200 h
b, e = b_mle, e_mle; cond = 1 - math.exp(-((700/e)**b - (500/e)**b)); print(f"  a heater at 500 h: chance of failing by 700 h {cond:.3f}; a new one in its first 200 h {1 - math.exp(-(200/e)**b):.3f}")
# optimal replacement interval (age replacement): cost ratio preventive 1 : failure 6
cp, cf = 1.0, 6.0
def cost_rate(T):
    R = lambda s: math.exp(-(s/e)**b)
    from scipy.integrate import quad
    expected_cycle = quad(R, 0, T)[0]
    return (cp * R(T) + cf * (1 - R(T))) / expected_cycle
Ts = np.arange(100, 2000, 10); cr = [cost_rate(T) for T in Ts]; Topt = Ts[int(np.argmin(cr))]
print(f"  age replacement with failure 6x preventive: best interval {Topt} h, cost rate {min(cr):.5f} per h vs run-to-failure {cf/(e*math.gamma(1+1/b)):.5f}")
# with censoring: 8 failures + 4 still running at 1500 h (Johnson's adjusted ranks)
fail = [310, 480, 560, 720, 790, 850, 940, 1010]; susp = [1500] * 4
print("  censored case: 8 failures, 4 suspended at 1500 h")
def nll_c(p):
    bb, ee = p
    if bb <= 0 or ee <= 0: return 1e9
    return -(stats.weibull_min.logpdf(np.array(fail), bb, scale=ee).sum() + stats.weibull_min.logsf(np.array(susp), bb, scale=ee).sum())
r2 = optimize.minimize(nll_c, [2.0, 1000.0], method='Nelder-Mead'); print(f"  MLE with suspensions: beta {r2.x[0]:.3f}, eta {r2.x[1]:.0f} h (ignoring the suspensions: beta {optimize.minimize(lambda p: -(stats.weibull_min.logpdf(np.array(fail), p[0], scale=p[1]).sum()) if min(p)>0 else 1e9, [2.0,800.0], method='Nelder-Mead').x[0]:.3f})")

print("\n# maintenance.reliability-growth — Crow-AMSAA on a new wrapper's first 2,000 h: 14 failures")
tf = np.array([12, 35, 61, 102, 148, 230, 310, 420, 560, 720, 980, 1250, 1600, 1900], dtype=float); T = 2000.0; nf = len(tf)
beta = nf / np.log(T / tf).sum(); lam = nf / T ** beta
mtbf_inst = 1 / (lam * beta * T ** (beta - 1)); mtbf_cum = T / nf
print(f"  beta {beta:.3f} (<1: improving), lambda {lam:.4f}; cumulative MTBF {mtbf_cum:.0f} h, instantaneous MTBF at 2,000 h {mtbf_inst:.0f} h")
# Cramer-von Mises goodness of fit statistic (MIL-HDBK-189) and the Laplace trend
beta_u = (nf - 1) / nf * beta
cvm = 1 / (12 * nf) + sum(((tf[j] / T) ** beta_u - (2 * (j + 1) - 1) / (2 * nf)) ** 2 for j in range(nf)); print(f"  Cramer-von Mises C2 {cvm:.4f} (crit 0.05 at n=14 ~ 0.218)")
U = (tf.sum() / nf - T / 2) / (T * math.sqrt(1 / (12 * nf))); print(f"  Laplace U {U:.2f} (< -1.645: improving at 90%)")
# projection: hours to reach an instantaneous MTBF of 400 h
Tneed = (1 / (400 * lam * beta)) ** (1 / (beta - 1)); print(f"  hours of running to reach 400 h instantaneous MTBF at this rate of growth: {Tneed:.0f} h")

print("\n# maintenance.spares-poisson — a seal-jaw heater: 4 on the line, failure rate from MTBF 1,100 h, lead time 3 weeks (504 h)")
lam_h = 1 / 1100; n_inst = 4; L = 504; mu = lam_h * n_inst * L
for sl in [0.90, 0.95, 0.99]:
    s = int(stats.poisson.ppf(sl, mu)); print(f"  demand over the lead time mu {mu:.2f}; stock {s} for {sl:.0%} (actual {stats.poisson.cdf(s, mu):.3f})")
print(f"  with 0 held: P(no demand in lead time) {stats.poisson.pmf(0, mu):.3f}; a stock-out costs the line's lost contribution over 3 weeks of one heater down")
print(f"  a critical part at 99%: stock {int(stats.poisson.ppf(0.99, mu))}; cost of holding 4 at £180 each at 20%/yr = £{4*180*0.2:.0f} a year vs one stock-out {504} h x £ a minute")

print("\n# maintenance.planned-maintenance — a month's PM compliance and backlog")
due, done_in_window, done_late, not_done = 48, 39, 5, 4
print(f"  compliance {done_in_window/due:.0%} (in window), {(done_in_window+done_late)/due:.0%} done at all; backlog {not_done} jobs = {not_done*2.5:.0f} h at 2.5 h each; crew 3 x 8 h a day -> {not_done*2.5/24:.1f} days of crew")
planned_h, reactive_h = 210, 190; print(f"  planned share of maintenance hours {planned_h/(planned_h+reactive_h):.0%} (world-class 80%+ as a common benchmark, from knowledge)")

print("\n# maintenance.criticality — a 5x5 matrix")
items = {"wrapper jaws": (5, 4), "checkweigher": (5, 2), "conveyor 3": (2, 4), "label printer": (3, 3), "spare pump": (1, 2)}
for k, (c, l) in items.items():
    s = c * l; cls = 'A' if s >= 15 else 'B' if s >= 8 else 'C'; print(f"  {k}: consequence {c} x likelihood {l} = {s} -> {cls}")

print("\n# maintenance.autonomous-maintenance — a week's checks and tags")
print(f"  checks due 140, done 126 -> {126/140:.0%}; tags open 17 (6 over 14 days); 4 repeat abnormalities on the same guard")
