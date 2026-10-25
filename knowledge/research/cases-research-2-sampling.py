#!/usr/bin/env python3
"""INDEPENDENT CASES — Research 2, part 1: acceptance sampling (FC-129, FC-130), 25 October 2026.

Run:  python3 -I knowledge/research/cases-research-2-sampling.py
SciPy/NumPy and exact integer arithmetic only; nothing here is Faultline's code.
Every number quoted in knowledge/methods/quality/acceptance-sampling-*.md
under "Researched, 25 October 2026" is printed (or asserted) here.
The script ends by asserting its own claims, so a changed library or a typo fails loudly.
"""
import math
import numpy as np
from scipy import stats, special

ok = []
def check(name, cond):
    ok.append((name, bool(cond)))
    print(("  PASS " if cond else "  FAIL ") + name)

# ---------------------------------------------------------------- attributes
print("# A. attributes: the OC curve is public mathematics; a plan is DESIGNED from two points")

def pa_exact(n, c, p):                      # exact integer-free sum, independent of SciPy
    return sum(math.comb(n, d) * p**d * (1 - p)**(n - d) for d in range(c + 1))

def design_binomial(p1, alpha, p2, beta, nmax=5000):
    """Smallest n (then the c that goes with it): Pa(p1) >= 1-alpha and Pa(p2) <= beta.
    For a fixed c, Pa falls as n rises, so [n_beta(c), n_alpha(c)] is the feasible range and
    n_beta(c) rises with c: the first c with a feasible n gives the smallest n."""
    for c in range(0, 200):
        if stats.binom.cdf(c, nmax, p2) > beta:
            continue
        lo, hi = c + 1, nmax
        while lo < hi:
            mid = (lo + hi) // 2
            if stats.binom.cdf(c, mid, p2) <= beta: hi = mid
            else: lo = mid + 1
        if stats.binom.cdf(c, lo, p1) >= 1 - alpha:
            return lo, c
    return None

def brute(p1, alpha, p2, beta):
    for n in range(1, 600):
        for c in range(0, 60):
            if pa_exact(n, c, p1) >= 1 - alpha and pa_exact(n, c, p2) <= beta:
                return n, c

cases = [  # (AQL, alpha, LQ, beta)
    (0.01, .05, .06, .10), (0.01, .05, .08, .10), (0.01, .05, .05, .10),
    (0.025, .05, .10, .10), (0.0065, .05, .04, .10), (0.04, .05, .15, .10), (0.01, .05, .20, .10)]
designed = {}
for pts in cases:
    d = design_binomial(*pts); b = brute(*pts); designed[pts] = d
    n, c = d
    print(f"  AQL {pts[0]:.2%} (risk {pts[1]:.0%}), LQ {pts[2]:.2%} (risk {pts[3]:.0%}) -> n={n}, c={c}; "
          f"Pa(AQL)={stats.binom.cdf(c, n, pts[0]):.4f}, Pa(LQ)={stats.binom.cdf(c, n, pts[2]):.4f}; brute force {b}")
    check(f"search = brute force for {pts}", d == b)
check("AQL 1% / LQ 6% -> n=110, c=3", designed[(0.01, .05, .06, .10)] == (110, 3))
check("AQL 1% / LQ 8% -> n=65, c=2",  designed[(0.01, .05, .08, .10)] == (65, 2))

# a looser, table-like plan for the same two points: quote the risks as computed
print(f"  looser plan n=89, c=2 at AQL 1%/LQ 6%: producer's risk {1 - stats.binom.cdf(2, 89, 0.01):.3f}, consumer's {stats.binom.cdf(2, 89, 0.06):.3f}")
check("n=89,c=2: consumer's point met but producer's risk is 6.0% (not 5%)",
      1 - stats.binom.cdf(2, 89, 0.01) > 0.05 and stats.binom.cdf(2, 89, 0.06) <= 0.10)

# the c=0 relation
for p2, beta in [(0.05, 0.10), (0.02, 0.05)]:
    n0 = math.ceil(math.log(beta) / math.log(1 - p2))
    print(f"  c=0: LQ {p2:.0%} at risk {beta:.0%}: n = ln b / ln(1-p2) = {n0}; Pa(LQ) = {(1-p2)**n0:.4f}; at AQL 1% Pa = {(0.99)**n0:.3f} (good lots rejected {1-0.99**n0:.1%})")
    check(f"c=0 n for LQ {p2}, beta {beta}", (1 - p2)**n0 <= beta < (1 - p2)**(n0 - 1))

# the record's earlier worked plan, recomputed from exact sums
for p, want in [(0.005, 0.996), (0.01, 0.963), (0.02, 0.759), (0.03, 0.481), (0.05, 0.124), (0.08, 0.008)]:
    check(f"n=125,c=3 Pa({p:.1%}) = {want}", abs(pa_exact(125, 3, p) - want) < 0.0006)

# finite lot: hypergeometric (D = lot defectives = round(N*p))
def hyper_pa(N, n, c, D):
    return sum(math.comb(D, d) * math.comb(N - D, n - d) for d in range(c + 1)) / math.comb(N, n)
h = hyper_pa(200, 50, 1, 10)
print(f"  N=200, n=50, c=1, D=10 (5%): hypergeometric Pa {h:.4f}; binomial {pa_exact(50, 1, .05):.4f}; scipy {stats.hypergeom.cdf(1, 200, 10, 50):.4f}")
check("hypergeometric exact = scipy", abs(h - stats.hypergeom.cdf(1, 200, 10, 50)) < 1e-12)
check("hypergeometric < binomial for a big sample from a small lot", h < pa_exact(50, 1, .05))

def design_hyper(N, p1, alpha, p2, beta):
    D1, D2 = round(N * p1), round(N * p2)       # Faultline choice: nearest whole number of defectives in the lot
    for n in range(1, N + 1):
        for c in range(0, n + 1):
            if hyper_pa(N, n, c, D1) >= 1 - alpha and hyper_pa(N, n, c, D2) <= beta:
                return n, c, D1, D2
    return None
for N in (200, 500, 3000):
    dh = design_hyper(N, 0.01, .05, .06, .10) if N <= 500 else None
    if dh:
        n, c, D1, D2 = dh
        print(f"  lot of {N}: AQL 1% ({D1} bad) / LQ 6% ({D2} bad) -> n={n}, c={c}  (binomial said 110/3); Pa {hyper_pa(N, n, c, D1):.4f} / {hyper_pa(N, n, c, D2):.4f}")
check("lot of 500 needs a smaller plan than 110/3", design_hyper(500, 0.01, .05, .06, .10)[0] < 110)

# Monte Carlo of the decision rule itself (a third, independent way)
rng = np.random.default_rng(20261025)
n, c, p = 110, 3, 0.03
mc = (rng.binomial(n, p, 400_000) <= c).mean()
print(f"  Monte Carlo (400k lots) Pa(3%) for 110/3: {mc:.4f} vs exact {pa_exact(n, c, p):.4f}")
check("Monte Carlo agrees with the exact sum to 0.003", abs(mc - pa_exact(n, c, p)) < 0.003)

# AOQ / ATI / AOQL (rectifying inspection) for 110/3, lot 3000
N, n, c = 3000, 110, 3
aoq = lambda p: p * pa_exact(n, c, p) * (N - n) / N
aoql = max(aoq(p) for p in np.arange(0.001, 0.15, 0.0001))
print(f"  110/3 in lots of 3000: AOQL {aoql:.4f}; ATI at 2% = {n + (1 - pa_exact(n, c, .02)) * (N - n):.0f}")

# ---------------------------------------------------------------- variables
print("\n# B. variables: the k-method. Known sigma is closed form; sigma estimated is the noncentral t")
z = stats.norm.ppf
def design_known_sigma(p1, alpha, p2, beta):
    zp1, zp2, za, zb = z(1 - p1), z(1 - p2), z(1 - alpha), z(1 - beta)
    k = (zp1 * zb + zp2 * za) / (za + zb)
    n = ((za + zb) / (zp1 - zp2)) ** 2
    return k, n
k_known, n_known_real = design_known_sigma(0.01, .05, .08, .10)
n_known = math.ceil(n_known_real)
print(f"  known sigma, AQL 1%/LQ 8%: k = {k_known:.3f}, n = {n_known_real:.2f} -> {n_known}")
check("k = 1.809 (matches the record)", abs(k_known - 1.809) < 0.001)
# at the rounded n, check the OC directly: accept when (xbar-L)/sigma >= k  <=>  Z >= k*sqrt(n) - sqrt(n)*z(1-p)
def pa_known(n, k, p):  return stats.norm.cdf(math.sqrt(n) * z(1 - p) - k * math.sqrt(n))
print(f"  Pa(1%) = {pa_known(n_known, k_known, .01):.4f}, Pa(8%) = {pa_known(n_known, k_known, .08):.4f} at n={n_known}")
check("known-sigma plan meets both points at n=11", pa_known(11, k_known, .01) >= .95 and pa_known(11, k_known, .08) <= .10)

def pa_nct(n, k, p):
    """sigma estimated: accept when (xbar-L)/s >= k.  t = sqrt(n)(xbar-L)/s ~ noncentral t(df=n-1, nc=sqrt(n)*z(1-p))."""
    return stats.nct.sf(k * math.sqrt(n), n - 1, math.sqrt(n) * z(1 - p))

def design_unknown_sigma(p1, alpha, p2, beta, nmax=2000):
    for n in range(2, nmax):
        d1, d2 = math.sqrt(n) * z(1 - p1), math.sqrt(n) * z(1 - p2)
        k_hi = stats.nct.ppf(alpha, n - 1, d1) / math.sqrt(n)          # Pa(p1) >= 1-alpha  <=>  k <= k_hi
        k_lo = stats.nct.ppf(1 - beta, n - 1, d2) / math.sqrt(n)       # Pa(p2) <= beta     <=>  k >= k_lo
        if k_lo <= k_hi:
            return n, k_lo, k_hi
n_u, klo, khi = design_unknown_sigma(0.01, .05, .08, .10)
print(f"  sigma estimated, exact: smallest n = {n_u}; k may be anywhere in [{klo:.3f}, {khi:.3f}]")
k_mid = (klo + khi) / 2
print(f"  at k = {k_mid:.3f}: Pa(1%) = {pa_nct(n_u, k_mid, .01):.4f}, Pa(8%) = {pa_nct(n_u, k_mid, .08):.4f}")
# the approximation the record used: k=1.809, n=ceil(((za+zb)/(z1-z2))^2 (1+k^2/2))
n_apx = math.ceil(((z(.95) + z(.90)) / (z(.99) - z(.92))) ** 2 * (1 + k_known**2 / 2))
print(f"  approximation n = ceil(((za+zb)/(z1-z2))^2 (1+k^2/2)) = {n_apx} at k={k_known:.3f}: exact Pa(1%) = {pa_nct(n_apx, k_known, .01):.4f}, Pa(8%) = {pa_nct(n_apx, k_known, .08):.4f}")
check("exact sigma-estimated n is a little above the known-sigma n and well below the attribute plan's",
      n_known < n_u < designed[(0.01, .05, .08, .10)][0])
check("approximation within 2 of the exact design", abs(n_apx - n_u) <= 2)
check("exact design meets both points", pa_nct(n_u, k_mid, .01) >= .95 and pa_nct(n_u, k_mid, .08) <= .10)

# Monte Carlo of the decision rule itself
def mc_pa(n, k, p, runs=200_000, seed=1):
    r = np.random.default_rng(seed)
    mu_minus_L = z(1 - p)                      # sigma = 1, L = 0, mean = z(1-p)
    x = r.normal(mu_minus_L, 1, (runs, n))
    return ((x.mean(1) / x.std(1, ddof=1)) >= k).mean()
for p in (0.01, 0.08):
    m = mc_pa(n_u, k_mid, p)
    print(f"  Monte Carlo ({200000:,} lots of {n_u}) Pa({p:.0%}) = {m:.4f} vs noncentral t {pa_nct(n_u, k_mid, p):.4f}")
    check(f"Monte Carlo = nct at {p:.0%}", abs(m - pa_nct(n_u, k_mid, p)) < 0.004)

# a few more designs, to show the range of savings
print("  designs, AQL/LQ at risks 5%/10%: attribute (n,c) vs variables n (sigma known / estimated):")
for p1, p2 in [(0.01, 0.06), (0.01, 0.08), (0.025, 0.10), (0.04, 0.15)]:
    na, ca = design_binomial(p1, .05, p2, .10)
    kk, nk = design_known_sigma(p1, .05, p2, .10); nu, lo, hi = design_unknown_sigma(p1, .05, p2, .10)
    print(f"    {p1:.1%}/{p2:.0%}: attributes n={na} (c={ca}); variables sigma known n={math.ceil(nk)}, estimated n={nu}, k in [{lo:.2f}, {hi:.2f}]")

# the decision on a sample (the record's seal-strength readings), and the fraction beyond the limit
xs = np.array([13.1, 12.4, 14.0, 11.8, 12.9, 13.5, 12.2, 13.8, 12.6, 13.0, 11.9, 13.3, 12.7, 13.6, 12.1, 13.2, 12.8, 13.9, 12.3, 13.4])
m, s = xs.mean(), xs.std(ddof=1); Q = (m - 10) / s
print(f"  20 seals: mean {m:.3f}, s {s:.3f}, Q = {Q:.3f}; with n=20 the exact k bounds would be different from n={n_u}'s (a plan is its own n)")

# the minimum-variance unbiased estimate of the fraction beyond one limit (Lieberman-Resnikoff 1955; from knowledge, proved here by simulation to be unbiased)
def p_hat_mvue(n, Q):
    x = max(0.0, 0.5 - 0.5 * Q * math.sqrt(n) / (n - 1))
    return special.betainc((n - 2) / 2, (n - 2) / 2, min(1.0, x))
r = np.random.default_rng(7)
n_s, p_true = 20, 0.03
xx = r.normal(z(1 - p_true), 1, (300_000, n_s)); Qs = xx.mean(1) / xx.std(1, ddof=1)
est = np.array([p_hat_mvue(n_s, q) for q in Qs[:60_000]])
naive = stats.norm.sf(Qs[:60_000])
print(f"  true fraction beyond limit {p_true}: mean of the MVUE over 60k samples {est.mean():.4f}; mean of the naive Phi(-Q) {naive.mean():.4f}")
check("the beta-form estimate is unbiased (to 0.0015)", abs(est.mean() - p_true) < 0.0015)
check("the naive Phi(-Q) is biased HIGH for n=20 (it overstates the fraction beyond the limit)", naive.mean() > p_true + 0.002)
print(f"  the record's sample (n=20, Q={Q:.3f}): MVUE fraction under 10 N = {p_hat_mvue(20, Q):.2e} (zero: Q is beyond (n-1)/sqrt(n) = {19/math.sqrt(20):.3f}); naive Phi(-Q) = {stats.norm.sf(Q):.2e}")
check('Q beyond (n-1)/sqrt(n) gives an estimate of exactly 0', p_hat_mvue(20, Q) == 0.0 and Q > 19/math.sqrt(20))
print(f"  n=28: at the accept boundary Q = k = 1.821 the unbiased estimate is {p_hat_mvue(28, 1.821):.4f}; at Q = 4.374 it is {p_hat_mvue(28, 4.374):.1e}; Q = 0.5 gives {p_hat_mvue(28, 0.5):.3f}")
check("a lot only just accepted is estimated about 3.1% beyond the limit", abs(p_hat_mvue(28, 1.821) - 0.0311) < 0.0005)
check("a Q of 4.374 at n=28 is estimated at about 3e-9", 1e-9 < p_hat_mvue(28, 4.374) < 1e-8)

# the normality assumption is the whole basis: a skewed lot, the same plan
print("\n# B2. misuse: the plan (n=%d, k=%.3f) on lots that are not normal, lower limit L" % (n_u, k_mid))
def pa_mc_dist(draw, L, n, k, runs=100_000, seed=11):
    r = np.random.default_rng(seed); x = draw(r, (runs, n))
    return ((x.mean(1) - L) / x.std(1, ddof=1) >= k).mean()
for label, draw, sign in [("normal", lambda r, sh: r.normal(0, 1, sh), 0),
                          ("skewed toward the limit (skew -1)", lambda r, sh: -r.gamma(4.0, 1.0, sh), 1),
                          ("skewed away from the limit (skew +1)", lambda r, sh: r.gamma(4.0, 1.0, sh), 2)]:
    big = draw(np.random.default_rng(5), (2_000_000, 1)).ravel()
    for pp in (0.01, 0.08):
        L = np.quantile(big, pp)                         # the limit that puts exactly pp of the lot beyond it
        pa = pa_mc_dist(draw, L, n_u, k_mid)
        print(f"  {label:38s} true fraction beyond L = {pp:.0%}: Pa = {pa:.3f}" + ("  (normal theory: %.3f)" % pa_nct(n_u, k_mid, pp)))
    if sign == 1:
        pa_bad = pa_mc_dist(draw, np.quantile(big, 0.08), n_u, k_mid)
print("  -> a lot skewed toward the limit is accepted more often than the plan says at the LQ (the consumer's risk grows)")
check("skew toward the limit raises the chance of accepting an 8% lot above the 10% promised", pa_bad > 0.10 + 0.02)

print("\n# summary")
bad = [n for n, c in ok if not c]
print(f"{len(ok) - len(bad)} of {len(ok)} checks passed" + ("" if not bad else "; FAILED: " + ", ".join(bad)))
raise SystemExit(1 if bad else 0)
