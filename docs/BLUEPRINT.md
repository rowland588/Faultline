# Faultline — the blueprint

**Status: proposed 13 October, for Rowland to agree.** Once agreed this is the
one map of the app. Every request is placed on it before anything is built
(§8). It replaces the shape in `MAP.md` (project → lines → tools) and
`PRODUCT.md`'s "the workspace is the place". The other docs stay, each as the
deep design of one part (§5.10).

---

## 0. Why this exists

Rowland, 13 October:

> "Our issue is we are building the app bit by bit ... as I'm giving you new
> commands all the time ... but it falls down. We likely have old code that
> we don't need. Old system entangled with new models. An app that's not fully
> connected and organised. ... You need to design the app — not just what we
> have but how it should be, the parts we missed — and then plan the full
> build carefully."

**The diagnosis.** Each request was built well and alone. When the backbone
moved (lines became the factory on 13 October), the things that belong to a
line did not move with it: machines, programs, capacity, shifts and measures
are still owned by projects. So the same real thing is held in two to four
places, older models are still wired in (the Excel tracker, Project Pace,
3P, one project only), and 22 design docs exist with no master.

**The inventory, 13 October** (read from the code, not from memory):

| | |
|---|---|
| Code | 89,493 lines · 61 screens · 132 logic modules · 88 UI parts |
| Records | 30 local stores, 21 synced to the cloud |
| Design docs | 22 files, 8,144 lines — none of them the whole |
| Imported by nothing | `lib/paceLineMatch`, `ui/Peers`, `lib/ie/mix`, `lib/ie/ergo` (`lib/xlsxRead` looked so, but the export test reads the exported workbook back with it — it stays) |
| Synced, read by no screen | `project_targets`, `project_actuals` |
| Excel tracker still wired | about 35 files *named* it — though ruled out on 1 October ("there will be no Excel that needs to be uploaded"). On tracing (Stage 0): the upload itself was already gone; what was left was the board's shapes in a file called `tracker`, a store nothing wrote, and the old names |
| "Pace" (Project Pace, the first single project) | 173 files |

---

## 1. The shape — four layers

```
CONTROL ROOM   Am I in control? Every line, every job, every problem, every program.
   │
YOUR FACTORY   What is there: lines → machines → programs (and so products) → standards.
   │           The standing truth. Lasts for years, edited any time.
   │
ON THE LINE    The work done on a line, with no job needed: problems taken, tools used,
   │           programs planned and proved, standards set.
   │
JOBS           A change to one or more lines, run one of three ways — stage gate, 6M,
               lever tree. Adds what only the change knows: dates agreed, gates, tests,
               targets, proof, who owes what, the reports.
```

Four rules hold the shape:

1. **One home per real thing**, at the lowest layer where it is true. A
   program is what a machine runs, so it lives on the line. A job points at
   it and never holds a copy.
2. **A job owns no line, machine, program or problem.** It points at them,
   and adds what only the job knows.
3. **Archive is one rule.** An archived job is nobody's context: nothing on a
   line is hidden, renamed or re-homed because a job was archived. Only a
   line's own Archive takes it off the floor (built 13 October, in the gate).
4. **Finished means seen everywhere.** Anything done on a line shows on the
   line's page, in the control room, in every job that points at it, and on
   paper (§4). Something entered in one place and seen nowhere else is
   unfinished.

`CLAUDE.md`'s "the record is the project" still holds for a *change*: a
change is a project. What changes is that lines, and everything that is true
of a line, are no longer under projects.

---

## 2. The records — one home each

| Real thing | Its one home (target) | Where it is held today | What changes |
|---|---|---|---|
| **Line** | `workspaces` + type + floor order | `workspaces`; a job's line (`pace_ppm`) names one; a job's "line walk" is a workspace too | Done (factory slices 1–3, in the gate). `pace_ppm` means "this job is on this line", plus the job's owner and sponsor for it |
| **Machine** | **The line's list of names, in flow order** (`workspace.assets` — what every picker reads and every stop is kept against), each joined by name to **its record on the line** (`commission_assets` + `workspace_id`; `project_id` the job that brought it in, or none) carrying what more is known: who made it, its programs | `commission_assets` (a job's only); `workspace.assets` (names for the stopwatch); capacity stations (a name per product); a problem's machine (free text) | Built, Stage 2 (`lib/lineRecords`). Plate speed stays per product on the line's capacity (D3, Stage 4) |
| **Program** (what a machine runs, for a product) | `programs` on a line and machine: `workspace_id`; `project_id` optional ('' on device) | `programs`, which required a project | Built, Stage 2 — your request |
| **Product** | Not a new record (D2): a line's products are what its programs run, plus any typed on a standard | `programs.runs`, `standards.product`, a changeover's from/to, a loss count's product — all free text | Stage 2: one pick-list from the line (`productsOnLine`), offered when a program is planned; the other "which product" boxes in Stage 3 |
| **Line standard + line capacity**, per product | `standards` (line × product) | `standards.capacity` **and** `pace_ppm.capacity` (a 6M job's own line balance) | Stage 4: one home; the job reads the line's (D3) |
| **Shift pattern, crew, labour cost, margin** | The line | On the line already, but edited only in the old "line settings" screen (`/w/:ws/settings`) | Stage 1: in Your factory and on the line page |
| **Person** (a name who owes things) | — | Free text in every "whose" box; project members for access only | D5 |
| **Problem** | `snags` (a line's) | `snags`; `test_items` of kind *found* (stage gate); `cases` (6M, the head of the fish); `observations` (stops timed) | Keep the four: each method asks different things of a problem. The register already shows all of them; Stage 5 makes them open in one place |
| **Action / fix** | `tests` (stage-gate fixes), `pace_todos` (6M countermeasures) | Same | Keep; one view in the register and in Needs you |
| **Study** (one use of a tool) | `studies` (+ `observations`, `segments` for the stopwatch and the walk) | Same | Keep |
| **Measure** (a number to hit) | A job's targets on a line's readings (`measures`, `targets`, `readings`) | Same, plus `project_targets` / `project_actuals`, read by nothing | Stage 0 removes the dead pair |
| **Job** (a change) | `projects` + its method | Same | Keep. Its lines are picked from the factory (built, in the gate) |

---

## 3. The places — what each is for

**Control room** (`#/`). Your factory first: a card per line saying its health
(problems open and late, programs not proved or due, products with no
standard). Then the jobs board, then Needs you across every line and job.
Reports: the control room report and the factory report.

**Your factory** (`#/factory`). The lines: name, type, floor order (built). Each
line's machines in flow order, each with who made it, and its programs in words (Stage 2, built). Its shifts
and breaks, crew, labour cost and margin (Stage 1). Merge two lines (Stage 1).

**A line** (`#/lines/:id`) — the hub for one line, answering in order:

1. Where it is: its problems (the late ones in red) and programs due.
2. Its machines.
3. **Its products** — one row per product: program proved? · line standard
   set? · capacity known? · changeover timed? Gaps in amber, failures in red
   (Stage 3).
4. Its programs: planned and proved.
5. Its tools and studies.
6. The jobs on it.

Paper: the line report, one page.

**Programs** (`#/programs`, from the control room and from a line). Every
program on every line, planned (what, what it runs, machine, test date,
state, commentary) and proved — **no job needed**. A stage-gate job's
Programs gate shows the programs of its lines' machines: the same records,
not copies.

**Control room problems** (`#/snags`). Every problem on every line and job.
Built.

**The tools**: line standard, line capacity, capability, value stream, SMED,
work sampling, loss count, the stopwatch and the walk. Each is used on a
line, and can be attached to a job. Every "which line", "which machine" and
"which product" offers the factory's.

**Jobs.** Stage gate (Install, Set up, Programs, Commission, Hand over;
Problems, Materials, The plan, The day; reports). 6M (board, fishbone,
evidence, proof). Lever tree. Their machines, programs and capacity come from
the lines they are on.

---

## 4. Connect the dots — where each record shows (target)

| Record | Line page | Control room | A job on that line | Paper |
|---|---|---|---|---|
| Problem | listed, late in red | counted on the line's card (critical and late in red); a line's own one with somebody or a day on it, and every Critical one, in the four numbers, Who owes what, This week and the critical list (`lib/lineWork`); the register | its Problems | card, line group, register, job reports; the control room report's "On the lines, outside any job" |
| Program | its programs; a product's row | programs due / not proved on the line's card; a line's own one not proved in Who owes what, its late in the late and This week (`lib/lineWork`); Programs | the stage-gate Programs gate | programs report (line, job); the control room report's lines |
| Machine | its machines | — | Install grid; every machine picker | factory report (flow order, makers); line report; stage-gate reports |
| Product (standard, capacity, changeover) | its products row | products with gaps, counted | 6M line capacity; the client report | line standard cards; line report |
| Study | its tools, each saying what its latest found (the sentence its own list says) | — | evidence and proof | study's own page; job reports |
| Job | jobs on it, each with its verdict and its late (the control room's own, `lib/useJobInputs`) | jobs board | — | control room report |
| Line | — | your factory | lines it is on | factory report; line report |

A screen that shows a record outside this table must add a row here.

---

## 5. What is old and comes out

Rule 1 of how a change is made: nothing goes until we can say why it was
there and what replaces it.

1. **The Excel tracker import** — `lib/tracker`, `TrackerPicker`, `pace_snapshots`,
   and the files that named them. *Done in Stage 0:* the shapes the board uses
   moved to `lib/actionShapes`; `TrackerPicker` is `ActionPicker` (it picks the
   board's actions for a lever-tree box); `pace_snapshots` is no longer synced
   (0 rows in the cloud, ever). Kept, because it is stored data: the `tracker:`
   prefix in a lever-tree box's saved text. *Why it was there:* before the app
   held the 3P work, the team's spreadsheet was uploaded. *Replaced by* the
   6M board, which holds the work, and Rowland on 1 October: "there will be no
   Excel that needs to be uploaded ... this is about now fully using the app."
   Removed once we know nothing live is still read only through it (D4).
2. **`project_targets` and `project_actuals`** — synced, read by no screen.
   Replaced by `measures`, `targets` and `readings`.
3. **Files nothing imports**: `lib/paceLineMatch` and `ui/Peers` went in Stage 0.
   `lib/xlsxRead` stays — the export test reads the workbook back with it. `lib/ie/mix` and `lib/ie/ergo` are arithmetic built ahead of use: mix
   is wired into capacity in Stage 4 (`CAPACITY.md`, the mix); ergo is a
   decision for later.
4. **"Pace"** — Project Pace, the first single project, named in 173 files.
   The store names `pace_ppm` and `pace_todos` stay (renaming a table is a
   migration for no gain); the code and the words move to *job*, *line* and
   *action* as each file is touched.
5. **Single-project leftovers** (`DEFAULT_PROJECT_ID`, the `paceWorkspace` keys
   in meta): keep reading old data, stop writing new.
6. **A job's hidden "line walk" workspace** becomes the job's evidence on its
   line (Stage 4). No more invisible workspaces named "<job> — line walk".
7. **`workspace.assets`** as the stopwatch's machine list: it *is* the line's
   machines, in flow order — kept, not replaced (Stage 2, as built): names are
   what every stop, problem and station is kept against, so the list stays the
   spine and a machine's record is joined to its name. A rename in Set up the
   line carries the stops and the record together (`renameLineMachine`).
8. **`pace_ppm.capacity`**: moves into the line's per-product capacity (Stage 4).
9. **Old words on screens**: "workspace" (about 7 places), "tracker" (2), "3P"
   (1), "snag" (about 54). One sweep in Stage 0, and a smoke check so they
   never come back. The flow audit (13 October, `FLOW-AUDIT.md` #20) added
   three to the check: "asset" for a machine, and "line balance" and "Maps
   and balance" for Line capacity.
10. **22 design docs.** This blueprint is the index. Each doc stays as the deep
   design of its part, marked where it is superseded; `MAP.md`'s shape is
   replaced by §1.

---

## 6. What we missed — what should have been built without being asked

1. **Programs on a line, planned from the control room** (asked today). A
   running line gets new programs too, with no project.
2. **Machines on a line**, in flow order, with plate speed — set once. Every
   "which machine" offers them: a problem, the stopwatch, capacity stations,
   SMED, a loss count, the stage gate.
3. **The products of a line** (from its programs). Every "which product"
   offers them.
4. **A product's readiness on a line**: program proved · line standard ·
   capacity · changeover. One row per product, gaps showing. For a running
   factory, this is what "am I in control" means.
5. **The line's page as its hub**, and the **line report** on paper.
6. **Per-line health in the control room**, beside the jobs. A line can be
   out of control with no job on it.
7. **Merge two lines** — a duplicate "Line 2B": everything on one moved to the
   other, and the empty one archived.
8. **Shifts, crew and costs in the factory editor**, not in a hidden settings
   screen.
9. **Needs you across lines** (*built 13 October, the flow audit's finding
   1: a line's own problems and programs counted in the control room's
   numbers, its lists and its report — `lib/lineWork`*): programs due and problems late on lines with
   no job.
10. **A people list** (D5).
10a. **Can a person do it all shift — the lifting check** (14 October, after
    a person's pace was built on the work-measurement science,
    `docs/CAPACITY.md` §1). The pace says whether they keep up; it does not
    say whether a palletiser can lift 36 baskets a pallet safely for a
    shift. The revised NIOSH lifting equation (ISO 11228-1) on a person's
    station — the weight, the reach, how often — and repetitive actions a
    minute (OCRA, ISO 11228-3), said beside the pace and on the paper; on
    `standards.capacity`, no new record.
11. **A job's line is the factory's line — one page, one name** (flow audit
    #7). The cheap part is built: the job's rail names each of its lines as
    Your factory does and opens the line's own page (`#/lines/:ws`), two of
    the job's lines on one factory line are one line; the job's footer, its
    Lines cards and its line page say the factory's name, the line page
    links to the line's page; and a job's line with no Line capacity of its
    own shows the line's, linked, instead of an empty one. What is left needs
    Stage 4, and is that stage's work:
    - the job's line page (`#/project/:id/line/:lineId`) folded into the
      line's page, the job's own parts (its numbers against target, the
      board's actions on the line, its wins) a branch there under the job;
    - `pace_ppm.name` and `key` retired for the factory's name — the 6M
      report and the client report still print the job's names ("Line 8");
    - the job's Line capacity (`pace_ppm.capacity`) moved into the line's,
      so the fishbone's *the constraint* and the 6M report read the line's
      (D3) — today they say "not counted yet" beside a line that has one;
    - the stopwatch and the walk (Capture · Analyse · Evidence · Meeting)
      opened from the line's page, so the job's line page is not their only
      door, and those four named for what they are;
    - a stage-gate job's line page loses the 6M sections it carries (Actions
      by bone, Wins).

---

## 7. The build plan

Every stage runs the same way, and ships live on its own:

1. Its part of this blueprint confirmed.
2. The database: a file, applied, read back.
3. The arithmetic, tested.
4. The screens.
5. The paper.
6. An acceptance script.
7. The full gate.
8. Live.

**Each stage removes what it replaces, in the same stage** — no old and new
side by side. The order follows the dependencies.

### Stage 0 — Steady (no new features)
- Ship what is in the gate now: Your factory slices 1–3, the line standard
  board, the archive rule.
- Remove: the files nothing imports; `project_targets` and `project_actuals`
  (the code; the tables after D4); the Excel tracker (after D4).
- Sweep the old words; add a smoke check for them.
- `CLAUDE.md` and `MAP.md` point here; the other docs are marked.
- *Accepted when:* every existing acceptance script still passes, and the
  word check is in smoke.

### Stage 1 — The factory holds the line's facts
- Shifts and breaks, crew, labour cost and margin per pack, edited in Your
  factory and on the line page. The old settings screen keeps only the
  stopwatch's loss categories, or folds into the line page.
- Merge two lines.
- Paper: the factory report carries shifts and crew.

*As built:* the line page's **The line** says its shifts (with breaks or
relief), crew and what it costs while down, and its machines in flow order —
each "Not said yet" when nobody has said it (`lib/lines lineFacts`). **Set up
the line ›** opens the one editor for them, the same sheet the stopwatch's Set
up opens (`ui/StudySetupSheet`) — not a second copy, so the settings screen
stays whole and gains a second door rather than losing its fields. Your
factory's rows and the factory report say each line's shifts and crew.
**Merge…** on a line in Your factory moves everything on it to another line —
problems, frames, film, timed stops, cases, studies, line standards, the jobs'
lines and walks that name it — stamped to sync, counted out loud first; the
two vocabularies join; the emptied line is archived (`db/workspaces
mergeLines`). Accepted by `factory.mjs` 27-30.

### Stage 2 — Machines and programs on the line (your request)
- DB: `commission_assets` + `workspace_id`, with `project_id` optional; `programs`
  + `workspace_id`, with `project_id` optional. Backfill: a job on one line
  gives its machines and programs that line. A job on several lines asks once,
  on screen, "which line is this machine on?".
- Your factory: each line's machines in flow order (name, OEM, plate speed).
- **Programs from the control room**: every line's programs, planned and
  proved, with no job; also on a line's page.
- A stage-gate job's Install machines and Programs gate become the same
  records: a job's machines are the line's machines that it brought in or
  works on.
- Every machine picker uses the line's machines: problems, the stopwatch,
  capacity stations, SMED, loss count.
- Paper: a programs report per line; the stage-gate reports keep their
  content.
- *Accepted by:* `programs.mjs` extended (a line's programs with no job; a job
  seeing them), `factory.mjs` (machines).

*The database, read from the live policies on 13 October* (`supabase/
MACHINES_AND_PROGRAMS.sql`, the `LINE_TOOLS.sql` pattern line standards
already follow):
- `programs` and `commission_assets`: `project_id` is NOT NULL today; add
  `workspace_id uuid`, drop the NOT NULL, and check one of the two is set; an
  index on `workspace_id`.
- Today a row with no job is seen and written only by whoever made it: the
  permissive "member … select/insert/update" rules and the RESTRICTIVE
  "editors only insert/update" rules all fall back to `owner_id = auth.uid()`
  when `project_id` is null. Add a permissive **"line programs" / "line
  machines"** rule (`workspace_id is not null and is_ws_member(workspace_id)`)
  beside the job's, and add the same clause to the two restrictive rules, so
  everyone on the line works a line's program and a project-only client still
  cannot. A row with a job keeps the job's rules.
- `faultline_keep_agreement` already lets a row with no job through (`pid is
  null`), so a line's program or machine has no agreed fields to keep — the
  same as a line standard.
- Backfill: a program or machine whose job has its line (`line_id` → the job's
  line → its `workspace_id`) gets that line; the rest are asked on screen once.
- Read back: `pg_policies` for both tables (each select rule has no
  `with_check`, each insert rule no `qual` — `SECURITY_RLS.sql`'s lesson),
  `information_schema.columns`, the constraint.

*As built:*
- **The record.** A program or a machine says its line (`workspaceId`) and,
  when a job brought it in, its job (`projectId`; '' when none — the line
  standards' pattern). `lib/lineRecords` is the one place that says which line
  a record is on: its own, else the job line it names, else its job's only
  factory line — so a job's program written before Stage 2 is found on its line
  without being written again. A job's new machine or program is given its
  job's line when the job has one (a job on several lines leaves it), and a new
  machine's name joins that line's list.
- **The line's machines** are its list of names in flow order, each joined by
  name to its record; then any machine a job brought in that the list does not
  name. A record is made the first time more than the name is said (who made
  it, a program on it), with the same id on every device for the same name.
- **Programs** (`#/programs`, the rail under Your factory and the control
  room's Your factory): every line's programs, or one line's, machine by
  machine — planned (name, machine — one not listed joins the list — what it
  runs from the line's products, test day, who owes it, commentary), where each
  has got to, its test day (gone by: red) and the day it was proved. A job's
  program on the line shows with its job, one tap to it, and is changed there.
- **The line's page**: *Machines* (flow order, who made each — typed in
  place — its programs, the job that brought it in; a machine named with its
  maker) and *Programs* (the count, the late in red, the ones still to prove,
  late first). "The line" no longer lists the machines a second time.
- **A job sees its lines' own programs** on its Programs page — the same
  records; on a stage gate *Prove it in Commission* plans the proving test
  (`Test.programId`), and the test passed proves the line's program.
- **Your factory**: each row says the line's machines in flow order with
  their makers, and "N machines · M programs, K proved" (late in red); the
  factory report carries the same. **The control room's** line cards say the
  programs still to prove, the late in red.
- **Pickers**: the stopwatch, the walk and a problem already read the line's
  list; Line capacity's station names offer the line's machines and an empty
  capacity starts from them; SMED's "where" offers them.
- **Paper**: the programs report of a line, or of every line
  (`lineProgramsReading` → `drawProgramsReport`, "PROGRAMS · PRODUCTION LINE").
  The stage-gate reports keep their content. A program with a test day and no
  test now reads its test day on every report ("test 16 Oct" / "test was due
  …", red) instead of "no test yet" — what the Programs list always said.
- **A job deleted for ever** leaves a machine, a program or a line standard
  that is on a line where it stands, on no job (`purgeProject`).
- **One program, one answer** (flow audit #3, 13 October: PR-04 read
  *Proved 12 Oct* on the line and *Failed · closed 13 Oct* on the job; a
  failed program was counted done). A failure said on the floor — Set up's
  programs stage — after a program was proved drops it back to on the
  machine (`lib/programs` `programAfterFloor`, on every write of a part:
  `db/programs` `followPart`); a pass older than the failure proves nothing,
  and the failure taken off hands it back to its test. A failed program is
  never counted done: the Programs gate, each machine on it, the programs
  report, the client report and the status page say "3 done — 2 passed, 1
  at baseline · 1 failed". Each side says the other record beside its own —
  the job's row its line's state ("On Line 7: on the machine · failed 13 Oct
  — to prove again"), the line's row what its job's floor said ("On its Set
  up: Failed · closed 13 Oct — …"), on the screen and on both papers. No new
  record.
- **Proved says what showed it** (flow audit #21, 13 October: a line's
  program was *Proved* by a dropdown — no test, no evidence; LEAN40
  principle 6, proved not asserted). *Proved* asks the day and what showed
  it: in words (they become its commentary), or a study on its line that
  shows it (the study names the program — `ToolStudy.programId`, a column
  it already had); a test in Commission proves one on its own, and the form
  says where to plan it. Every proved program says how, under its state
  (`lib/programsReport` `proofOf`): "Proved by its test — …, passed 12 Oct",
  "Proved by the capability study “…” — …" (one tap to it), "Signed off by
  hand", or in amber "Signed off by hand — nothing said shows it" — on the
  line's Programs, the job's Programs list, a job's view of its line's
  programs, the line's and the job's programs reports and the client
  report. The study's own page says the program it shows proved. No new
  record.
- **One list of machines, every picker** (flow audit #14, 13 October: "One
  line has three lists of machines. The problem sheet offers another line's
  machines. The stopwatch offers 1 of 4. Capacity stations never reach the
  line's list ... A study's machine is typed"). `lib/lineRecords`
  `machinesOf(line, job?)`: the line's machines in flow order with the ones
  its jobs brought onto it, and a job's own not yet placed on one line —
  never another line's. Every picker reads it (`useMachinesOf`, or the line
  records): the Problem sheet and the register's editor, the stopwatch
  ("Whole line" first), the walk, Line capacity's station names, SMED's
  "where", a capability study's machine (offered when it is started on a
  line; picked on its page once it sits on one, a typed one said "not one of
  the line's machines"). Line capacity says its machine stations the line
  does not list and adds them with one tap — offered, never written behind
  the person's back. *Not here:* Install's *Add a machine* picking from the
  line (Stage 4); the value stream map's places.
- *Accepted by* `scripts/acceptance/machines-programs.mjs` (stories 1–14).
- *Not in this stage:* plate speed per machine (it is per product — D3, Stage
  4); a job taking a line's machine onto its Install (Stage 4, "machines are
  picked from the line").

### Stage 3 — The line is the hub
- The line page in the order of §3, with the products readiness grid.
- The control room's factory cards carry each line's health; Needs you works
  across lines.
- Paper: the line report (one page); the control room report carries the
  factory.

### Stage 4 — Jobs read the factory
- 6M: line capacity and line balance read the line's per-product records
  (`pace_ppm.capacity` migrated); the job's walk evidence sits on its line.
- Stage gate: machines are picked from the line, and added to it when new.
- Measures: a job's targets on a line's numbers.
- The product mix (`lib/ie/mix`) wired into capacity.

### Stage 5 — One language for problems and actions
- Found in Stage 1: deleting a line for ever leaves its line standards and
  studies behind, orphaned (`deleteWorkspace` removes only the walk, frames,
  problems, stops and cases). Delete takes them too, counted out loud first.
- The four problem records open in one place, whichever record holds them;
  routes tidied; "snag" gone from the code's words as well as the screens.

### Stage 6 — Paper complete
- Drop the retired cloud tables (`pace_snapshots`, `project_targets`,
  `project_actuals`) and their empty local stores, once no device runs a build
  older than Stage 0.
- The factory, line, control room and job reports, consistent with
  `REPORTS.md`. `report-stress` covers the new ones.

**Done, for the whole plan**, when the control room answers "am I in control?"
for every line and every job; every real thing has one home; and nothing old
is still wired.

---

## 8. How every request is handled from now — the rule that stops the drift

1. **Place it on the blueprint:** which layer, which record (its one home),
   where it shows (§4), and what it replaces.
2. **If it needs a record not in §2, or moves a home, the blueprint changes
   first**, in the same commit, listing everything it touches.
3. **Build the whole connection**, not just the request: the line page, the
   control room, the job and the paper.
4. **Remove what it replaces** in the same slice.
5. **The commit says where it shows.**
6. **The obvious next piece is written down here**, in §6, without waiting to
   be asked.

---

## 9. Decisions for Rowland

- **D1 — Machines:** one record per machine, on its line; a stage-gate job
  points at the machines it brings in. *Recommended.*
- **D2 — Products** are what the line's programs run, not a separate list.
  *Recommended.*
- **D3 — Line capacity** lives per product on the line; a 6M job reads it.
  *Recommended.* This answers the question from earlier today, about line
  standard showing up in line capacity.
- **D4 — Remove the Excel tracker and the two unused stores**, after I count,
  with your OK, whether the live database holds anything only they can read.
- **D5 — A people list** (names picked, not typed) now, or later. *Agreed: yes —
  built after Stage 4, when every "whose" box is on the factory's records.*

---

## 10. Where it stands, 13 October

- **Agreed** by Rowland, 13 October: "yes to all, start stage 0" (D1–D5 as
  recommended; D5 — the people list — comes after Stage 4).
- **Stage 0, built:** Your factory slices 1–3, the line standard board and the
  archive rule; the three dead stores out of sync and the API (D4 counted:
  `pace_snapshots`, `project_targets`, `project_actuals` — 0 rows each; their
  empty cloud tables and local stores are dropped in Stage 6, once no device
  runs an old build); `lib/paceLineMatch`, `ui/Peers` removed; the tracker's
  names gone; the old words swept from every screen and a smoke check that
  fails if "workspace", "tracker", "3P" or "snag" (the app's old noun) come
  back; `CLAUDE.md`, `MAP.md` and `PRODUCT.md` point here.
- **Stage 1, built** (see §7): the line's facts on its page and in the factory,
  set up in the one editor; merge two lines.
- **Stage 2, built** (see §7): programs planned on a line with no job, from
  the control room and the line's page; the line's machines in flow order with
  who made each; a job seeing and proving its lines' programs; Your factory,
  the control room and the paper carrying them. Its database change is
  `supabase/MACHINES_AND_PROGRAMS.sql` — pasted into the SQL editor by
  Rowland on 13 October (the connector's writes came back "cancelled", so it
  is not in the migration history) and read back: both columns, both
  checks, both indexes, the line's two rules and the four editors' rules
  with the line's clause; the backfill moved none (0 of 18 programs, 0 of
  12 machines on a job with a factory line).
- **Line capacity reviewed** (Rowland, 13 October: "the capacity calculation
  is wrong ... why do I still see line standard cards in there ... the
  graphics don't work"). Placed (§8): *On the line*, the tool Line capacity;
  record `standards.capacity`; shows on its own page, the line's page (its
  count) and the paper as before. The sums were right; how a person station
  asked for them was not — now asked as the floor says it, said back at once,
  and what reaches every station worked out before it has a speed, with the
  people needed (`docs/CAPACITY.md` §1). Each tool lists its own products
  (`lib/standard` `inCapacityTool` / `inMapTool`): a product only mapped is
  not in Line capacity, one only worked out for capacity not in Line
  standard; New on a product already on the line opens that record. Line
  capacity's page goes back to Line capacity, shows "Its line standard" only
  when there is one, and on no job wears no job's rail. On a phone the V lies
  on its side and the sheet is a card a station. Accepted by
  `line-capacity.mjs` 8–11.
- **The line standard's map says the bottleneck** (Rowland, 13 October: "a
  few more options with lines and colors ... highlight kind of bottleneck
  areas ... fading out a certain area of a color ... when I'm putting in a
  name, it's too long, it covers up too much of the map ... having all the
  commentary just on the right hand side ... a little summary there saying
  ... this person's the bottleneck"). Placed (§8): *On the line*, the tool
  Line standard; record `standards.marks` (a mark's `fill`, `line` and
  `bottleneck` — no new record); shows on the board, Who does what on the
  right, and the line standard card. An area is solid, light or faded in
  its own colour, its line solid, dashed or dotted, thin or heavy; two more
  colours for areas and flow (purple, teal — never a state's hue). A
  person, an area or a machine is marked the bottleneck from its sheet or
  from Who does what: tagged BOTTLENECK on the map, a heavier edge, and
  summed up first on the right ("Line lead — runs the bagger"). Names on
  the map are short by default (the whole name on the right), or numbers
  matching the right, or full — kept per device. The card draws the same.
  Accepted by `line-standard.mjs` 9–12.
- **What a pack costs in labour** (Rowland, 13 October: "I need to be able
  to provide an hourly rate ... how much we run in a minute equals how much
  we run in an hour. If I put two people there ... is my cost per pack
  higher or lower?"). Placed (§8): *On the line*, the tool Line capacity —
  the one place that knows the output; record `standards.capacity.labour`
  (people and pounds an hour, both optional); shows on Line capacity under
  the sheet, in each what-if, and on the product's card on paper — the
  line standards report and the client report ("· 24.4p a bag in labour —
  8 people at £12.50 an hour"). People stand in from the line standard's
  headcount, then the line's crew; the rate from the line's labour rate
  with its on-cost (Your factory) — each said where it came from, typed
  over to change it. The sum (`lib/capacity` `labourCost`): people × rate
  an hour ÷ the packs the line makes an hour (its good output, a minute ×
  60). When the bottleneck is a people station, one more person there is
  worked out — the packs the line then makes (and what limits it next),
  the pounds an hour, and the cost a pack against today's: lower ("they
  pay for themselves") or higher — with Make it so. `docs/CAPACITY.md` §6.
  Accepted by `line-capacity.mjs` 12.
- **Three fixes, the same day** (Rowland, 13 October). Placed (§8): *On the
  line*, the tools Line standard and Line capacity, record `standards` (no
  new record); and *Control room*, Problems, record `snags` and the jobs'
  problems (no new record).
  1. *"line standard pdf, it doesn't scale correctly ... i pick square it
     then clusters everything up, or tall ... it's only set for wide"* — the
     card's map is a frame of its board's shape, Who does what in the room
     left (two columns beside a tall board), the marks sized to the board's
     width as on the screen, names printed as the map shows them on the
     device. Then, the same day (*"I can't see any change. Everything's
     still merged together and PDF details gone strange even in the side
     commentary or the bottleneck"*): the marks drawn the share of the board
     the screen draws them (they were half as big again), each name placed
     where it is clear — under its person, else over, else the person's
     number as in Who does what; an area's tag on its edge, never on its
     words; the side laid out from the foot up — kit, then the note, then
     everyone in rows as roomy as the room allows. `line-standard.mjs` 6c,
     13 (a crowded line, wide and tall).
  2. *"cant delete a line capacity anywhere ... always implement deletes and
     editing in everything"* — every row of Line capacity and Line standard
     renamed and deleted where it sits, with Undo; Line capacity's page
     renames and deletes; one record holds a product's map and capacity, so
     deleting one keeps the other (`lib/standard` `afterRemoving`) — a map's
     delete took its capacity with it before. `line-capacity.mjs` 13.
  3. *"the cards are great but i dont have ability to make a card for all
     of the problems"* — Problems cards beside the Problems report: a card
     for every problem the page shows, the projects' own among them.
     `snags.mjs` 8.
- **Paper wherever there is a list** (the audit's bar 3 — Rowland, 13
  October: "I'm always asking for reports, or cards, to be able to present
  things in a certain way that would seem to be obvious, but aren't, because
  you're not building them"). Placed (§8): no new record. *On the line*,
  Line capacity (`standards.capacity`) — a product's own page and every
  product its list shows, told in the three questions (`lib/capacityPaper`);
  Line standard (`standards`) — the card for every product its list shows.
  *Jobs*, Materials (`materials`) — What we are waiting on as one page;
  Commission, Install, Set up and Hand over (`tests`) — the card for every
  record on the board. The screen gains a button where the list is; the
  paper says what the screen says, from the same modules.
  `docs/AUDIT.md` 3.1–3.10; `list-paper.mjs`; `report-stress` (Line capacity at
  every size). Left, with reasons, in `docs/AUDIT.md` 3.5–3.9 — the line
  report is §6.5's, with the line as the hub.
- **The flow audit's findings on Control room problems** (`docs/FLOW-AUDIT.md`
  #2, #4, #5, #12, #13, #22; Rowland, 13 October: "fix what the audit finds
  and ship it"). Placed (§8): *Control room*, Problems; records `snags` and
  `cases` (no new record: a 6M problem says the register problem it was
  taken from in its `source.snag`, and the register problem says its case
  in its `case_id` — both columns already synced).
  1. *Who owes it, then by when* — every box patches its own fields into
     the row as stored (`db/walk patchSnag`), never a copy the page drew.
  2. *Inside a job, the Problem sheet starts on the job's own line*; a job
     on several lines asks which (`lib/lineRecords factoryLinesOf`).
  3. *A line chosen keeps the jobs on it*, narrowed to that line
     (`lib/snagsReport jobOnLine`); *a 6M job's problems are rows*, each
     with its phase, opening its fishbone (`lib/useProblems
     sixMProblemsOf`) — on the screen, the report and the cards. The line
     page reading the same rows is Stage 3's (§3, "where it is").
  4. *Closed asks what shows it is fixed* — one optional line, its last
     step in view; kept as the journey's last step, so on the card and the
     report.
  5. *Find the root cause ›* opens a 6M problem in its words on its line's
     6M job (or says to start one); the register problem is closed as taken
     to 6M, said on its row and journey, and listed once — as the 6M
     problem, "seen first on" its line. The fishbone's *Open a problem*
     lists the line's open register problems under *Something seen*
     (`lib/useProblems problemFromRegister`).
  6. *From a line's page*, the problem tapped is scrolled into view, its
     editor open, with *‹ the line* back to it.
  Accepted by `snags.mjs` 1b, 4b, 13, 15–18.
- **The flow audit's control-room findings** (`docs/FLOW-AUDIT.md` 1, 6,
  10, 11, 16, 19; Rowland, 13 October: "Fix what the audit finds and ship
  it"). Placed (§8): *Control room* and *a line's page*; records `snags`,
  `programs`, a job's tests and items, the studies and standards on a line —
  no new record. A line's own problems (someone or a day on them, or
  Critical) and programs (not proved; late past the test day) are counted
  beside the jobs' in the four numbers, Who owes what, This week, the
  critical list and the control room report, under the line's name with "on
  the line, no job" (`lib/lineWork`); the line's card and its page say
  critical and late in red by the same rule. The critical list's when is a
  word, "going with …" its branch line. A line's page says what each tool's
  latest record found and each job's verdict. On a phone the band comes
  before the factory and the bar is Control room · Problems · Lines · More.
  Each count is its page's: the rail's Problems is the fixes to do and the
  problems with no fix (`lib/noted problemsTally`); Install's Needs you and
  rail carry a machine late on site; a gate's Needs you names the machines
  with none of its stages (`lib/install gateGaps`). A job started from
  a line says "A change on Line 7" with its problems, latest shift and late
  programs over the three ways, and its start steps count only its own
  problems. Accepted by `scripts/acceptance/control-room.mjs`.
- **Lost time in two parts — labour and the packs not made** (`docs/AUDIT.md`
  4.21; Rowland, 14 October: "capacity loss units and labour .. leave reject
  cost"). Placed (§8): *On the line* — its stops (`observations`), its Line
  capacity (`standards.capacity`, for the bottleneck) and its cost settings
  (`workspaces.crew`, `labour_rate_per_hour`, `packs_per_min`); no new record.
  Every place a £ was put on lost time says the labour in pounds and the
  packs not made beside it, counted only for a stop on the bottleneck or the
  whole line (`lib/lineLoss`): the stopwatch's ticker and toast, the Pareto
  and the board's machine cards, the line map's heat, the one-page Report,
  Trend, the meeting, a Case's proof, the line's facts on its page and its
  settings. The reject's materials stay out, as
  asked.
- **The stage-gate papers keep up** (Rowland, 14 October: "Check the stage
  gate report must make sure they maintain relevance when things change in
  the app .. new functions the app does but also all changes in status").
  Placed (§8): *Jobs*, the papers; no new record — the full report, the
  one-page status, the programs report and the handover now read what the
  later stages added: the line's own programs (Stage 2), the register's
  problems taken for the job, a program proved by a study on its line, a
  machine late on site, what a gate is missing, and every program and
  problem still open on a machine. `docs/REPORTS.md` (Relevance) is the
  table of what reaches which paper, and its rule; `docs/AUDIT.md` bar 8.
  Accepted by `report-relevance.mjs`.
- **Every report from the control room** (Rowland, 14 October: "report is
  there but only in projects not in the control room ... we need the same in
  control room"). Placed (§8): *Control room*, its paper; no new record — an
  index, as a job's Reports is. Shows as Reports in the control room's rail
  (More on a phone) on every page off a job, and All reports in the band
  beside the control room's one page: the control room's own papers, each
  line's, and every job's own list under its name (`ui/ControlRoomReports`).
- **A person's pace, as the science counts it** (Rowland, 14 October: "it
  doesn't seem to understand the previous quantities ... each pallet holds
  36 baskets ... it's 360 a minute"; "I need to be able to determine the
  speed of the human"; "bring in science when it comes to humans ... a human
  having to keep up with machines"). Placed (§8): *On the line*, the tool
  Line capacity; record `standards.capacity` (two optional fields on a
  station, kept in its JSON — no database change); shows on the station's
  card, the capacity sheet and the V, Line capacity's page and PDF. Every
  station after the first says the chain under its conversion ("1 pallet =
  36 baskets = 360 units"); a person whose unit holds several of the one
  before is timed per either — a palletiser per basket — and the pallet
  worked out, never divided by hand; a person's time carries the ILO's
  9% rest (5% personal, 4% basic fatigue) unless changed, a standard time
  from the time study none again; nothing more taken off ("100% +
  allowances only", asked and chosen); a person fed straight by a machine
  or a person, nothing collecting between, loaded past 90% of their pace,
  said in amber. The same day ("it says 5 pallets a minute ... it takes 5
  minutes to do one pallet"): how long one takes in seconds or minutes, the
  speed's two ways named *How many in a time* and *How long one takes*, and
  a rate that reads like a time asked about with the time one tap away.
  `docs/CAPACITY.md` §1 holds the science and its sources; the lifting
  check is §6 10a. Accepted by `line-capacity.mjs` 8–8p.
- **Line capacity's V, redrawn** (Rowland, 14 October: "improve the graphics
  on the line capacity ... sometimes you can't read what the bottom line
  says ... it looks very bland, very old ... more engaging and colourful").
  Placed (§8): *On the line*, Line capacity; record `standards.capacity`
  (nothing new stored). The V is a column a station — its share of the
  bottleneck once its stops count, what more it does while running hatched
  on top — every name in full under its column, scrolling with the scale
  still past what the box holds, opened on the bottleneck; a column opens
  its station. Coloured by how close a station runs to the bottleneck —
  navy at it, the brand's blue lighter with room to spare (Rowland's third
  colour exception, `CLAUDE.md`), amber only under the V; the phone's bars,
  the capacity sheet's share column and the paper the same. On paper the V
  is drawn too — a bar a station under the V's sentence, its scale carried
  over a page. Accepted by `line-capacity.mjs` 2–2d; the paper by
  `report-stress.mjs`.
- **Programs tested where they sit** (Rowland, 14 October: "I want to be
  able to easily go into commission, find the programs that should be
  available because they're in programs"; then "its also in the program
  page test a commission but the ui is poor and makes no sense, and in
  commissioning cant access the programs .. reach it only from programs and
  improve the ui to actually run it?" — "do it"). Placed (§8): *Jobs*, the
  stage gate's Programs and Commission; records `programs` and `tests` (the
  test's `programId`, as before — no new record). On Programs every program
  — the job's, and its lines' own (Stage 2) under the job's machine of their
  name, marked by line — has its test on its row (`ui/ProgramTest`): *Test
  it* asks how it went (passed · didn't pass · didn't run), what was seen
  and the day, or books it for a day; passing proves the program. It
  replaced "Prove it in Commission" and "plan its test" (a test made and a
  drawer of boxes opened), the lines' own section below the machines, and
  Commission's tick-list picker (`ui/ProgramPicker`, live a day) — three
  routes to one act. Commission's board opens a machine's programs from its
  programs cell, each with its test and a tap into it; Needs you's *Test it*
  lands on the row on Programs, open. The board and Needs you count a line's
  program once this job has a test for it (`lib/commissionPrograms`). A
  test's page and its drawer name a line's program too
  (`lib/useJobPrograms`). The Programs list at the foot keeps adding,
  naming, ordering and test days. Paper unchanged. Accepted by
  `machines-programs.mjs` 7–7g. **Then (same day, Rowland: "I've gone to
  programs, nothing's changed ... I told you to link it into the stage gate
  process")**: Test it had come only on programs with a Programs-list
  record, and most jobs hold their programs as the lines of each machine's
  "Programs loaded" stage — so on his job nothing showed. Every line of a
  programs stage now has Test it; testing one makes its program record (the
  same name on the same machine — one program, as the reading already
  merges them) and its proving test. Commission's programs square, its sheet,
  Needs you and the commissioning paper count those lines too
  (`lib/commissionPrograms` `boardPrograms`) — the Programs page's programs,
  one answer. Accepted by `machines-programs.mjs` 7h.
- **Several lines feeding one place** (Rowland, 15 October: "two lines here
  that then merge into individuals at the end of the line ... line A, line B,
  running ... one person who has to wrap for both"; "the 150 was for both
  lines merged"; "you can have 3, 4, 5 production lines all running, then
  merging into one pack hole ... that happens all the time in manufacturing";
  "what matters is the future, that I can name them"). Placed (§8): *On the
  line*, Line capacity; no new record — the product's capacity (`standards.
  capacity`, one jsonb) gains `lanes` (a list of named lines) and a station
  gains `lane` (the line it is on; none = after they merge). Each line is its
  own chain, worked out on its own; what the lines send together goes to the
  shared stations as one more station standing for them
  (`lib/capacity analyseLanes`); the whole is the merged chain's limit in the
  line's unit a minute, so everything that reads a capacity — the dashboard's
  "can make", the loss count's bottleneck, the labour cost a pack, one more
  person — takes the whole without knowing about lines. The target is for all
  the lines together. Shows as a group a line (named, its stations moved and
  added inside it, *Add another line, like Line A*, *Remove this line*), a V
  and a sheet a line and one where they merge, *Lines merge after this* on a
  single chain's stations, *One line again*; the sentence and the checks say
  it along each line; on the capacity paper a V and a sheet a line, then where
  they merge; a what-if keeps the lines; the all-products sheet names each
  station by its line. Left for later: the stops-and-walk readings stay by
  station name (two lines' "bagger" share a log), and accumulation is drawn
  for one chain only. Accepted by `line-capacity.mjs` 15.
- **The shape asked, the V drawn, the way to the target** (Rowland, 15
  October, on seeing his converted line: "it should almost be asking how many
  lines you want to do, and do they merge at the end ... signal that this is
  the end merge"; "I think the intelligence is quite poor ... as much
  automation and intelligence behind the code as possible to interpret before
  and after and merges and cycle times"; "you move the graph out the way, it's
  only available on the PDF now"). Placed (§8): *On the line*, Line capacity;
  no new record — it reads and writes the product's capacity
  (`standards.capacity`). Three things. **The V was missing on the page for
  several lines** — a bug of mine (`vCurve` found the bottleneck by object, the
  laned results copy it; now by station) — so each line's V and the merge's V
  are drawn again, as the paper had them. **The shape is asked**: *How many
  lines feed in?* 1–6 and *Where do they merge?* (after any station, or not at
  all) above the checks (`lib/capacityLines reshape`: the first stations copied
  per line, a line already that long kept with what was typed on it, the rest
  shared), with a map of the lines — a row a line, each station and its speed,
  the bottleneck in navy — and a dashed *Lines merge here — 137 units/min
  arrive*, said in the shared station's own cycle times (what reaches it, how
  long it takes, how many people). **The way to the target is worked out**
  (`lib/capacityPlan planToTarget`): one more at the station holding the whole
  back, worked again, until the target is met — identical lines move together
  — said as the steps (wrapper 1 → 3, each palletiser 1 → 2, 4 more people)
  with what each buys; *Make it so* puts the crews in (the labour's people
  with them, Undo offered); on the paper under the checks. Accepted by
  `line-capacity.mjs` 16.
- **Line capacity screened for problems** (Rowland, 15 October, on his own
  line — target 150 a minute, and 319% · 279% · 273% on the V: "these
  percentages make no sense ... literally look at what I've put in ... screen
  it for problems"). Placed (§8): *On the line*, Line capacity; reads the
  product's capacity (`standards.capacity`), writes nothing. The percentages
  were each station against the *bottleneck* (his pallet wrapper, 50.1 a
  minute — one person, two pallets every 12 minutes), not against the target;
  the thing to say was that the bottleneck is a third of the target.
  `lib/capacity screenCapacity` screens three ways, each only when so: the
  line makes under three quarters of its target (what holds it, how it is
  typed, what it would need — 3 people at the wrapper); a station at twice
  the bottleneck or more (said against what it is against, and that a V this
  steep usually means a speed or a unit is mistyped); a person's rest
  allowance and a running % of about its inverse (the same time taken off
  twice, with the speed it would be). Asked as questions — nothing is changed
  by itself. Shows as *Check the numbers* above the V on the page (red for
  the one that matters, amber for the rest, each opening its station) and on
  the capacity paper under *To check before the sums are trusted*. Accepted
  by `line-capacity.mjs` 14 on his line as entered.
- **A program's journey** (Rowland, 14 October: "I only run for 30 minutes,
  so we decide to run a retest ... at 45 minutes and we achieve another
  amount of speed ... even if it was successful ... at 50 packs per minute
  ... let's do a retest at 55 ... There is no real pass and fail ultimate.
  It's just the status of what was done ... show the journey of our
  commissioning"). Placed (§8): *Jobs*, the stage gate's Programs,
  Commission and its papers; no new record — each attempt is a proving test,
  a re-test following the one before (`fromTestId`), what it aimed at its
  agreed run (`runAgreed`, set per attempt so it can move), what it did its
  day (`run`: speed set, minutes, packs, rejects), how it went its outcome,
  what was seen its result (`lib/programJourney`). Test it asks those
  numbers; *Go again* follows any attempt, passed or not; the program's row
  shows the ladder — every attempt first to last, the fastest pass above it.
  A pass stands: a later attempt that does not pass is a step in the
  journey, not where the program stands (`lib/testing latestAttempts`, and
  the program stays proved — `lib/programs programAfterTest`). Shows on the
  row on Programs, Commission's machine sheet, and the commissioning report
  and cards under each machine (and the line itself). Accepted by
  `machines-programs.mjs` 7i; the fuzz reads every journey back off the
  paper.
- **The commissioning report and cards** (Rowland, 14 October: "make sure we
  have a fully functional commissioning report ... where we got to, the
  problems ... a commissioning report, commissioning cards, something that
  way I can present in the meeting or send"). Placed (§8): *Jobs*, the stage
  gate's papers; no new record — read off the full report's reading of
  Commission, the handover reading's machines and the Commission board's
  programs (`lib/commissioningReport`), so it cannot disagree with them.
  Where we are (the verdict, the gate's count, the handover dates, every
  machine in a row with its word — ready, under way, behind, not started —
  and its next test); why we are not where we should be (each test that did
  not pass or run with what was seen, programs gone wrong, critical issues);
  what we are doing about it (the fixes, the problems taken for the job, the
  tests booked next); the runs; each machine whole. The cards: a page a
  machine for the meeting — its word in its colour, tiles for its tests,
  programs and what is open, its tests, its next test (`lib/commissioningPdf`).
  Shows on Commission's header (*Commissioning report*), the report screen's
  own chip with *Cards — a page a machine*, and the job's Reports sheet
  (with *Test cards*, which were only on Commission). Accepted by
  `commissioning-report.mjs`; the paper by `report-stress.mjs` at three
  sizes.
- **Next:** Stage 3 — the line is the hub (its products, readiness, health).
