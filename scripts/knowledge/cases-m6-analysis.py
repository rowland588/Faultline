"""Independent worked cases for the M6 analysis tools — FC-153 stratification, FC-111 two-level factorials, FC-112 response surface.
Every figure the unit tests hold is printed here by NumPy and SciPy (a second implementation, never Faultline's own).

Run: python3 scripts/knowledge/cases-m6-analysis.py        (NumPy and SciPy installed)
"""
import itertools
import numpy as np
from scipy import stats

np.set_printoptions(precision=6, suppress=True)

print("== FC-153 stratification: rejects by shift and product (the record's worked case, rca.stratification)")
# rows of the data: (shift, product, made, rejected)
recs = [("Day", "A", 24000, 120), ("Day", "B", 16000, 80), ("Night", "A", 24000, 230), ("Night", "B", 16000, 90)]
def split(idx):
    lv = {}
    for r in recs:
        k = r[idx]; m, j = lv.get(k, (0, 0)); lv[k] = (m + r[2], j + r[3])
    return lv
for name, idx in (("Shift", 0), ("Product", 1)):
    lv = split(idx); names = list(lv)
    tab = np.array([[lv[n][1], lv[n][0] - lv[n][1]] for n in names])
    chi2, p, dof, exp = stats.chi2_contingency(tab, correction=False)
    n = tab.sum(); v = np.sqrt(chi2 / (n * (min(tab.shape) - 1)))
    res = (tab[:, 0] - exp[:, 0]) / np.sqrt(exp[:, 0])
    odds, pf = stats.fisher_exact(tab)
    print(f"  {name}: levels {names} made/rejected {[lv[x] for x in names]} rates % {[round(100*lv[x][1]/lv[x][0], 4) for x in names]}")
    print(f"    chi2 {chi2:.4f} df {dof} p {p:.6g} V {v:.5f} residual(rejects) {np.round(res, 4)} expected(rejects) {np.round(exp[:,0], 3)} fisher p {pf:.6g}")
# the cross: each cell against all the others, two-sided z test (pooled) and Fisher
K = sum(r[3] for r in recs); N = sum(r[2] for r in recs)
for r in recs:
    k, n = r[3], r[2]; kr, nr = K - k, N - n
    p1, p2 = kr / nr, k / n; pp = K / N; se = np.sqrt(pp * (1 - pp) * (1 / nr + 1 / n)); z = (p2 - p1) / se
    pz = 2 * stats.norm.sf(abs(z)); tab = [[kr, nr - kr], [k, n - k]]; pf = stats.fisher_exact(tab)[1]
    print(f"  cell {r[0]} {r[1]}: {k}/{n} = {100*p2:.4f}% against the rest {kr}/{nr} = {100*p1:.4f}%  z {z:.4f} pZ {pz:.6g} pFisher {pf:.6g}  excess {k - n*p1:.3f}")
print("  Bonferroni: 2 factors + 4 cells = 6 splits; per-cell alpha 0.05/6 =", round(0.05 / 6, 6), "; per-factor 0.05/2 =", 0.025)

print("\n== FC-153 three lines, small counts: L1 12/1500, L2 9/1400, L3 31/1600")
tab = np.array([[12, 1500 - 12], [9, 1400 - 9], [31, 1600 - 31]])
chi2, p, dof, exp = stats.chi2_contingency(tab, correction=False)
n = tab.sum(); v = np.sqrt(chi2 / (n * 1))
print(f"  chi2 {chi2:.4f} df {dof} p {p:.6g} V {v:.5f} residual(rejects) {np.round((tab[:,0]-exp[:,0])/np.sqrt(exp[:,0]), 4)} expected(rejects) {np.round(exp[:,0], 3)} min expected {exp.min():.3f}")
for name, k, nn in (("L1", 12, 1500), ("L2", 9, 1400), ("L3", 31, 1600)):
    lo, hi = stats.beta.ppf(0.025, k, nn - k + 1), stats.beta.ppf(0.975, k + 1, nn - k)
    print(f"  {name}: exact 95% {100*lo:.4f}% to {100*hi:.4f}%")
print("  a split whose counts are too small to trust: L1 3/900, L2 2/800, L3 9/700 (expected rejects", np.round(14 * np.array([900, 800, 700]) / 2400, 3), ")")
tab = np.array([[3, 897], [2, 798], [9, 691]]); chi2, p, dof, exp = stats.chi2_contingency(tab, correction=False)
print(f"  chi2 {chi2:.4f} df {dof} p {p:.6g}; share of cells expecting >=5: {(exp >= 5).mean():.3f}, min expected {exp.min():.3f}")

print("\n== FC-153 measured: fill weight by shift (the FC-107 case) and the rest-of-the-readings comparison")
A = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2]; B = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6]; C = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1]
F, pa = stats.f_oneway(A, B, C)
allv = np.array(A + B + C); grand = allv.mean()
ssb = sum(len(g) * (np.mean(g) - grand) ** 2 for g in (A, B, C)); sst = ((allv - grand) ** 2).sum()
print(f"  F {F:.4f} p {pa:.6g} eta2 {ssb/sst:.5f}; means {np.mean(A):.4f} {np.mean(B):.4f} {np.mean(C):.4f}")
tk = stats.tukey_hsd(A, B, C)
print("  Tukey p matrix:\n", np.round(tk.pvalue, 6))
print("  KW", stats.kruskal(A, B, C), " Levene(median)", stats.levene(A, B, C, center='median'))
w = stats.ttest_ind(B, A + C, equal_var=False)
print(f"  B against A+C (Welch): t {w.statistic:.4f} p {w.pvalue:.6g} df {w.df:.3f}; diff {np.mean(B) - np.mean(A + C):.4f}")

print("\n== FC-153 confounding of two factors by exposure: shift x line made: Day L1 30000, Day L2 10000, Night L1 5000, Night L2 35000")
t = np.array([[30000, 10000], [5000, 35000]]); chi2, p, dof, exp = stats.chi2_contingency(t, correction=False)
print(f"  V {np.sqrt(chi2 / (t.sum() * 1)):.5f}")


print("\n== FC-111 two-level factorials")
def std_design(k):
    return np.array([[1 if (i >> j) & 1 else -1 for j in range(k)] for i in range(2 ** k)])
def terms(k):
    out = []
    for r in range(1, k + 1):
        for c in itertools.combinations(range(k), r):
            out.append(c)
    return out
def effects(y_cells, k, r):
    # y_cells: list per corner (standard order) of replicate values
    X = std_design(k); tot = np.array([np.sum(v) for v in y_cells])
    res = {}
    for c in terms(k):
        sign = np.prod(X[:, list(c)], axis=1)
        con = float(np.sum(sign * tot))
        res[c] = (con / (r * 2 ** (k - 1)), con ** 2 / (r * 2 ** k))
    return res
names = "ABCDE"
def nm(c): return "".join(names[i] for i in c)

# (1) Montgomery, Design and Analysis of Experiments, example 6.1 — the 2^4 filtration-rate experiment, one replicate
y = [45, 71, 48, 65, 68, 60, 80, 65, 43, 100, 45, 104, 75, 86, 70, 96]
e = effects([[v] for v in y], 4, 1)
print("  Montgomery 2^4 filtration (n=1): effects")
for c, (ef, ss) in e.items(): print(f"    {nm(c)}: effect {ef:.4f}  SS {ss:.4f}")
effs = np.array([ef for ef, _ in e.values()]); m = len(effs)
s0 = 1.5 * np.median(np.abs(effs)); pse = 1.5 * np.median(np.abs(effs)[np.abs(effs) < 2.5 * s0])
d = m / 3
for conf in (0.9, 0.95, 0.99):
    me = stats.t.ppf((1 + conf) / 2, d) * pse; gam = (1 + conf ** (1 / m)) / 2; sme = stats.t.ppf(gam, d) * pse
    print(f"    Lenth conf {conf}: s0 {s0:.4f} PSE {pse:.4f} d {d:.4f} ME {me:.4f} SME {sme:.4f}")

# (2) Montgomery example 6.2 style: the 2^3 plasma etch experiment, n = 2 replicates (etch rate, A gap, B gas flow, C RF power)
cells = [[550, 604], [669, 650], [633, 601], [642, 635], [1037, 1052], [749, 868], [1075, 1063], [729, 860]]
e2 = effects(cells, 3, 2)
sse = sum(np.sum((np.array(v) - np.mean(v)) ** 2) for v in cells); dfe = 8 * (2 - 1); mse = sse / dfe
print(f"  plasma etch 2^3 (n=2): SSE {sse:.4f} dfE {dfe} MSE {mse:.4f}")
for c, (ef, ss) in e2.items():
    se = np.sqrt(4 * mse / (2 * 2 ** 3)); t = ef / se; p = 2 * stats.t.sf(abs(t), dfe); half = stats.t.ppf(0.975, dfe) * se
    print(f"    {nm(c)}: effect {ef:.4f} SS {ss:.4f} F {ss/mse:.4f} t {t:.4f} p {p:.6g} 95% {ef-half:.4f} to {ef+half:.4f}  SE {se:.4f}")
yall = np.concatenate([np.array(v, dtype=float) for v in cells]); sst = ((yall - yall.mean()) ** 2).sum()
print(f"    SST {sst:.4f} grand mean {yall.mean():.4f}")
# the reduced model: C, A, AC (hierarchical: A and C and AC)
X = std_design(3); keep = [(0,), (2,), (0, 2)]
b0 = yall.mean()
def pred(corner):
    x = X[corner]; val = b0
    for c in keep:
        val += e2[c][0] / 2 * np.prod(x[list(c)])
    return val
preds = [pred(i) for i in range(8)]
print("    reduced model A,C,AC predictions by corner (std order):", np.round(preds, 4))
ss_model = sum(e2[c][1] for c in keep)
print(f"    R2 of the reduced model {ss_model/sst:.5f}")
p_par = 1 + len(keep); N = 16
half = stats.t.ppf(0.975, dfe) * np.sqrt(mse * p_par / N)
print(f"    mean-response 95% half-width at a design point: {half:.4f}  (t {stats.t.ppf(0.975, dfe):.4f}, sqrt(MSE p/N) {np.sqrt(mse*p_par/N):.4f})")
# simple effects of A at C- and C+: mean over B of (y at A+) - (y at A-) within C level
tot = [np.mean(v) for v in cells]
def simple(c1, c2, level2):
    num = [];
    for i in range(8):
        x = X[i]
        if x[c2] == level2 and x[c1] == 1:
            # partner with c1 = -1
            j = [jj for jj in range(8) if all(X[jj][t] == x[t] for t in range(3) if t != c1) and X[jj][c1] == -1][0]
            num.append(tot[i] - tot[j])
    return np.mean(num)
print(f"    A effect at C low {simple(0,2,-1):.4f}, at C high {simple(0,2,1):.4f}")

# (3) the record's 2^3 bagger, one replicate: 10.2, 13.1, 11.0, 15.8, 10.6, 13.4, 11.5, 16.4
yb = [10.2, 13.1, 11.0, 15.8, 10.6, 13.4, 11.5, 16.4]
eb = effects([[v] for v in yb], 3, 1)
print("  bagger 2^3 (n=1): ", {nm(c): round(ef, 4) for c, (ef, _) in eb.items()})
effs = np.array([ef for ef, _ in eb.values()]); m = len(effs)
s0 = 1.5 * np.median(np.abs(effs)); pse = 1.5 * np.median(np.abs(effs)[np.abs(effs) < 2.5 * s0]); d = m / 3
for conf in (0.9, 0.95, 0.99):
    me = stats.t.ppf((1 + conf) / 2, d) * pse; gam = (1 + conf ** (1 / m)) / 2; sme = stats.t.ppf(gam, d) * pse
    print(f"    Lenth conf {conf}: s0 {s0:.4f} PSE {pse:.4f} d {d:.4f} ME {me:.4f} SME {sme:.4f}")
bb0 = np.mean(yb); Xb = std_design(3)
keepb = [(0,), (1,), (0, 1)]
print("    prediction at T+ D+ P- (reduced T,D,TD):", bb0 + sum(eb[c][0] / 2 * np.prod(Xb[7 - 4 + 0][list(c)]) for c in []), end=" ")
x = np.array([1, 1, -1]); print(round(bb0 + sum(eb[c][0] / 2 * np.prod(x[list(c)]) for c in keepb), 4))
print(f"    T effect at D low {np.mean([yb[1]-yb[0], yb[5]-yb[4]]):.4f}, at D high {np.mean([yb[3]-yb[2], yb[7]-yb[6]]):.4f}")

# (4) centre points and curvature (Montgomery 6.8 form): a 2^2 with 5 centre points
yf = [39.3, 40.9, 40.0, 41.5]  # corners
yc = [40.3, 40.5, 40.7, 40.2, 40.6]
nF, nC = 4, 5
ssc = nF * nC * (np.mean(yf) - np.mean(yc)) ** 2 / (nF + nC)
sspe = np.sum((np.array(yc) - np.mean(yc)) ** 2); mspe = sspe / (nC - 1)
F0 = ssc / mspe; pcurv = stats.f.sf(F0, 1, nC - 1)
print(f"  curvature (Montgomery example 6.7 data): corners mean {np.mean(yf):.4f} centre mean {np.mean(yc):.4f} SS_curv {ssc:.6f} SS_PE {sspe:.4f} MS_PE {mspe:.5f} F {F0:.4f} p {pcurv:.6g}")

# (5) a food 2^2 with 2 replicates: seal strength, T (170/190) and dwell (0.8/1.2)
cells5 = [[10.1, 10.5], [13.2, 12.8], [11.4, 11.0], [15.9, 16.3]]
e5 = effects(cells5, 2, 2); sse5 = sum(np.sum((np.array(v) - np.mean(v)) ** 2) for v in cells5); dfe5 = 4; mse5 = sse5 / dfe5
print(f"  seal 2^2 (n=2): MSE {mse5:.5f} dfE {dfe5}")
for c, (ef, ss) in e5.items():
    se = np.sqrt(4 * mse5 / (2 * 4)); t = ef / se; p = 2 * stats.t.sf(abs(t), dfe5)
    print(f"    {nm(c)}: effect {ef:.4f} SS {ss:.4f} t {t:.4f} p {p:.6g}")

# randomisation: mulberry32 + Fisher-Yates in the app; the tests re-implement it here
def mulberry32(a):
    a &= 0xFFFFFFFF
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd
def shuffled(n, seed):
    r = mulberry32(seed); a = list(range(n))
    for i in range(n - 1, 0, -1):
        j = int(r() * (i + 1)); a[i], a[j] = a[j], a[i]
    return a
print("  shuffle of 8 with seed 12345:", shuffled(8, 12345), " of 16 with seed 20260401:", shuffled(16, 20260401))


print("\n== FC-132 the process FMEA's action priority (Faultline's own severity-first rule — not the AIAG-VDA table, which is not reproduced)")
import hashlib
def ap_rule(s, o, d):
    # written differently from the app: explicit conditions, no lookup tables
    if o >= 8:
        strength = "weak"
    elif o <= 3:
        strength = "strong" if d <= 6 else "moderate"
    elif o <= 6:
        strength = "strong" if d <= 3 else ("moderate" if d <= 6 else "weak")
    else:  # o == 7
        strength = "moderate" if d <= 3 else "weak"
    if s >= 9:
        return "M" if strength == "strong" else "H"
    if s >= 7:
        return {"weak": "H", "moderate": "M", "strong": "L"}[strength]
    if s >= 4:
        return "M" if strength == "weak" else "L"
    return "L"
cells = "".join(ap_rule(s, o, d) for s in range(1, 11) for o in range(1, 11) for d in range(1, 11))
print("  1000 cells (S, O, D in loop order, 1..10 each):", hashlib.sha256(cells.encode()).hexdigest()[:16], " H", cells.count("H"), "M", cells.count("M"), "L", cells.count("L"))
mono = all(
    ("LMH".index(ap_rule(s, o, d)) <= "LMH".index(ap_rule(min(s + 1, 10), o, d)) and "LMH".index(ap_rule(s, o, d)) <= "LMH".index(ap_rule(s, min(o + 1, 10), d)) and "LMH".index(ap_rule(s, o, d)) <= "LMH".index(ap_rule(s, o, min(d + 1, 10))))
    for s in range(1, 11) for o in range(1, 11) for d in range(1, 11))
print("  monotone in S, O and D:", mono)
for name, (s, o, d) in {"seal": (9, 3, 4), "reel": (8, 2, 9), "smudge": (3, 9, 8), "metal": (10, 2, 3), "datecode": (7, 5, 7), "underweight": (7, 4, 2), "splice": (6, 7, 8), "S10 O1 D1": (10, 1, 1), "S9 O8 D1": (9, 8, 1), "S1 O10 D10": (1, 10, 10)}.items():
    print(f"  {name}: S{s} O{o} D{d} -> {ap_rule(s, o, d)}")
print("  an RPN would rank the smudge (3*9*8 = 216) above the seal (9*3*4 = 108) and the reel (8*2*9 = 144): the rule does not")
