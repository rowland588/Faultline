# Line recovery program — 25 November 2026

## The job

A business asks Rowland to improve one underperforming line, or three. Start one recovery project per line when each needs its own work and report. The projects appear together in the client's Factory control room, including when the lines share a site. The lines and their capacity, losses and problems remain shared factory records; each project holds its own selected improvement work and actions. If the engagement genuinely needs one combined project report, the form also allows several lines in one project. No copy of a line or duplicate action tracker is needed.

The front door is **Projects → Start line recovery**. Choosing a factory line creates a real **DMAIC project** (`method: dmaic`, `programKey: line-recovery`). DMAIC is the recognized structure for improving an existing process that misses performance requirements: ISO 13053-1:2011 describes its phases, and ASQ explains its use for such processes. The seven practical line prompts below sit inside Define, Measure, Analyse, Improve and Control. The project phase workspace automatically offers the relevant catalogue tools; the line program gives direct doors into the same records. The line report and DMAIC project report are both available. From the program, **Start another line recovery at [site]** offers the other lines for the same client and site and preselects the next one. Theory of Constraints remains useful within diagnosis when a single throughput constraint is confirmed, rather than an assumption made when starting the project.

Sources: [ISO 13053-1:2011](https://www.iso.org/standard/52901.html); [ASQ DMAIC](https://asq.org/quality-resources/dmaic). This is a Faultline line recovery application of DMAIC, not a claim of ISO certification.

## The work, in a useful order rather than a lock

| DMAIC phase · step | Question and output | Existing place |
| --- | --- | --- |
| Define · 1. Agree the gap | What should the line make, what does it make, and over what period? A named measure, target and current reading. | Project measures and line setup |
| Measure · 2. Find the limit | Which station truly limits output? Capacity sheet and V-curve for each line/product. | Line capacity (FC-034) |
| Measure · 3. Find the problems | What do operators see going wrong, and where? Problems with place and evidence. | Problems (FC-154), line walk |
| Measure · 4. Count the losses | Where do the lost minutes, rejects and slow running sit? A shift loss count and ranked stop reasons. | Loss count (FC-049), Stops Pareto (FC-052) |
| Analyse · 5. Prove causes | Why do the largest losses occur? A 6M cause with observed or measured evidence, not a brainstorm treated as fact. | 6M (FC-146) |
| Improve · 6. Make changes | What will be tried, by whom and by when? Actions linked to their problem or evidence. A line program/test when a machine setting must be proved. | Actions (FC-194), line Programs |
| Control · 7. Check and hold | Did the same measure move beyond noise, and does it hold? Before/after comparison, weekly number/control chart, standard, line report and DMAIC project report. | Analysis (FC-105), Control chart (FC-086), project report |

Every step is optional when it is not relevant. One can return to a prior step; no fabricated completion ticks. The selected line changes the context of line-based tools; the project phase workspace places relevant tools under its DMAIC phases. A single-line project's work and report remain separate from another line's; both feed the same client control room. All figures and reports remain those of their existing records and formulas.

## Tool gap review

The core first-engagement tools exist and are openable. A new calculator would duplicate the existing capacity, losses, Problems and Actions surfaces. The gap is the **program path** and its context transfer. A small `program_key` column on projects is required to keep that path across devices separately from `method`. Future checks should ask whether linked line capacity, loss counts, problems and action outcomes can be summarized together without re-entry, and whether the final client report can show a cross-line baseline and improvement with each line's distinct denominator. Do not call that combined report built until it is.

## Acceptance

Projects offers a direct line-recovery start and requires a factory line. One line is the default; selecting several explicitly creates one shared project report. Its program displays the selected line's seven practical steps under DMAIC phases and opens real tools and Problems/Actions with project and line context. Both the line and DMAIC project report are available immediately. A second recovery at the same client/site has its own report and both projects appear in the same Factory control room. On a 390 px phone it fits without horizontal overflow. Reopening the project returns to its program; the chosen method, tools, project actions and reports stay available.
