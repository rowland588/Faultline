---
id: packaging.map-residual-oxygen
name: Residual oxygen in a MAP pack — a bounded, leaning measurement read honestly
aka: [residual O2, headspace oxygen, MAP verification, gas flush check, modified atmosphere, headspace analyser]
discipline: packaging
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — headspace analysis as the packaging practice (needle analysers read by a person; from knowledge); the statistics as `spc.capability-nonnormal` and `stats.distribution-fitting`; the worked case computed in `scripts/knowledge/cases-operations.py` on the capability study's own oxygen set
needs: [spc.normality-checks]
next: [spc.capability-nonnormal]
alternatives: []
related: [spc.capability-measured, foodsafety.shelf-life, packaging.seal-integrity, stats.distribution-fitting]
---
# Residual oxygen in a MAP pack — a bounded, leaning measurement read honestly

## Purpose and principle
A modified-atmosphere pack's shelf life rests on the oxygen left in its
headspace: low (under 1–2% for most meat and ready-meal applications,
under 0.5% for some) and staying low. The reading is a needle through a
septum into the headspace, by a person, a few packs an hour. The
measurement cannot go below zero and most packs sit near it, with an
occasional high one — a leaking seal, a poor flush — so the set leans
hard to the right and a normal capability index misreads the tail,
which is exactly where the risk is. The honest reading is the share over
the limit as measured, with its bound, and a fitted shape's percentile
where a figure for the tail is wanted.

## Questions it answers
- Is the gas flush holding — what share of packs are over the limit?
- Is the upper tail getting worse (a leaking jaw, a gas supply drift)?
- Which packs are high — and is that the flush or a leak
  (`packaging.seal-integrity`)?
- Does the shelf-life claim still hold at this oxygen
  (`foodsafety.shelf-life`)?

## Inputs and minimum conditions
- Headspace oxygen (and CO₂ where the mix matters) read per pack with a
  calibrated analyser (its own check against a certified gas,
  `msa.calibration`), at the agreed frequency (start of run, hourly, end;
  more after a jaw change).
- The limit (one-sided, "at most") and any internal alert level; the
  shelf-life study's oxygen assumption.
- At least 30 readings for a shape; the readings in time order.

## Procedure and calculation
- The shape first: skewness and the normality check
  (`spc.normality-checks`); a leaning, zero-bounded set is read by
  `spc.capability-nonnormal` — a lognormal (or Weibull) fitted with the
  bound at zero (`stats.distribution-fitting`); the 99.865th percentile
  from the fit against the limit, beside the normal's for contrast.
- The share over the limit as measured, with its upper bound
  (Clopper–Pearson: Beta⁻¹(0.95; k + 1, n − k)); and over any internal
  alert level.
- Steadiness: the readings in order on an individuals chart (the
  limits widened by the shape, or the chart on ln(x)); a run of high
  readings after a jaw or reel change is the signal.
- High packs traced: a high reading on a pack that also leaks is the
  seal's (`packaging.seal-integrity`); a high reading on a tight pack is
  the flush (gas flow, dwell, the evacuation).
- Money: packs over the limit × what they cost (a shortened life, a
  withdrawal — `knowledge/MONEY.md`, Q and C); the gas used per pack
  against a flush setting that over-shoots (E).

**Worked case** (`cases-operations.py`): the capability study's thirty
oxygen readings, limit 2%. Mean 0.36%, s 0.26: a normal Ppu of 2.06 says
"capable" — but the set's skewness is 2.8, and the lognormal fit puts
the 99.865th percentile at 1.34% against the normal's 1.16%; the normal
understates the tail by a fifth of a point. Over the 1% internal alert:
1 of 30 = 3.3%, with a 95% upper bound of 14.9% — thirty readings cannot
say the alert rate is small. The one high pack (1.41%) is the one to
leak-test.

## Assumptions, limits and misuse
- A normal Cpk/Ppk on oxygen is the standing misuse; the capability
  study refuses it on a leaning set and says the share as measured.
- Thirty readings give a shape and a rough tail; a shelf-life claim
  rests on hundreds over weeks.
- The analyser's needle lets air in if the septum is poor or the
  reading slow; the technique is part of the measurement (`msa.gauge-rr`
  across operators).
- The limit comes from the shelf-life study for that product and
  atmosphere; a generic 2% is not a specification.
- High oxygen is two problems (flush, leak) with two tools; the reading
  alone does not say which.

## Reading the result
"Oxygen this run: 29 of 30 packs under 1%, one at 1.4% — the set leans,
so no Ppk; read as a lognormal the upper tail sits at 1.3% against the 2%
limit; the high pack goes to the leak test. Thirty readings cannot yet
say the alert rate is under 15%." Money: the over-limit share × packs ×
their cost (`knowledge/MONEY.md`, Q); the life at risk (C).

## When not to use it — and instead
The seal itself → `packaging.seal-integrity`. The capability index for a
leaning set → `spc.capability-nonnormal`. The shelf-life study the limit
comes from → `foodsafety.shelf-life`. A normally spread measurement →
`spc.capability-measured`.

## In food and FMCG manufacturing
Fresh meat and poultry in MAP, ready meals, sliced cooked meats and
cheese, bakery with MAP, salads, snacks with nitrogen flush — every line
with a gas flush and a headspace analyser on the bench.

## References
- [practice] Headspace gas analysis practice and the analysers' manuals (Dansensor, PBI, Witt — from knowledge; no single public text).
- [textbook] Robertson, G.L., *Food Packaging: Principles and Practice*, 3rd ed., CRC, 2012 — modified atmosphere packaging and oxygen limits (from knowledge).
- [standard] ISO 22514-2:2017 — the percentile capability for non-normal data (scope checked online 22 Oct 2026; text not read).

## In Faultline
Built 24 October as a question on the capability study's measurement — *Oxygen in a pack* (FC-167, W1 —
`src/tools/capability/modes.ts` questionFigures/questionSays): the highest pack against the maximum with
where the limit comes from, how many over, the set said to lean high by design with its share outside
read as measured, a high pack sent to the leak test; the fitted tail is W3's (`spc.capability-nonnormal`). Proved by
`sample.test.ts` ("oxygen, a seal and a CCP").
