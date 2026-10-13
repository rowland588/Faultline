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
| **Machine** | **One machine record on its line**: `commission_assets` gains `workspace_id`; `project_id` becomes "the job that brought it in", optional | `commission_assets` (a job's only); `workspace.assets` (names for the stopwatch); capacity stations (a name per product); a problem's machine (free text) | Stage 2 |
| **Program** (what a machine runs, for a product) | `programs` on a line and machine: gains `workspace_id`; `project_id` optional | `programs`, which **requires a project** today | Stage 2 — your request |
| **Product** | Not a new record (D2): a line's products are what its programs run, plus any typed on a standard | `programs.runs`, `standards.product`, a changeover's from/to, a loss count's product — all free text | Stage 2: one pick-list from the line |
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
line's machines in flow order, with OEM and plate speed (Stage 2). Its shifts
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
| Problem | listed, late in red | counted on the line's card; the register | its Problems | card, line group, register, job reports |
| Program | its programs; a product's row | programs due / not proved on the line's card; Programs | the stage-gate Programs gate | programs report (line, job) |
| Machine | its machines | — | Install grid; every machine picker | line report; stage-gate reports |
| Product (standard, capacity, changeover) | its products row | products with gaps, counted | 6M line capacity; the client report | line standard cards; line report |
| Study | its tools | — | evidence and proof | study's own page; job reports |
| Job | jobs on it | jobs board | — | control room report |
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
7. **`workspace.assets`** as the stopwatch's machine list: read from the line's
   machines instead (Stage 2).
8. **`pace_ppm.capacity`**: moves into the line's per-product capacity (Stage 4).
9. **Old words on screens**: "workspace" (about 7 places), "tracker" (2), "3P"
   (1), "snag" (about 54). One sweep in Stage 0, and a smoke check so they
   never come back.
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
9. **Needs you across lines**: programs due and problems late on lines with
   no job.
10. **A people list** (D5).

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
- **Next:** Stage 1.
