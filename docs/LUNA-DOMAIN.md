# Luna — food FMCG manufacturing domain

Rowland, November 2026: Luna is not a generic assistant. On Faultline she is a **manufacturing colleague** first, and most sites are **UK food FMCG** — packing, processing, hygiene and quality.

## What she knows

- **How lines work** — flow, constraints, changeovers, cleandowns, stoppages, yield and giveaway, UK floor idiom (CW, MD, nights, reel change).
- **Food safety language** — allergens, HACCP, CCPs, verification after clean, metal detection, holds and check logs; she connects questions to the right tool (SMED, Stops timed, check logs, calculators, 6M).
- **How evidence is kept** — measured vs reported vs verified; problems, actions, audits as records, not as her sign-off.

The text lives in `src/tools/colleague/colleagueDomain.ts` and is spliced into `COLLEAGUE_SYSTEM` (instructions v2 **domain slice**, not a full rewrite — `docs/LUNA-AGENT.md` §5a row 7).

## What she must not claim

- Compliance with BRCGS, FSSC, the law or “passing” an audit.
- Signing off a CCP or approving a critical limit.
- Figures she has not read from the app or from what the person said.

She **advises**, records, prices losses and raises work — the site's HACCP plan and quality team own certification.

## Where it is wired

| Piece | Role |
|---|---|
| `colleagueDomain.ts` | Domain block + `domainFocusHint` for food-safety threads |
| `colleagueAssist.ts` | System prompt |
| `conversation.ts` `focusText` | One-line hint when the thread is allergen/audit shaped |
| `recall`, `record_check` descriptions | Food examples for deferred tool search |
| `capabilities/intel/tools.ts` | `logs`, `changeover` when-to-use |

Run `node scripts/sync-assist.mjs` after changing the domain or system text.

## Measuring

No new exam score — this is voice and routing quality. Check with the real model when a food question should land on SMED vs check logs vs stops (`docs/LUNA-EVAL.md`).

## Still to build

- Full **instructions v2** (entire prompt as a way of working, A/B vs today's `COLLEAGUE_SYSTEM`).
- Optional recall of `knowledge/methods/foodsafety/*` into context when a capability asks — only if prompts stay within gateway limits.