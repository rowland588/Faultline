"""Independent cases for FC-134 — complaints per million units and their Pareto (knowledge/specs/FC-134-complaints.md).
Run: python3 scripts/knowledge/cases-complaints.py   (needs SciPy). The unit test and the calculator's examples are written from these
printed figures, never from the TypeScript's own output."""
import math
from scipy import stats

def cpmu(c, n):
    lo = 0.0 if c == 0 else stats.chi2.ppf(0.025, 2 * c) / 2 / n * 1e6
    hi = stats.chi2.ppf(0.975, 2 * c + 2) / 2 / n * 1e6
    one = stats.chi2.ppf(0.95, 2 * c + 2) / 2 / n * 1e6   # the one-sided upper bound (c = 0: 2.996 / N)
    return c / n * 1e6, lo, hi, one

def two_rates_p(c_before, n_before, c_now, n_now):
    """Conditional exact test: of c_before + c_now, the earlier share is Binomial(total, n_before/(n_before+n_now)); two-sided as 2 * the smaller tail, capped at 1."""
    t = c_before + c_now
    p = n_before / (n_before + n_now)
    return min(1.0, 2 * min(stats.binom.cdf(c_before, t, p), stats.binom.sf(c_before - 1, t, p)))

def u_limits(cbar_c, cbar_n, n):
    ub = cbar_c / cbar_n * 1e6
    s = 3 * math.sqrt(ub / (n / 1e6))
    return ub, max(0.0, ub - s), ub + s

print("# CPMU and its exact Poisson interval (95%)")
for c, n in [(7, 1_200_000), (12, 1_250_000), (3, 400_000), (0, 1_000_000), (20, 1_200_000), (1, 50_000), (5, 400_000)]:
    r = cpmu(c, n)
    print(f"  {c} on {n:,}: {r[0]:.4f} (95% {r[1]:.4f} to {r[2]:.4f}); one-sided upper 95% {r[3]:.4f}")

print("# the u-chart limits around the usual rate (106 complaints on 14.4 million units in the twelve months before)")
for n in (1_250_000, 1_200_000, 1_000_000, 400_000):
    ub, lo, hi = u_limits(106, 14_400_000, n)
    print(f"  usual {ub:.4f}; limits for {n:,} units: {lo:.4f} to {hi:.4f}")

print("# is this period different from the one before (exact, conditional on the total)")
print(f"  12 on 1.25 M against 7 on 1.2 M: p = {two_rates_p(7, 1_200_000, 12, 1_250_000):.4f}")
print(f"  30 on 1.2 M against 7 on 1.2 M: p = {two_rates_p(7, 1_200_000, 30, 1_200_000):.6f}")
print(f"  3 on 0.4 M against 7 on 1.2 M: p = {two_rates_p(7, 1_200_000, 3, 400_000):.4f}")
print(f"  20 on 1.2 M against 7 on 1.2 M: p = {two_rates_p(7, 1_200_000, 20, 1_200_000):.5f}")
print(f"  3 on 0.4 M against 30 on 1.2 M: p = {two_rates_p(30, 1_200_000, 3, 400_000):.5f}  (25.0 a million then, 7.5 now)")

print("# the Pareto of the twelve (foreign body 5, packaging or seal 3, taste 2, quantity 1, labelling 1)")
kinds = [("Foreign body", 5), ("Packaging or seal", 3), ("Taste, smell or condition", 2), ("Quantity or weight", 1), ("Labelling or date code", 1)]
tot = sum(c for _, c in kinds); cum = 0
for k, c in kinds:
    cum += c
    print(f"  {k}: {c}  {c/tot*100:.2f}%  cumulative {cum/tot*100:.2f}%  {c/1_250_000*1e6:.2f} a million")

print("# money at £85 a complaint (typed)")
print(f"  12 x 85 = {12*85}; a million units: {12/1_250_000*1e6*85:.2f}; a unit sold: {12*85/1_250_000*100:.5f}p")
