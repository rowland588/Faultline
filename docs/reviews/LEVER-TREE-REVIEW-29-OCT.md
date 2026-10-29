# Lever tree project system — review (29 October 2026)

Rowland asked for a **review of the lever tree** while stage-gate work continues. This document is research against the repo and docs as of 29 October; it does not change product behaviour. Where it disagrees with older maps (`docs/map/tree-and-control-room.md`, parts of `docs/STRUCTURE.md` §13), **the code and `docs/DIRECTION.md` win**.

**Positioning (plain English, for sponsors):** [`docs/LEVER-TREE-DISCOVERY.md`](../LEVER-TREE-DISCOVERY.md) — what lever tree is for, when to pick it, and open questions; written the same day from this review, not a build spec.

**Strategic fit (keep / park / fold):** [`docs/LEVER-TREE-FIT.md`](../LEVER-TREE-FIT.md).

**Audience:** Rowland and the next builder session. **Yardstick:** the same questions stage gate is now held to — one path, one name per place, shared infrastructure parity, sellability without becoming a generic method builder.

---

## 1. Purpose and current UX vs stage gate and 6M

### 1.1 What it is for

In `src/lib/planModel.ts`, the lever tree is the third kind of change:

| | Stage gate | 6M | Lever tree |
|---|---|---|---|
| **Situation (New project)** | Bring new equipment into use | Make a running line perform better | Hit a number by a date |
| **Question answered** | Is equipment proved to what was agreed? | What holds the line back, root cause, who fixes? | What must be true to reach the outcome, and is it being done? |
| **Organised as** | Machines · gates · tests · handover | Gap · fishbone · countermeasures · proof on the number | Outcome → levers → conditions → work under each |
| **Rhythm** | Daily at the line | Weekly in the meeting | Monthly with the sponsor |
| **Done** | Handed over | At target, and holding | The outcome proved |

Knowledge base: `knowledge/methods/visual/kpi-tree.md` (FC-213 in the catalogue — marked **not available** as a standalone tool; the **project kind** is what is built).

### 1.2 What is built today

**Core surface:** `src/screens/LeverTree.tsx` (~1,200 lines) — a zoomable canvas of typed boxes, manual status colours, optional **bind to a project number** (`lib/treeBind`) or **bind to board actions** (People/Plant/Process categories), paste-from-tracker, move/reorder, `SuggestSheet` for splitting a box into conditions, client read-only view.

**Shared with 6M (paced model):** same `pace_todos` board (`BoardScreen`), lines with targets and readings (`ProjectLineScreen`, Results / Numbers · Wins on overview), materials, optional Pareto, tools rail (P2), Actions (`lib/projectActions` / `pacedOwed`), Journey (`docs/JOURNEY.md` — built for all kinds; acceptance uses stage gate + 6M), Line Talk, problems register.

**Front page:** `ProjectDashboardScreen` — for `model === 'tree'`, overview shows `TreeTopPanel` (outcome + top conditions), `NeedsYouPanel` (board + materials/programs), `LinesPanel`, `StartHere` checklist (`lib/startHere.ts` — last step “Write the outcome on the tree” instead of “Open the first problem”), `ThisWeekLine`, Report ▾ from `projectKind` papers.

**Control room:** Factory board (`lib/portfolio`) reads tree jobs via `treeStanding` — sentence leads with tree state, then line pace (`pacedSays`).

**Report:** One primary client paper — **Client report — A3** (`#/pace-report?project=:id`), including `TreePage` when `project.leverTree` and nodes exist (`PaceExecReport.tsx`). No separate **Status report — 1 page** entry in `src/project/projectKind.ts` (6M and stage gate have one; tree does not).

**Seeded exemplar:** `src/dev/seed.ts` — project “Line 2B to 60 ppm”, tree nodes, bound ppm condition (readings 48→54 vs target 60), board actions, Pareto on; drives smoke routes and journey **J6** (`docs/structure/journeys-stage-a.mjs`).

### 1.3 UX compared to the other two (as of 29 October)

| Dimension | Stage gate | 6M | Lever tree |
|---|---|---|---|
| **Path doc** | `docs/STAGEGATE-PATH.md` — eight steps, tabs, papers, keep/fold/remove | `docs/SIXM.md` + fishbone journey | **No equivalent path page** — best map is `docs/map/tree-and-control-room.md` (3 Oct), partly stale |
| **Phone bar** | `projectMenuBar`: Now · Programs · ＋ · Timeline · More | Same bar (keys `job`→Overview, fallback Programs/Timeline links) | **Same as 6M** — not a tree-first bar |
| **Project tabs (desk)** | Now · Programs · Timeline · Gates · Machines · Problems · Reports · More | Overview · Fishbone · Board · Lines · Results · … · Journey · Actions · Tools | Overview · **Tree** · Board · Lines · Results · … · Journey · Actions · Tools |
| **“Home” of the method** | Now | Fishbone (phone bar second slot still wrong label) | Tree (desk rail); overview shows tree top |
| **Proof model** | Tests / programs / gates | Before → after on line number; countermeasure proof | Outcome number + box status; **no test centre** (`docs/TEST-CENTRE.md` §14) |
| **Acceptance** | `stagegate-walk.mjs`, `now.mjs`, many papers | `sixm-evidence.mjs`, `journey.mjs` (partial) | **`front-door.mjs` only** (+ smoke URLs, J6 in journeys, no dedicated end-to-end script) |

**Contrast with 6M in acceptance:** `sixm-evidence.mjs` walks gap → fishbone → evidence → countermeasure → before/after → report. Nothing similar exists for tree → bind number → board action → reading → A3/report sentence reconciliation.

---

## 2. Completeness — is it a third-class citizen?

**Verdict: partly.** It is a **first-class plan model** (picker on New project, guarded routes, seed, portfolio sentence, A3 report page) but a **second-class project workspace** relative to stage gate and, to a lesser extent, 6M.

Evidence:

1. **Documentation and governance** — Stage gate has `STAGEGATE-PATH.md` and `STAGEGATE-AESTHETIC-REVIEW.md`. Lever tree has an October map and catalogue knowledge, not a single “path until we lock it” page Rowland can sign.
2. **Acceptance** — Catalogue (`src/catalogue/entries/operations.ts` FC-213) lists acceptance `['front-door.mjs']` only. Smoke opens tree/board/pareto/report; no script asserts bind rules, paste, suggest, or paper vs screen.
3. **Papers** — `KINDS.tree.papers` = A3 client + journey only; no one-page status for sponsors; journey acceptance explicitly runs on **stage gate + 6M**, not tree.
4. **Catalogue / standard** — FC-213 “→ available” in W9; `knowledge/methods/visual/kpi-tree.md` §In Faultline still lists **arithmetic check (children to parent), gap allocation, lever money** as pieces to add — not verified in gate.
5. **Historical naming** — `docs/REVIEW.md` (2 Oct) still says “3P” beside lever tree; `types.ts` comment on `leverTree?: boolean` describes opt-in **tool** on non-tree projects, while `createProject(..., 'tree')` sets the **model** flag — easy to confuse for sellability (“is tree a method or an add-on?”).
6. **Strengths that are not third-class** — Full tree editor, bind engine, board integration, control room copy, project workspace P2 (tools in project), Actions parity with 6M, journey module shared, `projectRead` / `projectKind` S2 parity for papers and ownWork wording.

---

## 3. Shared infrastructure — parity gaps

| Area | Stage gate / 6M | Lever tree gap |
|---|---|---|
| **Actions** | Same `pacedOwed` / board rows | Parity **good**; tree conditions off-track are **RAG on boxes**, not register problems (by design — `STRUCTURE.md` §13) |
| **Tools** | Full rail + `?project=` | Parity **good** (P2) |
| **Line binding** | Points at factory lines | Same; tree seed uses Line 2B |
| **Journey** | Built; acceptance on SG + 6M | **Not in journey.mjs**; week line on overview exists but not gated for tree |
| **One number (S1)** | `one-number.mjs` on seeded SG + 6M | **Not shown** to include tree project |
| **Project phone bar** | Purpose-built | **Inherited broken pattern** — `projectMenuBar` used for **all** projects (`ui/Frame.tsx`); 6M/tree lack `programs`/`timeline` tabs but bar still shows those labels (fallback URLs) — `structure.mjs` `ONE_BAR_6M` encodes this |
| **Now / front page** | Stage gate: dedicated Now | Tree uses **legacy overview** (Verdict + tree top + Needs you), not a sponsor-style “where is the outcome?” page |
| **Results** | 6M: Numbers · Wins | **Shared** — appropriate for outcome proof |
| **Fishbone** | 6M only | Correctly blocked (`RequireModel` board only) |
| **Programs / gates** | SG only | Routes guarded; smoke still hits `#/programs` on tree (should redirect or refuse clearly) |
| **Reports** | Many papers + machine reports | **A3 + journey only** — no “tree on one page” Report ▾ entry separate from full client report (planModel says both; kind papers collapse to A3) |
| **Machine page / line-is-home** | SG + factory | Tree uses line pages same as 6M — **OK** per `docs/MAP.md` |

**projectRead:** Tree uses `paced` branch only (no gate); `owedAndDone` matches 6M. **Journey input** gets materials/programs from paced — same as 6M.

---

## 4. Sellability and “lock down” vs generic

Rowland’s stage-gate direction (27–28 October): **fix the path**, reduce doors, name papers for readers, don’t rebuild a generic project OS. Parallel for lever tree:

**Sellable story (already in planModel):** “One outcome by a date — tree of what must be true, actions under it, numbers bound where it matters, client A3.” That is **not** the deleted method builder (`docs/DIRECTION.md`) — it is a fixed shape like gates, not free-form blocks.

**Lock-down candidates (aligned with STAGEGATE-PATH thinking):**

1. **One written path** — e.g. start project → line + measure + target + reading → outcome on tree → levers/conditions → actions on board → monthly reading / sponsor review → A3. No new screens until the path doc exists.
2. **Fixed levels** — `LeverTree.tsx` already names four levels + generic deeper; product could **cap or guide** depth for sellability (method says levers, not 40-box wish trees).
3. **Numbers** — bind-to-measure is the moat; **child sums to parent** and **gap £** (`kpi-tree.md`) should be formula-gated before claiming FC-213 / sellability.
4. **Opt-in confusion** — Today: `model === 'tree'` vs `project.pareto` vs optional `leverTree` on a 6M project for an extra Tree tab (`ui/Frame.tsx`). For sale: **one lever-tree kind**; drop or hide “extra tree on a 6M job” unless Rowland wants hybrid projects.
5. **Rhythm** — “Monthly with sponsor” is not reflected in UI (unlike SG Now daily). A **sponsor summary** (one page, outcome + off-track levers + actions) would mirror status report without generic dashboards.
6. **Generic risk** — `SuggestSheet`, free-text boxes, manual colours are right for **thinking**; reporting must stay **formula-led** where bound (already true for number bind; not for parent/child arithmetic).

**Do not** — AI method design, duplicate board/fishbone, or a second KPI tool outside the project (catalogue FC-213 should stay “the project kind”, not a separate rail tool).

---

## 5. Recommended next slices (priority order)

Ordered for **stability and sellability** without blocking stage gate; each slice should update **`docs/PAGES.md`** and add or extend acceptance when behaviour is claimed.

| Priority | Slice | What | Why first |
|:---:|---|---|---|
| **L0** | **Lever-tree path doc** | New `docs/LEVER-TREE-PATH.md` (mirror STAGEGATE-PATH): steps, tabs, papers, keep/fold; link from this review | Rowland’s “clear path” pattern; nothing new built off-map |
| **L1** | **Acceptance: lever-tree walk** | `scripts/acceptance/lever-tree.mjs`: seeded tree job — StartHere → tree bind → board action late → record reading → A3 PDF sentences vs `treeStanding` / `treeBind`; phone + desk | Same contract as `sixm-evidence.mjs`; catalogue FC-213 truthful |
| **L2** | **Phone bar + tabs for paced projects** | Split `projectMenuBar` — stage gate only; 6M/tree bar: Overview · Tree or Fishbone · ＋ · Board or Actions · More (exact labels with Rowland); fix `structure.mjs` expectations | Removes false Programs/Timeline doors; biggest UX parity gap |
| **L3** | **Status paper for tree** | One-page “Outcome and levers” (screen + Report ▾ + `projectKind.papers`) — tree top + off-track list + line number; reuse `TreeTopPanel` / `treeStanding` | Sponsors get SG-like 1-pager without full A3 |
| **L4** | **Journey + one-number on tree seed** | Extend `journey.mjs` + `one-number.mjs` to tree project id | Shared infrastructure proof |
| **L5** | **KPI arithmetic + money** | Implement and test gap allocation / child-to-parent rules in `treeBind` or sibling module; paper blocks; update `kpi-tree.md` §In Faultline | Sellability and `knowledge/STANDARD.md` bar |
| **L6** | **Overview refresh (optional)** | Tree-specific front page: outcome sentence first, off-track levers, “Open tree ›”, defer 6M-style Verdict tiles if noisy | Matches “monthly sponsor” rhythm without copying Now wholesale |
| **L7** | **Catalogue + hybrid cleanup** | FC-213 status; clarify/remove 6M-only “opt-in lever tree” flag if not wanted | Avoid two meanings of “lever tree” in sales demos |

**Explicitly defer** until path agreed: trial/test centre for tree (`TEST-CENTRE.md` Q18), new tools, DMAIC/hoshin entries in catalogue.

---

## 6. Key file index (for builders)

| Topic | Location |
|---|---|
| Method definition | `src/lib/planModel.ts` (`MODELS` tree entry) |
| Kind papers & labels | `src/project/projectKind.ts` |
| Tree UI | `src/screens/LeverTree.tsx`, `TreeTopPanel` in dashboard |
| Bind / standing | `src/lib/treeBind.ts`, `lib/portfolio.ts` |
| Rail / tabs | `src/ui/rail.ts` `projectGroups`, `projectMenuBar` |
| Routes / guards | `src/router.tsx`, `state/useRoute.ts` |
| Report | `src/screens/PaceExecReport.tsx`, `paceReportPages.tsx` `TreePage` |
| Seed | `src/dev/seed.ts` (tree block ~815+) |
| Knowledge | `knowledge/methods/visual/kpi-tree.md` |
| Maps (stale risk) | `docs/map/tree-and-control-room.md` |
| Journeys | `docs/structure/journeys-stage-a.mjs` J6 |

---

## 7. Summary

The lever tree is **real, usable, and integrated** with board, numbers, tools, actions, and A3 reporting — but it lacks the **path, acceptance, phone navigation, and one-page sponsor paper** that stage gate is now getting. It shares **6M’s paced plumbing** correctly; its unique value is the **tree + bind** surface, not yet fully backed by **formula completeness** or **end-to-end proof** in the gate.

**Top 5 recommendations:** L0 path doc · L1 acceptance script · L2 phone bar split · L3 one-page status · L5 KPI arithmetic/money.

---

*Review author: cloud agent session 29 October 2026. Branch: `cursor/review-lever-de14`.*
