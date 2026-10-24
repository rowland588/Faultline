---
id: people.twi-job-instruction
name: TWI job instruction — the breakdown and four-step teaching
aka: [TWI, training within industry, job instruction, JI, job breakdown sheet, key points, SOP, four-step method]
discipline: people
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Training Within Industry's Job Instruction (US War Manpower Commission, 1940–45) as Dinero (2005) *Training Within Industry* and Graupp & Wrona (2006) *The TWI Workbook* present it: the breakdown (important steps, key points, reasons) and the four steps; from knowledge, texts not re-read; the worked sign-off in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: [lean.standard-work]
next: [people.skills-matrix]
alternatives: []
related: [people.one-point-lesson, lean.standard-work, people.skills-matrix]
---
# TWI job instruction — the breakdown and four-step teaching

## Purpose and principle
"If the worker hasn't learned, the instructor hasn't taught." Job
Instruction is the method for teaching a job so everyone does it the
same way, right, quickly and safely. First the job is broken down — not
into every motion but into **important steps** (the logical segments
that advance the job), each with its **key points** (the few things
that make or break the step: safety, quality, the knack) and the
**reason** for each key point, on one breakdown sheet. Then the
teaching, in four steps: **prepare** the learner (put them at ease, say
the job, find what they know, get them interested, place them
correctly); **present** the operation (tell, show and illustrate one
important step at a time; again with the key points; again with the
reasons — no more than they can master); **try out** (they do it
silently; again telling the steps; again with key points; again with
reasons — until you know they know); **follow up** (put them on their
own, name who helps, check often, taper off). It is the method behind
the standard work's being kept, and the one-point lesson is its
one-page cousin.

## Questions it answers
- How do we teach this job so everyone does it the same, right?
- What are the few key points that make or break each step — and why?
- Who has been taught, tried out and signed off, and who follows up?
- Is a quality or safety problem a training problem (the key point was
  never taught) or a standard problem (it was never written)?

## Inputs and minimum conditions
- The standard work (`lean.standard-work`) — the job as it should be
  done; without it there is nothing to teach.
- The job's experts, to find the key points (ask: what is hard, what
  goes wrong, what hurts, what is the knack).
- Time: a breakdown takes an hour; teaching a job takes as long as it
  takes, one learner at a time.
- The skills matrix to record the result (`people.skills-matrix`).

## Procedure and calculation
- The breakdown sheet: important steps numbered (usually 5–12); key
  points per step (1–3 — safety first, quality, ease); a reason per key
  point. The test of a key point: would leaving it out make or break
  the step?
- The training timetable: who needs which job by when (from the
  matrix's gaps).
- The four steps, as above; the try-out is the proof — the learner does
  it, says the steps, the key points and the reasons back.
- Sign-off after the try-out by the instructor; a re-check at 30 days
  (the standard still followed); the matrix's level set to U with the
  dates.
- Measures: trained, signed off ÷ trained, days to sign-off, re-checks
  passed; a quality problem traced to a key point missing from the sheet
  is a sheet to fix.

**Worked case** (`cases-projects-people-ergo-sust.py`): the wrapper's
film splice broken down — six important steps, nine key points (the
tension lever position; the reel's leading edge cut square; both hands
clear before the clamp — a safety key point), each with its reason. Nine
people trained this month; six signed off after the try-out (67%); three
to try again; re-checks at 30 days booked. The three not yet signed off
are the matrix's L, not U.

## Assumptions, limits and misuse
- Long SOPs nobody reads instead of breakdowns: a 14-page procedure is
  not a teaching document.
- Teaching by "watch Dave" passes on Dave's habits, not the key points.
- Signing off at the presentation, without the try-out, signs off
  nothing.
- A breakdown is for teaching; it is not the standard itself (the
  standard is the chart — `lean.standard-work`).
- Rushing the four steps to fill a shift puts an untrained person on
  the machine with a signature beside them.

## Reading the result
"Film splice: 6 steps, 9 key points; 9 trained, 6 signed off, 3 to try
again; re-checks on the 24th." Money: the cost of not teaching is the
stops, rejects and injuries the key points prevent
(`knowledge/MONEY.md`, T, Q, C) — said by the problem it fixes; the
training's own cost is hours (L).

## When not to use it — and instead
One fix shared on one page today → `people.one-point-lesson`. The
standard the job is taught to → `lean.standard-work`. Who needs
teaching and the cover gaps → `people.skills-matrix`.

## In food and FMCG manufacturing
Machine set-ups and changeovers; hygiene cleans (the key points are the
allergen and the hard-to-reach places); CCP checks; QA sampling; the
new starter's first week.

## References
- [textbook] Dinero, D.A. (2005), *Training Within Industry: The Foundation of Lean*, Productivity Press (from knowledge).
- [textbook] Graupp, P. and Wrona, R.J. (2006), *The TWI Workbook: Essential Skills for Supervisors*, Productivity Press (from knowledge).
- [manual] US War Manpower Commission (1944), *Job Instruction: Sessions Outline and Reference Material* — the original (from knowledge).

## In Faultline
Not built (FC-225). The line standard and the line balance hold the
work's elements and the standard (`src/tools/linestandard`,
`src/tools/linebalance`); FC-225 would write the breakdown sheet from
the standard's elements (steps, key points with photos, reasons), record
the four steps and the try-out's sign-off per person, and set the
matrix's level — with Line Talk able to draft the key points from what a
fitter says (`visual.line-talk`).
