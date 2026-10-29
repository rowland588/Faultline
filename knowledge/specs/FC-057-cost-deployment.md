# FC-057 — Cost deployment (a calculator)

**Catalogue:** FC-057 · **Knowledge:** `equipment.cost-deployment` · **Programme:** W5 close · **Status:** built October 2026.

## 1. Purpose
Rank the line's losses in money so the next project is chosen by what it returns: *"Losses total £10,100 a week — chase breakdowns first; a 60% SMED win on changeover returns £1,140 a week."*

**Scope.** Calculator (`key: cost-deployment`): loss matrix in pounds by type and process, optional causal moves, Pareto, one project with recovery % and payback. **Not** auto-fill from shift losses, capability or the stop log; plant roll-up (FC-220); COPQ (FC-128).

## 2. Users and scenarios
CI lead or engineering manager at a desk; weekly loss review before picking the next project; food plant WCM programmes.

## 3. Method selection
WCM cost deployment (Yamashina & Kubo; `equipment.cost-deployment`). COPQ (FC-128) is the quality-side twin — different buckets.

**Established · assumed · chosen.**
*Established:* worked matrix `scripts/knowledge/cases-operations.py` — total £10,100; SMED 60% of £1,900 changeover → £1,140/week, ~5.7 months on £28k at 4.33 weeks/month (`src/lib/ie/costDeployment.ts`).
*Assumed:* each cell is already in pounds for the period.
*Chosen:* matrix typed until records feed cells; payback uses 4.33 weeks/month; money is what you typed (`knowledge/MONEY.md` FC-057).

## 4. Inputs
Optional period label; matrix cells (five loss types × four processes); optional causal move; optional project loss, recovery %, cost.

## 5. Data suitability
Empty matrix refused; causal move over the from-cell refused with words.

## 6. Calculations
Row/column sums; causal re-sum; Pareto; project weekly = loss total × recovery%; payback months = cost ÷ (weekly × 4.33).

## 7. Outputs
Verdict with top loss; sentence; tiles total, top loss, project return, payback; working Pareto; caveats; closing.

**The report.** FC-235 generic calculation paper.

## 8. Manufacturing usability
Grid of pounds — no minutes on this page; each loss keeps its causation when money is added later.

## 9. Failure handling
Empty matrix blocks save; partial causal move warned.

## 10. Integration
`ToolStudy` tool `calc`, key `cost-deployment`; `/calc/cost-deployment`; Calculators hub (FC-235).

## 11. Verification
`costDeployment.test.ts`; `calc.test.ts`; `scripts/acceptance/calc-shape.mjs`.

**Acceptance criteria.**
1. Worked case total £10,100 — `costDeployment.test.ts`.
2. SMED 60% → £1,140/week — `costDeployment.test.ts`.
3. Hub, tiles and paper — `calc-shape.mjs`.

## 12. Maintainability
Code: `src/lib/ie/costDeployment.ts`, `src/tools/calc/defs/cost-deployment.ts`. Left: fill cells from shift losses and SMED; plant roll-up FC-220.
