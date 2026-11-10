# Luna, the next evolution — an analyst, not a cleverer chatbot

Agreed with Rowland, 10 November: *"Agreed. Do it … That makes complete sense as the next thing to do … proceed."* — after the
proposal *"Luna's next step is to work like a good analyst: trust, thinking, memory."* Luna already reads the records, workbooks and
files, draws charts and builds reports (`docs/CONVERSATIONAL-DATA.md`, `docs/WORKBOOKS.md`); this is what she lacked.

The rules do not move: every figure is Faultline's code's, never the model's; a write is a card; one client's knowledge is never
seen in another's; Manual Mode works with the AI off (`docs/AI-MODE.md`).

| # | Slice | What it does | Where |
|---|---|---|---|
| L1 | **Every figure checked** | Every number in a chat answer is checked against what Faultline worked out in that answer (its results, to the rounding written), what the person said and today — not only report sections. A number that rests on nothing is marked in the words themselves and the answer says how many were checked ("All 6 figures checked against Faultline's working" or "2 figures to check"). Luna does arithmetic through `work_out` (a difference, a share, a per-week rate — Faultline's code over figures it already holds), never in her head. | `src/colleague/figureCheck.ts`, `src/capabilities/workout.ts`, `AiModeScreen` |
| L2 | **She digs** | `explain_change`: a measure of any source (the line's stops, trials, problems, a workbook sheet, an imported file) over two periods — total before and after, and for every field it can be broken by, how much of the change each value carries, ranked; the field that concentrates it most; then within its biggest mover, the next field. Kept as a result, so it is charted and reported like any other. | `src/lib/data/change.ts`, `src/capabilities/dig.ts` |
| L3 | **What your words mean** | A notebook a client: "downtime means unplanned stops only", "Celox is a line", "the product master holds costs and rates". Luna proposes an entry (a card), the person says yes, every later conversation about that client is told it. Shown in the conversation's context panel with Take off. Never another client's. | `src/colleague/notebook.ts`, `src/capabilities/notebook.ts` (a `notebook` study a client — synced as any study, no new table) |
| L4 | **Spreadsheets meet the line** | `join_results`: any two results matched by their labels — a budget sheet's minutes by reason against the stops the line timed — both values, the difference and the ratio a label, and what matched on one side only, named. Kept as a result. | `src/lib/data/join.ts`, `src/capabilities/dig.ts` |
| L5 | **Charts that say what they show; reports that stay current** | A chart carries its finding, worked out by code (the biggest bar and its share, a trend's first-to-last change, how many over a target), drawn on it and the biggest bar marked. `refresh_report` re-runs every result a report rests on against the data as it is now — a new version, its figures checked again — and `report_like` builds a new report with the sections of an earlier one (this client's), each result asked again. | `src/lib/data/outputs.ts`, `chartSvg.ts`, `src/capabilities/data.ts` |
| L6 | **The exam** | Questions with answers worked out independently of Luna's capabilities: an **engine exam** (vitest, every gate: each question's correct calls run through the real capabilities on seeded records and a generated workbook, the figures equal to the hand-worked ones) and a **live exam** (`#/ai/exam`, run by the person on their own records — it costs their allowance, so it is never run unasked): each question asked of Luna in an exam conversation, her answer graded by code — the right figures in it, no figure resting on nothing, asks back when it must, says *cannot be said* when it cannot. A score kept with the date, so a change to Luna is shown better, never claimed. | `src/colleague/exam/`, `src/screens/LunaExamScreen.tsx` |

Order built: L6's engine exam with L1, then L2, L3, L4, L5, each live on its own.

## What it does not do

- The live exam cannot be run from the build machine (it cannot reach the gateway), so its score is the person's to take; the engine
  exam runs in every gate.
- `work_out` is arithmetic on figures already held — never a model's estimate; a figure that cannot be traced is still marked.
- The notebook is a client's words, not a classification of their data: a meaning never re-labels a record.
