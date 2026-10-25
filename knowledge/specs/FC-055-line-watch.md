# A line watch — every machine of a line on one clock (reliability)

Asked by Rowland, 25 October 2026, urgent: *"line 2a I have 2 machines in the project but I can't pick them in any
drop down. I need to pick them, and if I pick the entire line, the next screen I get all the assets. Then I set them
up and I can run multiple asset analyses at the same time ... start one clock for the entire line and I can click
through the UI on each individual asset."* An extension of the reliability study (FC-055, FC-058, FC-059), not a new tool.

**Scope.** *Which machine* in New reliability study is a real drop-down: the line's machines and the project's own
(`useMachinesOf` given the project, and `useProjectMachines` for a project on no line), *The whole line — all N
machines*, and *Another machine — I'll type it*. The whole line opens a second screen: every machine ticked, what is
counted at each (the floor's words, commas for more than one) and an MTBF wanted; *Start the line watch — N machines*
makes one reliability study a machine, all sharing `agreed.reliability.group`, opening on the first. Each study keeps
its own counts, taps, figures, paper and money. Not in this slice: one combined paper for the whole line; adding a
machine to a watch already started (make it from its own New, it is a study on its own); a tap on a machine other
than the one open (a tap on a row opens that machine).

**Established · assumed · chosen.**
- Established: MTBF = watched running time ÷ events, the failure rate its inverse (`reliability.ts`, unchanged). Every
  machine of a line watch carries the same stretches, so every machine's watched time is the line's.
- Chosen (the builder, 25 October — the owner asked for it now and not to be asked): the clock is the same stretch
  written on every study of the group at the same moment (no new record, no migration — the group id sits in the
  study's own `agreed`); one press starts or stops them all; a study on no group is unchanged. A machine's own page is
  where its buttons are tapped; the strip above the watch says every machine's taps and verdict, and a row opens it.
  Default count at each machine: one *stop*, changed on the screen before starting.
- Assumed: the people watching the line watch every ticked machine while the clock runs; a machine not being watched is
  unticked, or its study taken off the group by deleting it.

**The report.** The strip on screen (`[data-line-watch]`): a row a machine — what it has counted (*3 counted — 2 stops
· 1 jam*), whether it is watching, and its verdict as `studyReliabilitySays` says it, its tone on the edge; the line
said in words (*2 machines on one clock — all watching*). Each machine's own paper (`studiesPdf`) is unchanged.

**Acceptance criteria.** `scripts/acceptance/reliability-line.mjs` (in the gate): 1 the project's two machines and the
whole line are in the drop-down, one machine picked makes its own study; 2 the whole line's next screen lists every
machine ticked, none ticked refused, Back keeps the first screen; 3 Start makes one study a machine on one group with
what was set up; 4 one press starts the same stretch on both at the same moment, a click through to the other whose
clock already runs, one press stops both at the same moment; 5 each machine's MTBF is the watched time over its own
taps; 6 the list a row a machine, the phone fits. Unit: `src/tools/reliability/__tests__/lineWatch.test.ts`.
