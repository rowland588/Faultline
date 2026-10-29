# Lever tree — discovery (29 October 2026)

Rowland asked to **discover what lever tree can be**, not build yet. This is positioning in plain English for a manufacturing ops lead who has to **sell change to sponsors** and stay in control across every line. It sits beside the technical review [`docs/reviews/LEVER-TREE-REVIEW-29-OCT.md`](reviews/LEVER-TREE-REVIEW-29-OCT.md).

**Hypothesis you can edit:** lever tree is its **own** kind of change — not stage gate with a diagram, not 6M with a different skin. It is for when the business already agrees **one number** and **a date**, and the job is to show **what must become true**, **which lever is off**, and **that the work under it is happening** — in language a sponsor can follow monthly.

---

## 1. One sentence — what lever tree is for

**Lever tree is for proving to a sponsor that you know what must be true to hit an agreed outcome number by an agreed date — and for showing, each month, which lever is off track and what you are doing about it.**

*(Edit this until it sounds like something you would say in a steering meeting.)*

---

## 2. When to pick it — vs stage gate vs 6M

These are **situations**, not feature lists. Start from the situation on the Factory / New project screen (`docs/DIRECTION.md`: the control room starts from the situation).

| Your situation | Pick | Why |
|---|---|---|
| New kit is coming; you must install, commission, test and **hand over** machines with the OEM | **Stage gate** | Done means **handed over**; the journey is **gates, tests and programs** on each machine — not a KPI tree. |
| The line runs today but **under target** and you do not yet know **why** — stops, constraints, rejects, walk findings | **6M** | Done means **at target and holding**; the journey is **gap → problem → fishbone → countermeasures → proof on the same number**. |
| Leadership (or a client contract) has already named **one outcome number and a date** — ppm, cost a pack, yield, output a week — and wants **accountability for the drivers**, not a commissioning story or an open-ended root-cause hunt | **Lever tree** | Done means **the outcome proved**; the journey is **outcome → levers → conditions → work**, reviewed **monthly with the sponsor**. |
| The “project” is really **getting one machine through four gates** | Stage gate | A tree on top would duplicate Actions without adding proof structure. |
| The biggest issue is **one Pareto bar or constraint** and the team needs to **drill causes** and hold gains | 6M | Fishbone and problem phases exist for **unknown or disputed cause**. |
| You already have a **tracker or steering pack** with categories of work but need a **single wall picture** that ties work to **conditions** and the **top number** | Lever tree | The tree is the **logic layer**; the board stays the **work layer** (see `treeBind` — conditions bind to categories/actions, not the other way around). |
| Success is a **state** (“commissioned”, “handed over”) | Stage gate | `knowledge/methods/visual/kpi-tree.md`: trees are for **numbers**, not states. |
| Success is **better performance** but the sponsor has **not** pinned one measurable outcome | 6M (or agree the number first) | Without one outcome + date, lever tree becomes a generic diagram. |

**Rule of thumb from the knowledge base:** stage gate = **state**; 6M = **problem with unknown causes**; lever tree = **number with agreed drivers**.

---

## 3. What lever tree offers that the others do not

### Outcome-down logic (not gate-forward, not problem-up)

- **Stage gate** walks **forward through time** on each machine: Install → Set up → Commission → Hand over (`docs/STAGEGATE-PATH.md`).
- **6M** walks **up from evidence**: gap → head of the fish → bones → whys → countermeasures (`docs/SIXM.md`).
- **Lever tree** walks **down from the promise**: outcome at the top → what must be true → levers/conditions → actions underneath (`planModel`: *Outcome → levers → conditions → the work under each*).

That direction matches **sponsor language**: “We said 60 ppm by Q3 — show me what has to be true and what is red.”

### A sponsor story that is not the fishbone

- Rhythm in the product definition: **monthly with the sponsor** (`planModel.ts`), not daily at the line (stage gate) or weekly in the team meeting (6M).
- The primary client paper today is **Client report — A3** (tree page when nodes exist) — a **one-page narrative** shape sponsors already recognise, rather than a gate grid or a fishbone poster.
- Control room copy leads with **tree standing** when present: outcome/conditions in words, then line pace and open actions (`portfolio.ts`) — “what we promised” before “what is late on the board”.

### Lever accountability (not bone accountability)

- **6M** assigns countermeasures to **bones** and **causes** (`causeRef`, five whys, problem phases).
- **Lever tree** assigns work to **conditions** on the tree; boxes can **bind to a project number** (measure + readings → RAG on the box) or **bind to board categories** so tracker rows **derive** under a condition without copying Excel every week (`treeBind.ts`).
- Off-track is **RAG on the tree**, not necessarily a register problem — by design (`STRUCTURE.md` §13): the sponsor conversation is “which **lever** is off?”, not “open another snag”.

### The KPI tree as the journey (not gates, not fishbone)

- **Journey** for stage gate = plan marks and tests on machines; for 6M = fishbone phases and tools on days; for lever tree the **canonical picture is the tree itself** — the seeded exemplar is literally “Line 2B to 60 ppm” with outcome → bound ppm condition → plant condition → board actions (`src/dev/seed.ts`).
- **Start here** for a new tree job ends at **“Write the outcome on the tree”** instead of **“Open the first problem”** (`startHere.ts`) — the method’s first artefact is the **outcome box**, not a fish head.

### Shared infrastructure without being the same method

Lever tree **reuses** what 6M reuses for **numbers and work**: lines, targets, readings, Results, board actions, tools in the project, Actions page, Journey module, Line Talk. That is **plumbing**, not identity. The **unique surface** is `LeverTree.tsx` — zoomable boxes, bind, suggest/split, paste-from-tracker — plus **standing** sentences for portfolio and (partially) A3.

**Not yet fully productised (honest):** child-sums-to-parent arithmetic, gap £ allocation, dedicated acceptance walk, one-page **status** report for sponsors, tree-first phone bar — see the review doc. Discovery does not claim those are done.

---

## 4. What lever tree must NOT become

1. **Merged into stage gate or 6M** — Same Actions register and tools rail are fine; **one project kind** with its own path and papers. Avoid “tree tab on a 6M job” as a second meaning unless you explicitly want hybrid projects (review flags `leverTree` flag vs `model === 'tree'` confusion).

2. **A generic workflow / method builder** — Rowland killed the AI method builder (`docs/DIRECTION.md`). The tree has **fixed levels** (outcome → … → work); free text and colours are for **thinking**, but **bound numbers** and (when built) **arithmetic** must stay formula-led (`knowledge/STANDARD.md`).

3. **A duplicate Problems register** — Tree reds are **levers off track**; 6M problems are **improvement journeys on the register**. Do not force every red box to become a snag unless you decide that policy.

4. **A second KPI tool on the rail** — Catalogue FC-213 is **the project kind**, not a standalone “KPI tree” app beside the three methods.

5. **Excel with boxes** — If branches do not **add or multiply** to the parent, it is a picture, not a tree (`kpi-tree.md`). Selling it without that check is gimmick territory (Faultline’s own test: does it help someone say something to the sponsor they could not say before?).

6. **Daily ops home** — That is stage gate **Now** or the **line** as home (`docs/MAP.md`). Lever tree is **steering**, not shift-by-shift execution.

---

## 5. Three example scenarios (using the seed shape)

### A. “Line 2B to 60 ppm” (seeded exemplar)

- **Sponsor promise:** Line 2B **holds 60 ppm** this quarter.
- **Tree:** Outcome → **“Line 2B achieves its ppm rate”** bound to measure (readings 48 → 51 → 54 vs target 60 → box red) → **“The machine runs without stopping us”** bound to Plant board rows.
- **Work:** Replace sealing jaw (late), re-time infeed, night splice training done.
- **Story to the sponsor:** “We are **6 ppm short**; the **rate lever** is red; **give-away is not the headline** — plant work under ‘runs without stopping us’ is where the gap lives; here are the three actions.”

### B. Cost a pack programme (from knowledge worked case)

- **Sponsor promise:** Cost a pack **31p → 27.5p** by year end.
- **Tree (additive):** Labour, give-away, waste, energy, film — each lever with target/actual; **give-away** owns the remaining gap.
- **Work:** Weigher project, not crew training — tree **allocates** the gap so effort does not scatter.
- **Story:** “The outcome is 3.5p away; **1.6p is give-away**; that is the whole of the remaining gap — this month we steer the weigher lever.”

### C. Weekly output contract on a dual-line site

- **Sponsor promise:** **Output packs/week** across **2a + 2b** by a client date.
- **Tree:** Top outcome → branch per line → shared conditions for “All lines” work (project-level actions bound once, not triple-counted — `treeBind` all-lines rule).
- **Work:** Line Talk, shift losses, SMED on changeovers — **tools stay tools**; tree says **which condition** each finding serves.
- **Story:** “Client asks for the **number**; we show **both lines’ levers** and **one project-wide changeover condition** without duplicating the same four actions on every branch.”

---

## 6. Open questions for Rowland (15-minute walkthrough)

Answer these out loud; the next builder session should not guess.

1. **Unit of done:** Is “done” **the top number proved for the period**, or **every lever green**, or **outcome proved once** even if levers slip later?

2. **Sponsor rhythm:** Is **monthly** right on the floor, or do you actually steer **weekly** with the team and **monthly** only with finance — and should the app say that?

3. **Arithmetic bar:** Will you sell lever tree before **children sum to parent** and **gap allocation** are gate-proven, or is the tree allowed to be **qualitative RAG + bound headline number** for v1?

4. **Hybrid projects:** Do you ever want **6M + tree on one job**, or is that confusion — **always pick one kind** at New project?

5. **Problems register:** When a lever goes red, do you **raise a Problem**, only **board actions**, or **only the tree box** until the sponsor asks?

6. **Tracker paste:** Is the real-world source still **weekly Excel categories** (as `treeBind` assumes), or is the app board the only source now — and does paste remain a first-class workflow?

7. **One-page status:** For steering, do you need **Status report — 1 page** (outcome + off-track levers) **separate from A3**, mirroring stage gate’s one-pager?

8. **Depth limit:** How many levels are enough before a tree becomes **unreadable on a wall** — four levels as today, or stricter cap for sellability?

---

## 7. If we doubled down

### Minimal viable lever tree (stability, not novelty)

One written **path doc** (mirror `STAGEGATE-PATH.md`), an **acceptance script** on the seeded job (outcome → bind number → board action → reading → A3 vs standing), **honest phone navigation** (no false Programs/Timeline doors), and a **one-page sponsor summary** (outcome sentence, off-track conditions, line number, late actions). **No new tools** until the path is signed. Catalogue FC-213 stays “project kind only”. This makes lever tree **as trustworthy as stage gate’s path effort** without expanding scope.

### Ambitious lever tree (moat)

Full **KPI arithmetic** (additive/multiplicative checks, gap £ by branch, sensitivity “which lever moves the outcome most per unit effort”), **formula-gated A3 blocks**, **journey and one-number** on tree seeds, **tree-first overview** (outcome and reds above Verdict noise), optional **client read-only tree link**, and **integration story**: every manufacturing tool’s finding can be **tagged to a condition** so the sponsor sees *why* the weigher lever moved. Sellability: *“The only control room where the line’s money, the tracker, and the sponsor’s tree stay one honest sum.”*

---

## 8. Where this connects in the repo

| Topic | Location |
|---|---|
| Method definition (question, rhythm, done) | `src/lib/planModel.ts` |
| KPI / lever tree knowledge | `knowledge/methods/visual/kpi-tree.md` |
| Seeded job “Line 2B to 60 ppm” | `src/dev/seed.ts` |
| Bind and standing | `src/lib/treeBind.ts`, `src/lib/portfolio.ts` |
| Tree UI | `src/screens/LeverTree.tsx`, overview `TreeTopPanel` |
| Client A3 + tree page | `src/screens/PaceExecReport.tsx` |
| Technical review (29 Oct) | [`docs/reviews/LEVER-TREE-REVIEW-29-OCT.md`](reviews/LEVER-TREE-REVIEW-29-OCT.md) |
| Stage gate contrast | `docs/STAGEGATE-PATH.md` |
| 6M contrast | `docs/SIXM.md` |
| Product direction | `docs/DIRECTION.md` |

---

*Discovery author: cloud agent, 29 October 2026. Branch: `cursor/lever-tree-discovery-de14`. No product behaviour changed — memory for the next session when Rowland says go.*
