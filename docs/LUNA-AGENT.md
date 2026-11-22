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
| **G2** | **She keeps up by herself.** What she is linked to is checked when her page comes into view, a workbook that has changed she reads herself, and what changed is said without being asked | "A file I read has changed — Shift report September · I have read the new version · 282 rows more … · Show me" at the top of her page | **G2a built 21 November** (she looks and says, on this device); **G2b built 21 November** (she reads the newer version herself and says WHAT changed — *G2b as built* below). **Not built:** the cloud noticing on a schedule while the app is shut, and telling the phone |
| **G3** | **She knows before she is asked.** What she has read is kept as a standing picture of each customer, told to her with every question | A question needs no file attached and no sheet named — and the headline needs no step at all | **G3a built 21 November:** with every question she is told, under each file of the customer in hand, what it SAYS — its headline, written in code from the snapshot its first look left (lead figure, latest months, the splits that stand out) — so a question the headline answers is answered with no step, on any device, the figures checked as the app's own (`luna-knows.mjs`, *G3a as built* below). **Not built:** the same for the line's own records and for documents; **not measured:** whether she does it unprompted (the real model) |
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
- **On a phone her plan stays in view.** What she makes part-way through a job — a chart, a result — used to open over the
  conversation there, covering the list the person is watching tick. While a job is open it is kept ready behind the header's button
  instead; at a desk it opens beside, as always. What the person asks to see opens as before.
- **Stop** — where Send was. Looked at before every round and every step. With nothing run that the gateway has not heard of she
  stops there; with steps run since the last ask one more ask goes, carrying what they gave and telling her to stop — she says where
  she got to and whatever she asks for is not run. A card waiting is answered *not now*. What she had done is kept.
- **Her instructions** — *A JOB*: take it and finish it; plan first, in the same go as the first step; tick each step with what it
  found; a step that cannot be done is blocked and said, never invented past; cards last; one question only if the whole job turns on
  it; finish with the result, not the story of the work.
- **Cost** — an ask is about 3.6 cents, so a job of four full goes is under a pound; the person's day is 120 asks and $8.

### G2a as built (21 November)

- **The look** — `colleague/keepUp` (pure: `linkedOf` the newest record of each link or Microsoft file in hand, `dueNow` those not
  looked at in four hours, longest first, four at most; `keepUp` asks again for each with what does the asking handed in). A link's
  file is fetched again and its fingerprint set against the one kept (`linkNewerThan`); a Microsoft file's version against the one
  kept (`newerThan`). Each look is noted on this device (`faultline.keepup`), so nothing is asked twice in four hours; a link that
  cannot be reached is noted all the same (tried again after the hours, not at every opening); one that only wants a Microsoft
  sign-in is left for next time. A link whose file is over 15 MB is never fetched unasked — it stays the person's to check.
- **When** — whenever Luna's own page comes into view, a moment after it has drawn, and whenever the app itself comes back into view
  (a phone unlocked on her page). Her page stays alive behind the others once opened, so this is a matter of the route, not of the
  page being made: the first build looked only once, when the page was first drawn, and the story caught it.
- **What is said** — `colleague/KeepUpNews`, above the conversation: *A file I read has changed*, its name, where it is from and when
  the version she holds was read, **Read it** and **Later**. Nothing while she looks; nothing when nothing changed. Read it reads the
  newer version exactly as an upload is read — the first look says what changed since the last, in code; the older version stays in
  the register. Later puts the note away for this visit.
- **Whose** — only the customer in hand's files (`colleague/filesInHand`, the reader the Files list uses): another customer's, and
  an archived customer's, are never fetched. No AI is asked for any of it.
- `keep-up.mjs` proves it with the cloud's `link` function played and every request counted.

### G2b as built (21 November) — she reads the changed file herself and says what changed

**What changed for the person.** Open Luna and, if a linked workbook has changed, her note already says what moved — *“Shift Report
September” · I have read the new version · Since …, read on 14 November: 282 rows more on “Shift report” (270 then, 552 now). New:
October −£29,741 …* — with **Show me** (writes it into the conversation as her turn) and **OK**. Nobody pressed Read it; and from that
moment what she is told of the file with every question (G3a) is the NEW version's headline with what changed under it. Before, she
said only THAT it had changed, and went on being told the old version until somebody pressed.

**How.**

- `colleague/keepUp` **readNews**: each changed file is fetched (a link's bytes are already in hand; a SharePoint or OneDrive file is
  downloaded when it is no bigger than 15 MB) and read by `colleague/readQuietly` — the same worker, register, kept file and first
  look as an upload, with no conversation touched. One she cannot read by herself (not a workbook, too big, the reading failed or was
  only partial) is left as it was: offered, **Read it · Later**.
- The register knows a linked file's readings (`lib/data/sources`): `originKey`, **earlierReadings** — every record of a link or
  Microsoft file that has a newer record of the same one. The newest speaks for the file: a name means it (`resolveSource` no longer
  asks between a file and its own earlier reading; a date said — "last week's" — still finds the reading of that time), and it alone
  is said with its headline; an earlier reading is one short line (`sourceSaid … { earlier }`).
- A newer version **keeps what the person gave the file** (`capabilities/data` registerFile): its name when they named it, what they
  said it is, its line or project, its customer.
- **What changed is kept on the record** (`capabilities/look` workLook: `look.since`, `look.comparedWith` — the first look's own
  "since the last", `lib/workbook/sinceLast`), so it is told to Luna with every question (`colleague/knows` filesKnown, *Changed since
  it was read before:*), survives a reload and reaches every device with the record.
- Her note of a file she read is kept on this device until it is acknowledged (`keepUp` readTold / writeTold), shown only while its
  customer is in hand (`colleague/KeepUpNews`).
- Her instructions: asked what is new, what changed or what was missed — or greeted when there is such news — she leads with it.

**What it keeps to.** No AI is asked (the story counts the requests: none). Nothing of the business's is changed; the version read
before stays in the register as it was read. Only the customer in hand's files, never an archived customer's.

**Proved** by `keepUp.test.ts` (12), `knows.test.ts` (8), `lib/data/__tests__/data.test.ts` (the register's readings) and
`keep-up.mjs` (33 checks: read by herself with the generator's own row counts, the new headline told, Show me, the note kept across a
reload, OK, left open, only the customer in hand, a 16 MB file still offered, the phone). **Not built:** the cloud's own look on a
schedule and the push to the phone (it needs the links read server-side — a design of its own, with G6).

### G3a as built (21 November) — what each file says, told with every question

**What changed for the person.** Ask about a file Luna has read — in any conversation, on any device — and the headline comes straight
back: no file attached, no sheet named, no step, one ask. Before, she was told only that the file existed and what sheets it held, and
had to ask the app for every figure (and could not on a device that never read the file).

**How.** Every first look already left a snapshot on the file's record (`lib/workbook/sinceLast` LookSnap — the lead figure brought
together, each month, the groups of up to four things it is split by), kept only to compare the same report next time. Now:

- `lib/workbook/standing` **snapSays** writes the file's headline from that snapshot, in one line: the lead figure as the look brought
  it together (*comes to* for a sum, *averages* for a rate or a reading, the rows for a register), the latest six months (a part month
  said as part, earlier ones counted), and up to three splits — **the one whose groups sit furthest apart first**, as the first look
  ranks what stands out. A split wider than twelve groups is no headline and is left to be asked for; the line is never over 620
  characters (splits go first, then the earlier months). Figures are written by the first look's own `figure`, so a number is never
  written two ways. The snapshot keeps the figure's kind and how it is brought together since today (`kind`, `agg`); one taken before
  says its numbers as they stand, *overall* — never as a total it may not be.
- `colleague/knows` **filesKnown** puts it under the file's line in the turn's context (`turnRules` conversationFocus): the newest six
  files that have one; an older version of the same link or Microsoft file is listed but not said twice.
- The context's heading and her instructions say how it is used: answer a question the headline answers from it at once, naming the
  file and quoting its figures as written; never extend it (a month it does not list is not zero); anything finer by `query_data`.
- **Nothing new is trusted:** every figure is one the app's code worked when the file was read, and the turn's context is among what
  the figure check reads — so a headline figure she quotes is checked and passes, and one she makes up beside it is marked.
- **Whose it is holds without a new rule:** the files are `sourcesInHand()` — the customer in hand's, never an archived customer's.
- **On a device that never read the file** the record (and so the headline) is there though the cells are not: she still knows what
  it says, and asked for its rows the app says in words they are not here.

**Proved** by `lib/workbook/__tests__/standing.test.ts` (12, every line written by hand), `colleague/__tests__/knows.test.ts` (7) and
`luna-knows.mjs` steps 3b–5 (the generator's own totals; no step and one ask; a made-up figure marked; another customer told nothing;
cells and kept file gone, the headline still told). **Costs:** up to about 800 tokens a turn with six files — measured with the real
model when the allowance is back (§6). **Not built:** the headline of a document (a manual: what was read in it), of a table read as
evidence, and of the line's own records — the brain's findings already exist and are read by a step (`findings`); telling their first
lines the same way is the next piece of G3.

## 5a. The audit of 21 November — where her intelligence is held back, read from the code

Rowland, 21 November: *"I need you to make Luna as intelligent as possible."* Four engineers read her end to end that evening — her
loop and gateway, her instructions, her tools, what she can work out from data — and each returned what limits her, with the line of
code (48 limits; the readers of her memory and of her exams, the research of the current API and the adversarial check of each
proposal were cut off by the account's usage limit and are run next). The findings are kept whole in the session's record; the ones
that matter most, in the order they are being built:

| | What limits her | Where | What is done about it |
|---|---|---|---|
| 1 | **She never checks her own answer** — the app's check found the figure with nothing behind it, and told only the person. The one repeated real-model failure (LUNA-EVAL §6) is exactly this | `colleagueAsk` — the first reply without calls was final | **Built: the second look** (below) |
| 2 | **A share of only the groups a cut result shows passed as checked** — a wrong percentage vouched for; and a cut result did not say it was cut | `figureCheck` heldIn, `capabilities/data` resultSaid | **Built** (below) |
| 3 | **Effort is pinned at low for every kind of turn**, and 4,000 output tokens hold her thinking, her words and her steps — running out fails the turn | the gateway, `ASSIST_COLLEAGUE_EFFORT`, `max_tokens: 4000` | To build behind a switch and measure with the real model before it is switched on |
| 4 | **One request in six is thrown away** (the last round of a go's steps are not run), the hand-over between goes is thin, and she is not told her budget | `colleagueAsk` | **The last round is run — built 22 November** (below); the hand-over and the budget next |
| 5 | **Chatty tools**: one sum a call, one report section a call, one tick a call — a find-out-why-and-report job takes eight to ten rounds where four would do | `schemas.ts`: work_out, build_report, job_step | Next |
| 6 | **No join on more than one key or by time, and no arithmetic on what has been added up** (a rate by line, a share of the true total, change on the period before) — the measured cause of "87–96%" where one figure was wanted | `lib/workbook/query`, `lib/data/table` | G4 — next, with its own specification |
| 7 | **Her instructions are a routing table, not a way of working**: 110 capabilities named, four rival planners, twelve different rules on when to ask, the core rules restated in wordings that disagree | `colleagueAssist.ts` | A second version written as a way of working, held beside the first and A/B'd on the real model — never swapped in blind |
| 8 | **Reads are held to the customer in hand by her instructions, not by the tools** (except the files, resolve, factory_map and recall) | `capabilities/reads`, `find` | Next — rule 3 belongs in the code |
| 9 | **read_record reads one sentence, not the record**; most writes do not say what they made | `connectors`, `operate` | After those |
| 10 | **The focus changes every round and sits ahead of the rounds**, so earlier rounds are paid for again each round | the gateway's message order | With 3 — it needs the real model to prove |

### The second look as built (21 November)

**What changed for the person.** An answer that held a figure the app never worked — or that left a step of her own plan open — used
to reach them as it was, with *Check this* beside the figure. Now the app sends it back to her first, once, and what they read is
the answer she gave after being told. Nothing else changes: an answer whose figures all trace is final at once, with no extra ask.

**How.** `colleagueAsk` colleagueLoop: when a reply asks for no more steps, the figure check runs as before; if it finds figures
found nowhere — or the screen says the plan she worked in this answer still has steps open (`colleague/job` stepsOpenSaid, only
when `plan_job` or `job_step` ran in this answer, and never when her answer ends by asking the person something) — her answer and
what its steps found are handed on as the conversation's own record and a line FROM THE APP names the figures and the open steps
(`lookAgain`). She may run steps (a sum by `work_out`, a count by a question of the data); what she says next takes the place of the
first answer. **One look an answer**; never in the voice conversation (her words are already said aloud), never once the person has
stopped her or her time is up. The turn records that it was checked (`LOOK_AGAIN`, *Checked her answer*) with none of the figures in
it, and that record lends nothing to a later figure check. It costs one more ask only when the check finds something.

**And the check itself is truer.** A result that shows fewer groups than it has lends no share of the groups it shows — its shares
are taken against its own true total, and only for a figure added up or counted; a result cut by the question's own limit says so
(*… 1 more group not shown. Totals (of all 3 groups): …*); a number written with its thousands marked is never passed over as a year.

**Proved** by `colleagueAsk.test.ts` (8 new), `figureCheck.test.ts` (6 new), `job.test.ts` and `luna-second-look.mjs` (17 checks, the
gateway played and every request counted). **Not measured:** what the real model does with the line from the app — the job exam and
the workbook suite, when the allowance is back.

### 5b. The review of 22 November — the day's work read against itself, and what was put right

The same night three reviewers read the day's changes to Luna as an opponent would — for correctness, for Rowland's rules, for what a
real customer's data would do to them — and a second engineer tried to refute each finding before it counted. **Four were confirmed
real, with the line of code; none was refuted; six more of the same faults were reported from the other angle.** Three of the four
were already live (G3a and G2b had gone to `main` that evening); the fourth was caught before the second look was released. All are
fixed, each with a test that failed before the fix:

| | What was wrong | What a person would have seen | What is done |
|---|---|---|---|
| 1 | **The second look took her finished answer off the turn before the replacement existed.** Stopped, refused by the allowance, out of signal or out of steps part-way through the re-check, the first answer was gone | Only *Stopped, as you asked*, or a failed turn with *Ask again* — while the turn's record said it was the answer she gave after the check | `colleagueAsk`: the first answer is HELD while a look is under way and **stands on every exit that is not her own second answer** — marked as it would have been, never a failed turn, its record saying *the check was not finished*. An empty second answer is treated the same |
| 2 | **A file's headline total left out rows with no date, and was said "over" every row.** The snapshot's total was the months added up; a monthly question drops rows whose date is not a date | *"Minutes comes to 12,000 over 1,000 rows"* where the file's own first look said 12,600 — two totals for one file, the smaller one passed as the app's | `firstLook`: the snapshot's total is ONE question over every row read, kept with the rows it is over (`over`) and how many have no date (`undated`); `standing` says *by month (40 rows with no date are in no month)*; an older snapshot never says a figure over rows it may not be over |
| 3 | **"Changed since it was read before" was compared with whichever same-shaped report of the customer was read last** — not the earlier reading of that file — was kept on every look (plain uploads too), and never went stale | Line 1's weekly file said to have "changed" against Line 2's; April's upload said to have changed since March's, at every greeting, for weeks | `capabilities/look` readingBefore: a newer version is compared with **the reading before it of the same linked file** and nothing else; only that is kept as a change; it is told with the day it came in, for a week (`KNOWS.newsDays`), and marked *the person has not been shown this yet* only while her note of it is still up — her one cue to say it unasked |
| 4 | **Each earlier reading of a linked file took one of the twelve places she is told**, and `list_sources`, `resolve_source` and the Files list showed each version as a file | A daily report read for twelve days pushed every other file of the customer out of what she knows; *"13 files in the register"* of one name | `lib/data/sources` newestFiles: **files are counted, never readings** — in her context (twelve files, each with the one reading before it), `list_sources`, `resolve_source` and the Files list (*2 earlier versions kept* on the row) |

And three reported once, checked against the code and found true:

- **What she is told each turn could outgrow the 12,000 characters the gateway takes**, which then cut its end without a word — the
  results, photo keys and drafts of the conversation in hand, and the Stop note. `conversation` focusText: the files come **last**
  and are fitted on the device (`FOCUS_MAX`, `filesBlock`) — a file whole, else without what changed, else its line alone, the rest
  counted; a test holds the device's limit, the Stop note and the gateway's limit together.
- **A newer version was not matched to its file when the earlier record named no customer** (a link connected on a line, or before
  files carried one): its name and what it was said to be were lost, and a file that was no one's became the customer in hand's.
  `registerFile`: the version before is found by whose the file IS by rule (`customerOfSource`) or handed in by the reader
  (`versionOf`, from `keepUp`); the newer version is written and placed exactly as its file is.
- **"The top 10 reasons" was a figure to check**, and since the second look would have sent a right answer back to be written again.
  `figureCheck`: how many she chose to list is not a figure of the data.

**Left as it is, and why.** The look's ask hands on what her steps *said* (900 characters each), not their full results — a figure
that sat deeper in a result has to be asked for again. Keeping the results in front of her means the gateway carrying the whole
exchange into the look (one more field), and is worth doing only with the real model to show what it buys; it is on the build list
with the engine settings. The look still counts as a go of its own.

**The last round of a go is run (22 November).** A go's sixth round used to be asked for and thrown away — its steps not run, the
same request made again by the next go. When another go can follow (goes left, time left, not stopped) those steps now run and are
handed on with the rest; only when no go can follow are they left unrun, so nothing she asked for is done that she is not told of.
`colleagueAsk.test.ts`, `luna-job.mjs`.

**Proved** by 36 loop tests (8 on the look that does not come back), `standing.test.ts` (14), `shapes.test.ts` (a 29th generated
workbook — one row in ten with no date — held to its own totals), `model.test.ts` (the rows read under a basis), `look.test.ts` (two
links on one template; two uploads), `data.test.ts` (thirteen readings of one link; a version matched by rule; no one's stays no
one's), `knows.test.ts` and `conversation.test.ts` (the fit), and the stories `luna-second-look.mjs` (steps 7–8), `keep-up.mjs` and
`luna-knows.mjs`. **What this review did not do:** it read the code and the played stories; nothing here was measured with the real
model, and the readers of her memory and her exams, and the design of her engine settings, were again cut off by the account's usage
limit.

## 6. Results

### 21 November, 18:17 — G1, the first job handed to the real model: CUT OFF BY THE ALLOWANCE, not a result

The job, said once: *"Here's October's production workbook. We missed plan — find out why and put it in a short report for the
operations director. I'm going into a meeting now, so just get it done."* (assist v56, `claude-opus-5-5`, effort low.)

| Ask | What she asked the app for | Seconds |
|---|---|---|
| 1 | `plan_job` and, in the same go, `workbook_profile` | 6 |
| 2 | `job_step` (step 1 done) and `explain_variance` | 5 |
| 3 | `job_step` (step 2 done) and two `query_workbook` — the downtime log and the money | 6.3 |
| 4 | **refused by the gateway before the model was asked — the day's check allowance ($3) was spent** | 1.1 |

Her plan, as she wrote it: *1. Map the workbook and its connections · 2. Find where the variance against plan sits · 3. Look for the
why in the Downtime log for the same lines and shifts · 4. Price the shortfall with the Products rates if they hold money · 5. Chart
the main findings · 6. Build the short report for the operations director.* Steps 1 and 2 were ticked done with what they found —
*"Production log + Downtime log joined by Line; Products master holds rate and £ contribution per pack"* and *"−476,416 packs
(−7.93%); Line 3 −266,568 (56%), mostly Nights −167,818"* — both right by the workbook's own totals.

**What this shows:** she takes a job as her instructions ask — a plan of her own in the first ask, work started in the same go, each
step ticked with its finding, no question back, three asks in 22 seconds. **What it does not show:** whether she finishes. That is
still unmeasured.

**Two lessons, both about the measure and the money, neither about Luna:**
- *The run was first read — and reported to Rowland — as "she stopped part-way with an empty message".* It was not: the service's own
  record (`assist_usage`) has three rows for the run, not four. The exam script knew the allowance's sentence by asks ("the allowance
  comes back") and not its sentence by dollars ("allowance for AI Mode is spent"). Both exam scripts know both now, and a run cut off
  by the allowance says **STOPPED — NOT A RESULT** and is not marked. The second false alarm of the day from a measuring script; the
  rule stands and is sharper: *before a script's verdict on Luna is believed, the service's own record is read.*
- *The first ask after a deploy cost $0.56* — her instructions and the 123 tool descriptions (about 69,000 tokens) are read in full
  once before they are kept; a warm ask is 3 to 5 cents. So a deploy that changes her instructions spends a fifth of the day's $3
  check allowance before a question is asked, and **a person's first question after an hour's silence costs the same**. The switch
  that sends a quarter of that (`ASSIST_COLLEAGUE_TOOLS=search`, LUNA-EVAL §3 — measured ready, never switched on) is now the first
  thing to settle before G6 and G7, where she works unasked: an always-on colleague cannot cost 56 cents to wake.

To run again when the allowance has come back (after about 15:45 UTC on 22 November): `scripts/eval/luna-job.mjs`, then the
investigation (`luna-demo.mjs`) with its corrected measure — neither has a clean real-model result yet.

Sources: [Introducing ChatGPT agent — OpenAI](https://openai.com/index/introducing-chatgpt-agent/) ·
[Measuring AI ability to complete long tasks — METR](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) ·
[Time Horizon 1.1 — METR](https://metr.org/blog/2026-1-29-time-horizon-1-1) ·
[Levels of Autonomy for AI Agents — Knight First Amendment Institute](https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1) ·
[OpenAI's five levels — Bloomberg](https://www.bloomberg.com/news/articles/2024-07-11/openai-sets-levels-to-track-progress-toward-superintelligent-ai) ·
[AA-AnalystAgent — Artificial Analysis](https://artificialanalysis.ai/evaluations/aa-analyst-agent).
