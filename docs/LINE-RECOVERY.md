# Line recovery program — 25 November 2026

## The job

A business asks Rowland to improve one underperforming line, or three. Start one recovery project per line when each needs its own work and report. The projects appear together in the client's Factory control room, including when the lines share a site. The lines and their capacity, losses and problems remain shared factory records; each project holds its own selected improvement work and actions. If the engagement genuinely needs one combined project report, the form also allows several lines in one project. No copy of a line or duplicate action tracker is needed.

The front door is **Projects → Start line recovery**. Choosing a factory line creates a real **DMAIC project** (`method: dmaic`, `programKey: line-recovery`). DMAIC is the recognized structure for improving an existing process that misses performance requirements: ISO 13053-1:2011 describes its phases, and ASQ explains its use for such processes. The project's main screen is **DMAIC**: Define, Measure, Analyse, Improve and Control each hold the practical actions and links to the same underlying records. The top project navigation is DMAIC, Reports and More; the generic stage-gate Program tab is not part of recovery. Detailed phase reviews and the wider tool catalogue remain secondary. **Customer report** opens the whole project's preview and PDF; **DMAIC project evidence** opens the phase, charter and tool detail report. A several-line project also offers a report for the selected line. From the DMAIC screen, **Start another line recovery at [site]** offers the other lines for the same client and site and preselects the next one. Theory of Constraints remains useful within diagnosis when a single throughput constraint is confirmed, rather than an assumption made when starting the project.

Sources: [ISO 13053-1:2011](https://www.iso.org/standard/52901.html); [ASQ DMAIC](https://asq.org/quality-resources/dmaic). This is a Faultline line recovery application of DMAIC, not a claim of ISO certification.

## The work, in a useful order rather than a lock

| DMAIC phase · step | Question and output | Existing place |
| --- | --- | --- |
| Define · 1. Agree the gap | What should the line make, what does it make, and over what period? A named measure, target and current reading. | Project measures and line setup |
| Define · 2. Record the problems | What do operators see going wrong, and where? Problems with place and evidence, without a guessed cause. | Problems (FC-154), line walk |
| Measure · 3. Measure the line | What can the line make and where does measured capacity limit output? | Line capacity (FC-034) |
| Measure · 4. Count the losses | Where do the lost minutes, rejects and slow running sit? A shift loss count and ranked stop reasons. | Loss count (FC-049), Stops Pareto (FC-052) |
| Analyse · 5. Prove causes | Why do the largest losses occur? A 6M cause with observed or measured evidence, not a brainstorm treated as fact. | 6M (FC-146) |
| Improve · 6. Make changes | What will be tried, by whom and by when? Actions linked to their verified cause and evidence. | Actions (FC-194) |
| Control · 7. Check and hold | Did the same measure move beyond noise, and does it hold? Before/after comparison, weekly number/control chart, standard, line report and DMAIC project report. | Analysis (FC-105), Control chart (FC-086), project report |

Every step is optional when it is not relevant. One can return to a prior step; no fabricated completion ticks. The selected line changes the context of line-based tools; the project phase workspace places relevant tools under its DMAIC phases. A single-line project's work and report remain separate from another line's; both feed the same client control room. All figures and reports remain those of their existing records and formulas.

## Tool gap review

The core first-engagement tools exist and are openable. A new calculator would duplicate existing capacity, losses, Problems and Actions surfaces. The gap was the **DMAIC project path** and its line context transfer. The `program_key` column keeps the prepared recovery pack across devices alongside `method: dmaic`. Machine Programs are reached from their line only when a finding calls for a settings trial; they are not a compulsory recovery phase. Future checks should ask whether linked line capacity, loss counts, problems and action outcomes can be summarized together without re-entry, and whether a multi-line customer report can compare each line with its distinct denominator. Do not call that combined comparison built until it is.

## Acceptance

Projects offers a direct line-recovery start and requires a factory line. One line is the default; selecting several explicitly creates one shared project report with per-line reports available. Its program displays the selected line's seven practical steps under DMAIC phases and opens real tools and Problems/Actions with project and line context. The customer report and DMAIC evidence report are available immediately. A second recovery at the same client/site has its own report and both projects appear in the same Factory control room. A recovery is never listed as a 6M tool project, and the customer report names the Line recovery · DMAIC method. On a 390 px phone it fits without horizontal overflow. Reopening the project returns to its program; the tools, project actions and reports stay available.
