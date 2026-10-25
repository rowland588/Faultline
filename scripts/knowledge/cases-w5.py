#!/usr/bin/env python3
"""INDEPENDENT CASES — W5, reliability and maintenance on a machine (25 October 2026).
FC-059 repair times, FC-055 short stops, FC-015 andon calls, FC-061 Crow-AMSAA growth, FC-060 Weibull.
Every number a unit test in src/tools/reliability/__tests__ takes from here is printed by SciPy/NumPy,
never by Faultline's code.  Run:  python3 scripts/knowledge/cases-w5.py"""
import math
import numpy as np
from scipy import stats, optimize, integrate

np.set_printoptions(linewidth=140)

# ---------------------------------------------------------------------------------------------
print("# FC-059 repair times — twelve timed stops (minutes): called -> help arrived -> running again")
arrive = np.array([0.5, 1.0, 0.5, 2.0, 1.5, 0.5, 6.0, 1.0, 0.5, 3.0, 1.0, 2.5])
fixed = np.array([2.0, 3.5, 1.5, 5.0, 4.0, 2.5, 21.0, 4.0, 2.0, 9.0, 3.0, 7.5])
n = len(fixed)
print(f"  repair (called -> running) {fixed.tolist()}")
print(f"  n {n}  mean {fixed.mean():.4f}  median {np.median(fixed):.4f}  p90 (linear) {np.percentile(fixed, 90):.4f}  max {fixed.max()}")
wait = arrive; fix = fixed - arrive
print(f"  waiting (called -> help) median {np.median(wait):.4f} mean {wait.mean():.4f}; fixing (help -> running) median {np.median(fix):.4f} mean {fix.mean():.4f}")
print(f"  waiting share of all repair time {wait.sum() / fixed.sum():.4f}")
# exact distribution-free interval for the median: x_(l) .. x_(n+1-l), the largest l with P(Bin(n,.5) <= l-1) <= 0.05
def median_ci(nn, level=0.90):
    a = (1 - level) / 2
    l = 0
    for k in range(1, nn // 2 + 1):
        if stats.binom.cdf(k - 1, nn, 0.5) <= a: l = k
    return l  # 0: not available
for nn in (3, 4, 5, 6, 8, 10, 12, 20):
    l = median_ci(nn)
    cov = 1 - 2 * stats.binom.cdf(l - 1, nn, 0.5) if l else None
    print(f"  n {nn}: l {l}  coverage {cov if cov is None else round(cov, 4)}")
s = np.sort(fixed); l = median_ci(n)
print(f"  median interval for n {n}: {s[l-1]} .. {s[n-l]}  (order stats {l} and {n+1-l})")
# availability = MTBF / (MTBF + MTTR): 14 stops in 5.6 running hours -> MTBF 24 min
mtbf = 24.0; mttr = fixed.mean()
A = mtbf / (mtbf + mttr); Ah = mtbf / (mtbf + mttr / 2)
print(f"  MTBF {mtbf} min, MTTR mean {mttr:.4f}: availability {A:.4f}; MTTR halved {Ah:.4f} (+{(Ah-A)*100:.2f} points)")
print(f"  minutes down an hour of running = 60 / MTBF * MTTR = {60 / mtbf * mttr:.4f}; halved saves {60 / mtbf * mttr / 2:.4f}")
# money: crew 4 x £12 x 1.25 = £60/h labour; 60 packs/min; 10p contribution
lab = 4 * 12 * 1.25
dm = 60 / mtbf * mttr
print(f"  labour an hour of running {lab * dm / 60:.4f}; packs {60 * dm:.2f}; contribution {60 * dm * 0.10:.4f}")
print(f"  fitter at £30/h x fixing time (help -> running): {fix.sum():.2f} min over {n} = £{fix.sum() / 60 * 30:.4f}  ->  per stop £{fix.mean() / 60 * 30:.4f}")

# ---------------------------------------------------------------------------------------------
print("\n# FC-015 andon — fourteen calls: reason, minutes to help, minutes to running again")
calls = [("film change", 1.0, 6.0), ("film change", 2.0, 7.0), ("film change", 1.5, 8.0), ("film change", 3.0, 9.5), ("jam", 0.5, 2.0),
         ("jam", 1.0, 3.0), ("jam", 4.0, 6.0), ("QA check", 5.0, 9.0), ("QA check", 11.0, 14.0), ("label", 2.5, 6.5), ("film change", 1.0, 5.0),
         ("jam", 0.5, 1.5), ("label", 3.5, 8.0), ("material short", 9.0, 19.0)]
r = np.array([c[1] for c in calls]); z = np.array([c[2] for c in calls]); nn = len(calls)
print(f"  calls {nn}; response median {np.median(r):.4f} mean {r.mean():.4f} p90 {np.percentile(r, 90):.4f} max {r.max()}; resolution median {np.median(z):.4f} p90 {np.percentile(z, 90):.4f}")
for lim in (3.0,):
    print(f"  help within {lim} min: {int((r <= lim).sum())} of {nn} = {(r <= lim).mean():.4f}")
print(f"  waiting for help in total {r.sum():.2f} min; resolution total {z.sum():.2f} min")
from collections import defaultdict
by = defaultdict(lambda: [0, 0.0, 0.0])
for rs, a_, b_ in calls: by[rs][0] += 1; by[rs][1] += a_; by[rs][2] += b_
for k, v in sorted(by.items(), key=lambda kv: (-kv[1][1], kv[0])): print(f"  {k}: {v[0]} calls, waiting {v[1]:.2f} min, cleared {v[2]:.2f} min")
print(f"  by count: {sorted(by.items(), key=lambda kv: (-kv[1][0], kv[0]))[0][0]} first")

# ---------------------------------------------------------------------------------------------
print("\n# FC-061 Crow-AMSAA — the wrapper's first 2,000 running hours, fourteen failures (knowledge/methods/maintenance/reliability-growth.md)")
tf = np.array([12, 35, 61, 102, 148, 230, 310, 420, 560, 720, 980, 1250, 1600, 1900], dtype=float); T = 2000.0; nf = len(tf)
S = np.log(T / tf).sum(); beta = nf / S; lam = nf / T ** beta
print(f"  sum ln(T/t) {S:.5f}; beta {beta:.5f}; lambda {lam:.6f}; unbiased beta {(nf - 1) / nf * beta:.5f}")
print(f"  cumulative MTBF {T / nf:.4f}; instantaneous MTBF {1 / (lam * beta * T ** (beta - 1)):.4f} (= T/(n beta) {T / (nf * beta):.4f}); growth rate {1 - beta:.5f}")
lo = beta * stats.chi2.ppf(0.05, 2 * nf) / (2 * nf); hi = beta * stats.chi2.ppf(0.95, 2 * nf) / (2 * nf)
print(f"  beta 90% interval  {lo:.5f} .. {hi:.5f}   (2 n beta / beta_hat ~ chi2(2n))")
for M in (400.0, 281.0, 100.0):
    if beta < 1: print(f"  running hours to reach an instantaneous MTBF of {M}: {(1 / (M * lam * beta)) ** (1 / (beta - 1)):.2f}")
U = (tf.sum() / nf - T / 2) / (T * math.sqrt(1 / (12 * nf))); print(f"  Laplace U {U:.5f}")
# check the interval's coverage and the estimator by simulation: NHPP power law, beta 0.6, lambda 0.5, T 1000
rng = np.random.default_rng(20261025)
cover = 0; trials = 4000; b_true = 0.6; lam_true = 0.5; T2 = 1000.0
Es = []
for _ in range(trials):
    N = rng.poisson(lam_true * T2 ** b_true)
    if N < 2: continue
    t = np.sort(T2 * rng.random(N) ** (1 / b_true))      # given N, t_i/T are order statistics of U^(1/beta)
    bh = N / np.log(T2 / t).sum()
    lo_, hi_ = bh * stats.chi2.ppf(0.05, 2 * N) / (2 * N), bh * stats.chi2.ppf(0.95, 2 * N) / (2 * N)
    cover += (lo_ <= b_true <= hi_); Es.append(1)
print(f"  simulated coverage of the 90% interval on beta (true 0.6): {cover / len(Es):.4f} over {len(Es)} trials")
# a flat (steady) machine: beta near 1; a worsening one: beta > 1
flat = np.array([30, 61, 88, 121, 150, 181, 212, 240, 272, 300], dtype=float); Tf = 310.0
bf = len(flat) / np.log(Tf / flat).sum(); print(f"  a steady machine (10 failures about every 30 h in 310 h): beta {bf:.5f}, 90% {bf*stats.chi2.ppf(.05,20)/20:.4f}..{bf*stats.chi2.ppf(.95,20)/20:.4f}")
worse = np.array([150, 400, 560, 700, 800, 880, 940, 980, 1010, 1040], dtype=float); Tw = 1050.0
bw = len(worse) / np.log(Tw / worse).sum(); print(f"  a worsening one (failures bunching late): beta {bw:.5f}, 90% {bw*stats.chi2.ppf(.05,20)/20:.4f}..{bw*stats.chi2.ppf(.95,20)/20:.4f}")

# ---------------------------------------------------------------------------------------------
print("\n# FC-060 Weibull — twelve seal-jaw heater failures (knowledge/methods/maintenance/weibull.md)")
def fit_mle(fail, susp):
    fail = np.asarray(fail, float); susp = np.asarray(susp, float); allt = np.concatenate([fail, susp]); r_ = len(fail)
    def g(b):   # profile score
        tb = allt ** b
        return (tb * np.log(allt)).sum() / tb.sum() - 1 / b - np.log(fail).mean()
    b = optimize.brentq(g, 0.05, 50)
    eta = ((allt ** b).sum() / r_) ** (1 / b)
    return b, eta
def loglik_p(b, fail, susp):
    fail = np.asarray(fail, float); allt = np.concatenate([fail, np.asarray(susp, float)]); r_ = len(fail)
    return r_ * math.log(b) - r_ * math.log((allt ** b).sum() / r_) + (b - 1) * np.log(fail).sum() - r_
def lr_bounds(fail, susp, level=0.90):
    b0, _ = fit_mle(fail, susp); l0 = loglik_p(b0, fail, susp); cut = stats.chi2.ppf(level, 1) / 2
    f = lambda b: loglik_p(b, fail, susp) - (l0 - cut)
    lo = optimize.brentq(f, 1e-3, b0); hi = optimize.brentq(f, b0, 200)
    return lo, hi
t = np.array([310, 480, 560, 720, 790, 850, 940, 1010, 1100, 1250, 1380, 1620], dtype=float)
b, e = fit_mle(t, []); print(f"  MLE beta {b:.5f} eta {e:.4f}   (scipy minimise gave 2.74 / 1033)")
res = optimize.minimize(lambda p: -(stats.weibull_min.logpdf(t, p[0], scale=p[1])).sum() if min(p) > 0 else 1e9, [2.0, 900.0], method='Nelder-Mead', options={'xatol': 1e-9, 'fatol': 1e-12})
print(f"  check by Nelder-Mead: {res.x[0]:.5f} {res.x[1]:.4f}")
lo, hi = lr_bounds(t, []); print(f"  beta 90% likelihood-ratio bounds {lo:.5f} .. {hi:.5f}  (cut {stats.chi2.ppf(0.9, 1) / 2:.5f})")
c10 = -math.log(0.9)
print(f"  B10 {e * c10 ** (1 / b):.4f}  B50 {e * math.log(2) ** (1 / b):.4f}  mean life {e * math.gamma(1 + 1 / b):.4f}  R(600) {math.exp(-(600 / e) ** b):.5f}")
print(f"  a heater at 500 h fails by 700 h: {1 - math.exp(-((700 / e) ** b - (500 / e) ** b)):.5f}; a new one by 200 h: {1 - math.exp(-(200 / e) ** b):.5f}")
# profile bounds on B10
def b10_profile(bval):   # max over beta of loglik with B10 fixed at bval
    def nl(beta_):
        eta_ = bval / c10 ** (1 / beta_)
        return -(stats.weibull_min.logpdf(t, beta_, scale=eta_)).sum()
    o = optimize.minimize_scalar(nl, bounds=(0.2, 30), method='bounded', options={'xatol': 1e-10})
    return -o.fun
b10 = e * c10 ** (1 / b); l_max = -(stats.weibull_min.logpdf(t, b, scale=e)).sum() * -1
cut = stats.chi2.ppf(0.9, 1) / 2
f = lambda v: b10_profile(v) - (l_max - cut)
print(f"  B10 90% likelihood-ratio bounds {optimize.brentq(f, 50, b10):.3f} .. {optimize.brentq(f, b10, 3000):.3f}")
# rank regression (Bernard), the line drawn
n_ = len(t); i = np.arange(1, n_ + 1); F = (i - 0.3) / (n_ + 0.4)
lr = stats.linregress(np.log(t), np.log(-np.log(1 - F)))
print(f"  rank regression: beta {lr.slope:.5f} eta {math.exp(-lr.intercept / lr.slope):.4f} r {lr.rvalue:.5f} r2 {lr.rvalue ** 2:.5f}")
# age replacement, a failure six times a planned swap
cp, cf = 1.0, 6.0
R = lambda s: math.exp(-(s / e) ** b)
def cost_rate(T_): return (cp * R(T_) + cf * (1 - R(T_))) / integrate.quad(R, 0, T_)[0]
o = optimize.minimize_scalar(cost_rate, bounds=(10, 3000), method='bounded', options={'xatol': 1e-8})
print(f"  age replacement: best interval {o.x:.3f} h, cost rate {o.fun:.7f} per h; run to failure {cf / (e * math.gamma(1 + 1 / b)):.7f}; saving {(1 - o.fun / (cf / (e * math.gamma(1 + 1 / b)))) * 100:.3f}%")
print(f"  grid check: best on 10 h grid {min(range(100, 2000, 10), key=cost_rate)} h")
# censoring: eight failures, four still running at 1,500 h
fail8 = t[:8]; susp4 = [1500.0] * 4
b2, e2 = fit_mle(fail8, susp4); print(f"  8 failures + 4 running at 1,500 h: MLE beta {b2:.5f} eta {e2:.4f}; suspensions dropped: beta {fit_mle(fail8, [])[0]:.5f}")
lo2, hi2 = lr_bounds(fail8, susp4); print(f"    beta 90% LR bounds {lo2:.4f} .. {hi2:.4f}")
# Johnson's adjusted ranks + Bernard -> rank regression with suspensions
def johnson(fail, susp):
    items = sorted([(x, 1) for x in fail] + [(x, 0) for x in susp], key=lambda p: (p[0], -p[1]))   # failures before suspensions at a tie
    N = len(items); prev = 0.0; out = []
    for pos, (x, f_) in enumerate(items, start=1):
        if f_:
            rev = N - pos + 1
            adj = prev + (N + 1 - prev) / (1 + rev); prev = adj; out.append((x, adj, (adj - 0.3) / (N + 0.4)))
    return out
jr = johnson(fail8, susp4)
print("  Johnson ranks (8 failures, 4 suspensions):", [(x, round(a, 4), round(m, 4)) for x, a, m in jr])
xs = np.log([j[0] for j in jr]); ys = np.log(-np.log(1 - np.array([j[2] for j in jr]))); lr2 = stats.linregress(xs, ys)
print(f"  rank regression with suspensions: beta {lr2.slope:.5f} eta {math.exp(-lr2.intercept / lr2.slope):.4f} r2 {lr2.rvalue ** 2:.5f}")
# a part replaced every time it failed: the gaps of a reliability study as lives (new at the start), the last stretch still running
gaps = [212, 305, 168, 410, 260, 350, 190, 280]; running = 120.0
b3, e3 = fit_mle(gaps, [running]); print(f"  gaps as lives (8 failed, one running at {running}): beta {b3:.5f} eta {e3:.4f}; B10 {e3 * c10 ** (1 / b3):.3f}; LR {lr_bounds(gaps, [running])[0]:.4f}..{lr_bounds(gaps, [running])[1]:.4f}")
# a random-failure part: exponential-ish ages -> beta near 1; fails young: beta < 1
rand_ = [20, 55, 90, 140, 210, 300, 420, 610]; b4, e4 = fit_mle(rand_, []); l4 = lr_bounds(rand_, [])
print(f"  random-ish ages {rand_}: beta {b4:.4f} eta {e4:.3f} LR {l4[0]:.4f}..{l4[1]:.4f}")
young = [3, 8, 15, 40, 90, 260, 700, 1500]; b5, e5 = fit_mle(young, []); l5 = lr_bounds(young, [])
print(f"  failing-young ages {young}: beta {b5:.4f} eta {e5:.3f} LR {l5[0]:.4f}..{l5[1]:.4f}")
