# The eight methods — a project is a method, its tools fill its sections

**Status: the eight methods are agreed (Rowland, 31 October). Their sections and default tools are drafted here for him to approve; the build follows this document, slice by slice (§12). Nothing is built yet.** Written 31 October 2026, after Rowland's words: *"the method equals the project … about six methodologies would be great … then we assign the tools to each of them methods … and then we also know which tools we need to build in which method … a linear pathway into exactly what we are then building."* and *"6M is to be used within the methods, within the PDCA, the DMAIC, 8D."* and *"Kaizen event as the sixth."* and, 31 October, *"Yes, seven plus Theory of Constraints"* (Improvement Kata and Theory of Constraints added)

## 1. What is being agreed

1. **A method is a project.** Starting a project means picking a method. The method decides the project's sections, in order.
2. **There are eight:** PDCA · DMAIC · 8D · A3 · Stage gate · Kaizen event · Improvement Kata · Theory of Constraints.
3. **6M is a tool, not a method.** The fishbone with evidence on each cause, the five whys, and the board of countermeasures are one tool (FC-146–148) that appears in the sections that look for causes (PDCA Plan, DMAIC Analyse, 8D D4, A3 Analysis). A project is no longer “a 6M board”.
4. **Each section has default tools, and any tool can be added to any section.** The default is the mapping below; it is a table, not a template builder.
5. **Stage gate comes back as a method.** Nothing was deleted: the screens, the Commission board, the commissioning papers and the machines are all in the code, switched off from the menus by `src/lib/productStory.ts` (29–30 October). This reverses the 30 October “remove it” for New project; the *Prove* loop (programs and tests on a line) stays what it is.
6. **The methods are fixed and ours.** Rowland, 20 October: the app never builds methods, templates or tools by AI, and the method builder was deleted that day (it had 0 records). This is different: eight methods shipped in code, chosen by the person, their default tools set by us. A seventh method is one more entry in one table.

## 2. The eight at a glance

| Method | The question it answers | Sections | Where it comes from |
|---|---|---|---|
| **PDCA** | How do we improve one number steadily, and prove the change held? | Plan · Do · Check · Act | Shewhart (1939) and Deming (1986; PDSA in 1993) — knowledge record `rca.pdca` |
| **DMAIC** | How do we cut variation or defects with data, with a review before each phase? | Define · Measure · Analyse · Improve · Control | ISO 13053-1:2011 (Six Sigma — DMAIC methodology) — knowledge record `sixsigma.dmaic` |
| **8D** | Something has gone wrong — a complaint or an incident. How do we contain it, find why, and stop it coming back? | D0–D1  Symptom, emergency response, team · D2  Describe the problem · D3  Contain · D4  Root cause and escape point · D5–D6  Corrective action, implemented and validated · D7  Prevent recurrence · D8  Close | Ford TOPS (1987), the automotive practice (AIAG; VDA) — knowledge record `rca.eight-d` (the D0–D8 steps from knowledge, to confirm against the texts) |
| **A3** | How do we put one problem and its solution on one page, agreed with the people who must support it? | Background · Current condition · Target · Analysis · Countermeasures · Plan and follow-up | Sobek & Smalley (2008) Understanding A3 Thinking; Shook (2008) Managing to Learn — knowledge record `rca.a3` (from knowledge, texts not re-read) |
| **Stage gate** | How do we take new equipment from delivery to handover, each gate passed on evidence? | Install · Set up · Commission · Hand over | Faultline’s own, from commissioning practice (docs/STAGEGATE.md, src/lib/planModel.ts); the word “stage gate” and the gate idea from Cooper (2001), who wrote it for product development — knowledge record `commissioning.stage-gate` |
| **Kaizen event** | How do we fix one process in a focused week, and check it a month later? | Prepare · Observe · Improve · Standardise · Sustain | Imai (1986) as the root; the event as practice frames it — knowledge record `lean.kaizen-event` (from knowledge) |
| **Improvement Kata** | How do we improve toward a goal when we do not yet know the way, a small experiment at a time? | Understand the direction · Grasp the current condition · Establish the next target condition · Experiment toward it | Rother (2009) Toyota Kata; Toyota Kata Practice Guide (2018) — knowledge record `lean.toyota-kata` (from knowledge, texts not re-read) |
| **Theory of Constraints** | Where is the one thing that limits the whole line, and how do we get more through it? | Identify the constraint · Exploit it · Subordinate the rest · Elevate it · Go again | Goldratt & Cox (1984) The Goal; Goldratt (1990) What Is This Thing Called Theory of Constraints? — knowledge record `capacity.theory-of-constraints` |

## 3. PDCA

*How do we improve one number steadily, and prove the change held?* — source: Shewhart (1939) and Deming (1986; PDSA in 1993) — knowledge record `rca.pdca`.

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **Plan** | The number, the gap, the cause suspected, the change and the effect expected — written before. Cause by the 6M tool (fishbone, five whys); the number from the tool that measures it. | FC-154 Problems register; FC-125 Defect Pareto; FC-049 Loss count; FC-094 Capability of measured data; FC-146 6M; FC-147 Fishbone with evidence on each cause; FC-148 Five whys; FC-153 Stratification; FC-144 Impact and effort | FC-153 (part-built); FC-144 (NOT BUILT) |
| **Do** | The change made, small first; who does what by when. Actions is the project’s own page; Calculators for the what-if before the trial. | FC-194 Actions; FC-202 Line Talk; FC-235 Calculators | — |
| **Check** | The number again, against before and against the prediction; beyond the noise? Before → after is the check. | FC-105 Before and after; FC-106 Paired comparison; FC-104 How sure; FC-086 Individuals and moving range chart (XmR); FC-094 Capability of measured data | — |
| **Act** | Made the standard, written, trained, offered to the other lines — or planned again. Holding is a control chart on the after period. | FC-007 Standard work combination table; FC-006 Line standard; FC-225 Standard operating procedure with photos; FC-155 Horizontal deployment; FC-013 5S audit with score and trend; FC-086 Individuals and moving range chart (XmR) | FC-225 (NOT BUILT); FC-155 (NOT BUILT) |

## 4. DMAIC

*How do we cut variation or defects with data, with a review before each phase?* — source: ISO 13053-1:2011 (Six Sigma — DMAIC methodology) — knowledge record `sixsigma.dmaic`.

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **Define** | The problem, the customer’s requirement, scope, goal and worth. Charter first; SIPOC scopes; VOC → CTQ sets the limits. | FC-142 Project charter; FC-139 SIPOC; FC-140 Voice of the customer to CTQs; FC-141 Kano analysis; FC-128 Cost of poor quality; FC-191 What an improvement is worth | FC-142 (part-built); FC-139 (NOT BUILT); FC-140 (NOT BUILT); FC-141 (NOT BUILT); FC-128 (NOT BUILT); FC-191 (NOT BUILT) |
| **Measure** | The baseline of the CTQ with its capability, and the gauge proved fit. Gauge R&R before any data is believed. | FC-118 Gauge R&R; FC-119 Type 1 gauge study; FC-120 Bias, linearity and stability of a gauge; FC-124 Defect tally at the line; FC-086 Individuals and moving range chart (XmR); FC-094 Capability of measured data; FC-095 Capability against one limit; FC-098 Reject rate capability; FC-099 Faults per item capability; FC-102 Defects per million and the sigma level | — |
| **Analyse** | Root causes found with data. The 6M tool lives here; stratify and test. | FC-125 Defect Pareto; FC-153 Stratification; FC-146 6M; FC-147 Fishbone with evidence on each cause; FC-148 Five whys; FC-109 Correlation and the scatter; FC-110 What drives it; FC-107 Comparing several groups; FC-105 Before and after; FC-111 Designed experiments; FC-149 Is / is not | FC-153 (part-built); FC-111 (NOT BUILT); FC-149 (NOT BUILT) |
| **Improve** | The solution chosen, piloted and proved on the CTQ. Pugh and impact/effort choose; before → after proves. | FC-143 Pugh matrix; FC-144 Impact and effort; FC-111 Designed experiments; FC-112 Optimising settings; FC-014 Mistake-proofing register and the daily device checks; FC-068 SMED; FC-105 Before and after; FC-191 What an improvement is worth | FC-143 (NOT BUILT); FC-144 (NOT BUILT); FC-111 (NOT BUILT); FC-112 (research first); FC-014 (NOT BUILT); FC-191 (NOT BUILT) |
| **Control** | The gain held: chart, control plan, standard, handover to the process owner. Control chart plus control plan row. | FC-086 Individuals and moving range chart (XmR); FC-087 X̄-R and X̄-S charts for subgroups; FC-088 Reject rate chart; FC-089 Faults per item chart; FC-090 Signals on a chart; FC-101 Capability across products and over time; FC-133 Control plan; FC-132 Process FMEA with action priority; FC-007 Standard work combination table; FC-201 The team’s own weekly number, proved | FC-133 (NOT BUILT); FC-132 (NOT BUILT); FC-201 (part-built) |

## 5. 8D

*Something has gone wrong — a complaint or an incident. How do we contain it, find why, and stop it coming back?* — source: Ford TOPS (1987), the automotive practice (AIAG; VDA) — knowledge record `rca.eight-d` (the D0–D8 steps from knowledge, to confirm against the texts).

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **D0–D1  Symptom, emergency response, team** | What happened, the first response, who is on it. | FC-154 Problems register; FC-134 Complaints per million and their Pareto; FC-194 Actions | FC-134 (NOT BUILT) |
| **D2  Describe the problem** | Is / is not: what, where, when, how much. Is / is not is the heart of D2. | FC-149 Is / is not; FC-124 Defect tally at the line; FC-125 Defect Pareto; FC-153 Stratification | FC-149 (NOT BUILT); FC-153 (part-built) |
| **D3  Contain** | Product held, sorted or reworked; the customer protected; checked that it works. Nonconformance hold is the D3 tool. | FC-135 Product on hold; FC-131 What a sampling plan protects; FC-124 Defect tally at the line | FC-135 (NOT BUILT) |
| **D4  Root cause and escape point** | Why it happened and why it was not caught — verified on and off. Escape point reads the control plan and the FMEA. | FC-146 6M; FC-147 Fishbone with evidence on each cause; FC-148 Five whys; FC-152 Fault tree analysis; FC-153 Stratification; FC-107 Comparing several groups; FC-105 Before and after; FC-132 Process FMEA with action priority; FC-133 Control plan | FC-152 (NOT BUILT); FC-153 (part-built); FC-132 (NOT BUILT); FC-133 (NOT BUILT) |
| **D5–D6  Corrective action, implemented and validated** | The permanent action chosen, put in, proved on the number. | FC-143 Pugh matrix; FC-144 Impact and effort; FC-105 Before and after; FC-094 Capability of measured data; FC-086 Individuals and moving range chart (XmR) | FC-143 (NOT BUILT); FC-144 (NOT BUILT) |
| **D7  Prevent recurrence** | The system changed: FMEA, control plan, standard, the other lines. Horizontal deployment offers the fix to every line. | FC-132 Process FMEA with action priority; FC-133 Control plan; FC-007 Standard work combination table; FC-225 Standard operating procedure with photos; FC-014 Mistake-proofing register and the daily device checks; FC-155 Horizontal deployment | FC-132 (NOT BUILT); FC-133 (NOT BUILT); FC-225 (NOT BUILT); FC-014 (NOT BUILT); FC-155 (NOT BUILT) |
| **D8  Close** | Evidence for each discipline; the team recognised; the report sent. The 8D report is the paper. | FC-150 8D report; FC-194 Actions | FC-150 (NOT BUILT) |

## 6. A3

*How do we put one problem and its solution on one page, agreed with the people who must support it?* — source: Sobek & Smalley (2008) Understanding A3 Thinking; Shook (2008) Managing to Learn — knowledge record `rca.a3` (from knowledge, texts not re-read).

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **Background** | Why it matters: the gap in the business’s number, and what it costs. | FC-154 Problems register; FC-187 Cost a pack in labour; FC-189 Lost time in money; FC-128 Cost of poor quality | FC-128 (NOT BUILT) |
| **Current condition** | The facts drawn, with the number. Chart, Pareto or map — whichever shows the number. | FC-125 Defect Pareto; FC-001 Value stream map; FC-049 Loss count; FC-086 Individuals and moving range chart (XmR); FC-094 Capability of measured data; FC-124 Defect tally at the line | — |
| **Target** | The number wanted, by when. | FC-201 The team’s own weekly number, proved; FC-034 Line capacity; FC-117 The team’s own weekly number, trended | FC-201 (part-built); FC-117 (part-built) |
| **Analysis** | The root cause, with the evidence. | FC-146 6M; FC-147 Fishbone with evidence on each cause; FC-148 Five whys; FC-152 Fault tree analysis; FC-153 Stratification; FC-149 Is / is not | FC-152 (NOT BUILT); FC-153 (part-built); FC-149 (NOT BUILT) |
| **Countermeasures** | What, who, by when, against which cause. | FC-194 Actions; FC-144 Impact and effort; FC-143 Pugh matrix | FC-144 (NOT BUILT); FC-143 (NOT BUILT) |
| **Plan and follow-up** | The steps; then the number checked, and whether it held. The A3 paper is FC-151. | FC-194 Actions; FC-105 Before and after; FC-086 Individuals and moving range chart (XmR); FC-201 The team’s own weekly number, proved | FC-201 (part-built) |

## 7. Stage gate

*How do we take new equipment from delivery to handover, each gate passed on evidence?* — source: Faultline’s own, from commissioning practice (docs/STAGEGATE.md, src/lib/planModel.ts); the word “stage gate” and the gate idea from Cooper (2001), who wrote it for product development — knowledge record `commissioning.stage-gate`.

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **Install** | The machines on site, their stages and parts; what is late. Machines and materials; critical path is not built. | FC-079 Materials and parts on site; FC-215 Critical path and float in a project plan | FC-215 (NOT BUILT) |
| **Set up** | Programs loaded, the people ready, the standards written. Readiness is partly built; skills and SOP are not. | FC-075 Program and recipe proving; FC-082 Operational readiness; FC-225 Standard operating procedure with photos; FC-222 Skills matrix and cover; FC-223 TWI job instruction; FC-178 Hygienic design review of new equipment | FC-082 (part-built); FC-225 (NOT BUILT); FC-222 (NOT BUILT); FC-223 (NOT BUILT); FC-178 (research first) |
| **Commission** | Tests against what was agreed; the run at rate; the climb; capability; the filmed walk. This is the Prove loop: programs and tests on the line. | FC-074 Acceptance tests with what was agreed; FC-075 Program and recipe proving; FC-076 Performance run at the agreed rate; FC-077 The climb to rate; FC-083 Held at a rate for a time; FC-084 Machine capability for acceptance (Cm, Cmk); FC-061 Reliability growth during commissioning (Crow–AMSAA); FC-118 Gauge R&R; FC-164 Checkweigher verification; FC-165 Seal integrity tests; FC-170 Metal detection and X-ray verification; FC-081 The filmed walk and its problems; FC-085 Line acceptance on the EN 415-11 time model | FC-085 (research first) |
| **Hand over** | Sign-off, spares, maintenance, what is still owed. The pace forecast says when. | FC-080 Handover and sign-off; FC-078 The pace says when; FC-066 Critical spares; FC-063 Planned maintenance; FC-062 Autonomous maintenance; FC-064 Equipment criticality ranking; FC-082 Operational readiness | FC-082 (part-built) |

## 8. Kaizen event

*How do we fix one process in a focused week, and check it a month later?* — source: Imai (1986) as the root; the event as practice frames it — knowledge record `lean.kaizen-event` (from knowledge).

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **Prepare** | The charter, the team, the baseline. | FC-142 Project charter; FC-001 Value stream map; FC-019 Stopwatch time study; FC-051 Stops timed at the machine | FC-142 (part-built) |
| **Observe** | The waste seen on the floor. Spaghetti and flow chart are not built. | FC-005 Waste walk; FC-004 Spaghetti diagram; FC-003 Process flow chart; FC-022 Work sampling; FC-021 Video time study; FC-199 Gemba walk | FC-005 (part-built); FC-004 (NOT BUILT); FC-003 (NOT BUILT); FC-021 (part-built); FC-199 (part-built) |
| **Improve** | Changes tried in the week and measured. ECRS, SMED, 5S, line balance. | FC-028 ECRS on the elements; FC-068 SMED; FC-013 5S audit with score and trend; FC-014 Mistake-proofing register and the daily device checks; FC-032 Line balance; FC-144 Impact and effort; FC-105 Before and after | FC-014 (NOT BUILT); FC-144 (NOT BUILT) |
| **Standardise** | The new way written and the people trained. | FC-007 Standard work combination table; FC-006 Line standard; FC-225 Standard operating procedure with photos; FC-224 One-point lesson; FC-223 TWI job instruction | FC-225 (NOT BUILT); FC-224 (part-built); FC-223 (NOT BUILT) |
| **Sustain** | Open actions to the 30-day check; the gain still holding? The 30-day check is the point of the method. | FC-194 Actions; FC-201 The team’s own weekly number, proved; FC-086 Individuals and moving range chart (XmR); FC-013 5S audit with score and trend | FC-201 (part-built) |

## 9. Improvement Kata

*How do we improve toward a goal when we do not yet know the way, a small experiment at a time?* — source: Rother (2009) Toyota Kata; Toyota Kata Practice Guide (2018) — knowledge record `lean.toyota-kata` (from knowledge, texts not re-read).

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **Understand the direction** | The challenge: a measurable aim months out, and why it matters. The challenge comes from the line or the factory’s aim. | FC-201 The team’s own weekly number, proved; FC-034 Line capacity; FC-154 Problems register | FC-201 (part-built) |
| **Grasp the current condition** | The process measured as it is — its pattern, not its average. Run chart and block diagram of how it runs today. | FC-001 Value stream map; FC-019 Stopwatch time study; FC-049 Loss count; FC-052 Stops Pareto; FC-086 Individuals and moving range chart (XmR); FC-094 Capability of measured data; FC-022 Work sampling; FC-006 Line standard | — |
| **Establish the next target condition** | A described state of the process, with a date a few weeks away — not a solution. Standard work, takt and the line standard describe the state. | FC-007 Standard work combination table; FC-008 Takt time and the planned cycle time; FC-006 Line standard; FC-036 What-ifs and the way to the target; FC-235 Calculators; FC-201 The team’s own weekly number, proved | FC-201 (part-built) |
| **Experiment toward it** | One small step at a time, each a written prediction, a result and a lesson; the five coaching questions daily. Gemba walk and the tiered meeting are the coaching routine. | FC-194 Actions; FC-199 Gemba walk; FC-198 Tiered daily meeting; FC-105 Before and after; FC-086 Individuals and moving range chart (XmR); FC-068 SMED; FC-013 5S audit with score and trend; FC-202 Line Talk | FC-199 (part-built); FC-198 (part-built) |

## 10. Theory of Constraints

*Where is the one thing that limits the whole line, and how do we get more through it?* — source: Goldratt & Cox (1984) The Goal; Goldratt (1990) What Is This Thing Called Theory of Constraints? — knowledge record `capacity.theory-of-constraints`.

| Section | What happens here | Tools (catalogue) | Not built or part-built here |
|---|---|---|---|
| **Identify the constraint** | Which station or machine limits the output, and is it real or a mirage? The V-curve and the bottleneck walk already do this. | FC-034 Line capacity; FC-037 The bottleneck walk; FC-038 The constraint and the mirage; FC-032 Line balance; FC-041 Capacity’s three numbers; FC-040 Load against demand; FC-044 WIP and lead time; FC-046 Accumulation between machines | FC-041 (part-built); FC-046 (part-built) |
| **Exploit it** | Lose nothing at the constraint: its stops, its speed, its changeovers, its idle time. A minute lost here is lost for the whole line. | FC-049 Loss count; FC-051 Stops timed at the machine; FC-052 Stops Pareto; FC-056 Speed loss; FC-068 SMED; FC-042 Product mix at the constraint; FC-039 Recovery levers; FC-188 What the bottleneck costs | FC-056 (part-built); FC-042 (part-built); FC-039 (part-built) |
| **Subordinate the rest** | Everything else works to the constraint’s pace: buffers, schedule, pull. Drum–buffer–rope is the formal way. | FC-043 Drum–buffer–rope and buffer management; FC-009 Kanban sizing; FC-179 The week’s schedule against capacity, with changeovers; FC-045 Utilisation and variability; FC-046 Accumulation between machines; FC-036 What-ifs and the way to the target | FC-043 (NOT BUILT); FC-179 (NOT BUILT); FC-045 (NOT BUILT); FC-046 (part-built) |
| **Elevate it** | Only now spend: more people, more capacity, a faster machine — with the worth. What-ifs show the way to the target; payback shows the worth. | FC-036 What-ifs and the way to the target; FC-031 People needed at a station; FC-189 Lost time in money; FC-190 Contribution a pack; FC-191 What an improvement is worth; FC-039 Recovery levers | FC-191 (NOT BUILT); FC-039 (part-built) |
| **Go again** | The constraint has moved: find it, do not let inertia become the new constraint. Repeat the first step on the new constraint. | FC-034 Line capacity; FC-086 Individuals and moving range chart (XmR); FC-201 The team’s own weekly number, proved; FC-105 Before and after | FC-201 (part-built) |

## 11. The pathway: what to build, in the order the methods need it

Every tool above that is not yet built, ordered by how many of the eight methods use it (then by number). This replaces the wave order of `docs/TOOLS-BUILD.md` for the tools it names; the waves stay the way to build them (specification first, by the `faultline-tool` standard).

**When a method needs a tool that no software of that name quite offers (an SOP, a SIPOC, a control plan):** build it if its output is computed, read by other parts of the app (Actions, reports, money, the control room), or a deliverable the method requires and would otherwise have nowhere to live. Otherwise the section accepts an Action or an attached file as its output and no tool is built. Most are a definition in a shape the app already has — a scored register, a check log, a calculator, a document — not a new page. Each is still held to `knowledge/STANDARD.md`.

| Used by | Tool | Status | How it would be built | Methods |
|---|---|---|---|---|
| 5 | FC-144 Impact and effort — which countermeasure first | NOT BUILT | scored register — scored-shape definition (impact × effort) | 8D, A3, DMAIC, Kaizen event, PDCA |
| 5 | FC-201 The team’s own weekly number, proved | part-built | part-built — finish | A3, DMAIC, Improvement Kata, Kaizen event, Theory of Constraints |
| 4 | FC-153 Stratification — split the data to find where it lives | part-built | calculation — an analysis question (stratify, then test) | 8D, A3, DMAIC, PDCA |
| 4 | FC-225 Standard operating procedure with photos | NOT BUILT | document — steps with photos, versioned, with a paper | 8D, Kaizen event, PDCA, Stage gate |
| 3 | FC-014 Mistake-proofing register and the daily device checks | NOT BUILT | register + log — check-log shape (device checks) | 8D, DMAIC, Kaizen event |
| 3 | FC-143 Pugh matrix — choosing between solutions | NOT BUILT | scored register — scored-shape definition (Pugh) | 8D, A3, DMAIC |
| 3 | FC-149 Is / is not — specifying the problem | NOT BUILT | document — a two-column form that feeds the problem | 8D, A3, DMAIC |
| 2 | FC-128 Cost of poor quality | NOT BUILT | calculation — a calculator definition (calc shape) on the cost model | A3, DMAIC |
| 2 | FC-132 Process FMEA with action priority | NOT BUILT | scored register — scored-shape definition (severity, occurrence, detection → action priority) | 8D, DMAIC |
| 2 | FC-133 Control plan — what is checked, how, how often, and what if  | NOT BUILT | register — a list per check (what, how, how often, reaction) feeding the check logs | 8D, DMAIC |
| 2 | FC-142 Project charter — problem, goal, scope, team, worth | part-built | document — part-built; the charter form | DMAIC, Kaizen event |
| 2 | FC-152 Fault tree analysis | NOT BUILT | document — a tree drawn from the whys | 8D, A3 |
| 2 | FC-155 Horizontal deployment — a proved fix offered to every line w | NOT BUILT | workflow — offer a proved fix to the other lines | 8D, PDCA |
| 2 | FC-191 What an improvement is worth — payback and NPV | NOT BUILT | calculation — a calculator definition (payback, NPV) | DMAIC, Theory of Constraints |
| 2 | FC-199 Gemba walk — and how fresh the looking is | part-built | part-built — finish | Improvement Kata, Kaizen event |
| 2 | FC-223 TWI job instruction — the breakdown and four-step teaching | NOT BUILT | document — a breakdown and four-step sheet | Kaizen event, Stage gate |
| 1 | FC-003 Process flow chart — operation, transport, inspection, delay | NOT BUILT | document — a drawn chart | Kaizen event |
| 1 | FC-004 Spaghetti diagram — walking and transport distance | NOT BUILT | document — a drawn plan with distances (calc inside) | Kaizen event |
| 1 | FC-005 Waste walk — the eight wastes seen, classed and costed | part-built | part-built — finish | Kaizen event |
| 1 | FC-021 Video time study — the work read from footage | part-built | part-built — camera study | Kaizen event |
| 1 | FC-039 Recovery levers — what taking a share off the top losses buy | part-built | ? | Theory of Constraints |
| 1 | FC-041 Capacity’s three numbers — design, effective, actual | part-built | ? | Theory of Constraints |
| 1 | FC-042 Product mix at the constraint — throughput per constraint mi | part-built | ? | Theory of Constraints |
| 1 | FC-043 Drum–buffer–rope and buffer management | NOT BUILT | ? | Theory of Constraints |
| 1 | FC-045 Utilisation and variability — why queues explode | NOT BUILT | ? | Theory of Constraints |
| 1 | FC-046 Accumulation between machines — buffer minutes and recovery | part-built | ? | Theory of Constraints |
| 1 | FC-056 Speed loss — running against ideal speed | part-built | ? | Theory of Constraints |
| 1 | FC-082 Operational readiness — people, standards, spares, food safe | part-built | part-built — finish | Stage gate |
| 1 | FC-085 Line acceptance on the EN 415-11 time model | research first | research first | Stage gate |
| 1 | FC-111 Designed experiments — two-level factorials | NOT BUILT | calculation — new analysis (two-level factorials) | DMAIC |
| 1 | FC-112 Optimising settings — response surface | research first | research first | DMAIC |
| 1 | FC-117 The team’s own weekly number, trended | part-built | part-built — finish | A3 |
| 1 | FC-134 Complaints per million and their Pareto | NOT BUILT | calculation — rate + Pareto on the defect tally | 8D |
| 1 | FC-135 Product on hold — non-conformance and release | NOT BUILT | register + workflow — a hold, its release, who signed | 8D |
| 1 | FC-139 SIPOC — the scope on one page | NOT BUILT | document — a one-page form | DMAIC |
| 1 | FC-140 Voice of the customer to CTQs | NOT BUILT | document — a table that sets the limits a tool then uses | DMAIC |
| 1 | FC-141 Kano analysis | NOT BUILT | document — a table with a chart | DMAIC |
| 1 | FC-150 8D report | NOT BUILT | paper — the report assembled from the method’s own sections | 8D |
| 1 | FC-178 Hygienic design review of new equipment | research first | research first | Stage gate |
| 1 | FC-179 The week’s schedule against capacity, with changeovers | NOT BUILT | ? | Theory of Constraints |
| 1 | FC-198 Tiered daily meeting — the day’s update and its paper | part-built | ? | Improvement Kata |
| 1 | FC-215 Critical path and float in a project plan | NOT BUILT | calculation — critical path and float | Stage gate |
| 1 | FC-222 Skills matrix and cover | NOT BUILT | register — a matrix people × skills | Stage gate |
| 1 | FC-224 One-point lesson | part-built | document — one page | Kaizen event |

**In all:** 117 catalogue tools are placed in the eight methods; 73 are built, 15 part-built, 26 not built, 3 need research first. Of the catalogue's 69 unbuilt tools, 26 are needed by a method; the rest are not on any method's path and wait.

Tools left out on purpose are not mapped as defaults (FC-050 OEE, FC-216 risk register, FC-217 decision log, FC-218 benefits realised, FC-192 the case for the change, FC-230 builders by assistant); any of the built ones can still be added to a section by hand.

## 12. What this changes in the app — when Rowland says go

- **New project** offers the eight methods, each with its question and its sections (the *Start from a problem* list on Tools stays a way in to a tool).
- **A project's page** shows its sections in order. Each section lists its tools with their state (not started · under way · done), reads the records already made, and has *Add a tool*.
- **A tool made inside a section lands in the project** (the rule since 21 October); the section it sits in is a mapping, and only a tool added to a different section than its default is recorded.
- **Sections are lit by evidence, not locked.** DMAIC's tollgates and 8D's disciplines can ask for a sign-off by name and date — the sign-off already exists for programs — but nothing blocks the work.
- **Actions, Journey, Problems, the reports and money** are unchanged; they are the project's, whatever the method.
- **Existing 6M projects** keep opening exactly as they do (their records are not rewritten). What they are called afterwards is a decision below.
- **Record:** a project gains one field, its method. Today it is two booleans (`leverTree`, `commissioning`; `src/lib/planModel.ts`), chosen to avoid a migration; eight methods need a `method` column — a database change that goes through `apply_migration` and the schema test, with its read-back. That is for the build, not this document.
- **Papers:** each method's paper is the one that already exists or is listed above (the 8D report FC-150, the A3 FC-151, the stage gate's status and programs reports, the 6M tool's report inside the others). None is built by this document.

**The slices** (each live on its own, each through the gate):

| Slice | What | Changes |
|---|---|---|
| **M0** | This document in the repo; `DIRECTION.md`, `CLAUDE.md`, `BLUEPRINT.md` say a project is a method | words only |
| **M1** | The eight methods as data — `src/lib/methods.ts`: question, sections in order, default tools by catalogue number; tests that every tool named exists | nothing a person sees |
| **M2** | `projects.method` — migration `supabase/PROJECT_METHOD.sql` through `apply_migration`, read back; mapper, schema test; existing projects map from their model | the record |
| **M3** | New project offers the eight; a project's page shows its sections with their tools and *Add a tool* | New project, the project page |
| **M4** | Stage gate's doors (Commission, the commissioning papers, handover, install screens) back for projects of that method | menus, Reports |
| **M5** | The tools of §11, in that order, each through the `faultline-tool` standard | the tools |

## 13. Decisions — taken on Rowland’s “build methods first” (31 October) unless he says otherwise

1. **The eight, and the sections** in §3–§10 — right? Sections are taken from the knowledge records; two things are marked to confirm in them (8D's D0–D8 against the VDA/AIAG texts; A3's seven blocks against Shook and Sobek & Smalley, which were not re-read).
2. **Existing 6M projects** — keep opening as they do under a quiet name (“Performance (6M)”, no longer offered to new projects), or move them under A3 or PDCA, whose shape is closest? I recommend keeping them as they are.
3. **The lever tree** (parked since 29 October) is not one of the eight. Keep it parked, or make it a tool (a number worked down to what must be true) that any method can use? I recommend a tool.
4. **Stage gate returns** — which of the switched-off doors come back with it: Commission, the commissioning report and cards, the handover report, the install screens? I recommend all four, as the stage-gate method's own pages (`productStory.ts` flags turned on for projects of that method only).
5. **Where Prove sits** — programs and tests on a line are today the line's, and Stage gate's Commission section is built on them. Any method's Check or Improve step can also *prove against the agreed criteria* and sign off. I recommend Prove stays a tool every method can add.

## 14. Sources, and what is not checked

Method sections come from the knowledge records in `knowledge/methods/` (rca/pdca, sixsigma/dmaic, rca/eight-d, rca/a3, commissioning/stage-gate, lean/kaizen-event, lean/toyota-kata, capacity/theory-of-constraints); each carries its own `checked` line. DMAIC's phases are checked against ISO 13053-1:2011 (confirmed online on 22 October). The others are from knowledge and are marked so; none has been checked against the original texts. Nothing here invents a section: if a record and a book disagree, the record is corrected first.
