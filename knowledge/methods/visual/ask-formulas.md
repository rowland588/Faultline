---
id: visual.ask-formulas
name: Ask — a question about a line answered by its formulas
aka: [ask, questions, will it fit, biggest loss, what changed, where is the line held, what can it make]
discipline: visual
kind: faultline
evidence: decision
depth: full
checked: 2026-10-24 — `src/lib/intelligence/ask.ts` (askLine — five shapes matched by words, each answered from the line's tested functions, the figures used listed; no AI since 20 October, `docs/DIRECTION.md`), proved by the intelligence tests and `scripts/acceptance/upgrade.mjs`; the worked fit in `scripts/knowledge/cases-sixsigma-visual.py`
needs: [capacity.load-vs-demand, equipment.time-model-losses]
next: []
alternatives: [visual.line-talk]
related: [capacity.load-vs-demand, capacity.theory-of-constraints, equipment.time-model-losses, planning.crew-planning]
---
# Ask — a question about a line answered by its formulas

## Purpose and principle
The questions a planner or a manager asks about a line most days have
shapes, and each shape has an arithmetic answer in the line's own
records: **will an extra order fit** (the order in the line's unit, its
hours at the plannable rate, against next week's spare hours); **the
biggest loss** (the loss count's first band and what it costs); **what
changed** (this week against last — the rate, the losses, the
problems); **where the line is held** (the constraint from Line
capacity and the stops at it); **what it can make** (hours × rate ×
(1 − losses)). Ask matches a typed question to one of these shapes by
its words and answers it from the tested functions, showing the figures
it used — and for anything outside the five shapes says so, plainly,
and never guesses. It is the opposite of an AI assistant: no model, no
network, no sentence that is not computed. Open questions go to Line
Talk (`visual.line-talk`), which talks but never works out a figure.

## Questions it answers
- Can the line take another n pallets (cases, packs) this week — and if
  not, what would it need?
- What is the biggest loss, and what does it cost?
- What changed this week?
- Where is the line held (the constraint), and how much is lost there?
- What can the line make a shift or a week, and why that number?

## Inputs and minimum conditions
- The line's facts as the app holds them: its unit and the units per
  pallet or case (from Line capacity), its plannable rate (four shifts
  in five from counted shifts) or demonstrated rate, next week's orders
  and running hours (the load), its loss bands, its constraint
  (`capacity.load-vs-demand`, `equipment.time-model-losses`,
  `capacity.theory-of-constraints`).
- A question in words.

## Procedure and calculation
- Shape matching by words (take/fit/make … n units; biggest/largest …
  loss/stop; what changed; where … held/constraint; what can it make);
  one shape or none.
- Fit: units = n × units per the named pack; hours = units ÷ rate ÷ 60;
  spare = next week's headroom hours; fits if spare ≥ hours; else the
  shortfall in hours and what would close it (a shift, or less lost at
  the constraint). A day named in the question is answered for the
  week with the caveat said (the day's plan is not in the app).
- Biggest loss: the first band of the loss waterfall, its minutes and
  its money by the model.
- What changed: this week's rate, losses and problems against last
  week's, each as a since-line (`lib/lean` since).
- Held: the constraint's name and the stops at it this week.
- Can make: hours × rate × (1 − the measured loss share), with each
  factor shown.
- Every answer lists the figures used and their source; a missing input
  (no counted shifts, no units per pallet) is named as the reason there
  is no answer.

**Worked case** (`cases-sixsigma-visual.py`): "Can it take another
6,000 on Thursday?" The line makes 110 a minute, runs 7.5 hours, loses
18% to stops: 40,590 a shift. Next week's orders 32,000 plus the extra
6,000 = 38,000; spare 2,590 packs — half an hour. Yes, it fits, said for
the week, with the Thursday caveat. "What's the weather on Thursday?" —
outside the five shapes: said so, nothing guessed.

## Assumptions, limits and misuse
- Asked a question outside its shapes, it says so — never guesses; the
  temptation to add a model is the misuse, and was removed on 20
  October.
- The fit answer is weekly; the day's plan is not in the app, and the
  answer says so.
- The plannable rate is four shifts in five from counted shifts; with
  no counted shifts the answer is "count a shift first".
- Units per pallet come from Line capacity; without them the fit cannot
  convert.
- The answer is as good as the loss count and the load that feed it;
  stale counts give stale answers, and the figures used are shown so
  the reader can see their dates.

## Reading the result
"Yes — 6,000 packs take about 0.9 h; next week has 1.4 h spare (said for
the week — check Thursday's shifts have it)." Money: the biggest loss's
cost and the shortfall's cost by `knowledge/MONEY.md` (T), from the same
functions the loss count uses — one model.

## When not to use it — and instead
Open questions, writing, a conversation → `visual.line-talk`. The
load's arithmetic in full → `capacity.load-vs-demand`. The loss
waterfall → `equipment.time-model-losses`. The crew for the week →
`planning.crew-planning`.

## In food and FMCG manufacturing
A planner's "can Line 2 take the promotion?"; a manager's "what's the
biggest loss on Line 3?" at the morning meeting; "what changed?" after a
bad week.

## References
- [decision] `docs/DIRECTION.md` — the only AI is the voice and the camera; Ask's AI answers were deleted on 20 October.
- [doc] `docs/upgrade-plan.md` — Ask's five shapes and the figures shown.
- [code] `src/lib/intelligence/ask.ts` — askLine and ASK_EXAMPLES.

## In Faultline
Built (FC-142): `src/lib/intelligence/ask.ts` on the line's page, the
five shapes, the figures used, the outside-its-shapes answer; proved by
`scripts/acceptance/upgrade.mjs`. A sixth shape is a new matched pattern
answered by a tested function — never a model.
