"""Independent cases for the document shape's tools (knowledge/specs/FC-240-documents.md and the five specs it carries: FC-142 charter,
FC-139 SIPOC, FC-140 CTQ, FC-141 Kano, FC-150 8D report). Plain Python with the standard library only (no SciPy needed): each figure is
worked a second way, from the published source named beside it, and the unit tests (src/tools/doc/__tests__) hold the code to it.

    python3 scripts/knowledge/cases-doc.py
"""
from datetime import date
import math

print("== C1 Charter worth (sixsigma.charter worked case; Pyzdek & Keller 2014, ISO 13053-2)")
base, target, sd, n = 4.10, 2.0, 0.18, 10
gap = base - target
print(f"  gap {gap:.2f} g = {gap/base*100:.1f}% of the baseline")
t975_9 = 2.262157  # Student t, 0.975 quantile, 9 df — the published table value (e.g. NIST/SEMATECH e-Handbook 1.3.6.7.2)
half = t975_9 * sd / math.sqrt(n)
print(f"  95% interval {base-half:.3f} to {base+half:.3f} (half-width {half:.4f})")
volume, per_g = 240_000 * 52, 3.40 / 1000        # packs a year; £3.40 a kilo = £0.0034 a gram
worth = gap * volume * per_g
print(f"  packs a year {volume:,}; worth {worth:,.2f} a year ({worth/52:,.2f} a week)")   # the record says 'about £89,000'
team = [(20, 'Jo'), (30, 'Dev'), (10, 'Kim')]; rate = 14.70
hours = sum(h for h, _ in team); cost = hours * rate
print(f"  team {hours} h x {rate} = {cost:.2f}; paid back in {cost/(worth/52):.4f} weeks")
print(f"  days from 2026-11-01 to 2027-03-31 = {(date(2027,3,31)-date(2026,11,1)).days}; to 2026-12-15 = {(date(2026,12,15)-date(2026,11,1)).days}; to 2027-02-15 = {(date(2027,2,15)-date(2026,11,1)).days}")

print("== C2 Charter — worth from the measuring tool's £ a week")
print(f"  750 x 52 = {750*52:,}; gap {94-91.5:.1f}; days 2026-11-01 -> 2027-02-28 = {(date(2027,2,28)-date(2026,11,1)).days}")

print("\n== K1 Kano evaluation table (Kano et al. 1984; Berger et al. 1993) — the 5 x 5 table, rows = functional answer, columns = dysfunctional")
ANS = ['like', 'expect', 'neutral', 'livewith', 'dislike']      # I like it that way / It must be that way / I am neutral / I can live with it that way / I dislike it that way
TABLE = {
  'like':     ['Q', 'A', 'A', 'A', 'O'],
  'expect':   ['R', 'I', 'I', 'I', 'M'],
  'neutral':  ['R', 'I', 'I', 'I', 'M'],
  'livewith': ['R', 'I', 'I', 'I', 'M'],
  'dislike':  ['R', 'R', 'R', 'R', 'Q'],
}
def cls(f, d): return TABLE[f][ANS.index(d)]
for f in ANS: print("  ", f.ljust(9), TABLE[f])
# twelve respondents on one need (functional, dysfunctional)
resp = [('like','dislike')]*5 + [('like','neutral')]*2 + [('expect','dislike')]*2 + [('neutral','neutral')] + [('like','like')] + [('dislike','like')]
tally = {}
for f, d in resp: tally[cls(f, d)] = tally.get(cls(f, d), 0) + 1
print("  tally", tally)
A, O, M, I = (tally.get(k, 0) for k in 'AOMI')
den = A + O + M + I
print(f"  A {A} O {O} M {M} I {I} (Q {tally.get('Q',0)} R {tally.get('R',0)}); better = (A+O)/(A+O+M+I) = {(A+O)/den:.4f}; worse = -(O+M)/(A+O+M+I) = {-(O+M)/den:.4f}")

# K1 continued — the three requirements the unit test and the acceptance script type in
def tally_of(pairs):
    t = {}
    for f, d in pairs: t[cls(f, d)] = t.get(cls(f, d), 0) + 1
    return t
def coeffs(t):
    A, O, M, I = (t.get(k, 0) for k in 'AOMI'); den = A + O + M + I
    return (A + O) / den, -(O + M) / den
need1 = resp
need2 = [('expect','dislike')] * 10 + [('neutral','dislike')] * 2
need3 = {'A': 7, 'O': 3, 'M': 0, 'I': 2, 'R': 0, 'Q': 0}          # tallied by hand
for name, t in (('Reclosable lid', tally_of(need1)), ('Seal does not leak', tally_of(need2)), ('Easy-peel tab (tallied)', need3)):
    b, w = coeffs(t)
    print(f"  {name:26s} {dict(sorted(t.items()))}  mode {max('AOMI', key=lambda k: t.get(k,0))}  better {b*100:.1f}%  worse {w*100:.1f}%")
# a tie: six Attractive and six Must-be
tie = {'A': 6, 'M': 6}
print("  tie example", tie, "-> tied between A and M; better", f"{6/12*100:.0f}%", "worse", f"{-6/12*100:.0f}%")

print("\n== S1 SIPOC counts (the record's worked case)")
steps = [("Intake", "the grower", "raw product", "checked product", "the wash line", "raw product size variation"),
         ("Wash", "the chemicals supplier", "water, chemicals", "washed product", "the slicer", ""),
         ("Slice", "engineering", "blades, slicer settings", "sliced product", "packing", "blade sharpness, slicer setting"),
         ("Pack", "packaging suppliers", "film, trays", "sealed packs", "despatch", ""),
         ("Despatch", "planning", "the schedule", "pallets", "the retailer's depot", "")]
def distinct(col):
    seen = []
    for s in steps:
        for p in s[col].replace(';', ',').split(','):
            p = p.strip()
            if p and p.lower() not in [x.lower() for x in seen]: seen.append(p)
    return seen
print("  steps", len(steps), "customers", len(distinct(4)), "suppliers", len(distinct(1)), "inputs", len(distinct(2)), "outputs", len(distinct(3)), "to measure", len(distinct(5)), distinct(5))

print("\n== E1 8D timeline and containment (rca.eight-d worked case; the record closes at day 30 yet counts six weeks held after day 19 — the example closes at day 62)")
d0 = date(2026, 10, 1)
for label, d in (("D3 contained", date(2026,10,2)), ("D4 verified", date(2026,10,10)), ("D5 chosen", date(2026,10,13)), ("D6 implemented", date(2026,10,20)), ("D7 prevention", date(2026,10,27)), ("D8 closed", date(2026,12,2))):
    print(f"  {label:16s} day {(d - d0).days}")
print(f"  held {14*1200:,} units x 0.42 = {14*1200*0.42:,.2f} tied up; sorting 24 h x 14.70 = {24*14.70:.2f}; expected without the fix {90*6} (90 a week x 6 weeks)")
print(f"  six weeks after 2026-10-20 ends {date.fromordinal(date(2026,10,20).toordinal()+42)}")
