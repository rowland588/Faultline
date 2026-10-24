"""Independent worked cases for the Six Sigma and visual-management records.

Run: python3 -I scripts/knowledge/cases-sixsigma-visual.py
"""
import numpy as np
from scipy import stats

print("== Charter worth (sixsigma.charter)")
packs_wk = 48000*5; giveaway_g = 4.1; target_g = 2.0; cost_kg = 3.40
saving = (giveaway_g-target_g)/1000 * packs_wk * cost_kg * 52
print(f"  give-away {giveaway_g} g -> {target_g} g on {packs_wk:,} packs a week at £{cost_kg}/kg: £{saving:,.0f} a year")
base = np.array([4.3, 3.9, 4.0, 4.4, 4.1, 3.8, 4.2, 4.1, 4.0, 4.2])  # g, ten shifts
print(f"  baseline from 10 shifts: mean {base.mean():.2f} g, s {base.std(ddof=1):.2f}, 95% CI {base.mean()-2.26*base.std(ddof=1)/np.sqrt(10):.2f}–{base.mean()+2.26*base.std(ddof=1)/np.sqrt(10):.2f}")
print(f"  goal statement: 'reduce mean give-away on Line 3 from 4.1 g to 2.0 g by 31 March, worth £{saving/1000:.0f}k a year' — measurable, dated, costed")

print("\n== DMAIC tollgates (sixsigma.dmaic)")
gates = {"Define": "charter, SIPOC, VOC→CTQ, team — signed", "Measure": "baseline Ppk 0.6 (n 120), %GRR 12% (acceptable), data plan", "Analyse": "stratified by head (head 3 +2 g, p<0.001), 5 whys → feed vibration", "Improve": "DOE 2^3 on feed/vibration/dwell; pilot: 4.1 → 2.3 g, p<0.001", "Control": "X̄-R chart at the weigher, control plan row, standard, 8 weeks held"}
for g, d in gates.items(): print(f"  {g:8s} {d}")
print(f"  1.2% light packs: long-term Z = {stats.norm.isf(0.012):.2f}; with the +1.5 shift convention a 'sigma level' of {stats.norm.isf(0.012)+1.5:.2f} (the convention said, never assumed)")

print("\n== QFD house (sixsigma.qfd)")
needs = ["easy to open", "stays sealed to use-by", "looks fresh", "recloses"]; w = np.array([4, 5, 3, 2])
chars = ["peel force", "seal strength", "film clarity", "zipper force", "MAP O2"]
R = np.array([[9, 3, 0, 1, 0], [1, 9, 0, 3, 3], [0, 1, 9, 0, 9], [0, 1, 0, 9, 0]])  # 9-3-1-0
imp = w @ R; share = imp/imp.sum()
for c, i, s in zip(chars, imp, share): print(f"  {c:14s} importance {i:3d}  {s:.0%}")
print(f"  seal strength + peel force = {share[0]+share[1]:.0%}")

print("\n== Pugh and impact–effort (sixsigma.selection-matrices)")
crit = ["cuts breaks", "cost", "time to do", "safety", "hygiene"]; cw = np.array([5, 3, 3, 4, 4])
opts = {"film guide": [1, 1, 1, 0, 0], "reel trolley": [1, 0, 0, 1, 0], "new unwind unit": [1, -1, -1, 0, 0], "second operator": [0, -1, 1, 0, 0]}
for o, s in opts.items():
    s = np.array(s); print(f"  {o:16s} +{int((s>0).sum())} −{int((s<0).sum())} weighted {int(cw@s):+d}")
ie = {"film guide": (3, 1), "reel trolley": (3, 2), "new unwind unit": (4, 5), "second operator": (2, 2)}
for o, (i, e) in ie.items():
    q = "quick win" if i>=3 and e<=2 else "major project" if i>=3 else "fill-in" if e<=2 else "avoid"
    print(f"  {o:16s} impact {i} effort {e} -> {q}")

print("\n== VOC → CTQ and Kano (sixsigma.voc-ctq)")
ctqs = [("'easy to open'", "peel force", "8–15 N", "performance"), ("'doesn't leak'", "seal strength", "≥ 1.5 N/15 mm; leak test pass", "must-be"), ("'looks fresh'", "residual O2", "≤ 2%", "must-be"), ("'I can reseal it'", "zipper present", "yes/no", "delighter")]
for v, c, l, k in ctqs: print(f"  {v:18s} -> {c:14s} limit {l:30s} Kano {k}")
# Kano from paired questions: functional like / dysfunctional expect -> performance etc.
print("  Kano classification by the functional/dysfunctional pair: like+dislike = performance; expect+dislike = must-be; like+neutral = delighter")

print("\n== Action tiles (visual.action-tracking)")
today = 20
actions = [("Dave", 18, False), ("Dave", 23, False), ("Dave", 15, False), ("Priya", 19, False), ("Priya", 25, False), ("Sam", 12, True), ("Sam", 21, False), ("—", 22, False)]
open_ = [a for a in actions if not a[2]]; late = [a for a in open_ if a[1] < today]; soon = [a for a in open_ if today <= a[1] <= today+3]
print(f"  open {len(open_)}, late {len(late)}, due in 3 days {len(soon)}, nobody yet {sum(1 for a in open_ if a[0]=='—')}")
from collections import Counter
print("  by person late: " + ", ".join(f"{k} {v}" for k, v in Counter(a[0] for a in late).items()))
print(f"  closed this week {sum(1 for a in actions if a[2])}; the oldest late is {today-min(a[1] for a in late)} days over")

print("\n== Hour-by-hour (visual.daily-management)")
plan = 480; actual = [470, 480, 410, 475, 300, 480, 465, 455]; reasons = ["", "", "film change ran over", "", "breakdown — sealer jaw", "", "short stops", "label reel"]
gap = [plan-a for a in actual]
for h, (a, g, r) in enumerate(zip(actual, gap, reasons), 7): print(f"  {h:02d}:00  {a} of {plan}  gap {g:3d}  {r}")
print(f"  shift {sum(actual):,} of {plan*8:,} = {sum(actual)/(plan*8):.0%}; gap {sum(gap)} packs, {sum(gap)/sum(gap) if False else ''}the sealer jaw hour is {gap[4]/sum(gap):.0%} of it")

print("\n== Gemba freshness (visual.gemba-walk)")
for d in [2, 9, 16]:
    level = 'stale' if d > 14 else 'fading' if d > 7 else 'fresh'
    print(f"  last looked {d} days ago -> {level}")
print("  walks a week per line against the standard (daily by the team leader, weekly by the manager); observations raised and closed")

print("\n== KPI tree (visual.kpi-tree)")
labour, giveaway, waste, energy, film = 9.0, 4.0, 3.0, 2.5, 12.5  # pence a pack
cost = labour+giveaway+waste+energy+film
t = {"labour": 8.0, "giveaway": 2.0, "waste": 2.5, "energy": 2.5, "film": 12.5}
print(f"  cost a pack {cost:.1f}p = labour {labour} + give-away {giveaway} + waste {waste} + energy {energy} + film {film}; target {sum(t.values()):.1f}p")
now = {"labour": 8.1, "giveaway": 3.6, "waste": 2.4, "energy": 2.5, "film": 12.5}
for k in t: print(f"  {k:9s} target {t[k]:4.1f}p now {now[k]:4.1f}p  {'on track' if now[k] <= t[k]+0.2 else 'off track'}")
print(f"  give-away is {(now['giveaway']-t['giveaway'])/(sum(now.values())-sum(t.values())):.0%} of the remaining gap")

print("\n== Ask (visual.ask-formulas)")
rate = 110; hours = 7.5; losses_share = 0.18; demand = 32000; extra = 6000
can = rate*60*hours*(1-losses_share)
print(f"  can make a shift: {rate}/min × {hours} h × (1 − {losses_share}) = {can:,.0f}; demand {demand:,} + extra {extra:,} = {demand+extra:,}; spare {can-demand-extra:,.0f} packs = {(can-demand-extra)/(rate*60*(1-losses_share)):.1f} h -> fits")
print("  a question outside the five shapes is said to be outside — nothing guessed")
