#!/usr/bin/env python3
"""INDEPENDENT CASES — numbers worked by a second implementation (SciPy), so
Faultline's arithmetic is never tested against its own output
(knowledge/STANDARD.md, step 4). Run once when a formula is added or changed;
the numbers it prints are pasted into the unit tests, with this script named
beside them.

    pip install scipy        # if missing
    python3 -I scripts/knowledge/independent-cases.py

Cases for FC-094 part 1 (knowledge/specs/FC-094-capability.md, section 6):
the normal quantile, binomial tail and Clopper-Pearson bounds, the
zero-failure (success-run) relation, the Anderson-Darling statistic, the
adjusted skewness, and a simulation of the coverage of Bissell's lower bound
on Ppk."""
import math
import numpy as np
from scipy import stats

print("# normal quantile, scipy.stats.norm.ppf")
for p in [1e-6, 0.001, 0.025, 0.05, 0.1, 0.5, 0.9, 0.975, 0.999, 0.99999]:
    print(f"  ppf({p}) = {stats.norm.ppf(p):.10f}")

print("\n# binomial P(X <= k), scipy.stats.binom.cdf")
for k, n, p in [(0, 20, 0.05), (1, 20, 0.05), (14, 1200, 0.01), (3, 50, 0.1), (250, 100000, 0.0025)]:
    print(f"  cdf({k}; {n}, {p}) = {stats.binom.cdf(k, n, p):.12f}")

print("\n# Clopper-Pearson, one-sided 95% upper bound = beta.ppf(0.95, f+1, n-f)")
for f, n in [(0, 20), (1, 20), (2, 50), (0, 299), (3, 10), (14, 1200), (0, 1), (19, 20)]:
    print(f"  upper(f={f}, n={n}) = {stats.beta.ppf(0.95, f + 1, n - f):.10f}")
print("\n# Clopper-Pearson, two-sided 95%: [beta.ppf(0.025, f, n-f+1), beta.ppf(0.975, f+1, n-f)]")
for f, n in [(14, 1200), (2, 50), (0, 20)]:
    lo = 0.0 if f == 0 else stats.beta.ppf(0.025, f, n - f + 1)
    hi = stats.beta.ppf(0.975, f + 1, n - f)
    print(f"  ({f}/{n}) = [{lo:.10f}, {hi:.10f}]")

print("\n# zero failures: 1 - 0.05**(1/n), and n to show p0 = ceil(ln 0.05 / ln(1 - p0))")
for n in [20, 29, 59, 299]:
    print(f"  upper(0 of {n}) = {1 - 0.05 ** (1 / n):.10f}")
for p0 in [0.10, 0.05, 0.01, 0.001]:
    print(f"  n for {p0} = {math.ceil(math.log(0.05) / math.log(1 - p0))}")

THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
          401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8]
# residual oxygen %, leaning high (a long upper tail, bounded at zero) — fixed numbers
OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38,
          0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8]
# seal strength N/15 mm, near-normal — fixed numbers
SEAL = [14.2, 13.8, 15.1, 14.6, 13.9, 14.4, 15.3, 14.0, 14.8, 14.1, 13.6, 14.9, 14.5, 14.3, 15.0,
        13.7, 14.6, 14.2, 14.7, 14.4, 13.9, 15.2, 14.1, 14.8, 14.3, 14.0, 14.6, 14.5, 13.8, 14.9]

print("\n# Anderson-Darling A^2 (normal, mean and s estimated, ddof=1), scipy.stats.anderson")
for name, xs in [("THIRTY", THIRTY), ("OXYGEN", OXYGEN), ("SEAL", SEAL)]:
    r = stats.anderson(np.array(xs), dist="norm")
    n = len(xs)
    a2 = r.statistic
    print(f"  {name}: A2 = {a2:.10f}  A*2 = {a2 * (1 + 0.75 / n + 2.25 / n ** 2):.10f}")

print("\n# adjusted sample skewness G1, scipy.stats.skew(bias=False)")
for name, xs in [("THIRTY", THIRTY), ("OXYGEN", OXYGEN), ("SEAL", SEAL)]:
    print(f"  {name}: G1 = {stats.skew(np.array(xs), bias=False):.10f}")

print("\n# Bissell's 95% lower bound on Ppk: coverage by simulation (should be near 0.95)")
rng = np.random.default_rng(22102026)
for n in [30, 50, 100]:
    for true_ppk in [1.0, 1.33]:
        mu, sigma, usl = 0.0, 1.0, 3 * true_ppk
        covered = 0
        trials = 20000
        for _ in range(trials):
            x = rng.normal(mu, sigma, n)
            m, s = x.mean(), x.std(ddof=1)
            ppk = (usl - m) / (3 * s)
            lb = ppk - 1.6449 * math.sqrt(1 / (9 * n) + ppk ** 2 / (2 * (n - 1)))
            covered += lb <= true_ppk
        print(f"  n={n} true Ppk {true_ppk}: covered {covered / trials:.3f}")

print("\n# Bissell's lower bound itself, z = norm.ppf(0.95)")
z = stats.norm.ppf(0.95)
for ppk, n in [(1.33, 30), (1.0, 100), (1.67, 50)]:
    print(f"  Ppk {ppk} from {n}: {ppk - z * math.sqrt(1 / (9 * n) + ppk ** 2 / (2 * (n - 1))):.10f}")

print("\n# individuals limits on 10, 12, 11, 13, 12: x-bar +/- 2.66 MR-bar")
xs = [10, 12, 11, 13, 12]
m, mr = sum(xs) / len(xs), sum(abs(xs[i] - xs[i - 1]) for i in range(1, len(xs))) / (len(xs) - 1)
print(f"  centre {m}, MR-bar {mr}, limits {m - 2.66 * mr:.4f} to {m + 2.66 * mr:.4f}")

# ---- the capability study's own cases (src/lib/ie/__tests__/sample.test.ts)
def ad_p(a2, n):
    """D'Agostino & Stephens (1986), the four pieces, on A*2."""
    A = a2 * (1 + 0.75 / n + 2.25 / n ** 2)
    if A >= 0.6: return math.exp(1.2937 - 5.709 * A + 0.0186 * A * A)
    if A >= 0.34: return math.exp(0.9177 - 4.279 * A - 1.38 * A * A)
    if A >= 0.2: return 1 - math.exp(-8.318 + 42.796 * A - 59.938 * A * A)
    return 1 - math.exp(-13.436 + 101.14 * A - 223.73 * A * A)

def ichart(xs):
    m = sum(xs) / len(xs)
    mr = sum(abs(xs[i] - xs[i - 1]) for i in range(1, len(xs))) / (len(xs) - 1)
    return m, m - 2.66 * mr, m + 2.66 * mr

def first_run(xs, c, length=8):
    side, start = 0, 0
    for i in range(len(xs) + 1):
        s = (1 if xs[i] > c else -1 if xs[i] < c else 0) if i < len(xs) else 0
        if s != side or s == 0:
            if side and i - start >= length: return (start + 1, i, i - start, 'above' if side > 0 else 'below')
            start, side = i, s
    return None

def bissell(ppk, n): return ppk - stats.norm.ppf(0.95) * math.sqrt(1 / (9 * n) + ppk ** 2 / (2 * (n - 1)))

print("\n# the checks before capability, and how sure a Ppk is")
for name, xs, lo, hi in [("THIRTY 400-404", THIRTY, 400, 404), ("THIRTY 398-406", THIRTY, 398, 406),
                         ("OXYGEN at most 2", OXYGEN, None, 2.0), ("SEAL at least 12", SEAL, 12.0, None)]:
    n = len(xs); m = float(np.mean(xs)); s = float(np.std(xs, ddof=1))
    ppk = min((m - lo) / (3 * s) if lo is not None else math.inf, (hi - m) / (3 * s) if hi is not None else math.inf)
    a2 = stats.anderson(np.array(xs), dist="norm").statistic
    c, lcl, ucl = ichart(xs)
    beyond = [i + 1 for i, x in enumerate(xs) if x > ucl or x < lcl]
    print(f"  {name}: mean {m:.6f} s {s:.6f} Ppk {ppk:.6f} bound {bissell(ppk, n):.6f}  AD p {ad_p(a2, n):.6f} "
          f"skew {stats.skew(np.array(xs), bias=False):.4f}  limits {lcl:.4f}-{ucl:.4f} beyond {beyond} "
          f"run {first_run(xs, m)} distinct {len(set(xs))}")

ramp = [round(400 + i * 0.1, 1) for i in range(30)]
c, lcl, ucl = ichart(ramp)
print(f"  RAMP 400.0..402.9: limits {lcl:.4f}-{ucl:.4f} beyond {sum(1 for x in ramp if x > ucl or x < lcl)} run {first_run(ramp, c)}")

print("\n# pass or fail with one allowed: smallest n with beta.ppf(0.95, 2, n-1) <= 0.01")
n = 2
while stats.beta.ppf(0.95, 2, n - 1) > 0.01: n += 1
print(f"  n = {n}")
print(f"  upper(1 of 20) = {stats.beta.ppf(0.95, 2, 19):.6f}; upper(0 of 8) = {1 - 0.05 ** (1 / 8):.6f}")

# ---- the shape check: why D'Agostino-Pearson K2, not Anderson-Darling (22 October)
# Readings on the floor are often whole numbers (packs a minute, counts). EDF
# tests such as Anderson-Darling are thrown by the ties rounding makes: on
# truly normal readings rounded to whole numbers with a spread of 1-2 steps,
# AD rejected 32-100% at the 5% level (3,000 samples a case); the moment-based
# K2 test (scipy.stats.normaltest) kept 5-8%, with power close to AD's.
print("\n# D'Agostino-Pearson K2 (scipy.stats.normaltest) — skewtest Z, kurtosistest Z, K2, p")
SPEED = [80, 81, 79, 80, 82, 78, 80, 81, 79, 80, 81, 80, 79, 82, 80, 78, 81, 80, 79, 81, 80, 83, 79, 80, 81, 80, 79, 77, 80, 81]
RAMP = [round(400 + i * 0.1, 1) for i in range(30)]
TWO = [403 if i % 2 else 401 for i in range(30)]
for name, xs in [("THIRTY", THIRTY), ("OXYGEN", OXYGEN), ("SEAL", SEAL), ("SPEED", SPEED), ("RAMP", RAMP), ("TWO", TWO)]:
    x = np.array(xs, dtype=float)
    zs, zk = stats.skewtest(x).statistic, stats.kurtosistest(x).statistic
    r = stats.normaltest(x)
    print(f"  {name}: Zskew {zs:.10f}  Zkurt {zk:.10f}  K2 {r.statistic:.10f}  p {r.pvalue:.10f}")

rng = np.random.default_rng(22102026)
print("\n# false alarms at 5% on normal readings rounded to whole numbers (3,000 samples): K2")
for n in [20, 30, 100]:
    out = []
    for s in [0.8, 1.0, 2.0, 5.0]:
        k, m = 0, 0
        for _ in range(3000):
            x = np.round(rng.normal(80, s, n))
            if np.std(x) == 0: continue
            m += 1; k += stats.normaltest(x).pvalue < 0.05
        out.append(f"s {s}: {k / m:.3f}")
    print(f"  n={n}: " + ", ".join(out))

# --- pass or fail, judged by a confidence level or an allowed loss (FC-100, 23 October) ---
print("\n# the most that may fail and still show at least (1 - p0) good at confidence C:")
print("#   largest k with beta.ppf(C, k+1, n-k) <= p0; -1 when even none failing cannot show it")
def most_may_fail(n, p0, c):
    k = -1
    while k + 1 < n and stats.beta.ppf(c, k + 2, n - k - 1) <= p0:
        k += 1
    return k
for n, p0, c in [(4500, 0.02, 0.95), (4500, 0.02, 0.90), (4500, 0.02, 0.99), (300, 0.02, 0.95), (20, 0.02, 0.95),
                 (149, 0.02, 0.95), (148, 0.02, 0.95), (1000, 0.01, 0.95), (50, 0.10, 0.90), (500, 0.05, 0.99)]:
    print(f"  most({n}, {p0}, {c}) = {most_may_fail(n, p0, c)}")
print("\n# zero failures at 90% and 99%: 1 - (1 - C)**(1/n)")
for n in [20, 59, 300]:
    print(f"  n={n}: 90% {1 - 0.10 ** (1 / n):.6f}  99% {1 - 0.01 ** (1 / n):.6f}")
print("\n# items to show p0 = 2% with none failing: ceil(ln(1 - C) / ln(0.98))")
for c in [0.90, 0.95, 0.99]:
    print(f"  C={c}: {math.ceil(math.log(1 - c) / math.log(0.98))}")
print("\n# an allowed loss: at least 98% good of 4,500 -> floor(0.02 * 4500) = 90 may fail; what 90 failing proves")
for c in [0.90, 0.95, 0.99]:
    print(f"  upper(90 of 4500, C={c}) = {stats.beta.ppf(c, 91, 4410):.8f}")
print(f"  upper(70 of 4500, C=0.95) = {stats.beta.ppf(0.95, 71, 4430):.8f}")
print(f"  upper(2 of 50, C=0.90) = {stats.beta.ppf(0.90, 3, 48):.8f}; upper(2 of 50, C=0.99) = {stats.beta.ppf(0.99, 3, 48):.8f}")

# --- money in the capability study (knowledge/specs/FC-156-capability-money.md, 24 October) ---
print("\n# give-away: (mean - nominal) x packs x GBP a kg; the record's own case")
def giveaway(mean, nominal, packs, shifts_week, gbp_kg, unit='g'):
    g = max(0.0, mean - nominal); kg = g / 1000 if unit == 'g' else g
    shift_kg = kg * packs; return g, shift_kg, shift_kg * gbp_kg, shift_kg * shifts_week, shift_kg * shifts_week * gbp_kg
print("  404.1 on 400, 10000 a shift, 5 a week, GBP 18/kg ->", giveaway(404.1, 400, 10000, 5, 18))
print("  399.6 on 400 ->", giveaway(399.6, 400, 10000, 5, 18))
print("\n# rejects by fate: the sample's share scaled to the packs a shift, each fate at its own cost")
def rejects(n, waste, rework, recovered, packs, m, r, shifts_week):
    pw, pr, ph = packs * waste / n, packs * rework / n, packs * recovered / n
    return dict(failed=packs * (waste + rework + recovered) / n, waste=pw, waste_gbp=pw * m, rework=pr, rework_gbp=pr * r, recovered=ph, shift_gbp=pw * m + pr * r, week_gbp=(pw * m + pr * r) * shifts_week)
print("  20 checked, 1 waste + 1 reworked, 10000 a shift, M 0.25, R 0.12, 5 a week ->", rejects(20, 1, 1, 0, 10000, 0.25, 0.12, 5))
print("  20 checked, 1 recovered ->", rejects(20, 0, 0, 1, 10000, 0.25, 0.12, 5))

# --- money on the value stream (knowledge/specs/FC-001-value-stream-money.md, 24 October) ---
print("\n# labour on waste work a day: sum(cycle/batch x people) x demand x rate/3600; the seeded line map, GBP 15 x 1.3")
steps = [(900, 9600, 2), (90, 500, 2), (600, 4800, 2), (60, 120, 1)]
pp = sum(c / b * p for c, b, p in steps); sec = pp * 9600
print(f"  person-s a piece {pp:.4f}; a day {sec:.0f} s = {sec/3600:.2f} h; GBP {sec/3600*19.5:.2f}")
print("\n# waiting product: Little's law pieces = demand x wait/available; tied up x cost a piece; carried x rate/365")
qa = 9600 * (6 * 3600) / (16 * 3600); film = 9600 * (4 * 3600) / (16 * 3600)
print(f"  QA hold {qa:.0f} pieces, GBP {qa*0.8:.0f}; film wait {film:.0f}, GBP {film*0.8:.0f}; tied up {(qa+film)*0.8:.0f}; carry a day at 25% {(qa+film)*0.8*0.25/365:.2f}")
print(f"  counted queue 19200 x 0.8 = {19200*0.8:.0f}")

# --- money on the line standard (knowledge/specs/FC-006-line-standard-money.md, 24 October) ---
print("\n# the people placed x one's rate (wage x on-costs) = GBP an hour; over the packs an hour = a pack")
def placed(n, wage=14.5, burden=1.3, per_min=100):
    h = n * wage * burden; return h, h / (per_min * 60) * 100  # GBP an hour, pence a pack
print("  1 person, 14.50 x 1.3, 100 a minute ->", placed(1))
print("  12 people ->", placed(12))
print("  4 people, Line capacity 120 cases a minute ->", placed(4, per_min=120))
print("  6 people typed on Line capacity at GBP 20, 120 a minute ->", placed(6, wage=20, burden=1, per_min=120))
