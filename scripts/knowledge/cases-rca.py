"""Independent worked cases for the RCA records (knowledge/methods/rca/*.md).

Run: python3 -I scripts/knowledge/cases-rca.py
"""
import numpy as np
from scipy import stats

print("== Fault tree (rca.fault-tree)")
# Top event: a metal contaminant reaches a pack. 
# T = (contaminant present) AND (detector fails to remove)
# detector fails to remove = (misses: sensitivity drift OR product effect) OR (detects AND reject fails AND no reject-confirm)
p_contam = 0.002   # per pack, contaminant present (from history)
p_drift, p_effect = 0.01, 0.005
p_reject_fail, p_no_confirm = 0.02, 0.5  # reject arm fails; reject-confirm sensor absent/bypassed half the time
p_miss = 1 - (1-p_drift)*(1-p_effect)
p_reject_path = (1-p_miss) * p_reject_fail * p_no_confirm
p_fail_remove = 1 - (1-p_miss)*(1-p_reject_path)
p_top = p_contam * p_fail_remove
print(f"  miss (OR of drift, product effect) = {p_miss:.4f}")
print(f"  detected AND reject fails AND no confirm = {p_reject_path:.4f}")
print(f"  detector fails to remove = {p_fail_remove:.4f}; top = {p_contam} × {p_fail_remove:.4f} = {p_top:.2e} per pack")
print(f"  at 48,000 packs a day: {p_top*48000:.2f} contaminated packs a day expected -> {1/(p_top*48000):.1f} days between")
cut_sets = {"contam & drift": p_contam*p_drift, "contam & effect": p_contam*p_effect, "contam & detected & reject fails & no confirm": p_contam*p_reject_path}
for k, v in sorted(cut_sets.items(), key=lambda kv: -kv[1]):
    print(f"  cut set {k:48s} {v:.2e}  ({v/p_top:.0%} of top)")
# with reject-confirm always on
p_reject_path2 = (1-p_miss) * p_reject_fail * 0.0
p_fail2 = 1 - (1-p_miss)*(1-p_reject_path2)
print(f"  reject-confirm always working: top {p_contam*p_fail2:.2e} ({(1-p_fail2/p_fail_remove):.0%} lower)")

print("\n== Stratification (rca.stratification)")
# rejects by shift × product (counts out of packs)
table = np.array([[120, 80], [230, 90]])  # rows: day, night; cols: product A, product B — rejects
packs = np.array([[24000, 16000], [24000, 16000]])
rates = table/packs
print("  reject per 1,000: day A %.1f, day B %.1f, night A %.1f, night B %.1f" % tuple((rates*1000).ravel()))
chi2, p, dof, exp = stats.chi2_contingency(table)
print(f"  chi-square on the counts {chi2:.1f}, dof {dof}, p {p:.3g} — shift and product are not independent")
# two-proportion: night A vs day A
def ztest(x1, n1, x2, n2):
    p1, p2 = x1/n1, x2/n2; pp = (x1+x2)/(n1+n2); se = np.sqrt(pp*(1-pp)*(1/n1+1/n2)); z = (p1-p2)/se
    return z, 2*stats.norm.sf(abs(z))
z, pz = ztest(230, 24000, 120, 24000)
print(f"  night A vs day A: {230/24:.1f} vs {120/24:.1f} per 1,000, z {z:.1f}, p {pz:.2g}")
z2, pz2 = ztest(90, 16000, 80, 16000)
print(f"  night B vs day B: {90/16:.1f} vs {80/16:.1f} per 1,000, z {z2:.2f}, p {pz2:.2f} — no difference")
# ANOVA on weights by head (means)
rng = np.random.default_rng(7)
heads = [rng.normal(202.0, 1.5, 30), rng.normal(202.2, 1.5, 30), rng.normal(204.1, 1.5, 30), rng.normal(201.9, 1.5, 30)]
F, pa = stats.f_oneway(*heads)
print(f"  weights by head: means {[float(round(h.mean(),1)) for h in heads]}, F {F:.1f}, p {pa:.2g} — head 3 heavy")
# multiple comparisons warning
k = 12; print(f"  splitting {k} ways at 5%: chance at least one 'significant' by luck = {1-(0.95**k):.0%}; Bonferroni per-test 5%/{k} = {5/k:.2f}%")

print("\n== PDCA before → after (rca.pdca)")
before_breaks = np.array([6, 8, 5, 9, 7, 6, 8, 7])  # film breaks a shift, 8 shifts
after_breaks = np.array([3, 2, 4, 2, 3, 1, 3, 2])
expected = 0.30
got = 1 - after_breaks.mean()/before_breaks.mean()
# Poisson rate comparison
# exact conditional test: given the total, the after count is binomial with p = n_after/(n_after+n_before)
res = stats.binomtest(int(after_breaks.sum()), int(after_breaks.sum()+before_breaks.sum()), 0.5)
print(f"  before {before_breaks.mean():.1f} a shift ({before_breaks.sum()} in 8), after {after_breaks.mean():.1f} ({after_breaks.sum()} in 8); expected −{expected:.0%}, got −{got:.0%}")
print(f"  rate test (Poisson, score) p {res.pvalue:.2g}; ratio {after_breaks.sum()/before_breaks.sum():.2f}")
hold = np.array([2, 3, 2, 3, 3, 2, 4, 2, 3, 3, 2, 3, 2, 2, 3, 3, 2, 3, 3, 2])  # 4 weeks of shifts
print(f"  holding over 20 shifts: mean {hold.mean():.1f}, max {hold.max()}, none above the before's minimum ({before_breaks.min()}) -> held")
# c-chart limits from the after period for holding
cbar = hold.mean(); ucl = cbar + 3*np.sqrt(cbar)
print(f"  c-chart from the after period: centre {cbar:.1f}, UCL {ucl:.1f}; a shift at {int(np.ceil(ucl))}+ breaks says it slipped")

print("\n== Is / is not (rca.is-is-not)")
spec = [("What", "leaking seals on 400 g trays", "200 g trays, flow-wrap packs"), ("Where", "lane 3 of the tray sealer", "lanes 1, 2, 4"), ("When", "since Tuesday 14:00, every shift", "before Tuesday; not at start-up only"), ("Extent", "3.2% of lane-3 packs; steady", "0.3% on other lanes; not rising")]
for q, is_, isnot in spec:
    print(f"  {q:7s} IS: {is_:40s} IS NOT: {isnot}")
print("  distinction: lane 3 only, since Tuesday 14:00 — change: new sealing jaw fitted on lane 3 Tuesday 13:30")
print("  test: 'jaw temperature low' explains lane 3 and Tuesday only if the new jaw's heater differs — check it; 'film batch' fails: film is shared by all lanes")

print("\n== Horizontal deployment (rca.horizontal-deployment)")
lines_with_machine = ["Line 1", "Line 3", "Line 4", "Line 7"]; proved_on = "Line 3"
offered = [l for l in lines_with_machine if l != proved_on]; taken = ["Line 1"]; proved = []
print(f"  proved on {proved_on}; same machine on {', '.join(offered)}; taken {taken}; proved there {proved or 'none yet'}")
print(f"  the fix's worth on Line 3: 5 fewer breaks a shift × 4 min × £1.67/min crew = £{5*4*1.67:.0f} labour a shift, plus 5×4×110 = {5*4*110:,} packs if at the bottleneck")
print(f"  offered lines' potential at their own break rates (Line 1: 4/shift, Line 4: 2, Line 7: 6) — ranked 7, 1, 4")

print("\n== 8D timeline (rca.eight-d)")
d = {"D0 symptom / emergency response": 0, "D1 team": 1, "D2 problem described (is/is-not)": 1, "D3 containment": 1, "D4 root cause verified": 9, "D5 corrective action chosen": 12, "D6 implemented and verified": 19, "D7 prevention (FMEA, control plan, yokoten)": 26, "D8 closed, team recognised": 30}
for k, v in d.items(): print(f"  day {v:2d}  {k}")
print(f"  containment: 14 pallets held (D3) = 14 × 1,200 × £0.42 = £{14*1200*0.42:,.0f} tied up; verification: 0 leakers in 6 weeks on lane 3 at 0.3% before -> expected {0.003*6*5*24000/4:.0f} at the old rate on the lane")

print("\n== A3 (rca.a3)")
print("  one page: background · current condition (the chart) · target · analysis (the fishbone / 5 whys) · countermeasures (who, when) · plan · follow-up (did it work)")
print("  target: leakers 3.2% -> 0.3% on lane 3 by 14 Nov; follow-up 28 Nov: 0.2% over four weeks — held")
