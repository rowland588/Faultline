# The toolkit — how it thinks, how it is used, how it is built, what it looks like

Rowland, 10 October, after the catalogue in `docs/LEAN40.md`:

> "More emphasis on the tools and the tool design, such as Cpk, etc. We need
> to build the whole intelligence model here. If we've got to the point of
> understanding the tools, we need to understand exactly how the tools will
> then be used, how they're built, what they'll look like — full design
> system."

So this is the design. `docs/LEAN40.md` keeps the principles and the
catalogue; this says, for the whole toolkit and then tool by tool:
- **how it lives** — the ecosystem (Part 0): a tool used on its own, then
  put on a line, attached to a job, and used as evidence for a problem or
  proof for a fix — one record, one way to attach, built first;
- **how it thinks** — the intelligence model: what is a fact, what is worked
  out, what is said, what is judged, and what the app refuses to claim;
- **how it is used** — who, where, the taps in order;
- **how it is built** — the record each fact lives on (one new record, the
  study, argued for in Part 0), the module that works it out, the test that
  proves the module;
- **what it looks like** — the one frame every tool shares, the sixteen
  parts they are drawn with, on a phone, a laptop and one page of paper.

**Built so far** (`docs/BUILD.md`, release 2): the record (`studies`), the
merge of two phones' readings, the measured test's arithmetic
(`lib/ie/sample.ts`), the capability study on its own, on the rail, put on a
line, attached to a job, used for a test or a fix (Take the readings, Make
it better, Prove it, before → after), and on the client report; and
(release 3, step 3) the time study and the work balance as one study per
product — elements timed on the phone, rated, stacked person by person
against takt (`lib/ie/balance.ts`), on the line balance's People view, the
map's work line and the line standard card; and (tool B, B1–B4) the value
stream map — a line's, end to end, laid out as a swimlane grid of what, who
(or where) and the value, nothing drawn (`lib/ie/steps.ts`,
`ui/ValueStream`) — inside a change: Make it better from a waste step, Prove
it by walking the line again, before → after on the fix, the map's wait and
waste offered on the 6M fishbone, the flow on the line's card, and the stream
as a table in each report's Evidence (`lib/report/streamTable`); and (tool
F, 12 October) the changeover and its interval — steps lapped on the phone,
each internal or external, the split bar, how often each product can run
(`lib/ie/changeover`), the agreed sequence on the product's line standard
(`capacity.changeovers`), Make it better from a step, Prove it, before →
after, the fishbone's Method and Machine, and the steps as a table in each
report's Evidence (`lib/report/changeoverTable`). Rowland's answers for B, 11 October: the picture's
colours (VA green, NE amber, NV red); the swimlane grid; who does it on a
line is people, not departments; multi-dimensional; and "remove
business-wide mapping ... but keep the line large, different departments
can affect the line". The rest is design. Every rule in `CLAUDE.md` holds: measured by
people, additions connect, screen and paper together, one colour one
meaning, simple with detail, manufacturing is many, and no new noun but
the one Part 0 argues for.

---

# Part 0 — The ecosystem: how a tool lives in the app

Rowland, 10 October, reading the design below:

> "What isn't clear is that we're about to build tools that do two things.
> One, can work independently. Two, can be attached to a project — possibly
> even to a problem. It needs to be a full ecosystem. Tools can be adjacent
> to do-one sessions, just to allow quick use of the tool. But then sometimes
> you need to integrate that tool into the project. So you use the tool,
> connect it to a problem, connect it to a project, connect it to a fix ...
> What you're tending to do right now is build things independently without
> constructing it and integrating it into the app itself. You need to build
> that first, don't you?"

Yes. This part is that foundation, and it is built before any tool.

## What was missing

**The design below scattered the tools.** Part 2 first put each tool's facts
on the nearest record:
- steps on the line standard;
- readings on a test;
- sampling taps on the stops log;
- shift counts on measures;
- ergonomics on a person on the map.

Five homes means five ways to attach, and no one way to say "this time
study is how we know about that problem, and this second one proves the fix
worked".

**The app today already attaches tools four separate ways**, each made for
one tool. Each works; none is shared:

| Today | How it attaches | Where |
|---|---|---|
| A quick snag | names a job (`projectId`), and is **sent**: it moves to the job as a problem or an action, and closes with `sent` saying where it went | `snag/quick.ts` |
| A line standard or balance | on a line (`workspaceId`), and a job picked from a list (`projectId`, `''` for none) | `StandardScreen` `BelongsTo` |
| A 6M cause | points at the record it came from (`CauseSource`: pareto · snag · standard · capacity · material · program · reading · observation) | `lib/sixm`, `lib/fishbone` |
| A countermeasure or a fix | names its problem (`caseId`, `causeRef`) or its observation (`fromItemId`) | `db/rows` `PaceTodoRow`, `lib/testing` |

## The rule: work moves, evidence links

- **A snag is work**, something to be done. When it goes to a job it moves
  and becomes the job's problem or fix, so nothing is counted twice. That
  stays exactly as it is.
- **A tool's result is evidence**: how we know. It is never moved and never
  copied. It stays one record and is linked to whatever it is evidence for.
  One record seen in many places cannot disagree with itself.

## One home for every tool's work

Every use of a tool is one record. This is **the one new record** the
toolkit needs. `CLAUDE.md` says a fifth noun is almost always wrong, so here
is why none of the existing ones fits:

| The existing record | Why it is not the home |
|---|---|
| **Test** | It lives only inside a job, and it is something agreed in advance to be proved. A time study taken on a running line on a Tuesday is neither. |
| **Line standard** | It is the *agreed* way for a product: what a study is measured against, and what a study may set. A measurement of it is not it. |
| **Stops log** (`Observation`) | It is one row for one event. A study is a session: what it is judged against, many facts, and a verdict. |
| **Snag** | It is work, not evidence. |
| **Measures and readings** | They hold one number per line per period. |

**The names.**
- **In code:** `ToolStudy`, table `studies`.
- **On screen:** never called a "study" on its own, because "Line study"
  already names a line. It always carries its tool's name:
  - "Capability study — Weight accuracy 400 g";
  - "Time study — Case packing";
  - "Value stream — Express 1.25 kg";
  - "Changeover — Finest to Express";
  - "Loss count — Shift 1, 10 Oct";
  - "Sampling — Op 2";
  - "Lift check — palletising".

```ts
interface ToolStudy {
  id: ID;
  ownerId: string;                 // who started it — a quick session is theirs alone
  tool: 'capability' | 'map' | 'time' | 'balance' | 'cycle' | 'changeover'
      | 'losses' | 'sampling' | 'ergonomics' | 'layout';
  name: string;                    // in the person's words
  workspaceId?: ID;                // the line; absent = a quick session, not filed
  projectId?: ID;                  // the job it is attached to; absent = none
  machine?: string;                // the machine, in the line's words
  assetId?: ID;                    // the job's machine, on a stage-gate job
  product?: string; programId?: ID;
  standardId?: ID;                 // the product's line standard it measures
  agreed?: StudyAgreed;            // what it is judged against, agreed before (Part 2)
  facts: StudyFacts;               // the tool's facts — steps, laps, readings, taps, counts (Part 2)
  uses: StudyUse[];                // what it is evidence for, inside its job — merged by id
  startedAt: number;
  closedAt?: number;               // closed = a receipt: its figures are frozen
  receipt?: StudyReceipt;          // the figures as they stood at close
  createdAt: number; updatedAt: number; deletedAt?: number;
}

interface StudyUse {
  id: ID;
  kind: 'problem' | 'case' | 'cause' | 'fix' | 'action' | 'test';
  ref: ID;                         // the TestItem, Case, "<caseId>:<causeId>", Test or PaceTodoRow
  role: 'evidence' | 'proof';      // how we know · how we know it worked (or it passes)
  at: number; by?: string;
}
```

## Where a study sits — four places, and it can be in all of them

**1. On its own: a quick session.**
- Open the tool from Tools and use it. No line and no job are asked first.
- It is yours, kept under "Not filed" on the tool's page: a calculator that
  remembers.
- The last line used is offered, to save a tap, but never required. Quick
  snags already work this way.

**2. On a line.**
- One tap: which line.
- The line's people see it, and it shows on the line under its tool.
- The 6M fishbone can suggest causes from it.

**3. On a job.**
- One tap: which job, with the jobs on this line listed first.
- The job's people see it: the team adds to it, the owner agrees its
  limits, a client reads it.
- One job at a time, the same rule as a line standard and a snag, so who
  can see it is never a puzzle.

**4. For something inside that job,** as many things as it serves:
- **evidence for a problem**: a stage-gate problem, a 6M problem, or one of
  its causes. *How we know.*
- **proof for a fix**: a stage-gate fix or a 6M countermeasure. *How we know
  it worked.*
- **proof for a test**: a Commission test, say. *How we know it passes.*

**And one act that is not a link: set as the standard.** It writes the
study's figures onto the product's line standard (standard times, takt, the
changeover sequence), each figure naming the study it came from.

## The doors — both ends write the same link

| From | Tap | It does |
|---|---|---|
| a study | **Put on a line** | sets `workspaceId` |
| a study | **Attach to a job** | sets `projectId`, listing the jobs on its line first |
| a study | **Use it for…** | lists the job's open problems, fixes and tests; picking one adds a `use` |
| a study | **Make it better** | raises the job's problem (stage gate) or countermeasure (6M) with this study as its evidence. On a line with no job, it raises a snag. |
| a study | **Set as the standard** | writes to the product's line standard (`can.agree`) |
| a problem's drawer, a 6M problem or a cause | **How we know → add a study** | picks one already on this line, or starts one filled in with the machine and the product |
| a fix's drawer or a countermeasure | **Prove it** | starts the same tool as the problem's evidence, filled in with the same scope (machine, product, limits or elements), so before and after measure the same thing the same way |
| a test's drawer (Commission) | **Take the readings** | starts a capability study linked as the test's proof. Its verdict becomes the test's, and the person can overrule. |

## Before and after, worked out

This is the intelligence the links buy.

**When it happens.** A fix has a proof study, and the problem it came from
has an evidence study **of the same tool on the same scope**. The tool's
module then compares them, `compare(before, after) → { text, tone }`:

| Tool | Before → after |
|---|---|
| Capability | mean, how many outside, Cpk: "Cpk 0.67 → 1.45 — capable now" |
| Time study | standard time, with the significance test from `lib/measureProof` on the laps: "0.53 → 0.41 min, a real change" |
| Value stream | lead time and the share that adds value: "6.2 d → 2.1 d" |
| Work balance | balance efficiency, and the constraint's time against takt |
| Changeover | minutes: "42 → 27 min" |
| Loss count | lost minutes a shift, and the slow running and short stops |
| Sampling | the share walking or waiting |
| Ergonomics | the score's band: "high → low" |

**The rules.**
- Same tool and same scope (machine, product, element), using the latest
  closed study on each side.
- Enough on both sides, or it says "too early".
- It says "the number moved", never "the fix did it" (`lib/impact`).

**What the verdict can do.** It can close a 6M countermeasure's "Did it
work?", or let a stage-gate fix be marked done with its proof. A person
still presses the button.

**A closed study is a receipt.** Closing freezes its figures, as a Case's
proof already freezes (`CaseStudy.receipt`), so next month's edits cannot
rewrite last month's claim. The owner can reopen it, and the reason is kept.

## Who can do what

**By where the study sits:**
- **Not filed:** its maker only.
- **On a line:** the line's members (`is_ws_member`, as line standards
  today).
- **On a job:** the job's people, by level:
  - the team adds facts and links (`can.edit`);
  - the owner agrees the limits, the takt and the count, sets the standard
    and deletes (`can.agree`, `can.remove`);
  - a client reads and prints.

**Two rules for links:**
- A link into a job needs `can.edit` on that job.
- Everything a study links to must be inside its job.

**The policies:**
- `owner_id = auth.uid()`;
- or the line's members when `workspace_id` is set;
- or the job's members when `project_id` is set;
- plus the restrictive client policy every job table carries.

They are written in the house shape, applied, and `pg_policies` read back
for the table. A select policy has no `with_check` (`CLAUDE.md`, "Things
that will bite").

## Where a study shows — connect the dots

| Where | How it shows |
|---|---|
| **The study itself** | under its name, one line: "On Line 2 · Line 9 install · how we know: *Weigher gives light packs* · proves: *Raise the setpoint 1 g*". Each part is a door. |
| **Tools**, on the rail | each tool's page lists its studies across every line and job, with "Not filed" first for the maker |
| **A line's page** | its tools, each with a count: "Capability 3 · Time 2 · Value stream 1" |
| **A job's Evidence** | the studies attached, as a count that is also its filter, beside the walk's frames and snags |
| **A problem's drawer**, 6M problem page | **How we know**: each linked study in one line (tool, its sentence, how known, the day), tap to open |
| **The fishbone** | a cause from a study wears its source (`CauseSource` gains the kind `study`) and its sentence; the fishbone suggests causes from studies on the problem's line |
| **A fix's drawer**, countermeasure | **Proved by**: the before → after line, its tone; "Prove it" while there is none |
| **A test's drawer**, the Commission square | the proof study's count and verdict ("12 of 30", "30 · all in") |
| **Needs you** | a test or fix whose proof is short: "18 readings still owed on Weight accuracy — 400 g" |
| **Today's update** | a study closed today on the job: "Capability study on the weigher: Passed, Cpk 1.45" |
| **The client report** | each problem's, fix's and test's account carries its study's sentence; an **Evidence** appendix lists every study on the job with its reading and how it is known |
| **The 6M report** | each cause's evidence, and each countermeasure's before → after |
| **The plan** | nothing new: no row per piece of evidence (visual management rule 5). A stage's or fix's verdict already shows. |
| **The control room** | nothing new, unless a study changes a verdict that already shows there |

## What changes in what exists — nothing removed

- **Quick snags:** unchanged. Work moves.
- **Line standard and line balance:** unchanged. The line standard is what
  "set as the standard" writes to. Its "On a job" line (`BelongsTo`) becomes
  the shared "where it sits" line, one component used by studies and
  standards alike.
- **The fishbone:** one more `CauseSource` kind, `study`.
- **The performance run:** unchanged. It is a run on a test, it works, and
  there is no reason to move it now.
- **Part 2 below is revised:** a session's facts live on the study, and the
  line standard keeps only what is agreed for the product.
- **Seen, and not touched now:** the balance has two homes today, a 6M job's
  line (`PaceLineRow.capacity`) and a product on a line
  (`Standard.capacity`). That is a decision for later.

## Built first: slice 0 — the ecosystem, proven by one tool

1. **The record.** The `studies` table in the house shape, with its
   policies, applied and read back; the mapper; `sync-schema.test.ts`.
2. **The merge.** The sync merges a list item by item (`facts` lists and
   `uses`, by `id`), with a two-phone scenario in `sync-two-devices.mjs`.
3. **The pages.** Each tool's page on the rail, listing its studies across
   lines and jobs, with "Not filed".
4. **The doors.** "Where it sits" and "Used for" on every study, and the
   doors at both ends: How we know, Prove it, Take the readings, Make it
   better.
5. **The branches.** The problem, fix and test drawers, the fishbone cause,
   Needs you, Today's update, the client report's lines and Evidence
   appendix, each covered by `report-stress`.
6. **The compare.** `compare(before, after)` wired to the fix.
7. **The first tool: the capability study (slice A).** An ecosystem with no
   tool in it cannot be driven in a browser. So slice 0 ships with one tool,
   and is proved end to end in Chromium:
   - a quick session;
   - put on a line;
   - attached to a job;
   - evidence for a problem;
   - a fix raised;
   - "Prove it";
   - before → after;
   - the client report.

Every later tool is then a new `tool` kind: its facts, its module and its
picture. The ecosystem comes with it, free.

---

# Part 1 — How it thinks: the intelligence model

## One shape for every tool

Every tool is the same five layers. A tool is designed by filling the five
slots, and nothing else.

```
  FACTS  ──►  FIGURES  ──►  READING  ──►  VERDICT  ──►  ACT
  what a      worked out    the figures   a word       what the figures
  person      from the      in one        with a       let you do, as a
  put in      facts, never  sentence      tone, that   record the app
  (stored)    stored                      may say no   already has
```

1. **Facts** are the only thing stored. A fact is what a person put in:
   timed on the stopwatch, counted, tapped, typed, photographed or cut from
   the film. Every fact carries **how it is known** (timed · counted ·
   observed · reported · typed · estimated), **when** and **who**. The 6M
   already asks this of every cause; the balance already keeps
   `Station.source` (plate · timed · estimate). The toolkit makes it the
   rule for every number.
2. **Figures** are worked out from the facts by one pure module per tool
   (`src/lib/ie/`, below), the way `lib/capacity`, `lib/run` and
   `lib/hoursLost` already work: nothing derived is ever stored, so the
   screen, the card and the report cannot disagree. Every module is proved
   by the worked example in `docs/LEAN40.md`'s appendix, as a unit test.
3. **The reading** is the figures in one sentence a person would say out
   loud: "Thirty packs, mean 401.2 g, all within 400–404 g." It is the
   `standing()` sentence, applied to a tool.
4. **The verdict** is one word with one of the five tones, and it is allowed
   to say **no** and allowed to say **not enough yet**. The performance run
   already does this (`lib/run patchRuns`); the measured test, the time
   study and the ramp-up follow it.
5. **The act** is the one or two things the figures let you do next, each
   a record the app already has: raise a fix or a countermeasure (a Test of
   kind `fix`, or an action on the board), agree a limit or a target
   (`can.agree`), set the standard, copy to a future state. A tool that
   ends in a number and no act is a gimmick.

## The honesty rules — the intelligence is in what it refuses to say

1. **Enough?** Every figure from a sample carries its count and says when
   the count is short. Each tool has its own rule for enough (the table
   below), and the **meter** draws it. Short is said in words, never
   hidden: "Cpk 0.67 — from 12, too few to say".
2. **How known.** A figure inherits the weakest source under it. A standard
   time built on an estimate says "estimated" wherever it is used, on the
   step, in the balance and on paper. Nothing launders a guess into a
   measurement by passing through arithmetic.
3. **What it does not claim.** The sentence says the limit of the claim.
   Capacity says "at most" because buffers hide stops. A proof says "the
   number moved", never "this did it" (`lib/impact`). A capability says
   "would drift" because it is a prediction from a sample. A forecast says
   "at this pace".
4. **People decide.** A verdict can be overruled with a word why, and the
   overrule is kept beside the verdict, as the run's is. Anything the app
   suggests — the constraint, a balance, which waste a step is — is offered
   as a suggestion, drawn as a ghost beside the real thing, and applied only
   when a person says so.
5. **Agreed before measured.** Limits, targets, takt, allowances and
   standard times are agreed (`can.agree`) before the readings go in, and a
   reading never moves them. It is `plannedAt` against `expectedAt`, for
   every tool.

## The verdict grammar — five tones, one meaning each

| Tone | Colour | In a tool it means | Words |
|---|---|---|---|
| failed | `--st-r` red | outside the agreed limit; over takt; a reading that broke a rule; late | "Didn't pass" · "Over takt" · "Outside" |
| at risk | `--st-a` amber | passed but would drift; marginal; waiting on readings still owed | "Would drift light" · "12 of 30 in" · "Just capable" |
| under way | `--st-w` indigo | being measured now; the study is running | "Timing" · "Sampling" · "Running" |
| passed | `--st-g` green | within, capable, holding, enough | "Passed" · "Capable" · "Enough cycles" |
| not started | `--st-n` grey | nothing measured yet; too few to say anything at all | "Not measured" · "Too few to say" |

Only the abnormal number carries colour. "30 readings" is neutral; "2
outside" is red; "Cpk 0.67" is amber with its word.

## Enough — the rule per tool

| Tool | The figure | Enough when | Short says |
|---|---|---|---|
| Measured test | mean, spread, outside | the agreed count is in | "12 of 30 in" |
| Measured test | Cpk | 25 readings or more | "from 12 — too few for capability" |
| Time study | standard time | n ≥ (t·s ÷ 0.05·mean)², t Student's at n − 1 df, five at least | "12 of 15 cycles" |
| Work sampling | each share | N ≥ Z²p(1−p) ÷ E² for the margin wanted | "30% ±9 points from 100 taps — 223 more for ±5" |
| Ramp-up | the date it meets rate | 3 runs or more | "too early — 2 runs" |
| Pace | the forecast | 5 stages finished or more | "too early to tell" |
| A shift's losses | the waterfall | every stop in the shift logged; the running speed timed | "9 min of slow running and short stops" |
| Proof after a change | did it work | `lib/proof` / `lib/measureProof` targetN | as today |

## How known — the marks

Every fact and every figure wears one word where it is shown, and the
weakest under it on paper:

**timed** (the stopwatch) · **counted** · **observed** · **reported**
(someone said so) · **typed** · **estimated** · **plate** (the maker's
number) · **from the film**.

## The shared arithmetic — `src/lib/ie/`

One folder, one module per tool, pure, no React, no storage. Each exports
`xxx(facts) → Figures` and `xxxSays(figures) → { text, tone, verdict }`.
Each is tested by the worked example in the appendix of `docs/LEAN40.md`.

| Module | Works out | Reuses |
|---|---|---|
| `sample.ts` | count, mean, sample spread (n−1), min, max, median, how many outside, Cp, Cpk, the share that would fall outside, the lap that is far from the rest, `enoughCycles`, `enoughSampling`, the packers' three rules and the TNE table | — |
| `steps.ts` | the step table's totals: lead time, adds-value time, needed time, waste time, process cycle efficiency, takt from demand and available time, the biggest wait, the longest cycle against takt; the future-state difference | `niceScale` |
| `timeStudy.ts` | per element: observed mean, rating, basic, standard; the cycle's standard; cycles needed; foreign elements out | `sample` |
| `sampling.ts` | shares with margins; taps needed for the margin wanted | `sample` |
| `balance.ts` | takt; fewest people; balance efficiency, delay, smoothness; the person who is the constraint; a ranked-positional-weight suggestion | `steps` |
| `cycle.ts` | the person–machine cycle against takt; idle each side; machines per person; cost per piece either side | `cost` |
| `changeover.ts` | minutes now; minutes if external work is moved out; capacity bought back; every-product-every interval | `steps` |
| `losses.ts` | expected packs at plate speed, lost minutes, explained by cause, slow running and short stops; idle labour and lost contribution | `cost`, `capacity` |
| `rampUp.ts` | the learning rate from runs; the date rate is met | `run` |
| `pace.ts` | earned schedule for the stage gate: earned days, pace, forecast | `install`, `weeks` |
| `mix.ts` | throughput per constraint minute; ranking; the constraint's week filled | `capacity`, `cost` |
| `ergo.ts` | NIOSH recommended weight limit and lifting index; MAC, ART and REBA scores from their sheets | — |

What already exists and is used, never rewritten: `lib/capacity` (the
chain, three speeds, what-ifs), `lib/run` (agreed against the day), `lib/cost`
(£ per hour and per pack), `lib/proof` and `lib/measureProof` (before and
after, with a significance test and a receipt), `lib/stats`, `lib/weeks`,
`lib/niceScale`, the report engine `lib/report/`.

---

# Part 2 — How it is built: the records

**Revised by Part 0.** The first draft spread each tool's facts over five
records. Now a session's facts live on the study (`studies`), the one home,
so every tool attaches the same way. The line standard keeps only what is
**agreed** for a product, written there by "Set as the standard". The table
is the whole of the storage design; everything else is worked out.

| Facts | Live on | As | New columns |
|---|---|---|---|
| **A session's facts**: the steps as walked, laps, readings, ticks, a changeover's steps, sampling taps, a shift's counts, an ergonomic sheet's answers, a path drawn | the study | `ToolStudy.facts: StudyFacts`, one list per kind, each merged by `id` | `studies.facts jsonb` |
| **What the session is judged against**: limits and count, takt, allowances, the activities and the margin wanted | the study, agreed before (the owner on a job, `can.agree`) | `ToolStudy.agreed: StudyAgreed` | `studies.agreed jsonb` |
| **What it is evidence for** | the study | `ToolStudy.uses: StudyUse[]` (Part 0) | `studies.uses jsonb` |
| **The figures at close** | the study | `ToolStudy.receipt` | `studies.receipt jsonb` |
| **The product's agreed way**: steps with their standard times, takt, allowances, the agreed changeover sequence, price less materials and demand | the line standard, per product per line (`Standard`) — beside its map and its balance | `Standard.steps`, `takt`, `allowances`, `changeovers`, `throughput`; each figure names the study it came from (`fromStudyId`) | `standards.steps`, `takt`, `allowances`, `changeovers`, `throughput` (jsonb) |
| **A future state** | the value-stream study it was copied from | `facts.future: Step[]` | inside `studies.facts` |
| **Planned losses** for effective capacity | the balance (`Capacity`) | `Capacity.plannedLossMinPerShift` | inside `standards.capacity` |
| **The stops in a shift** (for a loss count) | the line's stops log (`Observation`), unchanged — the study reads them | nothing new | — |
| **Ramp-up runs** | the performance run's products (`Test.runs`), unchanged | nothing new | — |
| **The pace** | the stages' planned and actual days, unchanged | nothing new | — |

**What `facts` holds, by tool:**

| Tool | `facts` | `agreed` |
|---|---|---|
| capability | `readings: TestReading[]` | `AgreedReadings` (kind, unit, nominal, limits, count) |
| map | `steps: Step[]`, `future?: Step[]` | `takt` |
| time | `steps: Step[]` with `laps` and `rating` | `allowances` |
| balance, cycle | `steps: Step[]` with `who`, `after`, the three times | `takt` |
| changeover | `steps: Step[]` with `side`; `fromProduct` | — |
| losses | `shift`, `plannedMin`, `made`, `rejects`, `rate` | — |
| sampling | `taps: { id, at, who, activity }[]` | `activities`, `marginPts` |
| ergonomics | `method`, `answers`, `who` (the person on the map) | — |
| layout | `paths: { id, points, scaleM }[]`, `trips` | — |

Each new column is a migration in the house shape (`supabase/<NAME>.sql`,
applied, read back), a line in the mapper, and `sync-schema.test.ts` keeps
them together.

**The step** — one type, every tool reads the fields it needs:

```ts
interface Step {
  id: string;
  order: number;
  name: string;                       // the floor's words: "Wrap and seal"
  type?: 'operation' | 'move' | 'check' | 'wait' | 'store';
  value?: 'adds' | 'needed' | 'waste';
  cycleSec?: number;                  // the work, per piece or per batch
  waitSec?: number;                   // sits before the next step
  batch?: number;                     // pieces per cycle, when not one
  distanceM?: number;                 // for a move
  who?: string;                       // a person mark on the map (Op 2)
  machine?: string;                   // a station on the balance
  manualSec?: number; walkSec?: number; machineSec?: number;  // the operator's cycle
  side?: 'internal' | 'external';     // a changeover step
  after?: string[];                   // must follow these (for the balance)
  laps?: { sec: number; at: number; who?: string; foreign?: boolean; struck?: boolean }[];
  rating?: number;                    // 100 = standard performance
  standardSec?: number;               // agreed, from the study
  source: 'timed' | 'counted' | 'typed' | 'estimated' | 'film';
  segmentId?: string;                 // the film it was cut from
  note?: string;
}
```

**A measured test** — the shape the run already has (agreed, then the day):

```ts
interface AgreedReadings {           // the owner's, before the day
  kind: 'limits' | 'packers' | 'ticks';
  unit?: string;                      // g · mm · bar · s
  nominal?: number;
  lower?: number; upper?: number;     // limits; either may be absent
  count: number;                      // how many readings the test needs
}
interface TestReading {
  id: string;
  value?: number;                     // limits, packers
  ok?: boolean;                       // ticks
  at: number; who?: string; note?: string; struck?: boolean;
}
```

**Two devices on one list.** The sync merges a record field by field
against the copy both last agreed. A `steps` array edited on two phones at
once is one field, so the merge must go one level down: steps keyed by
`id`, merged step by step, last write wins per step, a step deleted on one
phone stays deleted. `readings` and `laps` are append-mostly and merge by
`id` the same way. This is a change to `src/cloud/sync.ts` and a tenth
scenario for `scripts/sync-two-devices.mjs` (two phones timing the same
cycle, both laps kept) before the first tool ships.

---

# Part 3 — What it looks like: the design system for tools

## 3.1 One frame for every tool

Every tool page is the same frame, in the order of the three questions:
where are we (the strip), why are we not where we should be (the says line
and the abnormal in the picture), what are we doing about it (the act row
and the fixes raised). Nothing else above the fold.

```
┌─ Line 2 · Express 1.25 kg · Value stream ─────────────────── [Walk it] [Copy to future ▸] [Print] ─┐
│ STRIP   Lead time 6.2 d     Adds value 14 min · 0.2%     Waste 5.9 d     Takt 3.0 s                 │
│ SAYS    The biggest wait is the pallet for despatch, 2 days. Case pack, 6.0 s, is over takt.        │
├─ TABLE ──────────────────────────────────────────┬─ PICTURE ──────────────────────────────────────────┤
│  #  Step                   Type   Value  Cycle Wait │  ▁▁▁▁▁▁░░░░░░░░░░░░▁▁█▁░▒█░░░░░░░░░░░░░░░░░░░    │
│  1  Film delivered to store ▢ wait  waste   —  1.5 d│                                                  │
│  2  Film to the wrapper     ➝ move  needed 4 m   —  │  adds value █   needed ▒   waste ░   wait ░░    │
│  3  Wrap and seal           ● op    adds  2.0 s  —  │                                                  │
│  …                                                  │                                                  │
├─ ACT   on row 7: [Make it better]   ·   [Agree the takt]   ·   [Set as the standard] ──────────────┤
```

- **Laptop (≥ 900 px):** the table on the left, the picture on the right,
  both scrolling together; the act row fixed at the foot.
- **Phone:** strip, says, picture, then the rows as cards; the capture
  button (Walk it, Lap, ↵) fixed where the thumb is; no drag.
- **Paper:** one page by the report engine: strip, picture, table, says, in
  the same marks. Landscape when the table is wide. Covered by
  `report-stress` at tiny, ordinary and huge before it ships.
- **Present:** in the meeting, the page steps through strip → the abnormal
  → the act, as the meeting screen already presents.

## 3.2 The parts

Sixteen parts; every tool is drawn with these and nothing else. Each has a
laptop, a phone and a paper form, and says its state in words beside its
marks. Class names are a proposal (`ie-…`).

| # | Part | Shows | Laptop | Phone | Paper | Used by |
|---|---|---|---|---|---|---|
| 1 | **Strip** `ie-strip` | 3–5 figures: number, unit, word; a count beside any figure from a sample ("Cpk 0.67 · from 30") | one row | two rows, wraps | the first line | every tool |
| 2 | **Says** `ie-says` | one sentence from the module, its tone word first when abnormal | under the strip | under the strip | under the picture | every tool |
| 3 | **Verdict** `ie-verdict` | the word and its tone; an overrule beside it: "Passed · overruled by K. Ahmed — retest Monday" | in the strip | in the strip | in the first line | measured test, time study, ramp-up, cycle |
| 4 | **Meter** `ie-enough` | "12 of 15 cycles" as a bar filling; grey until enough, then quiet | beside the figure | under the capture button | in words only | time study, sampling, measured test, ramp-up, pace, proof |
| 5 | **Step table** `ie-steps` | a row per step: order, name, type mark + word, value mark + word, times, who, distance; edit in place; **drag to reorder**; "Show only the waste" | table | cards, two chips per card (type, value) | table | value stream, process chart, time study, changeover |
| 6 | **Time bar** `ie-timebar` | the time value map: adds-value above the line, needed and waste below, waits as hatched gaps; two scales when seconds sit beside days, with a break mark and the words "seconds \| days" | right of the table | full width, taller | under the strip | value stream, process chart |
| 7 | **Stacks** `ie-stack` | stacked bars per person against the takt line; the part over takt red; the constraint named under; **drag an element between stacks** | right of the table | full width, scroll sideways with a word saying so | under the strip | work balance |
| 8 | **Two lanes** `ie-lanes` | person and machine as two lanes in sequence against takt; idle hatched | right | full width | under the strip | operator's cycle |
| 9 | **Dots between limits** `ie-dots` | readings in order; two limit lines; the mean dashed; nominal; outside dots red; the packers' bands light | right | full width, grows as readings land | small block in the account | measured test |
| 10 | **Laps** `ie-laps` | a row of dots per element around its mean tick; a far lap ringed; tap to keep or strike | right | one row per card | — (figures only) | time study |
| 11 | **Waterfall** `ie-fall` | planned → each loss down → made; what nobody logged (slow running and short stops) hatched grey | right | full width | under the strip | a shift's losses |
| 12 | **Climb** `ie-climb` | runs as dots against days; the rate line; the fit dashed; the meet date labelled "at this climb" | right | full width | under the strip | ramp-up, pace |
| 13 | **Ranked bars** | the existing Pareto | as today | as today | as today | mix, cost deployment, sampling shares |
| 14 | **Split bar** `ie-split` | internal \| external; before over after | right | full width | under the strip | changeover |
| 15 | **Before and after** `ie-compare` | current beside future; every changed figure with its arrow and difference; the gain sentence | two columns | stacked | two columns | value stream, layout, what-ifs |
| 16 | **Capture** `ie-capture` | one-thumb controls that survive the app closing (the timestamp is the truth, as the Capture stopwatch): **Next step** · **Lap** · **Stood / Running** · **+1 reject** · a **number pad with ↵** · **✓ ✗** · the **random prompt** | small | big, fixed at the thumb | — | walk it, time study, the run, readings, ticks, sampling |

## 3.3 Colour and marks

- **The five state colours are the only hues that mean anything**, as
  everywhere (CLAUDE.md, visual management rule 1). The verdict grammar
  above is their whole use in a tool.
- **Value is told by fill, not by hue** — so a waste step never reads as
  "late", and no sixth colour is added:
  - **adds value** — solid ink (`--ink`);
  - **needed** — light (`--surface-2`, an ink outline);
  - **waste** — hatched, in the quiet grey (`--st-n`).
  Each carries its word in the table and in the legend.
- **Type is told by a mark and a word** — the process chart's five, drawn
  simply: ● operation · ➝ move · ◆ check · ▢ wait · ▽ store.
- **Ergonomic bands** (the HSE sheets' green, amber, red, purple) are said
  in **words and stepped marks** (▪ ▪▪ ▪▪▪ ▪▪▪▪), never in those colours.
- **Brand blue is what you press**: Walk it, Lap, ↵, Make it better.
- **The suggestion is a ghost**: a suggested balance or a guessed waste is
  drawn in the quiet grey, dashed, beside the real thing, until applied.

## 3.4 Numbers and words

| Figure | Written as | Rule |
|---|---|---|
| a time under a minute | `2.0 s` | one decimal |
| a time under an hour | `4 min` · `42 min` | whole minutes; `0.5 min` only in a study |
| a time under a day | `3.2 h` | one decimal |
| a time over a day | `1.5 d` · `6.2 d` | one decimal |
| a share | `0.2%` · `12%` · `90%` | whole, except under 1% to one decimal |
| a rate | `58.4 a minute` | one decimal; "ppm" only where the floor says it |
| a weight | `401.2 g` | the test's own unit, to its own precision |
| Cpk, Cp | `0.67` · `1.45` | two decimals, always with "from n" |
| money | `£412` · `£18,400` | whole pounds |
| a count | `30` · `12 of 30` | whole |

- **Never more precision than the measurement.** A stopwatch lap is to
  0.1 s; a rating is a whole number; a reading is whatever the instrument
  gave.
- **The big beside the small.** A 2 s step next to a 2 d wait is the point of
  the map. The time bar switches to two scales with a break mark; the table
  writes each in its own unit.
- **The floor's words on screen; the practitioner's in brackets once.**
  "adds value · needed · waste" (not VA/NNVA/NVA); "where the line is
  limited" (not bottleneck); "enough cycles" (not confidence); "every
  product every 1.5 days (EPEI)"; "capability (Cpk 0.67)" — Cpk by name,
  because it is the word the room uses.
- **The limit of the claim is in the sentence**: "at most", "at this pace",
  "would drift", "not yet explained", "the number moved".

## 3.5 Phone, laptop, paper

- **Capture on the phone, think on the laptop.** Every fact can be put in
  on a phone with one thumb; every rearrangement (drag a row, drag an
  element, draw a path) is on the laptop, where the drawer or a chip does
  the same job on the phone.
- **One page of paper per tool**, by the report engine, from the same
  figures: strip, picture, table, says. Each new page is added to
  `src/dev/reportSeeds.ts` at tiny, ordinary and huge, and
  `report-stress` reconciles every figure on it against the record.
- **Present mode** shows a tool as the meeting already does: the strip, then
  the abnormal, then the act.

## 3.6 Who may do what

The same `useAccess(projectId)` rule as every control that writes:
- `can.edit` — facts: a lap, a reading, a step's name or type, a tap;
- `can.agree` — what was agreed: limits, count, takt, allowances, a
  standard time set, the pace's "use this date";
- `can.remove` — delete a step, strike a reading (struck, never erased);
- a client reads and prints, and a client's rows are never pushed.

A tool on a line with no job follows the line's membership, as snags and
standards do today.

## 3.7 Where each tool shows — connect the dots

A tool is unfinished until it shows wherever its parent shows, as a branch.

| Tool | On its line | On a job it is attached to | On the 6M | On paper | In the control room |
|---|---|---|---|---|---|
| Value stream | a line under the line's standards: "lead time 6.2 d · 0.2% adds value" | the job's front page, as a branch under the line | the head of the fish (the gap) and **Method** | a page in the client report; its own page | — |
| Time study | the step's standard time on the step; "timed" on the station | — | **Method** | the standard's page | — |
| Work balance | a second view of the line balance | the front page's "where the line is limited" line | **People**, **Method** | the balance's page | — |
| Operator's cycle | on the standard, per person | — | **Method**, **Machine** | the standard's page | — |
| Changeover | under the product's standard | Commission: a test's reading | **Machine**, **Method** | a page | — |
| Measured test | — | the drawer, the Commission square ("12 of 30"), Needs you ("18 readings owed"), the day, the handover pack | **Measurement** | the client report's account, the test report, the handover pack | the job's verdict when it fails |
| A shift's losses | the line's board, beside the Pareto | — | the gap, **Machine**/**People**/**Material** by cause | the pace report | the line's row |
| Ramp-up | — | Commission: the run's card and the front page | — | the client report | the job's forecast |
| Pace | — | the front page, the plan, Today's update | — | the client report, the one-page status | the job's row |
| Mix | the balance's page | — | — | the balance's page | — |
| Sampling | the Pareto | — | **People**, **Method** | the pace report | — |
| Ergonomics | the person on the map | Hand over: the standard | **People** | the standard's page | — |

---

# Part 4 — Each tool, designed

Each tool, in the five slots and then on the screen: **used** (who, where,
the taps in order) · **facts** (the record) · **figures** (the module) ·
**reading and verdict** (the sentences, word for word) · **looks like** ·
**shows up** · **proved by** (the unit test). The first is the deepest,
because Rowland named it.

## 1. The measured test — readings in, Cpk out

**The question.** Does this test pass, and would it keep passing all shift?

**Used.**
- *Before the day, the owner* opens the test in its drawer and taps **Agree
  the limits**: the kind (**limits**, **sold by weight**, or **ticks**), the
  unit, the nominal, the lower and upper limit (either may be left blank:
  "at least 400 g"), and **how many readings** the test needs. For a
  ℮-marked pack, the nominal alone is enough: the three rules and the
  tolerable negative error follow from it. This is the same step as agreeing
  a run's rate, and it is kept by the owner the same way (`can.agree`).
- *On the day, anyone on the team* opens the test on the phone. The number
  pad is the screen: big digits, the unit beside them, **↵**. `401.2 ↵`
  `399.8 ↵` … Each reading lands as a dot, the count climbs "12 of 30", the
  last three readings sit under the pad with a strike for a mistype, and a
  spoken "four oh one point two" lands the same way as voice does on every
  box. A ticks test is a row of boxes: tap ✓, tap again ✗, hold for a word.
  Who put each reading in is kept.
- *When the agreed count is in*, the verdict says itself. The person may
  overrule it with a word why; both are kept.
- *Make it better.* A failed or drifting test offers one tap to raise a fix
  on the machine with the figures already in its words ("Weight accuracy —
  400 g: Cpk 0.67 from 30, would drift light. Raise the setpoint 1 g?").

**Facts.** A capability study (Part 0): `agreed` holds the limits and the
count, `facts.readings` the readings. On a stage-gate test it is linked as
the test's proof, so the readings are taken from the test's drawer and the
test reads its verdict from the study. Standalone, it is a quick session or
sits on a line. Nothing else is stored: the mean, the spread, the Cpk and
the verdict are worked out.

**Figures** (`lib/ie/sample.ts`):
- count, mean, spread (sample standard deviation, n − 1), lightest, heaviest;
- **outside**: how many below the lower or above the upper limit;
- **Cp** = (upper − lower) ÷ 6σ, only with both limits;
- **Cpk** = the smaller of (upper − mean) and (mean − lower), ÷ 3σ; with one
  limit, that side alone;
- **the share that would fall outside** at this mean and spread, from the
  normal tails — said as "about 2 in 100";
- **capability words**: Cpk ≥ 1.33 **capable**; 1.00 to 1.33 **just
  capable**; under 1.00 **not capable — would drift** (light / heavy / low /
  high, by which limit is near);
- **the packers' three rules** for `kind: 'packers'`: the mean at or above
  the nominal; fewer than 1 in 40 short by more than the tolerable negative
  error (TNE); none short by more than twice it; the TNE from the
  regulations' table (5–50 g: 9%; 50–100 g: 4.5 g; 100–200 g: 4.5%;
  200–300 g: 9 g; 300–500 g: 3%; 500–1000 g: 15 g; 1–10 kg: 1.5%);
- **enough**: the agreed count in; **Cpk shown from 25**, otherwise "too
  few for capability";
- a reading far from the rest (more than 3 spreads from the mean of the
  others) is **flagged**, never struck by the app.

**Reading and verdict.**
- While short: *"12 of 30 in — all within so far."* — tone at risk (waiting).
- Passed: *"30 packs, mean 401.2 g, 400.1–402.6, all within 400–404 g —
  **Passed**."* — green.
- Failed: *"30 packs, mean 400.4 g — **2 outside**, both light (399.6,
  399.8) — **Didn't pass**."* — red.
- Capability, a second sentence, its own tone: *"Capable: Cpk 1.45 from
  30."* (green) · *"Just capable: Cpk 1.12 from 30 — watch it."* (amber) ·
  *"Not capable: Cpk 0.67 from 30 — about 2 in 100 would be light."*
  (amber) · *"Too few for capability — from 12."* (grey).
- Sold by weight: each rule said: *"Average 401.2 g, above 400 ✓ · none
  more than 12 g light ✓ · none more than 24 g light ✓ — Passed."*
- Ticks: *"10 of 10 rejected — Passed."* · *"9 of 10 — 1 not rejected
  (pack 7) — Didn't pass."*
- Overruled: *"Didn't pass · overruled by K. Ahmed — reading 7 was the
  tare, struck; retest Monday."*

**Looks like** — laptop, in the drawer or on the test's page:

```
  Weight accuracy — 400 g · Checkweigher · Commission                       [Agree the limits]
  STRIP  30 of 30 in    mean 401.2 g    400.1 – 402.6    0 outside    Cpk 0.67 · from 30 · would drift light
  SAYS   Passed — all within 400–404 g.  Not capable: Cpk 0.67 — about 2 in 100 would be light.
  ┌────────────────────────────────────────────────────────────────┐   READINGS
  │ 404 ─────────────────────────────────────────────── upper      │   401.2  399.8̶  401.6  400.9 …
  │          ·    ·  ·      ·   ·        ·    ·                    │   30 readings · K. Ahmed, 10 Oct
  │ 401.2 - - ·- - - - ·- - - ·- - - - - - ·- - - - - mean         │
  │       ·      ·   ·     ·        ·  ·        ·   ·              │   [Make it better]  [Print]
  │ 400 ─────────────────────────────────────────────── lower      │
  └────────────────────────────────────────────────────────────────┘
```

Phone, on the day: the strip folded to the count and the verdict; the dots
picture growing under the number pad; the pad fixed at the thumb.

Paper: the client report's account of the test gains one line and a small
dots block; the handover pack lists the sentence; the test report prints
the readings table.

**Shows up.** The drawer; the Commission square ("12 of 30" while short,
"30 · all in" after, red on a fail); Needs you ("18 readings still owed on
Weight accuracy — 400 g"); the day's done line; the client report's
account; the handover pack; the test report; the job's verdict when a test
fails, as any failed test does today.

**Proved by.** The appendix's thirty packs: mean 401.2, spread 0.6, all
within → Passed; Cpk 0.67; "about 2 in 100". Twelve readings → no Cpk. Two
light → Didn't pass, both named. The packers' rules on 400 g with TNE 12 g.
`report-stress` reconciles the count, the mean and the verdict on paper.

## 2. The step table — the value stream and the process chart

**The question.** Where does the time go between the start and the
customer, and how much of it is work?

**Used.**
- *Walk it* (phone): on the line's standard for a product, one button,
  **Next step**. The first tap starts; each tap closes the step and starts
  the next; the step's name is spoken and lands in the row (voice into
  boxes); its type and value are two chips tapped as you walk, or later.
  Walking the pallet to despatch takes 4 minutes; waiting for despatch is
  typed as "about 2 days" when you get back. At the end the table is full,
  timed and in order.
- *Typed* (laptop, the workshop): rows added and reordered by drag, times
  typed, the picture moving as they are.
- *From the film*: the filmed walk's segments, already in flow order, become
  rows with their lengths; the person names and tags them.
- *Show only the waste*: one tap greys the rest. *Make it better* on a waste
  row raises a fix (stage gate) or a countermeasure (6M) with the figure in
  its words: "Pallet waits for despatch — 2.0 d → 4 h".
- *Copy to future*: the table is copied; strike, merge, shorten; every
  changed figure shows its arrow; the strip says the gain.

**Facts.** A value-stream study: `facts.steps`, `facts.future`,
`agreed.takt`. "Set as the standard" writes the agreed steps and takt onto
the product's line standard.

**Figures** (`lib/ie/steps.ts`): lead time = Σ cycle + Σ wait; adds-value
time; needed time; waste time; process cycle efficiency = adds-value ÷ lead;
takt = available ÷ demand; the biggest wait; the longest cycle and whether
it is over takt; the future-state difference, figure by figure.

**Reading.** *"Lead time 6.2 days. 14 minutes of it adds value — 0.2%. The
biggest wait: the pallet for despatch, 2 days. The longest cycle: case pack,
6.0 s, over takt (3.0 s) — where the line is limited."* The future: *"Lead
time 6.2 d → 2.1 d (−4.1 d). Adds value 0.2% → 0.6%."* No verdict: a map
is a reading, and the act is the fix raised from it.

**Looks like.** The frame in 3.1 is this tool. The time bar is the classic
time value map: adds-value above the line, needed and waste below, waits as
hatched gaps, two scales when seconds sit beside days.

**Shows up.** The line's standards list ("lead time 6.2 d · 0.2% adds
value"); the job's front page as a branch under the line; the head of the
fish on a 6M job; a page in the client report; its own page.

**Proved by.** The seven rows in `docs/LEAN40.md`: lead time, 0.2%, the
biggest wait, case pack over takt; the future copy's differences.

**How the trade does it** (read 11 October, for Rowland's "multi function
cross department or single line — how they do it in our domain"):
- *Three levels.* The process level is one line, a box per station
  (Rother & Shook, *Learning to See*); the plant door to door, a box per
  area the material passes; the extended map across plants, suppliers and
  customers (Jones & Womack, *Seeing the Whole*). Practice keeps one door-
  to-door map and opens a line's own map under the area it sits in
  (lean.org; leandatapoint.com).
- *Across departments* is a swimlane (Rummler-Brache) map: a lane per
  function or person, the handoffs between them; made for office and
  indirect work. Rule of thumb: swimlane for who owns a step, VSM for why
  it takes so long, process map for how a task is done (6sigma.us;
  allaboutlean.com; fabrico.io).
- *One line, several people* is not a VSM in the Toyota tradition but the
  standard work combination table — a row per operator, manual, machine and
  walk against takt (lean.org lexicon; allaboutlean.com). That is the work
  balance; a line's map laned by who is the bridge between the two.
- *The apps* (eVSM, iGrafx, LTS Data Point, SimVSM, visTABLE, Minitab
  Engage; Lucidchart, Miro, SmartDraw for drawing only): every one is a
  drawing of boxes and arrows. The calculators work out lead time and the
  share that adds value; LTS keeps a process → department → organisation
  hierarchy fed from MES and sensors (ruled out here: measured by people);
  SimVSM records on a tablet on site, as Walk it does.
- *So the map here* (Rowland, after the above: "remove business-wide
  mapping ... but keep the line large, different departments can affect
  the line"): one kind, a line's, its lanes everyone whose work touches the
  line — the operators and the machine as in the combination table, and
  planning, stores, quality, maintenance as in a swimlane map; every step
  carries what, who and where, the lanes either (B1c); a grid read by
  colour and opened by a tap, never a drawing; no master map of the
  business and no levels under it — that is the mapping products' ground,
  not a change to a line.

## 3. The time study

**The question.** How long should this work take, done properly?

**Used.**
- *At the line (phone):* the standard's steps are the elements. One button,
  **Lap**; the current element's name on it; the running split above. Each
  tap closes the element and the next one lights. A cycle is the elements
  once through; the person times several. An interruption is tapped
  **Foreign** and kept out. The meter says "12 of 15 cycles".
- *Rating:* after a cycle (or once for the study), the person taps the pace
  they saw on the British Standard scale — 75 · 90 · 100 · 110 · 125 — with
  100 the pace a qualified, motivated worker keeps all shift.
- *At the desk (laptop):* the laps picture; a far lap ringed, tapped to keep
  or strike; the allowances agreed once per line (relaxation, contingency);
  **Set as the standard** writes each element's standard time onto the step
  (`standardSec`, `source: 'timed'`, who, when), and offers **Use as the
  station's pace** on the balance.

**Facts.** A time study: `facts.steps` with `laps` and `rating`;
`agreed.allowances`. "Set as the standard" writes each element's standard
time onto the line standard's step, naming the study.

**Figures** (`lib/ie/balance.ts` `element`): per element the observed mean
of the kept laps, basic = observed × rating ÷ 100, standard = basic × (1 +
relaxation + contingency); the cycle's standard as the sum; cycles needed
for ±5% at 95% from the spread — n = (t·s ÷ 0.05·x̄)², **t Student's at n − 1
degrees of freedom of the laps timed** (Freivalds, *Niebel's Methods,
Standards and Work Design*, ch. 9), never fewer than five; the far lap
flagged. (The ILO's and Barnes's rule of thumb takes t as 2. On the five to
fifteen laps a floor times, t is 2.1–2.8, and 2 claims ±5% at 95% from
what is ±5% at under 90% — so it is the laps' own t. Audit, 13 October.)

**Reading and verdict.** *"Wrap and seal: 0.53 min standard (0.42 observed
at 110, +14%) — from 17 cycles, enough."* Short: *"15 of 17 cycles"*
(amber) — 15 laps with a spread of 0.04 min ask (2.145 × 0.04 ÷ 0.021)² =
16.7, so 17. A step whose time is typed says *"typed"*; one estimated says
*"estimated"* on the step, on the balance and on paper.

**Looks like.** Table left: element · laps · observed · rating · basic ·
allowance · standard · enough. Laps right: a row of dots per element around
its mean tick. Phone: the Lap button, the current element, the split; the
elements as cards after.

**Shows up.** The step's time wears "timed" wherever the step shows (the
map, the balance, the cycle, paper); the balance station's "timed by
somebody" becomes this number.

**Proved by.** 0.42 min at 110 with 14% → 0.527; mean 0.42, spread 0.04 →
15 cycles on the rule of thumb, 17 from 15 laps (t 2.145), 16 from 30 (t
2.045); laps of 10, 11, 9, 10, 10 s → 16 (t at 4 df 2.776), where t = 2
said 8.

## 4. The work balance — the Yamazumi

**The question.** Is the work shared evenly against takt, and who is the
constraint?

**Used.**
- On the line balance page, a second view, **Work**, beside today's
  **Capacity**. Nothing today changes.
- The elements are the standard's steps with a `who`: each person on the
  map (Op 1, Op 2 …) is a stack; the takt line from `Standard.takt`.
- *Drag* an element from one stack to another (laptop) and both bars move;
  on the phone, tap the element and pick the person.
- *Suggest* draws a ghost set of stacks by ranked positional weight (using
  `Step.after` where given, the table's order where not) with its figures
  beside the real ones; **Use it** applies it. A person's stack is closed
  before it passes takt and the next person opened — so when the elements in
  their order will not fit ⌈work ÷ takt⌉ people, the suggestion has one more
  (four 7 s elements at a 12 s takt: 7 · 7 · 7 · 7, never 7 · 7 · 14). Only
  an element longer than takt on its own stands over it.
- *Make it better* on the constraint's stack raises a fix or countermeasure.

**Facts.** A balance study's `facts.steps` (`who`, `after`), reading each
element's standard time from the line standard (or `cycleSec` when no study yet,
marked), `Step.after`, `Standard.takt`.

**Figures** (`lib/ie/balance.ts`): takt; the fewest people = work content ÷
takt rounded up; balance efficiency; balance delay; smoothness; the
constraint; the suggestion.

**Reading and verdict.** *"54 s of work at a 12 s takt — 5 people, 90%
balanced. Op 3 carries 12.0 s — the constraint. Op 5 has 3 s to spare."*
Over takt: *"Op 3 carries 13.4 s — over takt by 1.4 s"* (red on that part
of the stack). *"The map has 6 people; the work needs 5."* (amber, from
the crewing check).

**Looks like.** Table left: element · who · standard · source. Stacks right:
a bar per person, the part over takt red, the constraint named under.
Paper: the stacks and the table on one page.

**Shows up.** The front page's "where the line is limited" line, when a
job is attached; the 6M's **People** and **Method** bones; the balance's
page in the client report.

**Proved by.** 54 s at 12 s → 5 people, 90%, 10% delay; the RPW order on a
six-element precedence set from Helgeson and Birnie's paper.

## 5. The operator's cycle — person and machine against takt

**Used.** On a step with a machine, the time study's lap is split: **Lap**
closes the manual part, **Machine** the machine's run, **Walk** the walk —
or the three are typed. The two lanes draw themselves. **Machines per
person** is a line under the picture, with the cost per pack at the whole
numbers either side; the person decides.

**Facts.** A cycle study's `facts.steps`: `manualSec`, `walkSec`, `machineSec`, `machine`;
`Standard.takt`; the cost rates the line already keeps.

**Figures** (`lib/ie/cycle.ts`): the cycle against takt; idle on each side;
n′ = (l + m) ÷ (l + w); cost per piece at the integers either side.

**Reading.** *"Cycle 5.0 min, within takt. With 3 machines the person waits 0.5 min
each cycle. One person could tend 3 machines (3.3) — £2.92 a pack at 3,
£3.38 at 4."* Over: *"Cycle 6.2 min — over takt by 1.2 min:
the machine waits 1.5 min on the person."* (red).

**Looks like.** Two lanes right, the idle hatched, the takt line. Phone:
full width. Paper: the standard's page.

**Shows up.** On the standard, per person; the 6M's **Method** and
**Machine**.

**Proved by.** l 1, m 4, w 0.5 → 3.33; £2.92 and £3.38.

## 6. SMED — quick changeover (and the interval)

Rowland, 12 October: "For changeovers, you should be making the lean tool
SMED ... and doing everything along them principles. As for, don't assume
5 days, could be 7 days. And this is different than a Pareto ... SMED is to
be a tool that again can be used individually or attached to projects";
"you want to be able to extrapolate it ... X many changeovers on one shift,
then per shift ... the full quantity of what the changeovers are actually
costing you"; "take inspiration from the value stream mapping ... that sort
of grid style"; "we go by plate speed ... of course, unless human"
(`docs/CAPACITY.md` §1, §5, §6). Stored as tool `changeover`; on screen and
paper it is **SMED — quick changeover**, and the rail says **SMED**. A tool,
not a method and not a Pareto: used on its own (a quick session, no line),
on a line, on a job, as evidence for a cause or proof for a fix.

**The question.** How long is the line stopped between two products — and,
stage by stage, how close can it come to single-digit minutes, and what is
it costing until then?

**Used — Shingo's stages, one after another** (the page's chips, one panel):

- **0 Record.** Every element from the **last good piece** of the old
  product to the **first good piece of the new at full rate** — the run-up
  and the adjustments are elements too, and typically half of it. **Lap** on
  the phone (the element, who does it, Internal or External; Start, Next,
  Last), or type it ("5" is five minutes). Each element may say its
  **function** — prepare and check · remove and fit · set and adjust · trial
  run and run-up — and where on the machine.
- **1 Separate.** Each element internal (the line stopped) or external
  (could be done while it runs). The figure: the stop with the external work
  outside.
- **2 Convert.** Internal made external — **prepare in advance**,
  **standardise the function**, **an intermediate jig**. The figure after
  conversion.
- **3 Streamline.** What is left inside: **in parallel** (alongside an
  element, by a named person), **quick-release clamps**, **no adjustment**
  (fixed stops, settings recorded) — each with its target; or **eliminate**.
  External work streamlined too (5S, shadow boards, kits). The figure after
  streamlining.
- **Standardise.** **Set as the standard** writes the agreed sequence, its
  target and its **checklist** — before the line stops · with it stopped ·
  after it runs again — onto the product's line standard.

**The ladder** — now → separated → converted → streamlined, against SMED's
target, single digits — in words and drawn on one scale. Converted and
streamlined are plans: proved only when the changeover is timed again.

**The grid**, in the value stream map's own parts: the elements across in
sequence, a lane per person (or, one tap, per part of the machine), a
square per element — **internal solid ink, external hatched, its letter on
it** (never a new hue; VA/NE/NV are the map's alone) — the plan's mark in
its corner (→E convert, ↓ streamline, ✕ eliminate); a time row (each
column's longest element) and a running elapsed row, with the total and the
work beside it. Elements done at the same time share a column (‖): the
**elapsed** is the sum of each column's longest, the **labour** the sum of
every element by everyone on it. As timed, or **the plan** (targets used,
converted and eliminated out, the parallel moves made). **Play the
changeover**; tap a square and everything about the element opens (what,
who, where, side, function, time, how known, alongside what, the plan,
**Make it better**). On a phone the grid scrolls in its box with the lanes
pinned.

**How the line runs** — asked, never assumed: shifts a day; hours a shift
and the **planned breaks the line stops for** (one for all, or each shift
its own; 0 when relief covers them; the line's own shifts offered); days a
week (5, 6, 7 or typed); weeks a year (for the year's figure); how many
changeovers — a shift, a day or a week, each converted to the others. A
shift **runs for its length less its breaks** (planned production time,
`docs/CAPACITY.md` §5). **The speed** a stop's packs are counted at is the
critical machine's **plate speed** off the product's line balance — or a
timed person's, where people set the pace (`lib/capacity lineSpeed`) —
else the standard's target or the line's rated speed, each said as **not a
plate speed**, else typed and said so.

**Make it better** raises the fix or countermeasure in the element's SMED
action — *"Set the jaw temperature — convert to external (prepare in
advance), 3 min"*; the element wears the branch on its row and its square.
**Prove it** carries the elements (not the plan), timed or typed again one by
one; before → after reads against the evidence's plan.

**Facts.** A SMED study's `facts.sequence` (each element: `name`, `sec`,
`side`, `source`, `crew`, `where`, `fn`, `alongside`, `plan` {kind, how,
note, targetSec, alongside, crew}, `when`), `fromProduct`, `toProduct`,
`running` {shiftsPerDay, hoursPerShift | shiftHours, breakMin |
shiftBreaks, daysPerWeek, weeksPerYear}, `changeovers` {count, per},
`ratePerMin` + `rateFrom` (plate · person · standard · line · typed) +
`rateStation`, and the interval's `products`. Lists by id, merge-safe.
Older records' `perWeek` and `availableMinPerDay` are still read.

**Figures** (`lib/ie/changeover.ts`, pure): `arrange` (columns, elapsed,
labour, at each rung); `ladderOf`; the function shares; per shift → day →
week → year: minutes stopped, packs at the speed, and **the pounds in two
parts** — idle labour (crew × wage × on-costs, `lib/cost`) and the
contribution lost **if the packs cannot be made up** (packs × margin) —
never one figure, none without the line's cost settings (§6 of
CAPACITY.md); the share of the running time; the interval: free = running −
Σ run, every product every n × changeover ÷ free days, and the changeover a
daily interval needs.

**Reading.** *"42 min now → 33 min separated → 27 min converted → 9 min
streamlined (17 min of work, some in parallel), planned — proved when it is
timed again. Single-digit minutes — SMED's target."* *"Now 42 min × 3 a
shift × 2 shifts × 7 days = 29.4 h a week stopped (28% of the running time)
— 176,400 packs at 100 a minute, the Bagger's plate speed; £5,880 of idle
labour, and £8,820 of contribution if the packs cannot be made up.
Streamlined to 9 min: 6.3 h a week — 23.1 h back, if the plan holds."*
*"Setting, adjusting and trial runs: 15 min of 42 min — 36%; they are
typically half a changeover, and the first to eliminate."*

**Shows up.** The tool's page (SMED); under the product's standard (the
newest SMED, the agreed standard with its plan, "Start a SMED ›"); the line
tools page; the job's line card ("SMED"); the 6M fishbone on **Method**
(the external work still inside the stop) and **Machine** (setting and
trial runs; the longest internal elements); both reports' Evidence — the
grid as a table (#, what, who, where, I/E, the plan, time, elapsed, how
known; the totals with the work by everyone on it), then the ladder, the
cost in two parts and the interval in words.

**Proved by.** The interval: 450 − 300 = 150 free; 5 × 42 = 210 → 1.4 days;
5 × 27 = 135 → 0.9 days; 15 × 6 = 90 min a week. The ladder and the cost
(the test's worked example 2): 42 → 33 → 27 → 9 min, 17 min of work; 2
shifts × (8 h − 30 min) × 7 days = 105 h running; 42 a week × 42 min = 29.4 h
(28%), 176,400 packs, £5,880 + £8,820; × 48 weeks = 1,411.2 h.

**As built** (12 October, `docs/BUILD.md` tool F): no new table and no
migration — the study's `facts`, and the agreed sequence as
`capacity.changeovers[]` on the to-product's line standard, one per product
it is changed from, inside the existing jsonb.

## 7. A shift's losses, by hand — and what they cost

**The question.** Of what the line should have made, where did the rest
go? The time model is the practice's (`docs/CAPACITY.md` §5–6), counted by
hand; Rowland, 12 October: "we go by plate speed ... of course, unless
human."

**Used.** At the end of the shift, on the phone: the shift picked (or the
window typed), **good packs made** and **rejects** typed. The **planned
minutes** are worked out — the shift less its planned breaks, from the
line's settings (each shift carries its breaks, and whether relief keeps
the line running through them: then none come off) — and changed for the
day only with a reason kept beside them. The **rate** is the
bottleneck's **ideal speed** — the slowest station on the line's capacity
at running speed, in the line's unit (the product's line standard, else
the job line's balance): a machine at its **plate speed**, a person at
their **standard time** (from the time study, or their pace as timed) —
said "plate speed of the Bagger", "standard time of Op 3 (the time
study)" or "Op 3's timed pace"; the standard's target only when no
station on the line has an ideal speed, said "not a plate speed"; else
typed, and why (a pace-setter on a guess). The stops were
logged in Capture through the shift. While it runs, the **running speed**
is timed — the packs off the line in a timed minute, a list, each with
when and who. The waterfall draws itself: planned → stops by cause →
changeovers → rejects → **slow running and short stops** → made. **Make
it better** on any bar raises the countermeasure with the figure in its
words.

**Facts.** A loss-count study's `facts.losses` (the shift, the window, its
breaks and relief, the planned minutes and why when changed, packs made,
rejects, the rate and where it is from — `rateFrom` plate · standard-time ·
standard · typed, with `rateMachine` or `ratePerson`) and `facts.timings` (the running speed timed, id-keyed, struck
never erased); the `Observation` stops in the window; the line's cost
model.

**Figures** (`lib/ie/losses.ts`): expected = planned × the ideal speed; lost
minutes = (expected − good) ÷ rate; the stops by cause and the changeovers
(availability) — planned less them is the **run time**; rejects ÷ rate
(quality); the rest is the performance loss, **slow running and short
stops** — running below the ideal speed and stops too short to log, not
yet told apart. With the running speed timed, as Nakajima's loss structure
tells them apart: the packs run (good and rejected) ÷ the running speed is
the **net operating time**; slow running = it − the packs ÷ the ideal speed,
never more than the rest — on People when a person paces the line; short
stops = the run time − it, what is left. The pounds in **two parts**, never one blended figure: idle
labour (crew × wage × on-costs × minutes) and lost contribution (packs not
made × price less materials a pack, or the line's margin a pack) — "if it
cannot be made up". No cost on the line, no pounds.

**Reading.** *"Shift 1 should have made 45,000 at 100 a minute; made
36,500 — 85 min lost: 52 min of stops · 18 min of changeovers · 6 min of
rejects (600 packs) · 9 min of slow running and short stops. £107 idle
labour · £340 lost contribution if it cannot be made up."* Under it, how
every number is known: "480 min shift − 30 min of breaks = 450 planned ·
the rate is the plate speed of the Bagger · …". The rest — or either part
of it once timed — is amber when it is more than a tenth of the loss; it
is never hidden and there is no percentage score.

**Looks like.** The waterfall right; the causes as a table left, each with
its stops, its minutes, its idle labour and its lost contribution; the
count under them, the running speed beside it. Phone: full width, the
count first until it is in. Paper: the table — the head says how the
planned minutes and the rate are known; two columns of pounds.

**Shows up.** The line's board beside the Pareto; the line's card; the
line's row in the control room; the fishbone's suggested causes (the
biggest bars on their bones — slow running and short stops only once
told apart, the slow running on Machine or, when a person paces the line,
on People); the line's settings (each shift's breaks); the 6M
and client reports' Evidence.

**Proved by.** 480 − 30 = 450; 450 × 100, 36,500, 85 min, 52 + 18 + 6,
9 of slow running and short stops; 37,100 packs run ÷ 98 = 378.57 min
net, − 371 at the plate = 7.57 slow running, 380 − 378.57 = 1.43 short
stops; 4 × £14.50 × 1.3 = £75.40 an hour × 85 ÷ 60 = £107 idle labour,
8,500 × £0.04 = £340 lost contribution; and with Op 3 packing a case of 10
every 6.25 s, 96 a minute, slower than every machine: 450 × 96, 90 lost, 14
the rest, 35,136 ÷ 93.2 − 35,136 ÷ 96 = 377.0 − 366 = 11.0 slow running on
People, 3.0 short stops. (The split was run × (ideal − running) ÷ ideal
until the audit of 13 October: it ran the line at the timed speed through
its short stops too.)

**Cost deployment** is the same figures across weeks, in pounds, ranked:
the existing Pareto in £, each loss pointed at its cause on the fish, and
each countermeasure's saving and payback from what it says it should
change. No new record.

## 8. The ramp-up and the pace — the stage gate's two forecasts

**Ramp-up.** A product's performance runs on successive days
(`Test.runs`, nothing new) are dots climbing to the agreed-rate line. From
three runs, `lib/ie/rampUp.ts` fits the learning curve on the time per pack
(log against log), reads the learning rate, and says the run at which the
agreed rate is met, turned into a date by the runs' own cadence. *"At this
climb, 120 a minute about 22 Oct (85% curve, 4 runs)."* Under three: *"Too
early — 2 runs."* (grey). A climb is drawn, not promised: the sentence
always says "at this climb".

**Pace.** Earned schedule on the stages (`lib/ie/pace.ts`): the day the
plan had as many stages done as are done today; the pace; the forecast for
Hand over. *"At the pace so far, Hand over lands about 31 Oct — 9 days after
the date now expected (22 Oct)."* Shown beside the date people set, never
over it; **Use this date** is the owner's. Under five finished stages:
*"Too early to tell."*

**Looks like.** The climb: dots, the rate line, the fit dashed, the date
labelled. The pace: a third marker on the plan, dashed, in words.

**Shows up.** Ramp-up: the run's card, Commission, the front page, the
client report. Pace: the front page under the verdict, the plan, Today's
update, the client report, the one-page status, the control room's row.

**Proved by.** Elapsed 39, earned 28, planned 43 → 31 Oct; an 80% curve, b
= −0.322.

## 9. Work sampling

**Used.** A sampling study is started (quick, or on a line): the
activities (working · walking · waiting · searching · away, editable), who
is watched (people or roles), the margin wanted. The phone **prompts at
random moments** across the shift — while the app is open, as reminders do
today, since there is no push for it yet — and one tap records what each
person was doing. Each tap is a fact on the sampling study (`facts.taps`),
and the shares are drawn with the Pareto's own ranked bars.

**Figures** (`lib/ie/sampling.ts`): each share with its margin (p ± z√(p(1 −
p) ÷ n)); taps needed for the margin wanted; the meter.

**Reading.** *"Op 2: working 61% (±7), walking 18%, waiting 14%, searching
7% — from 190 taps; 175 more for ±5 points."*

**Shows up.** The Pareto; the 6M's **People** and **Method**; the pace
report.

**Proved by.** p 0.30, E 0.05 → 323.

## 10. Capacity's three numbers, and the product mix

**Three numbers.** On the balance, each station gains design (the plate),
effective (less the planned losses per shift: `Capacity.plannedLossMinPerShift`)
and actual (from the shift's readings): utilisation = actual ÷ design,
efficiency = actual ÷ effective, loading against demand. Drawn as three
marks on today's bars. *"Demand needs 92% of what the line can really
make."*

**The mix** (`lib/ie/mix.ts`). Per product, `Standard.throughput` (price
less materials per pack, demand a week) and the constraint's speed on it
from the balance. Throughput per constraint minute; the products ranked;
the constraint's week filled in that order up to each demand; what is left
unmade. Ranked bars (the Pareto) and the week filling like a tank. *"A
earns £32 a constraint minute, B £24 — A first. The week fills at 94%;
1,200 of B unmade."*

**Proved by.** 148,000 ÷ 201,600, ÷ 175,000; £0.40 × 80, £0.60 × 40.

## 11. Ergonomics — can people do it all shift?

**Used.** On the line standard's map, tap a person: **Assess**. Pick the
method that fits the task: **lifting and carrying** (HSE's MAC: the load,
where the hands are, how often, the posture, as the sheet asks, one tap
each); **repetitive arm and hand work** (HSE's ART); **the whole body**
(REBA: the positions tapped on a figure); or the **NIOSH lift** (the
horizontal and vertical distance, the travel, the twist, the frequency,
the grip). The score is said in the method's own bands, in words and
stepped marks. The assessment is kept on the person mark with who and when,
and **Make it better** raises the countermeasure on **People**.

**Facts.** An ergonomics study: `facts.method`, `answers`, and `who` — the
person on the map it assesses, which then wears its band.

**Figures** (`lib/ie/ergo.ts`): the NIOSH recommended weight limit and
lifting index; the MAC, ART and REBA scores from their published sheets
(HSE's are Crown copyright under the Open Government Licence, reproduced
with attribution; NIOSH's are public).

**Reading.** *"Lift: 13 kg against a limit of 11.4 kg — index 1.14,
increased risk."* (amber) · *"REBA 9 — high: investigate and change."*
(red) · *"MAC ▪▪ amber band: the load is lifted from the floor."* Always:
*"A screening tool, for a trained assessor — not a full risk assessment."*

**Shows up.** The person on the map; Hand over's standard; the 6M's
**People**; the standard's page.

**Proved by.** The CCOHS example: 23 × 0.83 × 0.78 × 0.85 × 1 × 1 × 0.90 =
11.4 kg; 13 ÷ 11.4 = 1.14.

## 12. Layout, crewing, skills — briefly

**Layout.** On the standard's photo, draw a **path** (a mark of kind
`path`); set the map's scale once by tapping two points and saying how far
apart they are; the distance per trip and per shift is worked out; two
standards compared side by side (the what-if pattern). A from–to table of
trips between areas gives Σ trips × distance to compare layouts.

**Crewing.** The balance's fewest people against the map's headcount:
*"The map has 6 people; the work needs 5."* Labour efficiency from the
shift's readings: earned hours = standard minutes × packs ÷ 60, against
hours worked. *"Shift 1: 38 earned of 48 worked — 79%."*

**Skills (later).** Each person's level on each position of the map —
learning · can do it · can train it — as a matrix; cover and gaps by shift.
It needs people as records, which the app keeps only as project members
today; it waits.

---

# Part 5 — How it is built, in slices

Each slice ships live on its own, through the gate, with its paper page
in `reportSeeds` and `report-stress`, its screens in `smoke`, its module's
unit tests from the worked examples, and its sync scenario where it adds
a list. Nothing is built until the decisions below are agreed.

| Slice | Ships | Records | Modules | Parts | Paper |
|---|---|---|---|---|---|
| **0 + A. The ecosystem, proven by the capability study** | Part 0 whole — the study record, Not filed, on a line, on a job, Used for, How we know, Prove it, Take the readings, Make it better, before → after — with the capability study as its first tool: agree the limits; the number pad and ticks; the dots; the verdict and the capability sentence; the packers' rules; the Commission square, Needs you, the day | `studies` (new table, policies); sync merges lists by `id` | `sample`, `compare` | 1 2 3 4 9 15 16 | the account, the Evidence appendix, the handover pack, the test report |
| **B. The step table and the map** | a value-stream study; Walk it; typed; from the film; the time bar; Show only the waste; Make it better; Copy to future; Set as the standard | `standards.steps`, `takt` | `steps` | 1 2 5 6 15 16 | the map's page |
| **C. The time study** | Lap; rating; foreign; the laps picture; allowances; Set as the standard; Use as the station's pace | `standards.allowances` | `timeStudy` | 4 10 16 | the standard's page |
| **D. The work balance and the cycle** | the Work view; stacks; drag; Suggest as a ghost; the two lanes; machines per person | — | `balance`, `cycle` | 7 8 | the balance's page |
| **E. A shift's losses** | a loss-count study per shift; the waterfall; pounds; Make it better | — | `losses` | 11 | the pace report |
| **F. The changeover and the interval** | sides; the split bar; the interval line | `standards.changeovers` | `changeover` | 14 | a page |
| **G. The stage gate's forecasts** | the pace; the climb | — | `pace`, `rampUp` | 12 | the client report, the status |
| **H. The rest** | three numbers; the mix; sampling; ergonomics; layout; crewing | `standards.throughput`, `plannedLossMinPerShift` | `mix`, `sampling`, `ergo` | 13 | their pages |

**Recommended order: 0 + A, then B, then C, D, E, F, G, H.** The
ecosystem comes first, because every tool lives in it (Rowland: "you need
to build that first"). It ships with the capability study because an
ecosystem with no tool in it cannot be driven in a browser, and because
Rowland named Cpk and it changes the stage gate's "how do we know it works"
at once. B is the flagship, and every later tool reuses its table.

**Inside 0 + A, in order:** the record and its policies, read back; the
sync merge of a list by `id` and its two-phone scenario; the `ie-` parts
1–4, 15 and 16 as shared components; the doors and the branches; the
capability study; `lib/report` blocks for the strip, the says line, the
dots and the Evidence appendix.

---

# Part 6 — Decisions for Rowland

0. **The one new record** (Part 0): every use of a tool is one record — a
   study — that can be on its own, on a line, on a job, and evidence or
   proof for its problems, fixes and tests; work (a snag) still moves,
   evidence links. It is the only new noun the toolkit asks for, and the
   reason none of the five existing lists fits is in Part 0. Agreed?
1. **The one frame and the sixteen parts** (Part 3). Is this the look? A
   clickable mock-up of the parts with real figures, in the app's tokens,
   can be made before any of it is built, so you can hold it.
2. **Value by fill, not hue** — adds value solid, needed light, waste
   hatched grey — keeping red, amber and green for state. Or a sixth
   colour?
3. **Cpk's words and lines**: capable at 1.33, just capable from 1.00,
   shown from 25 readings. Different numbers?
4. **The packers' rules, plainly.** The regulations' own reference test
   uses set sample sizes and a factor on the mean; the app would apply the
   three rules plainly to the readings and say so. Enough for the line, or
   the legal test exactly?
5. **A study's scope**: a line and, where it matters, a machine and a
   product. A value stream door to door across lines would sit on a
   "plant" line with the product family as its product. Enough?
6. **Work sampling's prompts** come while the app is open (no push for it
   yet). Acceptable for the first cut?
7. **The order**: 0 + A (the ecosystem with the capability study) first,
   then B (the map)?
8. **The word "Line balance"** keeps the page, with two views, Capacity
   and Work (decision 5 of `docs/LEAN40.md`).
