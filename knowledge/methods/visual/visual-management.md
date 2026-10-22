---
id: visual.visual-management
name: Visual management — normal recedes, the abnormal stands out, who owes what by when
aka: [visual management, visual control, andon board, status colours, am I in control, control room]
discipline: visual
kind: established
evidence: practice
depth: full
checked: 2026-10-22 — lean visual management (Galsworth 2005; Liker 2004); Faultline's rules (one colour one meaning, the state in words beside the marks) in CLAUDE.md "Visual management" and the control room (src/lib/portfolio.ts), proved by scripts/acceptance/control-room.mjs
needs: []
next: [visual.daily-management, visual.action-tracking]
alternatives: []
related: [visual.reports, visual.kpi-tree]
---
# Visual management

## Purpose and principle
The test a board on the floor passes: from across the room, in three seconds,
anyone can tell what is normal, what is not, and who owes what by when. One
colour one meaning; only the abnormal coloured; the state in words beside every mark.

## Questions it answers
Am I in control across every project and line? What needs me now?

## Inputs and minimum conditions
Every record's state, owner and date — kept by the tools, not typed twice.

## Procedure and calculation
Counts by state; late = due before today and not done; the worst first.

## Assumptions, limits and misuse
Dashboards of green that hide the red; colour without words.

## Reading the result
"4 late · 2 critical problems · 11 to do — line 3's labeller test the oldest."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Line-side boards, the control room, the daily meeting.

## References
- [textbook] Galsworth, G.D. (2005), *Visual Workplace, Visual Thinking*, Visual-Lean Enterprise Press.
- [decision] Rowland, 2 October: "follow the lean visual management principles throughout the app" — CLAUDE.md.

## In Faultline
The control room (`src/lib/portfolio.ts`), Needs you, the five state colours (FC-193, FC-195).
