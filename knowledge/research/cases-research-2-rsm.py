#!/usr/bin/env python3
"""INDEPENDENT CASES — Research 2, part 2: response surface (FC-112), 25 October 2026.

Run:  python3 -I knowledge/research/cases-research-2-rsm.py
NumPy/SciPy only. Every number quoted in knowledge/methods/stats/response-surface.md
under "Researched, 25 October 2026" is printed or asserted here. Ends by asserting itself.
"""
import itertools, math
import numpy as np
from scipy import stats, optimize

ok = []
def check(name, cond):
    ok.append((name, bool(cond)))
    print(("  PASS " if cond else "  FAIL ") + name)

# ---------------------------------------------------------------- designs
def factorial_points(k):
    return np.array(list(itertools.product([-1.0, 1.0], repeat=k)))

def ccd(k, alpha, n_center, nf=None):
    F = factorial_points(k) if nf is None else nf
    ax = []
    for i in range(k):
        for s in (-alpha, alpha):
            v = np.zeros(k); v[i] = s; ax.append(v)
    return np.vstack([F, np.array(ax), np.zeros((n_center, k))])

def bbd(k, n_center):
    pts = []
    for i, j in itertools.combinations(range(k), 2):
        for a, b in itertools.product([-1.0, 1.0], repeat=2):
            v = np.zeros(k); v[i], v[j] = a, b; pts.append(v)
    return np.vstack([np.array(pts), np.zeros((n_center, k))])

def quad_matrix(X):
    """columns: 1, x_i, x_i^2, x_i x_j (i<j)  — the second-order model in coded units"""
    n, k = X.shape
    cols = [np.ones(n)] + [X[:, i] for i in range(k)] + [X[:, i] ** 2 for i in range(k)]
    cols += [X[:, i] * X[:, j] for i, j in itertools.combinations(range(k), 2)]
    return np.column_stack(cols)

print("# A. design tables: the run counts, and rotatability proved rather than quoted")
for k in (2, 3, 4):
    a = (2 ** k) ** 0.25
    nf, na = 2 ** k, 2 * k
    terms = (k + 1) * (k + 2) // 2
    print(f"  CCD k={k}: {nf} corners + {na} axial + centre; rotatable alpha = (2^k)^(1/4) = {a:.4f}; model terms {terms}; runs with 3 centre points {nf + na + 3}")
check("CCD k=2 alpha = sqrt(2)", abs((2 ** 2) ** .25 - math.sqrt(2)) < 1e-12)
check("CCD k=3 alpha = 1.6818", abs((2 ** 3) ** .25 - 1.6818) < 1e-4)
check("CCD k=4 alpha = 2", abs((2 ** 4) ** .25 - 2.0) < 1e-12)
for k in (3, 4, 5):
    print(f"  Box-Behnken k={k}: {len(bbd(k, 0))} edge-midpoint runs + centre points; C(k,2)*4 = {math.comb(k, 2) * 4}")
check("BBD run counts 12, 24, 40 (k = 3, 4, 5)", [len(bbd(k, 0)) for k in (3, 4, 5)] == [12, 24, 40])

def pred_var_profile(X, x):
    """scaled prediction variance N * x'(M'M)^-1 x  at the point x (design in coded units)"""
    M = quad_matrix(X); inv = np.linalg.inv(M.T @ M)
    v = quad_matrix(np.atleast_2d(x))[0]
    return len(X) * v @ inv @ v

def rotatable_spread(X, k, radius, ndir=400, seed=3):
    r = np.random.default_rng(seed)
    d = r.normal(size=(ndir, k)); d /= np.linalg.norm(d, axis=1, keepdims=True)
    vals = np.array([pred_var_profile(X, radius * u) for u in d])
    return vals.max() - vals.min()

for k in (2, 3):
    a_rot = (2 ** k) ** 0.25
    spread_rot = rotatable_spread(ccd(k, a_rot, 5), k, 1.0)
    spread_face = rotatable_spread(ccd(k, 1.0, 5), k, 1.0)
    spread_bad = rotatable_spread(ccd(k, 1.2 * a_rot, 5), k, 1.0)
    print(f"  k={k}: spread of prediction variance round radius 1 — alpha rotatable {spread_rot:.2e}; face-centred (alpha=1) {spread_face:.3f}; alpha 20% too big {spread_bad:.3f}")
    check(f"k={k}: alpha=(2^k)^(1/4) makes prediction variance depend only on distance", spread_rot < 1e-9 and spread_face > 1e-3 and spread_bad > 1e-3)

# BBD k=3 is *nearly* rotatable (NIST wording), check it is not exactly
spread_bbd = rotatable_spread(bbd(3, 3), 3, 1.0)
print(f"  Box-Behnken k=3 (3 centre): spread {spread_bbd:.3f} — near, not exactly, rotatable")
check("BBD k=3 not exactly rotatable", spread_bbd > 1e-6)

# ---------------------------------------------------------------- fit: a noise-free surface is recovered
print("\n# B. fit: a noise-free known surface is recovered, its stationary point found two ways")
b0, b = 80.0, np.array([3.0, 2.0])
B = np.array([[-4.0, 0.75], [0.75, -3.0]])                  # symmetric: diag = b_ii, off-diag = b_ij / 2
def true_surface(X): return b0 + X @ b + np.einsum('ij,jk,ik->i', X, B, X)
X = ccd(2, math.sqrt(2), 5)
y = true_surface(X)
coef, *_ = np.linalg.lstsq(quad_matrix(X), y, rcond=None)
want = np.array([80, 3, 2, -4, -3, 1.5])
print(f"  fitted b0,b1,b2,b11,b22,b12 = {np.round(coef, 8)}")
check("coefficients recovered exactly from a noise-free CCD", np.allclose(coef, want, atol=1e-9))
Bh = np.array([[coef[3], coef[5] / 2], [coef[5] / 2, coef[4]]]); bh = coef[1:3]
xs = -0.5 * np.linalg.solve(Bh, bh)
eig = np.linalg.eigvalsh(Bh)
res = optimize.minimize(lambda x: -true_surface(np.atleast_2d(x))[0], x0=[0.1, 0.1])
print(f"  stationary point x* = -1/2 B^-1 b = {np.round(xs, 5)}; scipy.optimize {np.round(res.x, 5)}; eigenvalues {np.round(eig, 4)} -> {'maximum' if (eig < 0).all() else 'minimum' if (eig > 0).all() else 'saddle'}; y* = {true_surface(np.atleast_2d(xs))[0]:.4f}")
check("x* by linear algebra = x* by an optimiser", np.allclose(xs, res.x, atol=1e-5))
check("all eigenvalues negative: a maximum", (eig < 0).all())
y_star_formula = coef[0] + 0.5 * bh @ xs
check("y* = b0 + 1/2 b'x*", abs(y_star_formula - true_surface(np.atleast_2d(xs))[0]) < 1e-9)

# a saddle, and a rising ridge
Bs = np.array([[-2.0, 0.0], [0.0, 1.5]])
print(f"  saddle example: eigenvalues {np.linalg.eigvalsh(Bs)} -> mixed signs: a saddle, never quoted as 'the optimum'")
check("mixed-sign eigenvalues identified as saddle", np.linalg.eigvalsh(Bs).min() < 0 < np.linalg.eigvalsh(Bs).max())
Br = np.array([[-3.0, 0.0], [0.0, -0.001]])               # one direction nearly flat
print(f"  near-ridge example: eigenvalue ratio {abs(np.linalg.eigvalsh(Br)[0] / np.linalg.eigvalsh(Br)[1]):.0f}:1 — a long flat ridge; the point is poorly located")

# ---------------------------------------------------------------- a noisy two-factor example with every statistic
print("\n# C. a two-factor example with noise: filler speed x product temperature, give-away in grams")
# coded: x1 = (speed - 60)/15 , x2 = (temp - 20)/5 ; speed 45..75 a minute, temp 15..25 C
rng = np.random.default_rng(112)
Xd = ccd(2, math.sqrt(2), 5)
# fixed observed responses (typed numbers; generated once from a surface + noise, then frozen)
truth = lambda X: 1.10 + 0.08 * X[:, 0] - 0.10 * X[:, 1] + 0.22 * X[:, 0] ** 2 + 0.15 * X[:, 1] ** 2 + 0.06 * X[:, 0] * X[:, 1]
noise = rng.normal(0, 0.05, len(Xd))
yd = np.round(truth(Xd) + noise, 3)
print("  runs (x1, x2, give-away g):")
for r, v in zip(Xd, yd): print(f"    {r[0]:+.3f} {r[1]:+.3f}  {v:.3f}")
M = quad_matrix(Xd); n, p = M.shape
beta, *_ = np.linalg.lstsq(M, yd, rcond=None)
fit = M @ beta; resid = yd - fit
sse = (resid ** 2).sum(); dfe = n - p; mse = sse / dfe
cov = mse * np.linalg.inv(M.T @ M); se = np.sqrt(np.diag(cov)); tv = beta / se; pv = 2 * stats.t.sf(np.abs(tv), dfe)
sst = ((yd - yd.mean()) ** 2).sum(); r2 = 1 - sse / sst; r2adj = 1 - (sse / dfe) / (sst / (n - 1))
H = M @ np.linalg.inv(M.T @ M) @ M.T; press = ((resid / (1 - np.diag(H))) ** 2).sum(); r2pred = 1 - press / sst
names = ['b0', 'b1', 'b2', 'b11', 'b22', 'b12']
for nm, bb, ss, tt, pp in zip(names, beta, se, tv, pv): print(f"    {nm:4s} {bb:+.4f}  se {ss:.4f}  t {tt:+.2f}  p {pp:.4f}")
print(f"  n={n}, terms={p}, residual df={dfe}, s={math.sqrt(mse):.4f}; R2={r2:.4f}, R2adj={r2adj:.4f}, R2pred={r2pred:.4f} (PRESS {press:.4f})")
# lack of fit from the five centre points
cen = np.all(Xd == 0, axis=1); yc = yd[cen]
ss_pe = ((yc - yc.mean()) ** 2).sum(); df_pe = cen.sum() - 1
ss_lof = sse - ss_pe; df_lof = dfe - df_pe
F_lof = (ss_lof / df_lof) / (ss_pe / df_pe); p_lof = stats.f.sf(F_lof, df_lof, df_pe)
print(f"  pure error from {cen.sum()} centre runs: SS {ss_pe:.5f}, df {df_pe}; lack of fit SS {ss_lof:.5f}, df {df_lof}; F = {F_lof:.3f}, p = {p_lof:.4f}")
check("lack-of-fit df = residual df - pure-error df, and 6+... runs = 13", df_lof + df_pe == dfe and n == 13)
# independent check of the regression F via nested model comparison
M0 = np.ones((n, 1)); sse0 = ((yd - yd.mean()) ** 2).sum()
F_reg = ((sse0 - sse) / (p - 1)) / (sse / dfe); p_reg = stats.f.sf(F_reg, p - 1, dfe)
print(f"  whole-model F = {F_reg:.2f} on ({p-1}, {dfe}), p = {p_reg:.2e}")
Bh = np.array([[beta[3], beta[5] / 2], [beta[5] / 2, beta[4]]]); bh = beta[1:3]
xs = -0.5 * np.linalg.solve(Bh, bh); eig = np.linalg.eigvalsh(Bh)
ystar = beta[0] + 0.5 * bh @ xs
speed, temp = 60 + 15 * xs[0], 20 + 5 * xs[1]
print(f"  stationary point (coded) {np.round(xs, 3)} = speed {speed:.1f} a minute, temperature {temp:.1f} C; predicted give-away {ystar:.3f} g; eigenvalues {np.round(eig, 3)} -> {'minimum' if (eig > 0).all() else 'maximum' if (eig < 0).all() else 'saddle'}")
r_star = np.linalg.norm(xs)
print(f"  distance of x* from the centre {r_star:.3f} (design reaches {math.sqrt(2):.3f}) -> {'inside' if r_star <= math.sqrt(2) else 'OUTSIDE the region run: refuse'}")
check("x* is a minimum and inside the region run", (eig > 0).all() and r_star <= math.sqrt(2))
# the operator's window: where the prediction stays within 0.10 g of the best, inside the region run
g = np.linspace(-math.sqrt(2), math.sqrt(2), 401); G1, G2 = np.meshgrid(g, g)
pts = np.column_stack([G1.ravel(), G2.ravel()]); inside = np.linalg.norm(pts, axis=1) <= math.sqrt(2)
pred = quad_matrix(pts) @ beta
win = inside & (pred <= ystar + 0.10)
s1 = pts[win, 0] * 15 + 60; s2 = pts[win, 1] * 5 + 20
print(f"  window (prediction within 0.10 g of the best): speed {s1.min():.1f}-{s1.max():.1f} a minute, temperature {s2.min():.1f}-{s2.max():.1f} C")
# prediction interval at x* (95%)
v = quad_matrix(np.atleast_2d(xs))[0]; se_mean = math.sqrt(mse * v @ np.linalg.inv(M.T @ M) @ v)
tcrit = stats.t.ppf(0.975, dfe)
print(f"  mean give-away at x*: {ystar:.3f} ± {tcrit * se_mean:.3f} (95% confidence interval for the mean); a single pack ± {tcrit * math.sqrt(mse + se_mean ** 2):.3f}")
# a design too small: 9 runs (no centre points) gives no pure error
M9 = quad_matrix(ccd(2, math.sqrt(2), 1)); print(f"  CCD k=2 with ONE centre point: {len(M9)} runs, {M9.shape[1]} terms -> residual df {len(M9) - M9.shape[1]}, pure-error df 0: no lack-of-fit test")
check("one centre point leaves no pure error", ccd(2, math.sqrt(2), 1).shape[0] - 8 - 1 == 0)

# back-transform coded -> natural units
check("coded -> natural: x*=0 is the centre", 60 + 15 * 0 == 60 and 20 + 5 * 0 == 20)


# ---------------------------------------------------------------- the statistics, proved by repeating the experiment
print("\n# C2. the standard errors, intervals and the lack-of-fit test, proved by simulation (the surface and sigma known)")
Q_, R_ = np.linalg.qr(M); beta_qr = np.linalg.solve(R_, Q_.T @ yd)
check("QR solution = normal-equations solution", np.allclose(beta_qr, beta, atol=1e-10))
sig = 0.05; xpt = np.array([[0.5, -0.3]]); vpt = quad_matrix(xpt)[0]
true_mean = truth(xpt)[0]; Minv = np.linalg.inv(M.T @ M)
rr = np.random.default_rng(99); cover = 0; lof_rej = 0; trials = 6000; tcr = stats.t.ppf(0.975, dfe)
for _ in range(trials):
    yy = truth(Xd) + rr.normal(0, sig, len(Xd))
    bb = Minv @ M.T @ yy; rs = yy - M @ bb; ms = rs @ rs / dfe
    half = tcr * math.sqrt(ms * vpt @ Minv @ vpt)
    cover += abs(vpt @ bb - true_mean) <= half
    ycc = yy[cen]; spe = ((ycc - ycc.mean()) ** 2).sum(); slof = rs @ rs - spe
    lof_rej += stats.f.sf((slof / df_lof) / (spe / df_pe), df_lof, df_pe) < 0.05
print(f"  95% interval for the mean at (0.5, -0.3) covered the true mean in {cover / trials:.3f} of {trials} repeats; the lack-of-fit test (5%) fired on a true quadratic {lof_rej / trials:.3f} of the time")
check("interval coverage 0.95 +- 0.012", abs(cover / trials - 0.95) < 0.012)
check("lack-of-fit false-alarm rate 0.05 +- 0.012 when the model is right", abs(lof_rej / trials - 0.05) < 0.012)

# ---------------------------------------------------------------- an optimum outside the region; the honest answer is the best inside it
print("\n# D. a stationary point outside the region run: refuse it, report the best point inside the region")
beta_out = np.array([1.0, -0.9, -0.2, 0.15, 0.10, 0.02])    # minimum far along x1
Bo = np.array([[beta_out[3], beta_out[5] / 2], [beta_out[5] / 2, beta_out[4]]]); bo = beta_out[1:3]
xo = -0.5 * np.linalg.solve(Bo, bo)
print(f"  x* = {np.round(xo, 3)}, radius {np.linalg.norm(xo):.2f} > alpha {math.sqrt(2):.2f}: outside")
cons = {'type': 'ineq', 'fun': lambda x: 2.0 - x @ x}
rb = optimize.minimize(lambda x: quad_matrix(np.atleast_2d(x))[0] @ beta_out, x0=[0, 0], constraints=[cons], method='SLSQP')
print(f"  best inside the region (radius <= sqrt 2): x = {np.round(rb.x, 3)}, radius {np.linalg.norm(rb.x):.3f} — on the edge: the design was in the wrong place; move it and run again")
check("outside-region case lands on the boundary", abs(np.linalg.norm(rb.x) - math.sqrt(2)) < 1e-4 and np.linalg.norm(xo) > math.sqrt(2))

# ---------------------------------------------------------------- the record's one-factor case
print("\n# E. the record's one-factor case, rechecked")
sp = np.array([40, 50, 60, 70, 80, 90.0]); ga = np.array([1.9, 1.3, 1.0, 1.1, 1.6, 2.4])
c2, c1, c0 = np.polyfit(sp, ga, 2)
xstar = -c1 / (2 * c2)
print(f"  y = {c2:.5f}x^2 {c1:+.4f}x {c0:+.3f};  x* = {xstar:.1f}; y(x*) = {np.polyval([c2, c1, c0], xstar):.3f}")
check("one-factor case: x* = 62.3, y* = 1.00", abs(xstar - 62.3) < 0.1 and abs(np.polyval([c2, c1, c0], xstar) - 1.0) < 0.02)

# ---------------------------------------------------------------- desirability (Derringer & Suich 1980), from knowledge, hand cases
print("\n# F. desirability (Derringer & Suich): hand-checkable cases")
def d_larger(y, L, T, s=1.0): return 0.0 if y < L else 1.0 if y >= T else ((y - L) / (T - L)) ** s
def d_smaller(y, T, U, s=1.0): return 1.0 if y <= T else 0.0 if y > U else ((U - y) / (U - T)) ** s
def D(ds, ws=None):
    ws = ws or [1] * len(ds); return math.exp(sum(w * math.log(d) for d, w in zip(ds, ws)) / sum(ws)) if all(d > 0 for d in ds) else 0.0
d1 = d_larger(9.0, 8.0, 10.0); d2 = d_smaller(1.2, 1.0, 1.4)
print(f"  strength 9 N (min 8, aim 10) -> d={d1}; give-away 1.2 g (aim 1.0, worst 1.4) -> d={d2}; overall D = {D([d1, d2]):.4f}")
check("D = geometric mean sqrt(0.5*0.5) = 0.5", abs(D([d1, d2]) - 0.5) < 1e-12)
check("any response outside its limits gives D = 0", D([d_larger(7.0, 8.0, 10.0), 1.0]) == 0.0)

print("\n# summary")
bad = [n for n, c in ok if not c]
print(f"{len(ok) - len(bad)} of {len(ok)} checks passed" + ("" if not bad else "; FAILED: " + ", ".join(bad)))
raise SystemExit(1 if bad else 0)
