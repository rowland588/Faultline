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
- FC-069 treats every changeover as the same length as the one timed (the guide says so).

## Operations, money, logs
- FC-172: the catalogue outputs "Pareto of fails" and "pass rate by site"; the page has neither. "Re-clean delay is priced" is not in the code.
- FC-171: the catalogue outputs "time to release; the trend"; the page has no time-to-release figure. A failed swab says "Held: … since the last good check", counted from that swab's previous pass (the previous changeover) — it overstates what is in doubt.
- The loss count's "What it cost" tile says to give crew, wage and margin "on the Factory’s Lines page"; those boxes are in the line's Set up the line sheet.
- The Factory-wide Check logs page (`/logs`) has no door on the Factory tabs; it is reached through a line's Logs tab.
- The catalogue calls FC-193 "the control room"; the page is titled "Factory" with a "Control room" eyebrow.

## Quality and calculators
- FC-125 "by money" can never appear in a faults study (`faultsFigures` sets no gbp; the Agree form asks "A pack’s materials" only for rejects and pass/fail) though the catalogue limit says it is priced.
- Impact and effort's New sheet labels its first box "What line is this for?" and then asks "Line"; the first box is the ranking's name.
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
- Attribute agreement's tabs are "Reference" and "Judgments"; the twelve questions sit under three headings whose bold labels differ from the plain lines.

## Lean and industrial engineering
- FC-001: on a new map the link to name the ends and the demand reads "Change what it is held against"; "Name the ends and the demand" never shows (a new map already has an agreed record).
- FC-016 is not a tool page: it is a way through a 6M project — no charter form, no 30-day check.
- FC-008: "Agree a takt here instead" appears only while there is no takt; once Line capacity has a target, takt cannot be agreed by hand.
- FC-020 and FC-027 sit behind "Agree these" (the Analysis question form), which is not obvious. FC-019: the laps list is on the first tab, not Times, so striking a lap means going back a tab.
- FC-006: the bottleneck mark is hand-set and apart from Line capacity's calculated bottleneck (the guide says so in its watch).
- The ILO sense of "job" appears in the pages' own wording ("the effort and care the job asks"; "How fast is a new job being learned?").
