# Faultline — how work gets delivered here

## The memory is the repo

The builder keeps nothing between sessions — only what is written here
survives (Rowland, 15 October: "I actually didn't know that ... of course, I
want the memory written in"). So before building, read what is built and how
(`docs/BLUEPRINT.md`, the docs it names, the code); after building, write down
what changed where the next session will look. **`docs/PAGES.md` is what each
page must show**, checked in the gate by `scripts/inventory.mjs` — a thing
taken off a page is taken off its list in the same commit, with the reason; a
thing that vanishes by accident fails the gate. Before shipping anything a
person sees, take the pictures on live and on the change (`--shots`,
`--compare`) and look at every page that moved. A new page or a new shape of
the data adds its lines and its seed; a check tests the drawn thing, never the
box it sits in.

## The direction comes first — 20 October

**Read `docs/DIRECTION.md` before anything else**; where an older document
disagrees with it, it wins. Faultline is for Rowland's team first and sold
later: its tools and its three kinds of change on the line, every finding in
money, worked out by formulas. The only AI is **the voice and the camera**
(Rowland, 20 October): the voice note in typed boxes, **Line Talk**
(`docs/LINE-TALK.md` — talk on the line, it makes the reports) and the video
study's *Name the work from the frames*. Never the app's driver and never a
builder of methods, templates or tools: the method builder and its assistant,
*Better wording* and the AI answers in *Ask* were deleted the same day at his
word (`docs/DIRECTION.md` — the builder had 0 records in the live database).
Line Talk's answers are **Claude's, through the `assist` gateway only** (task
`talk`, the key server-side, an allowance a person a day, the core shared with
the app by `scripts/sync-assist.mjs` — Rowland, 20 October: "Claude only ... Do
not use Gemini or introduce another AI provider"); its hearing is the phone's
own speech recognition (`tools/talk/hearing` — "Use the phone's own speech
recognition instead of Gemini", the same evening), live and free, writing
into the message box as a chat's dictation does, then Send — nothing recorded
(21 October: "I see my words come up on the interface. I simply press send";
where the browser will not listen, the keyboard's own microphone is said, and
writes into the box the same way). It talks back as a colleague does — answers
what was said, asks back, builds on the answer, never a template — its reply
appearing as it is written (21 October: "we ask questions to each other in
natural language, none scripted"; `docs/LINE-TALK.md`, Talking with it).
Gemini is left only in the
voice note of the forms' boxes (`api/voice`). A talk works with the assistant
off: everything said, typed and photographed is kept, and an answer waits or
says why.
Nothing new is built until Rowland says go.

**Steady comes next — 23 October.** Rowland: *"I just want organisation and
stability in the app ... make a design that ensures it all works."* After
J3 (`docs/JOURNEY.md`) and before anything new: `docs/STEADY.md` — one
reader per scope, one number everywhere (a gate check), one place per thing
in the code, one answer per project kind — in four slices that change
nothing a person sees. S1 is built (§5 of the doc: what it found); S2 is built (§6: `src/project/projectRead` the one reader, `src/project/projectKind` the one answer per kind — read a project through them, never twice). S3 is built (§7, 23–24 October — the ten tools moved on 24 October, a commit each): **the code in its places** — `src/project/` (the reader, the kinds, `journey/`), `src/line/report/`, `src/tools/<key>/` (a tool by its catalogue key, `reliability/` first); a new tool is built in its own folder, an older one moved when next worked on, with `scripts/moves.mjs` (moves files, keeps every import true) and proved by tsc, the tests, the catalogue's test and the gate. S4 is built (§8): the four biggest files split at their own seams — the stage-gate paper a sheet a file (`lib/paceReport/`), the A3's pages and the 6M report's screen apart (`screens/paceReportPages`, `screens/SixMReportScreen`), the 6M report's model apart from its paper (`lib/sixmReport`), capacity's sums apart from how a figure is written (`tools/linebalance/capacityWords`) and what the result says (`tools/linebalance/capacitySays`); the old file re-exports what left it, so every import stands.

## The project is the workspace — 21 October

**Read `docs/PROJECTS.md`.** Rowland, 21 October: *"a project is the project
and everything is inside the project ... all of them tools that you use are
within that project automatically ... Everything will then automatically
always go to the action tracker within that project."* So: one word,
**project** (never *job* on a screen or paper); open a project and the app is
that project — its method, its tools, its problems, its **Actions** (who is
doing what, why, where, by when, with its priority), its reports, Line Talk
— and whatever is done inside it lands in it with no *Use it for*. The factory
stays shared (a project points at its lines — asked and chosen); work with no
project stays on its line and is moved in with a tap; the control room sees
every project's actions at once. Built in slices P1–P4 (the doc's table).
P1 (one word) and P2 (a tool's page inside a project keeps its rail, lists
its own, and makes new ones on it — `lib/inProject`, `?project=` on the
address; a study, talk or product wears its own project) are built, and P3
— the project's **Actions** (`#/project/:id/actions`, lib/projectActions,
read the way Needs you reads every thing owed, plus the register's
problems; by who, when or where; paper for the meeting and each person),
and P4 — *Every action* under the control room (`#/actions`): every
project's actions and every line's own problems, by project too.

## A manufacturing tool is built by the standard — 22 October

Rowland, 22 October: *"When I return to Claude Code in a future session and
request a new tool, I should not need to repeat this prompt."* So **any request
to build, improve, extend or materially change a manufacturing tool or its
report — "build FC-012", "build the SMED…", "the next three", "improve the
capability study", a new calculation, verdict or paper — goes through the
`faultline-tool` skill** (`.claude/skills/faultline-tool/SKILL.md`), held to
**the quality bar in `knowledge/STANDARD.md`** (the same evening: *"every tool
must be technically trustworthy, functionally appropriate, professionally
presented and properly reported. Completion must be demonstrated by
evidence, not claimed by appearance"*) — designed around its method, not a
template; substantive; its report specified and built with it; professional;
the app protected; done by evidence; the catalogue kept truthful. The skill
follows the standard's workflow: resolve it in the catalogue
(`node scripts/catalogue.mjs show|search|next`), read its knowledge records
(`knowledge/methods/`), write the specification from
`knowledge/specs/TEMPLATE.md` **before any code**, validate every formula with
independent cases, build, test, and update the catalogue's status, the records
and `knowledge/SUMMARY.md` (`node scripts/catalogue.mjs summary --write`). An
entry is *available* only when its intended functionality, acceptance
criteria, tests and report are verified: its code, unit tests and an
acceptance script in the gate exist, and its specification has its scope,
its facts said apart from its choices, its report and its acceptance criteria
naming that script — `src/catalogue/__tests__/catalogue.test.ts` refuses it
otherwise (the tools available before 22 October are listed in
`AVAILABLE_BEFORE_STANDARD`, a list that only shrinks), and checks that every
rail tool has an entry. `knowledge/README.md` is the map (the library, the
catalogue and its backlog, the directory in the app — *Every tool* at `#/tools`, from the front door — and the standard);
`knowledge/GAPS.md` is what is not known well enough yet. The catalogue is the
full opportunity, never a plan to build it all: `docs/DIRECTION.md`'s "deep,
not wide" still decides what is built, and "nothing new is built until Rowland
says go". If the skill or the library cannot be read, say so — never claim the
process was followed.

## Every machine is on a line; a dual line — 23 October

Rowland, 23 October, designing the combined line report: *"Can't have a
machine without a line ... Everything needs to be under a line"*; and *"2a 2b
are 2 lines but they happen to be a dual line ... I have experiment happening
in 2b and 2a and I also have to run other tools on both. I call it then 2a
2b"*; *"we'd need some way of being able to attach it ... like a connector."*
So: **a machine is on a line, always** — made on its line (Set up the line),
or on a project on one line, where it takes that line (`lib/lines`
pinToProjectLine, before a project's lines change; `supabase/
PIN_PROJECT_MACHINES.sql` for what was there); a machine named on a tool, a
problem or a walk joins its line's list (`machineOntoLine`), so every Machine
box offers it under one name (P160 is "Pick and Place" —
`NAME_PICK_AND_PLACE.sql`). **A dual line is a line of the factory made of
other lines**: `workspaces.made_of` (`DUAL_LINES.sql`), set by ticks under
*Made of* on Edit the line, never in code; `lib/lines dualOf` reads it both
ways (made of · part of), `dualSaid` says it under the line's name, on Your
factory, the control room and every paper's band, and `machinesOf` offers a
dual line its lines' machines. **The combined line report** (`lib/lineBundle`, `lib/lineBundlePdf`,
`screens/LineReportScreen` at `#/lines/:ws/report`, reached from the line's
Report ▾ with `?save=1` and made on arrival): everything carrying the line's
name — every tool used on it, its programs, its problems, where on the line a
finding points, who owes what by when — laid out as one report, the full
version of the one-page line report and never a third kind of paper; a tick a
tool record, the newest of each tool in by default; each tool's section printed
with its own paper's blocks (`studiesPdf studyBlocks`, `capacityPaperPdf
productLeanBlocks`) so the two can never disagree; a dual line as each of its
lines then *Both lines together*; a single line's report says only what is on
it; no AI — every figure a formula's. The single reports stay. Rowland, 23
October: *"I want to be able to provide an immersive combined report ...
including even programs ... but still allow the flexibility to do single
reports."* `scripts/acceptance/dual-lines.mjs` and `line-report.mjs` prove
them.

## Every planned tool is built, by wave — 24 October

Rowland, 24 October: *"I would like to build every tool that we have planned
for … once we've made the tools … put together toolkits for specific reasons
… there's my toolkit, and I can run these analysis using the toolkits."*
**Read `docs/TOOLS-BUILD.md`**: the 167 entries not yet available are built in
eleven waves by shared mechanism (W1 the capability study's modes, W2 charts,
W3 statistics, W4 the gauge, W5 reliability and maintenance, W6 checks, W7
people and work, W8 flow and planning, W9 the quality system, W10 research,
W11 toolkits by reason) — one specification, one acceptance script and one
gate per wave, each tool held to `knowledge/STANDARD.md` through the
`faultline-tool` skill, the catalogue kept truthful, §4 of that document
saying what each wave shipped. A toolkit is a reason with its tools in order
(`src/catalogue/toolkits.ts` when built), never a second list of tools.

## The structure — approved 23 October

**Read `docs/STRUCTURE.md`.** Rowland, 23 October: *"I agree do them all"* —
the whole app as three scopes (the factory, a line, a project) and a library
of tools; a rail per scope, one context bar and switcher, one phone bar per
kind of scope with ＋ opening on a new problem, one page header with Report ▾,
one tool shell, the tools listed by their kind (a study under the scope's
*Tools*, a standard under the line's *Products*, a log under *Logs*), the
catalogue the one list of tools. Built in slices B0–B8 (§10), each live on
its own and done only by §18 — nothing broken (the routes kept, paper parity,
the client and team passes), easier as measured (`scripts/journeys.mjs`
against `docs/structure/journeys-baseline.json`, none longer), coherent in
every kind of scope, still small at 30 lines and 50 projects, and walked by
Rowland. §20 says what each slice has done; no slice changes a record, a
policy or an address.

**Since B2 every page is in one scope** (`lib/scope`, from its address and
what it is of): the frame draws that scope's rail (`ui/rail` factoryGroups,
lineGroups, projectGroups — the way up first, the scope's own pages only),
its phone bar (`scopeBar`, fixed within a scope, ＋ in the middle) and the
context bar (`ui/ContextBar` — *Factory › Line 7 › Tools*, the scope's name its
switcher, ↑ Factory, the tool's name on one of its records going back to its
list). A new page added under `/project/:id` or `/lines/:ws` sits in its scope
with nothing listed; a new rail line is a page of its scope, never a list of
lines, projects or tools (the tools are each scope's *Tools* page, read from
the catalogue's registry, `src/catalogue/registry`).

**Since B3 and B4 every page has one header and every tool one shell.** A
page is drawn with `ui/parts` PageHeader — one title, what it says, one
primary, More ▾ for its other actions, Report ▾ for every paper it has, each
named for what it is (never *PDF*, *Print* or *Report*); a paper drawn on its
report page is reached from another page's Report ▾ with `?save=1` and made
on arrival (`lib/useSaveOnArrival`). A tool's record wears the shell
(`ui/StudyActs` StudyBand on a study: Rename and Delete in More ▾, its paper
in Report ▾; `ui/StudyPlace` WhereItSits — *On Line 7 · in … · Change*, the
one Belongs to), and one thing seen several ways is ViewTabs, never a row of
link buttons. A new page or tool takes these parts, and its acceptance
script presses by name through `scripts/lib/pageHeader.mjs` (the page's own
button, else the menu), so a control moving into a menu never breaks it.

**Since B5 each place has one job and each thing one word** (§5.6, §5.7).
Home is yours — *Carry on where you were* (`lib/recentPlaces`, noted by the
frame on this device only, never synced), what is under way by name, start
a project, a tool; the control room is the factory's; Projects lists the
projects (by kind and line, the archive behind its chip). The words: a page
is *Problems*, *Actions*, *Tools* — the context bar says whose — never
*Control room problems*, *Every action* or *Every tool*; the filter is *All
lines*; the smoke test fails on the old names as a title, door, button or
chip. A 6M or lever-tree project's Numbers and Wins are one page, *Results*,
with two views, and its Evidence — the filmed line — is on its *Tools* page
(D9; `?view=snags` lands there, a stage gate's on Install).
**Since B6 the line study is the line's first log, *Stops timed*** — named
at the top of its page, its four screens (Capture · Analyse · Evidence ·
Meeting) tabs on it at a desk as on a phone, none of them a rail line; the
rail lights Logs on a line, the line in a 6M project, the Plan in a stage
gate.

**Since 23 October there is one home and one menu** (Rowland: "What's the
point of home? ... The control room, is it required? ... I literally start
using it and I've got no idea where I am. I lose myself"; the shape chosen,
*one home, a fixed menu*). `#/` is the **Factory** page (`screens/WorkspaceHome`
— what was the control room, `#/room` kept; the front door is gone: its three
kinds are New project's, its tools the page's *Use a tool* row and Tools,
*Carry on where you were* and Line Talk on the Factory page). The rail is
**one menu on every page** — Factory · Projects · Problems · Actions · Tools,
Reports at the foot (`ui/rail` menuGroups; Factory lit inside a line, Projects
inside a project) — and the phone's bar is the same five everywhere (Factory ·
Projects · ＋ · Problems · More, `menuBar`). A line's, a project's and the
factory's own pages are **tabs across the top** (`scopeTabs`, `factoryTabs` —
from lineGroups and projectGroups, which stay the one list of a scope's
pages; a page folded under a tab lights it, a machine its Plan). The context
bar starts with **the way back** (‹ Factory from a line, ‹ Projects from a
project) and says a project's line (*on Line 7*, one tap). A new page of a
scope is a tab; nothing is ever added to the menu. A script reaches a scope's
page by its tab (`.nv-tabs .nv-tab .nv-tab-l`), the menu by `.nv-rail .nv-ri`.

## The blueprint comes first

**`docs/BLUEPRINT.md` is the one map of the app** — agreed with Rowland, 13
October ("yes to all, start stage 0"), after: "we are building the app bit by
bit ... old system entangled with new models ... design the app, the parts we
missed, and plan the full build." Four layers (control room · your factory ·
on the line · jobs), one home per real thing (§2), what each place is for
(§3), where each record shows (§4), what is old (§5), what was missed (§6),
the build in stages (§7). Every request is placed on it before it is built
(§8): which layer, which record, where it shows, what it replaces — and if it
needs a record not in §2, the blueprint changes first, in the same commit.
The obvious next piece is written into §6 without waiting to be asked.

## What this is

**Faultline is a control room for change on production lines.** Decided with
Rowland, 1 October, and it is his own wording from the start — the Verdict
card's header quotes it: *"show the business a formal process, to show that I
am in control of the project."*

- **The unit is a change to a line.** New equipment, a line that has to
  perform better, a number that has to be hit. Many changes happen on a line
  at once, and the ops lead has to be in control of all of them and able to
  show it. That is the problem this solves, and it is the moat.
- **The three methods are three kinds of change**, not three apps (below).
- **Everything else is a tool used inside a change** to see, decide or prove
  — the stopwatch, the Pareto, the filmed walk, the line standard, the tests.
  A tool never becomes a method, and never sits beside a change.
- **The record is the project.** Do not add a "change" noun beside it.

What it must always do, in this order — see, understand, commit, prove, show:
start a change from the situation (not from a method picker); give every
change a measured before and after; and keep one view above all changes that
answers "am I in control?" across every line and job.

**Before building anything, say which change it belongs to, which record it
reads or writes, and where it shows up in the control-room view and the
report.** If it has no answer, it is a feature, not part of the control room.

## The three methods

Running projects on a factory floor, three ways. Rowland, 30 September:

> "I've built three individual project methods ... I want to be able to use
> this in multiple business scenarios, because my work is so diverse."

- **Stage gate** — new equipment taken through its gates (install stages,
  tests against what was agreed, fixes, what it waits on) to handover, with
  the OEM. Stored as `commissioning` on the project; never shown under that
  name — commissioning is one gate in the middle, not the method.
- **6M** — a running line made to perform better, as a root cause analysis
  (replaced "3P" on 4 October; `docs/SIXM.md` is the design). The gap → the
  problem (the head of the fish, from the Pareto, the constraint or something
  seen) → causes on the six bones — **People · Machine · Method · Material ·
  Measurement · Environment** (`src/lib/sixm.ts`) — each drilled with the five
  whys → countermeasures (the actions on the board, with what they should
  change) → proof on the same number → holding. The fishbone is its journey,
  as the Gantt is stage gate's: it fills itself from the Pareto, the walk, the
  standard and the line balance, and every cause says how it is known
  (measured · counted · observed · reported). Kept entirely in the app — Rowland,
  1 October: "There will be no Excel that needs to be uploaded ... this is about
  now fully using the app." Stored as the `board` model; the problem is a `case`.
- **Lever tree** — one outcome worked down to what has to be true for it.

**The capacity model is LINE CAPACITY; the people's work is the LINE
BALANCE.** Rowland, 12 October: "the line balancing is actually a capacity
model ... I worded it as line balance"; the name asked and chosen: *Line
capacity* — stations in flow order, machines and people, each in its own
unit converted down the line, the bottleneck once stops count, and the
V-curve, laid out as a grid like the value stream map (`docs/BUILD.md`, Line
capacity). Then, 17 October: "line balance is about a more manual people
process flow analysis visual of what is happening where and what people are
doing" — so the people's work, timed against takt, is the **Line balance**,
a tool of its own (it was Line capacity's People tab), linked: the target is
Line capacity's and the takt follows it; a person is put at a station and
that people station's speed is their timed cycle; what the bottleneck costs
a pack and a minute is said for the client; and **All together** reads the
three on one page, editing none (`docs/BUILD.md`, The line balance, its own
tool; `tools/linework/balanceLink`). Toyota's three forms: Line standard the chart,
Line balance the combination table, Line capacity the capacity sheet. Never
call it *the time study* or *the work balance* on a screen.

**SMED is a tool, not a method and not a Pareto.** Rowland, 12 October: "For
changeovers, you should be making the lean tool SMED ... and doing everything
along them principles. As for, don't assume 5 days, could be 7 days. And
this is different than a Pareto ... SMED is to be a tool that again can be
used individually or attached to projects, etc., like all the other tools."
So the changeover tool is SMED on screen and paper (stored as `changeover`),
worked through Shingo's stages — record (last good piece to first good piece,
the run-up and the adjustments included), separate internal from external,
convert internal to external, streamline what is left, standardise — against
single-digit minutes. The days a line runs are asked, never assumed. And,
the same day: "you want to be able to extrapolate it ... the amount of hours
as well of running time, because we could have different shifts ... X many
changeovers on one shift, then per shift, and then you're able to
extrapolate the full quantity of what the changeovers are actually costing
you" — so the running pattern (shifts, hours, days) and the changeovers a
shift are asked, and the cost is said per shift, day, week and year, in
minutes, packs and pounds, with what each stage buys back. "Take
inspiration from the value stream mapping ... that sort of grid style" —
so SMED is a grid like the map's: elements across, a lane per person, I · E
by fill and letter (never a new hue), parallel work in one column.

`docs/OPEX.md` is the knowledge base behind the running-line method — what
Lean/TPS, industrial engineering, Theory of Constraints, TPM, WCM, Six Sigma
and Shingo each say, the six-move loop they share (standard, gap, priority,
cause, proof, hold), how each family is evidenced, and what is left out on
purpose. Read it before changing that method.

MEASURED BY PEOPLE, NOT BY SENSORS. Rowland, 10 October: "We will not have
Internet of anything. This is about manual inputs. This is about industrial
engineering." Every number is counted, timed, tapped, photographed or filmed
by a person; nothing reads a machine, and there is no OEE (typed by hand,
its availability is a guess). The lean and industrial-engineering tools —
time study, the value stream map, line balancing, capacity and constraints,
losses — are built from manual inputs and calculated live. `docs/LEAN40.md`
holds the eight principles the app follows (for Rowland to agree), the stage
gate held to them, and the toolkit with its arithmetic; `docs/TOOLKIT.md` is
the toolkit's design — how a tool lives (Part 0: one record per use of a
tool, on its own, on a line, on a job, evidence for a problem or proof for a
fix; work moves, evidence links), the five layers every tool follows (facts →
figures → reading → verdict → act), the honesty rules (enough? how known?
what it does not claim), the records, the sixteen shared parts, and each tool
in full. `docs/CAPACITY.md` is the knowledge behind Line capacity, the loss
count and SMED — plate speed ("we go by plate speed ... unless human"),
capacity's three numbers, the bottleneck worked out and walked, the V-curve
and accumulation, a shift's time model (planned production time, the six
big losses, slow running and short stops as the rest), what a loss costs at
and away from the bottleneck, the mix, and EN 415-11 — read it before
changing any of them. `docs/BUILD.md` is how that next stage is built and proved: separated
pieces (database before sync, sync before screens, arithmetic before
pictures, a tool alone before its links, links before paper), the
ten-point checklist every piece passes before it reaches `main`, and an
acceptance script per finished story that every later gate runs.

They are separate methods, not one loop pretending to be cohesive; each is
defined once, the same way, in `src/lib/planModel.ts` (the question, when to
use it, how it is organised, rhythm, done, what it prints). A fourth method is
one more entry there. Tools (Pareto, the filmed walk, a line study) are
instruments a method uses, never methods of their own.

Rowland, 24 September:

> "We are close, but it still feels like a gimmick."

So every change is measured against one question before it is built: does it
help the people on the project agree what has to be done or proved, see what
is and what is not, and know who owes what by when — or is it a feature? A
screen that shows information without saying what it means for the project is
a gimmick, however well it is drawn. A report that lists records instead of
telling the story of the project is a gimmick. A field nobody is asked to fill
in is a gimmick. The test for any addition is the sentence it lets one side of
the project say to the other — the site to the OEM, the lead to the sponsor,
the team to the client — that they could not say before.

## Finished means live, not pushed

`main` is what Vercel builds. A push to any other branch changes nothing that
Rowland can see: the site keeps serving the last build of `main`, silently and
correctly, and the work looks done from the terminal while being invisible from
the app.

That has already cost a whole session once — 21 commits sat on a branch for a
day while each one was reported as "pushed". Pushed was true. Live was not, and
those are not the same claim.

So the definition of done is:

1. the gate passes (below),
2. the change is merged into `main` and pushed,
3. and only then is it reported as done.

If something genuinely cannot be merged — a spike, a half-finished refactor, an
explicit request to hold it on a branch — say so in the same breath as
"finished", in plain words: *this is on a branch and will not reach the app
until it is merged.* Never let "pushed" stand in for "you can see it".

Working on a feature branch and merging at the end is fine. Leaving it there is
not.

## The gate

**Two cycles since 23 October** (Rowland: "64 min is too long ... shorten the
cycle"), both run by `scripts/gate.sh quick|full CHECKOUT PORT LIVE_CHECKOUT
LIVE_PORT OUT` from a checkout whose dev server is up (the live checkout's at
`origin/main`, for the paper comparison), every step kept running after a
failure, `summary.txt` the one answer:

- **Quick — every change, about 20 minutes.** Everything below except the
  forty random projects and the two-device sync; the browser checks four at
  a time. It is the definition of done for a change to a screen, a tool, a
  paper's words or a document.
- **Full — about 65 minutes.** The quick gate plus the forty random projects
  (every fact reconciled) and, last and alone, the two-device sync. Run
  **before** anything that touches `src/cloud/`, the mappers or the schema,
  `src/lib/report/` (the engine every paper is poured by), the seeds
  (`src/dev/`), or `scripts/` the gate itself runs — and **once a day on
  `main` regardless**, so what the quick gate gives up (a layout bug on odd
  data; a sync race — both found only there, 11 October and gate 14) is
  caught within the day, never silently. A full gate red on `main` is the
  first job of the next session. **The daily run is a scheduled task since
  24 October** (Rowland: "Go" — *Faultline daily full gate*, 05:46
  Europe/London, a fresh session each day that checks out `origin/main`,
  starts one dev server on 5191 and runs `scripts/gate.sh full` with the
  checkout as both sides, then reports — the commit, "N passed, F failed",
  every failure's quoted line, and whether the paper comparison ran; it
  changes nothing and pushes nothing). Its report arrives as a push and an
  e-mail; a red one is read before any other work.

Never edit the checkout while its gate runs: the dev server reloads under
the tests and the failures that follow are not the change's (gate 37, 23
October — five red, all mine).

The whole of it is what CI runs, plus the two things CI cannot:

```
npx tsc --noEmit
npx eslint src --max-warnings 64      # a ratchet, not a target — see below
npx vitest run
npx vite build
node scripts/smoke.mjs                # needs a dev server on 5191, or SMOKE_BASE
node scripts/report-stress.mjs        # every report at tiny, ordinary and huge — same server
node scripts/report-stress.mjs /tmp/fuzz --fuzz 40   # forty random jobs, every fact reconciled
node scripts/acceptance/stagegate-step1.mjs   # release 1's four stories, driven — same server; and the run's money (24 October, FC-076/077): a product short on its rate says the packs short and their contribution, the margin asked while the line has none, the climb what it has cost so far — the row, the card, the client report
node scripts/acceptance/stagegate-walk.mjs    # the stage gate walked: five site-lead journeys end to end, taps within a ceiling, no dead end, every place a change reaches in step
node scripts/acceptance/ecosystem-capability.mjs  # release 2: a study, a line, a job, a fix, before → after, the report
node scripts/acceptance/work-balance.mjs  # the line balance: its own page, timed on the phone (Undo, Skip, the whole screen), stacked against takt, on a job, before → after; linked to Line capacity (a station takes its person's time, the takt from the target), what the bottleneck costs, All together and its paper, the list and its paper
node scripts/acceptance/sixm-evidence.mjs  # 2h: a study on a running line — a cause's evidence, a countermeasure, before → after, the 6M report; and the 6M loop's ends (flow audit): a missed check chased, a shift counted as a reading, the constraint from Line capacity, Use it for by machine, suggestions about the problem, the status page first
node scripts/acceptance/value-stream.mjs  # B: a line's value stream — who and where, walked, a step made better, walked again, before → after, the paper, the fishbone; in money (24 October, FC-001): the waste steps' labour a day from the line's rate, the product waiting tied up and carried at the typed cost a piece and rate, a missing input named
node scripts/acceptance/changeover.mjs  # F: SMED — a quick session on its own; Lap with who, Shingo's stages on the grid, the plate speed, what the changeovers cost, set as the standard, timed again, before → after, the paper, the fishbone
node scripts/acceptance/work-sampling.mjs  # H1: what people are doing at random moments — the moment asks, one tap each, the shares with their margins, the fix, the 6M line's card, the fishbone, the 6M report
node scripts/acceptance/shift-losses.mjs  # E: a shift's losses — counted on the phone at the bottleneck's ideal speed, the shift less its breaks, the waterfall, slow running told from short stops, the pounds in two parts, a bar made better, the next shift counted, before → after, the fishbone, both papers; the lean page — the band, the tiles since the count before, the trend, the action plan, the closing line, and its one page of paper
node scripts/acceptance/line-capacity.mjs  # Line capacity: the V-curve, the capacity sheet, the margin, a person's standard time, the bottleneck walked; a person as the floor says them (what reaches them, keeping up, people needed); each tool its own products; the phone; what a pack costs in labour and one more person at the bottleneck; renamed and deleted where it sits, its map kept
node scripts/acceptance/line-standard.mjs  # the line standard's board: the page scrolls off it, a tap places, a drag moves, people's colours, a tall board, full screen; the bottleneck said (a person, an area faded), names short with the words on the right — screen and card; a tall board's card a frame of its own shape; a crowded line on paper, wide and tall — no name crossing another or covering a person, everyone named, the note and kit below them, an area's tag clear of its words; what the people placed cost (24 October, FC-006) — the page's sentence the module's, the wage taken off and back without a reload, a Line capacity's speed in its unit, the card's foot the same, the phone
node scripts/acceptance/program-delete.mjs  # a deleted test forgotten by its program (no day, no link, no proof), a deleted program taking its booked tests with it and one Undo, a line's own program changed and deleted on the job's Programs and still gone after a reload
node scripts/acceptance/programs.mjs  # a program's status with commentary: the five statuses (not tested and no program among them), commentary on its own, Needs you, the paper
node scripts/acceptance/snags.mjs  # Problems: the register — every problem written and edited where it sits, assigned not moved, its journey, a photo marked, on paper (a card for every problem among it), a fresh start
node scripts/acceptance/lines.mjs  # production lines: made in Your factory, opened on their own, a problem taken on one with no project, its tools opened on it, the phone
node scripts/acceptance/line-report.mjs  # 23 October, the line report — everything on the line (lib/lineBundle, lib/lineBundlePdf, screens/LineReportScreen): from the line's Report ▾ its own page opened and the paper made on arrival, save=1 gone, the single reports kept beside it; a tick a tool record as itemsOn says, the newest of each tool in as defaultPicks says, each with its own sentence; where on the line as whereOnLine says; who owes what as actionsOn says; the paper read back — the band, the tiles, Problems open, Programs, each ticked tool's section under its name (the tool named once), nothing unticked, Where on the line, Who owes what by when, the closing line as the screen says it, no products; one unticked and Download — gone, the rest kept; a dual line — three parts in order, Both lines together holding what was run on it, the band saying Made of, each line's study under its part, a line's own report saying only what is on it; the phone
node scripts/acceptance/dual-lines.mjs  # 23 October: a dual line and every machine on a line — three lines added, Made of ticked on Edit the line (said saved; never the line itself), "Made of Line 2a + line 2b" under its name with each a link, "Part of 2a 2b" under each of theirs, Your factory's rows and the control room's cards, one untick moving the words; the line report's band (Made of / Part of) and the factory report; a machine named on a new study joining its line's list, the dual line's Machine box offering both lines' machines as lib/lineRecords machinesOf says, a machine named on a problem joining line 2b's list; the phone
node scripts/acceptance/line-hub.mjs  # Stage 3, the line is the hub: its four tiles and no Products (taken off 23 October — Rowland: "You've invented products ... The program is the product"), an old ?view=products link landing on the Overview; a program running four products ("a program 10 ... that does 4 products") planned on the line's Programs — a chip each, the last typed kept by Plan it — its row saying them all, one taken off and saved, an older program's one product kept; its test day gone and proved moving the programs tile; the line report on one page with its products; the phone
node scripts/acceptance/factory.mjs  # Your factory: set up first, lines added one after another, named, typed, moved, archived and restored — the control room, the rail, the line's page and its paper, the phone; the jobs taking their lines from it, never a second line of a name; its paper; the tools picking from it; a line's facts set up from its page; two lines merged
node scripts/acceptance/machines-programs.mjs  # Stage 2: a program planned on a line with no job, from the control room; the line's machines in flow order; a job seeing and proving them; the factory and the paper
node scripts/acceptance/control-room.mjs  # the flow audit's control room: a line's own problems and programs counted beside the jobs', the critical list read on a phone, a line's page saying its tools' findings and each job's verdict, every count its page's, a job started from a line; every report from the control room (All reports in the band, Reports in the rail and More)
node scripts/acceptance/edit-delete.mjs  # bar 2: every record edited and deleted where it sits, with Undo — studies on every list and page, a 6M problem's words, a timed stop, problems, wins, readings, a line's machines and the line itself, a marked frame
node scripts/acceptance/capability-kinds.mjs  # the capability study made to cover what the floor has (knowledge/specs/FC-094-capability.md, part 1 — Rowland, 22 October: "not flexible enough ... I've got no idea what the tick is"): the question first (a measurement, sold by weight, pass or fail — each with its example), a speed at least 75 a minute with only its box, refused with no limit; the three checks before capability (said from 20 — bell-shaped by D'Agostino–Pearson, steady, read finely enough), how sure the Ppk is, the histogram; oxygen at most 2% leaning high and not steady — capable never green, then at most 0.6 — the share outside as measured; a run creeping up said not steady; pass or fail — 20 by default, one may fail, what the count would prove said while agreeing, 20 allowed refused, ✓ Good and ✗ Failed, a second failure failing it at once, struck, passed with one failed and what it proves, the tiles; each on paper; a study from before reading as before; the phone; in money (24 October, FC-156): give-away a pack, a shift and a week from the typed cost a kilo; the rejects by fate — waste, reworked, recovered by hand — at the packs a shift; a missing input named, never a figure invented; on paper; then pass or fail judged by a confidence level or a loss allowed (part 1b, 23 October — "Am I doing a confidence level, or am I doing the other level?"): the three ways and the confidence (90 · 95 · 99%), the plan as lib/ie/sample says it, 20 refused with the 149 it takes, 4,500 letting 74 fail at 95% and 68 at 99%, a loss of 98% letting 90 and saying it proves only 97.6%, tapped to a fail at once, the tiles, the paper, the phone; and W1, the modes (24 October, parts 2–4): rejects out of what was made — six runs typed, the rate with its bounds, the p-chart with Laney's limits, met at 1% and not met at 0.5%, the money; faults found on each item — the kinds as chips, the tally's Pareto, the u-chart, DPMO once the opportunities are typed; held at a rate — 25 minutes against 60, met and missed bars, not held at 90% and held with gaps at 70%; a measurement's question row — one machine's Cm/Cmk, a CCP's guard band with where the limit comes from, a weigher's heads compared by the ANOVA; the lowest legal fill and a volume pack by density on sold by weight; each on paper; the phone
node scripts/acceptance/tools-directory.mjs  # Every tool, the directory (knowledge/README.md; src/catalogue — Rowland, 22 October: "searchable by problem, discipline, method and scenario ... reflecting real status"): from the front door; the lede's counts as the catalogue counts them; the status chips are the counts and the filters, each tool saying its status in words; "we're rejecting too many" — where to start (the rejects route first), the tools in the module's order, the reject rate planned and saying not built; "FC-95" the one tool, Open it landing on the capability study; a route's tool opened from the route; a discipline's tools only; a tool left out on purpose saying why; the phone
node scripts/acceptance/audit.mjs  # the audit's fixes (docs/AUDIT.md): a way out of every sheet on a short phone, Escape on the photo viewer, a study on paper with Ppk and Cpk and its readings, every study list on paper
node scripts/audit.mjs [out.json]     # not a pass/fail: walks every screen at desk and phone — ways out, phone fit, lists with no paper (docs/AUDIT.md)
node scripts/acceptance/list-paper.mjs  # the audit's bar 3: paper wherever there is a list — Line capacity's page and every product shown, Line standard's cards for all shown, Materials, a card for every test on Commission
node scripts/acceptance/commissioning-report.mjs  # the commissioning report and cards: from Commission and the Reports sheet, the gate machine by machine, why and what we are doing, on paper and as a card a machine, moving when a test passes, on a phone and for a client
node scripts/acceptance/report-relevance.mjs  # the audit's bar 8: the stage-gate papers keep up — a machine late on site, a register problem for the job, the line's own programs, what a gate is missing, on the full report, the one page, the programs report and the handover; the statuses moved and all four moved with them
node scripts/inventory.mjs            # docs/PAGES.md: every page shows what it must, at desk and phone — same server
node scripts/acceptance/reliability.mjs  # a machine's reliability (docs/TOOLKIT.md, 13 — Rowland, 21 October: "tapping a button every time an event happened ... a clock watch I can stop and start"; 22 October: "three buttons ... three data sets going on"): on the rail and its list, every count on the row; one made on a line, its machine offered, the new study and its set-up in plain words (no "optional", no "What can one be?"); set up as several things counted — stop to start with, a failure from the words offered, the floor's own typed, one taken off and back, each its own MTBF wanted and minutes stood; a button each, refused until the watch runs, each tapped as they come with the page's clock run by the script, the tap said back as its own, one undone, nothing counted while the watch is stopped — counted side by side and each count's tiles, sentence and what it means as lib/ie/reliability says them, a chip apart; carried on the next day (every count adding up, a day a row, the MTBF day by day, the gaps and the others drawn, the band every count's); one count's MTBF wanted changed and its verdict moving; every tap listed with its count, one struck and restored; the commentary written, edited, deleted with Undo, kept after a reload; its paper (side by side, then each count's own); the list, the line's page and the front door; the phone — a button each, big, a watch left on all night asked about and stopped at its last tap; then its money to the model (24 October, FC-058): on a machine that is not the line's bottleneck labour only and the line runs round it, on the bottleneck the packs and the contribution, the row's last cell the two parts never a sum, the paper the same
node scripts/acceptance/upgrade.mjs  # the upgrade (docs/upgrade-plan.md), AI off: what a line can make and why, Ask (a question its figures do not answer said so, nothing sent to an AI), where and when it stops, the week to send, the Pareto read, Again?, the line machine by machine, Jump to, the demo kept out, the phone
node scripts/acceptance/project-workspace.mjs  # P2 (docs/PROJECTS.md): a tool opened from a project's rail keeps the project's rail, its address carrying it; its list the project's own, everything on its lines and every line one tap away; a SMED, a problem, a Line Talk (knowing the project) and a Line capacity made there are the project's — no "For a project?" asked — and open in it; outside a project nothing changed, a record on no project opening on none and the project's own in it however reached; the phone
node scripts/acceptance/actions.mjs  # P3 (docs/PROJECTS.md): a project's Actions on its rail; every row as the records say (Needs you's owed rows and the register's problems for it), the tiles and the closing line; by who, when and where; only the late, the critical and high, nobody yet; a row opening its record; paper for the meeting and one person's own; a 6M project's; the phone; and P4, Every action from the control room — each project's own as its page says, by project, every line's own problem under no project, on paper
node scripts/acceptance/one-number.mjs  # S1 (docs/STEADY.md): one number, everywhere — on the seeded stage-gate and 6M projects, late read from the band, Needs you, Actions, the Journey, the status report on paper and the control room, any two that differ failing; still to do one number on the band, the status report and the control room; Actions' open reconciled by its tile's parts; the control room owing what Actions owes; This week and next saying the same late
node scripts/acceptance/journey.mjs  # J2 (docs/JOURNEY.md): the journey — Journey on the project's tabs, this week and next by default, the range on the address; the days in order and every line as lib/journey says them from the records, the tiles, the closing line, a test booked on its day, the days with nothing said once; the tools we will use — three ticked with what for and when, each a plan on the Actions page wearing its tool and on the journey's day, a tool used already saying its records, one unticked and Undo; the commentary for today written, kept after a reload, edited, deleted with Undo, and on Notes under its day; the range changed three ways (this week, two picked dates, since the start) and ‹ earlier, the page following each; a range sent as a link; the front page's This week and next line; a 6M project's; the phone — nothing off the side, the tick list folded to the ticked; and J3 — the paper for the range shown read back against the module (this week and next, two picked dates, since the start), from the front page's Report ▾ and from Reports, This week and next in one line on the status report, a 6M project's journey report
node scripts/acceptance/front-door.mjs  # the front door as it is since 20 October (docs/DIRECTION.md): an empty device — the question first, nothing under way said so, the three kinds of change by name and situation, the eleven tools (Line Talk and Reliability among them) each saying what it is for, Your factory to set up, Home and Projects in the rail, and no words box, library of methods, Methods or switch; a kind tapped opening New job with it picked and only the three offered, the project made and listed under way, its row opening it; the lever tree picked the same way; an old link to Methods or the studio landing on the front door; the phone
node scripts/acceptance/structure.mjs  # the structure (docs/STRUCTURE.md §18), slice by slice — B0: a problem offered only to somebody who may change the project's work; a client offered none inside it (their rows are never sent), told so on the sheet with Save held, offered it off a project; B2: every page in PAGES.md naming its place in the context bar (Home, the factory, a line, a project) at desk and phone, each scope's rail its own and within its size (factory 8, line 9, project 18), the phone's bar the scope's own five on every page of it, ＋ the problem form in one tap with the line set, and with 30 more lines and 50 more projects the factory's rail still 8 and any line or project found by the switcher in three keystrokes as before
node scripts/journeys.mjs             # the eight journeys against docs/structure/journeys-baseline.json — every one finishes, none takes more taps than it did (docs/STRUCTURE.md §15), walked the shortest way the frame offers (the rail, the bar and More, ↑ Factory, a project's Tools, the switcher, the control room's own cards); hunts and what the context bar names printed beside their baseline
node scripts/report-stress.mjs NEW --repeatable && node scripts/paper-parity.mjs OLD NEW  # every paper says what it said: OLD the same on what is live (a server on origin/main, SMOKE_BASE) — a paper lost or changed fails (docs/STRUCTURE.md §17)
node scripts/acceptance/video-study.mjs  # a video study (docs/VIDEO.md): footage with known times made in the page and uploaded through New, a file that is not a video refused, on its line (the line's Tools row with it, Line balance not counting it, its list from the line the line's own — 23 October), read on the device, the reading MEASURED against the truth, reviewed on the footage (accepted, a boundary moved to the playhead, one rejected), the line balance and takt, the report read back, a reload and a reading resumed after one, the footage deleted with what was found kept; and the camera's AI — Name the work from the frames — offered, off until ticked, saying what it sends
node scripts/acceptance/video-fit.mjs  # footage fit for the study (docs/VIDEO-DESIGN.md): the study chosen from the words and how to film it before anything is filmed (where the phone goes and never, how long from the cycle, the people), a changeover not measured from footage yet with SMED meanwhile; footage whose camera shook for twelve of its thirty-two seconds said unfit as it came in, the phone's place said; read — the shake found where it was, every event inside it flagged and none outside, each end's ±, when work starts and stops not measurable from it, the findings counting the flags and never calling a gap waiting; said in the hand and refused; on paper; the phone
node scripts/acceptance/video-check.mjs  # can this phone film a long study? (docs/VIDEO-FEASIBILITY.md): from Video studies, what the phone offers as the module says, the test on Chromium's fake camera — the picture in thirds, the rate, the camera's word, the app out of sight said, a clip at 30 s played on its own — stopped after a minute: the answer and every line as lib/video/phoneCheck says them from the results the page copies, the last clip, the minute's row, nothing kept on the phone, Run it again, the phone
node scripts/acceptance/line-talk.mjs  # Line Talk, the box as a chat's (docs/LINE-TALK.md, How it hears and The box, like a chat — Rowland, 21 October: "I see my words come up on the interface. I simply press send"): opened from the line's page and started on it, named for the line and the day; the box — Photo, the words, the microphone, Send; the microphone tapped, the phone's recogniser played by the script — British English, the words in the box as they are said (those still forming too), nothing in the talk until Send; Send while listening — the last words finished, sent as said, the box empty, Line Talk's answer; nothing heard for six seconds — the keyboard's own microphone said, still listening, gone with the first words; talked, stopped, put right in the box and sent as put right; a session the phone ended by itself, both sentences in the box; typed into while listening — listening stops, the box as typed, the microphone again after it; a photo, a line typed and sent as typed; corrected after it was sent with what was sent kept beside it and Undo; struck, kept and left out, brought back; no signal said with the way round it, the words kept in the box; out of sight — listening stops, said, carried on after; the microphone taken and not allowed — each said with the keyboard's own microphone; a browser with no speech recognition — the box opened for the keyboard's microphone, said; reloaded mid-talk — the words in the box kept and sent as said; nothing recorded; the line's page and every Line Talk saying it; the phone — the box on the phone's own bar, long words inside it; nothing sent to a voice service
node scripts/acceptance/line-talk-assistant.mjs  # Line Talk, slice 2 — ask it (docs/LINE-TALK.md): started from the front door on a line, what it knows said in a line; talked into the box and sent — answered (the assistant answered by the script), asked with what was said, the line's machines and problems as the register reads them, and today; a follow-up asked with the conversation so far, its own answer as its own; photos picked (gallery or camera, several), labelled P1 and P2, their pictures sent as small JPEGs by label; an answer not given saying why and kept, Ask again answering it in its place; the gateway down said, the question kept; no signal waiting and answered by itself when it comes back; the four shortcuts only words in the box; a document's card, a figure it was not given said to check; the document opened, edited where it stands, kept, reloaded, As Line Talk wrote it and Undo; its PDF — every point with where it comes from, the photo with its label and caption, the one taken out not; reloaded — every answer kept, counted on the talk and the line's page; the phone; then the answer as it is written (21 October — "like I do with you here"): asked for as it is written, its words growing in its turn, the finished answer kept in their place, one answer, on the talk
node scripts/video-eval.mjs [out.json]  # not a pass/fail: the video reading measured condition by condition on footage with known times (docs/VIDEO.md, measured accuracy)
node scripts/sync-two-devices.mjs     # a phone and a laptop against a fake cloud — video on one plays on the other
node scripts/check-live-schema.mjs    # the LIVE database against the mapper — needs .env
```

`scripts/report-stress.mjs` builds a job just started, the ordinary seed and a
job a long way in (`src/dev/reportSeeds.ts`), downloads every report from its
real button and reads every page back: nothing off the page, nothing printed
over anything else, no near-empty page mid-document, and every machine name
and the end of every long field on the paper. Line capacity is taken at the
same three sizes (`src/dev/capacitySeeds.ts`: a product with nothing written,
Line 7's, twenty stations in four units with what-ifs, shifts, the walk and
the work), from its page and from its list, with Line standard's cards for
all shown. A report is laid out by the
engine in `src/lib/report/` — blocks that measure themselves, poured into
pages — never by a hand-kept `y`; `docs/REPORTS.md` is the design.

The lint number is a **ceiling that only ever comes down**. The remaining
warnings are a backlog (mostly non-null assertions), not a standard. If a change
removes some, lower the number in `package.json` and `.github/workflows/checks.yml`
in the same commit. Never raise it to get green.

`scripts/acceptance/` holds one script per finished release
(`docs/BUILD.md`). It drives the release's stories on the seeded job in a
real browser and checks every sentence on the screen against the module that
makes it, so what was proved when a release was built stays proved in every
gate after. `stagegate-step1.mjs` is release 1: the pace says when, the climb
to rate, since you last looked, scan the machine. `stagegate-walk.mjs` is the
stage gate walked as a site lead uses it (Rowland, 16 October: "you couldn't
really navigate simply through things like a problem ... the way things were
actually synced together"): a job started on a phone with its two machines
and every gate's usual list in one tap; a stage ticked on the day's plan is
the stage done on the day, Today and its gate, a line only about a done stage
keeping its own tick, and a stage done in its drawer reading done on the
plan; a re-test failed, its problem saved and opened in the same drawer, made
a fix, Fixed going back to the problem, the next re-test planned (named "—
re-test" once) and passed, the rail's count back where it was; a program
tested on a phone with Commission hearing it; a hand-over item done and the
front page counting it — each journey's taps under its ceiling and no dead
end (it failed 12 checks on the code before the walk's fixes). `ecosystem-capability.mjs`
is release 2: a capability study from a quick session to a fix's before →
after and the client report. `work-balance.mjs` is the line balance
(step 3, then its own tool on 17 October): the work timed on the phone with
the full-screen timer (Undo, Skip), stacked against takt, made better on a
job and proved by timing it again; then Op 2 put at the Packer and Line
capacity's Packer taking their timed cycle, the takt taken from the target,
what the bottleneck costs a pack and a minute as `tools/linework/balanceLink` says,
All together and its PDF, the Line balance list and its PDF, and the phone. `sixm-evidence.mjs` is 2h: a study on a
running line — a cause's evidence, a countermeasure on the board, before →
after on it and the 6M report; then the 6M loop walked (the flow audit, 13
October): a closed problem's missed check said in red on the fishbone's
strip and its Kept by (the days as days), a row on the job's Needs you and
the control room's This week that opens it; the constraint read from the
line's Line capacity, what the line can make beside its target, a shift
counted offered as a reading and recorded in one tap, no OEE in a new 6M
job's example; a study attached to a job taking its line, its Use it for
machine by machine with its own first; the fishbone offering no other
line's materials or programs; the Reports sheet's two papers with each
line's folded, the spreadsheet worded for the job, and the client report's
one-page status first. Then money on the 6M (24 October, FC-146): a problem's
hours a week in money on its card as the module says, a countermeasure asked
its share on the board's sheet and its worth on the fishbone, both on the 6M
report. `value-stream.mjs` is
B: a line's value stream map — lanes by who and by where, walked on the
phone, a fix raised from a waste step, the line walked again, before → after
on the fix, the stream as a table on the client report, and the fishbone
offering the map's wait and waste. `changeover.mjs` is F: SMED — a quick
session on its own end to end (two elements lapped with who does each, one
typed, convert, streamline with a target, the grid's lanes and fills, the
ladder, how the line runs with the days typed as 7 and the cost as the
module says, the plan view, Play, an element's sheet); then on a line and a
job: started from the product's standard, the plate speed offered off its
line balance, an element converted, one streamlined and one in parallel by
the fitter (the plan's grid in one column), a fix raised from the converted
element in its SMED action's words, set as the standard with its target and
checklist, timed again to prove it, before → after against the plan, the
grid as a table on the client report, and the 6M line's card and fishbone
saying SMED. `work-sampling.mjs` is H1: a study set
up on its line with its standard's people, the moment due asking, one tap
per person stamped with the moment's time, a mistap struck, the shares with
their margins as the module says, Make it better carrying the figure; then
on the 6M job's line, the line's card saying its biggest share not the work,
the fishbone offering each share a tenth or more on its bone (counted), one
accepted saying "Work sampling" where it came from, and the 6M report's
Evidence printing each person's shares with their margins. `shift-losses.mjs` is E: a shift's losses
by hand, on the time model of `docs/CAPACITY.md` §5–6 — a count made on the
phone from the line's board beside the Pareto at the bottleneck's ideal
speed (a machine's plate speed; a person's standard time when a person is
slowest), its planned minutes the shift less its breaks
(changed for the day only with a reason), the sentence and the waterfall as
`tools/losses/losses` says them from the count and the stops in its window, the
rest named slow running and short stops and told apart by the running speed
timed, the pounds in two parts (idle labour · lost contribution), the line's
settings carrying each shift's breaks, a countermeasure raised from a bar in
its own figures, the next shift counted as its proof, before → after on it,
the line's card, the control room and the fishbone carrying the count, and
the waterfall as a table on the 6M report and the stage-gate client report; then the count as the lean page (4b, `docs/LEAN-PAGE.md`) — the five tiles as `tools/losses/lossLean` reads them, each since the count before ("1,100 more than 16 Oct"), the band and its verdict, the trend over the line's counts, the countermeasure in the action plan with its owner and day, the closing line, and the same on the count's own paper. `snags.mjs` is Problems, the register (Rowland, 12 October: "Every single
problem allows me to put in what the problem is ... a journey of improvement
... assign the problems to where they're going to be. I want a fresh start.
Don't erase anything."; and "everything should still stay in the control
problem page, because that's the page that has everything. That's the page
I do the report on"): every problem on its line in priority order, and every
project's own problems and fixes under On the projects, counted and on the
report, the
sentence and the counts as `lib/snagsReport` says them (the register); one
opened as its own editor — its words, priority and where it stands each kept;
its line, machine (the jobs' machines offered, another typed) and job set,
staying on the page "for" the job and shown on the job's own view; its
journey — steps added with a day, what we did and what came of it, shown on
the row, changed and taken off; a photo marked from the editor; priority,
whose, due, close and delete for several at once; its report card and the
Problems report carrying its plan and journey; Problems cards beside it, a
card for every problem the report lists (13 October: "the cards are great
but i dont have ability to make a card for all of the problems"); a line's
group and a project's group on paper as a report and as a card each, and
the project's own page's
report and cards; Start fresh putting every
problem away with none deleted, the page saying so, and one then all
brought back; and the phone. Then what a problem costs the line while it is
open (24 October, FC-154): the minutes a day typed and kept, the sentence the
module's — the wage named when the line lacks it, then labour, packs and
contribution without a reload, a machine off the bottleneck labour only and
said why — the row's short form, the closing line's sum, the card, the
report, the phone; then the rejects it causes and the product it holds (part
2): typed and kept, the pack's materials named once while the line has none,
then at 12p a pack the rejects as materials a day and the hold as money tied
up (not lost) — the row, the closing line, the card, the report, the phone.
`programs.mjs` is a program's status with commentary (Rowland, 12 October:
"we need option not tested, and no program, and allow commentary"): the five
statuses offered, not tested kept with what was seen and the program not
done, no program amber on its line and tile and on the Set up screen's Needs
you, commentary with no status kept on the program, and the programs report
carrying the words, the commentary and the counts. `lines.mjs` is production lines as a place of their own (Rowland, 12 October:
"I just want to be able to open a production line and use these tools inside
the production line ... I need a record of production lines"): from an empty
device, no project — the control room's Your factory saying set it up first,
a line added there by a name and opened to its own page, the rail's Your factory carrying it, the
Problem button on it with the line set and no project, the problem on the
line's page, tapped to the Problems page on that line with it open, Line
capacity and SMED opened on the line saying none yet with New starting on it,
the control room counting the problem, and the phone. `factory.mjs` is Your
factory, the backbone (Rowland, 13 October: "a factory setup before the new
projects ... build your factory, edit your factory, let me put more lines,
change the types, the names of the lines. Again, always full edit
control"): from an empty device, the control room's Your factory first
saying set it up first, three lines added one after another with the type
kept for the next, the factory in words, a name and a type typed over and
each said saved, a line moved up and the order kept after a reload, the
control room's cards and the rail in floor order with their types, a line's
page saying its type and edited there, its Problems report named with its
type, a line archived and restored, a fourth placed at the end with its
name guessed, and the phone; then the jobs taking their lines from it — a
project started from a line's page with that line picked, its lines the
factory's, a line added from the factory and one not in it yet (added to
the factory), a project's line made before the factory finding the
factory's line of its name and never a second, and the factory, the line's
page and the control room saying the job; then its paper — one page, the
factory in words, every line in floor order with its type, its jobs and
what is open — and a tool's Which line offering the factory in floor order,
a line made there put at the end of the factory. `machines-programs.mjs` is
Stage 2 of `docs/BLUEPRINT.md` (Rowland, 13 October: "plan a program for a
line rather than open up a full project system"): the control room's Your
factory opening Programs, each line's card saying its programs to prove; one
line's programs machine by machine, the sentence as `lib/lineRecords` reads
it, a job's program saying its job; a program planned on the line with no job
on a machine not listed yet (the machine joining the line's list, its record
made); where it has got to, its commentary, a test day gone by in red, proved
with its day; the line's page — its machines in flow order with their makers
and programs, one named there, "The line" no longer listing them twice; a
machine renamed in Set up the line carrying its record; a job on the line
seeing the line's own programs under their machines, marked by line, and
testing one on its row (14 October: "reach it only from programs and
improve the ui to actually run it?") — Test it: passed, what was seen, the
day; its proving test made, the line's program proved; Commission's
programs cell opening a machine's programs and a tap its test, no second
picker; Needs you's Test it landing on the row on Programs, open, booked
there for a day; a line's program with no machine on the job tested on the
line itself, didn't pass in red on the row and the board; a line on a
machine's "Programs loaded" with no program record tested the same (14
October: "I've gone to programs, nothing's changed") — its record made,
proved, and on Commission's board; a program's journey (14 October:
"we decide to run a retest ... successful at 50 ... a retest at 55 ... show
the journey") — tested again at 55 with its speed, minutes, packs and
rejects, a re-test following the pass, both on the row with the pass
standing, on Commission's sheet and on the commissioning report; Your
factory's row and its paper; the line's programs report; Line capacity
offering the line's machines; and the phone. `list-paper.mjs` is the audit's
bar 3 (`docs/AUDIT.md`; Rowland, 13 October: "I'm always asking for
reports, or cards ... that would seem to be obvious, but aren't, because
you're not building them"): Line capacity's own page on paper — one page,
the product, what limits it, the sentence, the V, every station, a shift and
the cost a pack as the screen says them; Line capacity's PDF (all shown) — a
front saying them all and every product shown with its row's finding, and on
one line only that line's; Line standard's PDF (all shown) — a card a page
for every product shown; Materials — one page, how many are here as the
header says, the late with how late as the list says, every material; Test
cards — a card for every test on Commission's board, each numbering its own
pages; and a client taking the paper too. `report-relevance.mjs` is the
audit's bar 8 (Rowland, 14 October: "Check the stage gate report must make
sure they maintain relevance when things change in the app .. new functions
the app does but also all changes in status"): on the seeded job a machine
late on site, a Critical problem taken on the register for the job and the
line's own program — each on the full report, the one-page status, the
programs report and the handover as `docs/REPORTS.md` (Relevance) places
it, the screen's contents saying the same; what a gate's Needs you says is
missing on the full report as on its contents; the register problem's line
on the status page opening the problem; then the problem closed, the
machine landed and the line's program proved — and all four papers moving
with them, the status still one page. `commissioning-report.mjs` is the commissioning report and its cards
(Rowland, 14 October: "a commissioning report, commissioning cards,
something that way I can present in the meeting or send"): Commission's
*Commissioning report* opening it on its own chip; the gate's count as
Commission's header says it, every machine with its word, why naming every
test whose latest attempt did not pass or did not run, doing every open
fix; the same on paper with the code to the job; the cards a page a
machine, in order, each "i OF n"; a failed test passed on a re-test moving
its machine's word, its why line and the paper; the job's Reports sheet
opening it beside *Test cards*; a phone with nothing off the side; and a
client taking the cards.
`line-standard.mjs` is the line standard's board (Rowland, 13 October: "I
can't drag the interface down ... I only have a small surface area ... I
also can't change the colour of the people"): the empty board the page's to
scroll and pinch while a person and a shape are the board's to drag, a tap
placing a person and a drag placing nothing, a person dragged and kept, a
person's colour on the board, in Who does what and on the record, a plain
board made tall with everything where it stood, the card drawing the person
in their colour and the board tall — in a frame of its own shape, nothing
beside it, Who does what in the room left (13 October: "i pick square it
then clusters everything up, or tall ... it's only set for wide") — full
screen edge to edge and back, and the phone; then the bottleneck said on the map (Rowland, 13 October:
"highlight ... bottleneck areas ... fading out a certain area of a color
... a little summary ... this person's the bottleneck") — a person marked
from Who does what, tagged on the map and summed up first on the right, an
area faded in its colour with its line dashed and tagged; names short on
the map with the whole name on the right ("it covers up too much of the
map"), numbers matching the right and kept after a reload, and full; and
the card drawing the tags, the faded area and the short name; and a
machine on the map marked the bottleneck from its sheet; then a crowded
line on paper, on a wide and a tall board (13 October: "everything's still
merged together and PDF details gone strange even in the side commentary
or the bottleneck") — ten people close together with long names: no name
on the map crossing another or covering a person, every person named in
Who does what, the note and the kit below the people, an area's
BOTTLENECK tag clear of its own words. Then words printed whole (Rowland, 15 October: "I've done bottleneck and there's a large amount of context in there, but when I print it, the context is not there"; "it only goes across, it doesn't let me go upwards"; "I can't stretch anything from a side") — a tall, narrow shape's words up it, the bottleneck summed up by its head, the person's box as tall as their words, the card and its notes page (two pages in the preview and the PDF), every word written on paper with "(notes, 2)" where the card cuts, a shape stretched from its right side and its top with the opposite side kept, Upwards chosen and kept, and a map with nothing long one page.
`line-capacity.mjs` is Line capacity: the views named for what they
are, the V-curve and the capacity sheet as `tools/linebalance/capacity` says, a machine
not on its plate speed said so, the owner's V margin and the guide, a
person's standard time from the time study used with a tap, and the
bottleneck walked against the sums; then a person as the floor says them
(Rowland, 13 October: "8 units in a tray ... a tray every 8 seconds";
"70 a minute ... 10 to a basket ... one basket goes to a human every X") —
the V a column a station, each named in full under it, the bottleneck
graphite, a column opening its station; asked how many units make one tray, what reaches them worked out before
they have a speed, "a tray every 8 seconds" said back as a minute and in
the line's unit, whether they keep up in seconds, Make it 2 people, a
person's time carrying the ILO's 9% rest (14 October: "bring in science
when it comes to humans"), a palletiser timed per tray with "1 pallet = 36
trays = 288 units" said and the pallet worked out ("all I did is do the
division of 70 a minute"), a person fed straight past 90% of their pace
said in amber, and "4 pallets a minute" asked as one every 4 minutes, made
so in a tap and kept in minutes ("it takes 5 minutes to do one pallet");
each tool listing its own products (a product only mapped is not in Line
capacity) and New on one already on the line opening it; Line capacity's
own page and its rail on no job; and the phone — the V on its side, the
sheet a card a station; then what a pack costs in labour (Rowland, 13
October: "provide an hourly rate ... If I put two people there ... is my
cost per pack higher or lower?") — the people standing in from the line
standard, the rate typed and kept, the cost a pack as `tools/linebalance/capacity` says,
one more person at the bottleneck lower or higher as the module says, Make
it so, a what-if's labour, and the card's line carrying the cost a pack;
then renamed and deleted where it sits (13 October: "cant delete a line
capacity anywhere ... always implement deletes and editing in
everything") — renamed in its row with a name already on the line
refused, its Line capacity deleted from its row with its map kept, said
and undone, never gone from Line standard, renamed on its own page, and
deleted there with no map on it — the record gone; then screened for problems
(Rowland, 15 October, on his own line: "a target of 150 ... 319%, 279%, 273%
... screen it for problems") — his "10 in a tray" as entered: the wrapper a
third of the target and what it would need, the V's percentages said against
the bottleneck they are against, a person's rest counted twice; red and
amber, opening the station, on paper under "To check before the sums are
trusted", and a line that meets its target not told it is short; then several
lines feeding one place (Rowland, 15 October: "line A, line B ... one person
who has to wrap for both"; "3, 4, 5 lines into one") — a chain split where
the lines merge, a line added like the last and named, a station moved inside
its own line, a line taken away and brought back, a what-if keeping the lines,
the checks said along each line, and a V and a sheet a line on paper, then
where they merge. Then the shape asked (Rowland, 15 October: "asking how many lines ... and do they merge at the end"; "the graph ... only available on the PDF now"): *How many lines feed in?* 1 to 6 and *Where do they merge?*, a map of the lines and the merge said in the shared station's cycle times, a V on the page for each line and where they merge, and the way to the target worked out (who is added where, *Make it so*, on paper).

`scripts/sync-two-devices.mjs` runs two real devices of the app (a phone and a
laptop, separate storage) against `scripts/fake-cloud.mjs`, which keeps the
live bucket's rules (no upload before a row names the file, nothing over
50 MB). Eleven scenarios: everything the phone does — a recorded clip, a photo,
a PDF — shows and plays on the laptop; edits go back the other way; offline
work arrives once and whole; two devices editing different boxes of one test
both keep their edit (field by field, against the copy both last agreed);
failed uploads retry; one refused row holds nothing else back; a file too big
for the cloud is said so at once and kept; a file that lands after its record
is on the other device within seconds, by itself; readings added to one study
on two devices at once are all kept, and a strike holds; a video study's
footage filmed on the phone plays on the laptop, and deleted on the laptop is
named nowhere, taken out of the cloud and forgotten by the phone
(`supabase/VIDEO_MEDIA.sql`, `tools/video/footage`). It cannot prove real
RLS, real signal or iOS Safari. Run it on its own, not beside the fuzz: its
timing checks fail under that load.

`scripts/smoke.mjs` loads every screen in the app with realistic seeded data and
fails on any console error — and on an old word on the screen ("workspace",
"tracker", "3P", or "snag" as the app's old noun for a problem; BLUEPRINT §5.9). It has caught crashes that no unit test would have.
Its fixtures live in `src/dev/seed.ts` — **TypeScript on purpose**, because two
earlier attempts wrote plain objects in the `.mjs` and both were the wrong shape,
manufacturing two "bugs" in the app that were really bugs in the harness.

## Verifying in the app, not just in the terminal

For anything a person sees, drive it in a real browser before calling it done —
Chromium is at `/opt/pw-browsers/chromium`, Playwright is configured to find it.
Seed data, click the actual controls, read the actual DOM.

Four separate defects in the commissioning screen were invisible to every test
and to reading the code, and turned up in the first thirty seconds of using it:
no way to create a machine at all, a number box that turned `12` into `102`, a
database write on every keystroke, and no way to delete a mistyped row.

On the deployed app, the Home screen prints `Build <timestamp>`. That is the
one-glance answer to "is the fix actually live", and it is why it exists.

## Database changes ship from here, like code

The Supabase connector is connected with its write tools allowed (checked 2
October: `execute_sql` and `apply_migration` both go through; the project is
`eqdigvzbljofxznqtfia`, "Faultline"). So a schema or policy change is not a
file handed to Rowland to paste into the SQL editor. It is:

1. the SQL written to `supabase/<NAME>.sql` in the house shape — a header
   saying what it is for and why, "Run ONCE. Safe to re-run", every statement
   create-if-missing or create-or-replace, and a `select` at the end that
   prints back what it did;
2. applied to the live database with `apply_migration` under the same name,
   so the migration history matches the file;
3. **read back** — `pg_policies`, `pg_get_functiondef`, `pg_indexes` — before
   anything is reported, because a tool result that says "cancelled" or
   "success" is not the database;
4. and only then the app change that depends on it is pushed to `main`, so a
   sentence on a screen is never true before the database makes it true.

The connection drops (`ERR_PROXY_TUNNEL`) and comes back; a failed call is
retried, not reported as "no access". If a write comes back "cancelled" it is
the connector's per-tool permission, set under the connector's Tools at
claude.ai/customize/connectors, and the fallback is the file above pasted
into the Supabase SQL editor — in the same breath as "finished", never later.

**The app has one piece of server-side code**: `supabase/functions/remind`,
an edge function pg_cron calls every fifteen minutes (`PUSH_REMINDERS.sql`)
to push a note's reminder to every device that said yes. It is deployed with
`deploy_edge_function` from the file in the repo — the repo copy is the
source, never the dashboard — and its keys are made by the function itself
on its first run, so no key ever passes through a person or a file. It is
checked by calling it from SQL (`net.http_post`) and reading
`net._http_response`.

**The files in `supabase/` are a history, not a playbook.** Never replay them
all. Four of them move the database backwards if run today: `WORKSPACE_TEAMS`
and `PROJECT_TEAMS` overwrite the membership function with an old version,
`TEAM_UPGRADE` reopens every table with `true` policies, and `FRESH_START` is
for an empty project. The question "is the live database missing anything?"
is answered by a diff, not a re-run: parse every file for the objects it
intends (columns, tables, indexes, triggers, publication, constraints,
functions), hand the list to the database in one `with want(...) as (values
…)` query against `information_schema` and `pg_*`, and read the check
constraints and `pg_policies` by hand. Done 2 October: nothing was missing,
and nothing was run. Supabase's migration history (36 entries) is shorter
than the file count (46) because the early files were pasted by hand; from
here each new file goes through `apply_migration`, so the two move together.

## Who can do what on a project

Set 4 October, after studying how Asana, Fieldwire, Basecamp, Procore and
Smartsheet do it (`supabase/ACCESS_LEVELS.sql`, `src/lib/access.ts`):

- **Invited to the app** (the administrator's invite, `allowed_emails.scope =
  'app'`) — may start projects of their own.
- **Invited to a project** (an owner's invite, scope `'project'`) — only what
  they were invited to. One of three levels, picked once per person:
  **owner** (everything), **team** (does the work; what was agreed — the
  handover dates, the stage lists, a written "passes if" — and deleting stay
  with the owner), **client** (reads it and takes the reports).

The database is the guarantee: restrictive policies refuse a client's writes,
and a trigger keeps the agreed fields and every `deleted_at` for anyone but
the owner. The screens follow the same rule through `useAccess(projectId)`,
so **every new control that writes must check it** — `can.edit` to change the
work, `can.agree` to change what was agreed, `can.remove` to delete. A button
the database would refuse is a button that lies. A client's rows are never
pushed (`src/cloud/sync.ts`), so a stray local write cannot stall a sync.

## Things that will bite

- **A policy test that reads a null as `true`.** `SECURITY_RLS.sql` part C2
  meant to drop any policy whose rule was literally `true`, but tested
  `coalesce(with_check, 'true')` — null for every SELECT policy — and silently
  dropped the workspaces' select and insert. For nine days no line study could
  be read or created through the API, and nothing on screen said so.
  `LINE_STUDY_ACCESS.sql` restored them. When a migration drops policies by
  pattern, read `pg_policies` back for every table it touched, and remember a
  select policy has no `with_check` and an insert policy no `qual`.

- **A push that lands over somebody else's.** The cloud's upsert is
  last-writer-wins. Two devices editing one row within the same moment both
  pulled, both found nothing new, and both wrote: the second write replaced
  the first whole, and the first device — its write accepted — took the
  cloud's copy as newer on its next pull and never sent its edit again. A
  reading added on the phone was gone from every device, silently
  (`scripts/sync-two-devices.mjs`, scenario 10, twice under the gate, 11
  October). So a row this device holds the cloud's copy of is written only
  if the cloud still holds that copy, by its `rev` (`update … eq rev`), and
  a row the cloud moved under us is pulled, merged and sent again in the
  same pass (`src/cloud/sync.ts`, the push). Never go back to a plain upsert
  for an edited row. The engine keeps a trace of every decision
  (`syncTrace()`); the harness prints both devices' when a scenario fails.
- **A dev server kept running across a `git checkout` serves the old module.**
  The live checkout for paper parity (`fl-live`, `origin/main`) was moved from
  one commit to the next under its running server; Vite missed the change to
  one file and kept serving the module graph it had, so the live run of
  `report-stress` crashed on an import the new script expected
  (`toolLabel` from the registry) — and `paper-parity` compared the change
  against an EMPTY folder and said "kept" (gate 45, 23 October; the parity
  was established afterwards from gate 44's papers, 69 the same). Now
  `paper-parity.mjs` fails when the live side holds no PDFs and `gate.sh`
  fails the parity step when the live run's `rc` is not 0. The rule: after
  moving a checkout that a server is serving, restart that server, and read
  `paper-live.log` before believing a parity pass.
- **Two dev servers, one dependency cache.** Vite keeps its pre-bundled
  dependencies in `node_modules/.vite`, and a server whose settings differ
  from the last one's rebuilds them on start ("Re-optimizing dependencies
  because vite config has changed") — under any other server still using
  them. After a fresh container (19 October) the gate's server on 5191 and
  the sync harness's on 5192 (and a worktree's, its `node_modules` a
  symlink) fought over it, and the sync's first page never loaded: "page.goto
  timeout" twice, before any scenario ran. `scripts/sync-vite.config.ts` has
  its own `cacheDir` since; a second checkout's dev server is stopped before
  the gate's sync step, or given one of its own. And a cache that starts
  empty is filled by scanning for the libraries from every `.html` under the
  checkout — here that included a hundred copies of the app in
  `.claude/worktrees`, and the scan never ended: the sync's first page hung
  (gate 14). `vite.config.ts` scans from `index.html` only
  (`optimizeDeps.entries`) since; a new cache dir is proved by a run of the
  script that uses it, never assumed.
- **A sheet's back() undoes a script's goto.** A sheet closed by Escape or ×
  takes its own history entry off a moment later with `history.back()`
  (`ui/backCloses`). The app's own `nav()` waits for it (`afterPanelBack`); a
  test's `page.goto` straight after does not, and the late back lands on top
  of it — the page under the sheet where the next page was asked for. It
  failed the 6M acceptance's PDF download once in three parallel runs and in
  the gate (14 October), and read as "the download is slow". An acceptance
  script that closes a sheet and then navigates waits for
  `!history.state?.flPanel` first (`sixm-evidence.mjs` `go`).
- **Schema drift is silent.** The app's mapper and the SQL migrations are two
  descriptions of the same columns. When they disagree the push is rejected, the
  cursor never advances, the row never leaves the device, and nothing on screen
  says so. This has happened four times. `src/cloud/__tests__/sync-schema.test.ts`
  compares both sides and runs on every commit — when it fails, the fix is a
  migration, never an edit to the test.
- **The PWA caches aggressively.** `registerType: 'autoUpdate'` means an installed
  app fetches a new build and swaps to it on next launch. In a dev browser, a
  hard reload. Stale UI is usually this, not a broken build.
- **Supabase env vars are baked in at build time.** `scripts/check-env.mjs` prints
  whether both were present, in the host's build log. A build missing them ships
  a working-looking app with no sign-in.

## How a change gets made here

(Before these rules: place the change on `docs/BLUEPRINT.md`, §8.)

Rowland, after a run of work where each piece was good on its own and the app
still read like a workbook:

> "When we build things, we must be cohesive with the entire app. We don't
> build something without any regard for anything else. These rules we must
> follow. We must incorporate what we have and then fully understand what
> we're trying to build, before we remove something that was perfectly fine."

So, four rules, and they apply to every change from here:

1. **Nothing is removed until we can say why it was there.** If it was fine, it
   stays until there is a replacement AND a sentence saying why the replacement
   is better. "It looked dated" is not that sentence.
2. **Every change states its effect on the screen AND on the PDF, together.**
   Not one and then the other. A person types into a box and then watches what
   it becomes — that is one job, and designing the two halves apart is how the
   report ended up not carrying what the screen held.
3. **Additions connect; they do not sit beside.** If a new thing neither reads
   from nor feeds what is already here, it is a bolt-on and it is wrong. The
   test: name the existing record it hangs off, and the document it reaches.
4. **The whole shape is designed before any of it is built**, then built in
   slices that each ship live on their own.
5. **Connect the dots — anything new shows up wherever its parent shows.**
   Rowland, 6 October: "When you're implementing anything new, you need to
   understand and connect the dots on where the visibility should be showing
   ... I'm putting it in, so it should really appear like a branch — it comes
   off the main action, and in the map as a little branch, so you can see
   there's something else there ... Every time you make something, you're not
   connecting how the functions should look and connect with each other within
   the app. You've got to do that going forward." (Said when a part of the
   plan written on "Programs loaded" showed in the stage and nowhere on the
   plan.) So before building, list every place the record it hangs off is
   seen — the stage drawer, the Install grid and its phone cards, the plan
   (screen and PDF), the job's front page and Needs you, Today's update, the
   Fixes page, the client report — and say how the new thing appears in each:
   as a **branch off its parent** (a nested row under the stage on the plan, a
   count on the square, a line under the stage on paper), never a list of its
   own. Something entered in one place and seen nowhere else is unfinished.
   The commit says where it shows.

MANUFACTURING IS MANY. Rowland, 7 October, after a performance run was built
to hold one product: "Stop building one-dimensional systems. This is
manufacturing — when would I ever commission one thing?" A line has many
machines, a machine many products, a test many runs, a day many tests. Before
building anything that holds a value, ask whether there is ever more than one
— and if there is, build the list: plan several ahead (save, next, save),
fill in each on the day, and let the app add them up and give the verdict.
A single slot where the floor has a list is a defect, however well drawn.

EVERYTHING DERIVES A COST. Rowland, 17 October, walking the floor: "the
bottleneck is driving the cost per pack up, making it more expensive ...
there was no monetary value being shown anywhere. All of that needs to be
shown very clear and very simple, that this is the cost per pack because of
X, including with the people ... everything must have the cost in it ...
Everything must derive a cost in the entire app ... It's all about money."
So every tool's finding is said in money as well as in its own units — £ a
pack and £ a minute (a shift, a week where that is how the floor reads it),
"because of" the thing that causes it — from ONE cost model, never a second:
the people (Line capacity's labour, else the line standard's head count,
else the line's crew), one person's rate (Line capacity's, else the line's
wage × on-costs), and the line's margin a pack (`tools/linebalance/capacity` labourCost,
bottleneckCost; `tools/linework/balanceLink` balanceCost; `tools/losses/losses`
contributionOf). Where an input is missing the tool says which and where to
give it — never a blank, never an invented figure. The merged view (All
together) carries one cost line per tool, plainly labelled; it adds none of
its own. Where money is still missing is listed in `docs/BLUEPRINT.md` §6
(Money in every tool), and the next piece of work closes it tool by tool.

And, 24 October, the rule for every tool there is and every tool to come:
"all tools made or that will be made will have cost in if possible if the
costs calculations exist to the industry standards and the methodologies
that we are using. The cost is merely one of the outputs we have, it's not
the main part of any tool, it's to express a cost where there is one. If you
make a calculation but the user doesn't have that information then the app
must handle it gracefully, don't block anything. It's merely a piece of the
information that's missing ... you will look at all of the tools we have and
what we will make ... start to build the correct calculations for all of the
tools, then we will build every tool ... our industry is manufacturing, our
domain is FMCG, fast moving consumer goods, with a primary food
manufacturing." So **`knowledge/MONEY.md` is the money model**: every
catalogue entry with the industry-standard cost causation its finding is
said in (lean accounting's value stream costing, throughput accounting, the
cost of quality's four buckets, inventory carrying cost, engineering
economics — each with its source), the inputs it needs, every one optional,
and the sentence said when one is missing. A tool's cost is one output
among its own units, never its verdict; a missing input is named and nothing
waits on it; no causation is invented where the industry has none, and the
entry says so. A tool is specified with its money line (the spec's
*Established · assumed · chosen*) and built with it, through the
`faultline-tool` skill.

A FIFTH CONCEPT IS ALMOST ALWAYS THE WRONG ANSWER. `src/lib/testing.ts` says it
about tests and it holds everywhere: if something needs a new noun to explain
it, look again — four of this app's five lists already carry dates, owners and
states, and most "we need to store X" turns out to be "we have never drawn X".

## Visual management — the rules every screen and PDF follows

**The name is settled; the look was made fresh on 17 October.** Reviewed
against alternatives on 11 October (five names; four looks on the same mock
screens; a dark theme) and kept by Rowland: *Faultline*, the five state
colours, the type. Then, 17 October: "the apps colours im not keen on all
blue i want a change"; "I want a new fresh looking app. This is about
aesthetics that wow." So the frame is **graphite** (`--shell` `#12171c`),
the page **fresh paper** (`#f4f6f6`), and what you press a **cyan-teal**
(`--brand` `#0c7489`, the mark's bright end `#22c3d6`) — the landing, the
mark and the install icons (`scripts/brand-assets.mjs`), every screen and
every PDF together (`src/styles.css` tokens, `lib/reportKit`, each PDF's
own); the dark bands glow faintly cyan and carry the mark's trace along
their foot. The blues were mapped, never guessed: one table (the commit gives
it) took every navy, blue and blue-tinted grey to its place in the new
scheme, and the state colours and people's own colours (a project's, a
person's on the line standard) were left alone. **Paper is light.** The
same day: "black background with white writing — will we be able to see it
printed? Usually not." So no band is dark, on paper or on screen: every
band is a pale fill with a teal edge and graphite words (`lib/reportKit`
BAND, `paperBand`; on screen the `--shell` tokens in `styles.css`), so what
is on screen is what prints. The screen kept its dark bands for an hour;
the same evening, shown them: "I thought we agreed that you wouldn't do a
black background or white writing" — light everywhere. Never put white
words on a dark fill (a state's coloured pill with its word is the one
exception). Do not reopen either without him asking. **The five state colours
were refreshed on 15 October** at his word ("just go for it", after a
colour review asked for): the same five meanings, made clean signals — red
`#c4281c`, amber `#b45309`, green `#15803d`, violet `#6d28d9` for under way
(clear of the teal you press), grey `#a7afbd` as a fill with `--st-n-ink`
`#6b7588` wherever grey is words. The oxblood and ochre read as two browns
across a room; the indigo sat too near the brand's blue (then); the grey under
white words was 2.2:1. Every one is 4.5:1 or better now, on screen and in
every PDF (`src/styles.css` tokens, `lib/reportKit` and each PDF's own).

Rowland, 2 October: "follow the lean visual management principles throughout
the app." The test is the one a board on the floor passes: from across the
room, in three seconds, can you tell what is normal, what is not, and who owes
what by when?

1. **One colour, one meaning, everywhere — screen and paper.** Red
   (`--st-r`) is the day that has gone, or a failure. Amber (`--st-a`) is
   waiting on somebody, or due soon. Indigo (`--st-w`) is under way or still
   ahead. Green (`--st-g`) is done. Grey (`--st-n`) is not started. The brand's
   teal is for what you press, never a state. Nothing else wears these hues: the six
   bones of the fishbone are told apart by place and name, not colour. **The
   one exception is Rowland's own (11 October): the value stream grid colours
   value the way the method does — VA green, NE amber, NV red — always with
   the letters VA · NE · NV beside the colour, and only on that grid and its
   paper. And his second (12 October): a problem's PRIORITY is RAG —
   Critical red, High amber, Low green — always with its word, only on the
   priority tag, its counts and its paper (Problems, `lib/snagsReport`).
   And his third (14 October, "it looks very bland, very old ... more
   engaging and colourful"): Line capacity's V is coloured by how close a
   station runs to the bottleneck — the bottleneck in the house's graphite,
   the rest in the brand's teal, lighter the more they have to spare — on its
   columns, the phone's bars, the capacity sheet and its paper
   (`tools/linebalance/capacity` `shareColours`); amber still only under the agreed V, red
   only a target the bottleneck cannot meet, and every figure in words
   beside its colour.** The PDFs use the same
   five values. Set 4 October: a step with a day booked is still ahead
   (indigo); a step with no day is not started (grey); a gate where nothing
   has started is grey and says "not started"; a stage not on a machine's
   list is "not added yet". Which one is *next* is said in words ("Next"),
   never by borrowing a state colour.
2. **Normal recedes, the abnormal stands out.** Done is a quiet green wash,
   never the loudest thing on the screen. Late gets a heavier red border and
   tint, and a failure or problem is solid red. If the eye lands on a green box
   first, the screen is wrong.
3. **Only the abnormal number carries colour.** "11 outstanding" is the work
   and stays neutral. "4 late" is red. A zero is grey.
4. **The state in words beside the marks.** For example "4 open · 1 past due
   · 3 closed". Colour is never the only carrier, so it survives a
   black-and-white print and colour-blind eyes.
5. **One lane, merged markers, tap for detail.** Busy information is merged
   (days into weeks) rather than piled up. The plan never grows a row per item
   of evidence.

## The lean page — how a report and a tool's page are laid out

Rowland, 17 October, with a standard and a lean capacity report side by side:
"move on to all reports lean methodology applied ... the lean report is
actually how we would want the app's UI." So every report, and every tool's
page, is the lean page (`docs/LEAN-PAGE.md`): the band (what, where, when —
a pale fill with the teal edge), the tiles (a few counted figures, each *of* what it
should be and *since the record before*, never OEE), the trend, the tool's
own picture, the top causes, what it means, the action plan (action · owner
· due) and the closing line — the three questions drawn as a board is
drawn. One model (`lib/lean`), one builder a tool (`tools/losses/lossLean` for the
loss count), drawn on screen by `ui/Lean` and on paper by `lib/report/lean`,
so the two never part. What is typed stays on the page under the eight.
Built slice by slice (the doc's table): the loss count, then Line capacity,
the line balance and All together (`tools/linebalance/capacityLean`, `tools/linework/balanceLean`,
`lib/together` togetherTiles), then a stage-gate job's front page, one-page
status and full report (`lib/stageGateLean`), then the stage gate's own
pages and papers (`lib/stageGatePages`: Commission, the gates, Problems,
Materials, Programs, the commissioning report); the 6M report and Problems
next.

## Simplicity — lean, applied to the screen

Rowland, 2 October: "simplicity is what makes the app powerful — simple,
effective and efficient." Waste on a screen is the same as waste on a line:
anything the person has to look past to do the job.

1. **One thing, one place.** A state, a number or an action appears once. The
   Evidence counts *are* its filters, not a row above a second row saying the
   same words.
2. **Tools come out where the work is.** Controls appear on the box being
   worked on, not on every box at once (the lever tree). The state always
   shows; the editing tools come when they are wanted.
3. **No word that is not true.** A label from an older design ("from the
   tracker") is waste and misleads. Fix it the moment you see it.
4. **Simplify by merging, not by deleting.** Rule 1 of "How a change gets made
   here" still holds. A simplification keeps every capability and removes
   only the duplicate route to it.
5. **Simple with detail — three questions, in this order.** Rowland, 7
   October: "we've drifted to complexity equals detail. We want simple with
   detail." Every screen, drawer and report answers: where are we; why are we
   not where we should be (only the abnormal, with cause and cost); what are
   we doing about it (who, by when). Everything else is one tap away, or an
   appendix. `docs/SIMPLE.md` is the design, and the order the app is being
   brought to it.

## The word is CLIENT, not GM

The report goes to whoever is being reported to — Rowland's General Manager by
default, and sometimes the OEM. `GM` was parochial and made the document sound
internal. It is the **client report**, and the person is the **client**,
whichever of them is reading it. When you find an older `GM` in the code or on
a screen, change it.

**It is an internal tool.** Rowland, 9 October: "The client could be the team.
It's also an internal tool, not an outside business tool — it is for a team to
ensure things are done correctly inside their own factory." So do not design
the site against an outside party: a sign-off, a handover or an acceptance is
usually one part of the factory to another (the project team to production),
and the person signing is often on the team. What such a step must keep is
who did it, when, and what was still open — not a wall between roles.
