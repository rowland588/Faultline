# FC-055 (reliability) — A line watch: every machine of a line on one clock: the specification

**Catalogue:** FC-055 (the reliability study, extended; also FC-058, FC-059) · **Knowledge:** `knowledge/methods/reliability/` (MTBF from watched running time) · **Asked for:** Rowland, 25 October 2026, urgent — *"line 2a I have 2 machines in the project but I can't pick them in any drop down. I need to pick them, and if I pick the entire line, the next screen I get all the assets. Then I set them up and I can run multiple asset analyses at the same time ... start one clock for the entire line and I can click through the UI on each individual asset."* · **Status:** built (the builder, 25 October — the owner asked for it now and not to be asked)

## 1. Purpose
Watch every machine of a line at once, on one clock, and open each machine's own figures — instead of making a study a machine and starting a watch at each. It lets the person at the line say to the team: "the whole line ran fifteen minutes and these are each machine's stops".

**Scope.** *Which machine* in New reliability study is a real drop-down: the line's machines and the project's own (`useMachinesOf` given the project, and `useProjectMachines` for a project on no line), *The whole line — all N machines*, and *Another machine — I'll type it*. The whole line opens a second screen — every machine ticked, what is counted at each and an MTBF wanted — and *Start the line watch* makes one reliability study a machine, all sharing `agreed.reliability.group`. Not in this slice: one combined paper for the whole line; adding a machine to a watch already started (make it from its own New); a tap on a machine other than the one open (a tap on a strip row opens that machine).

## 2. Users and scenarios
The ops lead or a technician at a line, on a phone or a laptop. Scenario: a project on Line 2a with two machines; they pick the whole line, set what is counted at each, start one clock, tap stops on the first machine, tap a row to go to the second, tap there, and stop the clock once.

## 3. Method selection
The method is the reliability study's own (MTBF = watched running time ÷ events), unchanged. A line watch only shares the stretches across studies.

**Established · assumed · chosen.**
- Established: MTBF = watched running time ÷ events and λ its inverse (`src/tools/reliability/reliability.ts`, FC-055); every machine of a line watch carries the same stretches, so every machine's watched time is the line's.
- Assumed: the people watching the line watch every ticked machine while the clock runs; a machine not being watched is unticked, or its study deleted out of the group.
- Chosen (the builder, 25 October — the owner asked not to be asked): the clock is the same stretch written on every study of the group at the same moment (no new record, no migration — the group id sits in the study's own `agreed`); one press starts or stops them all; a study with no group is unchanged; the default count at each machine is one *stop*.

## 4. Inputs
*Which machine* (a drop-down; required for one machine, not for the whole line); *What is it of?* (the name, optional for the whole line — it becomes "Line — every machine"); for each machine on the second screen: ticked (default yes), *Counting* (default "stop"; commas for more than one, six at most, a name once), *MTBF wanted, minutes* (optional, more than 0 and at most 100 000). The line and the project are read from where the study is made.

## 5. Data suitability
As the reliability study: the figures firm up with taps and watched time, and say how sure they are. A machine with no taps says none yet.

## 6. Calculations
None new. `lineWatch.ts`: `started`/`stopped` write and close a stretch; `groupOf` finds the studies of a group; `lineRows` reads each machine's counts, taps, running and verdict from `relAll` and `studyReliabilitySays`. Independent case: two machines watched 15 minutes, 2 and 1 stops → MTBF 7.5 and 15 minutes (`lineWatch.test.ts`, `reliability-line.mjs` §5).

## 7. Outputs
**The report.** Screen: the strip (`[data-line-watch]`) — a row a machine (*3 counted — 2 stops · 1 jam*, watching, its verdict, its tone on the edge) and the line in words (*2 machines on one clock — all watching*); the watch reads *Watching the line — 2 machines* and *Stop the line's watch*. Paper: each machine's own report is unchanged; the line watch has no paper of its own yet (said in Scope). Money: each machine's cost as FC-058 gives it.

## 8. Manufacturing usability
Big targets (a strip row 44 px or more, the checkboxes 22 px), the phone's one column, nothing off the side; a row opens the machine in one tap; the clock survives a reload because it is data.

## 9. Failure handling
None ticked is refused in words; a bad MTBF wanted is refused with the machine named; no machines known leaves the typed box; a deleted machine's study leaves the others watching.

## 10. Integration
Hangs off the reliability study (its record, its paper, its Belongs to and the list a row a machine). Shows on: New reliability study, the study page, the list, the line's page (the tool tile counts them), the project's Tools. `docs/PAGES.md` (*Reliability study — a line watch*), `scripts/inventory/pages.mjs`, the seed's line watch.

## 11. Verification
**Acceptance criteria.** The stopwatch is the reasons (26 October): a timed count's reasons are the buttons on the watch itself; one press is the stop — reason kept, its own timer running, the running clock paused until *Running again*; reasons are added one at a time with Add (set-up, and on the stopwatch itself at any moment — Add, or Add and stop), taken off with ×, twelve at most; a stop open does not stop them being added. `scripts/acceptance/reliability-line.mjs` (in the gate): 1 the project's two machines and the whole line are in the drop-down and one machine picked makes its own study; 2 the whole line's next screen lists every machine ticked, none ticked is refused, Back keeps the first screen; 3 Start makes one study a machine on one group with what was set up; 4 one press starts the same stretch on both machines at the same moment, a click through to the other whose clock already runs, one press stops both at the same moment; 5 each machine's MTBF is the watched time over its own taps; 6 the list has a row a machine and the phone fits. Unit: `src/tools/reliability/__tests__/lineWatch.test.ts`.

## 12. Maintainability
Pure code in `lineWatch.ts`; the screen in `ReliabilityScreen.tsx` (strip and watch) and `StudiesScreen.tsx` (New). Next: a combined paper; a tap on a strip row that taps rather than opens.
