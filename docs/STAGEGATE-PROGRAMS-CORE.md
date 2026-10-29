# Stage gate — programs and tests as the Gemba core

**For Rowland.** Records your product opinion (29 October 2026, ~17:50 UTC),
translates it for engineering, and says what already exists on the line versus
what today lives only inside a stage-gate project. **Slice 1 (29 Oct go):**
commissioning narrative papers demoted in UI; New project leads with
Performance (6M); Installation project secondary; lever tree hidden from
picker. Gates and Commission screens unchanged in code. Authority:
[`docs/FAULTLINE-FAULT-MODEL.md`](FAULTLINE-FAULT-MODEL.md).

**Read with:** [`docs/FAULTLINE-PRODUCT-DISCOVERY.md`](FAULTLINE-PRODUCT-DISCOVERY.md)
(identity and reframes), [`docs/STAGEGATE-PATH.md`](STAGEGATE-PATH.md) (today's
eight-step path — still authoritative until this doc's slices ship),
[`docs/MAP.md`](MAP.md) (line is home; programs open on the line),
[`docs/BLUEPRINT.md`](BLUEPRINT.md) (Stage 2 — programs on the line),
[`docs/PROGRAM-GOAL.md`](PROGRAM-GOAL.md) (criteria and sign-off).

---

## 1. Rowland's words (29 October)

You built **stage gate** for **live installation work** — OEM meetings,
gates, handover, the formal control story. For **Faultline's Gemba principles**,
most of that installation shell is **not** what the product should lead with.

What matters on the floor:

> On the line you **run a program** (what the machine runs) and **run tests on
> that product** to see what is going on.

**Program and products** are not the same thing: **one program** can carry
**several products** under it (each can differ — e.g. Program 10 runs All
Rounder 2 kg, Express 1.25 kg and Jacks 2 kg). That shape is already how the
line thinks (`scripts/acceptance/line-hub.mjs`).

In short:

> *Everything at stage gate isn't really needed … **only programs and tests**.*

This does **not** say installation projects were a mistake — they match real
OEM and site work. It **does** say the **hero Gemba loop** is: go to the line,
see which program is running, run or read the tests (including SPC tools as
criteria), know pass or fail — with or without a project open.

---

## 2. Engineering translation

| Your idea | What it means in the app today |
|---|---|
| **Programs + tests on the line** | `programs` records on a **line** and **machine** (`workspace_id`; `project_id` optional). Line › **Programs** (`#/lines/:ws?view=programs`): plan, open, **Test it**, criteria, products — **without** starting a project. Proved by `machines-programs.mjs`, `line-hub.mjs`, `line-is-home.mjs`. |
| **One program, several products** | `programs.runs` — comma-separated product names on one program; line Overview and line report name them; not a separate product table (`docs/BLUEPRINT.md` D2). |
| **Tests = what you run to see what's going on** | A program's **run test** (speed, minutes, packs, rejects) plus **criteria** from tools — capability, reliability, control chart, etc. — each with its tool's verdict; sign-off when all pass (`docs/PROGRAM-GOAL.md`). |
| **Most of stage gate not needed for Gemba** | The **installation project** layer: four gates, Now/Timeline, handover lists, commissioning narrative, Gantt — desk and calendar rhythm, not "stand at the line with a stopwatch." Keep as **optional** where OEM/formal handover needs it; do not let it overshadow line Programs. |
| **Stage gate project today** | Still the full path in `docs/STAGEGATE-PATH.md` §1–§4 — eight steps, eight tabs, papers. **Unchanged in code** until SG-P slices below, at your go. |

**Two questions, two rhythms** (aligns with discovery **R2 — two engines**):

1. **Performance (6M + line tools)** — *Why is this running line off target?*
2. **Install / prove (programs + tests on the line)** — *What is this machine
   running, and did the tests show it clean?* — Gemba-first; project optional.

Stage gate as a **project kind** (`planModel: commissioning`) becomes, over
time, a **thin wrapper**: charter handover date, attach machines, optional
gate plan — while **truth stays on the line** (`docs/MAP.md`).

---

## 3. What already exists **on the line** (no project)

These are **live** and gated; they are the core you named.

| Capability | Where | Notes |
|---|---|---|
| Plan a program on a line | Factory › Programs, line › Programs, `#/programs?line=` | No job required (`machines-programs.mjs` step 3). |
| Machine in flow order + programs | Line Overview, line › Machines, Set up the line | One machine record on the line (`machineMerge`). |
| **Test it** on the line | Line Programs, machine page, Commission's programs cell | Opens in place; not forced into project pages (`MAP.md`). |
| **Products on a program** | Program form — chips / list on `runs` | One program, multiple products (`line-hub.mjs`). |
| **Criteria + sign-off** | Program row on line and in project | Same record, same words on reports (`program-criteria.mjs`). |
| Programs on machine page | `#/lines/:ws/machine/:name` | Line's programs + project part when a stage-gate job is on that machine. |
| Line + machine + programs papers | Report ▾ on line, machine, programs list | Line report bundle; programs report; test cards. |
| Factory board counts | Line card — programs to prove, late in red | `lib/lineLean`, `lib/lineWork`. |

**Gemba sentence the app already supports:** *Open the line → Programs → pick
the machine → run the program's tests / read criteria → see pass, fail, or not
yet — in money and tool verdicts where configured.*

---

## 4. What lives mainly inside a **stage-gate project** today

These serve **installation management** and the **control story**, not the
minimal programs/tests loop.

| Area | Project places | Role |
|---|---|---|
| **Four gates** | Install · Set up · Commission · Hand over | Step lists, usual lists, dated plan (`STAGEGATE-PATH` steps 3–4, 7). |
| **Now** | Front page | Band, blocking handover, today + two weeks, doors to Plan. |
| **Timeline / Gantt** | Plan › Timeline | When everything happens across machines. |
| **Bring machines into the job** | Machines › Add | `project_id` on asset; Install grid. |
| **Problem → fix → re-test** | Drawer from step/test | Register + fix workflow tied to gate steps. |
| **Handover** | Hand over gate | Sign-off lists per machine; project done when all handed over. |
| **OEM / client papers** | Commissioning report + cards, handover report, full client report, journey | Readers for meetings — not required to **Test it** on the line. |
| **Journey + Actions** | Reached from Now | Plan rhythm and meeting tracker (`STAGEGATE-ACTIONS-AND-6M.md`). |

A **running line** with new equipment can use **line Programs only**; a **chartered
install** still uses the project for gates, dates, and handover packs.

---

## 5. Keep · optional install project · strip or fold later

**Policy this session:** document only — **no** gate or screen removed (`docs/DIRECTION.md`).

| Piece | Recommendation | Why |
|---|---|---|
| **Line › Programs** (plan, test, criteria, products) | **Keep — hero at line scope** | Your Gemba core; MAP already makes it home. |
| **Machine page** (programs, tests, studies) | **Keep — hero** | Single record of truth on the line. |
| **Program criteria + sign-off** | **Keep** | "Scientific evidence" over a single net number (`PROGRAM-GOAL.md`). |
| **Programs / machine / line reports + test cards** | **Keep** | Proof you can show without retyping. |
| **Factory › Programs** (every line) | **Keep** | Plan from the board; same records as the line. |
| **Stage-gate project** (start job, lines, handover date) | **Keep as optional "installation" kind** | Rowland's live installs; rename in copy later if you want "Installation" not "Stage gate". |
| **Gates + Timeline + Now (full shell)** | **Keep for install projects; fold surface over time** | Desk/OEM; cap prominence vs line Programs (discovery §4.1). |
| **Commission gate UI** (board duplicate of programs) | **Keep; fold into line-first flow later** | Same tests; two doors today — simplify when SG-P ships. |
| **Eight-tab emergency UI** | **Keep until path walk + your go** | `STAGEGATE-PATH` §2; under review, not deleted. |
| **Handover + commissioning narrative papers** | **Keep for install projects** | Moat for OEM meetings; optional if user never starts a project. |
| **Journey as plan diary** | **Keep for projects** | Not part of minimal programs/tests loop. |
| **Lever tree as third method** | **Park** (separate decision) | `docs/LEVER-TREE-FIT.md` — not part of this core. |

---

## 6. Alignment with product discovery (29 October)

| Discovery idea | How programs/tests core fits |
|---|---|
| **R1 — Line-first CI manager** | Programs on the line are the **default proof loop**; Factory board opens the line, not Commission first. |
| **R2 — Two engines** | **Performance** = 6M + tools; **Install** = programs + tests (+ optional project shell). |
| **R3 — Evidence platform** | Criteria tie programs to capability, reliability, charts — evidence → verdict on the program row. |
| **Gemba vs desk** (§4.1) | Honest split: line Programs = Gemba; gates/Gantt/handover = desk — both allowed, unequal billing. |
| **Moat** (§8) | Commissioning depth stays in **criteria + papers**; lead story can be "line knows its programs" for running factories. |

**Updates discovery decision 7:** accepting SG as partly desk is compatible with
**making line Programs the product hero** — not with pretending the whole
eight-step path is Gemba.

---

## 7. Proposed slices (when Rowland says go — not built yet)

Order favours **line Programs/Test as hero**, then **thin installation project**.

| Slice | Intent | Touches (indicative) |
|---|---|---|
| **SG-P0** | **This doc + cross-links**; STAGEGATE-PATH marked under review | docs only |
| **SG-P1** | **Copy and doors** — Factory, line Overview, New project: line Programs first; "Test on the line" explicit | PAGES.md, front door, line Overview |
| **SG-P2** | **One programs home** — reduce duplicate Commission vs line Programs for the same test (same record, one primary door) | Commission sheet, line Programs |
| **SG-P3** | **Optional install** — New project: "Installation (gates + handover)" vs "Programs only on line" guidance; no forced project to test | New project flow, copy |
| **SG-P4** | **Thin project** — default project tabs: Machines · Programs · Problems · Reports; gates/Timeline under Plan or More only if install kind | rail/tabs, STAGEGATE-PATH §2 |
| **SG-P5** | **Rename kind** (if agreed) — `commissioning` → "Installation" on screen; `planModel` unchanged | planModel labels, picker |
| **SG-P6** | **Remove or fold** only what §5 marks strip — after parity proofs | acceptance, inventory |

Each slice: path/doc first in the same commit as behaviour; gate only what moves
(`CLAUDE.md`).

---

## 8. Decisions for Rowland (programs core)

Plain answers drive SG-P order; builder waits for **go**.

1. **Hero** — Is **Line › Programs** the sentence you say first in a Gemba demo
   (before Now or gates)?
2. **Without a project** — Is planning and proving programs **on the line only**
   enough for day-to-day running lines, with projects reserved for full installs?
3. **Installation kind** — Keep stage-gate **gates + handover** as an optional
   project type, or shrink to Programs + Problems + Actions only?
4. **Naming** — "Stage gate" on screen vs **Installation** vs **Prove on the line**?
5. **Commission UI** — Fold board into line Programs + machine page, or keep
   both for OEM meetings?
6. **First build slice** — SG-P1 (doors/copy) vs SG-P2 (one programs home)?

---

## 9. What this does not do

- Does **not** remove gates, Now, Timeline, or Commission (`STAGEGATE-PATH` stays
  live; one line notes **under review**).
- Does **not** change `docs/DIRECTION.md` or merge stage gate with 6M.
- Does **not** implement SG-P1… until you say go.

**Parent summary for builders:** Rowland wants **programs, products under a
program, and tests (including tool criteria)** as the Faultline Gemba core on
the **line**; the rest of stage gate remains valuable for **installation
projects** but should not dominate the product story.

---

*29 October 2026 — product opinion recorded; engineering map for SG-P slices.*
