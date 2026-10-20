# Views and links — a method's steps drawn for what they are

Rowland, 19 October: *"I am not aiming for a system that generates basic
forms, generic dashboards and lists of tasks ... if I request a complete Lean
project management system, I expect a cohesive, polished working environment
containing a project charter, PDCA management, an interactive fishbone
diagram, action tracking, measures, evidence, decision records and reporting.
These elements should be connected and behave as one integrated system."*

Then, 20 October, after the clean-sheet assessment (the artifact "Faultline:
the clean-sheet decision"): *"we will continue with what we was building."*
So the method engine grows the two things the assessment found missing,
inside the app as it is.

## What the engine could and could not do (19 October, tested)

The engine (`lib/flow`) arranges stages, steps, fields, logs, analyses,
gates, measures and decisions in any combination — and the assistant now
designs whole methods with it (a 32-step Lean Six Sigma method live, no
errors). But every step of every method was drawn by one panel
(`ui/flow/RunParts` StepSheet: state, who, boxes, a table of entries), and
nothing on one step could point at an entry on another. Put through the
validator: a linked column was refused ("a kind the app does not know"), a
step's `view` was dropped. The live design said so itself: *"The fishbone is
drawn on a board and photographed, then each cause is logged in the app."*

## The change — two additions, nothing beside them

1. **A VIEW on a step** — a purpose-built interface from a closed registry
   (`lib/flow/views`), bound to the step's own columns (a log) or boxes (a
   form) slot by slot. A view is code written once — its screen
   (`ui/flow/Views`), its paper (`lib/flow/reportPdf`), its slots for the
   validator and its words for the assistant — and composed by data, as an
   analysis block is. The first four:
   - **fishbone** — a log of causes drawn as the fish: the bones are the
     bone column's options (6M, 4M, 8P — the method's own), a cause added
     by tapping its bone, moved by dragging it to another (or *Move to* for
     the keyboard), opened to mark it a root cause, say how it is known and
     drill its whys; each cause says what is linked to it ("2 experiments ·
     1 past due").
   - **board** — a log as lanes: the lane column's options (Plan · Do ·
     Check · Act · Done, or Open · Doing · Done), each entry a card with its
     owner, its day (red once gone and not in the last lane) and what it is
     linked to; dragged between lanes (or *Move to*), added in a lane.
   - **charter** — a form drawn as a one-page charter: the problem, the
     goal, scope in and out, the business case (a worked-out box, in £),
     the sponsor and the team, its sign-off beside it.
   - **timeline** — a log of decisions (or any dated entries) down the
     page by day: what, who, why, its kind.
2. **A LINK column** (`ref`) — a column (or box) whose value is an entry of
   an earlier log on the method: "the root cause this experiment tests",
   "the experiment this action belongs to". Kept as the entry's id inside
   the log's record (no new table, no new record — `flow_records` as
   today), said by the entry's words, followed both ways: the experiment
   names its cause; the cause lists its experiments and their actions.

**Views never compute what a gate or a measure reads.** The arithmetic stays
in the analysis blocks (a count, a share, past due, the fishbone block's root
causes); a view draws the entries and edits them. Every number on a view is
an analysis's or a box's, so screen, paper, gate and measure agree.

## Where it shows (rule 5, connect the dots)

| Place | How a view shows |
|---|---|
| The step's sheet | the view in place of the table — the table one tap away (*Table*) |
| The project's page | a stage with a viewed step leads with it, compact (the fish, the board's lanes with counts, the charter's head) — tapping opens the step |
| The method's page and the studio's preview | the step says "shown as a fishbone · bones from Bone" |
| The report | each view's own paper: the fish, the board as lanes in a table (past due red), the charter page, the decisions in order |
| The assistant | told the views and their slots (`VIEWS_SAID`), proposes a view and its bindings, and links between logs |

## The quality bar — each view, before it ships

- **Visual** — pictures at desk (1360) and phone (390) on the change and on
  live, every page that moved looked at (`--shots`, `--compare`).
- **Usable** — every drag has a tap-and-choose equal (*Move to*); a phone
  never needs a drag; no dead end.
- **Accessible** — every control named, the state in words beside every
  colour, keyboard reachable.
- **Data** — a link to a struck entry says so and keeps the link; editing an
  entry keeps its links; nothing is lost after a reload or on the second
  device (the entries sync as they do today).
- **Right** — the arithmetic is the analysis blocks', tested against worked
  examples.
- **Proved** — an acceptance script drives it as Rowland would
  (`scripts/acceptance/lean-project.mjs`).

## The example — Faultline's Lean improvement project

Built from the library, by hand or proposed: Define (the charter, drawn as a
charter, signed by the sponsor) → Measure (the baseline log) → Analyse (the
causes on a fishbone, root causes marked) → Improve (PDCA experiments on a
board, each linked to the root cause it tests; actions on a board, each
linked to its experiment, with owner and day) → Check (the after log, before
and after proved) → Act (the decisions on a timeline, the standard, the
sponsor's close).

## The slices

1. The engine: the registry, the link column, the validator, the runtime's
   links both ways, the editor's *Shown as*; tests.
2. The fishbone and the board, on screen and on paper.
3. The charter and the timeline.
4. The Lean improvement project in the library; `acceptance/lean-project.mjs`.
5. The assistant: views and links in the proposal — the grammar tested live
   before the gateway is redeployed.
