# Faultline Loss Engine v3

**Catalogue:** platform core (not FC-nnn) · **Asked for:** Rowland, 27 November 2026 (GO) · **Status:** Phase 1 in build

## 1. Purpose

One deterministic heart for every minute of a shift: priced with the line’s own economics, grouped in the four families the business recognises (efficiency, productivity, cost, waste), reconciled so labour £ and contribution £ are never summed. Tools and Luna feed it; Luna never does the maths.

**Scope.** Phase 1 (manual): `runLossEngine`, line economics on the line, import → immediate loss report. Phase 1b: versioned economics sync. Phase 3: Luna fixed pipeline on production attach. Out of scope: live MES write-back, invented customer data, OEE as a lone KPI without the minute ledger.

## 2. Users and scenarios

- Ops lead on the line: set economics once, import last night’s shift file, read the immediate loss report on Performance (desk or phone).
- Consultant: same path in Manual Mode without Luna.
- Luna: run the pipeline on attach; narrate JSON only; validator refuses model figures.

## 3. Method selection

Rests on the TPM / ISO 22400 time model already in `tools/losses/losses.ts` and `docs/CAPACITY.md` §5–6. OEE in v3 is **effective minutes ÷ Σ** (good output at ideal rate over the chosen window Σ), not a sensor OEE.

**Established · assumed · chosen.**

- *Established:* labour and lost contribution are two figures (knowledge/MONEY.md rule 3; `lib/cost.ts`).
- *Assumed:* Σ is the shift window the person confirms on import (default from shift pattern).
- *Chosen:* money stored and worked as integer pence in code; display as GBP with two decimals.

## 4. Inputs

| Input | Source |
|---|---|
| Crew, wage, on-costs, margin a pack, scrap cost a reject | Line economics (Settings) |
| Ideal rate packs/min | Line economics or Line capacity bottleneck |
| Σ minutes, good packs, reject packs | Import mapping or manual entry |
| Minute ledger rows (family, minutes, reason) | Import or loss count (optional Phase 1) |

## 5. Data suitability

Enough to run: Σ, rate, good packs, economics for money. Missing inputs named; nothing invented (MONEY.md rule 5).

## 6. Calculations

- **Effective minutes** = good ÷ rate (three decimal places on minutes where the fixture requires).
- **OEE** = effective ÷ Σ (ratio, not percentage on screen unless labelled).
- **Idle labour £** = Σ ÷ 60 × crew × wage × burden (pence).
- **Contribution £** = max(0, expected packs − good) × margin a pack; expected = Σ × rate when Σ is the denominator for OEE.
- **Scrap £** = reject packs × scrap cost a reject when scrap cost is set.
- Ledger rows must sum to Σ when provided; reconcile stub in Phase 1.

### Independent case (§2.2 fixture)

See `src/lib/lossEngine/fixtureV32.ts` and `runLossEngine.test.ts` — Σ 480.000, OEE 0.6279375, idle labour £577.92, contribution £714.36, scrap £56.61 (labour and contribution never added in API or UI).

## 7. Outputs

JSON report: minute ledger waterfall, family subtotals, OEE, money block with labour, contribution, scrap separate, `missing[]` for unset economics fields. Immediate loss report screen (Phase 1b): status in words, tiles for Σ, OEE, idle labour, contribution and scrap never summed.

**The report.** Immediate loss report on the line’s Performance tab (`LinePerformancePanel`): headline in words, the five figures from `runLossEngine`, sentences that labour and contribution are kept apart. PDF export waits for a later slice; screen and module share `reportSays` / `formatPence` — no second arithmetic.

## 8. Manufacturing usability

Line → Settings → guided Line economics (status, save version). Line → Performance → Import file → confirm mapping → Run Loss Engine. One primary on confirm; 44 px targets on phone; missing economics named with a link to Settings.

## 9. Failure handling

Unmapped columns: mapping step refuses with named headers. Economics incomplete: run disabled; status in amber words. Import refused rows: alert before run. Luna: no run without economics version; validator on narrated numbers (Phase 3).

## 10. Integration

Reads `Workspace` economics fields and optional `lossEngineEconomics` jsonb stub; writes run result in memory on Performance (persistence of runs stub Phase 1b). Lives in `src/lib/lossEngine/`; UI in `src/line/performance/`, `src/ui/LineEconomicsGuide.tsx`. `docs/PAGES.md`, inventory, gate line in `CLAUDE.md`. No AI in figures.

## 11. Verification

Unit tests: `src/lib/lossEngine/__tests__/runLossEngine.test.ts` (§2.2). Acceptance: `scripts/acceptance/loss-engine-import.mjs` after UI slice (PR #91). Phase 3: capability guard tests.

**Acceptance criteria.**

1. `npx vitest run src/lib/lossEngine` — §2.2 fixture exact (proved in PR #90).
2. `scripts/acceptance/loss-engine-import.mjs` — Settings economics status, import, mapping, report figures (PR #91).
3. Catalogue spec headings and four standard parts — `catalogue.test.ts`.
4. Luna pipeline on attach with validator — Phase 3 (not yet proved).

## 12. Maintainability

Engine pure in `runLossEngine.ts`; money in `money.ts`; import in `importShiftCsv.ts`. Shares shift time families with `tools/losses/losses.ts`. Next: cloud sync for economics, Luna `mapDataset` pipeline without changing the JSON shape the validator checks.