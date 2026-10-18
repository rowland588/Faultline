/* WHERE A PROJECT RUNNING A METHOD STANDS — read, never stored
 * (docs/PLATFORM-REVIEW.md §6.2).
 *
 * One pure function from a definition, the project's records and today to
 * everything a person or the assistant needs to know: each stage and how far
 * it has got, every step on every machine and what it is missing, each gate
 * and what it still needs, what is outstanding and whose it is, what to do
 * next, and the project in one sentence. The run view draws it, the report
 * prints it, the assistant is sent it, and the server re-checks a gate pass
 * with it — one reading, so they cannot disagree.
 *
 * The step's tones follow the stage gate's own reading (lib/install toneOf,
 * journeyOf): done is quiet; a step that did not pass is a failure when it
 * was measured and "hit a problem" (amber) when it was a task; late is a
 * separate fact from a problem, and the louder of the two colours the
 * square; a step that ran without its answer complete is asked about, not
 * filed as planned. */
import { addDays, niceDay } from '../weeks';
import { allSteps, isTest, numbersOf, roleName, type FlowCondition, type FlowDefinition, type FlowField, type FlowMeasure, type FlowStage, type FlowStepDef } from './definition';
import { answeredByRecord, componentOf } from './components';
import { calc } from './formula';
import { analyse, figuresOf, type AnalysisResult } from './analysis';
import type { FlowRecord } from './records';
import type { GateTone } from '../install';

export interface FlowMachine { id: string; name: string }
export interface FlowProblem { id?: string; title?: string; open: boolean; priority?: 'critical' | 'high' | 'low' }

/** WHAT A TOOL'S RECORD SAYS, read for a step it answers (lib/flow/toolRead
 *  reads it from the study with the tool's own module; the runtime only
 *  carries it). */
export interface ToolReading {
  tool: string;
  /** The study's own name and title, as the tool says it. */
  name: string;
  /** The tool's sentence and its one-word verdict. */
  says: string;
  verdict?: string;
  /** Enough recorded for its figures to stand. */
  enough: boolean;
  /** Its figures, by the keys lib/flow/components gives them. */
  figures: Record<string, number>;
  /** Where it opens. */
  href?: string;
}

export interface FlowInputs {
  def: FlowDefinition;
  records: readonly FlowRecord[];
  machines: readonly FlowMachine[];
  /** ISO day the project started — "due n days from the start" counts from it. */
  startedOn?: string;
  today: string;
  /** Who does each role on this project. */
  people?: Record<string, string>;
  problems?: readonly FlowProblem[];
  /** The tool records the steps point at, read — by study id. */
  tools?: Readonly<Record<string, ToolReading>>;
}

export type StepTone = 'done' | 'failed' | 'problem' | 'late' | 'asking' | 'going' | 'ahead';

export interface StepInstance {
  stageKey: string;
  def: FlowStepDef;
  assetId?: string;
  machine?: string;
  /** The current attempt — the newest record for this step on this machine. */
  record?: FlowRecord;
  attempts: number;
  /** The fields as typed, with the worked-out ones worked out. */
  values: Record<string, string | number | boolean>;
  complete: boolean;
  failed: boolean;
  late: boolean;
  due?: string;
  tone: StepTone;
  /** What it still needs, in words: "a photo", "Site engineer's sign-off". */
  missing: string[];
  /** Readings outside their limits: "Speed 52 packs/min — at least 60". */
  outOfLimits: string[];
  /** Steps it waits on that are not complete. */
  blockedBy: string[];
  /** Who it is for — the person given the role, or the role's name. */
  who?: string;
  /** A tool step: what its attached record says. */
  tool?: ToolReading;
  /** A log: what its entries add up to, analysis by analysis. */
  analysis?: Record<string, AnalysisResult>;
  /** A log: its entries not struck. */
  entries?: number;
}

/** One reading of a measure: a number recorded on one of the steps that feed it. */
export interface MeasureReading { value: number; on?: string; at: number; step: string; machine?: string }

/** WHERE A MEASURE STANDS — the first reading is the before, the latest is now. */
export interface MeasureState {
  def: FlowMeasure;
  readings: MeasureReading[];
  before?: MeasureReading;
  now?: MeasureReading;
  /** Now meets the target, the way that is better. Absent with no target or no reading. */
  met?: boolean;
  /** now − before, when there are two readings. */
  change?: number;
  /** The change is the better way. */
  improved?: boolean;
  says: string;
}

export interface ConditionState {
  id: string;
  type: FlowCondition['type'];
  policy: FlowCondition['policy'];
  label: string;
  met: boolean;
  /** A manual check: confirmed when the gate is passed, not before. */
  manual: boolean;
  /** Unmet, and it stops the gate. */
  blocking: boolean;
  why: string;
}

export interface GateState {
  conditions: ConditionState[];
  /** Every blocking condition met, and the gate before passed. */
  canPass: boolean;
  /** The gate before this one, when it is not passed yet. */
  waitsOn?: string;
  /** Warnings that would be passed over — said on the pass. */
  warnings: ConditionState[];
  passed: boolean;
  pass?: FlowRecord;
}

export interface StageState {
  key: string;
  name: string;
  index: number;
  steps: StepInstance[];
  done: number;
  total: number;
  late: number;
  failed: number;
  /** The steps alone, as the stage gate reads a gate (done when every step
   *  is done) — before the gate is asked about. */
  stepsTone: GateTone;
  /** The stage as a whole: done only when its gate is passed. */
  tone: GateTone;
  gate: GateState;
  /** Work recorded here before the gate ahead of it was passed. */
  ahead: boolean;
}

export interface Outstanding {
  kind: 'step' | 'condition' | 'gate';
  stageKey: string;
  stageName: string;
  what: string;
  why: string;
  who?: string;
  due?: string;
  late: boolean;
  failed: boolean;
  blocked: boolean;
  stepKey?: string;
  assetId?: string;
  conditionId?: string;
}

export interface FlowState {
  stages: StageState[];
  /** The first stage whose gate is not passed. */
  current?: StageState;
  outstanding: Outstanding[];
  next?: Outstanding;
  done: boolean;
  counts: { steps: number; done: number; late: number; failed: number; asking: number; gatesPassed: number; gates: number };
  verdict: { text: string; tone: 'r' | 'a' | 'g' | 'n' };
  /** What the work has to move, each before → now against its target. */
  measures: MeasureState[];
}

const live = <T extends { deletedAt?: number }>(xs: readonly T[]): T[] => xs.filter(x => !x.deletedAt);
const newest = (a: FlowRecord, b: FlowRecord) => (b.createdAt - a.createdAt) || (b.updatedAt - a.updatedAt);
const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const filled = (v: unknown) => v !== undefined && v !== null && !(typeof v === 'string' && !v.trim());
const fmt = (n: number) => (Math.abs(n) >= 100 || Number.isInteger(n) ? String(Math.round(n * 10) / 10) : String(Math.round(n * 100) / 100));
const withUnit = (n: number, f: FlowField) => `${fmt(n)}${f.unit ? ` ${f.unit}` : ''}`;

/** The step's fields with the worked-out ones worked out — by the app, from
 *  the numbers typed. */
export function valuesOf(step: FlowStepDef, typed: Record<string, string | number | boolean> = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const f of step.fields ?? []) {
    if (f.type === 'calc') continue;
    const v = typed[f.key];
    if (!filled(v)) continue;
    if (f.type === 'number' || f.type === 'reading') {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) out[f.key] = n;
    } else out[f.key] = v;
  }
  /* worked out in order, so one may read another worked out before it */
  for (let pass = 0; pass < 3; pass++) {
    for (const f of step.fields ?? []) {
      if (f.type !== 'calc' || !f.formula || out[f.key] !== undefined) continue;
      const nums: Record<string, number | undefined> = {};
      for (const [k, v] of Object.entries(out)) if (typeof v === 'number') nums[k] = v;
      const r = calc(f.formula, nums);
      if (r !== undefined) out[f.key] = r;
    }
  }
  return out;
}

/** Readings outside their limits, in words. */
export function limitsBroken(step: FlowStepDef, values: Record<string, string | number | boolean>): string[] {
  const out: string[] = [];
  for (const f of step.fields ?? []) {
    if (f.type !== 'reading' && f.type !== 'number') continue;
    const v = values[f.key];
    if (typeof v !== 'number') continue;
    if (f.min !== undefined && v < f.min) out.push(`${f.label} ${withUnit(v, f)} — at least ${withUnit(f.min, f)}`);
    else if (f.max !== undefined && v > f.max) out.push(`${f.label} ${withUnit(v, f)} — at most ${withUnit(f.max, f)}`);
  }
  return out;
}

/** What a step still needs before it is complete. `tool`: what its attached
 *  record says, when it is on this device. */
export function missingOf(def: FlowDefinition, step: FlowStepDef, rec: FlowRecord | undefined, values: Record<string, string | number | boolean>, people?: Record<string, string>, tool?: ToolReading): string[] {
  const out: string[] = [];
  for (const f of step.fields ?? []) {
    if (f.required && f.type !== 'calc' && !filled(values[f.key])) out.push(f.label);
  }
  if (step.answer === 'measure') {
    for (const f of step.fields ?? []) {
      if ((f.type === 'reading' || (f.type === 'number' && (f.min !== undefined || f.max !== undefined))) && !filled(values[f.key]) && !f.required) out.push(f.label);
    }
  }
  const photos = (rec?.media ?? []).length;
  const files = (rec?.docs ?? []).length;
  const wantPhotos = step.evidence?.photos ?? 0;
  const wantFiles = step.evidence?.files ?? 0;
  if (photos < wantPhotos) out.push(wantPhotos - photos === 1 ? 'a photo' : `${wantPhotos - photos} more photos`);
  if (files < wantFiles) out.push(wantFiles - files === 1 ? 'a file' : `${wantFiles - files} more files`);
  if (step.answer === 'paperwork' && photos + files === 0 && !wantPhotos && !wantFiles) out.push('the paperwork (a file or a photo)');
  if (step.answer === 'log') {
    const want = Math.max(1, step.minEntries ?? 1), have = (rec?.entries ?? []).filter(e => !e.struck).length;
    if (have < want) out.push(want === 1 ? 'an entry in its log' : `${want} entries in its log (${have} so far)`);
  }
  if (step.answer === 'signoff' && !rec?.signedBy?.trim()) {
    const by = (step.role && people?.[step.role]) || roleName(def, step.role);
    out.push(by ? `${by}'s sign-off` : 'a sign-off');
  }
  /* a tool step is answered by that tool's record — attached, and far enough
     on for its figures to stand: a study, or a product's Line capacity */
  if (step.component && answeredByRecord(componentOf(step.component.tool))) {
    const word = componentWord(step.component.tool);
    if (!rec?.studyId) out.push(`its ${word}`);
    else if (!tool) out.push(`its ${word} (not on this device yet)`);
    else if (!tool.enough) out.push(`its ${word} finished — ${tool.verdict ?? 'not enough recorded yet'}`);
  }
  return out;
}

const componentWord = (tool: string) => ({
  capability: 'capability study', losses: 'loss count', changeover: 'SMED study', balance: 'line balance',
  sampling: 'work sampling', map: 'value stream map', capacity: 'Line capacity',
} as Record<string, string>)[tool] ?? 'study';

function instanceTone(i: Pick<StepInstance, 'complete' | 'failed' | 'late' | 'record' | 'def' | 'values'>): StepTone {
  if (i.complete) return 'done';
  if (i.failed) return isTest(i.def) ? 'failed' : i.late ? 'late' : 'problem';
  if (i.late) return 'late';
  if (i.record?.outcome === 'done') return 'asking';
  /* Under way: a test or a measurement that has run and is waiting on its
     verdict (lib/testing needsVerdict), or a form part-filled. A task is done
     or it is not — a day typed against it without the tick is still ahead,
     as the stage gate reads an install step. */
  const signs = !!i.record && (!!i.record.doneOn || Object.keys(i.values).length > 0 || !!i.record.note?.trim());
  if (signs && (isTest(i.def) || i.def.answer === 'form')) return 'going';
  if (i.def.answer === 'log' && (i.record?.entries ?? []).some(e => !e.struck)) return 'going';
  return 'ahead';
}

/** A list of steps read as the stage gate reads a gate (lib/install
 *  journeyOf): failed beats late beats a problem; done when every one is. */
export function tonesToGate(steps: readonly Pick<StepInstance, 'tone'>[]): GateTone {
  if (!steps.length) return 'none';
  const t = steps.map(s => s.tone);
  if (t.every(x => x === 'done')) return 'done';
  if (t.includes('failed')) return 'failed';
  if (t.includes('late')) return 'late';
  if (t.includes('problem') || t.includes('asking')) return 'problem';
  if (t.some(x => x === 'done' || x === 'going')) return 'going';
  return 'ahead';
}

function opWords(c: Extract<FlowCondition, { type: 'fieldMeets' }>, f?: FlowField): string {
  const u = (n: number) => (f ? withUnit(n, f) : fmt(n));
  return c.op === '>=' ? `at least ${u(c.value)}` : c.op === '<=' ? `at most ${u(c.value)}` : c.op === '=' ? `exactly ${u(c.value)}` : `between ${u(c.value)} and ${u(c.value2 ?? c.value)}`;
}

function meets(c: Extract<FlowCondition, { type: 'fieldMeets' }>, v: number): boolean {
  return c.op === '>=' ? v >= c.value : c.op === '<=' ? v <= c.value : c.op === '=' ? Math.abs(v - c.value) < 1e-9 : v >= c.value && v <= (c.value2 ?? c.value);
}

/** Read a project running a method. */
export function readFlow(x: FlowInputs): FlowState {
  const { def, today } = x;
  const records = live(x.records);
  const machines = x.machines;
  const people = x.people ?? {};
  const whoFor = (step: FlowStepDef) => (step.role ? people[step.role]?.trim() || roleName(def, step.role) : undefined);

  /* ---- every step on every machine ---- */
  const instances = new Map<string, StepInstance[]>();
  const byStep = new Map<string, StepInstance[]>();
  for (const { stage, step } of allSteps(def)) {
    const targets: { id?: string; name?: string }[] = step.per === 'machine' && machines.length ? machines.map(m => ({ id: m.id, name: m.name })) : [{}];
    const list = targets.map(t => {
      const mine = records.filter(r => r.kind === 'step' && r.stageKey === stage.key && r.stepKey === step.key && (r.assetId ?? undefined) === (step.per === 'machine' ? t.id : undefined)).sort(newest);
      const record = mine[0];
      const tool = step.component && record?.studyId ? x.tools?.[record.studyId] : undefined;
      /* a tool step's figures sit beside its boxes, as the tool filled them;
         a log's, as its entries add up (lib/flow/analysis) */
      const analysis = step.answer === 'log' ? analyse(step.analyses, step.columns, record?.entries) : undefined;
      const values = { ...valuesOf(step, record?.values), ...(tool?.figures ?? {}), ...(analysis ? figuresOf(analysis) : {}) };
      const outOfLimits = step.answer === 'measure' || (step.fields ?? []).some(f => f.min !== undefined || f.max !== undefined) ? limitsBroken(step, values) : [];
      const missing = missingOf(def, step, record, values, people, tool);
      const failed = record?.outcome === 'failed' || (record?.outcome === 'done' && outOfLimits.length > 0);
      const complete = record?.outcome === 'done' && !missing.length && !outOfLimits.length;
      const due = record?.plannedFor ?? (x.startedOn && step.dueDays !== undefined ? addDays(x.startedOn, step.dueDays) : undefined);
      /* Late is the stage gate's rule (lib/testing isOverdue): the day came and
         it did not happen, or its day has gone and it is not settled — a task
         is settled only when done; a test is settled once it has run, and one
         that ran and did not pass says so, not "late". */
      const ran = !!record && (record.outcome !== 'planned' || !!record.doneOn || !!record.note?.trim());
      const settled = complete || (isTest(step) && ran);
      /* A task that hit a problem on a day now gone, with no day planned, is
         late from the day it hit it (lib/install lateOrProblem). */
      const end = due ?? (record?.outcome === 'failed' ? record.doneOn : undefined);
      const late = !complete && (record?.outcome === 'notRun' || (!!end && end < today && !settled));
      const inst: StepInstance = {
        stageKey: stage.key, def: step, assetId: t.id, machine: t.name, record, attempts: mine.length,
        values, complete, failed, late, due, missing, outOfLimits, blockedBy: [], tone: 'ahead', who: record?.who?.trim() || whoFor(step),
        ...(tool ? { tool } : {}),
        ...(analysis ? { analysis, entries: (record?.entries ?? []).filter(e => !e.struck).length } : {}),
      };
      inst.tone = instanceTone(inst);
      return inst;
    });
    instances.set(`${stage.key}/${step.key}`, list);
    byStep.set(step.key, list);
  }
  /* waits on: complete on the same machine when both are per machine, else
     every instance of the step waited on */
  for (const list of byStep.values()) {
    for (const inst of list) {
      for (const a of inst.def.after ?? []) {
        const dep = byStep.get(a);
        if (!dep) continue;
        const same = inst.assetId ? dep.filter(d => !d.assetId || d.assetId === inst.assetId) : dep;
        if (same.some(d => !d.complete)) inst.blockedBy.push(dep[0].def.title);
      }
    }
  }

  /* ---- what it measures: every reading of the numbers that feed it ---- */
  const measures = (def.measures ?? []).map(m => readMeasure(m, def, records, machines, x.tools));

  /* ---- the stages and their gates ---- */
  const stages: StageState[] = [];
  let prevPassed = true;
  let prevName = '';
  def.stages.forEach((stage, index) => {
    const steps = stage.steps.flatMap(s => instances.get(`${stage.key}/${s.key}`) ?? []);
    const pass = records.filter(r => r.kind === 'gate' && r.stageKey === stage.key && r.outcome === 'done').sort(newest)[0];
    const conditions = stage.gate.conditions.map(c => readCondition(c, stage, steps, byStep, x, measures));
    const blockers = conditions.filter(c => c.blocking);
    const passed = !!pass;
    const canPass = !passed && prevPassed && !blockers.length;
    const stepsTone = tonesToGate(steps);
    const tone: GateTone = passed ? 'done' : stepsTone === 'done' ? 'going' : stepsTone;
    stages.push({
      key: stage.key, name: stage.name, index, steps,
      done: steps.filter(s => s.complete).length, total: steps.length,
      late: steps.filter(s => s.late).length, failed: steps.filter(s => s.failed).length,
      stepsTone, tone,
      gate: {
        conditions, canPass, passed, pass,
        ...(!prevPassed && !passed ? { waitsOn: `${prevName}'s gate` } : {}),
        warnings: conditions.filter(c => !c.met && !c.manual && c.policy === 'warn'),
      },
      ahead: !prevPassed && steps.some(s => !!s.record),
    });
    prevPassed = prevPassed && passed;
    prevName = stage.name;
  });

  /* ---- what is outstanding, whose, by when ---- */
  const outstanding: Outstanding[] = [];
  for (const st of stages) {
    if (st.gate.passed) continue;
    for (const s of st.steps) {
      if (s.complete) continue;
      const what = `${s.def.title}${s.machine ? ` — ${s.machine}` : ''}`;
      const why = s.blockedBy.length ? `waits on ${s.blockedBy.map(b => `“${b}”`).join(' and ')}`
        : s.failed ? (s.outOfLimits.length ? `did not pass: ${s.outOfLimits.join('; ')}` : 'did not pass — to try again')
          : s.record?.outcome === 'done' && s.missing.length ? `needs ${s.missing.join(', ')}`
            : s.record?.outcome === 'notRun' ? 'the day came and it did not happen'
              : s.missing.length && s.record ? `needs ${s.missing.join(', ')}` : 'not done';
      outstanding.push({ kind: 'step', stageKey: st.key, stageName: st.name, what, why, who: s.who, due: s.due, late: s.late, failed: s.failed, blocked: s.blockedBy.length > 0, stepKey: s.def.key, assetId: s.assetId });
    }
    for (const c of st.gate.conditions) {
      if (c.met || c.manual || c.type === 'stepsDone' || c.type === 'stepDone') continue;
      if (c.policy === 'warn') continue;
      outstanding.push({ kind: 'condition', stageKey: st.key, stageName: st.name, what: c.label, why: c.why, late: false, failed: false, blocked: false, conditionId: c.id });
    }
    if (st.gate.canPass) {
      outstanding.push({ kind: 'gate', stageKey: st.key, stageName: st.name, what: `Pass ${st.name}'s gate`, why: st.gate.warnings.length ? `ready — ${many(st.gate.warnings.length, 'warning')} to note` : 'every condition met', late: false, failed: false, blocked: false });
    }
  }
  const order = new Map(stages.map(s => [s.key, s.index]));
  outstanding.sort((a, b) =>
    (Number(b.failed || b.late) - Number(a.failed || a.late))
    || ((order.get(a.stageKey) ?? 0) - (order.get(b.stageKey) ?? 0))
    || (Number(a.blocked) - Number(b.blocked))
    || (a.due ?? '9999').localeCompare(b.due ?? '9999'));

  const current = stages.find(s => !s.gate.passed);
  const next = outstanding.find(o => !o.blocked && o.stageKey === current?.key) ?? outstanding.find(o => !o.blocked);
  const all = stages.flatMap(s => s.steps);
  const counts = {
    steps: all.length, done: all.filter(s => s.complete).length, late: all.filter(s => s.late).length,
    failed: all.filter(s => s.failed).length, asking: all.filter(s => s.tone === 'asking').length,
    gatesPassed: stages.filter(s => s.gate.passed).length, gates: stages.length,
  };
  const done = stages.length > 0 && stages.every(s => s.gate.passed);
  return { stages, current, outstanding, next, done, counts, verdict: verdictOf(stages, current, done, counts), measures };
}

/** A number as a measure says it, with its unit. */
export const measureNumber = (m: Pick<FlowMeasure, 'unit'>, n: number): string => `${fmt(n)}${m.unit ? ` ${m.unit}` : ''}`;

/** A measure read from every record of the steps that feed it — every
 *  attempt, not only the latest, so a step timed before and again after is
 *  its own before → after. */
export function readMeasure(m: FlowMeasure, def: FlowDefinition, records: readonly FlowRecord[], machines: readonly FlowMachine[], tools?: Readonly<Record<string, ToolReading>>): MeasureState {
  const readings: MeasureReading[] = [];
  for (const f of m.from) {
    const ref = allSteps(def).find(r => r.step.key === f.step);
    if (!ref) continue;
    for (const r of records) {
      if (r.kind !== 'step' || r.stepKey !== f.step || r.stageKey !== ref.stage.key || r.outcome === 'planned') continue;
      const tool = ref.step.component && r.studyId ? tools?.[r.studyId] : undefined;
      if (ref.step.component && r.studyId && tool && !tool.enough) continue;
      const logged = ref.step.answer === 'log' ? figuresOf(analyse(ref.step.analyses, ref.step.columns, r.entries)) : {};
      const v = { ...valuesOf(ref.step, r.values), ...(tool?.figures ?? {}), ...logged }[f.field];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const machine = r.assetId ? machines.find(x => x.id === r.assetId)?.name : undefined;
      readings.push({ value: v, ...(r.doneOn ? { on: r.doneOn } : {}), at: r.createdAt, step: ref.step.title, ...(machine ? { machine } : {}) });
    }
  }
  readings.sort((a, b) => (a.on ?? '').localeCompare(b.on ?? '') || a.at - b.at);
  const before = readings[0], now = readings[readings.length - 1];
  const n = (v: number) => measureNumber(m, v);
  const goal = m.target !== undefined ? `target ${m.better === 'lower' ? 'at most' : 'at least'} ${n(m.target)}` : '';
  if (!now) return { def: m, readings, says: `${m.name}: not measured yet${goal ? ` — ${goal}` : ''}.` };
  const met = m.target !== undefined ? (m.better === 'lower' ? now.value <= m.target : now.value >= m.target) : undefined;
  const change = readings.length > 1 ? now.value - before.value : undefined;
  const improved = change === undefined || change === 0 ? undefined : m.better === 'lower' ? change < 0 : change > 0;
  const moved = change === undefined ? `${n(now.value)}, the first reading`
    : change === 0 ? `${n(before.value)} before, ${n(now.value)} now — no change`
      : `${n(before.value)} before, ${n(now.value)} now — ${n(Math.abs(change))} ${improved ? 'better' : 'worse'}`;
  const verdict = met === undefined ? '' : met ? ` — ${goal}, met` : ` — ${goal}, not met yet`;
  return { def: m, readings, before, now, ...(met !== undefined ? { met } : {}), ...(change !== undefined ? { change } : {}), ...(improved !== undefined ? { improved } : {}), says: `${m.name}: ${moved}${verdict}.` };
}

function readCondition(c: FlowCondition, stage: FlowStage, steps: StepInstance[], byStep: Map<string, StepInstance[]>, x: FlowInputs, measures: readonly MeasureState[]): ConditionState {
  const base = { id: c.id, type: c.type, policy: c.policy, manual: false };
  const out = (label: string, met: boolean, why: string): ConditionState => ({ ...base, label: c.label || label, met, why, blocking: !met && c.policy === 'block' });
  const titled = (key: string) => byStep.get(key)?.[0]?.def.title ?? key;
  const across = (list: StepInstance[], one: string) => (list.length > 1 ? `${list.filter(s => s.complete).length} of ${list.length} ${one}` : '');
  switch (c.type) {
    case 'stepsDone': {
      const done = steps.filter(s => s.complete).length;
      return out(`Every step in ${stage.name} done`, done === steps.length, steps.length ? `${done} of ${steps.length} done` : 'no steps');
    }
    case 'stepDone': {
      const list = byStep.get(c.step) ?? [];
      const ok = list.length > 0 && list.every(s => s.complete);
      return out(`“${titled(c.step)}” done`, ok, ok ? 'done' : across(list, 'machines done') || (list[0]?.failed ? 'did not pass' : 'not done'));
    }
    case 'evidence': {
      const list = byStep.get(c.step) ?? [];
      const count = (s: StepInstance) => (c.kind === 'photo' ? (s.record?.media ?? []).length : (s.record?.docs ?? []).length);
      const ok = list.length > 0 && list.every(s => count(s) >= c.min);
      const word = c.kind === 'photo' ? 'photo' : 'file';
      const have = list.length === 1 ? count(list[0]) : list.filter(s => count(s) >= c.min).length;
      return out(`“${titled(c.step)}” has ${many(c.min, word)}`, ok, list.length === 1 ? `${have} of ${c.min}` : `${have} of ${list.length} machines`);
    }
    case 'signedOff': {
      const list = byStep.get(c.step) ?? [];
      const ok = list.length > 0 && list.every(s => !!s.record?.signedBy?.trim() && s.record.outcome === 'done');
      const by = list.map(s => s.record?.signedBy?.trim()).filter(Boolean);
      return out(`the sign-off “${titled(c.step)}”`, ok, ok ? `signed by ${[...new Set(by)].join(', ')}` : by.length ? `${by.length} of ${list.length} signed` : 'not signed yet');
    }
    case 'fieldMeets': {
      const list = byStep.get(c.step) ?? [];
      const field = list[0] ? numbersOf(list[0].def).find(f => f.key === c.field) : undefined;
      const vals = list.map(s => s.values[c.field]).filter((v): v is number => typeof v === 'number');
      const ok = list.length > 0 && vals.length === list.length && vals.every(v => meets(c, v));
      const label = `“${titled(c.step)}”: ${field?.label ?? c.field} ${opWords(c, field)}`;
      return out(label, ok, vals.length ? vals.map(v => (field ? withUnit(v, field) : fmt(v))).join(', ') : 'not measured yet');
    }
    case 'measureMet': {
      const m = measures.find(x2 => x2.def.key === c.measure);
      if (!m) return out(`the measure “${c.measure}”`, false, 'not on the method');
      const n = (v: number) => measureNumber(m.def, v);
      const goal = m.def.target !== undefined ? `${m.def.better === 'lower' ? 'at most' : 'at least'} ${n(m.def.target)}` : 'its target';
      return out(`${m.def.name} ${goal}`, m.met === true, m.now ? `${n(m.now.value)} now` : 'not measured yet');
    }
    case 'noOpenProblems': {
      const rank = { critical: 3, high: 2, low: 1 } as const;
      const want = c.priority === 'critical' ? 3 : c.priority === 'high' ? 2 : 1;
      const open = (x.problems ?? []).filter(p => p.open && rank[p.priority ?? 'low'] >= want);
      const word = c.priority === 'any' ? 'problems' : `${c.priority}${c.priority === 'high' ? ' or critical' : ''} problems`;
      return out(`No open ${word}`, open.length === 0, open.length ? `${open.length} open${open[0]?.title ? `: ${open.slice(0, 2).map(p => p.title).join('; ')}` : ''}` : 'none open');
    }
    case 'dateReached': {
      const day = x.startedOn ? addDays(x.startedOn, c.dueDays) : undefined;
      const ok = !!day && x.today >= day;
      return out(day ? `Not before ${niceDay(day)}` : `${c.dueDays} days from the start`, ok, day ? (ok ? 'reached' : `from ${niceDay(day)}`) : 'no start date');
    }
    case 'manual':
      return { ...base, manual: true, label: c.label, met: false, blocking: false, why: 'confirmed when the gate is passed' };
  }
}

function verdictOf(stages: StageState[], current: StageState | undefined, done: boolean, counts: FlowState['counts']): FlowState['verdict'] {
  if (!stages.length) return { text: 'The method has no stages yet.', tone: 'n' };
  if (done) {
    const last = stages[stages.length - 1].gate.pass;
    return { text: `Every gate passed${last?.doneOn ? ` — the last on ${niceDay(last.doneOn)}` : ''}.`, tone: 'g' };
  }
  const st = current ?? stages[0];
  const parts = [`${st.name} (stage ${st.index + 1} of ${stages.length}): ${st.done} of ${many(st.total, 'step')} done`];
  if (st.late) parts.push(`${st.late} late`);
  if (st.failed) parts.push(`${st.failed} did not pass`);
  const blocker = st.gate.conditions.find(c => c.blocking && c.type !== 'stepsDone');
  let tail = '.';
  if (st.gate.canPass) tail = ' — ready to pass its gate.';
  else if (st.gate.waitsOn) tail = ` — ${st.gate.waitsOn} is not passed yet.`;
  else if (blocker) tail = ` — its gate needs ${lowerFirst(blocker.label)}.`;
  const tone: FlowState['verdict']['tone'] = st.failed || st.late || counts.failed ? 'r' : counts.asking || blocker ? 'a' : 'n';
  return { text: parts.join(', ') + tail, tone };
}

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/** One stage's steps on one machine, read as the stage gate reads a gate —
 *  what the parity check compares with lib/install journeyOf. */
export function machineStageTone(stage: StageState, assetId: string): GateTone {
  return tonesToGate(stage.steps.filter(s => s.assetId === assetId));
}
