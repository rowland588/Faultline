# Luna — agentic stack (LLM + loop + tools)

Rowland, 23 November 2026: guidance from another AI — *build an agentic system, not a chatbot: LLM for reasoning, agent loop,
tool use, memory, modular layers.* This page maps that mandate onto **what Faultline already is** and **what we still build**.
It is the canonical answer for any builder or external LLM briefing the project.

**Related:** `docs/LUNA-PRODUCT.md` (24 November — she acts; workspaces not projects; Artifacts), `docs/AI-MODE.md` (design), `docs/LUNA-AGENT.md` (ladder G1–G7), `docs/LUNA-ABILITIES.md` (what she can do per connection),
`docs/DIRECTION.md` (Claude only; no invented figures).

---

## 1. Generic requirement → Faultline today

| Agentic pattern | Generic spec | Faultline / Luna implementation |
|---|---|---|
| **LLM core** | Reasoning, planning, NLU via API or self-hosted | **Claude** through Supabase `assist`, task `colleague` only (`docs/DIRECTION.md`). Key server-side; allowance and audit on every ask. **Not** a second model for figures or tools. |
| **Agent loop** | Goal → steps → act → observe → repeat until done or human input | **`colleagueAsk`** (`src/colleague/colleagueAsk.ts`): gateway returns text + **tool calls**; client runs capabilities; results fed back as `pending`; up to **6 rounds/go**, **4 legs**, **10 min** per answer for jobs; **Stop**; **second look** (`figureCheck`, open job steps). **Jobs:** `plan_job`, `job_step`, app carries on without "carry on" (`docs/LUNA-AGENT.md` G1). |
| **Tool use / function calling** | Interact with data, reports, files, APIs | **`src/capabilities/`** — registry, JSON schemas mirrored in `schemas.ts` for the gateway, `runCall` (validate → allow → confirm → run). ~123 capabilities: workbook query, `query_data`, `build_report`, `make_report`, fills, live measure, production, visits, `method_knowledge`, etc. |
| **Observation** | See results of actions | Every capability returns **`says`** + **`refs`** (+ `show` for work pane). Reads are immediate; writes return after confirm. Figures checked against app working (`figureCheck`). |
| **Human input** | When stuck or consequential | Write **cards** (`confirmed`); job **batch** one yes (G5); scope **investigation** mode; **Stop**; budget/allowance refusal in words. |
| **Memory / state** | Multi-step work | Conversation + **threads**; **job** on subject; **notebook** / customer words; **standing** file headlines (G3); **reading** rules per customer workbook; **ai_actions** audit; browser sync to Supabase. |
| **Modular separation** | LLM · orchestration · tools | **Gateway** (model + schema) → **colleagueAsk loop** (orchestration) → **capabilities** (tools) → **`src/db` / tool modules / report engine** (same as Manual Mode). Connectors per app tool (`capabilities/connectors`, `intel/tools.ts`). |

**Verdict:** Faultline is **already** an agentic system over one operational app — not a pure chatbot. The product path is to
**extend capabilities and autonomy** (G6 overnight jobs are live; visible **Schedules**, **Artifacts**, and the **Workspaces**
rename are being built — `docs/LUNA-PRODUCT.md`), not replace the stack.

---

## 2. Layer diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Person — question, goal, voice, confirm cards, Stop        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  AI Mode UI — conversation, work pane, attach, voice        │
│  src/screens/AiModeScreen · src/colleague/                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ ask / stream
┌───────────────────────────▼─────────────────────────────────┐
│  ORCHESTRATION — colleagueAsk loop, jobs, figure check        │
│  src/colleague/colleagueAsk.ts · job.ts · jobWrites.ts        │
└───────────────────────────┬─────────────────────────────────┘
                            │ CapCall[]
┌───────────────────────────▼─────────────────────────────────┐
│  LLM — Claude (assist gateway, task colleague)                │
│  supabase/functions/assist · colleagueAssist COLLEAGUE_SYSTEM │
│  Tool schemas: src/capabilities/schemas.ts                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ never figures
┌───────────────────────────▼─────────────────────────────────┐
│  TOOLS — capabilities registry                                │
│  src/capabilities/* · runCall · connectors · workbook/query   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  APP — records, papers, sync (Manual Mode identical truth)    │
│  src/db · src/tools/* · src/lib/report/ · IndexedDB · Supabase│
└─────────────────────────────────────────────────────────────┘
```

**Hard rule:** the LLM **plans and explains**; the app **works every number and persisted change**.

---

## 3. Data sources, reports, files (your initial tools)

| Source | Agent tools today | Not yet / limits |
|---|---|---|
| **Spreadsheets** (`.xlsx`) | Read on device; `workbook_profile`, `query_workbook`, `work_look`, `workbook_pack`, `build_report` | No write-back to Excel; server worker for huge files (design in `WORKBOOKS.md`) |
| **CSV / TSV** | Partial — **A9** designed, not built (`docs/LUNA-ANALYSIS.md`) | Ship A9 as same query shape as workbook |
| **Database / app records** | `query_data`, `read_record`, fills, `list_problems`, production caps | A4: one query engine across all sources |
| **Reports / documents** | `make_report`, `build_report`, `write_document`, packs/slides | Meeting **patch on screen** M1–M3 (`LUNA-ABILITIES.md`) |
| **PDF manuals** | `find_in_document`, SOP from procedure | No arbitrary PDF edit |
| **External APIs** | Production connections (`PRODUCTION` caps), Microsoft file pick (X1) | No ERP write-back |

Adding a "tool" in the generic sense = **add a capability** (+ connector + schema + test), not a new chat feature.

---

## 4. What to build next (agentic maturity, in order)

Aligned with `docs/STATE.md` HANDOFF §6 and Rowland's "get it built and live":

| Order | Slice | Agentic meaning |
|---|---|---|
| 1 | **Stability** — `video-study` under load; daily full gate green | Tools must be trustworthy before more autonomy |
| 2 | **Proof** — job exam 14/14, pass³ on real model | Measure *jobs finished alone*, not chat quality |
| 3 | **P1 abilities UI** — `describe_connection` + attach blurb | Person sees which tools exist for this file |
| 4 | **G4 remainder** — A4, A7, A8, A9 | Broader data + analysis without new "tools" in the LLM |
| 5 | **Meeting M1–M3** — focus, point, `patch_report` | Act on what is on screen in a room |
| 6 | **G6** — server agent loop while app shut | True async agent; needs cloud copy of data she reads |
| 7 | **G7** — standing jobs / briefings | Proactive agent (rung 4) |
| 8 | **Engine** — effort routing, tool-search mode, instructions v2 A/B | Cheaper/faster loop without losing safety |

**Do not:** add a second LLM provider for reasoning; let the model calculate; bypass capability registry; build a parallel agent framework.

---

## 5. How to extend (modular checklist)

1. **Specification** — what the tool reads/writes; which record; figure source (`knowledge/STANDARD.md` if manufacturing tool).
2. **`Capability`** — `name`, `kind`, `validate`, `allowed`, `run`, optional `preview`; register in `registry.ts`.
3. **`schemas.ts`** — gateway tool definition (size limits in `capabilities.test.ts`).
4. **`connectors`** + **`intel/tools.ts`** — if it is an app tool (levels 1–4 operations).
5. **Colleague instructions** — when to use it (`colleagueAssist.ts`); `node scripts/sync-assist.mjs`; deploy assist.
6. **Acceptance** — Playwright story; gate line in `CLAUDE.md` if user-visible.
7. **`LUNA-ABILITIES.md`** — update connection matrix.

---

## 6. One paragraph for briefing another LLM

*Faultline's Luna is Claude behind an assist gateway, orchestrated by a client agent loop that executes typed capabilities against
the same database and tools as Manual Mode. The loop supports multi-round tool calling, jobs with plans, batched write approval,
figure checking, and voice. Spreadsheet analysis runs in the browser; reports are built in code. Extend by adding capabilities, not
by enlarging the prompt. Next maturity: prove long jobs on the real model, unify query over all sources (A4), server-side jobs (G6),
and proactive standing work (G7).*