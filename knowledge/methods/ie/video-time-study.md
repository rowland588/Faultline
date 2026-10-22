---
id: ie.video-time-study
name: Time study from footage
aka: [video time study, video analysis, filmed work study, video element timing]
discipline: ie
kind: adaptation
evidence: practice
depth: summary
checked: 2026-10-22 — filming for work study is long practice (micromotion study from Gilbreth); Faultline's reading of elements from footage and its measured accuracy in docs/VIDEO.md
needs: [ie.time-study]
next: [capacity.line-balancing]
alternatives: [ie.time-study]
related: [ie.work-sampling]
---
# Time study from footage

## Purpose and principle
The job filmed and the elements timed from the footage — reviewable,
repeatable, and every cycle on the film rather than the few a stopwatch catches.

## Questions it answers
The same as a time study, with the footage as the evidence.

## Inputs and minimum conditions
Footage fit for it (a steady camera, the work in view, long enough for the cycles needed — `docs/VIDEO-DESIGN.md`).

## Procedure and calculation
Element boundaries marked on the footage (by a person, or proposed and reviewed); then as `ie.time-study`.

## Assumptions, limits and misuse
Accuracy depends on the footage; automatic boundaries must be reviewed.

## Reading the result
"18 cycles read; the station's cycle 9.8 s ±0.4."

## When not to use it — and instead
Nothing filmable → stopwatch.

## In food and FMCG manufacturing
Packing stations, case packing, tray loading.

## References
- [textbook] Kanawaty, G. (ed.) (1992), *Introduction to Work Study*, 4th ed., ILO.

## In Faultline
`src/screens/VideoScreen.tsx` with `scripts/acceptance/video-study.mjs`; accuracy measured by `scripts/video-eval.mjs` (FC-021, partly).
