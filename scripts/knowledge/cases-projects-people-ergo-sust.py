"""Independent worked cases for the projects, people, ergonomics and sustainability records.

Run: python3 -I scripts/knowledge/cases-projects-people-ergo-sust.py
"""
import numpy as np
from scipy import stats

print("== Critical path (projects.critical-path)")
# task: (duration days, predecessors)
tasks = {"A deliver filler": (10, []), "B deliver labeller": (14, []), "C install filler": (5, ["A deliver filler"]), "D install labeller": (4, ["B deliver labeller"]), "E FAT/SAT filler": (6, ["C install filler"]), "F SAT labeller": (8, ["D install labeller"]), "G line trials": (5, ["E FAT/SAT filler", "F SAT labeller"]), "H handover": (2, ["G line trials"])}
es, ef = {}, {}
for t, (d, pre) in tasks.items():
    es[t] = max([ef[p] for p in pre], default=0); ef[t] = es[t] + d
end = max(ef.values()); ls, lf = {}, {}
for t in reversed(list(tasks)):
    succ = [s for s, (_, pre) in tasks.items() if t in pre]
    lf[t] = min([ls[s] for s in succ], default=end); ls[t] = lf[t] - tasks[t][0]
for t in tasks:
    fl = ls[t]-es[t]; print(f"  {t:20s} d{tasks[t][0]:2d}  ES {es[t]:2d} EF {ef[t]:2d}  LS {ls[t]:2d} LF {lf[t]:2d}  float {fl:2d} {'CRITICAL' if fl==0 else ''}")
print(f"  end day {end}; critical path: B → D → F → G → H; the filler chain has {ls['E FAT/SAT filler']-es['E FAT/SAT filler']} days' float")

print("\n== CI programme (projects.ci-programme)")
ideas = 41; done = 18; claimed = 95_000; proven = 62_000
print(f"  ideas {ideas}, done {done} ({done/ideas:.0%}); claimed £{claimed:,}, proven £{proven:,} ({proven/claimed:.0%}); the gap £{claimed-proven:,} is not savings")
months = [4, 6, 5, 8, 7, 9]; print(f"  ideas a month {months}: Spearman rho {stats.spearmanr(range(6), months)[0]:.2f} rising")
days_to_done = np.array([12, 30, 45, 18, 60, 22, 90, 15, 35, 40]); print(f"  days from raised to done: median {np.median(days_to_done):.0f}, 90th {np.percentile(days_to_done, 90):.0f}")

print("\n== Risk register (projects.risk-register)")
risks = [("OEM late", 4, 4), ("film spec change", 2, 3), ("key engineer leaves", 2, 5), ("power upgrade late", 3, 4)]
for n, l, i in sorted(risks, key=lambda r: -r[1]*r[2]): print(f"  {n:22s} L{l} × I{i} = {l*i:2d}")
print("  top two by score: OEM late (16), power upgrade late (12); in Faultline these are Critical problems on the register (declined as a second record, 17 Oct)")

print("\n== From–to layout (ergonomics.layout-from-to)")
areas = ["film store", "line 3", "case store", "despatch"]
moves = {("film store", "line 3"): 36, ("case store", "line 3"): 24, ("line 3", "despatch"): 40}
distA = {("film store", "line 3"): 42, ("case store", "line 3"): 28, ("line 3", "despatch"): 60}
distB = {("film store", "line 3"): 8, ("case store", "line 3"): 28, ("line 3", "despatch"): 60}
ldA = sum(m*distA[k] for k, m in moves.items()); ldB = sum(m*distB[k] for k, m in moves.items())
print(f"  layout A load-distance {ldA:,} m·moves a shift; layout B (film store beside line 3) {ldB:,}; saves {ldA-ldB:,} m a shift = {(ldA-ldB)/1000:.2f} km")

print("\n== MAC / ART (ergonomics.hse-mac-art) — structure only; the scores are HSE's charts")
print("  MAC: each factor a colour band G/A/R/P with its chart score; total score ranks tasks; any P (purple) = unacceptable")
print("  ART: factor scores (arm movements, repetition, force, head/neck, back, arm, wrist, hand grip, breaks, pace, other) summed; exposure score × duration multiplier; bands low 0–11, medium 12–21, high 22+ (from knowledge, to confirm)")
print("  case packing ART 26 — high; frequency and posture red")

print("\n== Push / pull (ergonomics.push-pull)")
F0, Fs = 310, 140  # N initial, sustained measured with a force gauge
print(f"  initial {F0} N, sustained {Fs} N on the ramp; HSE L23 guideline figures (from knowledge, to confirm): start/stop about 200 N men / 150 N women, keep-moving about 100 N / 70 N -> both over")
m = 450; mu = 0.03; g = 9.81; theta = np.radians(3)
print(f"  check: a {m} kg rack, rolling resistance {mu}, a 3° ramp: F ≈ m g (μ cosθ + sinθ) = {m*g*(mu*np.cos(theta)+np.sin(theta)):.0f} N sustained — the ramp doubles the flat force {m*g*mu:.0f} N")

print("\n== RULA / REBA (ergonomics.rula-reba) — action levels from knowledge")
print("  RULA grand score 1–2 acceptable; 3–4 investigate; 5–6 investigate and change soon; 7 investigate and change immediately")
print("  REBA 1 negligible; 2–3 low; 4–7 medium; 8–10 high; 11–15 very high")
print("  reaching into a deep tote: RULA 6 — change soon")

print("\n== Skills matrix (people.skills-matrix)")
levels = {"wrapper set-up": {"days": [4, 3, 3, 1], "nights": [3, 1, 0]}, "labeller set-up": {"days": [4, 3], "nights": [3]}, "CCP cook check": {"days": [3, 3, 4, 3], "nights": [3, 3, 1]}}
target = 3
for task, sh in levels.items():
    for s, lv in sh.items():
        cover = sum(1 for l in lv if l >= 3); print(f"  {task:16s} {s:6s} cover {cover} (target {target}) {'GAP' if cover < target else ''} {'SINGLE POINT' if cover == 1 else ''}")

print("\n== TWI job instruction (people.twi-job-instruction)")
print("  breakdown: important steps (what advances the job) · key points (what makes or breaks it: safety, quality, ease) · reasons; four steps: prepare the learner, present, try out, follow up")
trained = 9; signed = 6; print(f"  trained {trained}, signed off after try-out {signed} ({signed/trained:.0%}); re-check at 30 days")

print("\n== Carbon (sustainability.carbon) — illustrative factors; the year's published factors govern")
elec_kwh = 180_000; gas_kwh = 420_000; f_e = 0.207; f_g = 0.183  # kgCO2e/kWh, UK 2023-ish, from knowledge
packs = 1_040_000
co2 = elec_kwh*f_e + gas_kwh*f_g
print(f"  scope 2 electricity {elec_kwh:,} kWh × {f_e} = {elec_kwh*f_e/1000:.1f} t; scope 1 gas {gas_kwh:,} × {f_g} = {gas_kwh*f_g/1000:.1f} t; total {co2/1000:.1f} t a month; {co2/packs*1000:.0f} g CO2e a pack")

print("\n== Compressed air leaks (sustainability.compressed-air-leaks) — illustrative")
# flow through an orifice at 7 bar(g): roughly 1 mm -> ~1.2 l/s free air (from leak charts, from knowledge); scale with area
def leak_lps(d_mm): return 1.2*(d_mm/1.0)**2
kwh_per_m3 = 0.11; price = 0.25; hours = 6000
tags = [(0.5, 30), (1, 12), (2, 6)]
total = 0
for d, n in tags:
    m3 = leak_lps(d)/1000*3600*hours*n; cost = m3*kwh_per_m3*price; total += cost
    print(f"  {n:2d} leaks of {d:g} mm: {leak_lps(d):.1f} l/s each -> {m3:,.0f} m³ a year, £{cost:,.0f}")
print(f"  48 leaks about £{total:,.0f} a year at £{price}/kWh and {kwh_per_m3} kWh/m³; 30 fixed")

print("\n== Utilities intensity (sustainability.utilities-intensity)")
tonnes = np.array([38, 42, 35, 45, 40, 30, 44, 36, 41, 39, 33, 43])
kwh = 180*24*1.0 + 95*tonnes + np.array([120, -80, 60, -40, 90, 150, -120, 30, -60, 70, 110, -90])  # daily
slope, intercept, r, p, se = stats.linregress(tonnes, kwh)
print(f"  use = {intercept:,.0f} kWh base + {slope:.1f} kWh/t × tonnes (r² {r*r:.2f}); base load ≈ {intercept/24:.0f} kW")
print(f"  intensity this month {kwh.sum()/tonnes.sum():.0f} kWh/t; at 30 t/day {intercept/30+slope:.0f} kWh/t, at 45 t/day {intercept/45+slope:.0f} — the intensity falls with output because of the base")

print("\n== Waste streams (sustainability.waste-streams)")
streams = [("film offcuts", 2100, 640, "recycled"), ("cardboard", 5400, -120, "recycled (rebate)"), ("food waste", 8200, 1230, "AD"), ("general", 1900, 760, "landfill/EfW")]
tot = sum(s[1] for s in streams); div = sum(s[1] for s in streams if "landfill" not in s[3])
for n, kg, c, d in streams: print(f"  {n:13s} {kg:5,} kg  £{c:5,}  {d}")
print(f"  total {tot:,} kg a month; diverted from landfill {div/tot:.0%}; cost £{sum(s[2] for s in streams):,}")
