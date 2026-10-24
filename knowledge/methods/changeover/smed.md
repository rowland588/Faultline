---
id: changeover.smed
name: SMED — single-minute exchange of die (Shingo's stages)
aka: [SMED, quick changeover, changeover reduction, internal external, setup reduction]
discipline: changeover
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Shingo (1985) as the method's source; Faultline's version (a grid of who does what, the ladder, the cost) in docs/TOOLKIT.md tool 6 and CLAUDE.md "SMED is a tool"; proved by src/tools/changeover/__tests__/changeover.test.ts and scripts/acceptance/changeover.mjs
needs: []
next: [lean.heijunka-epei, changeover.sequencing, lean.standard-work]
alternatives: []
related: [ie.ecrs, changeover.first-off-release, cost.line-cost-model]
---
# SMED — single-minute exchange of die (Shingo's stages)

## Purpose and principle
A changeover runs from the last good piece to the first good piece (run-up
and adjustments included). Shingo's stages: record every element; separate
internal (machine stopped) from external (done while it runs); convert
internal to external; streamline what is left (parallel work, quick releases,
no adjustments); standardise — aiming at single-digit minutes.

## Questions it answers
How long is the changeover, element by element? What can be done while the
line runs? What does each stage buy back in minutes, packs and money?

## Inputs and minimum conditions
Each element timed with who does it; internal or external; the line's running
pattern (shifts, hours, days — asked, never assumed) and the changeovers a shift.

## Procedure and calculation
- Changeover time = Σ internal elements on the critical path (parallel work counted once).
- Each stage's saving = before − after on that path.
- Cost: changeover minutes × changeovers a shift → a shift, a day (shifts),
  a week (days asked), a year; in minutes, packs at the line's rate and money.

## Assumptions, limits and misuse
- Starting the clock at "machine stopped" misses the run-down and the run-up.
- Shortening changeovers then not changing more often banks nothing.

## Reading the result
"42 minutes, 31 internal; converting 3 elements saves 11; £1,240 a week."

## When not to use it — and instead
Choosing the order of changeovers → `changeover.sequencing`.

## In food and FMCG manufacturing
Pack-size and film changes on flow wrappers; allergen cleandowns (wet and
dry); label and date-code changes; mould changes on chocolate lines.

## References
- [textbook] Shingo, S. (1985), *A Revolution in Manufacturing: The SMED System*, Productivity Press.

## In Faultline
SMED (`src/tools/changeover/changeover.ts`, `src/tools/changeover/ChangeoverScreen.tsx`), FC-068.
