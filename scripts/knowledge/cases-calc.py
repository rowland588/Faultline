"""Independent worked cases for the calculators (knowledge/specs/FC-235-calculators.md and the specs of
FC-009, FC-183, FC-131, FC-044, FC-215) — the numbers the unit tests and the acceptance script take as THEIR
literals, computed here by SciPy / NumPy or by hand from the textbook formula, never by the app.

Run: python3 -I scripts/knowledge/cases-calc.py      (prints every case; an assert fails if a stated figure moves)

Sources (each named where it is used):
  Kanban      Monden, Toyota Production System, N = D*L*(1+alpha)/C (knowledge/methods/lean/kanban-supermarket.md)
  Safety stock Silver, Pyke & Thomas (2017); Factory Physics' VRTD (knowledge/methods/planning/safety-stock.md)
  OC curve    the binomial and hypergeometric distributions (knowledge/methods/quality/acceptance-sampling-attributes.md;
              knowledge/research/cases-research-2-sampling.py)
  Little's law Little (1961), L = lambda * W (knowledge/methods/capacity/littles-law.md)
  Critical path Kelley & Walker (1959), found by listing every path (knowledge/methods/projects/critical-path.md)
"""
import math
import numpy as np
from scipy import stats, optimize

ok = lambda cond, what: (print(("  ok   " if cond else "  FAIL ") + what), cond or exit(1))

print("== FC-009 Kanban sizing: N = D * L * (1 + alpha) / C, rounded up")
def kanban(units, hours, lead_h, alpha, c):
    d = units / hours
    raw = d * lead_h * (1 + alpha) / c
    n = math.ceil(raw - 1e-9)
    return d, d * lead_h, raw, n, n * c
# K1 the textbook case (cases-lean.py): 1,500 trays in a 7.5 h shift, 2 h refill, 15%, 60 a crate
d, wip, raw, n, mx = kanban(1500, 7.5, 2.0, 0.15, 60)
print(f"  K1 D {d:.0f}/h, in the loop before safety {wip:.0f}, raw {raw:.4f} -> {n} kanbans, at most {mx}")
ok(d == 200 and wip == 400 and n == 8 and mx == 480 and abs(raw - 7.6667) < 1e-3, "K1 8 kanbans, 480 trays, 400 in the loop before safety (Monden; cases-lean.py)")
# K1b halve the lead time
d, wip, raw, n, mx = kanban(1500, 7.5, 1.0, 0.15, 60)
print(f"  K1b lead 1 h: raw {raw:.4f} -> {n}, at most {mx}, before safety {wip:.0f}")
ok(n == 4 and mx == 240 and wip == 200, "K1b halving the lead time halves the loop's stock before safety (200 trays), 4 kanbans")
# K2 two-bin labels: 3,000 labels in 1 h, 45 min refill, 20%, 500 a roll
d, wip, raw, n, mx = kanban(3000, 1, 0.75, 0.20, 500)
print(f"  K2 raw {raw:.4f} -> {n} rolls, at most {mx}, before safety {wip:.0f}")
ok(n == 6 and mx == 3000 and abs(raw - 5.4) < 1e-9 and wip == 2250, "K2 5.4 rolls rounds up to 6")
# K3 an exact integer must not round up: 100/h, 3 h, 20%, 60 a crate = 360/60 = 6.0 exactly
d, wip, raw, n, mx = kanban(100, 1, 3.0, 0.20, 60)
print(f"  K3 raw {raw!r} -> {n}")
ok(n == 6, "K3 360/60 is exactly 6 kanbans, not 7 (floating-point guard)")
# money on K1: a tray costs 85p; carrying 25% a year
val = mx * 0
d, wip, raw, n, mx = kanban(1500, 7.5, 2.0, 0.15, 60)
stock = mx * 0.85
print(f"  K1 money: the supermarket's {mx} trays at 85p = £{stock:.2f}; carrying 25% a year = £{stock*0.25:.2f}")
ok(abs(stock - 408.0) < 1e-9 and abs(stock * 0.25 - 102.0) < 1e-9, "K1 money: £408.00 held, £102.00 a year at 25%")

# K4 a safety factor of 30%: 400 * 1.3 / 60 = 8.667 -> 9; shelf 540; cover 2.7 h
d, wip, raw, n, mx = kanban(1500, 7.5, 2.0, 0.30, 60)
print(f"  K4 raw {raw:.4f} -> {n}, at most {mx}, cover {mx/d} h")
ok(n == 9 and mx == 540 and abs(mx / d - 2.7) < 1e-12, "K4 30% safety: 9 kanbans, 540 trays, 2.7 hours of cover")

print("\n== FC-183 Safety stock and the reorder point: SS = z*sqrt(L*sd_d^2 + d^2*sd_L^2); ROP = d*L + SS")
def ss(dbar, sd_d, L, sd_L, svc):
    z = stats.norm.ppf(svc)
    sd = math.sqrt(L * sd_d ** 2 + dbar ** 2 * sd_L ** 2)
    s = z * sd
    return z, sd, s, dbar * L, dbar * L + s
# S1 the record's film reels: 2.4/day (sd 0.9), 5 days (sd 1.5), 98%
z, sd, s, mean_l, rop = ss(2.4, 0.9, 5, 1.5, 0.98)
print(f"  S1 z {z:.4f}, lead-time demand mean {mean_l}, sd {sd:.4f}, SS {s:.4f}, ROP {rop:.4f}")
ok(abs(z - 2.05375) < 1e-4 and abs(sd - 4.1243) < 1e-3 and abs(s - 8.4704) < 1e-3 and abs(rop - 20.4704) < 1e-3, "S1 4.1 sd, 8.5 reels safety, reorder at 20.5 -> 21 (the record's own reading)")
# S2 a reliable supplier: sd_L 0 -> SS = z * sd_d * sqrt(L); 100/day sd 20, 4 days, 95%
z, sd, s, mean_l, rop = ss(100, 20, 4, 0, 0.95)
print(f"  S2 z {z:.4f}, sd {sd:.4f}, SS {s:.4f}, ROP {rop:.4f}")
ok(abs(z - 1.644854) < 1e-5 and abs(sd - 40) < 1e-9 and abs(s - 65.794) < 1e-2 and abs(rop - 465.794) < 1e-2, "S2 sigma_L = 0: SS 65.8 -> 66, ROP 465.8 -> 466")
# S3 money on S2: 500 a time, 250 days a year, £2.50 a unit, 20% carrying, a stock-out costs £800
cycles = 100 * 250 / 500
short_per_year = (1 - 0.95) * cycles
hold = s * 2.5 * 0.20
print(f"  S3 cycles a year {cycles}, cycles that run short {short_per_year:.2f}, holding £{hold:.2f} a year, running short £{short_per_year*800:.2f} a year")
ok(cycles == 50 and abs(short_per_year - 2.5) < 1e-9 and abs(hold - 32.897) < 1e-2 and abs(short_per_year * 800 - 2000) < 1e-9, "S3 holding £32.90 a year; 2.5 cycles a year short = £2,000 a year")
# S4 99.9%: z
print(f"  S4 z(99.9%) {stats.norm.ppf(0.999):.5f}  z(90%) {stats.norm.ppf(0.90):.5f}  z(97.5%) {stats.norm.ppf(0.975):.5f}  z(99%) {stats.norm.ppf(0.99):.5f}")
ok(abs(stats.norm.ppf(0.999) - 3.09023) < 1e-4 and abs(stats.norm.ppf(0.90) - 1.28155) < 1e-4, "S4 z at 99.9% and 90%")

# S5 lumpy use: 2 a day (sd 3), 1 day, no delivery swing, 95%: SS = 1.64485 * 3 = 4.93456, ROP 6.93456 -> 7; 2 < 2 * 3 so the model warns
z, sd, s_, mean_l, rop = ss(2, 3, 1, 0, 0.95)
print(f"  S5 SS {s_:.5f}, ROP {rop:.5f}, lead-time demand {mean_l} < 2 sd {2*sd}")
ok(abs(s_ - 4.93456) < 1e-4 and abs(rop - 6.93456) < 1e-4 and mean_l < 2 * sd, "S5 SS 4.9, ROP 6.93 -> 7; the swing is over half of what is used")
# S6 halving the delivery spread on S1: SS 5.545; halving the daily spread on S2: 32.897
z, sd, s_, mean_l, rop = ss(2.4, 0.9, 5, 0.75, 0.98)
ok(abs(s_ - 5.545) < 1e-3, "S6 S1 with the delivery swing halved: safety 5.5")
z, sd, s_, mean_l, rop = ss(100, 10, 4, 0, 0.95)
ok(abs(s_ - 32.897) < 1e-3, "S6 S2 with the daily swing halved: safety 32.9")

print("\n== FC-131 The OC curve: Pa(p) = P(X <= c), X ~ Binomial(n, p); hypergeometric for a lot of N")
def pa(n, c, p): return stats.binom.cdf(c, n, p)
def pa_h(N, n, c, p):
    D = round(N * p)
    return stats.hypergeom.cdf(c, N, D, n)
def at_pa(n, c, target):
    return optimize.brentq(lambda p: pa(n, c, p) - target, 1e-9, 1 - 1e-9)
# O1 125/3 (cases-quality.py, record)
vals = {p: pa(125, 3, p) for p in (0.005, 0.01, 0.02, 0.03, 0.05, 0.08)}
print("  O1 125/3 Pa:", {f"{p*100:g}%": round(v, 4) for p, v in vals.items()})
ok([round(vals[p], 3) for p in vals] == [0.996, 0.963, 0.759, 0.481, 0.124, 0.008], "O1 125/3: 0.996 0.963 0.759 0.481 0.124 0.008 (record)")
p95, p10 = at_pa(125, 3, 0.95), at_pa(125, 3, 0.10)
print(f"  O1 accepted 95 in 100 at {p95*100:.3f}%, accepted 10 in 100 at {p10*100:.3f}%")
ok(abs(p10 - 0.0525) < 5e-4, "O1 limiting quality at 10% risk is about 5.3% (record: 5.3%)")
print(f"  O1 producer's risk at AQL 1%: {(1-pa(125,3,0.01))*100:.2f}%  consumer's risk at LQ 6%: {pa(125,3,0.06)*100:.2f}%  at LQ 5%: {pa(125,3,0.05)*100:.2f}%")
ok(abs((1 - pa(125, 3, 0.01)) - 0.037) < 5e-4, "O1 producer's risk at 1% is 3.7% (record)")
# O2 50/1
print(f"  O2 50/1: Pa(1%) {pa(50,1,0.01):.4f}, producer's risk {(1-pa(50,1,0.01))*100:.2f}%, p10 {at_pa(50,1,0.10)*100:.3f}%, p95 {at_pa(50,1,0.95)*100:.3f}%")
ok(abs(pa(50, 1, 0.01) - 0.911) < 5e-4 and abs(at_pa(50, 1, 0.10) - 0.076) < 5e-4, "O2 50/1: 0.911 at 1%, limiting quality 7.6% (record)")
# O3 110/3 (research table)
print(f"  O3 110/3: Pa(1%) {pa(110,3,0.01):.4f}  Pa(6%) {pa(110,3,0.06):.4f}")
ok(round(pa(110, 3, 0.01), 3) == 0.975 and round(pa(110, 3, 0.06), 3) == 0.098, "O3 110/3: 0.975 at 1%, 0.098 at 6% (research table)")
# O4 the looser 89/2 often quoted for 1%/6%
print(f"  O4 89/2: producer's risk {(1-pa(89,2,0.01))*100:.2f}%, Pa(6%) {pa(89,2,0.06):.4f}")
ok(abs((1 - pa(89, 2, 0.01)) - 0.060) < 5e-4 and abs(pa(89, 2, 0.06) - 0.092) < 5e-4, "O4 89/2: 6.0% producer's risk, 0.092 at 6% (record)")
# O5 small lot N=200, n=50, c=1 at 5%: 10 bad in the lot
print(f"  O5 N=200 50/1 at 5% (10 bad): hypergeometric {pa_h(200,50,1,0.05):.4f} vs binomial {pa(50,1,0.05):.4f}")
ok(round(pa_h(200, 50, 1, 0.05), 3) == 0.237 and round(pa(50, 1, 0.05), 3) == 0.279, "O5 hypergeometric 0.237 vs binomial 0.279 (record)")
# O6 the whole-unit trap: N=200, AQL 1% -> 2 bad packs in the lot; with c = 2 never rejected
print(f"  O6 N=200, AQL 1% = {round(200*0.01)} bad; n=76 c=2: Pa {pa_h(200,76,2,0.01):.4f}")
ok(round(200 * 0.01) == 2 and pa_h(200, 76, 2, 0.01) == 1.0, "O6 a lot of 200 at 1% has 2 bad; a plan allowing 2 never rejects it (Pa 1.000)")
# O7 hypergeometric curve points for N=500 n=83 c=2
print(f"  O7 N=500 83/2: Pa(1%) {pa_h(500,83,2,0.01):.4f}  Pa(6%) {pa_h(500,83,2,0.06):.4f}")
# O8 zero acceptance number: n=45 c=0: Pa(5%) and Pa(1%)
print(f"  O8 45/0: Pa(5%) {pa(45,0,0.05):.4f}  Pa(1%) {pa(45,0,0.01):.4f}  p10 {at_pa(45,0,0.10)*100:.3f}%")
ok(abs(pa(45, 0, 0.05) - 0.0994) < 5e-4 and abs((1 - pa(45, 0, 0.01)) - 0.364) < 5e-4, "O8 45/0: Pa 0.099 at 5%; a 1% lot rejected 36 times in 100 (record)")
# O9 inspection cost: 125 units, 30 seconds each, £14.70 an hour
mins = 125 * 0.5
print(f"  O9 inspection: {mins} min = £{mins/60*14.70:.4f}")
ok(abs(mins / 60 * 14.70 - 15.3125) < 1e-9, "O9 125 units at 30 s each = 62.5 min = £15.31 at £14.70 an hour")
# O10 a curve point table for 125/3 at the grid the page prints
grid = [0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.10]
print("  O10 grid:", [f"{p*100:g}%={pa(125,3,p)*100:.1f}%" for p in grid])

# O11 a lot of 200, 76/2 at 1%: accepts 95 in 100 up to 3 bad (1.5%), 10 in 100 at 12 bad (6%)
first = lambda t: next(D for D in range(0, 201) if stats.hypergeom.cdf(2, 200, D, 76) <= t)
print(f"  O11 N=200 76/2: 95 in 100 at {first(0.95)} bad, 10 in 100 at {first(0.10)} bad")
ok(first(0.95) == 3 and first(0.10) == 12, "O11 3 bad (1.5%) and 12 bad (6%)")

print("\n== FC-044 Little's law: WIP = throughput * lead time")
# L1 the record's reading: 1,800 trays in the chiller at 600 an hour -> 3 hours
print(f"  L1 lead time {1800/600} h")
ok(1800 / 600 == 3.0, "L1 1,800 trays at 600 an hour: 3 hours")
# L2 the WIP a lead time needs: 250/h and 4 h -> 1,000
ok(250 * 4 == 1000, "L2 250 an hour kept 4 hours needs 1,000 in progress")
# L3 the throughput that fits: 480 in progress, 2.4 h in it -> 200 an hour
ok(abs(480 / 2.4 - 200) < 1e-9, "L3 480 held 2.4 hours: 200 an hour")
# L4 shelf life: 3 h of a 48 h life
print(f"  L4 {3/48*100:.2f}% of a 48 h shelf life")
ok(abs(3 / 48 - 0.0625) < 1e-12, "L4 3 hours of 48 is 6.25% of the shelf life")
# L5 money: 1,800 at 85p, carrying 25%
print(f"  L5 held £{1800*0.85:.2f}; a year at 25% £{1800*0.85*0.25:.2f}")
ok(abs(1800 * 0.85 - 1530) < 1e-9 and abs(1800 * 0.85 * 0.25 - 382.5) < 1e-9, "L5 £1,530 held; £382.50 a year at 25%")
# L6 halving the WIP at the same throughput halves the lead time
ok(900 / 600 == 1.5, "L6 halve the WIP: 1.5 hours")
# L7 a lead time shown in the floor's units
print("  L7 0.4 h =", 0.4 * 60, "min; 30 h =", 30 / 24, "days")
print("\n== FC-128 Cost of poor quality: the four buckets (PAF) built from hours, packs and typed pounds")
# Q1 the record's week (cases-quality.py quality.copq): prevention 1,800 / appraisal 3,200 / internal 9,400 / external 2,600, sales 310,000
rate, mat, rw, cc = 15.0, 0.50, 1.40, 80.0
prev = 80 * rate + 600
appr = 160 * rate + 1000 * mat + 300
internal = 3400 * mat + 2000 * rw + 4100 + 800
external = 20 * cc + 1000
tot = prev + appr + internal + external; fail = internal + external; sales = 310000
print(f"  Q1 prevention £{prev:,.0f}, appraisal £{appr:,.0f}, internal £{internal:,.0f}, external £{external:,.0f}; total £{tot:,.0f} = {tot/sales:.1%} of sales; poor quality £{fail:,.0f} = {fail/sales:.2%}; failure share {fail/tot:.1%}")
ok((prev, appr, internal, external) == (1800, 3200, 9400, 2600) and tot == 17000, "Q1 the four buckets 1,800 · 3,200 · 9,400 · 2,600, total 17,000")
ok(round(tot / sales * 100, 1) == 5.5 and round(fail / sales * 100, 1) == 3.9 and round(fail / tot * 100) == 71, "Q1 5.5% of sales all in, 3.9% poor quality, failure 71% of the cost of quality")
items = {"Give-away": 4100, "Rework": 2000 * rw, "Scrap": 3400 * mat, "Complaints": 20 * cc, "Credits and charge-backs": 1000, "Holds and downgrades": 800}
print("  Q1 failure ranked:", [(k, v, f"{v/fail:.1%}") for k, v in sorted(items.items(), key=lambda kv: -kv[1])])
ok(sorted(items, key=lambda k: -items[k])[:3] == ["Give-away", "Rework", "Scrap"] and abs(sum(items.values()) - fail) < 1e-9, "Q1 the failure ranked: give-away 4,100 then rework 2,800 then scrap 1,700; the items add to 12,000")
print(f"  Q1 a pack made (155,000): {fail/155000*100:.2f}p")
# Q2 a later week, nothing in sales: prevention up, give-away cut, a quality stop typed
prev2 = 120 * rate + 600; appr2 = 160 * rate + 1000 * mat + 300
int2 = 2000 * mat + 1500 * rw + 2400 + 500 + 300; ext2 = 12 * cc + 400
tot2 = prev2 + appr2 + int2 + ext2; fail2 = int2 + ext2
print(f"  Q2 prevention £{prev2:,.0f}, appraisal £{appr2:,.0f}, internal £{int2:,.0f}, external £{ext2:,.0f}; total £{tot2:,.0f}; poor quality £{fail2:,.0f}; change in poor quality £{fail2-fail:,.0f}")
ok((prev2, appr2, int2, ext2, tot2, fail2) == (2400, 3200, 6300, 1360, 13260, 7660), "Q2 2,400 · 3,200 · 6,300 · 1,360; total 13,260; poor quality 7,660")
# Q3 a priced part only: 1,200 packs scrapped at 50p, 350 give-away typed, 4 complaints with no cost
internal3 = 1200 * mat + 350
print(f"  Q3 internal failure £{internal3:,.0f} — 4 complaints counted, not priced")
ok(internal3 == 950, "Q3 950 priced; the complaints are counted but unpriced until the cost of one is given")

print("\n== FC-191 What an improvement is worth: payback, NPV, IRR on a measured weekly saving")
def annuity(r, n): return n if abs(r) < 1e-12 else (1 - (1 + r) ** -n) / r
def appraisal(cost, weekly, weeks, life, rate):
    annual = weekly * weeks
    npv = annual * annuity(rate, life) - cost
    irr = optimize.brentq(lambda r: annual * annuity(r, life) - cost, -0.99, 1e4)
    cf = [-cost] + [annual] * life                              # a second method: the roots of the cash-flow polynomial
    roots = [x.real for x in np.roots(cf[::-1]) if abs(x.imag) < 1e-9 and x.real > 0]
    assert abs(irr - (1 / min(roots) - 1)) < 1e-6, "brentq and the polynomial's root agree on the IRR"
    return dict(annual=annual, payback=cost / weekly, npv=npv, irr=irr, roi=annual / cost)
# I1 the record's SMED kit (cost.investment-appraisal): 60% of £1,900 a week = £1,140; £28,000; 48 weeks; 5 years; 10%
a = appraisal(28000, 0.6 * 1900, 48, 5, 0.10)
print(f"  I1 saving £{a['annual']:,.0f} a year; payback {a['payback']:.2f} weeks ({a['payback']/48:.2f} years of running); NPV £{a['npv']:,.0f}; IRR {a['irr']:.1%}; yearly return {a['roi']:.1%}")
ok(abs(a['annual'] - 54720) < 1e-6 and abs(a['payback'] - 24.5614) < 1e-3 and abs(a['payback'] / 48 - 0.5117) < 1e-3, "I1 £54,720 a year; payback 24.6 weeks = 0.51 years (the record: 6.1 months)")
ok(abs(a['npv'] - 179431.85) < 0.01 and round(a['npv'], -2) == 179400, "I1 NPV at 10% over 5 years £179,432 (the record: £179,400)")
ok(round(a['irr'] * 100) == 195 and abs(a['roi'] - 1.954286) < 1e-6, "I1 IRR 195% (the record); the yearly return 195.4%")
h = appraisal(28000, 0.6 * 1900 / 2, 48, 5, 0.10)
print(f"  I1b saving halved: payback {h['payback']:.1f} weeks ({h['payback']/48:.2f} years); NPV £{h['npv']:,.0f}")
ok(abs(h['payback'] - 49.123) < 1e-3 and round(h['npv'], -2) == 75700, "I1b saving halved: payback 49.1 weeks (1.0 year), NPV £75,716 (the record: £75,700)")
c = appraisal(28000 * 1.25, 0.6 * 1900, 48, 5, 0.10)
print(f"  I1c cost up a quarter: payback {c['payback']:.2f} weeks; NPV £{c['npv']:,.0f}")
ok(abs(c['payback'] - 30.702) < 1e-3 and abs(c['npv'] - 172431.85) < 0.01, "I1c cost up a quarter: payback 30.7 weeks, NPV £172,432")
# I2 the catalogue's example: a £4,800 splice table saving £310 a week; 48 weeks; 3 years; 10%
b = appraisal(4800, 310, 48, 3, 0.10)
print(f"  I2 payback {b['payback']:.1f} weeks; NPV £{b['npv']:,.0f}; IRR {b['irr']:.1%}; yearly return {b['roi']:.0%}")
ok(abs(b['payback'] - 15.4839) < 1e-3 and abs(b['npv'] - 32204.36) < 0.01 and round(b['irr'] * 100) == 305 and abs(b['roi'] - 3.1) < 1e-9, "I2 splice table: 15.5 weeks, NPV £32,204, IRR 305%, yearly return 310%")
# I3 a spend that does not pay: £30,000 for £200 a week over 3 years at 10% (48 weeks): NPV negative, payback longer than the life
d = appraisal(30000, 200, 48, 3, 0.10)
print(f"  I3 payback {d['payback']:.0f} weeks against {3*48} running weeks of life; NPV £{d['npv']:,.0f}; IRR {d['irr']:.2%}")
ok(abs(d['payback'] - 150) < 1e-9 and 150 > 3 * 48 and abs(d['npv'] + 6126.22) < 0.01 and d['irr'] < 0, "I3 payback 150 weeks > 144 running weeks of life; NPV -£6,126; IRR below zero")
# I4 the saving built from hours: 6 hours a week at £14.70 an hour
print(f"  I4 saving a week £{6*14.70:.2f}")
ok(abs(6 * 14.70 - 88.2) < 1e-9, "I4 6 hours a week at £14.70 = £88.20 a week")
# I5 a zero rate: NPV is the plain sum less the cost (annuity limit n)
z = appraisal(1000, 10, 50, 2, 0.0)
ok(abs(z['npv'] - (10 * 50 * 2 - 1000)) < 1e-9, "I5 at 0% the NPV is saving x years less the cost")

print("\nall independent cases hold")

print("\n== FC-215 Critical path and float: by listing every path, NOT by the two passes")
def paths_cpm(tasks):
    """tasks: {id: (days, [waits for])}. The end is the longest start-to-end path; the critical paths are the ones that long;
    a task's float is the end less the longest path THROUGH it (what the forward and backward passes arrive at another way)."""
    succ = {t: [s for s, (d, p) in tasks.items() if t in p] for t in tasks}
    starts = [t for t, (d, p) in tasks.items() if not p]
    out = []
    def walk(t, path, total):
        path = path + [t]; total += tasks[t][0]
        if not succ[t]: out.append((total, path)); return
        for s in succ[t]: walk(s, path, total)
    for s in starts: walk(s, [], 0)
    end = max(t for t, _ in out)
    return end, [p for t, p in out if abs(t - end) < 1e-9], {t: min(end - tot for tot, p in out if t in p) for t in tasks}
# P1 the knowledge record's network (cases-projects-people-ergo-sust.py): a filler's chain and a labeller's, then trials, handover
P1 = {"A": (10, []), "B": (14, []), "C": (5, ["A"]), "D": (4, ["B"]), "E": (6, ["C"]), "F": (8, ["D"]), "G": (5, ["E", "F"]), "H": (2, ["G"])}
end, crit, fl = paths_cpm(P1)
print(f"  P1 end {end}, critical {crit}, float {fl}")
ok(end == 33 and crit == [["B", "D", "F", "G", "H"]] and fl == {"A": 5, "B": 0, "C": 5, "D": 0, "E": 5, "F": 0, "G": 0, "H": 0}, "P1 the end is day 33, the labeller's chain B-D-F-G-H is critical, the filler's A-C-E has 5 days' float")
# P2 a second network: one critical path; the side tasks C 5, F 5, E 6 days' float
P2 = {"A": (3, []), "B": (4, ["A"]), "C": (2, ["A"]), "D": (5, ["B"]), "E": (1, ["C"]), "F": (6, ["C"]), "G": (4, ["D", "E"]), "H": (3, ["F", "G"])}
end, crit, fl = paths_cpm(P2)
print(f"  P2 end {end}, critical {crit}, float {fl}")
ok(end == 19 and crit == [["A", "B", "D", "G", "H"]] and fl == {"A": 0, "B": 0, "C": 5, "D": 0, "E": 6, "F": 5, "G": 0, "H": 0}, "P2 the end is day 19, A-B-D-G-H critical, C 5, E 6, F 5 days' float")
# P3 two chains tie: both critical paths are found, and a task with a day's float
P3 = {"A": (2, []), "B": (3, ["A"]), "C": (4, ["A"]), "D": (2, ["B"]), "E": (3, ["B", "C"]), "F": (5, ["C"]), "G": (2, ["D", "E"]), "H": (1, ["F", "G"])}
end, crit, fl = paths_cpm(P3)
print(f"  P3 end {end}, critical {crit}, float {fl}")
ok(end == 12 and sorted(crit) == [["A", "C", "E", "G", "H"], ["A", "C", "F", "H"]] and fl["B"] == 1 and fl["D"] == 2, "P3 the end is day 12, two critical paths A-C-E-G-H and A-C-F-H, B has 1 day's float and D 2")
# P4 a slip: a task late by d moves the end by max(0, d - float); recomputed by listing the paths again
def slipped(tasks, t, d):
    tt = {k: ((v[0] + d if k == t else v[0]), v[1]) for k, v in tasks.items()}
    return paths_cpm(tt)[0]
print(f"  P4 B +3: {slipped(P1,'B',3)}, A +3: {slipped(P1,'A',3)}, A +8: {slipped(P1,'A',8)}")
ok(slipped(P1, "B", 3) == 36 and slipped(P1, "A", 3) == 33 and slipped(P1, "A", 8) == 36, "P4 the labeller's delivery 3 days late: 36 (+3); the filler's 3 days late: 33 (+0); the filler's 8 days late (5 float): 36 (+3 = 8 - 5)")
# P5 money: a day on the critical path at £2,500 a day (the cost of delay is the person's own figure)
print(f"  P5 3 days x £2,500 = £{3*2500:,}")
ok(3 * 2500 == 7500, "P5 a handover 3 days later at £2,500 a day is £7,500")
print("\nall FC-215 independent cases hold")
