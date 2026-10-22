---
id: ie.work-sampling
name: Work sampling — what people are doing at random moments, with margins
aka: [activity sampling, ratio delay study, snap reading, random observation, work sampling]
discipline: ie
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Tippett's snap-reading method (1935) and the ILO's treatment; margins by the normal approximation to the binomial; Faultline's arithmetic proved by src/lib/ie/__tests__/sampling.test.ts and scripts/acceptance/work-sampling.mjs
needs: []
next: [rca.fishbone-5whys, capacity.line-balancing]
alternatives: [ie.time-study]
related: [stats.confidence-intervals, stats.sample-size-power, capacity.theory-of-constraints]
---
# Work sampling — what people are doing at random moments, with margins

## Purpose and principle
Instead of timing continuously, observe at random moments and note what each
person is doing; the share of observations in each activity estimates the
share of time spent on it. Many observations of many people cheaply give
shares with a known margin.

## Questions it answers
What share of the shift is the packer waiting? How much is walking,
cleaning, adjusting? Where is the bottleneck's crew idle?

## Inputs and minimum conditions
The activities defined so each moment falls in one; the people; random
moments (so routine cycles are not aliased); enough observations for the margin wanted.

## Procedure and calculation
- Share p̂ = observations in the activity ÷ all observations.
- Margin (95%) ≈ 1.96·√(p̂(1 − p̂)/n).
- Observations needed for a margin ±e on a share near p: n = 1.96²·p(1 − p)/e².
- Time = share × the period observed.

## Assumptions, limits and misuse
Moments must be random and independent of the work; observers changing the
behaviour; activities defined loosely.

## Reading the result
"Waiting 22% ±5% of the shift — about 1 h 45 m a person."

## When not to use it — and instead
Short repetitive cycles to standardise → `ie.time-study`.

## In food and FMCG manufacturing
Packing hall crews; hygiene teams; line-side logistics.

## References
- [paper] Tippett, L.H.C. (1935), "A snap-reading method of making time-studies of machines and operatives in factory surveys", *Journal of the Textile Institute Proceedings* 26, 51–55 — from knowledge.
- [textbook] Kanawaty, G. (ed.) (1992), *Introduction to Work Study*, 4th ed., ILO — work sampling.

## In Faultline
`src/screens/SamplingScreen.tsx` with `src/lib/ie/sampling.ts` and the
bottleneck walk (`src/lib/ie/walk.ts`); acceptance `scripts/acceptance/work-sampling.mjs` (FC-022, FC-037).
