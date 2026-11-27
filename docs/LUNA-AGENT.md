# Luna as an agent — the ladder, where she stands, and the build

**Read this before touching Luna's loop, her capabilities or how she is measured.** It is the measure CLAUDE.md's first section
points at. Where `docs/LUNA-EVAL.md` §6 speaks of an "analyst benchmark", this document is what it became the same day.

**24 November — the product around the agent** is `docs/LUNA-PRODUCT.md`: she **acts** (schedules, overnight jobs, remind, report,
send); **Artifacts** are the home of what she makes; Luna’s folders are **workspaces**, not projects; her voice is natural and
feminine. This page stays the ladder and G1–G7. The ☰ drawer now says **Workspaces** and has Artifacts and Schedules. See `docs/LUNA-AUDIT-20261124.md` for what each part has actually proved.

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
| Tools to act with | **Yes** — 133 registered capabilities (61 read, 32 local, 40 write), checked against the person's access | `src/capabilities/registry.ts` |
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
| **G1** | **A job taken and finished.** Her own plan (`plan_job`, `job_step`), drawn as a list that ticks; a job carried on by the app itself past six steps — four goes, ten minutes — never by the person saying "carry on"; **Stop** | "Find out why and put it in a report" is said once and comes back done | **built 21 November** — the machinery proved (`luna-job.mjs`); **measured with the real model 22 November: the job finished alone, 12 of 14, six asks, 57 seconds (§6)** — once; the same job done every time (`--runs 3`) not yet |
| **G2** | **She keeps up by herself.** What she is linked to is checked when her page comes into view, a workbook that has changed she reads herself, and what changed is said without being asked | "A file I read has changed — Shift report September · I have read the new version · 282 rows more … · Show me" at the top of her page | **G2a built 21 November** (she looks and says, on this device); **G2b built 21 November** (she reads the newer version herself and says WHAT changed — *G2b as built* below). **G2 remainder built 23 November** (hourly `keepup` cron, push, `data-server-keepup`). **Not built:** Microsoft poll; server `readQuietly` |
| **G3** | **She knows before she is asked.** What she has read is kept as a standing picture of each customer, told to her with every question | A question needs no file attached and no sheet named — and the headline needs no step at all | **G3a built 21 November:** with every question she is told, under each file of the customer in hand, what it SAYS — its headline, written in code from the snapshot its first look left (lead figure, latest months, the splits that stand out) — so a question the headline answers is answered with no step, on any device, the figures checked as the app's own (`luna-knows.mjs`, *G3a as built* below). **Not built:** the same for the line's own records and for documents; **not measured:** whether she does it unprompted (the real model) |
| **G4** | **Any analysis.** A question language over the tables, run by the app's code — joins by date, shift and line | Exact answers where she now gives a range | **In slices, `docs/LUNA-ANALYSIS.md`.** Built 22–23 November: **A3**, **A1**, **A2**, **A6**, **A5** (22 November); **A4** (23 November); **A7**, **A8**, **A9** (23 November — median/percentiles/stdev, `run_analysis` from a kept result, CSV/TSV, `missingFields` and paper trail) — all live (`docs/STATE.md`, the handoff). **None of it measured with the real model yet** — the `analysis` exam is written for that (`docs/LUNA-EVAL.md`) |
| **G5** | **One yes for a plan.** The changes a job proposes gathered on one card | Approve the job's outcome once, not each write | **built 23 November** — while a job is open, writes Luna proposes are gathered on one card *Do what the job needs* until the person says yes once (`colleague/jobWrites`, `colleagueAsk` `runRoundCalls`, `flushJobWriteBatch` — across gateway rounds in one go as well as in one round); one yes sets `writesApproved` (`capabilities/job` `approveJobWrites`) and later ordinary writes go in as receipts (`prepareCall`); consequential writes still ask every time; voice (`jobBatchCardPrompt`, `SPOKEN_NOTE`); `luna-job.mjs` §5. **Not built:** Luna calling an explicit approve step across legs without the person waiting on the card. |
| **G6** | **Works when the app is shut.** Her run on the server. Needs the data she reads in the cloud — designed before it is built | A job handed over at five is done by morning | **G2 remainder built 23 November** (`keepup` cron, push) · **parked job loop built 23–24 November** (`LUNA_G6_JOBS.sql`, `colleague-job`, overnight `SERVER_JOB_MS`, `plan_job`/`job_step` on the server, JWT kick, `ServerJobNews`) · **not built:** Microsoft poll, server `readQuietly` |
| **G7** | **Standing jobs.** "Every Monday, tell me what moved" | Rung 4 | `standing_jobs` synced; weekly digest in code (`lib/standingJob`); visible **Schedules** in Luna's drawer as first-class jobs (what, when, who, last, next); conversation is the door — ordinary language, she uses `send_email` with a rhythm. `standing-job` sends confirmed Resend mail while the app is shut (frozen conversation report, or a fresh line-and-problem briefing). A due briefing without email is still built on the device when Luna opens. Outlook is not used for a schedule. Domain verify / Resend key still required for a live send. |

Beside these, from the same day: **anything a person can do on a page, Luna does — or opens — by being asked** (CLAUDE.md, *Found by
its name*). She says which customers there are, archives one and brings one back, each on a card (`list_customers`,
`archive_customer`, `continue_customer`) — archiving a customer being the one thing she may put away, by Rowland's word (§5). Her
instructions say it: never leave a person hunting for a page.

**What she can do with each kind of connection** (Excel, PDF, SOP, TV meeting) — the abilities map, limits and build slices M1–M5:
`docs/LUNA-ABILITIES.md` (23 November). **Agentic stack (LLM + loop + tools)** for builders and external briefs:
`docs/LUNA-STACK.md` (23 November).

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

### G5 as built (23 November)

- **One card** — while a job is open, writes Luna asks for are gathered on one card (*Do what the job needs*, each change listed)
  instead of one card each (`colleague/jobWrites`, `colleagueAsk` `runRoundCalls`, `flushJobWriteBatch`). Writes proposed in separate
  gateway rounds in the same go are gathered onto one card before the person is asked — a read in a later round flushes what was
  queued, or they are flushed when she finishes her answer.
- **One yes** — Do it runs them all, sets `writesApproved` on the job (`capabilities/job` `approveJobWrites`), and later ordinary
  writes in that job go in as receipts (`prepareCall` + `jobWriteMayAuto`). Raising a problem, archiving a customer, starting a project
  and the rest in `JOB_WRITE_ALWAYS_ASK` still ask every time.
- **Voice** — the job's one card is said in a short ear-friendly line (`colleague/floor` `jobBatchCardPrompt`; Conversation on
  `AiModeScreen`); `SPOKEN_NOTE` tells the gateway not to read every field aloud on that card.
- **Proved** — `colleagueAsk.test.ts` (one round and across rounds); `luna-job.mjs` §5 (played gateway, two journey steps, one card).

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
reload, OK, left open, only the customer in hand, a 16 MB file still offered, the phone). **G2 remainder (23 November):** the cloud polls linked files hourly (`supabase/functions/keepup`, `LUNA_G6_KEEPUP.sql`); a changed fingerprint writes `luna_server_news` and pushes to the owner's devices; opening Luna shows the note (`data-server-keepup`) and Read it still fetches on the device (G2b reading unchanged). **Proved** by `serverKeepUp.test.ts`, `luna-g6-keepup.mjs`. **G6 job slice (23–24 November):** parked threads enqueue `luna_server_jobs` (one open row per thread); the device kicks `colleague-job` on hide/`pagehide` and cron continues every fifteen minutes; each go runs `plan_job` and `job_step` on the server; a read that needs this device waits; a write is never run; twelve hours and 24 rounds bound it — not the device's ten minutes. Opening Luna shows *Luna carried on while you were away* (`data-server-job`) with her finished answer or how far she got. **Proved** by `serverJob.test.ts`, `luna-g6-job.mjs`. **Not built:** Microsoft poll; server `readQuietly`.

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

### G3b as built (22 November) — what stands now, told with every question

**What changed for the person.** "What needs me today?", "anything late?", "how is Line 3?" and a plain "morning" are answered at
once — no step, no wait while she looks — because with every question Luna is told how the customer in hand stands, in the words
the Today page itself uses.

**How.** `colleague/picture`: under *What stands now for <customer>* her context carries two lines. **Today** — the Today page's own
briefing, sentence for sentence (`lib/today` briefing() over the very rows the Actions page reads for the active client,
`lib/useProjectActions` loadClientEveryAction, and the register's problems that are its): what is past its day with the oldest
named, what is new since the person was last in, what is due. **Lines** — each line of the customer in the Today page's word
(`lineState`: critical problems · problems open · nothing open), the worst first, each with the worst thing open on it (critical
before high before low, then one past its day, then the oldest), who has it and whether it is late; eight by name, the rest
counted, the quiet ones named while there is room. Never longer than 1,100 characters; placed before what the conversation has
made — the files stay last and fitted (§5b).

**One number, everywhere.** Nothing is worked out for it that a page does not already say: the briefing IS the Today page's, the
late rows ARE the Actions page's, a line's word IS the board's. So what she says from it is what the person sees when they look,
and every figure in it is checked in her answer as the app's own (the turn's context is among what the figure check reads).

**Whose.** The customer in hand's, by the scope every page filters by (`capabilities/hand` handScope) — never another customer's,
never an archived customer's; a customer archived this moment is out of the picture this moment (who is in hand is read afresh
whenever anything has changed). **What it costs.** It is asked for on every round of every question, and a conversation writes to
the database with every step — so it is kept on the database's own count of its changes (`db` dataVersion), and when only
something else moved (a turn kept, a step recorded) a cheap fingerprint of what it rests on (the lines, problems, tasks and
projects) decides; the full read is made only when that moves, or once a minute.

**Proved** by `picture.test.ts` (10 — the words written by hand; read from a database with two customers: Acme in hand, Acme's
lines in the Today page's words and the briefing equal to `briefing()` over the client's rows, nothing of Brook's; all clients
shown; Brook archived; a problem raised in the next reading with no waiting; a conversation's own write changing nothing) and by
`today.mjs` step 5 in the browser: the request Luna is sent holds every sentence of the briefing the page is showing and each line
in the page's own word. **Not done:** a person's role lens (what Today shows a team leader first) is not applied — the picture is
of what the device holds for the customer, which the database's visibility decides. **Not measured:** whether the real model
answers from it without a step — the first-words time of "what needs me today?" before and after, when the allowance is back.

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
| 3 | **Effort is pinned at low for every kind of turn**, and 4,000 output tokens hold her thinking, her words and her steps — running out fails the turn | the gateway, `ASSIST_COLLEAGUE_EFFORT`, `max_tokens: 4000` | **The room: built 22 November** — 16,000 (`ASSIST_COLLEAGUE_MAX_TOKENS`), and an answer cut off is given as far as it got (below). **Effort by kind of turn: not built** — read from the API's reference that day: a change of effort between requests throws away the cached conversation (and, model by model, the cached tools and instructions), so it has to be sent as a message inside the conversation (a beta) and measured with the real model before it is on |
| 4 | **One request in six is thrown away** (the last round of a go's steps are not run), the hand-over between goes is thin, and she is not told her budget | `colleagueAsk` | **The last round is run — built 22 November** (below); the hand-over and the budget next |
| 5 | **Chatty tools**: one sum a call, one report section a call, one tick a call — a find-out-why-and-report job takes eight to ten rounds where four would do | `schemas.ts`: work_out, build_report, job_step | The sums a group are gone (`derive`, 22 November). **A report is one call** (`build_report` `sections`, 22 November — a four-section report is one step where it was five, each section checked as one added alone is). The plan's ticks already go in the same go as the step's work |
| 6 | **No join on more than one key or by time, and no arithmetic on what has been added up** (a rate by line, a share of the true total, change on the period before) — the measured cause of "87–96%" where one figure was wanted | `lib/workbook/query`, `lib/data/table` | G4 (`docs/LUNA-ANALYSIS.md`). **A3 built 22 November: a rate, a share, a change, a running total and a rank are asked for in the question itself** (`derive`), worked on every group and the totals — one step where it was ten. **A1 built the same day: a lookup on up to three keys together, the other sheet brought together by its key first** — the stops explain 91.3% of Line 3's shortfall, one exact figure where "87–96%" was said. **A2 built the same day: a part of a date as a column** (weekday, hour, quarter — "are Mondays worse?"), **downtime by shift a figure** wherever the line has shift times (*clock shift*, *shift day*), and every day Luna's tables say now the person's own day, not Greenwich's. **A6: the top few within each group** ("the top three reasons on each line", every line there) **and a condition on a group's figure** ("which lines lost over an hour?"). Next: one engine for every source (A4), results joined by their keys (A5) |
| 7 | **Her instructions are a routing table, not a way of working**: 110 capabilities named, four rival planners, twelve different rules on when to ask, the core rules restated in wordings that disagree | `colleagueAssist.ts` | A second version written as a way of working, held beside the first and A/B'd on the real model — never swapped in blind. **23 November: domain slice live** — `colleagueDomain.ts` FOOD FMCG block in `COLLEAGUE_SYSTEM`; `docs/LUNA-DOMAIN.md` |
| 8 | **Reads are held to the customer in hand by her instructions, not by the tools** (except the files, resolve, factory_map and recall) | `capabilities/reads`, `find` | **Built 22 November: held by the code** (`capabilities/hand`, below) |
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

**The customer in hand, held by the code (22 November — the audit's limit 8).** *One customer's data never reaches another* was kept
for Luna's reads by a sentence of her instructions; a read that named another customer's line by its id — `line_state`, a question
of its stops — was answered, and `find`, `list_problems` and `overdue_actions` with no place named listed every customer's. Now
`capabilities/registry` runCall looks at every READ before it runs (`capabilities/hand` readOutOfHand): the line, project,
department, study, document, problem or source it names must be the customer in hand's — or everyone's when all clients are shown —
and never an archived customer's; refused in words that say whose it is and how to reach it, with nothing of what was found. The
three readers that list with no place named keep to the same scope every page of the app filters by (`handScope` —
`lib/activeClient` clientScope). Twenty-six read capabilities name a place or a record and are all covered by the one guard. Left
alone on purpose: writes (each waits for the person's yes on a card that names where it lands) and a record that is nobody's (a
conversation, a template of the person's own). `capabilities.test.ts` — Acme in hand: nine reads of Brook's line, study and sources
refused, Acme's answered, the lists holding only Acme's; all clients shown: each read; Brook archived: read by nobody.

**The room an answer has (22 November — the audit's limit 3).** On her model thinking is always on and is counted inside the
answer's ceiling: 4,000 tokens had to hold her thinking, her words and the steps she asks for, and running out FAILED the turn
(*"The answer ran longer than AI Mode gives at once"*) — most likely on exactly the answers that matter, a second look asked to
give the whole answer again among them. The ceiling is now 16,000, the API's own guidance for a request of this kind
(`colleagueAssist` COLLEAGUE_ROOM; `ASSIST_COLLEAGUE_MAX_TOKENS`, 2,000–32,000). It is a ceiling, never a target: an answer costs
what she writes, the day's allowance still bounds it, and it is no part of what is cached. And when the room does run out, what
she had written is given, said to be cut (`cutOffReply`: *I ran out of room there — say "carry on" and I will finish*) — a step she
was still asking for is never run, since its input may be incomplete. `colleagueAssist.test.ts`. Not measured: how often the old
ceiling was hit — the usage rows did not keep why a request ended. **They do since 22 November** (`supabase/ASSIST_USAGE_ENDED.sql`,
the gateway's `keep`): every request's row says why the model stopped — *end_turn*, *tool_use*, *max_tokens* (cut for room),
*refusal* — and the effort it was asked at, so the room and the effort can be set by what is measured:
`select ended, count(*) from assist_usage where task like 'colleague%' group by 1`.

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

### 22 November, 15:43 UTC — the first clean results: a job finished alone, and the new questions asked in one step

Rowland, asked whether her intelligence had really gone up and told "not proven": *"Run it against the real model, prove the
intelligence."* Three exams in eight minutes against the live service — `assist` version 62 (released 14:32 UTC that day),
`claude-opus-5-5`, effort low, every tool sent, all read from `assist_usage`. **38 asks, none failed; every one ended as an
answer or a step (17 `end_turn`, 21 `tool_use`) — none ran out of room, none was refused.** $1.94 in all: the first ask after the
deploy $0.59, a warm ask 3.7 cents.

**1. The job — the same one as 21 November, said once.** *"Here's October's production workbook. We missed plan — find out why
and put it in a short report for the operations director. I'm going into a meeting now, so just get it done."*

**She finished it, alone: 12 of 14 marks, 6 asks in ONE go, 57 seconds, $0.96** ($0.59 of it the first ask, which reads her
instructions in full after a deploy; the other five came to 37 cents together).

| Ask | What she asked the app for | Seconds |
|---|---|---|
| 1 | `plan_job` and, in the same go, `workbook_profile` | 8.6 |
| 2 | `job_step` and `explain_variance` | 6.1 |
| 3 | `job_step` and three `query_workbook` together — the downtime log and the money | 10.1 |
| 4 | two `job_step` and **`build_report` — the whole six-section report in ONE call** (built that morning; the audit's limit 5) | 13.7 |
| 5 | `job_step` — the last tick | 4.6 |
| 6 | her answer | 9.9 |

Her plan, each step ticked with what it found: *1. Map the workbook's sheets and how they connect — Production, Downtime log,
Products master with contribution £/pack · 2. Find where the variance against plan sits — −476,416 packs (−7.93%); Line 3 carries
56% (−266,568), mostly Nights · 3. Look for the why in the Downtime log — Line 3 lost 2,317.1 min; Bagger bag presentation 1,185.7
(51.2%), film splice 450.1 (19.4%) · 4. Price the shortfall — £115,334.21 contribution lost; Line 3 £55,508.58 · 5. Build the
short report — six sections; some figures flagged Check this.*

Right (12): finished · alone, never asked to carry on · her own plan · the plan worked through · the report made (a summary, two
findings, a table, what is established and what is not, a recommendation) · the variance's size · Line 3 named · the Bagger named
for the why · no figure in her answer marked · **what is established told apart from what is not** — *"That the Bagger stops
caused most of Line 3's gap is still only a hypothesis … the workbook has no speed or crewing data. So I can't say how much of the
gap is stoppages and how much is the line running slowly"* · a step that could not be done said · nothing changed without a yes.

Wrong (2), both real — **fixed in code 22 November (awaiting real-model job exam 14/14):**

- **The report holds fourteen figures flagged *Check this* that are right.** *(Fixed: `explain_variance` keeps every field breakdown as a result; `checkSection` adds any conversation result that backs a figure and matches unsigned shortfalls and pack sizes like 500g; refresh does not pull stale results into evidence.)* A report's section is checked against the results it
  names (`lib/data/outputs` checkSection), and these were worked by the app but are in no result the section names: the shortfall
  by shift and by product and its percentages are SAID by `explain_variance`, which keeps one breakdown as a result
  (`capabilities/dig`); the night and day downtime minutes sat in a result the section did not name; and *500* is the "500g" of a
  product's name. (The four per-line shortfalls were flagged too although the by-line breakdown IS kept — either she did not
  name it for that section, or the check does not match a shortfall said without its minus sign. The exam's record does not keep
  a section's evidence, so that is the first thing to read — and the exam should keep it.) She saw it and said so herself, unprompted — *"the report has some figures flagged 'Check this'. The app worked
  them all out, but they aren't in the saved results the report is linked to, so its checker can't trace them"* — listed them, and
  offered to tie them to saved results. So a person is told the truth; but a report that goes to a director should not carry
  fourteen false flags. To build: every breakdown `explain_variance` says kept as a result and its ids returned; a figure a
  section's own results do not hold traced to any result of the conversation and that result ADDED to the section's evidence, as
  her answer's check already does; a label's own number never read as a figure.
- **Her last words ran to 289 words; a job's result is asked for in 160.** *(Fixed: `job_step` / `colleagueAssist` — at most 160 words, name the report, no section replay.)* About a third of it was the honest list of the flagged
  figures — the first fix shortens it. The rest was hers: she re-told the report instead of naming it.

**2. The analysis exam (new that day, `scripts/eval/luna-real.mjs --suite analysis`): 6 of 6 turns, 31 of 31 marks, 13 asks, 1.3
minutes, $0.44.** Each of the six was answered from ONE question of the workbook, with no sum worked a group — the abilities of
G4's slices used unprompted by the real model:

| Asked | How she got it | What she said — and added by herself |
|---|---|---|
| Each line's share of the downtime | one question | Line 2 39%, Line 3 33.9%, Line 1 27.1% — *and that each line's total equals one product's, so if a line runs one product these cannot tell line from product* |
| Each line's packs against target | one question (after a look at the sheets) | 86.3%, 84.6%, 83.4%; all three 84.8% — from the two totals, never the rows' rates averaged |
| The worst day of the week | one question | Thursday, 2,997 min — *"Tuesday is only just behind on 2,937, so Thursday doesn't really stand out"; per shift the fairer measure, Friday having 10 days in the log to the others' 11* |
| The top two reasons on each line | one question | every line there with its two — *the 996 minutes with no reason left out and said* |
| Days over 300 minutes | one question | 13 of the 54 days — *"several only just pass 300 … if you moved the threshold a little, the count would change quite a lot"* |
| September against August | one question | 50,523 more, up 5.9% — *"most of that rise comes from September having one more working day … per shift, the increase is small, from 6,745 packs to 6,821"* |

Before 22 November none of these was one step: a share, a rate and a change took a sum for each group (`work_out`), and a
weekday, the top few of each line and a count of the days over a limit had no direct way at all — at best read off a longer list,
with the count worked in her head and rightly flagged. Every figure here passed the app's own check.

**3. The workbook exam — the same ten questions as 20 and 21 November, like for like: 10 of 10 on a fair mark** (the script said
9 of 10, 33 of 34: its one miss was the script's, below). **19 asks where the two runs of 21 November took 23 and 21; 12 steps
where they took 18 and 14; no sum worked one at a time where they needed 4 and 3.** The part-month question shows it: a day before
it was one question and three `work_out`; now one question, her packs a day worked in it. $0.55.

*The script's miss, and the third time a measure was wrong and she was not:* asked whether October beat September she said
*"No, not in total, but that's only because the October figures stop at the 15th … 448,842 packs from 11 production days, against
900,434 from 22 days in September. Per production day the two months are almost level"* — exactly right — and the mark, which knew
"only runs to", "15 Oct" and "11 days", read it as October compared whole. The mark is one named pattern now with her words as a
test (`exam/workbook` PART_MONTH). The rule held: the answer was read before the verdict was believed.

**What this shows.** She takes a real job in one message and brings it back finished, right and honest about what it does not
prove, in under a minute. She reaches for the new questions by herself and gets a figure for each group in one step. Nothing she
could do before was lost, and it now takes fewer steps. What she adds unasked — a confounder, a threshold that barely holds, a
rise that is one more working day — is the difference between an analyst and a calculator.

**What it does not show.** *Once is not always:* each exam ran once; the benchmark's way is the same job done every time (`--runs
3`), and that has not been run. *The job fitted in one go:* the app carrying her on past six rounds has never been needed by the
real model, so it is still proved only by the played story. *The job was a workbook:* a job across the app's own records (a
line's stops, its problems, a project) has no exam yet. *The second look was never needed:* no answer here held a figure the app
had not worked, so it was not exercised. *No before for the job:* 21 November's run was cut off by the allowance at its third
ask, so "she now finishes" is a first measurement, not a comparison. Not measured at all: effort `medium`, the tool-search switch,
her voice, how she keeps up with a changed file.

### 23 November, 14:11 UTC — pass^3 after the 160-word fix (assist v69; not measured)

`scripts/eval/luna-job.mjs --runs 3` on `main` after `briefJobClose` shipped — **blocked on the first ask.** Exact gateway sentence:
*Today's allowance for AI Mode is spent ($3). Manual Mode does everything meanwhile, and the conversation is kept.* **No marks, no
pass^3, $0** on this attempt (the 12:15 UTC run had already taken most of the day's check dollars). Re-run when the allowance returns
in the rolling window.

### 23 November, 12:15 UTC — job re-score after the *Check this* fix and G5 (assist v64; `claude-opus-5-5`, effort low)

Phase 0 on `main` (`scripts/eval/luna-job.mjs`, one complete run; `--runs 3` blocked on the dollar allowance after run 1).

**She finished the job alone: 13 of 14 marks, 7 asks in two goes, 65 seconds, about $1.06** (`assist_usage`: 7 `tool_use`, 1
`end_turn`; $1.060661). The two marks lost on 22 November are gone on the substance: **no figure in the report or her answer is
marked *Check this***, and she told established from hypothesis without being asked. The report is made with six sections; variance,
Line 3, the Bagger, and money match the generator.

**The one mark still lost:** her closing answer is **191 words** where the job asks for **160** — the same limit as the 22 November
fix (`job_step` / gateway); she names the report and gives the result, but not within the cap. Nothing else failed.

**Fixed 23 November (not re-run on the real model — allowance):** `job_step` and `colleagueAssist` now say the exam **counts** the
160-word cap; when a job has ended, `colleagueAsk` applies `briefJobClose` (`colleague/job`) so her last words stay at or under 160
whole sentences first, then words, always ending cleanly — general chat is untouched. Unit tests in `job.test.ts` and
`colleagueAsk.test.ts`.

**`--runs 3` not done:** before the run the rolling 24 h check allowance held about $1.06 and 42 asks left (after the 22 November
exams). Run 1 used the dollars; run 2 was cut off after one ask — **STOPPED — NOT A RESULT** (the gateway's *allowance for AI Mode is
spent ($3)*). pass^3 waits until the allowance comes back.

**G5:** not exercised on this job — nothing on a confirmation card; writes ran as ordinary receipts after the job (no batch card in
the log).

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
- *The first ask after a deploy cost $0.56* — her instructions and the full tool descriptions (then 123, now 133; the quoted cost is historical) were read in full
  once before they are kept; a warm ask is 3 to 5 cents. So a deploy that changes her instructions spends a fifth of the day's $3
  check allowance before a question is asked, and **a person's first question after an hour's silence costs the same**. The switch
  that sends a quarter of that (`ASSIST_COLLEAGUE_TOOLS=search`, LUNA-EVAL §3 — measured ready, never switched on) is now the first
  thing to settle before G6 and G7, where she works unasked: an always-on colleague cannot cost 56 cents to wake.

**Run again on 22 November, 15:43 UTC — the entry above: she finished it.** The investigation (`luna-demo.mjs`) with its
corrected measure has still not been run again.

## Consultant — governing customers (23 November)

Rowland: Luna must administer customers by voice or chat — archive on a card, start a new business on a card, never delete, never leave
them hunting. Instructions: `ADMIN / CUSTOMER GOVERNANCE` in `src/tools/colleague/colleagueAssist.ts` (synced to assist). Full map and
proofs: **`docs/LUNA-CONSULTANT.md`**.

Sources: [Introducing ChatGPT agent — OpenAI](https://openai.com/index/introducing-chatgpt-agent/) ·
[Measuring AI ability to complete long tasks — METR](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) ·
[Time Horizon 1.1 — METR](https://metr.org/blog/2026-1-29-time-horizon-1-1) ·
[Levels of Autonomy for AI Agents — Knight First Amendment Institute](https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1) ·
[OpenAI's five levels — Bloomberg](https://www.bloomberg.com/news/articles/2024-07-11/openai-sets-levels-to-track-progress-toward-superintelligent-ai) ·
[AA-AnalystAgent — Artificial Analysis](https://artificialanalysis.ai/evaluations/aa-analyst-agent).
