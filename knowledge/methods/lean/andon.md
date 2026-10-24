---
id: lean.andon
name: Andon and jidoka — calls for help, and how fast they are answered
aka: [andon, jidoka, call for help, response time, stop the line, line stop, help chain]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — jidoka and the andon as Ohno (1988) and Liker (2004) describe them; the response measures as practice frames them; from knowledge, texts not re-read; the worked shift in `scripts/knowledge/cases-lean.py`
needs: []
next: [rca.fishbone-5whys, maintenance.mttr-availability]
alternatives: []
related: [visual.daily-management, equipment.downtime-log, equipment.short-stops-speed]
---
# Andon and jidoka — calls for help, and how fast they are answered

## Purpose and principle
Jidoka: stop at the first abnormality rather than pass it on; the andon
is the call — a light, a cord, a tap — that says where and what, so help
comes and the problem is fixed at its cause while it is small. The
system works only if calls are answered fast and never punished: the
measures are how many calls, for what, how long until help arrived
(response) and until the line ran again (resolution), by reason and by
shift. The reasons' Pareto is the improvement list; the response time
is the test of the help chain (operator → team leader → engineer → QA);
a falling count of calls with a rising count of unreported stops is
the warning that calling has been discouraged.

## Questions it answers
- How many calls this shift, for what reasons, from where?
- How quickly did help arrive, and how quickly was the line running
  again — the median and the tail?
- What did the waiting cost in packs and money?
- Which reasons recur, and are they being removed at the cause?

## Inputs and minimum conditions
- Each call tapped at the moment: the station, the reason (from a short
  list — jam, film change, QA check, label, material short, other with
  words), who was called.
- The time help arrived and the time the line ran again (tapped by the
  helper or the operator).
- The line's rate and whether the call was at the bottleneck (for the
  packs not made).

## Procedure and calculation
- Response = arrived − called; resolution = running − called; summarise
  by the median and the 90th percentile (the tail is the help chain's
  failure), never the mean alone.
- Calls by reason (the Pareto) and by station and shift; the waiting
  time summed by reason — the biggest total, not the most frequent, is
  first.
- Waiting at the bottleneck × rate = packs not made (`equipment.time-model-losses`
  counts the same minutes as a loss; the andon log says who was waited
  for and how long).
- A call whose reason recurs → a cause (`rca.fishbone-5whys`), a
  countermeasure, and the count after.
- The response standard agreed (e.g. help within 3 minutes) and the
  share of calls meeting it; the shift's misses named.
- Calls per shift trended; a fall with no countermeasure behind it is
  questioned, not celebrated.

**Worked case** (`cases-lean.py`): 23 calls in a shift — film change 9,
jam 6, QA check 4, label 3, material short 1. Response median 3.4 min,
90th percentile 8.0, the longest 11.9 (a QA check while the technician
was on another line). Resolution median 11.7 min, 90th 19.3. Waiting for
help totalled 96 minutes; at 110 a minute at the bottleneck that is
10,500 packs not made in the shift — the film changes alone, nine of
them, are the Pareto's head and a SMED question.

## Assumptions, limits and misuse
- Measuring calls as bad discourages calling; the count of calls is
  information, the response time is the performance.
- A reason list that is too long gets "other"; too short loses the
  cause — five to eight reasons, reviewed.
- The stop's own duration belongs to the loss count; the andon log
  measures the help chain and the reason.
- Response time from a log filled in afterwards is a guess; the taps
  are at the moment.
- Automation that stops the machine (jidoka proper) is the device; the
  andon is the call to a person — do not confuse a sensor's trip count
  with calls.

## Reading the result
"23 calls; help in 3.4 minutes typically but 8 at the 90th; 96 minutes
waited — 10,500 packs. Film changes are 9 of 23: the reel and the splice
are the next SMED." Money: the waiting minutes at the bottleneck's
contribution and the crew's labour (`knowledge/MONEY.md`, T, L), by
reason.

## When not to use it — and instead
The repair itself and its time → `maintenance.mttr-availability`. The
stops and their minutes as a shift's losses → `equipment.time-model-losses`,
`equipment.downtime-log`. The cause of a recurring reason →
`rca.fishbone-5whys`. The daily review that reads the log →
`visual.daily-management`.

## In food and FMCG manufacturing
A packer calling the engineer to a jam; QA called for a weight, seal
or label check before a restart; a line stopped for a material short;
the help chain across a packing hall with one engineer for six lines.

## References
- [textbook] Ohno, T. (1988), *Toyota Production System: Beyond Large-Scale Production*, Productivity Press — autonomation and the andon (from knowledge).
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill — principle 5, build a culture of stopping to fix problems (from knowledge).

## In Faultline
Not built (FC-015). The register takes a problem on a line with a time
(`src/snag`) and the loss count holds the stops' minutes
(`src/tools/losses`); FC-015 adds the call tapped with its reason and
the two times after it, the response and resolution by reason and
shift, the help-chain standard and its misses, and the waiting's
packs and money — and feeds the reasons to the fishbone.
