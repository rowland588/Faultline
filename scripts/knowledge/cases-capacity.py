#!/usr/bin/env python3
"""INDEPENDENT CASES — capacity records brought to full depth (knowledge/methods/capacity, 24 October 2026).
Every number in a record's "Worked case" is printed here by NumPy/SciPy or plain arithmetic, never by Faultline's code."""
import math
import numpy as np

print("# capacity.three-capacities — a packing line, one week")
design, effective, actual = 120 * 60 * 24 * 7, 100 * 60 * 16 * 5, 148_000  # packs: 120/min x 24h x 7d; 100/min plannable x 16h x 5d
print(f"  design {design:,} (120/min, 24x7); effective {effective:,} (100/min plannable, 2 shifts x 5 days); actual {actual:,}")
print(f"  utilisation = actual/design {actual/design:.1%}; efficiency = actual/effective {actual/effective:.1%}")
print(f"  the 'plannable' rate 100 of plate 120: the standard's target ({100/120:.0%} of plate), set from the V-curve margin and the shift's stops")

print("\n# capacity.load-vs-demand — the week's orders against the line's hours (rough-cut capacity)")
orders = {"Maris 2kg": (60_000, 100), "Tesco 1.25kg": (45_000, 110), "King Edward 2.5kg": (30_000, 90), "Baby 1kg": (24_000, 120)}
hours_needed = sum(q / r / 60 for q, (q, r) in [(0, v) for v in orders.values()]) if False else sum(q / r / 60 for q, r in orders.values())
changeovers = 3 * 42 / 60
avail = 2 * 7.5 * 5
print(f"  run hours needed {hours_needed:.1f}; changeovers 3 x 42 min = {changeovers:.1f} h; total {hours_needed+changeovers:.1f} h against {avail:.1f} h available -> headroom {avail - hours_needed - changeovers:.1f} h ({(avail - hours_needed - changeovers)/avail:.0%})")
print(f"  at the plate speed instead of plannable (x1.2): {hours_needed/1.2 + changeovers:.1f} h — the planner who uses plate speed books {hours_needed - hours_needed/1.2:.1f} h that are not there")
print(f"  SMED's separated changeover (27 min): headroom {avail - hours_needed - 3*27/60:.1f} h")

print("\n# capacity.throughput-accounting — which product to run when the constraint is full")
# T per unit = price - truly variable cost; constraint rate per minute
prods = {"Maris 2kg": (0.42, 100), "Tesco 1.25kg": (0.31, 110), "King Edward 2.5kg": (0.55, 90), "Baby 1kg": (0.20, 120)}
rank = sorted(prods.items(), key=lambda kv: -kv[1][0] * kv[1][1])
for name, (t, r) in rank: print(f"  {name}: T/unit £{t:.2f} x {r}/min = £{t*r:.1f} a constraint minute")
print(f"  by margin a unit the order would be {[k for k,_ in sorted(prods.items(), key=lambda kv: -kv[1][0])]}; by T a constraint minute {[k for k,_ in rank]}")
# fill 4500 minutes of constraint time: demand caps
demand = {"Maris 2kg": 60_000, "Tesco 1.25kg": 45_000, "King Edward 2.5kg": 30_000, "Baby 1kg": 24_000}
left = 2 * 7.5 * 5 * 60 - 3 * 42; plan = {}
for name, (t, r) in rank:
    mins = min(left, demand[name] / r); plan[name] = mins * r; left -= mins
tot_T = sum(plan[n] * prods[n][0] for n in plan)
print(f"  plan filling {2*7.5*5*60 - 3*42:.0f} constraint minutes in that order: {{ {', '.join(f'{n}: {int(v):,}' for n, v in plan.items())} }}, minutes unused {left:.0f}; throughput £{tot_T:,.0f}")
# compare with demand order as given
left2 = 2 * 7.5 * 5 * 60 - 3 * 42; plan2 = {}
for name in demand:
    r = prods[name][1]; mins = min(left2, demand[name] / r); plan2[name] = mins * r; left2 -= mins
print(f"  the same minutes in the order the orders arrived: throughput £{sum(plan2[n]*prods[n][0] for n in plan2):,.0f}; the ranking is worth £{tot_T - sum(plan2[n]*prods[n][0] for n in plan2):,.0f} a week")

print("\n# capacity.accumulation-buffer — a filler at 100/min feeding a bagger (the critical machine) at 90/min through a 600-pack accumulator")
A, rc, rn = 600, 90, 100
print(f"  the bagger stops for 5 min: the accumulator (empty before) fills at {rn}/min -> holds {A} after {A/rn:.0f} min; the filler then stops {5 - A/rn:.0f} min")
print(f"  the filler stops for t min with the accumulator full: the bagger runs on for {A/rc:.1f} min before it starves; a filler stop under {A/rc:.1f} min costs the line nothing")
print(f"  refill after the bagger ran it down: at the speed difference {rn-rc}/min the {A} packs come back in {A/(rn-rc):.0f} min — the V-curve's margin ({(rn-rc)/rc:.0%} here) is what buys recovery")
print(f"  buffer wanted to cover the filler's longest usual stop of 10 min: {10*rc} packs; its MTTR-based sizing: the 90th percentile stop x the critical rate")
print(f"  what a stop costs: a filler stop of 12 min with a 600-pack buffer starves the bagger {12 - A/rc:.1f} min -> {(12 - A/rc)*rc:.0f} packs not made at the bottleneck -> x margin a pack")

print("\n# capacity.dbr-buffer — drum-buffer-rope: a time buffer in front of the constraint")
buffer_h = 6.0
for consumed in [1.5, 3.5, 5.0]:
    status = consumed / buffer_h; zone = 'green' if status < 1/3 else 'amber' if status < 2/3 else 'red'
    print(f"  a job due at the constraint in {buffer_h - consumed:.1f} h of a {buffer_h} h buffer: {status:.0%} consumed -> {zone}")
print(f"  rope: release upstream = constraint schedule minus the buffer ({buffer_h} h); WIP in front of the constraint ~ constraint rate x buffer = {90*60*buffer_h:,.0f} packs at 90/min")
print(f"  buffer sizing rule of thumb (Goldratt): start at half the current lead time, then shrink while red zone penetrations are rare (<~5-10% of jobs)")

print("\n# capacity.simulation — a two-station line with random stops, time-stepped Monte Carlo (the shape of the method)")
rng = np.random.default_rng(3)
def run(buffer_cap, minutes=480, rate1=100, rate2=90, mtbf1=60, mttr1=4, mtbf2=90, mttr2=6):
    b = 0; out = 0; up1 = up2 = True; t1 = t2 = 0
    for m in range(minutes):
        # stops as geometric per-minute events
        if up1 and rng.random() < 1 / mtbf1: up1 = False; t1 = max(1, round(rng.exponential(mttr1)))
        if up2 and rng.random() < 1 / mtbf2: up2 = False; t2 = max(1, round(rng.exponential(mttr2)))
        if not up1: t1 -= 1; up1 = t1 <= 0
        if not up2: t2 -= 1; up2 = t2 <= 0
        made1 = min(rate1, buffer_cap - b) if up1 else 0; b += made1
        made2 = min(rate2, b) if up2 else 0; b -= made2; out += made2
    return out
for cap in [0, 300, 600, 1200]:
    outs = [run(cap) for _ in range(40)]; print(f"  buffer {cap:>4}: output a shift mean {np.mean(outs):,.0f}, sd {np.std(outs, ddof=1):,.0f} (40 runs; the no-stop ceiling {90*480:,})")
print("  the method: stops drawn from each machine's MTBF and MTTR, the buffer's fill tracked a minute at a time, output read over many runs — the mean and its spread, never one run")
