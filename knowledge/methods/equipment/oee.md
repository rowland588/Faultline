---
id: equipment.oee
name: OEE, OOE and TEEP — and why Faultline does not show them
aka: [OEE, overall equipment effectiveness, OOE, TEEP, availability performance quality]
discipline: equipment
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — ISO 22400-2:2014 defines OEE among its KPIs (scope checked online); OEE = availability × performance × quality (Nakajima 1988); left out of Faultline 10 October (docs/LEAN40.md "Decided, 10 October")
needs: [equipment.time-model-losses]
next: []
alternatives: [equipment.time-model-losses]
related: [capacity.three-capacities]
---
# OEE, OOE and TEEP — and why Faultline does not show them

## Purpose and principle
OEE = availability × performance × quality: run time ÷ planned time, (ideal
cycle × total count) ÷ run time, good count ÷ total count. Equivalent to
valuable operating time ÷ planned production time. OOE uses operating time
instead of planned time; TEEP uses all calendar time.

## Questions it answers
How much of planned time made good product at the ideal speed?

## Inputs and minimum conditions
Planned time, stop time, total and good counts, the ideal cycle time — the same as the time model.

## Procedure and calculation
As above. Note: OEE equals the time model's valuable time ÷ planned time.

## Assumptions, limits and misuse
- A single percentage hides which loss to attack; the product of three ratios
  invites gaming (inflating the ideal cycle raises performance).
- Typed by hand, its availability is a guess — the reason Faultline left it out.
- Comparing OEE between lines with different products and definitions.

## Reading the result
"OEE 62%" says little; the waterfall of its losses says what to do.

## When not to use it — and instead
Always the loss waterfall in minutes, packs and money → `equipment.time-model-losses`.

## In food and FMCG manufacturing
Widely reported; often from machine data the floor cannot see.

## References
- [standard] ISO 22400-2:2014, *Automation systems and integration — Key performance indicators (KPIs) for manufacturing operations management — Part 2: Definitions and descriptions* — scope checked online 22 Oct 2026.
- [textbook] Nakajima, S. (1988), *Introduction to TPM*, Productivity Press.
- [decision] Rowland, 10 October: "We will not have Internet of anything ... there is no OEE (typed by hand, its availability is a guess)" — docs/LEAN40.md.

## In Faultline
Left out on purpose (FC-050). The loss count gives the same decomposition as
a waterfall in minutes, packs and pounds.
