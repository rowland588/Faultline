---
id: foodsafety.cleaning-verification-atp
name: Cleaning verification by ATP — swabs against the site's limits, the Pareto of fails
aka: [ATP swab, bioluminescence, cleaning verification, RLU, hygiene swab, pre-op check]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — ATP bioluminescence as the industry's rapid cleaning-verification method, read by a person on a luminometer against site-set pass/caution/fail limits (from knowledge; manufacturers' guidance — Hygiena, 3M — vary); the lognormal shape of RLU readings and the worked swab set in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [quality.pareto]
alternatives: []
related: [foodsafety.environmental-monitoring, foodsafety.allergen-changeover, maintenance.autonomous-maintenance]
---
# Cleaning verification by ATP — swabs against the site's limits, the Pareto of fails

## Purpose and principle
Was the clean good enough to start production? An ATP swab of a
product-contact surface read in a luminometer gives a number in seconds
— relative light units, proportional to the organic residue (food and
microbial ATP) left behind — against limits the site sets for each
surface (pass, caution, fail). It verifies the clean before the line
runs (the pre-op check) and, over weeks, shows which surfaces keep
failing and so where the cleaning method or the design is wrong. It is
not a microbiological test: it says "residue", not "pathogen"; the
environmental monitoring programme answers the other question.

## Questions it answers
- Is this surface clean enough to start — pass, caution or fail?
- What share of swabs pass, and is it improving?
- Which surfaces fail most (the Pareto) — the method or the design?
- Is a caution zone being used as a pass?

## Inputs and minimum conditions
- The swab sites per line (the product-contact surfaces, chosen for
  risk and for being hard to clean) with their limits in RLU (set from
  a baseline of swabs on surfaces known clean — e.g. pass under the
  baseline's 95th percentile, fail above 2× that; the luminometer's
  manufacturer's defaults as a start).
- A calibrated luminometer and in-date swabs; the person trained in the
  swabbing technique (area, pressure, pattern).
- The swab done after the clean and before production, with the result
  recorded as the number.

## Procedure and calculation
- Each swab: the site, the RLU, the band (pass under L₁; caution L₁ to
  L₂; fail at L₂ and above); a fail (and usually a caution) → re-clean
  and re-swab until pass before start-up; the re-clean recorded.
- Pass rate = passes ÷ swabs per period, by line and by site; the
  caution rate watched — a site always in caution is a method problem.
- The Pareto of fails by site (`quality.pareto`): the surface that
  fails most is the one to re-method (a different brush, more time, a
  dismantle) or to redesign (`foodsafety.hygienic-design`).
- The readings are lognormal (a few very high values); summarise by the
  median and the pass rate, chart on a log scale; the mean misleads.
- Trend by week (`stats.time-series-trend`); a falling pass rate after a
  chemical or crew change is the signal.
- Allergen changeovers: ATP is a proxy for residue, not an allergen
  test; where the validation showed ATP tracks the allergen's removal
  it may verify the clean, else a specific allergen swab
  (`foodsafety.allergen-changeover`).

**Worked case** (`cases-planning-foodsafety.py`): 120 pre-op swabs in a
month, limits pass < 150 RLU, caution 150–300, fail ≥ 300: pass 100
(83%), caution 17, fail 3 (2.5%); median 62 RLU. The fails by site: the
slicer's blade guard 5 of 12 swabs over the month (counting cautions) —
the guard is the Pareto's top and the hygienic-design question (a
hollow section that traps residue). Re-clean and re-swab each time;
re-method the guard.

## Assumptions, limits and misuse
- ATP is residue, not microbes: a pass does not mean pathogen-free;
  the environmental monitoring programme does that
  (`foodsafety.environmental-monitoring`).
- Limits copied from a manufacturer are a start; the site's baseline
  on known-clean surfaces sets them.
- Sanitiser residues and some materials quench or inflate the reading;
  the method accounts for them.
- Swabbing only the easy surfaces passes every time; the sites are
  chosen for risk and difficulty.
- A caution released as a pass under time pressure is the misuse; the
  rule is written and the release is recorded.
- The number is the record; a tick loses the trend and the Pareto.

## Reading the result
"Pre-op swabs this month: 83% pass, 3 fails — all re-cleaned before
start; the slicer blade guard failed or cautioned 5 of 12 times: the
guard is the problem, not the cleaners." Money: the re-clean's minutes
delaying start-up at the line's contribution a minute
(`knowledge/MONEY.md`, T) and the hygiene labour (L); the redesign's cost
against the weekly delay.

## When not to use it — and instead
Pathogen or indicator organisms → `foodsafety.environmental-monitoring`.
The allergen clean's validation → `foodsafety.allergen-changeover`. The
machine's cleanability → `foodsafety.hygienic-design`. The operators'
own clean-inspect routine → `maintenance.autonomous-maintenance`.

## In food and FMCG manufacturing
Every pre-op on ready-to-eat lines; slicers, depositors, conveyors,
hoppers, filling heads; the hygiene team's board and the technical
manager's monthly trend.

## References
- [practice] Luminometer manufacturers' guidance (Hygiena, 3M Clean-Trace, Neogen) on ATP limits and technique (from knowledge; no single public text).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 4.11 — housekeeping and hygiene: cleaning verification (from knowledge; clause not confirmed).
- [guide] Campden BRI guidance on cleaning validation and verification (from knowledge).

## In Faultline
Built (`FC-172`, `knowledge/specs/FC-172-cleaning-atp.md`) as a check log on
the shared shape (`src/tools/checks`, `defs/cleaning-atp.ts`): swab sites per
line, RLU typed at pre-op against limits set on each check, compliance, trends,
and failures by site. The register still takes hygiene problems (`src/snag`);
a fail here raises one on the register with the re-clean in its words.
