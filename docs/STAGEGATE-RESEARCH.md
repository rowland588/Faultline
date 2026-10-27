# The stage gate remapped — what others do (research, 26 October)

Rowland, 26 October: *"we need to get the correct .. lets remap.. google and
research what we should do lets see what others are doing."* This is that
research: how commissioning, completion, test-management and field apps are
built, the pattern they share, and what that pattern says about Faultline's
stage gate. **Design only — nothing is built until Rowland says go.**

Honesty about the sources: most are the vendors' own pages and help
centres (they describe features, not results); the colour-tag levels, the
punch categories and the obeya rule are industry practice from several
independent write-ups; one field-worker study (UTS) is research. Links are
at the foot.

## 1. Who was looked at

| Kind | Who | Why it matters here |
|---|---|---|
| Commissioning / completion | **CxPlanner**, **Omega365 Completion**, **CxAlloy**, **Bluerithm**, **Wrench SmartProject**, **Facility Grid** | The closest thing to our stage gate: equipment through tests to handover |
| Validation (pharma IQ/OQ/PQ) | **Kneat**, GMP deviation guidance | Run a protocol, a step fails, a deviation is raised, it is retested — the discipline of test → fail → fix → retest |
| Field work | **Fieldwire**, **Procore**, **SafetyCulture** (iAuditor) | Used on the floor on a phone by people who are not office workers |
| Test management | **Testsigma**, **TestCollab**, **Testomat**, **Gemini**, testmanagement.com | Run history, retests, a defect traced back to the run that found it |
| Status and simplicity | **Basecamp Hill Charts**, obeya / visual management | How a team says "where are we" without a spreadsheet |
| Packaging start-up | **PMMI vertical start-up report**, Packworld, EFESO (TPM Early Equipment Management) | Our own world: new packaging lines with the OEM |

## 2. What they all do — the shared pattern

### 2.1 The machine is the spine
Every commissioning tool hangs everything off the **equipment record**:
CxPlanner's asset register (each machine with its checklists, tests and
status), Omega365's tree (project → system → subsystem → tag, status at any
level), CxAlloy's equipment list (test, checklist and issue totals per
machine), SafetyCulture's assets (inspections and actions on the asset's
profile, its history there). **Nobody organises by "the day", "the journey"
or "the plan".** The machine is where you go, and its page tells its whole
story.

### 2.2 Very few nouns
SafetyCulture runs whole factories on four: **Inspections** (what you
execute), **Issues** (what went wrong), **Actions** (who does what by when),
**Assets**. Fieldwire runs a building site on one — the **task** — with a
status. Commissioning tools add **tests** and **punch items**. Faultline's
stage gate today has stages, tests, fixes, problems, programs, parts,
materials, notes, actions, studies, the day, the journey, the plan, Needs
you — fourteen.

### 2.3 The gate is a tag on the machine, not a page
Commissioning practice runs equipment through **levels**, each a coloured
tag on the machine: L1 red (factory test / FAT), L2 yellow (delivered and
checked), L3 green (start-up and pre-functional), L4 blue (functional
performance), L5 white (integrated systems). CxAlloy gives each machine a
**Ready status and date**. The gate is a *state of a machine*, read across
the machines in one view — not four pages to visit.

### 2.4 One place to record, and failure raises the problem where it happened
- SafetyCulture: an action is made **from the flagged item** while you
  inspect; an inspection can refuse to close until it has.
- Kneat / GMP: a step whose result does not match the expected raises a
  **deviation**, recorded with the test, **its run number** and step.
- Omega365: punch items come **out of** inspections and tests and must be
  closed before completion or handover is accepted.
- Gemini (test management): from a defect, **Source** opens the exact run
  that found it.

### 2.5 The retest is the proof the fix worked
- Test management keeps every **run** of a test — who, when, the result —
  side by side (Testsigma run history, TestCollab's run-wise view), and
  Testomat shows **what changed** between runs.
- The established retest method starts from the **fixed** defect and runs
  the test that found it; the defect is **fixed → verified**, not closed,
  until it passes.
- Fieldwire's punch item has the same two steps: **Completed → Verified**.
- A good trial log names the run it came from, the **one thing changed**,
  the result against the run before, and keep or revert.

### 2.6 What blocks handover is counted, and categorised
Punch items carry a **category**: A blocks start-up or handover, B blocks
completion and is carried forward with a name and date, C is cosmetic.
Readiness is **counted** (closed against total), never estimated. Handover
can be the whole project or **one machine at a time**, and the handover pack
(certificates, checklists, what is still open) is **generated from the
records**.

### 2.7 The status and the reports come from the same records
CxPlanner's dashboards are built from the same field data as the tests and
move when a result is submitted. The weekly report the practitioners
describe is always the same five things: **readiness per machine, each
machine's ready status, open punch items by category with owner and date,
the OEM's items apart, and a look-ahead** of what is coming. Many reports,
one set of records.

### 2.8 Status is read in seconds
Obeya and visual management: **normal recognisable in 1 second, a problem
in 3, the next action in 10** (the 1-3-10 rule); red and green with a trend
and a photo over dense tables, and **a red always linked to its
countermeasure**. Basecamp: for uncertain work, progress is not a
percentage — say whether you are still *working it out* or *getting it
done*, and keep a snapshot each time it moves.

### 2.9 Built for the floor
The UTS field study: designed for glare and offline, the **history of the
asset at hand** where the work is. Practitioners: few taps, one hand,
essential functions only, shadow the real people before designing.

### 2.10 Packaging start-ups are iterative
PMMI (vertical start-ups): the barriers are coordination with the OEM,
**technical validation (FATs and tests)**, and people's knowledge; a
vertical start-up is "an iterative process that might require adjustments
and refinements". Packworld: find the line's **real** speed, which differs
from the designed one. That is Rowland's program loop: run, change, run
again.

## 3. Faultline's stage gate held against the pattern

| The pattern | Faultline today | Verdict |
|---|---|---|
| Machine is the spine | A machine page exists (since slice 3), but work is reached through the Plan's five tabs, the day, the journey, Programs, Commission | **Turn it round**: everything starts from the machine |
| Few nouns | Fourteen places and nouns | **Cut** to the four the floor uses |
| Gate = tag on machine | Four gate pages + Timeline as tabs | **The gate becomes each machine's tag**, read on one board |
| Fail raises the problem there | A fail can raise a problem, but the problem does not say which run found it | **Keep, and record the run** |
| Retest proves the fix | The retest exists but is not tied to the fix it proves; a program's status lives in four records | **One run history per test / program**, each run naming what changed; a problem is *fixed* until its retest passes, then *verified* |
| Blocks handover, counted | Priority Critical / High / Low; handover counts | **Critical = blocks handover** (category A), said so; High carried forward with owner and date |
| Status and reports from the same records | Yes — one engine, many papers | **Keep — this is a strength.** The reports stay many |
| 1-3-10 | The front page says a sentence, tiles, Needs you | **Keep the idea**, fewer things on it |
| The day / the journey / the plan as places | Three pages | **Nobody else has them as places** — they are *filters of time* over the same records |

## 4. The remap — four places, from the pattern

**Machines** is the spine; **Problems** is the one list; **Now** is the
status; **Reports** are the many papers. Time (today, a range, the Gantt)
is a filter on any of them, not a page.

1. **Now** (the project's front page) — where are we, in 1-3-10: the
   sentence, readiness counted (machines at each gate, programs passed of
   all, problems that block handover), the look-ahead (today and the next
   two weeks — what the day was), and *what you owe*. One button: record
   something. **Replaces** the front page, the day, Needs you.
2. **Machines** — the board: every machine, its gate tag, its programs'
   state, its open problems, its next date. Tap a machine: its page — gates
   as a ladder, its checks, **its programs, each with its run history**
   (run → what we saw → problem → fix → what changed → retest), its
   problems, its materials, its documents. The Gantt is a view of this
   board over time. **Replaces** the Plan's five tabs (Timeline, Install,
   Set up, Commission, Hand over), Programs and the commissioning grid.
3. **Problems** — every problem on the project, as Rowland likes it, each
   saying **which machine and which run found it**, its fix, and its
   retest; *open → fixed → verified*. Its category says whether it blocks
   handover. Actions (who owes what by when) are a view of it with the
   other dated work. **Replaces** Problems and Actions as two places.
4. **Reports** — the papers, all kept: the one-page status, the full
   report, the programs report (now the run history of every program), the
   commissioning report and cards, the handover pack, the client report —
   any of them for **any date range** (what the journey was). **Replaces**
   the journey as a page and the Reports sheet.

Kept as they are, one tap away under More: Materials, Tools, Notes,
Details.

**What disappears is only routes, never information**: the day is Now's
look-ahead; the journey is Reports over a range; the plan is the Gantt view
of Machines; the four gates are the tag on each machine; Needs you is
Now's "what you owe".

**Built 26 October — the tabs** (Rowland: "9 are still to many tabs review",
then "do it"). A stage-gate project's tabs are **Now · Machines · Problems ·
Reports · More**. Now is the front page (the old `/now` lands on it); the
day, the journey and Actions are reached from Now and light it. Machines is
the plan — its gates, the timeline and Programs are its views. Problems is
the project's fixes and problems. Reports opens the reports. More holds
Materials, Tools, Notes and Details. Every page and address is kept; only
the tabs moved. The one machine record (§5) and the problems' run → fix →
retest (§2.5) are not built yet.

### 4.1 The factory, its lines, its machines — the spine already exists

Rowland, the same day: *"but we have factory, lines, machines ??"* Yes —
and that is the research's own pattern (Omega365's project → system →
subsystem → tag; one asset register). So the project does **not** get
machines of its own. The spine is the app's, and it is shared:

**Factory → Line → Machine** — the real things, one home each (Your
factory, the line's page, the machine's page). A **project** is a change
made *across* some of those machines. Its *Machines* board is **the
factory's machines that this project is changing** — a view, never a
second list.

- **One machine, one record, on its line.** Today a machine is half the
  line's (a name in its flow-order list) and half the project's (the
  `Asset` the project made), joined by name (`lib/lineRecords`) — which is
  why a rename can leave a study behind. The remap: the record belongs to
  the line; a project points at it.
- **One machine page, reached two ways.** From the line: everything ever
  done on it — every project's gates, the line's own programs, its
  studies, its problems. From inside a project: the same page, this
  project's gates and runs first.
- **Handover is the machine passing from the project to the line.** Its
  gate tag ends in *handed over*, and from then on it is the line's — in
  production, its programs and problems the line's own (the factory's
  "one part of the factory to another", CLAUDE.md, *It is an internal
  tool*).

## 5. One record of the machine — the plan (Rowland liked it, 26 October)

*"i like the idea of one record of the machine this makes sense to me."*
Not yet a go to build; this is what it would take.

### 5.1 How a machine is held today (read from the code and the live database)

- **The line's list is names only.** `Workspace.assets` is the line's
  machines in flow order, as words.
- **The record is made by a project.** A machine's record
  (`commission_assets`, `Asset`) carries `projectId` (the project that
  brought it) and `workspaceId` (its line). The two are joined **by name**
  (`lib/lineRecords` machinesOnLine — "the line's own record first, then a
  job's, for a name both carry").
- **Some things point at the record, some at the name.** By record: tests,
  programs, problems (`assetId`). By name only: a study's machine, a stop
  timed, a Line capacity station, a reliability count, a check log, Line
  Talk's context. So a rename moves the first group and leaves the second
  behind; two projects on one line could each make a record of the same
  machine.
- **Live, 26 October:** 2 machine records (both made by the project), 3
  names in the lines' lists, no name held twice; 40 tests, 3 programs, all
  on a record; 6 studies, 16 problems, 3 lines, 1 project. Small — the
  move is cheap now and gets dearer with every project.

### 5.2 The rule

**A machine is one record, on its line, from the day it is named.** Its
name, maker, place in the flow, arrival (due and in), documents. A project
never makes a machine; it **takes one on** (a new machine is added to the
line first, by the same form, then taken on). Everything done to a
machine points at the record — never its name — so a rename carries
everything, and a machine's page can show everything ever done to it.

### 5.2a Slice 1 as built (27 October — "Do one record per machine")

What the live database showed changed the first slice. Its "lines"
include the projects' walk and demo workspaces, whose lists are the
template names (*Flow wrapper … Palletiser*) and places (*People*, *NVA*,
*Whole line*). Making a record of every name would have made fake
machines of them. So a record is still made the first time more than the
name is said — but **through one door, so a line never holds two of one
machine**:

- **A project adding a machine its line already holds takes the line's
  record on** (`db/lineRecords` addProjectMachine — Install's *Add a
  machine* and Programs' typed machine): same id, its maker and history
  kept, the project's now. A project's record that the line names later is
  the one the line uses (`machineRecordFor`, as before).
- **Two records of one machine on one line are merged** (`lib/machineMerge`,
  run by each device on start and after every sync): a project's record is
  kept before the line's own, then the smallest id — the same answer on
  every device. The other is put away (`deleted_at`) with `mergedInto`
  naming the kept one — nothing deleted — and its tests, fixes, programs,
  studies and notes point at the kept one; what it knew (maker, note,
  dates, documents) the kept one takes.
- **Only the line's own records are put away.** Deleting a project's record
  is its owner's (`ACCESS_LEVELS.sql`), so a project holding two records of
  one machine — or two projects one each — is left and listed (`held`)
  for slice 3.
- **The database**: `commission_assets.merged_into` (`ONE_MACHINE_RECORD.sql`,
  applied and read back: no line held one machine twice; nothing moved).
- **Proved**: `lib/__tests__/machineMerge.test.ts`,
  `scripts/acceptance/one-machine.mjs`, and the sync harness's scenario 12
  (two devices, one offline, each making the record; one kept everywhere).

Not in slice 1: a record for every name on a list; studies, stops,
stations and counts pointing at the record (slice 2).

### 5.3 The slices (each shipped on its own, nothing removed until proved)

1. **Every name on a line becomes a record**, the line's own; a project's
   record for a name its line already holds is merged into the line's (the
   references moved, the other kept as `mergedInto` for Undo) — on the
   database by a migration with a copy kept, and on each device by the
   same rule on its next start. The line's list keeps working, read from
   the records.
2. **Everything named points at the record too**: studies, stops,
   stations, reliability counts, check logs get the machine's id beside
   the name they keep; a rename carries them (the defect T−1 closed).
3. **A project takes machines on**: its machines are the line's records
   it is working on (a list on the project's line link); Install's *Add a
   machine* adds to the line and takes it on in one step.
4. **One machine page**: the same page from the line (everything ever
   done) and from a project (this project's gates and runs first) — the
   spine of the remap in §4.
5. **Handover passes it to the line**: the gate's last step says the
   machine is the line's from that day.

Each slice proved by the gate, the sync harness (two devices, one
offline making a machine under the old rule), paper parity, and the
acceptance scripts that touch machines (factory, lines, line-hub,
machines-programs, stagegate-walk).

## 6. What the research does not settle — for Rowland

1. **Gate names.** The industry's L1–L5 (FAT, delivered, start-up,
   functional, integrated) or Faultline's own (on site, installed, set up,
   commissioned, handed over)? The research supports the idea (a tag a
   gate), not the words.
2. **Blocks handover.** Is *Critical* the same as "cannot hand over with
   this open", or a separate tick?
3. **Verified.** Does a problem need a retest to be *verified*, or may a
   person verify it by eye when there is nothing to retest?
4. **The one-machine handover.** Hand over machine by machine, or only the
   whole line?
5. **Proof before build.** A clickable mock-up of the four places on the
   design canvas, walked on Program 5's real loop, before any code — and
   the move made by adding the new pages beside the old, proving them, then
   retiring the old (CLAUDE.md rule 1).

## Sources

- CxPlanner — [completion management](https://cxplanner.com/completion-management-software), [asset management](https://cxplanner.com/feature/asset-management), [global test view](https://help.cxplanner.com/en-us/article/navigate-and-use-the-global-test-view-2dstdn/), [dashboards](https://cxplanner.com/data-centers/platform/dashboards-analytics), [modular FAT→SAT](https://cxplanner.com/data-centers/industries/modular), [level testing](https://cxplanner.com/data-centers/resources/data-centers-level-testing)
- Omega365 — [completion management](https://www.omega365.com/products/completion-management), [features](https://nsb.omega365.com/products/features-com)
- CxAlloy — [equipment](https://support.cxalloy.com/article/535-equipment), [ready for commissioning](https://support.cxalloy.com/article/905-ready-for-commissioning)
- [Bluerithm](https://bluerithm.com/building-systems-commissioning-software/), [Wrench SmartProject](https://www.wrenchsp.com/?p=58633)
- Kneat — [solution overview](https://kneat.com/wp-content/uploads/2023/08/Kneat-9.0-Solution-Overview-Brochure_FINAL.pdf), [commissioning and qualification](https://kneat.com/application/commissioning-and-qualification/); GMP [validation test deviations](https://www.gmpsop.com/gmp_documents/guidance-046/); [protocol deviations](https://www.ofnisystems.com/services/validation/protocol-test-deviations/)
- Fieldwire — [custom task statuses](https://www.fieldwire.com/blog/fieldwire-announces-custom-task-statuses/), [help](https://help.fieldwire.com/hc/en-us/articles/360040915311), [App Store](https://apps.apple.com/app/id780165517); Procore [inspections](https://support.procore.com/procore-mobile-ios/user-guide/inspections-ios)
- SafetyCulture — [help 003186](https://help.safetyculture.com/en-US/003186/), [help 003525](https://help.safetyculture.com/en-US/003525), [help 004079](https://help.safetyculture.com/004079)
- Test management — [identifying retests](https://www.testmanagement.com/blog/2012/07/identifying-retests-with-test-management-tools/), [Testsigma run history](https://testsigma.com/docs/test-management/test-cases/run-history/), [TestCollab previous runs](https://help.testcollab.com/en/articles/12087524-viewing-test-case-details-from-previous-runs), [Testomat history](https://testomat.io/features/history-test-cases-changes/), [Gemini run history](https://docs42.countersoft.com/docs/300/page/304/test-run-history)
- Status — [Basecamp Hill Charts](https://basecamp.com/hill-charts), [Signal v. Noise](https://signalvnoise.com/svn3/new-in-basecamp-see-where-projects-really-stand-with-the-hill-chart); obeya — [lean.org](https://www.lean.org/lexicon-terms/obeya/), [Fabrico](https://www.fabrico.io/blog/obeya-room/), [Magnatag 1-3-10](https://www.magnatag.com/blog/author/mikep)
- Punch categories and readiness — [Mango pre-commissioning walkdown](https://www.mangoapps.com/templates/inspections/pre-commissioning-walkdown-punch-list-by-system), [CxPlanner progress reports](https://cxplanner.com/blog/2019/03/20/cx-progress-reports)
- Packaging start-up — [PMMI vertical start-ups 2023](https://www.pmmi.org/report/2023-achieving-vertical-startups), [Packworld communication](https://www.packworld.com/trends/operational-excellence/article/22913928/why-communication-is-crucial-for-a-successful-vertical-startup-in-packaging), [Packworld flexible line start-up](https://www.packworld.com/leaders-new/machinery/bag-pouch-fill-seal-pre-made-bags/article/13364153/tips-for-a-successful-flexible-packaging-line-startup), [EFESO vertical start-up](https://www.efeso.com/efesogroup/casestudies/best-vertical-startup-site-40-percent-reduction); FAT/SAT — [Fabrico](https://www.fabrico.io/blog/factory-acceptance-testing-fat-manufacturing-guide/), [OXMAINT](https://oxmaint.com/industries/manufacturing-plant/manufacturing-fat-and-sat-documentation-management-guide)
- Field UX — [UTS / Retriever field study](https://www.fieldtechnologiesonline.com/doc/retriever-communications-field-service-study-heuristics-mobile-application-design-0001)
