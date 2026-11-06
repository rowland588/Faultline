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
proposed = [("O",2.0,0),("T",1.5,30),("O",3.5,0),("T",2.0,10),("S",240,0),("T",1.0,20),("O",4.0,0),("D",8,0),("T",1.5,10),("O",1.5,0),("I",0.5,0),("T",1.0,20)]
print(f"  proposed: {len(proposed)} steps, {sum(t for _,t,_ in proposed)} min, {sum(d for *_,d in proposed)} m (saves {len(steps)-len(proposed)} steps, {total-sum(t for _,t,_ in proposed)} min, {dist-sum(d for *_,d in proposed)} m)")
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


print("\n== P  the team's weekly number proved (FC-201): Welch's one-sided t on the weeks before and after a change; Mann-Kendall and Sen on the series (FC-117)")
from math import lgamma, exp, log

def betacf(a, b, x):
    # continued fraction for the incomplete beta (Numerical Recipes 6.4, Lentz)
    tiny = 1e-300; qab = a + b; qap = a + 1; qam = a - 1
    c = 1.0; d = 1 - qab * x / qap
    d = 1 / (d if abs(d) > tiny else tiny); h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny); c = 1 + aa / c; c = c if abs(c) > tiny else tiny; h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny); c = 1 + aa / c; c = c if abs(c) > tiny else tiny
        de = d * c; h *= de
        if abs(de - 1) < 1e-14: break
    return h

def betai(a, b, x):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    bt = exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * log(x) + b * log(1 - x))
    return bt * betacf(a, b, x) / a if x < (a + 1) / (a + b + 2) else 1 - bt * betacf(b, a, 1 - x) / b

def t_cdf(t, df):
    x = df / (df + t * t); p = 0.5 * betai(df / 2, 0.5, x)
    return 1 - p if t > 0 else p

print(f"  check of the t distribution: df 10, t 2.228139 -> {t_cdf(2.228139, 10):.6f} (table 0.975); df 4, t 2.776445 -> {t_cdf(2.776445, 4):.6f} (table 0.975)")
def welch(a, b):
    na, nb = len(a), len(b); ma, mb = sum(a) / na, sum(b) / nb
    va = sum((x - ma) ** 2 for x in a) / (na - 1); vb = sum((x - mb) ** 2 for x in b) / (nb - 1)
    se2 = va / na + vb / nb; t = (mb - ma) / sqrt(se2)
    df = se2 ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1))
    return ma, mb, va, vb, t, df
before = [42, 41, 35, 47, 44]; after = [46, 49, 52, 53, 50]
ma, mb, va, vb, t, df = welch(before, after)
p_up = 1 - t_cdf(t, df)           # H1: the mean after is higher (a measure that should rise)
print(f"  before {before} mean {ma:.4f} var {va:.4f}; after {after} mean {mb:.4f} var {vb:.4f}")
print(f"  Welch t {t:.6f}, df {df:.6f}, one-sided p (after higher) {p_up:.6f}; change {((mb - ma) / ma) * 100:.4f}%")
# a measure that should fall: the same weeks read the other way round
print(f"  a falling measure given the same numbers: p (after lower) = {t_cdf(t, df):.6f}")
# too few: two readings either side is the minimum for a comparison (MIN_READINGS 2), under 3 a side is untestable
# Mann-Kendall S, Sen's slope and runs about the median for the eight-week series of the acceptance seed
ser = [42, 41, 35, 47, 44, 46, 49, 52]
n = len(ser); S = sum((ser[j] > ser[i]) - (ser[j] < ser[i]) for i in range(n) for j in range(i + 1, n))
slopes = sorted((ser[j] - ser[i]) / (j - i) for i in range(n) for j in range(i + 1, n)); k = len(slopes)
sen = (slopes[k // 2 - 1] + slopes[k // 2]) / 2 if k % 2 == 0 else slopes[k // 2]
var = n * (n - 1) * (2 * n + 5) / 18
z = (S - 1) / sqrt(var) if S > 0 else (S + 1) / sqrt(var) if S < 0 else 0
def phi(z): return 0.5 * (1 + __import__("math").erf(z / sqrt(2)))
pmk = 2 * (1 - phi(abs(z)))
med = sorted(ser)[n // 2 - 1] / 2 + sorted(ser)[n // 2] / 2
above = [x > med for x in ser if x != med]; runs = 1 + sum(1 for i in range(1, len(above)) if above[i] != above[i - 1])
print(f"  series {ser}: Kendall S {S}, Sen's slope {sen:.4f} a week, Mann-Kendall z {z:.4f} p {pmk:.5f} (normal approximation, no ties), median {med}, runs about the median {runs}")
# the acceptance seed's eight weeks cut where the change landed (the proof sheet's chips)
for cut in (4, 5):
    b, a = ser[:cut], ser[cut:]
    ma_, mb_, va_, vb_, t_, df_ = welch(b, a)
    print(f"  cut at week {cut + 1}: before {b} (mean {ma_:.4f}) after {a} (mean {mb_:.4f}); Welch t {t_:.5f} df {df_:.5f} one-sided p {1 - t_cdf(t_, df_):.5f}; change {((mb_ - ma_) / ma_) * 100:.4f}%")

print("\n== F2 the flow chart in money (FC-003): 30 loads a day, one person at £15 an hour, a load worth £120, holding stock 25% a year")
perday, hr, load, carry = 30, 15.0, 120.0, 25.0
move_min = tm['T'] + tm['I']; wait_min = tm['D'] + tm['S']
print(f"  people's minutes a load on transports + inspections {move_min} min; a day {move_min*perday} min = {move_min*perday/60:.4f} h = {money(move_min*perday/60*hr)} labour")
per_load = load * carry / 100 * wait_min / (365 * 24 * 60)
print(f"  waiting {wait_min} min a load (delay {tm['D']} + storage {tm['S']}): carrying one load {per_load:.6f}; a day {per_load*perday:.6f} ; a year {per_load*perday*365:.4f}")
print(f"  by design (storage {tm['S']} min) {load*carry/100*tm['S']/(365*24*60)*perday:.6f} a day; delays {load*carry/100*tm['D']/(365*24*60)*perday:.6f} a day")
print(f"  proposed chart: steps {len(proposed)}, transports+inspections {sum(t for s,t,_ in proposed if s in 'TI')} min, saves {(tm['T']+tm['I']-sum(t for s,t,_ in proposed if s in 'TI'))*perday/60*hr:.4f} labour a day")

print("\n== S2 the spaghetti diagram in money (FC-004): one packer at £25 an hour, 36 rounds a shift, 1.3 m/s")
walk_min = shift_m / 1.3 / 60
print(f"  {walk_min:.4f} min a shift = {money(walk_min/60*25)} a shift; 5 shifts a week {money(walk_min/60*25*5)}; of a 480-minute shift {walk_min/480:.4%}")
aw = after_legs * cycles / 1.3 / 60
print(f"  film at the line: {aw:.4f} min; saves {walk_min-aw:.4f} min = {money((walk_min-aw)/60*25)} a shift")
# trips: film 84 m of 158 per round, case 56, scale 18
print(f"  trips per round: film 84 ({84/158:.4%}), cases 56 ({56/158:.4%}), scale 18 ({18/158:.4%})")

print("\n== S3 the spaghetti diagram, several people (FC-004 part 2): three operators from the line, 10 rounds a shift at 1.3 m/s, £25 an hour")
walkers = {
    "Operator 1": [("Packing line", 0), ("Film store", 40), ("Packing line", 40), ("Case store", 25), ("Packing line", 25)],
    "Operator 2": [("Packing line", 0), ("Scale", 9), ("Packing line", 9), ("Film store", 40), ("Packing line", 40)],
    "Operator 3": [("Packing line", 0), ("Case store", 25), ("Packing line", 25)],
}
tot = 0; arrivals = {}; pairs = {}
for w, st in walkers.items():
    m = sum(x[1] for x in st); tot += m
    print(f"  {w}: {len(st)-1} legs, {m} m a round")
    for i in range(1, len(st)):
        arrivals[st[i][0]] = arrivals.get(st[i][0], 0) + 1
        k = tuple(sorted((st[i-1][0], st[i][0])))
        pairs.setdefault(k, {}).setdefault(w, 0)
        pairs[k][w] += st[i][1]
print(f"  together: {sum(len(s)-1 for s in walkers.values())} legs, {tot} m a round; most: {max(walkers, key=lambda w: sum(x[1] for x in walkers[w]))}")
print(f"  arrivals {sorted(arrivals.items(), key=lambda a: -a[1])}")
for k, v in pairs.items():
    if len(v) > 1: print(f"  shared route {k}: walked by {sorted(v)}; {sum(v.values())} m of {tot} ({sum(v.values())/tot:.4%})")
sh = tot * 10
print(f"  a shift at 10 rounds each: {sh} m together; {sh/1.3/60:.4f} min; per person: " + ", ".join(f"{w} {sum(x[1] for x in s)*10/1.3/60:.4f}" for w, s in walkers.items()))
print(f"  money: {sh/1.3/60/60*25:.4f} a shift at £25 an hour")
from math import hypot
print("\n== S3b the same on a plan (FC-004 part 2): line (30,0), film store (0,0), scale (30,16)")
a = hypot(30, 0) * 2; b = hypot(0, 16) * 2
print(f"  Operator 1 {a} m, Operator 2 {b} m, together {a+b} m; Operator 1 {a/(a+b):.4%}")
