"""FC-241 part 2 — carrying a sample of stops forward, and how sure that is (knowledge/specs/FC-241-workstation-stops.md Part 2).
Independent of the app: exact (Garwood) two-sided Poisson bounds from SciPy's chi-square quantiles, and the stops needed for a given precision.
  python3 scripts/knowledge/cases-stops-extrapolation.py"""
from scipy.stats import chi2, norm
import math

def garwood(n, conf):
    a = (1 - conf) / 2
    lo = 0.0 if n == 0 else chi2.ppf(a, 2 * n) / 2
    hi = chi2.ppf(1 - a, 2 * n + 2) / 2
    return lo, hi

print('Garwood bounds on a count n, two-sided')
for conf in (0.90, 0.95, 0.99):
    for n in (0, 6, 12, 62):
        lo, hi = garwood(n, conf)
        print(f'  conf {conf:.2f}  n {n:>2}  lower {lo:.4f}  upper {hi:.4f}')

print('Case A: four workstations watched 120 min, 6 stops, 35.75 min stopped, 12 kg a minute lost -> 429 kg in the sample')
L, N, T = 429.0, 6, 120.0
lo, hi = garwood(N, 0.95)
for H in (1, 8):
    f = H * 60 / T
    print(f'  {H} h: factor {f}  point {L*f:.2f} kg  lower {L*f*lo/N:.1f}  upper {L*f*hi/N:.1f}  half-width {(hi-lo)/2/N:.4f} of the count')
print('Stops for +-25% at conf: n = (z/0.25)^2, rounded up')
for conf in (0.90, 0.95, 0.99):
    z = norm.ppf((1 + conf) / 2)
    print(f'  conf {conf:.2f}  z {z:.4f}  n {math.ceil((z/0.25)**2)}')
print('  Case A at 95%: 62 stops at 6 per 120 min -> 62 / 0.05 = 1240 min watched in all, 1120 more')
