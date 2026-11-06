# FC-202 part 2 — Line Talk toolsets, slices T0–T1: the pipeline and the flow diagram: the specification

**Catalogue:** FC-202 (Line Talk), FC-003 (the process flow chart it fills first); the plan for all five sets is `docs/LINE-TALK-TOOLSETS.md` · **Knowledge:** `docs/LINE-TALK.md`, `knowledge/specs/FC-003-process-flow-chart.md`, `knowledge/methods/lean/process-flow-chart.md` · **Asked for:** Rowland, 6 November 2026 — *"a flow diagram while I'm talking … walking and talking and then having a report generated in the correct format … build the plan and let's make it."* **Status:** specified and built 6 November (T0 + T1); T2–T5 are in the plan.

## 1. Purpose
Walking the line and describing a path — "cases off the line to the wrapper, wait for the pallet, wrapped, 40 metres to the store, sit there" — should produce the **process flow chart** without typing 14 steps into boxes. The sentence it lets one side say to the other: **"I walked it and said it; here is the chart, with the minutes and metres as I said them and the totals by class as the tool works them."**

**Scope.** (T0) A talk has a **toolset** (kept on the talk, changeable): *Walk & report* (today's, unchanged) or *Flow diagram*. In a flow-diagram talk the assistant is told what a process flow step is and answers with a **`capture`** — the steps *as they now stand, whole* (what, class, minutes and metres only if said). The capture is read and checked like a document is, its figures grounded against what was said, shown **live as the tool's own chart** beside the talk (a tab on the phone), editable (the steps), and **Make it** creates a Process flow chart on the talk's line/project with its boxes filled, marked *From a talk* with a link back and Undo; **Update it** writes later changes into that same record. (T1) The flow-diagram set itself: the instructions, the schema, the step mapping to the calculator's `Inputs`, the example. **Not here:** the other sets (spaghetti, value stream, micro-movements — slices T2–T4, each with its own spec, FC-004 part 2 / FC-001 / FC-233), the tool's *Talk this* doors (T5), reading a path from video, any figure the assistant works out.

## 2. Users and scenarios
The engineer or line lead on the floor with a phone. (1) *The tray.* Starts Line Talk, picks *Flow diagram*, walks and says the path; the chart builds as they talk; one question comes back ("how far to the store?"); they answer; *Make it*. (2) *A correction.* They tap a step in the draft and fix its class; the assistant carries on from their version. (3) *A talk with no signal.* Words are kept; the draft appears when an answer does.

## 3. Method selection
The process flow chart (ASME, five symbols — `knowledge/specs/FC-003-process-flow-chart.md`) is unchanged; this slice only adds a way to fill its boxes.

**Established · assumed · chosen.**
- *Established:* the chart's classes, figures and sentences are FC-003's (`tools/flow/processFlow`, `tools/calc/defs/process-flow`); every number on the chart is that module's.
- *Assumed:* the person says the steps in the order they happen; a number said is a number meant ("about 40 metres" is 40, and the page shows it for confirming).
- *Chosen (Faultline's own — Rowland has not named these):* **the assistant writes down, never works out** (a minute or metre not said is left empty and named, never estimated); **the draft is the whole chart each answer** (not a patch — no merge to get wrong; the person's edits are sent back with the next turn); **capture is proposed and made on a tap**, in line with docs/LINE-TALK.md ("records proposed, never made by it"); **up to 24 steps** (the calculator's slots); **a set per talk, changeable**, never inferred silently; **the flow-diagram set answers with a `capture` and a `reply` only** (a small schema — a large grammar is refused by the API), and a document is asked for in a Walk & report talk.

## 4. Inputs
The talk's turns as today; the toolset (`walk` · `flow`); the **draft so far** (the capture as the person now has it, sent as words with the records); the line's records as today. Per step in the capture: *what* (text), *kind* (operation · transport · inspection · delay · storage), *min* (number or none), *m* (number or none, a transport's).

## 5. Data suitability
A step with no class is asked about, not guessed: the draft keeps it *out* until it is classed (the chart cannot hold an unclassed step), and the reply says so and asks. Minutes or metres not said are left blank — the chart already says "N steps have no time yet". More than 24 steps: the assistant says the chart holds 24 and offers a second chart. Metres on anything but a transport are dropped (the tool's own rule).

## 6. Calculations
None new. The chart's figures are `flowFigures` / `flowMoney` and its sentences are the calculator's. The capture→boxes mapping is exact: step *i* → `s{i}_what`, `s{i}_kind`, `s{i}_min`, `s{i}_m`. **Independent case:** the knowledge record's tray (14 steps, 279.5 min, 140 m — `scripts/knowledge/cases-kaizen.py` F) said step by step must equal the same chart typed through the boxes, figure for figure.

## 7. Outputs
On the talk's screen: the toolset chips; in a flow-diagram talk a **Diagram** tab (phone) / pane (desk) with the live chart drawn by the calculator's own result view and, under it, the step list (editable: rename, change class, minutes, metres, take out), what is missing, **Make it** (or **Update it · Open it** once made). In the made study: *From a talk* with the link back. **The report.** The made study's paper is the process flow chart's, unchanged (sentence, all steps, money, before → after) — the talk adds nothing to it but its *From a talk* line. The talk's own document (walk report) is unchanged.

## 8. Manufacturing usability
On a phone: Send, the tabs, Make it and Undo are 44 px; the chart scrolls inside its box; nothing off the side. The draft appears as the answer streams in (the reply first, then the chart). Floor noise: the words are shown as heard and can be put right before Send, as today.

## 9. Failure handling
No signal / gateway down: as built — the words are kept and the answer waits; the draft stays as it was. An answer whose capture cannot be read is kept as a reply, the draft unchanged, and says so. Allowance spent: said in the allowance's words. A made record that was deleted: *Update it* offers *Make it* again. A client: reads the talk and the made chart, changes nothing.

## 10. Integration
Reads/writes: the talk (a study of tool `talk`) gains `facts.set`, a reply turn gains `capture`, the talk gains `facts.made` (the made study's id); the made study is an ordinary `calc` study (`agreed.calc = {key:'process-flow', inputs}`) with `facts.fromTalk = {talk, at}`. Shows in: the talk, the line's Tools (the made chart), the line report (as any process flow chart), the project's tools when talked in a project (`lib/inProject`). Sync: the talk's facts and the study sync as they do; the schema is jsonb inside `facts` (no column, no migration). Access: `can.edit` makes/updates. The gateway: `assist` gains the set's instructions and schema (`scripts/sync-assist.mjs`, deployed with all five files and read back by the `rules` fingerprint).

## 11. Verification
Unit: `src/tools/talk/__tests__/talkSets.test.ts` (the set's schema is small and closed; the capture reader keeps a step only as the schema says, drops metres off a non-transport, never invents a time; the mapping to `Inputs` equals the calculator's `stepsOf` round trip; the grounded check flags a minute that was not said; the prompt forbids estimating). Acceptance: `scripts/acceptance/talk-toolsets.mjs` (the assistant answered by the script, as `line-talk-assistant.mjs` does).

**Acceptance criteria.**
1. The set is chosen on a talk, kept after a reload, changed mid-talk, and a Walk & report talk behaves as before — *proved by* `talk-toolsets.mjs` and the existing `line-talk-assistant.mjs`.
2. A flow-diagram answer's capture is read as the schema says and held to its limits; a step with no class is not drawn; metres on a non-transport are dropped; a time not said is never filled — *proved by* `talkSets.test.ts`.
3. The record's tray said step by step makes a chart equal to the same tray typed through the boxes: the sentence, the five tiles, the money and the chart — *proved by* `talk-toolsets.mjs` against `process-flow`'s own example.
4. The live chart follows each answer; an edit to a step in the draft is kept and sent back with the next turn — *proved by* `talk-toolsets.mjs`.
5. *Make it* creates one Process flow chart on the talk's line, marked *From a talk* with the link; *Update it* changes that record, never a second; Undo removes it — *proved by* `talk-toolsets.mjs`.
6. The made chart's paper, downloaded and read back, equals the typed chart's and carries *From a talk* — *proved by* `talk-toolsets.mjs`.
7. A client sees the draft and the made chart and has no button to make or change either; the phone has nothing off the side and 44 px controls — *proved by* `talk-toolsets.mjs`.
8. The deployed gateway holds the same instructions and schemas as the repo (`rules` fingerprint) and a real answer asked of it for a flow-diagram talk returns a readable capture — *proved by* the read-back and the live check, reported in the commit.
Not yet proved: hearing in floor noise on a real phone.

## 12. Maintainability
One module for the sets (`tools/talk/talkSets`: the set ids, each set's instructions, schema and capture reader — adding a set is one entry there, its mapping and its preview), shared word for word with the gateway by `scripts/sync-assist.mjs`; the mapping from a capture to a calculator's `Inputs` lives beside the calculator (`defs/process-flow` exports it) so the two cannot drift; the words (*From a talk*, the chips) in one place.
