# FC-241 — Stops across workstations: time each stop, say what it cost: the specification

**Catalogue:** FC-241 (a calculator of the shared shape; it sits beside FC-051, *Stops timed at the machine*, which times one machine's stops with a reason on a line, and feeds nothing into it) · **Knowledge:** `equipment.downtime-log` (the stopwatch log) and the throughput-accounting reading in `knowledge/MONEY.md` · **Asked for:** Rowland, 4 November 2026 — *"multiple workstations in front of me ... add a workstation and time every time that workstation stops ... I could have 30 ... press a stop time, it equates to something ... put some sort of metric next to it ... X amount of weight missed, or kilos per minute lost ... interchangeable ... units per minute ... done now, fast. Put it in calculators."* · **Status:** built 4 November, `partial` (limits in the entry)

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
