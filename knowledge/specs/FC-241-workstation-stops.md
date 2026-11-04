# FC-241 — Stops across workstations: time each stop, say what it cost: the specification

**Catalogue:** FC-241 (a calculator of the shared shape; it sits beside FC-051, *Stops timed at the machine*, which times one machine's stops with a reason on a line, and feeds nothing into it) · **Knowledge:** `equipment.downtime-log` (the stopwatch log) and the throughput-accounting reading in `knowledge/MONEY.md` · **Asked for:** Rowland, 4 November 2026 — *"multiple workstations in front of me ... add a workstation and time every time that workstation stops ... I could have 30 ... press a stop time, it equates to something ... put some sort of metric next to it ... X amount of weight missed, or kilos per minute lost ... interchangeable ... units per minute ... done now, fast. Put it in calculators."* · **Status:** built 4 November, `partial` (limits in the entry); part 2 (carrying the sample forward, with its confidence) 4 November

## 1. Purpose
A person standing in front of many workstations needs one page where each is a row, each stop is one press, and each minute stopped is worth something in the unit the floor counts in. The sentence it lets one side say to the other: **"3 of 4 workstations stopped for 35.75 minutes in all (6 stops), losing 429 kg at 12 kg every minute. Sealer lost the most — 264 kg, 61.5% of it."**

**Scope.** (1) Up to **30 workstations**, named or numbered ("Workstation 3"); (2) each workstation's **minutes stopped** — added by a **Stopped / Running again** timer on its own box (each press-pair adds the elapsed minutes and counts one stop) or typed; the number of stops is editable; (3) a **metric lost for every minute (or hour) stopped**, the **unit interchangeable** — kilos, units, packs, trays, cases or a word of the person's own — the same rate for all, or each workstation its own; (4) totals, the ranking of workstations by what was lost, the share of the watched time stopped (when the watched time is given); (5) money, optional: what one lost unit is worth, said "if it cannot be made up". **Not in this build:** reasons for stops (FC-051 and the Pareto have them), shared timing across devices, rating the workstations against a plate speed read from the line, slow running and short stops told apart (FC-056).

## 2. Users and scenarios
**Who:** a supervisor or engineer on the floor with a phone, watching a row of packers, weighers or stations. **Scenarios, food first.** (1) *Twelve hand-pack stations.* Each stop is pressed as it happens; at the end of the hour the page says which station lost the most kilos. (2) *Five weighers at 600 units an hour each.* The rate is typed per weigher, in units an hour. (3) *A one-off look at a line's three machines.* Typed minutes, no timer.

## 3. Method selection
The loss is minutes stopped × the rate of output while running ÷ the period, summed (the ordinary downtime-loss sum; throughput accounting for the money). **Established · assumed · chosen.**
- *Established:* lost output = stopped time × the output rate (time × rate, by definition); the share stopped = stopped minutes ÷ (watched minutes × workstations); the money is lost units × the value of a unit.
- *Assumed:* the rate typed is what the workstation would have made in that time; the stopped time was timed by the person, not read from a machine; a rate of nothing means nothing was lost.
- *Chosen:* units as the starting unit and "every minute" as the starting period (both said as choices on the page); a station that is not the constraint may catch up, so "lost" is a ceiling there and the money is said "if it cannot be made up"; the top five are named in the order lost; at most 30 workstations.

## 4. Inputs
How many workstations (1–30, required); what is lost (kg · units · packs · trays · cases · another); the rate given every minute or every hour; the same rate for all or each its own; the rate; per workstation: name (optional), minutes stopped (optional, timer), stops (optional), own rate (when each has one); watched-for minutes (optional); what one lost unit is worth (optional, money).

## 5. Data suitability
A workstation with no minutes has not stopped; stops with no minutes are said; minutes totalling more than every workstation could have been watched for are said. A rate is never invented.

## 6. Calculations
Per workstation: `lost = minutes × rate ÷ (60 if the rate is an hour's else 1)`. Total: the sum. Ranking: by `lost`, ties by minutes then by order. Share of the worst: `worst ÷ total`. Share stopped: `Σ minutes ÷ (watched × n)`. Money: `Σ lost × unit value`.
**Independent worked cases** (by hand, written before the code): (A) 8.5, 22 and 5.25 minutes at 12 kg a minute → 102 + 264 + 63 = **429 kg**; 264 ÷ 429 = **61.5%**; 35.75 ÷ (120 × 4) = **7.4%**; 429 × £2.10 = **£900.90**, the worst £554.40. (B) 15 minutes at 600 an hour and 6 minutes at 1,800 an hour → 15 × 600 ÷ 60 = 150, 6 × 1,800 ÷ 60 = 180 → **330 units**, the labeller 54.5%. (C) no minutes → nothing lost, said.

## 7. Outputs
The verdict ("429 kg lost"), the sentence, the ranking line, five tiles (Lost, Stopped, Stops, Worst, Stopped share), the working line by line, the caveats, the money or what is missing, the closing line.
**The report.** The shape's calculation paper from the same result: the band with the verdict, the tiles, *What it says*, the figures put in with their words, how it is worked out workstation by workstation (the first eight, the rest in the totals), the money or what to add, and what it does not claim — one module for page and paper.

## 8. Manufacturing usability
Phone first: the Stopped button is the width of the box and 44 px tall; a running timer shows m:ss and survives a reload (kept on this device). The workstations are a grid of small tiles (about seven to a row at a laptop, two on a phone), never one long list — Rowland, 4 November: "I put 22 workstations in, and you've literally just put it down on one linear list. I almost just need 22 stop and start buttons, very small"; the rate lost is asked in the unit's own words ("How many kg are lost in every minute a workstation is stopped") — "it hasn't asked me how many kilos are lost in a minute". One tile for exactly the number of workstations given. The unit changes the word, never the number.

## 9. Failure handling
Missing workstation count, rate (same-rate case), a workstation's own rate, a negative time, more than 30 — refused in words. No stops yet — said, with no loss. A timer is added only when Running again is pressed, its elapsed time shown while it runs; one left running overnight is the person's to correct by typing.

## 10. Integration
A `ToolStudy` of tool `calc` with `agreed.calc = { key: 'workstation-stops', inputs }`. On a line (Calculators row) and in a project, by the shape. Reports: the line report's calculators section and the project report take it by the shape. Access `useAccess`: `can.edit` types and times, `can.remove` deletes, a client reads (the Stopped button is absent). `docs/PAGES.md`: it is a calculator's page.

## 11. Verification
Unit: `src/tools/calc/__tests__/calc.test.ts` (table-driven over the definition's examples and refusals) and `src/tools/calc/__tests__/workstationStops.test.ts` (cases A–C, the hour period, the ranking ties, 30 workstations). Acceptance: `scripts/acceptance/workstation-stops.mjs` and `calc-shape.mjs`.

**Acceptance criteria.**
1. The totals, the worst workstation, the share stopped and the money of case A equal the hand-worked figures — *proved by* `workstationStops.test.ts` and the definition's example in `calc.test.ts`.
2. The hour period (case B) and the own-rate case equal the hand-worked figures — `workstationStops.test.ts`.
3. Nothing stopped says so and loses nothing; stops without minutes are said — `workstationStops.test.ts`, `workstation-stops.mjs`.
4. Case A typed through the real boxes gives the page's sentence, tiles and money — `workstation-stops.mjs` and `calc-shape.mjs`.
5. The timer: Stopped then Running again adds the elapsed minutes to that workstation and counts one stop, the next press-pair adds to it, a reload mid-stop keeps the running timer — `workstation-stops.mjs`.
6. Changing the unit kg → units changes the words and not the numbers; the hour period divides by 60 — `workstation-stops.mjs`.
7. Thirty workstations: thirty rows of boxes, the totals as worked — `workstation-stops.mjs`.
8. The paper, downloaded and read back, carries the sentence, the ranking and the working — `workstation-stops.mjs`.
9. The phone (390): nothing off the side, the Stopped button 44 px — `workstation-stops.mjs`.
10. Existing behaviour unchanged: the other calculators and their acceptance, the catalogue tests.
Not yet proved: the full gate and the paper-parity comparison.

## 12. Maintainability
One definition (`src/tools/calc/defs/workstation-stops.ts`) and one form extension (`Field.timer`, drawn by `CalcForm`). The unit words and the period are the definition's; the 30 is `MAX_STATIONS`.


### Part 2 — carrying the sample forward, and how sure that is
Rowland, 4 November: *"my sample size of time might be X, but I'll then want to be able to press, well, what's it like in 1 hour, 2 hours, 3 hours ... it populates the graph, but more importantly ... we need to use statistics here. Because if it's sample size, then we really don't know what the current observations are, and that needs to be key. The longer my sample size is taken, better. So I can go back to my analysis, allow me to rejoin it, and then continue the sample size getting bigger ... my extrapolation becomes more accurate ... graphical ... 2, 3, 4, 5 hours, 10 hours, 11 hours, a week even ... the confidence level of this information is X due to the sample size."*

**Scope.** (1) The **time watched** is the sample: *Watched for*, in minutes, typed or **timed with a Watch / Pause button** that adds the elapsed minutes to it — so a record can be reopened and watched again, the sample growing. (2) A **horizon** picked by chip — 1 · 2 · 3 · 4 · 5 · 8 · 10 · 11 · 12 · 24 hours, **A week** (asking the hours the line runs in a week, never assumed) or **Another** (hours typed). (3) What the sample says for that horizon: stops, minutes stopped and output lost, each the sample's figure × horizon ÷ time watched, with a **confidence range** and the confidence stated in words. (4) A **chart**: the output lost against hours, the sample's line, the range as dashed lines either side, the observed sample marked. (5) Confidence 90 · 95 · 99%, default 95% (a choice, said). (6) *How much longer to watch*: the stops and the extra minutes needed for the range to come within ±25%. **Not in this build:** the individual stop lengths' own scatter (only their total and count are kept — said), a rate that changes through the day (shift patterns), stops that cluster (over-dispersion).

**Established · assumed · chosen.**
- *Established:* if stops arrive at random at a steady average rate, the number seen in a watched window is a Poisson count; the exact (Garwood) two-sided interval for a count `n` is `[χ²(α/2; 2n)/2, χ²(1−α/2; 2n+2)/2]` (zero below when `n = 0`); a sum of independent Poisson counts is Poisson, so the total across the workstations has its own interval; the half-width of a Poisson count relative to itself is about `z/√n`, so about `(z/p)²` stops give ±p — the page uses the first count whose exact interval is that narrow, which is a few more (66, not 62, for ±25% at 95%). (The same bounds, one-sided, are `lib/ie/dist` `poissonLower`/`poissonUpper`.)
- *Assumed:* the stretch watched is typical of the stretch being carried forward (same product, same shift, same crew); the average stop length and the rate lost per minute are those observed/typed and are taken as known — so the range is the uncertainty in **how many stops there will be**, and it is **narrower than the whole truth** because the spread of stop lengths and of the rate is not in it (said on the page).
- *Chosen (and said):* 95% confidence; the words Firm / Fair / Rough for a range within ±25% / ±50% / wider of the count; ±25% as the precision asked for in "how much longer to watch"; the horizon chips; 8 hours (a shift) as the starting horizon.
- *Money:* the horizon's loss in money is the same sum × what one lost unit is worth, with the same range, "if it cannot be made up"; missing input named as before.

**Calculations.** `f = horizon minutes ÷ minutes watched`. Point: stops `N f`, minutes `M f`, loss `L f`. Range on the loss: `L f × lo/N … L f × hi/N` where `[lo, hi]` is the Garwood interval for the total stops `N`. Relative half-width `(hi − lo) / 2 / N`. Stops needed for ±25% (Firm): the first `n` whose exact interval has relative half-width ≤ 0.25 (48, 66, 111 at 90, 95, 99%; Fair, ±50%, 13, 18, 29); minutes of watching in all `= that ÷ (N / minutes watched)`; more = that − minutes watched. With no stop seen the count's upper bound alone is said ("fewer than 3.7 stops in the time watched at 95%") and no loss is carried forward; with stopped minutes but no stops counted the point figure is said and the range is refused with the reason.
**Independent worked cases** (`scripts/knowledge/cases-stops-extrapolation.py`, SciPy): four workstations watched 120 min, 6 stops, 35.75 min stopped at 12 kg a minute (429 kg in the sample): 8 hours → **1,716 kg**, range **629.7 to 3,735.0 kg** at 95% (Garwood 2.2019 to 13.0595 on 6); 1 hour → 214.5 kg, 78.7 to 466.9; relative half-width **±90.5%** → Rough; ±25% needs **66 stops** ≈ **1,320 minutes** watched in all, **1,200 more** (20 hours); at 90% the bounds are 2.6130 and 11.8424, at 99% 1.5369 and 15.6597; zero stops: upper 3.6889 (95%).

**The report.** The paper carries the same sentence, the confidence in words, the chart (the one description the screen and paper both draw), the horizon and the working lines.

**Acceptance criteria (part 2).**
11. The Garwood bounds, the carried-forward figures and the stops needed equal the SciPy cases above — *proved by* `workstationStops.test.ts` and `lib/ie/dist` tests.
12. A horizon chip changes the figures and the chart's last point; the confidence range is the module's; 90 · 95 · 99% change it — `workstation-stops.mjs` step 8.
13. A longer time watched narrows the range (60 → 240 min at the same rate): the Watch button adds the elapsed minutes and the record, reopened, keeps them and adds more — `workstation-stops.mjs` step 8.
14. *A week* asks the hours a week and refuses to guess; an always-present *Or type any number of hours* box takes any hours and wins over the button (2,000 is accepted) — `workstation-stops.mjs` step 8.
15. No stops seen says the upper bound only; stops with no count says why no range — `workstationStops.test.ts`.
16. The chart is drawn: the sample's line, the two dashed range lines, the observed dot; on the paper too — `workstation-stops.mjs` steps 8–9.
Not yet proved: the full gate.

**What confidence rests on (4 November — Rowland: "it always stays in Rough even when I put the time you have watched at 2000 min").** The range depends on **how many stops were counted**, not on how many minutes were watched: with the same 6 stops, watching 2,000 minutes instead of 120 only lowers the rate (the carried-forward figure falls), the range stays as wide in proportion. Firm needs about 66 stops at 95% (48 at 90%, 111 at 99%), Fair about 18 (13, 29). The page says so under Confidence and says how many stops and how much more watching would do it.
