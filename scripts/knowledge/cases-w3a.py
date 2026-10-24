#!/usr/bin/env python3
"""INDEPENDENT CASES — W3a, the analysis tool's first kinds (knowledge/specs/FC-105-analysis.md, 24 October 2026).
Every figure the tests assert is printed here by SciPy/NumPy, never by Faultline's own code (knowledge/STANDARD.md, step 4).
FC-103 describing · FC-104 how sure · FC-105 did it change · FC-106 the same items two ways · FC-113 / FC-020 how many
readings · FC-115 readings that depend on the last.
Run: python3 -I scripts/knowledge/cases-w3a.py"""
import math
import numpy as np
from scipy import stats, optimize

THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
          401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8]
x = np.array(THIRTY)
print("== FC-103 describing the thirty packs")
print(f"  n {len(x)} mean {x.mean():.4f} median {np.median(x):.3f} s {x.std(ddof=1):.4f} range {x.min()}–{x.max()}")
print(f"  Q1 {np.percentile(x,25):.3f} Q3 {np.percentile(x,75):.3f} IQR {np.percentile(x,75)-np.percentile(x,25):.3f} (linear, type 7)")
print(f"  G1 {stats.skew(x, bias=False):.4f} G2 {stats.kurtosis(x, bias=False):.4f} CV {100*x.std(ddof=1)/x.mean():.3f}%")
q1, q3 = np.percentile(x, [25, 75]); iqr = q3 - q1
print(f"  outliers beyond 1.5 IQR: {x[(x < q1 - 1.5*iqr) | (x > q3 + 1.5*iqr)].tolist()} (fences {q1-1.5*iqr:.3f}, {q3+1.5*iqr:.3f})")

print("\n== FC-104 how sure — the mean, the spread, a share, a rate")
m, s, n = x.mean(), x.std(ddof=1), len(x)
for c in (0.90, 0.95, 0.99):
    t = stats.t.ppf(1 - (1 - c)/2, n - 1); h = t*s/math.sqrt(n)
    lo = s*math.sqrt((n-1)/stats.chi2.ppf(1-(1-c)/2, n-1)); hi = s*math.sqrt((n-1)/stats.chi2.ppf((1-c)/2, n-1))
    print(f"  {c:.0%}: t {t:.4f} mean {m-h:.4f}–{m+h:.4f}  spread {lo:.4f}–{hi:.4f}")
def cp(k, N, c):
    a = 1 - c
    lo = 0.0 if k == 0 else stats.beta.ppf(a/2, k, N-k+1); hi = 1.0 if k == N else stats.beta.ppf(1-a/2, k+1, N-k)
    return lo, hi
def wilson(k, N, c):
    z = stats.norm.ppf(1-(1-c)/2); p = k/N
    d = 1 + z*z/N; ctr = (p + z*z/(2*N))/d; hw = z*math.sqrt(p*(1-p)/N + z*z/(4*N*N))/d
    return ctr-hw, ctr+hw
for k, N in ((7, 600), (0, 50), (3, 20), (20, 20)):
    print(f"  {k} of {N}: p {k/N:.4f} CP95 {cp(k,N,.95)[0]:.5f}–{cp(k,N,.95)[1]:.5f}  Wilson95 {wilson(k,N,.95)[0]:.5f}–{wilson(k,N,.95)[1]:.5f}  CP99 {cp(k,N,.99)[0]:.5f}–{cp(k,N,.99)[1]:.5f}")
def pois(C, E, c):
    a = 1 - c
    lo = 0.0 if C == 0 else stats.chi2.ppf(a/2, 2*C)/(2*E); hi = stats.chi2.ppf(1-a/2, 2*C+2)/(2*E)
    return lo, hi
for C, E in ((12, 40), (0, 40), (1, 8)):
    print(f"  {C} in {E} h: rate {C/E:.4f} Poisson95 {pois(C,E,.95)[0]:.5f}–{pois(C,E,.95)[1]:.5f}")

print("\n== FC-105 did it change — measured (Welch, Mann–Whitney)")
B = np.array([12.4, 12.9, 13.1, 12.2, 12.8, 13.4, 12.6, 12.9, 13.0, 12.5, 13.2, 12.7])
A = np.array([12.1, 12.3, 12.6, 11.9, 12.5, 12.2, 12.4, 12.0, 12.7, 12.3, 12.2, 12.5])
w = stats.ttest_ind(A, B, equal_var=False)
se = math.sqrt(A.var(ddof=1)/len(A) + B.var(ddof=1)/len(B)); dfw = w.df
tcrit = stats.t.ppf(0.975, dfw); d = A.mean() - B.mean()
print(f"  before mean {B.mean():.4f} s {B.std(ddof=1):.4f}; after mean {A.mean():.4f} s {A.std(ddof=1):.4f}")
print(f"  Welch t {w.statistic:.4f} df {dfw:.4f} p {w.pvalue:.6f}; diff {d:.4f} 95% {d-tcrit*se:.4f}–{d+tcrit*se:.4f}")
mw = stats.mannwhitneyu(A, B, alternative='two-sided', method='asymptotic', use_continuity=True)
print(f"  Mann–Whitney (ties in the twelves) U_A {mw.statistic} asymptotic p (continuity, tie-corrected) {mw.pvalue:.6f}; tied values {sorted(set(v for v in list(A)+list(B) if list(A).count(v)+list(B).count(v)>1))}")
# no ties: exact
Bx = np.array([14.12, 14.35, 13.98, 14.60, 14.22, 14.48, 14.05, 14.31]); Ax = np.array([13.91, 14.02, 13.87, 14.18, 13.95, 14.27, 13.80, 14.09])
mx = stats.mannwhitneyu(Ax, Bx, alternative='two-sided', method='exact')
print(f"  Mann–Whitney exact, no ties (8 vs 8): after {Ax.tolist()} before {Bx.tolist()} U_A {mx.statistic} exact p {mx.pvalue:.6f}; Welch p {stats.ttest_ind(Ax, Bx, equal_var=False).pvalue:.6f}")
Bs = np.array([5.1, 6.3, 7.2]); As = np.array([8.4, 9.1, 10.2, 9.7])
ms = stats.mannwhitneyu(As, Bs, alternative='two-sided', method='exact'); print(f"  Mann–Whitney exact, 3 vs 4 all after higher: U_A {ms.statistic} p {ms.pvalue:.6f}")
# with ties
B2 = np.array([5, 6, 6, 7, 8, 8, 9, 10, 10, 11.0]); A2 = np.array([4, 5, 5, 6, 6, 7, 7, 8, 9, 9, 10.0])
mt = stats.mannwhitneyu(A2, B2, alternative='two-sided', method='asymptotic', use_continuity=True)
print(f"  Mann–Whitney with ties: U_A {mt.statistic} asymptotic p (continuity) {mt.pvalue:.6f}")
big_B = np.random.default_rng(3).normal(100, 4, 30).round(1); big_A = np.random.default_rng(4).normal(96, 4, 30).round(1)
print(f"  big: B {big_B.tolist()}\n       A {big_A.tolist()}")
mb = stats.mannwhitneyu(big_A, big_B, alternative='two-sided', method='asymptotic', use_continuity=True)
print(f"       U_A {mb.statistic} asymptotic p {mb.pvalue:.6f}; Welch p {stats.ttest_ind(big_A, big_B, equal_var=False).pvalue:.6f}")

print("\n== FC-105 did it change — counted (two proportions)")
for (k1, n1, k2, n2) in ((14, 400, 5, 380), (3, 40, 0, 45), (60, 1000, 40, 1000)):
    p1, p2 = k1/n1, k2/n2; pp = (k1+k2)/(n1+n2); z = (p2-p1)/math.sqrt(pp*(1-pp)*(1/n1+1/n2))
    pz = 2*(1 - stats.norm.cdf(abs(z))); orr, pf = stats.fisher_exact([[k1, n1-k1], [k2, n2-k2]])
    exp = min((k1+k2)*n1/(n1+n2), (k1+k2)*n2/(n1+n2), (n1+n2-k1-k2)*n1/(n1+n2), (n1+n2-k1-k2)*n2/(n1+n2))
    print(f"  {k1}/{n1} -> {k2}/{n2}: {p1:.4f} -> {p2:.4f} z {z:.4f} p_z {pz:.6f} Fisher p {pf:.6f} smallest expected {exp:.2f}")

print("\n== FC-106 paired")
P1 = np.array([401.2, 400.8, 402.1, 399.9, 401.5, 400.4, 401.9, 400.7, 401.1, 402.4, 400.2, 401.6])
P2 = np.array([401.6, 401.1, 402.2, 400.5, 401.9, 400.3, 402.5, 401.2, 401.4, 402.9, 400.8, 402.1])
dd = np.round(P2 - P1, 9); tt = stats.ttest_rel(P2, P1); h = stats.t.ppf(0.975, len(dd)-1)*dd.std(ddof=1)/math.sqrt(len(dd))
print(f"  mean diff {dd.mean():.4f} sd {dd.std(ddof=1):.4f} t {tt.statistic:.4f} df {len(dd)-1} p {tt.pvalue:.6f} 95% {dd.mean()-h:.4f}–{dd.mean()+h:.4f}")
wa = stats.wilcoxon(dd, method='approx', correction=True); print(f"  Wilcoxon on those (differences tie, so the normal with continuity): W {wa.statistic} p {wa.pvalue:.6f}; differences {np.round(dd,2).tolist()}")
Dx = np.array([0.31, -0.12, 0.45, 0.22, 0.58, 0.07, 0.36, -0.04, 0.27, 0.51])
wxx = stats.wilcoxon(Dx, method='exact'); print(f"  Wilcoxon exact, no ties (ten differences {Dx.tolist()}): W {wxx.statistic} p {wxx.pvalue:.6f}; paired t p {stats.ttest_1samp(Dx, 0).pvalue:.6f}")
Q1 = np.array([5.1, 4.8, 5.6, 5.0, 5.3, 4.9, 5.7, 5.2, 5.4, 5.0, 5.5, 4.7, 5.8, 5.1]); Q2 = Q1 + np.array([.2, -.1, .3, .2, 0, .4, .2, .3, 0, .2, .4, .1, .3, .2])
dq = np.round(Q2 - Q1, 9); wz = stats.wilcoxon(dq, method='approx', correction=True, zero_method='wilcox')
print(f"  with a zero and ties: W {wz.statistic} approx p (continuity, zeros dropped) {wz.pvalue:.6f}; zeros {int((dq==0).sum())}; differences {dq.tolist()}")
print(f"  paired t on that: t {stats.ttest_1samp(dq, 0).statistic:.4f} p {stats.ttest_1samp(dq, 0).pvalue:.6f}")

print("\n== FC-113 how many readings")
z = stats.norm.ppf(0.975); zb = stats.norm.ppf(0.8)
def n_mean(sd, e, c=.95):
    n = 2
    while True:
        t = stats.t.ppf(1-(1-c)/2, n-1)
        if t*sd/math.sqrt(n) <= e: return n
        n += 1
print(f"  mean ±0.3 g, s 0.9, 95%: z-formula {(z*0.9/0.3)**2:.2f} -> {math.ceil((z*0.9/0.3)**2)}; with Student's t {n_mean(0.9, .3)}")
def power2(n, delta, sd, a=.05):
    df = 2*n-2; ncp = delta/(sd*math.sqrt(2/n)); tc = stats.t.ppf(1-a/2, df)
    return 1 - stats.nct.cdf(tc, df, ncp) + stats.nct.cdf(-tc, df, ncp)
n2 = 2
while power2(n2, .5, .9) < .8: n2 += 1
print(f"  two shifts, δ 0.5, s 0.9, 80%: z-approx {2*(z+zb)**2*0.81/0.25:.2f}; exact n/group {n2}, power at {n2} {power2(n2,.5,.9):.4f}, at {n2-1} {power2(n2-1,.5,.9):.4f}, at 20 {power2(20,.5,.9):.4f}")
for n in (10, 20, 52): print(f"  power(n={n}, δ 0.5, s 0.9) {power2(n,.5,.9):.5f}")
print(f"  90% power: n/group {next(n for n in range(2,500) if power2(n,.5,.9)>=.9)}")
print(f"  proportion ±2 pts at p .10: {math.ceil(z*z*.1*.9/.02**2)}; p unknown: {math.ceil(z*z*.25/.02**2)}; ±3 at .15: {math.ceil(z*z*.15*.85/.03**2)}")
def n_two_props(p1, p2, a=.05, pw=.8):
    za, zb2 = stats.norm.ppf(1-a/2), stats.norm.ppf(pw); pb = (p1+p2)/2
    return math.ceil((za*math.sqrt(2*pb*(1-pb)) + zb2*math.sqrt(p1*(1-p1)+p2*(1-p2)))**2/(p1-p2)**2)
print(f"  two proportions .10 -> .05 at 80%: {n_two_props(.10,.05)} per group; .035 -> .013: {n_two_props(.035,.013)}")
print(f"  finite population N=500 on n=865: {math.ceil(865/(1+865/500))}")
print(f"  zero failures to show 99% good at 95%: {math.ceil(math.log(.05)/math.log(.99))}")
print(f"  margin achieved n=30 s .599: ±{stats.t.ppf(.975,29)*.599/math.sqrt(30):.4f}; difference seen at 80% (n=20/group, s .9): {(z+zb)*.9*math.sqrt(2/20):.4f}")

print("\n== FC-020 how many cycles")
cyc = np.array([12.1, 12.8, 11.6, 13.0, 12.4]); k = 0.05
mean, sd = cyc.mean(), cyc.std(ddof=1)
def n_cycles(mean, sd, k, c=.95):
    n = 2
    while stats.t.ppf(1-(1-c)/2, n-1)*sd/math.sqrt(n) > k*mean: n += 1
    return n
print(f"  five cycles mean {mean:.3f} s {sd:.4f}: z-formula {(z*sd/(k*mean))**2:.2f}; with t {n_cycles(mean, sd, k)}; margin now ±{stats.t.ppf(.975,4)*sd/math.sqrt(5):.4f} s = {100*stats.t.ppf(.975,4)*sd/math.sqrt(5)/mean:.2f}% ")
print(f"  at 10%: {n_cycles(mean, sd, .10)}; at 2%: {n_cycles(mean, sd, .02)}")

print("\n== FC-115 autocorrelation")
rng = np.random.default_rng(5); e = rng.normal(0, 0.5, 40); ar = np.zeros(40)
for i in range(40): ar[i] = 400 + (0.6*(ar[i-1]-400) if i else 0) + e[i]
ar = np.round(ar, 2)
def acf(v, kk):
    v = np.asarray(v); m_ = v.mean(); return float(((v[:-kk]-m_)*(v[kk:]-m_)).sum()/((v-m_)**2).sum())
print("  AR(1) readings (rounded to 0.01):", ar.tolist())
print(f"  r1 {acf(ar,1):.4f} r2 {acf(ar,2):.4f} r3 {acf(ar,3):.4f} band ±{2/math.sqrt(40):.4f}")
mr = np.abs(np.diff(ar)).mean(); print(f"  s {ar.std(ddof=1):.4f} sigma from MRbar {mr/1.128:.4f} ratio {(mr/1.128)/ar.std(ddof=1):.4f} sqrt(1-r1) {math.sqrt(1-acf(ar,1)):.4f}")
dw = ((np.diff(ar-ar.mean()))**2).sum()/((ar-ar.mean())**2).sum(); print(f"  Durbin–Watson {dw:.4f}; effective n {40*(1-acf(ar,1))/(1+acf(ar,1)):.2f}")
for m_ in (2, 3, 4):
    th = ar[::m_]; print(f"  every {m_}: n {len(th)} r1 {acf(th,1):.4f} band ±{2/math.sqrt(len(th)):.4f}")
ind = np.round(np.random.default_rng(6).normal(400, .5, 40), 2); print(f"  independent: r1 {acf(ind,1):.4f} band ±{2/math.sqrt(40):.4f}; readings {ind.tolist()}")
short = ar[:20]; print(f"  first 20 only: r1 {acf(short,1):.4f} (fewer than 30 — not judged)")
