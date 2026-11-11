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

### 11 November, 17:16 — the first run on GitHub Actions (assist v32, before the rename and streaming reached it), two runs

**11 of 13 turns right in each run (33 of 35 marks); about 3 minutes a run; 35–37 asks, median 4.6–4.8 s, p90 5.9–6.3 s.**
None of the four turns marked wrong was a mistake by Luna; all were the exam's own doing, fixed the same evening:

- *unknown-machine* (both runs): she called `resolve` for "the bagger in packing", found two baggers and asked which one. The mark
  only counted `resolve_record`, `factory_map`, `find`, `plan_work` and `line` as looking. `resolve` now counts.
- *not-allowed* (run 1): she said "I can't do either of those". The mark matched the curly apostrophe only. Both now count.
- *agree* (run 2): run 2 ran on run 1's records, so she found run 1's project, put the work in it and refused to make a second
  project of the same name, which is right. Each run now opens its own browser and seeds afresh.

So on this exam the live model was right on every turn the exam meant to test.

*No real run yet.*
