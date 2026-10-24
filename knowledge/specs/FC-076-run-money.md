# FC-076 · FC-077 — money on the performance run and the climb to rate: what the shortfall is worth

**Catalogue:** FC-076 Performance run at the agreed rate and FC-077 The climb
to rate (the money part; the run's products, its judging, the climb's fit and
its sentence are built and unchanged). **Knowledge:**
`knowledge/methods/commissioning/acceptance-tests.md` (the run),
`knowledge/methods/commissioning/ramp-up.md` (the climb),
`knowledge/methods/cost/line-cost-model.md` (the one cost model),
`knowledge/MONEY.md` §2 causation **T** (lost contribution at the constraint)
and §4 FC-076, FC-077. **Asked for:** Rowland, 24 October — the rule for every
tool: the cost one of the outputs, by the industry's calculations, nothing
blocked. **Status:** specified and built 24 October.

## 1. Purpose
A performance run says how far a product fell short of the agreed rate — "net
rate 8 ppm short" — and the climb says when the line will reach the rate. The
business reads a shortfall in packs and pounds: a new line accepted 8 packs a
minute short is 8 × every minute it runs. So a product that did not pass on
its rate says what the shortfall is worth — the packs it left behind over the
run, and what a day of the line's shifts at that rate leaves behind — in
contribution; and the climb says what the runs below the rate have cost so
far. The sentence it lets the site say to the OEM: *"8 ppm short is 480 packs
an hour and £288 a day on this line — that is what we are waiting for."*

**Scope.** On a product of a performance run whose net rate is short of the
agreed rate: the packs short over the run (the shortfall × the minutes run)
and over a day of the line's shifts at that rate, each in contribution (price
− materials, else the margin a pack — the one rule, `tools/losses`
contributionOf), on the run's row (screen), the test's card and the client
report's run rows. On a climb: the packs below the agreed rate summed over
its measured runs, in contribution, under the climb's sentence on the screen,
the card and the client report. Left out: rejects over the allowance in money
(the capability study prices rejects by their fates, FC-094; a run's rejects
are a count with no fate); a passed product (a pass costs nothing to say);
labour (the crew is paid for the run whether or not it makes rate — the loss
is output, causation T, not L).

## 2. Users and scenarios
The site lead reading a run that didn't pass; the OEM and the site agreeing
what a shortfall is worth at acceptance; Rowland putting the climb's cost on
the one-page status. Food: a new bagger accepted at 52 against 60 a minute on
a 1.25 kg pack with 4p contribution.

## 3. Method selection
Throughput accounting (Goldratt): output not made is valued at contribution a
pack, never at a full cost. The run is the line's — a performance run proves
the line's rate, so every pack short is a pack the line did not make; no
bottleneck question arises (the agreed rate is the line's). A day is the
line's shifts less their breaks (`lib/lineLoss` lineDay), as the loss count
and the Reliability study say it.

**Established · assumed · chosen.**
- *Established:* packs short over the run = (agreed rate − net rate) × the
  minutes run; contribution = packs × contribution a pack (price − materials,
  else margin — `tools/losses` contributionOf). A day = the line's shifts
  less breaks (`lib/lineLoss` lineDay) × the shortfall a minute.
- *Established:* the climb's cost so far = Σ over its measured runs of
  max(0, agreed − net) × that run's minutes, × contribution a pack.
- *Assumption:* "a day at this rate" projects the run's net rate over a day —
  said as "at this rate", a projection, not a loss booked.
- *Chosen (24 October rule):* the contribution a pack is the line's (the test's
  machine's line, else the project's one line); missing, the margin is asked
  ("give the line a margin a pack (Set up the line)"), the packs still said.
- *Chosen:* said only on a product short on its rate and on a climb with
  packs below the rate; nothing on a pass.
- *Chosen:* one module, `lib/runMoney` (runWorth, climbWorth), read by the
  run panel, the card, the client report and the climb's line.

## 4. Inputs
Nothing new typed or stored. Read: the product's agreed rate, net rate and
minutes (`lib/run` readProduct); the climb's points, each with its run's
minutes (`lib/rampUp` ClimbPoint.minutes — added, read from the run's day);
the line's margin a pack (or price and materials) and shifts (`Workspace`);
the test's machine's line (`Asset.workspaceId`, else the project's one line
— `lib/lineRecords` lineOfMachine).

## 5. Data suitability
Said once a product is judged short on its rate (net and agreed known, so
the minutes are known); a climb says it once a point has minutes.

## 6. Calculations
Symbols: a agreed rate, v net rate, m minutes run, k contribution a pack,
D the line's day in minutes.
- Short a minute s = a − v (only when s > 0 and the rate check failed).
- Packs short over the run P = s × m; contribution C = P × k.
- A day at this rate: P_d = s × D; C_d = P_d × k.
- The climb: P_c = Σ max(0, a − v_i) × m_i over points with m_i; C_c = P_c × k.
- Missing k → P and P_d said, the margin asked; no shifts → the day part
  left out; no s > 0 → nothing.

**Independent cases** (`scripts/knowledge/independent-cases.py`, "what a
run's shortfall is worth"; `src/lib/__tests__/runMoney.test.ts`), the seeded
run — agreed 60 a minute for 60 min, 3,150 packs with 30 rejects (net 52),
the line 4p a pack with two shifts of 7.5 h:
1. 8 ppm short → 480 packs over the run, £19.20; a day (15 h) 7,200 packs,
   £288. "8 ppm short: 480 packs over the 60 min run — £19.20 contribution;
   at this rate a day of the line’s shifts (15 h) is 7,200 packs, £288."
2. No margin on the line → "8 ppm short: 480 packs over the 60 min run — give
   the line a margin a pack (Set up the line) to say it in money."
3. No shifts → the run's part alone.
4. A product that passed → nothing.
5. The climb: runs at 52 and 56 against 60, 60 min each → 720 packs below,
   £28.80; "The climb so far: 720 packs below the agreed 60 over 2 runs —
   £28.80 contribution." A climb already at the rate → nothing.

## 7. Outputs
The run panel: one line under a short product's figures (`.pr-worth`); the
climb's line gains the climb's cost under its sentence (`.cl-worth`). The
card: the worth under the product's gap; the climb's under its sentence. The
client report: the worth under a short row's "Short:" line; the climb's
after its sentence.

**The report.** `lib/clientReport` RunRow gains `worth`, climbs gain `worth`;
`lib/clientReportPdf` prints each where the row's gap and the climb's text
stand. `lib/trialCard` products gain `worth`, climbs `worth`; `lib/trialCardPdf`
prints them under the gap and the climb. Papers of runs that passed are as
before.

## 8. Manufacturing usability
Nothing to type; the words say the packs first, the pounds after, and where
the margin is given when missing.

## 9. Failure handling
No line found → the margin asked; a run with no minutes is never judged, so
never priced; a climb whose runs predate the minutes field says nothing.

## 10. Integration
Reads the test, its products, the climb, the asset, the lines. Writes
nothing. Shows: the run panel, the card, the client report. Replaces nothing.

## 11. Verification
Unit tests on the five cases; the acceptance drives the run on the seeded
project and reads the screen and the papers against the module.

**Acceptance criteria.** In `scripts/acceptance/stagegate-step1.mjs`, story 5:
1. The seeded run's product short on its rate says its worth on the run
   panel, equal to the module's — the margin asked while the line has none,
   then the packs and the pounds at 4p a pack without a reload.
2. The climb's line says the climb's cost so far, equal to the module's.
3. The test's card and the client report carry the product's worth and the
   climb's.
4. No console errors; the line put back.
Proved by: `node scripts/acceptance/stagegate-step1.mjs` (in the gate), `npx
vitest run src/lib/__tests__/runMoney.test.ts`.

## 12. Maintainability
One module; its contribution is `contributionOf`, its day `lineDay`, so the
run prices a pack as the loss count and the register do. The catalogue
entries FC-076 and FC-077 name this spec.
