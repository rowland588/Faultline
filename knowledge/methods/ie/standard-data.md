---
id: ie.standard-data
name: Standard data — a library of element times to build new standards from
aka: [standard data, elemental standard data, synthetic standards, element library, time formulas, standard time data]
discipline: ie
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — standard data and time formulas as the ILO text (Kanawaty 1992, ch. 26) and Freivalds & Niebel (ch. 12) give them (from knowledge); the worked case in `scripts/knowledge/cases-ie.py`
needs: [ie.time-study]
next: [capacity.line-balancing]
alternatives: [ie.pmts]
related: [ie.allowances, lean.standard-work, ie.learning-curve]
---
# Standard data — a library of element times to build new standards from

## Purpose and principle
Most jobs on a site share elements: pick a case from a pallet, open a
bag, place n packs, tape a case, walk two metres. Once each element has
been timed and rated well a few times, its time is kept in a library,
and a new job's standard is built by adding the elements it uses —
before the job runs, with no new study, and consistently across lines.
Where an element's time depends on a variable (the number of packs, the
distance, the weight), a time formula (a regression on the studies) is
kept instead of a constant. It is the site's own predetermined time
system, built from its own studies rather than a licensed table.

## Questions it answers
- What will the new product's packing take, from what we already know?
- Are two lines' standards for the same element the same (consistency)?
- Which elements dominate the job — where would a method change pay?

## Inputs and minimum conditions
- Element times from rated time studies (`ie.time-study`) or video
  studies, each with its conditions (product, pack size, distance,
  weight), from several studies and people (one study is a sample, not
  a standard).
- Elements defined with clear start and end points so the same element
  is the same thing in every study; constant elements separated from
  variable ones.
- The allowance policy (`ie.allowances`).

## Procedure and calculation
- Library: per element, the basic time (the mean of the rated
  observations across studies), its spread, the number of studies and
  observations, the conditions, the date; a time formula where the
  element varies — fitted by regression of the element's basic time on
  its variable(s) (`stats.correlation-regression`): e.g. "place n
  packs" = a + b·n.
- A new job: list its elements and their frequencies per cycle; basic
  time = Σ (element time × frequency), the formulas evaluated at the
  job's values; standard = basic × (1 + allowance).
- Consistency check: the same element in two lines' standards should
  agree within its spread; a gap is a method difference or a stale
  study.
- Validation: the synthetic standard against a short study once the job
  runs (after the learning curve has levelled — `ie.learning-curve`); a
  gap over 10% sends the element back to the library for review.
- Maintenance: elements re-studied when the method, the equipment or the
  product changes; the library dated.

**Worked case** (`cases-ie.py`): a new 24-pack case job from the library
— pick case 3.2 s, open 2.1, place 12 packs 9.6 (×2), close and tape
4.4, walk 2 m 1.4 (×2): basic 31.7 s; with 11% allowance 35.2 s a case,
102 cases an hour. The "place n packs" formula 1.2 + 0.7n gives 9.6 s at
12 and 13.8 s at 18 — the standard for an 18-pack case follows without a
new study.

## Assumptions, limits and misuse
- An element time from one study on one person is an observation; three
  studies, two people is a minimum before it enters the library.
- Elements that depend on a variable kept as constants give wrong
  standards for every other pack size; fit the formula.
- Element boundaries that drift between studies (one includes the walk,
  another does not) make the library inconsistent; the definitions are
  written and kept.
- The library ages: a new conveyor height or a new case design changes
  the elements; the dates are shown and the review is scheduled.
- Standard data builds the time for the *method written*; the method
  must then be taught (`people.twi-job-instruction`) and followed.

## Reading the result
"The new 24-pack case job is 35.2 s a case from six library elements —
102 an hour; placing the packs is 61% of it, so a tray that presents
them pre-grouped is where the time is." Money: the job's labour a case
(`knowledge/MONEY.md`, L) and the crewing it implies before the line
runs.

## When not to use it — and instead
A job that exists → `ie.time-study` or `ie.video-time-study`. A licensed
motion-level system → `ie.pmts`. Balancing the elements across people →
`capacity.line-balancing`.

## In food and FMCG manufacturing
Case packing, tray loading, hand assembly and picking across many
products and pack sizes — the same elements with different counts; the
NPD costing that needs a labour time before the trial; the crewing of a
new line from its method.

## References
- [textbook] Kanawaty, G. (ed.), *Introduction to Work Study*, 4th ed., ILO, 1992, ch. 26 — standard data and time formulas (from knowledge).
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014, ch. 12 — standard data (from knowledge).

## In Faultline
Built (25 October, finished 20 November — FC-024, `knowledge/specs/FC-024-standard-data.md`): in the Line balance's
**Times** lens, a step timed on another product of the same line is offered with its basic time, its cycles, its
product and its day; used, it takes this balance's allowance, is marked reused wherever its time is read, and gives way
to a timing made here — which then says how far apart the two are, over 10% in amber (*Validation* above, said as this
record's rule of thumb). A step carries the **count it handles each cycle** (packs, trays, metres). The same step timed
on several products is offered as **one time**: the mean of their timings with its spread and ±% at 95%, or — timed at
two or more counts — the line's **time formula**, basic = a + b × count by ordinary least squares, with R², worked out
at the step's own count with ±% at 95% for that mean time and a count beyond those timed said to be a guess. "Enough"
there is three timings or more (the minimum above), the count inside those timed and ±5% at 95%. Only timed steps feed
a mean or a formula. Not built: a formula on two variables at once (multiple regression on readings pasted is the Analysis tool’s),
frequencies as a field (a step done twice is listed twice), the consistency check across lines (the library is one
line's), and counting the *people* behind the studies (studies are counted by product). Proved by
`scripts/acceptance/time-study.mjs` step 8 and `src/tools/linework/__tests__/standardData.test.ts` against
`scripts/knowledge/cases-time.py` §7b (SciPy).
