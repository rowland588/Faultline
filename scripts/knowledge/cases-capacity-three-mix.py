#!/usr/bin/env python3
"""INDEPENDENT CASES — FC-041 (capacity's three numbers) and FC-042 (product mix at the constraint).
Every number in knowledge/specs/FC-041-capacity-three-numbers.md and FC-042-product-mix.md and in their unit tests is
printed here by plain arithmetic and a second implementation (itertools / sorted), never by Faultline's code."""
from itertools import permutations

print("# FC-041 — one shift, by hand")
plate, running, shift, brk, co_n, co_min, rejects_pct = 100.0, 0.95, 480, 30, 3, 42, 0.0
planned = shift - brk
co = min(planned, co_n * co_min)
making = planned - co
rate = plate * running                       # the bottleneck once its own stops count (good out: no rejects typed)
design = plate * shift
effective = rate * making
b, c, p = plate * brk, plate * co, (plate - rate) * making
print(f"  design {design:,.0f} = plate {plate:.0f} x {shift} min; planned {planned}, changeovers {co}, making {making}")
print(f"  effective {effective:,.1f}; breaks {b:,.0f} + changeovers {c:,.0f} + stops/rejects {p:,.1f} = {b+c+p:,.1f}; design - effective = {design-effective:,.1f}")
print(f"  effective/design {effective/design:.4f}")
actual = 28_000
print(f"  counted {actual:,}: utilisation {actual/design:.4f}; efficiency {actual/effective:.4f}; short {effective-actual:,.1f}; at £0.40 a pack £{(effective-actual)*0.40:,.2f}")
target = 100.0
print(f"  target {target:.0f}/min over {planned} planned min asks {target*planned:,.0f}; loading {target*planned/effective:.4f}")
print("  Stevenson-style week (docs/CAPACITY.md): design 120/min x 24 x 7 = 1,209,600; effective 100/min x 16 h x 5 d = 480,000; actual 148,000:")
print(f"    utilisation {148000/1209600:.4f}; efficiency {148000/480000:.4f}")
print("  a shorter count: 360 min window, 330 planned (30 break), counted 20,000:")
wm, pm = 360, 330
co2 = min(pm, co_n * co_min); mk2 = pm - co2
eff2 = rate * mk2
print(f"    design {plate*wm:,.0f}; effective {eff2:,.1f} (changeovers {co2}, making {mk2}); utilisation {20000/(plate*wm):.4f}; efficiency {20000/eff2:.4f}; above plan by {20000-eff2:,.1f}")

print("\n# FC-042 — three products competing for a full constraint")
prods = {"Family 1.5 kg": (0.60, 40, 60_000), "Standard 500 g": (0.25, 120, 240_000), "Snack 250 g": (0.12, 300, 300_000)}
week = 3000
def fill(order):
    left = week; made = {}; t = 0
    for n in order:
        T, r, d = prods[n]; mins = min(left, d / r); left -= mins; made[n] = (mins, mins * r); t += mins * r * T
    return t, made
rank = sorted(prods, key=lambda n: -prods[n][0] * prods[n][1])
habit = sorted(prods, key=lambda n: -prods[n][0])
for n in rank: print(f"  {n}: £{prods[n][0]:.2f} x {prods[n][1]}/min = £{prods[n][0]*prods[n][1]:.2f} a constraint minute; needs {prods[n][2]/prods[n][1]:,.1f} min")
t, made = fill(rank)
print(f"  ranked {rank}: throughput £{t:,.0f}; made {{ {', '.join(f'{n}: {int(v[1]):,}' for n, v in made.items())} }}; needed {sum(v[2]/v[1] for v in prods.values()):,.0f} min of {week}")
print(f"  unmade: " + ", ".join(f"{n} {int(prods[n][2]-made[n][1]):,} (worth £{(prods[n][2]-made[n][1])*prods[n][0]:,.0f})" for n in rank if prods[n][2]-made[n][1] > 0))
th, mh = fill(habit)
print(f"  by margin a pack {habit}: throughput £{th:,.0f}; the ranking earns £{t-th:,.0f} more")
best = max(permutations(prods), key=lambda o: fill(o)[0])
print(f"  brute force over all {len(list(permutations(prods)))} orders: best £{fill(best)[0]:,.0f} in order {list(best)} (greedy by £ a minute is optimal for a fractional-fill constraint)")
print("  a lost minute costs the last product made's £/min: £30; a minute gained earns the first left out's: £24")

print("\n# Martin's worked problem (docs/CAPACITY.md §7): $235 a unit at 15 min = $15.67 a minute beats $300 at 30 min = $10.00")
print(f"  {235/15:.2f} vs {300/30:.2f}")

print("\n# the 4-product case of cases-capacity.py with the constraint short: 1,200 min")
prods4 = {"King Edward 2.5kg": (0.55, 90, 30_000), "Maris 2kg": (0.42, 100, 60_000), "Tesco 1.25kg": (0.31, 110, 45_000), "Baby 1kg": (0.20, 120, 24_000)}
week4 = 1200; left = week4; t4 = 0; out = {}
for n in sorted(prods4, key=lambda n: -prods4[n][0] * prods4[n][1]):
    T, r, d = prods4[n]; mins = min(left, d / r); left -= mins; made4 = d if mins >= d / r - 1e-9 else int(mins * r + 1e-9); t4 += made4 * T; out[n] = (round(mins, 2), made4, int(d - made4))
print(f"  {out}; throughput £{t4:,.2f}")
