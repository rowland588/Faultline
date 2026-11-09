/* WHAT FAULTLINE IS, FOR THE COLLEAGUE — the application model (9 November; docs/AI-CONTEXT.md).
 *
 * Rowland, 9 November: "The intelligence must understand the structure, purpose, relationships and capabilities of Faultline …
 * Maintain this understanding through application metadata, typed capabilities and secure retrieval rather than relying on a huge
 * static prompt." So this file says, once, what the app's records are and how they hang together — each relation named by the
 * field that holds it, so it is the code's truth and not a story — and how the floor's words for a kind of work ("an observation
 * analysis", "downtime") meet the tools. Everything else the colleague learns about the app is READ when asked: the capabilities
 * from the registry and their schemas, the tools from the catalogue's registry, the methods from lib/methods (describe_faultline,
 * ./understand). A new tool, method or capability is known the moment it is in those lists; this file changes only when a new
 * KIND of record or a new relation is added to the app (the blueprint's §2 first).
 *
 * Pure: no db. Tested against the registry (every tool an activity names is an app tool; every capability a record names is in
 * the registry). */

/** A kind of record the app keeps, and how it hangs on the others. */
import { stems } from '../catalogue/index';

export interface RecordKind {
  kind: string;
  /** The word on screen. */
  word: string;
  what: string;
  /** Where it is kept — the table (or, for words, the column) — so a relation is never claimed that the data cannot hold. */
  kept: string;
  /** What it belongs to or points at, each by the field that holds it. */
  links: { to: string; by: string; note?: string }[];
  /** Where a person sees it. */
  shows: string;
  /** The capabilities that make or change one — never a delete. */
  madeBy: string[];
  /** The capabilities that read it. */
  readBy: string[];
}

export const RECORD_KINDS: readonly RecordKind[] = [
  {
    kind: 'client', word: 'Client (customer, business)', what: 'Whose factory a line is in. Not a record of its own — words on each line; recall and the factory map never cross from one client to another.',
    kept: 'workspaces.client_name', links: [], shows: 'The Factory page title and its client chips', madeBy: ['add_to_factory_draft', 'make_record'], readBy: ['factory_map', 'resolve', 'find'],
  },
  {
    kind: 'site', word: 'Site (factory)', what: 'A factory of the client. Words on each line, not a record.', kept: 'workspaces.site_name',
    links: [{ to: 'client', by: 'the same line’s client_name' }], shows: 'The Factory page’s site › area headings', madeBy: ['add_to_factory_draft', 'make_record'], readBy: ['factory_map', 'resolve'],
  },
  {
    kind: 'area', word: 'Area (department, hall)', what: 'A production area of a site — "the packing hall". Words on each line, not a record; it has a page and a report of its own that gather its lines.',
    kept: 'workspaces.area_name', links: [{ to: 'site', by: 'the same line’s site_name' }], shows: 'The Factory’s Lines tab, an area’s page (/area?site=&area=) and the area report', madeBy: ['add_to_factory_draft', 'make_record'], readBy: ['factory_map', 'resolve', 'resolve_record'],
  },
  {
    kind: 'line', word: 'Production line', what: 'A line of the factory — the home of everything done on it. A dual line is made of other lines.',
    kept: 'workspaces', links: [{ to: 'area', by: 'area_name (with site_name, client_name)' }, { to: 'line', by: 'made_of', note: 'a dual line and the lines it is made of' }],
    shows: 'Factory › the line (/lines/:id): its machines, problems, programs, tools, actions and reports', madeBy: ['add_to_factory_draft', 'make_record'], readBy: ['line_state', 'find', 'resolve', 'resolve_record', 'factory_map'],
  },
  {
    kind: 'machine', word: 'Machine (equipment, asset)', what: 'A machine is always on a line. It may say what it is (kind, model, serial, maker) and how each is known; a replaced machine is kept with its history.',
    kept: 'assets (and the line’s list of machine names)', links: [{ to: 'line', by: 'workspace_id' }, { to: 'machine', by: 'replaced_by', note: 'the machine that replaced it' }],
    shows: 'The line’s Machines tab and the machine’s page', madeBy: ['add_to_factory_draft', 'make_record', 'replace_machine', 'raise_problem'], readBy: ['line_state', 'resolve', 'factory_map', 'resolve_record'],
  },
  {
    kind: 'project', word: 'Project (improvement programme)', what: 'Work on one or more lines organised by one of the eight methods — its sections, tools and actions. Not everything is a project: tools, problems and studies work on a line with none.',
    kept: 'projects (its lines in pace_ppm)', links: [{ to: 'line', by: 'pace_ppm.workspace_id', note: 'one or more lines' }, { to: 'method', by: 'projects.method' }],
    shows: 'Projects › the project (/project/:id): its method page, Actions, Tools, Problems and reports', madeBy: ['start_project'], readBy: ['project_state', 'find', 'resolve_record'],
  },
  {
    kind: 'problem', word: 'Problem (snag, loss, issue)', what: 'Something wrong on a line, with its priority, who has it, by when, where it stands and its journey; what it costs a day when said.',
    kept: 'snags', links: [
      { to: 'line', by: 'workspace_id' }, { to: 'machine', by: 'target_asset (the machine’s name) or asset_id' }, { to: 'project', by: 'project_id', note: 'optional — a line’s own problem has none' },
      { to: 'program', by: 'program_id and products' }, { to: 'problem', by: 'after', note: 'what it waits for' },
    ],
    shows: 'Problems (the register), the line’s and the project’s Problems and Actions', madeBy: ['raise_problem', 'update_problem', 'add_photo_to_problem'], readBy: ['list_problems', 'line_state', 'resolve_record', 'overdue_actions'],
  },
  {
    kind: 'action', word: 'Action (who owes what by when)', what: 'Not a record of its own: a problem with an owner and a day is an action on the line’s tracker and the project’s Actions; a project’s plan rows are its other actions.',
    kept: 'snags.owner and snags.due_at (and a project’s plan rows)', links: [{ to: 'problem', by: 'the problem itself' }, { to: 'project', by: 'the problem’s project_id' }, { to: 'line', by: 'the problem’s workspace_id' }],
    shows: 'A line’s Actions (tracker and Gantt), a project’s Actions, the bell', madeBy: ['raise_problem', 'update_problem'], readBy: ['overdue_actions', 'project_state', 'line_state'],
  },
  {
    kind: 'study', word: 'Tool record (study, investigation, analysis, log, calculation, document)', what: 'One use of one tool — a SMED, a loss count, a capability study, a work sampling, a check log, a calculation, a document. It may sit on a line, in a project, on a machine and a product — or on none: standalone work is allowed.',
    kept: 'studies (tool says which)', links: [
      { to: 'line', by: 'workspace_id', note: 'optional' }, { to: 'project', by: 'project_id', note: 'optional, one at a time' }, { to: 'machine', by: 'machine (its name)' },
      { to: 'problem / cause / fix / test', by: 'uses (evidence or proof)', note: 'what it is evidence for or proof of' },
    ],
    shows: 'The tool’s list and page, the line’s Tools, the project’s Tools and method page', madeBy: ['start_draft', 'fill_draft', 'make_record', 'save_calculation', 'link_to_project'], readBy: ['tool_records', 'resolve_record', 'line_state', 'project_state'],
  },
  {
    kind: 'observation', word: 'Observation', what: 'Two things, never confused: a timed stop or count logged on a line (Stops timed — the Pareto’s data, a record), and a note in this conversation saying how it is known (not a record — kept on the conversation’s subject only).',
    kept: 'observations (a line’s log) · the conversation’s notes', links: [{ to: 'line', by: 'observations.workspace_id' }],
    shows: 'The line’s Stops timed (Capture · Analyse); a conversation’s notes in AI Mode', madeBy: ['record_observation (a conversation note only)'], readBy: ['line_state', 'recall'],
  },
  {
    kind: 'evidence', word: 'Evidence', what: 'What supports a finding: a tool record used as evidence or proof of a problem, a cause, a fix or a test; a problem’s photos; a countermeasure’s before → after. Only a person marks anything verified, in Faultline itself.',
    kept: 'studies.uses · snags.media · the 6M board', links: [{ to: 'problem / fix / test', by: 'studies.uses (role evidence or proof)' }],
    shows: 'Under a problem, a fix or a test (Proved by), and on the reports', madeBy: ['add_photo_to_problem'], readBy: ['tool_records', 'project_state'],
  },
  {
    kind: 'program', word: 'Program and its tests', what: 'A program on a line’s machine, proved by its tests; a test is proved by the tool records picked as its criteria.',
    kept: 'programs, tests', links: [{ to: 'machine', by: 'the machine on its line' }, { to: 'study', by: 'a test’s criteria (studies.uses role proof)' }],
    shows: 'The line’s Programs', madeBy: [], readBy: ['line_state'],
  },
  {
    kind: 'story', word: 'The story (client report)', what: 'The client’s continuous story — the brief and its asks, the chapters approved, the four figures.', kept: 'studies (tool story)',
    links: [{ to: 'client', by: 'the lines it covers' }], shows: 'The Story (home)', madeBy: [], readBy: ['story_state'],
  },
  {
    kind: 'conversation', word: 'Conversation (AI Mode)', what: 'This conversation: its subjects (current and parked) each with where it is, what the person is trying to do, whether it is just talk, standalone or in a project, its notes, decisions and open questions, and its drafts. It is not a business record — nothing in it is a fact of the factory until it is made a record.',
    kept: 'studies (tool talk, facts.colleague)', links: [], shows: 'AI Mode (/ai)', madeBy: ['set_focus', 'park_focus', 'update_context', 'record_observation', 'start_draft'], readBy: ['recall', 'draft_state'],
  },
];

/* ================================================================== THE FLOOR'S WORDS FOR A KIND OF WORK
 * "I want to carry out an observation analysis" — the activity, the tools that do it (by their keys in the catalogue's registry;
 * the test holds each to an app tool), what it needs to know first, and the one question that tells the tools apart when there
 * is more than one. A word not here falls back to the catalogue's own search. */
export interface Activity {
  id: string;
  word: string;
  /** Words a person says for it (compared as the catalogue's stems). */
  words: string[];
  /** The app tools that do it, best first — catalogue registry keys; `stops` is the line's own Stops timed. */
  tools: string[];
  /** Needs a line to start (most floor work does); needs a machine (a changeover, a machine watched). */
  needsLine: boolean;
  needsMachine?: boolean;
  /** When the tools differ by what is being looked at: the one question that tells them apart. */
  which?: string;
}

export const ACTIVITIES: readonly Activity[] = [
  { id: 'losttime', word: 'Lost production time — where the line’s time goes', words: ['losing', 'lost', 'lose', 'loss', 'production', 'efficiency', 'uptime', 'underperforming', 'productivity', 'wasted'], tools: ['stops', 'losses', 'linebalance', 'reliability'], needsLine: true },
  { id: 'observe', word: 'An observation — watching the line', words: ['observation', 'observe', 'watch', 'gemba', 'walk', 'look', 'see', 'floor', 'audit', 'waste'], tools: ['talk', 'sampling', 'stops', 'video', 'valuestream'], needsLine: true,
    which: 'What do you want to come away with — what people are doing (work sampling), what stops the line and for how long (stops timed), a walk you talk through and write up (Line Talk), or the work filmed (video study)?' },
  { id: 'downtime', word: 'Downtime — what stops the line', words: ['downtime', 'stop', 'stoppage', 'breakdown', 'availability', 'jam', 'fault', 'mtbf', 'mttr'], tools: ['stops', 'losses', 'reliability', 'workstops'], needsLine: true,
    which: 'Is it the whole line’s stops over a shift (stops timed, then the loss count), one machine watched for failures (reliability), or several workstations at once?' },
  { id: 'changeover', word: 'A changeover', words: ['changeover', 'setup', 'set', 'smed', 'change', 'product', 'switch', 'clean', 'cleandown'], tools: ['changeover'], needsLine: true, needsMachine: true },
  { id: 'output', word: 'Output short of target — capacity and the bottleneck', words: ['output', 'capacity', 'bottleneck', 'constraint', 'short', 'target', 'speed', 'throughput', 'rate', 'oee', 'performance'], tools: ['linebalance', 'losses', 'linework'], needsLine: true,
    which: 'Is it what the line can make (line capacity), where a shift’s time went (the loss count), or the people’s work against takt (line balance)?' },
  { id: 'people', word: 'The people’s work', words: ['people', 'operator', 'workload', 'takt', 'balance', 'labour', 'crew', 'idle', 'overloaded', 'manning'], tools: ['linework', 'sampling', 'video', 'linestandard'], needsLine: true,
    which: 'Do you want each person timed against takt (line balance), what they are doing at random moments (work sampling), or who stands where (line standard)?' },
  { id: 'quality', word: 'Quality — weights, rejects, a process that drifts', words: ['quality', 'reject', 'weight', 'giveaway', 'underweight', 'capability', 'cpk', 'ppk', 'spec', 'drift', 'seal', 'defect', 'leaker'], tools: ['capability', 'chart', 'analysis'], needsLine: true,
    which: 'Is it whether it can stay inside its limits (capability), whether it is steady or drifting over time (control chart), or a numbers question (analysis)?' },
  { id: 'motion', word: 'Walking and movement', words: ['walking', 'walk', 'travel', 'distance', 'motion', 'movement', 'spaghetti', 'reach', 'flt', 'forklift'], tools: ['spaghetti', 'micro', 'processflow'], needsLine: true,
    which: 'Is it where people walk across the area (spaghetti), each movement of a short task (micro-movements), or one product followed step by step (process flow)?' },
  { id: 'flow', word: 'The flow — waits and lead time', words: ['flow', 'wait', 'queue', 'lead', 'wip', 'inventory', 'value', 'stream', 'vsm', 'step'], tools: ['valuestream', 'processflow'], needsLine: true },
  { id: 'cause', word: 'A root cause', words: ['root', 'cause', 'why', 'fishbone', 'ishikawa', 'rca', '6m', 'investigate', 'investigation'], tools: ['problems', 'fmea', 'fault-tree'], needsLine: true,
    which: 'Is it one problem worked to its root (the 6M fishbone on its problem), the risks of a process ranked (FMEA), or what has to fail together for something to happen (fault tree)?' },
  { id: 'checks', word: 'Checks on a schedule', words: ['check', 'ccp', 'haccp', 'metal', 'detector', 'checkweigher', '5s', 'cilt', 'calibration', 'atp', 'label', 'allergen'], tools: ['logs'], needsLine: true },
  { id: 'hold', word: 'Product on hold', words: ['hold', 'quarantine', 'held', 'release'], tools: ['holds'], needsLine: true },
  { id: 'document', word: 'A document', words: ['document', 'charter', 'sop', '8d', 'sipoc', 'procedure', 'instruction', 'lesson'], tools: ['doc'], needsLine: false },
  { id: 'sum', word: 'A calculation', words: ['calculate', 'calculation', 'sum', 'work', 'kanban', 'stock', 'cost', 'sample', 'size'], tools: ['calc'], needsLine: false },
];

/** The line's own Stops timed — the line study's first log, not a catalogue tool (rail STUDY_SCREENS). */
export const STOPS_TOOL = { key: 'stops', label: 'Stops timed', says: 'Time every stop on the line with a stopwatch — machine and reason — for the Pareto and the loss count', href: (lineId: string) => `/w/${lineId}/capture` };

/** Words said that mean "the one we just had" — a reference to the conversation, not a name. */
export const POINTING = /\b(that|this|these|those|same|existing|previous|earlier|last|other|current|it|one we|ones we|we looked|we were|we did|we had|already)\b/i;
/** A day said ("yesterday", "last week"): the window of earlier conversations it points into, in days back from today. */
export function dayWindow(words: string): { from: number; to: number } | undefined {
  const w = words.toLowerCase();
  if (/\byesterday\b/.test(w)) return { from: 1, to: 1 };
  if (/\btoday\b|\bthis morning\b|\bearlier today\b/.test(w)) return { from: 0, to: 0 };
  if (/\blast week\b/.test(w)) return { from: 7, to: 13 };
  if (/\bthis week\b|\bthe other day\b|\brecently\b/.test(w)) return { from: 0, to: 7 };
  return undefined;
}

/** The kinds of work a person's words read as, the best match first (the catalogue's stems). */
export function activitiesFor(words: string): Activity[] {
  const said = new Set(stems(words));
  return ACTIVITIES.map(a => ({ a, n: stems(a.words.join(' ')).filter(w => said.has(w)).length })).filter(x => x.n > 0).sort((x, y) => y.n - x.n).map(x => x.a);
}
