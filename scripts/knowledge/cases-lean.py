"""Independent worked cases for the lean records (knowledge/methods/lean/*.md).

Run: python3 -I scripts/knowledge/cases-lean.py
Every number pasted into a record's "Worked case" comes from here.
"""
import numpy as np
from scipy import stats

print("== 5S audit (lean.five-s)")
# 5 S × 4 questions × 0–4
scores = {"Sort": [4, 3, 4, 3], "Set": [3, 3, 2, 3], "Shine": [2, 1, 2, 2], "Standardise": [3, 2, 3, 3], "Sustain": [2, 2, 3, 2]}
tot = sum(sum(v) for v in scores.values()); mx = 5 * 4 * 4
print(f"  total {tot}/{mx} = {tot/mx:.0%}")
for k, v in scores.items():
    print(f"  {k:12s} {sum(v)}/16 = {sum(v)/16:.0%}")
prev = [0.81, 0.78, 0.75, 0.72]
print(f"  previous audits {prev} -> this {tot/mx:.2f}; four falls in a row")
# two auditors on the same area: agreement
a = np.array([4,3,4,3,3,3,2,3,2,1,2,2,3,2,3,3,2,2,3,2]); b = np.array([4,3,3,3,3,2,2,3,2,2,2,2,3,2,3,2,2,2,2,2])
print(f"  two auditors same area: {a.sum()/80:.0%} vs {b.sum()/80:.0%}; exact agreement on {np.mean(a==b):.0%} of questions, within 1 on {np.mean(abs(a-b)<=1):.0%}")

print("\n== EPEI and heijunka (lean.heijunka-epei)")
avail = 7.5 * 60 * 5  # minutes a week, one shift
demand_min = {"A": 720, "B": 480, "C": 360, "D": 240}  # minutes of run time a week
co = {"A": 35, "B": 35, "C": 50, "D": 50}  # changeover into each, minutes
run = sum(demand_min.values()); spare = avail - run; sum_co = sum(co.values())
epei = sum_co / spare  # cycles per week -> interval = week / cycles
print(f"  available {avail} min/wk, run {run}, spare {spare}, changeovers one cycle {sum_co}")
print(f"  EPEI = {sum_co}/{spare} = {epei:.3f} weeks = {epei*5:.2f} working days")
co2 = {k: v/2 for k, v in co.items()}
print(f"  changeovers halved: EPEI {sum(co2.values())/spare*5:.2f} days")
# a pitch: takt × pack quantity
takt = 7.5*3600/ (12000)  # s per unit at 12,000 a shift
print(f"  takt {takt:.2f} s/unit; pitch for a case of 24 = {takt*24:.1f} s; a pallet of 1,200 = {takt*1200/60:.1f} min")
print(f"  a day of A (1/5 of 720 = 144 min) in two slots of 72 min: the box's row")

print("\n== Kanban sizing (lean.kanban-supermarket)")
D = 180  # cases of film an hour? use trays: demand 1,500 trays/shift -> per hour
D_h = 1500/7.5; L = 2.0  # hours replenishment (wait + travel + fill)
alpha = 0.15; C = 60  # trays a crate
N = D_h * L * (1+alpha) / C
print(f"  D {D_h:.0f}/h, L {L} h, alpha {alpha}, C {C}: N = {D_h*L*(1+alpha):.0f}/{C} = {N:.2f} -> {int(np.ceil(N))} kanbans; supermarket max {int(np.ceil(N))*C} trays")
print(f"  Little: WIP = {D_h:.0f}/h × {L} h = {D_h*L:.0f} trays in the loop before safety")
# FIFO lane max
fifo_hours = 0.5; print(f"  FIFO lane between oven and packing: max = rate × longest allowed wait = {D_h:.0f} × {fifo_hours} h = {D_h*fifo_hours:.0f} trays")

print("\n== Spaghetti (lean.spaghetti)")
segs = [("to film store", 42), ("back", 42), ("to case store", 28), ("back", 28), ("to scale", 9), ("back", 9)]
per_cycle = sum(d for _, d in segs); cycles = 36
pace = 1.3  # m/s loaded/crowded (MTM W-FT 5.3 TMU/ft ≈ 1.6 m/s unloaded)
print(f"  per cycle {per_cycle} m × {cycles} cycles = {per_cycle*cycles} m = {per_cycle*cycles/1000:.2f} km a shift")
t = per_cycle*cycles/pace/60
print(f"  at {pace} m/s: {t:.0f} min a shift walking; film trips {(84*cycles)/(per_cycle*cycles):.0%} of it")
print(f"  film at the line (trip 6 m each way): {(per_cycle-84+12)*cycles/1000:.2f} km; saves {(84-12)*cycles/pace/60:.0f} min a shift")

print("\n== Andon (lean.andon)")
rng = np.random.default_rng(3)
reasons = ["film change", "jam", "QA check", "label", "material short"]
counts = [9, 6, 4, 3, 1]
resp = np.concatenate([rng.gamma(2, 2, 23)])  # minutes
resolve = resp + rng.gamma(2.5, 3, 23)
print(f"  calls {sum(counts)}: " + ", ".join(f"{r} {c}" for r, c in zip(reasons, counts)))
print(f"  response median {np.median(resp):.1f} min, 90th {np.percentile(resp,90):.1f}, max {resp.max():.1f}")
print(f"  resolution median {np.median(resolve):.1f} min, 90th {np.percentile(resolve,90):.1f}")
print(f"  waiting for help in total {resp.sum():.0f} min a shift; at 110/min that is {resp.sum()*110:,.0f} packs not made if at the bottleneck")

print("\n== Kaizen event (lean.kaizen-event)")
before = np.array([44, 39, 47, 41, 43, 40, 45, 38]); after = np.array([26, 23, 25, 22, 27, 24, 23, 25])
t_, p = stats.ttest_ind(before, after, equal_var=False)
print(f"  changeover before mean {before.mean():.1f} (s {before.std(ddof=1):.1f}) n{len(before)}; after {after.mean():.1f} (s {after.std(ddof=1):.1f}); Welch t {t_:.1f}, p {p:.2g}")
print(f"  saved {before.mean()-after.mean():.0f} min a changeover × 6 a week = {(before.mean()-after.mean())*6:.0f} min/wk")
print(f"  actions: 11 raised, 8 closed at 30 days, 3 open -> {8/11:.0%} closed")
hold = np.array([25, 24, 28, 31, 30, 33])
print(f"  30-day check: last six changeovers {hold.tolist()} mean {hold.mean():.1f} — creeping back (Spearman rho {stats.spearmanr(range(6), hold)[0]:.2f})")

print("\n== Poka-yoke register (lean.poka-yoke)")
devices = 14; checks_due = 14*5; done = 62; failed = 1
print(f"  {devices} devices, weekly checks due {checks_due} a month... per week due {devices}, done {12}: 2 not checked")
print(f"  failed checks {failed} of {done} this month; zero-failure bound for 62 passes: at most {3/62:.1%} could fail at 95%")
print(f"  a label-presence sensor failed: packs since last good check = 7 h × 110/min = {7*60*110:,} to inspect")
# FC-014 worked cases for the check-log definition (src/tools/checks/defs/mistake-proofing.ts)
print(f"  exact zero-failure bound for 62 clean checks at 95%: {1-0.05**(1/62):.1%} (the 3/n rule gives {3/62:.1%})")
# case 1: sensor every 7 h passing at 0, 420, failing at 840; reader every 8 h passing at 0, 480, 960; looked at 965 min; 110/min
print(f"  FC-014 case 1: window {840-420} min x 110 = {(840-420)*110:,} packs; due 3+3, on time 6")
# case 2: weekly tools done day 0 and 7; recipe release done day 0 only; looked at day 8; grace 12 h
print("  FC-014 case 2: due 2+2 (the day-7 recipe release missed after its 12 h grace): on time 3, missed 1, 75%")

print("\n== Process flow chart (lean.process-flow-chart)")
steps = [("O",2.0,0),("T",1.5,30),("D",12,0),("O",3.5,0),("I",1.0,0),("T",2.0,45),("S",240,0),("T",1.0,20),("O",4.0,0),("D",8,0),("T",1.5,25),("O",1.5,0),("I",0.5,0),("T",1.0,20)]
from collections import Counter
cnt = Counter(s for s,_,_ in steps); tmin = {k: sum(t for s,t,_ in steps if s==k) for k in "OTIDS"}
dist = sum(d for _,_,d in steps); total = sum(t for _,t,_ in steps)
print(f"  {len(steps)} steps: " + ", ".join(f"{k} {cnt[k]}" for k in "OTIDS"))
print(f"  time {total:.0f} min; operations {tmin['O']:.0f} min = {tmin['O']/total:.0%}; storage+delay {tmin['S']+tmin['D']:.0f} min = {(tmin['S']+tmin['D'])/total:.0%}; travelled {dist} m")
print(f"  without the 240-min store: {tmin['O']/(total-240):.0%} in operations")

print("\n== P–Q and families (lean.product-family-pq)")
vol = np.array([4200, 3100, 2600, 1900, 1200, 900, 700, 500, 400, 300, 250, 200, 150, 120, 100, 80, 60, 50, 40, 30])
cum = np.cumsum(np.sort(vol)[::-1])/vol.sum()
k80 = int(np.searchsorted(cum, 0.8)+1)
print(f"  {len(vol)} products, {vol.sum():,} a week; top {k80} products = {cum[k80-1]:.0%}; top 8 = {cum[7]:.0%}")
# family matrix: steps used
steps_m = {"P1":"mix fill seal label", "P2":"mix fill seal label", "P3":"mix depose bake pack", "P4":"mix fill seal label sleeve", "P5":"mix depose bake pack", "P6":"weigh bag seal"}
def jac(a,b): a,b=set(a.split()),set(b.split()); return len(a&b)/len(a|b)
print("  Jaccard P1:P2 %.2f, P1:P4 %.2f, P1:P3 %.2f, P3:P5 %.2f, P1:P6 %.2f -> families {P1,P2,P4}, {P3,P5}, {P6} at >= 0.6" % (jac(steps_m["P1"],steps_m["P2"]), jac(steps_m["P1"],steps_m["P4"]), jac(steps_m["P1"],steps_m["P3"]), jac(steps_m["P3"],steps_m["P5"]), jac(steps_m["P1"],steps_m["P6"])))

print("\n== Eight wastes costed (lean.seven-wastes)")
rate_min = 25/60*4  # £ a minute for 4 people at £25/h -> crew cost
wastes = [("waiting (QA release)", "T", 360, "min a pallet-day"), ("transport (film from store)", "T", 48, "min a shift"), ("motion (reaching over guard)", "T", 20, "min a shift"), ("over-processing (double label check)", "T", 30, "min a shift"), ("defects (rework)", "Q", 300, "packs a shift"), ("inventory (film 6 weeks)", "H", 18000, "£ tied up"), ("over-production (short-life)", "Q", 400, "packs a week dumped")]
for n, k, q, u in wastes:
    print(f"  {n:38s} {k}  {q:>7,} {u}")
print(f"  waiting for QA: 360 min × £{rate_min:.2f}/min crew = £{360*rate_min:,.0f} a day labour, and 360 × 110 = {360*110:,} packs not made at the bottleneck")

print("\n== Toyota kata (lean.toyota-kata)")
exps = [(1, 38, 35), (2, 35, 33), (3, 33, 36), (4, 33, 31), (5, 30, 30), (6, 30, 29), (7, 30, 45)]
for n, exp, got in exps:
    print(f"  experiment {n}: expected {exp} s, got {got} s ({'as expected' if abs(got-exp)<=1 else 'learned something'})")
target = 25; print(f"  target condition {target} s by 30 Nov; current 29–30; 7 of 7 experiments recorded with a prediction")

print("\n== Maturity (lean.maturity-assessment)")
dims = {"daily management": (2, 2), "problem solving": (3, 2), "standard work": (2, 3), "visual management": (3, 3), "leader behaviours": (2, 2)}
for d, (a1, a2) in dims.items():
    print(f"  {d:20s} assessor A {a1}  B {a2}")
agree = np.mean([a1==a2 for a1,a2 in dims.values()])
print(f"  exact agreement {agree:.0%} of dimensions; mean level {np.mean([np.mean(v) for v in dims.values()]):.1f} of 5")
