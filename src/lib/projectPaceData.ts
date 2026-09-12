/* PROJECT PACE — the baseline, produced by the SAME parser that reads the weekly
 * uploads (lib/paceWorkbook). Generating it any other way let the baseline and an
 * upload disagree over details like an observer's name, which then surfaced as a
 * screenful of changes that never happened.
 * Pareto snapshot 14 Jul – 6 Aug 2026: 3,638 min lost across 398 stops on three measured lines.
 * Generated from Project_Pace_Action_Tracker.xlsx — edit there, re-extract here.
 *
 * RE-CUT THIS WHENEVER THE WORKBOOK CHANGES SHAPE. This is what every screen
 * reads until somebody uploads, so a baseline a version behind the real tracker
 * is not a stale sample — it is the app disagreeing with the business. The 3P
 * board shipped while this still held the pre-3P extract, so the board asked for
 * an upload on a screen that already had data underneath it, and no amount of
 * refreshing could have fixed that. Current cut: the 3P tracker, 28 actions,
 * every row carrying its People / Plant / Process column. */

export interface PaceLine { key: string; name: string; variant?: string; q1: number; q2: number; q3: number; q4: number; weekly: (number | null)[]; }
export interface ParetoRow { category: string; mins: number; events: number; minPerEvent: number; profile: string; l2: number; l7: number; l10: number; }
export interface PaceAction { /** A stable id from an ID/UID column, when the sheet has one. Unlike Ref
 *  (a formula off ROW()) this survives inserts, sorting and row reuse. */
  uid?: string; ref: string; priority: number; line: string; category: string; problem?: string; action?: string; who?: string; owner?: string; due?: string; status: string; flag: string;
  /** People / Process / Plant — the column this row sits in on the board.
   *  Read from a "Pillar" (or "PPP") column on the tracker sheet. Absent on a
   *  workbook that has not added the column yet, which the board says out loud
   *  rather than quietly dropping the row. */
  pillar?: string; }

/** Q1 starts August 2026; each quarter is 13 weeks.
 *
 * Weekly actuals run from W/C 27 JUL 2026. This was w/c 3 Aug, which put the
 * sixth and last reading on w/c 7 Sep — the week currently in progress — so the
 * tracker showed an actual for a week that had barely started. The six readings
 * are the six COMPLETED weeks ending w/c 31 Aug; the current week is W7 and is
 * empty until it is measured. */
export const PACE_START = Date.UTC(2026, 6, 27);
export const PACE_PERIOD = "14 Jul – 6 Aug 2026";
/** The baseline upload every later week is measured against. */
export const PACE_BASELINE_AT = Date.UTC(2026, 8, 11);
export const PACE_TOTAL_MINS = 3638;
export const PACE_TOTAL_STOPS = 398;


/** The workbook's own Lists sheet — the roster the meeting is run through,
 *  plus the vocabulary its dropdowns use. Includes people with nothing open. */
export interface PaceRosterData { owners: string[]; statuses: string[]; categories: string[]; lines: string[]; departments: string[] }
export const PACE_ROSTER: PaceRosterData = {
  owners: ["Tanya (GM)", "Rowland (Ops Lead)", "Ronnie (CI)", "Steve Wright (Technical)", "Rob Scott (Shift A)", "Paul Armitage (Shift B)", "Lee Carty (Shift C)", "Alex Hamilton", "Paul Selby", "Chris Smyth (Engineering)", "Sam Burrows (Eng)", "Debbie"],
  statuses: ["Open", "In progress", "Blocked", "Done"],
  lines: ["Line 2", "Line 7", "Line 10", "All lines", "Cellox"],
  departments: ["Production", "Technical", "CI", "Engineering"],
  categories: ["Stock starvation", "Changeovers", "General line organisation", "Brillopack snags", "Raw material quality", "Pick and place", "Mu automation", "SAT", "Training", "Brief", "Process", "Trial", "Equipment", "people"],
};

export const PACE_LINES: PaceLine[] = [
  { key: "2A", name: "Line 2A", variant: "Line 2 \u2014 measured independently", q1: 44, q2: 50, q3: 52, q4: 55, weekly: [42, 41, 35, 47, 44, 46] },
  { key: "2B", name: "Line 2B", variant: "Line 2 \u2014 measured independently", q1: 44, q2: 50, q3: 52, q4: 55, weekly: [28, 30, 29, null, 28, 34] },
  { key: "7", name: "Line 7", variant: undefined, q1: 39, q2: 42, q3: 44, q4: 46, weekly: [37, 44, 37, 35, 35, 38] },
  { key: "10", name: "Line 10", variant: undefined, q1: 48, q2: 51, q3: 53, q4: 55, weekly: [56, 59, 52, 57, 54, 52] },
];

export const PACE_PARETO: ParetoRow[] = [
  { category: "Changeovers", mins: 984.5, events: 64, minPerEvent: 15.4, profile: "Long-stop", l2: 930, l7: 47.4, l10: 7.1 },
  { category: "General line organisation", mins: 604, events: 39, minPerEvent: 15.5, profile: "Long-stop", l2: 424, l7: 179, l10: 1 },
  { category: "Brillopack snags", mins: 297, events: 55, minPerEvent: 5.4, profile: "Frequency", l2: 297, l7: 0, l10: 0 },
  { category: "Stock starvation", mins: 288, events: 20, minPerEvent: 14.4, profile: "Long-stop", l2: 283, l7: 5, l10: 0 },
  { category: "engineering", mins: 281, events: 12, minPerEvent: 23.4, profile: "Long-stop", l2: 281, l7: 0, l10: 0 },
  { category: "Consumable changes", mins: 148, events: 38, minPerEvent: 3.9, profile: "Frequency", l2: 139, l7: 4.7, l10: 4.3 },
  { category: "Break management", mins: 132.7, events: 20, minPerEvent: 6.6, profile: "Frequency", l2: 105, l7: 11, l10: 16.7 },
  { category: "Quality", mins: 124.9, events: 20, minPerEvent: 6.2, profile: "Frequency", l2: 82, l7: 20.3, l10: 22.6 },
  { category: "Quality line stops", mins: 90, events: 6, minPerEvent: 15, profile: "Long-stop", l2: 90, l7: 0, l10: 0 },
  { category: "Late start", mins: 86, events: 4, minPerEvent: 21.5, profile: "Long-stop", l2: 86, l7: 0, l10: 0 },
  { category: "Robot / automation", mins: 61.3, events: 25, minPerEvent: 2.5, profile: "Frequency", l2: 0, l7: 0, l10: 61.3 },
  { category: "Line flow backup", mins: 59, events: 25, minPerEvent: 2.4, profile: "Frequency", l2: 59, l7: 0, l10: 0 },
  { category: "Packaging or equipment issues", mins: 59, events: 4, minPerEvent: 14.8, profile: "Long-stop", l2: 59, l7: 0, l10: 0 },
  { category: "Trial", mins: 53, events: 2, minPerEvent: 26.5, profile: "Long-stop", l2: 53, l7: 0, l10: 0 },
  { category: "Waiting for product", mins: 52, events: 2, minPerEvent: 26, profile: "Long-stop", l2: 52, l7: 0, l10: 0 },
  { category: "Team meeting", mins: 43, events: 4, minPerEvent: 10.8, profile: "Long-stop", l2: 43, l7: 0, l10: 0 },
  { category: "Line staff capability", mins: 40.7, events: 14, minPerEvent: 2.9, profile: "Mixed", l2: 26, l7: 11.4, l10: 3.3 },
  { category: "Business systems", mins: 40.2, events: 3, minPerEvent: 13.4, profile: "Long-stop", l2: 27, l7: 13.2, l10: 0 },
  { category: "GIC failure", mins: 37, events: 2, minPerEvent: 18.5, profile: "Long-stop", l2: 37, l7: 0, l10: 0 },
  { category: "Operator error", mins: 35.4, events: 8, minPerEvent: 4.4, profile: "Mixed", l2: 33, l7: 0.5, l10: 1.9 },
  { category: "Bagger printer", mins: 33, events: 5, minPerEvent: 6.6, profile: "Mixed", l2: 33, l7: 0, l10: 0 },
  { category: "Box compliance / box damage", mins: 23.5, events: 3, minPerEvent: 7.8, profile: "Mixed", l2: 23.5, l7: 0, l10: 0 },
  { category: "Set up", mins: 20.5, events: 5, minPerEvent: 4.1, profile: "Mixed", l2: 9, l7: 8.7, l10: 2.8 },
  { category: "Equipment", mins: 17.3, events: 4, minPerEvent: 4.3, profile: "Mixed", l2: 14, l7: 3.3, l10: 0 },
  { category: "Reject management", mins: 12.7, events: 7, minPerEvent: 1.8, profile: "Mixed", l2: 11.7, l7: 1, l10: 0 },
  { category: "Checkweigher", mins: 8.3, events: 5, minPerEvent: 1.7, profile: "Mixed", l2: 0, l7: 8.3, l10: 0 },
  { category: "Electrical issue", mins: 4.1, events: 1, minPerEvent: 4.1, profile: "Mixed", l2: 0, l7: 0, l10: 4.1 },
  { category: "Tipper", mins: 2.1, events: 1, minPerEvent: 2.1, profile: "Mixed", l2: 0, l7: 0, l10: 2.1 },
];

export const PACE_ACTIONS: PaceAction[] = [
  { ref: "T-001", priority: 1, line: "Line 2", category: "Changeovers", problem: "SKU changeovers taking too long \u2014 14 stops, 80 mins lost total.", action: "Training the operator how to make best use of time, WIP -N.b RW - created a accountable SOP. Working with Dan Wilde to get it ready for training launch. Upon looking and checking, the changeover times are below 10 mins so on target. That said, will need to revisit this when IFS comes in. Moving to Line 2 5s for now.", who: "Production", owner: "Ronnie (CI)", due: "2026-08-31", status: "In progress", flag: "OVERDUE", pillar: "People" },
  { ref: "T-002", priority: 1, line: "Line 2", category: "Changeovers", problem: "Team need direct supervison and coaching on the new Changeover SOP;s,", action: "Team require support , training on best practice , sit with the teams get all team memebers up to the acceptable loss time standard RW-Repeat as above under the same training or area.", who: "Production", owner: "Ronnie (CI)", due: "2026-08-31", status: "In progress", flag: "OVERDUE", pillar: "People" },
  { ref: "T-003", priority: 1, line: "Line 2", category: "Changeovers", problem: "Redundent film taking up space in the area", action: "Remove the redundant / slow moving films from the holder, replace with full high moving films, Redundant film has been removed, also part reel have been removed. a process will be put together to add back the part films while not impacting the line performance, The 2 film holders are being assigned to keep new and old film from getting mixed up.", who: "Production", owner: "Rob Scott (Shift A)", due: "2026-09-28", status: "In progress", flag: "On track", pillar: "Process" },
  { ref: "T-004", priority: 1, line: "Line 2", category: "Changeovers", problem: "Multiple \"same product, different batch\" during the same order", action: "New technical process to reduce paperwork = time ,  on change overs.  Testing to be carried out in IFS to replicate the proposal of multiple PL codes onto the same production order.  Review other opportunities for QA's to add value on the line,", who: "Technical", owner: "Steve Wright (Technical)", due: "2026-08-28", status: "Open", flag: "OVERDUE", pillar: "Process" },
  { ref: "T-005", priority: 1, line: "Line 2", category: "Changeovers", problem: "Communication and awareness of material quality leading to delays and additional changeovers", action: "2x New Mobile phone -or- Tablet device to be ordered - One for Celox & One for All Production Lines - Dedicated QA Operator.  Tablets are the preferred option using MS Teams as a communication tool.  Question over access to Celox camera feeds for Celox QA Ops to get live feedback on the line.", who: "Technical", owner: "Steve Wright (Technical)", due: "2026-08-28", status: "Open", flag: "OVERDUE", pillar: "Process" },
  { ref: "T-006", priority: 1, line: "All lines", category: "Changeovers", problem: "The machine ops feedback is that none of the staff listen or know they are running the line.", action: "New Red high vis vests to be ordered for all operational leadership, machine ops, SM and SPM. this will show a clear connection between management and the machine ops. - These are being ordered 19/08/2026.", who: "Production", owner: "Rob Scott (Shift A)", due: "2026-09-28", status: "In progress", flag: "On track", pillar: "People" },
  { ref: "T-007", priority: 2, line: "Line 2", category: "General line organisation", problem: "2nd highest frequency of stop, the detail states line stopping because of pallet changes line a", action: "buy a belt to add lengh to the exisitng line, this will act as a time buffer, in principle will eliminate short stopages and help with pallet change overs on the end of the line", who: "Production", owner: "Rob Scott (Shift A)", due: "2026-08-21", status: "In progress", flag: "OVERDUE", pillar: "Plant" },
  { ref: "T-008", priority: 2, line: "Line 2", category: "General line organisation", problem: "line op, has to do a lot of paperwork on changeovers and during runs opportunuity to remove none value activities", action: "Work with Steve to try and remove elements that the QC could do and not the line op example sign of the bas every 15 min\u201d Labels - work with Steve - remove the process of the team sticking labels to an A4 piece of paper , \u201c just print the A4 piece of paper\u201d", who: "Production", owner: "Paul Armitage (Shift B)", due: "2026-08-21", status: "In progress", flag: "OVERDUE", pillar: "Process" },
  { ref: "T-009", priority: 4, line: "Line 2", category: "Stock starvation", problem: "Newtec not producing finished product due to film c/overs, product c/overs", action: "Procedure issue with the running of the line. Procedure requires improvement and planning on the film changes & product changes. This is handed over to production", who: "Production", owner: "Rob Scott (Shift A)", due: "2026-08-28", status: "In progress", flag: "OVERDUE", pillar: "Process" },
  { ref: "T-010", priority: 5, line: "Line 2", category: "Equipment", problem: "Occasional trips occuring on EFH panel due to linkage devices used instead of hard wired. These are reversing links.", action: "Look for a permanent fix, hard wire contactors to eliminate issues with clip in devices", who: "Engineering", owner: "Chris Smyth (Engineering)", due: "2026-11-27", status: "Open", flag: "On track", pillar: "Plant" },
  { ref: "T-011", priority: 11, line: "Line 10", category: "Robot / automation", problem: "Robot short stops \u2014 23 stops, 55 mins lost total (44% of the line).", action: "\"Wrist\" ordered and awaiting delivery. Will fit when arrives. Not yet delivered. Awaiting delivery from Abar.\n08/09/2026 - Order still not arrived. LAN looking into order details. - Due date updated.", who: "Engineering", owner: "Sam Burrows (Eng)", due: "2026-09-11", status: "In progress", flag: "OVERDUE", pillar: "Plant" },
  { ref: "T-012", priority: 11, line: "Line 10", category: "Robot / automation", problem: "Too many packs are going through the kicker belts and being rejected by the robot.", action: "Investigate cause and create action to rectify. \n45 minute video taken of the kicker belts running, during this time we lost 15 packs and this video needs to be analysed to look for the cause.", who: "Engineering", owner: "Sam Burrows (Eng)", due: "2026-09-11", status: "In progress", flag: "OVERDUE", pillar: "Plant" },
  { ref: "T-013", priority: 3, line: "Line 2", category: "Brillopack snags", problem: "MU  installation, commisioning", action: "03/09/2026  Rowland and Chris to line study with Brilopack  expectation target 75ppm at a 98% effececny rate. \n07/09/2026 Not achieved. Actual run rate 54.25ppm. Advised by BrilloPak that this MU filler won't achieve 75ppm.", who: "Engineering", owner: "Chris Smyth (Engineering)", due: "2026-09-03", status: "Blocked", flag: "Blocked", pillar: "Plant" },
  { ref: "T-014", priority: 3, line: "Line 2", category: "Stock starvation", problem: "Celox grading missed opotunity due to grading req on line because of potatoes that are not correctly size graded, particulalry those gathered from lane 8&9", action: "Gather sample data from Celox (A) to quantify amount of overflow in to lane A8 & A9 of over sized potatoes to allow next step of identify current understanding of working principle and standard settings for flow through Celox camera, along with analysing what trial tells us", who: "Production", owner: "Dan Wilde", due: "2026-09-11", status: "Done", flag: "Done", pillar: "Process" },
  { ref: "T-015", priority: 3, line: "Line 7", category: "General line organisation", problem: "There is a disconnect between data discussed in Tier 1 & 2 meetings and actual state of performance with a view beyond anything other than the static data point in time", action: "Introduce a trial to add trended data, starting with line 7 and the appropriate horizon for Tier 1 & 2 meetings to see the live development of performance before further developing in to other metrics such as quality categories and upstream stock position", who: "Production", owner: "Dan Wilde", due: "2026-09-11", status: "In progress", flag: "OVERDUE", pillar: "Process" },
  { ref: "T-016", priority: 3, line: "Line 2", category: "Brillopack snags", problem: "operator has to use foot pedal to move the baskets along into the destaker..  If not done in time the robot stops and causes a restart situation.. Min lost in a high frequecny", action: "we can automate,, on hold not a priority at the moment", who: "Engineering", owner: "Rowland (Ops Lead)", due: "2026-09-08", status: "Blocked", flag: "Blocked", pillar: "Plant" },
  { ref: "T-017", priority: 3, line: "Line 2", category: "General line organisation", problem: "Robot operator is in the budget is production aware of this? Do they have the required skills ? And amounts 3 will be required min", action: "check with production A  shift is aware of this , 3 required as a min", who: "Production", owner: "Rowland (Ops Lead)", due: "2026-09-10", status: "In progress", flag: "OVERDUE", pillar: "People" },
  { ref: "T-018", priority: 3, line: "Line 2", category: "SAT", problem: "we have no proof that tesco express works through the process do we have a tesco express program built  ?", action: "we need to agree a trial date for this \u2026 TBC \" Currntly no OEM support\"", who: "Production", owner: "Rowland (Ops Lead)", due: "2026-09-11", status: "Blocked", flag: "Blocked", pillar: "Plant" },
  { ref: "T-019", priority: 3, line: "Line 2", category: "SAT", problem: "We have no proof the pick and place does 75ppm at the 98% acceptance test", action: "we need to agree a test for this .. TBC  \" test has been done \"", who: "Production", owner: "Rowland (Ops Lead)", due: "2026-09-11", status: "Done", flag: "Done", pillar: "Plant" },
  { ref: "T-020", priority: 3, line: "All lines", category: "Training", problem: "Action management is not effectively driving timely progress. This is a foundational element that is required to underpin ongoing progress", action: "Develop SMART action training aid to roll out in 'micro learn' fashion, gather feedback from team and take Rob Scott through to initiate use", who: "Production", owner: "Dan Wilde", due: "2026-09-11", status: "Done", flag: "Done", pillar: "People" },
  { ref: "T-021", priority: 3, line: "All lines", category: "Training", problem: "Problem solving skills are not effectively exercised in terms of functional failure, failure mode, countermeasure and is affecting the ability to be decisive, and prioritise activity", action: "Take live examples from key PACE lines and produce an RCA to use as a training and development aid that ties in with SMART action management and can be used in 'micro learns'", who: "Production", owner: "Dan Wilde", due: "2026-09-11", status: "Done", flag: "Done", pillar: "People" },
  { ref: "T-022", priority: 3, line: "Line 7", category: "Process", problem: "Taking 'Lead Sponsor' position for Line 7 through project PACE delivery", action: "Draft top line plan for agreement with Branston Ops lead and communication to team", who: "Production", owner: "Dan Wilde", due: "2026-09-16", status: "Open", flag: "Due soon", pillar: "Process" },
  { ref: "T-023", priority: 3, line: "Cellox", category: "Process", problem: "Taking 'Lead Sponsor' position for Cellox grade / size line through project PACE delivery", action: "Draft top line plan for agreement with Branston Ops lead and communication to team", who: "Production", owner: "Dan Wilde", due: "2026-09-16", status: "Open", flag: "Due soon", pillar: "Process" },
  { ref: "T-024", priority: 3, line: "Line 10", category: "Equipment", problem: "Robot historical issue reports from operator that when we run at 70 both robots have problems.. Operator sets speed at 60 ppm Q4 target net 55ppm. We must increase speed", action: "TBC Once I establish problems", who: "Production", owner: "Rowland (Ops Lead)", due: "2026-09-16", status: "In progress", flag: "Due soon", pillar: "Plant" },
  { ref: "T-025", priority: 3, line: "Line 7", category: "Equipment", problem: "Revolver sensor is getting dirty due to wet product and keeps faulting, sees revolver as blocked but its just because the reflector is dirty.", action: "See if we can engineer the issue out.\nNot all lines have a 'revolver blocked' sensor, I have disconnected the sensor as a trial to see how the line runs without it.", who: "Engineering", owner: "Sam Burrows (Eng)", due: "2026-09-18", status: "In progress", flag: "Due soon", pillar: "Plant" },
  { ref: "T-026", priority: 3, line: "All lines", category: "General line organisation", problem: "understand what the section managers are doing  - we need know how much engagement and what type of engagement they are havung with the production lines", action: "Do a D.I.L.O", who: "Production", owner: "Alex Hamilton", due: "2026-09-16", status: "Open", flag: "Due soon", pillar: "People" },
  { ref: "T-027", priority: 3, line: "Line 2", category: "General line organisation", problem: "MOP are not organising their team and processess to maximise our abilitiy.", action: "Coach to the MOP on how to organise the teams and flow , explain the process to Rob and Broody .", who: "Production", owner: "Rowland (Ops Lead)", due: "2026-09-18", status: "In progress", flag: "Due soon", pillar: "People" },
  { ref: "T-028", priority: 3, line: "Line 2", category: "General line organisation", problem: "pallet wrapping , label application, expectations is that the pallet wrapper applies the labels to the baskets observations clearly shows , when we run boith lines the pallet wrapper cannot do both of these activites", action: "time the activity of wrapping and labbelling and transfer vs the time it take to fill 2 pallets , max theoretcial 75pmm", who: "Production", owner: "Rowland (Ops Lead)", due: "2026-09-16", status: "Open", flag: "Due soon", pillar: "Process" },
];

