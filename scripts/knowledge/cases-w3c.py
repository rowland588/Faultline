#!/usr/bin/env python3
"""INDEPENDENT CASES — W3c: fitting a distribution (FC-114), capability of readings that are not bell-shaped (FC-096),
the gauge studies (FC-119, FC-120), the learning curve (FC-027), the stack-up of deposits (FC-116).
Every number a unit test or an acceptance script quotes is printed here by SciPy / NumPy, never by Faultline's code.
Run:  python3 -I scripts/knowledge/cases-w3c.py            (prints every case; --json prints the same as one JSON object)
Written 25 October 2026 (builder F3). SciPy 1.17 — scipy.stats.anderson with method='interpolate' (Stephens' tables)."""
import json, math, sys, warnings
import numpy as np
from scipy import stats, optimize

warnings.simplefilter("ignore")
OUT = {}
def say(k, v):
    OUT[k] = v
    if "--json" not in sys.argv:
        print(f"{k}: {json.dumps(v)}")

# ------------------------------------------------------------------ the sets
OXYGEN = np.array([0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38,
                   0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8])
# minutes between short stops on a wrapper: a Weibull(shape 1.6, scale 40) sample, seed 12, to 0.1 min
STOPS = np.round(stats.weibull_min.rvs(1.6, scale=40, size=40, random_state=np.random.default_rng(12)), 1)
# fill weights from a steady filler: normal(250.0, 1.2), seed 5, to 0.1 g
FILLS = np.round(np.random.default_rng(5).normal(250.0, 1.2, 40), 1)
say("sets", {"OXYGEN": OXYGEN.tolist(), "STOPS": STOPS.tolist(), "FILLS": FILLS.tolist()})

# ------------------------------------------------------------------ the fits
def fit_all(x):
    n = len(x); r = {"n": n}
    # normal: the sample mean and spread (n-1), as the capability study uses; the likelihood at the maximum (1/n)
    m, s = x.mean(), x.std(ddof=1); s_ml = x.std(ddof=0)
    ll = float(stats.norm.logpdf(x, m, s_ml).sum())
    r["normal"] = {"mu": m, "sigma": s, "ll": ll, "aic": 4 - 2 * ll}
    if (x > 0).all():
        lx = np.log(x); mu, sg = lx.mean(), lx.std(ddof=1); sg_ml = lx.std(ddof=0)
        ll = float(stats.norm.logpdf(lx, mu, sg_ml).sum() - lx.sum())
        r["lognormal"] = {"mu": mu, "sigma": sg, "ll": ll, "aic": 4 - 2 * ll}
        # the Weibull shape by the root of the likelihood equation, found to 1e-14 (scipy's own .fit stops near 1e-5 short of it:
        # on the oxygen set it gives 1.620614 where the root is 1.620601, and its log-likelihood is the lower of the two)
        y = x / x.max(); lg = np.log(y)
        c = optimize.brentq(lambda b: ((y ** b) * lg).sum() / (y ** b).sum() - 1 / b - lg.mean(), 0.02, 4000, xtol=1e-14)
        sc = float(x.max() * (y ** c).mean() ** (1 / c))
        ll = float(stats.weibull_min.logpdf(x, c, 0, sc).sum())
        r["weibull"] = {"beta": c, "eta": sc, "ll": ll, "aic": 4 - 2 * ll}
        mean = x.mean(); ll = float(stats.expon.logpdf(x, 0, mean).sum())
        r["exponential"] = {"mean": mean, "ll": ll, "aic": 2 - 2 * ll}
    return r

def cdfs(r):
    return {
        "normal": lambda v: stats.norm.cdf(v, r["normal"]["mu"], r["normal"]["sigma"]),
        "lognormal": lambda v: stats.norm.cdf(np.log(v), r["lognormal"]["mu"], r["lognormal"]["sigma"]),
        "weibull": lambda v: stats.weibull_min.cdf(v, r["weibull"]["beta"], 0, r["weibull"]["eta"]),
        "exponential": lambda v: stats.expon.cdf(v, 0, r["exponential"]["mean"]),
    }
def ppfs(r):
    return {
        "normal": lambda p: stats.norm.ppf(p, r["normal"]["mu"], r["normal"]["sigma"]),
        "lognormal": lambda p: math.exp(stats.norm.ppf(p, r["lognormal"]["mu"], r["lognormal"]["sigma"])),
        "weibull": lambda p: stats.weibull_min.ppf(p, r["weibull"]["beta"], 0, r["weibull"]["eta"]),
        "exponential": lambda p: stats.expon.ppf(p, 0, r["exponential"]["mean"]),
    }

def d_agostino_p(A):  # D'Agostino & Stephens (1986) p for the normal with both estimated, A* = A2 (1 + .75/n + 2.25/n^2)
    if A >= 0.6: return math.exp(1.2937 - 5.709 * A + 0.0186 * A * A)
    if A >= 0.34: return math.exp(0.9177 - 4.279 * A - 1.38 * A * A)
    if A >= 0.2: return 1 - math.exp(-8.318 + 42.796 * A - 59.938 * A * A)
    return 1 - math.exp(-13.436 + 101.14 * A - 223.73 * A * A)

def ad(x, r):
    n = len(x); out = {}
    res = stats.anderson(x, "norm", method="interpolate"); a2 = float(res.statistic)
    out["normal"] = {"a2": a2, "astar": a2 * (1 + 0.75 / n + 2.25 / n ** 2), "p": d_agostino_p(a2 * (1 + 0.75 / n + 2.25 / n ** 2)), "p_scipy": float(res.pvalue)}
    if "lognormal" in r:
        res = stats.anderson(np.log(x), "norm", method="interpolate"); a2 = float(res.statistic)
        A = a2 * (1 + 0.75 / n + 2.25 / n ** 2)
        out["lognormal"] = {"a2": a2, "astar": A, "p": d_agostino_p(A), "p_scipy": float(res.pvalue)}
        # Weibull (two-parameter) = Gumbel-minimum on ln x, both estimated (Stephens 1977): A* = A2 (1 + 0.2 / sqrt n)
        res = stats.anderson(np.log(x), "gumbel_l", method="interpolate"); a2 = float(res.statistic)
        out["weibull"] = {"a2": a2, "astar": a2 * (1 + 0.2 / math.sqrt(n)), "p_scipy": float(res.pvalue)}
        res = stats.anderson(x, "expon", method="interpolate"); a2 = float(res.statistic)
        out["exponential"] = {"a2": a2, "astar": a2 * (1 + 0.6 / n), "p_scipy": float(res.pvalue)}
    return out

limits = {"OXYGEN": (None, 2.0), "STOPS": (10.0, None), "FILLS": (247.0, 253.0)}
for name, x in [("OXYGEN", OXYGEN), ("STOPS", STOPS), ("FILLS", FILLS)]:
    r = fit_all(x); a = ad(x, r)
    c, p = cdfs(r), ppfs(r)
    lo, hi = limits[name]
    block = {"fits": r, "ad": a, "percentiles": {}, "beyond": {}, "ppk": {}, "empirical": {"n": len(x), "below": int((x < lo).sum()) if lo is not None else 0, "above": int((x > hi).sum()) if hi is not None else 0}}
    for k in c:
        block["percentiles"][k] = {"p00135": p[k](0.00135), "p50": p[k](0.5), "p99865": p[k](0.99865)}
        below = c[k](lo) if lo is not None else 0.0
        above = 1 - c[k](hi) if hi is not None else 0.0
        block["beyond"][k] = {"below": below, "above": above}
        q = block["percentiles"][k]
        ppu = (hi - q["p50"]) / (q["p99865"] - q["p50"]) if hi is not None else None
        ppl = (q["p50"] - lo) / (q["p50"] - q["p00135"]) if lo is not None else None
        block["ppk"][k] = {"ppu": ppu, "ppl": ppl, "ppk": min(v for v in (ppu, ppl) if v is not None)}
    # probability plot positions (Hazen) for the lognormal / normal: the model's quantile at (i - .5) / n
    n = len(x); pp = [(i + 0.5) / n for i in range(n)]
    block["plot"] = {k: [p[k](q) for q in pp[:3]] + [p[k](pp[-1])] for k in c}
    say(name, block)

# ------------------------------------------------------------------ the gauge (FC-119, FC-120)
# a bench scale, 50 readings of a 500.0 g reference, tolerance 10 g (495-505) — the record's worked case, seed 31
rng = np.random.default_rng(31)
G1 = np.round(500.0 + 0.12 + 0.08 * rng.standard_normal(50), 2)
T, ref = 10.0, 500.0
m, s = G1.mean(), G1.std(ddof=1); n = len(G1); tcrit = stats.t.ppf(0.975, n - 1)
t1 = {"x": G1.tolist(), "mean": m, "s": s, "bias": m - ref, "cg": 0.2 * T / (6 * s), "cgk": (0.1 * T - abs(m - ref)) / (3 * s),
      "share6s": 6 * s / T, "t": (m - ref) / (s / math.sqrt(n)), "tcrit": tcrit, "p": 2 * stats.t.sf(abs((m - ref) / (s / math.sqrt(n))), n - 1),
      "biasLo": m - ref - tcrit * s / math.sqrt(n), "biasHi": m - ref + tcrit * s / math.sqrt(n)}
# the same scale but worn: a larger spread and a bias, to fail
rng = np.random.default_rng(32)
G2 = np.round(500.0 + 0.9 + 1.1 * rng.standard_normal(30), 1)
m2, s2 = G2.mean(), G2.std(ddof=1)
t2 = {"x": G2.tolist(), "mean": m2, "s": s2, "bias": m2 - ref, "cg": 0.2 * T / (6 * s2), "cgk": (0.1 * T - abs(m2 - ref)) / (3 * s2), "share6s": 6 * s2 / T,
      "p": 2 * stats.t.sf(abs((m2 - ref) / (s2 / math.sqrt(30))), 29)}
say("type1_good", t1); say("type1_worn", t2)
# a one-sided limit: tolerance read as twice the distance from the target to the limit (the record)
# bias and linearity — a probe thermometer at five references, 10 readings each (the record's case, seed 61)
refs = np.array([0.0, 20.0, 40.0, 60.0, 80.0]); rng = np.random.default_rng(61)
bias_true = -0.15 + 0.004 * refs
reads = {float(r): np.round(r + b + 0.12 * rng.standard_normal(10), 2) for r, b in zip(refs, bias_true)}
per = []
for r, v in reads.items():
    mm, ss = v.mean(), v.std(ddof=1); tt = (mm - r) / (ss / math.sqrt(10)); per.append({"ref": r, "n": 10, "mean": mm, "s": ss, "bias": mm - r, "t": tt, "p": 2 * stats.t.sf(abs(tt), 9), "real": bool(abs(tt) > stats.t.ppf(0.975, 9))})
biases = np.array([p["bias"] for p in per]); lr = stats.linregress(refs, biases)
tc3 = stats.t.ppf(0.975, 3)
lin = {"reads": {str(k): v.tolist() for k, v in reads.items()}, "per": per, "intercept": lr.intercept, "slope": lr.slope, "p": lr.pvalue, "r2": lr.rvalue ** 2,
       "slopeLo": lr.slope - tc3 * lr.stderr, "slopeHi": lr.slope + tc3 * lr.stderr, "at75": lr.intercept + lr.slope * 75, "true75": 75 - (lr.intercept + lr.slope * 75)}
# the AIAG form: every reading's bias against its reference (50 points), slope p
allx = np.repeat(refs, 10); ally = np.concatenate([reads[float(r)] - r for r in refs]); lr2 = stats.linregress(allx, ally)
lin["all"] = {"n": 50, "intercept": lr2.intercept, "slope": lr2.slope, "p": lr2.pvalue, "r2": lr2.rvalue ** 2, "se": lr2.stderr}
say("linearity", lin)
# stability — 25 daily checks of the 60 C reference, XmR from the first 18 (seed 71), the last 7 drifted up 0.3
rng = np.random.default_rng(71); daily = np.round(60 + 0.09 + 0.1 * rng.standard_normal(25), 2); daily[18:] += 0.3
mr = float(np.mean(np.abs(np.diff(daily[:18])))); c0 = float(daily[:18].mean())
say("stability", {"x": daily.tolist(), "centre": c0, "mrBar": mr, "lcl": c0 - 2.66 * mr, "ucl": c0 + 2.66 * mr,
                   "beyond": [int(i + 1) for i, v in enumerate(daily) if v > c0 + 2.66 * mr or v < c0 - 2.66 * mr],
                   "kendall_tau": float(stats.kendalltau(np.arange(25), daily, method="asymptotic").statistic), "kendall_p": float(stats.kendalltau(np.arange(25), daily, method="asymptotic").pvalue),
                   "sen_slope": float(stats.theilslopes(daily, np.arange(25))[0])})

# ------------------------------------------------------------------ the learning curve (FC-027)
# Wright's unit-time form on the record's eight runs (ie.learning-curve): 68, 58, 53, 49, 47, 45, 44, 43 s; the standard 40 s
T8 = np.array([68, 58, 53, 49, 47, 45, 44, 43], dtype=float); n8 = np.arange(1, 9, dtype=float)
lw = stats.linregress(np.log(n8), np.log(T8)); b8 = lw.slope; t1 = math.exp(lw.intercept); tc6 = stats.t.ppf(0.975, 6)
nstar = (40.0 / t1) ** (1 / b8)
P12 = np.array([68, 58, 53, 49, 47, 46, 46, 46, 46, 46, 46, 46], dtype=float); n12 = np.arange(1, 13, dtype=float)
lp = stats.linregress(np.log(n12), np.log(P12))
say("learning", {"runs": T8.tolist(), "b": b8, "t1": t1, "rate": 2 ** b8, "r2": lw.rvalue ** 2, "bse": lw.stderr, "bLo": b8 - tc6 * lw.stderr, "bHi": b8 + tc6 * lw.stderr,
                  "rateLo": 2 ** (b8 - tc6 * lw.stderr), "rateHi": 2 ** (b8 + tc6 * lw.stderr), "at11": t1 * 11 ** b8, "at16": t1 * 16 ** b8, "at32": t1 * 32 ** b8,
                  "nstar_raw": nstar, "nstar": math.ceil(nstar), "cumAvg": float(T8.mean()), "last4_slope": float(stats.linregress(np.log(n8[-4:]), np.log(T8[-4:])).slope),
                  "extra_seconds_to_nstar": sum(max(0.0, t1 * k ** b8 - 40.0) for k in range(1, math.ceil(nstar) + 1)),
                  "plateau": {"runs": P12.tolist(), "b": lp.slope, "r2": lp.rvalue ** 2, "last4_slope": float(stats.linregress(np.log(n12[-4:]), np.log(P12[-4:])).slope)}})

# ------------------------------------------------------------------ the stack-up (FC-116)
# the record's ready meal (stats.tolerance-stackup): four deposits, independent; and what the packers' three rules need of the pack at that spread
def three_rules(nominal, sd, tne):
    r1 = nominal; r2 = nominal - tne + stats.norm.ppf(0.975) * sd; r3 = nominal - 2 * tne + stats.norm.ppf(0.9999) * sd
    return {"rule1": r1, "rule2": r2, "rule3": r3, "lowest": max(r1, r2, r3)}
dep = [("Rice", 120.0, 3.0), ("Sauce", 80.0, 2.5), ("Vegetables", 60.0, 2.0), ("Garnish", 40.0, 1.5)]
mu = sum(d[1] for d in dep); var = sum(d[2] ** 2 for d in dep); sg = math.sqrt(var)
shares = [d[2] ** 2 / var for d in dep]
halved_var = var - dep[0][2] ** 2 + (dep[0][2] / 2) ** 2; sg2 = math.sqrt(halved_var)
tne300 = 9.0  # 300 g sits in the 200-300 band: 9 g (Schedule 3, as sample.ts tneFor holds it; the Schedule not read from here)
before, after = three_rules(300.0, sg, tne300), three_rules(300.0, sg2, tne300)
say("stackup", {"deposits": dep, "mean": mu, "sd": sg, "worstCase3sigma": sum(3 * d[2] for d in dep), "rss3sigma": 3 * sg, "shares": shares, "halvedSd": sg2,
                 "before": before, "after": after, "saved": before["lowest"] - after["lowest"],
                 "record_generic_1in1000_target_for_290": 290 + stats.norm.ppf(0.999) * sg, "record_share_under_290_at_300": float(stats.norm.cdf((290 - 300) / sg)),
                 "pounds_a_shift_at_5000_packs_and_18_a_kg": (before["lowest"] - after["lowest"]) / 1000 * 5000 * 18,
                 "floor290": {"before": 290 + stats.norm.ppf(0.999) * sg, "after": 290 + stats.norm.ppf(0.999) * sg2, "saved": stats.norm.ppf(0.999) * (sg - sg2), "kg_shift_5000": stats.norm.ppf(0.999) * (sg - sg2) * 5, "gbp_shift_5000_18": stats.norm.ppf(0.999) * (sg - sg2) * 5 * 18, "gbp_week_x10": stats.norm.ppf(0.999) * (sg - sg2) * 5 * 18 * 10}})

if "--json" in sys.argv:
    print(json.dumps(OUT))
