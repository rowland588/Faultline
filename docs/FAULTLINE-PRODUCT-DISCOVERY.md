# Faultline — product discovery (29 October 2026)

**For Rowland.** Strategic memo: what Faultline is becoming, what we built,
where it strains against Gemba, and what to decide next. **Not a build spec.**
Nothing here is built until you say go (`docs/DIRECTION.md`). **Do not**
rewrite DIRECTION in a builder session — this page sits beside it and points
to it.

**Read with:** [`docs/DIRECTION.md`](DIRECTION.md) (wins on disagreement),
[`docs/MAP.md`](MAP.md) (line is home), [`docs/BLUEPRINT.md`](BLUEPRINT.md)
(records and layers), [`docs/OPEX.md`](OPEX.md) (the shared improvement loop),
[`docs/STAGEGATE-PATH.md`](STAGEGATE-PATH.md), [`docs/SIXM.md`](SIXM.md),
[`docs/PROJECTS.md`](PROJECTS.md), [`docs/TOOLKIT.md`](TOOLKIT.md),
[`docs/LEAN40.md`](LEAN40.md), [`docs/STAGEGATE-ACTIONS-AND-6M.md`](STAGEGATE-ACTIONS-AND-6M.md),
[`docs/LEVER-TREE-FIT.md`](LEVER-TREE-FIT.md) (lever tree **parked** — no park
UI this session), [`docs/reviews/6M-REVIEW-29-OCT.md`](reviews/6M-REVIEW-29-OCT.md).

---

## 1. The Gemba principle (first)

**Gemba** — go to the real place, watch the real work, use what people
measure by hand. Rowland, 10 October: *"We will not have Internet of
anything. This is about manual inputs. This is about industrial engineering."*
That is not a limitation slide; it is the product stance (`docs/LEAN40.md`).

For Faultline, Gemba means:

| Principle | On the floor | In the app |
|---|---|---|
| **See first** | Walk the line; timed stops; filmed walk; snags on photos | Line home (`#/lines/:ws`); tools on the line without a project; walk and Pareto feed evidence |
| **Understand in numbers** | IE tools — capacity, balance, losses, capability — worked by formulas, not sensors | Each tool reads the line once (shifts, rate, crew, margin); findings in money |
| **Commit** | Who, what, by when, why — meeting discipline | Actions (`#/project/:id/actions`); register problems; stage-gate fixes |
| **Prove** | Before and after on the **same** measure | Re-test (stage gate); case measure + studies (6M); program criteria |
| **Show** | Client, OEM, sponsor — one story | Reports from records, never retyped |

**CI manager toolkit, not plant IT:** analysis that pitches, evidence you
walked, losses you quantified, actions you can show — the opposite of IoT OEE,
Redzone-style dashboards, or “AI builds your method” (deleted 20 October,
`docs/DIRECTION.md`).

**Tension to hold honestly:** full **installation management** (gates,
programs, OEM tests, handover packs) is **desk and calendar work** as much as
Gemba. It is still essential for Rowland’s business, but it is not the same
rhythm as “stand at the constraint with a stopwatch.” The product must not
pretend one screen serves both without naming which question you are answering.

---

## 2. Origin → today

### 2.1 Origin

Faultline began as **evidence on the line**: an editable snag on a photo with
points — “what we saw, where on the machine.” That grew into:

- **Filmed walk** and timed **line study** (stops, Pareto),
- **Separate RCA** for running lines → **6M** (fishbone as journey, 4 October),
- **Stage gate** from live line installation (commissioning → four gates,
  machine-by-machine proof),
- A **control room** above many changes: *am I in control?*

Rowland, 1 October — the moat sentence still quoted on the Verdict card:

> *"show the business a formal process, to show that I am in control of the
> project."*

### 2.2 The pivot (20 October)

The **method builder / AI platform** was stopped: manufacturing needs
**trustworthy calculation** and **drive to actions**, not generated methods
(`docs/DIRECTION.md`). What remains of AI: **voice** in form boxes, **Line
Talk** (Claude via `assist`, task `talk`), **Name the work from the frames**
on video — never the app’s driver.

### 2.3 Structure settled (21–28 October)

- **Project is the workspace** — one word; everything done inside lands in
  Actions (`docs/PROJECTS.md` P1–P4).
- **Line is home** — machines, programs, studies, problems live on the line;
  the Factory is the board of lines (`docs/MAP.md`).
- **Stage gate has a path** — eight steps, places, papers (`docs/STAGEGATE-PATH.md`).
- **Steady** — one reader, one number, code in places (`docs/STEADY.md`).
- **Tools + two methodologies** were the **start**; the catalogue and waves
  (`docs/TOOLS-BUILD.md`) are capability, not the product story by themselves.

### 2.4 Today (29 October)

| Layer | Built | Maturity |
|---|---|---|
| **Factory** | Board of lines, projects, tools library, Every action | Live; line-is-home gate |
| **Line** | Overview · Machines · Problems · Programs · Tools · Logs; combined line report | Live; tools feed 6M suggestions |
| **Stage gate project** | Now-centric path, machines, programs, criteria sign-off, Actions (P3) | Path doc + acceptance walks in flight |
| **6M project** | Fishbone, board, Results, portfolio on Factory, client report | Strong loop; review lists friction (Actions edit, two problem languages) |
| **Lever tree** | Tree UI, bind, A3 — **no path, no walk, KPI sums incomplete** | **Park decision** (`docs/LEVER-TREE-FIT.md`) — hide from New project when Rowland confirms; **no park UI in this discovery session** |
| **Tools** | Wave 1–6+ in catalogue; core IE set gated | Deep on capability, SMED, losses, reliability, analysis, checks — wide backlog |

---

## 3. What we built — stage gate, 6M, tools

### 3.1 Stage gate (`planModel: commissioning`)

**Question:** Is the equipment proved to what was agreed, so it can be accepted?

**Unit on the floor:** the **machine** (one record on its line).

**Journey:** Start project → machines on line → plan gates → run **Now** →
problem/fix/re-test → prove **programs** → **hand over** → papers
(`docs/STAGEGATE-PATH.md` §1).

**Differentiators vs generic PM:** programs and tests tied to **line
machines**, commissioning report/cards, proof criteria sign-off, machine page
as single home (`docs/MAP.md`).

**Gap Rowland named 29 Oct:** meeting **action tracker** feel — Actions
exists but is easy to miss; optional **6M depth** for hard commissioning
problems (`docs/STAGEGATE-ACTIONS-AND-6M.md` — design only).

### 3.2 6M (`planModel: board`)

**Question:** What is holding this line back, root cause, who is fixing it?

**Unit:** the **line’s performance** against target.

**Journey:** Gap → Pareto/constraint → **problem (fish head)** → six bones
→ five whys → **countermeasures** → proof on same number → **holding**
(`docs/SIXM.md`, `docs/OPEX.md` six moves).

**Differentiators:** fishbone **fills from tools** (stops, walk, standard,
balance, capacity); evidence grades; money on problems and countermeasures;
Factory shows phases and bones (`docs/reviews/6M-REVIEW-29-OCT.md`).

**Fit with Gemba:** strongest alignment — weekly rhythm, line tools, walk
evidence, quantify losses → actions.

### 3.3 Tools (the library on the line)

**Role:** instruments inside a change — never methods (`CLAUDE.md`).

**Line home:** `#/lines/:ws/tools` — start studies, line report from ticks,
quick use without a project; project opens same tools with `?project=`
(`docs/MAP.md`, `docs/PROJECTS.md` P2).

**Categories that matter for the product story:**

| Kind | Examples | Feeds |
|---|---|---|
| **See** | Filmed walk, video study, line study / Pareto, work sampling | Snags, stops, 6M suggestions |
| **Quantify** | Line capacity, line balance, shift losses, SMED, capability | Gap, money, fishbone, reports |
| **Prove** | Capability, reliability, control chart, program test | Criteria, before/after |
| **Talk** | Line Talk | Narrative, cards — never writes records |

**Catalogue:** 167+ planned; **deep not wide** — build when the floor asks
(`docs/DIRECTION.md`).

---

## 4. Tension — and reframe options

### 4.1 Core tensions

1. **Gemba vs installation office** — Stage gate is OEM meetings, Gantt,
   test matrices. Valuable, but not “only stand at the line.” Risk: Factory
   and project chrome overshadow line Tools.
2. **Three kinds of change vs one product sentence** — Rowland named three
   situations (30 Sep); lever tree is **third-class** in the build
   (`docs/LEVER-TREE-FIT.md`). Two strong stories (SG + 6M) plus tools may
   be the sellable core.
3. **Project workspace vs line home** — Everything inside a project is
   right for control; physical truth lives on the line. MAP fixes navigation;
   mental model still needs one **hero place**: the line for performance,
   the project for a **change in flight**.
4. **Tools catalogue vs product** — Waves prove engineering; buyers and site
   leads buy **“in control on my lines”**, not FC numbers.
5. **Moat vs commodity IE** — Minitab/SafetyCulture have tools; Faultline’s
   claim is **line-aware money + evidence → action → proof thread**
   (`docs/DIRECTION.md`).

### 4.2 Reframe options (strategic)

| # | Reframe | What it emphasises | Trade-off |
|---|---|---|---|
| **R1** | **Line-first CI manager** | Factory board + **line home** + tools + optional project lens | Stage gate becomes “project lens on line machines,” not equal front door |
| **R2** | **Two engines** | **Performance** (6M + tools) and **Installation** (stage gate) under one control room | Clearer marketing; still two rhythms to maintain |
| **R3** | **Evidence platform** | Walk, study, video, register — **everything rolls up to line report + Actions** | Methods become “how you package a change,” not the headline |
| **R4** | **Commissioning specialist** | Double down on SG + machine reports + criteria | Weakens 6M/Gemba story for “running line” clients |
| **R5** | **Toolkit SaaS** | Every tool excellent; projects optional | Loses control-room moat; catalogue never finishes |
| **R6** | **Park installation breadth** | Ship 6M + tools + Actions; SG minimal | Not viable for Rowland’s current work |

**Top three for this memo (recommended to discuss):**

1. **R1 Line-first CI manager** — matches MAP, Gemba, and “my line is my
   home page.”
2. **R2 Two engines** — honest about SG vs 6M without a weak third method.
3. **R3 Evidence platform** — names the origin (snag photo → line report) as
   the spine both methods plug into.

---

## 5. Proposed product identity

### One sentence

**Faultline is the CI manager’s line — see why performance is off with manual
IE, pitch the loss in money, walk the evidence, and drive actions to proof,
whether the change is a running line or new equipment.**

*(Alternative tighter:* **The control room for manual improvement on
production lines — Gemba evidence, trustworthy numbers, actions, proof.**)*

### Pillars

1. **Gemba evidence** — walk, photo snags, timed stops, video; named people;
   no sensor fiction.
2. **The line knows itself** — rate, shifts, crew, margin once; every tool
   speaks money.
3. **Understand** — capacity, constraint, losses, capability — formulas
   Rowland can defend in a client room.
4. **Commit** — one Actions story per project; register; who/when/why; control
   room across lines.
5. **Prove & show** — before/after on the same number; papers per reader
   (OEM, client, sponsor).

**Line Talk** sits as **optional voice** on pillar 1–5 — colleague on the
line, not the driver (`docs/LINE-TALK.md`).

---

## 6. Project systems — keep, reframe, merge, park

| System | Keep | Reframe | Merge | Park |
|---|---|---|---|---|
| **Stage gate** | Eight-step path, machine page, programs/criteria, commissioning papers | “Installation engine”; Actions more visible; sibling link to 6M on same line | Share **register**, **Actions reader**, **line tools** — not `planModel` | — |
| **6M** | Fishbone journey, board, proof/hold, tool-fed suggestions | “Performance engine”; optional `6M-PATH.md` like stage gate | **Lightweight RCA mode** for SG *via sibling project*, not fish on SG rail (`STAGEGATE-ACTIONS-AND-6M.md`) | — |
| **Lever tree** | Code + seeds for re-entry | Outcome-down sponsor story (when validated) | **Fold candidate:** outcome + date on 6M only (`LEVER-TREE-FIT` option C) | **Default: park** — off New project; no half-visible third method |
| **Actions (P3/P4)** | Single meeting list, late one number | Stage gate: “tracker home”; 6M: countermeasures + checks | Fixes + countermeasures + plan rows — one reader | — |
| **Register (Problems)** | One factory list, journey on snag | When to open **Case** vs stay on snag | Link snag → case on 6M project | — |
| **Method builder (`flow`)** | — | — | — | **Deleted** (20 Oct) |

---

## 7. The actual product — Factory, line, home

What a site lead **lives in** if R1+R3 win:

```
FACTORY (#/room)
  Board: each line — worst problem, projects, colour
  Projects · Set up · Tools library · Every action

LINE (#/lines/:ws)  ← home for Gemba
  Overview — state in one glance (machines, open problems, programs)
  Tools — start capability, losses, SMED, walk, Line Talk…
  Problems · Programs · Machines (one page each) · Logs (Stops timed…)
  Report ▾ — line bundle, machines, problems

PROJECT (when a change is chartered)
  Stage gate: Now … Machines … Actions …  (installation lens)
  6M: Fishbone … Board … Actions …       (performance lens)
  Everything done inside → Actions; line pages stay source of truth
```

**Factory line Tools** (`#/lines/:ws/tools`): the **quick CI bench** — no
project required; tick tools for **line report**; start studies on named
machines; the door Rowland uses for “go to the line and run analysis.”

**Not the product centre:** the full tools catalogue as infinite breadth;
lever tree canvas; AI method design.

---

## 8. Moat vs OEE / plant software

| | **Faultline** | **Typical OEE / IoT / Redzone** |
|---|---|---|
| **Data** | People count, time, tap, film | Sensors, PLC, automatic stops |
| **Honesty** | Admits manual limits; no fake availability | OEE looks precise; often garbage without integration |
| **Unit of work** | Change on a line (project) + line forever | Line or machine asset |
| **Method** | Stage gate + 6M + IE tools | Dashboards + tickets |
| **Money** | From line economics once | Often bolt-on or absent |
| **Evidence → action** | Walk/snag → problem → fix/countermeasure → proof | Alert → task; weak RCA |
| **Commissioning** | Machine gates, programs, criteria, OEM papers | Usually elsewhere (PM tools) |
| **Moat sentence** | Line knows itself; formal control story | Real-time visibility |

**Say to a client:** we are **industrial engineering on a phone**, not
replacement OEE. If they need sensor truth, that is a different product;
Faultline wins on **walk the line, quantify, agree actions, prove on the
number you already trust.**

---

## 9. Build slices (doc-first)

Order respects DIRECTION: **nothing new until Rowland says go**; documents
and path before code.

| Slice | Doc / deliverable | Purpose |
|---|---|---|
| **PD-0** | **This file** + cross-links | Agree identity and decisions |
| **PD-1** | Refresh **PAGES.md** / inventory for “Actions visible” on SG | Tracker discoverability |
| **PD-2** | **`docs/6M-PATH.md`** (optional go) | Parity with STAGEGATE-PATH |
| **PD-3** | **`STAGEGATE-ACTIONS-AND-6M.md`** → signed subset | Lightweight vs deep RCA on SG |
| **PD-4** | **Lever tree park** spec (picker only — **after** Rowland confirms; no UI this session) | Stability |
| **PD-5** | **Line Overview + date range** (`MAP.md` left for later) | “What happened on 2a this week?” |
| **PD-6** | 6M-R1/R2 from review (Actions loop, project-scoped tool doors) | “Drive to actions” |
| **PD-7** | Product copy pass: front door + Factory card = **line-first** one-liner | Marketing aligned to R1 |

Each slice: doc change in same commit as behaviour when behaviour moves;
gate only what the slice touches.

---

## 10. Decisions for Rowland (8–10)

Answer in plain words; the builder updates DIRECTION, paths, or picker only
after **go**.

1. **Product one-liner** — CI manager line (§5) or commission-first? Which
   sentence do you say in a client room?
2. **Hero home** — Line only, or Factory board equal? (MAP says line; confirm
   for marketing.)
3. **Two engines** — Explicitly brand **Performance (6M)** vs **Installation
   (stage gate)** under one control room?
4. **Lever tree** — Confirm **park** (off New project, code dormant) until
   sponsor-tree work justifies L0–L3? *(Park UI not built in discovery session.)*
5. **Stage gate + 6M on hard problems** — Sibling 6M project link from SG,
   or lightweight journey only on register (`STAGEGATE-ACTIONS-AND-6M.md`)?
6. **Actions** — Is `#/project/:id/actions` the mandatory meeting home for
   SG (tab/rail prominence)?
7. **Gemba vs desk** — Accept that SG is partly desk/OEM; cap SG surface area
   until line + 6M are flawless?
8. **Moat for sell** — Lead with **line knows itself + commissioning**, or
   **6M + losses/tools** for running lines?
9. **Catalogue** — Continue waves in background, or freeze until product
   identity session ends?
10. **Line Overview date range** — Priority vs stage-gate aesthetic lock?

---

## 11. What this does not do

- Does **not** change `docs/DIRECTION.md`.
- Does **not** implement lever-tree park UI or remove tree from picker.
- Does **not** merge stage gate and 6M `planModel`.
- Does **not** replace STAGEGATE-PATH, SIXM.md, or MAP.

**Next after Rowland’s answers:** update the winning reframes in BLUEPRINT §0,
pick PD slices, merge to `main`, then build only what was agreed.

---

*29 October 2026 — product discovery mission. Lever tree park confirmed in
principle; UI deferred.*
