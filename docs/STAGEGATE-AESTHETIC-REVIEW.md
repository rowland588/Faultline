# Stage gate — full aesthetic, UI and code review (28 October)

Rowland asked for a **full review** of the stage gate — look and feel, UI, app colours, and the code that carries it — and an **improvement plan** to execute in slices.

**Shipped slices (28 October, Rowland: go on aesthetics):** **B1** — Now machine gates use `StateTag` (outline, not solid `.now-gate` pills). **B4 (Now only)** — fifth lean tile hidden when it is only a “give … on the Factory’s Lines page” placeholder (`stageGateTiles(..., 'now')`). **C1 (partial)** — machine list capped at eight with *All machines ›*; Now shortcuts are text doors, not a second button row; calmer project tabs and Now verdict band (`src/styles.css` `.now .vd`, `.now-doors`, `.nv-tab`). **C4** — Commission and Install grids: empty cells show a quiet em dash (not a dashed `+` box); read-only gaps match; phone cards use the same dash (`CommissionGrid.tsx`, `InstallGrid.tsx`, `.ig-cell.is-empty`, `.igm-st.is-empty`). **C5** — Programs opens on **Needs you**; **Prove** fold wraps test + criteria on each row (`programNeedsAttention`, `ProgramProveBlock`). Further slices (B2–B3, C2–C3, C6, A*, D*, E*) remain below.

Where this disagrees with `docs/STAGEGATE-PATH.md` on navigation shape, **the path page should be updated first** when a slice ships (audit item N10).

**Correction (28 October):** **Journey is not in the main menu** you see (Factory · Projects · Tools, etc.). It was taken off the project tabs on purpose (`docs/STAGEGATE-PATH.md` §4). The route `#/project/:id/journey` still exists and is reached from Now (*Any dates ›*) and Reports — not as its own tab. Phase **C2** below is about shortening that **page** if you open it, not adding Journey back to the bar.

**Yardstick** (from the 27 October audit): you always know where you are; one name per page; one obvious way to each place; opening something does not drop you out of the project by accident; nothing said twice; plain words; **normal is quiet** — only late and failed carry strong colour.

---

## 1. Executive summary

The stage gate **works functionally** — eight steps from start to handover are represented in code, papers, and acceptance scripts — but it **still reads as complex** because:

1. **Navigation is layered** — context bar, project tabs, Plan sub-tabs, global phone menu, and (on some pages) lean tiles and Report ▾ compete for attention.
2. **Visual language is split** — the design system in `src/styles.css` is coherent on paper, but stage-gate screens mix **three eras**: legacy `.pace-*` dashboard chrome, modern `PageHeader` + lean tiles, and dense grids/drawers (Commission, Programs, tests).
3. **State colour is applied inconsistently** — most of the app uses **words in state hue** (`.part-tag`, `.spp-pill`); Now’s machine rows use **white text on solid fills** (`.now-gate`), which makes gate names look like alarm buttons (audit U5).
4. **Pages are long** — Now, Actions, Journey, machine pages, and test surfaces expose full lists where the audit asked for **one answer first, detail on tap** (audit U3).
5. **Docs lag code** — `STAGEGATE-PATH.md` still describes five tabs and gates under Now; the app has **Now · Plan · Machines · Problems · Reports · More** and `PlanTabs` on Plan routes (27 October batch).

**Good foundations to keep:** five semantic states with named meanings; cyan-teal brand separated from green “done”; shared `PageHeader`, Report ▾, lean tile pattern; one machine page in the project frame; programs criteria + sign-off model (`docs/PROGRAM-GOAL.md`).

---

## 2. Visual system — colours, type, components

### 2.1 Colour tokens (`src/styles.css` `:root`)

| Token | Role | Stage-gate usage |
|--------|------|------------------|
| `--brand` / `--accent` | Primary actions, links | Test it, Save, tab underline on Plan |
| `--st-g` | Done only | Passed, proved, signed off |
| `--st-w` | In progress / booked | Violet — deliberately not brand teal |
| `--st-a` | At risk / waiting | Amber tiles, outstanding |
| `--st-r` | Blocked / late / failed | Red edge on failed program rows, late counts |
| `--st-n` | Not started | Quiet fills; words use `--st-n-ink` |
| `--shell-*` | Verdict / lean bands | Now band, gate page tiles — light fill, printable |

**Rowland, 17 October:** move away from “all blue”; current scheme is **graphite + cool white + one teal**. That intent is documented in CSS comments and mostly held.

**Friction points:**

- **Legacy aliases** `--blue` / `--gold` duplicate `--st-w` / `--st-a` — easy for new code to pick the wrong token.
- **`.pace-profile-*` and chart swatches** still use one-off hex (`#fdf0e0`, `#e3f2f3`) beside tokens — charts on commissioning pages can look like a second palette.
- **Violet “in progress”** on gate steppers (`.now-gate.is-w`) reads as “brand” to some users because it is a strong fill; elsewhere “in progress” is text-coloured (`.part-tag.is-w`).

### 2.2 Typography and spacing

Six sizes (`--t-label` … `--t-num`), two weights, three radii — **good discipline** (B7). Stage-gate pages mostly comply.

**Exceptions:** Commission grid and program test forms pack many controls at `--t-detail`; timeline toolbar stacks seven controls (audit U11). Page titles sometimes compete with Report ▾ on its own row on phone (audit U12).

### 2.3 Component families (stage gate)

| Family | Classes / files | Job |
|--------|------------------|-----|
| Plan switcher | `.plt`, `.plt-t` — `ui/PlanTabs.tsx` | Gates · Timeline · Programs |
| Lean answer | `ui/Lean.tsx`, `ui/Verdict.tsx`, `lib/stageGateLean.ts` | Five tiles + closing line |
| Stage parts | `.spp-*` — `ui/StageParts.tsx` | Steps, program runs on a stage |
| Commission board | `.cm-*` — `ui/CommissionGrid.tsx` | Machine × test matrix |
| Install / handover grid | `ui/InstallGrid.tsx` | Gate matrices |
| Programs row | `.pgr-*`, `.ptx-*`, `.pgc-*` | Test + criteria on one row |
| Record surface | `ui/RecordDrawer.tsx`, `screens/TestScreen.tsx` | Tests and steps |
| Legacy pace chrome | `.pace-*` on `.wrap.pace` | KPI/chart styling inherited on gate pages |

**Aesthetic inconsistency:** Commission and Install feel like **spreadsheets**; Now and PageHeader feel like **product UI**; client report (`PaceExecReport.tsx`, `paceReportPdf.ts`) is a **third dialect** tuned for print.

---

## 3. Navigation and information architecture

### 3.1 As built (code)

```
Context bar (‹ Projects · line · page)
Project scope tabs: Now | Plan | Machines | Problems | Reports | More
Plan pages only: Install | Set up | Commission | Hand over | Timeline | Programs
PageHeader + (optional) lean tiles + body
Phone: Factory | Projects | ＋ | Tools | More   ← global, not project-scoped
```

Sources: `src/ui/Frame.tsx`, `src/ui/rail.ts` (`commissioningGroups`), `src/ui/PlanTabs.tsx`, `lib/scope`.

### 3.2 vs `STAGEGATE-PATH.md`

| PATH doc | Code / PAGES.md today | Action |
|----------|------------------------|--------|
| Five tabs, gates under **Now** | **Plan** tab + `PlanTabs` | Update PATH §2, §4 (N10) |
| Factory › Programs | Line-centric programs | PATH §1 step 6 wording |
| Journey/Actions off rail | Sub-lines in rail data for tab lighting | OK — not left rail |

### 3.3 Open audit items (navigation)

| ID | Issue | Recommended fix | Slice |
|----|--------|-----------------|--------|
| N1 | Too many horizontal bands | Collapse: one primary row per scope; Plan sub-tabs only on Plan | A1 |
| N4 | One page, several names | Breadcrumb = tab label only | A2 |
| N5 / **D3** | Phone bar is global | Project-scoped bottom bar: Now · Plan · Machines · Problems · More | A3 |
| N6 | Machines tab count = gate steps | Show **machine count**; gate counts on Plan only | A4 |
| N7 | Reports naming | Reports page + “Factory reports” in menu | A2 |
| N8 | Three links to Journey on Now | One “Journey ›” per section | A2 |
| N9 | Factory Problems link stale | Line problems link | A2 |

---

## 4. Screen-by-screen aesthetic and UX heat map

| Screen | Route | Primary question | Aesthetic / UX issues | Code hotspots |
|--------|--------|------------------|------------------------|---------------|
| **Now** | `#/project/:id` | Where are we; what needs me? | Repeated “behind target” (U2); long scroll (U3); `.now-gate` fills (U5); triple Journey links (N8) | `project/now/NowScreen.tsx`, `ProjectDashboardScreen.tsx` (1148 lines) |
| **Plan — Install / Set up / Hand over** | `install`, `set-up`, `handover` | Steps for this gate | Fifth tile “give line speed…” noise (U1); grid density | `InstallScreen.tsx`, `InstallGrid.tsx` |
| **Plan — Commission** | `testing` | Tests by machine | Empty cell noise (U7); `.pace` wrapper; board vs phone cards | `TestsScreen.tsx`, `CommissionGrid.tsx` |
| **Plan — Timeline** | `plan` | When things happen | Toolbar clutter (U11); key under download notice | `PlanScreen.tsx`, `Gantt.tsx` |
| **Plan — Programs** | `programs` | Prove programs | Was very long; **partial fix 28 Oct** (fold test history); criteria still dense | `ProgramsPage.tsx`, `ProgramTest.tsx`, `ProgramCriteria.tsx` |
| **Machines** | `machines` | Which machines; status | Generally clearer post-27 Oct | `ProjectMachinesScreen.tsx` |
| **Machine** | `machine/:id` | Everything on this machine | Remove mid-page; duplicate headings (U4); long scroll | `MachineInProject.tsx`, `LineMachineScreen.tsx` |
| **Problems** | `fixes` | Register | Actions page length (U3) if reached from Now | `FixesScreen.tsx`, `ActionsScreen.tsx` |
| **Reports** | `report` | Papers | Good pattern; naming (N7) | `ClientReportScreen.tsx` |
| **Test (drawer / page)** | drawer, `testing/:id` | Run / record test | ~30 controls (U6); duplicate full page | `RecordDrawer.tsx`, `TestScreen.tsx` |

---

## 5. Code architecture — strengths and debt

### 5.1 Strengths

- **Single models** for tests, stages, programs (`lib/testing`, `lib/programs`, `lib/noted`) — papers and UI share readers (`programsReport`, `stageGateLean`).
- **Structure slices** (B3 header, B4 tool shell) applied on gate pages.
- **Acceptance scripts** encode stage-gate journeys (`stagegate-walk.mjs`, `now.mjs`, `program-criteria.mjs`) — aesthetic changes must keep selectors or update `PAGES.md` + inventory together.

### 5.2 Debt (stage-gate–related)

| Area | Lines (approx.) | Issue |
|------|-----------------|--------|
| `ProjectDashboardScreen.tsx` | 1148 | Stage gate + legacy overview + other models in one file |
| `paceReportPdf.ts` / `PaceExecReport.tsx` | 1395 / 1369 | Report UI separate from on-screen components — parity risk |
| `RecordDrawer.tsx` | 838 | God surface for tests/steps/fixes |
| `InstallGrid` + `CommissionGrid` | 731 + 480 | Visual/logic coupled; hard to simplify without slice |
| `styles.css` | 14k+ | `.pace-*` block large; stage-gate shares class with exec report |

**Direction:** split by **seam** (Now body vs dashboard shell; drawer “simple mode” vs full test; PDF blocks per paper) — not a big-bang rewrite (`docs/STEADY.md` spirit).

---

## 6. Improvement plan — slices

Each slice: **scope**, **what a person sees**, **files touched**, **proof**, **depends on**. No slice removes inventory items without updating `docs/PAGES.md` in the same commit.

### Phase 0 — Align the map (no UI change)

| Slice | Work | Proof |
|-------|------|--------|
| **0.1** | Update `docs/STAGEGATE-PATH.md` §2, §4 to **Now · Plan · Machines · …** and Plan-owned gates | Doc review; N10 closed |
| **0.2** | Add this file’s cross-links from `STAGEGATE-AUDIT-27-OCTOBER.md` | — |

### Phase A — Navigation clarity (audit N1–N9, D3)

| Slice | Work | Key files | Proof |
|-------|------|-----------|--------|
| **A1** | Reduce bands on Plan pages: optional collapse of context + tabs on scroll (phone) | `Frame.tsx`, CSS | `structure.mjs`, `journeys.mjs`, inventory phone |
| **A2** | One name per page; one Journey link on Now; Reports naming | `NowScreen.tsx`, `ContextBar`, `rail.ts` menu labels | `where-am-i.mjs`, `now.mjs` |
| **A3** | **D3:** project phone bar = project tabs | `Frame.tsx`, `scopeBar` / `menuBar` | `now.mjs` phone section, `structure.mjs` |
| **A4** | Machines tab: count **machines**, not gate steps | `rail.ts` `machinesTab` | Manual + inventory |

**Rowland decision:** confirm **D3** (project phone bar) before A3.

### Phase B — Visual consistency (colours and state)

| Slice | Work | Key files | Proof |
|-------|------|-----------|--------|
| **B1** | **U5:** Replace `.now-gate` fills with gate name plain + `StateTag` for state | `NowScreen.tsx`, `styles.css` | `now.mjs`, screenshot compare |
| **B2** | Unify pills on stage-gate rows: `.spp-pill` / `.part-tag` rules only; document in CSS | `StageParts`, Commission tags | `programs.mjs`, `commissioning-report.mjs` |
| **B3** | Remove or tokenise one-off `.pace-*` chart colours on gate pages | `styles.css`, commission wrappers | Visual inventory `--shots` |
| **B4** | Fifth lean tile: hide “give line speed…” until missing input affects **this page’s** verdict; say once on Now/Details (U1) | `stageGateLean.ts`, `stageGatePages.ts` | `one-number.mjs`, inventory tiles |

### Phase C — Calmer pages (length and density)

| Slice | Work | Key files | Proof |
|-------|------|-----------|--------|
| **C1** | **Now:** one on-target sentence; band/tiles without triple repeat (U2); machine list **8 rows + More** | `NowScreen.tsx`, `Verdict.tsx` | `now.mjs` |
| **C2** | **Actions / Journey:** fold lists; show counts + filters first (U3) | `ActionsScreen.tsx`, `JourneyScreen.tsx` | `journey.mjs`, `actions.mjs` |
| **C3** | **Machine page:** fixed section order; Remove in More ▾; one heading level (U4) | `MachineInProject.tsx` | `one-machine.mjs`, `machine-reports.mjs` |
| **C4** | **Commission grid:** empty cells = quiet dash; reduce `+` noise (U7) | `CommissionGrid.tsx` | `machines-programs.mjs`, `commissioning-report.mjs` |
| **C5** | **Programs UI (continued):** single **Prove** fold (test + criteria); default filter “Needs you” | `ProgramRow.tsx`, `ProgramsPage.tsx` | `program-criteria.mjs`, `programs.mjs` |
| **C6** | **Test drawer:** primary four outcomes + Hit a problem; rest in More ▾ (U6) | `RecordDrawer.tsx` | `program-edit.mjs`, `stagegate-walk.mjs` |

### Phase D — Code health (enables aesthetics)

| Slice | Work | Proof |
|-------|------|--------|
| **D1** | Extract `NowBody` from `ProjectDashboardScreen` — stage-gate front page only | tsc, `now.mjs` |
| **D2** | Shared `GatePageShell` — PlanTabs + PageHeader + lean tiles once | Install/Tests/Programs pages shrink |
| **D3** | Deprecate standalone `TestScreen` for stage gate — drawer only; keep route as forward | `stagegate-walk.mjs` |

### Phase E — Walk and polish

| Slice | Work | Proof |
|-------|------|--------|
| **E1** | **P4** path script: eight steps §1 end-to-end on fresh device | New or extend `stagegate-walk.mjs` |
| **E2** | **P5** Rowland walk; `--shots` compare on every touched page | `inventory.mjs --compare` |
| **E3** | Paper parity after visual changes | `report-stress.mjs`, `GATE_PAPERS=1` |

---

## 7. Recommended order (if you say go)

1. **0.1** — PATH doc matches reality (cheap, stops confusion).  
2. **B1 + B4 + A2** — biggest “feels messy” wins on Now and tiles without new routes.  
3. **A3** — if you confirm D3 (phone).  
4. **C5** — Programs (started 28 Oct).  
5. **C4 + C6** — Commission and tests (floor daily use).  
6. **C1–C3, D1–D3** — length and structure.  
7. **E1–E3** — lock it in gate + your walk.

---

## 8. What we will not do in this programme

- New stage-gate **features** not on `STAGEGATE-PATH.md` §1–§3.  
- New colours or a second theme — work within `:root` tokens.  
- AI-driven UI or method builder (`docs/DIRECTION.md`).  
- Removing papers, tests, or criteria/sign-off — only **present** them more quietly.

---

## 9. References

- `docs/STAGEGATE-PATH.md` — path (needs §2/§4 refresh)  
- `docs/STAGEGATE-AUDIT-27-OCTOBER.md` — N1–N10, U1–U12, D1–D4  
- `docs/STAGEGATE-UX.md` — 16 October design rules and slices  
- `docs/PAGES.md` — gate inventory  
- `docs/AUDIT.md` — universal bar (ways out, phone, papers)  
- `src/styles.css` — design tokens (lines 1–145)  
- Artifact (27 Oct audit with screenshots): https://claude.ai/artifact/RvyLCvyBrtQjoxvyDPP8my  

---

*Review compiled 28 October 2026 from codebase on `main` and audit docs. Next step: Rowland picks slices (and D3 yes/no); builder updates PATH then ships slice by slice with gate + inventory.*
