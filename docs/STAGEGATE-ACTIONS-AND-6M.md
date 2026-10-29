# Stage gate — the action tracker and 6M problem solving

Rowland, 29 October: stage gate *"doesn't have an action tracker"* in the
sense the team uses in meetings — who is doing what, by when, why, and how
you know it is fixed. *"6M could form part of that system"* and be used for
stage-gate problem solving when a commissioning issue needs more than a fix
and a re-test.

**Design only.** Nothing here is built until Rowland says go
(`docs/DIRECTION.md`). Where this disagrees with an older stage-gate note,
`docs/STAGEGATE-PATH.md` wins for *places and tabs*; this page wins for
*how problems, actions and optional 6M investigation connect*.

Related: `docs/PROJECTS.md` (P3 Actions — the project's tracker),
`docs/STAGEGATE-PATH.md` (step 5, Problems, Now), `docs/SIXM.md` (the 6M
loop), `docs/STAGEGATE-RESEARCH.md` (commissioning pattern — Actions as a
view of problems).

---

## 1. What exists today

### 1.1 The records (one database, no second tracker)

| What Rowland asks for | Record today | Where it is changed |
|---|---|---|
| **Problem** — what is wrong | `snags` on the register, linked to the project | Register editor (`/snags`), or *Hit a problem* from a test/step |
| **Fix** — who puts it right, by when | `tests` with `kind: 'fix'` | Problems tab (`#/project/:id/fixes`), drawer; only door in is *Make it a fix* |
| **Next step / finding** | `test_items` (`next`, `found`) | Plan, Commission, drawer |
| **6M countermeasure** | `pace_todos` on the board | 6M project's Board only (`planModel: board`) |
| **Proof of fix** | Re-test on the program/test | Programs, Commission, drawer |

Stage gate and 6M are **two methods on one project record** (`planModel`:
`commissioning` vs `board`). A stage-gate project does not get a fishbone or
board unless we deliberately add a *mode* (see §4).

### 1.2 The pages — mapped to "action tracker"

| Place | Question it answers | What it shows for actions / resolution |
|---|---|---|
| **Now** (`#/project/:id`) | Where is the project; what needs me? | *Blocking handover* — critical rows from the same read as Actions; *What you owe* — late/non-critical slice; **All actions ›** → Actions |
| **Problems** (`#/project/:id/fixes`) | What is wrong; who is fixing it? | Snags not yet fixes; fixes list; critical/high from tests; *Make it a fix*; problems report with **journey** on register snags |
| **Actions** (`#/project/:id/actions`) | Who is doing what, by when, why? | **Built P3** — `lib/projectActions`: every `JobItem` the project owes (stages, tests, fixes, plan parts, materials, programs, critical/high findings) **plus** register problems assigned to the project; grouped by who/when/where; meeting paper |
| **Register** (`/snags`, filtered by project) | Every problem on the line | Full **journey** (steps: day, what we did, what came of it); assign line, machine, project; priority; owner; due |
| **Every action** (`#/actions`) | All projects at once | P4 — same rows, marked by project |

**Path vs UI (important):** `docs/STAGEGATE-PATH.md` §4 says Journey and
Actions come **off the rail** and are reached from Now. The **emergency UI
(28 October)** still lists eight top tabs (Now · Programs · Timeline · Gates ·
Machines · Problems · Reports · More); Actions and Journey are **folded under
Now** in the menu rail (`src/ui/rail.ts` — `sub: true`, Actions lights Now).
So the tracker **exists** but is **easy to miss** if you live on Problems or
Programs and never open *All actions ›*.

### 1.3 Step 5 on the path vs what the app does

| Path step 5 | Today |
|---|---|
| Hit a problem → fix → fixed → re-test | Yes — from test/step; fix is a `Test`; re-test on program |
| Shows on Problems, Now blocking, machine *open* | Yes |
| **Resolution journey** on every stage-gate problem | **Partial** — register snags have `journey[]`; project Problems/fixes page emphasises **fixes**; journey is on the register editor and problems **report**, not on every row on Fixes |
| **Proof** tied to the run that failed | **Gap** — research §2.4–2.5 (`docs/STAGEGATE-RESEARCH.md`); problem does not always say which run found it; retest not labelled *verified* |
| **Who / what / when / where** in one meeting view | **Yes on Actions** — if the team opens it; fixes and problems appear as rows with kind Problem / Fix |

### 1.4 What "action tracker" means here (Rowland, 21 & 29 October)

From `docs/PROJECTS.md`:

> *"Classic action tracker … who's doing what and when, why … can we see who
> the owner is … nowhere for a home to then follow through."*

For stage gate that home is **`#/project/:id/actions`**, backed by P3. It is
not a separate Excel-style import; it **aggregates** what the project already
owes. Gaps are **discovery** (tab/rail), **story** (journey visible on the
problem path), **depth** (optional root-cause loop from 6M), and **proof**
(run → fix → verified retest).

---

## 2. Gap analysis — stage gate vs the 6M loop

| 6M step (`docs/SIXM.md`) | Stage gate today | Gap |
|---|---|---|
| Gap → problem (head) | Critical/high finding or snag; Pareto optional on line | Stage gate problems often **event-driven** (failed test), not gap-number-led |
| Fishbone fills from tools | Tools used on the **line**; not wired into stage-gate Problems | No bone view on a commissioning project |
| Five whys, evidence on causes | — | Only on 6M `cases` |
| Countermeasure on board (`pace_todos`, `causeRef`, `expect`) | Fix + owner + due | Fix has **who/when**; no **what we expect to change** field on fixes |
| Proof on the **same number** | Re-test pass/fail | Proof is **test criteria**, not always the line measure the 6M case holds |
| Hold (standard + check) | Handover list, programs set | Different noun; same *hold the gain* intent |

**Where 6M helps stage gate:** recurring failures, unknown root cause, or
multi-machine issues during commissioning — when *fix and re-test* is not
enough to agree **why** and **what must stay true**. Where it does not:
category-A punch (critical) that only needs a named owner, date, and retest.

**Principle from PROJECTS.md:** everything raised inside the project should
**land in Actions**. A 6M-style investigation should feed **countermeasures
as rows on Actions**, not a second tracker.

---

## 3. Proposed model (no big code yet)

### 3.1 One tracker: Actions

- **Problems stay on the register** (and the project's Problems tab as the
  commissioning view of snags + fixes).
- **Actions remains the meeting page** — who, what, when, where, why, kind
  (Fix, Problem, Critical, Part of the plan, …).
- **Resolution journey** lives on the **problem** (`snag.journey`), shown
  wherever that problem is edited and **summarised on Actions** (last step +
  link to problem), not duplicated as a new record.

### 3.2 Two depths of problem solving (same project)

```
Stage-gate problem (register / Problems tab)
        │
        ├─► Lightweight (default)
        │     journey steps on the snag · Make it a fix · re-test · verified
        │
        └─► Deep (optional) — "Investigate like 6M"
              link or spawn a case (`cases`) on the SAME project
              fishbone + board countermeasures → pace_todos → Actions rows
              proof: test criteria AND/OR line measure when closed
```

**Option A — link case (preferred for hybrid):** On a critical snag, *Investigate
root cause* opens or creates a **linked 6M case** on the same `projectId`
(stored: `case.linkedSnagId` or snag `caseId` — to be decided in build slice).
Fishbone/Board UI is either a **view on the project** (see §4 option D) or a
drawer/sheet — not a second project.

**Option B — embed only journey:** Extend register journey on Fixes rows
(snags pattern) without fishbone — enough for many commissioning snags.

### 3.3 Stage-gate-specific rules (align with research)

- **Critical = blocks handover** (category A) — already on Now; say so on
  Problems and Actions rows.
- **Fixed → verified:** fix closed only when the **named retest** passes;
  show on Problems and on the machine page.
- **Run that found it:** store on snag/fix from the test drawer (research
  §2.4).

### 3.4 What we do not do

- Turn stage gate into a full second 6M app (no default fishbone tab).
- Add a parallel action list outside Actions.
- Auto-switch `planModel` from commissioning to board (loses gates).

---

## 4. Options

| | **A — Actions-only polish** | **B — Problem journey on Fixes** | **C — Optional 6M board on stage-gate project** | **D — Hybrid (recommended)** |
|---|---|---|---|---|
| **Summary** | Make Actions impossible to miss; clearer copy; act on row | Same journey UX as register on project's Problems | Add Fishbone/Board tabs to commissioning projects | B + link heavy problems to a case; countermeasures → Actions |
| **Actions as meeting home** | Strong | Medium | Medium | **Strong** |
| **Resolution story** | Weak | **Strong** | Strong for deep cases | **Strong** |
| **6M for stage gate** | No | No | Always visible (noise) | **When needed** |
| **PROJECTS.md fit** | Yes | Yes | Partial (two methods visible) | **Yes — everything lands in Actions** |
| **Build size** | Small (SG-0) | Medium (SG-1) | Large | Medium + optional large (SG-2/3) |

**Recommendation: D (hybrid), built in slices below.** Start with **SG-0**
and **SG-1** so the team gets a visible tracker and journey without waiting
for fishbone. Add **SG-2** when Rowland wants root-cause on commissioning
failures.

---

## 5. Slices — future builds

Each slice: path page updated first, PAGES.md in the same commit, acceptance
touching only what moved.

| Slice | What | Proved by |
|---|---|---|
| **SG-0 — Find the tracker** | Align STAGEGATE-PATH §4 with live tabs or finish P1 rail trim; **Actions** door on Problems header; Now *Blocking handover* links to Actions filtered critical; optional one line on Actions lede for stage gate | `now.mjs`, `actions.mjs`, `inventory.mjs`, `structure.mjs` |
| **SG-1 — Journey on the Problems path** | Last journey step on Fixes/snag rows; add journey step from project Problems without going to factory register; journey snippet on Actions Problem rows | `snags.mjs` patterns, `actions.mjs`, problems paper |
| **SG-2 — Run → fix → verified** | Snag/fix stores `sourceTestId` / run; Problems shows *Found on run n*; fix state *fixed* / *verified* from retest | `stagegate-walk.mjs`, `program-studies.mjs`, report relevance |
| **SG-3 — Investigate (6M) on one project** | From critical snag: *Investigate* → case linked; countermeasures on board appear on Actions; fishbone optional tab or under **More** | New acceptance `stagegate-investigate.mjs`; `sixm-evidence.mjs` patterns |
| **SG-4 — Proof and money** | Countermeasure `expect` on fix or linked todo; handover blocked until critical verified | existing money specs where they apply |

**Path slices (existing):** P1 (rail/tab parity), P4 (eight-step walk), P5
(Rowland's walk) — **P5 findings feed SG-0/SG-1 first**.

**Steady / structure:** no new scope; Actions already uses `projectRead` /
portfolio — SG slices only add fields and UI doors.

---

## 6. Slice 0 — UI fixes (if Actions feels "missing")

These are copy and links only — no new records.

1. **Problems tab** — subtitle or header link: *Open the action tracker ›*
   → `#/project/:id/actions`.
2. **Now — Blocking handover** — footer link: *All critical on Actions ›*
   (optional query `?only=priority` when supported).
3. **Actions** — stage-gate lede one sentence: *Fixes, test steps, materials
   and open problems in one list — use Problems for the full fix list and
   journey.*
4. **Rail / tabs** — either implement STAGEGATE-PATH P1 (Actions off top
   tabs, only under Now) **or** update the path to match eight tabs and put
   Actions in **More** with a count — pick one story; today both docs and
   code disagree slightly.

---

## 7. Acceptance criteria (when built)

- On a stage-gate seed project, **Actions** lists every open fix and every
  critical/high problem with who and by when; late matches Now and the band
  (`one-number.mjs` / `actions.mjs`).
- A problem worked on the **Problems** tab shows journey steps on paper and
  on the row; the same problem's row on **Actions** shows owner, due and
  last journey line.
- Optional SG-3: one linked case; a countermeasure appears on Actions with
  `why` pointing at the cause; closing follows 6M proof rules or test verify.

---

## 8. Plain English — for Rowland

You already have an action tracker for stage-gate projects: it is the
**Actions** page (`#/project/:id/actions`). It pulls together fixes, test
steps, critical items, and register problems with **who, what, when, where
and why** — the list you want in a meeting, with paper for the room.

What feels missing is mostly **finding it** (it sits under Now, not on the
main tabs) and **following the story** (the register has a journey; the
Problems tab is fix-focused). **6M** is the method for *deep* root cause —
fishbone, countermeasures, proof on a number. That should not replace stage
gate; it should plug in when a commissioning problem needs more than assign
and re-test, and still feed **Actions** so nothing lives in a second place.

Recommended next build: make Actions obvious from Now and Problems, put the
journey on the stage-gate problem path, then add an optional *Investigate*
into a linked 6M case when you need the full loop.
