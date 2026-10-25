---
id: ie.ecrs
name: Eliminate, combine, rearrange, simplify — the critical examination of a method
aka: [ECRS, critical examination, method study questioning technique, work simplification, the primary and secondary questions]
discipline: ie
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the ILO's critical examination (the primary and secondary questions: purpose, place, sequence, person, means) and ECRS as the IE texts give them (from knowledge; Kanawaty 1992 ch. 7); the worked case in `scripts/knowledge/cases-ie.py`
needs: [ie.time-study]
next: [capacity.line-balancing, lean.standard-work]
alternatives: []
related: [changeover.smed, ie.micro-motion, lean.seven-wastes]
---
# Eliminate, combine, rearrange, simplify — the critical examination of a method

## Purpose and principle
Once a job's elements are timed, each is questioned in a fixed order:
what is done and why — can it be *eliminated*? If not, can it be
*combined* with another, done at another place or time or by another
person (*rearranged*), or done more easily (*simplified*)? The order
matters: there is no point simplifying an element that should not exist.
It is the method-study half of work study — the time study measures,
ECRS improves — and SMED is ECRS applied to a changeover.

## Questions it answers
- Which elements of this job add nothing and can go?
- Which can be merged, moved to another station, done off-line, or
  given to the machine?
- What would the cycle be after the changes, and does it now fit takt?
- Where would a fixture, a layout change or a pre-staging pay?

## Inputs and minimum conditions
- The job's elements with their times (`ie.time-study`, the line
  balance) and a flow or process chart of where each happens
  (`lean.process-flow-chart`).
- The people who do the job, in the room; the purpose of each element
  known or found.
- Takt or the target cycle, to judge the result against.

## Procedure and calculation
- For each element, the ILO's primary questions in order — **purpose**
  (what is achieved? is it necessary? → eliminate), **place** (where?
  why there? → rearrange), **sequence** (when? why then? → combine or
  rearrange), **person** (who? why them? → rearrange), **means** (how?
  why that way? → simplify) — and the secondary questions (what else
  could be done? what should be?).
- The decision per element: E, C, R or S (or keep), with what changes
  and its expected time; "E" needs the purpose answered, not the
  element merely unpopular.
- The new cycle = Σ kept and changed element times; against takt the
  load before and after; the elements moved to another station or
  off-line rebalanced (`capacity.line-balancing`).
- The changes costed: a fixture, a staging rack, a moved belt (one-off)
  against the seconds saved × cycles (recurring — `knowledge/MONEY.md`,
  L at a people station, T at the bottleneck).
- Then the new method written as standard work (`lean.standard-work`)
  and the time re-studied after the learning curve.

**Worked case** (`cases-ie.py`): a six-element task, 49 s against a 40 s
takt (123% loaded) — fetch tray 6 s (E: trays staged at the bench),
open bag 4 (S: pre-opened by the former, 2 s), fill 18, weigh 7 (C:
weighed on the fill scale), seal 9, walk to belt 5 (R: belt moved beside
the sealer, 1 s). After: 30 s — 39% less, 75% of takt, with a staging
rack and a belt move as the one-off cost.

## Assumptions, limits and misuse
- Simplifying before asking whether to eliminate polishes waste.
- "Combine" that loads one person past takt moves the problem; the
  balance is re-run.
- An element eliminated because its purpose was not *known* is not the
  same as one whose purpose was found unnecessary — ask the quality
  and food-safety owners before removing a check.
- The people's own ideas are the best source and the condition of the
  change holding; ECRS done to them fails.
- Savings claimed before the re-study are estimates; the money is said
  as "expected" until timed.

## Reading the result
"Six elements, 49 s against a 40 s takt: stage the trays, pre-open the
bags, weigh on the fill scale, move the belt — 30 s expected, 75% of
takt; one rack and a belt move." Money: 19 s × cycles a shift × labour a
second (`knowledge/MONEY.md`, L), and if the station was the bottleneck
the packs gained × margin (T), against the one-off cost.

## When not to use it — and instead
A changeover → `changeover.smed` (the same questions, Shingo's stages).
Motion-level waste within an element → `ie.micro-motion`. The seven
wastes across a flow → `lean.seven-wastes`, the value stream map.

## In food and FMCG manufacturing
Hand packing and assembly stations, case packing, line-side material
handling, quality checks done in the cycle, the walks between bench and
belt — the floor's everyday method study.

## References
- [textbook] Kanawaty, G. (ed.), *Introduction to Work Study*, 4th ed., ILO, 1992, ch. 7 — critical examination: the questioning technique (from knowledge).
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014 — operation analysis (from knowledge).
- [textbook] Barnes, R.M., *Motion and Time Study: Design and Measurement of Work*, 7th ed., Wiley, 1980 (from knowledge).

## In Faultline
Built (25 October, FC-028): the Line balance's **Improve** lens asks the five questions of each step and records
Eliminate, Combine, Rearrange or Simplify with the expected time; the balance is read again from those expected times,
and the saving is said in seconds, in the cycle against takt, in people and in money with the payback of a typed one-off
cost — expected until the work is timed again, and an Eliminate with no written reason is flagged. A step that sounds like
a check carries the ask-quality-and-food-safety note.
