/* DO THE RECORDS BEAR THIS PASS OUT? — the server's reading of a gate pass
 * (docs/CAPABILITY-CHECK.md item 19; supabase/GATE_CHECKS.sql;
 * supabase/functions/gatecheck).
 *
 * A gate is passed on the device, by the owner, when the runtime says every
 * blocking condition is met — or over them, with the owner's reason kept on
 * the pass (lib/flow/operations passGate). The database already lets only the
 * owner write a pass. What it could not do was read one: a device changed to
 * skip the runtime could record a pass its own records do not support, and
 * every other device would show it passed. So the server reads every pass
 * again with the SAME runtime (this file and everything it imports are
 * bundled for it by scripts/build-gatecheck.mjs) and writes its reading
 * where no device can write — and the app says it beside the pass.
 *
 * AS THE RECORDS STOOD WHEN IT WAS PASSED, not as they are now: a problem
 * raised the next day, or a machine added to the job a week later, does not
 * make a sound pass look wrong. A record made after the pass is left out; a
 * step done after the pass's day is read as not done then; a log entry
 * written after it is left out; a problem counts as open if it was raised by
 * then and not closed (or taken off) until after; a machine counts if anything shows it was
 * on the job by then; the day is the pass's own. What the records cannot say
 * — what a record held before it was changed after the pass — is not
 * guessed: the record is read as it is, and named under "changed since".
 * The times are the records' own; the database keeps them from running ahead
 * of its clock (faultline_clamp_clock).
 *
 * Three readings: the records bear it out (every blocking condition met and
 * every check confirmed); passed over what was unmet with the owner's reason
 * (the owner's call, kept, and confirmed as kept); or the records do not bear
 * it out and no reason was given — the one the app says in red. */
import { readFlow, type FlowMachine, type FlowProblem, type ToolReading } from './runtime';
import type { FlowDefinition } from './definition';
import type { FlowRecord, GateCheck, GateVerdict } from './records';
import { niceDay } from '../weeks';

export interface CheckMachine extends FlowMachine {
  /** When its record last changed — on the job by then if no later. */
  updatedAt?: number;
}

export interface CheckProblem extends FlowProblem {
  raisedAt?: number;
  closedAt?: number;
  /** Taken off, or put away by a fresh start — still there at a pass before it. */
  goneAt?: number;
}

export interface CheckInputs {
  /** The project's method, version by version — a pass is read against the
   *  version it was passed under. */
  defs: Readonly<Record<number, FlowDefinition>>;
  /** The version the project runs now — read when a pass's own is not held. */
  current: number;
  records: readonly FlowRecord[];
  machines: readonly CheckMachine[];
  problems?: readonly CheckProblem[];
  startedOn?: string;
  people?: Record<string, string>;
  /** The tool records the steps point at, read with each tool's own module. */
  tools?: Readonly<Record<string, ToolReading>>;
  /** When each of those tool records last changed, by id. */
  toolsChanged?: Readonly<Record<string, number>>;
}

export interface PassReading {
  passId: string;
  stageKey: string;
  verdict: GateVerdict;
  says: string;
  unmet: string[];
  later: string[];
  override?: string;
}

const isoOf = (t: number): string => new Date(t).toISOString().slice(0, 10);

/** One pass, read as the records stood when it was made. */
export function readPass(x: CheckInputs, pass: FlowRecord): PassReading {
  const t = pass.createdAt;
  const day = pass.doneOn ?? isoOf(t);
  const def = x.defs[pass.version] ?? x.defs[x.current];
  const later: string[] = [];
  if (!def) {
    return finish(pass, 'disagrees', ['the method it was passed under is not on the server'], later);
  }
  if (!x.defs[pass.version]) later.push(`read against version ${x.current} — version ${pass.version}, which it was passed under, is not on the server`);
  const stage = def.stages.find(s => s.key === pass.stageKey);
  if (!stage) return finish(pass, 'disagrees', [`its stage is not on version ${pass.version} of the method`], later);

  /* the records as they stood: made by then, deleted only after, a step done
     after the pass's day not done yet, a log's later entries left out */
  const records: FlowRecord[] = [];
  for (const r of x.records) {
    if (r.createdAt > t) continue;
    if (r.deletedAt && r.deletedAt <= t) continue;
    const { deletedAt: _gone, ...kept } = r;
    void _gone;
    let rec: FlowRecord = kept;
    if (rec.kind === 'step' && (rec.outcome === 'done' || rec.outcome === 'failed') && rec.doneOn && rec.doneOn > day) {
      const { doneOn: _d, ...rest } = rec;
      void _d;
      rec = { ...rest, outcome: 'planned' };
    }
    if (rec.entries?.length) rec = { ...rec, entries: rec.entries.filter(e => e.at <= t) };
    records.push(rec);
  }

  /* a machine on the job by then: its record unchanged since, or a step
     already recorded against it */
  const onIt = new Set(records.filter(r => r.assetId).map(r => r.assetId as string));
  const machines = x.machines.filter(m => (m.updatedAt ?? 0) <= t || onIt.has(m.id));
  for (const m of x.machines) if (!machines.includes(m)) later.push(`${m.name} — on the job only after it was passed`);
  const problems = (x.problems ?? [])
    .filter(p => (p.raisedAt === undefined || p.raisedAt <= t) && (p.goneAt === undefined || p.goneAt > t))
    .map(p => ({ ...p, open: p.open || (p.closedAt !== undefined && p.closedAt > t) }));

  const state = readFlow({
    def, records, machines, problems, today: day, startedOn: x.startedOn, people: x.people, tools: x.tools,
  });
  const st = state.stages.find(s => s.key === stage.key);
  if (!st) return finish(pass, 'disagrees', ['its stage could not be read'], later);

  const unmet: string[] = [];
  const before = state.stages.slice(0, st.index).find(s => !s.gate.passed);
  if (before) unmet.push(`${before.name}'s gate was not passed first`);
  for (const c of st.gate.conditions) {
    if (c.blocking) unmet.push(`${c.label} — ${c.why}`);
    else if (c.manual && !pass.checks?.[c.id]?.trim()) unmet.push(`${c.label} — not confirmed`);
  }

  /* what changed after it was passed, read as it is now */
  for (const s of st.steps) {
    const r = s.record ? x.records.find(y => y.id === s.record?.id) : undefined;
    const name = `“${s.def.title}”${s.machine ? ` (${s.machine})` : ''}`;
    if (r?.deletedAt && r.deletedAt > t) later.push(`${name} — taken off after it was passed`);
    else if (r && r.updatedAt > t) later.push(`${name} — changed after it was passed`);
    const study = r?.studyId;
    if (study && (x.toolsChanged?.[study] ?? 0) > t) later.push(`${name} — its ${s.tool?.name ?? 'study'} changed after it was passed`);
  }

  const verdict: GateVerdict = !unmet.length ? 'agrees' : pass.override?.trim() ? 'override' : 'disagrees';
  return finish(pass, verdict, unmet, later);
}

function finish(pass: FlowRecord, verdict: GateVerdict, unmet: string[], later: string[]): PassReading {
  const override = verdict === 'override' ? pass.override?.trim() : undefined;
  return {
    passId: pass.id, stageKey: pass.stageKey, verdict, unmet, later,
    ...(override ? { override } : {}),
    says: gateCheckSaid({ verdict, unmet, later, override }, pass.doneOn),
  };
}

/** Every pass on the project, read. */
export function readPasses(x: CheckInputs): PassReading[] {
  return x.records
    .filter(r => r.kind === 'gate' && r.outcome === 'done' && !r.deletedAt)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(p => readPass(x, p));
}

/** The reading as the record the server keeps. */
export function asGateCheck(p: PassReading, projectId: string, at: number, was?: Pick<GateCheck, 'createdAt'>): GateCheck {
  return {
    id: p.passId, projectId, stageKey: p.stageKey, verdict: p.verdict, says: p.says, unmet: p.unmet, later: p.later,
    ...(p.override ? { override: p.override } : {}),
    readAt: at, createdAt: was?.createdAt ?? at, updatedAt: at,
  };
}

/** Two readings the same — the server writes a reading only when it moved. */
export const sameReading = (a: Pick<GateCheck, 'verdict' | 'says' | 'unmet' | 'later'>, b: Pick<GateCheck, 'verdict' | 'says' | 'unmet' | 'later'>): boolean =>
  a.verdict === b.verdict && a.says === b.says && a.unmet.join('\n') === b.unmet.join('\n') && a.later.join('\n') === b.later.join('\n');

/* ------------------------------------------------------------------ the words */

const listed = (xs: readonly string[]) => xs.join('; ');

/** The server's reading in one sentence — the same on the screen and on paper. */
export function gateCheckSaid(c: Pick<GateCheck, 'verdict' | 'unmet' | 'later'> & { override?: string }, doneOn?: string): string {
  const lead = doneOn ? `Checked on the server, as the records stood on ${niceDay(doneOn)}: they` : 'Checked on the server: the records';
  const head = c.verdict === 'agrees'
    ? `${lead} bear this pass out — every condition was met.`
    : c.verdict === 'override'
      ? `${doneOn ? `Checked on the server, as the records stood on ${niceDay(doneOn)}:` : 'Checked on the server:'} passed over ${c.unmet.length === 1 ? 'one condition' : `${c.unmet.length} conditions`} not met — ${listed(c.unmet)} — with the owner’s reason kept: “${c.override ?? ''}”.`
      : `${lead} do not bear this pass out — ${listed(c.unmet)} — and no reason to pass over ${c.unmet.length === 1 ? 'it' : 'them'} was given.`;
  return c.later.length ? `${head} Since: ${listed(c.later)}.` : head;
}

/** The server's reading of a stage's pass, when it has one. */
export function checkOfPass(pass: Pick<FlowRecord, 'id'> | undefined, checks?: Readonly<Record<string, GateCheck>>): GateCheck | undefined {
  const c = pass ? checks?.[pass.id] : undefined;
  return c && !c.deletedAt ? c : undefined;
}

/** What a gate with no reading yet says, when the device is signed in. */
export const NOT_CHECKED = 'Not checked on the server yet — it is read there once this device has synced.';
