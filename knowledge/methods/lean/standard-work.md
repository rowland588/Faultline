---
id: lean.standard-work
name: Standard work — the three forms (the chart, the combination table, the capacity sheet)
aka: [standardized work, standard work chart, standard work combination table, process capacity sheet, SOP]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — the three forms as Toyota uses them (Liker; the Lean Lexicon); how Faultline maps them, CLAUDE.md "Toyota's three forms"; the line standard proved by scripts/acceptance/line-standard.mjs
needs: [lean.takt-time, ie.time-study]
next: [people.twi-job-instruction, lean.kaizen-event]
alternatives: []
related: [capacity.line-balancing, capacity.line-capacity, ie.person-machine]
---
# Standard work — the three forms

## Purpose and principle
The current best way of doing a job, written down so it is done the same way
every time and so improvement has a baseline. Toyota's three forms: the
**standard work chart** (the layout, where each person works and walks, the
standard inventory, the quality and safety checks); the **standard work
combination table** (each element's manual, walking and machine time on a
timeline against takt); and the **process capacity sheet** (each machine's
manual time, automatic time and tool changes, and what it can make a shift).

## Questions it answers
Who does what where? Does each person's work fit takt? What can each machine make?

## Inputs and minimum conditions
Takt; each element timed (`ie.time-study`); the layout; the machines' automatic times and changes.

## Procedure and calculation
Combination table: elements in order with manual (solid), walking (wavy) and
automatic (dashed) time; the cycle against the takt line. Capacity sheet:
capacity = available time ÷ (manual + automatic time a piece + tool-change time a piece).

## Assumptions, limits and misuse
Standard work written once and never revised is a document, not a standard;
it must be the base for every change.

## Reading the result
"Op 2's cycle 31 s against takt 28 s — over; the wrapper's capacity 4,480 a shift."

## When not to use it — and instead
To share the work between people → `capacity.line-balancing`.

## In food and FMCG manufacturing
Packing-line roles; a sandwich assembly line's stations; hygiene's cleandown standard.

## References
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill.
- [practice] Lean Enterprise Institute (2014), *Lean Lexicon*, 5th ed. — standardized work.
- [textbook] Ohno, T. (1988), *Toyota Production System*, Productivity Press.

## In Faultline
The chart is the Line standard (`src/tools/linestandard/StandardScreen.tsx`); the capacity sheet is Line capacity
(FC-034); the combination table is the Line balance's **Person and machine** lens since 25 October (FC-007): manual,
walking and the machine's run against takt, the person's wait for the machine and the machine's for the person
(`knowledge/specs/FC-032-line-balance.md`). The line standard's money (FC-006) is unchanged
(`knowledge/specs/FC-006-line-standard-money.md`).
