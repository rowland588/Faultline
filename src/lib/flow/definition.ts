/* A METHOD WRITTEN AS DATA — the definition a project runs on
 * (docs/PLATFORM-REVIEW.md §6.1; docs/PLATFORM-STATUS.md).
 *
 * Rowland, 18 October: "I describe the outcome. Faultline works out the
 * appropriate structure and helps me put it into operation." Until now every
 * method was code: the method two booleans on a project (lib/planModel), the
 * stage gate's gates a fixed union and a database constraint (lib/testing).
 * A definition is the same thing said as data — stages, the steps in each,
 * who does them, what each must show, and what a gate needs before it can
 * be passed — so a method can be written, adapted and versioned without a
 * line of code, by a person on a form or by the assistant proposing one.
 *
 * A CLOSED VOCABULARY. Every building block is one of a short list below,
 * and the validator (lib/flow/validate) refuses anything else. That is what
 * makes it safe to let a model propose one: it can only compose what the app
 * already knows how to run, check and print. A new kind of block is code,
 * written and tested once — never something a sentence makes appear.
 *
 * NOTHING WORKED OUT IS STORED. Where a stage stands, what is outstanding and
 * whether a gate can be passed are read by lib/flow/runtime from the
 * definition and the records, every time — on the screen, on paper, for the
 * assistant and for the server's re-check, the same function.
 */

import { componentOf } from './components';
import { blockOf, type FlowAnalysis } from './analysis';

/** Bumped only with an upgrade function for every older shape. */
export const FLOW_SCHEMA = 1 as const;

/** Keys name things inside a definition and never change once it is active —
 *  records point at them. Lower case, short, no spaces. */
export const KEY_RE = /^[a-z][a-z0-9_-]{0,39}$/;

/** Limits that keep a definition a method, not a dump — and keep a model's
 *  answer from running away with the page. */
export const LIMITS = {
  stages: 30,
  stepsPerStage: 80,
  fieldsPerStep: 30,
  conditionsPerGate: 20,
  roles: 30,
  measures: 12,
  analysesPerStep: 20,
  needs: 10,
  text: 300,
  longText: 2000,
} as const;

/* ------------------------------- who does it ------------------------------ */

/** A named responsibility — "OEM fitter", "Site engineer" — mapped to a
 *  person when a project starts. `side` says whose people they are, the way a
 *  stage gate's line is with the supplier or the site (lib/install usualWith). */
export interface FlowRole {
  key: string;
  name: string;
  side?: 'supplier' | 'site';
  note?: string;
}

/* ------------------------------ what is kept ------------------------------ */

/** The field palette. Each is a box a person fills on the floor; `calc` is
 *  worked out from the step's own numbers by lib/flow/formula — never typed,
 *  never a model's number. */
export const FIELD_TYPES = ['text', 'number', 'reading', 'date', 'choice', 'yesno', 'person', 'calc'] as const;
export type FieldType = typeof FIELD_TYPES[number];

export interface FlowField {
  key: string;
  label: string;
  type: FieldType;
  /** number, reading, calc: "packs/min", "mm", "°C". */
  unit?: string;
  /** reading: what it must fall within — either may be absent ("at least 60"). */
  min?: number;
  max?: number;
  /** choice: the options, in order. */
  options?: string[];
  /** calc: arithmetic over this step's number, reading and calc fields, by key
   *  — "packs / minutes". */
  formula?: string;
  /** The step is not complete until it is filled. */
  required?: boolean;
  help?: string;
}

/* ------------------------------- how "yes" is said ------------------------ */

/** The answer shapes a step can have — the stage gate's (lib/install
 *  StageAnswer and a test's verdict), with a measurement in place of the run:
 *   - done       a task: done today, or it hit a problem;
 *   - check      a test: passed, or did not pass;
 *   - paperwork  "here they are": at least one file or photo;
 *   - signoff    "signed": who signed, always asked;
 *   - measure    numbers against limits — passes or does not;
 *   - form       the step's fields, filled;
 *   - log        many entries, each the step's columns, worked out by its
 *                analyses (lib/flow/analysis) — a tool designed as data.
 *  A task that goes wrong "hit a problem" (amber); a test or a measurement
 *  that goes wrong "did not pass" (red) — the stage gate's two words. */
export const ANSWERS = ['done', 'check', 'paperwork', 'signoff', 'measure', 'form', 'log'] as const;
export type FlowAnswer = typeof ANSWERS[number];

export interface FlowEvidence {
  photos?: number;
  files?: number;
}

/** A tool the app already has, placed in a step: the step is answered by
 *  that tool's own record and verdict (lib/flow/components). Only the
 *  registered ids are valid. */
export interface FlowComponent {
  tool: string;
  note?: string;
}

/** A DECISION THE METHOD MAKES ON WHAT IS FOUND (Rowland, 18 October: a
 *  system that "guides decisions"): a step needed only when an earlier
 *  step's figure — a box, a tool's number, a log's analysis — says so.
 *  "Find the cause of each signal" only when the control chart shows one.
 *  Decided once the step it reads is done; until then it is needed and waits
 *  on it; decided against, it is "not needed", said why, and counts for
 *  nothing it would have held up (lib/flow/runtime). */
export const RULE_OPS = ['>', '>=', '<', '<=', '=', '!='] as const;
export type RuleOp = typeof RULE_OPS[number];
export interface FlowRule {
  /** The earlier step whose figure decides it. */
  step: string;
  /** Its box, its tool's number or its log's analysis. */
  field: string;
  op: RuleOp;
  value: number | string | boolean;
}

export interface FlowStepDef {
  key: string;
  title: string;
  /** Once for the line, or once for every machine on it. */
  per: 'line' | 'machine';
  /** A role key — who does it. */
  role?: string;
  answer: FlowAnswer;
  /** What it must show, agreed before the day — said on the step and on paper. */
  passesIf?: string;
  fields?: FlowField[];
  evidence?: FlowEvidence;
  /** Days from the project's start it is due by. */
  dueDays?: number;
  /** Step keys that must be complete first (on the same machine, when both
   *  are per machine). */
  after?: string[];
  component?: FlowComponent;
  /* ---- a log (answer 'log'): many entries, each these columns ---- */
  /** What each entry asks — the field palette, worked-out columns too. */
  columns?: FlowField[];
  /** What the entries add up to — each a block from lib/flow/analysis; its
   *  key is a figure gates and measures read. */
  analyses?: FlowAnalysis[];
  /** Entries it needs before it can be done (1 when absent). */
  minEntries?: number;
  /** Needed only when an earlier figure says so — a decision on what is found. */
  onlyIf?: FlowRule;
  help?: string;
}

/* ---------------------------- what a gate needs ---------------------------- */

/** The condition set. Closed on purpose: each is a rule the runtime can
 *  check from records alone and say in a sentence. */
export const CONDITIONS = ['stepsDone', 'stepDone', 'evidence', 'signedOff', 'fieldMeets', 'measureMet', 'noOpenProblems', 'dateReached', 'manual'] as const;
export type ConditionType = typeof CONDITIONS[number];

export type Policy = 'block' | 'warn';

interface CondBase {
  id: string;
  /** block: the gate cannot be passed while it is unmet (an owner may still
   *  pass it with a reason, kept); warn: it can, and the pass says it was open. */
  policy: Policy;
  /** How it is said, when the app's own words are not enough. */
  label?: string;
}

export type FlowCondition = CondBase & (
  | { type: 'stepsDone' }
  | { type: 'stepDone'; step: string }
  | { type: 'evidence'; step: string; kind: 'photo' | 'file'; min: number }
  | { type: 'signedOff'; step: string }
  | { type: 'fieldMeets'; step: string; field: string; op: '>=' | '<=' | '=' | 'between'; value: number; value2?: number }
  /** A measure's latest reading meets its target (FlowMeasure). */
  | { type: 'measureMet'; measure: string }
  | { type: 'noOpenProblems'; priority: 'critical' | 'high' | 'any' }
  | { type: 'dateReached'; dueDays: number }
  | { type: 'manual'; label: string }
);

export interface FlowGate {
  conditions: FlowCondition[];
}

export interface FlowStage {
  key: string;
  name: string;
  purpose?: string;
  steps: FlowStepDef[];
  gate: FlowGate;
}

/* ------------------------------ what it measures ---------------------------- */

/** WHAT THE WORK HAS TO MOVE — a number with a before and an after (CLAUDE.md:
 *  "give every change a measured before and after"). It is fed by boxes on
 *  the method's own steps or by a tool step's figures (lib/flow/components):
 *  every reading of them, in the order recorded — the first is the before,
 *  the latest is where it stands now — judged against the target, the way
 *  that is better. Nothing is typed into a measure; it is read. */
export interface FlowMeasure {
  key: string;
  name: string;
  unit?: string;
  better: 'higher' | 'lower';
  /** What it has to reach. Absent: it is watched, not judged. */
  target?: number;
  /** The step boxes (or tool figures) that feed it — a step key and a field
   *  or figure key each. */
  from: { step: string; field: string }[];
}

/* ------------------------- what needs building first ------------------------ */

/** A CAPABILITY THE BLOCKS CANNOT GIVE — said, never faked (Rowland, 18
 *  October: "I am not expecting the AI to create reliable engineering
 *  functionality magically or without validation"). When what is asked
 *  needs arithmetic no analysis block does, the assistant writes it down as
 *  work for development: what, why, from what inputs, by what method, and
 *  how it will be checked. The method still runs on what exists; the need
 *  is on its page and its paper until a block is written for it. */
export interface FlowNeed {
  what: string;
  why: string;
  inputs?: string;
  method?: string;
  check?: string;
}

/* ------------------------------- the definition ---------------------------- */

export interface FlowDefinition {
  schema: typeof FLOW_SCHEMA;
  name: string;
  /** What it is for, in a sentence — the question it answers. */
  purpose: string;
  /** The kind of change it runs, for the library and the control room. */
  kind: 'stagegate' | 'investigation' | 'improvement' | 'other';
  roles: FlowRole[];
  stages: FlowStage[];
  /** The numbers the work has to move — read from its steps. */
  measures?: FlowMeasure[];
  /** What it needs that no block does yet — work for development. */
  needs?: FlowNeed[];
}

/* ----------------------------------- reading ------------------------------- */

export interface StepRef { stage: FlowStage; step: FlowStepDef; stageIndex: number }

/** Every step, with its stage, in order. */
export function allSteps(def: Pick<FlowDefinition, 'stages'>): StepRef[] {
  return def.stages.flatMap((stage, stageIndex) => stage.steps.map(step => ({ stage, step, stageIndex })));
}

export function findStep(def: Pick<FlowDefinition, 'stages'>, key: string): StepRef | undefined {
  return allSteps(def).find(r => r.step.key === key);
}

/** A step's numbers as a gate or a measure can name them: the boxes typed on
 *  it, then a tool step's figures (lib/flow/components) as boxes the tool
 *  fills. */
export function numbersOf(step: FlowStepDef): FlowField[] {
  const own = (step.fields ?? []).filter(f => f.type === 'number' || f.type === 'reading' || f.type === 'calc');
  const tool = componentOf(step.component?.tool)?.figures ?? [];
  /* a log's figures: each analysis that says a number */
  const logged = step.answer === 'log' ? (step.analyses ?? []).filter(a => blockOf(a.block)?.output !== 'series').map((a): FlowField => {
    const unit = analysisUnit(a, step.columns ?? []);
    return { key: a.key, label: a.label, type: 'number', ...(unit ? { unit } : {}) };
  }) : [];
  const taken = new Set(own.map(f => f.key));
  const more = [...tool.map((t): FlowField => ({ key: t.key, label: t.label, type: 'number', ...(t.unit ? { unit: t.unit } : {}) })), ...logged];
  return [...own, ...more.filter(f => (taken.has(f.key) ? false : (taken.add(f.key), true)))];
}

/** The unit an analysis's figure is said in, when it names none. */
export function analysisUnit(a: FlowAnalysis, columns: readonly FlowField[]): string | undefined {
  if (a.unit) return a.unit;
  if (a.block === 'count') return 'entries';
  if (a.block === 'share' || a.block === 'pareto') return '%';
  if (a.block === 'cpk') return undefined;
  const c = columns.find(x => x.key === a.of)?.unit;
  if (a.block === 'perDay') return a.of ? `${c ?? ''} a day`.trim() : 'a day';
  return c;
}

export const roleName = (def: Pick<FlowDefinition, 'roles'>, key?: string): string | undefined =>
  key ? def.roles.find(r => r.key === key)?.name : undefined;

/** A key from words — "Mechanical & services" → "mechanical-services" —
 *  unique against the keys already taken. */
export function keyOf(words: string, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  let base = words.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/, '');
  if (!base || !/^[a-z]/.test(base)) base = `k-${base || 'item'}`.slice(0, 32);
  let k = base, n = 2;
  while (used.has(k)) k = `${base}-${n++}`;
  return k;
}

/** A measure's key from its name — a word like a field's. */
export const measureKeyOf = (name: string, taken: Iterable<string> = []): string => fieldKeyOf(name, taken);

/** A test or a measurement says "did not pass" when it goes wrong; a task
 *  says it "hit a problem". */
export const isTest = (s: Pick<FlowStepDef, 'answer'>): boolean => s.answer === 'check' || s.answer === 'measure';

/** The kinds in words. */
export const KIND_WORD: Record<FlowDefinition['kind'], string> = {
  stagegate: 'Stage gate', investigation: 'Investigation', improvement: 'Improvement', other: 'Method',
};

export const ANSWER_WORD: Record<FlowAnswer, string> = {
  done: 'Done', check: 'Passed or not', paperwork: 'Paperwork', signoff: 'Sign-off', measure: 'Measured', form: 'Form', log: 'A log',
};

export const FIELD_WORD: Record<FieldType, string> = {
  text: 'Words', number: 'Number', reading: 'Reading with limits', date: 'Date', choice: 'Choice', yesno: 'Yes or no', person: 'Person', calc: 'Worked out',
};

/** A field's key — a word a worked-out sum can name ("packs / minutes"), so
 *  underscores, never hyphens (lib/flow/formula reads a-z, 0-9 and _). */
export const fieldKeyOf = (label: string, taken: Iterable<string> = []): string =>
  keyOf(label, [...taken].map(k => k.replace(/_/g, '-'))).replace(/-/g, '_');

/* ---------------------------- renaming a key ------------------------------ */
/* Keys never change under records. A first draft — never approved, so no
   project has a record pointing at it — may take its keys from its words as
   they are written, so a step is "kit-laid-out", not "a-new-step". These
   move every reference with the key. */

/** Give a step a new key, and everything that names it — its waits-on and
 *  every gate condition — the new one. */
export function rekeyStep(def: FlowDefinition, from: string, to: string): void {
  if (from === to) return;
  for (const st of def.stages) {
    for (const s of st.steps) {
      if (s.key === from) s.key = to;
      if (s.after) s.after = s.after.map(a => (a === from ? to : a));
      if (s.onlyIf?.step === from) s.onlyIf.step = to;
    }
    for (const c of st.gate.conditions) if ('step' in c && c.step === from) c.step = to;
  }
  for (const m of def.measures ?? []) for (const f of m.from) if (f.step === from) f.step = to;
}

/** Give a step's field a new key, and its sums and the gate conditions that
 *  read it the new one. */
export function rekeyField(def: FlowDefinition, stepKey: string, from: string, to: string): void {
  if (from === to) return;
  const word = new RegExp(`\\b${from.replace(/[^a-z0-9_]/g, '')}\\b`, 'g');
  for (const st of def.stages) {
    for (const s of st.steps) {
      if (s.key !== stepKey) continue;
      for (const f of s.fields ?? []) {
        if (f.key === from) f.key = to;
        if (f.formula) f.formula = f.formula.replace(word, to);
      }
    }
    for (const c of st.gate.conditions) if (c.type === 'fieldMeets' && c.step === stepKey && c.field === from) c.field = to;
    for (const s of st.steps) if (s.onlyIf?.step === stepKey && s.onlyIf.field === from) s.onlyIf.field = to;
  }
  for (const m of def.measures ?? []) for (const f of m.from) if (f.step === stepKey && f.field === from) f.field = to;
}
