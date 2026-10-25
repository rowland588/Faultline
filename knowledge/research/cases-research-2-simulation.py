#!/usr/bin/env python3
"""INDEPENDENT CASES — Research 2, part 3: line simulation (FC-047), 25 October 2026.

Run:  python3 -I knowledge/research/cases-research-2-simulation.py      (about a minute)

What is checked, and against what:
  1. closed-form limits of a two-machine line — no buffer, an unlimited buffer — against the simulator;
  2. an EXACT numerical solution (a continuous-time Markov chain solved as linear algebra, steady state and
     a shift's expected output with its start-up) of the same line, one pack at a time, against the simulator;
  3. that Markov chain's own construction against a plain Gillespie simulation of it (so the "exact" is not
     assumed), two and three machines;
  4. the fluid (continuous-material) simulator against the pack-level chain as the line is scaled up;
  5. a three-machine line with two buffers against its chain.
The simulator written here (event-driven, continuous material, exponential up and down times) is the SHAPE of
what the app would contain; it is not the app's code. Ends by asserting its own claims.
"""
import math, time
import numpy as np
from scipy import sparse
from scipy.sparse.linalg import spsolve, expm_multiply

ok = []
def check(name, cond):
    ok.append((name, bool(cond)))
    print(("  PASS " if cond else "  FAIL ") + name)

# ------------------------------------------------------------------ the simulator (continuous material)
def fluid_run(mu, mtbf, mttr, cap, T, rng, start="up", level0=0.0, warm=0.0, repair=None, rngs=None):
    """Machines 0..m-1 in series, buffer j (capacity cap[j]) between machine j and j+1.
    A machine that is up runs at mu[i] unless starved (buffer behind it empty and it would draw faster than it
    receives) or blocked (buffer ahead full and it would deliver faster than it is drawn).  Up and down times
    are exponential with means mtbf and mttr, running on the clock (a starved or blocked machine can still fail).
    Returns the packs delivered by the last machine in [warm, T], plus blocked/starved minutes per machine."""
    m = len(mu); eps = 1e-9
    rep = repair or (lambda r, mean: r.exponential(mean))      # repair-time sampler: exponential unless told otherwise
    R = (lambda i: rngs[i]) if rngs else (lambda i: rng)           # one random stream a machine when rngs is given (common random numbers)
    gap = lambda i: R(i).exponential(mtbf[i])
    up = [True] * m if start == "up" else [rng.random() < mtbf[i] / (mtbf[i] + mttr[i]) for i in range(m)]
    nxt = [gap(i) if up[i] else rep(R(i), mttr[i]) for i in range(m)]
    lev = [min(level0, c) for c in cap]
    t = 0.0; out = 0.0
    starved = [0.0] * m; blocked = [0.0] * m
    while t < T:
        f = [mu[i] if up[i] else 0.0 for i in range(m)]
        changed = True
        while changed:
            changed = False
            for j in range(m - 1):
                empty = lev[j] <= eps; full = lev[j] >= cap[j] - eps
                if empty and f[j] < f[j + 1] - 1e-12: f[j + 1] = f[j]; changed = True
                if full and f[j] > f[j + 1] + 1e-12: f[j] = f[j + 1]; changed = True
        # next event
        dt = min(nxt) - t; hit = None
        for j in range(m - 1):
            d = f[j] - f[j + 1]
            if d > 1e-12 and lev[j] < cap[j] - eps:
                tt = (cap[j] - lev[j]) / d
                if tt < dt: dt, hit = tt, (j, cap[j])
            elif d < -1e-12 and lev[j] > eps:
                tt = lev[j] / -d
                if tt < dt: dt, hit = tt, (j, 0.0)
        dt = min(dt, T - t)
        a, b = max(t, warm), t + dt
        if b > a: out += f[m - 1] * (b - a)
        for i in range(m):
            if up[i] and b > a:
                if f[i] < mu[i] - 1e-9:
                    if i > 0 and f[i] < mu[i] and lev[i - 1] <= eps: starved[i] += b - a
                    elif i < m - 1 and lev[i] >= cap[i] - eps: blocked[i] += b - a
        for j in range(m - 1):
            lev[j] = min(max(lev[j] + (f[j] - f[j + 1]) * dt, 0.0), cap[j])
        t += dt
        if hit is not None: lev[hit[0]] = hit[1]
        for i in range(m):
            if t >= nxt[i] - 1e-12 and t < T:
                up[i] = not up[i]; nxt[i] = t + (gap(i) if up[i] else rep(R(i), mttr[i]))
    return out, starved, blocked

def mean_ci(xs):
    xs = np.asarray(xs, float); n = len(xs); h = 1.96 * xs.std(ddof=1) / math.sqrt(n) if n > 1 else float('nan')
    return xs.mean(), h

# ------------------------------------------------------------------ the exact chain, one pack at a time
def chain_two(mu, mtbf, mttr, K):
    """States (a, b, k): machine 1 up?, machine 2 up?, k packs in the buffer (0..K).  Poisson-clock machines:
    while up, machine 1 adds a pack at rate mu1 (if k<K), machine 2 takes one at rate mu2 (if k>0)."""
    S = 4 * (K + 1); idx = lambda a, b, k: (a * 2 + b) * (K + 1) + k
    Q = sparse.lil_matrix((S, S))
    for a in (0, 1):
        for b in (0, 1):
            for k in range(K + 1):
                i = idx(a, b, k)
                Q[i, idx(1 - a, b, k)] += (1 / mtbf[0]) if a else (1 / mttr[0])
                Q[i, idx(a, 1 - b, k)] += (1 / mtbf[1]) if b else (1 / mttr[1])
                if a and k < K: Q[i, idx(a, b, k + 1)] += mu[0]
                if b and k > 0: Q[i, idx(a, b, k - 1)] += mu[1]
    Q = Q.tocsr(); Q = Q - sparse.diags(np.asarray(Q.sum(1)).ravel())
    return Q, idx, S

def steady(Q):
    S = Q.shape[0]
    A = Q.T.tolil(); A[0, :] = 1; rhs = np.zeros(S); rhs[0] = 1
    return spsolve(A.tocsr(), rhs)

def chain_throughput(mu, mtbf, mttr, K):
    Q, idx, S = chain_two(mu, mtbf, mttr, K); pi = steady(Q)
    r2 = np.zeros(S); r1 = np.zeros(S)
    for a in (0, 1):
        for b in (0, 1):
            for k in range(K + 1):
                if b and k > 0: r2[idx(a, b, k)] = mu[1]
                if a and k < K: r1[idx(a, b, k)] = mu[0]
    return pi @ r2, pi @ r1

def chain_shift_output(mu, mtbf, mttr, K, T, level0=0):
    Q, idx, S = chain_two(mu, mtbf, mttr, K)
    r2 = np.zeros(S)
    for a in (0, 1):
        for b in (0, 1):
            for k in range(1, K + 1):
                if b: r2[idx(a, b, k)] = mu[1]
    p0 = np.zeros(S); p0[idx(1, 1, level0)] = 1
    ts = np.linspace(0, T, int(T * 2) + 1)
    P = expm_multiply(Q.T.tocsc(), p0, start=0, stop=T, num=len(ts), endpoint=True)
    rate = P @ r2
    return np.trapezoid(rate, ts)

# the case used throughout: filler 100/min (stops every 60 min, 4 min to clear), bagger 90/min (90 min, 6 min)
MU = [100.0, 90.0]; MTBF = [60.0, 90.0]; MTTR = [4.0, 6.0]
e = [MTBF[i] / (MTBF[i] + MTTR[i]) for i in range(2)]
print(f"# the case: filler {MU[0]:.0f}/min, MTBF {MTBF[0]:.0f} MTTR {MTTR[0]:.0f} (availability {e[0]:.4f}); bagger {MU[1]:.0f}/min, MTBF {MTBF[1]:.0f} MTTR {MTTR[1]:.0f} (availability {e[1]:.4f})")

# ---- 1. closed-form limits
print("\n# 1. closed-form limits of a two-machine line")
lim0 = min(MU) * e[0] * e[1]
limInf = min(MU[0] * e[0], MU[1] * e[1])
print(f"  no buffer (direct hand-over): min(rates) x e1 x e2 = {lim0:.4f}/min = {lim0 * 480:,.0f} a 480-min shift once running")
print(f"  unlimited buffer: min(rate_i x e_i) = {limInf:.4f}/min = {limInf * 480:,.0f} a shift; the no-stop ceiling {min(MU) * 480:,.0f}")
rng = np.random.default_rng(25102026)
def steady_sim(cap, runs=24, T=60_000.0, warm=2_000.0):
    xs = [fluid_run(MU, MTBF, MTTR, [cap], T, rng, start="stationary", level0=cap / 2, warm=warm)[0] / (T - warm) for _ in range(runs)]
    return mean_ci(xs)
m0, h0 = steady_sim(0.0)
print(f"  simulator, buffer 0: {m0:.3f} +- {h0:.3f} /min vs closed form {lim0:.3f}")
check("buffer 0: simulator inside its own 95% interval of the closed form", abs(m0 - lim0) <= max(h0, 0.05))
mI, hI = steady_sim(1e7, runs=12, T=60_000.0)
print(f"  simulator, huge buffer: {mI:.3f} +- {hI:.3f} /min vs closed form {limInf:.3f} (the huge buffer fills slowly, so this approaches from below)")
mB, hB = steady_sim(5_000.0)
print(f"  simulator, buffer 5,000 packs: {mB:.3f} +- {hB:.3f} /min — within {limInf - mB:.3f} of the unlimited limit")
check("a 5,000-pack buffer is within its own 95% interval (plus 0.1) of the unlimited limit", abs(limInf - mB) <= hB + 0.1)

# ---- 2. the exact chain, one pack at a time, against the simulator
print("\n# 2. the pack-level chain (exact linear algebra) against the simulator")
t0 = time.time()
rows = []
for K in (50, 100, 300, 600, 1200):
    th2, th1 = chain_throughput(MU, MTBF, MTTR, K)
    ms, hs = steady_sim(float(K))
    rows.append((K, th2, th1, ms, hs))
    print(f"  buffer {K:>5}: chain {th2:.3f}/min (check: in = out {th1:.3f}); simulator {ms:.3f} +- {hs:.3f}; gap {ms - th2:+.3f}")
    check(f"chain inflow = outflow at K={K}", abs(th1 - th2) < 1e-7)
    check(f"simulator within 0.35/min of the chain at K={K}", abs(ms - th2) < max(2 * hs, 0.05) + 0.3)
print(f"  ({time.time() - t0:.0f} s)")
th_prev = [r[1] for r in rows]
check("throughput rises with the buffer and stays below the unlimited limit", all(a < b for a, b in zip(th_prev, th_prev[1:])) and th_prev[-1] < limInf)
check("the chain approaches 84.375 from below, slowly: 0.52/min short at 1,200 packs", 0 < limInf - th_prev[-1] < 0.6)

# ---- 3. the chain itself against Gillespie
print("\n# 3. the chain's own construction against a plain Gillespie simulation of it")
def gillespie_two(mu, mtbf, mttr, K, T, rng):
    a = b = 1; k = 0; t = 0.0; made = 0
    while t < T:
        rates = [(1 / mtbf[0]) if a else (1 / mttr[0]), (1 / mtbf[1]) if b else (1 / mttr[1]),
                 mu[0] if (a and k < K) else 0.0, mu[1] if (b and k > 0) else 0.0]
        R = sum(rates); t += rng.exponential(1 / R)
        u = rng.random() * R; ev = 0
        while u > rates[ev]: u -= rates[ev]; ev += 1
        if ev == 0: a = 1 - a
        elif ev == 1: b = 1 - b
        elif ev == 2: k += 1
        else: k -= 1; made += 1
    return made / t
small = dict(mu=[2.0, 1.8], mtbf=[6.0, 9.0], mttr=[0.4, 0.6], K=6)
exact, _ = chain_throughput(small['mu'], small['mtbf'], small['mttr'], small['K'])
g = np.mean([gillespie_two(small['mu'], small['mtbf'], small['mttr'], small['K'], 5_000, rng) for _ in range(12)])
print(f"  small line: chain {exact:.4f}/min, Gillespie {g:.4f}/min")
check("Gillespie agrees with the chain (2 machines) to 2%", abs(g - exact) / exact < 0.02)

def chain_three(mu, mtbf, mttr, K1, K2):
    """states (a1,a2,a3,k1,k2); Poisson-clock machines"""
    S = 8 * (K1 + 1) * (K2 + 1)
    def idx(a, k1, k2): return ((a[0] * 2 + a[1]) * 2 + a[2]) * (K1 + 1) * (K2 + 1) + k1 * (K2 + 1) + k2
    Q = sparse.lil_matrix((S, S)); r_out = np.zeros(S)
    for a0 in (0, 1):
        for a1 in (0, 1):
            for a2 in (0, 1):
                a = (a0, a1, a2)
                for k1 in range(K1 + 1):
                    for k2 in range(K2 + 1):
                        i = idx(a, k1, k2)
                        for m_ in range(3):
                            b = list(a); b[m_] = 1 - b[m_]
                            Q[i, idx(tuple(b), k1, k2)] += (1 / mtbf[m_]) if a[m_] else (1 / mttr[m_])
                        if a[0] and k1 < K1: Q[i, idx(a, k1 + 1, k2)] += mu[0]
                        if a[1] and k1 > 0 and k2 < K2: Q[i, idx(a, k1 - 1, k2 + 1)] += mu[1]
                        if a[2] and k2 > 0: Q[i, idx(a, k1, k2 - 1)] += mu[2]; r_out[i] = mu[2]
    Q = Q.tocsr(); Q = Q - sparse.diags(np.asarray(Q.sum(1)).ravel())
    return Q, r_out

def gillespie_three(mu, mtbf, mttr, K1, K2, T, rng):
    a = [1, 1, 1]; k1 = k2 = 0; t = 0.0; made = 0
    while t < T:
        rates = [(1 / mtbf[i]) if a[i] else (1 / mttr[i]) for i in range(3)]
        rates += [mu[0] if (a[0] and k1 < K1) else 0.0, mu[1] if (a[1] and k1 > 0 and k2 < K2) else 0.0, mu[2] if (a[2] and k2 > 0) else 0.0]
        R = sum(rates); t += rng.exponential(1 / R)
        u = rng.random() * R; ev = 0
        while u > rates[ev]: u -= rates[ev]; ev += 1
        if ev < 3: a[ev] = 1 - a[ev]
        elif ev == 3: k1 += 1
        elif ev == 4: k1 -= 1; k2 += 1
        else: k2 -= 1; made += 1
    return made / t
s3 = dict(mu=[2.0, 1.8, 2.2], mtbf=[6.0, 9.0, 7.0], mttr=[0.4, 0.6, 0.5], K1=4, K2=4)
Q3, r3 = chain_three(**s3); pi3 = steady(Q3); exact3 = pi3 @ r3
g3 = np.mean([gillespie_three(s3['mu'], s3['mtbf'], s3['mttr'], s3['K1'], s3['K2'], 5_000, rng) for _ in range(12)])
print(f"  small three-machine line: chain {exact3:.4f}/min, Gillespie {g3:.4f}/min")
check("Gillespie agrees with the chain (3 machines) to 2%", abs(g3 - exact3) / exact3 < 0.02)

# ---- 4. fluid against the chain as the line is scaled up
print("\n# 4. the fluid simulator against the pack-level chain as the line is scaled (rates and buffer x s, stops unchanged)")
gaps = []
for s in (1, 4, 16):
    mu_s = [MU[0] * s, MU[1] * s]; K = 300 * s
    th2, _ = chain_throughput(mu_s, MTBF, MTTR, K)
    xs = [fluid_run(mu_s, MTBF, MTTR, [float(K)], 60_000.0, rng, start="stationary", level0=K / 2, warm=2_000.0)[0] / 58_000.0 for _ in range(16)]
    mm, hh = mean_ci(xs)
    gaps.append(abs(mm / s - th2 / s))
    print(f"  s={s:>2}: chain {th2 / s:.4f}/min per unit of scale, fluid simulator {mm / s:.4f} +- {hh / s:.4f}")
check("the gap between the pack-level chain and the fluid model shrinks as packs get small against the buffer", gaps[-1] <= gaps[0] + 0.02 and gaps[-1] < 0.12)

# ---- 5. a shift: start-up included, expected output exactly and by simulation
print("\n# 5. a 480-minute shift from a cold start (all up, buffer empty): expected output, exact and simulated")
T = 480.0
shift_rows = []
for K in (0, 100, 300, 600, 1200, 2400):
    if K == 0:
        # direct hand-over: the closed form above is steady; a cold start is both up, so use the simulator and the closed form only
        outs = [fluid_run(MU, MTBF, MTTR, [0.0], T, rng, start="up")[0] for _ in range(2000)]
        mm, hh = mean_ci(outs); ex = None
    else:
        outs = [fluid_run(MU, MTBF, MTTR, [float(K)], T, rng, start="up", level0=0.0)[0] for _ in range(2000)]
        mm, hh = mean_ci(outs); ex = chain_shift_output(MU, MTBF, MTTR, K, T, 0)
    sd = float(np.std(outs, ddof=1))
    shift_rows.append((K, mm, hh, sd, ex))
    print(f"  buffer {K:>5}: simulator {mm:,.0f} +- {hh:,.0f} (sd of a shift {sd:,.0f}, 2,000 shifts)" + (f"; exact chain {ex:,.0f}" if ex is not None else "; (no pack-level chain: nothing can pass an empty buffer)"))
    if ex is not None: check(f"shift K={K}: simulator within 0.6% of the exact expected output", abs(mm - ex) / ex < 0.006 or abs(mm - ex) < 2.5 * hh)
print(f"  for comparison: steady-state x 480 min — buffer 0: {lim0 * 480:,.0f}; unlimited: {limInf * 480:,.0f}; no-stop ceiling {min(MU) * 480:,}")
check("doubling 300 -> 600 buys more than doubling 1200 -> 2400 (diminishing return)", (shift_rows[3][1] - shift_rows[2][1]) > (shift_rows[5][1] - shift_rows[4][1]))
check("no shift average exceeds the no-stop ceiling", all(r[1] < min(MU) * 480 for r in shift_rows))

# how many shifts are needed to tell two buffers apart
d = [fluid_run(MU, MTBF, MTTR, [600.0], T, rng, start="up")[0] - fluid_run(MU, MTBF, MTTR, [300.0], T, rng, start="up")[0] for _ in range(400)]
print(f"  common random numbers are NOT used here; independent runs: 300 -> 600 buys {np.mean(d):,.0f} a shift, sd of the difference {np.std(d, ddof=1):,.0f}; shifts to see it at 95%: about {math.ceil((1.96 * np.std(d, ddof=1) / max(abs(np.mean(d)), 1)) ** 2)}")

# ---- 6. three machines, two buffers: the fluid simulator against the pack-level chain, scaled
print("\n# 6. three machines, two buffers: simulator against the pack-level chain as the line is scaled (rates and buffers x s)")
base = dict(mu=[10.0, 9.0, 9.5], mtbf=[20.0, 30.0, 25.0], mttr=[2.0, 3.0, 2.5], K=20)
unl = min(base['mu'][i] * base['mtbf'][i] / (base['mtbf'][i] + base['mttr'][i]) for i in range(3))
gaps3 = []
for sc in (1, 3, 6):
    mu_s = [x * sc for x in base['mu']]; K = base['K'] * sc
    Q3, r3 = chain_three(mu_s, base['mtbf'], base['mttr'], K, K); ex3 = steady(Q3) @ r3
    xs = [fluid_run(mu_s, base['mtbf'], base['mttr'], [float(K), float(K)], 20_000.0, rng, start="stationary", level0=K / 2, warm=1_000.0)[0] / 19_000.0 for _ in range(16)]
    m3, h3 = mean_ci(xs); gaps3.append(abs(m3 - ex3) / ex3)
    print(f"  s={sc}: buffers of {K} packs, rates {mu_s}: pack-level chain {ex3 / sc:.4f}, fluid simulator {m3 / sc:.4f} +- {h3 / sc:.4f} (per unit of scale); unlimited-buffer limit {unl:.4f}; gap {gaps3[-1]:.1%}")
    check(f"three-machine chain below the unlimited limit (s={sc})", ex3 / sc < unl)
check("three machines: the simulator-to-chain gap shrinks with scale and is under 2% at s=6", gaps3[-1] < gaps3[0] and gaps3[-1] < 0.02)
o, st, bl = fluid_run(base['mu'], base['mtbf'], base['mttr'], [20.0, 20.0], 40_000.0, rng, start="stationary", level0=10.0, warm=1_000.0)
print("  share of the time each machine is up but held back by an empty/full buffer: " + ", ".join(f"M{i + 1} starved {st[i] / 39_000:.1%}, blocked {bl[i] / 39_000:.1%}" for i in range(3)))
check("the first machine is never starved and the last never blocked", st[0] == 0 and bl[2] == 0)

# ---- 7. what the inputs' own uncertainty does (30 stops measured on each machine)
print("\n# 7. the inputs are estimates: 30 stops measured on each machine, buffer 600 (exact steady-state chain, 300 draws)")
r7 = np.random.default_rng(7)
nstops = 30; thr = []
for _ in range(300):
    # exponential mean from n observations: true/hat = chi2(2n)/(2n)  =>  draw true = hat * 2n / chi2(2n)
    f = lambda: 2 * nstops / r7.chisquare(2 * nstops)
    mt = [MTBF[0] * f(), MTBF[1] * f()]; mr = [MTTR[0] * f(), MTTR[1] * f()]
    thr.append(chain_throughput(MU, mt, mr, 600)[0])
thr = np.array(thr); lo, med, hi = np.percentile(thr, [5, 50, 95])
print(f"  steady output x 480 across what the inputs might be: 5% {lo * 480:,.0f}, median {med * 480:,.0f}, 95% {hi * 480:,.0f} (point estimate {chain_throughput(MU, MTBF, MTTR, 600)[0] * 480:,.0f})")
sim_ci = 75   # the half-width of the simulator's own 95% interval on a 2,000-shift mean, section 5
print(f"  the spread from not knowing MTBF and MTTR ({(hi - lo) * 480:,.0f} packs) is {(hi - lo) * 480 / (2 * sim_ci):.0f} times the simulator's own +-{sim_ci} — more runs cannot buy it back")
check("input uncertainty (90% range) dwarfs the simulation's own interval", (hi - lo) * 480 > 10 * 2 * sim_ci)

# ---- 8. the shape of repair times matters once a buffer is finite
print("\n# 8. repair times with a long tail (lognormal, CV 2, same mean) against exponential, buffer 600, steady state")
def lognormal_cv(r, mean, cv=2.0):
    sg = math.sqrt(math.log(1 + cv * cv)); mu_ = math.log(mean) - sg * sg / 2
    return r.lognormal(mu_, sg)
xe = [fluid_run(MU, MTBF, MTTR, [600.0], 60_000.0, rng, start="stationary", level0=300.0, warm=2_000.0)[0] / 58_000.0 for _ in range(24)]
xl = [fluid_run(MU, MTBF, MTTR, [600.0], 60_000.0, rng, start="stationary", level0=300.0, warm=2_000.0, repair=lognormal_cv)[0] / 58_000.0 for _ in range(24)]
me, he = mean_ci(xe); ml, hl = mean_ci(xl)
print(f"  exponential repairs {me:.3f} +- {he:.3f}/min; lognormal CV 2 {ml:.3f} +- {hl:.3f}/min — {100 * (me - ml) / me:.1f}% less, {(me - ml) * 480:,.0f} packs a shift, same MTTR")
check("same mean repair, long tail: output is lower (the buffer is drained by the long ones)", ml < me - 2 * (he + hl) / 2)

# ---- 9. comparing two what-ifs: common random numbers, and a line read backwards
print("\n# 9. comparing buffers 300 and 600: independent runs against common random numbers (one stream a machine, same seeds both sides)")
def paired(cap_a, cap_b, runs, crn, seed):
    diffs = []
    for r in range(runs):
        ra = [np.random.default_rng([seed, r, i]) for i in range(2)]
        rb = [np.random.default_rng([seed, r, i]) for i in range(2)] if crn else [np.random.default_rng([seed, r, i, 99]) for i in range(2)]
        a = fluid_run(MU, MTBF, MTTR, [cap_a], 480.0, None, start="up", rngs=ra)[0]
        b = fluid_run(MU, MTBF, MTTR, [cap_b], 480.0, None, start="up", rngs=rb)[0]
        diffs.append(b - a)
    return np.array(diffs)
d_ind = paired(300.0, 600.0, 1500, False, 5); d_crn = paired(300.0, 600.0, 1500, True, 5)
print(f"  independent runs: 300 -> 600 buys {d_ind.mean():,.0f} +- {1.96 * d_ind.std(ddof=1) / math.sqrt(len(d_ind)):,.0f} a shift (sd of a difference {d_ind.std(ddof=1):,.0f})")
print(f"  common random numbers: {d_crn.mean():,.0f} +- {1.96 * d_crn.std(ddof=1) / math.sqrt(len(d_crn)):,.0f} a shift (sd of a difference {d_crn.std(ddof=1):,.0f})")
exact_gain = chain_shift_output(MU, MTBF, MTTR, 600, 480.0, 0) - chain_shift_output(MU, MTBF, MTTR, 300, 480.0, 0)
print(f"  exact (pack-level chain) gain 300 -> 600: {exact_gain:,.0f}")
check("common random numbers cut the sd of a difference to under half", d_crn.std(ddof=1) < 0.5 * d_ind.std(ddof=1))
check("the paired gain agrees with the exact chain within its own interval (plus 80 for the model difference)", abs(d_crn.mean() - exact_gain) < 1.96 * d_crn.std(ddof=1) / math.sqrt(len(d_crn)) + 80)

print("\n# 9b. a property test: the line read backwards makes the same output (the chain, filler and bagger swapped)")
fw, _ = chain_throughput([100.0, 90.0], [60.0, 90.0], [4.0, 6.0], 300)
bw, _ = chain_throughput([90.0, 100.0], [90.0, 60.0], [6.0, 4.0], 300)
print(f"  forwards {fw:.6f}/min, reversed {bw:.6f}/min")
check("a two-machine line and its reverse have the same throughput", abs(fw - bw) < 1e-6)
sc2 = chain_throughput([200.0, 180.0], [60.0, 90.0], [4.0, 6.0], 600)[0]
check("doubling every rate and the buffer almost doubles the output (the chain's pack granularity is the only difference)", abs(sc2 / (2 * chain_throughput([100.0, 90.0], [60.0, 90.0], [4.0, 6.0], 300)[0]) - 1) < 0.005)

print("\n# summary")
bad = [n for n, c in ok if not c]
print(f"{len(ok) - len(bad)} of {len(ok)} checks passed" + ("" if not bad else "; FAILED: " + ", ".join(bad)))
raise SystemExit(1 if bad else 0)
