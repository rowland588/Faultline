#!/usr/bin/env python3
"""INDEPENDENT CASES — the statistics records brought to full depth (knowledge/methods/stats, 24 October 2026).
Every number quoted in a record's "Worked case" is printed here by SciPy/NumPy, never by Faultline's code."""
import math
import numpy as np
from scipy import stats

print("# stats.descriptive — 30 pack weights (the capability study's THIRTY)")
THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
          401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8]
x = np.array(THIRTY)
q1, med, q3 = np.percentile(x, [25, 50, 75], method='linear')
print(f"  n {len(x)}, mean {x.mean():.4f}, median {med:.2f}, s {x.std(ddof=1):.4f}, range {x.min()}-{x.max()}, Q1 {q1:.3f}, Q3 {q3:.3f}, IQR {q3-q1:.3f}")
print(f"  skew G1 {stats.skew(x, bias=False):.4f}, excess kurtosis G2 {stats.kurtosis(x, bias=False):.4f}, CV {x.std(ddof=1)/x.mean()*100:.3f}%")
print(f"  95% CI on the mean: {x.mean() - stats.t.ppf(0.975, 29)*x.std(ddof=1)/math.sqrt(30):.3f} to {x.mean() + stats.t.ppf(0.975, 29)*x.std(ddof=1)/math.sqrt(30):.3f}")
print(f"  bins by Sturges: {math.ceil(1 + math.log2(30))}, by sqrt: {math.ceil(math.sqrt(30))}")

print("\n# stats.anova — give-away (g) by shift, 8 packs each, one-way")
A = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2]; B = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6]; C = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1]
F, p = stats.f_oneway(A, B, C)
allv = np.array(A + B + C); grand = allv.mean()
ssb = sum(len(g) * (np.mean(g) - grand) ** 2 for g in (A, B, C)); ssw = sum(((np.array(g) - np.mean(g)) ** 2).sum() for g in (A, B, C))
print(f"  means A {np.mean(A):.3f} B {np.mean(B):.3f} C {np.mean(C):.3f}; SSB {ssb:.4f} (df 2), SSW {ssw:.4f} (df 21); MSB {ssb/2:.4f}, MSW {ssw/21:.4f}; F {F:.3f}, p {p:.6f}; F crit(0.05; 2, 21) {stats.f.ppf(0.95, 2, 21):.3f}")
W, pl = stats.levene(A, B, C, center='median'); print(f"  Levene W {W:.3f} p {pl:.3f}")
tk = stats.tukey_hsd(A, B, C); print("  Tukey HSD p-values: A-B", round(tk.pvalue[0,1], 5), "A-C", round(tk.pvalue[0,2], 3), "B-C", round(tk.pvalue[1,2], 5))
H, pk = stats.kruskal(A, B, C); print(f"  Kruskal-Wallis H {H:.3f} p {pk:.5f}")
print(f"  eta squared {ssb/(ssb+ssw):.3f}")

print("\n# stats.autocorrelation — 40 consecutive packs off one head")
rng = np.random.default_rng(21)
e = rng.standard_normal(41); y = np.zeros(41)
for t in range(1, 41): y[t] = 0.6 * y[t-1] + e[t]
y = np.round(400 + 0.7 * y[1:], 1)
def acf(z, k):
    z = z - z.mean(); return (z[:-k] * z[k:]).sum() / (z * z).sum()
print("  readings:", [float(v) for v in y])
print(f"  r1 {acf(y,1):.3f}, r2 {acf(y,2):.3f}, r3 {acf(y,3):.3f}; 2/sqrt(n) = {2/math.sqrt(40):.3f}")
mr = np.mean(np.abs(np.diff(y))); print(f"  XmR sigma from MR-bar {mr/1.128:.3f} against s {y.std(ddof=1):.3f} — the ratio {mr/1.128/y.std(ddof=1):.3f}")
# Durbin-Watson
res = y - y.mean(); dw = (np.diff(res) ** 2).sum() / (res ** 2).sum(); print(f"  Durbin-Watson {dw:.3f} (2 = none; near 2(1 - r1) = {2*(1-acf(y,1)):.3f})")
print(f"  every 3rd reading: r1 {acf(y[::3],1):.3f} on {len(y[::3])} points")

print("\n# stats.chi-square-association — rejects by lane and by fault type")
tab = np.array([[18, 7, 5], [9, 14, 4], [6, 5, 12]])  # lanes x fault type
chi2, p, dof, exp = stats.chi2_contingency(tab, correction=False)
print("  observed:", tab.tolist()); print("  expected:", np.round(exp, 2).tolist())
n = tab.sum(); print(f"  chi2 {chi2:.3f}, df {dof}, p {p:.5f}, crit(0.05) {stats.chi2.ppf(0.95, dof):.3f}; Cramer's V {math.sqrt(chi2/(n*(min(tab.shape)-1))):.3f}; smallest expected {exp.min():.2f}")
two = np.array([[12, 88], [4, 96]]); c2, p2, _, e2 = stats.chi2_contingency(two, correction=True); print(f"  2x2 rejects day/night 12/100 vs 4/100: chi2 (Yates) {c2:.3f} p {p2:.4f}; Fisher exact p {stats.fisher_exact(two)[1]:.4f}")

print("\n# stats.correlation-regression — seal strength (N) against jaw temperature (C), 12 settings")
T = np.array([150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205]); Sx = np.array([9.1, 10.2, 11.0, 12.4, 12.9, 13.8, 14.6, 15.1, 15.9, 16.2, 16.8, 17.0])
r, pr = stats.pearsonr(T, Sx); lr = stats.linregress(T, Sx)
print(f"  r {r:.4f} (p {pr:.2e}); slope {lr.slope:.5f} N/C, intercept {lr.intercept:.3f}, R2 {lr.rvalue**2:.4f}, slope SE {lr.stderr:.5f}, 95% CI on slope {lr.slope - stats.t.ppf(0.975,10)*lr.stderr:.4f} to {lr.slope + stats.t.ppf(0.975,10)*lr.stderr:.4f}")
res = Sx - (lr.intercept + lr.slope * T); s_e = math.sqrt((res**2).sum() / 10); print(f"  residual s {s_e:.4f}; prediction at 172 C: {lr.intercept + lr.slope*172:.3f} N; spearman rho {stats.spearmanr(T, Sx)[0]:.4f}")
print(f"  residuals: {[round(float(v),2) for v in res]} — a curve? lag-1 r of residuals {acf(res,1):.3f}")

print("\n# stats.distribution-fitting — the OXYGEN readings: normal, lognormal, Weibull by MLE and Anderson-Darling")
OXYGEN = np.array([0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38,
          0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8])
for name, dist in [("normal", stats.norm), ("lognormal", stats.lognorm), ("weibull", stats.weibull_min)]:
    if name == "normal": params = dist.fit(OXYGEN)
    else: params = dist.fit(OXYGEN, floc=0)
    ad = stats.anderson(np.log(OXYGEN), 'norm').statistic if name == "lognormal" else None
    ll = dist.logpdf(OXYGEN, *params).sum(); k = len(params) - (0 if name == "normal" else 1)
    print(f"  {name}: params {tuple(round(float(v),4) for v in params)}, log-lik {ll:.3f}, AIC {2*k-2*ll:.2f}, KS p {stats.kstest(OXYGEN, dist.cdf, args=params).pvalue:.3f}" + (f", AD on ln(x) {ad:.3f}" if ad else ""))
print(f"  normal AD {stats.anderson(OXYGEN,'norm').statistic:.3f} (5% crit 0.72); 99.865th percentile: normal {stats.norm.ppf(0.99865, OXYGEN.mean(), OXYGEN.std(ddof=1)):.3f}, lognormal {stats.lognorm.ppf(0.99865, *stats.lognorm.fit(OXYGEN, floc=0)):.3f}")

print("\n# stats.doe-factorial — 2^3 on a bagger: seal temperature (-/+), dwell (-/+), pressure (-/+); response seal strength N, one replicate")
runs = [(-1,-1,-1,10.2),(1,-1,-1,13.1),(-1,1,-1,11.0),(1,1,-1,15.8),(-1,-1,1,10.6),(1,-1,1,13.4),(-1,1,1,11.5),(1,1,1,16.4)]
Y = np.array([r[3] for r in runs]); X = np.array([[1, a, b, c, a*b, a*c, b*c, a*b*c] for a,b,c,_ in runs])
beta = np.linalg.lstsq(X, Y, rcond=None)[0]; eff = 2 * beta[1:]
names = ['T','D','P','TD','TP','DP','TDP']
print("  effects:", {n: round(float(v),3) for n, v in zip(names, eff)})
# Lenth's PSE
s0 = 1.5 * np.median(np.abs(eff)); keep = np.abs(eff) < 2.5 * s0; pse = 1.5 * np.median(np.abs(eff[keep])); me = stats.t.ppf(0.975, len(eff)/3) * pse
print(f"  Lenth PSE {pse:.3f}, margin of error {me:.3f} — significant: {[n for n, v in zip(names, eff) if abs(v) > me]}")
print(f"  predicted at T+ D+ P-: {beta[0] + beta[1] - 0 + beta[2] - beta[3] + beta[4]*1*1 + beta[5]*1*(-1) + beta[6]*1*(-1) + beta[7]*1*1*(-1):.3f}")

print("\n# stats.response-surface — one factor curve: give-away vs filler speed, quadratic fit")
spd = np.array([40, 50, 60, 70, 80, 90]); ga = np.array([1.9, 1.3, 1.0, 1.1, 1.6, 2.4])
c = np.polyfit(spd, ga, 2); xs = -c[1] / (2 * c[0]); print(f"  y = {c[0]:.5f}x^2 + {c[1]:.4f}x + {c[2]:.3f}; stationary point {xs:.1f} a minute, give-away there {np.polyval(c, xs):.3f} g")

print("\n# stats.sample-size-power")
z = stats.norm.ppf(0.975); zb = stats.norm.ppf(0.8)
print(f"  mean within +/-0.3 g at 95%, s 0.9: n = {math.ceil((z*0.9/0.3)**2)}")
print(f"  two means differ by 0.5 g, s 0.9, 80% power: n per group ~ {math.ceil(2*((z+zb)*0.9/0.5)**2)}")
print(f"  proportion within +/-2 points at 95%, p 0.1: n = {math.ceil(z**2*0.1*0.9/0.02**2)}; worst case p 0.5: {math.ceil(z**2*0.25/0.02**2)}")
print(f"  work sampling: p 0.15 within +/-3 points absolute at 95%: {math.ceil(z**2*0.15*0.85/0.03**2)}")
# exact power for the two-sample t by noncentral t
n = 52; nc = 0.5 / (0.9 * math.sqrt(2 / n)); crit = stats.t.ppf(0.975, 2*n-2); pw = 1 - stats.nct.cdf(crit, 2*n-2, nc) + stats.nct.cdf(-crit, 2*n-2, nc); print(f"  exact power at n 52 per group: {pw:.3f}")

print("\n# stats.time-series-trend — 12 weekly reject rates (%), is it trending?")
wk = np.arange(1, 13); rr = np.array([2.1, 2.3, 1.9, 2.4, 2.2, 2.6, 2.5, 2.8, 2.7, 3.0, 2.9, 3.2])
lr = stats.linregress(wk, rr); print(f"  slope {lr.slope:.4f} points a week, p {lr.pvalue:.5f}, R2 {lr.rvalue**2:.3f}")
tau, pt = stats.kendalltau(wk, rr); print(f"  Mann-Kendall (Kendall tau) {tau:.3f} p {pt:.5f}")
ma = np.convolve(rr, np.ones(4)/4, 'valid'); print(f"  4-week moving average: {[round(float(v),2) for v in ma]}")
med = np.median(rr); above = rr > med; runs_ = 1 + (above[1:] != above[:-1]).sum(); print(f"  median {med}, runs about the median {runs_} (expected ~7 for 12 points)")

print("\n# stats.tolerance-stackup — a 4-deposit ready meal, each deposit's mean and s")
dep = [(120, 3.0), (80, 2.5), (60, 2.0), (40, 1.5)]
mu = sum(m for m, _ in dep); sd = math.sqrt(sum(s*s for _, s in dep)); worst = sum(3*s for _, s in dep)
print(f"  total mean {mu} g, s {sd:.3f} g (RSS) vs worst-case 3-sigma sum {worst} g against RSS 3-sigma {3*sd:.3f}")
print(f"  share under a 290 g minimum: {stats.norm.cdf(290, mu, sd):.4f}; to make it 1 in 1000 the mean must be {290 + stats.norm.ppf(0.999)*sd:.2f} g, give-away {290 + stats.norm.ppf(0.999)*sd - 290:.2f} g a meal")
print(f"  if the big deposit's s is halved: s {math.sqrt(1.5**2+2.5**2+2**2+1.5**2):.3f}, mean needed {290 + stats.norm.ppf(0.999)*math.sqrt(1.5**2+2.5**2+2**2+1.5**2):.2f}")
