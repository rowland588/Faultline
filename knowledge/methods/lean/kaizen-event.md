---
id: lean.kaizen-event
name: Kaizen event — a focused improvement week with its follow-up
aka: [kaizen blitz, rapid improvement event, RIE, kaizen workshop, improvement week, 30-day check]
discipline: lean
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the event as practice frames it (a charter, a team released for 3–5 days, baseline, change, measure, standardise, a 30-day follow-up) with Imai (1986) as the root; from knowledge; before → after tested in `scripts/knowledge/cases-lean.py` by `stats.two-sample-tests`' method
needs: [lean.value-stream-mapping]
next: [lean.standard-work, rca.pdca]
alternatives: [rca.fishbone-5whys, lean.toyota-kata]
related: [projects.ci-programme, changeover.smed, visual.action-tracking]
---
# Kaizen event — a focused improvement week with its follow-up

## Purpose and principle
A team released from its normal work for a few days on one scoped
problem — a changeover, a line's flow, a cell's layout — with a charter
(the scope, the target, the team, the sponsor), a measured baseline, the
waste found on the floor, changes made and tried in the week itself,
the measure taken again, the new way written as the standard, and the
actions that could not be finished in the week carried with owners and
dates to a 30-day check. Its two tests are honest: did the measure
move, by a before → after on the same thing, and is it still moved a
month later — because an event whose gains decay was a demonstration,
not an improvement. A series of events is not a system; the system is
the daily work (`lean.toyota-kata`, `visual.daily-management`).

## Questions it answers
- What was the baseline, what is the measure after, and is the
  difference real?
- Which actions are done and which are open at 30 days?
- Is the gain holding, or creeping back?
- What did the week buy, in the measure and in money?

## Inputs and minimum conditions
- The charter: the problem in one sentence, the scope (this line, this
  changeover), the measure and its target, the team (the people who do
  the work, an engineer, a facilitator), the sponsor, the dates.
- The baseline: enough readings of the measure before (8–10 cycles or
  changeovers, or a week's shifts) to know its spread.
- The week's record: the wastes found, the changes tried, the readings
  after, the new standard, the action list.
- The 30-day check booked in the diary with the measure's readings
  since.

## Procedure and calculation
- Before → after on the same measure: means, spreads, n; a two-sample
  test (`stats.two-sample-tests` — Welch's t for timed cycles, or the
  rate comparison for counts) says whether the difference is beyond the
  noise; the effect in the measure's own units is what matters.
- Actions: raised, closed by the week's end, closed at 30 days, open —
  the share closed; open past their day in red (`visual.action-tracking`).
- Holding: the readings between the event and the 30-day check on a
  run chart; a trend back toward the baseline (Spearman's ρ on the
  order, or the run rules) is the warning before the gain is gone.
- The new standard written and the people trained
  (`lean.standard-work`, `people.twi-job-instruction`) — the usual
  reason a gain holds.
- Money: the measure's saving × its frequency × the rate it carries
  (`knowledge/MONEY.md`'s row for the tool the measure belongs to —
  a changeover's minutes at the line's contribution, T).

**Worked case** (`cases-lean.py`): a SMED week on a filler. Baseline
eight changeovers: mean 42.1 min (s 3.1); after, eight: 24.4 min (s 1.7);
Welch's t 14, p < 0.001 — 18 minutes saved a changeover, six a week, 106
minutes a week. Actions: 11 raised, 8 closed at 30 days (73%), 3 open —
the trolley, the pre-set jig and the second operator's standard. The
30-day check: the last six changeovers 25, 24, 28, 31, 30, 33 — mean 28.5
and rising (ρ 0.89): the gain is creeping back, and the three open
actions are why.

## Assumptions, limits and misuse
- An event without a baseline has nothing to compare; the baseline is
  taken before the week, not remembered.
- Eight readings with the team watching are not a normal week; the
  30-day readings are the truth.
- Events scheduled by a calendar rather than by a problem produce
  changes nobody needed.
- An action list that outlives the month unowned is the usual failure;
  the sponsor owns the follow-up.
- The event is not a substitute for a root cause: a changeover made
  faster by heroics is not a changeover made faster by method.

## Reading the result
"The week took the changeover from 42 to 24 minutes — 106 minutes a
week — but at 30 days it is 28 and rising; three actions are open, and
they are the difference." Money: the minutes saved at the line's
contribution a minute (`knowledge/MONEY.md`, T), said as what was won and
what is being lost back.

## When not to use it — and instead
Daily small-step improvement → `lean.toyota-kata`. The cause of one
problem → `rca.fishbone-5whys`. The programme of many events and their
sustainment → `projects.ci-programme`. The changeover's own method →
`changeover.smed`. The cycle each change follows → `rca.pdca`.

## In food and FMCG manufacturing
A week on a filler's changeover; a week on the packing hall's flow and
film supply; a week on a depositor's start-up losses; the 30-day check
in the site's weekly review.

## References
- [textbook] Imai, M. (1986), *Kaizen: The Key to Japan's Competitive Success*, McGraw-Hill (from knowledge).
- [textbook] Laraia, A.C., Moody, P.E. and Hall, R.W. (1999), *The Kaizen Blitz*, Wiley (from knowledge).
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill — kaizen events and their limits (from knowledge).

## In Faultline
Partly: run as a 6M project (`docs/SIXM.md`) — the problem, the causes,
the countermeasures as actions, before → after on the same number
(`src/project`). FC-016 adds the charter's few fields (scope, target,
team, sponsor, the week's dates), the 30-day check booked and its
readings, and the holding verdict on the trend.
