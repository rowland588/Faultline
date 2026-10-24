---
id: lean.spaghetti
name: Spaghetti diagram — walking and transport distance
aka: [spaghetti chart, walk pattern, movement diagram, string diagram, travel chart]
discipline: lean
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the string diagram as the ILO's *Introduction to Work Study* (Kanawaty 1992) gives it; walking pace from MTM-1's walking element (W-FT 5.3 TMU a foot ≈ 1.6 m/s at standard pace — from knowledge of the MTM-1 data card, `ie.pmts`); from knowledge, texts not re-read; the worked shift in `scripts/knowledge/cases-lean.py`
needs: []
next: [ergonomics.layout-from-to, ie.ecrs]
alternatives: [ergonomics.layout-from-to]
related: [lean.standard-work, lean.seven-wastes, ie.work-sampling, ie.pmts]
---
# Spaghetti diagram — walking and transport distance

## Purpose and principle
Draw one person's (or one product's) path on the layout, to scale, over
a cycle or a shift — every trip a line, so the tangle shows the waste of
motion and transport that nobody sees while doing it. Then measure: the
distance a cycle, the cycles a shift, the distance and the time a shift,
and the share of it in trips that a different layout or a different
supply (the film at the line, the scale at the station) would remove.
It is the picture that makes a layout change arguable in minutes a
shift and pounds a week; the from-to chart (`ergonomics.layout-from-to`)
is the same idea for many products between many places.

## Questions it answers
- How far does this person walk a shift, and how long does that take?
- Which trips make most of it, and what would remove them?
- What does a layout or supply change save — in metres, minutes and
  money?
- Is the walk also a safety or fatigue matter (loads carried, crossings)?

## Inputs and minimum conditions
- The layout to scale (the line standard's board is the natural one).
- The path followed for a cycle or a timed period: each trip's from, to
  and distance, with what was fetched and whether loaded; several
  cycles or people where the work varies.
- The cycles a shift (from the rate or the standard), and the walking
  pace to use.

## Procedure and calculation
- Distance a cycle = Σ trip lengths (measured on the scale drawing, or
  paced); distance a shift = distance a cycle × cycles a shift.
- Time a shift = distance ÷ pace. Standard pace unloaded is about
  1.6 m/s (MTM-1's walking element — `ie.pmts`); loaded, in a crowded
  hall or on a wet floor, 1.2–1.3 m/s is nearer; say which was used.
- Each trip's share of the distance — the Pareto (`quality.pareto`); the
  trips a layout change removes or shortens, and the saving.
- The saving in money: minutes a shift × the person's rate
  (`knowledge/MONEY.md`, L); where the walker is the bottleneck's
  operator, the minutes are the line's (T).
- Repeat after the change and draw both: the before and after diagram
  is the evidence.

**Worked case** (`cases-lean.py`): a packer's cycle — to the film store
and back (42 m each way), to the case store and back (28 each way), to
the scale and back (9 each way): 158 m a cycle; 36 cycles a shift = 5.7 km.
At 1.3 m/s loaded that is 73 minutes a shift walking; the film trips are
53% of it. Film staged at the line (6 m each way) cuts the shift's walk
to 3.1 km and saves 33 minutes a shift — a packer's half-hour, every
shift, for a trolley.

## Assumptions, limits and misuse
- One person's one cycle may not be typical; follow several cycles and
  people, and say the range.
- Distance paced on the floor is ±10%; a scale drawing is better.
- Walking time is not all waste — some trips carry needed material; the
  question is whether the material could come to the person.
- A diagram drawn from memory in a meeting room is a guess; it is
  drawn on the floor, following the person.
- The pace assumed changes the minutes by 25%; always say it.

## Reading the result
"The packer walks 5.7 km a shift — 73 minutes — and half of it is
fetching film. Film at the line saves 33 minutes a shift, about £14 a
shift at their rate, £3,400 a year on one line." Money: L (and T where
the walker's absence stops the line) by `knowledge/MONEY.md`.

## When not to use it — and instead
Many products or materials moving between many places →
`ergonomics.layout-from-to`. Classing every step of one path →
`lean.process-flow-chart`. How much of the day is walking across the
crew → `ie.work-sampling`. The standard the walk should follow →
`lean.standard-work`.

## In food and FMCG manufacturing
Packers fetching film reels and cases; a weigh-up operator between the
store, the scale and the mixer; hygiene staff between stations; the
QA technician's round — and the fatigue and slip risk the distance
carries on a wet floor.

## References
- [textbook] Kanawaty, G. (ed.) (1992), *Introduction to Work Study*, 4th ed., International Labour Office — the string diagram and the flow diagram (from knowledge).
- [practice] Lean Enterprise Institute (2014), *Lean Lexicon*, 5th ed. — spaghetti chart (from knowledge).
- [data] MTM Association, MTM-1 data card — walking (W-FT, W-P) (from knowledge; the card not read).

## In Faultline
Not built (FC-004); the line standard draws where people stand on a
board to scale (`src/tools/linestandard/StandardScreen.tsx`). FC-004
would draw the trips on that board, measure them, take the cycles from
the line's rate, and say the shift's distance, minutes and money, before
and after.
