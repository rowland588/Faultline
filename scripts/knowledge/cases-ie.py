#!/usr/bin/env python3
"""INDEPENDENT CASES — industrial-engineering records brought to full depth (knowledge/methods/ie, 24 October 2026).
Every number in a record's "Worked case" is printed here by NumPy/SciPy or plain arithmetic, never by Faultline's code."""
import math
import numpy as np
from scipy import stats

print("# ie.allowances — a packer's standard time from basic time and the ILO relaxation factors")
basic = 42.0  # seconds a pack, rated
factors = {"personal needs": 5, "basic fatigue": 4, "standing": 2, "light load (5 kg)": 1, "monotony (medium)": 1, "noise (intermittent, loud)": 2}
allow = sum(factors.values()); std = basic * (1 + allow / 100)
print(f"  factors {factors} -> {allow}% ; standard = {basic} x {1 + allow/100:.2f} = {std:.1f} s a pack -> {3600/std:.0f} an hour")
print(f"  Faultline's Line capacity uses 9% (personal 5 + fatigue 4) on a seated/light job: standard {basic*1.09:.1f} s, {3600/(basic*1.09):.0f} an hour — {3600/(basic*1.09) - 3600/std:.0f} an hour more than with the full table")
print(f"  a cold room (+4%) and a 15 kg lift (+5%): {basic*(1+(allow+9)/100):.1f} s")

print("\n# ie.labour-productivity — a shift's earned hours")
output, std_time_s, crew, hours_paid, hours_on_std = 21_600, 42.0 * 1.15 / 4, 4, 4 * 8.0, 4 * 7.0
earned = output * std_time_s / 3600
print(f"  output {output:,} packs x standard {std_time_s:.3f} s a pack (a 4-person crew's share) = {earned:.1f} earned hours; worked on standard {hours_on_std} h; paid {hours_paid} h")
print(f"  efficiency = earned/worked {earned/hours_on_std:.0%}; utilisation = worked on standard/paid {hours_on_std/hours_paid:.0%}; productivity {output/hours_paid:.0f} packs a paid hour; overall {earned/hours_paid:.0%}")
print(f"  labour cost a pack at £14/h x 1.25 on-costs: £{crew*hours_paid*14*1.25/output:.4f}")

print("\n# ie.learning-curve — a new product's first runs: cycle time per pack by cumulative run number")
runs = np.arange(1, 9); T = np.array([68, 58, 53, 49, 47, 45, 44, 43], dtype=float)
lr = stats.linregress(np.log(runs), np.log(T)); b = lr.slope; rate = 2 ** b
print(f"  fit T_n = {math.exp(lr.intercept):.1f} x n^{b:.3f}; learning rate {rate:.1%} (each doubling of runs cuts the time to {rate:.0%}); R2 {lr.rvalue**2:.3f}")
print(f"  predicted run 16: {math.exp(lr.intercept)*16**b:.1f} s; run 32: {math.exp(lr.intercept)*32**b:.1f} s; the standard of 40 s is reached at run {math.ceil((40/math.exp(lr.intercept))**(1/b))}")
print(f"  cumulative average time over the first 8 (Wright's form): {T.mean():.1f} s vs the unit time at 8 {T[-1]:.0f} s")

print("\n# ie.person-machine — one operator tending several identical machines")
l, m, w = 1.2, 6.0, 0.3  # load/unload minutes, machine run minutes, walk minutes
N = (l + m) / (l + w); print(f"  l {l}, m {m}, w {w} min: N' = (l+m)/(l+w) = {N:.2f} -> 4 machines leave the operator idle, 5 make the machines wait")
for n in [4, 5]:
    cycle = max(l + m, n * (l + w)); out_per_h = n * 60 / cycle
    idle_op = max(0, cycle - n * (l + w)); idle_m = max(0, cycle - (l + m))
    print(f"  n={n}: cycle {cycle:.1f} min, output {out_per_h:.1f} cycles/h, operator idle {idle_op:.1f} min a cycle, each machine waits {idle_m:.1f} min a cycle")
# cost-based choice: operator £20/h, machine £35/h
for n in [4, 5]:
    cycle = max(l + m, n * (l + w)); cost_per_cycle = (20 + 35 * n) / 60 * cycle / n
    print(f"  n={n}: cost a machine-cycle £{cost_per_cycle:.3f} (operator £20/h, machine £35/h)")

print("\n# ie.pmts — MTM-1 shape: TMU to seconds (the tables themselves are licensed and not reproduced)")
tmu = 1 / 0.036 / 100 * 100  # 1 TMU = 0.036 s
print(f"  1 TMU = 0.036 s = 0.0006 min; 100 TMU = {100*0.036:.1f} s; a sequence summing to 420 TMU = {420*0.036:.1f} s at the 100% pace the system defines (no rating)")
print(f"  MOST: a general-move sequence A B G A B P A, index values summed x 10 TMU — e.g. indices 1+0+1+1+0+1+0 = 4 -> 40 TMU = {40*0.036:.2f} s (the index tables are the association's)")

print("\n# ie.standard-data — building a new job's time from library elements")
lib = {"pick case from pallet": 3.2, "open case": 2.1, "place 12 packs": 9.6, "close and tape": 4.4, "walk 2 m": 1.4}
elem = {"pick case from pallet": 1, "open case": 1, "place 12 packs": 2, "close and tape": 1, "walk 2 m": 2}
basic = sum(lib[k] * elem[k] for k in elem); print(f"  new job (24 packs a case): basic {basic:.1f} s from the library; with 11% allowance {basic*1.11:.1f} s a case -> {3600/(basic*1.11):.0f} cases an hour")
print(f"  a regression element: 'place n packs' = 1.2 + 0.7 n s -> 12 packs {1.2+0.7*12:.1f} s, 18 packs {1.2+0.7*18:.1f} s")

print("\n# ie.ecrs — eliminate, combine, rearrange, simplify on a 6-element task")
elements = [("fetch tray", 6, "E: trays staged at the bench"), ("open bag", 4, "S: pre-opened by the former"), ("fill", 18, "—"), ("weigh", 7, "C: weigh on the fill scale"), ("seal", 9, "—"), ("walk to belt", 5, "R: belt moved beside the sealer")]
before = sum(t for _, t, _ in elements); after = 0 + 2 + 18 + 0 + 9 + 1
print(f"  before {before} s; after ECRS {after} s ({1 - after/before:.0%} less); at takt 40 s: {before/40:.0%} -> {after/40:.0%} loaded")

print("\n# ie.micro-motion — two-hand chart of 'open bag': therbligs per hand, the holds")
left = ["reach", "grasp", "hold", "hold", "hold", "release"]; right = ["reach", "grasp", "pull", "position", "release", "idle"]
print(f"  left hand holds for {left.count('hold')} of 6 motions; right hand idle 1 — a fixture to hold the bag frees the left hand (motion economy: both hands work, no holding)")

print("\n# ie.video-time-study — the reading against the truth (the measure the video study keeps)")
truth = np.array([38.2, 41.0, 39.5, 40.8, 42.1, 39.0, 40.2, 41.5]); read = np.array([38.6, 40.7, 39.9, 41.2, 41.8, 39.3, 40.0, 41.9])
err = read - truth; print(f"  8 cycles: mean error {err.mean():+.2f} s, sd {err.std(ddof=1):.2f} s, max |error| {np.abs(err).max():.1f} s; the cycle mean read {read.mean():.2f} vs true {truth.mean():.2f}")
print(f"  cycles needed from footage for the mean to +/-0.5 s at 95% (s {truth.std(ddof=1):.2f}): {math.ceil((1.96*truth.std(ddof=1)/0.5)**2)}")
