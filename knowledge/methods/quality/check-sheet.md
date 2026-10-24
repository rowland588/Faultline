---
id: quality.check-sheet
name: The check sheet — a tally by kind, counted where the work is
aka: [tally sheet, defect check sheet, concentration sheet, frequency sheet, one of the seven QC tools]
discipline: quality
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the check sheet as Ishikawa's *Guide to Quality Control* (1982) gives it, one of the seven tools (from knowledge); the rates and their upper bounds in the worked case computed independently in `scripts/knowledge/cases-quality.py` (the Clopper–Pearson bound as in `stats.confidence-intervals`)
needs: []
next: [quality.pareto, spc.capability-attribute-defects]
alternatives: []
related: [spc.capability-attribute-proportion, quality.defect-concentration, equipment.downtime-log]
---
# The check sheet — a tally by kind, counted where the work is

## Purpose and principle
The simplest of the seven tools and the one every other count rests on: a
list of the kinds of fault (or stop, or reason) decided in advance, a
mark against the kind each time one happens, and the amount inspected so
the marks become rates. Done on the line as it happens — a tap, a tick —
it is the floor's own data; done afterwards from memory it is a story.
The Pareto, the attribute chart and the capability of counted faults are
all drawn from it.

## Questions it answers
- How many of each kind, in this shift / batch / reel?
- At what rate (per 1,000 packs), and how sure is that rate?
- Which kinds make most of it — and is the list of kinds right (is
  "other" growing)?

## Inputs and minimum conditions
- The kinds, written before counting, mutually exclusive, with an "other"
  that is written out in words each time; 5–12 kinds work; more and the
  tally slows.
- The amount inspected (packs, metres, minutes) alongside the marks — a
  count with no denominator is not a rate.
- Who counted, when, where (line, machine, shift) on every sheet.

## Procedure and calculation
- Count per kind cᵢ; total C = Σcᵢ; inspected N.
- Rate per kind rᵢ = cᵢ/N (said per 1,000 or per 100 as the floor reads
  it); its 95% upper bound (Clopper–Pearson) so a small count is not read
  as precise: upper = Beta⁻¹(0.975; cᵢ + 1, N − cᵢ).
- Share per kind sᵢ = cᵢ/C — the Pareto's input (`quality.pareto`).
- "Other": when it reaches about 10% of C its words are read and new kinds
  made; the list is revised and dated.
- Several sheets (shifts, days): the same kinds every time so they add up;
  the rates charted (p or u chart, `spc.control-charts-attribute`).
- Faults per unit when a pack can carry several (`spc.capability-attribute-defects`);
  defectives when a pack is good or bad (`spc.capability-attribute-proportion`)
  — the sheet says which it counts.

**Worked case** (`cases-quality.py`): a shift's sheet on a wrapper, 2,400
packs inspected — seal wrinkle 23, weight low 11, label skew 9, print 4,
other 3; total 50, 2.08%. Rates per 1,000: 9.6 (upper bound 14.3), 4.6
(8.2), 3.8 (7.1), 1.7 (4.3), 1.2 (3.6). The top two kinds are 68% of
the faults. The bounds say the ranking of the last three is not settled
by one shift.

## Assumptions, limits and misuse
- Kinds that overlap ("seal fault" and "wrinkle") split one cause between
  two rows and hide it from the Pareto.
- Counting only what is caught at one point misses what passed; the
  sheet says where it was counted.
- A tally without the amount inspected cannot be compared across shifts
  of different length.
- The sheet is a count, not a cause: "operator error" as a kind is a
  judgement, not an observation — the kinds are what was *seen*.
- Small counts have wide bounds; a kind with 3 marks is not "rare" until
  more shifts agree.

## Reading the result
"50 faults on 2,400 packs this shift (2.1%): seal wrinkles 23 (9.6 a
thousand), low weight 11 — two kinds are two-thirds of it." Then the
Pareto, and the money of the top kind: 23 × what a wrinkled pack costs
(reworked or scrapped — `knowledge/MONEY.md`, Q).

## When not to use it — and instead
A measured value (a weight, a temperature) → record the number, not a
tick. Where on the pack or machine → `quality.defect-concentration`.
Stops and their minutes → `equipment.downtime-log`. Moments of people's
work → `ie.work-sampling`.

## In food and FMCG manufacturing
Reject reasons at the checkweigher or the end of line, visual faults on a
reel, foreign-body finds by kind, stop reasons on a wrapper, complaints
by kind — the kinds decided with the people who will tally.

## References
- [textbook] Ishikawa, K., *Guide to Quality Control*, 2nd rev. ed., Asian Productivity Organization, 1982 — the check sheet among the seven tools (from knowledge).
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 5 — the check sheet and the "magnificent seven" (from knowledge).

## In Faultline
Built 24 October as the faults mode's tally (FC-124, W1 — `src/tools/capability/ModeParts.tsx`
FaultsCapture, `modes.ts` faultsFigures tally): the kinds typed once on the study (up to twelve), a
button each on the phone tapped as the faults are found, Other typed, the tally with its shares and
cumulative on screen and on paper. Proved by `capability-kinds.mjs` step 11. The reliability study and
the loss count keep their own tallies (events, stops).
