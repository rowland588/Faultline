# Luna with the real model — how she is proved (11 November)

Rowland, 11 November: *"The most important gap is that scripted tests have demonstrated much of the capability, but real-model writes have
not yet been proven … Build a small real-model regression suite so future changes can be checked against genuine operational scenarios.
Do not claim that scripted tests prove real-model intelligence."*

## 1. What the scripted tests prove, and what they do not

Every acceptance script under `scripts/acceptance/ai-*`, `luna-*`, `factory-*`, `voice`, `conversational-data`, `workbook` runs the real app
in a real browser on real records, and **plays the model with a script** (`page.route('**/functions/v1/assist')`). They prove the
machinery: that a capability called with these inputs writes this record, that a write waits for its card, that a refusal is said.
They prove nothing about whether the real Luna chooses that capability, with those inputs, at that moment. On 11 November the live
database held 32 real colleague answers in 4 conversations — every action a read; no write had ever been made by the real model.

## 2. The harness — `scripts/eval/luna-real.mjs`

- The real app (a dev server) in a test browser; its records live in that browser's own storage, so no factory is touched.
- Every `task: colleague` ask is sent to the **live AI service** through its **check door**: `x-check-key` with the database's own key
  (`push_keys.cron_key`, the key `remind` and the Line Talk check already use; no API role can read it). The gateway runs the same task by
  the same code — instructions, schemas, refusals, audit — and keeps its cost as `colleague-check` under the administrator, with its own
  allowance (`ASSIST_CHECK_DAILY_CALLS`, default 80; `ASSIST_CHECK_DAILY_USD`, default $3 — lowered 12 November; and the whole service is held to `ASSIST_MONTHLY_USD`, default $25 a calendar month, about £20, by Rowland's word), apart from their AI Mode allowance.
- The capabilities run in the test browser exactly as on a phone; each turn's cards are answered by that turn's rule (yes only to what a
  person would say yes to there).
- **Marked by the exam's own code** (`src/colleague/exam/investigation.ts`), never by the harness's opinion. Every turn kept: what was said,
  Luna's reply, her steps with their statuses, each mark and why, and how long each ask to the service took.
- It measures; it does not gate. Its result is written to a JSON file and summarised in §4.

Run (from an environment that may reach the project's Supabase host — the *Faultline* environment allows it):

```
LUNA_CHECK_KEY=<push_keys.cron_key> SMOKE_BASE=http://127.0.0.1:5191 NODE_USE_ENV_PROXY=1 \
  NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/eval/luna-real.mjs eval-out [--runs N]
```

## 3. The suites

| Suite | What it asks of her | Source |
|---|---|---|
| **bagger** | 13 turns: the machine not known (two baggers — ask which), which line (read its evidence, recommend timing the stops), a project worked within (two cards), the stops timed live, an operators' estimate kept as reported, a stop, its end, a correction (put right, not a second stop), a second problem kept apart, back to the bagger (count, not enough yet), a chart and a cost (worked out by Faultline, £105), something she may not do (delete, verify), the next day in a new conversation | `src/colleague/exam/investigation.ts` |
| **workbook** | 10 turns on a site's Excel (20 November, X4): a made-up production log attached through `colleague/attachWorkbook` — the very function AI Mode's ＋ and Connect to Microsoft read a file by, so the first look is said in code — then a total with the sheet's own Total row to leave out, a line in a month, downtime by reason, an efficiency to average and never add, the minutes with no reason, a month only half written, a chart (its result read back), money the file does not hold, a price given and worked by the app, and the next day in a new conversation (the file found again from the register). Every figure marked against the generator's own truth, proved equal to the app's reader (`workbookBook.test.ts`); the marks proved to pass a careful answer and fail a sloppy one (`workbookExam.test.ts`); the audit: the file once in the register, nothing made in the factory. | `src/colleague/exam/workbook.ts`, `workbookBook.ts` |

Next suites, in this order: **progressive fill** (a SMED or capability study filled field by field as it is said, a question for what is
missing, a correction, left unfinished and picked up); **factory onboarding** (a new customer's lines and machines said, resolved, made);
**management questions** (cross-line: which line lost most this month — answered from the records with what is not known said).

### The A/B to run next: every schema against tool search (11 November)

`ASSIST_COLLEAGUE_TOOLS` (`docs/AI-MODE.md` §8, Sending less a turn) chooses what a turn sends: `all` (every schema, the default) or
`search` (a core of 25 loaded, 80 deferred behind the API's tool search). Run the bagger suite against each with the same `--runs`:

1. `all` (as deployed): `node scripts/eval/luna-real.mjs eval-all --runs 3`.
2. Set the gateway's secret `ASSIST_COLLEAGUE_TOOLS=search`, deploy the function, run `node scripts/eval/luna-real.mjs eval-search --runs 3`.
3. Set it back to `all` (or remove it) unless search wins.
4. Then the rules: `ASSIST_COLLEAGUE_SYSTEM=lean` (with the tools at whichever won), `eval-lean --runs 3`, against the same baseline.
   One switch at a time, so a lost turn is put down to the right change.

Compare, turn by turn: the exam's marks (a turn wrong under search that was right under all is a loss, whatever the saving); the input
tokens a turn (`assist_usage` for `colleague-check` — it keeps input, cache reads and cache writes as one sum, and its cost); the time a turn takes (a search is a step);
and how often a capability was searched for and which (the `server_tool_use` blocks). Search is kept only if no turn is lost.

## 4. Results

Each run is added here with its date, the deployed gateway version, the score and every turn marked wrong with why.

### 21 November — the workbook suite, two more runs: pass^3 (the public benchmark's way of scoring)

Rowland: *"what is her intelligence level? First find the benchmark and measure Luna against it, then plan to get Luna to that
benchmark."* The benchmark and the plan are §6; this is the measurement on the suite nearest to it. Model: `claude-opus-5-5` (read
from `assist_usage`), effort low.

**Run 1: 9 of 10 turns, 33 of 34 marks (23 asks, median 4.7 s). Run 2: 10 of 10, 34 of 34 (21 asks, median 4.0 s).** With
20 November's run 3 (9 of 10) that is three clean runs on the same code: **28 of 30 turns right (93%) one at a time; 9 of 10
questions right in ALL three runs — pass^3 = 90%.** The one question lost, twice, is the same and for the same reason: asked for the
minutes with no reason she adds a count of rows worked in her head (*"blank on another 27 rows"*, *"51 rows"*) — never a wrong headline
figure, but a figure with nothing behind it, correctly marked. Every other answer, every run: the app's figure, the Total row left
out, the rate averaged and never added, the part month said as part, no money invented where the workbook holds none.

### 20 November — the workbook suite, first three runs (assist v53, the deployed code the same as the repo's)

**Run 3: 9 of 10 turns right, 33 of 34 marks, 3 of 3 record checks; 1.9 minutes, 23 asks, median 4.5 s, every reply streamed.**
Run 1 scored 3 of 10 and run 2 8 of 10 — and of the twelve marks lost across them, all but one were the exam's or the app's, not Luna's:

- *The day of a date marked as an unbacked figure* (five turns: "to 15 October"). The figure check now leaves a day beside a month alone
  (`colleague/figureCheck` MONTH_AFTER/BEFORE) — a person in the app saw the same false *Check this*.
- *The first look's figures marked as unbacked* (6,884 and 6,145 minutes by shift, the 13,029 total): what the app's code said in the
  conversation is now its working (`conversation` workedInCode, `colleagueAsk` LoopAsk.worked).
- *"2.2 million" marked*: a figure rounded to millions or thousands is compared at that scale (`figureCheck` SCALE).
- *A figure from an earlier answer's result marked* ("the earlier breakdown showed 51 rows"): the conversation's kept results count
  (`turnRules` earlierResults, LoopAsk.earlier).
- *"The chart is above" marked a claim*: AI Mode's screen draws the chart itself when one is asked for and Luna drew none; the exam's
  runner did not. One function now for both (`turnRules` drawWhatWasAsked).
- *The next day told "yesterday"* while the clock is not moved: the file was read "today", and she rightly asked whether it was the one
  meant. The question names no day now.

What is Luna's, in runs 2 and 3 alike: asked for the downtime by reason she said the 996 minutes with no reason sit on *51 rows* (the
rows with the reason blank, 27 of them with no downtime at all), then, asked about it, put it right with *27* worked in her head —
correctly marked, the app's rule being that her arithmetic goes through `work_out`. Left as found; watched next run.

The dry run before any of it found the reader wrong on the same file (docs/WORKBOOKS.md, *A production log read as a manager reads
it*): fixed and proved before Luna was asked anything.

### 11 November, 19:28 — after the `<br>` fix and the widened marks, two runs

**13 of 13 turns right and 35 of 35 marks in both runs** — the first clean scores. 2.2–2.3 minutes a run, 28–32 asks, median
4.0–4.6 s, every reply streamed, first words a median 4.0–5.0 s. The next-day turn named what is next in both runs, so the earlier
miss is read as variation, not a lapse; it stays watched. In one run Luna also offered a stop timing on the "agree" turn before it was
asked for, and the exam declined it as a person would (start_measurement: declined) — no harm, and the right one followed.

### 11 November, 17:56 — with the "Line A" fix, two runs

**12 of 13 in each run; 2.2–2.3 minutes a run; 27–32 asks, median 4.0–5.0 s; every reply streamed, first words a median 4.3–5.1 s.**
The fix held: told about "the checkweigher on Line A", she found Exam Line A's Checkweigher in both runs (offered to raise it on its
own, and read that nothing was on the register yet).

- *back* (run 1): "one stop doesn't tell us …" — the exam's mark again; it now takes doesn't / won't / cannot tell.
- *next-day* (run 2): her summary of yesterday named no next step. Marked wrong and left wrong: it may be a real lapse; watched next run.
- A reply in run 1 began with a literal `<br>`, which a person would have seen. `colleagueReply` now turns `<br>` into a line break
  (unit test), deployed with the AI service.

### 11 November, 17:34 — the new AI service (Luna wording, replies streamed), two runs, each on a fresh device

**12 of 13 turns right in each run (34 of 35 marks); 2.2–2.4 minutes a run (3 before); 30–31 asks, median 4.2–4.4 s, p90 5.5–6.5 s;
every reply streamed, the first words a median 4.8 s after the ask.**

- *back* (both runs) was the exam's mark: she said "One stop can't tell us …"; the mark now takes "can't tell", "proves little".
- **A real slip the exam marked right:** told "the checkweigher on Line A is rejecting good packs", she said Exam Line A has no
  checkweigher. It has. `resolveWords` dropped "a" as a filler word, so "Line A" became "line", and a line's own "Line X" inside a
  longer name ("Exam Line A") never matched. Fixed in `lib/factoryKnowledge` (the word after "line" is kept; a name's own "Line X" is
  matched) with a unit test that fails without it. The exam now needs a mark for this turn that she found the machine.

### 11 November, 17:16 — the first run on GitHub Actions (assist v32, before the rename and streaming reached it), two runs

**11 of 13 turns right in each run (33 of 35 marks); about 3 minutes a run; 35–37 asks, median 4.6–4.8 s, p90 5.9–6.3 s.**
None of the four turns marked wrong was a mistake by Luna; all were the exam's own doing, fixed the same evening:

- *unknown-machine* (both runs): she called `resolve` for "the bagger in packing", found two baggers and asked which one. The mark
  only counted `resolve_record`, `factory_map`, `find`, `plan_work` and `line` as looking. `resolve` now counts.
- *not-allowed* (run 1): she said "I can't do either of those". The mark matched the curly apostrophe only. Both now count.
- *agree* (run 2): run 2 ran on run 1's records, so she found run 1's project, put the work in it and refused to make a second
  project of the same name, which is right. Each run now opens its own browser and seeds afresh.

So on this exam the live model was right on every turn the exam meant to test.

## 5. The packing-line operational exam — results

The packing-line investigation (`src/colleague/exam/packing.ts`, `--suite packing`): two packing lines each with a Bagger, a DMAIC
investigation set up from ordinary words, its charter said and corrected, a labeller problem on the other line mid-way, the bagger's
stops timed live and one corrected, the operators' "hour a shift" offered as a baseline, the next day in a new conversation, and the
charter finished. Marked on what she did and on the application's records, then an audit of the records once every turn is said.

### 11 November, 21:33 — three runs on GitHub Actions (main at 8a969342)

**The same in all three runs: 10 of 15 turns right (41–42 of 52 marks); the records audit 5 of 13.** 3.2–3.7 minutes a run, 38–41
asks, median 4.0–5.6 s, every reply streamed, first words a median 5.1–6.0 s.

*What she did right, every run.*
- Found that "the packing line" and "the bagger" named two of each, said so and asked which; once told, kept to Packing Line 1.
- Read Line 1 before advising: nothing recorded yet, so everything known is what the person reported; recommended timing the stops.
- Set up **one** DMAIC investigation on Line 1, showed it beside the conversation and agreed to work inside it.
- Raised the labeller's date code as **one** critical problem on **Line 2's Labeller**, said as reported, outside the bagger project, and
  went back to the bagger after it.
- Started the stopwatch on Line 1, captured the stop, ended it, and corrected its reason in place (film jam → bags not opening): one
  stop, one reason, its seconds kept.
- Refused to write "about an hour a shift" as the measured baseline: one timed stop of seconds proves nothing about a shift.
- The next day, in a new conversation, found the investigation by name and said where it stood. Nothing touched any other line.

*Where she went wrong — the model's, not the machinery's (every run).*
1. **The charter went into the DMAIC Define sheet, never into the charter document.** LUNAR's charter is a record of its own (FC-142,
   the Project charter document, with boxes for the target, the unit, the date, the sponsor, the lead, the scope in and out, the team);
   the Define sheet only offers its problem and scope into it. She used `answer_method` on the sheet throughout, so the target, the
   date, the sponsor and the team were never stored as fields, the correction to Priya Shah had nowhere to land, and the final "make
   it a record" made nothing. In one run she said plainly the sheet has no sponsor box; in another she said "I've corrected the
   charter: Priya Shah is now the sponsor" — a claim the records do not bear out. **This is the one real failure, and it is serious:
   an outcome claimed that the application did not record.**
2. She twice called `answer_method` with question keys the DMAIC sheet does not have (the capability refused them, correctly).
3. She once called `fishbone_state` without a line (refused, correctly; no harm).

*Where the exam was wrong — fixed the same evening (11 November).*
- The **stop** turn looked for a stop record straight after "the bagger's stopped". In LUNAR a stop being timed is the line's running
  stopwatch until "running again" makes it a record; she had captured it correctly in every run. The mark now accepts the running
  stopwatch on the Bagger, or the stop.
- The audit said "no charter" without saying where the words went. It now prints the Define sheet's answers beside that failure, so a
  wrong route can be told from a lost fact. No mark was loosened: the charter must still be the document, with its fields.

*Fixed, 12 November (Rowland: "Establish the root cause, correct the destination logic … Ambiguous destinations must result in
clarification rather than guessing").* **Root cause, in the app:** `answer_method`'s description sent to the model said the sheet held
*"DMAIC's charter and phases"*, and its refusal of a field the sheet does not ask (the sponsor) listed the sheet's questions and never
named the charter document — so every run took the sheet as the charter's home, and a refused write left nothing she could point to.
**The fix:** the charter's home is worked out by code from the records (`src/capabilities/documentHome.ts`): no charter on the project —
charter words on the method sheet are refused with nothing written and the step that makes one named (start_draft doc charter →
fill_draft → make_record); one charter — its words go there (a second start_draft carries on with it; the Define sheet's charter
questions point at it, never a second copy); two or more — nothing is written and Luna is told to ask which, by name. The tool's
description and one rule in her instructions say documents are records and never to claim a change a step did not make
(`documentHome.test.ts`). **Records checked:** the live database holds no charter record and no stray Define answers from the exam —
each run seeds and works in its own browser, so nothing reached the cloud. **The exam was tightened, not loosened:** "Started filling
the charter" and "Changed the charter" no longer count an `answer_method` write, and the charter's problem is read from the charter
only, never from the Define sheet.

*What was proposed before the fix (11 November).* Luna needs to know that a charter, an 8D report and every LUNAR document are
**records made through drafts** (`start_draft` → `fill_draft` → `make_record`), not answers on a method sheet, and to say so honestly
when she cannot store something. Likely fix: tool guidance in the colleague's instructions and a pointer from `answer_method`'s refusal
of a field the sheet lacks to the document that has it. Nothing in the capabilities was changed.

## 6. The benchmark — and where Luna stands (21 November)

**The benchmark found.** *AA-AnalystAgent* (Artificial Analysis, 2026): quantitative analysis on real-world spreadsheets and
documents — Luna's own job — 80 tasks, scored **pass^5**: a task counts only if the model is right on all five attempts, because an
analyst who is right four times in five is not one to rely on. At its launch the best model was right every time on 54% of tasks
(Claude Opus 5, max effort; GPT-5.5 50%, Claude Fable 5 49%), with single-attempt accuracy topping out at 66%; later Gemini 3.7 Flash
60%, and the page's current leader 62.5% (GPT-6.2 Astra). The other benchmarks looked at and why not: SpreadsheetBench is about
EDITING spreadsheets (Luna never writes to a file); τ-bench is tool-use in airline and retail service, a useful yardstick for
reliability (pass^k again) but not her work. **Its 80 tasks are not public, so Luna cannot be run on them** — what can be taken from
it honestly is its METHOD (hard analyst questions, right every time) and its BAR (the best assistants in the world are right every
time on about 60% of analyst-grade tasks).

**Measured, 21 November, real model (`claude-opus-5-5`, effort low), 66 asks, $2.38:**

| What | Result | Read as |
|---|---|---|
| Direct questions on a site's workbook (the workbook suite, 10 questions, 3 clean runs) | 93% one at a time · **pass^3 = 90%** | Reliable. The one loss is a row count she works in her head. |
| An analyst's investigation (`luna-demo.mjs`: why is October short of plan — three sheets, the downtime, the money, two sentences for the MD), 2 runs | 15 of 22 and 17 of 22 marks **as first read — the measure was wrong on her main answer (see the correction below)** | What stands: right figures marked to check in the later answers, and more said than was asked for. To be run again with the corrected measure. |
| Operations (the bagger suite) | 13 of 13, twice — **11 November, not re-run** | Stale. |
| A harder operations investigation (the packing suite) | 10 of 15 — **11 November, before the charter fix of 12 November; not re-run** | Stale; its one real failure was fixed and never re-measured. |

**CORRECTED THE SAME DAY — the first finding below was the measure's fault, not Luna's.** Read back from the service's own log
(`assist_usage`, round by round), in both runs she went on after *"Now the why: Line 3's downtime, and the money."* and wrote the
finding — 672 and 777 tokens of it, about 30 seconds after the question. `luna-demo.mjs` had taken a turn as answered when the
*working on it* line was gone; that line gives way to her words as soon as a round writes any, so an answer of several rounds was read
**half-way**, and the script then typed the next question while she was still writing. It also counted the screen's furniture — her
name and the time, *Create action*, the follow-ups offered, the figure line — as her words: a 40-word reply was marked "65 words", and
a follow-up that named the Bagger could have passed *Names the Bagger* for her. The measure now waits until she has stopped, marks
only what she said, and counts a sentence that ends inside a quote. **What her main answer actually said was not kept, so the 15 and
17 of 22 are not her score**; the runs are to be made again. The lesson is the one in CLAUDE.md about fixtures: a measure that is
wrong manufactures a fault that is not there — read the service's own record before believing a script.

**What the analyst runs showed, the same both times.**
1. ~~*The main answer stops short.*~~ **Not so — see the correction above.** She ran the right four steps (the workbook's structure,
   `explain_variance`, the downtime log, the money) and then gave the finding; the script had stopped reading.
2. *Correct figures marked "Check this".* 7.93%, 87%, 96%, 1,636, 63%, £32,389 — each the app's own figure — were flagged as having
   nothing behind them. 2 of 2. **Three faults found in the app's own checking, and put right (21 November):** (a) a sum is written
   back rounded ("= 1,636 min" for 1,635.8) and only its sentence was kept, so the next sum, using 1,635.8, was told that figure was
   "found nowhere" — the sentence now says both; (b) a sum that rested on a figure nobody gave repeated it in its sentence, and that
   sentence was read back as working, so the very next sum using it passed — such a step now lends nothing; (c) an earlier answer's
   steps reached a later answer's check only as the first bracketed line of the turn's text, so one step whose sentence ran over a
   line lost every step after it — they are read from the turns themselves now (`figureCheck lendsNothing`, `conversation
   earlierSteps`, `capabilities/workout`).
3. *"Two sentences" came back as more.* The two sentences were there; so was a paragraph of advice after them. 2 of 2 (the counts
   first written, six and eight, had the screen's furniture in them). Her instructions now say a length asked for is the whole
   answer.
4. *A range where an exact figure exists.* How much of Line 3's shortfall the stops explain: she gave 87–96% (231,710–254,881 packs at
   the line's two rates), saying honestly that the downtime log does not say which product was running. The workbook does hold it —
   the Production sheet has the product by day, shift and line — and the exact answer is 243,481 packs. No capability joins a stop to
   the product running at the time.
5. Heavy arithmetic: nine to ten `work_out` steps and 36–41 s for one answer.
What was right both times: no invented figure in a headline; Line 3; more than half the money on it (£55,509); the Bagger, bag
presentation and film splice; nights; "the log tells us what was seen, not the cause".

**Where that puts her.** On direct questions about a workbook she is dependable — right every time on nine questions in ten. On an
open investigation of the kind the public benchmark sets she is not yet proved either way: the first two runs were mis-read on the
main answer, and what was truly lost was in the app's scaffolding round her — a checker that doubted good figures (fixed), a length
not kept (her instructions, fixed), no join across sheets by time — and one of effort (she runs at *low*). Her engine is the model
family that leads that benchmark's reliability column. These are not comparable numbers: her exams are her own and easier
than the benchmark's tasks. Never write "Luna scores 90% against a best of 62%".

**AND RE-AIMED A SECOND TIME, AN HOUR LATER** — *"when I say intelligence level you must grade it in the future of the app … it's to
get to the level of ChatGPT agent, fully agentic … understand and build."* **The ladder she is graded on, where she stands on it and
the build in order are `docs/LUNA-AGENT.md`**; the five measures and J1–J5 below are kept as its first reading (J2–J5 are its G2–G4).

**The plan — re-aimed the same day by Rowland's word** (*"The path for the app is not tools or projects — Luna linked to data. No more
analysis — Luna knows everything. Ask her a question … a live, humanistic person, like Iron Man's Jarvis"*; CLAUDE.md, first section).
The aim is not a better analyst a person steers; it is a colleague who already knows. So the measure is five things, and the work is
in this order — each step measured by the real-model runs before it is called done:

| What a Jarvis is | Measured by | Today |
|---|---|---|
| **Answers, finished** — one question, one whole answer | of analyst questions, how many get the finding in the first answer | not known — both answers WERE whole by the service's log; the measure read them half-way (corrected) |
| **Right every time** | pass^5 on her benchmark tasks | 90% (pass^3) on direct questions; no analyst turn right twice |
| **Already knows** — nothing attached, nothing steered | of questions about linked data, how many she answers with no file handed to her in that conversation | not measured; today she reads when handed a file or told which |
| **Keeps up by herself** | linked files and systems checked without being asked; how old her knowledge is when she answers | by hand only (Check for a newer version) |
| **Live and human** | seconds to her first words and to the whole answer; said in a person's words, at the length asked | first words 3–5 s; an investigation 36–41 s; "two sentences" came as six |

- *J1 — she is not doubted when right, and says what was asked for (done 21 November).* The figure check holds a sum's value before
  rounding and every earlier answer's working; a sum resting on nothing lends nothing. A length asked for is the whole answer. A count
  is the app's, never two counts subtracted in her head. *(An "asked once to finish" step was planned here and dropped: she does finish.)*
- *J2 — linked, and keeping up by herself.* What she is linked to — a file by its link, a Microsoft file or folder, a production
  system — is checked on its own and read when it changes, per customer; she says what changed since she last looked.
- *J3 — she already knows.* What she has read is kept as a standing picture of each customer's business (what is made, lost, late,
  changed), so a question is answered from knowledge — no file to attach, no sheet to name — and the day opens with what matters.
- *J4 — exact, not a range.* A join across sheets by date, shift and line; a plain CSV read as a workbook; the sums an answer needs
  worked in one step by the app rather than ten by her.
- *J5 — live.* Quicker to her first words; spoken as well as typed everywhere; more thought only where a question needs it, at a cost
  measured first.
- *Kept honest throughout:* her own benchmark — 20–30 questions a manager would actually ask, on linked data with known truths, scored
  pass^5 weekly; the bagger and packing suites re-run (both stale); every result written here.
**Cost.** A check ask is about 3.6 cents; the workbook suite about 80 cents a run; the analyst conversation about 40 cents. A weekly
pass^5 on 25 questions is roughly $8–10 a month against the $25 the service is held to — the cap, or the size of the weekly run, is
Rowland's to decide.

Sources: [AA-AnalystAgent, Artificial Analysis](https://artificialanalysis.ai/evaluations/aa-analyst-agent) ·
[its announcement](https://artificialanalysis.ai/articles/aa-analyst-agent) ·
[SpreadsheetBench](https://spreadsheetbench.github.io) · [τ-bench](https://export.arxiv.org/pdf/2406.12045).

