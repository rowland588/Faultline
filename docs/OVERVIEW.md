# The factory overview — 13 November

Rowland, 13 November: *"Develop a collective customer-facing factory overview … It should tell the story of the factory as I see it:
key problems, losses and constraints; departments, lines and machines investigated; opportunities and priorities; risks; progress;
evidence of operational and financial value … a living picture that develops as I carry out further work, retaining the original
baseline … I do not want to enter information twice or maintain a separate set of dashboard data."* Then: *"I need you to take ownership
of the design … I think it's a replacement of the story. I don't know. You're the designer."*

## 1. What was decided, and why

| Decision | Why |
|---|---|
| **It is a view, never a record.** `lib/overview` reads what the app already holds; nothing is typed on the page and nothing is stored for it. | "I do not want to enter information twice." A second set of dashboard data would drift from the tools the day after it was made. |
| **It does not replace the Story — it sits in front of it.** Overview · Story · Lines · Set up. | The Story's approved chapters are the only frozen figures the app has; the **first chapter is the baseline**. Without the Story there is nothing to compare today against. The overview is *where the factory stands*; the Story is *the updates given, in order*. |
| **Presented from the consultant's device** (Present, full screen) **and handed over as a PDF.** No customer login. | Customer separation in the database still rests on rules that are not yet proved for a customer's own login (`docs/ORGANISATION.md`). A page shown and a paper handed over need no new access. |
| **Money is the one cost model's, and partial.** A cost a day is said only for problems a line can price; how many it cannot is said beside it. No pounds are claimed for a proved fix — it says its own before → after. | "Do not fabricate measurements or evidence." A total that silently leaves out the unpriced reads as the whole. |
| **Every row is a door.** A loss opens its problem, a line its page. | `docs/LOOK.md` §0: no dead ends. |

## 2. What it reads (no new reader where one existed)

| Section | From |
|---|---|
| The sentence and four tiles | below, summed |
| What is costing the most | the register's open problems on the customer's lines, priced by `lib/useFactoryRead` (each line's `problemCost`), ordered by `lib/factoryQuestions wrongOf` |
| What holds each line | `lib/lineLoss neckOf` — the bottleneck its Line capacity works out; else *not worked out yet* |
| Where we have looked | `lib/areas areasOf` over the lines; per line its tool records (the story, talks and notebooks are not tools), its problems, which of its machines a study or problem names, the latest date; visits from `lib/visits` |
| What LUNAR found | `lib/brain` — the findings kept on each line, in the engine's own sentences, measured and unlikely-to-be-chance first |
| What needs attention | critical and late problems, late actions and actions with nobody's name (`doingOf`, `whoOf`), lines with no bottleneck, unpriced problems, lines not looked at |
| What has improved | `tools/yokoten` proved fixes (a countermeasure done with a before → after that moved the right way) and `lib/knowledge outcomesOn` (read only — the overview never writes the ledger) |
| Since the baseline | the Story's first approved chapter's `StorySnapshot` against the same figures now |

## 3. Slices

| | What | State |
|---|---|---|
| V1 | The model, the page (first Factory tab, `#/overview`), Present, the paper, tests, `scripts/acceptance/overview.mjs` | **built 13 November** |
| V2 | A wider snapshot at each Story update — the bottleneck of each line, coverage, each fix's outcome — so *Since the baseline* can say constraints moved and coverage grew, not only counts. Old chapters stay as they are and say what they did not hold. | next |
| V3 | Every tool's latest finding in one common form (task A2, Signals), so the overview lists what each study says, and the same form lets Luna answer from code. | after V2 |
| V4 | Value in pounds for a proved fix, where the cost model has the inputs — said as *if it holds*, with the inputs named. | after V3 |

## 4. Not yet proved

- Shown to a customer in a real meeting: not done.
- A customer with thirty lines: the page is rows and folds and should hold, but it has been driven only on the seed's three.
- The baseline is whatever was true when the first update was approved; a customer whose first chapter came late has a late baseline, and the page says its date.
