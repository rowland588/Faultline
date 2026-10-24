---
id: spc.machine-capability
name: Machine capability — Cm and Cmk on a short run
aka: [Cm, Cmk, machine performance study, short-term capability, 50-piece study, acceptance capability]
discipline: spc
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — Cm and Cmk as ISO 22514-3 defines the machine study (from knowledge; the standard's edition — 2008, under review — to confirm, text not read); the common acceptance of 1.67 as automotive practice (VDA 4 / customer-specific; from knowledge); the worked case and Bissell's lower bound computed independently in `scripts/knowledge/cases-spc.py`
needs: [msa.type1-gauge]
next: [spc.capability-measured]
alternatives: [spc.capability-measured]
related: [commissioning.acceptance-tests, spc.control-charts-variables]
---
# Machine capability — Cm and Cmk on a short run

## Purpose and principle
A capability study of the machine alone: one short run, one material lot,
one operator, one setting, 50 consecutive pieces — so the only variation
left is the machine's own. It answers "can this machine hold the tolerance
at all?" before the longer question "does the process hold it across
shifts, lots and people?" (`spc.capability-measured`). It is the test
written into equipment acceptance, and the one an OEM is held to.

## Questions it answers
- Does the new (or repaired) machine hold the tolerance with margin, on its
  own, right now?
- Is it centred, or does the setting need moving?
- Should the machine be accepted, or sent back?

## Inputs and minimum conditions
- A measured characteristic with a two-sided tolerance (LSL, USL) — or
  one-sided, then only Cmk's near side.
- 50 consecutive pieces (ISO 22514-3's usual; some customers 100), from one
  lot, one setting, no adjustment during the run, in order.
- A gauge proved fit first (`msa.type1-gauge`): its spread must be small
  against the tolerance or the study measures the gauge.

## Procedure and calculation
- x̄ and s (sample standard deviation, n − 1) of the n pieces.
- Cm = (USL − LSL) / 6s — the spread against the tolerance.
- Cmk = min(USL − x̄, x̄ − LSL) / 3s — the spread and the centring.
- Steadiness over the run: the XmR chart's limits on the same readings;
  a point beyond or a trend means the run was not one setting (a warm-up)
  and the study is repeated from the point it settled.
- Shape: the readings should look normal; a short run of 50 is not enough
  to prove it, so the check is the histogram and the normality test's
  warning, not a verdict (`spc.normality-checks`).
- How sure: a lower confidence bound on Cmk by Bissell's approximation,
  Cmk − z₀.₉₅·√(1/(9n) + Cmk²/(2(n − 1))), says what 50 pieces can prove.
- Acceptance: against the figure agreed in the contract — 1.67 is the
  common automotive and packaging-machinery threshold, 2.0 for some
  customers, 1.33 for a repaired machine. The study is accepted only when
  the point estimate meets it; a buyer who wants proof asks that the lower
  bound meet it, which at n = 50 needs a point estimate about 0.4 higher.

**Worked case** (`cases-spc.py`): 50 consecutive 500 g packs off a new
bagger, tolerance 495–505 g. x̄ = 501.22 g, s = 0.990 g, range 498.7–504.2 g.
Cm = 1.68, Cmk = 1.27 (the near side is the upper limit: 505 − 501.22 =
3.78 g = 3.82σ). Bissell's 95% lower bound on Cmk: 1.05. The XmR limits
498.3–504.1 g hold the run (one reading, 504.2, sits on the limit — a look,
not a fail). Verdict: the machine's spread would pass (Cm 1.68 ≥ 1.67) but
it is set 1.2 g high; re-centre and repeat, and expect Cmk ≈ 1.68 — still
not *proved* ≥ 1.67 by 50 pieces (lower bound ≈ 1.4).

## Assumptions, limits and misuse
- Says nothing about the process over shifts, lots and people; a pass here
  is not a capable process. Cp/Cpk and Pp/Ppk follow in production.
- One setting, one lot, no adjustment: an operator "nudging" during the
  run turns a machine study into a process study with the wrong formula.
- n = 50 gives a wide bound (above): comparing a Cmk of 1.70 with a
  threshold of 1.67 is comparing noise. Say the bound.
- A one-sided tolerance has no Cm; report only Cmk's near side.
- Non-normal output (a bounded fill, a one-sided seal strength): the
  percentile form of ISO 22514-2 is the honest index; or transform and say so.
- Gauge spread: if the gauge's own standard deviation is more than a
  tenth of the tolerance the study's s is inflated (`msa.type1-gauge`).

## Reading the result
"Cmk 1.27 from 50 packs (Cm 1.68) — the spread is fine, the setting is
1.2 g high; re-centre and run again." · "Cmk 1.84, lower bound 1.52 —
meets 1.67 as agreed; not proved beyond doubt by 50 pieces." On an
acceptance test the sentence is the test's pass or fail with the index
beside it, and the money is the acceptance's (a day's delay to the
handover at the line's lost contribution, `knowledge/MONEY.md`).

## When not to use it — and instead
The process over time → `spc.capability-measured`. Counted good/bad →
`spc.capability-attribute-proportion`. Whether the machine runs at the rate
agreed → `spc.held-at-rate`.

## In food and FMCG manufacturing
A new filler, bagger, depositor, slicer or checkweigher at FAT/SAT: 50
consecutive packs at the agreed speed on the agreed product, weight or
seal strength or slice thickness, Cmk against the contract's figure. A
repaired or rebuilt head before it goes back on the line.

## References
- [standard] ISO 22514-3:2008, *Statistical methods in process management — Capability and performance — Part 3: Machine performance studies for measured data on discrete parts* — named from knowledge; edition and the exact study design to confirm, text not read.
- [standard] ISO 22514-2:2017 — the percentile indices for non-normal output (scope checked online 22 Oct 2026).
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — capability indices and their confidence bounds (from knowledge).
- [paper] Bissell, A.F. (1990), "How reliable is your capability index?", *Applied Statistics* 39(3), 331–340 — the lower bound (from knowledge).
- [practice] VDA Volume 4 and customer-specific requirements — Cmk ≥ 1.67 at acceptance (from knowledge; to confirm).

## In Faultline
Not built (FC-084). The commissioning tests record a pass or fail against
what was agreed (`src/project`); the capability study's arithmetic
(`src/tools/capability`, Ppk, Bissell's bound, the steadiness and shape
checks) already does the sums — a machine study is that study run in
acceptance with the 50-piece design, the index named Cmk, and the contract's
threshold as the agreed figure.
