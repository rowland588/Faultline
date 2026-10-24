---
id: ergonomics.rula-reba
name: RULA and REBA — posture scores
aka: [RULA, REBA, rapid upper limb assessment, rapid entire body assessment, posture, action level]
discipline: ergonomics
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-24 — McAtamney & Corlett (1993) for RULA and Hignett & McAtamney (2000) for REBA; the action levels (RULA 1–2, 3–4, 5–6, 7; REBA 1, 2–3, 4–7, 8–10, 11–15) from knowledge of the published papers and to be confirmed against them; the scoring tables A, B and C are the papers' and are not reproduced here; the worked level in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [ergonomics.hse-mac-art]
alternatives: [ergonomics.hse-mac-art]
related: [ie.micro-motion, ie.video-time-study, ie.allowances]
---
# RULA and REBA — posture scores

## Purpose and principle
Two observational methods that turn a working posture into a number
and an action level. **RULA** (Rapid Upper Limb Assessment) scores the
upper arm, lower arm and wrist (group A) and the neck, trunk and legs
(group B) from their angles, adds muscle use (static or repeated) and
force, combines them through its tables into a grand score of 1–7 and an
action level: 1–2 acceptable; 3–4 investigate further; 5–6 investigate
and change soon; 7 investigate and change immediately. **REBA** (Rapid
Entire Body Assessment) does the same for the whole body with the load,
the coupling (grip) and the activity (static, repeated, unstable),
giving a score of 1–15 and a level: 1 negligible; 2–3 low; 4–7 medium;
8–10 high; 11–15 very high — action necessary now. Both are quick, from
a photograph or a video frame, and their value is in ranking postures
and showing a change's effect; neither measures the shift.

## Questions it answers
- How bad is this posture, and how soon must it change?
- Which body part drives the score — the wrist, the trunk, the neck?
- Does a change (a raised bench, a tilted tote, a tool) lower the score
  and the level?
- Across the shift's postures, which are the worst and how often are
  they held?

## Inputs and minimum conditions
- The posture to score: the worst or the most frequently held, seen
  from the side and the front (a photo or a video frame — the video
  study's footage serves — `ie.video-time-study`).
- The angles read (upper arm flexion, lower arm, wrist, neck, trunk,
  legs), the load or force, the muscle use or activity, the grip.
- The methods' own scoring sheets and tables (the published papers or
  their worksheets), not a memory of them.
- For a shift's picture, several postures with how long each is held
  (`ie.work-sampling`'s sampling gives the shares).

## Procedure and calculation
- RULA: group A score from the arm and wrist table; group B from the
  neck, trunk and legs table; each plus muscle-use and force scores;
  the grand score from table C; the action level by the bands above.
- REBA: group A (trunk, neck, legs) plus load; group B (upper arm, lower
  arm, wrist) plus coupling; combined in table C plus the activity
  score; the level by the bands above.
- Score both sides where the task is asymmetric; score the worst and
  the typical posture and say which.
- After a change, re-score the same posture; the level's movement is
  the evidence (before → after).
- Sample the shift: postures scored at random moments weighted by their
  share give the exposure, not one snapshot.

**Worked case** (`cases-projects-people-ergo-sust.py`): reaching into a
deep tote at a low bench to lift product — RULA grand score 6: investigate
and change soon; the drivers are the trunk flexion and the upper arm
raised with the wrist bent. A tilted tote stand and a bench 15 cm higher
would bring the trunk and arm scores down; re-score after fitting
them. The tables that produced the 6 are the method's own, read from the
published sheet.

## Assumptions, limits and misuse
- One posture snapshot standing in for a shift; the shift is a
  distribution of postures, sampled.
- Angles estimated from a bad camera angle are wrong; side and front
  views.
- The tables remembered rather than read drift; the published sheets
  are the authority.
- The methods rank and screen; they do not measure injury risk
  directly or replace a full assessment for a high level.
- Scoring the person rather than the task: the fix is the bench, the
  tote, the tool.

## Reading the result
"RULA 6 — investigate and change soon; the trunk and the raised arm
drive it: a tilted tote and a higher bench, then re-score." Money: an
injury's cost (`knowledge/MONEY.md`, C and L) against the bench; a
posture that slows the work also costs time (T) the time study shows.

## When not to use it — and instead
Lifting and repetitive-task screens by the UK regulator →
`ergonomics.hse-mac-art`. Motion detail at the element level →
`ie.micro-motion`. The posture's share of the day → `ie.work-sampling`.
The rest allowance for the posture in the standard → `ie.allowances`.

## In food and FMCG manufacturing
Reaching into deep totes; packing at low benches; loading trays
overhead; the sandwich line's repeated wrist flexion; the depositor
operator's neck at a screen.

## References
- [paper] McAtamney, L. and Corlett, E.N. (1993), "RULA: a survey method for the investigation of work-related upper limb disorders", *Applied Ergonomics*, 24(2), 91–99 (from knowledge).
- [paper] Hignett, S. and McAtamney, L. (2000), "Rapid Entire Body Assessment (REBA)", *Applied Ergonomics*, 31(2), 201–205 (from knowledge).

## In Faultline
Not built (FC-210, research first: the scoring tables are the papers'
and are to be taken from them). The video study's frames
(`src/tools/video`) are the pictures a posture would be scored from;
when built, a posture scored from a frame with its angles, the level in
words, the drivers, and the re-score as before → after.
