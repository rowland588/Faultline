---
id: people.one-point-lesson
name: One-point lesson
aka: [one point lesson, OPL, single point lesson, SPL, lesson sheet]
discipline: people
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — TPM practice (JIPM; Suzuki 1994 *TPM in Process Industries*) for the one-point lesson's three kinds — basic knowledge, trouble case, improvement case — and its ten-minute teaching at the machine; from knowledge, texts not re-read; Line Talk can draft one (`docs/LINE-TALK.md`); no arithmetic beyond the counts
needs: []
next: [people.skills-matrix]
alternatives: [people.twi-job-instruction]
related: [visual.line-talk, maintenance.autonomous-maintenance, rca.horizontal-deployment]
---
# One-point lesson

## Purpose and principle
One idea, one page, mostly pictures, taught in five to ten minutes at
the machine by whoever learned it — so a fix, a knack or a piece of
knowledge reaches every shift the same day without a classroom. TPM
names three kinds: **basic knowledge** (how this sensor works; what
this gauge should read), a **trouble case** (what went wrong, why, what
to look for), an **improvement case** (what we changed and what it did).
The sheet has a title, the one point, a drawing or photo with the
right and the wrong marked, the date, who wrote it, and a sign-off grid
where each person who was taught initials it — the grid is the measure.
It is not a procedure (that is the breakdown sheet,
`people.twi-job-instruction`) and not a standard (`lean.standard-work`);
it is the way one lesson travels.

## Questions it answers
- How do we share this fix with every shift today?
- Who has been taught this lesson, and who has not?
- Which lessons exist for this machine (the knowledge the line has
  written down)?
- Did the trouble case come back after the lesson?

## Inputs and minimum conditions
- The lesson: one point, in one sentence; a photo or drawing with right
  and wrong marked (the camera on the phone); the kind.
- The author and date; the machine or task it belongs to.
- The people who should know it (the shift's crew, the setters) for the
  sign-off grid.

## Procedure and calculation
- One page: title · the one point · the picture (right ✓, wrong ✗) ·
  the reason · the kind · author and date · the grid.
- Taught at the machine, five to ten minutes, by the author or the team
  leader; each person taught initials the grid with the date.
- Coverage = people taught ÷ people who should know, by shift; a lesson
  below full coverage after a week is the team leader's action.
- Lessons per machine as its knowledge base, read when a new person
  starts or a trouble recurs; a trouble case that recurs after the
  lesson is a cause not found (`rca.fishbone-5whys`), not a lesson to
  re-teach.
- A proved fix's lesson offered to the other lines with the same
  machine (`rca.horizontal-deployment`).

**Worked case**: a trouble case — "the film guide set 2 mm proud
creases the film at the splice": one photo of the guide right, one of
it proud with the crease, the setting to check at every reel change,
written by the night setter who found it, taught to 11 of 12 on the two
shifts in two days (92%); offered to Lines 1 and 7.

## Assumptions, limits and misuse
- A lesson with three points is a procedure; one point.
- Words instead of pictures: the picture is the lesson.
- A sheet pinned up and never taught; the grid is the proof.
- Lessons that contradict the standard: the standard is updated first,
  or the lesson is wrong.
- A trouble case taught again and again instead of its cause being
  found.

## Reading the result
"Film guide proud — the lesson taught to 11 of 12 on both shifts; one
to go; offered to Lines 1 and 7." Money: the trouble the lesson
prevents, by its problem's cost (`knowledge/MONEY.md`); the lesson's
own cost is ten minutes a person (L).

## When not to use it — and instead
Teaching a whole job → `people.twi-job-instruction`. Recording who can
do what → `people.skills-matrix`. The operators' own machine knowledge
as a routine → `maintenance.autonomous-maintenance`. Drafting the words
from what a fitter says → `visual.line-talk`.

## In food and FMCG manufacturing
Setting a film guide; a cleaning step's hard-to-reach place; a
checkweigher's zero check; what a good seal looks like against a bad
one; the allergen utensil colours.

## References
- [textbook] Suzuki, T. (ed.) (1994), *TPM in Process Industries*, Productivity Press — one-point lessons in autonomous maintenance (from knowledge).
- [practice] JIPM (Japan Institute of Plant Maintenance) — TPM education and the one-point lesson sheet (from knowledge).

## In Faultline
Not built (FC-224). The register holds a problem with its photo and its
fix (`src/snag`); Line Talk can write a one-point lesson from what is
said and photographed (`src/tools/talk`, `docs/LINE-TALK.md`). FC-224
would make the lesson a record on a machine — the page, the kind, the
grid with initials and dates by shift, coverage — and offer it sideways.
