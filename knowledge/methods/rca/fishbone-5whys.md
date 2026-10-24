---
id: rca.fishbone-5whys
name: The fishbone and the five whys — causes on six bones, each drilled and evidenced (the 6M)
aka: [fishbone, Ishikawa diagram, cause and effect diagram, 6M, five whys, 5 whys, root cause analysis, why why analysis]
discipline: rca
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Ishikawa (1982) and Ohno (1988, the five whys); Faultline's 6M (bones People, Machine, Method, Material, Measurement, Environment; each cause says how it is known) in docs/SIXM.md and docs/OPEX.md, src/lib/sixm.ts, proved by sixm tests and scripts/acceptance/sixm-evidence.mjs
needs: [quality.pareto]
next: [rca.pdca, stats.doe-factorial, rca.horizontal-deployment]
alternatives: [rca.is-is-not, rca.fault-tree, rca.eight-d]
related: [rca.stratification, ie.work-sampling, lean.value-stream-mapping]
---
# The fishbone and the five whys (the 6M)

## Purpose and principle
The problem at the head; possible causes placed on six bones — people,
machine, method, material, measurement, environment — so none is forgotten;
each cause drilled with "why?" until a cause that can be acted on, and each
marked with how it is known (measured, counted, observed, reported), so
evidence and opinion are told apart. Countermeasures follow the causes; proof
on the same number; holding.

## Questions it answers
Why does this keep happening? Which causes are proved, which only suspected?
What are we doing about each, and did it work?

## Inputs and minimum conditions
A problem stated with its number (from a Pareto, a constraint, a capability);
the team that knows the process; evidence from the tools.

## Procedure and calculation
Causes per bone; why-chains; evidence links; countermeasures with owner and
date; before → after on the problem's number (`stats.two-sample-tests`).

## Assumptions, limits and misuse
- A fishbone of opinions with no evidence is a brainstorm, not an analysis.
- Stopping the whys at "operator error".
- One cause chosen before the data.

## Reading the result
"Film breaks: three causes measured (splice tension, reel core, jaw temp), two observed; the splice fix cut breaks 61%, holding 4 weeks."

## When not to use it — and instead
Where and when it occurs is unclear → `rca.is-is-not`. Customer escalation
needing a formal report → `rca.eight-d`.

## In food and FMCG manufacturing
Seal failures, give-away, line stops, complaints.

## References
- [textbook] Ishikawa, K. (1982), *Guide to Quality Control*, APO.
- [textbook] Ohno, T. (1988), *Toyota Production System*, Productivity Press — the five whys.
- [practice] docs/SIXM.md and docs/OPEX.md — Faultline's method.

## In Faultline
The 6M (`src/lib/sixm.ts`, the fishbone `src/lib/fishbone.ts`), FC-146 to FC-148.
Since 24 October the head of the fish says its hours a week in money by the
line's cost model, and a countermeasure its worth from the share of the
problem it should remove (`knowledge/specs/FC-146-sixm-money.md`,
`src/lib/sixmMoney.ts`).
