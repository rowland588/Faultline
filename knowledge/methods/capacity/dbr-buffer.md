---
id: capacity.dbr-buffer
name: Drum–buffer–rope and buffer management
aka: [DBR, drum buffer rope, buffer management, fever chart, constraint buffer]
discipline: capacity
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Goldratt & Fox 1986; Schragenheim & Dettmer 2000)
needs: [capacity.theory-of-constraints]
next: [planning.scheduling-rules]
alternatives: [lean.kanban-supermarket]
related: [capacity.littles-law]
---
# Drum–buffer–rope and buffer management

## Purpose and principle
The constraint sets the drum beat; a time buffer of work protects it; the rope
releases work only at the drum's pace. Buffer penetration (green, yellow, red)
tells where to expedite.

## Questions it answers
How much work should wait before the constraint? When is it about to starve?

## Inputs and minimum conditions
The constraint's schedule; the buffer time; work released and its status.

## Procedure and calculation
Buffer status = time consumed ÷ buffer length; red above two-thirds.

## Assumptions, limits and misuse
Needs a stable constraint; too big a buffer is WIP.

## Reading the result
"Two batches in the red zone before the oven — chase them."

## When not to use it — and instead
Repetitive flow lines → `lean.kanban-supermarket`.

## In food and FMCG manufacturing
Make-to-order sauces before a constrained filler; batches before an oven.

## References
- [textbook] Goldratt, E.M. and Fox, R.E. (1986), *The Race*, North River Press.
- [textbook] Schragenheim, E. and Dettmer, H.W. (2000), *Manufacturing at Warp Speed*, St Lucie Press.

## In Faultline
Not built (FC-043).
