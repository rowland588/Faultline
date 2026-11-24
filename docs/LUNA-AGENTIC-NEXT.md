# Luna — what is missing to be fully agentic

**Stale as a status board (24 November).** Written 22 November. **G5, G6 parked jobs, G2 remainder, G7, and G4 A4/A7–A9 have since
shipped** — read `docs/LUNA-AGENT.md` §4 and `docs/STATE.md` HANDOFF for what is live. Rows below that say “G6 not built”, “G5 not
built”, “A4/A7/A8/A9 missing” are history. The **product** next is `docs/LUNA-PRODUCT.md` (visible schedules, Artifacts, workspaces
not projects), not a rebuild of this checklist.

**22 November 2026.** Companion to `docs/LUNA-AGENT.md` (ladder, G1–G7, audit §5a, results §6), `docs/STATE.md` HANDOFF §6, `docs/LUNA-ANALYSIS.md`, and `docs/LUNA-EVAL.md`. Analysis only — no product decision here; nothing new is built until Rowland says go.

Rowland's path (CLAUDE.md): Luna linked to the business's data; the person asks; she finishes jobs alone. Intelligence is graded as an **agent** — jobs finished alone and (above that) work done without being asked — not questions answered.

---

## 1. Current grade — rung 2 with pieces of rung 3

**Headline grade:** rung **2 · Assistant**, with **pieces of rung 3 · Agent**. On Feng–McDonald–Zhang autonomy she is still a **collaborator** — the person hands over a goal but approves each write on a card and does not yet observe long jobs completing overnight.

**Evidence from code and one real-model measurement (22 November, `docs/LUNA-AGENT.md` §6, assist v62):**

| Public measure | What it means for Luna | Evidence today |
|---|---|---|
| METR time horizon | Longest job finished alone, in a person's minutes | **~1 minute** on the October missed-plan job (one message, 6 asks, 57 s, **12/14** marks) — first clean result; fixes shipped for the two misses; **14/14 not re-run** on live model |
| Autonomy (collaborator vs agent) | Who steers | **G1 built:** `plan_job` / `job_step` (`src/capabilities/job.ts`, `src/colleague/job.ts`); **`MAX_ROUNDS` 6**, **`MAX_LEGS` 4**, **`JOB_MS` 10 min** (`src/colleague/colleagueAsk.ts`); **Stop** on send (`src/screens/AiModeScreen.tsx`). Writes still **one card each** — no batch approve |
| pass^k | Same job right on k runs | Workbook **pass^3 ≈ 90%** on 21 November (`docs/LUNA-EVAL.md`); job and analysis suites **once each** only — **`--runs 3` not done** |

**Pieces of rung 3 (agent) already in production:**

- **Goal + plan + tick list:** `colleague/JobList`, instructions in `src/tools/colleague/colleagueAssist.ts`.
- **Multi-step without "carry on":** `colleagueAsk` legs with `carriedText` / `CARRY_ON`; last round of a go **runs** (22 November).
- **Self-check (partial):** second look (`colleagueAsk` `lookAgain`) when figures lack backing or plan steps stay open — **not exercised** on 22 November job run.
- **App-verified figures:** `colleague/figureCheck.ts`; report builder checks (`lib/data/outputs`).
- **Rich tool surface:** **~125** capability schemas (`src/capabilities/schemas.ts`), registry in `src/capabilities/registry.ts`, each run through permission + audit (`colleagueAsk` `doCall`).
- **G4 analysis in one question (slices A1–A3, A5–A6 live):** `lib/workbook/derive.ts`, `lib/workbook/parts.ts`, `lib/workbook/groups.ts`; real model **analysis exam 6/6** (22 November).
- **Knows before asked (G3):** `colleague/knows`, `colleague/picture`, `lib/workbook/standing` — `luna-knows.mjs`, `today.mjs` step 5.

**Still firmly rung 2:**

- **No virtual computer / no outside app** — she acts only through in-app capabilities (`docs/DIRECTION.md` rule 5).
- **No server-side job** while the browser is shut (G6 not built).
- **No proactive mouth** — keep-up is device + in-view (`colleague/keepUp`, `colleague/KeepUpNews`), not cloud schedule or push (G2 remainder).
- **Self-review** — app checks figures; Luna does not systematically re-read her own deliverable except the one second-look pass.

---

## 2. Fully agentic (rung 3) checklist

Comparison to what public benchmarks and autonomy frameworks expect of an **agent** (ChatGPT agent, METR long tasks, Feng levels 3–4 "consultant/approver"), mapped to Luna with **built / partial / missing** and code pointers.

### 2.1 Job completion (METR-style)

| Item | Target (public) | Luna | Status | Pointers / proof |
|---|---|---|---|---|
| Hand goal in one message | Person states outcome once | **Yes** — job instructions + `plan_job` | **Built** | `src/capabilities/job.ts`, `scripts/eval/luna-job.mjs` |
| Plan visible and updated | Agent maintains plan | **Yes** — `JobList`, `job_step` | **Built** | `src/colleague/job.ts`, `luna-job.mjs` |
| Many tool steps without person steering | 10+ steps unattended | **Up to 4×6 rounds, 10 min**; carry-on automatic | **Built** (bounded) | `colleagueAsk.ts` `MAX_LEGS`, `MAX_ROUNDS` |
| Finish with artefact + brief result | Deliverable exists | **Yes** — report + ≤160 words (fixed 22 Nov) | **Partial** — 12/14 once; closing length fixed, **re-score pending** | `docs/LUNA-AGENT.md` §6 |
| Longer jobs (multi-hour horizon) | METR doubling horizon | **Not measured** beyond ~1 min job | **Missing** | Need harder jobs + `--runs 3` |
| pass^k on jobs | k consecutive successes | **Once** | **Missing** | `luna-job.mjs --runs 3` |
| Jobs on app records (not only workbook) | Cross-source investigation | No dedicated exam | **Missing** | `luna-demo.mjs` / new exam |
| Stop without losing work | User abort | **Stop** keeps partial state | **Built** | `colleagueAsk.ts`, `AiModeScreen.tsx` |
| One approval for whole job | Approver not collaborator | Still **per-write cards** | **Missing (G5)** | No `plan_confirm` batch card yet |

### 2.2 Tool use and environment

| Item | Target | Luna | Status | Pointers |
|---|---|---|---|---|
| Broad tool library | APIs, browser, shell (ChatGPT agent) | **In-app capabilities only** — by design | **Built (scoped)** | `src/capabilities/` |
| Correct tool choice unprompted | Benchmark tasks | Workbook **10/10**; analysis **6/6** once | **Partial** | `scripts/eval/luna-real.mjs` |
| Efficient tool use (few rounds) | DSBench-style | `derive` / `build_report sections` cut steps | **Partial** | `docs/LUNA-ANALYSIS.md` §4; audit §5a row 5 |
| Tool search / smaller wake cost | Cost at deploy | `ASSIST_COLLEAGUE_TOOLS=search` **ready, not on** | **Missing (ops)** | `docs/LUNA-EVAL.md` §3 |
| Read full record text for reasoning | Agent reads state | `read_record` → **one sentence** (`readRecord` → `says`) | **Partial** | `src/capabilities/operate.ts` |
| Join and analyse all data sources | One question engine | Workbook **yes**; `query_data` **no lookups/derive on table yet** | **Partial (A4)** | `lib/data/table.ts` L136 refuses lookups |
| CSV as first-class table | Spreadsheet agent | Import paths only; **A9 half-designed** | **Missing** | `docs/STATE.md` §8, `docs/LUNA-ANALYSIS.md` A9 |
| Median / percentiles | Exact stats | Not in engine | **Missing (A7)** | `docs/LUNA-ANALYSIS.md` |
| Analysis from kept result | No hand-copy pairs | `run_analysis` no `resultId` | **Missing (A8)** | `operate.ts` AnalysisIn |
| Self-check answer | Agent verifies output | **Second look** once per answer | **Partial** | `colleagueAsk.ts`; not hit on 22 Nov job |

### 2.3 Autonomy levels (Feng — person as operator → observer)

| Level | Person's role | Luna |
|---|---|---|
| 1 Operator | Person drives every step | Manual Mode |
| 2 Collaborator | Person steers each leg | **Default today** — cards, steering, exam marks "finished alone" but writes need yes |
| 3 Consultant | Person consulted at decision points | **Approaching** — single-message jobs, honest gaps, one question only if whole job turns on it (instructions) |
| 4 Approver | Person approves plan once | **G5 not built** |
| 5 Observer | Person watches outcome | **G6–G7** |

### 2.4 Reliability (pass^k, τ-bench spirit)

| Suite | Role | Status |
|---|---|---|
| `luna-job.mjs` | Agent job end-state | **12/14 once**; machinery + played `luna-job.mjs` green after fixes |
| `luna-real.mjs --suite workbook` | Single-question honesty | **10/10** (22 Nov); pass^3 90% historically |
| `luna-real.mjs --suite analysis` | One-question analysis | **6/6 once** |
| `luna-demo.mjs` | Multi-scene investigation | **Not re-run** on v62 |
| `luna-real.mjs` bagger/packing | Operational scenarios | **Not on this version** |
| Second look, knows-without-step, voice, keep-up | New behaviours | **Listed in STATE §5** — not on real model |

---

## 3. Rung 4 preview — standing colleague (G2 remainder, G5–G7)

**Rung 4 · Standing colleague:** always on, linked to data, notices change, runs routine work, speaks first when it matters ("Jarvis"). **None of this is Luna's yet** (`docs/LUNA-AGENT.md` §2 — brain/today are code, not her voice).

| Build | What it requires | Depends on |
|---|---|---|
| **G2 remainder** | Cloud poll of linked files on a schedule; **push** to phone when something moved | Files readable server-side (`lib/fileLink`, Microsoft paths); design in `keepUp` / G6 |
| **G3 remainder** | Headlines for documents, line records, evidence tables — same pattern as `snapSays` | `lib/workbook/standing`, `findings` reads today |
| **G5** | **One card** approves all writes a job proposed | Job/plan metadata on conversation; audit still per action |
| **G6** | **Colleague loop on server** while app shut | Cloud copy of data she reads; durable job state; allowance/cost model |
| **G7** | **Standing jobs** — e.g. "every Monday, what moved" | G6 + scheduler + person-facing digest |

**Voice and job UI (recent work, 21–22 November):** voice interrupt no longer leaves ghost sentences (`docs/STATE.md` §voice, `voice.mjs` B3d); job plan visible on phone (`docs/LUNA-AGENT.md` G1). These improve **collaborator** experience; they do not by themselves move the METR horizon or rung 4.

---

## 4. Prioritised build order (after job/voice; aligned with STATE §6 and audit §5a)

Order follows **proof first**, then **depth of one question (G4)**, then **engine/instructions**, then **autonomy (G5–G7)**. Rows match `docs/STATE.md` HANDOFF §6 unless noted.

| Priority | Work | Why | §5a / slice |
|---|---|---|---|
| **P0** | Re-run **`luna-job.mjs` → 14/14**, ideally `--runs 3` | Defines whether rung-3 job claim is real after Check-this + closing fixes | Proof, not build |
| **P0** | Real-model **`--runs 3`** on workbook + analysis; **`luna-demo.mjs`**; switches in STATE §5 | pass^k and investigation — current grade is fragile | LUNA-EVAL §3–4 |
| **P1** | **A9** CSV/TSV as table + refresh semantics | Any factory export; completes "linked to data" | `docs/STATE.md` §8 |
| **P1** | **A4** one engine: lookups, `parts`, `derive` on `query_data` / `runTable` | Floor + file in **one** question (stops vs downtime) | LUNA-ANALYSIS A4 |
| **P2** | **A7** median/percentiles (exact or refuse) | "Typical stop" without misleading average | A7 |
| **P2** | **A8** `run_analysis` with `resultId` | Correlation without model arithmetic | A8 |
| **P2** | A5 remainder — weeks by end date when joining | Cross-period joins | A5 |
| **P3** | Effort **by turn kind** + richer **carry hand-over** + **budget told to model** | Audit rows 3, 4, 10 — needs API conversation effort + measurement | §5a 3–4, 10 |
| **P3** | **`read_record` / record text model** | Full record for reasoning and reports | §5a 9 |
| **P3** | **Instructions v2** A/B (`colleagueAssist.ts`) | Routing table → way of working | §5a 7 |
| **P3** | **`ASSIST_COLLEAGUE_TOOLS=search`** A/B | Wake cost before G6/G7 always-on | LUNA-EVAL §3 |
| **P4** | **G5** plan approval card | Collaborator → approver | G5 |
| **P5** | **G6** design then build — server jobs | App shut | G6 |
| **P5** | **G2 remainder** cloud keep-up + push | Requires G6 data path | G2 |
| **P6** | **G7** standing jobs | Rung 4 | G7 |

**Explicitly not on this list until Rowland says go:** new tools/pages as the product path (CLAUDE.md — Luna is the path, not new tools).

---

## 5. Proof plan — what shows each step is real

| Step | Scripted proof (gate) | Real-model proof | pass^k |
|---|---|---|---|
| G1 job machinery | `scripts/acceptance/luna-job.mjs` | `scripts/eval/luna-job.mjs` | `--runs 3` on same job |
| Second look | `luna-second-look.mjs` | Job/workbook where check fires | — |
| G2 keep-up | `keep-up.mjs`, `keepUp.test.ts` | Changed file unprompted (STATE §5) | — |
| G3 knows / picture | `luna-knows.mjs`, `today.mjs` | "What needs me today?" without step | — |
| G4 slices | `derive.test.ts`, `variance.test.ts`, `analysisExam.test.ts` | `--suite analysis`; join in **job** / demo | 3× analysis when allowance allows |
| Customer guard | `capabilities.test.ts` (hand) | Cross-customer refusal in demo | — |
| Voice / job UX | `voice.mjs`, short gate slice | Interrupt + job on phone (optional) | — |
| A4–A9 (when built) | New unit cases per `LUNA-ANALYSIS.md` §2 | Extend analysis suite or job exam | Per slice, 3 runs |
| G5 | New acceptance: one card, many writes | Job with N writes, one yes | — |
| G6–G7 | N/A until built | Overnight job exam; scheduled digest | Long-horizon METR-style log |

**Rules for believing a score:** read `assist_usage` (`ended`, `effort`) before trusting a script; allowance cut-off is **STOPPED — NOT A RESULT** (`docs/LUNA-EVAL.md`); figure marks use fair part-month and conversation context (`docs/LUNA-AGENT.md` §6).

**Gate slice after Luna doc or exam changes (from STATE §3):**

```bash
GATE_ONLY="luna-investigation conversational-data ai-mode luna-job luna-second-look luna-knows workbook today voice video-study" \
  scripts/gate.sh fast CHECKOUT PORT LIVE_CHECKOUT LIVE_PORT OUT
```

Doc-only change: fast gate optional; **no product code** in this commit.

---

## 6. One-sentence summary

Luna is a **strong collaborator with agent machinery live** (plan, multi-leg jobs, one-question analysis, standing context) and **one real job at ~1 minute mostly alone**, but **fully agentic rung 3** still needs **repeated pass^k proof**, **A4/A7–A9**, **full record reads and instructions v2**, then **G5–G7** for approver-and-standing-colleague behaviour — all measured by **`luna-job`**, **`luna-real`**, and **`luna-demo`**, not by question counts alone.