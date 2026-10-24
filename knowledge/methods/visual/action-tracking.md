---
id: visual.action-tracking
name: Actions and problems — who is doing what, why, where, by when
aka: [action tracker, action plan, problems register, punch list, issue log, who what when]
discipline: visual
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — practice; Faultline's Actions (src/lib/projectActions.ts) and the problems register (src/lib/snagsReport.ts), proved by scripts/acceptance/actions.mjs and snags.mjs
needs: []
next: [rca.pdca]
alternatives: []
related: [visual.visual-management]
---
# Actions and problems

## Purpose and principle
Every action with its owner, why, where, by when and priority, and every
problem with its priority and journey, read in one place so nothing is lost and lateness is visible.

## Questions it answers
Who owes what by when? What is late? What is critical?

## Inputs and minimum conditions
Each action and problem as raised by the tools and people.

## Procedure and calculation
By who, when, where; late; priority; closed with what came of it.

## Assumptions, limits and misuse
Actions without owners or dates.

## Reading the result
"23 open, 4 late — Dave owes 3."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Every improvement meeting.

## References
- [practice] from knowledge.

## In Faultline
Actions (`src/lib/projectActions.ts`), the problems register, Every action (FC-154, FC-194).
Since 24 October a problem on the register says what it costs the line a day
while it is open — its typed minutes by the line's cost model, labour and,
where it stops the line, packs and contribution; and the rejects a day it
causes (at the line's materials a pack) and the product it holds (money tied
up at its materials, said as tied up — `cost.inventory-carrying-cost`); the
register's closing line sums them (`knowledge/specs/FC-154-problem-cost.md`,
`src/lib/problemCost.ts`).
