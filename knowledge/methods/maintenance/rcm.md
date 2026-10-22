---
id: maintenance.rcm
name: Reliability-centred maintenance — the task chosen by the failure's consequence
aka: [RCM, RCM II, SAE JA1011, failure consequences, maintenance strategy]
discipline: maintenance
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — SAE JA1011 (evaluation criteria for RCM processes) and Moubray (1997), from knowledge
needs: [maintenance.criticality]
next: [maintenance.planned-maintenance]
alternatives: [quality.fmea]
related: []
---
# Reliability-centred maintenance

## Purpose and principle
For each function and failure mode of a machine, the consequence decides the
task: on-condition, scheduled restoration or discard, failure finding, redesign,
or run to failure.

## Questions it answers
What maintenance should each failure mode get, and why?

## Inputs and minimum conditions
Functions, functional failures, failure modes and effects; their consequences.

## Procedure and calculation
The RCM decision logic per failure mode.

## Assumptions, limits and misuse
Very heavy for every machine; keep it for the critical ones.

## Reading the result
"Seal jaw coating: scheduled replacement at 400 h; sensor: failure-finding check weekly."

## When not to use it — and instead
Ranking first → `maintenance.criticality`.

## In food and FMCG manufacturing
Pasteurisers, retorts, metal detectors.

## References
- [standard] SAE JA1011, *Evaluation Criteria for Reliability-Centered Maintenance (RCM) Processes* — from knowledge.
- [textbook] Moubray, J. (1997), *Reliability-Centred Maintenance*, 2nd ed.

## In Faultline
Research first (FC-065).
