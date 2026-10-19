# Platform status — where the configurable-methods work stands

**Read this first at the start of every session**, then the code. The design
is `docs/PLATFORM-REVIEW.md` (option C: a platform core beside the native
methods). Rowland's mandate, 18 October: take Faultline to a working,
dependable product in which a person describes a method, approves it, runs
it, asks about it and changes it under control — without stopping for
approval of routine technical choices.

## Destination

1. A method created or adapted in conversation (Claude), or by hand.
2. Approved, it becomes a validated, versioned definition a project runs on.
3. A team executes it: steps per machine, evidence, sign-offs, gates that
   block or warn, an owner's override with a reason, reports.
4. The assistant answers from the project's actual state (known · worked out
   · inferred · unknown), never inventing a figure.
5. Every change validated, versioned and logged; completed work protected.
6. The native stage gate, 6M, lever tree and every tool keep working.

## The vision, checked against the code (18 October)

Rowland, 18 October: "Faultline must not remain the same application with a
chatbot added to it ... The user describes what they want. Faultline helps
design it, builds the approved methodology from reusable application
capabilities, executes it, and lets the user save and reuse it. The library
is a foundation for creation, not a ceiling on it." Asked: what can AI
create, is it genuinely new or a template filled in, does it run, is there a
library, does the UI deliver it or add AI to the old one. Found, and done:

| Question | Before | Now |
|---|---|---|
| What AI can create | A new method from words — stages, steps, roles, typed fields, sums, evidence, dependencies, gates — from the closed vocabulary (not a template) | The same, plus **steps done with the app's own tools** (SMED, a shift's losses, capability, line balance, work sampling, value stream map — their figures read into the step by each tool's own module) and **measures** with a before and an after against a target, and gates that wait on a measure. The assistant is told the tools from the registry, not left to guess |
| Genuinely new? | Yes — composed from blocks, never chosen from templates | Yes; the blocks now include the app's manufacturing capabilities |
| Does a saved method run? | Yes — per machine, evidence, gates, sign-offs, report, history | Yes, and a tool step attaches the tool's record from the project's line; measures show as the first tiles, on the page and the paper |
| Library | Your methods, versioned; no copy, no adapt-into-new, no search, Faultline's own methods were fixed screens | **One library**: yours and Faultline's (stage gate, SMED changeover reduction, line performance by root cause, product trial, rebalance a line) as definitions; use as it is, adapt into a new method, make a copy, find by a word |
| The UI | A one-shot form inside Methods | **The design studio** (`#/design`): say what you need; Faultline proposes; shape it turn by turn (keys kept, each change said, the stage it touched marked); its questions answered in a tap; the library beside it, closest to your words; approve and start a project in one go. Entered from the control room, New job and Methods. Works with the assistant off |

## Decisions taken (brief; the reasons are in the code's comments)

| # | Decision | Where |
|---|---|---|
| D1 | A method is data: `FlowDefinition`, a closed vocabulary (6 answer shapes, 8 field types, 8 gate conditions, registered tools only). A new block is code, never a sentence. | `src/lib/flow/definition.ts` |
| D2 | One validator for every source (form, cloud, assistant): rebuilds the definition field by field, drops anything unknown, checks every reference, says each problem in words. | `src/lib/flow/validate.ts` |
| D3 | Worked-out fields are arithmetic only (numbers, field keys, + − × ÷, brackets), parsed and walked by the app. No answer rather than an invented one. | `src/lib/flow/formula.ts` |
| D4 | One pure runtime reads where a project stands (stages, steps per machine, gates, outstanding, next, verdict) for the screen, the paper, the assistant and the server alike. Its step tones follow the stage gate's (task "hit a problem" amber; test/measurement "did not pass" red; late a separate fact). | `src/lib/flow/runtime.ts` |
| D5 | Gates: each condition **block** or **warn**; a later gate waits on the one before; a manual check is confirmed at the pass; an owner may pass a blocked gate with a reason, kept. Work may be recorded ahead of a gate (an internal tool, not a wall) and is said to be ahead. | runtime, records |
| D6 | Three new records, each justified in its header: `Method` (versioned definition), `FlowRecord` (a step done / a gate passed — kept apart from `tests` so cross-project readers are not misled), `ActivityEntry` (append-only). A project points at its method by `ProjectFlow`. | `src/lib/flow/records.ts` |
| D7 | The stage gate's own usual lists become the first method (`stageGateDefinition`), so nothing anybody wrote is typed twice. | `src/lib/flow/templates.ts` |
| D8 | Claude is the only conversational provider, through one gateway; model per task is configuration, default `claude-opus-5-5` (the user's to downgrade for cost). Gemini's free tier is not a dependency of anything new. | slice 4 |
| D9 | A method uses the app's tools by reference: a step names a registered tool; its record (a study) is attached on the floor; the tool's own module reads its figures (`lib/flow/toolRead`) — the arithmetic is never copied into the engine. Line capacity (no study) is opened and ticked by hand until it has figures. | `src/lib/flow/components.ts`, `toolRead.ts` |
| D10 | A measure is read, never typed: every reading of the step boxes or tool figures that feed it, every attempt, in order — the first is the before, the latest is now — against a target, the way that is better. A gate may wait on it (`measureMet`). | `definition.ts`, `runtime.ts` readMeasure |
| D11 | Faultline's library is definitions like anyone's (`lib/flow/library`); taking one puts a copy in the person's library (origin `library`); nothing in it runs directly, and a person's method is as much a method. A number the app cannot know is left for the person. | `src/lib/flow/library.ts` |
| D12 | One place for conversational design: the studio. It replaced the one-shot Describe sheet and Change sheet — it keeps shaping the same proposal turn after turn, offers the library beside it, and does all three: new, adapt into a new method, next version (kept into the open draft if there is one). The conversation itself is a per-device draft (sessionStorage); the kept method's history says how it began. | `src/screens/DesignScreen.tsx` |

## Parity with the stage gate

`src/lib/flow/__tests__/parity.test.ts` reads 300 random stage-gate jobs both
ways — `lib/install journeyOf` and the new runtime — and compares every
machine at every gate (2,400 comparisons). It found two real differences,
both resolved by adopting the stage gate's rule:

1. A task that hit a problem on a day now gone, with no planned day, is late
   from that day.
2. A task with a day typed but not ticked is still ahead (not under way).

**Kept as known differences** (written in the test's header): Set up counting
a machine's programs; a machine marked installed with no steps; lateness from
hours a problem lost or a finish it moved; each machine having its own step
list (a definition gives every machine the same steps).

## Done and verified

| Slice | What | Verified by | Live? |
|---|---|---|---|
| 1 | Definition, validator, formula, runtime, templates, tool registry | 43 unit tests incl. 300-job parity and randomized invariants | ships with slice 3 — live |
| 2 | Records and sync: IndexedDB v21 (`methods`, `flow_records`, `activity_log`), mappers, sync kinds, `projects.flow`; `supabase/METHODS.sql` and `FLOW_MEDIA.sql` applied to the live database and read back; the operations (`lib/flow/operations`) with permission checks and an activity line each | 11 operation tests on a real IndexedDB (owner / team / client), the schema test (both sides of every column, the media rule) | ships with slice 3 — live |
| 3 | Screens, AI off: Methods library (`#/methods`: from the stage gate's usual lists, from a stage-gate job as it ran, or blank); one method (`#/methods/:id`) read as a plan and written while a draft — roles, stages, steps (per machine or once, answer, role, passes if, photos, files, due day, waits on, boxes with limits and worked-out sums), gate conditions (block or warn), the validator's words, Approve, a new version, delete a draft with Undo, the projects on it, its history; start a project; the project's page (`#/project/:id` when `project.flow`) — the lean page, the stage strip, a step per machine, the step sheet (fields, photos, files, sign-off, plan day, who, Done refused with what is missing, did not pass with what happened, try again keeping the attempt, take back), the gate sheet (each condition met or not, a check confirmed by name, pass over what is unmet only with a reason, reopen with a reason and Undo), who does what, machines, what has happened; the method report (PDF, lean page); the rail (Methods; a project's stages and its method); the control room's row, week, Who owes what (a supplier-side role under the supplier) and the rail's jobs; Details (no switching a method project to the three); Reports (the method report) | `lib/flow/__tests__/view.test.ts` (words, lean page, the control room's row through `portfolio()`, the report at one page and at many pages, nothing cut); `scripts/acceptance/methods.mjs` (the whole journey in a browser, team and client, phone); smoke seed (a method approved with a draft of v2 open, a project on it part-way, a run that did not pass); `docs/PAGES.md` and `scripts/inventory/pages.mjs` lines | gated with slices 1–2, shipped together — live |

| 4 | The gateway (`supabase/functions/assist`: session check, a daily allowance by number and cost, structured output held to the proposal's schema, read again by the app's validator; key server-side; off without the key or the usage table) and design by conversation | `assist.test.ts` (recorded answers, the copies word for word), `scripts/acceptance/methods-design.mjs` | live (fc0178a); the function deployed (v1, from 622d449), its allowance table pasted by Rowland and read back, the key set (an anonymous call answers 401 "Sign in") — live |
| 5 | The assistant on a project (`lib/flow/ground` facts with how each is known; the app answers the common questions itself; the assistant's answer checked — a figure it was not told is never shown as known); changes as a new version with every change said (`lib/flow/change`); moving a project to a new version with the effect said first, completed work kept, Undo; the history on the report | `ground.test.ts`, `change.test.ts`, the acceptance | with slice 4 — live 19 Oct (54999e1) |
| V | The vision slice — tools and measures in the engine (D9, D10), Faultline's library (D11), the studio (D12), copy and adapt, a project's line, a tool step attaching a study, measures as tiles, on the page, the paper and the assistant's facts | `capabilities.test.ts` (tools, measures, measureMet, proposal round trip, keys kept, SMED read by SMED's module), `library.test.ts` (every entry valid and runnable, found from words), `methods-design.mjs` (53 checks: control room → studio, AI off and on, shaped, approved and started, version 2 with a measure, the project moved, measured 36 → 44, asked, the report, SMED's method adapted and run with a SMED study attached, used as it is, copied); smoke routes; PAGES and inventory lines; the seed's SMED method run | with slice 4 |

## Next actions (in order)

1. ~~Ship slices 4, 5 and V~~ — live (fc0178a).
2. ~~ASSIST_USAGE, the deploy, the key~~ — done 18 October (below). Still
   to see: a proposal from a signed-in person, and its `assist_usage` row
   read back (task, model, tokens, cost, ok).
3. ~~A tool step's study attached by itself when it is made from the
   step~~ — built 18 October (`ui/flow/Asking`): the tool's New says the
   step it answers, the study made there is attached by `recordStep` under
   the person's access with Undo, a line balance already timed is attached
   only when asked; `methods-design.mjs` 9e1–9e4.
4. ~~Line capacity as a tool with figures~~ — built 18 October: a step done
   with Line capacity is answered by a product's line standard (its id kept
   in the record's `studyId`, a text column — no schema change), read by
   `lib/capacity` into line rate, good out, short of target and labour a
   pack in pence (`lib/flow/toolRead` readCapacity); Faultline's library
   gains *Bring a line to its rate*; `capabilities.test.ts`,
   `methods-design.mjs` 11–11f.
5. The 6M and the lever tree as library methods with their own pictures
   (the fishbone, the tree) drawn from a method's records — today they stay
   the native screens, and the library's "Line performance" is the
   configurable form of the 6M journey.
6. Later: organisations/tenancy (a shared library); the server re-checking a
   gate pass with the same runtime.

## The new product (18 October) — docs/BLUEPRINT.md §3

Rowland, 18 October: "a genuinely new Faultline product experience ... the
real milestone is being able to describe a manufacturing need in plain
English and create, execute and report on a working methodology". Built
beside the old routes, the gate green at each step:

| Change | What | Verified by | Live? |
|---|---|---|---|
| 1 The front door | `screens/StartScreen`: the question and its box first; what is under way (`lib/portfolio`); the library; the tools on their own; the factory. The words go to the studio (`?say=`) | `front-door.mjs` 1–8: a need in plain words → a method (assistant off: the closest offered; on: a proposal) → approved and started → a stage done and its gate passed → a run measured against its limit and signed → the report read back → listed under way | 688e4ed — live |
| 2 The workspace | a tool opened from a method's step opens inside the project: the address carries the step (`?for=`), the project's rail, a bar naming the step with Back to it (`ui/flow/StepBar`) | `methods-design.mjs` 9e2–9e3, `video-study.mjs` 8b1 | 5dd1947 — live |
| 3 One way to start | New job leads with the words (to the studio with the line), then the established three (stage gate, 6M, lever tree — `lib/flow/established`), then the library; the three in the library page, the front door and the studio's offers; the line carried to the project's start | `front-door.mjs` 9–9o, `established.test.ts`, control-room, factory, methods-design | f685057 — live |
| 4 Home | `#/` is the front door, the control room at `#/room`; one rail off a project (Home · Projects · Methods, then the control room, Your factory, the jobs, the tools); the phone bar Home · Problems · Lines · More; the build stamp on both | `front-door.mjs` 1c–1f, the route and rail tests, control-room, methods, lines, smoke, inventory | d6a1202 + 4839a1b — live |

| 5 Beyond the existing tools | a step can be a log of entries; analyses from a registry of tested blocks (count … Pareto, trend, histogram, Cpk) feed gates and measures; screen, editor, paper and the assistant's brief read the same; needs for development said, never faked; a library method made only of blocks | `analysis.test.ts` (14), `designed-tool.mjs`, the library test, smoke and inventory (a method made of logs) | 5738b42 + e9bcbf2 — live 19 Oct (54999e1) |
| 6 Blocks written after the first | a control chart (I-MR, rules 1 and the 8-run), a relationship (r and its line), a forecast (a week on, the day it reaches a target) — each its arithmetic and tests, and in the editor, validator, assistant's brief, screen and paper at once; a block declares its picture and both screen and paper draw by it; *A process held in control* in the library | `analysis-blocks.test.ts` (14, figures worked by hand; the limits held to the capability study's spread), `designed-tool.mjs` 3d–3e, 7d, 8b–8i, the library test | e8f88f3 — live 19 Oct (54999e1) |
| 7 Questions first | a need is read before it is designed: said back, and at most four questions with answers to tap, why each matters and one's own answer; the answers carried into the design request in the person's words; skipped in a tap; off or failing, designed from the words as they are (the deployed gateway learns `clarify` when it is redeployed) | `clarify.test.ts` (6), `designed-tool.mjs` 0–0d, front-door and methods-design unchanged (the assistant off for questions) | fe3f04a — live 19 Oct (54999e1) |
| 8 Decisions on what is found | a step needed only when an earlier figure says so (`onlyIf`): waiting on that step until it is done, then needed (with the figure) or not needed (grey, with the figure and the rule) and holding nothing up — gates, counts, the stage's words and the paper all follow; in the editor, the proposal and the assistant's brief; the validator allows only a figure of a step before it; *A process held in control* looks for a cause only when the chart signalled | `decision.test.ts` (9), `designed-tool.mjs` 8j–8o, methods and methods-design unchanged | 2cb3eb2 — live 19 Oct (54999e1) |
| 9 What Faultline cannot do yet | every need a method said, gathered on Methods (once, with each method that asked), each with a brief to build it from — what, why, from, method, check, the block's contract and where it goes, how it is proved, what it then reaches — copied whole | `needs.test.ts` (4), `designed-tool.mjs` 8p–8r | 13573be — live 19 Oct (54999e1) |
| 10 A worked-out figure | any arithmetic over a log's figures before it and the step's number boxes (the `calc` block): a yield, a rate, a cost — the rate typed once by the person, never invented; money said as money on screen, in gates and measures and on paper; proposed by the assistant in the labels' words and read back to the keys; Faultline's rejects log costed before and after | `analysis-blocks.test.ts` (+6), `designed-tool.mjs` 3f–3g, 7e, 8a | ac15357 — live 19 Oct (54999e1) |
| 11 A capability built from its brief | reliability: a maximum-likelihood Weibull fit of the times between failures — the mean time between, early · random · wear, the chance within a time — and a new picture (the chance by each time, every time seen) on screen and paper; *Breakdowns, read for when the next one comes* in the library — the need → brief → block path walked once, end to end | `analysis-blocks.test.ts` (+4: Γ as the tables give it, the shape and scale the times came from, a brute-force maximum of the likelihood, the floor's words), `designed-tool.mjs` 8s–8v, front-door and methods-design (nine in the library) | aa963d9 — live 19 Oct (54999e1) |
| 12 A time taken with a tap | a box or a log's column can be *timed* (`timer`): Start when it begins, Stop when it ends, Lap when the next follows at once — the clock kept on the device through a locked phone or a reload, the time typed or corrected by hand; kept in seconds, minutes or hours and read by every block, gate, decision and measure as the number it is; in the editor, the validator (a time in s, min or h, nothing else), the proposal (minutes in words made `min`) and the assistant's brief; *Short stops, timed as they are cleared* in the library — the Pareto by time, the time lost and its cost a day | `timer.test.ts` (11: the arithmetic, the validator, the limits, the gate and the measure, the proposal, the library method's figures worked by hand), `designed-tool.mjs` 8w–8z, front-door, methods-design and the inventory (ten in the library) | live 19 Oct (54999e1) |
| 13 Before and after, proved | a block (`compare`) reads a log against an earlier one on the method — the same column entry by entry, or the entries a day — and says how far it moved and how sure it is not chance (Welch's t-test: the spreads need not match); told which way is better, its figure is how sure it got *better* (one-sided), so a gate on it never passes a change for the worse; the earlier log on the same machine where it is a machine's; in the editor (compared with which log, better which way), the validator (a log before it, logging the same column), the proposal (the earlier log by its title) and the assistant's brief (a log kept again gets one); drawn as a before and a now on screen and paper; *Short stops, timed as they are cleared* now closes on it — at least 95% sure the stops got shorter | `compare.test.ts` (18: the incomplete beta on its closed forms, the t-distribution on its exact forms and the printed 5% and 1% tables, Welch's test worked by hand and held to an integration of the t density sharing no code with it, every sentence, the runtime and its gate, per machine, the validator's words, the proposal round trip), `designed-tool.mjs` 6b–6c, 7f | live 19 Oct (54999e1) |
| 14 Does it differ by group? | a block (`groups`) asks whether a number differs from one group to another — the shift, the crew, the product, the cause — more than it varies within each (one-way analysis of variance): the highest and the lowest, how sure it is not chance, a group too small left out and said; written as ONE entry in the registry with its tests and nothing else — the editor, the validator, the assistant's brief, the screen and the paper took it from the catalogue; *Short stops* asks it of what stopped each stop | `groups.test.ts` (9: F = t² with one on top, the closed form with two, the printed 5% and 1% tables, a hand example whose chance is exactly one in a thousand, every sentence, the catalogue, the library), `designed-tool.mjs` 8y3, 8z | live 19 Oct (54999e1) |
| 15 Who owes what by when | a block (`overdue`, *Past due*) over a log kept as a register — what, who, the day it is due, done or not: the open entries gone past their day, counted, by owner, the oldest named and how late, the next due said; a gate waits on none past due; today handed to the analyses by the runtime; which entries count reads yes and no as the floor says them, and a box left blank as still open; the validator wants a date for the day it is due; the editor offers only date columns | `overdue.test.ts` (7: the register worked by hand, due today not late, a blank box open, no owner column, nothing dated, no today, the gate held and opened, the validator's words), `designed-tool.mjs` 5b–5e, 7g | live 19 Oct (54999e1) |
| 16 A count taken with a tap | a box or a log's column can be *counted* (`tally`): +1 at a time, −1 for a mistap, or typed — packs rejected as they come off, people waiting, trays short — a number to every block, gate, decision and measure; in the editor, the validator (its unit and limits kept), the proposal and the assistant's brief; Faultline's rejects log counts its rejects so | `timer.test.ts` (+2), `designed-tool.mjs` 8a1 | live 19 Oct (54999e1) |
| 17 What drives it | a block (`drivers`) reads several number columns together by least squares (multiple linear regression): how much each moves the figure with the others held still, how sure each is not chance, how much they explain, where to look first — columns that move together said so, never split by guesswork; the extra columns (`also`) in the editor, the validator (each once, numbers only), the proposal and the assistant's brief; *Seal failures, traced to what drives them* in the library — the conditions read together, by reel and by shift, the strongest tried and proved better against the first log, then held | `drivers.test.ts` (9: an exact line found exactly, no nudge lowering the squared error, the textbook two-column formula, with one column the straight line and the Pearson test, columns that move together, the sentences, the validator's words, the proposal round trip), `designed-tool.mjs` 8α–8α2, the library test, front-door, methods-design and the inventory (eleven in the library) | live 19 Oct (54999e1) |

### Against the ambition (18 October, asked plainly)

"The existing application is a starting point, not the boundary." Where
the platform stands, honestly — what is proved where (the tables above
name the tests):

- **Works today, tested in a real browser:** a need said in plain words at
  the front door; the assistant reading it first and asking what the words
  leave open (at most four questions, answered in a tap or in one's own
  words, or skipped); proposing a whole method — stages, steps, roles,
  gates, measures, logs with their analyses, and decisions on what is found
  (a step needed only when an earlier figure says so) — checked by the
  validator before it can run; shaping it in conversation; approving,
  versioning, adapting, copying; running it — steps, evidence, sign-offs,
  logs filled on the floor, gates, measured before → after; the method
  report with every picture and entry. Logs and blocks make tools nobody
  coded: a downtime log with its Pareto, a rejects log by reason and shift,
  a capability log with Cpk, statistical process control (a control chart
  and its signals, a cause looked for only when it signals), what drives a
  figure (a relationship), where a figure is heading (a forecast), when the
  next breakdown comes (a Weibull fit), short stops timed with a tap and
  costed, whether a change really worked (before and after, how sure it
  got better), whether a figure depends on the shift or the cause
  (a difference between groups, how sure), which of several conditions
  drive it (each with the others held still) and who owes what by when (an
  action register, its gate on nothing past due).
- **Configurable without code:** any workflow or project structure from
  the steps, answers, roles, gates and measures; any log with any columns
  and any of the twenty-two analysis blocks over them — a worked-out figure
  among them, any arithmetic on the others and the step's boxes, money
  included; any box typed, chosen, timed with a tap or counted with a tap; a log
  read against an earlier one — how far it moved and how sure it got
  better, not by chance; gates, measures and decisions on those figures; the established tools (Line capacity, SMED,
  the line balance, the capability study, the loss count, work sampling,
  the value stream map, video) as steps. With the assistant off, the same,
  by hand in the editor, and the library closest to the words.
- **Needs development — and the platform says so:** arithmetic no block
  does (a non-linear forecast, an optimisation, a designed experiment — the
  reliability fit and the regression on several columns were ones, each
  built as one block with its tests). The assistant writes it as a need, never an
  imitation; Methods gathers every need with the methods that asked it and
  the brief to build it — the block's contract, where it goes, how it is
  proved. Each is one block in `lib/flow/analysis` with its tests, and it
  reaches the editor, the validator, the assistant, the screen and the
  paper with nothing else rebuilt — shown on 18 October by the control
  chart, the relationship and the forecast, written that way in one slice,
  and on 19 October by the difference between groups, written as one
  registry entry and its tests and nothing else.
  A new kind of picture is one drawing on screen and one on paper. A
  specialist screen beyond a log (a drawn layout, footage) stays a
  hand-built tool, used as a step.
- **Not built yet:** a tool's own panel inside the step (today its page
  opens inside the project); organisation-wide libraries (waiting on
  tenancy); the server re-running the runtime on a gate pass (the app
  checks it and the database lets only the owner write it). The deployed
  gateway (version 2, from d9a896a) carries the schema from before logs,
  blocks, questions and decisions: until it is redeployed from the repo
  (`supabase/functions/assist` at 54999e1 — the deploy waits on the
  Supabase connector, which could not connect on 19 October) the live
  assistant proposes without them and designs without asking — the app
  reads all of them already, and a gateway that does not know a task is
  designed around, never broken.

Next: the gateway redeployed with the app live; a tool's own panel inside
the step; the 6M and the lever tree as methods drawn from records; more
blocks and ways of capturing as the floor asks (a regression on several
columns, a tally counted with a tap, a photo for an entry).

## Known defects and limits

- A gate pass is checked by the app and the database lets only the owner
  write a gate record; the server does not yet re-run the runtime on the
  pass (slice 5/later).
- A machine on a running project is added and renamed on its page, not
  removed: its steps hang off it, and taking it away needs the same care the
  stage gate's Install grid takes (slice 5, with versions).
- Removing a box that a gate condition reads leaves the condition pointing
  at nothing; the validator says so in words and Approve is held back until
  the condition is pointed at a box again (by design: keys never change
  under records).
- The method library is the person's own (the `own methods` policy); a
  method is shared only by a project that runs it. Organisation-wide
  libraries wait for tenancy.

## Video intelligence (18 October) — docs/VIDEO.md

A power tool beside the methods, not instead of them: footage uploaded,
read on the device for the work at each station, reviewed on the footage,
worked out as a line balance, on paper; a method's line balance step
answered by one and started from the step (*Read it from a video of the
line*). Its record of what works, what was measured (synthetic footage,
condition by condition), the shared parts every specialist tool plugs into,
the staged path V1–V7, how each statement says how it is known, the
protocol for accuracy against observations timed by hand, its limits and
what waits on someone is docs/VIDEO.md. Its blockers are below.

## Blockers needing Rowland

- **A video study's footage to the cloud** — `supabase/VIDEO_MEDIA.sql`
  (the media rule taught to look in a study's footage) is written and not
  applied. Until it is, footage stays on the device it was taken on, and the
  study says so; its events, figures and reports sync.

- **The assistant's allowance table** — DONE 18 October: Rowland pasted
  `supabase/ASSIST_USAGE.sql` into the SQL editor, and it was read back —
  `assist_usage` with its nine columns, row security on, one policy (`own
  usage`, select, `user_id = auth.uid()`), no insert/update/delete policy,
  indexes `assist_usage_pkey` and `assist_usage_user_at`, no rows. It is not
  in Supabase's migration history: the connector's `apply_migration` came
  back "cancelled" or timed out after a minute every time (read back after
  each — nothing written by it). That is bookkeeping only; the file is safe
  to re-run, so it can be applied through the connector once that tool is
  allowed, to put it in the history.
- **The gateway** — `supabase/functions/assist` DEPLOYED 18 October, 15:36
  UTC (version 1, `verify_jwt` on), from the repo's copy at 622d449 — the
  copy on `main` plus the video study's `video-label` task, which the live
  app calls only once the video slice ships. Checked by calling it from the
  database (`net.http_post`, the public anon key): it loads and answers
  `{"off":true,"why":"The assistant is not switched on…"}` — the answer it
  gives when no key is set. Redeploy from the repo whenever
  `supabase/functions/assist` changes (the repo copy is the source).
- **The key** — SET 18 October by Rowland, in Supabase's secrets and in
  Vercel's environment. Checked from the database: the gateway now answers
  an anonymous caller 401 "Sign in to use the assistant." — past the key.
  Still to see: one proposal from a signed-in person and its row in
  `assist_usage` (a key Anthropic refuses would say "not accepted" there).
  Before it was set it was NOT a Supabase secret (the gateway's answer above). Rowland sets it himself in Supabase (Edge
  Functions → Secrets); it never passes through a chat or a file. Without it
  every AI feature says it is off and the studio, the library and the form
  work by hand. Two places read a Claude key, and they are separate:
  `api/wording` (the better-wording button) is a Vercel function and reads
  `ANTHROPIC_API_KEY` from Vercel's environment — falling back to the free
  Gemini key, or saying it is off; the gateway (`assist`) and `ask` are
  Supabase edge functions and read it from Supabase's secrets. Neither key
  is ever given a `VITE_` name (that would put it in the browser). `ask` is
  not deployed (the gateway's own `ask` task is what the app uses now).
  Vercel's variables could not be read from here (the Vercel connector is
  refused for the team, 403); `GET /api/wording` on the live site answers
  `{"by":"claude"}`, `"gemini"` or 503 without showing a key.
- **Once the table and the key are both there**, the same call from the
  database answers 401 "Sign in to use the assistant." (the key passes, an
  anonymous caller does not); then one proposal from the studio, signed in,
  and its row read back in `assist_usage`.

## How to resume

`git log --oneline -20` on `claude/faultline-connection-1vx7kt`; read this
file; run `npx vitest run src/lib/flow`; continue at the first unchecked
next action.
