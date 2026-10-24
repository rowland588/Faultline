---
id: visual.action-tracking
name: Actions and problems — who is doing what, why, where, by when
aka: [action tracker, action plan, problems register, punch list, issue log, who what when, late, due soon]
discipline: visual
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — practice (every improvement system's action list; the lean page's action plan in `docs/LEAN-PAGE.md`); Faultline's Actions (`src/lib/projectActions.ts` — projectActions, everyAction, byPerson, byDate, byWhere, actionTiles; DUE_SOON_DAYS 3 in `src/lib/actions.ts`) and the problems register (`src/lib/snagsReport.ts`), proved by `scripts/acceptance/actions.mjs` and `scripts/acceptance/snags.mjs`; the worked tiles in `scripts/knowledge/cases-sixsigma-visual.py`
needs: []
next: [rca.pdca]
alternatives: []
related: [visual.visual-management, visual.daily-management, foodsafety.audits, lean.kaizen-event]
---
# Actions and problems — who is doing what, why, where, by when

## Purpose and principle
Every improvement system ends in the same list: the actions, each with
who owns it, why (which problem, cause or finding it answers), where (the
line, the machine, the stage), by when, and its priority — and the
problems that raised them, with their priority and journey. Read in one
place, so nothing is lost and lateness is visible to everyone at once;
grouped by person for the meeting ("Dave owes three"), by date for the
week, by where for the walk. The rules are few and strict: an action
with no owner is nobody's; one with no date cannot be late and so never
gets done; late is the one rule everywhere (past the agreed day), due
soon is the next three days; closed says what came of it. Faultline's
project Actions reads every thing owed to a project — the plan's items,
the critical problems and high risks, the register's problems taken for
it, its own actions and checks — as one list, never a second record.

## Questions it answers
- Who owes what, by when — and what is late?
- What is critical or high, and who has it?
- What is nobody's yet, and what has no day?
- What was closed this week, and what came of it?

## Inputs and minimum conditions
- Each action as raised by the tools and people: what, who, due,
  priority, where, why (its parent record).
- Each problem on the register with its priority (Critical, High, Low),
  its line and machine, its journey (steps with a day, what we did,
  what came of it).
- Today's date; the agreed due-soon window.

## Procedure and calculation
- Late = not done and due before today; due soon = not done, not late,
  due within three days; nobody yet = no owner; undated = no due day.
- Tiles: Open (made of what — the plan's rows, the critical, the risks,
  its own, the register's, the checks — said so the counts reconcile),
  Late (red when any), This week (due in seven days), Nobody yet,
  Undated, Done this week, Critical.
- By person: each owner's rows with their late count; by date: late,
  today, this week, later, undated; by where: each line, machine or
  stage.
- A problem's journey: steps in date order, each what was done and what
  came of it; the latest step is its state in words.
- Paper: the meeting's list (every row, grouped) and one person's own
  page.
- Closed rows carry what came of it and the day; the week's closures
  are the tile.

**Worked case** (`cases-sixsigma-visual.py`): eight actions on the
20th — Dave due 18, 23 and 15; Priya 19 and 25; Sam 12 (done) and 21;
one unowned due 22. Open 7, late 3 (Dave 2, Priya 1), due in three days
3, nobody yet 1, closed this week 1; the oldest late is five days over.
The meeting's sentence: "7 open, 3 late — Dave owes 2 of them; one
action has no owner."

## Assumptions, limits and misuse
- Actions without owners or dates are wishes; the form asks for both.
- A tracker that is a second list beside the records it tracks drifts
  from them within a week; the list is read from the records.
- Late as a wall of red teaches people to set generous dates; the
  priority says what matters, the date says when.
- Closing an action without saying what came of it loses the learning.
- The list is the meeting's agenda, not a report filed after it.

## Reading the result
"23 open, 4 late — Dave owes 3; one critical with nobody yet." Money:
each action's parent carries the money (`knowledge/MONEY.md` — the
problem's minutes, rejects and held product; the countermeasure's
expected worth); the list sorts by it where it is known.

## When not to use it — and instead
Proving an action worked → `rca.pdca`. The meeting that reads the list →
`visual.daily-management`. Audit findings as actions → `foodsafety.audits`.
A week's actions with a 30-day check → `lean.kaizen-event`.

## In food and FMCG manufacturing
Every improvement meeting; the shift handover's open items; the audit's
corrective actions; the OEM's punch list at commissioning.

## References
- [practice] Mann, D. (2015), *Creating a Lean Culture*, 3rd ed., CRC Press — the daily accountability process and the task board (from knowledge).
- [doc] `docs/LEAN-PAGE.md` — the action plan (action · owner · due) as the lean page's seventh element.
- [doc] `docs/PROJECTS.md` — P3, the project's Actions; P4, Every action.

## In Faultline
Built: a project's Actions (`#/project/:id/actions`,
`src/lib/projectActions.ts`) read every thing owed — by who, when and
where, the tiles and the closing line, paper for the meeting and each
person; Every action under the control room (`#/actions`); the register's
problems with their journey (`src/lib/snagsReport.ts`, `src/snag`). FC-154
is this entry.
