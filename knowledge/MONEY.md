# The money model — a cost where there is one, in every tool

Rowland, 24 October 2026: *"all tools made or that will be made will have cost
in if possible if the costs calculations exist to the industry standards and
the methodologies that we are using. The cost is merely one of the outputs
we have, it's not the main part of any tool, it's to express a cost where
there is one. If you make a calculation but the user doesn't have that
information then the app must handle it gracefully, don't block anything.
It's merely a piece of the information that's missing ... look at all of the
tools we have and what we will make ... start to build the correct
calculations for all of the tools, then we will build every tool ... our
industry is manufacturing, our domain is FMCG, fast moving consumer goods,
with a primary food manufacturing."*

And before it, 17 October: *"Everything must derive a cost in the entire app
... It's all about money"* (CLAUDE.md, *Everything derives a cost*); and 24
October on the value stream: *"only assign money to already industry standard
tools ... find the industry standard causation of costs and apply them but
ensure they are flexible, not all costs are available to me in a factory."*

This document is the model those words ask for: §1 the rules, §2 the
causations the industry already has (each with its source — nothing
invented), §3 the inputs and where each lives, §4 **every catalogue entry**
with the causation its finding is said in, the inputs it needs and the
sentence when one is missing, §5 how a causation is validated and built, §6
the order. A tool's specification (`knowledge/specs/`) copies its row into
*Established · assumed · chosen* and builds it; the catalogue's `limits` say
when the money is not yet there.

## 1. The rules

1. **Measure in the floor's units; derive the money.** Minutes, packs,
   kilos, counts and percentages are the measures people keep (Maskell 1991 —
   `visual.performance-measures`); money is worked out from them by the
   model and said beside them. No tool asks the floor to type a cost that
   the model can work out.
2. **One cost model, never a second** (`cost.line-cost-model`): the people
   (Line capacity's labour, else the line standard's head count, else the
   line's crew); one person's rate (Line capacity's, else the line's wage ×
   on-costs); the line's contribution a pack (price less materials, else its
   margin a pack). Every causation below reads these; a tool that needs more
   (a cost a kilo, a carrying rate, a tariff) asks for it once, on the record
   where it belongs (§3), and every other tool reads it from there.
3. **Labour and lost output are two figures, never one** (Rowland, 14
   October; `docs/CAPACITY.md` §6): lost time costs labour wherever it is,
   and lost contribution only where it stops the line — the constraint.
   Goldratt's rule: throughput is price less truly variable cost; allocated
   overhead is never charged to a pack, a stop or a reject.
4. **The cost is one output.** It sits beside the tool's own figures as a
   tile and a sentence ("… because of …"), on screen and on paper from the
   same module; it is never the verdict, never a colour of its own, and a
   tool with no money input still gives every other finding.
5. **A missing input is named, nothing blocks.** "Give the line a wage to say
   the waste work in money." — one sentence, saying which input and where to
   give it; the tile stays, empty of a figure; nothing is withheld, nothing
   waits, no figure is invented or defaulted. A range the industry quotes
   (a carrying rate of 15–35% a year) is said as a range, never used as a
   number.
6. **No causation is invented.** Where the industry's methods carry no money
   (a normality check, a control chart's rules, a kappa), the entry says
   *none of its own* and names the tool whose money it feeds. Where the
   industry prices something only by a typed business figure (a complaint,
   an injury, a day of shelf life), the tool asks for that figure and says so.
7. **The domain is FMCG food.** The examples, the units (packs, trays, kilos,
   cases, pallets; a shift, a week, a year) and the inputs (give-away,
   rework, life, allergen cleans) are a food factory's; a non-food line is
   not excluded, only not the example.

## 2. The causations the industry already has

Each is an established way of putting a cost on a finding, with its source.
A tool's row in §4 names its letter(s).

| | Causation | What it prices | The arithmetic | Source |
|---|---|---|---|---|
| **L** | **Labour at the line's rate** (direct labour; value stream costing) | People's time: standing idle, doing non-value-adding work, doing a changeover, inspecting, covering absence, being slower while learning | £/h = crew × wage × on-costs (`lib/cost` labourPerHour); a thing's labour = its hours × £/h; a pack's labour = £/h ÷ packs/h | Standard costing's direct labour; lean accounting's value stream costing — all the stream's labour a direct cost of the stream, weekly (Maskell & Baggaley 2004; Baggaley & Maskell 2003) |
| **T** | **Lost contribution at the constraint** (throughput accounting) | Output not made because the bottleneck stopped, ran slow, was starved or was changed over; capacity short of demand | packs not made × contribution a pack (price − truly variable cost, else the margin a pack); only at the constraint or when the whole line stopped (`lib/lineLoss`; `tools/losses/losses` contributionOf) | Goldratt (1990), *The Haystack Syndrome*; Corbett (1998), *Throughput Accounting* — `capacity.throughput-accounting`, `capacity.theory-of-constraints` |
| **M** | **Materials — waste, give-away, rework** (internal failure; yield) | Product that became waste (ingredients + packaging), weight given away, product put through the process again | waste: packs × materials a pack; give-away: kg over the target × £/kg; rework: packs × the cost to put one through again (Rowland, 24 October: a reject is waste, reworked, or recovered by hand — the last not priced); yield: kg lost at a stage × £/kg of that stage's material | Internal failure cost in the PAF model (Feigenbaum 1991; Juran & De Feo 2010; BS 6143-2, edition to confirm); mass balance (`yield.mass-balance-yield`); give-away (`yield.giveaway`) — built: FC-156 |
| **H** | **Holding — what waiting product and stock cost** | Product queued between steps, stock of materials, WIP in chillers | tied up = pieces × cost a piece so far; carrying cost a day = tied up × (annual rate ÷ 365); pieces from a count, else Little's law | Silver, Pyke & Peterson (1998); Hopp & Spearman (2008); Pound, Bell & Spearman (2014) — `cost.inventory-carrying-cost` — built: FC-001 |
| **Q** | **The cost of quality's four buckets** (PAF) | Prevention (training, mistake-proofing), appraisal (checks, audits, tests — labour and samples destroyed), internal failure (M + L + T on rejects, holds, downgrades), external failure (complaints, returns, withdrawals, penalties) | each bucket summed from its own records: appraisal = check minutes × £/h + samples × materials; internal failure from M, L and T; external failure = events × the typed cost of each (a complaint, a claim, a withdrawal) | Feigenbaum (1956, 1991); Juran & De Feo (2010); BS 6143-2:1990 (edition to confirm) — `quality.copq` |
| **D** | **Downtime and repair** (maintenance economics) | A failure's lost minutes and its repair | lost minutes → L (crew stood) + T (if at the constraint); repair = repair hours × the fitter's rate + spares used (typed) | EN 15341 economic indicators (edition to confirm); Smith & Mobley; the time model `equipment.time-model-losses`; built for stops: FC-049, FC-052, FC-189 |
| **E** | **Energy and utilities** | kWh, m³ gas, m³ water, compressed air leaks | consumption × the tariff typed for the site; a leak's l/min → kWh/year → £ by the compressor's specific power (typed) | ISO 50001 / ISO 50006 energy performance indicators (from knowledge); the Carbon Trust's leak tables (practitioner) — `sustainability.energy-water` |
| **I** | **Investment economics** | What an improvement, a machine, a project is worth | payback = cost ÷ yearly saving; NPV at the business's rate (typed); the saving built from L, T, M, H, D, E of the finding it fixes | Engineering economics (Park, *Contemporary Engineering Economics*; Brealey & Myers) — `cost.investment-appraisal` |
| **S** | **Service and lost sales** | Orders short, late or changed; stock-outs | units short × contribution a pack (T's rate); a penalty or a lost listing only as a typed figure | Maskell (1991) lost-sales analysis; throughput accounting — `planning.schedule-adherence`, `planning.safety-stock` |
| **C** | **Changeover** | A changeover's minutes | L for the crew through it + T for the constraint's lost minutes; said a shift, day, week, year by the running pattern | Shingo (1985) — built: FC-068 |
| **P** | **People — absence, cover, injury, learning** | Cover hours, overtime, a new starter's slower output, an injury | cover and overtime hours × rate (L); learning: the extra hours to standard × rate (Wright's curve, `ie.learning-curve`); an injury only as the business's typed cost — HSE's published estimates are said as a reference, never defaulted | Crew planning practice (`planning.crew-planning`); Wright (1936); HSE *Costs to Britain* (practitioner, edition to confirm) |
| **—** | **None of its own** | A method that gives a figure in its own units only | The tool it serves says the money; this one names it | — |

What is not priced, on purpose: overhead allocated to a pack (rule 3); the
value of information (a better chart); shelf life spent waiting (said as a
share of life, not money — `cost.inventory-carrying-cost`); goodwill. Where a
business wants one of these it is a typed figure, said as the business's.

## 3. The inputs and where each lives

Each is typed once, on the record it belongs to, and read by every tool.
Every one is optional; the tool names the one it lacks.

| Input | Lives on | Read by |
|---|---|---|
| crew (people on the line), wage £/h, on-costs ratio | the line (Workspace) — else Line capacity's labour, else the line standard's head count | L, C, D, P, Q |
| packs a minute (rated), the constraint | the line; Line capacity | T, D, C, S |
| contribution a pack — price and materials a pack, else margin a pack | the line; the product | T, S, I |
| cost a kilo; materials a pack; rework a pack; the target weight | the product (typed on the study until a product record carries it — FC-156) | M, Q |
| cost a piece so far; carrying rate a year | the value stream map (FC-001); a stock record | H |
| cost of a complaint, a claim, a withdrawal | the factory (typed when first needed) | Q (external), S |
| a fitter's rate; spares used | the line's maintenance records (typed on the repair) | D |
| tariffs — £/kWh, £/m³ gas, £/m³ water; compressor specific power | the factory | E |
| the business's discount rate; an investment's cost | the project | I |
| cost of an injury; cover rate and overtime premium | the factory | P |
| shifts, hours, days the line runs | the line (SMED asks it already) | every "a shift · a day · a week · a year" |

## 4. Every tool, its money

Status as the catalogue says it on 24 October. *Money today* says what is
built; *Causation* the letter(s) above; *Inputs* the ones beyond the one cost
model; *When missing* the sentence's shape (always "Give … to say … in money",
one sentence, nothing withheld). An entry marked **—** has no money of its
own and names what it feeds.

### Lean manufacturing and waste

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-001 Value stream map | built 24 Oct — waste work a day (L), waiting product tied up and carried (H) | L, H | wage; cost a piece; carrying rate | "Give the line a wage to say the waste work in money"; "Give a cost a piece …" |
| FC-002 Product families and P–Q | — (sorts products; feeds FC-179, FC-069) | — | | |
| FC-003 Process flow chart | the delays and storages as H, the transports and inspections as L — the same model as the map | L, H | as FC-001 | as FC-001 |
| FC-004 Spaghetti diagram | walking minutes a shift × rate: the walking is labour | L | wage | "Give the line a wage to say the walking in money" |
| FC-005 Waste walk | each waste seen, costed by its kind: waiting and motion L, inventory H, defects M, overproduction H + M, transport L | L, H, M | wage; cost a piece; materials a pack | per waste, the input its kind needs |
| FC-006 Line standard | built 24 Oct — the people placed: £ an hour at the line's rate and a pack at Line capacity's speed or the line's rated one, on the page and the card (`knowledge/specs/FC-006-line-standard-money.md`); the bottleneck person's packs lost are Line capacity's (FC-188) | L | wage; speed (Line capacity or rated) | "give the line a wage (Set up the line)"; "give the line a speed, or map its Line capacity" |
| FC-007 Standard work combination table | the waiting inside a cycle (person waits machine) as L a pack | L | wage | as above |
| FC-008 Takt time | — (feeds every balance) | — | | |
| FC-009 Kanban sizing | the kanban's stock as H; a stock-out as S | H, S | cost a piece; carrying rate; contribution | "Give a cost a piece to say the kanban's stock in money" |
| FC-010 Supermarkets and FIFO lanes | the lane's holding as H | H | as FC-009 | as FC-009 |
| FC-011 Heijunka box | the levelled mix's changeovers (C) and stock (H) against the unlevelled | C, H | the SMED's cost; cost a piece | "Time a changeover (SMED) to say the levelling in money" |
| FC-012 Pacemaker and pitch | — | — | | |
| FC-013 5S audit | — of its own; the audit's findings raise actions whose worth is I | — | | |
| FC-014 Mistake-proofing register | a device's prevention cost (typed) against the failures it stops (internal failure M + L + T) | Q (prevention v internal failure) | device cost; the defect's M | "Give the device's cost to say what it pays back" |
| FC-015 Andon calls | response + resolution minutes × crew stood (L) + T if at the constraint — the same as a stop | L, T | wage; packs a minute | as the loss count |
| FC-016 Kaizen event | the before → after of the tools it used, each in its own money; the event's own cost = team days × rate | L, I | wage; the tools' inputs | each tool names its own |
| FC-017 Improvement kata | — of its own; each experiment's measure says its money by its tool | — | | |
| FC-018 Lean maturity | — | — | | |

### Industrial engineering and work measurement

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-019 Stopwatch time study | standard time → labour a pack (L); the allowance share in £ | L | wage | "Give the line a wage to say the standard time in money" |
| FC-020 How many cycles to time | — | — | | |
| FC-021 Video time study | as FC-019, from the footage's reading | L | wage | as FC-019 |
| FC-022 Work sampling | built — the biggest share not the work costs a shift (L) | L | wage | built |
| FC-023 MTM / MOST | — (licensed; research) | — | | |
| FC-024 Standard data | as FC-019 for the elements reused | L | wage | as FC-019 |
| FC-025 Allowances | the allowance minutes a shift × rate — what rest and contingency cost, said plainly, never as waste | L | wage | as FC-019 |
| FC-026 Person–machine chart | the person's idle and the machine's idle each priced: person L; machine T if the constraint | L, T | wage; packs a minute | as the loss count |
| FC-027 Learning curve | the extra hours to reach standard × rate — what a new starter or a new product costs to learn | P (L) | wage | "Give the line a wage to say the learning in money" |
| FC-028 ECRS | each element removed or combined → its seconds × packs × rate | L | wage | as FC-019 |
| FC-029 Labour productivity | packs a labour hour → labour a pack (L), and against the standard | L | wage | as FC-019 |
| FC-030 Earned hours and efficiency | hours over standard × rate | L | wage | as FC-019 |
| FC-031 People needed at a station | built (Line capacity) — one more person's labour a pack, lower or higher | L, T | built | built |
| FC-233 Micro-motion study | as FC-028 | L | wage | as FC-019 |

### Capacity, throughput and bottlenecks

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-032 Line balance | built — packs lost to the slowest person, labour a pack now and at takt, the others waiting, contribution lost | L, T | built | built |
| FC-033 A balance proposed | the proposal's labour a pack against today's | L | built | built |
| FC-034 Line capacity | built — labour a pack; the bottleneck's cost a pack and a minute | L, T | built | built |
| FC-035 Several lines feeding one station | the shared station's cost a minute carries every line's packs | T | built | built |
| FC-036 What-ifs and the way to target | each what-if's labour and the target's worth (packs gained × contribution) | L, T | built | built |
| FC-037 Bottleneck walk | the waiting product found, as H | H | cost a piece | "Give a cost a piece to say the waiting product in money" |
| FC-038 The constraint and the mirage | built — where a lost minute costs output | T | built | built |
| FC-039 Recovery levers | the share recovered × the loss's £ (its L + T) | L, T | built (from the loss count) | built |
| FC-040 Load against demand | built — next week's orders: short in packs → S | S | contribution | built |
| FC-041 Capacity's three numbers | design − actual in packs → T a shift, as what the gap is worth | T | contribution | "Give a contribution a pack to say the capacity gap in money" |
| FC-042 Product mix at the constraint | built (arithmetic) — T a constraint minute, unmade worth | T | price and materials a product | built |
| FC-043 Drum–buffer–rope | the buffer's holding (H) against the starvation it prevents (T) | H, T | cost a piece; contribution | as FC-037 |
| FC-044 Little's law | WIP tied up and carried (H); the lead time's days of life | H | cost a piece; carrying rate | as FC-037 |
| FC-045 Utilisation and variability (VUT) | the queue's holding (H) and the spare capacity's cost (L at the station) side by side — the buffer choice in money | H, L | cost a piece; wage | as FC-037 |
| FC-046 Accumulation between machines | the minutes of accumulation as H; a starvation as T | H, T | cost a piece; contribution | as FC-037 |
| FC-047 Line simulation | — (research) | — | | |
| FC-048 Capacity across the factory | short in packs by week → S; idle lines' labour → L | S, L | contribution; wage | as FC-041 |

### Equipment performance and losses

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-049 Loss count | built — idle labour and lost contribution, two parts | L, T | built | built |
| FC-050 OEE | left out | — | | |
| FC-051 Stops timed at the machine | built — each stop's labour; packs at the constraint | L, T | built | built |
| FC-052 Stops Pareto | built — by £ | L, T | built | built |
| FC-053 Where and when the line stops | the day's stops in £ as FC-051 | L, T | built | built |
| FC-054 Chronic or one-off | the chronic loss's £ a week (its L + T repeated) | L, T | built | built |
| FC-055 Short stops | minutes a shift × (L + T at the constraint) | L, T | built | built |
| FC-056 Speed loss | packs short of ideal speed × contribution (T) + the shift's labour spread over fewer packs (L a pack up) | L, T | built | built |
| FC-057 Cost deployment | the WCM matrix: every loss → its cause → its £ by the letters above; the sum by cause and by machine | L, T, M, H, D, E, Q | each loss's own | each loss's own |
| FC-231 Machine data / IoT | left out | — | | |

### Maintenance, reliability and TPM

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-058 Reliability (MTBF) | each failure's lost minutes → L + T; a count's £ a day | D (L, T) | wage; packs a minute; contribution | "Give the line a wage to say the failures in money" |
| FC-059 Repair times (MTTR) | repair hours × fitter's rate + spares; the line's L + T meanwhile | D | fitter's rate; spares | "Give a fitter's rate to say the repairs in money" |
| FC-060 Weibull | the expected failures in a period × a failure's £ (D) — what a replacement interval saves | D, I | as FC-058; part cost | as FC-058 |
| FC-061 Reliability growth | the failures a week's £ falling (D) as the line matures | D | as FC-058 | as FC-058 |
| FC-062 Autonomous maintenance (CILT) | the checks' minutes as L (appraisal/prevention), against the abnormalities caught | L, Q | wage | as FC-019 |
| FC-063 Planned maintenance | planned hours × rate + parts (D, prevention) against the breakdowns avoided | D, Q | fitter's rate; parts | as FC-059 |
| FC-064 Equipment criticality | — of its own; ranks by a failure's £ (D) when known | D | as FC-058 | — |
| FC-065 RCM | — (research) | — | | |
| FC-066 Critical spares | holding the spare (H at the spare's cost and rate) against the stock-out's downtime (D) | H, D | spare cost; carrying rate; a failure's £ | "Give the spare's cost …" |
| FC-067 Maintenance measures | the EN 15341 economic indicators that the records can give: maintenance cost a pack, downtime £ | D | as FC-059 | as FC-059 |
| FC-234 Condition checks on a route | as FC-062 | L, Q | wage | as FC-019 |

### Changeovers

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-068 SMED | built — a shift, day, week, year; what each stage buys back | C (L, T) | built | built |
| FC-069 Changeover interval (EPEI) | the interval's changeovers (C) against the stock the interval needs (H) | C, H | the SMED's cost; cost a piece | "Time a changeover to say the interval in money" |
| FC-070 Changeover sequence | the sequence's total changeover minutes × the SMED's £ a minute | C | the SMED's cost | as FC-069 |
| FC-071 First-off release | the release wait as C (the line stood) and a failed first-off as M | C, M | wage; materials a pack | as the loss count |
| FC-072 Cleandown changeovers | as FC-068, with the clean's materials (chemicals, water — E) | C, E | tariffs; chemical cost | as FC-068 |

### Commissioning and operational readiness

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-073 The stage gate | built — what the slip costs: days moved × a day of the line's margin (T) | T | built | built |
| FC-074 Acceptance tests | — of their own; a failed test's re-test day feeds the slip (FC-073) | — | | |
| FC-075 Program proving | — of its own; feeds the slip | — | | |
| FC-076 Performance run | packs short of the agreed rate × contribution — what the shortfall is worth a shift (T) | T | contribution | "Give a contribution a pack to say the shortfall in money" |
| FC-077 The climb to rate | the packs below rate during the climb × contribution (T), week by week | T | contribution | as FC-076 |
| FC-078 The pace says when | the forecast slip's days × a day's margin (T) | T | built | built |
| FC-079 Materials on site | a late part's days × a day's margin if it holds the gate (T) | T | built | built |
| FC-080 Handover and sign-off | — | — | | |
| FC-081 Filmed walk / punch list | — of its own; a problem's open cost is FC-154's | — | | |
| FC-082 Operational readiness | — | — | | |
| FC-083 Held at a rate | as FC-076 for the held period | T | contribution | as FC-076 |
| FC-084 Machine capability (Cm, Cmk) | — of its own; its rejects' money is FC-156's | — | | |
| FC-085 Line acceptance (EN 415-11) | — (research) | — | | |

### Statistical process control and capability

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-086 XmR chart | — of its own; a signal's cost is the finding it points to | — | | |
| FC-087 X̄-R / X̄-S | — | — | | |
| FC-088 Reject rate chart (p) | the rejects a shift by fate (M) — the same money as FC-156, trended | M | materials a pack; rework a pack; packs a shift | "Give materials a pack to say the rejects in money" |
| FC-089 Faults per item chart (u) | — of its own unless a fault's fate is a reject (then M) | M | as FC-088 | as FC-088 |
| FC-090 Signals on a chart | — | — | | |
| FC-091 CUSUM / EWMA | — of its own; on a weight chart the drift's give-away (M) | M | cost a kilo | "Give £ a kilo to say the drift in money" |
| FC-092 Pre-control | — of its own; a failed set-up's packs as M | M | materials a pack | as FC-088 |
| FC-093 Short-run charts | — | — | | |
| FC-094 Capability of measured data | built 24 Oct — give-away a pack, a shift, a week; rejects by fate | M | built | built |
| FC-095 Capability against one limit | the share outside × packs a shift → rejects by fate (M) | M | built (FC-156) | built |
| FC-096 Non-normal capability | as FC-094, the share outside from the fitted model | M | built | built |
| FC-097 Before capability | — | — | | |
| FC-098 Reject rate capability | the reject share × packs a shift → M by fate | M | as FC-088 | as FC-088 |
| FC-099 Faults per item capability | as FC-089 | M | as FC-088 | as FC-088 |
| FC-100 Pass or fail | the allowed loss (98% good) said in packs and £ a shift (M) | M | as FC-088 | as FC-088 |
| FC-101 Capability across products | each product's give-away and rejects (M) summed and ranked | M | built | built |
| FC-102 DPMO and sigma level | — of its own | — | | |

### Statistical analysis

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-103 Describing readings | — | — | | |
| FC-104 Confidence intervals | — | — | | |
| FC-105 Before and after | the difference in the measure × the tool's own rate — "the move is worth £ a shift" from the tool it proves (its letters) | the tool's | the tool's | the tool's |
| FC-106 Paired comparison | — | — | | |
| FC-107 Several groups (ANOVA) | the worst group's gap to the best × the measure's £ (its tool's) | the tool's | the tool's | the tool's |
| FC-108 Chi-square | — | — | | |
| FC-109 Correlation | — | — | | |
| FC-110 Regression | a driver's unit effect × the measure's £ (the tool's) — "a degree of oven temperature is worth £ a shift" | the tool's | the tool's | the tool's |
| FC-111 Designed experiments | each factor's effect in the response's £ (the tool's); the experiment's own cost — runs × materials + line time (M, T) | the tool's; M, T | materials a run; packs a minute | "Give materials a pack to say the experiment's cost" |
| FC-112 Response surface | as FC-111 | as FC-111 | | |
| FC-113 Sample size | the sample's cost: items destroyed × materials + minutes × rate (appraisal, Q) | Q (M, L) | materials a pack; wage | "Give materials a pack to say the sample's cost" |
| FC-114 Distribution fitting | — | — | | |
| FC-115 Autocorrelation | — | — | | |
| FC-116 Tolerance stack-up | the combined give-away of several deposits (M) | M | cost a kilo | as FC-091 |
| FC-117 The team's own number | the number's £ by the tool it comes from, if it has one | the tool's | | |

### Measurement systems

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-118 Gauge R&R | the measurement spread's share of the give-away — how much of the target's offset is the gauge (M) | M | cost a kilo | as FC-091 |
| FC-119 Type 1 gauge study | as FC-118 | M | cost a kilo | as FC-091 |
| FC-120 Bias, linearity, stability | a bias on a checkweigher → give-away or illegal packs (M) | M | cost a kilo | as FC-091 |
| FC-121 Inspectors agreeing | — of its own; the misclassified good product as M when its fate is waste | M | materials a pack | as FC-088 |
| FC-122 Calibration register | the checks' minutes as appraisal (L) | Q (L) | wage | as FC-019 |
| FC-123 Uncertainty budget | — | — | | |

### Quality engineering and defects

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-124 Defect tally | each type's count × its fate's cost (M) | M | materials a pack; rework a pack | as FC-088 |
| FC-125 Defect Pareto by money | built from FC-124's £ — the Pareto's second axis | M | as FC-124 | as FC-088 |
| FC-126 Defect concentration | — | — | | |
| FC-127 First pass / rolled throughput yield | (1 − RTY) × packs × materials, plus the rework's cost (M) | M | as FC-124 | as FC-088 |
| FC-128 Cost of poor quality | the four buckets summed from the records that hold them (§2 Q): appraisal from checks and samples, internal failure from rejects, holds and downgrades, external from complaints at the typed cost | Q | the typed cost of a complaint, a claim, a withdrawal | "Give the cost of a complaint to say external failure in money" |
| FC-129 / FC-130 Acceptance sampling | the plan's samples (appraisal, Q) against the lots passed with defects (external failure) | Q | materials a pack; cost of a complaint | as FC-113 |
| FC-131 OC curve | — | — | | |
| FC-132 Process FMEA | — of its own; a failure mode's cost when known (M, T, Q) said beside its priority, never in the ranking | M, T, Q | the mode's own | — |
| FC-133 Control plan | the plan's checks a shift × minutes × rate (appraisal, Q) | Q (L) | wage | as FC-019 |
| FC-134 Complaints per million | complaints × the typed cost of one (external failure, Q) | Q | cost of a complaint | "Give the cost of a complaint …" |
| FC-135 Product on hold | held product tied up and carried (H); downgraded or scrapped product (M); the hold's days of life | H, M | cost a piece; carrying rate; materials | as FC-037 |
| FC-136 Supplier quality | rejected intake × its cost (M) and the line time lost waiting for material (L, T) | M, L, T | material cost; wage | "Give the material's cost to say the intake rejects in money" |
| FC-137 Triangle test | the test's samples and panel time (appraisal, Q) | Q (M, L) | materials; wage | as FC-113 |

### Six Sigma and DMAIC

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-138 DMAIC as a kind of change | the project's worth: the measure's gap × its £ (the tool's), before → after | the tool's; I | | |
| FC-139 SIPOC | — | — | | |
| FC-140 VOC to CTQs | — | — | | |
| FC-141 Kano | — | — | | |
| FC-142 Project charter | the charter's "worth" line: the problem's £ a week from the tool that measured it, never typed free | the tool's | | "Measure the problem with its tool to say the worth" |
| FC-143 Pugh matrix | — of its own; each option's cost (I) a typed row | I | option cost | — |
| FC-144 Impact and effort | impact in the problem's £ (the tool's); effort in days × rate (L) | the tool's; L | wage | — |
| FC-145 QFD | — | — | | |

### Root cause and problem solving

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-146 6M | the problem's £ a week from the Pareto, the loss count or the study that made it the head of the fish; **the gap**: a countermeasure's worth = the share of that £ it should remove (BLUEPRINT §6) | the tool's; I | the tool's | "Measure the problem with its tool to say the countermeasure's worth" |
| FC-147 Fishbone with evidence | — of its own; each cause's evidence carries its tool's £ | the tool's | | |
| FC-148 Five whys | — | — | | |
| FC-149 Is / is not | — | — | | |
| FC-150 8D | the problem's £ (as FC-146) and the containment's cost (holds H, sorting L) | the tool's; H, L | | |
| FC-151 A3 | the problem's £ on the left, the countermeasures' worth on the right — as FC-146 | the tool's | | |
| FC-152 Fault tree | — of its own; the top event's cost (D) when known | D | | |
| FC-153 Stratification | the worst stratum's gap × the measure's £ | the tool's | | |
| FC-154 Problems register | **the gap**: a problem's open cost — a stop or slow running it causes (L + T a day, from the loss count or typed minutes), rejects it causes (M), product held (H); summed by line and priority, said beside the priority never as it | L, T, M, H | the problem's minutes a day or packs a day (typed on the problem); the line's model | "Say how many minutes a day this problem costs the line to say it in money" |
| FC-155 Horizontal deployment | the proved fix's £ a week × the lines it is offered to | the tool's | | |

### Yield, give-away and materials

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-156 Give-away in money | built 24 Oct | M | built | built |
| FC-157 The lowest legal fill | the give-away a pack between today's target and the lowest legal one (M) | M | cost a kilo | as FC-091 |
| FC-158 Multihead weigher | the weigher's give-away a shift (M); its rejects by fate | M | cost a kilo; packs a shift | as FC-091 |
| FC-159 Yield and mass balance | kg lost at each stage × that material's £/kg (M); the biggest stage first | M | £/kg by material | "Give £ a kilo for the material to say the yield loss in money" |
| FC-160 Material usage variance | (used − standard) × £ a unit, ingredient and packaging (M) | M | standard usage; £ a unit | as FC-159 |
| FC-161 Food waste by stage | kg × £/kg + disposal £/kg (M, E) | M, E | £/kg; disposal tariff | as FC-159 |

### Packaging, filling and weighing

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-162 Sold by weight (℮) | built with FC-094 — give-away; packs outside T1/T2 as rejects by fate | M | built | built |
| FC-163 Volume packs by weight | as FC-162 through the density | M | cost a kilo | as FC-091 |
| FC-164 Checkweigher verification | — of its own; a failed check's packs since the last good one as M (fate) | M | materials a pack | as FC-088 |
| FC-165 Seal integrity | failed seals' packs as M by fate; a leaker reaching a customer as Q external | M, Q | materials; cost of a complaint | as FC-088 |
| FC-166 Code and label verification | a mislabel's packs as M (rework or waste); a withdrawal at its typed cost (Q) | M, Q | materials; cost of a withdrawal | as FC-088 |
| FC-167 Residual oxygen (MAP) | built with FC-095 — the share outside as rejects by fate; gas use × tariff (E) | M, E | gas tariff | "Give the gas tariff to say the flush in money" |
| FC-232 The inspector's reference test | — (research) | — | | |

### Food safety, hygiene and traceability

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-168 HACCP plan | — of its own (a food-safety plan is not priced); its monitoring minutes as FC-133 | Q (L) | | |
| FC-169 CCP monitoring | a CCP deviation's product held or destroyed (H, M) | H, M | cost a piece; materials | as FC-037 |
| FC-170 Metal detection / X-ray | the test's minutes a shift (appraisal, Q); a failed check's product held back since the last good one (H, M) | Q, H, M | wage; cost a piece | as FC-019 |
| FC-171 Allergen changeover validation | the validation clean's time and swabs (C, Q) — said with SMED's clean | C, Q | the SMED's cost; swab cost | as FC-068 |
| FC-172 Cleaning verification (ATP) | re-cleans: minutes × crew (L) + the line stood (T) + chemicals (E) | L, T, E | wage; chemical cost | as the loss count |
| FC-173 Environmental monitoring | — of its own (a Listeria trend is not priced); a positive's deep clean as FC-172 | L, T, E | | |
| FC-174 Traceability exercise | the exercise's people × hours (L) — a cost said, not a loss | L | wage | as FC-019 |
| FC-175 Shelf-life studies | — (research) | — | | |
| FC-176 Cooling curves | a failed cool's batch destroyed (M) or held (H) | M, H | £/kg; cost a piece | as FC-159 |
| FC-177 Scored audits | the audit's hours (L); findings raise actions whose worth is I | L | wage | as FC-019 |
| FC-178 Hygienic design review | — (research) | — | | |

### Production planning and scheduling

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-179 The week's schedule | the week's changeovers (C) and overtime (L); orders that do not fit (S) | C, L, S | the SMED's cost; wage; contribution | "Time a changeover to say the week's changeovers in money" |
| FC-180 Scheduling rules | each rule's lateness × S, its changeovers × C | S, C | as FC-179 | as FC-179 |
| FC-181 Runners, repeaters, strangers | the strangers' changeovers and stock (C, H) | C, H | as FC-179; cost a piece | as FC-179 |
| FC-182 Batch size (EOQ/EPQ) | the classic sum: set-up (C) + holding (H) at each batch size — the model is the cost | C, H | the SMED's cost; cost a piece; carrying rate | as FC-069 |
| FC-183 Safety stock | the stock's holding (H) against the stock-out's S; the efficient frontier in £ | H, S | cost a unit; carrying rate; contribution | "Give the material's cost and a carrying rate to say the stock in money" |
| FC-184 Crewing a shift | cover and overtime hours × rate (P) | P (L) | wage; overtime premium | "Give the line a wage to say the cover in money" |
| FC-185 Plan attainment | packs short of plan × contribution (S); packs over plan as stock (H) | S, H | contribution; cost a piece | as FC-076 |
| FC-186 Forecast accuracy | the error's stock (H) or stock-out (S) — Factory Physics' VRTD in £ | H, S | as FC-183 | as FC-183 |

### Cost and operational performance

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-187 Cost a pack in labour | built | L | built | built |
| FC-188 What the bottleneck costs | built | T | built | built |
| FC-189 Lost time in money | built | L, T | built | built |
| FC-190 Contribution a pack | built | T | built | built |
| FC-191 Payback and NPV | the saving from the finding's letters; the cost typed; payback and NPV at the business's rate (I) | I | investment; discount rate | "Give the investment's cost to say its payback" |
| FC-192 The case for the change | left out (20 Oct) | — | | |

### Visual and daily management

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-193 The control room | built — the slips in money; a day of every line in margin | T | built | built |
| FC-194 Actions | each action carries its record's £ (the problem's, the countermeasure's) — summed: what the open actions are worth | the records' | | — |
| FC-195 Needs you | — of its own | — | | |
| FC-196 Hour-by-hour board | the hour's packs short × contribution (T) and the stops' labour (L) — the loss count by the hour | L, T | built (the line's model) | as the loss count |
| FC-197 SQDC board | the D and C columns in £ from the day's records (L, T, M) | L, T, M | the records' | the records' |
| FC-198 Tiered daily meeting | the day's £ from the records it reads | the records' | | |
| FC-199 Gemba walk | — | — | | |
| FC-200 Leader standard work | — | — | | |
| FC-201 The team's own weekly number | as FC-117 | the tool's | | |
| FC-202 Line Talk | — of its own; it quotes the tools' money, never computes one | — | | |
| FC-203 Shift handover log | the shift's £ from the loss count and the rejects | L, T, M | the records' | |
| FC-204 Reports on the lean page | built — one cost line per tool, plainly labelled, none of its own | — | | |
| FC-205 Everything to a spreadsheet | the £ columns carried as the screens say them | — | | |
| FC-206 Ask | answers "what does X cost" from the tools' figures, never its own model | — | | |

### Ergonomics, layout and automation

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-207 NIOSH lifting | — of its own; an injury's cost only as the business's typed figure, HSE's estimate said as a reference | P | cost of an injury | "Give the business's cost of an injury to say the risk in money — HSE's published estimate is a reference, not a default" |
| FC-208 HSE MAC | as FC-207 | P | as FC-207 | as FC-207 |
| FC-209 HSE ART | as FC-207 | P | as FC-207 | as FC-207 |
| FC-210 RULA / REBA | as FC-207 | P | as FC-207 | as FC-207 |
| FC-211 Pushing and pulling | as FC-207 | P | as FC-207 | as FC-207 |
| FC-212 Layout and material flow | the from–to distance × moves × a move's minutes × rate (L) — as the spaghetti | L | wage | "Give the line a wage to say the moves in money" |

### Projects and continuous improvement

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-213 Lever tree | the top number's £ by its tool; each lever's share of it | the tool's | | |
| FC-214 Everything inside the project | the project's Actions carry their records' £ (FC-194) | the records' | | |
| FC-215 Critical path and float | a day's float lost → the slip's £ (FC-073) | T | built | built |
| FC-216 Risk register | left out | — | | |
| FC-217 Decision and change log | left out | — | | |
| FC-218 Benefits realised | left out (Rowland, 20 Oct); the before → after of each tool is the benefit, said by that tool | — | | |
| FC-219 Hoshin kanri | — | — | | |
| FC-220 The improvement programme | the proven savings over time — each project's before → after £ as its tools said it, summed; never a typed saving | the tools' | | |
| FC-221 Ideas from the floor | — of its own; an idea's worth when its tool measures it | the tool's | | |

### Skills and training · Energy, water and environment

| Entry | Money today | Causation | Inputs | When missing |
|---|---|---|---|---|
| FC-222 Skills matrix and cover | cover hours where a skill is single-held × rate (P) | P (L) | wage | as FC-184 |
| FC-223 TWI job instruction | the time to standard with and without (FC-027's curve) × rate | P (L) | wage | as FC-027 |
| FC-224 One-point lesson | — | — | | |
| FC-225 SOP with photos | — | — | | |
| FC-226 Energy and water per tonne | kWh and m³ a tonne × tariffs (E); the gap to the best week in £ | E | tariffs | "Give the site's tariffs to say the energy in money" |
| FC-227 Compressed air leak survey | each leak's l/min → kWh a year × £/kWh (E), by the compressor's specific power | E | £/kWh; specific power | as FC-226 |
| FC-228 Waste by stream | kg × (material £/kg + disposal £/kg) (M, E) | M, E | £/kg; disposal tariffs | as FC-159 |
| FC-229 Carbon a pack | — (research); carbon is not money unless a price is typed | — | | |
| FC-230 Assistant-built tools | left out | — | | |

## 5. How a causation is validated and built

- **One module a causation**, in `src/lib/cost.ts` or beside it (`lib/lineLoss`,
  `tools/losses/losses` contributionOf, `cost.inventory-carrying-cost`'s
  arithmetic in `tools/valuestream/steps.ts` flowMoney): pure, tested, the
  sentences in the module, read by the screen, the paper and the acceptance
  script alike. A tool never re-derives a rate.
- **Independent cases first** (`scripts/knowledge/independent-cases.py`): each
  causation has at least one worked case with a known answer from its source
  or by hand — the labour of a shift, a stop at the constraint, give-away a
  week, a queue's carrying cost, a safety stock's holding, a payback — and the
  unit tests use those numbers, never the code's own output.
- **The missing-input sentence is tested** as a case of its own: every input
  absent in turn, the sentence naming it, every other figure still said.
- **Screen and paper together**: a money tile with its "of" and a sentence
  "… because of …" on the tool's lean page, the same two on its paper; the
  acceptance script reads both and compares them with the module.
- **The spec carries the row**: a tool's `knowledge/specs/FC-nnn-*.md` quotes
  its §4 row under *Established · assumed · chosen*, saying which inputs it
  asks for and where they live, and its acceptance criteria include the money
  and the missing-input sentence.

## 6. The order

1. **The gaps in what is built** (`docs/BLUEPRINT.md` §6): the line standard
   (FC-006 — the people placed, a pack: built 24 October), the problems
   register (FC-154 — a problem's open cost), the 6M countermeasure's worth
   (FC-146). Each through the `faultline-tool` skill, one at a time.
2. **The built tools with money partly said**: Reliability (FC-058 — each
   failure's lost minutes in money), the stops' pages where a figure is still
   missing, the stage gate's performance run and climb (FC-076, FC-077 — the
   shortfall in contribution).
3. **Then every tool as it is built**, with its row — the backlog's order
   (`node scripts/catalogue.mjs next`), never a tool started for its money
   alone.

What is here is the model, not a claim: a row says what the tool *will* say
when built by the standard; the catalogue's status and `limits`, and
`docs/BLUEPRINT.md` §6, say what is built today.
