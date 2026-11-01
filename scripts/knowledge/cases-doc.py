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
