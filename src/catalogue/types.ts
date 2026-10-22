/* THE CATALOGUE OF TOOLS — every manufacturing tool Faultline has, partly has,
 * has specified, could build, must research first, or left out on purpose
 * (knowledge/README.md). Rowland, 22 October: "What manufacturing tools can
 * Faultline currently do, and what can it support next?"
 *
 * One entry a meaningful capability, never a name per screen: a method can be
 * a tool of its own, a mode inside another, a part several share, a workflow
 * across several, or a report. Each has a stable number (FC-001 …) that is
 * never reused or renumbered, so "Build FC-012" means one thing for good.
 *
 * Its status is a claim the code must bear out — the catalogue's test
 * (src/catalogue/__tests__/catalogue.test.ts) checks every "available" and
 * "partial" against the files, routes, tests and acceptance scripts it names,
 * and that every tool in the app's own lists has an entry. The knowledge
 * behind each entry is in knowledge/methods/, named by `methods`. */

/** Where an entry stands — the only words the directory uses for it. */
export type Status =
  /** Built, and proved: its arithmetic by unit tests, its use by an acceptance script in the gate,
   *  and its specification's scope, report and acceptance criteria (knowledge/STANDARD.md; the
   *  tools available before 22 October are in AVAILABLE_BEFORE_STANDARD). */
  | 'available'
  /** Built with known limits — each limit said in `limits`. */
  | 'partial'
  /** A specification exists (knowledge/specs/) and it is not built yet. */
  | 'specified'
  /** The method is established and understood; nothing is specified or built. */
  | 'to-build'
  /** The method, the data or the requirement needs research before it can be specified. */
  | 'research'
  /** Decided against, with who decided and why in `decided`. */
  | 'left-out';

export const STATUSES: readonly Status[] = ['available', 'partial', 'specified', 'to-build', 'research', 'left-out'];

export const STATUS_WORDS: Record<Status, string> = {
  available: 'Available',
  partial: 'Partly',
  specified: 'Planned',
  'to-build': 'Not built yet',
  research: 'Research first',
  'left-out': 'Left out on purpose',
};

/** What shape it takes in the app — a method does not need a screen of its own. */
export type Form =
  | 'tool'       // a tool of its own, on the rail
  | 'mode'       // a mode or analysis inside another tool (partOf names it)
  | 'component'  // a part several tools share
  | 'workflow'   // a guided way through several tools — a kind of change
  | 'report'     // a report, a board or a picture over what is kept
  | 'research';  // not decided until it is researched

export const FORM_WORDS: Record<Form, string> = {
  tool: 'a tool of its own', mode: 'a mode of another tool', component: 'a part several tools share',
  workflow: 'a way through several tools', report: 'a report or board', research: 'decided after research',
};

export type Size = 'S' | 'M' | 'L' | 'XL';
export type Value = 'high' | 'medium' | 'low';

export interface Discipline {
  id: string;
  name: string;
  /** Subdisciplines, by key. */
  subs: Record<string, string>;
}

/** The disciplines and their subdisciplines — the catalogue's hierarchy. */
export const DISCIPLINES: readonly Discipline[] = [
  { id: 'lean', name: 'Lean manufacturing and waste', subs: { flow: 'Value stream and flow', waste: 'Waste', standard: 'Standard work', pull: 'Pull and levelling', workplace: '5S and the visual workplace', poka: 'Mistake-proofing', kaizen: 'Improvement events and kata' } },
  { id: 'ie', name: 'Industrial engineering and work measurement', subs: { time: 'Time study', pmts: 'Predetermined motion times', sampling: 'Work sampling', standards: 'Labour standards and allowances', method: 'Method study', productivity: 'Labour productivity' } },
  { id: 'capacity', name: 'Capacity, throughput and bottlenecks', subs: { line: 'Line capacity', balance: 'Line balance', constraint: 'Constraints (TOC)', queue: 'Queues, WIP and buffers', demand: 'Load against demand' } },
  { id: 'equipment', name: 'Equipment performance and losses', subs: { time: 'The time model and losses', stops: 'Stops and downtime', speed: 'Speed and short stops', cost: 'Losses in money' } },
  { id: 'maintenance', name: 'Maintenance, reliability and TPM', subs: { reliability: 'Reliability statistics', repair: 'Maintainability', tpm: 'TPM routines', strategy: 'Maintenance strategy', spares: 'Spares' } },
  { id: 'changeover', name: 'Changeovers', subs: { smed: 'SMED', sequence: 'Sequence and interval', release: 'Start-up and release' } },
  { id: 'commissioning', name: 'Commissioning and operational readiness', subs: { gate: 'The stage gate', acceptance: 'Acceptance testing', ramp: 'Ramp-up', readiness: 'Readiness and handover' } },
  { id: 'spc', name: 'Statistical process control and capability', subs: { charts: 'Control charts', signals: 'Signals and small shifts', capability: 'Capability — measured data', attribute: 'Capability — counted data', checks: 'Before capability' } },
  { id: 'stats', name: 'Statistical analysis', subs: { describe: 'Describing data', intervals: 'Confidence intervals', compare: 'Comparing and testing', relate: 'Relationships and regression', doe: 'Designed experiments', plan: 'Sample size and data' } },
  { id: 'msa', name: 'Measurement systems', subs: { gauge: 'Gauge studies', attribute: 'Inspectors agreeing', calibration: 'Calibration and uncertainty' } },
  { id: 'quality', name: 'Quality engineering and defects', subs: { defects: 'Defect analysis', inspection: 'Sampling inspection', cost: 'Cost of quality', risk: 'Risk and control', customer: 'Complaints and suppliers', product: 'Product checks' } },
  { id: 'sixsigma', name: 'Six Sigma and DMAIC', subs: { define: 'Define', dmaic: 'The DMAIC structure', metrics: 'Defect metrics', decide: 'Choosing solutions' } },
  { id: 'rca', name: 'Root cause and problem solving', subs: { causes: 'Finding causes', structured: 'Structured problem solving', spread: 'Spreading a fix' } },
  { id: 'yield', name: 'Yield, give-away and materials', subs: { giveaway: 'Give-away and fill', yield: 'Yield and mass balance', waste: 'Material and food waste' } },
  { id: 'packaging', name: 'Packaging, filling and weighing', subs: { weight: 'Weights and measures', seal: 'Seals and packs', code: 'Codes and labels', gas: 'Pack atmosphere' } },
  { id: 'foodsafety', name: 'Food safety, hygiene and traceability', subs: { haccp: 'HACCP and CCPs', foreign: 'Foreign bodies', allergen: 'Allergens', hygiene: 'Cleaning and hygiene', trace: 'Traceability', life: 'Shelf life and temperature', audit: 'Audits' } },
  { id: 'planning', name: 'Production planning and scheduling', subs: { schedule: 'Scheduling', lots: 'Batches and stock', crew: 'Crewing and shifts', plan: 'Plan and attainment' } },
  { id: 'cost', name: 'Cost and operational performance', subs: { unit: 'Cost a pack', loss: 'Losses in money', invest: 'Investment and payback' } },
  { id: 'visual', name: 'Visual and daily management', subs: { control: 'Am I in control', daily: 'Daily management', walk: 'Gemba', kpi: 'Measures and KPIs', talk: 'Talk and reports' } },
  { id: 'ergonomics', name: 'Ergonomics, layout and automation', subs: { handling: 'Manual handling', posture: 'Posture and repetition', layout: 'Layout and material flow' } },
  { id: 'projects', name: 'Projects and continuous improvement', subs: { kinds: 'The three kinds of change', manage: 'Running a project', programme: 'The improvement programme' } },
  { id: 'people', name: 'Skills and training', subs: { skills: 'Skills', instruction: 'Instruction' } },
  { id: 'sustainability', name: 'Energy, water and environment', subs: { utilities: 'Utilities', waste: 'Waste and carbon' } },
];

/** The production scenarios the directory filters by — the situation, not the method. */
export const SCENARIOS: Record<string, string> = {
  running: 'A running line to make better',
  new: 'New equipment or a new line',
  changeover: 'Changeovers and start-ups',
  packing: 'Packing, filling and weighing',
  people: 'People and labour',
  machine: 'A machine that stops',
  quality: 'Quality, rejects and defects',
  safety: 'Food safety and hygiene',
  planning: 'Planning the week',
  money: 'Money',
  project: 'Running an improvement project',
  daily: 'Day to day on the floor',
};

/** Where it was built and how it is proved — the paths the test checks exist. */
export interface Built {
  /** Routes it opens at, as `nav()` takes them: '/capability'. */
  where: string[];
  /** The source files that do it. */
  code: string[];
  /** Unit tests of its arithmetic. */
  tests: string[];
  /** Acceptance scripts in the gate that drive it — file names in scripts/acceptance/. */
  acceptance: string[];
}

export interface Entry {
  /** Stable: FC- and three digits. Never reused, never renumbered. */
  id: string;
  name: string;
  discipline: string;
  /** A key of the discipline's subs. */
  sub: string;
  /** The practical problem, in the floor's words. */
  problem: string;
  /** The questions it answers and the decisions it supports. */
  questions: string[];
  /** The technique or principle underneath. */
  method: string;
  /** The data, measurements or observations it needs. */
  inputs: string;
  /** The figures, pictures, findings and recommendations it gives. */
  outputs: string;
  /** How a food factory would use it. */
  food: string;
  /** Related entries: prerequisites, complements, next steps (FC ids). */
  depends: string[];
  complexity: Size;
  value: Value;
  /** Why it is worth that, and to whom. */
  valueWhy: string;
  status: Status;
  form: Form;
  /** For a mode: the entry it is a mode of. */
  partOf?: string;
  /** The knowledge records behind it (knowledge/methods/<discipline>/<slug>.md ids). */
  methods: string[];
  /** Words a person might search with, beyond those above ("leakers", "short weight"). */
  words?: string[];
  /** Production scenarios it serves — the directory's filter. */
  scenarios?: string[];
  built?: Built;
  /** Known limits — required for "partial", kept honest for "available". */
  limits?: string[];
  /** For "left-out": who decided, when and why — quoted. */
  decided?: string;
  /** For "specified": the specification (knowledge/specs/...). */
  spec?: string;
}

/** A PROBLEM, AND THE WAY THROUGH IT — the floor's words first, then the
 *  questions to ask in order, each with the entries that answer it and when
 *  each applies. Not a sequence to follow every time: the right step depends
 *  on the question and the data. */
export interface ProblemRoute {
  id: string;
  title: string;
  /** Words people use for it. */
  words: string[];
  steps: { ask: string; ids: string[]; when?: string }[];
  /** What is not known well enough to guide, said plainly. */
  caveat?: string;
}

/** THE BACKLOG — what to build first, separate from the catalogue: an order
 *  with its reasons. Only entries not yet available. */
export interface BacklogItem {
  id: string;
  why: string;
}
