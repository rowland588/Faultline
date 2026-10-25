#!/usr/bin/env python3
"""INDEPENDENT CASES — W3b, the analysis tool's groups, tables and relations (knowledge/specs/FC-107-groups-tables-relations.md,
24 October 2026). Every figure the tests assert is printed here by SciPy/NumPy, never by Faultline's own code
(knowledge/STANDARD.md, step 4). FC-107 several groups · FC-108 counts in a table · FC-109 correlation and the scatter ·
FC-110 what drives it (regression, simple and multiple).
Run: python3 -I scripts/knowledge/cases-w3b.py"""
import math
import numpy as np
from scipy import stats

print("== FC-107 several groups — give-away on eight packs from each of three shifts")
A = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2]; B = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6]; C = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1]
G = [np.array(g) for g in (A, B, C)]
f = stats.f_oneway(*G); allv = np.concatenate(G); gm = allv.mean()
ssb = sum(len(g) * (g.mean() - gm) ** 2 for g in G); ssw = sum(((g - g.mean()) ** 2).sum() for g in G)
print(f"  means {[round(g.mean(),4) for g in G]} F {f.statistic:.4f} p {f.pvalue:.8f} SSb {ssb:.4f} SSw {ssw:.4f} eta2 {ssb/(ssb+ssw):.4f}")
lv = stats.levene(*G, center='median'); print(f"  Levene (median) W {lv.statistic:.4f} p {lv.pvalue:.4f}")
kw = stats.kruskal(*G); print(f"  Kruskal–Wallis H {kw.statistic:.4f} p {kw.pvalue:.6f}")
th = stats.tukey_hsd(*G); ci = th.confidence_interval(0.95)
for i, j in ((0, 1), (0, 2), (1, 2)):
    print(f"  Tukey {'ABC'[i]}–{'ABC'[j]}: diff {th.statistic[i][j]:.4f} p {th.pvalue[i][j]:.6f} 95% {ci.low[i][j]:.4f} to {ci.high[i][j]:.4f}")
print(f"  studentized range q crit (k 3, df 21, 95%): {stats.studentized_range.ppf(0.95, 3, 21):.4f}; k 4 df 56: {stats.studentized_range.ppf(0.95, 4, 56):.4f}; k 2 df 10: {stats.studentized_range.ppf(0.95, 2, 10):.4f}; cdf(3.5, 3, 21) {stats.studentized_range.cdf(3.5, 3, 21):.6f}; cdf(5, 5, 12) {stats.studentized_range.cdf(5, 5, 12):.6f}")
print("  unequal sizes:")
U = [np.array([10.1, 10.4, 9.8, 10.0, 10.3, 10.2]), np.array([10.9, 11.2, 10.7, 11.0, 11.4, 10.8, 11.1, 11.3, 10.6]), np.array([10.2, 10.5, 10.1, 10.4])]
fu = stats.f_oneway(*U); thu = stats.tukey_hsd(*U); cu = thu.confidence_interval(0.95)
print(f"  F {fu.statistic:.4f} p {fu.pvalue:.8f}; Kruskal {stats.kruskal(*U).statistic:.4f} p {stats.kruskal(*U).pvalue:.6f}; Levene p {stats.levene(*U, center='median').pvalue:.4f}")
for i, j in ((0, 1), (0, 2), (1, 2)):
    print(f"  Tukey-Kramer {i+1}–{j+1}: diff {thu.statistic[i][j]:.4f} p {thu.pvalue[i][j]:.6f} 95% {cu.low[i][j]:.4f} to {cu.high[i][j]:.4f}")
print("  groups that do not differ:")
N0 = [np.array(x) for x in ([5.1, 5.3, 4.9, 5.2, 5.0, 5.1], [5.0, 5.2, 5.1, 4.8, 5.3, 5.2], [5.2, 5.0, 5.1, 5.3, 4.9, 5.1])]
print(f"  F {stats.f_oneway(*N0).statistic:.4f} p {stats.f_oneway(*N0).pvalue:.4f} Tukey min p {min(stats.tukey_hsd(*N0).pvalue[0][1], stats.tukey_hsd(*N0).pvalue[0][2], stats.tukey_hsd(*N0).pvalue[1][2]):.4f}")

print("\n== FC-108 counts in a table — rejects on three lanes by three fault types")
T = np.array([[18, 7, 5], [9, 14, 4], [6, 5, 12]])
chi2, p, dof, E = stats.chi2_contingency(T, correction=False)
print(f"  chi2 {chi2:.4f} df {dof} p {p:.6f}; expected {np.round(E,2).tolist()}")
V = math.sqrt(chi2 / (T.sum() * (min(T.shape) - 1))); print(f"  Cramer V {V:.4f}; standardised residuals {np.round((T-E)/np.sqrt(E),2).tolist()}")
for name, tab in (("days 12/100 v nights 4/100", [[12, 88], [4, 96]]), ("large 60/1000 v 40/1000", [[60, 940], [40, 960]])):
    t2 = np.array(tab); c0 = stats.chi2_contingency(t2, correction=False); c1 = stats.chi2_contingency(t2, correction=True); fi = stats.fisher_exact(t2)
    print(f"  2x2 {name}: chi2 {c0[0]:.4f} p {c0[1]:.6f}; Yates chi2 {c1[0]:.4f} p {c1[1]:.6f}; Fisher p {fi[1]:.6f}; min expected {c0[3].min():.2f}")
S = np.array([[3, 1, 6], [8, 5, 2]]); cs = stats.chi2_contingency(S, correction=False)
print(f"  small table 2x3 {S.tolist()}: chi2 {cs[0]:.4f} df {cs[2]} p {cs[1]:.6f}; expected {np.round(cs[3],2).tolist()}; cells under 5: {(cs[3] < 5).sum()} of 6; min {cs[3].min():.2f}")
print("  exact r x c (permutation of the table, Freeman–Halton) p:", end=" ")
from scipy.stats import permutation_test
rng = np.random.default_rng(0)
rows = np.repeat(np.arange(2), S.sum(axis=1)); cols = np.concatenate([np.repeat(np.arange(3), S[i]) for i in range(2)])
def stat(r, c):
    tab = np.zeros((2, 3)); np.add.at(tab, (r, c), 1); E_ = tab.sum(1, keepdims=True) * tab.sum(0, keepdims=True) / tab.sum(); return ((tab - E_) ** 2 / E_).sum()
perm = permutation_test((rows, cols), stat, permutation_type='pairings', n_resamples=200000, alternative='greater', random_state=1)
print(f"{perm.pvalue:.4f} (200,000 permutations)")

print("\n== FC-109 / FC-110 — seal strength against jaw temperature")
x = np.array([150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205.0]); y = np.array([9.1, 10.2, 11.0, 12.4, 12.9, 13.8, 14.6, 15.1, 15.9, 16.2, 16.8, 17.0])
r, pr = stats.pearsonr(x, y); rho, prho = stats.spearmanr(x, y); n = len(x)
z = np.arctanh(r); zc = stats.norm.ppf(0.975) / math.sqrt(n - 3)
print(f"  Pearson r {r:.5f} p {pr:.3e}; 95% {math.tanh(z-zc):.4f} to {math.tanh(z+zc):.4f}; Spearman rho {rho:.5f} p {prho:.3e}")
lr = stats.linregress(x, y); sxx = ((x - x.mean()) ** 2).sum(); res = y - (lr.intercept + lr.slope * x); se = math.sqrt((res ** 2).sum() / (n - 2)); t = stats.t.ppf(0.975, n - 2)
print(f"  slope {lr.slope:.5f} se {lr.stderr:.5f} 95% {lr.slope - t*lr.stderr:.5f} to {lr.slope + t*lr.stderr:.5f}; intercept {lr.intercept:.4f} se {lr.intercept_stderr:.4f}; R2 {lr.rvalue**2:.5f}; s_e {se:.4f}; slope p {lr.pvalue:.3e}")
x0 = 172; yh = lr.intercept + lr.slope * x0; pi = t * se * math.sqrt(1 + 1/n + (x0 - x.mean()) ** 2 / sxx); ci_ = t * se * math.sqrt(1/n + (x0 - x.mean()) ** 2 / sxx)
print(f"  at 172: {yh:.4f}; mean interval ±{ci_:.4f}; prediction interval ±{pi:.4f} ({yh-pi:.4f} to {yh+pi:.4f})")
print(f"  residuals {np.round(res,3).tolist()}; signs {''.join('+' if v > 0 else '-' for v in res)}")
def acf1(v): v = np.asarray(v); m = v.mean(); return float(((v[:-1]-m)*(v[1:]-m)).sum()/((v-m)**2).sum())
print(f"  lag-1 of the residuals {acf1(res):.4f}; Durbin–Watson {((np.diff(res))**2).sum()/(res**2).sum():.4f}")
sg = (res > 0).astype(int); runs = 1 + (sg[1:] != sg[:-1]).sum(); n1 = sg.sum(); n0 = n - n1
mu = 2*n1*n0/n + 1; var = 2*n1*n0*(2*n1*n0 - n)/(n**2*(n-1)); zr = (runs - mu)/math.sqrt(var)
print(f"  runs of residual signs {runs}: expected {mu:.2f}, z {zr:.3f}, p (two-sided) {2*stats.norm.cdf(-abs(zr)):.4f}")
print("  a noisy straight line:")
rng = np.random.default_rng(21); xn = np.round(np.linspace(10, 40, 24), 1); yn = np.round(2.0 + 0.5 * xn + rng.normal(0, 1.2, 24), 2)
l2 = stats.linregress(xn, yn); r2 = yn - (l2.intercept + l2.slope * xn)
print(f"  x {xn.tolist()}\n  y {yn.tolist()}\n  r {l2.rvalue:.5f} slope {l2.slope:.5f} (se {l2.stderr:.5f}) intercept {l2.intercept:.4f} R2 {l2.rvalue**2:.5f} p {l2.pvalue:.3e} lag1 resid {acf1(r2):.4f}")
print(f"  Spearman {stats.spearmanr(xn, yn)[0]:.5f} p {stats.spearmanr(xn, yn)[1]:.3e}")
print("  Spearman with ties and an outlier:")
xo = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10.0]); yo = np.array([2, 1, 4, 3, 5, 6, 6, 8, 9, 40.0])
print(f"  Pearson {stats.pearsonr(xo, yo)[0]:.5f} p {stats.pearsonr(xo, yo)[1]:.5f}; Spearman {stats.spearmanr(xo, yo)[0]:.5f} p {stats.spearmanr(xo, yo)[1]:.5f}")

print("\n== FC-110 multiple regression — give-away against filler speed and product temperature")
rng = np.random.default_rng(8); n = 30
sp = np.round(rng.uniform(60, 100, n), 0); tp = np.round(rng.uniform(4, 14, n), 1)
ga = np.round(0.5 + 0.02 * sp + 0.08 * tp + rng.normal(0, 0.25, n), 2)
X = np.column_stack([np.ones(n), sp, tp]); b, rss, rk, sv = np.linalg.lstsq(X, ga, rcond=None)
res = ga - X @ b; df = n - 3; s2 = (res ** 2).sum() / df; cov = s2 * np.linalg.inv(X.T @ X); se = np.sqrt(np.diag(cov)); tt = b / se; pp = 2 * (1 - stats.t.cdf(abs(tt), df)); tc = stats.t.ppf(0.975, df)
sst = ((ga - ga.mean()) ** 2).sum(); R2 = 1 - (res ** 2).sum() / sst; adj = 1 - (1 - R2) * (n - 1) / df; Fv = (R2 / 2) / ((1 - R2) / df)
print(f"  speed {sp.tolist()}\n  temp {tp.tolist()}\n  giveaway {ga.tolist()}")
for nm, i in (("intercept", 0), ("speed", 1), ("temp", 2)):
    print(f"  {nm}: b {b[i]:.5f} se {se[i]:.5f} t {tt[i]:.4f} p {pp[i]:.6f} 95% {b[i]-tc*se[i]:.5f} to {b[i]+tc*se[i]:.5f}")
print(f"  R2 {R2:.5f} adj {adj:.5f} s_e {math.sqrt(s2):.5f} F {Fv:.4f} df (2,{df}) p {1 - stats.f.cdf(Fv, 2, df):.3e}")
def vif(Xv, j):
    others = np.delete(Xv, j, axis=1); A = np.column_stack([np.ones(len(Xv)), others]); coef = np.linalg.lstsq(A, Xv[:, j], rcond=None)[0]; rr = Xv[:, j] - A @ coef
    return 1 / (1 - (1 - (rr ** 2).sum() / ((Xv[:, j] - Xv[:, j].mean()) ** 2).sum()))
print(f"  VIF speed {vif(X[:,1:], 0):.4f} temp {vif(X[:,1:], 1):.4f}")
print("  collinear drivers:")
t2 = np.round(sp * 0.1 + rng.normal(0, 0.05, n), 2); X2 = np.column_stack([np.ones(n), sp, t2]); g2 = np.round(0.4 + 0.02 * sp + rng.normal(0, 0.2, n), 2)
b2 = np.linalg.lstsq(X2, g2, rcond=None)[0]; print(f"  second driver {t2.tolist()}\n  giveaway {g2.tolist()}\n  b {np.round(b2,5).tolist()} VIF {vif(X2[:,1:],0):.2f} {vif(X2[:,1:],1):.2f}")
