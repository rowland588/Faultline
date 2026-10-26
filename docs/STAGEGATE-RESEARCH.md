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

## 5. What the research does not settle — for Rowland

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
