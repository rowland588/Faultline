---
id: lean.process-flow-chart
name: Process flow chart — operation, transport, inspection, delay, storage
aka: [flow process chart, ASME process chart, process chart, five symbols, outline process chart, flow diagram]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the five ASME symbols and the flow process chart (material-type, man-type) as the ILO's *Introduction to Work Study* (Kanawaty 1992) and Niebel's *Methods, Standards, and Work Design* give them; from knowledge, texts not re-read; the worked chart in `scripts/knowledge/cases-lean.py`
needs: []
next: [ie.ecrs, lean.spaghetti]
alternatives: [lean.value-stream-mapping]
related: [ie.time-study, ie.person-machine, lean.seven-wastes]
---
# Process flow chart — operation, transport, inspection, delay, storage

## Purpose and principle
Every step of one thing — a product, a tray, an ingredient, or a
person — recorded in order as it happens on the floor, classed by the
five symbols: **operation** (○, the product is changed), **transport**
(⇨, it moves), **inspection** (□, it is checked), **delay** (D, it waits
unplanned) and **storage** (▽, it waits by design). Each step carries
its time and, for a transport, its distance. The totals per class say
how much of the path changes the product and how much is waste; then
each non-operation is questioned one by one (`ie.ecrs` — eliminate,
combine, rearrange, simplify). It is the method-study instrument
before the value stream map existed, and still the finer one for a
single path.

## Questions it answers
- How many steps, and how many of them change the product?
- How long does the path take, and how much of that is waiting and
  storage?
- How far does the product travel?
- Which steps can go, be combined, be moved or be simplified — and what
  does the chart look like after?

## Inputs and minimum conditions
- The subject (one product unit, one container, or one person) and the
  start and end of the path.
- Every step as followed on the floor — not from the procedure — with
  its class, its time (timed or taken from the standard) and its
  distance for transports.
- Where steps vary (a tray that may or may not be inspected), the usual
  path, and the variants noted.

## Procedure and calculation
- Steps numbered in order with symbol, description, time, distance.
- Totals per class: count, time, distance; the share of time in
  operations = Σ operation time ÷ Σ all time; the share waiting
  (delay + storage).
- Distance total = Σ transports; the longest transports named (and
  drawn on the layout — `lean.spaghetti`).
- The questioning: each non-operation asked why, where, when, who, how
  (`ie.ecrs`); the proposed chart drawn beside the present one; the
  savings in steps, time and distance stated.
- A storage by design (a cooler's dwell, a proving time) is counted
  but not called waste; a delay (waiting for a forklift, for QA) is.
- Where two subjects work together (a person and a machine), the
  multiple-activity chart (`ie.person-machine`) replaces this one.

**Worked case** (`cases-lean.py`): a tray of product from the oven to
the despatch pallet — 14 steps: 4 operations, 5 transports, 2
inspections, 2 delays, 1 storage (the 4-hour chill). Total 280 minutes,
of which operations are 11 minutes (4%), delay and storage 260 (93%);
140 m travelled. Leaving the chiller's 240 minutes aside as by design,
operations are 28% of the rest — the two delays (12 and 8 minutes
waiting for a forklift and for a QA release) and five transports over
140 m are the questions.

## Assumptions, limits and misuse
- One path only; parallel work needs the multiple-activity chart, and
  the whole stream with its information flows needs the value stream
  map.
- A chart drawn from the written procedure records what should happen;
  the method records what does.
- Times from one observation are indicative; time the steps that
  matter (`ie.time-study`).
- Storage by design counted as waste inflates the finding; name it.
- The chart is the record; the improvement is the questioning after it.

## Reading the result
"23 steps from oven to pallet, 6 of them operations; 140 m travelled;
71% of the time waiting. The forklift wait and the QA release are the
two delays — 20 minutes a tray." Money: the delays' minutes where they
hold the line (`knowledge/MONEY.md`, T), the transports' labour (L), and
the stock the waits imply (H).

## When not to use it — and instead
The whole stream with its information flows and stock →
`lean.value-stream-mapping`. A person and a machine together →
`ie.person-machine`. Walking distance alone → `lean.spaghetti`. The
improvement step → `ie.ecrs`.

## In food and FMCG manufacturing
A tray of product from oven to packing; an ingredient from intake to
weigh-up; a pallet from the end of the line to the lorry; a sample's
path through the laboratory.

## References
- [textbook] Kanawaty, G. (ed.) (1992), *Introduction to Work Study*, 4th ed., International Labour Office — chapter 8, the process charts (from knowledge).
- [textbook] Freivalds, A. and Niebel, B.W. (2014), *Niebel's Methods, Standards, and Work Design*, 13th ed., McGraw-Hill — the flow process chart (from knowledge).
- [standard] ASME Standard 101 (1947), *Operation and Flow Process Charts* — the five symbols (from knowledge).

## In Faultline
Not built (FC-003). The value stream map's steps already carry who,
where and the value class (`src/tools/valuestream`); FC-003 is a finer
chart for one path — each step with its symbol, time and distance, the
totals and shares, and the present and proposed charts side by side —
and would feed the map's step times.
