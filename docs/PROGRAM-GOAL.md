# A program is proved by the criteria you pick — the design, for Rowland's go

**Status: built, 28 October, at Rowland's "Go"** — the record (`programs.criteria`, `programs.signed_off`, applied and
read back), the logic (`src/lib/programCriteria.ts`, its tests on program 5), the row (`src/ui/ProgramCriteria.tsx` on a
project's Programs, a line's own programs there and on the line's page), the machine page, Commission's sheet, the
Programs report, the Machine report and the commissioning report; proved by `scripts/acceptance/program-criteria.mjs`.

## What he said

27 October, program 5 (Express 1.25 kg): it failed on net packs a minute because of lost time that had nothing to
do with the trial — *"you can fail the overall goal, but it still means that you passed the test."*

28 October:

> "when you're doing a program and you're running other tests and using tools, specifically the SPC tools, then any
> of them actually is good enough for the entire program to pass ... I may not achieve the packs per minute, but this
> could be because of not the robot ... outside noise ... to simply say that robot passed, it got X amount of packs
> per minute net, doesn't necessarily mean it did it cleanly ... the most important thing is actually the scientific
> evidence, the tools that I use ... I need to be able to choose which one is a pass ... sometimes the tool is the goal."

And, shown the industry's way (below):

> "the program has a set role of criteria. So I choose the criteria. So it's likely I'm going to pick tools ... as I
> pick these tools, they will be my criteria. If they pass, I then need to be able to sign off. So I will sign off,
> me and my colleagues together, but just leave it as signed off, passed ... it's running tools, and then seeing if
> setting your parameters and whether or not it passes or fails. It's just as simple as that."

## The industry's way, which this follows

- **Acceptance is against criteria agreed in writing, each its own test with its own evidence**, signed criterion
  by criterion (FAT/SAT practice; `knowledge/methods/commissioning/acceptance-tests.md`). No single number accepts a
  machine.
- **The machine is judged apart from the line.** EN 415-11:2021 (which replaced DIN 8743) counts only the losses
  the machine system causes when it gives the machine's figures (from excerpts — the standard's text has not been
  read). A capability study on the machine alone (ISO 22514-3, Cm/Cmk, `spc.machine-capability`) is built to take the
  outside noise out. So the tools, not the line's net rate, say whether the machine did it cleanly.
- **The people who accept it sign, and the record keeps who and when.**

## The shape

```
PROGRAM — what it runs, its machine
   │
   ├── ITS CRITERIA — the tools you pick for it, each set up with its own parameters
   │      ├── Capability study "placement 75 ppm"   — Cmk ≥ 1.67 (set in the study)   → PASSED / NOT YET / FAILED
   │      ├── Reliability "robot faults"             — MTBF wanted 4 h               → PASSED / NOT YET / FAILED
   │      ├── Control chart "seal temp"              — in control                    → …
   │      └── A run test "75 ppm for 60 min"         — speed, minutes, rejects (net only if you give it) → …
   │
   └── SIGNED OFF — PASSED: the names of who signed (you and your colleagues), the day
```

- **You pick the criteria.** On a program, *Add a criterion* offers the tools: capability study, control chart,
  reliability, analysis, a run test (the test as it is today) — any tool the app has. Each is a study or test made
  for this program, set up in the tool with its own parameters (limits, MTBF wanted, the agreed run). Nothing new is
  invented: these are the studies already lined up on a program's tests today (*Proved by*), lifted to the program.
- **Each criterion's answer is its tool's own** — the verdict the tool already gives against the parameters you set
  (lib/studyLinks studySays: met, not met, not enough yet). A run test's answer is its own as now, with what it met
  and missed (live since 28 October).
- **Net packs a minute is just another criterion** — picked when it matters, left off when it is outside noise.
  "Sometimes the tool is the goal": then the tool is the criterion.
- **When every criterion has passed, the program is ready to sign off.** *Sign off* asks who is signing (one or more
  names — you and your colleagues) and the day, and the program reads **Signed off — passed**, with the names and
  the day. That date is the program's proved date (`provedOn`), as now.
- **The program always says what passed it:** *"Signed off — passed 28 Oct by R. Glew, J. Smith · Cmk 1.82 on
  placement (27 Oct) · robot MTBF 6.1 h (27 Oct)."* The same words on every report.

## Where it shows

| Place | What it says |
|---|---|
| Programs (the project's, and a line's in place) | under each program its criteria, a row each with its tool's answer; *2 of 3 criteria passed*; *Ready to sign off*; *Signed off — passed* with who and when |
| A machine's page, Now's machines, Commission's board | programs signed off of all, the rest *n of m criteria passed* |
| Programs report, machine report, commissioning report | each program, its criteria and their answers, and the sign-off — the same words |

## What changes in the record

- **Criteria:** an explicit list on the program, `criteria` — `{ kind: 'study' | 'run', id }`, one JSON column
  (`supabase/PROGRAM_CRITERIA.sql`). Not every study or test naming the program: program 5's net run, failed on outside
  noise, would otherwise be one, and every program tested before would need a sign-off. A study made from *Add a
  criterion* names the program (`ToolStudy.programId`); a run test is the first test of its chain, passed once any attempt
  passed. A study's answer is its tool's own verdict (lib/studyLinks studySays, an overrule taking its place) — for a
  capability study with limits that is "every reading within them", its Ppk said beside it.
- **Sign-off:** one new field on the program, `signedOff` — the names and the day (one JSON column, `programs.signed_off`,
  additive; `supabase/PROGRAM_SIGNOFF.sql`, applied and read back). Nothing takes a sign-off back by itself — a test,
  a deleted test or the floor's status leave it standing; a criterion that slips afterwards is said beside it (*Since
  it was signed off, … reads didn't pass*). The owner and the team sign off (can.edit); a client reads it.
- **Programs from before:** a program already proved keeps its date and says how (*Proved by its test*, *Signed off by
  hand*), as today. A program with no criteria picked works as today — a passed test proves it — until criteria are
  picked; then only the sign-off does.

## Left out, on purpose

- **Which stops were outside the machine** — not here; it is said in the tools that count stops (Rowland: "it'd be
  captured in other things").
- **A machine-efficiency figure** (run time ÷ time less outside stops) — belongs in a tool (the loss count or
  reliability), not in the program; a separate piece if wanted.

## The build (done 28 October)

1. `PROGRAM_SIGNOFF.sql`, the mapper and the schema test.
2. `lib/programs`: a program's criteria and their answers (`criteriaOf`), ready to sign off, signed off — with unit
   tests (program 5: the net run left off, a capability study and a reliability study picked, both passed, signed off
   by two names).
3. The program row: its criteria, *Add a criterion* (the tools), *Sign off*.
4. The machine page, Now, Commission's board.
5. The three papers.
6. An acceptance script: program 5 walked from no criteria to signed off, every place moving with it.

## Which tools can judge a test — 30 October audit

Rowland, 30 October, shown the picker: *"test i only have 5 tools to pick from ???"* — and, told that only four tools plus
the run test give a verdict: *"Five tools in the criteria picker — what are you saying, we only have 5 tools built? We
should have many more that offer a verdict?"* He is right that the app has many more tools and modes than four. The question
is the one this document always asked: **which of them end in a genuine verdict against a stated target or limit, worked out
by the tool's own module?** Every app tool (`src/catalogue/registry` APP_TOOLS: analysis, calc, capability, changeover,
chart, linebalance, linestandard, linework, logs, losses, reliability, sampling, talk, valuestream, video) and every
available catalogue entry under them was read against that rule. Nothing is offered for the sake of a longer list.

**The rule.** A tool is a criterion when (1) its record states what it is judged against — a limit, a takt, an MTBF wanted,
the minutes it must come in at; (2) its own module computes passed or didn't pass from that, the same one its page, its
paper and `studySays` read (never re-derived for the program); (3) it can say *not yet* while it cannot tell, and says so
in words. A tool that shows figures with no target is **never** offered; a figure that turns green on its page is not a pass
unless it is a pass against something stated.

**How the answer is read.** `lib/programCriteria studyAnswer` takes the tone of `lib/studyLinks studySays` — green is
**Passed**, red is **Didn't pass**, anything else (neutral grey, amber *so far*, *not set up*, *too few*, *not agreed*, *not
timed*) is **Not yet** — with an overrule beside it taking its place and *Gone* for a deleted study. The one addition of
30 October is `canJudge`: an analysis question that gives figures only is **Not yet** whatever its page's colour, and says so.

### The audit

| Tool and its modes (catalogue) | Module function that gives the verdict | Words and tones it can return | How *not yet* is told from a verdict | Decision |
|---|---|---|---|---|
| **Capability study** — measured between two limits (FC-094), one limit (FC-095), not bell-shaped (FC-096), before capability (FC-097), reject rate (FC-098, FC-088), faults per item (FC-099, FC-089, FC-102), pass or fail one at a time (FC-100), across products and time (FC-101), held at a rate (FC-083), machine Cm/Cmk (FC-084), tolerance stack (FC-116), defect tally (FC-124/125), give-away, lowest legal fill, multihead weigher, sold by weight, volume packs, seal, residual oxygen, CCP (FC-156–158, 162, 163, 165, 167, 169) | `tools/capability/sample sampleSays` (and `modes` runsSays / faultsSays / rateSays) via `studySays` | green *Passed* · red *Didn't pass* · amber *so far* (n of count, within the limits so far) · grey *Not agreed / Not measured* | amber and grey are never a verdict: readings still to take, limits not agreed | **Offered** (since 28 Oct) — every mode states its limit, share allowed or rate in its agreement |
| **Control chart** — XmR (FC-086), X̄-R/S (FC-087), signals (FC-090), CUSUM/EWMA (FC-091), pre-control (FC-092), short-run (FC-093) | `tools/chart/chart chartSays` | green *In control* · red *Out of control* · amber *A signal* · grey *In control so far* (limits still provisional) / *Too few* | limits not yet set from a steady period are grey *so far*, not a pass | **Offered** (since 28 Oct) |
| **Reliability** — MTBF and failure rate (FC-058), Andon calls (FC-015), short stops (FC-055), repair times (FC-059), growth (FC-061), Weibull (FC-060) | `tools/reliability/reliability studyReliabilitySays` → `reliabilitySays` (met / short against the MTBF wanted) | green *meets it* · red *short of it* · grey/amber *on it, not yet sure / below it, not yet sure / no MTBF wanted* | the interval has not cleared the MTBF wanted, or none was wanted: grey | **Offered** (since 28 Oct) |
| **Analysis** — did it change (FC-105), do two ways agree (FC-106), gauge Type 1 (FC-119), bias/linearity/stability (FC-120), Gauge R&R (FC-118), inspectors agreeing / kappa (FC-121) | `tools/analysis/analysis analysisSays` → `better()` (the right way for this measure), `paired` (inside what does not matter), `gaugeSays` (Cg/Cgk against the need), `grrSays` (%GRR bands), `attrSays` (kappa bands) | green / amber / red by the module; *Moved the right way* · *Moved the wrong way* · *Agree* · *Differ* · *Fit* · *Not fit* · *Acceptable / Marginal / Not acceptable* | too few readings, no change shown, borderline, incomplete grid: grey/amber | **Offered** (since 28 Oct) — but only these questions (`ANALYSIS_JUDGES`) |
| **Analysis** — how sure (FC-104), how many readings (FC-020, 113), groups (FC-107), counts in a table (FC-108), relations (FC-109, 110), learning curve (FC-027), shape that fits (FC-114), describing (FC-103), autocorrelation (FC-115) | `analysisSays` — intervals, sizes, p-values, fits | grey throughout, or green for *enough readings / bell-shaped / learning*, which describes the data, not a limit | they state no target: nothing to pass | **Offered as a tool, not as a verdict (30 Oct):** `canJudge` makes such a question *Not yet* whatever its colour, and the row says *it gives figures, not a pass or fail* — it can never be signed off by accident |
| **SMED** — a changeover timed, separated and cut down (FC-068) | `tools/changeover/changeover changeoverSays(f, agreed)` and `againstStandard` (the same half-minute rule) via `studySays`; the minutes from `mustComeIn` | green *Within the N min standard* · red *Over the N min standard by M* · grey *Not yet against N min* / *N min now* | no minutes set (nothing stated to judge by), nothing timed, an element with no time, or an element carried from the changeover before and not timed again: *Not yet*. Over is still over with an element untimed (the minutes are at least this) | **Offered (30 Oct).** Before today a SMED study had no target of its own — the agreed minutes lived on a product's line standard — so it could not judge anything. It now has one: **`agreed.changeover.minutes`**, typed on the SMED itself (*It must come in at*), judged by the module's own rule. No record change (the study's `agreed` is jsonb) |
| **Line balance** — each person's work against takt (FC-032), combination table (FC-007), takt (FC-008), time study (FC-019), person–machine (FC-026), ECRS (FC-028), order of work (FC-033), read from footage | `tools/linework/balance balanceLine` / `balanceSays` via `studyBalance` | green *Within takt* · red *Over takt* (who, by how much) · amber/grey *Not timed / Short of cycles / Not agreed* | no takt agreed, an element untimed, too few cycles: *Not yet*. A person already over takt is a floor, so *Over takt* stands even with elements to time | **Offered (30 Oct).** Its record is a study (`tool: balance`) on a product's line standard, so it is made for the program *from a standard* (`criterionBalance`, the same `balanceStudyFor` the balance's own Start uses) or picked once timed (`balancesToPick`) — it cannot be made bare |
| **Line capacity** — sheet, V-curve, bottleneck (FC-034), lines feeding one place (FC-035), what-ifs (FC-036) | `tools/linebalance/capacity analyse` → `gap` against `targetPerMin` (*meets the target / N short of it*) | would be *Meets the N target* · *N short of the target* · *no target yet* | no target given, or stations without speeds | **Qualifies — not built, and why.** Its record is a product's **line standard** (`Standard.capacity`), not a study. A criterion of that kind needs a third `Criterion.kind` (`'standard'`, additive in the `programs.criteria` jsonb, no migration) **and** every reader of a program's criteria to be handed the standards beside the studies — Now, the machine pages, the line records, the floor, the standing, the client report, Commission and the three papers all read `criteriaOf(p, studies, tests)`, ten places. That is a slice of its own (S: "criteria that read standards"), not a line in a picker. Meanwhile a balance's takt follows Line capacity's target, so *Line balance* judges the people against it |
| **Loss count** — a shift's time model (FC-049), losses in money (FC-189, 190) | `tools/losses/losses lossSays` | grey (the loss in minutes, packs and pounds); amber *nothing lost / check the counts* | there is no target: a loss is a size, not a pass | **Not offered** — a figure with no stated target. (The line's *expected* packs are the bottleneck's own speed, not something agreed for a program) |
| **Work sampling** — what people do at random moments (FC-022), bottleneck walk (FC-037) | `tools/sampling/sampling samplingSays` | grey throughout: shares with margins, *too early*, *from n taps* | it states no share wanted — "what is too much waiting is the team's to say" | **Not offered** — no stated target |
| **Value stream** — current and future state (FC-001) | `tools/valuestream/steps flowSays` | grey: lead time, share adding value | no target on the map | **Not offered** — figures only |
| **Check logs** — 5S (FC-013), CILT (FC-062), planned maintenance (FC-063), first-off (FC-071), calibration (FC-122), checkweigher (FC-164), code and label (FC-166), metal detection (FC-170), allergen changeover (FC-171), cleaning ATP (FC-172), scored audits (FC-177), condition checks (FC-234), stops timed (FC-051) | `tools/checks/owed statusOf` / `says logSays` | green *Up to date* · red *n overdue / n failed* · amber *n due* · grey *Not started* | — | **Not offered.** A log is a standing that never closes: *up to date* turns to *overdue* by the clock alone, so a signed-off program would read *didn't pass* next morning with nothing done wrong. Each check inside it states its own limit, but that is a log's verdict on a round, not a program's evidence. A scored audit has a score and findings but no pass mark |
| **Scored registers and boards** — equipment criticality (FC-064), maintenance measures (FC-067) | `tools/scored/scored scoredSays`, `tools/board/board boardSays` | rankings and roll-ups; amber *incomplete* | no target — a rank, a roll-up of other records | **Not offered** |
| **Calculators** — kanban (FC-009), Little's law (FC-044), cost deployment (FC-057), critical spares (FC-066), uncertainty budget (FC-123), OC curve (FC-131), safety stock (FC-183), NIOSH (FC-207) | `tools/calc/calc calcSays` — each definition's `tone` | mostly grey (a size); red *shelf life used up* (Little's law); NIOSH lifting index green/amber/red by band | a calculator sizes something; only two carry a band, for a task not a machine, and each must be picked by definition | **Not offered** — sums, not tests. NIOSH's index is a genuine limit for a lifting task; it can be added with its own picker line when a program is about handling |
| **Line standard** (FC-006), **Line Talk** (FC-202), **Video study** | drawing; conversation; footage read into a *line balance* | none | — | **Not offered** — no verdict. (A video study read as a line balance is a Line balance study and is judged as one) |
| **The run test** (FC-075 program proving, FC-076 performance run at the agreed rate) | `lib/programJourney` — passed once any attempt passed; speed, minutes, rejects, net only when given | *Passed* · *Didn't pass* · *Not yet* | planned or not run | **Offered** (the picker's last choice, since 28 Oct) |
| **Not tools** — the stage gate, acceptance tests, handover (FC-073, 074, 078–080), 6M, fishbone, five whys (FC-146–148), problems and actions (FC-154, 194), control room (FC-193) | — | — | — | Not a record that judges a machine |

### What the picker offers now

**Seven choices, from five:** Capability study · Control chart · Reliability study · Analysis · **SMED** · **Line balance** ·
Run test. Each chip says before anything is made what it judges (`CRITERION_HELP`): *SMED judges: the changeover timed
against the minutes it must come in at — set on the SMED itself*; *Line balance judges: every person's work timed within
takt, on a product's line standard.* The chips wrap (`.spp-pick`); at 375 px none is off the side. A SMED is made for the
program on its machine and set up in the tool, like the first four; a line balance is made from one of the project's (else
the line's) line standards, or an already-timed one is picked. Everything that lists criteria — the Programs row, the
Programs report, the machine page and report, Commission's sheet, the commissioning report — reads `criteriaOf`, so a new
tool shows in all of them with its own title (*SMED — …*, *Line balance — …*), its own sentence and its short form in the
sign-off line (*Changeover to 2 kg: Within the 20 min standard*, *Finest Red 2kg: Within takt*).

**Why not more.** Of the 236 catalogue entries, 124 are available; the ones above that end in a verdict against something
stated all run through *five* tools' modules — capability, chart, reliability, analysis (with its gauge, R&R and agreement
studies) and, from today, SMED and line balance. The rest either state no target (loss count, work sampling, value stream,
the calculators' sizes, rankings) or are a standing, not an end (check logs). Line capacity is the one tool with a real verdict
that is not offered yet, for the reason in its row — and it is named here so it is not forgotten.

### The limits of today's build

- A program's SMED is judged by the minutes typed on the SMED. The agreed minutes on a product's line standard
  (`Standard.capacity.changeovers`) still judge the SMED's own page and paper when none is typed, but the program's answer
  does not read them — `criteriaOf` is not handed the standards (the same reason Line capacity waits).
- A device on an older build reads a program's SMED or balance criterion like any other study (`kind: 'study'` is unchanged);
  it shows it as *SMED* only once it has the new build. No record changed; no migration.
- An analysis picked before today whose question only gives figures now reads *Not yet* with its reason, where it could read
  *Passed* on a green page (a learning curve falling, a bell-shaped fit). That is the audit's one tightening.
