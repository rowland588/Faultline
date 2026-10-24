---
id: equipment.downtime-log
name: Stops timed at the machine — the downtime log and its Pareto
aka: [downtime log, stop log, stoppage record, downtime Pareto, loss log, stop reasons]
discipline: equipment
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — TPM loss recording practice (from knowledge); Faultline's log in `src/screens/CaptureScreen.tsx`, counted once per machine by `src/lib/intelligence/stops.ts`, the heat map in `src/lib/intelligence/heat.ts`; the worked week in `scripts/knowledge/cases-operations.py`
needs: []
next: [quality.pareto, rca.fishbone-5whys, equipment.chronic-sporadic]
alternatives: [maintenance.mtbf-failure-rate]
related: [equipment.time-model-losses, equipment.short-stops-speed, capacity.accumulation-buffer]
---
# Stops timed at the machine — the downtime log and its Pareto

## Purpose and principle
Every stop long enough to notice gets a line: which machine, what
reason, when it started, when it ended, who cleared it. Timed by a
person with a stopwatch on the phone — start, stop — not estimated at
the end of the shift. The log adds up by reason and by machine, ranks
them (the Pareto), prices them at the bottleneck, and feeds every other
reading: the time model, the chronic/sporadic verdict, the MTBF, the
buffer sums. It is the line's first and most useful record, and the one
most often filled in from memory.

## Questions it answers
- Where did the shift's stopped minutes go — which machine, which reason?
- Which two reasons are half of it?
- What did each cost — and which stops cost nothing because a buffer
  covered them?
- When in the shift do the stops cluster (the heat map)?

## Inputs and minimum conditions
- A stop timed as it happens: machine, reason (from the line's own list
  of reasons, with "other" written out), start and end by the watch,
  who; a photo where it helps.
- The reasons list agreed per line and kept stable so weeks add up
  (`quality.check-sheet`'s rule).
- The line's bottleneck and its rate and margin for the money
  (`capacity.line-capacity`, `knowledge/MONEY.md` §3).

## Procedure and calculation
- Minutes per stop = end − start; by reason and by machine summed;
  overlapping stops on one machine counted once (a jam inside a
  changeover is the changeover's time); stops on different machines at
  the same time are each theirs, but the *line's* lost time is the
  bottleneck's.
- Ranked (the Pareto, `quality.pareto`): share of minutes per reason,
  the cumulative line; the top two or three named.
- Count and mean length per reason — many short against few long are
  different problems (`equipment.short-stops-speed` for the ones too
  short to time).
- Money: a stop at the bottleneck = minutes × rate × margin a pack
  (`knowledge/MONEY.md`, T); a stop elsewhere = its labour to clear and
  nothing more unless the buffer ran out (`capacity.accumulation-buffer`),
  said as such.
- By hour of shift and day (the heat map, `src/lib/intelligence/heat.ts`):
  start-up, after breaks, the last hour — the pattern that names a
  cause.
- The verdict words: "N stops, M minutes; the top two are X% — reason A
  at the bagger (the bottleneck) cost £Y; reason B at the filler cost the
  line nothing, the accumulator held".

**Worked case** (`cases-operations.py`): a week — bagger jaw temperature
9 × 11 min = 99 (25%); filler hopper empty 22 × 4 = 88 (22%); bagger film
break 14 × 6 = 84 (21%); bagger changeover over-run 2 × 38 = 76 (19%);
case packer glue 6 × 9 = 54 (13%); total 401 min. The top two are 47%.
The bagger is the bottleneck: its 259 minutes are 31,000 packs not made;
the filler's 88 minutes of hopper stops cost the line only what the
accumulator failed to cover (its 4-minute stops are inside a 6.7-minute
cover — nothing); the case packer's glue stops block the bagger only
when its buffer fills.

## Assumptions, limits and misuse
- A log written up at the end of the shift is a story: "about 20
  minutes" is usually half the truth. The watch, as it happens.
- Reasons too broad ("mechanical", "operator") cannot be acted on;
  reasons that name the part and the symptom can.
- Overlaps double-counted inflate the total and hide the real ranking.
- Minutes at a non-bottleneck priced at the bottleneck's rate overstate
  the loss by the buffer's cover.
- Stops under a minute are not logged this way and are the hidden loss
  (`equipment.short-stops-speed`); the log and the count together are
  the whole.
- The log is a count, not a cause: the Pareto names where to look, the
  fishbone finds why.

## Reading the result
"401 minutes stopped this week: jaw temperature and hopper empty are
half. The bagger's 259 minutes cost 31,000 packs (£X); the filler's
hopper stops cost nothing — the accumulator held every one." Money: per
reason at the bottleneck (`knowledge/MONEY.md`, T), the labour to clear
elsewhere (L), and the buffered stops said as "no loss".

## When not to use it — and instead
Stops too short to time → `equipment.short-stops-speed`, the reliability
study's taps. The rate and pattern of events → `maintenance.mtbf-failure-rate`.
The shift's whole time model → `equipment.time-model-losses`. Whether a
loss is chronic → `equipment.chronic-sporadic`.

## In food and FMCG manufacturing
Every packing line's stop sheet, moved from the clipboard to the phone's
watch: film breaks, jaw temperature, hopper empty, label reel, glue,
checkweigher reject arm, metal detector trip, product not ready — and the
start-of-shift cluster the heat map shows.

## References
- [textbook] Nakajima, S., *Introduction to TPM*, 1988 — loss recording as the base of the six big losses (from knowledge).
- [standard] EN 415-11:2021 — the time states of a packaging line (scope confirmed online 22 Oct 2026; text not read).
- [design] `docs/CAPACITY.md` §5 — the shift's time model Faultline's log feeds.

## In Faultline
Built: stops timed on the phone (`src/screens/CaptureScreen.tsx`, FC-051),
counted once per machine (`src/lib/intelligence/stops.ts`, FC-052), the
heat map (`src/lib/intelligence/heat.ts`, FC-053), the Pareto and the
loss count's waterfall (`src/tools/losses`). Not yet: a stop at a
non-bottleneck read through its buffer's cover to say "no loss".
