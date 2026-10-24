---
id: visual.daily-management
name: Daily management — tiered meetings, SQDC boards, the hour-by-hour board, leader standard work
aka: [daily management, tier meetings, SQDC, SQCDP, huddle, hour by hour board, production board, leader standard work, shift handover, DMS]
discipline: visual
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — Mann (2015) *Creating a Lean Culture* for leader standard work, visual controls and the daily accountability process; the hour-by-hour board and tiered meetings as practice frames them; from knowledge, text not re-read; the worked board in `scripts/knowledge/cases-sixsigma-visual.py`; Faultline's day paper and huddle (`src/lib/huddle.ts`, `src/lib/day.ts`)
needs: []
next: [visual.action-tracking]
alternatives: []
related: [visual.visual-management, planning.schedule-adherence, lean.andon, equipment.time-model-losses, visual.gemba-walk]
---
# Daily management — tiered meetings, SQDC boards, the hour-by-hour board, leader standard work

## Purpose and principle
A daily rhythm that catches the day's problems while they are hours
old. At the line, the **hour-by-hour board**: the plan for each hour,
the actual, the gap and its reason, written by the operator as the hour
ends — so a shift that is 300 short knows by 10:00 which hour and why.
At the start of each shift, a **tiered meeting** of ten minutes at the
board — the line's (tier 1), then the area's (tier 2), then the site's
(tier 3) — on **safety, quality, delivery, cost and people** (SQDCP),
each with yesterday's status in a colour and a word, the actions raised
and the ones closed; what the line cannot fix is escalated upward the
same morning. **Leader standard work** is the leaders' own checklist of
what they look at each day so the system keeps running when the
enthusiasm has gone. The measures are the gaps and their reasons, the
actions' closure, and whether the meetings happened.

## Questions it answers
- Are we on plan this hour — and if not, which hour lost it and why?
- What went wrong yesterday on safety, quality, delivery, cost and
  people, and who is fixing it?
- What is escalated, and did the tier above answer today?
- Are the meetings and the leaders' walks happening (the routine's own
  adherence)?

## Inputs and minimum conditions
- The hourly plan (the rate × the hour less planned breaks) and the
  actual count each hour, with a reason for a gap over a threshold.
- Yesterday's figures for each SQDCP letter: an accident or near miss,
  rejects and holds, output against plan, the day's losses in money,
  attendance and skills.
- The action list (`visual.action-tracking`); the escalation rule (what
  goes up, within how long).
- The leaders' standard work checklists and their completion.

## Procedure and calculation
- Hour gap = plan − actual; the shift's gap = Σ; each reason's share of
  the gap (the day's own Pareto); a gap over the threshold with no
  reason is itself a finding.
- Schedule adherence for the shift (`planning.schedule-adherence`):
  made ÷ planned.
- SQDCP: each letter green or red by its rule (zero accidents; rejects
  under the limit; output ≥ 95% of plan; the day's loss under its
  budget; the crew complete) — the state in words beside the colour;
  the trend by day on the board.
- Actions raised at the meeting with owner and day; closed yesterday
  counted; escalated items with the tier they went to and whether they
  came back answered.
- The routine's adherence: meetings held ÷ scheduled; leader standard
  work done ÷ due.
- The hour's reasons feed the loss count and the andon log
  (`equipment.time-model-losses`, `lean.andon`); the day's sentence feeds
  the shift handover.

**Worked case** (`cases-sixsigma-visual.py`): a plan of 480 an hour.
07:00 470 (−10); 08:00 480; 09:00 410 (−70, film change ran over); 10:00
475; 11:00 300 (−180, breakdown — sealer jaw); 12:00 480; 13:00 465
(−15, short stops); 14:00 455 (−25, label reel). The shift: 3,535 of
3,840 — 92%; the gap 305 packs, and the sealer jaw hour is 59% of it.
The tier 1 meeting raises the jaw's root cause (engineering, Friday)
and the film change's SMED; the jaw is escalated to tier 2 because it
is the third this month.

## Assumptions, limits and misuse
- Meetings that report without acting decay into a reading of
  yesterday's numbers; every red gets an action or a reason why not.
- The board filled in at the end of the shift from memory is a report,
  not a control; the hour's entry is made as the hour ends.
- Too many metrics on the board hide the five; SQDCP is enough.
- Escalation without a reply teaches the floor not to escalate; the tier
  above answers the same day.
- Leader standard work as surveillance fails; it is the leaders'
  routine for looking and helping.

## Reading the result
"11:00 hour 300 of 480 — the sealer jaw, 59% of the shift's gap; the
film change ran over again — two actions, one escalated." Money: the
shift's gap in packs at the line's contribution a pack
(`knowledge/MONEY.md`, T) and the day's losses in pounds on the C of
SQDCP, so the board speaks the business's language.

## When not to use it — and instead
The actions' list itself → `visual.action-tracking`. The shift's losses
on the time model → `equipment.time-model-losses`. The help calls and
their response → `lean.andon`. Plan against made over the week →
`planning.schedule-adherence`. The leader's walk → `visual.gemba-walk`.

## In food and FMCG manufacturing
Shift start meetings at the line board; hourly boards on packing lines
with the day's reasons; the site's 09:00 tier 3 on yesterday's
safety, holds, output and waste.

## References
- [textbook] Mann, D. (2015), *Creating a Lean Culture: Tools to Sustain Lean Conversions*, 3rd ed., CRC Press (from knowledge).
- [textbook] Liker, J.K. and Convis, G.L. (2012), *The Toyota Way to Lean Leadership*, McGraw-Hill (from knowledge).
- [doc] `docs/LEAN-PAGE.md` — the lean page as the board: the band, the tiles, the trend, what it means, the action plan.

## In Faultline
Partly: the day's paper and the huddle (`src/lib/day.ts`,
`src/lib/huddle.ts`) say what is due today and what moved, and the
control room's lean page carries the tiles and the action plan. The
hour-by-hour board (FC-144) and the SQDCP tier board with its escalation
(FC-145) are not built; both would read the loss count, the register
and the actions rather than ask for a second entry.
