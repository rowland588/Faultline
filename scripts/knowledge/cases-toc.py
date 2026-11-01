#!/usr/bin/env python3
"""INDEPENDENT CASES — the Theory of Constraints tools (FC-046, FC-056, FC-039, FC-045, FC-043, FC-179; 1 November 2026).
Every number a unit test or an acceptance script holds is printed here by plain arithmetic (stdlib only — no NumPy on this
machine), a second implementation written from the textbooks and the knowledge records, never from Faultline's code.
Run: python3 scripts/knowledge/cases-toc.py"""
import math, random

def p(title): print(f"\n# {title}")

# ------------------------------------------------------------------ FC-046 accumulation (capacity.accumulation-buffer)
p("FC-046 accumulation — the record's worked case: a filler at 100/min feeding the bagger (critical, 90/min) through 600 packs")
A, rc, rn = 600, 90, 100
cover = A / rc; recov = A / (rn - rc)
print(f"  cover A/rc = {cover:.3f} min; recovery A/(rn-rc) = {recov:.1f} min")
t = 12; starve = max(0, t - cover)
print(f"  a {t} min filler stop: the bagger starves {starve:.3f} min = {starve*rc:.0f} packs; at 40p a pack = £{starve*rc*0.40:.2f}")
print(f"  to cover a 10 min stop the buffer needs 10 x rc = {10*rc} packs")
print(f"  a 25% margin (rn = {rc*1.25}) refills {A} in {A/(rc*1.25-rc):.2f} min; a 10% margin (rn = {rc*1.1}) in {A/(rc*1.1-rc):.1f} min")
p("FC-046 — nearest-rank 90th percentile of a stop list, and a chain's refill gap")
stops = sorted([2, 3, 3, 4, 5, 6, 8, 12, 15, 20]); n = len(stops)
k = math.ceil(0.9 * n)
print(f"  stops {stops}: n={n}, p90 nearest rank = the {k}th = {stops[k-1]} min; mean = {sum(stops)/n:.1f}")
print(f"  stops longer than the 6.667 min cover: {[s for s in stops if s > cover]}; starved minutes = {sum(max(0, s-cover) for s in stops):.3f}; packs = {sum(max(0, s-cover) for s in stops)*rc:.1f}")
speeds = [120, 100, 90]  # a feeder, a filler, the bagger (critical) — a stop at the feeder
print(f"  a stop at the feeder (120/min) with the filler (100/min) between and the bagger at 90: the refill runs at min(120,100)-90 = {min(speeds[:2]) - speeds[2]}/min")

# ------------------------------------------------------------------ FC-056 speed loss (equipment.short-stops-speed)
p("FC-056 speed loss — the record's shift, worked by net operating time (Nakajima): planned 450, stops 62, ideal 120, timed 108, 38,200 good")
planned, stopsm, ideal, run_speed, good, rej = 450, 62, 120, 108, 38200, 0
runm = planned - stopsm
net = (good + rej) / run_speed
slow = net - (good + rej) / ideal
short = runm - net
lost = runm - (good + rej) / ideal
print(f"  run {runm} min; net operating time {net:.2f}; at ideal the packs take {(good+rej)/ideal:.2f}")
print(f"  speed loss {lost:.2f} min = slow running {slow:.2f} + short stops {short:.2f}")
print(f"  in packs at the ideal speed: slow {slow*ideal:.0f}, short {short*ideal:.0f}, together {lost*ideal:.0f}")
print(f"  the running speed is {run_speed/ideal:.1%} of ideal; slow running is {slow/lost:.1%} of the speed loss")
print(f"  41 short stops over the {runm} min run = {41/(runm/60):.2f} an hour, {short/41:.3f} min ({short/41*60:.0f} s) each")
print(f"  (the record's earlier simplification, run x (1 - 108/120), gave slow {runm*(1-run_speed/ideal):.1f} and short {lost-runm*(1-run_speed/ideal):.1f} — it runs the line at the timed speed through its short stops too)")
print(f"  at 30p a pack at the pace-setter: slow £{slow*ideal*0.30:,.2f}, short £{short*ideal*0.30:,.2f}")
p("FC-056 — a timed speed above the ideal, and a count with no short stops")
print(f"  108 -> 125 against 120: slow running = {max(0, (good+rej)/125 - (good+rej)/ideal):.0f} (none: it is above the plate)")

# ------------------------------------------------------------------ FC-039 recovery levers (capacity.theory-of-constraints)
p("FC-039 recovery levers — a counted shift: the constraint at 120/min; breakdown on it 40 min, jams on a non-constraint 30 min, changeover 36 min")
rate = 120
for name, mins, on in [("breakdown (on the constraint)", 40, True), ("jams (off it)", 30, False), ("changeover", 36, True)]:
    for pct in (20, 50):
        back = mins * pct / 100
        print(f"  {name}: {pct}% of {mins} = {back:.1f} min back -> {back*rate if on else 0:.0f} packs, £{back*rate*0.35 if on else 0:.2f} at 35p")
print(f"  breakdown 20% + changeover 50%: min {40*.2+36*.5:.1f}, packs {(40*.2+36*.5)*rate:.0f}, £{(40*.2+36*.5)*rate*.35:.2f} a shift; x 10 shifts = £{(40*.2+36*.5)*rate*.35*10:,.2f}")

# ------------------------------------------------------------------ FC-045 Kingman (capacity.kingman-vut)
p("FC-045 Kingman's VUT — the record's table of u/(1-u), and M/M/1 exact (c_a = c_e = 1)")
for u in (0.5, 0.85, 0.95, 0.99):
    print(f"  u = {u}: u/(1-u) = {u/(1-u):.4f} process times")
te = 2.0
for u in (0.5, 0.85, 0.95):
    kq = ((1 + 1) / 2) * (u / (1 - u)) * te
    exact = u / (1 - u) * te  # M/M/1: Wq = rho/(mu - lambda) = rho/(1-rho) * te
    print(f"  M/M/1 te={te} min, u={u}: Kingman CTq = {kq:.4f} min; exact Wq = {exact:.4f} min (identical: the formula is exact when c_a = c_e = 1)")
p("FC-045 — a case by hand: the wrapper, te 0.6 min, u 92%, c_a 0.9, c_e 1.5")
u, te, ca, ce = 0.92, 0.6, 0.9, 1.5
V = (ca**2 + ce**2) / 2; U = u / (1 - u)
ctq = V * U * te
print(f"  V = (0.81+2.25)/2 = {V:.4f}; U = {U:.4f}; CTq = {ctq:.4f} min = {ctq/te:.2f} process times; CT = {ctq+te:.4f}")
lam = u / te
print(f"  arrival rate {lam:.4f}/min -> queue by Little's law = {lam*ctq:.2f}; at u = 85%: CTq = {V*(0.85/0.15)*te:.4f} min")
print(f"  halve c_e to 0.75: V = {(ca**2+0.75**2)/2:.4f}, CTq = {(ca**2+0.75**2)/2*U*te:.4f} min")
print(f"  departure c_d^2 = u^2 ce^2 + (1-u^2) ca^2 = {u*u*ce*ce + (1-u*u)*ca*ca:.4f}  (c_d = {math.sqrt(u*u*ce*ce + (1-u*u)*ca*ca):.4f})")
p("FC-045 — effective process time with stops in (Hopp & Spearman): t0 = 0.5 min, A = 90%, mr = 10 min, cr = 1.0, c0 = 0.2")
t0, A, mr, cr, c0 = 0.5, 0.90, 10.0, 1.0, 0.2
te_ = t0 / A
ce2 = c0**2 + (1 + cr**2) * A * (1 - A) * mr / t0
print(f"  te = t0/A = {te_:.4f}; ce^2 = c0^2 + (1+cr^2) A (1-A) mr / t0 = {ce2:.4f}; ce = {math.sqrt(ce2):.4f}")
p("FC-045 — multi-server (Sakasegawa) against Erlang C exact, m = 2, u = 0.85, te = 2 (M/M/2: ca = ce = 1)")
m, u, te = 2, 0.85, 2.0
sak = (u ** (math.sqrt(2 * (m + 1)) - 1)) / (m * (1 - u)) * te  # (ca2+ce2)/2 = 1
lam = u * m / te; a = lam * te
def erlang_c(m, a):
    s = sum(a**k / math.factorial(k) for k in range(m))
    top = a**m / math.factorial(m) * (m / (m - a))
    return top / (s + top)
exact = erlang_c(m, a) * te / (m * (1 - u))
print(f"  Sakasegawa CTq = {sak:.4f} min; Erlang C exact Wq = {exact:.4f} min; the approximation is {abs(sak-exact)/exact:.1%} off")
p("FC-045 — the accuracy of Kingman for a G/G/1 queue, by Lindley's recursion W(n+1) = max(0, W(n) + S(n) - T(n+1)), 400,000 jobs, seed 7")
def sim(u, te, ca, ce, n=400_000, seed=7):
    rnd = random.Random(seed)
    def draw(mean, cv):
        if cv == 0: return mean
        k = 1 / (cv * cv); return rnd.gammavariate(k, mean / k)
    w = 0.0; tot = 0.0; ta = te / u
    for _ in range(n):
        s = draw(te, ce); a = draw(ta, ca)
        w = max(0.0, w + s - a); tot += w
    return tot / n
for (u, ca, ce) in [(0.85, 1.0, 1.0), (0.85, 0.9, 1.5), (0.7, 1.0, 0.5), (0.92, 0.9, 1.5)]:
    te = 2.0
    k = ((ca**2 + ce**2) / 2) * (u / (1 - u)) * te
    s = sim(u, te, ca, ce)
    print(f"  u={u} ca={ca} ce={ce}: Kingman {k:.3f} min; simulated {s:.3f} min; Kingman is {(k-s)/s:+.1%}")

# ------------------------------------------------------------------ FC-043 drum-buffer-rope (capacity.dbr-buffer)
p("FC-043 DBR — the record's worked case: a 6 h constraint buffer")
B = 6.0
for left in (4.5, 2.5, 1.0):
    used = (B - left) / B
    zone = "green" if used < 1/3 else ("amber" if used < 2/3 else "red")
    print(f"  due at the constraint in {left} h, not arrived: {used:.1%} consumed -> {zone}; rope releases it {B} h ahead")
print(f"  the WIP implied at a 90/min constraint: 90 x 60 x {B} = {90*60*B:,.0f} packs")
print(f"  a buffer start rule, half the lead time: lead time 11 h -> {11/2} h; shorten 15% -> {B*0.85:.2f} h; lengthen 20% -> {B*1.2:.2f} h")
print(f"  a hole in the drum: 30 min x 90/min x 30p = £{30*90*0.30:.2f}; the buffer's stock carried: 32,400 packs x £0.40 x 25% / 52 weeks = £{32400*0.40*0.25/52:,.2f} a week")

# ------------------------------------------------------------------ FC-179 the week's schedule (planning.scheduling-rules)
p("FC-179 — a week on a line that runs 2 shifts x 7.5 h (planned) x 5 days = 900 min a day; orders in the order typed")
day_min = 2 * 7.5 * 60
orders = [  # name, qty, rate/min (plannable), due day (1 = Monday)
    ("Maris 2kg", 54000, 100, 2), ("Tesco 1.25kg", 49500, 110, 3), ("King Edward 2.5kg", 36000, 90, 4), ("Baby 1kg", 28800, 120, 5)]
changeover = 42  # minutes, between different products, from SMED
t = 0.0; prev = None; total_co = 0; total_run = 0
for name, qty, r, due in orders:
    co = changeover if prev is not None else 0
    run = qty / r
    start = t + co; end = start + run
    endday = math.ceil(end / day_min - 1e-9)
    late = max(0, endday - due)
    print(f"  {name}: {qty:,} at {r}/min = {run:.1f} min run; changeover {co}; working minute {start:.1f} -> {end:.1f}; ends on day {endday}, {end - (endday-1)*day_min:.1f} min into it; due day {due}: {'LATE %d day(s)' % late if late else 'on time'}")
    t = end; prev = name; total_co += co; total_run += run
print(f"  total run {total_run:.1f} min + changeovers {total_co} = {t:.1f} of {5*day_min:.0f} available; {5*day_min - t:.1f} min spare ({(5*day_min - t)/60:.2f} h)")
print(f"  changeovers' share of the week = {total_co/(5*day_min):.1%}; at 100/min and 35p, the 3 changeovers cost {total_co*100*0.35:,.2f} of contribution if on the constraint")
p("FC-179 — the same orders if the last two swap (EDD is not used: the typed order is the plan)")
orders2 = [orders[0], orders[1], orders[3], orders[2]]
t = 0.0; prev = None
for name, qty, r, due in orders2:
    co = changeover if prev is not None else 0
    start = t + co; end = start + qty / r
    print(f"  {name}: ends {end:.1f} (day {math.ceil(end/day_min - 1e-9)}), due day {due}")
    t = end; prev = name
