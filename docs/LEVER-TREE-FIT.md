# Does lever tree belong in Faultline?

**29 October 2026 — strategic memo for Rowland.** Not a build spec. This answers the bigger question: given what Faultline is, should lever tree stay in the app, be parked, or be folded into something else?

**Read with:** [`docs/DIRECTION.md`](DIRECTION.md) (wins on disagreement), [`docs/LEVER-TREE-DISCOVERY.md`](LEVER-TREE-DISCOVERY.md) (what it is for), [`docs/reviews/LEVER-TREE-REVIEW-29-OCT.md`](reviews/LEVER-TREE-REVIEW-29-OCT.md) (what is built today).

---

## 1. What Faultline is

Rowland, 1 October, on what the product is for:

> "show the business a formal process, to show that I am in control of the project."

That is still the spine. **Faultline is a control room for change on production lines.** The unit of work is not a tool run or a spreadsheet row — it is **a change to a line** (new equipment, a line that must perform better, a number that must be hit). Many changes happen at once; the ops lead must stay in control of all of them and be able to show it. The record for a change is the **project** — one word on every screen; open a project and the app is that project, with its tools, problems, Actions, reports and Line Talk inside it (`docs/PROJECTS.md`, `docs/DIRECTION.md`).

What the app must always do, in order (`CLAUDE.md`, agreed with Rowland): **see, understand, commit, prove, show** — start from the situation on the floor, give every change a measured before and after, and keep one view above all changes that answers *am I in control?* The moat is not "we have more Lean tools than Minitab" (`docs/DIRECTION.md`, checked 20 October). It is that **the line knows itself** — shifts, rates, crew and margin set once, every finding in money without retyping — plus commissioning machine by machine, and **evidence → cause → action → proof on the same line's numbers**. Every change either strengthens that thread or it waits.

**For Rowland's team first; sold later.** Deep, not wide. Nothing new is built until Rowland says go (`docs/DIRECTION.md`). The measure of a feature is whether the team uses it on the line and whether it helps someone say something to the sponsor, the OEM or the client that they could not say before — not whether a market slide looks complete.

---

## 2. What lever tree is trying to be

In code and copy, lever tree is the **third kind of change** beside stage gate and 6M (`src/lib/planModel.ts`):

| | Lever tree (as defined) |
|---|---|
| **Situation** | Hit a number by a date |
| **Question** | What has to be true to reach this outcome, and is it being done? |
| **Shape** | Outcome → levers → conditions → the work under each |
| **Rhythm** | Monthly with the sponsor |
| **Done** | The outcome proved |
| **Primary paper** | Tree on one page · client report (A3) |

**In the product today** (`docs/reviews/LEVER-TREE-REVIEW-29-OCT.md`): a zoomable tree (`LeverTree.tsx`), boxes that **bind** to a project measure (readings → RAG) or to **board categories** (People/Plant/Process actions derived under a condition, `treeBind.ts`); the same **paced** plumbing as 6M — board, line targets and readings, Results, Journey, Actions, tools in the project; control room rows lead with **tree standing** when present (`portfolio.ts`: outcome and conditions in words, then line pace and late actions). The seeded story is "Line 2B to 60 ppm" — sponsor promise at the top, rate lever red, plant work underneath.

**In knowledge** (`knowledge/methods/visual/kpi-tree.md`, FC-213): a KPI tree is for **numbers**, not states — children should add or multiply to the parent; gap should allocate to branches so effort does not scatter. That arithmetic bar is **not** fully gate-proven in the app yet.

**What it is not trying to be:** daily execution at the line (that is stage gate **Now** or the **line as home**, `docs/MAP.md`); an open-ended root-cause hunt (that is 6M); or a generic method builder (deleted 20 October, `docs/DIRECTION.md`).

---

## 3. Arguments for keeping it in the app

1. **Rowland already chose three kinds of change, not two.** 30 September: *"I've built three individual project methods ... I want to be able to use this in multiple business scenarios, because my work is so diverse."* `docs/DIRECTION.md` still lists lever tree as one of the three drivers from tools to actions and proof. Removing it without replacing that situation leaves a hole: *leadership named one outcome and a date — where does that project live?*

2. **It answers a different question than 6M or stage gate.** Stage gate = **state** (handed over). 6M = **problem with unknown or disputed cause** (fishbone, weekly team rhythm). Lever tree = **number with agreed drivers** (outcome-down, monthly sponsor rhythm). Discovery's rule of thumb: if the sponsor says *"We said 60 ppm by Q3 — show me what has to be true and what is red"*, a gate grid or a fishbone is the wrong primary picture (`docs/LEVER-TREE-DISCOVERY.md` §2).

3. **It reuses the moat instead of fighting it.** Tree jobs share lines, readings, tools, Actions and money plumbing with 6M — the same "one number on the line" story S1 cares about. Bound measures on boxes tie sponsor language to **formula-led** RAG, not a separate Excel colour column. When built out, gap allocation and child-to-parent checks are exactly the kind of **calculating bit** Rowland said tools must get right (20 October direction).

4. **Sponsor-facing proof is part of "show".** A3 and a one-page tree narrative match how steering packs are read — different from commissioning reports or a 6M client report. Control room copy already prioritises *what we promised* before *what is late on the board* for tree rows.

5. **Cost of removal is not zero.** Routes, seeds, portfolio sentences, `planModel`, front-door picker, smoke journeys (J6), and hybrid `leverTree` flags would need a deliberate unwind; dormant code that still appears on New project is worse than an explicit park.

---

## 4. Arguments for removing or parking it

1. **Focus and stability.** Rowland, 23 October: *"I just want organisation and stability in the app ... make a design that ensures it all works."* Stage gate is getting a signed path, aesthetic lock-down and acceptance walks (27–28 October). Lever tree has **no path doc**, **no end-to-end acceptance** (only `front-door.mjs`), **no one-page status report** for sponsors, and **6M's phone bar** (false Programs/Timeline doors). Keeping a third method visible while the first is still being hardened **splits attention and story**.

2. **Half-built erodes trust.** FC-213 and `kpi-tree.md` still call for child-sums-to-parent, gap £ and lever money — not verified in the gate. Selling or demoing a tree without that is **appearance over evidence**, against `knowledge/STANDARD.md` and Rowland's 22 October bar. A qualitative diagram with one bound headline number is useful internally but easy to dismiss as "boxes not sums".

3. **Overlap with 6M where the team actually works.** Lever tree shares the **board**, **Results**, **countermeasure-shaped actions**, and **line proof** with 6M. Much sponsor work is still "gap → work → proof on the number" — 6M already owns that loop (`docs/OPEX.md` six moves). Without a crisp *when to pick tree*, teams will default to 6M and the tree tab becomes shelfware.

4. **Not line-home; not the sell story today.** `docs/MAP.md`: machines, programs and studies live on the line; projects point at them. Lever tree is **steering**, not shift-by-shift — fine for rhythm, but it does not reinforce "my line is my home page" the way line reports and stage-gate machine pages do. For **sold later**, the differentiated story in market checks is still **commissioning + line-aware money + evidence on the number** — lever tree is harder to explain in one sentence than stage gate or 6M.

5. **Habits and tools elsewhere.** Many sites steer with **Excel KPI trees**, SQDCP boards, or client trackers (`treeBind` paste-from-tracker assumes that). If the team never lives in the tree UI, Faultline adds maintenance (1,200-line screen, bind rules, A3 tree page) without replacing the wall picture.

6. **Hybrid confusion.** `model === 'tree'` vs optional `leverTree` on other projects blurs "method vs add-on" — bad for demos and for catalogue truth (review §4–5).

---

## 5. Three options (not binary)

### A) Keep — third method, invest L0–L3 (minimum) or through L5 (sellable)

Treat lever tree like stage gate after path work: **one written path** (`LEVER-TREE-PATH.md`), **acceptance walk** on the seed, **honest phone bar**, **one-page sponsor status**, then **KPI arithmetic** before claiming FC-213 / external sell.

**Best when:** Rowland's team runs (or wants to run) **outcome-down steering** inside Faultline monthly — client contracts, cost-a-pack programmes, dual-line output promises — and will **not** keep a parallel Excel tree.

**Risk:** Continues parallel product surface area while stage gate and line-home still moving.

### B) Park — hide from New project; keep code dormant

Remove lever tree from the **New project** picker and front-door copy; archive or hide seeded tree demo from default dev paths; keep routes and data model so nothing breaks for any tree project already on a device. No L0–L5 until Rowland explicitly says go.

**Best when:** Stability and **stage-gate + line + 6M** depth matter more right now than a third method; sponsor trees stay in Excel/PowerPoint for the year.

**Risk:** Latent code and docs drift; re-entry cost when/if unparked.

### C) Fold selectively — outcome + target without full tree UI

Keep **one outcome number, date, sponsor, and line readings** on 6M (or a thin "outcome" block on any paced project); drop or hide the canvas, bind engine and A3 tree page except as export of a simplified summary.

**You lose:** lever accountability on the diagram, condition-level RAG, paste-from-tracker, split/suggest workflow, and the distinct **monthly sponsor** journey. **You keep:** proof on the number, board, fishbone when cause is unknown, and one app rhythm (weekly team + optional sponsor sentence).

**Best when:** Almost all work is "perform better" with occasional sponsor dates, not standalone KPI programmes.

---

## 6. Recommendation

**Default recommendation: Option B (park) for the next phase, with a explicit decision gate to unpark — confidence ~70%.**

Faultline's identity and current investment are **control room + line that knows itself + stage gate path + 6M proof loop**. Lever tree is **conceptually aligned** (third situation Rowland named, outcome-down, shares numbers and Actions) but **operationally third-class** today: no path, no walk, incomplete KPI maths, wrong phone navigation, and it pulls the same builder attention stage gate needs to finish. Parking is not a verdict that KPI trees are wrong — it is a verdict that **a half-visible third method hurts the "organisation and stability" goal** more than it helps the sell story until Rowland's team asks for it on the floor.

**If Rowland's answer is "we already steer Line X with a tree every month and I want that inside the app,"** switch to **Option A** with a hard minimum bar (§7) before it appears on New project again — not incremental tree features in the margins.

**One sentence for Rowland to decide:** *Do you run sponsor-facing outcome trees inside Faultline today (or within the next quarter), or is stage gate + 6M + the control room enough until that work justifies L0–L3?*

---

## 7. If you keep — minimum bar to deserve a place

Before lever tree is **offered on New project** or **sold**, all of the following (from the 29 Oct review, aligned with stage-gate discipline):

1. **Signed path doc** — steps, tabs, papers, keep/fold; no new tree features off-map.
2. **Acceptance script** — seeded job: outcome on tree → bind measure → board action → reading → A3 / standing sentences match modules (`lever-tree.mjs`).
3. **Navigation honesty** — phone bar and tabs that match tree/6M (no Programs/Timeline ghosts).
4. **One-page status report** — outcome + off-track levers + line number + late actions (Report ▾), separate from full A3.
5. **KPI arithmetic** — at least child-to-parent check and gap allocation on bound branches, gate-proven (`knowledge/STANDARD.md`).
6. **One meaning** — `model === 'tree'` only; drop or hide opt-in tree on 6M unless hybrid is an explicit product choice.
7. **Catalogue truth** — FC-213 status matches what the gate proves.

Until then, keeping it on the front door overclaims readiness.

---

## 8. If you park — what to tell buyers and users

**Users (Rowland's team):** "Faultline today is built around **new equipment (stage gate)**, **running lines that need to perform better (6M)**, and the **factory control room** — problems, actions, tools on the line, reports in money. **Outcome KPI trees** for monthly sponsor steering are **on hold in the product** while we finish the stage-gate path and line-home experience. Your tree projects on device are not deleted; we are not starting new tree projects from the app until we bring them back deliberately."

**Buyers (later):** "The control room ties **commissioning**, **root-cause improvement**, and **line-backed numbers** in one place. A dedicated **lever-tree / KPI-tree project type** is designed and partially built; it is **not part of the current offer** until path, acceptance and formula completeness match stage gate. That avoids selling a diagram without sums."

**Internal:** Do not delete `LeverTree.tsx` or bind logic in the same breath as parking — **hide the front door**, freeze scope, document unpark criteria (§7).

---

## 9. How the control room treats tree today (vs SG / 6M)

| Surface | Stage gate | 6M | Lever tree |
|---|---|---|---|
| **New project picker** | Stage gate — bring new equipment | 6M — perform better | Lever tree — hit a number by a date |
| **Factory board row** | Gates, machines, programs, late tests | Line pace, fishbone/board actions | **Tree standing first**, then paced line/actions |
| **Primary "method home"** | Now | Fishbone (desk); bar still messy on phone | Tree tab; overview `TreeTopPanel` |
| **Proof centre** | Tests, programs, gates | Before/after on line number | Outcome measure + box RAG; no test centre |
| **Acceptance in gate** | Many scripts | `sixm-evidence.mjs`, journey partial | **`front-door.mjs` only** |

So lever tree **is visible** at the front door and **is read** on the control room when a tree project exists — but it does **not** yet have the same proof and path contract as the other two.

---

## 10. Links

| Doc | Role |
|---|---|
| [`LEVER-TREE-DISCOVERY.md`](LEVER-TREE-DISCOVERY.md) | When to pick tree; scenarios; open questions |
| [`reviews/LEVER-TREE-REVIEW-29-OCT.md`](reviews/LEVER-TREE-REVIEW-29-OCT.md) | Code vs UX vs SG/6M |
| [`DIRECTION.md`](DIRECTION.md) | Product direction |
| [`BLUEPRINT.md`](BLUEPRINT.md) §1 | Three methods in the shape |
| [`src/lib/planModel.ts`](../src/lib/planModel.ts) | The three `useWhen` lines |

---

*Memo author: cloud agent, 29 October 2026. Branch: `cursor/lever-tree-fit-de14`. Doc only — no product behaviour changed.*
