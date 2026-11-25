# Line recovery program — 25 November 2026

## The job

A business asks Rowland to improve one underperforming line, or three. Start one Faultline project for the engagement and select every affected factory line. The lines and their capacity, losses and problems remain shared factory records; the project holds the selected improvement work and actions. No new project type, copy of a line or duplicate action tracker is needed.

The front door is **Projects → Start line recovery**. It starts a project carrying `programKey: line-recovery` with the chosen line or lines, then opens the recovery program. The programme is independent of the improvement method. It does not pick Theory of Constraints because a slow line may be limited by a bottleneck, a quality loss, reliability, staffing or flow. After seeing the evidence, the owner can select an appropriate method (TOC, 8D, DMAIC, PDCA, A3, Kata or Kaizen event). The program remains the project front door and survives a method change. It is not a ninth methodology or a new tool.

## The work, in a useful order rather than a lock

| Step | Question and output | Existing place |
| --- | --- | --- |
| 1. Agree the gap | What should the line make, what does it make, and over what period? A named measure, target and current reading. | Project measures and line setup |
| 2. Find the limit | Which station truly limits output? Capacity sheet and V-curve for each line/product. | Line capacity (FC-034) |
| 3. Find the problems | What do operators see going wrong, and where? Problems with place and evidence. | Problems (FC-154), line walk |
| 4. Count the losses | Where do the lost minutes, rejects and slow running sit? A shift loss count and ranked stop reasons. | Loss count (FC-049), Stops Pareto (FC-052) |
| 5. Prove causes | Why do the largest losses occur? A 6M cause with observed or measured evidence, not a brainstorm treated as fact. | 6M (FC-146) |
| 6. Make changes | What will be tried, by whom and by when? Actions linked to their problem or evidence. A line program/test when a machine setting must be proved. | Actions (FC-194), line Programs |
| 7. Check and hold | Did the same measure move beyond noise, and does it hold? Before/after comparison, weekly number/control chart, standard and client report once a method is chosen. | Analysis (FC-105), Control chart (FC-086), project report |

Every step is optional when it is not relevant. One can return to a prior step; no fabricated completion ticks. The selected line changes the context of line-based tools; the project remains the engagement across all lines. All figures and reports remain those of their existing records and formulas.

## Tool gap review

The core first-engagement tools exist and are openable. A new calculator would duplicate the existing capacity, losses, Problems and Actions surfaces. The gap is the **program path** and its context transfer. A small `program_key` column on projects is required to keep that path across devices separately from `method`. Future checks should ask whether linked line capacity, loss counts, problems and action outcomes can be summarized together without re-entry, and whether the final client report can show a cross-line baseline and improvement with each line's distinct denominator. Do not call that combined report built until it is.

## Acceptance

Projects offers a direct line-recovery start. One or several factory lines can be selected and a project created without choosing a method. Its program displays the selected line's seven steps, opens real tools and Problems/Actions with project and line context, and offers an honest method choice. The method report appears only after a method has been chosen. On a 390 px phone it fits without horizontal overflow. Reopening the project returns to its program; the chosen method, tools, project actions and reports stay available.
