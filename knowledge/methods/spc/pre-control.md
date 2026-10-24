---
id: spc.pre-control
name: Pre-control — set-up and running checks against the tolerance
aka: [stoplight control, rainbow chart, traffic-light control, Satterthwaite's pre-control]
discipline: spc
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the rules as Shainin's practice and Montgomery ch. 10 give them (from knowledge); the zone probabilities at Cp 1, 1.33 and 2 and at a 1.5σ shift computed independently in `scripts/knowledge/cases-spc.py`; the statistical case against it as Ledolter & Swersey (1997) and Montgomery argue (from knowledge)
needs: [spc.capability-measured]
next: [spc.control-charts-variables]
alternatives: [spc.control-charts-variables]
related: [changeover.first-off-release, quality.control-plan]
---
# Pre-control — set-up and running checks against the tolerance

## Purpose and principle
A set-up and running check that needs no calculation on the floor: the
tolerance is split into zones — green in the middle half, amber the
remaining quarters, red outside — and a few readings decide whether to
carry on, adjust, or stop. It is a check against the *specification*, not
the process's own variation, which is both its appeal (nothing to compute)
and its weakness (it says nothing about stability).

## Questions it answers
- Is the set-up good enough to start the run (after a changeover)?
- Is the run still inside the tolerance with margin, or drifting toward a
  limit?

## Inputs and minimum conditions
A two-sided tolerance (nominal ± t). A process already known capable
(Cp ≥ 1.33, better 1.67 — see the probabilities below) and centred. A
reading that can be taken on the spot.

## Procedure and calculation
- Zones: green within nominal ± t/2 (the middle half of the tolerance);
  amber from ± t/2 to ± t; red beyond ± t.
- Set-up: take readings one at a time; **five consecutive greens** qualify
  the set-up. An amber restarts the count; a red means adjust and restart.
- Running: at intervals (commonly 6 pairs between adjustments), sample
  **two** readings —
  - both green, or one green and one amber → carry on;
  - two amber on the same side → adjust toward nominal, then re-qualify
    with five greens;
  - two amber on opposite sides → stop: the spread has grown, find why;
  - any red → stop, find why, re-qualify.
- Sampling interval: Shainin's rule of thumb is the time between
  adjustments ÷ 6.

**What the zones mean in probability** (centred normal process,
`cases-spc.py`): at Cp 1.0 (tolerance = ±3σ) a reading is green 86.6% of
the time, amber 13.1%, red 0.27%; five greens in a row happen only 49% of
the time, so set-up is a struggle. At Cp 1.33: green 95.4%, amber 4.6%,
red 0.007%; five greens 79%. At Cp 2.0: green 99.7%, five greens 98.7%,
and the chart almost never says anything. A process shifted 1.5σ at Cp 1 is
green only 50% and red 6.7% — the pairs will mostly catch it, but late. So
pre-control is comfortable only where capability is already high, and
there it mostly confirms what is known.

## Assumptions, limits and misuse
- Uses the specification, not the process's variation, so it neither proves
  nor tracks stability; a process can be out of control and all green.
- Two readings a check give very little power against a modest shift; the
  "adjust" rule on two ambers at Cp 1 fires by chance 0.9% of the time and
  invites tampering.
- Zones at a quarter of the tolerance assume the tolerance was set with a
  margin; a tight tolerance on a marginal process makes pre-control a
  stop-and-adjust machine.
- Not for one-sided limits as written (adapt: green the half nearest
  nominal, or use a one-sided chart instead).
- Ledolter & Swersey (1997) and Montgomery: not a substitute for a control
  chart; at most a set-up aid on a capable process.

## Reading the result
"Set-up qualified: 5 greens (401.1, 400.8, 399.6, 400.3, 400.9 g on
400 ± 4)." · "Pair at 10:30 — two amber high (403.1, 402.6): adjust down,
re-qualify." · "Red at 11:05 — 404.6 g: stop; the hopper level." The money
of a stop is the line's lost minutes (`knowledge/MONEY.md`, causation T).

## When not to use it — and instead
To know whether the process is stable, or to find when it changed →
`spc.control-charts-variables`. To prove it capable → `spc.capability-measured`.
A first-off check after a changeover that also covers labels, codes and
allergens → `changeover.first-off-release`.

## In food and FMCG manufacturing
A first-off weight and seal check after a changeover on a capable filler;
slice thickness after a blade change; a depositor set-up where the
operator has a scale and no chart. Useful as the floor's own quick rule
where a chart will follow, never as the record of capability.

## References
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 10 — pre-control and its limitations (from knowledge; edition to confirm).
- [paper] Ledolter, J. and Swersey, A. (1997), "An evaluation of pre-control", *Journal of Quality Technology* 29(2), 163–171 — the statistical case against it (from knowledge).
- [practice] Shainin, D. and Shainin, P. — pre-control as taught in the Shainin system (from knowledge; no single text read).

## In Faultline
Not built (FC-092). If built it is a mode of the first-off check on a
changeover, drawing the three zones from the tolerance the product already
holds, counting the five greens and reading the pairs in words — and it
says on its face that it is not a control chart and not capability.
