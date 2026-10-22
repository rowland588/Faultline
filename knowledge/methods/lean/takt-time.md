---
id: lean.takt-time
name: Takt time and the planned cycle time
aka: [takt, customer rate, planned cycle time, pitch time]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — definition as the Lean Lexicon and Rother & Harris give it; Faultline's takt follows Line capacity's target (docs/BUILD.md, the line balance, 17 October)
needs: []
next: [capacity.line-balancing, lean.value-stream-mapping]
alternatives: []
related: [capacity.line-capacity, planning.crew-planning]
---
# Takt time and the planned cycle time

## Purpose and principle
The pace the customer asks for: available working time divided by the
quantity wanted in that time. Every station's work is judged against it. The
planned cycle time is takt tightened for the losses the line will have
(changeovers, stops), so the line can still make the demand.

## Questions it answers
How fast must the line run to meet demand? Which station's work does not fit?

## Inputs and minimum conditions
Available time a shift (the shift less planned breaks and meetings) and demand in that time.

## Procedure and calculation
Takt = available time ÷ demand. Planned cycle time = takt × the share of time
the line truly runs (e.g. × 0.85). In packs a minute: rate needed = demand ÷ available minutes.

## Assumptions, limits and misuse
Takt is set by demand, not by the machine's speed; changing it to fit the line
inverts the logic. Volatile demand needs a takt per period.

## Reading the result
"Takt 1.26 s a pack (48 a minute); the packer at 1.4 s does not keep up."

## When not to use it — and instead
For what the line *can* make → `capacity.line-capacity`.

## In food and FMCG manufacturing
Retailer order quantities per shift; seasonal peaks change takt by the week.

## References
- [practice] Lean Enterprise Institute (2014), *Lean Lexicon*, 5th ed. — takt time.
- [textbook] Rother, M. and Harris, R. (2001), *Creating Continuous Flow*, LEI.

## In Faultline
Line balance's takt (`src/lib/ie/balanceLink.ts`) follows Line capacity's target (60 ÷ the target a minute), or is agreed by hand.
