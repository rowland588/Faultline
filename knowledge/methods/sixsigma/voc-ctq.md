---
id: sixsigma.voc-ctq
name: Voice of the customer to CTQs — and Kano
aka: [VOC, CTQ, critical to quality, CTQ tree, Kano model, customer requirements, specification limits]
discipline: sixsigma
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-24 — the CTQ tree as Six Sigma practice; Kano, N. et al. (1984), "Attractive quality and must-be quality", *Journal of the Japanese Society for Quality Control* 14(2) — the five categories and the functional/dysfunctional question pair; from knowledge, texts not re-read; the worked tree in `scripts/knowledge/cases-sixsigma-visual.py`
needs: []
next: [spc.capability-measured, quality.control-plan]
alternatives: []
related: [sixsigma.sipoc, sixsigma.qfd, quality.complaints, quality.sensory-difference]
---
# Voice of the customer to CTQs — and Kano

## Purpose and principle
What the customer says — "easy to open", "doesn't leak", "looks fresh"
— is not measurable; what the line controls must be. The CTQ tree
takes each need, finds its drivers (what makes a pack easy to open:
the peel force, the tab's size), and ends at **critical-to-quality**
characteristics each with a measure, a unit and a limit — the
specification the capability study tests and the control plan holds.
Kano's model sorts needs by how satisfaction responds to them: **must-be**
(expected; absent, the customer is angry, present, nobody notices —
safety, no leaks), **performance** (more is better in proportion — ease
of opening, weight), **attractive** or delighters (unexpected and
pleasing — a reclose), plus indifferent and reverse. A must-be is a
limit that is never traded; a performance need is a target to optimise;
a delighter is a decision. The sources are the retailer's
specification, complaints, interviews and the panel.

## Questions it answers
- What exactly must we measure, in what unit, to what limit, to meet
  each thing the customer asks for?
- Which needs are must-be (limits), which performance (targets), which
  delighters (choices)?
- Where do the limits come from — the specification, the complaints,
  a test?
- Which CTQs are not yet measured or controlled on the line?

## Inputs and minimum conditions
- The customer's words: the retailer's specification, complaints by
  theme (`quality.complaints`), interviews, the consumer panel.
- For Kano: each need asked two ways of a sample of customers — how do
  you feel if it is present (functional), if it is absent
  (dysfunctional) — on the five-point scale (like, expect, neutral,
  live with, dislike).
- The technical knowledge to name the drivers and the tests that give
  the limits.

## Procedure and calculation
- Tree: need → drivers → CTQs; each CTQ with measure, unit, limit (two-
  sided, at-least or at-most) and the source of the limit.
- Kano classification by the pair: functional *like* with dysfunctional
  *dislike* → performance; *expect* or *neutral* functional with
  *dislike* dysfunctional → must-be; *like* functional with *neutral*
  or *expect* dysfunctional → attractive; the same answer both ways →
  indifferent; reversed → reverse. Tally across respondents; the mode
  classifies, the split is reported.
- Each CTQ to its control: a capability study against its limit
  (`spc.capability-measured`), a row in the control plan
  (`quality.control-plan`), a sensory method where the CTQ is a taste
  (`quality.sensory-difference`).
- CTQs without a limit are not CTQs; needs without a CTQ are unmet or
  unmeasurable — listed as gaps.
- Review when complaints shift theme or the specification changes.

**Worked case** (`cases-sixsigma-visual.py`): a lidded tray. "Easy to
open" → peel force 8–15 N — performance. "Doesn't leak" → seal strength
≥ 1.5 N/15 mm and the leak test passed — must-be. "Looks fresh" →
residual oxygen ≤ 2% — must-be. "I can reseal it" → zipper present —
a delighter, and a design choice. The two must-bes get capability
studies and control plan rows; the performance CTQ gets a target within
its window; the delighter goes to the pack's design decision.

## Assumptions, limits and misuse
- CTQs without limits — "good seal" — control nothing; the limit and its
  source are the method.
- The customer's words paraphrased by the engineer become the
  engineer's needs; keep the words.
- Kano from one interview is an anecdote; a dozen respondents is the
  floor, and the split is reported.
- Must-bes are not optimised against delighters; a leak-free pack is
  never traded for a reclose.
- Needs change: last year's delighter (reclose) is this year's
  performance need.

## Reading the result
"'Easy to open' → peel force 8–15 N (performance); 'doesn't leak' →
seal ≥ 1.5 N/15 mm (must-be); the two must-bes get capability studies
this month." Money: a must-be missed is complaints and returns
(`knowledge/MONEY.md`, C); a performance CTQ's capability is the
rejects (Q); the CTQ tree says which pounds are at stake where.

## When not to use it — and instead
Relating many needs to many characteristics for a new design →
`sixsigma.qfd`. The complaint data themselves → `quality.complaints`.
The capability against the limit → `spc.capability-measured`. The
scope the customers sit in → `sixsigma.sipoc`.

## In food and FMCG manufacturing
Retailer specifications turned into line limits; peelable lids and
reclose; pack weight (`packaging.average-quantity-system`); appearance
and taste through the panel.

## References
- [peer-reviewed] Kano, N., Seraku, N., Takahashi, F. and Tsuji, S. (1984), "Attractive quality and must-be quality", *Journal of the Japanese Society for Quality Control*, 14(2), 39–48 (from knowledge).
- [textbook] Pyzdek, T. and Keller, P. (2014), *The Six Sigma Handbook*, 4th ed., McGraw-Hill — VOC and the CTQ tree (from knowledge).
- [textbook] George, M.L. et al. (2005), *The Lean Six Sigma Pocket Toolbook*, McGraw-Hill (from knowledge).

## In Faultline
Partly: the capability study asks the question first — a measurement
with its limits, sold by weight, pass or fail — and holds the limit
(`src/tools/capability`); the CTQ tree from the customer's words
to that limit is not built (FC-141), and would hand each CTQ to its
study and its control plan row.
