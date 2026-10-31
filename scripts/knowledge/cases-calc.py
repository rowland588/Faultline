"""Independent worked cases for the calculators (knowledge/specs/FC-235-calculators.md and the specs of
FC-009, FC-183, FC-131, FC-044, FC-215) — the numbers the unit tests and the acceptance script take as THEIR
literals, computed here by SciPy / NumPy or by hand from the textbook formula, never by the app.

Run: python3 -I scripts/knowledge/cases-calc.py      (prints every case; an assert fails if a stated figure moves)

Sources (each named where it is used):
  Kanban      Monden, Toyota Production System, N = D*L*(1+alpha)/C (knowledge/methods/lean/kanban-supermarket.md)
  Safety stock Silver, Pyke & Thomas (2017); Factory Physics' VRTD (knowledge/methods/planning/safety-stock.md)
  OC curve    the binomial and hypergeometric distributions (knowledge/methods/quality/acceptance-sampling-attributes.md;
              knowledge/research/cases-research-2-sampling.py)
  Little's law Little (1961), L = lambda * W (knowledge/methods/capacity/littles-law.md)
  Critical path Kelley & Walker (1959), found by listing every path (knowledge/methods/projects/critical-path.md)
"""
import math
import numpy as np
from scipy import stats, optimize

ok = lambda cond, what: (print(("  ok   " if cond else "  FAIL ") + what), cond or exit(1))

print("== FC-009 Kanban sizing: N = D * L * (1 + alpha) / C, rounded up")
def kanban(units, hours, lead_h, alpha, c):
    d = units / hours
    raw = d * lead_h * (1 + alpha) / c
    n = math.ceil(raw - 1e-9)
    return d, d * lead_h, raw, n, n * c
# K1 the textbook case (cases-lean.py): 1,500 trays in a 7.5 h shift, 2 h refill, 15%, 60 a crate
d, wip, raw, n, mx = kanban(1500, 7.5, 2.0, 0.15, 60)
print(f"  K1 D {d:.0f}/h, in the loop before safety {wip:.0f}, raw {raw:.4f} -> {n} kanbans, at most {mx}")
ok(d == 200 and wip == 400 and n == 8 and mx == 480 and abs(raw - 7.6667) < 1e-3, "K1 8 kanbans, 480 trays, 400 in the loop before safety (Monden; cases-lean.py)")
# K1b halve the lead time
d, wip, raw, n, mx = kanban(1500, 7.5, 1.0, 0.15, 60)
print(f"  K1b lead 1 h: raw {raw:.4f} -> {n}, at most {mx}, before safety {wip:.0f}")
ok(n == 4 and mx == 240 and wip == 200, "K1b halving the lead time halves the loop's stock before safety (200 trays), 4 kanbans")
# K2 two-bin labels: 3,000 labels in 1 h, 45 min refill, 20%, 500 a roll
d, wip, raw, n, mx = kanban(3000, 1, 0.75, 0.20, 500)
print(f"  K2 raw {raw:.4f} -> {n} rolls, at most {mx}, before safety {wip:.0f}")
ok(n == 6 and mx == 3000 and abs(raw - 5.4) < 1e-9 and wip == 2250, "K2 5.4 rolls rounds up to 6")
# K3 an exact integer must not round up: 100/h, 3 h, 20%, 60 a crate = 360/60 = 6.0 exactly
d, wip, raw, n, mx = kanban(100, 1, 3.0, 0.20, 60)
print(f"  K3 raw {raw!r} -> {n}")
ok(n == 6, "K3 360/60 is exactly 6 kanbans, not 7 (floating-point guard)")
# money on K1: a tray costs 85p; carrying 25% a year
val = mx * 0
d, wip, raw, n, mx = kanban(1500, 7.5, 2.0, 0.15, 60)
stock = mx * 0.85
print(f"  K1 money: the supermarket's {mx} trays at 85p = £{stock:.2f}; carrying 25% a year = £{stock*0.25:.2f}")
ok(abs(stock - 408.0) < 1e-9 and abs(stock * 0.25 - 102.0) < 1e-9, "K1 money: £408.00 held, £102.00 a year at 25%")

# K4 a safety factor of 30%: 400 * 1.3 / 60 = 8.667 -> 9; shelf 540; cover 2.7 h
d, wip, raw, n, mx = kanban(1500, 7.5, 2.0, 0.30, 60)
print(f"  K4 raw {raw:.4f} -> {n}, at most {mx}, cover {mx/d} h")
ok(n == 9 and mx == 540 and abs(mx / d - 2.7) < 1e-12, "K4 30% safety: 9 kanbans, 540 trays, 2.7 hours of cover")

print("\n== FC-183 Safety stock and the reorder point: SS = z*sqrt(L*sd_d^2 + d^2*sd_L^2); ROP = d*L + SS")
def ss(dbar, sd_d, L, sd_L, svc):
    z = stats.norm.ppf(svc)
    sd = math.sqrt(L * sd_d ** 2 + dbar ** 2 * sd_L ** 2)
    s = z * sd
    return z, sd, s, dbar * L, dbar * L + s
# S1 the record's film reels: 2.4/day (sd 0.9), 5 days (sd 1.5), 98%
z, sd, s, mean_l, rop = ss(2.4, 0.9, 5, 1.5, 0.98)
print(f"  S1 z {z:.4f}, lead-time demand mean {mean_l}, sd {sd:.4f}, SS {s:.4f}, ROP {rop:.4f}")
ok(abs(z - 2.05375) < 1e-4 and abs(sd - 4.1243) < 1e-3 and abs(s - 8.4704) < 1e-3 and abs(rop - 20.4704) < 1e-3, "S1 4.1 sd, 8.5 reels safety, reorder at 20.5 -> 21 (the record's own reading)")
# S2 a reliable supplier: sd_L 0 -> SS = z * sd_d * sqrt(L); 100/day sd 20, 4 days, 95%
z, sd, s, mean_l, rop = ss(100, 20, 4, 0, 0.95)
print(f"  S2 z {z:.4f}, sd {sd:.4f}, SS {s:.4f}, ROP {rop:.4f}")
ok(abs(z - 1.644854) < 1e-5 and abs(sd - 40) < 1e-9 and abs(s - 65.794) < 1e-2 and abs(rop - 465.794) < 1e-2, "S2 sigma_L = 0: SS 65.8 -> 66, ROP 465.8 -> 466")
# S3 money on S2: 500 a time, 250 days a year, £2.50 a unit, 20% carrying, a stock-out costs £800
cycles = 100 * 250 / 500
short_per_year = (1 - 0.95) * cycles
hold = s * 2.5 * 0.20
print(f"  S3 cycles a year {cycles}, cycles that run short {short_per_year:.2f}, holding £{hold:.2f} a year, running short £{short_per_year*800:.2f} a year")
ok(cycles == 50 and abs(short_per_year - 2.5) < 1e-9 and abs(hold - 32.897) < 1e-2 and abs(short_per_year * 800 - 2000) < 1e-9, "S3 holding £32.90 a year; 2.5 cycles a year short = £2,000 a year")
# S4 99.9%: z
print(f"  S4 z(99.9%) {stats.norm.ppf(0.999):.5f}  z(90%) {stats.norm.ppf(0.90):.5f}  z(97.5%) {stats.norm.ppf(0.975):.5f}  z(99%) {stats.norm.ppf(0.99):.5f}")
ok(abs(stats.norm.ppf(0.999) - 3.09023) < 1e-4 and abs(stats.norm.ppf(0.90) - 1.28155) < 1e-4, "S4 z at 99.9% and 90%")

# S5 lumpy use: 2 a day (sd 3), 1 day, no delivery swing, 95%: SS = 1.64485 * 3 = 4.93456, ROP 6.93456 -> 7; 2 < 2 * 3 so the model warns
z, sd, s_, mean_l, rop = ss(2, 3, 1, 0, 0.95)
print(f"  S5 SS {s_:.5f}, ROP {rop:.5f}, lead-time demand {mean_l} < 2 sd {2*sd}")
ok(abs(s_ - 4.93456) < 1e-4 and abs(rop - 6.93456) < 1e-4 and mean_l < 2 * sd, "S5 SS 4.9, ROP 6.93 -> 7; the swing is over half of what is used")
# S6 halving the delivery spread on S1: SS 5.545; halving the daily spread on S2: 32.897
z, sd, s_, mean_l, rop = ss(2.4, 0.9, 5, 0.75, 0.98)
ok(abs(s_ - 5.545) < 1e-3, "S6 S1 with the delivery swing halved: safety 5.5")
z, sd, s_, mean_l, rop = ss(100, 10, 4, 0, 0.95)
ok(abs(s_ - 32.897) < 1e-3, "S6 S2 with the daily swing halved: safety 32.9")

print("\n== FC-131 The OC curve: Pa(p) = P(X <= c), X ~ Binomial(n, p); hypergeometric for a lot of N")
def pa(n, c, p): return stats.binom.cdf(c, n, p)
def pa_h(N, n, c, p):
    D = round(N * p)
    return stats.hypergeom.cdf(c, N, D, n)
def at_pa(n, c, target):
    return optimize.brentq(lambda p: pa(n, c, p) - target, 1e-9, 1 - 1e-9)
# O1 125/3 (cases-quality.py, record)
vals = {p: pa(125, 3, p) for p in (0.005, 0.01, 0.02, 0.03, 0.05, 0.08)}
print("  O1 125/3 Pa:", {f"{p*100:g}%": round(v, 4) for p, v in vals.items()})
ok([round(vals[p], 3) for p in vals] == [0.996, 0.963, 0.759, 0.481, 0.124, 0.008], "O1 125/3: 0.996 0.963 0.759 0.481 0.124 0.008 (record)")
p95, p10 = at_pa(125, 3, 0.95), at_pa(125, 3, 0.10)
print(f"  O1 accepted 95 in 100 at {p95*100:.3f}%, accepted 10 in 100 at {p10*100:.3f}%")
ok(abs(p10 - 0.0525) < 5e-4, "O1 limiting quality at 10% risk is about 5.3% (record: 5.3%)")
print(f"  O1 producer's risk at AQL 1%: {(1-pa(125,3,0.01))*100:.2f}%  consumer's risk at LQ 6%: {pa(125,3,0.06)*100:.2f}%  at LQ 5%: {pa(125,3,0.05)*100:.2f}%")
ok(abs((1 - pa(125, 3, 0.01)) - 0.037) < 5e-4, "O1 producer's risk at 1% is 3.7% (record)")
# O2 50/1
print(f"  O2 50/1: Pa(1%) {pa(50,1,0.01):.4f}, producer's risk {(1-pa(50,1,0.01))*100:.2f}%, p10 {at_pa(50,1,0.10)*100:.3f}%, p95 {at_pa(50,1,0.95)*100:.3f}%")
ok(abs(pa(50, 1, 0.01) - 0.911) < 5e-4 and abs(at_pa(50, 1, 0.10) - 0.076) < 5e-4, "O2 50/1: 0.911 at 1%, limiting quality 7.6% (record)")
# O3 110/3 (research table)
print(f"  O3 110/3: Pa(1%) {pa(110,3,0.01):.4f}  Pa(6%) {pa(110,3,0.06):.4f}")
ok(round(pa(110, 3, 0.01), 3) == 0.975 and round(pa(110, 3, 0.06), 3) == 0.098, "O3 110/3: 0.975 at 1%, 0.098 at 6% (research table)")
# O4 the looser 89/2 often quoted for 1%/6%
print(f"  O4 89/2: producer's risk {(1-pa(89,2,0.01))*100:.2f}%, Pa(6%) {pa(89,2,0.06):.4f}")
ok(abs((1 - pa(89, 2, 0.01)) - 0.060) < 5e-4 and abs(pa(89, 2, 0.06) - 0.092) < 5e-4, "O4 89/2: 6.0% producer's risk, 0.092 at 6% (record)")
# O5 small lot N=200, n=50, c=1 at 5%: 10 bad in the lot
print(f"  O5 N=200 50/1 at 5% (10 bad): hypergeometric {pa_h(200,50,1,0.05):.4f} vs binomial {pa(50,1,0.05):.4f}")
ok(round(pa_h(200, 50, 1, 0.05), 3) == 0.237 and round(pa(50, 1, 0.05), 3) == 0.279, "O5 hypergeometric 0.237 vs binomial 0.279 (record)")
# O6 the whole-unit trap: N=200, AQL 1% -> 2 bad packs in the lot; with c = 2 never rejected
print(f"  O6 N=200, AQL 1% = {round(200*0.01)} bad; n=76 c=2: Pa {pa_h(200,76,2,0.01):.4f}")
ok(round(200 * 0.01) == 2 and pa_h(200, 76, 2, 0.01) == 1.0, "O6 a lot of 200 at 1% has 2 bad; a plan allowing 2 never rejects it (Pa 1.000)")
# O7 hypergeometric curve points for N=500 n=83 c=2
print(f"  O7 N=500 83/2: Pa(1%) {pa_h(500,83,2,0.01):.4f}  Pa(6%) {pa_h(500,83,2,0.06):.4f}")
# O8 zero acceptance number: n=45 c=0: Pa(5%) and Pa(1%)
print(f"  O8 45/0: Pa(5%) {pa(45,0,0.05):.4f}  Pa(1%) {pa(45,0,0.01):.4f}  p10 {at_pa(45,0,0.10)*100:.3f}%")
ok(abs(pa(45, 0, 0.05) - 0.0994) < 5e-4 and abs((1 - pa(45, 0, 0.01)) - 0.364) < 5e-4, "O8 45/0: Pa 0.099 at 5%; a 1% lot rejected 36 times in 100 (record)")
# O9 inspection cost: 125 units, 30 seconds each, £14.70 an hour
mins = 125 * 0.5
print(f"  O9 inspection: {mins} min = £{mins/60*14.70:.4f}")
ok(abs(mins / 60 * 14.70 - 15.3125) < 1e-9, "O9 125 units at 30 s each = 62.5 min = £15.31 at £14.70 an hour")
# O10 a curve point table for 125/3 at the grid the page prints
grid = [0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.10]
print("  O10 grid:", [f"{p*100:g}%={pa(125,3,p)*100:.1f}%" for p in grid])

# O11 a lot of 200, 76/2 at 1%: accepts 95 in 100 up to 3 bad (1.5%), 10 in 100 at 12 bad (6%)
first = lambda t: next(D for D in range(0, 201) if stats.hypergeom.cdf(2, 200, D, 76) <= t)
print(f"  O11 N=200 76/2: 95 in 100 at {first(0.95)} bad, 10 in 100 at {first(0.10)} bad")
ok(first(0.95) == 3 and first(0.10) == 12, "O11 3 bad (1.5%) and 12 bad (6%)")

print("\n== FC-044 Little's law: WIP = throughput * lead time")
# L1 the record's reading: 1,800 trays in the chiller at 600 an hour -> 3 hours
print(f"  L1 lead time {1800/600} h")
ok(1800 / 600 == 3.0, "L1 1,800 trays at 600 an hour: 3 hours")
# L2 the WIP a lead time needs: 250/h and 4 h -> 1,000
ok(250 * 4 == 1000, "L2 250 an hour kept 4 hours needs 1,000 in progress")
# L3 the throughput that fits: 480 in progress, 2.4 h in it -> 200 an hour
ok(abs(480 / 2.4 - 200) < 1e-9, "L3 480 held 2.4 hours: 200 an hour")
# L4 shelf life: 3 h of a 48 h life
print(f"  L4 {3/48*100:.2f}% of a 48 h shelf life")
ok(abs(3 / 48 - 0.0625) < 1e-12, "L4 3 hours of 48 is 6.25% of the shelf life")
# L5 money: 1,800 at 85p, carrying 25%
print(f"  L5 held £{1800*0.85:.2f}; a year at 25% £{1800*0.85*0.25:.2f}")
ok(abs(1800 * 0.85 - 1530) < 1e-9 and abs(1800 * 0.85 * 0.25 - 382.5) < 1e-9, "L5 £1,530 held; £382.50 a year at 25%")
# L6 halving the WIP at the same throughput halves the lead time
ok(900 / 600 == 1.5, "L6 halve the WIP: 1.5 hours")
# L7 a lead time shown in the floor's units
print("  L7 0.4 h =", 0.4 * 60, "min; 30 h =", 30 / 24, "days")
print("\nall independent cases hold")

print("\n== FC-215 Critical path and float: by listing every path, NOT by the two passes")
def paths_cpm(tasks):
    """tasks: {id: (days, [waits for])}. The end is the longest start-to-end path; the critical paths are the ones that long;
    a task's float is the end less the longest path THROUGH it (what the forward and backward passes arrive at another way)."""
    succ = {t: [s for s, (d, p) in tasks.items() if t in p] for t in tasks}
    starts = [t for t, (d, p) in tasks.items() if not p]
    out = []
    def walk(t, path, total):
        path = path + [t]; total += tasks[t][0]
        if not succ[t]: out.append((total, path)); return
        for s in succ[t]: walk(s, path, total)
    for s in starts: walk(s, [], 0)
    end = max(t for t, _ in out)
    return end, [p for t, p in out if abs(t - end) < 1e-9], {t: min(end - tot for tot, p in out if t in p) for t in tasks}
# P1 the knowledge record's network (cases-projects-people-ergo-sust.py): a filler's chain and a labeller's, then trials, handover
P1 = {"A": (10, []), "B": (14, []), "C": (5, ["A"]), "D": (4, ["B"]), "E": (6, ["C"]), "F": (8, ["D"]), "G": (5, ["E", "F"]), "H": (2, ["G"])}
end, crit, fl = paths_cpm(P1)
print(f"  P1 end {end}, critical {crit}, float {fl}")
ok(end == 33 and crit == [["B", "D", "F", "G", "H"]] and fl == {"A": 5, "B": 0, "C": 5, "D": 0, "E": 5, "F": 0, "G": 0, "H": 0}, "P1 the end is day 33, the labeller's chain B-D-F-G-H is critical, the filler's A-C-E has 5 days' float")
# P2 a second network: one critical path; the side tasks C 5, F 5, E 6 days' float
P2 = {"A": (3, []), "B": (4, ["A"]), "C": (2, ["A"]), "D": (5, ["B"]), "E": (1, ["C"]), "F": (6, ["C"]), "G": (4, ["D", "E"]), "H": (3, ["F", "G"])}
end, crit, fl = paths_cpm(P2)
print(f"  P2 end {end}, critical {crit}, float {fl}")
ok(end == 19 and crit == [["A", "B", "D", "G", "H"]] and fl == {"A": 0, "B": 0, "C": 5, "D": 0, "E": 6, "F": 5, "G": 0, "H": 0}, "P2 the end is day 19, A-B-D-G-H critical, C 5, E 6, F 5 days' float")
# P3 two chains tie: both critical paths are found, and a task with a day's float
P3 = {"A": (2, []), "B": (3, ["A"]), "C": (4, ["A"]), "D": (2, ["B"]), "E": (3, ["B", "C"]), "F": (5, ["C"]), "G": (2, ["D", "E"]), "H": (1, ["F", "G"])}
end, crit, fl = paths_cpm(P3)
print(f"  P3 end {end}, critical {crit}, float {fl}")
ok(end == 12 and sorted(crit) == [["A", "C", "E", "G", "H"], ["A", "C", "F", "H"]] and fl["B"] == 1 and fl["D"] == 2, "P3 the end is day 12, two critical paths A-C-E-G-H and A-C-F-H, B has 1 day's float and D 2")
# P4 a slip: a task late by d moves the end by max(0, d - float); recomputed by listing the paths again
def slipped(tasks, t, d):
    tt = {k: ((v[0] + d if k == t else v[0]), v[1]) for k, v in tasks.items()}
    return paths_cpm(tt)[0]
print(f"  P4 B +3: {slipped(P1,'B',3)}, A +3: {slipped(P1,'A',3)}, A +8: {slipped(P1,'A',8)}")
ok(slipped(P1, "B", 3) == 36 and slipped(P1, "A", 3) == 33 and slipped(P1, "A", 8) == 36, "P4 the labeller's delivery 3 days late: 36 (+3); the filler's 3 days late: 33 (+0); the filler's 8 days late (5 float): 36 (+3 = 8 - 5)")
# P5 money: a day on the critical path at £2,500 a day (the cost of delay is the person's own figure)
print(f"  P5 3 days x £2,500 = £{3*2500:,}")
ok(3 * 2500 == 7500, "P5 a handover 3 days later at £2,500 a day is £7,500")
print("\nall FC-215 independent cases hold")
