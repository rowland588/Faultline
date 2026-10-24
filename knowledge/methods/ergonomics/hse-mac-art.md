---
id: ergonomics.hse-mac-art
name: HSE's MAC and ART — manual handling and repetitive upper-limb tasks
aka: [MAC tool, manual handling assessment charts, ART tool, assessment of repetitive tasks, HSE INDG383, INDG438, lifting carrying team handling]
discipline: ergonomics
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — HSE's MAC (INDG383) and ART (INDG438) as published by the Health and Safety Executive: their structure (factors scored in colour bands, totals ranking tasks) from knowledge; the factor scores and the ART exposure bands (low 0–11, medium 12–21, high 22+) are quoted from memory and are to be read from the published charts before use — the texts could not be fetched from here; no arithmetic invented in `scripts/knowledge/cases-projects-people-ergo-sust.py` beyond the structure
needs: []
next: [ergonomics.rula-reba, ergonomics.niosh-lifting]
alternatives: [ergonomics.niosh-lifting]
related: [ie.allowances, ergonomics.push-pull, ie.work-sampling]
---
# HSE's MAC and ART — manual handling and repetitive upper-limb tasks

## Purpose and principle
The UK regulator's two screening tools for the risks that fill a food
factory's injury book: **MAC** (Manual handling Assessment Charts) for
lifting, carrying and team handling, and **ART** (Assessment of
Repetitive Tasks) for repetitive work of the arms and hands — packing,
loading, sorting. Each walks an observer through the task's factors
(for MAC: load weight against frequency, hand distance from the lower
back, vertical lift region, trunk twisting and sideways bending,
postural constraints, grip, floor surface, environment, and for carrying
the distance and obstacles; for ART: arm movements, repetition, force,
head and neck, back and arm postures, wrist, hand grip, breaks, work
pace, other factors, and the duration of the task), scores each factor
in a colour band — green (low), amber (medium), red (high), purple
(very high / unacceptable) — with the chart's numerical score for that
band, and sums the scores so that tasks can be ranked and the factors
driving each are seen. They are screens that say which tasks need
action first and where; a full risk assessment follows for the red and
purple ones.

## Questions it answers
- Which handling and repetitive tasks on the line need action first?
- Which factors drive each task's score — the load, the posture, the
  frequency, the grip?
- Does a change (a lower bench, a smaller tote, a job rotation) move the
  task's band?
- Is any task purple — unacceptable as it stands?

## Inputs and minimum conditions
- The task observed as it is done, for long enough to see the usual and
  the worst case; the load weighed; the frequency counted; distances and
  heights measured.
- The HSE charts themselves (the current published editions) for the
  factor bands and scores — not a memory of them.
- A trained assessor; the people who do the job asked what hurts.

## Procedure and calculation
- MAC: for each factor read the band from the chart (the load/frequency
  graph; the posture pictures; the grip, floor and environment
  descriptions); record the colour and its score; total score = Σ factor
  scores; any purple is unacceptable regardless of the total; tasks
  ranked by total; the red factors are the actions.
- ART: for each factor the band and score for each arm (left and
  right) separately; the task score = Σ; the exposure score = task score
  × the duration multiplier (longer daily exposure raises it); the band
  — low, medium, high — by the published thresholds (quoted here from
  memory as 0–11, 12–21, 22+; confirm on the chart).
- After a change, re-score; the band's movement is the evidence
  (before → after as any PDCA — `rca.pdca`).
- The rest allowance for the work's heaviness in the standard time
  (`ie.allowances`) and the shares of the day in handling
  (`ie.work-sampling`) read beside the scores.

**Worked case** (`cases-projects-people-ergo-sust.py`, structure
only): case packing at the end of Line 3 — ART exposure score 26, high;
the red factors are repetition (a pack every 2.5 s) and the back and arm
postures at a low bench. The actions: raise the bench, rotate the job
every hour; re-score after — the rotation halves the duration multiplier
for each person and the bench moves the posture factor from red to
amber. The scores per factor are read from the published chart, not
from this record.

## Assumptions, limits and misuse
- A screen, not a full assessment; red and purple tasks get the full
  manual-handling risk assessment the Regulations require.
- Scores remembered rather than read from the charts drift; the
  charts are the authority, and this record's bands are marked to
  confirm.
- One observation of one person on one day may miss the worst case (the
  heaviest product, the end of a long shift).
- The tools cover handling and repetition; pushing and pulling have
  their own (`ergonomics.push-pull`) and posture its own
  (`ergonomics.rula-reba`).
- A total hides a purple factor; the factor colours are read first.

## Reading the result
"Case packing ART score 26 — high; red on repetition and posture: raise
the bench and rotate hourly, then re-score." Money: an injury's cost
(absence, cover, the claim — `knowledge/MONEY.md`, C and L) against the
bench; the rotation's cost is nothing if the crew allows it.

## When not to use it — and instead
A single lift's recommended weight limit → `ergonomics.niosh-lifting`.
Posture in detail → `ergonomics.rula-reba`. Trolleys and pallet trucks →
`ergonomics.push-pull`. The rest allowance in the standard →
`ie.allowances`.

## In food and FMCG manufacturing
Hand-packing and case packing; tray loading and unloading; palletising
by hand; sack handling at intake; the repetitive work of a sandwich
assembly line.

## References
- [guidance] Health and Safety Executive, *Manual handling assessment charts (the MAC tool)*, INDG383 (rev. 2019) (from knowledge; not read from here).
- [guidance] Health and Safety Executive, *Assessment of repetitive tasks of the upper limbs (the ART tool)*, INDG438 (2010) (from knowledge; not read from here).
- [law] Manual Handling Operations Regulations 1992 (as amended) and HSE L23 guidance (from knowledge).

## In Faultline
Not built (FC-209, research first: the charts' scores are HSE's and are
to be taken from the published text, and whether to reproduce them in
the app is a licensing question for `knowledge/GAPS.md`). When built: a
task on a line scored factor by factor with the colours, the total and
the band, the actions, and the re-score as before → after.
