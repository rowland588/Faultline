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
print('Stops for +-25% (Firm) and +-50% (Fair): the first n whose exact interval is that narrow')
def need(p,conf):
    return next(n for n in range(1,5000) if (garwood(n,conf)[1]-garwood(n,conf)[0])/2/n <= p)
for conf in (0.90, 0.95, 0.99):
    print(f'  conf {conf:.2f}  Firm at {need(0.25,conf)}  Fair at {need(0.5,conf)}')
print('  Case A at 95%: 66 stops at 6 per 120 min -> 66 / 0.05 = 1320 min watched in all, 1200 more')

# ---------------------------------------------------------------------------------------------------------------------------------
# Part 3 (5 November): the time watched in the science — the rate, one stretch's prediction, what no stops rule out, and clustering.
print()
print('PART 3 — the rate with its own interval (stops an hour), Garwood on the count over the time watched')
for (n, T) in ((6, 120.0), (17, 2000.0), (0, 120.0), (0, 480.0)):
    lo, hi = garwood(n, 0.95)
    print(f'  {n} stops in {T:g} min: {n*60/T:.4f} an hour, 95% {lo*60/T:.4f} to {hi*60/T:.4f}')
print('One stretch of H hours: a prediction for the stops in it — the posterior predictive of a Poisson count under the Jeffreys prior,')
print('negative binomial r = n + 1/2, p = T / (T + H); equal tails; scipy nbinom.ppf is the smallest m with cdf >= q')
from scipy.stats import nbinom, chi2
def predict(n, T, H, conf):
    r = n + 0.5; p = T / (T + H); a = (1 - conf) / 2
    return int(nbinom.ppf(a, r, p)), int(nbinom.ppf(1 - a, r, p))
for (n, T, H, c) in ((6, 120, 480, 0.95), (6, 120, 60, 0.95), (6, 120, 480, 0.90), (17, 2000, 60, 0.99), (0, 120, 480, 0.95), (0, 480, 480, 0.95), (62, 1200, 480, 0.95)):
    lo, hi = predict(n, T, H, c)
    print(f'  {n} stops in {T} min, carried {H/60:g} h at {int(c*100)}%: {lo} to {hi} stops')
print('Loss over one stretch = the stops in it x the sample\'s loss a stop: case A 429 kg / 6 stops = 71.5 kg a stop')
lo, hi = predict(6, 120, 480, 0.95); print(f'  8 h: {lo} to {hi} stops = {lo*71.5:.1f} to {hi*71.5:.1f} kg')
print('No stops seen: the exact two-sided upper bound on the count, over the time watched, then over the horizon')
for T in (120, 480):
    u = garwood(0, 0.95)[1]
    print(f'  0 stops in {T} min: rate <= {u*60/T:.4f} an hour; over 8 h <= {u*480/T:.3f} stops; to rule out one an hour needs {u:.4f} h watched = {u*60:.1f} min')
print('Clustering — the index of dispersion over k equal bins of watched time: D = sum (c - mean)^2 / mean, chi-square on k - 1 df')
def disp(counts):
    k = len(counts); m = sum(counts) / k; D = sum((c - m) ** 2 for c in counts) / m
    return k, D, chi2.sf(D, k - 1)
for counts in ([3, 3, 3, 3, 3, 3, 3, 3], [10, 0, 0, 0, 12, 0, 1, 1], [5, 4, 6, 5, 5, 4, 6, 5], [8, 0, 1, 0, 0, 7, 0, 0, 9, 0]):
    k, D, p = disp(counts)
    print(f'  {counts}: k {k}  D {D:.4f}  df {k-1}  p {p:.6f}  phi {D/(k-1):.4f}  inflate by sqrt(phi) {math.sqrt(D/(k-1)):.4f}')
print('Quasi-Poisson widening of the count interval about the count by sqrt(phi): case A n=6, phi=2.25 -> factor 1.5')
lo, hi = garwood(6, 0.95); f = 1.5
print(f'  lo {6-(6-lo)*f:.4f}  hi {6+(hi-6)*f:.4f}')
