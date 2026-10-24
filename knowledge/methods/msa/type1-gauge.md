---
id: msa.type1-gauge
name: Is the gauge fit at all? — the Type 1 gauge study (Cg, Cgk)
aka: [Type 1 study, gauge capability, Cg, Cgk, repeatability on a reference, resolution check]
discipline: msa
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — Cg and Cgk as the automotive practice defines them (VDA Volume 5; Bosch booklet 10; Minitab's Type 1 study) from knowledge — the constants (20% of the tolerance against 6s; 10% against the bias; ≥ 1.33) to confirm against VDA 5's current edition, text not read; the worked case computed independently in `scripts/knowledge/cases-msa.py`
needs: []
next: [msa.gauge-rr]
alternatives: [msa.bias-linearity-stability]
related: [packaging.checkweigher-verification, msa.measurement-uncertainty]
---
# Is the gauge fit at all? — the Type 1 gauge study (Cg, Cgk)

## Purpose and principle
Before any capability study, control chart or acceptance test, the gauge
itself is measured: one reference piece, one operator, 25–50 repeat
readings. If the gauge's own spread takes a large share of the tolerance
there is nothing to study — the readings are the gauge, not the process.
Cg compares the gauge's spread with a slice of the tolerance; Cgk also
charges it for its bias from the reference. It is the quickest, cheapest
measurement check, and the one most often skipped.

## Questions it answers
- Does this scale / probe / gauge repeat well enough for this tolerance?
- Is it biased against the reference — reading high or low?
- Is its resolution fine enough (does it show the differences that matter)?

## Inputs and minimum conditions
- A reference of known value in the middle of the working range (a
  calibrated weight, a certified thermometer bath, a reference seal strip).
- The tolerance T of the characteristic the gauge will judge (USL − LSL;
  for a one-sided limit, twice the distance from target to the limit, said
  as such).
- One operator, same place and conditions, 25–50 readings in a row
  (50 usual), the reference removed and replaced each time where that is
  how it will be used.

## Procedure and calculation
- x̄ and s of the n readings; bias = x̄ − x_ref.
- Cg = (0.2·T) / (6s) — the gauge's 6s against 20% of the tolerance.
- Cgk = (0.1·T − |x̄ − x_ref|) / (3s) — the same, with the bias eating into
  the half-slice.
- Acceptance: Cg ≥ 1.33 and Cgk ≥ 1.33 (the common requirement; some
  customers set the slice at 10% of T or the threshold at 1.67 — the
  study says which it used).
- Resolution: the gauge's least count ≤ 5% of T (a 0.1 g scale on a 2 g
  tolerance is at the limit).
- Bias real or not: t = (x̄ − x_ref) / (s/√n) against t₀.₉₇₅,ₙ₋₁; a real bias
  is corrected (calibrated out) and the study repeated, or carried as an
  offset.
- Also said: 6s as a share of T (%), so a failing Cg is read as "the gauge
  uses 22% of the tolerance".

**Worked case** (`cases-msa.py`): a bench scale, 50 readings on a 500.0 g
reference, tolerance 10 g (495–505). x̄ 500.112 g, s 0.073 g, bias
+0.112 g. Cg = 4.54, Cgk = 4.03 — both far above 1.33; 6s is 4.4% of the
tolerance; resolution 0.01 g is 0.1% of T. The bias is real (t = 10.8
against 2.01) but small against the tolerance — recorded and corrected at
the next calibration, the gauge used meanwhile.

## Assumptions, limits and misuse
- One reference, one operator, one day: says nothing about operators
  (`msa.gauge-rr`), the range (`msa.bias-linearity-stability`) or time
  (stability). It is the gate, not the whole study.
- A reference not at the working value hides a linearity problem; use the
  middle of the range, or two references.
- The tolerance is the characteristic's, not a round number: a Cg on the
  wrong T is meaningless.
- The 20%/10% slices and the 1.33 threshold are automotive conventions,
  not laws; a food line may agree 30% and 1.0 for a non-critical check —
  written down, with the reason.
- A checkweigher's own verification follows its own rules
  (`packaging.checkweigher-verification`); the Type 1 is the bench scale
  and the probe.

## Reading the result
"The bench scale repeats to 0.07 g and reads 0.11 g high against 500.0;
Cg 4.5, Cgk 4.0 — fit for a 10 g tolerance (uses 4% of it)." A failing
gauge: "uses 28% of the tolerance — not fit; nothing measured with it can
be trusted to ±1 g; replace or repair before the study." The money is the
decisions the gauge gets wrong — good product rejected and bad passed —
sized by `msa.gauge-rr`; the Type 1 says only whether to go on.

## When not to use it — and instead
Several operators or several parts → `msa.gauge-rr`. Bias across the
range or over weeks → `msa.bias-linearity-stability`. Pass/fail judgement
by eye → `msa.attribute-agreement`. The uncertainty to state on a
certificate → `msa.measurement-uncertainty`.

## In food and FMCG manufacturing
The bench scale used for give-away checks; the temperature probe used at a
CCP; the refractometer; the seal-strength tester; the oxygen analyser —
each against its reference, before the first reading it will be trusted
for.

## References
- [practice] VDA Volume 5, *Measurement and Inspection Processes — Capability, Planning and Management* (3rd ed. 2021) — the Type 1 study's constants (from knowledge; to confirm, text not read).
- [practice] Robert Bosch GmbH, *Quality Management in the Bosch Group — Booklet 10: Capability of Measurement and Test Processes* — procedure 1 (from knowledge).
- [manual] AIAG, *Measurement Systems Analysis*, 4th ed., 2010 — bias and repeatability on a reference (from knowledge).

## In Faultline
Not built (FC-119). When built: a short study a gauge, its reference and
tolerance typed, 25–50 readings tapped in, Cg/Cgk and the share of the
tolerance said in words, the bias flagged with its correction, and the
gauge's record carried to every study that names it so a capability study
says "measured with a gauge that uses 4% of the tolerance".
