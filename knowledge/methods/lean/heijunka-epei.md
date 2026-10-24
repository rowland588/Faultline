---
id: lean.heijunka-epei
name: Heijunka and EPEI — levelling the mix and every product every interval
aka: [heijunka, levelling, EPEI, every part every interval, production levelling, wheel, pitch, heijunka box]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — EPEI as Smalley (2004) *Creating Level Pull* and Rother & Shook (1999) define it; pitch = takt × pack quantity as Rother & Shook; from knowledge, texts not re-read; Faultline's interval in `src/tools/changeover/changeover.ts` (intervalOf); the worked week in `scripts/knowledge/cases-lean.py`
needs: [changeover.smed, lean.takt-time]
next: [lean.kanban-supermarket, planning.lot-sizing]
alternatives: [planning.lot-sizing]
related: [changeover.sequencing, planning.runner-repeater-stranger, planning.schedule-adherence]
---
# Heijunka and EPEI — levelling the mix and every product every interval

## Purpose and principle
Make a little of everything often, in a fixed repeating pattern, so
that the line's demand on everything upstream is steady and the stock
of each finished product is small. Two numbers govern it. **EPEI**
(every product every interval) is how often the line can cycle through
its whole range: the spare time after running the demand, divided into
the changeovers one full cycle needs. **Pitch** is the heartbeat of the
schedule — takt × the quantity in one pack unit (a case, a pallet) — the
interval at which work is released and checked. The heijunka box lays
the day out in pitch slots, each a card for one product's pack unit, in
the levelled sequence. Levelling is only possible once changeovers are
short (`changeover.smed`); with long changeovers the only lever is
sequence (`changeover.sequencing`).

## Questions it answers
- How often can this line make every product — and how much more
  often if the changeover were halved?
- What is the pitch, and what does a levelled day look like?
- How much finished stock does the interval imply?
- Is the day running to the levelled plan (`planning.schedule-adherence`)?

## Inputs and minimum conditions
- The available time in the period (shifts × hours, less planned
  breaks and planned maintenance — `equipment.time-model-losses`).
- Each product's demand in the period and its run rate → the run time
  needed.
- Each changeover's time (SMED's record), by direction where it matters.
- Takt and the pack unit for the pitch.

## Procedure and calculation
- Run time = Σ demandᵢ ÷ rateᵢ; spare = available − run time.
- EPEI = Σ changeover timesᵢ (one of each) ÷ spare, in periods; × the
  period's working days for the interval in days. Spare ≤ 0 → the range
  cannot be run in the period at all.
- With changeovers cut by a share s: EPEI′ = EPEI × (1 − s).
- Stock implied: each product's finished stock cycles between near zero
  and one interval's demand; average ≈ half an interval's demand plus
  the safety stock (`planning.safety-stock`, `planning.lot-sizing` for
  the cost view).
- Pitch = takt × pack quantity; the day's slots = available time ÷
  pitch; each product gets slots in proportion to its demand, spread
  through the day (A B A C A B A D …), the allergen order respected
  within the pattern.
- The schedule's adherence by slot (made on time, late, missed) is the
  daily measure.

**Worked case** (`cases-lean.py`): one shift of 7.5 h, five days —
2,250 min a week. Four products need 720 + 480 + 360 + 240 = 1,800 min of
running; spare 450. Changeovers into A, B, C, D of 35, 35, 50, 50 min —
170 for a full cycle. EPEI = 170 ÷ 450 = 0.38 weeks = 1.9 working days:
every product every two days. Changeovers halved by SMED → 0.9 days:
every product every day. Takt at 12,000 a shift is 2.25 s; the pitch for a
case of 24 is 54 s, for a pallet of 1,200 is 45 min; A's 144 min a day sit
in two 72-minute slots, morning and afternoon, on the box's row.

## Assumptions, limits and misuse
- Levelling with long changeovers does not level; it loses capacity.
  SMED first.
- EPEI assumes the spare time is spent on changeovers; unplanned stops
  eat the same spare, so the interval in practice is longer than the
  sum says — plan with the measured losses.
- Short-life product cannot be made ahead to level; the interval is
  bounded by the life, not the changeover.
- Allergen and hygiene sequences constrain the pattern; the levelled
  sequence works within them.
- A heijunka box nobody loads or reads is furniture; the daily review
  reads its adherence.

## Reading the result
"Every product every 1.9 days today; with the changeover halved, every
day — and A's stock falls from two days' worth to one." Money: the
changeover minutes the interval costs (`knowledge/MONEY.md`, T) against
the stock the interval ties up (H) — the trade `planning.lot-sizing`
prices.

## When not to use it — and instead
The economic trade of changeover cost against holding cost →
`planning.lot-sizing`. The order of products within the cycle →
`changeover.sequencing`. Which products run every cycle and which
rarely → `planning.runner-repeater-stranger`. The changeover itself →
`changeover.smed`.

## In food and FMCG manufacturing
A pack-size wheel on a filling line; a bakery's product rotation across
the week; the allergen-free-to-allergen order fixed inside the wheel;
chilled lines where the life, not the changeover, sets the interval.

## References
- [textbook] Smalley, A. (2004), *Creating Level Pull*, Lean Enterprise Institute — EPEI and the pacemaker (from knowledge).
- [textbook] Rother, M. and Shook, J. (1999), *Learning to See*, LEI — pitch, the levelled schedule (from knowledge).
- [textbook] Monden, Y. (2012), *Toyota Production System*, 4th ed., CRC Press — levelled production (from knowledge).

## In Faultline
Partly: SMED gives the interval the changeovers allow
(`src/tools/changeover/changeover.ts`, FC-069). The heijunka box — the
day's pitch slots and the levelled sequence with its adherence — is not
built (FC-011); it would read the line's products, SMED's times and the
line's hours and write the day's plan the control room reads.
