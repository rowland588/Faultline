---
id: maintenance.autonomous-maintenance
name: Autonomous maintenance — the operators' own checks, tags and standards
aka: [AM, autonomous maintenance, operator care, CIL (clean-inspect-lubricate), abnormality tags, TPM pillar 1, seven steps]
discipline: maintenance
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — TPM's autonomous-maintenance pillar and its seven steps as Nakajima (1988) and Suzuki (1994) give them (from knowledge); the week's measures in `scripts/knowledge/cases-maintenance.py`
needs: []
next: [maintenance.planned-maintenance]
alternatives: []
related: [lean.five-s, rca.fishbone-5whys, people.one-point-lesson, maintenance.rcm]
---
# Autonomous maintenance — the operators' own checks, tags and standards

## Purpose and principle
The people who run a machine all day see its abnormalities first — the
loose guard, the warm bearing, the leak, the build-up — if they are
looking and have a way to say so. Autonomous maintenance gives them the
basic care (clean, inspect, lubricate, tighten) as a written standard
with a short daily and weekly check, a tag for every abnormality found
(fixed by the operator or passed to the fitter), and the knowledge to
tell normal from abnormal. Deterioration stops being accepted as
normal, and the fitters' time goes to the work that needs them.

## Questions it answers
- Are the operators' checks being done, and what are they finding?
- How many abnormalities are open, how old, and are the same ones
  recurring?
- Is the machine's condition improving (fewer tags, fewer minor stops)?
- Does each check have a standard (what, how, how long, what is
  normal)?

## Inputs and minimum conditions
- The seven steps as the frame: 1 initial clean (find the abnormalities);
  2 remove the sources of dirt and the hard-to-reach places; 3 set the
  cleaning, inspection and lubrication standards (CIL); 4 general
  inspection (train the operators on the machine's parts); 5 autonomous
  inspection (operators own the checks); 6 standardise the workplace;
  7 full self-management.
- A check sheet per machine: the check, the normal condition (a picture,
  a range), the time it takes, the frequency, who; done on the phone
  with a tap.
- A tag per abnormality: where, what, found by, date, red (needs the
  fitter) or white (the operator fixes), closed with what was done.
- One-point lessons (`people.one-point-lesson`) for each check's know-how.

## Procedure and calculation
- Checks done ÷ due per period, per machine and per shift (the same
  compliance figure as `maintenance.planned-maintenance`, for the
  operators' checks).
- Tags: raised, closed, open; the open ones by age (over 7 and over 14
  days flagged); by machine and by kind (leak, loose, dirt, wear, hard
  to reach); **repeat abnormalities** — the same place tagged again
  within the period — the sign that the fix was a wipe and the source
  is still there (step 2: eliminate the source, `rca.fishbone-5whys`).
- The standard's time: the CIL minutes a shift per machine, against the
  time the minor stops it prevents (the loss count's short stops —
  `equipment.short-stops-speed`); a standard that takes 20 minutes to
  prevent 5 is rewritten.
- Condition trend: minor stops and the tags raised, month by month; the
  pillar's claim is that both fall as the steps advance.
- The audit of each step (the pillar's step audits) before the team
  moves on — a checklist, scored, dated.

**Worked case** (`cases-maintenance.py`): a week on one line — 140 checks
due, 126 done (90%); 17 tags open, 6 of them over 14 days; 4 repeat
abnormalities on the same guard (product build-up) — the guard's source
of dirt is the step-2 job, not another wipe. The CIL standard costs each
operator 12 minutes a shift; the short stops on that machine fell from
31 to 19 a shift over the quarter — the minutes bought back are the
standard's worth.

## Assumptions, limits and misuse
- Checks added to operators with no time given for them become ticks on
  a sheet; the standard's minutes are planned into the shift.
- Tags that are never closed kill the tagging within a month; the
  fitters' response to red tags is measured too.
- Cleaning as the end rather than inspection as the point: step 1's
  clean is to *find* abnormalities.
- Operators asked to inspect without step 4's training inspect what
  they can see; the general inspection is where the pillar earns its
  name.
- Hygiene cleaning (food safety) is a different standard with its own
  verification (`foodsafety.cleaning-verification-atp`); AM's clean is
  the machine's, and the two are scheduled together, not confused.

## Reading the result
"Line 2's operator checks: 90% done this week; 17 tags open, 6 older
than a fortnight — all red, waiting on the fitters; the wrapper's guard
has been tagged four times for build-up: fix the source." Money: the
short stops prevented × the line's lost minutes (`knowledge/MONEY.md`,
T) against the CIL minutes × the operators' rate (L) — the standard's
own account, machine by machine.

## When not to use it — and instead
Workplace order in general → `lean.five-s` (AM's step 6 is 5S applied to
the machine). The fitters' schedule → `maintenance.planned-maintenance`.
A repeat abnormality's root cause → `rca.fishbone-5whys`. The one-page
training for a check → `people.one-point-lesson`.

## In food and FMCG manufacturing
Wrappers, fillers and conveyors with product build-up and dust; the
daily checks of guards, sensors, belts, lubrication points (food-grade);
the leak and loose-fastener tags that precede the foreign-body incident;
the hard-to-reach places that are also the hygiene risks — AM and
hygienic design meet there (`foodsafety.hygienic-design`).

## References
- [textbook] Nakajima, S., *Introduction to TPM: Total Productive Maintenance*, Productivity Press, 1988 — the pillar and its seven steps (from knowledge).
- [textbook] Suzuki, T. (ed.), *TPM in Process Industries*, Productivity Press, 1994 — autonomous maintenance in process plants (from knowledge).
- [textbook] Shirose, K. (ed.), *TPM for Workshop Leaders*, Productivity Press, 1992 (from knowledge).

## In Faultline
Built 25 October (FC-062 with FC-234, `knowledge/specs/FC-062-cilt-checks.md`) as two check logs on the shared shape
(FC-236, `defs/cilt.ts`, `defs/condition-route.ts`): a CILT round per machine by shift, day and week done by tap, an
abnormality tag raised from a check (red high, white low) as a problem on the register, its age and whether it is
closed read from the register, a place tagged again within 28 days flagged; and a condition route of readings typed
by a person against limits the team gives, nearing a limit within 15% of the band, a trend from eight readings
(Mann-Kendall, Sen's slope). The seven steps and their step audits, and the minutes the checks take against the short
stops they prevent, are not built. Proved by `log-shape.mjs`.
