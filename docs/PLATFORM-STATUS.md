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
| 1 | Definition, validator, formula, runtime, templates, tool registry | 43 unit tests incl. 300-job parity and randomized invariants | ships with slice 3 |
| 2 | Records and sync: IndexedDB v21 (`methods`, `flow_records`, `activity_log`), mappers, sync kinds, `projects.flow`; `supabase/METHODS.sql` and `FLOW_MEDIA.sql` applied to the live database and read back; the operations (`lib/flow/operations`) with permission checks and an activity line each | 11 operation tests on a real IndexedDB (owner / team / client), the schema test (both sides of every column, the media rule) | ships with slice 3 |
| 3 | Screens, AI off: Methods library (`#/methods`: from the stage gate's usual lists, from a stage-gate job as it ran, or blank); one method (`#/methods/:id`) read as a plan and written while a draft — roles, stages, steps (per machine or once, answer, role, passes if, photos, files, due day, waits on, boxes with limits and worked-out sums), gate conditions (block or warn), the validator's words, Approve, a new version, delete a draft with Undo, the projects on it, its history; start a project; the project's page (`#/project/:id` when `project.flow`) — the lean page, the stage strip, a step per machine, the step sheet (fields, photos, files, sign-off, plan day, who, Done refused with what is missing, did not pass with what happened, try again keeping the attempt, take back), the gate sheet (each condition met or not, a check confirmed by name, pass over what is unmet only with a reason, reopen with a reason and Undo), who does what, machines, what has happened; the method report (PDF, lean page); the rail (Methods; a project's stages and its method); the control room's row, week, Who owes what (a supplier-side role under the supplier) and the rail's jobs; Details (no switching a method project to the three); Reports (the method report) | `lib/flow/__tests__/view.test.ts` (words, lean page, the control room's row through `portfolio()`, the report at one page and at many pages, nothing cut); `scripts/acceptance/methods.mjs` (the whole journey in a browser, team and client, phone); smoke seed (a method approved with a draft of v2 open, a project on it part-way, a run that did not pass); `docs/PAGES.md` and `scripts/inventory/pages.mjs` lines | gated with slices 1–2, shipped together |

| 4 | The gateway (`supabase/functions/assist`: session check, a daily allowance by number and cost, structured output held to the proposal's schema, read again by the app's validator; key server-side; off without the key or the usage table) and design by conversation | `assist.test.ts` (recorded answers, the copies word for word), `scripts/acceptance/methods-design.mjs` | code on the branch; the function is not deployed and its usage table not applied (below) |
| 5 | The assistant on a project (`lib/flow/ground` facts with how each is known; the app answers the common questions itself; the assistant's answer checked — a figure it was not told is never shown as known); changes as a new version with every change said (`lib/flow/change`); moving a project to a new version with the effect said first, completed work kept, Undo; the history on the report | `ground.test.ts`, `change.test.ts`, the acceptance | with slice 4 |
| V | The vision slice — tools and measures in the engine (D9, D10), Faultline's library (D11), the studio (D12), copy and adapt, a project's line, a tool step attaching a study, measures as tiles, on the page, the paper and the assistant's facts | `capabilities.test.ts` (tools, measures, measureMet, proposal round trip, keys kept, SMED read by SMED's module), `library.test.ts` (every entry valid and runnable, found from words), `methods-design.mjs` (41 checks: control room → studio, AI off and on, shaped, approved and started, version 2 with a measure, the project moved, measured 36 → 44, asked, the report, SMED's method adapted and run with a SMED study attached, used as it is, copied); smoke routes; PAGES and inventory lines; the seed's SMED method run | with slice 4 |

## Next actions (in order)

1. Ship slices 4, 5 and V to `main` once the full gate passes.
2. With Rowland's word: apply `supabase/ASSIST_USAGE.sql` (declined when
   tried on 18 October — not retried) and deploy `supabase/functions/assist`
   from the repo; then he sets `ANTHROPIC_API_KEY`. Until then every AI
   feature says it is off and everything else works.
3. A tool step started from the step itself: the tool's New sheet opened on
   the project's line, and the study attached when it is made (today: the
   step opens the tool's list on the line; the study is attached on return).
4. Line capacity as a tool with figures (line rate, bottleneck) — it lives on
   a product's line standard, so a step names the standard.
5. The 6M and the lever tree as library methods with their own pictures
   (the fishbone, the tree) drawn from a method's records — today they stay
   the native screens, and the library's "Line performance" is the
   configurable form of the 6M journey.
6. Later: organisations/tenancy (a shared library); the server re-checking a
   gate pass with the same runtime.

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

## Blockers needing Rowland

- **The assistant's allowance table** — `supabase/ASSIST_USAGE.sql` was not
  applied (the tool call was declined on 18 October). Either say yes to it
  being applied from here, or paste the file into the Supabase SQL editor.
  The gateway refuses to run without it (no cost control, no assistant).
- **The gateway** — `supabase/functions/assist` is written and tested, not
  deployed; it is deployed from the repo with Rowland's yes.
- **The key** — `ANTHROPIC_API_KEY` as a Supabase secret (Ask already reads
  the same one). Without it every AI feature says it is off and the studio,
  the library and the form work by hand.

## How to resume

`git log --oneline -20` on `claude/faultline-connection-1vx7kt`; read this
file; run `npx vitest run src/lib/flow`; continue at the first unchecked
next action.
