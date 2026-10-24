---
id: equipment.short-stops-speed
name: Short stops and speed loss — counted and timed at the machine
aka: [minor stoppages, speed loss, reduced speed, idling, chokotei, the two hidden losses, micro-stops]
discipline: equipment
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Nakajima's minor stoppages and reduced-speed losses (1988) and the way Faultline tells them apart by a timed running speed (`docs/CAPACITY.md` §5–6; `src/tools/losses`); the worked shift computed in `scripts/knowledge/cases-operations.py`
needs: [equipment.time-model-losses]
next: [maintenance.mtbf-failure-rate, rca.fishbone-5whys]
alternatives: []
related: [maintenance.mtbf-failure-rate, capacity.accumulation-buffer, maintenance.autonomous-maintenance]
---
# Short stops and speed loss — counted and timed at the machine

## Purpose and principle
After the timed stops are taken out of a shift, the packs still fall
short of what the running minutes at the ideal speed would make. Two
losses hide in that gap and nobody logs either: the machine running
slower than its ideal (speed loss), and the stops too short to time —
a jam cleared in twenty seconds, a photo-eye reset, a pack straightened
(short stops). TPM calls them the hidden losses because they never
appear in a downtime log, and on a packing line they are usually larger
than the breakdowns. Faultline tells them apart with one measurement:
the running speed timed while the machine is actually running.

## Questions it answers
- Of the speed loss, how much is slow running and how much is short
  stops?
- How often do the short stops come (an hour), and how long is a
  typical one?
- Which machine, which reason — and what would it buy at the bottleneck?

## Inputs and minimum conditions
- The shift's time model (`equipment.time-model-losses`): planned
  minutes, the timed stops, the good packs.
- The machine's ideal speed (its plate speed, or the standard's rate at
  a people station) and its **running speed timed** — a count over a
  few minutes while it runs with no stop (`docs/CAPACITY.md` §6).
- For the frequency: the short stops counted by a tap as they happen
  (the reliability study's button) over a watched period.

## Procedure and calculation
- Run time = planned − timed stops.
- Speed loss (minutes of ideal-speed-equivalent) = run time − good
  packs ÷ ideal speed.
- Slow running = run time × (1 − running speed ÷ ideal speed).
- Short stops = speed loss − slow running (the rest).
- In packs: at ideal = run × ideal; at the running speed = run ×
  running speed; slow running costs (ideal − running) × run packs;
  short stops cost (run × running speed) − good packs.
- Frequency = short stops counted ÷ watched hours; mean length = short-
  stop minutes ÷ count (when both are known).
- Money: at the bottleneck, each lost minute = ideal speed × margin a
  pack (`knowledge/MONEY.md`, T); off the bottleneck, nothing is lost
  unless the buffer runs out (`capacity.accumulation-buffer`) — the two
  cases said apart.
- Verdict words: "slow running costs more than the short stops — the
  speed setting or the product" / "short stops cost more — the jams:
  count them by reason".

**Worked case** (`cases-operations.py`): planned 450 min, timed stops
62 → run 388 min; ideal 120/min, running speed timed 108/min; 38,200
good packs. Speed loss 69.7 min; slow running 388 × (1 − 108/120) =
38.8 min (4,656 packs); short stops 30.9 min (3,704 packs). 41 short
stops counted → 6.3 an hour, 0.75 min each. The machine runs 10% under
its plate speed all shift — the bigger loss — and jams six times an
hour. Each is a different fix.

## Assumptions, limits and misuse
- A running speed timed once, for three minutes, on one product is one
  reading; it is timed again when the product or the setting changes
  (`docs/CAPACITY.md` §6).
- Without the timed running speed the two losses cannot be told apart —
  the loss count then says "slow running and short stops" as one.
- Short stops at a non-bottleneck machine behind a buffer cost nothing
  unless the buffer empties; charging them at the bottleneck's rate
  overstates them.
- Rejects are not speed loss; they are counted out before "good packs".
- Counting short stops by hand all shift is a burden; a watched hour
  with the button, repeated, gives the frequency.
- OEE's "performance" blends these two with the rate itself; the split
  is why Faultline shows them and not OEE (`equipment.oee`).

## Reading the result
"Of the 70 minutes of speed loss, 39 are the bagger running at 108
against 120 all shift, 31 are short stops — six an hour, 45 seconds
each. The speed is the bigger loss: 4,650 packs, £X at the bottleneck."
Money: each loss's packs × margin where the machine stops the line
(`knowledge/MONEY.md`, T); the short stops' labour to clear them (L).

## When not to use it — and instead
The stops long enough to time → `equipment.downtime-log`. The rate and
pattern of events → `maintenance.mtbf-failure-rate` (the reliability
study). Whether a neighbour's stop reaches the bottleneck →
`capacity.accumulation-buffer`. The operator's checks that prevent the
jams → `maintenance.autonomous-maintenance`.

## In food and FMCG manufacturing
Flow-wrappers and baggers (film jams, product mis-feeds), case packers
(glue, flap), checkweigher reject-arm faults, conveyor photo-eyes — and
the wrapper run at 90% of plate because "it jams less there", which is
speed loss bought with a stop reduction and should be measured as both.

## References
- [textbook] Nakajima, S., *Introduction to TPM*, Productivity Press, 1988 — the six big losses: minor stoppages and reduced speed (from knowledge).
- [standard] EN 415-11:2021 — the time states of a packaging line, including minor stops and reduced speed (scope confirmed online 22 Oct 2026; text not read).
- [design] `docs/CAPACITY.md` §5–6 — Faultline's time model and the timed running speed.

## In Faultline
Partly built: the loss count splits the speed loss once a running speed
is timed (`src/tools/losses`, FC-055); the reliability study counts
short stops by a tap with MTBF and no durations (`src/tools/reliability`,
FC-056). Not yet: the two read together on one page — the frequency and
mean length from the study beside the minutes from the count — and the
verdict in words.
