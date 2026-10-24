---
id: rca.pdca
name: PDCA — plan, do, check, act
aka: [PDCA, PDSA, Deming cycle, Shewhart cycle, did it work, before and after, holding]
discipline: rca
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the cycle as Shewhart (1939) and Deming (1986, PDSA in 1993) frame it; the check as a before → after comparison by `stats.two-sample-tests`' methods and the holding by a control chart; from knowledge; the worked cycle computed in `scripts/knowledge/cases-rca.py`; Faultline's countermeasure → proof → holding in the 6M
needs: []
next: [lean.standard-work]
alternatives: []
related: [rca.fishbone-5whys, lean.toyota-kata, spc.control-charts-attribute, stats.two-sample-tests]
---
# PDCA — plan, do, check, act

## Purpose and principle
Every change treated as an experiment on the number it is meant to
move. **Plan**: the change, the number, and the effect expected — in
figures, written before. **Do**: make the change, on a small scale
first where that is possible. **Check**: measure the number after,
against before, and against the prediction; say whether the difference
is beyond the noise. **Act**: if it worked, make it the standard and
watch that it holds; if not, learn why and plan again. The cycle's
value is the written prediction and the honest check — most changes on
a factory floor are declared successes without either. In Faultline the
cycle is the shape of a countermeasure: raised with its expected effect,
proved by before → after on the same number, held or not.

## Questions it answers
- What did we expect the change to do, and what did it do?
- Is the difference real (beyond the variation the number had anyway)?
- Is it holding weeks later, or slipping back?
- Did it become the standard, and were people trained to it?

## Inputs and minimum conditions
- The number the change should move, with enough readings before (8–20
  shifts, cycles or days) to know its variation.
- The prediction, written with the plan: the direction and roughly the
  size.
- The readings after the change, taken the same way; the date of the
  change.
- The holding period's readings (two to four weeks) and the standard
  that was written.

## Procedure and calculation
- Before → after: means or rates with their n; the test fitted to the
  number — Welch's t for timed values, a Poisson or binomial comparison
  for counts (`stats.two-sample-tests`; for a count a shift, the
  conditional binomial test on the two totals is exact) — and the
  effect in the number's own units beside the p-value.
- Against the prediction: expected −30%, got −64% — a bigger effect
  than planned is a question too (what else changed?).
- Holding: the after period's readings on a run chart; a control chart
  built from the after period (a c-chart for counts a shift —
  `spc.control-charts-attribute`) whose limits say when a later shift
  has slipped; the run rules for a drift back (`spc.run-rules`).
- Act: the standard written (`lean.standard-work`), training recorded
  (`people.twi-job-instruction`), the change offered to other lines
  (`rca.horizontal-deployment`).
- A change with no measurable number is not a PDCA; find the number
  first or call it what it is.

**Worked case** (`cases-rca.py`): film breaks a shift on a wrapper.
Before, eight shifts: 56 breaks, 7.0 a shift; the plan — a new splice
guide — predicted −30%. After, eight shifts: 20 breaks, 2.5 a shift:
−64%, ratio 0.36; the exact test on the two totals gives p < 0.0001 —
beyond noise, and twice the predicted effect (the guide also stopped
the reel-end snatch nobody had counted). Holding over twenty shifts:
mean 2.6, the worst 4, never back to the before's best of 5 — held. A
c-chart from the after period: centre 2.6, upper limit 7.4 — a shift at
8 or more breaks would say the guide has slipped.

## Assumptions, limits and misuse
- Skipping check — the commonest failure: changes declared successes
  without measuring; the before readings are gathered before the change,
  not reconstructed.
- A prediction written after the result is not one.
- Eight readings either side with the team watching is a demonstration;
  the holding period is the proof.
- Several changes made together cannot be told apart; one change per
  cycle, or a designed experiment (`stats.doe-factorial`).
- The number must be the one the change was meant to move, taken the
  same way before and after; a changed definition fakes a result.

## Reading the result
"Expected −30% breaks; got −64% (7.0 → 2.5 a shift, p < 0.0001);
holding at 2.6 over four weeks — standardised, and offered to lines 1,
4 and 7." Money: the number's change × its rate by `knowledge/MONEY.md`
— breaks × minutes a break × the line's contribution a minute (T) and
the crew's labour (L) — said as the proof's worth a week.

## When not to use it — and instead
Finding the cause before planning the change → `rca.fishbone-5whys`.
Many small daily cycles toward a target condition →
`lean.toyota-kata`. The standard that holds the gain →
`lean.standard-work`. The test's arithmetic → `stats.two-sample-tests`.

## In food and FMCG manufacturing
Every countermeasure: a splice guide on a wrapper, a new sealing
temperature, a changed start-up sequence, a weigher head cleaned on a
schedule — each with its number before and after and its holding chart.

## References
- [textbook] Deming, W.E. (1986), *Out of the Crisis*, MIT Press — the Shewhart cycle (from knowledge).
- [textbook] Shewhart, W.A. (1939), *Statistical Method from the Viewpoint of Quality Control*, Graduate School, USDA (from knowledge).
- [textbook] Moen, R.D. and Norman, C.L. (2010), "Circling back: clearing up myths about the Deming cycle", *Quality Progress*, November — PDCA and PDSA's history (from knowledge).

## In Faultline
Built as the shape of a countermeasure (FC-156 and the 6M): raised with
its expected effect, before → after on the same number, and holding —
in the 6M project (`src/lib/sixm.ts`, `docs/SIXM.md`) and a
fix's proof on a study. The after period's own control limits as the
holding test are the piece not yet drawn.
