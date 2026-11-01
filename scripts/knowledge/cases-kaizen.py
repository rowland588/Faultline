"""Independent worked cases for the Kaizen event's Observe tools (1 November 2026).

Run: python3 -I scripts/knowledge/cases-kaizen.py       (plain Python — no numpy needed)
Every number a unit test, a specification or an acceptance script of these tools holds comes from here,
worked by hand from the formulas of the knowledge records and the sources they name — never from the code.

  W  FC-005 the waste walk       knowledge/methods/lean/seven-wastes.md          (money by problemCost's own model)
  F  FC-003 the process flow chart knowledge/methods/lean/process-flow-chart.md (ILO / Niebel; ASME 101)
  S  FC-004 the spaghetti diagram knowledge/methods/lean/spaghetti.md            (ILO string diagram; MTM-1 walking)
  C  FC-021 the cycles a time study needs   knowledge/methods/ie/video-time-study.md  (n' = (40*sqrt(n*sum(x^2)-(sum x)^2)/sum x)^2)
"""
from math import sqrt, ceil, floor, hypot

def money(x): return f"£{x:,.2f}"

print("== W  waste walk (FC-005): a packing line, crew 4 at £25 an hour, rated 110 packs a minute, margin £0.20 a pack, materials £0.50 a pack, bottleneck Packer")
crew, rate, speed, margin, mats = 4, 25.0, 110, 0.20, 0.50
lab_min = crew * rate / 60                 # £ a minute of the crew's labour
rows = [  # (waste, what, machine, minutes a day, rejects a day, packs held)
  ("waiting",        "pallets wait for QA release",  "Packer",   360, 0,   0),
  ("transport",      "film walked from the store",   "Labeller", 48,  0,   0),
  ("motion",         "reaching over a guard",        "Labeller", 20,  0,   0),
  ("overprocessing", "a double label check",         "Labeller", 30,  0,   0),
  ("defects",        "light packs reworked",         "Sealer",   0,   300, 0),
  ("inventory",      "packs held warm for release",  "Chiller",  0,   0,   36000),
  ("overproduction", "short-life product dumped",    "Wrapper",  0,   80,  0),  # 400 a week over five days
]
tot = {}
for w, what, m, mins, rej, held in rows:
    lab = mins * lab_min
    stops = (m == "Packer")
    packs = mins * speed if stops else 0
    contrib = packs * margin
    mat = rej * mats
    tied = held * mats
    flow = lab + contrib + mat
    tot[w] = (lab, packs, contrib, mat, tied, flow)
    print(f"  {w:15s} {m:9s} labour {money(lab):>10s}  packs lost {packs:>7,}  contribution {money(contrib):>10s}  materials {money(mat):>8s}  tied up {money(tied):>10s}  flow {money(flow)}")
order = sorted(tot, key=lambda k: (-tot[k][5], -tot[k][4]))
print("  ranked by what is lost a day, then money tied up:", " > ".join(order))
by_place = {}
for w, what, m, *_ in rows:
    by_place[m] = by_place.get(m, 0) + tot[w][5]
print("  by place, £ a day:", ", ".join(f"{m} {money(v)}" for m, v in sorted(by_place.items(), key=lambda kv: -kv[1])))

print("\n== F  process flow chart (FC-003): the record's tray from the oven to the despatch pallet, 14 steps")
steps = [("O",2.0,0),("T",1.5,30),("D",12,0),("O",3.5,0),("I",1.0,0),("T",2.0,45),("S",240,0),("T",1.0,20),("O",4.0,0),("D",8,0),("T",1.5,25),("O",1.5,0),("I",0.5,0),("T",1.0,20)]
total = sum(t for _, t, _ in steps)
cnt = {k: sum(1 for s, _, _ in steps if s == k) for k in "OTIDS"}
tm = {k: sum(t for s, t, _ in steps if s == k) for k in "OTIDS"}
dist = sum(d for _, _, d in steps)
print(f"  {len(steps)} steps {cnt}; time {total} min {tm}; travelled {dist} m")
print(f"  operations {tm['O']/total:.4f} of all time; delay+storage {(tm['D']+tm['S'])/total:.4f}; operations without the 240-min storage {tm['O']/(total-240):.4f}")
print(f"  steps that change the product {cnt['O']} of {len(steps)} = {cnt['O']/len(steps):.4f}; longest transport {max(d for _,_,d in steps)} m")
# a proposed chart: the first delay and the inspection after it removed, the two longest transports cut to 10 m
after = [("O",2.0,0),("T",1.5,30),("O",3.5,0),("T",2.0,10),("S",240,0),("T",1.0,20),("O",4.0,0),("D",8,0),("T",1.5,10),("O",1.5,0),("I",0.5,0),("T",1.0,20)]
print(f"  proposed: {len(after)} steps, {sum(t for _,t,_ in after)} min, {sum(d for *_,d in after)} m (saves {len(steps)-len(after)} steps, {total-sum(t for _,t,_ in after)} min, {dist-sum(d for *_,d in after)} m)")
# money: non-operation minutes at the crew's labour; a delay or storage on the bottleneck holds the line
print(f"  a transport/inspection minute at £{lab_min:.4f} a minute: transports {tm['T']} min = {money(tm['T']*lab_min)}, inspections {tm['I']} min = {money(tm['I']*lab_min)} (labour of the person moving it)")

print("\n== S  spaghetti (FC-004): the record's packer — film store, case store and scale, there and back, 36 cycles a shift")
legs = [("to film store",42),("back",42),("to case store",28),("back",28),("to scale",9),("back",9)]
per_cycle = sum(d for _, d in legs); cycles = 36
shift_m = per_cycle * cycles
for pace in (1.3, 1.6):
    print(f"  per cycle {per_cycle} m, a shift {shift_m} m = {shift_m/1000:.3f} km; at {pace} m/s {shift_m/pace/60:.2f} min a shift")
film = 84 * cycles
print(f"  film trips {film} m = {film/shift_m:.4f} of the walk")
after_legs = per_cycle - 84 + 12
print(f"  film staged at the line (6 m each way): per cycle {after_legs} m, a shift {after_legs*cycles} m = {after_legs*cycles/1000:.3f} km; saves {(84-12)*cycles/1.3/60:.2f} min a shift at 1.3 m/s")
print(f"  at £{rate:.2f} an hour (one packer): the saved minutes are worth {money((84-12)*cycles/1.3/60 * rate/60)} a shift")
# coordinates: a store at (0,0), the line at (30,0), the scale at (30,16): straight-line legs
pts = [("line",(30,0)),("film store",(0,0)),("line",(30,0)),("scale",(30,16)),("line",(30,0))]
d = [hypot(b[1][0]-a[1][0], b[1][1]-a[1][1]) for a, b in zip(pts, pts[1:])]
print("  straight-line legs from coordinates:", [round(x, 3) for x in d], "total", round(sum(d), 3))
d3 = hypot(3, 4); print("  3-4-5 leg:", d3)

print("\n== C  cycles a time study needs (FC-021): the stopwatch rule on the footage's cycles, 95% confidence and ±5% (Niebel; the record's formula)")
def need(xs, e=0.05):
    n = len(xs); s = sum(xs); s2 = sum(x * x for x in xs)
    return (40 * sqrt(n * s2 - s * s) / s) ** 2 if e == 0.05 else (2 * sqrt(n * s2 - s * s) / (e * s)) ** 2 * 100 / 100
cy = [40.1, 41.8, 39.6, 42.4, 40.9, 41.2, 39.9, 43.0, 40.4, 41.1]
n = len(cy); s = sum(cy); s2 = sum(x * x for x in cy)
mean = s / n; sd = sqrt((s2 - s * s / n) / (n - 1))
nprime = (40 * sqrt(n * s2 - s * s) / s) ** 2
print(f"  cycles {cy}: mean {mean:.4f} s, s {sd:.4f} s, n' = {nprime:.4f} -> {ceil(nprime)} cycles for ±5% at 95% (have {n})")
# the t-based version the record also gives: n = (t * s / (0.05 * mean))^2 with t(0.975, 9) = 2.2622
t = 2.262157
print(f"  t-based: n = (t*s/(0.05*mean))^2 = {(t*sd/(0.05*mean))**2:.4f}")
cy2 = [38.0, 38.2, 37.9, 38.1, 38.0, 38.3, 37.8, 38.1, 38.0, 38.2]
n2 = len(cy2); s_2 = sum(cy2); q2 = sum(x*x for x in cy2)
print(f"  steady station: n' = {(40*sqrt(n2*q2 - s_2*s_2)/s_2)**2:.4f}")
# standard time from footage: observed mean x reviewer's rating x (1 + allowances)
rating, allow = 1.10, 0.15
print(f"  observed {mean:.4f} s x rating {rating} = basic {mean*rating:.4f} s; x (1+{allow}) = standard {mean*rating*(1+allow):.4f} s; {3600/(mean*rating*(1+allow)):.4f} an hour")
