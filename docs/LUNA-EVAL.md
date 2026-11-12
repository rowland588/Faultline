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
  allowance (`ASSIST_CHECK_DAILY_CALLS`, default 400; `ASSIST_CHECK_DAILY_USD`, default $25), apart from their AI Mode allowance.
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

