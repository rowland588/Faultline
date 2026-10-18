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
| 1 | Definition, validator, formula, runtime, templates, tool registry | 43 unit tests incl. 300-job parity and randomized invariants | not yet merged |

## Next actions (in order)

1. **Slice 2 — records and sync.** IndexedDB v21 stores `methods`,
   `flow_records`, `activity`; mappers; sync kinds; `projects.flow`;
   `supabase/METHODS.sql` applied live and read back; schema test; db
   functions with undo; activity entries written by every operation.
2. **Slice 3 — screens, AI off.** Methods library and editor; start a project
   from a method; run view; step drawer (fields, photos, files, sign-off);
   gate panel (block · warn · override · manual checks); report PDF;
   acceptance script; PAGES.md lines; smoke seed.
3. **Slice 4 — the gateway and design by conversation.**
4. **Slice 5 — the assistant on a project, change proposals, versions and
   moving a running project to a new version, the activity log on screen.**
5. Slice 6 — tools as components (capability, losses, SMED, balance,
   sampling, map, capacity).

## Known defects and limits

- None open in slice 1.

## Blockers needing Rowland

- None yet. When the gateway ships it needs `ANTHROPIC_API_KEY` set as a
  Supabase secret (Ask already reads the same one); without it every AI
  feature says it is off and the form path works.

## How to resume

`git log --oneline -20` on `claude/faultline-connection-1vx7kt`; read this
file; run `npx vitest run src/lib/flow`; continue at the first unchecked
next action.
