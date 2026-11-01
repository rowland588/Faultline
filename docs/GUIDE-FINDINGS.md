# What the guide writers found on the pages (1 November 2026)

Writing "what each step means" from the real page (docs/METHODS.md §15) turned up places where the page's own wording, or the catalogue's claim about it, is not true or not clear to a first-time user. The guides describe the **app**, not the claim; each finding below is a page or an entry to fix. A line leaves this list when it is fixed (say how, in the commit). Kept in the repo because the writers' reports are not.

## Equipment, reliability, commissioning
- FC-071: the catalogue says "time to release"; the log keeps each result's time and does not time the changeover.
- FC-064: the ranking error says a machine "needs every dimension"; the code needs one consequence score and the likelihood.
- FC-073: the new-project picker names the method "Stage gate"; the older `planModel.ts` label is "Installation project".
- FC-074 / FC-080: the catalogue lists the Commissioning report, Handover report and cards; they were hidden from the menus until M4 (1 November) and are back for stage-gate projects.
- FC-080: a machine reads "Handed over" when its list is ticked even if it was never tested or a fix is open.
- FC-059: "Stopped now — timing it" is only an aria-label; the visible text is "Stopped — jam".
- FC-081: "Make it a fix ›" is on the evidence sheet, not the Problems page.
- FC-067: the closing line says "Half or more of maintenance is still reactive" whenever the planned share is under 80%; the catalogue promises MTTR and a paper by machine and month — the page has no MTTR tile and no paper.
- FC-071: every starter check is hard-coded "Line 7" whatever line the log is on.
- FC-081: the walk's own sheets say "Add evidence" and "New evidence", where the rest of the app says "problem".
- FC-058's guide names a call for help only in its set-up step; the calls panel itself (response and clearing, reasons ranked by minutes waited, by shift) is explained by FC-015's own guide (lean.ts).
- FC-069 treats every changeover as the same length as the one timed (the guide says so).

## Operations, money, logs
- FC-172: the catalogue outputs "Pareto of fails" and "pass rate by site"; the page has neither. "Re-clean delay is priced" is not in the code.
- FC-171: the catalogue outputs "time to release; the trend"; the page has no time-to-release figure. A failed swab says "Held: … since the last good check", counted from that swab's previous pass (the previous changeover) — it overstates what is in doubt.
- The loss count's "What it cost" tile says to give crew, wage and margin "on the Factory’s Lines page"; those boxes are in the line's Set up the line sheet.
- The Factory-wide Check logs page (`/logs`) has no door on the Factory tabs; it is reached through a line's Logs tab.
- The catalogue calls FC-193 "the control room"; the page is titled "Factory" with a "Control room" eyebrow.

- FC-190: "price less materials" applies only where a product's own price is typed; the loss count, bottleneck cost and SMED use the line's margin only. FC-205: the Read me sheet says Stages is "Empty" yet the code writes install steps into it. The spreadsheet's scope for a 6M project holds materials, programs, line standards and walk problems — not the board or numbers. FC-195 has no page in the catalogue (the guide places it on the project's front page, Needs you). FC-213 is partly built and the lever tree is a live Tree tab although CLAUDE.md calls it parked. FC-170 records no signal strength.

## Quality and calculators
- FC-125 "by money" can never appear in a faults study (`faultsFigures` sets no gbp; the Agree form asks "A pack’s materials" only for rejects and pass/fail) though the catalogue limit says it is priced.
- Impact and effort's New sheet labels its first box "What line is this for?" and then asks "Line"; the first box is the ranking's name.
- FC-146/147 words: CLAUDE.md says measured/counted/observed/reported; the page says Data/Counted/Seen/Told (the guides use the page's). The cause sheet's "+ Ask why again" and the fishbone panel's "Ask the next why" are two buttons for one act. The A3 method page has no Report ▾ of its own (the guide points to Reports in the project menu). FC-138 has no tollgate sign-off.
- FC-128's limit says "Complaints per million (FC-134) is not built"; FC-134 is available.
- FC-151 is not an A3 (a 6M project has the one-page status and the client report); FC-138 has no page (the 6M loop mapped to DMAIC; no tollgates).

## Capacity and flow
- FC-057 cost deployment: the Period box is free text but the sentence says "a week" and payback uses 4.33 weeks; the four process columns (bagger, filler, case packer, checkweigher) are fixed, which suits a bagging line only; the cell help says "pounds in the period".
- `recurrence.ts`: its header says "two weeks of three or more"; the code and test make chronic 4 of the last 6 weeks. The page says "chronic — 5 of the last 6 weeks" and never says what chronic means or what to do; it reads only the top six causes.
- "The Pareto, read" is only an aria-label (no visible heading); the Capture page is never headed "Stops timed"; the two Pareto pages use different windows and say "Category" where the floor says "reason".
- Raise an action / Make it so on the board appears only on a 6M project's line, not on standalone Line capacity.
- The stops-log list total adds every stop; the heat map and Pareto reading count overlaps once. The stops grid has no legend for "darker = more minutes"; a machine with no stops does not appear.
- "Walk the line" (FC-037) disappears silently with fewer than two stations. Short stops (FC-055): nothing tells a first-timer to time them to get minutes lost. Line capacity's "Planned running hours a week" explains itself only in a hint under the box.

## Statistics and measurement
- FC-092: the catalogue says pre-control is "safe only on a capable process (Cpk 1.33) … said on the page"; the page never says it.
- The chart's "The shift worth catching" box and the EWMA tick show on the Subgroups chart, but only the one-at-a-time chart draws a CUSUM or EWMA; the short-run (Z-MR) charts draw neither.
- The capability agreement shows "Packs a shift" and "Shifts a week" for a Faults study, but faults are priced nowhere.
- FC-101: the catalogue says rejects and rate studies are not in the over-time table; the code puts them in.
- FC-091 / FC-086 give no money on the chart though the spec says the chart should carry a give-away figure.
- The control chart's Subgroups tile reads like "6 of 4" (six subgroups of four) — explained in the FC-087 guide, but the tile itself is confusing. CUSUM: the catalogue says k = 0.5σ; the code uses K = half the shift typed with H = 5σ. Provisional limits: the page says "so they stop moving with every reading"; the code computes them from the first 20 readings only. The "Order" tile (readings that lean on the one before) appears only on Analysis → How sure → mean, not on the control chart. Not confirmed on screen: the counted modes' "Before capability" block may show "Said from 20 readings — N so far".
- Attribute agreement's tabs are "Reference" and "Judgments"; the twelve questions sit under three headings whose bold labels differ from the plain lines.

## Lean and industrial engineering
- FC-001: on a new map the link to name the ends and the demand reads "Change what it is held against"; "Name the ends and the demand" never shows (a new map already has an agreed record).
- FC-016 is not a tool page: it is a way through a 6M project — no charter form, no 30-day check.
- FC-008: "Agree a takt here instead" appears only while there is no takt; once Line capacity has a target, takt cannot be agreed by hand.
- FC-020 and FC-027 sit behind "Agree these" (the Analysis question form), which is not obvious. FC-019: the laps list is on the first tab, not Times, so striking a lap means going back a tab.
- FC-006: the bottleneck mark is hand-set and apart from Line capacity's calculated bottleneck (the guide says so in its watch).
- The line balance has two pace scales: the rating sheet offers 75/90/100/110/125, the Times tab 90/100/110/120 with a 50–150 box. "Agree an allowance" opens a form headed "Agree the takt" when the takt is not Line capacity's. The timer works one step after another but a machine's run goes on alongside the person; the page does not say to type it.
- The value stream map's money inputs (cost of a piece, carrying rate) sit inside the "Name the ends and the demand" form; nothing on the money cards links there and the link vanishes once demand is set. FC-008's catalogue says "planned cycle time"; the page has only takt. Andon's "Help should arrive within" is inside the collapsed "More about it" fold. "Make it better" on a work sampling study shows only when the study is on a project. The learning-curve money line shows £444; the acceptance notes say £443.84.
- FC-022 is Work sampling (not the bottleneck walk, which is FC-037, a mode of it). FC-016's limit "Run as a 6M project" is out of date: Kaizen event is a project method with its own five-section page.
- The ILO sense of "job" appears in the pages' own wording ("the effort and care the job asks"; "How fast is a new job being learned?").

## Methods (src/lib/methods.ts and docs/METHODS.md)
- The header comment of `methods.ts` ("Nothing reads this yet but its test") is out of date since M3.
- `docs/METHODS.md` §3–§10 still mark FC-143, 144, 128, 191 and 134 as NOT BUILT; the catalogue says Available.
- The A3 record has seven blocks (plan and follow-up separate); `methods.ts` merges them as "Plan and follow-up" — apparently deliberate, not stated.
- The 8D section names carry a double space ("D2  Describe the problem"); `guideOfSection` matches that exact string, so it breaks if either side is retyped.
- FC-142 (the charter) has no problem or goal statement yet — until the document shape's charter lands, the DMAIC Define and Kaizen Prepare guides say to put the charter in a note.

## Control room report on a very busy board (1 November)

Found by `report-stress` (cr-many) after the seed gained a project of every method: with about 19 jobs the control room report is two pages — its last step keeps every job's name and verdict and still spills. The stress case now holds the board to its old total (12 jobs), so the gate tests what it always did; a real factory past about 12–18 projects will see a two-page paper. A further step (a job a half-line, or the tiles above a two-column list) is its own piece of work and waits for Rowland's word.
