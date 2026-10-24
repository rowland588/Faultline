---
id: lean.heijunka-epei
name: Heijunka and EPEI — levelling the mix and every product every interval
aka: [heijunka, levelling, EPEI, every part every interval, production levelling, wheel]
discipline: lean
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — EPEI as Smalley (2004) and Rother & Shook define it, from knowledge; Faultline's SMED interval in src/tools/changeover/changeover.ts (intervalOf)
needs: [changeover.smed]
next: [lean.kanban-supermarket, planning.lot-sizing]
alternatives: [planning.lot-sizing]
related: [changeover.sequencing]
---
# Heijunka and EPEI — levelling the mix and every product every interval

## Purpose and principle
Make a little of every product often, in a fixed repeating pattern, so
upstream sees steady demand. EPEI says how often the line can cycle through
every product given the time left for changeovers.

## Questions it answers
How often can we make every product? Can we change over more and hold less stock?

## Inputs and minimum conditions
Available time, the time the demand needs, each changeover's time.

## Procedure and calculation
EPEI = Σ changeover times ÷ (available time − time to run the demand), in
the period's units — the interval in which the spare time pays for one full cycle of changeovers.

## Assumptions, limits and misuse
Needs short changeovers first (`changeover.smed`); levelling with long changeovers just loses capacity.

## Reading the result
"Every product every 1.5 days; with the changeover halved, every 0.8 days."

## When not to use it — and instead
Economic batch sizes with holding costs → `planning.lot-sizing`.

## In food and FMCG manufacturing
A pack-size wheel on a filling line; allergen order fixed within the wheel (`changeover.sequencing`).

## References
- [textbook] Smalley, A. (2004), *Creating Level Pull*, LEI.
- [textbook] Rother, M. and Shook, J. (1999), *Learning to See*, LEI.

## In Faultline
Partly: SMED gives the interval the changeovers allow (`src/tools/changeover/changeover.ts`, FC-069); a levelled daily mix (heijunka box) is not built (FC-011).
