---
id: planning.crew-planning
name: Crew planning — from people needed on the line to people on the roster
aka: [crewing, labour planning, roster planning, headcount from standard, shift crew, absence and holiday cover]
discipline: planning
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — labour-planning practice (from knowledge; no single standard); Line capacity's people needed per station (`src/tools/linework`); the worked roster in `scripts/knowledge/cases-planning-foodsafety.py`
needs: [capacity.line-capacity]
next: [people.skills-matrix]
alternatives: []
related: [ie.labour-productivity, ie.allowances, capacity.load-vs-demand]
---
# Crew planning — from people needed on the line to people on the roster

## Purpose and principle
Line capacity says how many people each station needs at the planned
rate; the roster must have more than that, because people are on
holiday, off sick and in training. Crew planning turns the line's need
into the number employed per shift (and the skills they must hold to
cover each other — `people.skills-matrix`), and prices it. Under-crewing
shows up as a station short on the day and the bottleneck running
slow; over-crewing as labour a pack above the standard. The arithmetic
is simple; the decision is the cover factor the site accepts.

## Questions it answers
- How many people must be on the roster to have the line's need on
  the floor every shift?
- What does the crew cost a week, and a pack?
- When a station needs one more (Line capacity's "Make it 2 people"),
  what does that do to the roster?
- Who can cover which station (the skills matrix's question)?

## Inputs and minimum conditions
- People needed per station at the planned rate (Line capacity, the
  line standard's placements) — per shift.
- The site's cover shares: absence (sickness) %, holiday %, training %
  — from the payroll's history, not a guess.
- The labour rate and on-costs (`knowledge/MONEY.md` §3); shifts a week.

## Procedure and calculation
- Employed per shift = needed ÷ (1 − absence share − holiday share −
  training share), rounded up (a part of a person is a person on the
  roster, or an agreed agency cover).
- Across shifts: × shifts; a shared pool across lines can carry a
  smaller cover than each line alone (the shares pool).
- Cost a week = employed × hours × rate × on-costs × days; labour a pack
  = cost ÷ planned packs (`ie.labour-productivity` for the standard
  view).
- Sensitivity: one more at a station (Line capacity's what-if) →
  needed + 1 → employed recomputed; the cost of the extra person
  against the packs they add at the bottleneck (`knowledge/MONEY.md`,
  L against T — the cost-a-pack comparison Line capacity already makes).
- Short on the day: the station not covered runs at its reduced rate;
  the line's loss is the bottleneck's minutes if that station is the
  bottleneck or starves it — the money of under-crewing.
- Skills: each station's cover needs n people who can do it; the
  skills matrix says whether the roster's people can cover the roster's
  absences (`people.skills-matrix`).

**Worked case** (`cases-planning-foodsafety.py`): 6 people needed a
shift; absence 4.5%, holiday 12%, training 2% → 6 ÷ 0.815 = 7.36 → 8 on
the roster per shift, 16 for two shifts; £11,200 a week at £14/h × 1.25
on-costs × 8 h × 5 days. Line capacity's "Make it 2 people" at the
packer: needed 7 → 8.59 → 9 a shift — one more on each shift's roster
for the one more on the floor, because of the cover.

## Assumptions, limits and misuse
- Cover shares from last year's payroll, not a round 15%; sickness
  differs by site and season.
- Rounding down ("7.36 — we'll manage with 7") is the under-crewing
  that shows as a slow bottleneck three days a fortnight.
- A pooled cover across lines needs the skills to move people; without
  the matrix the pool is on paper.
- Employed is not present: the roster is the plan, the daily fill is
  the fact — attendance against the roster is its own measure.
- Agency cover costs more per hour and less per week; the comparison is
  made, not assumed.

## Reading the result
"Line 2 needs 6 a shift; with our 18.5% cover that is 8 on each shift's
roster — 16 people, £11,200 a week, 4.7p a pack. One more at the packer
means 9 a shift." Money: the roster's cost a week and a pack
(`knowledge/MONEY.md`, L), and under-crewing's cost as the bottleneck's
minutes lost (T).

## When not to use it — and instead
How many each station needs → `capacity.line-capacity`. The standard
time and allowances behind it → `ie.allowances`, `ie.time-study`. Who
can do what → `people.skills-matrix`. Labour efficiency against the
standard → `ie.labour-productivity`.

## In food and FMCG manufacturing
Every hand-packing and assembly line's weekly roster; the seasonal
build (Christmas) where cover must be hired and trained ahead; the
agency decision; the "we are two short again" morning.

## References
- [practice] Labour and roster planning practice in manufacturing (from knowledge; no single public text).
- [textbook] Stevenson, W.J., *Operations Management*, 14th ed., 2021 — aggregate planning and workforce levels (from knowledge).

## In Faultline
Not built (FC-184). Line capacity says the people needed per station and
what one more costs a pack (`src/tools/linework`); FC-184 adds the
line's cover shares, the roster per shift and its cost, the one-more
sensitivity, and hands the stations' cover need to the skills matrix.
