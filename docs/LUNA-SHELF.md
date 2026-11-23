# Luna's shelf — how domain expertise is wired

Rowland, 23 November 2026: Luna should be a **true manufacturing colleague** for
UK food FMCG — statistical literacy, lean and industrial engineering, and UK
food law where it matters — without pretending she has read copyrighted books
or working figures in conversation.

## Where the knowledge lives

| Layer | Role | Path |
|---|---|---|
| **Method library** | One record per method: purpose, procedure, limits, food use, references, *In Faultline* | `knowledge/methods/<discipline>/<slug>.md` — id `<discipline>.<slug>` |
| **SOURCES** | The physical shelf: what Rowland owns, what was confirmed online, where each book lands | `knowledge/SOURCES.md` (§ *Rowland's manufacturing shelf, 23 November 2026*) |
| **GAPS** | What is not yet in records or not verified against a source | `knowledge/GAPS.md` |
| **OPEX loop** | How disciplines combine on a running line (the six moves, evidence grades) | `docs/OPEX.md` |
| **Money model** | How every finding is priced | `knowledge/MONEY.md` |
| **Foodsafety records** | HACCP, CCP checks, trace exercise, allergens, detectors | `knowledge/methods/foodsafety/*`; GB law overview: `foodsafety.gb-food-law-overview` |

Rowland's physical shelf is a **seed only** — the library grows from online
sources, public law, standards scope and waves in `knowledge/GAPS.md`, not from
stuffing books into the prompt. Full design: `/cursor/stores/bc-040509a1-bab0-4f84-95d4-90df412143f2/docs/LUNA-EXPERT-KNOWLEDGE.md` (coordinator plan).

## Two brains

**Analytical brain** — everything measurable on the person's factory: lines,
stops, studies, workbook rows, costs. Luna uses **capabilities** only
(`query_data`, `work_out`, `run_calculator`, tool reads, `figureCheck` in code).
She never invents a rate, Ppk, share or £. Tools, catalogue method ids and papers
are this brain.

**Methodology brain** — when to use a method, what it assumes, what it must not
claim, UK food and FMCG context, pointers to law and standards. It lives in
`knowledge/methods/*`, `knowledge/SOURCES.md`, `docs/OPEX.md`, `knowledge/MONEY.md`.
Luna loads it **on demand** (planned read capability **`method_knowledge`**, not
in this PR) — not from a growing `COLLEAGUE_SYSTEM` block. Evidence from the line
(`note_knowledge`, findings, brain homework) stays separate: standards never
overrule what the records show.

Until `method_knowledge` ships, a **minimal** theory pointer in
`colleagueAssist.ts` names discipline ids; the records themselves stay in the repo.

## What Luna may say vs what the app must work

| Question | Luna | App |
|---|---|---|
| "What does UK law expect on traceability?" | Plain English from `foodsafety.gb-food-law-overview`; link legislation.gov.uk and GOV.UK; not legal advice | No figure |
| "How does a c-chart work?" | Principle from `spc.control-charts-attribute`; when to use / not use | Capability studies and charts run in tools |
| "What's our Cpk on the filler?" | Read capability via capabilities; quote the tool's sentence | `run_analysis`, studies — formulas in `src/` |
| "Sign off this CCP at 72 °C" | Refuse to certify; say limits belong to the site's validated plan | CCP log only records what the person enters |
| "Recall this lot" | Explain Article 19 duty; open trace/hold tools | Records the person confirms |

**Hard rule (unchanged):** no AI in a figure. Principles and law in words; every
number from `query_data`, `work_out`, `run_calculator`, or a tool read.

## How Rowland's bookshelf connects

1. Photographs → inventory in `knowledge/SOURCES.md` (spine titles, theme groups, confirmed online vs on shelf not checked).
2. Each book row points at **method ids** already built or a **gap — record to add**.
3. New law or guidance (GB assimilated Reg 178/2002, 852/2004 Art 5, FSA *Managing food safety*) → full method record first, then Luna may cite it.
4. Gaps with no record stay in `knowledge/GAPS.md` until Rowland says go on a new record or tool.

## Open PR #14 — food domain instructions

**PR:** [rowland588/Faultline#14](https://github.com/rowland588/Faultline/pull/14) —
*Luna: food FMCG manufacturing domain expert (instructions v2 slice)* on branch
`cursor/luna-food-domain-expert-7432`.

| Piece | PR #14 | This shelf work |
|---|---|---|
| UK floor idiom, food-safety routing, no certification | `src/tools/colleague/colleagueDomain.ts` spliced into `COLLEAGUE_SYSTEM` | `THEORY AND UK FOOD LAW` block + `foodsafety.gb-food-law-overview` |
| Docs | `docs/LUNA-DOMAIN.md` | `docs/LUNA-SHELF.md` (this page), `knowledge/SOURCES.md` |

**Merge order:** land **this PR first** (library + law record + SOURCES + minimal
theory pointer). Then **rebase PR #14** onto `main` and resolve any overlap in
`colleagueAssist.ts` — keep PR #14's `colleagueDomain.ts` slice; drop duplicate
food-law wording if both added the same boundaries. If PR #14 merges first,
cherry-pick or rebase this branch so `gb-food-law-overview` and SOURCES stay.

## Agents — what to read before changing Luna's expertise

1. `AGENTS.md`, `knowledge/README.md`, `knowledge/SOURCES.md`, `knowledge/GAPS.md`
2. `docs/OPEX.md` (first section — the loop)
3. `src/tools/colleague/colleagueAssist.ts` — **COLLEAGUE_SYSTEM head only**; do not bloat prompts
4. After method changes: `node scripts/catalogue.mjs check` and `methods.test.ts`