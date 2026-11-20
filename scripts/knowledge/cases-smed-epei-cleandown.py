"""INDEPENDENT CASES — FC-069 the changeover interval (EPEI) and FC-072 cleandowns by SMED (20 November 2026).

Run: python3 -I scripts/knowledge/cases-smed-epei-cleandown.py

Every figure the specifications (knowledge/specs/FC-069-epei.md, FC-072-cleandown.md), the unit tests
(src/tools/changeover/__tests__/epei-cleandown.test.ts) and the acceptance script
(scripts/acceptance/smed-epei-cleandown.mjs) hold against is printed here by plain arithmetic, never by
Faultline's code.

E1  the knowledge record's week (knowledge/methods/lean/heijunka-epei.md, cases-lean.py): one shift of
    7.5 h, five days; four products of 720 + 480 + 360 + 240 min a week; changeovers into them of
    35, 35, 50, 50 min. Said per running day, as SMED says the line's time.
E2  the stock the interval needs — the common-cycle (rotation) schedule's cycle stock, each product
    made once an interval at its own rate: lot = d x T, peak = d x T x (1 - d/P), average = peak / 2
    (Silver, Pyke & Peterson 1998, the common cycle; Hopp & Spearman 2008, the EPQ's cycle stock).
E3  the toolkit's interval (src/tools/changeover/__tests__/changeover.test.ts WORKED EXAMPLE 1), kept.
C1  the knowledge record's allergen changeover (knowledge/methods/foodsafety/allergen-changeover.md,
    cases-planning-foodsafety.py): the nut run ends 14:00, clean 14:00-15:10, swabs read 15:25,
    release 15:30 — 90 min stopped; SMED stages the kit and the spare parts — about 25 of them.
"""

print("== E1 · EPEI on the record's week, per running day")
days = 5
avail_day = 7.5 * 60            # one shift of 7.5 h, the line running through its breaks
rates = {"A": 100, "B": 80, "C": 60, "D": 50}             # packs a minute
week = {"A": 72_000, "B": 38_400, "C": 21_600, "D": 12_000}  # packs a week — 720, 480, 360, 240 min
co = {"A": 35, "B": 35, "C": 50, "D": 50}                 # the changeover into each, minutes
d = {k: week[k] / days for k in week}                     # packs a running day
run = {k: d[k] / rates[k] for k in d}                     # minutes a running day
run_day = sum(run.values()); free = avail_day - run_day; cycle = sum(co.values())
T = cycle / free
print(f"  a day: {d}")
print(f"  run a day {run} = {run_day:g} of {avail_day:g}; free {free:g} min a day; one cycle's changeovers {cycle}")
print(f"  EPEI = {cycle}/{free:g} = {T:.4f} running days  (the record: 170/450 = {170/450:.4f} weeks x 5 = {170/450*5:.4f})")
print(f"  halved: {cycle/2}/{free:g} = {cycle/2/free:.4f} days;  a daily interval needs one cycle in {free:g} min or less")
# the SMED in the acceptance: C's changeover is the SMED's own, 50 min as timed, 40 separated, 30 converted
for label, c_min in (("separated (C at 40)", 40), ("converted (C at 30)", 30)):
    cyc = co["A"] + co["B"] + c_min + co["D"]
    print(f"  {label}: one cycle {cyc} -> every {cyc/free:.4f} days")
print(f"  changeovers a day at any interval it allows = cycle / T = {cycle / T:g} min = the free time (the identity)")

print("\n== E2 · the stock the interval needs (common cycle, finite rate)")
cost = {"A": 0.40, "B": 0.55, "C": 0.30, "D": 0.80}   # £ a pack, what it has cost by the time it is stock
carry = 0.20                                            # a year
def stock(T):
    out = {}
    for k in d:
        share = run[k] / avail_day                       # d/P: the product's share of the line's running day
        lot = d[k] * T
        peak = lot * (1 - share)
        out[k] = (lot, peak, peak / 2)
    return out
for label, t in (("now", T), ("separated", (35 + 35 + 40 + 50) / free), ("converted", (35 + 35 + 30 + 50) / free)):
    s = stock(t)
    avg = sum(v[2] for v in s.values()); money = sum(s[k][2] * cost[k] for k in s)
    print(f"  {label}: every {t:.4f} days")
    for k, (lot, peak, a) in s.items():
        print(f"    {k}: a run makes {lot:,.1f}; peak {peak:,.1f}; average {a:,.1f} packs; £{a*cost[k]:,.2f}")
    print(f"    average {avg:,.1f} packs, £{money:,.2f} tied up; carried a year at {carry:.0%}: £{money*carry:,.2f}")
s_now = stock(T); s_conv = stock((35 + 35 + 30 + 50) / free)
less = sum(s_now[k][2] * cost[k] for k in d) - sum(s_conv[k][2] * cost[k] for k in d)
print(f"  converted against now: £{less:,.2f} less tied up (proportional to the interval: x {150/170:.4f})")
print(f"  the record's simpler 'about half an interval's demand' (no rate term) would say {sum(d[k]*T/2 for k in d):,.1f} packs now")
lab = 4 * 14.5 * 1.3   # Line 7's crew x wage x on-costs, £ an hour
print(f"  the changeovers' minutes a day, {free:g}, at Line 7's £{lab:.2f} an hour: £{free/60*lab:,.2f} a day of the crew's time")

print("\n== E3 · the toolkit's interval (kept)")
print(f"  450 - 300 = 150 free; 5 x 42 = 210 -> {210/150:.4f} days; 5 x 27 = 135 -> {135/150:.4f}; daily needs {150/5:g} min")

print("\n== C1 · the allergen cleandown, element by element (minutes, in order, nothing in parallel)")
els = [  # name, side, part, minutes
    ("Fetch the cleaning kit and chemicals", "external", None, 10),
    ("Strip the depositor's removable parts", "internal", "clean", 15),
    ("Clean the removable parts at the sink", "internal", "clean", 15),
    ("Wet clean the frame and conveyors", "internal", "clean", 30),
    ("Swab three sites and wait for the result", "internal", "verify", 15),
    ("QA release signed", "internal", "release", 5),
]
t = 0; marks = []
for name, side, part, m in els:
    marks.append((name, t, t + m)); t += m
print(f"  as timed: {t} min stopped; release ends at {marks[-1][2]} (14:00 + {marks[-1][2]} = 15:30)")
print(f"  the verification from {marks[4][1]} to {marks[4][2]} min into the stop (15:10 to 15:25), {marks[4][2]-marks[4][1]} min")
by = {}
for name, side, part, m in els:
    by[part] = by.get(part, 0) + m
print(f"  split: cleaning {by['clean']}, verification {by['verify']}, release {by['release']}, other {by[None]}")
sep = t - 10
conv = sep - 15
print(f"  separated (the kit outside): {sep} to release; converted (the parts cleaned off-line on a spare set): {conv}; {t - conv} sooner — the record's 'about 25'")
print(f"  cleaning materials: £45 a clean x 2 cleans a week = £{45*2} a week")
