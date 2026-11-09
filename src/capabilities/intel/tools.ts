/* EVERY TOOL'S INTELLIGENCE (types.ts says what each part is). One entry a connector key (capabilities/connectors CONNECTORS), so
 * every tool the AI can reach is described, and the unit test (intel.test.ts) refuses a key with none. Written from the tool's own
 * module, page and paper — what it works out, what it reads, what its page asks — and its method record in knowledge/methods; every
 * level is what the code does today, and the test holds each to the registry, the measure adapters and the connector. */
import type { Acquire, Operation, ToolIntel } from './types';

/* the operations most tools share — each the same capability everywhere */
const describe: Operation = { id: 'describe', does: 'Say what it is for, what it needs and gives, and how it is used', level: 1, how: ['tool_guide'] };
const read: Operation = { id: 'read', does: 'Read a record of it — its figures, its finding in its own words', level: 1, how: ['read_record'] };
const report: Operation = { id: 'report', does: 'Make its paper and keep it beside the record', level: 1, how: ['make_report'] };
const open: Operation = { id: 'open', does: 'Show its page beside the conversation', level: 1, how: ['show_work'] };
const common = [describe, read, report, open];

/* routes said the same way across tools */
const says: Acquire = { route: 'conversation', status: 'supported', how: 'Said or typed in the conversation and kept as reported — never as measured' };
const noPhoto: Acquire = { route: 'photo', status: 'unavailable', how: 'A photograph holds none of its figures; nothing in Faultline reads one into this tool' };
const noVideo = (what: string): Acquire => ({ route: 'video', status: 'future', how: `Footage would need ${what}; the video study reads people’s work cycles only` });
const noSheet = (what: string): Acquire => ({ route: 'spreadsheet', status: 'future', how: `A file of ${what} is not read into this tool yet — the figures are said or typed` });
const pageTimer = (what: string): Acquire => ({ route: 'page-timer', status: 'supported', how: `${what} on the tool’s own page (Manual Mode)` });

/* ---------- Measuring tools ---------- */

const stops: ToolIntel = {
  key: 'stops',
  does: 'Times every stop on a line — when it stopped, why, on which machine, when it ran again — and ranks the reasons by the minutes lost (the Pareto).',
  answers: ['Where does the line’s time go?', 'Which reason, which machine, loses the most minutes?', 'Is a reason many short stops or a few long ones?', 'Has a reason moved since the four weeks before?'],
  cannot: ['Why a reason happens — that is the root cause (6M)', 'How much the line could make — that is Line capacity', 'Slow running: a line that runs but slowly loses no stop time (the loss count tells it)', 'A failure rate over months of running (Reliability)'],
  when: ['The line loses time and nobody can say where', 'Before choosing which problem to work', 'To prove a fix: the same reason timed again'],
  notWhen: ['One machine’s failures over weeks of running time — Reliability counts the running time between them', 'Several workstations side by side, each stopping on its own — Stops across workstations'],
  instead: [{ key: 'reliability', when: 'one machine’s failures against its running hours' }, { key: 'workstops', when: 'several workstations watched at once, losing a rate each minute' }, { key: 'losses', when: 'the whole shift accounted for, slow running included' }],
  stage: 'See it — the first look at where the time goes (PDCA Plan, DMAIC Measure, the 6M’s gap)',
  fields: [
    { name: 'the reason (category)', required: true, routes: ['live', 'page-timer', 'conversation', 'records', 'spreadsheet'] },
    { name: 'the minutes each stop lost', required: false, routes: ['live', 'page-timer', 'conversation', 'spreadsheet'] },
    { name: 'how many times it stopped', required: false, routes: ['live', 'page-timer', 'conversation', 'spreadsheet'] },
    { name: 'the machine', required: false, routes: ['live', 'page-timer', 'conversation', 'records'] },
    { name: 'the line', required: true, routes: ['records', 'conversation'] },
    { name: 'the period', required: true, routes: ['records', 'conversation'] },
    { name: 'the share of the time and the cumulative %', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 20, of: 'stops over at least a week', why: 'below that one long stop or one odd day can put any reason first (lib/intelligence/confidence: thin under 7 days or 20 stops, solid at 21 days and 60)' },
  assumptions: ['A stop timed by the stopwatch is measured; one typed is reported; one tapped as an instant is counted, with no minutes', 'The reasons are the floor’s own words — two names for one reason are two bars until they are made one', 'Four weeks is the window unless another period is asked'],
  quality: ['Measured stops over three weeks or more: the ranking can be relied on', 'Counted stops only: frequency, never time — a bar ranked by stops, said so', 'Reported figures: a picture of what people say, kept apart from what was timed, never added to it', 'One shift: shows the shape, never the ranking'],
  acquire: [
    { route: 'records', status: 'supported', how: 'The line’s stops already timed — pareto reads them first' },
    { route: 'live', status: 'supported', how: 'start_measurement (stops), then capture_event as each stop is said — one card to start' },
    pageTimer('The stops screen’s Stopped / Running again buttons'),
    says,
    { route: 'spreadsheet', status: 'supported', how: 'A downtime export (reason with minutes and/or counts) read in code by import_table; kept as imported, apart from the line’s timed stops' },
    { route: 'manual', status: 'supported', how: 'Timed by hand on a stopwatch and typed on the stops screen, or said' },
    noPhoto,
    noVideo('the machine’s state read from the picture'),
  ],
  ops: [
    describe, open,
    { id: 'pareto', does: 'Rank the reasons by minutes lost (and by stops), with how sure the ranking is', level: 2, how: ['pareto'], needs: 'stops timed on the line, a spreadsheet of them, or figures said — each kept apart by how it is known' },
    { id: 'time-live', does: 'Time the stops as they happen, said aloud', level: 2, how: ['start_measurement', 'capture_event', 'undo_capture', 'correct_capture', 'end_measurement'], needs: 'the person at the line saying each stop and its end' },
    { id: 'import', does: 'Read a downtime spreadsheet into a Pareto', level: 2, how: ['import_table', 'pareto'], needs: 'a CSV or Excel file with a reason column and minutes or counts' },
    { id: 'assess', does: 'Say whether the evidence is enough, and what is missing', level: 1, how: ['assess_evidence'] },
    { id: 'report', does: 'Print the stops — they are on the line report', level: 1, how: ['make_report'] },
    { id: 'sensors', does: 'Read the stops from the machine’s own signals', level: 4, why: 'Faultline is measured by people, not sensors — no machine is read. The manual way: time them live (start_measurement) or on the line’s Stops timed page' },
  ],
};

const reliability: ToolIntel = {
  key: 'reliability',
  does: 'Watches one machine (or a line of them) over its running time and counts each kind of failure — the mean time between failures and to repair, availability, a failure rate.',
  answers: ['How often does this machine fail, against what is wanted?', 'How long does a repair take, waiting included?', 'Is it getting better or worse (growth)?', 'When is a part worn out (Weibull)?'],
  cannot: ['Which stop costs the line most — the Pareto of stops', 'Why it fails (6M, fault tree)', 'Anything from a few hours’ watching — failures need running time'],
  when: ['A machine that keeps failing', 'A maintenance decision: change at a time, or on condition'],
  notWhen: ['The whole line’s stops over a shift — Stops timed', 'No clock of running time can be kept'],
  instead: [{ key: 'stops', when: 'the whole line and where its time goes' }, { key: 'fault-tree', when: 'how failures combine to one event' }],
  stage: 'See and understand — the machine’s own record (DMAIC Measure and Analyse, TPM)',
  fields: [
    { name: 'the machine', required: true, routes: ['records', 'conversation'] },
    { name: 'what is counted (stops, failures, the floor’s own)', required: true, routes: ['conversation', 'records'] },
    { name: 'the running clock', required: true, routes: ['live', 'page-timer'] },
    { name: 'each event, stamped', required: true, routes: ['live', 'page-timer'] },
    { name: 'the MTBF wanted', required: false, routes: ['conversation'] },
    { name: 'MTBF, MTTR, availability', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 10, of: 'failures of one kind', why: 'an MTBF from fewer swings with each one; Weibull needs ten or more lives to say a shape' },
  assumptions: ['Running time is the clock the person starts and stops — never read from the machine', 'A failure is what the person names as one'],
  quality: ['Weeks of running and ten failures or more: solid', 'A day: an early look only, said so'],
  acquire: [
    { route: 'live', status: 'supported', how: 'start_measurement (reliability): the clock, then each event said — capture_event' },
    pageTimer('A button a kind of event, with the page’s clock'),
    { route: 'records', status: 'supported', how: 'The study’s own taps and the line’s machines' },
    says, noSheet('failure times'), noPhoto, noVideo('the machine’s state from the picture'),
  ],
  ops: [
    ...common,
    { id: 'watch-live', does: 'Run the clock and count each event as it is said', level: 2, how: ['start_measurement', 'capture_event', 'undo_capture', 'end_measurement'], needs: 'the clock running while the machine runs, each failure said as it happens' },
    { id: 'weibull', does: 'Fit a Weibull to part lives typed on the page', level: 3, how: ['show_work', 'read_record'], interaction: ['select-on-screen'], page: 'record', handover: 'Type each part’s life on the Weibull panel, strike any still running, then tell me — I’ll read the fit.', after: 'β, the B10 life and the change interval, in the study’s words', why: 'No capability types lives into the Weibull panel yet' },
  ],
};

const sampling: ToolIntel = {
  key: 'sampling',
  does: 'Work sampling: at random moments, what each person is doing — the shares of their time with their margins.',
  answers: ['What share of the time is each person working, walking, waiting?', 'How sure is each share (its margin)?'],
  cannot: ['How long a task takes — that is the line balance’s timing', 'Why people wait'],
  when: ['Work spread over many people or a long time, where timing each task is not practical'],
  notWhen: ['A short repeating cycle — time it (Line balance)'],
  instead: [{ key: 'linework', when: 'a repeating cycle timed task by task' }],
  stage: 'See it — the people’s time (Lean, IE)',
  fields: [
    { name: 'the people (roles)', required: true, routes: ['records', 'conversation'] },
    { name: 'the activities', required: true, routes: ['conversation', 'records'] },
    { name: 'one observation each a moment', required: true, routes: ['live', 'page-timer'] },
    { name: 'the shares and margins', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 100, of: 'observations a person', why: 'the margin on a share is ±2·√(p(1−p)/n) — at 100 a 50% share is ±10 points' },
  assumptions: ['The moments are random — taken when the page asks, not when something happens'],
  quality: ['Under 30 a person: a direction only, the margin said', 'Several hundred: solid'],
  acquire: [
    { route: 'live', status: 'supported', how: 'start_measurement (sampling): each person’s activity said at the moment — capture_event' },
    pageTimer('The moment asks; one tap a person'),
    says, noSheet('observations'), noPhoto, noVideo('activity classification'),
  ],
  ops: [
    ...common,
    { id: 'sample-live', does: 'Take the moments as they are said', level: 2, how: ['start_measurement', 'capture_event', 'end_measurement'], needs: 'the person watching say what each person is doing at each moment' },
  ],
};

const changeover: ToolIntel = {
  key: 'changeover',
  does: 'SMED: a changeover recorded element by element (last good piece to first good piece), each internal or external, converted and streamlined, with what it costs a shift, day, week and year.',
  answers: ['How long is the changeover, and where does it go?', 'What can be done while the line runs (external)?', 'What does it cost, and what would each stage buy back?'],
  cannot: ['How many changeovers to plan in the week — the week’s schedule', 'Why an adjustment is needed'],
  when: ['A changeover too long, or too varied between crews'],
  notWhen: ['A line that stops for other reasons — Stops timed'],
  instead: [{ key: 'stops', when: 'the changeover is one of many reasons for lost time' }],
  stage: 'See and improve (SMED’s stages: record, separate, convert, streamline, standardise)',
  fields: [
    { name: 'each element, in order', required: true, routes: ['live', 'page-timer', 'conversation'] },
    { name: 'its time', required: true, routes: ['live', 'page-timer', 'conversation', 'manual'] },
    { name: 'who does it', required: false, routes: ['live', 'conversation'] },
    { name: 'internal or external', required: false, routes: ['conversation', 'live'] },
    { name: 'the running pattern (shifts, hours, days) and changeovers a shift', required: false, routes: ['conversation', 'records'] },
    { name: 'the cost', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 1, of: 'whole changeover recorded', why: 'SMED works from one changeover filmed or timed end to end; a second proves the new standard' },
  assumptions: ['The days a line runs are asked, never assumed (Rowland, 12 October)'],
  quality: ['Timed live: measured', 'Said from memory: reported — said so on the record'],
  acquire: [
    { route: 'live', status: 'supported', how: 'start_measurement (changeover): each element’s end said with its name and who' },
    pageTimer('Lap with who on the SMED page'),
    { route: 'conversation', status: 'supported', how: 'start_draft (smed) and fill_draft from what is said, then make_record' },
    { route: 'video', status: 'future', how: 'A changeover is not measured from footage yet — SMED meanwhile (docs/VIDEO-DESIGN.md)' },
    noSheet('changeover elements'), noPhoto,
  ],
  ops: [
    ...common,
    { id: 'time-live', does: 'Time the elements as they are said', level: 2, how: ['start_measurement', 'capture_event', 'correct_capture', 'end_measurement'], needs: 'a changeover happening, each element said as it ends' },
    { id: 'fill', does: 'Build it from what is said — the elements, the target', level: 1, how: ['start_draft', 'fill_draft', 'make_record'] },
    { id: 'grid', does: 'Arrange elements in parallel lanes on the grid', level: 3, how: ['show_work'], interaction: ['drag'], page: 'record', handover: 'On the SMED grid, drag the elements done at the same time into one column, then tell me.', after: 'the new changeover time as the page works it', why: 'Parallel work is arranged on the grid by hand' },
    { id: 'from-footage', does: 'Time a changeover from footage', level: 4, why: 'A changeover is not measured from footage yet (docs/VIDEO-DESIGN.md). The manual way: time it live, element by element, on the SMED page or by saying each element as it ends' },
  ],
};

const workstops: ToolIntel = {
  key: 'workstops',
  does: 'Stops across workstations: several stations watched at once, each stop timed, losing a rate a minute — the loss by station, carried to an hour, a shift or a week with its confidence.',
  answers: ['Which workstation loses the most?', 'How much is lost in kg or packs, and in money?', 'How sure is the figure carried to a week?'],
  cannot: ['Why a station stops', 'The whole line’s reasons (Stops timed)'],
  when: ['Several stations in front of the person, interchangeable, each stopping on its own'],
  notWhen: ['One line with one flow — Stops timed'],
  instead: [{ key: 'stops', when: 'one flow, ranked by reason' }],
  stage: 'See it',
  fields: [
    { name: 'the workstations', required: true, routes: ['conversation', 'records'] },
    { name: 'the rate lost a minute', required: true, routes: ['conversation'] },
    { name: 'each stop, timed', required: true, routes: ['live', 'page-timer'] },
    { name: 'the watched time', required: true, routes: ['live', 'page-timer'] },
    { name: 'the loss and its interval', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 66, of: 'stops counted', why: 'the exact Poisson interval narrows to Firm only with enough stops — the page says how many more' },
  assumptions: ['The confidence rests on the stops counted, never on the minutes watched'],
  quality: ['The page says Rough, Fair or Firm from the exact Poisson interval'],
  acquire: [
    { route: 'live', status: 'supported', how: 'start_measurement (workstops): stopped and running again said by station' },
    pageTimer('Stopped / Running again on a tile a station'),
    { route: 'conversation', status: 'supported', how: 'start_draft (calc workstation-stops) and fill_draft from figures said' },
    { route: 'photo', status: 'supported', how: 'A picture added to a workstation on its sheet — shown on the paper, never measured from' },
    { route: 'video', status: 'supported', how: 'A clip added to a workstation — evidence beside it, never read for time' },
    noSheet('stops by station'),
  ],
  ops: [
    ...common,
    { id: 'watch-live', does: 'Time stops at each station as said', level: 2, how: ['start_measurement', 'capture_event', 'end_measurement'], needs: 'the person watching say each station stopping and running again' },
    { id: 'attach', does: 'Add a photo or clip to a workstation', level: 3, how: ['show_work'], interaction: ['film'], page: 'record', handover: 'On the workstation’s sheet, Take a photo or Film a clip — I can’t use the camera.', after: 'the count on the tile', why: 'The camera is the person’s' },
  ],
};

const losses: ToolIntel = {
  key: 'losses',
  does: 'The loss count: a shift accounted for at the bottleneck’s ideal speed — planned time, stops, slow running, short stops, rejects — as a waterfall, in packs and pounds.',
  answers: ['Where did the shift’s output go?', 'How much is slow running against stops?', 'What did it cost, labour and contribution apart?'],
  cannot: ['Which reason stops the line most over weeks (the Pareto)', 'Why it ran slow'],
  when: ['A shift short of what it should make'],
  notWhen: ['No count of good packs at the end of the shift'],
  instead: [{ key: 'stops', when: 'the stops alone, ranked' }, { key: 'linebalance', when: 'what the line can make at all' }],
  stage: 'See it — the shift’s whole (TPM losses, without OEE)',
  dependsOn: ['the line’s bottleneck speed (Line capacity, a machine’s plate speed)', 'the line’s stops in the shift'],
  fields: [
    { name: 'the shift (planned minutes less breaks)', required: true, routes: ['records', 'conversation'] },
    { name: 'the good packs counted', required: true, routes: ['conversation', 'manual'] },
    { name: 'the rejects', required: false, routes: ['conversation', 'manual'] },
    { name: 'the bottleneck’s ideal speed', required: true, routes: ['records', 'conversation'] },
    { name: 'the running speed timed', required: false, routes: ['manual', 'conversation'] },
    { name: 'the waterfall and the money', required: false, routes: ['records'], derived: true },
  ],
  assumptions: ['No OEE — counted by hand, availability is never guessed (Rowland, 10 October)'],
  quality: ['Counted packs and timed stops: measured', 'A count said from memory: reported'],
  acquire: [
    { route: 'records', status: 'supported', how: 'The stops in the shift, the line’s speed and breaks' },
    { route: 'conversation', status: 'supported', how: 'start_study (losses) then count_shift with the count said' },
    { route: 'manual', status: 'supported', how: 'Counted at the end of the line and said or typed' },
    noSheet('shift counts'), noPhoto, noVideo('a pack count'),
  ],
  ops: [
    ...common,
    { id: 'count', does: 'Count a shift', level: 2, how: ['start_study', 'count_shift'], needs: 'the packs counted at the end of the shift; the stops timed in it' },
  ],
};

const linework: ToolIntel = {
  key: 'linework',
  does: 'The line balance: each person’s work timed element by element, rated and allowed, stacked against takt — who is over, who waits, what the bottleneck costs.',
  answers: ['Who is over takt, who has time spare?', 'What is each person’s standard time?', 'What does the bottleneck person cost a pack?'],
  cannot: ['Machine speeds (Line capacity)', 'Shares of time over a long period (Work sampling)'],
  when: ['People’s work paces the line'],
  notWhen: ['The machines pace it — Line capacity'],
  instead: [{ key: 'linebalance', when: 'stations and their speeds' }, { key: 'sampling', when: 'irregular work over a long time' }],
  stage: 'See and improve the people’s work (Toyota’s combination table)',
  dependsOn: ['the takt from Line capacity’s target'],
  fields: [
    { name: 'each person (role)', required: true, routes: ['conversation', 'records'] },
    { name: 'each element and its laps', required: true, routes: ['live', 'page-timer', 'conversation', 'video'] },
    { name: 'the pace rating', required: false, routes: ['conversation'] },
    { name: 'the allowance (named parts)', required: false, routes: ['conversation'] },
    { name: 'standard time, the stack against takt', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 10, of: 'laps of each element', why: 'the interval on the mean narrows to about ±5% at 95% only with enough laps; the page says how many more' },
  assumptions: ['A machine’s run is never rated', 'No allowance is pre-filled — the site’s own parts'],
  quality: ['Timed: measured', 'Read from footage: measured, its ± said', 'Said: reported'],
  acquire: [
    { route: 'live', status: 'supported', how: 'start_measurement (balance): each element’s end said with who' },
    pageTimer('The full-screen timer with Undo and Skip'),
    { route: 'conversation', status: 'supported', how: 'start_study (balance) then time_elements with times said' },
    { route: 'video', status: 'supported', how: 'A video study reads the cycles from footage; its times feed a station' },
    noSheet('element times'), noPhoto,
  ],
  ops: [
    ...common,
    { id: 'time-live', does: 'Time the elements as said', level: 2, how: ['start_measurement', 'capture_event', 'end_measurement'], needs: 'someone saying each element’s end as it happens' },
    { id: 'fill', does: 'Put the elements and their times on from what is said', level: 1, how: ['start_study', 'time_elements'] },
    { id: 'rate', does: 'Rate the pace', level: 3, how: ['show_work', 'read_record'], interaction: ['observe'], page: 'record', handover: 'Rate the pace where the timing ends — only someone watching can judge it.', after: 'the basic and standard times', why: 'A rating is a judgement of what was watched' },
  ],
};

const linebalance: ToolIntel = {
  key: 'linebalance',
  does: 'Line capacity: the stations in flow order, machines and people, each in its own unit converted down the line — what the line can make, the bottleneck once stops count, the V-curve, the gap to target.',
  answers: ['What can the line make, and what holds it?', 'How far short of target, and the one fix?', 'What does a pack cost in labour, and one more person at the bottleneck?'],
  cannot: ['Where the time goes once it runs (Stops timed, loss count)', 'Whether a person keeps up minute by minute (Line balance)'],
  when: ['A target the line must hit', 'Before buying or moving a machine'],
  notWhen: ['Speeds nobody knows and nobody can time'],
  instead: [{ key: 'losses', when: 'the shift’s actual output against the capacity' }, { key: 'linework', when: 'people’s cycles against takt' }],
  stage: 'Understand the constraint (ToC’s identify, the method’s Analyse)',
  fields: [
    { name: 'the stations in order', required: true, routes: ['conversation', 'records'] },
    { name: 'each station’s speed and unit', required: true, routes: ['conversation', 'manual', 'records'] },
    { name: 'units in a tray, case, pallet', required: false, routes: ['conversation'] },
    { name: 'the target', required: false, routes: ['conversation'] },
    { name: 'people and their rate', required: false, routes: ['conversation', 'records'] },
    { name: 'the bottleneck, the V, the cost a pack', required: false, routes: ['records'], derived: true },
  ],
  assumptions: ['Plate speed unless human (Rowland)', 'A person’s time carries the ILO’s 9% rest unless the site says otherwise'],
  quality: ['Speeds timed: measured; from the plate: reported, said so'],
  acquire: [
    { route: 'conversation', status: 'supported', how: 'start_study (capacity) then set_capacity with the stations and speeds said' },
    { route: 'records', status: 'supported', how: 'A person’s standard time from the line balance' },
    { route: 'manual', status: 'supported', how: 'Speeds timed by hand and said' },
    { route: 'document', status: 'future', how: 'Plate speeds from an OEM manual are not read in yet' },
    noSheet('station speeds'), noPhoto,
  ],
  ops: [
    ...common,
    { id: 'fill', does: 'Set the stations and speeds from what is said', level: 1, how: ['start_study', 'set_capacity'] },
    { id: 'split', does: 'Shape several lines feeding one place', level: 3, how: ['show_work'], interaction: ['select-on-screen'], page: 'record', handover: 'On Line capacity, set How many lines feed in and Where do they merge, then tell me.', after: 'the merge and each line’s bottleneck', why: 'set_capacity takes one chain; the split is set on the page' },
  ],
};

const linestandard: ToolIntel = {
  key: 'linestandard',
  does: 'The line standard: the line drawn as a board — areas, machines, each person where they stand and what they do, the bottleneck marked — printed as a card.',
  answers: ['Who stands where and does what?', 'Where is the bottleneck, and who is overburdened?'],
  cannot: ['Times or speeds (Line balance, Line capacity)'],
  when: ['A new standard for a product, or showing the floor how it runs'],
  notWhen: ['A timing question'],
  instead: [{ key: 'linework', when: 'the times of each person’s work' }],
  stage: 'Standardise (hold the gain)',
  fields: [
    { name: 'the people (roles), their tasks and labels', required: true, routes: ['conversation'] },
    { name: 'where each stands', required: true, routes: ['drawing'] },
    { name: 'areas and machines on the board', required: false, routes: ['drawing'] },
  ],
  assumptions: ['People are named by role, never by name'],
  quality: ['The board is what the person drew'],
  acquire: [
    { route: 'conversation', status: 'supported', how: 'place_people: roles, tasks, labels, the bottleneck' },
    { route: 'drawing', status: 'supported', how: 'The board on its page — drag, place, size (by hand)' },
    { route: 'photo', status: 'future', how: 'A photo of a whiteboard drawing is not read into the board' },
  ],
  ops: [
    describe, open, report,
    { id: 'people', does: 'Put the people on with their tasks and labels', level: 1, how: ['start_study', 'place_people'] },
    { id: 'place', does: 'Place people, machines and areas where they stand', level: 3, how: ['show_work'], interaction: ['drag', 'position', 'draw'], page: 'record', handover: 'The people are in a row on the board — drag each to where they stand, draw the areas, then tell me.', after: 'the card', why: 'Positions on the board are the person’s; nothing places them by conversation' },
    { id: 'from-photo', does: 'Lay out the board from a photo of the floor or a whiteboard', level: 4, why: 'A photo is not read into the board. The manual way: place the people on the board by hand (the place step)' },
  ],
};

/* ---------- Statistics ---------- */

const capability: ToolIntel = {
  key: 'capability',
  does: 'The capability study: readings against a specification — Ppk and Cpk, the three checks first (bell-shaped, steady, read finely enough), give-away in money; or pass-or-fail judged by a confidence level or a loss allowed.',
  answers: ['Can this process meet its specification?', 'How sure is the Ppk?', 'What does the give-away cost?', 'Did this pass-or-fail sample prove the rate?'],
  cannot: ['Whether the process is steady over weeks (Control chart)', 'Why it is off centre (6M, designed experiment)', 'Anything from readings not against a limit'],
  when: ['A specification to meet: a weight, a seal, a temperature', 'A new machine or product to prove'],
  notWhen: ['No specification — use Analysis', 'Readings over time to watch — Control chart'],
  instead: [{ key: 'chart', when: 'watching it over time' }, { key: 'analysis', when: 'no limit, or comparing before and after' }],
  stage: 'Measure (DMAIC Measure; proof in Control)',
  fields: [
    { name: 'what is measured, its unit', required: true, routes: ['conversation'] },
    { name: 'the specification (limits or target)', required: true, routes: ['conversation', 'document'] },
    { name: 'the readings', required: true, routes: ['conversation', 'manual', 'records'] },
    { name: 'the machine and product', required: false, routes: ['records', 'conversation'] },
    { name: 'Ppk, Cpk, the share outside', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 30, of: 'readings', why: 'the three checks are said from 20; the Ppk’s interval is wide below 30 and the page says how wide' },
  assumptions: ['The readings come from one process, in order'],
  quality: ['Thirty or more steady, bell-shaped readings: the Ppk can be relied on', 'Not steady: no capability is claimed — the chart first'],
  acquire: [
    { route: 'conversation', status: 'supported', how: 'start_study (capability) then add_readings as each is said' },
    { route: 'manual', status: 'supported', how: 'Weighed or measured by hand and said or typed' },
    { route: 'records', status: 'supported', how: 'Another Statistics tool’s readings, copied with a link back (Use these readings in…)' },
    { route: 'spreadsheet', status: 'future', how: 'Readings are pasted on the page (Manual Mode); a file is not read in by the conversation yet' },
    noPhoto, noVideo('a reading taken from the picture'),
  ],
  ops: [
    ...common,
    { id: 'readings', does: 'Add readings as they are said', level: 2, how: ['start_study', 'add_readings'], needs: 'readings measured on the product, said one by one or as a list' },
    { id: 'analyse', does: 'Run the statistics on its readings', level: 1, how: ['run_analysis'] },
    { id: 'photo-reading', does: 'Take a reading off a photo of a gauge, scale or display', level: 4, why: 'A photo is never a measurement here. The manual way: read the gauge and say or type the figure — it is kept as measured by the person' },
  ],
};

const chart: ToolIntel = {
  key: 'chart',
  does: 'The control chart: readings in order, limits from the first twenty and frozen, signals said in words (beyond limits, runs, CUSUM), subgroups, short runs, pre-control.',
  answers: ['Is the process steady?', 'When did it change, and which reading began it?'],
  cannot: ['Whether it meets a specification (Capability)', 'Why it changed'],
  when: ['A number watched over time'],
  notWhen: ['Fewer than twenty readings to set limits from'],
  instead: [{ key: 'capability', when: 'against a specification' }],
  stage: 'Control (hold the gain)',
  fields: [
    { name: 'what is measured', required: true, routes: ['conversation'] },
    { name: 'the readings in order', required: true, routes: ['conversation', 'manual', 'records'] },
    { name: 'the limits', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 20, of: 'readings to set the limits', why: 'limits from fewer are provisional and said so' },
  assumptions: ['Readings in the order they were taken'],
  quality: ['Provisional limits under twenty readings, said'],
  acquire: [
    { route: 'conversation', status: 'supported', how: 'start_study (chart) then add_readings' },
    { route: 'records', status: 'supported', how: 'A capability study’s readings copied with a link back' },
    { route: 'manual', status: 'supported', how: 'Measured and said' },
    noSheet('readings'), noPhoto, noVideo('a reading'),
  ],
  ops: [...common, { id: 'readings', does: 'Add readings as said', level: 2, how: ['start_study', 'add_readings'], needs: 'readings taken in order' }],
};

const analysis: ToolIntel = {
  key: 'analysis',
  does: 'The analysis: how sure, did it change, do two ways agree, do groups differ, what moves with what, how many readings — in words, with SciPy-checked figures; gauge studies, shapes, learning curves, stratification, designed experiments.',
  answers: ['Did the fix change it, and how sure?', 'Do the shifts differ?', 'Does A move with B?', 'How many readings do I need?'],
  cannot: ['Cause from correlation', 'A finding from readings it was not given'],
  when: ['A question of numbers that needs a test, not a picture'],
  notWhen: ['A specification to meet — Capability', 'Watching over time — Control chart'],
  instead: [{ key: 'capability', when: 'against limits' }, { key: 'chart', when: 'over time' }],
  stage: 'Analyse; proof of a fix (before → after)',
  fields: [
    { name: 'the question', required: true, routes: ['conversation'] },
    { name: 'the readings (one or more groups)', required: true, routes: ['conversation', 'manual', 'records'] },
    { name: 'the confidence', required: false, routes: ['conversation'] },
    { name: 'the test, its result in words', required: false, routes: ['records'], derived: true },
  ],
  enough: { n: 10, of: 'readings a group', why: 'the page says how many the question needs (38 for a mean within its margin, 2,401 for a share…)' },
  assumptions: ['The groups are independent unless paired is asked'],
  quality: ['The module says when a test is not trusted (a table too small, a curve too straight)'],
  acquire: [
    { route: 'conversation', status: 'supported', how: 'start_study (analysis), add_readings, run_analysis' },
    { route: 'records', status: 'supported', how: 'run_analysis on another record’s readings' },
    { route: 'spreadsheet', status: 'future', how: 'Rows are pasted on the page; the conversation does not read a file into it yet' },
    noPhoto, noVideo('readings'),
  ],
  ops: [
    ...common,
    { id: 'run', does: 'Answer how sure, did it change, paired, groups, relate', level: 2, how: ['run_analysis'], needs: 'the readings, measured — the analysis never works on figures it was not given' },
    { id: 'gauge', does: 'Gauge R&R, a Type 1 study, attribute agreement, a fitted shape, a designed experiment', level: 3, how: ['show_work', 'read_record'], interaction: ['select-on-screen'], page: 'record', handover: 'Pick the question on the Analysis page and paste the readings in its grid, then tell me — I’ll read what it says.', after: 'the page’s sentence', why: 'run_analysis covers five questions; the gauge, shape, DOE, learning and strata questions are set on the page' },
  ],
};

const rsm: ToolIntel = {
  key: 'rsm', does: 'Optimising settings: a response surface over two or three factors — the run sheet, the fit, the best setting with its prediction interval.',
  answers: ['Which settings give the best result, and how sure?'], cannot: ['Which factors matter at all (a two-level experiment first)', 'Beyond the box run'],
  when: ['Two or three factors known to matter'], notWhen: ['Factors not yet screened'],
  instead: [{ key: 'analysis', when: 'screening factors first — a two-level designed experiment' }],
  stage: 'Improve',
  fields: [{ name: 'the factors and their ranges', required: true, routes: ['conversation'] }, { name: 'each run’s response', required: true, routes: ['conversation', 'manual'] }, { name: 'the fit and best setting', required: false, routes: ['records'], derived: true }],
  enough: { n: 13, of: 'runs (a central composite for two factors)', why: 'the design sets the runs; fewer leave the fit unchecked' },
  assumptions: ['Runs made in the shuffled order the page gives'], quality: ['Lack of fit and the predicted R² said; a minimum outside the runs never quoted'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'fill_register with each run’s response' }, { route: 'manual', status: 'supported', how: 'Measured at each run and said' }, noSheet('runs'), noPhoto],
  ops: [...common, { id: 'responses', does: 'Enter each run’s response', level: 2, how: ['fill_register'], needs: 'the runs made and measured' }, { id: 'design', does: 'Agree the factors and design', level: 3, how: ['show_work'], interaction: ['select-on-screen'], page: 'record', handover: 'Agree the factors and the design on the page; it lays out the runs.', after: 'the run sheet', why: 'The design is agreed on the page' }],
};

/* ---------- Lean pictures ---------- */

const valuestream: ToolIntel = {
  key: 'valuestream',
  does: 'The value stream map: the steps from supplier to customer with who and where, each VA · NE · NV, the waits — lead time, value-added time and share, the waste in money.',
  answers: ['How long from order to customer, and how much adds value?', 'Where does product wait, and what does it cost?'],
  cannot: ['How fast each machine runs (Line capacity)', 'Why a step waits'],
  when: ['The whole flow, not one station'], notWhen: ['One station’s work'],
  instead: [{ key: 'processflow', when: 'one product’s steps on one sheet' }, { key: 'linework', when: 'one station' }],
  stage: 'See it (Lean)',
  fields: [
    { name: 'the steps, in order', required: true, routes: ['live', 'conversation'] },
    { name: 'each step’s time and wait', required: false, routes: ['live', 'conversation', 'manual'] },
    { name: 'VA · NE · NV', required: false, routes: ['conversation', 'live'] },
    { name: 'lead time and VA share', required: false, routes: ['records'], derived: true },
  ],
  assumptions: ['The assistant classes no step — VA, NE and NV are the person’s'],
  quality: ['Walked and timed: measured; said: reported'],
  acquire: [
    { route: 'live', status: 'supported', how: 'start_measurement (valuestream): each step said as it is walked' },
    { route: 'conversation', status: 'supported', how: 'draw_diagram (vs) from what is said' },
    pageTimer('The stopwatch with VA · NE · NV'),
    noSheet('steps'), noPhoto,
  ],
  ops: [
    ...common,
    { id: 'walk-live', does: 'Walk the stream, each step said', level: 2, how: ['start_measurement', 'capture_event', 'end_measurement'], needs: 'someone walking it and saying each step' },
    { id: 'draw', does: 'Make the map as its record from what is said — Faultline lays it out', level: 1, how: ['draw_diagram'] },
  ],
};

const processflow: ToolIntel = {
  key: 'processflow', does: 'The process flow chart: one product’s path step by step — operations, transports, checks, delays, storage — with the time, distance and labour each adds.',
  answers: ['How much of the path is operation, how much moving and waiting?', 'Which delay and transport are longest?'], cannot: ['The whole value stream across processes'],
  when: ['One product’s path to question'], notWhen: ['A whole plant’s flow'],
  instead: [{ key: 'valuestream', when: 'the whole stream, with VA · NE · NV' }],
  stage: 'See it (Kaizen event’s Observe)',
  fields: [{ name: 'each step and its class', required: true, routes: ['conversation'] }, { name: 'its time; a transport’s distance', required: false, routes: ['conversation', 'manual'] }, { name: 'the shares and money', required: false, routes: ['records'], derived: true }],
  assumptions: ['Only a transport has a distance'], quality: ['A step with no time is named and left out'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'draw_diagram (flow) from what is said' }, { route: 'manual', status: 'supported', how: 'Timed and paced out by hand' }, noSheet('steps'), noPhoto],
  ops: [...common, { id: 'draw', does: 'Make the chart as its record from what is said — Faultline works its figures', level: 1, how: ['draw_diagram'] }],
};

const spaghetti: ToolIntel = {
  key: 'spaghetti', does: 'The spaghetti diagram: each person’s walk between places — metres, minutes and money a shift, the busiest place, the shared routes; to scale on a drawn board or as a schematic.',
  answers: ['How far do people walk, and to where?', 'What does the walking cost?'], cannot: ['Distances nobody gave — moves are counted, never metres made up'],
  when: ['People walk a lot to fetch, carry or check'], notWhen: ['Machines’ flow'],
  instead: [{ key: 'micro', when: 'small movements at one place' }],
  stage: 'See it (Kaizen event’s Observe)',
  fields: [{ name: 'each walker (role) and their places', required: true, routes: ['conversation', 'drawing'] }, { name: 'each leg’s distance', required: false, routes: ['manual', 'conversation', 'drawing'] }, { name: 'rounds a shift, the walking pace', required: false, routes: ['conversation'] }, { name: 'metres, minutes, money', required: false, routes: ['records'], derived: true }],
  assumptions: ['A schematic is said NOT TO SCALE'], quality: ['Measured legs: metres; none: moves counted only, said so'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'draw_diagram (spag) from the walks said' }, { route: 'drawing', status: 'supported', how: 'The board: a layout, pins, a scale, tapped walks (by hand)' }, { route: 'manual', status: 'supported', how: 'Paced or measured and said' }, noSheet('legs'), noPhoto],
  ops: [...common, { id: 'draw', does: 'Make the record of the walks from what is said — a schematic, not to scale', level: 1, how: ['draw_diagram'] }, { id: 'board', does: 'Draw the layout and tap the walks to scale', level: 3, how: ['show_work', 'read_record'], interaction: ['draw', 'position', 'measure-distance'], page: 'record', handover: 'On Draw it on a board: draw the area, pin the places, set the scale with two taps and a measured distance, then tap each walk — tell me when done.', after: 'the metres and money as the board works them', why: 'A layout and a scale are drawn by hand' }, { id: 'from-footage', does: 'Work out the walks and their distances from footage or a photo', level: 4, why: 'Walks are not read from footage or photos. The manual way: say the walks, or draw them on the board' }],
};

const micro: ToolIntel = {
  key: 'micro', does: 'Micro-movements: a person’s (or each hand’s) elements classed — working, to question, checking — the cycle and what the questionable motion costs.',
  answers: ['How much of a cycle is motion to question?'], cannot: ['A time not supplied — elements untimed are counted only'],
  when: ['A short manual cycle at one place'], notWhen: ['Walking between places — spaghetti'],
  instead: [{ key: 'spaghetti', when: 'walking between places' }],
  stage: 'See it',
  fields: [{ name: 'each element, its class and seconds', required: true, routes: ['conversation', 'manual', 'video'] }, { name: 'the shares and money', required: false, routes: ['records'], derived: true }],
  assumptions: ['The class of a motion is the person’s'], quality: ['Untimed elements are named; no cycle is said without times'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'start_draft (calc micro-movements) and fill_draft' }, { route: 'video', status: 'future', how: 'Elements are not read from footage yet' }, noSheet('elements'), noPhoto],
  ops: [...common, { id: 'fill', does: 'Fill it from what is said', level: 1, how: ['start_draft', 'fill_draft', 'make_record'] }],
};

const video: ToolIntel = {
  key: 'video', does: 'The video study: footage of work read on the device — the cycles found, each end with its ±, reviewed on the footage; how fit the footage is said first.',
  answers: ['How long are the cycles in this footage, and how sure each end is?'], cannot: ['A changeover from footage', 'When work starts and stops where the camera shook'],
  when: ['Repeating work filmed from a fixed place'], notWhen: ['A shaky hand-held clip'],
  instead: [{ key: 'linework', when: 'timing on the stopwatch instead' }],
  stage: 'See it',
  fields: [{ name: 'the footage', required: true, routes: ['video'] }, { name: 'the cycles', required: false, routes: ['records'], derived: true }],
  assumptions: ['The reading is measured on the device; nothing is claimed of footage not read'], quality: ['Unfit stretches flagged; every event inside one marked'],
  acquire: [{ route: 'video', status: 'supported', how: 'Filmed or uploaded on the video study’s page; read on the device' }, { route: 'photo', status: 'unavailable', how: 'A still holds no cycle' }],
  ops: [describe, read, open,
    { id: 'film', does: 'Film or upload the footage', level: 3, how: ['show_work'], interaction: ['film'], page: 'record', handover: 'Film the work from a fixed place (the page says where and how long) or upload a clip, then tell me.', after: 'whether the footage is fit, and the cycles', why: 'The camera is the person’s; the conversation cannot film' },
    { id: 'review', does: 'Review each cycle on the footage', level: 3, how: ['show_work', 'read_record'], interaction: ['review-visual'], page: 'record', handover: 'On the footage, accept or move each boundary — only you can see the picture.', after: 'the reviewed cycles', why: 'The AI is not given the footage; it never claims to have watched it' },
    { id: 'name-work', does: 'Name the work from the frames (Claude)', level: 3, how: ['show_work'], interaction: ['select-on-screen'], page: 'record', handover: 'Tick Name the work from the frames on the study — it says what it sends.', after: 'the names, for you to check', why: 'Offered and ticked on the page only' },
    { id: 'watch-in-chat', does: 'Watch footage in the conversation and say what it shows', level: 4, why: 'AI Mode is not given footage. The manual way: the video study reads it on its own page, and Name the work from the frames is ticked there' },
  ],
};

/* ---------- Calculators, documents, logs, registers ---------- */

const calc: ToolIntel = {
  key: 'calc', does: 'The calculators: a defined sum (takt, OEE-free yield, give-away, payback…) worked by its definition from the figures given, with its sentence, verdict and money.',
  answers: ['The calculator’s own question, worked by its formula'], cannot: ['A figure from inputs not given — the missing input is named'],
  when: ['A known sum with known inputs'], notWhen: ['Readings to analyse — Analysis'],
  instead: [{ key: 'analysis', when: 'a statistical question' }],
  fields: [{ name: 'each input the calculator names', required: true, routes: ['conversation', 'records'] }, { name: 'the answer', required: false, routes: ['records'], derived: true }],
  assumptions: ['Faultline works the figure; the assistant never does'], quality: ['Each input kept with how it is known'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'list_calculators, run_calculator, save_calculation' }, { route: 'records', status: 'supported', how: 'The line’s margin, rate and crew where the calculator reads them' }, noSheet('inputs'), noPhoto],
  ops: [...common, { id: 'run', does: 'Work it from figures said', level: 1, how: ['list_calculators', 'run_calculator', 'save_calculation'] }],
};

const doc: ToolIntel = {
  key: 'doc', does: 'The documents: a charter, SIPOC, CTQs, Kano, 8D report, SOP, job instruction, one-point lesson — each box written, agreed by name and day.',
  answers: ['The document’s own sections, filled'], cannot: ['Agreement — only a person agrees it'],
  when: ['A method asks for the document'], notWhen: ['A number to work out'],
  instead: [{ key: 'calc', when: 'a figure' }],
  fields: [{ name: 'each box the document needs', required: true, routes: ['conversation', 'records', 'document'] }],
  assumptions: ['Words as the person said or agreed them'], quality: ['A box still needed is named'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'start_draft (doc), fill_draft, make_record' }, { route: 'photo', status: 'supported', how: 'Photos added to an SOP step on its page (by hand)' }, { route: 'document', status: 'future', how: 'An existing SOP file is not read into the boxes yet' }],
  ops: [...common, { id: 'fill', does: 'Write it from what is said', level: 1, how: ['start_draft', 'fill_draft', 'make_record'] }, { id: 'agree', does: 'Agree it', level: 3, how: ['show_work'], interaction: ['select-on-screen'], page: 'record', handover: 'Agree it on its page with your name and day.', after: 'agreed and locked', why: 'Agreement is a person’s act, never the assistant’s' }],
};

const logs: ToolIntel = {
  key: 'logs', does: 'Check logs: metal detection, CILT, condition checks, scored audits (5S) — each check due, done, failed; a failure raises one problem with the packs at risk since the last good check.',
  answers: ['Is every check done on time?', 'What is at risk from a failed check?'], cannot: ['That a check was done without a record of it'],
  when: ['Routine checks that must be shown'], notWhen: ['A one-off measurement'],
  instead: [{ key: 'capability', when: 'readings against a limit' }],
  fields: [{ name: 'the checks and their interval', required: true, routes: ['records', 'conversation'] }, { name: 'each result', required: true, routes: ['conversation', 'manual'] }],
  assumptions: ['A pass is recorded only when said'], quality: ['Overdue said from the interval'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'record_check with the result said' }, { route: 'manual', status: 'supported', how: 'Done at the line and tapped on the round' }, noSheet('checks'), { route: 'photo', status: 'unavailable', how: 'A check’s photo is not read' }],
  ops: [...common, { id: 'record', does: 'Record a check said', level: 2, how: ['record_check'], needs: 'the check done at the line and its result said' }, { id: 'start', does: 'Start a log', level: 1, how: ['start_draft', 'make_record'] }],
};

const register = (key: string, does: string, answers: string[], cannot: string[], fields: ToolIntel['fields'], when: string, extra: Partial<ToolIntel> = {}): ToolIntel => ({
  key, does, answers, cannot, when: [when], notWhen: extra.notWhen ?? [], instead: extra.instead ?? [], fields,
  assumptions: extra.assumptions ?? ['Scores and words are the team’s own; Faultline ranks them'], quality: extra.quality ?? ['As good as the team’s judgement — said as reported'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'start_study (register) then fill_register' }, noSheet('rows'), noPhoto],
  ops: [...common, { id: 'fill', does: 'Fill its rows from what is said', level: 1, how: ['start_study', 'fill_register'] }, ...(extra.ops ?? [])],
  ...(extra.stage ? { stage: extra.stage } : {}),
});

const criticality = register('criticality', 'Equipment criticality: each machine scored on safety, quality, output and cost — ranked A, B, C.', ['Which machines matter most?'], ['How often they fail (Reliability)'], [{ name: 'each machine’s scores', required: true, routes: ['conversation'] }], 'Deciding where maintenance effort goes');
const impactEffort = register('impact-effort', 'Impact and effort: each idea placed by what it buys and what it takes — quick wins first.', ['Which ideas first?'], ['What an idea is worth in money (a calculator)'], [{ name: 'each idea’s impact and effort', required: true, routes: ['conversation'] }], 'Many ideas, one team');
const pugh = register('pugh', 'Pugh matrix: options marked against a datum on each criterion.', ['Which option is best on the criteria?'], ['Criteria nobody named'], [{ name: 'criteria, the datum, each option’s marks', required: true, routes: ['conversation'] }], 'Choosing between options');
const fmea = register('fmea', 'Process FMEA: each failure mode rated S, O, D — the action priority High, Medium, Low; actions with who and by when.', ['Which failure modes to act on first?'], ['The probability of an event (fault tree)'], [{ name: 'each mode with its effect, cause, control and S · O · D', required: true, routes: ['conversation'] }], 'Before a change, or after a failure', { stage: 'Analyse and prevent' });
const controlPlan = register('control-plan', 'The control plan: each characteristic, how it is checked, how often, by whom, what to do — the checks a shift priced.', ['What is checked, how, how often?'], ['Whether the checks are done (the check log)'], [{ name: 'each characteristic’s plan', required: true, routes: ['conversation', 'records'] }], 'Holding a process after a fix', { stage: 'Control', ops: [{ id: 'link', does: 'Link a row to a check log or the FMEA', level: 3, how: ['show_work'], interaction: ['select-on-screen'], page: 'record', handover: 'On the plan, link the row to its check log or FMEA, then tell me.', after: 'the row’s link', why: 'Links are set on the page' }] });
const faultTree = register('fault-tree', 'Fault tree: the top event, its AND and OR gates, basic events with probabilities — the minimal cut sets and the chance of the top event.', ['How can this event happen, and how likely?'], ['Probabilities not given — the cut sets stand without them'], [{ name: 'each event: under which gate, its probability', required: true, routes: ['conversation'] }], 'A serious event to prevent');
const skills = register('skills', 'Skills matrix: each person’s level on each task by shift — single points, cover wanted, training first.', ['Where is the cover thin?'], ['How well someone works today'], [{ name: 'tasks, people, shifts, levels', required: true, routes: ['conversation', 'records'] }], 'Cover across shifts');
const readiness = register('readiness', 'Operational readiness: items in six areas, each owned and dated, ready with its evidence — what would stop day one.', ['Are we ready to run?'], ['That an item is ready without its evidence'], [{ name: 'each item, owner, day, evidence', required: true, routes: ['conversation'] }], 'Before a new line or product starts');
const maintenance = register('maintenance', 'Maintenance measures: planned against reactive hours, from the planned-maintenance log and reliability studies.', ['How much maintenance is planned?'], ['Which machine to fix'], [{ name: 'reactive hours', required: true, routes: ['conversation'] }, { name: 'planned hours', required: true, routes: ['records'] }], 'Judging the maintenance', { acquire: undefined });

const holds: ToolIntel = {
  key: 'holds', does: 'Product on hold: each hold raised with product, quantity and reason, decided (release, concession, rework, regrade, destroy) with grounds — what is tied up, carried, lost.',
  answers: ['What is on hold, for how long, and what is it costing?'], cannot: ['A decision — the person decides'],
  when: ['Product held after a failed check'], notWhen: [],
  instead: [{ key: 'logs', when: 'the check that held it' }],
  fields: [{ name: 'product, quantity, unit, reason', required: true, routes: ['conversation', 'records'] }, { name: 'each decision and its grounds', required: false, routes: ['conversation'] }],
  assumptions: ['Packs and cases are never added together'], quality: ['Tied up is waiting, not lost — said apart'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'raise_hold, decide_hold' }, { route: 'records', status: 'supported', how: 'A failed check on the line’s log offers its packs at risk' }, noSheet('holds'), noPhoto],
  ops: [...common, { id: 'raise', does: 'Raise a hold', level: 1, how: ['start_study', 'raise_hold'] }, { id: 'decide', does: 'Record a decision said', level: 1, how: ['decide_hold'] }],
};

const talk: ToolIntel = {
  key: 'talk', does: 'Line Talk: what is said, typed and photographed on the line, kept; a document written from it (walk, summary, punch list) with each point’s source.',
  answers: ['What was seen on the walk, written up?'], cannot: ['A figure — it writes words, the tools work the numbers'],
  when: ['Walking the line, noting what is seen'], notWhen: ['A measurement'],
  instead: [{ key: 'stops', when: 'timing what is seen' }],
  fields: [{ name: 'what was said and photographed', required: true, routes: ['conversation', 'photo'] }],
  assumptions: ['Each point says where it comes from'], quality: ['Observed and reported, never measured'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'write_document from the conversation' }, { route: 'photo', status: 'supported', how: 'Photos taken on the Line Talk page, labelled P1, P2, sent to Claude as small JPEGs and captioned — what it sees is said as observed, never measured' }, { route: 'video', status: 'unavailable', how: 'Talk takes photos, not footage' }],
  ops: [describe, read, open, { id: 'write', does: 'Write the document from the conversation', level: 1, how: ['write_document'] }, { id: 'report', does: 'Its PDF is on its page', level: 3, how: ['show_work'], interaction: ['select-on-screen'], page: 'record', handover: 'Save as PDF on the Line Talk’s page.', after: 'the PDF kept under Saved in the app', why: 'Its paper is made on its page' }],
};

const problems: ToolIntel = {
  key: 'problems', does: 'Problems, the register: every problem on its line — priority, who, by when, its journey, its cost while open, its waste, its photos.',
  answers: ['What is open, who has it, what is late, what does it cost?'], cannot: ['Why it happens (6M)'],
  when: ['Something to fix is seen'], notWhen: [],
  instead: [{ key: 'sixm', when: 'its root cause' }],
  fields: [{ name: 'what, the line, priority, who, by when', required: true, routes: ['conversation', 'records'] }, { name: 'minutes a day, rejects, held product', required: false, routes: ['conversation'] }, { name: 'a photo', required: false, routes: ['photo'] }],
  assumptions: ['Raised as the person says it; how known kept'], quality: ['Its cost is labour, packs and contribution from the one cost model, or the missing input named'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'raise_problem, update_problem, add_journey_step' }, { route: 'photo', status: 'supported', how: 'add_photo_to_problem — the photo kept on the problem; its content is described by the person' }, { route: 'records', status: 'supported', how: 'list_problems reads the register' }],
  ops: [describe, open, { id: 'list', does: 'Read the register', level: 1, how: ['list_problems'] }, { id: 'raise', does: 'Raise or update a problem', level: 1, how: ['raise_problem', 'update_problem', 'add_journey_step'] }, { id: 'photo', does: 'Put a photo on a problem', level: 2, how: ['add_photo_to_problem'], needs: 'a photo sent in the conversation' }, { id: 'mark', does: 'Mark up the photo', level: 3, how: ['show_work'], interaction: ['draw'], page: 'record', handover: 'Open the photo on the problem and mark it up.', after: 'the marked photo kept', why: 'Marks are drawn by hand' }, report],
};

const sixm: ToolIntel = {
  key: 'sixm', does: '6M: the problem at the head of the fish, causes on the six bones each saying how it is known, chosen to verify, checked, drilled with the five whys, countermeasures, proof on the same number.',
  answers: ['What causes it, and which causes are confirmed?'], cannot: ['That a cause is confirmed without its check — the AI never marks it verified'],
  when: ['A problem whose cause is not known'], notWhen: ['Where the time goes (the Pareto first)'],
  instead: [{ key: 'stops', when: 'finding the problem worth working' }],
  stage: 'Analyse — the root cause',
  dependsOn: ['the Pareto, the constraint, the walk, the standard'],
  fields: [{ name: 'the problem', required: true, routes: ['records', 'conversation'] }, { name: 'each cause, its bone, how known', required: true, routes: ['conversation', 'records'] }, { name: 'each check’s result', required: false, routes: ['conversation', 'records'] }],
  assumptions: ['A cause is suspected until its check confirms it'], quality: ['Each cause says measured · counted · observed · reported'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'fishbone_state, add_cause' }, { route: 'records', status: 'supported', how: 'Suggestions from the Pareto, the walk, the standard, the line capacity' }],
  ops: [describe, open, { id: 'state', does: 'Read the fishbone', level: 1, how: ['fishbone_state'] }, { id: 'cause', does: 'Add a cause with how it is known', level: 1, how: ['add_cause'] }, { id: 'verify', does: 'Confirm or rule out a cause', level: 3, how: ['show_work'], interaction: ['observe', 'inspect'], page: 'record', handover: 'Check the cause on the floor, then mark it confirmed or ruled out on its card with what you found.', after: 'the cause’s state', why: 'Verification is the person’s — the AI never marks evidence verified' }, report],
};

const actions: ToolIntel = {
  key: 'actions', does: 'Actions: who is doing what, why, where, by when, with priority — read from the problems and plans; a line’s Gantt.',
  answers: ['Who owes what by when, and what is late?'], cannot: ['Whether the action worked (the proof on the same number)'],
  when: ['Following up'], notWhen: [], instead: [],
  fields: [{ name: 'owner, due, priority, status', required: true, routes: ['conversation', 'records'] }],
  assumptions: ['An action is a problem’s or a plan’s — never a fifth list'], quality: ['Late from the day said'],
  acquire: [{ route: 'conversation', status: 'supported', how: 'update_problem, add_journey_step' }, { route: 'records', status: 'supported', how: 'overdue_actions reads them' }],
  ops: [describe, open, { id: 'late', does: 'Read what is late', level: 1, how: ['overdue_actions'] }, { id: 'update', does: 'Set who, by when, done', level: 1, how: ['update_problem', 'add_journey_step'] }, { id: 'depend', does: 'Link what waits for what', level: 3, how: ['show_work'], interaction: ['drag'], page: 'line', handover: 'On the line’s Actions Gantt, drag a bar’s end onto the one it waits for.', after: 'the link and any day that cannot be kept', why: 'Dependencies are set on the Gantt or the problem editor' }, report],
};

export const TOOL_INTEL: readonly ToolIntel[] = [
  stops, reliability, sampling, changeover, workstops, losses, linework, linebalance, linestandard,
  capability, chart, analysis, rsm, valuestream, processflow, spaghetti, micro, video,
  calc, doc, logs, criticality, impactEffort, pugh, fmea, controlPlan, faultTree, skills, readiness,
  { ...maintenance, acquire: [{ route: 'conversation', status: 'supported', how: 'fill_register (settings.reactiveHours)' }, { route: 'records', status: 'supported', how: 'The planned-maintenance log and reliability studies' }] },
  holds, talk, problems, sixm, actions,
];

export const intelOf = (key: string): ToolIntel | undefined => TOOL_INTEL.find(t => t.key === key);
