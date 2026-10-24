#!/usr/bin/env python3
"""INDEPENDENT CASES — planning and food-safety records brought to full depth (24 October 2026).
Every number in a record's "Worked case" is printed here by NumPy/SciPy or plain arithmetic, never by Faultline's code."""
import math
import numpy as np
from scipy import stats

print("# planning.crew-planning — people needed on the line to people employed")
needed = 6  # per shift, from Line capacity's stations
absence, holiday, training = 0.045, 0.12, 0.02
employed = needed / (1 - absence - holiday - training)
print(f"  {needed} needed a shift; absence {absence:.1%}, holiday {holiday:.0%}, training {training:.0%} -> employed {employed:.2f} -> {math.ceil(employed)} on the roster per shift; 2 shifts -> {2*math.ceil(employed)}")
print(f"  Line capacity: 'Make it 2 people' at the Packer -> needed 7 -> employed {7/(1-absence-holiday-training):.2f} -> {math.ceil(7/(1-absence-holiday-training))}")
print(f"  cost of the roster at £14/h x 1.25 x 8 h x 5 days: £{2*math.ceil(employed)*14*1.25*8*5:,.0f} a week; short by one on a day: the station's minutes at the bottleneck")

print("\n# planning.forecast-accuracy — four products, a month of weeks")
A = np.array([[60, 58, 64, 61], [45, 52, 40, 47], [30, 28, 35, 31], [24, 26, 22, 25]], dtype=float)  # actual (k packs) products x weeks
F = np.array([[62, 62, 62, 62], [50, 50, 50, 50], [30, 30, 30, 30], [20, 20, 20, 20]], dtype=float)
err = F - A
print(f"  WMAPE = sum|A-F| / sumA = {np.abs(err).sum()/A.sum():.1%}; bias = sum(F-A)/sumA = {err.sum()/A.sum():+.1%} (over-forecast)")
for i, n in enumerate(["Maris", "Tesco", "KE", "Baby"]):
    print(f"  {n}: MAPE {np.mean(np.abs(err[i])/A[i]):.1%}, bias {err[i].sum()/A[i].sum():+.1%}, MAD {np.abs(err[i]).mean():.1f}k")
print(f"  tracking signal (Baby): cumulative error / MAD = {err[3].sum()/np.abs(err[3]).mean():.2f} (beyond +/-4 says a biased forecast)")

print("\n# planning.lot-sizing — EPQ on a packing line with SMED's changeover")
D, P, S, h = 60_000 * 48, 100 * 60 * 15 * 5 * 48, 42 / 60 * 60 * 12.0, 0.42 * 0.2  # annual demand, annual production rate, set-up cost (42 min x contribution £12/min at the bottleneck), holding £/pack/yr (20% of £0.42)
epq = math.sqrt(2 * D * S / (h * (1 - D / P)))
print(f"  D {D:,}/yr, P {P:,}/yr, set-up cost £{S:,.0f} (42 min x £12/min), holding £{h:.3f}/pack/yr -> EPQ {epq:,.0f} packs = {epq/60000:.1f} weeks of demand; runs a year {D/epq:.1f}")
S2 = 27 / 60 * 60 * 12.0; epq2 = math.sqrt(2 * D * S2 / (h * (1 - D / P)))
print(f"  with SMED's 27-min changeover: set-up £{S2:,.0f} -> EPQ {epq2:,.0f} ({epq2/60000:.1f} weeks) — shorter changeovers earn smaller lots; total cost at EPQ £{math.sqrt(2*D*S*h*(1-D/P)):,.0f}/yr vs {math.sqrt(2*D*S2*h*(1-D/P)):,.0f}")

print("\n# planning.runner-repeater-stranger — a year's weekly demand by product")
rng = np.random.default_rng(13)
prods = {"Maris 2kg": (60, 0.10), "Tesco 1.25": (45, 0.18), "KE 2.5": (30, 0.30), "Baby 1kg": (24, 0.25), "Xmas 3kg": (4, 1.6), "Hotel 5kg": (6, 0.9)}
rows = []
for n, (m, cv) in prods.items():
    d = np.clip(rng.normal(m, m * cv, 48), 0, None); rows.append((n, d.mean(), d.std(ddof=1) / d.mean(), (d > 0).mean()))
tot = sum(r[1] for r in rows)
for n, m, cv, wk in sorted(rows, key=lambda r: -r[1]):
    cls = 'runner' if m / tot > 0.15 and cv < 0.5 else 'stranger' if cv > 1.0 or wk < 0.5 else 'repeater'
    print(f"  {n:11s} share {m/tot:5.1%} CV {cv:.2f} weeks with demand {wk:.0%} -> {cls}")

print("\n# planning.schedule-adherence — a week's plan against actual by run")
plan = np.array([60, 45, 30, 24]) * 1000; actual = np.array([64, 38, 30, 20]) * 1000
att = np.minimum(actual, plan).sum() / plan.sum()
print(f"  plan {plan.tolist()}, actual {actual.tolist()}; attainment = sum min(actual, plan)/sum plan = {att:.1%} (over-production on Maris does not make up Tesco's miss); plain output/plan {actual.sum()/plan.sum():.1%}")
print(f"  misses: Tesco -7,000 (a changeover over-ran), Baby -4,000 (film short) — the Pareto of reasons; on-time runs 2 of 4")

print("\n# planning.scheduling-rules — Johnson's rule on two machines and the dispatching rules")
jobs = {"A": (4, 3), "B": (2, 6), "C": (5, 2), "D": (1, 4), "E": (3, 5)}  # hours on M1, M2
first = sorted([j for j, (a, b) in jobs.items() if a < b], key=lambda j: jobs[j][0]); last = sorted([j for j, (a, b) in jobs.items() if a >= b], key=lambda j: -jobs[j][1])
seq = first + last
def makespan(seq):
    t1 = t2 = 0
    for j in seq:
        a, b = jobs[j]; t1 += a; t2 = max(t2, t1) + b
    return t2
print(f"  Johnson's sequence {seq}: makespan {makespan(seq)} h; in the order given {makespan(list(jobs))} h")
# dispatching: EDD vs SPT on one machine
orders = {"P": (6, 10), "Q": (2, 4), "R": (4, 12), "S": (3, 6)}  # hours, due
for rule, key in [("SPT", lambda j: orders[j][0]), ("EDD", lambda j: orders[j][1])]:
    t = 0; late = 0; flow = 0
    for j in sorted(orders, key=key):
        t += orders[j][0]; flow += t; late += max(0, t - orders[j][1])
    print(f"  {rule}: order {sorted(orders, key=key)}, total lateness {late} h, mean flow time {flow/4:.1f} h")

print("\n# foodsafety.ccp-monitoring — a cook CCP, core temperature at least 75 C, 40 checks a day")
rng = np.random.default_rng(17); T = np.round(78.2 + 1.1 * rng.standard_normal(40), 1)
m, s = T.mean(), T.std(ddof=1); ppl = (m - 75) / (3 * s)
print(f"  mean {m:.2f} C, s {s:.2f}, lowest {T.min()}; one-sided Ppl against 75 C {ppl:.2f}; margin at the lowest reading {T.min()-75:.1f} C")
print(f"  with a probe bias of +0.14 C at 75 C (msa.bias-linearity-stability) the true margin is {T.min()-75-0.14:.2f}; the guard band sets the check at 75.2 on that probe")
print(f"  checks due 40, done 38 -> {38/40:.0%}; a reading under 75 -> the batch held and the deviation procedure; 0 under in 38 -> at most {1-0.05**(1/38):.1%} of batches could be under (zero-failure bound)")

print("\n# foodsafety.cooling-curves — a cooked product cooled from 60 C to 5 C, the time to each limit")
t = np.array([0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]); temp = np.array([62, 51, 42, 35, 29, 24, 19, 15, 11, 8, 6, 5, 4])
def t_at(lim):
    i = np.where(temp <= lim)[0][0]; return t[i-1] + (temp[i-1] - lim) / (temp[i-1] - temp[i]) * (t[i] - t[i-1])
print(f"  62 -> 10 C in {t_at(10):.0f} min (a common guidance window is 240 min; the site's own limit applies); 10 -> 5 C another {t_at(5)-t_at(10):.0f} min")
times = np.array([126, 131, 119, 138, 142, 128, 135, 147, 122, 133]); m, s = times.mean(), times.std(ddof=1)
print(f"  ten batches' 60->10 times: mean {m:.0f} min, s {s:.1f}; one-sided Ppu against 240 min {(240-m)/(3*s):.2f}; against a tighter 150 min limit {(150-m)/(3*s):.2f}")

print("\n# foodsafety.metal-detection-verification — test pieces, checks due, product at risk")
print("  test pieces Fe 2.0 mm, non-Fe 2.5 mm, SS 3.5 mm (the site's validated sensitivities); each passed through at the start, hourly, after any stop over 10 min, at the end — a 7 h run with 2 long stops: 1 + 7 + 2 + 1 = 11 checks x 3 pieces")
print("  a failed check at 11:00 (SS piece not rejected), last good 10:00: 60 min x 110/min = 6,600 packs held and re-run through a working detector; 10 checks a shift with 0 fails for 20 shifts (200 checks) -> at most 1.5% of checks could fail (zero-failure bound)")

print("\n# foodsafety.cleaning-verification-atp — swab results against site limits (RLU), pass/caution/fail")
rng = np.random.default_rng(19); rlu = np.round(np.exp(rng.normal(np.log(60), 0.9, 120)))
passes, caution, fail = (rlu < 150).sum(), ((rlu >= 150) & (rlu < 300)).sum(), (rlu >= 300).sum()
print(f"  120 swabs: pass {passes} ({passes/120:.0%}), caution {caution}, fail {fail} ({fail/120:.1%}); median {np.median(rlu):.0f} RLU; a log scale: the readings are lognormal, the mean is misleading")
print(f"  fails by site: the slicer blade guard 5 of 12 swabs — the Pareto; re-clean and re-swab until pass; trend the pass rate by week")

print("\n# foodsafety.environmental-monitoring — Listeria swabs by zone, positives and recurrence")
zones = {1: (24, 0), 2: (48, 2), 3: (60, 5), 4: (24, 3)}
for z, (n, pos) in zones.items(): print(f"  zone {z}: {pos} of {n} positive ({pos/n:.1%}, 95% upper {stats.beta.ppf(0.95, pos+1, n-pos):.1%})")
print("  a zone-2 positive on the same drain two months running = recurrence -> root cause (harbourage), intensified swabbing until 3 consecutive negatives")

print("\n# foodsafety.traceability-exercise — one lot, forward and back, within the time")
print("  lot 24287: 20,350 kg of raw in -> 48,000 packs; forward: 47,610 shipped to 6 customers + 310 on hold + 80 samples/destroyed = 48,000 (100.0%); back: 3 ingredient lots, 2 film reels, 1 label roll — all identified; time 2 h 40 min against the 4 h expectation")
print("  mass check: 48,000 x 0.412 kg = 19,776 kg against 20,350 in: 97.2% accounted as product; the 574 kg is the material variance (yield.material-variance)")

print("\n# foodsafety.audits — a site's audit findings")
print("  BRCGS: 1 major, 7 minors -> grade B (Issue 9: AA 0-5 minors, A 6-10, B 11-16 or 1 major + up to 10 minors — from knowledge, to confirm); 3 of the 7 minors repeat last year's (glass register, calibration records, pest control proof) -> the repeat findings are the system failure")
print("  internal audits: 24 scheduled, 21 done (88%), 38 findings, 29 closed on time (76%), mean days to close 18")

print("\n# foodsafety.shelf-life — a chilled product's study design and the margin")
days = np.array([0, 3, 6, 8, 10, 12, 14]); tvc = np.array([2.1, 2.6, 3.4, 4.2, 5.1, 6.0, 6.9])  # log10 cfu/g
lr = stats.linregress(days, tvc); limit = 7.0
print(f"  TVC log10 by day: slope {lr.slope:.3f} log/day; reaches the 7.0 log criterion at day {(limit - lr.intercept)/lr.slope:.1f}; with a 20% safety margin the life is {math.floor((limit - lr.intercept)/lr.slope * 0.8)} days; sensory and pathogen criteria run alongside")
print("  three batches x 7 pull points x duplicate = 42 samples minimum; the study at the worst-case storage (e.g. 8 C abuse) as the guidance asks")

print("\n# foodsafety.allergen-changeover — the clean validated, then verified each time")
print("  validation: 3 cleans, swabs for the allergen protein at 10 sites each (30), all below the kit's LOD -> the clean is validated for this allergen on this line; verification each changeover: visual + 3 swabs (or ATP as a proxy where validated) -> release")
print("  time: end of nut run 14:00, clean 14:00-15:10, swabs read 15:25, release 15:30 -> 90 min; SMED separates what can be prepared before 14:00 (kit, chemicals) from the clean itself")

print("\n# foodsafety.haccp — the CCP decision tree on a step")
print("  step 'metal detection': Q1 control measures exist? yes; Q2 step designed to eliminate/reduce the hazard to an acceptable level? yes -> CCP; critical limit: detect and reject Fe 2.0 / non-Fe 2.5 / SS 3.5 mm; monitoring: test pieces hourly; corrective action: hold since last good check; verification: records review, annual validation")
print("  step 'cooking': Q2 yes -> CCP, limit core >= 75 C (or equivalent time/temperature); step 'labelling allergens': in HACCP as a CCP or an OPRP by the site's choice — the plan says which")

print("\n# foodsafety.hygienic-design — findings by severity at FAT")
print("  EN 1672-2 / EHEDG review of a new slicer: 2 critical (a hollow roller, a dead leg in the CIP line), 5 major (gaps > 0.5 mm at the frame, exposed threads in the product zone), 9 minor; the criticals closed before shipment, the majors before SAT, the minors before handover — each with a photo and an owner")
