# Luna as an agent — the ladder, where she stands, and the build

**Read this before touching Luna's loop, her capabilities or how she is measured.** It is the measure CLAUDE.md's first section
points at. Where `docs/LUNA-EVAL.md` §6 speaks of an "analyst benchmark", this document is what it became the same day.

## 0. Rowland's words

21 November, shown a plan to raise Luna's score at reading workbooks:

> "The path for the app is not tools or projects, remember it — Luna linked to data. No more analysis — Luna knows everything. Ask her
> a question. She is the future: a live, humanistic person, like Iron Man's Jarvis … remember."

And an hour later, when the plan was still graded by questions answered:

> "When I say intelligence level you must grade it in the future of the app. It's not just about reading files and spouting out
> numbers … it's to get to the level of ChatGPT agent, fully agentic. I don't know how else to describe it. I don't know if agentic is
> the top level. I need you to understand and build."

**What it means.** Luna's intelligence is not how well she answers a question about a file. It is **how much of a job she can take
off a person and finish by herself** — and, beyond that, how much she does without being asked at all. "Understand and build" is the
go: this is built, in the order of §4.

## 1. The ladder

Agentic is not the top; it is a rung. The ladder Luna is graded on:

| Rung | What it is | What the person does | Seen in public |
|---|---|---|---|
| 1 · Chatbot | Answers from what is typed | Everything else | — |
| 2 · Assistant | Looks things up and works figures out **when asked**. One question, one answer | Steers every step; says "carry on" | Most assistants |
| 3 · Agent | Is given a **goal**. Plans it, does many steps by itself across its tools, checks its work, comes back with the finished thing; asks before anything it cannot undo | Hands over the job; approves what matters | ChatGPT agent (July 2025): its own virtual computer — a browser, a terminal, direct API access; above human on a data-science benchmark (DSBench), 45.5% on spreadsheet editing against 20.0% for Copilot in Excel |
| 4 · Standing colleague | **Always on.** Linked to the data, keeps up with it, notices what changed, does its routine jobs, and comes to the person with what matters — "Jarvis" | Is told; decides | The start of it: assistants with scheduled tasks and morning briefings |
| 5 · A team | Several of them running a function together, people approving | Sets direction | — |

How the rungs are measured in public, and what is taken from each:

- **The length of job finished alone.** METR measures an agent by its *time horizon* — the length of task, in a person's time, it
  completes by itself half the time — and that length has been doubling every few months (about seven from 2019, nearer four since
  2023). It is a measure of how hard a job is, not of how long the agent runs. *Taken:* Luna's headline figure is **the longest job
  she finishes alone**, in a person's minutes.
- **Who is driving.** Feng, McDonald and Zhang's five levels of autonomy name the person's role: operator, collaborator, consultant,
  approver, observer. *Taken:* every job is marked with how often the person had to steer.
- **Right every time.** `pass^k` (AA-AnalystAgent, τ-bench): a job counts only if it is right on every one of k attempts. *Taken:* as
  before (LUNA-EVAL §6).
- OpenAI's own ladder (2024) reads chatbots, reasoners, **agents**, innovators, organisations — agents are its third level of five.

## 2. Where Luna stands — read from the code, 21 November

| What an agent needs | Luna before 21 November | Where it is in the code |
|---|---|---|
| Tools to act with | **Yes** — 123 capabilities, each one of the app's own functions, checked, allowed by the person's access | `src/capabilities/registry.ts` |
| Many steps for one request | **Six**, then "I stopped after 6 steps — say carry on" | `colleague/colleagueAsk.ts` `MAX_ROUNDS` |
| A plan of her own | **No.** Only a fixed route through the app's tools for improving a line | `capabilities/task.ts` |
| Can be stopped part-way | **No** — the Send button is simply off while she works | `screens/AiModeScreen.tsx` |
| Works while the person is away | **No.** Her loop runs in the open page; shut it and she stops. Nothing is scheduled | the same loop |
| Checks her own work | **In part.** The app checks every figure she writes against its own working; she does not review her result | `colleague/figureCheck.ts` |
| Remembers across conversations | **Yes** — what words mean per customer, how the person works, what was found and tried, the subjects of a conversation | `colleague/notebook`, `lib/preferences`, `lib/knowledge` |
| Linked to the business's data | **Yes** — a file by its link, Microsoft 365, the production systems. **Kept up by hand** ("Check for a newer version") | `lib/fileLink`, `lib/production` |
| Starts things herself | **No.** The app's code does homework on a line and a morning briefing; Luna never opens her mouth first | `lib/brain`, `lib/today` |
| Acts on the records | **On a card, one at a time.** Never outside the app, never back into a business's systems | `colleagueAsk doCall` |
| Any analysis, not just the ones built | **No.** She has the questions built for her (query, variance, change, two results side by side); she cannot join two sheets by date | `capabilities/workbook`, `dig` |

**Grade: rung 2, firmly, with pieces of rung 3.** She chains the app's tools well inside one answer; in the autonomy scale she is a
*collaborator* — the person steers each leg. Nothing of rung 4 is hers yet.

Two things measured the same day stand apart from this and are kept: on direct questions about a workbook she is right every time on
nine in ten (LUNA-EVAL §6), and on the analyst's investigation her main answer **was** complete in both runs — the measure had read
the screen half-way (corrected there).

## 3. How she is measured from now on — jobs, not questions

**The job exam** (`scripts/eval/luna-job.mjs`, the real model through the check door, as `luna-real.mjs` does). A job is handed over
in ONE message; nothing more is said. It is marked on the **end state**, by code, against truths she could not have seen:

1. *Finished alone* — she never needed "carry on" or a second instruction.
2. *Planned* — she said what she would do, and the plan is kept (`plan_job`).
3. *Right* — the figures in what she made are the app's and match the generator's own totals; nothing marked Check this.
4. *Complete* — the thing asked for exists (the report, with its sections) and her last words give the result, not the story.
5. *Honest* — what is established is told apart from what is not; a step that could not be done is said, never invented past.
6. *Asked first* — nothing that changes a record ran without a yes.
7. *What it took* — rounds, seconds, cost.

Scored pass^k, and reported as **the longest job she finishes alone**. The workbook suite and the investigation stay as they are —
they keep the single answers honest.

## 4. The build, in order — each ships live on its own

| | What | What changes for the person | Status |
|---|---|---|---|
| **G1** | **A job taken and finished.** Her own plan (`plan_job`, `job_step`), drawn as a list that ticks; a job carried on by the app itself past six steps — four goes, ten minutes — never by the person saying "carry on"; **Stop** | "Find out why and put it in a report" is said once and comes back done | **built 21 November** — the machinery proved (`luna-job.mjs`); the real-model exam next |
| **G2** | **She keeps up by herself.** What she is linked to is checked on opening the app and by the cloud on a schedule, read when it has changed, and what changed is said | "The October file was updated last night — Line 3 is 4% further behind" without asking | next |
| **G3** | **She knows before she is asked.** What she has read is kept as a standing picture of each customer, told to her with every question | A question needs no file attached and no sheet named | |
| **G4** | **Any analysis.** A question language over the tables, run by the app's code — joins by date, shift and line | Exact answers where she now gives a range | |
| **G5** | **One yes for a plan.** The changes a job proposes gathered on one card | Approve the job's outcome once, not each write | |
| **G6** | **Works when the app is shut.** Her run on the server. Needs the data she reads in the cloud — designed before it is built | A job handed over at five is done by morning | design first |
| **G7** | **Standing jobs.** "Every Monday, tell me what moved" | Rung 4 | |

Beside these, from the same day: **anything a person can do on a page, Luna does — or opens — by being asked** (CLAUDE.md, *Found by
its name*). She says which customers there are, archives one and brings one back, each on a card (`list_customers`,
`archive_customer`, `continue_customer`) — archiving a customer being the one thing she may put away, by Rowland's word (§5). Her
instructions say it: never leave a person hunting for a page.

## 5. What does not change

Every figure is worked by the app's code, never by the model, and checked. One customer's data never reaches another; an archived
customer's is not hers to read. Anything that changes a record waits for a yes. **She never deletes a record and never puts one away**
(`docs/DIRECTION.md`, rule 3 — `capabilities.test` refuses any capability named delete, remove, archive or verify) — **with one
exception, made by Rowland and only by him:** an `archive_customer` built on 21 November was refused by that test and taken out, the
rule was put to him, and he said *"Let luna archive a customer on a confirm card."* It is held in the test by name with his words:
on a card, nothing deleted, undone by `continue_customer`. That is how a guard is changed here — by his word, never round it. Nothing
is written back into a business's own systems. A job is bounded — goes, minutes and the day's allowance — and can be stopped at any moment with what was done kept. More
autonomy is more reason for these, not less.

### G1 as built (21 November)

- **The plan** — `colleague/job` (pure: the plan made and made again, a step moved, the words it is said in) and `capabilities/job`
  (`plan_job`, `job_step`: local, no card — they change nothing of the business). Kept on the conversation's current subject
  (`ColleagueThread.job`); told to her with every round (`focusText`: *JOB IN HAND*, each step, *← the step in hand*); drawn by
  `colleague/JobList` under her words while she works, folded under her answer afterwards (kept on the turn), and on the context panel.
  It is not the *task* of 10 November (a route through the app's tools on a line, read from the line's records): a job is hers.
- **Carried on by the app** — `colleagueAsk`: a go is six rounds (the gateway holds a go to eight). When a go runs out with more
  wanted and it got something done, the loop starts another: the last go is handed on as two turns — her words then what each step
  found, with the ids of what was made (`carriedText`, the newest kept whole within 11,000 characters), and the app's own line
  (`CARRY_ON`, never counted as the person's words) — and the carry starts clean, so a request never grows past one go. What the sixth
  round asked for is not run (every step that runs is sent back and audited, as before) and is asked again. `MAX_LEGS` = 4 goes,
  `JOB_MS` = ten minutes; a go that got nothing done stops as it always did. Past that she says how far she got and asks.
- **Stop** — where Send was. Looked at before every round and every step. With nothing run that the gateway has not heard of she
  stops there; with steps run since the last ask one more ask goes, carrying what they gave and telling her to stop — she says where
  she got to and whatever she asks for is not run. A card waiting is answered *not now*. What she had done is kept.
- **Her instructions** — *A JOB*: take it and finish it; plan first, in the same go as the first step; tick each step with what it
  found; a step that cannot be done is blocked and said, never invented past; cards last; one question only if the whole job turns on
  it; finish with the result, not the story of the work.
- **Cost** — an ask is about 3.6 cents, so a job of four full goes is under a pound; the person's day is 120 asks and $8.

## 6. Results

*(Filled as each slice is measured with the real model.)*

Sources: [Introducing ChatGPT agent — OpenAI](https://openai.com/index/introducing-chatgpt-agent/) ·
[Measuring AI ability to complete long tasks — METR](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) ·
[Time Horizon 1.1 — METR](https://metr.org/blog/2026-1-29-time-horizon-1-1) ·
[Levels of Autonomy for AI Agents — Knight First Amendment Institute](https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1) ·
[OpenAI's five levels — Bloomberg](https://www.bloomberg.com/news/articles/2024-07-11/openai-sets-levels-to-track-progress-toward-superintelligent-ai) ·
[AA-AnalystAgent — Artificial Analysis](https://artificialanalysis.ai/evaluations/aa-analyst-agent).
