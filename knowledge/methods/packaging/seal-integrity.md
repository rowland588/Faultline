---
id: packaging.seal-integrity
name: Seal integrity — leak tests and seal strength
aka: [seal test, leak test, dye penetration, bubble test, burst test, peel strength, seal strength, leakers]
discipline: packaging
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — ASTM F88/F88M-23 (seal strength) and ASTM F2096 (gross leaks by internal pressurisation, bubble test) confirmed online; ASTM F1929 (dye penetration) and F1140 (burst) from knowledge
needs: []
next: [spc.capability-measured, spc.zero-failure-demonstration]
alternatives: []
related: [spc.capability-attribute-proportion, stats.doe-factorial]
---
# Seal integrity — leak tests and seal strength

## Purpose and principle
Two different questions: does the pack leak (integrity — dye, bubble/vacuum,
burst), and how strong is the seal (strength — peel force per width). Strength
is measured, so its capability says far more from fewer packs than counting leakers.

## Questions it answers
Are we making leakers? Is the seal strong enough, consistently?

## Inputs and minimum conditions
The test method and its pass criterion; sample packs per lane and jaw.

## Procedure and calculation
Leak tests: pass/fail counts (`spc.capability-attribute-proportion`,
`spc.zero-failure-demonstration`); strength: N per 15 mm or 25 mm,
one-sided capability (at least) (`spc.capability-measured`).

## Assumptions, limits and misuse
Testing only the first packs of a run; leakers not traced to lane and jaw.

## Reading the result
"Seal strength Ppk 0.92 against at least 8 N/15 mm — lane 3 low."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Tray sealers, flow wrappers, pouches, MAP packs.

## References
- [standard] ASTM F88/F88M-23, *Standard Test Method for Seal Strength of Flexible Barrier Materials* — checked online 22 Oct 2026.
- [standard] ASTM F2096, *Detecting Gross Leaks in Packaging by Internal Pressurization (Bubble Test)* — checked online 22 Oct 2026.
- [standard] ASTM F1929, *Detecting Seal Leaks in Porous Medical Packaging by Dye Penetration* — from knowledge.

## In Faultline
Not built as its own tool (FC-165); a capability study can hold seal strength or pass/fail tests.
