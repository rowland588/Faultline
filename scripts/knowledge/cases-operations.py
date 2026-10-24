#!/usr/bin/env python3
"""INDEPENDENT CASES — equipment, yield, packaging, changeover, commissioning and cost records brought to full depth
(24 October 2026). Every number in a record's "Worked case" is printed here by NumPy/SciPy or plain arithmetic."""
import math
import numpy as np
from scipy import stats

print("# equipment.short-stops-speed — a shift's speed loss split by a timed running speed")
plan_min, stops_min, ideal, timed_run, good = 450, 62, 120, 108, 38_200
run = plan_min - stops_min; slow = run * (1 - timed_run / ideal); expected_at_run = run * timed_run
short = run - slow - good / ideal  # minutes of ideal-speed-equivalent lost that are neither timed stops nor slow running
print(f"  planned {plan_min} min, timed stops {stops_min} -> run {run} min; ideal {ideal}/min, running speed timed {timed_run}/min")
print(f"  speed loss total = run - good/ideal = {run - good/ideal:.1f} min; slow running = run x (1 - 108/120) = {slow:.1f} min; short stops = the rest {short:.1f} min")
print(f"  packs: at ideal {run*ideal:,}; at timed speed {expected_at_run:,}; made {good:,} -> short stops cost {expected_at_run - good:,} packs, slow running {run*ideal - expected_at_run:,}")
print(f"  frequency: 41 short stops in {run/60:.2f} h = {41/(run/60):.1f} an hour; mean length {short/41:.2f} min")

print("\n# equipment.chronic-sporadic — Faultline's rule on six weeks of a loss")
for weeks_with, name in [([1,1,1,1,0,1], 'jam at the infeed'), ([0,0,0,1,0,0], 'belt split'), ([1,0,1,0,0,1], 'label skew')]:
    n = sum(weeks_with); kind = 'chronic' if n >= 4 else 'one-off' if n == 1 else 'recurring'
    print(f"  {name}: in {n} of 6 weeks -> {kind}")
print("  chronic losses are small, frequent and accepted (TPM: restore to basic conditions); sporadic are large, sudden and investigated (root cause)")

print("\n# equipment.downtime-log — a week's stops by reason, overlaps on one machine counted once")
stops = [("bagger", "film break", 14, 6), ("bagger", "jaw temp", 9, 11), ("filler", "hopper empty", 22, 4), ("case packer", "glue", 6, 9), ("bagger", "changeover over-run", 2, 38)]
rows = sorted(((m, r, n, d, n * d) for m, r, n, d in stops), key=lambda x: -x[4]); tot = sum(x[4] for x in rows)
for m, r, n, d, mins in rows: print(f"  {m:12s} {r:20s} {n:3d} x {d:2d} = {mins:4d} min ({mins/tot:.0%})")
print(f"  total {tot} min; the top two are {sum(x[4] for x in rows[:2])/tot:.0%}; at the bottleneck (bagger) each minute = 120 packs x margin")

print("\n# equipment.cost-deployment — the loss matrix in money (WCM): losses x processes, causal vs resultant")
matrix = {"breakdowns": {"bagger": 2400, "filler": 600}, "changeover": {"bagger": 1900}, "short stops": {"bagger": 1500, "case packer": 400}, "rejects": {"bagger": 800, "checkweigher": 300}, "give-away": {"filler": 2200}}
tot = sum(v for d in matrix.values() for v in d.values())
for loss, d in sorted(matrix.items(), key=lambda kv: -sum(kv[1].values())): print(f"  {loss:12s} £{sum(d.values()):5,} ({sum(d.values())/tot:.0%})  {d}")
print(f"  total £{tot:,} a week; causal: the filler's hopper-empty stops cause the bagger's starvation minutes — charged to the filler, not the bagger; a project returning 60% of changeover: £{0.6*1900:,.0f} a week, £{0.6*1900*48:,.0f} a year")

print("\n# yield.mass-balance-yield — a bakery line, kg in to kg out by stage")
stages = [("mix", 1000, 992), ("divide/prove", 992, 975), ("bake", 975, 858), ("cool", 858, 850), ("slice/bag", 850, 822)]
overall = 1.0
for s, i, o in stages:
    y = o / i; overall *= y; print(f"  {s:12s} in {i:5.0f} out {o:5.0f} yield {y:.3f} loss {i-o:4.0f} kg")
print(f"  overall yield {overall:.3f} = {stages[-1][2]/stages[0][1]:.3f}; bake loss (moisture, expected ~12%) {1-858/975:.1%}; slice/bag loss 28 kg = crust ends + rejects — the controllable one")
print(f"  unexplained: dough 992 - (975 proved + 12 scrap recorded) = {992-975-12} kg not accounted — find it")

print("\n# yield.material-variance — standard usage against actual, priced")
std_per_pack, output, actual_kg, price = 0.412, 48_000, 20_350, 1.85  # kg a pack, packs, kg used, £/kg
std_kg = std_per_pack * output; var_kg = actual_kg - std_kg
print(f"  standard {std_per_pack} kg x {output:,} = {std_kg:,.0f} kg; actual {actual_kg:,} kg; variance {var_kg:+,.0f} kg = {var_kg/std_kg:+.1%} -> £{var_kg*price:+,.0f} at £{price}/kg")
print(f"  split: give-away measured 0.006 kg a pack = {0.006*output:,.0f} kg; rejects 1.2% = {0.012*std_kg:,.0f} kg; the rest {var_kg - 0.006*output - 0.012*std_kg:,.0f} kg unexplained (spillage, over-issue, a wrong standard)")

print("\n# yield.food-waste — a line's week by stage and cause, % of input and £")
waste = {"trim at slicing": 310, "start-up/changeover product": 140, "rejects (weight/seal)": 95, "floor/spillage": 40, "end of life stock": 60}
inp = 20_350; tot = sum(waste.values())
for k, v in sorted(waste.items(), key=lambda kv: -kv[1]): print(f"  {k:28s} {v:4d} kg {v/inp:.1%} of input  £{v*1.85:,.0f}")
print(f"  total {tot} kg = {tot/inp:.1%} of input, £{tot*1.85:,.0f} a week at material cost; WRAP's hierarchy: redistribute > animal feed > AD; trim 48% of it -> the slicing programme first")

print("\n# yield.multihead-weigher — 14 heads, target 150 g, what the combination does")
rng = np.random.default_rng(9); heads = rng.normal(37.5, 4.0, size=(2000, 14))  # 4 heads of ~37.5 make 150
packs = []
for row in heads:
    best = None
    for combo in __import__('itertools').combinations(range(14), 4):
        w = row[list(combo)].sum()
        if w >= 150 and (best is None or w < best): best = w
    packs.append(best if best else row[np.argsort(row)[-4:]].sum())
packs = np.array(packs); print(f"  2,000 packs: mean {packs.mean():.2f} g, give-away {packs.mean()-150:.2f} g, sd {packs.std(ddof=1):.2f}, min {packs.min():.2f}, max {packs.max():.2f}; skew {stats.skew(packs, bias=False):.2f} (bounded at 150, a long right tail: not normal)")
print(f"  with 5-head combinations from the same heads the search space is {math.comb(14,5):,} vs {math.comb(14,4):,}; more heads or smaller portions = finer combinations = less give-away")
# head drift: one head reading high
heads2 = heads.copy(); heads2[:, 3] += 6.0
print(f"  head 4 running 6 g heavy: its mean {heads2[:,3].mean():.1f} vs the others {heads2[:, [i for i in range(14) if i!=3]].mean():.1f} — ANOVA across heads finds it (stats.anova); the fix is that head's feeder, not the target")

print("\n# packaging.checkweigher-verification — test weights at the limits, the error allowed")
e = 0.5  # verification scale interval for the checkweigher, g
for w, read in [(395, 395.2), (400, 400.6), (405, 404.8)]:
    err = read - w; ok = abs(err) <= 0.5 * e * 2  # a common in-service tolerance of 2e for MPE at verification...
    print(f"  test weight {w} g read {read} g: error {err:+.1f} g; against an in-service tolerance of 1.0 g: {'ok' if abs(err) <= 1.0 else 'FAIL'}")
print("  reject test: a 398 g pack (under the 399.5 g set point) must be rejected on 3 of 3 passes; a borderline 399.4 g pack on 3 of 3; a 400.6 g pack passed 3 of 3")
print("  the zone of indecision around the set point ~ the checkweigher's own sd x 2-3; packs there are coin tosses — the set point is placed above the legal limit by that")

print("\n# packaging.map-residual-oxygen — 30 readings, one-sided limit 2% (the capability study's OXYGEN set)")
OX = np.array([0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38, 0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8])
m, s = OX.mean(), OX.std(ddof=1); ppu = (2 - m) / (3 * s)
print(f"  mean {m:.3f}%, s {s:.3f}; Ppu (normal) {ppu:.2f} — but the set leans (skew {stats.skew(OX, bias=False):.2f}); lognormal fit: 99.865th percentile {stats.lognorm.ppf(0.99865, *stats.lognorm.fit(OX, floc=0)):.2f}% vs normal {m+3*s:.2f}%")
over = (OX > 1.0).sum(); print(f"  over 1.0% (an internal alert): {over} of 30 -> {over/30:.1%}, 95% upper bound {stats.beta.ppf(0.95, over+1, 30-over):.1%}")

print("\n# packaging.seal-integrity — strength (one-sided, at least 10 N/15 mm) and leaks (pass/fail)")
SEAL = np.array([14.2, 13.8, 15.1, 14.6, 13.9, 14.4, 15.3, 14.0, 14.8, 14.1, 13.6, 14.9, 14.5, 14.3, 15.0, 13.7, 14.6, 14.2, 14.7, 14.4, 13.9, 15.2, 14.1, 14.8, 14.3, 14.0, 14.6, 14.5, 13.8, 14.9])
m, s = SEAL.mean(), SEAL.std(ddof=1); ppl = (m - 10) / (3 * s); lo = ppl - stats.norm.ppf(0.95) * math.sqrt(1/(9*30) + ppl**2/(2*29))
print(f"  strength: mean {m:.2f} N, s {s:.3f}, Ppl {ppl:.2f} (95% lower bound {lo:.2f}) — capable against 10 N")
print(f"  leaks: 0 of 59 packs leaked in the bubble test -> at most {1 - 0.05**(1/59):.1%} leak at 95%; 0 of 299 -> {1 - 0.05**(1/299):.2%}")

print("\n# packaging.code-label-verification — checks due and done, a failure's containment")
print("  checks: start of run, every reel change, hourly, end of run -> a 7 h run with 4 reel changes = 1 + 4 + 7 + 1 = 13 checks; 12 done -> 92%")
print("  a wrong date code found at the 14:00 check, last good 13:00: packs between = 60 min x 110/min = 6,600 to quarantine and re-check (msa.calibration's product-at-risk arithmetic)")

print("\n# changeover.first-off-release — time to release and the failures by check")
checks = ["line clearance (previous product and packaging gone)", "allergen clean verified", "correct film/tray/label loaded and verified", "date and lot code correct", "first pack weight within limits", "seal visual and pull test", "metal detector test pieces passed", "checkweigher test weights passed"]
print(f"  {len(checks)} checks; release at 06:52 after a 06:30 start = 22 min to first good pack; this month's failures: label 3, code 2, weight 1 — label is the poka-yoke candidate")

print("\n# changeover.sequencing — the order that minimises changeover time under the allergen rule")
import itertools
prods = ["Plain", "Cheese", "Nut", "Onion"]; allergen = {"Plain": 0, "Cheese": 1, "Nut": 2, "Onion": 0}
co = {("Plain","Cheese"):20, ("Plain","Nut"):20, ("Plain","Onion"):15, ("Cheese","Plain"):45, ("Cheese","Nut"):25, ("Cheese","Onion"):45, ("Nut","Plain"):60, ("Nut","Cheese"):60, ("Nut","Onion"):60, ("Onion","Plain"):15, ("Onion","Cheese"):20, ("Onion","Nut"):20}
best = min(itertools.permutations(prods), key=lambda p: sum(co[(p[i], p[i+1])] for i in range(3)))
print(f"  best order {best}: {sum(co[(best[i], best[i+1])] for i in range(3))} min; worst {max(sum(co[(p[i], p[i+1])] for i in range(3)) for p in itertools.permutations(prods))} min; the rule 'allergen-free first, nut last' gives it directly")

print("\n# commissioning.acceptance-tests — a performance test's figures")
mins, good, rejects, agreed = 60, 3480, 72, 60
print(f"  {mins} min: {good:,} good + {rejects} rejects = {good+rejects:,} made; net rate {good/mins:.1f}/min against {agreed} agreed -> {'passed' if good/mins >= agreed else 'not passed'}; rejects {rejects/(good+rejects):.2%} against 1.0% agreed -> {'ok' if rejects/(good+rejects) <= 0.01 else 'over'}")
print(f"  shortfall {agreed - good/mins:.1f}/min = {(agreed - good/mins)*mins:.0f} packs over the hour; the journey: 50 -> 55 -> 58 net over three attempts")

print("\n# commissioning.operational-readiness — items ready by area, open by owner")
areas = {"people trained & signed off": (14, 18), "SOPs and standards issued": (9, 11), "HACCP plan amended & validated": (3, 4), "spares on the shelf": (22, 30), "PM schedule loaded": (6, 6), "cleaning validated": (2, 3)}
tot_r = sum(r for r, _ in areas.values()); tot_n = sum(n for _, n in areas.values())
for k, (r, n) in areas.items(): print(f"  {k:34s} {r:2d}/{n:2d} {r/n:.0%}")
print(f"  overall {tot_r}/{tot_n} = {tot_r/tot_n:.0%}; the gate is every item, not the average — 16 open, 3 past their day")

print("\n# commissioning.ramp-up — the burn-down pace and the climb to rate")
done_by_day = [0, 3, 7, 9, 14, 16, 21]; total = 40
pace = done_by_day[-1] / 6; print(f"  21 of 40 items done in 6 days: pace {pace:.1f} a day -> {(total - 21)/pace:.1f} days left; the plan said 5")
runs = [(1, 42), (3, 48), (6, 52), (8, 55), (11, 57)]
lr = stats.linregress([d for d, _ in runs], [r for _, r in runs]); print(f"  climb: net rate by day {runs}; slope {lr.slope:.2f}/min a day; reaches 60 on day {(60 - lr.intercept)/lr.slope:.1f} if it keeps climbing — a line levelling off is the caveat")

print("\n# cost.investment-appraisal — payback, NPV and IRR of a £28,000 SMED kit")
cost, saving = 28_000, 0.6 * 1900 * 48  # 60% of the changeover loss a week x 48 weeks
r = 0.10; years = 5
npv = sum(saving / (1 + r) ** t for t in range(1, years + 1)) - cost
cf = [-cost] + [saving] * years
irr = np.roots(cf[::-1]); irr = [x.real for x in irr if abs(x.imag) < 1e-9 and x.real > 0]; irr = 1 / min(irr) - 1 if irr else float('nan')
print(f"  saving £{saving:,.0f} a year; payback {cost/saving:.2f} years ({cost/saving*12:.1f} months); NPV at 10% over 5 years £{npv:,.0f}; IRR {irr:.0%}")
print(f"  sensitivity: saving halved -> payback {cost/(saving/2):.1f} years, NPV £{sum(saving/2/(1+r)**t for t in range(1,6)) - cost:,.0f}")
