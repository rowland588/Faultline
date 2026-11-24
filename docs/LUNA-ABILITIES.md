# Luna — what she can do with what she is connected to

Rowland, 23 November 2026: *when Luna is connected to data and information, what can she actually do with it? That becomes what
users experience — like ChatGPT or Claude giving an agent abilities. We have not established that well enough. If she is on an Excel
report, a PDF, an SOP — what are the limits? Can it be edited through conversation? In a meeting on a TV, pointing at something on
the report and saying it must change — she must change it immediately.*

**Read this with:** `docs/LUNA-PRODUCT.md` (24 November — she acts; workspaces; Artifacts), `docs/LUNA-AGENT.md` (the ladder and G1–G7), `docs/CONNECTED-LUNA.md` (what connects), `docs/AI-OPERATING.md`
(how she runs tools), `docs/WORKBOOKS.md` (Excel). **In code:** every approved ability is a **capability** in `src/capabilities/`;
what each manufacturing tool can and cannot do lives in `src/capabilities/intel/tools.ts` and is exposed as `tool_intel` and
`tool_guide`.

Nothing in this document is a build mandate until Rowland says go. It is the map that was missing.

---

## 1. The model — connection, ability, outcome

| Layer | What it is | Where it lives |
|---|---|---|
| **Connection** | Data or information linked to the customer in hand — a file, a document on a machine, a line’s records, a production feed, Microsoft 365 | `lib/data/sources`, attach control, Data connections, `lib/production` |
| **Ability** | One typed operation Luna may call — read, query, fill, measure, report, write on a card | `src/capabilities/registry.ts` (~123 capabilities) |
| **Outcome** | What the person gets — an answer, a record, a pack, a paper beside the conversation, a page opened in the work pane | Same records and PDFs as Manual Mode |

**The person does not “use a capability”.** They ask; Luna picks abilities. Like Claude or ChatGPT tool use, the **catalogue of
abilities is the product surface** — except every number in an outcome is still worked by Faultline’s code (`figureCheck`, query
engines), and every change to a record waits for a yes on a card unless a job or an authorised session says otherwise (`docs/AI-MODE.md`).

**Two brains stay apart** (`docs/LUNA-EXPERT-KNOWLEDGE.md` in the project store): figures from the app; method and law from
`method_knowledge` — never merged in one invented sentence.

---

## 2. By kind of connection — today, limits, next

### 2.1 Excel workbook (`.xlsx` / `.xlsm`)

**Connection:** Attach in AI Mode; read on the device (cells never sent to the model); file may sync to the person’s other devices
(`docs/WORKBOOKS.md`).

| Ability (capability) | What Luna can do with it |
|---|---|
| `workbook_profile` | Say what sheets, columns, types, errors, formulas without values, pivots not read, etc. |
| `query_workbook` | Ask filters, groups, measures, derive, top, having, joins — **every figure from rows** |
| `workbook_rows` | Show source rows and cell refs behind a finding |
| `work_look` / `read_workbook_as` | First look; correct how the site reads the file (headings row, column meaning, rows to leave out); **kept for that customer’s next read** |
| `workbook_pack` | Lay the look out as PDF/slides on the conversation (code only) |
| `query_data` / `build_report` | Ask results from the workbook in a living report; add/replace sections; refresh from data (`build_report`) |
| `dig` / `variance` / `change` | What moved between looks or periods |

**Cannot today:** Change cells in the Excel file; recalculate Excel formulas; edit a pack PDF pixel-by-pixel by pointing at a chart.
**Cannot ever (by design):** Send the workbook to the model; invent a total.

**Edit through conversation today:** Change **how the app reads** the file (`read_workbook_as`) and **what the conversational report
says** (`build_report` `replace` with new evidence). Not: “change cell M14 in the file.”

**Next (planned slices):** A4 one query engine over workbook + app tables; clearer “this column / this month” anchors in
`build_report`; meeting slice below (§4).

---

### 2.2 PDF or document **in the app** (manual, SOP, Line Talk, engineering report)

| Source | Connection | Abilities today | Edit through conversation |
|---|---|---|---|
| **Manual / spec PDF** on a machine | Document record; text read in app | `list_documents`, `find_in_document`, `list_procedures`, PM rules, `make_procedure_doc` (draft SOP or work instruction from manual steps — **manual’s words, pages quoted**) | **SOP/instruction:** draft via `make_procedure_doc` → person finishes on page → `make_record`. **Not:** rewrite arbitrary PDF layout live |
| **Line Talk / conversation document** | Built from talk | `write_document` (card) → record with page + PDF | New sections via another `write_document` or edit on Manual page; no “patch this paragraph on the PDF” yet |
| **Tool paper** (study, line report, project pack) | Real page + `?save=1` | `make_report` (record · project · line · package · area · story), `read_record`, `show_work` | **Regenerate** from records (new PDF under Saved copies); **not** conversational patch of an old PDF snapshot |
| **Workbook pack PDF** | On conversation | From `workbook_pack`; extend with `build_report` | Edit **sections and findings** in the conversational report; download again — not in-place PDF annotation |

**SOP / work instruction limit today:** Luna can **create** an SOP or task instruction from a named manual procedure (steps = manual
quotes + pages). She cannot **reword** steps freely or certify compliance. Changing an existing SOP is: open the document record
(`show_work`) and edit in Manual Mode, or describe changes and use `fill_draft` / `make_record` if wired to that doc kind.

**Next:** `update_document_section` (draft block → card → same writer Line Talk uses); link procedure docs to check logs.

---

### 2.3 Faultline’s own records (line, study, problem, project)

**Connection:** Already in the database; customer in hand enforced (`capabilities/hand`).

| Kind of work | Abilities | Level |
|---|---|---|
| Read state | `line_state`, `project_state`, `list_problems`, `read_record`, `fishbone_state`, … | 1 — automatic |
| Fill / capture | `start_study`, `add_readings`, `fill_register`, `capture_event`, … | 1–2 — card once or receipts in scope |
| Analyse | `run_analysis`, `query_data`, `pareto`, … | 1 — code |
| Report | `make_report`, connector `report` | 1 — opens real paper |
| Investigate | `plan_investigation`, `start_project`, scope capture without repeated cards | job + scope |

**Per-tool limits:** `tool_intel` and `tool_guide` list **level 3–4** operations (drag on board, film footage, verify a cause on the
floor, Weibull data entry) — Luna **opens the page** and `handover` says what the person must do; she does not pretend she did it.

**This is the most complete map** — but it is in code and colleague instructions, not yet a person-facing page.

---

### 2.4 Microsoft / SharePoint / production system (when connected)

| Connection | Today | Abilities when live |
|---|---|---|
| OneDrive / SharePoint file (X1) | Device read same as upload | Same workbook/manual path after pick |
| Scheduled folder (X5) | Design | `keepUp` notices + standing headlines (G2, G3) |
| Production API (`production` caps) | Where built | `query_data` over datasets; same customer guard |

---

## 3. Reports and presentations — three different things

Do not mix them; Luna’s instructions should name which kind:

| Kind | What it is | Luna makes it how | “Delete” |
|---|---|---|---|
| **App paper** | Tool/project/line PDF from records | `make_report` → page → engine | Manual: delete saved copy; Luna: no delete capability |
| **Conversational report** | Sections + charts on the thread (`build_report`) | Add/replace/refresh sections; `form: presentation` for slides | Remove section via `build_report`; versions on conversation |
| **Workbook pack** | First look as pack | `workbook_pack` then `build_report` | Same as conversational |

**Rowland’s “change the report in the meeting”** usually means **conversational report or pack** (sections backed by `query_data`
results), not mutating a frozen PDF. If the room is showing **line report paper**, today Luna must **regenerate** or open the record
and change data, then save again — not edit the PDF in place.

---

## 4. Meeting, TV, voice — “change what we’re looking at”

**Scenario:** Report on screen (TV or projector); person says *“We’ve just discovered the figure on the left is wrong — use October
not September.”*

**What exists today**

- **Voice** — same engine as AI Mode (`docs/VOICE.md`); `spoken: true` shorter answers.
- **Work pane** — `show_work` opens the real page beside the chat (`docs/AI-OPERATING.md`).
- **Present** — Story has `#/?present=1` full screen; not generalised to every report.
- **Corrections to data reading** — `read_workbook_as` / `read_workbook_as` on the source.
- **Corrections to narrative** — `build_report` `replace` with evidence ids; figures re-queried.

**What is missing (build slices — design before code)**

| Slice | What it adds |
|---|---|
| **M1 · Focus** | **Built 23 November** — `facts.sessionFocus` (report id + version) set when Present opens, cleared on exit; said in `focusText` |
| **M2 · Pointing** | **Built 23 November** — `resolve_report_section` (read) and `lib/data/reportPoint.ts`: speech maps to section id (headings, “the chart”, month names like October); sections listed in `focusText` when Present is on |
| **M3 · Patch** | **Built 23 November** — `patch_report` (local): focus + merged `query` → re-ask → replace section → chart version → report version; `sessionFocus` version updated; stored reading still `read_workbook_as` on a card |
| **M4 · Present mode** | **Built 23 November** — `#/ai/present?reportId=&c=` and **Put on screen** on the newest report or pack card: TV-sized fullscreen (large type, charts as drawn), voice unchanged (`spoken: true`, mic on the present surface, streaming); cast = HDMI / Chrome Cast / TV browser on that URL (`scripts/acceptance/luna-room.mjs`) |
| **M5 · Latency** | Optimistic UI: section marked “updating…” while query runs; voice line when done — target &lt;3 s for a section swap on phone |

**Acceptance (built):** `scripts/acceptance/luna-room.mjs` — report on Present, voice says use October not September; `patch_report` updates the chart; figure matches the workbook query; Present hash unchanged.

**Rowland’s full room vision** (TV, Excel, voice, “create the report”, report on screen) and **fast hellos**: `docs/LUNA-ROOM.md`.

---

## 5. How users discover abilities (the gap you named)

Today the abilities exist but are **scattered**:

| Audience | Where to look |
|---|---|
| **Builder** | `registry.ts`, `schemas.ts`, `intel/tools.ts`, `connectors/index.ts` |
| **Luna (model)** | `tool_guide`, `tool_intel`, `COLLEAGUE_SYSTEM`, capability schemas in assist |
| **Person** | *Not established* — no single “What Luna can do with this attachment” card |

**Product slices:**

1. **UI — Connected abilities** — **built 23 November (P1):** When a workbook, table import or machine manual attaches in AI Mode,
   a short *Luna can…* list from `lib/data/connectionAbilities` (the same table as §2, not marketing copy).
2. **UI — Tool page** — Mirror of `tool_intel` level 1–2 ops as “Luna can…” / “You still…” on each tool’s AI Mode help fold.
3. **Doc — This file** — kept truthful when capabilities change; gate line in `CLAUDE.md` when a new connection type ships.
4. **`describe_connection`** (read capability) — **built 23 November (P1):** Given `sourceId` or `kind`, return the §2 row for that
   connection (for Luna and for tests).

---

## 6. Build order (abilities map), after current G4/G5 measurement

| Priority | Slice | Delivers |
|---|---|---|
| P0 | Truth in docs | This file + HANDOFF pointer; assist not required |
| P1 | `describe_connection` + attach UI blurb | **Built 23 November** — person sees what Excel/PDF/manual allows |
| P2 | Meeting M1–M3 | Point-at-report corrections on conversational reports |
| P3 | Document section patch | Line Talk / method docs editable by speech with cards |
| P4 | Present mode for pack/report | TV + voice loop |
| P5 | Capability parity audit | Every Report ▾ outcome and PAGES.md action has capability or explicit handover (`docs/LUNA-AUTONOMOUS-CONTROL.md` Phase A) |

---

## 7. Rules that do not move

From `docs/DIRECTION.md` and `docs/LUNA-AGENT.md` §5:

- No figure from the model; no delete/remove except `archive_customer` on card.
- No marking evidence verified; no write-back to customer ERP without a new slice.
- More autonomy → more audit and customer guard, not fewer confirms on consequential writes.

---

## 8. Quick reference — Excel vs PDF vs in-app record

| You connected… | Ask / analyse | Pack or report | Change it in the room |
|---|---|---|---|
| **Excel** | Yes — query, look, dig | `workbook_pack`, `build_report` | Correct reading + replace section (M3 for instant) |
| **PDF manual** | `find_in_document` | SOP via `make_procedure_doc` | Handover to page; M3 for conversation docs later |
| **Line Talk PDF** | Read on page | Already a PDF | `build_report`-style section edit (planned) |
| **Study / line data** | `read_record`, tools | `make_report` | Change record via fill caps; regenerate paper |
| **Conversational report** | `query_data` behind sections | PDF/slides from card | **`build_report` today**; **M2–M3 for pointing** |

---

*Maintainer: when a capability or connection slice ships, update §2 and §8 in the same commit; add an acceptance line to `CLAUDE.md`
if behaviour is user-visible.*