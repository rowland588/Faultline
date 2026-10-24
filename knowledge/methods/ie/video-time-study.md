---
id: ie.video-time-study
name: Time study from footage — elements marked on the video, measured against the truth
aka: [video time study, filmed work study, footage study, video work measurement, line balance from video]
discipline: ie
kind: adaptation
evidence: practice
depth: full
checked: 2026-10-24 — filming for work study is long practice (Gilbreth's micromotion films; video-based work measurement in every modern IE text); Faultline's reading of elements from footage, its review on the footage and its measured accuracy are its own (`docs/VIDEO.md`, `docs/VIDEO-DESIGN.md`, `scripts/video-eval.mjs`); the error figures in the worked case are illustrative, computed in `scripts/knowledge/cases-ie.py` — the real ones are whatever `video-eval` measures on the day
needs: [ie.time-study]
next: [capacity.line-balancing]
alternatives: [ie.time-study]
related: [ie.work-sampling, ie.micro-motion, stats.sample-size-power]
---
# Time study from footage — elements marked on the video, measured against the truth

## Purpose and principle
A stopwatch study needs the analyst beside the station for every cycle;
footage lets the cycles be read afterwards, paused, re-read, and read by
two people the same way. The element boundaries are marked on the
footage (by a person, or proposed from the movement and reviewed by a
person); the times between marks are the element times; from there it
is a time study — rating, allowances, the balance against takt. What
footage adds is a record anyone can check and a measurable accuracy:
the reading can be compared with a known truth, and its error stated.
What it cannot do is judge pace (rating) or see what the camera did not.

## Questions it answers
- How long does each element and each cycle take — from footage anyone
  can re-read?
- How accurate is the reading (against known times), and how many
  cycles does the mean need?
- Which station sets the pace; is the line balanced against takt?
- When does work start and stop at each station, and where are the
  gaps?

## Inputs and minimum conditions
- Footage filmed as the study needs it (`docs/VIDEO-DESIGN.md`: the
  phone fixed, side-on and raised, every station in frame, at least ten
  whole cycles of the slowest station, steady light, sound off) — and
  checked fit before it is read (camera shake, the station out of
  frame).
- The element definitions with their start and end points, as for a
  stopwatch study.
- A person to review the marks on the footage — accept, move, reject —
  and to rate where a standard is wanted.

## Procedure and calculation
- Elements marked on the footage: each boundary a timestamp; element
  time = next boundary − this one; cycle = the sum; the gaps with no
  movement flagged as such (the study never calls a gap "waiting" on
  its own — a person says what it was).
- Then as `ie.time-study`: the cycles' mean and spread per element, the
  outliers questioned on the footage (a dropped pack, a wait), rating by
  the reviewer if a standard is wanted, allowances (`ie.allowances`).
- Accuracy: the reading's error against footage with known times
  (`scripts/video-eval.mjs` — condition by condition: lighting, angle,
  several people in frame); the mean error (bias) and its spread per
  boundary; said on the study as ± on each element.
- How many cycles: from the cycle time's spread and the precision wanted
  (`stats.sample-size-power`): n = (z·s/e)².
- The line balance from the footage: each station's cycle against takt
  (`capacity.line-balancing`); the pace-setting station; the people over
  takt.
- The camera's AI naming the work from frames is offered, off until
  ticked, and says what it sends (`docs/VIDEO.md`); nothing the AI says is
  a figure — the figures are the marks.

**Worked case** (`cases-ie.py`, illustrative): eight cycles read from
footage against their true times — mean error +0.14 s, spread 0.34 s,
largest 0.4 s; the cycle mean read 40.42 s against 40.29 true. For the
cycle mean to ±0.5 s at 95% with the cycle's own spread (1.32 s) the
footage needs 27 cycles — so the ten-cycle minimum gives the shape and
the pace-setter, not a standard.

## Assumptions, limits and misuse
- Footage cannot rate pace; a standard from footage still needs a
  reviewer's rating, and the study says when it has none.
- The camera sees one angle; an element that happens out of frame is a
  gap on the footage and a guess in the study. The fit check before
  reading is the guard.
- Shake, a moving camera or a person walking through the frame are
  flagged, and the events inside them are ± wider, never silently exact.
- Reading boundaries from movement is a measurement with an error; the
  error is measured and shown, not assumed zero.
- Filming people is a matter of consent and purpose; the people are
  labels in the study, faces are not the subject, the footage is kept
  under the site's rules and deleted when the study is done.
- Ten cycles balance a line; a standard needs more (above).

## Reading the result
"From 14 cycles of footage: the bagger's cycle is 41.2 ± 0.4 s, the
packer's 38.0 ± 0.3; against a 40 s takt the bagger is over by 1.2 s
(3%) — it sets the pace; two gaps of 6 s at the packer, a person says
what they were." Money: the pace-setter's seconds over takt × packs a
shift × margin (`knowledge/MONEY.md`, T) — the balance's money, from
footage anyone can re-check.

## When not to use it — and instead
A standard with rating, on the spot → `ie.time-study`. A long period's
activity shares, not cycles → `ie.work-sampling`. Motion-level analysis
→ `ie.micro-motion`. Whether the phone can film it at all → the video
feasibility check (`docs/VIDEO-FEASIBILITY.md`).

## In food and FMCG manufacturing
Hand-assembly and packing lines balanced from one morning's footage; a
new line's first cycles kept for the OEM discussion; a disputed standard
re-read by both sides on the same footage; a station too crowded for an
analyst to stand at.

## References
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014 — video in work measurement (from knowledge).
- [textbook] Barnes, R.M., *Motion and Time Study*, 7th ed., 1980 — micromotion film study (from knowledge).
- [practice] Faultline's own design and measured accuracy — `docs/VIDEO.md`, `docs/VIDEO-DESIGN.md`, `docs/VIDEO-FEASIBILITY.md`, `scripts/video-eval.mjs`.

## In Faultline
Built in part (FC-021): the video study (`src/tools/video/VideoScreen.tsx`)
with footage fit checks, element marks proposed and reviewed on the
footage, the ± per boundary, the balance against takt and its paper;
accepted by `scripts/acceptance/video-study.mjs` and `video-fit.mjs`;
accuracy measured by `scripts/video-eval.mjs`. Not yet: rating by the
reviewer, allowances, and the cycles-needed sentence on the study.
