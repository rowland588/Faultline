# The catalogue, summed up

Worked out from `src/catalogue/` by `node scripts/catalogue.mjs summary --write` — never typed. The catalogue test fails when this file is stale.

**234 entries** across 23 disciplines, behind them **179 method records** (`knowledge/methods/`) and **22 problem routes**.

| Status | Entries |
|---|---|
| Available (`available`) | 83 |
| Partly (`partial`) | 27 |
| Planned (`specified`) | 0 |
| Not built yet (`to-build`) | 105 |
| Research first (`research`) | 12 |
| Left out on purpose (`left-out`) | 7 |

## By discipline

| Discipline | Entries | Available | Partly | Planned | Not built yet | Research first | Left out on purpose |
|---|---|---|---|---|---|---|---|
| Lean manufacturing and waste | 18 | 3 | 3 |  | 11 | 1 |  |
| Industrial engineering and work measurement | 14 | 3 | 3 |  | 7 | 1 |  |
| Capacity, throughput and bottlenecks | 17 | 7 | 5 |  | 4 | 1 |  |
| Equipment performance and losses | 10 | 5 | 2 |  | 1 |  | 2 |
| Maintenance, reliability and TPM | 11 | 1 |  |  | 9 | 1 |  |
| Changeovers | 5 | 1 | 2 |  | 2 |  |  |
| Commissioning and operational readiness | 13 | 11 | 1 |  |  | 1 |  |
| Statistical process control and capability | 17 | 16 |  |  | 1 |  |  |
| Statistical analysis | 15 | 10 | 1 |  | 3 | 1 |  |
| Measurement systems | 6 |  |  |  | 6 |  |  |
| Quality engineering and defects | 14 | 2 |  |  | 10 | 2 |  |
| Six Sigma and DMAIC | 8 |  | 2 |  | 6 |  |  |
| Root cause and problem solving | 10 | 4 | 2 |  | 4 |  |  |
| Yield, give-away and materials | 6 | 3 |  |  | 3 |  |  |
| Packaging, filling and weighing | 7 | 4 |  |  | 2 | 1 |  |
| Food safety, hygiene and traceability | 11 | 1 |  |  | 8 | 2 |  |
| Production planning and scheduling | 8 |  |  |  | 8 |  |  |
| Cost and operational performance | 6 | 4 |  |  | 1 |  | 1 |
| Visual and daily management | 14 | 7 | 3 |  | 4 |  |  |
| Ergonomics, layout and automation | 6 |  | 1 |  | 5 |  |  |
| Projects and continuous improvement | 10 | 1 | 1 |  | 4 |  | 4 |
| Skills and training | 4 |  | 1 |  | 3 |  |  |
| Energy, water and environment | 4 |  |  |  | 3 | 1 |  |

## By subdiscipline

- **Lean manufacturing and waste** — Value stream and flow 4 · Waste 2 · Standard work 2 · Pull and levelling 4 · 5S and the visual workplace 1 · Mistake-proofing 2 · Improvement events and kata 3
- **Industrial engineering and work measurement** — Time study 3 · Predetermined motion times 1 · Work sampling 1 · Labour standards and allowances 3 · Method study 3 · Labour productivity 3
- **Capacity, throughput and bottlenecks** — Line capacity 4 · Line balance 2 · Constraints (TOC) 5 · Queues, WIP and buffers 4 · Load against demand 2
- **Equipment performance and losses** — The time model and losses 2 · Stops and downtime 5 · Speed and short stops 2 · Losses in money 1
- **Maintenance, reliability and TPM** — Reliability statistics 3 · Maintainability 1 · TPM routines 2 · Maintenance strategy 4 · Spares 1
- **Changeovers** — SMED 2 · Sequence and interval 2 · Start-up and release 1
- **Commissioning and operational readiness** — The stage gate 1 · Acceptance testing 6 · Ramp-up 2 · Readiness and handover 4
- **Statistical process control and capability** — Control charts 5 · Signals and small shifts 3 · Capability — measured data 4 · Capability — counted data 4 · Before capability 1
- **Statistical analysis** — Describing data 3 · Confidence intervals 1 · Comparing and testing 4 · Relationships and regression 3 · Designed experiments 2 · Sample size and data 2
- **Measurement systems** — Gauge studies 3 · Inspectors agreeing 1 · Calibration and uncertainty 2
- **Quality engineering and defects** — Defect analysis 4 · Sampling inspection 3 · Cost of quality 1 · Risk and control 2 · Complaints and suppliers 3 · Product checks 1
- **Six Sigma and DMAIC** — Define 5 · The DMAIC structure 1 · Choosing solutions 2
- **Root cause and problem solving** — Finding causes 4 · Structured problem solving 5 · Spreading a fix 1
- **Yield, give-away and materials** — Give-away and fill 3 · Yield and mass balance 2 · Material and food waste 1
- **Packaging, filling and weighing** — Weights and measures 4 · Seals and packs 1 · Codes and labels 1 · Pack atmosphere 1
- **Food safety, hygiene and traceability** — HACCP and CCPs 2 · Foreign bodies 1 · Allergens 1 · Cleaning and hygiene 3 · Traceability 1 · Shelf life and temperature 2 · Audits 1
- **Production planning and scheduling** — Scheduling 3 · Batches and stock 2 · Crewing and shifts 1 · Plan and attainment 2
- **Cost and operational performance** — Cost a pack 2 · Losses in money 2 · Investment and payback 2
- **Visual and daily management** — Am I in control 2 · Daily management 4 · Gemba 2 · Measures and KPIs 2 · Talk and reports 4
- **Ergonomics, layout and automation** — Manual handling 3 · Posture and repetition 2 · Layout and material flow 1
- **Projects and continuous improvement** — The three kinds of change 1 · Running a project 5 · The improvement programme 4
- **Skills and training** — Skills 1 · Instruction 3
- **Energy, water and environment** — Utilities 2 · Waste and carbon 2

## By the shape it takes

- a tool of its own: 72
- a mode of another tool: 68
- a part several tools share: 40
- a way through several tools: 8
- a report or board: 34
- decided after research: 12

## Research first

- FC-018 Lean maturity assessment — Models differ and are often proprietary.
- FC-023 Predetermined motion times — MTM and MOST — The tables are licensed and need certified analysts.
- FC-047 Line simulation — stops, buffers and output — Needs repair times measured first, and must stay simple.
- FC-065 Reliability-centred maintenance — Heavy; for the critical few.
- FC-085 Line acceptance on the EN 415-11 time model — A common language with OEMs — once the standard’s text is read.
- FC-112 Optimising settings — response surface — Specialist; after a factorial.
- FC-129 Acceptance sampling by attributes — AQL plans — The ISO tables are copyright — research how to offer plans honestly.
- FC-130 Acceptance sampling by variables — Needs the standard’s tables.
- FC-175 Shelf-life studies — Microbiological design is specialist.
- FC-178 Hygienic design review of new equipment — Cheapest fixed before handover — guidance to read first.
- FC-229 Carbon a pack — Factors and scopes need research.
- FC-232 The inspector’s reference test on a batch (℮) — Needs the schedules read before it can be said honestly.

## Left out on purpose

- FC-050 OEE, OOE and TEEP as figures — Rowland, 10 October: "We will not have Internet of anything ... there is no OEE (typed by hand, its availability is a guess)" — docs/LEAN40.md.
- FC-192 The case for the change — what a project is worth — Rowland, 17 October: "This is a tool for a one man consultant — if we do all 6 it becomes a full business tool, so don't do any of them" — built and taken off the same evening (docs/BLUEPRINT.md §6; docs/CASE.md keeps the design).
- FC-216 Risk register — Rowland, 17 October: "This is a tool for a one man consultant — if we do all 6 it becomes a full business tool, so don't do any of them" — the issue and risk logs are the Problems register and its Critical (docs/BLUEPRINT.md §6).
- FC-217 Decision and change log — Rowland, 17 October — one of the six project-management pieces declined (docs/BLUEPRINT.md §6, item 13).
- FC-218 Benefits realised — what a change was worth — Rowland, 17 October — declined with the business case (docs/BLUEPRINT.md §6, item 12).
- FC-230 Methods, templates or tools built by an assistant — Rowland, 20 October: "the AI itself is just not required ... the whole AI thing coming in at the moment and build your own is pointless" — the builder deleted the same day; the only AI is the voice and the camera (docs/DIRECTION.md). A need with no tool is built as a tool through knowledge/STANDARD.md.
- FC-231 Machine data, sensors and IoT feeds — Rowland, 10 October: "We will not have Internet of anything. This is about manual inputs. This is about industrial engineering." — CLAUDE.md.

## The backlog — what to build first (`src/catalogue/backlog.ts`)

1. FC-059 Repair times — MTTR and availability (Not built yet) — Repair times on the reliability study — the other half of a machine’s reliability.
2. FC-019 Stopwatch time study — rated, allowed, standard time (Partly) — Ask the rating on the line balance — the arithmetic is already there.
3. FC-119 Type 1 gauge study — one reference measured again and again (Not built yet) — A type 1 gauge study for checkweighers — quick, and decides whether weights can be trusted.
4. FC-155 Horizontal deployment — a proved fix offered to every line with the same machine (Not built yet) — Horizontal deployment — the factory already knows every line’s machines.
5. FC-071 First-off release at changeover — line clearance and the first good pack (Not built yet) — First-off release at changeover — recall risk and hidden changeover time.
6. FC-070 Changeover sequence — allergens, colours and flavours in the right order (Not built yet) — Changeover sequence with allergen rules — food’s changeover saving.
7. FC-207 NIOSH lifting equation (Partly) — Put the NIOSH arithmetic on a screen — built and proved, unreachable.

## Where related capabilities could be combined

- FC-094 Capability of measured data — between two limits — 15 modes inside it
- FC-073 The stage gate — new equipment to handover — 9 modes inside it
- FC-105 Before and after — did it move, for a reason — 7 modes inside it
- FC-001 Value stream map — current and future state — 6 modes inside it
- FC-032 Line balance — each person’s work against takt (Yamazumi) — 4 modes inside it
- FC-034 Line capacity — the capacity sheet, the V-curve and the bottleneck — 4 modes inside it
- FC-086 Individuals and moving range chart (XmR) — 4 modes inside it
- FC-058 Reliability — MTBF and failure rate, several things counted at once — 3 modes inside it
- FC-098 Reject rate capability — rejects out of what was made — 3 modes inside it
- FC-146 6M — a running line made to perform better — 3 modes inside it
- FC-068 SMED — a changeover timed, separated and cut down — 2 modes inside it
- FC-006 Line standard — who stands where, product by product — 1 modes inside it
- FC-081 The filmed walk and its problems — the punch list — 1 modes inside it
- FC-022 Work sampling — what people are doing at random moments — 1 modes inside it
- FC-049 Loss count — a shift’s time model and the waterfall — 1 modes inside it
- FC-099 Faults per item capability — defects per unit and per million — 1 modes inside it
- FC-119 Type 1 gauge study — one reference measured again and again — 1 modes inside it
- FC-124 Defect tally at the line — a check sheet by type — 1 modes inside it
- FC-021 Video time study — the work read from footage — 1 modes inside it
- FC-062 Autonomous maintenance — CILT checks and abnormality tags — 1 modes inside it
