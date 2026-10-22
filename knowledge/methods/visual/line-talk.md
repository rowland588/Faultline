---
id: visual.line-talk
name: Line Talk — talk on the line, and it writes the reports
aka: [line talk, voice notes, shift report, AI assistant, conversation]
discipline: visual
kind: faultline
evidence: decision
depth: summary
checked: 2026-10-22 — docs/LINE-TALK.md and docs/DIRECTION.md (the only AI is the voice and the camera); proved by scripts/acceptance/line-talk.mjs and line-talk-assistant.mjs
needs: []
next: [visual.action-tracking]
alternatives: []
related: [visual.reports]
---
# Line Talk

## Purpose and principle
A person talks on the line into their phone — the words come up in the box,
then Send — with photos; Claude answers as a colleague and writes what is
asked (a report, a summary, a punch list), knowing the line as Faultline holds
it. It never works out a figure, saves a record or passes a gate.

## Questions it answers
What happened on the line, said and kept? Can it write the report from what I said?

## Inputs and minimum conditions
What is said and photographed.

## Procedure and calculation
None — figures stay with the tools.

## Assumptions, limits and misuse
Treating its words as figures.

## Reading the result
—

## When not to use it — and instead
Any number → the tool that works it out.

## In food and FMCG manufacturing
Shift handovers, OEM punch lists, one-point lessons.

## References
- [decision] Rowland, 20 October: "the only AI is the voice and the camera video system" — docs/DIRECTION.md.

## In Faultline
`src/screens/TalkScreen.tsx` (FC-202).
