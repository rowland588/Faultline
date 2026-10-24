---
id: visual.gemba-walk
name: The gemba walk — going to see, and how fresh the looking is
aka: [gemba walk, go and see, genchi genbutsu, floor walk, filmed walk, freshness, leader walk]
discipline: visual
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — Womack (2011) *Gemba Walks* and Liker (2004) genchi genbutsu for the principle; the freshness rule (fresh ≤ 7 days, fading 8–14, stale > 14) is Faultline's own in `src/lib/gemba.ts` (freshness); from knowledge, texts not re-read; the worked freshness in `scripts/knowledge/cases-sixsigma-visual.py`; Faultline's filmed walk (`src/screens/CaptureScreen.tsx`)
needs: []
next: [lean.seven-wastes, visual.action-tracking]
alternatives: []
related: [ie.work-sampling, visual.daily-management, lean.five-s, lean.process-flow-chart]
---
# The gemba walk — going to see, and how fresh the looking is

## Purpose and principle
Leaders go to where the work is done to see it, ask about it and learn
from it — not to inspect. A walk has a purpose (the line's biggest
loss, the new standard, safety), a route, questions rather than answers,
and an outcome: what was seen becomes problems and actions with owners,
and what was learned changes the leader's picture. Faultline adds the
measure a factory needs when it has thirty lines: how long since anyone
looked at this line — in days, with a colour that fades — because a
line nobody has walked for a fortnight is a line whose problems are
unknown, however green its board. The filmed walk is the same thing with
the phone's camera: a problem pointed at, photographed or filmed, placed
on its machine, and seen wherever the machine is seen.

## Questions it answers
- When did someone last look at this line, and what did they find?
- Is every line walked at its cadence — which are fading or stale?
- What did the walk raise, and is it closed?
- Did the walk teach something about the standard or the loss, or only
  make a list?

## Inputs and minimum conditions
- The walk's observations: a photo, a film or a note, each placed on a
  line and a machine, with the time and who.
- The walks' times per line (a walk with no observation still counts as
  looking).
- The cadence agreed per level (the team leader daily, the manager
  weekly, the site lead monthly); the walk's question for the day.

## Procedure and calculation
- Freshness per line: days since the latest observation or walk,
  whichever is fresher; fresh at 7 days or fewer, fading at 8–14, stale
  over 14 or never (`src/lib/gemba.ts`); the word on the line's card
  ("today", "yesterday", "9d ago", "never").
- Walks against cadence: walks in the period ÷ walks due, per line and
  per leader.
- Observations raised → problems and actions (`visual.action-tracking`);
  closed ÷ raised and the days to close — a walk whose findings are
  never closed is theatre.
- The walk's wastes classed and costed (`lean.seven-wastes`) where that is
  its purpose; its 5S findings scored (`lean.five-s`) where that is.
- The stale lines first in the control room's list, because the oldest
  look is the biggest unknown.

**Worked case** (`cases-sixsigma-visual.py`): three lines — last looked
at 2 days ago (fresh), 9 (fading), 16 (stale). The stale line's board
is green; nobody has seen it in over two weeks, and its freshness is
the control room's first row. The cadence: the team leader daily, the
manager weekly; this week the manager walked 4 of 6 lines.

## Assumptions, limits and misuse
- Walks as inspections (a clipboard, a score, a telling-off) end the
  honesty that makes them worth doing; the question is "what gets in
  your way?"
- Nothing done with what was seen: the walk's findings close or the
  walks stop.
- A walk with no purpose sees everything and learns nothing; the day's
  question is set before.
- Freshness is about looking, not about problems: a fresh line may be
  in trouble and a stale one fine — the freshness says only that nobody
  knows.
- The filmed walk is evidence, not surveillance: the camera points at
  the problem, never at the person.

## Reading the result
"Line 3 not walked for 16 days — stale; Line 1 walked yesterday, two
problems raised, one closed." Money: what the walk finds carries its own
(`knowledge/MONEY.md` via the wastes and the problems raised); the
freshness has none — it is the risk of not knowing.

## When not to use it — and instead
Classing and costing what the walk sees → `lean.seven-wastes`. How the
crew's day is actually spent → `ie.work-sampling`. The workplace's
standard → `lean.five-s`. The findings' list → `visual.action-tracking`.
The daily meeting the walk feeds → `visual.daily-management`.

## In food and FMCG manufacturing
Daily walks of packing halls; hygiene walks; the site lead's weekly walk
with one question; the filmed walk at commissioning, pointing at every
snag on the new line.

## References
- [textbook] Womack, J.P. (2011), *Gemba Walks*, Lean Enterprise Institute (from knowledge).
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill — principle 12, go and see for yourself (from knowledge).
- [textbook] Mann, D. (2015), *Creating a Lean Culture*, 3rd ed., CRC Press — gemba walks in leader standard work (from knowledge).

## In Faultline
Built: the filmed walk (`src/screens/CaptureScreen.tsx` — a problem
pointed at, photographed or filmed, on its machine) and freshness on the
line's card (`src/lib/gemba.ts` — the days since, the word, the fading
colour). FC-081 is the walk; the cadence per leader and walks-against-
cadence are not kept, and would be a small addition to the factory's
page.
