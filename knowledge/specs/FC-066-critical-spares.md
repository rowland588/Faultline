# FC-066 — Critical spares (a calculator)

**Catalogue:** FC-066 · **Knowledge:** `maintenance.spares-poisson` · **Programme:** W5 · **Status:** built October 2026.

## 1. Purpose
Turn a part's failure rate and lead time into how many to hold so a stock-out is rare enough: *"Hold 4 seal-jaw heaters — about 96 orders in 100 see no stock-out over a 3-week lead time; expected demand in that time is 1.8 parts."*

**Scope.** One calculator (`key: critical-spares`): MTBF per part (or equivalent failure rate), number installed, lead time, service level as a choice, optional stock held now for risk read-back, optional part cost and carrying rate for holding cost, optional downtime cost over the lead time for stock-out cost. **Not** here: wear-out scheduled replacement (FC-060 Weibull), fleet pooling across lines, repairable pipeline stock, the criticality ranking (FC-064).

## 2. Users and scenarios
Maintenance engineer or stores lead at a desk; spare justified before OEM handover.

## 3. Method selection
Poisson demand over the lead time: μ = λ·n·L with λ = 1/MTBF per hour; stock s = smallest integer with P(X ≤ s) ≥ service level (O'Connor & Kleyner; Silver, Pyke & Thomas for slow movers). Safety stock bell model (FC-183) is the alternative for steady demand — said in caveats.

**Established · assumed · chosen.**
*Established:* worked case `scripts/knowledge/cases-maintenance.py` — heater MTBF 1,100 h, 4 installed, lead 504 h, μ 1.83, stock 4 at 90–95%, 6 at 99%, P(0 demand) 0.160.
*Assumed:* random failure mode; λ from MTBF typed or from a reliability study on the page as a hint only (never read automatically).
*Chosen:* service level choices 90, 95, 97.5, 98, 99, 99.5% starting at **95%**; lead time in hours with days/weeks help in labels; money — holding H = stock × cost × rate, stock-out D from risk × typed downtime cost (`knowledge/MONEY.md` FC-066).

## 4. Inputs
Part name (text); MTBF (> 0, hours); installed count (integer ≥ 1); lead time (hours > 0); service level (choice); optional stock held now; optional part cost, carrying % a year, downtime cost over one lead time.

## 5. Data suitability
MTBF from few failures is uncertain (caveat); wear-out parts not Poisson (caveat); lead time is real delivery+fit, not contract days alone.

## 6. Calculations
`src/lib/ie/spares.ts` — demand, `poissonStockLevel`, `stockOutRisk`, `pNoDemand`; tests vs `cases-maintenance.py`.

## 7. Outputs
Verdict "Hold *n*"; sentence with μ and service; tiles stock, μ, service achieved, risk at stock held, holding £; working; money or missing; caveats; closing.

**The report.** FC-235 generic calculation paper.

## 8. Manufacturing usability
Four figures to an answer; MTBF from the reliability study is named as a sibling tool, not imported.

## 9. Failure handling
Blank required fields block; zero MTBF refused.

## 10. Integration
`ToolStudy` tool `calc`, key `critical-spares`; `/calc/critical-spares`; line Calculators row and report.

## 11. Verification
`spares.test.ts`; `calc.test.ts`; `scripts/acceptance/calc-shape.mjs`.

**Acceptance criteria.**
1. Heater worked case — stock 4 at 95%, μ 1.83 — `spares.test.ts`, calc examples.
2. 99% needs 6 — examples.
3. With zero held, risk named — examples.
4. Paper and phone — `calc-shape.mjs`.

## 12. Maintainability
Code: `src/lib/ie/spares.ts`, `src/tools/calc/defs/critical-spares.ts`. Left: offer MTBF from an open reliability study; FC-064 class sets default service level.
