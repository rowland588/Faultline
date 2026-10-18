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

## Next actions (in order)

1. **Slice 4 — the gateway and design by conversation.** Edge function
   `assist` (Claude, server-side key, session check, per-user daily budget
   and usage table, structured output validated by the same validator,
   recorded-response tests); "Describe the work" on the Methods page → a
   proposed definition shown as the method page shows one, with the
   validator's words → Accept as a draft (origin `assistant`, logged as the
   assistant's proposal) → the person approves it as any draft. AI off: the
   button says so and the form path is unchanged.
2. **Slice 5 — the assistant on a project** (known · worked out · inferred ·
   unknown, from `readFlow` only), change proposals as validated patches →
   a new draft version, moving a running project to a new version with
   completed work kept and the effect said first, the activity log on the
   report.
3. Slice 6 — tools as components: a step answered by a capability study,
   loss count, SMED, line balance, work sampling, value stream map or Line
   capacity (the registry exists; the step sheet's "attach a study" is the
   missing piece).
4. Later: organisations/tenancy; the server re-checking a gate pass with the
   same runtime (today: the owner-only database policy plus the client's
   own check).

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

- None yet. When the gateway ships it needs `ANTHROPIC_API_KEY` set as a
  Supabase secret (Ask already reads the same one); without it every AI
  feature says it is off and the form path works.

## How to resume

`git log --oneline -20` on `claude/faultline-connection-1vx7kt`; read this
file; run `npx vitest run src/lib/flow`; continue at the first unchecked
next action.
