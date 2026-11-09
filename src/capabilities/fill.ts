/* FILLING THE TOOLS FROM THE CONVERSATION — the Fill part of the tool connectors for every tool a draft does not cover (10 November,
 * docs/AI-OPERATING.md §2). Rowland, 10 November: "Complete conversational population across the existing tools. This means the AI must
 * genuinely populate the underlying records and studies, not simply open a page and tell me something has been done. Work through every
 * remaining tool and register."
 *
 * Each capability writes the record its tool's own page writes, with the tool's own makers and store functions — never a second shape:
 *   start_study       a new record of a tool, as its New makes it: a capability study with its setup (agreed.readings), a control
 *                     chart (agreed.chart), an analysis (agreed.analysis), a loss count (ui/ShiftLosses newLossCount), a register of
 *                     product on hold (agreed.holds), a scored register (tools/scored newScoredStudy, its rows empty), the maintenance
 *                     board (tools/board newBoardStudy), a product's Line capacity and its Line balance (a line standard, then
 *                     tools/linework balanceStudyFor)
 *   add_readings      (operate.ts) readings of every kind a capability study, chart or analysis takes
 *   count_shift       a loss count's shift counted: the good packs, the rejects, the planned minutes changed with why, a rate typed
 *   fill_register     the rows of any scored register (criticality, impact and effort, Pugh, FMEA, control plan, fault tree, skills
 *                     matrix, readiness, hygienic design, the response surface's responses) and its settings; the board's hours
 *   raise_hold        a hold raised on the register (tools/hold addHold), numbered as the page numbers it
 *   decide_hold       a hold's fate decided, in part or whole (tools/hold addOutcome)
 *   record_check      a check of a log done — passed, a value or count (judged by the check's own verdict), or failed, which raises
 *                     its problem through the log's own recordFailure
 *   time_elements     the Line balance's elements — who, what, typed seconds or laps timed
 *   set_capacity      Line capacity's target and stations — speeds as rates or cycles, units and what each contains
 *   add_cause         a cause on a 6M problem's bone, with how it is known, its rating and check; a cause's status and what its check found
 *   add_journey_step  a step on a problem's journey: what was done and what came of it
 * Every value only as said; nothing worked out here — the tools work out what it means. A write is a card; once the person has said yes
 * to a record in this conversation, later fills of THAT record go straight in (registry, confirm once — Rowland, 10 November). */
import { getCase, getStudy, getWorkspace, listCases, listStandardsForLine, patchCase, patchStudy, putStandard, putStudy, getStandard, getSnag, updateSnag } from '../db';
import type { AgreedAnalysis, AgreedChart, AgreedReadings, BalanceStep, LogResult, ScoredCriterion, ScoredRow, StudyReading, ToolStudy } from '../lib/study';
import type { Standard } from '../tools/linestandard/standard';
import type { Station } from '../tools/linebalance/capacity';
import type { Cause, Grade, SixM } from '../lib/sixm';
import { studyHref, studyTitle } from '../lib/studyLinks';
import { uid } from '../lib/ids';
import { scoredByKey } from '../tools/scored/registry';
import { newScoredStudy } from '../tools/scored/scored';
import { boardByKey } from '../tools/board/registry';
import { newBoardStudy } from '../tools/board/board';
import { newLossCount } from '../ui/ShiftLosses';
import { balanceStudyFor } from '../tools/linework/balanceLink';
import { addHold, addOutcome } from '../tools/hold/store';
import { DISPOSITIONS, UNITS, heldQty, liveHolds, type Disposition, type Hold, type HoldUnit } from '../tools/hold/hold';
import { defOf as logDefOf } from '../tools/checks/registry';
import { addResult, newResult, recordFailure } from '../tools/checks/store';
import { verdictOf, logOf } from '../tools/checks/checks';
import { ctxFrom } from '../tools/checks/ctx';
import { checkObject, ID } from './check';
import { mayEdit } from './access';
import type { CapCtx, CapRef, CapResult, Capability, Checked } from './types';
import { notFound, plural } from './util';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 400): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown, min = -1e12, max = 1e12): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const same = (a: string | undefined, b: string | undefined): boolean => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const studyRef = (s: ToolStudy): CapRef => ({ kind: 'study', id: s.id, label: studyTitle(s), href: studyHref(s) });
const todayIso = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** A record this person may change, of the tool expected. */
async function recordOf(ctx: CapCtx, id: string | undefined, ok: (s: ToolStudy) => boolean, what: string): Promise<{ ok: true; s: ToolStudy } | { ok: false; why: string }> {
  const s = id ? await getStudy(id) : undefined;
  if (!s || s.deletedAt) return notFound(what);
  if (!ok(s)) return { ok: false, why: `That record is not ${what} — find the right one with tool_records.` };
  const may = await mayEdit(ctx, s.projectId);
  return may.ok ? { ok: true, s } : may;
}
const allowedOn = (pick: (input: { studyId?: string }) => string | undefined) => async (ctx: CapCtx, input: { studyId?: string }) => {
  const id = pick(input);
  const s = id ? await getStudy(id) : undefined;
  return mayEdit(ctx, s?.projectId);
};
/** Where a record goes: its line (asked, unless it is a register with none), its project. */
const where = (input: { lineId?: string; projectId?: string }) => ({ ...(input.lineId ? { workspaceId: input.lineId } : {}), ...(input.projectId ? { projectId: input.projectId } : {}) });

/* ================================================================== start_study */
const STUDY_TOOLS = ['capability', 'chart', 'analysis', 'losses', 'holds', 'register', 'board', 'balance', 'capacity', 'standard'] as const;
type StartTool = typeof STUDY_TOOLS[number];
interface StartIn {
  tool: StartTool; lineId?: string; projectId?: string; name?: string; machine?: string; product?: string; key?: string;
  setup?: Record<string, unknown>;
}
const STUDY_WORD: Record<StartTool, string> = {
  capability: 'a capability study', chart: 'a control chart', analysis: 'an analysis', losses: 'a loss count of the shift just run', holds: 'a register of product on hold',
  register: 'a register', board: 'the maintenance board', balance: 'a Line balance', capacity: 'a product’s Line capacity', standard: 'a product’s line standard',
};
/** The product's line standard on the line — found by name, else made as Line capacity's New makes it (screens/LineToolsScreen). */
export async function standardFor(lineId: string, projectId: string | undefined, product: string, at: number, capacity: boolean): Promise<Standard> {
  const had = (await listStandardsForLine(lineId)).find(x => !x.deletedAt && same(x.product, product));
  if (had) {
    if (capacity && !had.capacity) { const s = { ...had, capacity: { stations: [] } }; await putStandard(s); return s; }
    return had;
  }
  const s: Standard = { id: uid(), projectId: projectId ?? '', workspaceId: lineId, product: product.trim(), ...(capacity ? { capacity: { stations: [] } } : {}), marks: [], sort: at, createdAt: at, updatedAt: at };
  await putStandard(s);
  return s;
}
function capabilitySetup(x: Record<string, unknown>): AgreedReadings | string {
  const kind = ['limits', 'packers', 'ticks', 'rejects', 'faults', 'rate'].find(k => k === x.kind) as AgreedReadings['kind'] | undefined;
  if (!kind) return 'Say what the study judges: a measurement against limits (limits), sold by weight (packers), pass or fail (ticks), rejects out of what was made (rejects), faults on each item (faults), or a rate held (rate).';
  const lower = num(x.lower), upper = num(x.upper), nominal = num(x.nominal);
  if ((kind === 'limits' || kind === 'rate') && lower === undefined && upper === undefined) return 'A measurement needs at least one limit, as agreed — never invented.';
  if (kind === 'packers' && nominal === undefined) return 'Sold by weight needs the nominal on the pack.';
  if ((kind === 'rejects' || kind === 'faults') && num(x.maxShare, 0, 100) === undefined) return 'Rejects or faults need the most agreed, in %.';
  const count = num(x.count, 1, 100000) ?? (kind === 'ticks' ? 20 : 30);
  return {
    kind, count: Math.round(count), ...(str(x.unit, 20) ? { unit: str(x.unit, 20) } : {}), ...(nominal !== undefined ? { nominal } : {}), ...(lower !== undefined ? { lower } : {}), ...(upper !== undefined ? { upper } : {}),
    ...(num(x.maxShare, 0, 100) !== undefined ? { maxShare: num(x.maxShare, 0, 100) } : {}), ...(num(x.allowFail, 0, 100000) !== undefined ? { allowFail: Math.round(num(x.allowFail, 0) as number) } : {}),
    ...(str(x.limitSource, 200) ? { limitSource: str(x.limitSource, 200) } : {}),
  };
}
function chartSetup(x: Record<string, unknown>, name: string): AgreedChart | string {
  const kind = ['xmr', 'xbar', 'precontrol'].find(k => k === (x.kind ?? 'xmr')) as AgreedChart['kind'] | undefined;
  if (!kind) return 'The chart is xmr (one reading at a time), xbar (subgroups) or precontrol.';
  const lower = num(x.lower), upper = num(x.upper);
  if (kind === 'precontrol' && (lower === undefined || upper === undefined)) return 'Pre-control needs both specification limits.';
  const sub = num(x.subgroup, 2, 25);
  if (kind === 'xbar' && sub === undefined) return 'An X̄ chart needs the readings in each subgroup (2–25).';
  return { kind, name: str(x.measures, 120) ?? name, ...(str(x.unit, 20) ? { unit: str(x.unit, 20) } : {}), ...(num(x.target) !== undefined ? { target: num(x.target) } : {}),
    ...(lower !== undefined ? { lower } : {}), ...(upper !== undefined ? { upper } : {}), ...(sub !== undefined ? { subgroup: Math.round(sub) } : {}) };
}
function analysisSetup(x: Record<string, unknown>, name: string): AgreedAnalysis | string {
  const q = ['sure', 'change', 'paired', 'groups', 'relate'].find(k => k === x.question);
  if (!q) return 'Say the question: sure (how sure of a mean), change (before and after), paired (two ways agree), groups (do groups differ) or relate (does one move with another).';
  const conf = [0.9, 0.95, 0.99].find(c => c === x.confidence) as 0.9 | 0.95 | 0.99 | undefined;
  const better = ['lower', 'higher', 'either'].find(k => k === x.better) as AgreedAnalysis['better'];
  const base = { name: str(x.measures, 120) ?? name, ...(str(x.unit, 20) ? { unit: str(x.unit, 20) } : {}), ...(conf ? { confidence: conf } : {}), ...(better ? { better } : {}) };
  if (q === 'sure') return { kind: 'sure', of: 'mean', ...base };
  if (q === 'change') return { kind: 'change', data: 'measured', ...base };
  if (q === 'paired') return { kind: 'paired', ...base, firstName: str(x.first, 60) ?? 'First way', secondName: str(x.second, 60) ?? 'Second way', ...(num(x.within, 0) !== undefined ? { within: num(x.within, 0) } : {}) };
  if (q === 'groups') {
    const rows = Array.isArray(x.groups) ? x.groups.map(g => str(g, 60)).filter((g): g is string => !!g) : [];
    if (rows.length < 2) return 'Name the groups compared — at least two.';
    return { kind: 'groups', ...base, firstName: str(x.groupsAre, 60) ?? 'Group', rows };
  }
  return { kind: 'relate', ...base, drivers: [{ name: str(x.driver, 60) ?? 'x', ...(str(x.driverUnit, 20) ? { unit: str(x.driverUnit, 20) } : {}) }] };
}
export const startStudy: Capability = {
  name: 'start_study', title: 'Start the record', kind: 'write',
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const tool = STUDY_TOOLS.find(t => t === raw.tool);
    if (!tool) return { ok: false, why: `The tool is one of ${STUDY_TOOLS.join(', ')}.` };
    const lineId = str(raw.lineId, 80), projectId = str(raw.projectId, 80);
    if (!lineId && tool !== 'analysis' && tool !== 'capability' && tool !== 'chart') return { ok: false, why: 'Say which line it is on.' };
    if ((tool === 'balance' || tool === 'capacity' || tool === 'standard') && !str(raw.product, 120)) return { ok: false, why: 'Line capacity, the Line balance and the line standard are a product’s — say which product.' };
    if (tool === 'register' && !scoredByKey(str(raw.key, 60))) return { ok: false, why: 'Say which register (its key: criticality, impact-effort, pugh, fmea, control-plan, fault-tree, skills, readiness, hygienic-design).' };
    const setup = isObj(raw.setup) ? raw.setup : {};
    const name = str(raw.name, 120) ?? '';
    if (tool === 'capability') { const c = capabilitySetup(setup); if (typeof c === 'string') return { ok: false, why: c }; }
    if (tool === 'chart') { const c = chartSetup(setup, name); if (typeof c === 'string') return { ok: false, why: c }; if (!name && !str(setup.measures, 120)) return { ok: false, why: 'Say what the chart measures.' }; }
    if (tool === 'analysis') { const c = analysisSetup(setup, name); if (typeof c === 'string') return { ok: false, why: c }; if (!name && !str(setup.measures, 120)) return { ok: false, why: 'Say what is measured.' }; }
    return { ok: true, input: { tool, ...(lineId ? { lineId } : {}), ...(projectId ? { projectId } : {}), ...(name ? { name } : {}), ...(str(raw.machine, 120) ? { machine: str(raw.machine, 120) } : {}),
      ...(str(raw.product, 120) ? { product: str(raw.product, 120) } : {}), ...(str(raw.key, 60) ? { key: str(raw.key, 60) } : {}), setup } };
  },
  allowed: async (ctx, input: StartIn) => mayEdit(ctx, input.projectId),
  async preview(_ctx, input: StartIn) {
    const w = input.lineId ? await getWorkspace(input.lineId) : undefined;
    const what = input.tool === 'register' ? `a ${scoredByKey(input.key)?.title ?? 'register'}` : STUDY_WORD[input.tool];
    return `Start ${what}${input.name ? ` — “${input.name}”` : ''}${input.product ? ` for ${input.product}` : ''}${w ? ` on ${w.name}` : ''}${input.projectId ? ' in the project' : ''}, as its own New makes it. Its page opens beside the conversation and what you say next goes into it.`;
  },
  async run(ctx, input: StartIn): Promise<CapResult> {
    const at = ctx.now, setup = input.setup ?? {};
    const base = { id: uid(), name: input.name ?? '', ...where(input), ...(input.machine ? { machine: input.machine } : {}), uses: [], startedAt: at, createdAt: at, updatedAt: at };
    let s: ToolStudy;
    if (input.tool === 'capability') s = { ...base, tool: 'capability', ...(input.product ? { product: input.product } : {}), agreed: { readings: capabilitySetup(setup) as AgreedReadings }, facts: { readings: [] } };
    else if (input.tool === 'chart') s = { ...base, tool: 'chart', name: base.name || (str(setup.measures) ?? ''), agreed: { chart: chartSetup(setup, base.name) as AgreedChart }, facts: { readings: [] } };
    else if (input.tool === 'analysis') s = { ...base, tool: 'analysis', name: base.name || (str(setup.measures) ?? ''), agreed: { analysis: analysisSetup(setup, base.name) as AgreedAnalysis }, facts: { readings: [] } };
    else if (input.tool === 'losses') {
      const line = await getWorkspace(input.lineId as string);
      if (!line) return notFound('line');
      s = await newLossCount(line, input.projectId, at);
    } else if (input.tool === 'holds') {
      s = { ...base, tool: 'ledger', name: base.name || 'Product on hold', agreed: { holds: { since: at, ...(Array.isArray(setup.authority) ? { authority: setup.authority.map(x => str(x, 80)).filter((x): x is string => !!x) } : {}), ...(num(setup.carryPct, 0, 100) !== undefined ? { carryPct: num(setup.carryPct, 0, 100) } : {}) } }, facts: { holds: [] } } as ToolStudy;
    } else if (input.tool === 'register') {
      const def = scoredByKey(input.key) as NonNullable<ReturnType<typeof scoredByKey>>;
      const made = newScoredStudy(def, { name: base.name || def.title, workspaceId: input.lineId as string, ...(input.projectId ? { projectId: input.projectId } : {}), now: at });
      /* the rows are the person's: a register starts empty (a matrix keeps its datum), never the definition's worked example */
      s = { ...made, agreed: { ...made.agreed, scored: { ...(made.agreed?.scored as NonNullable<ToolStudy['agreed']>['scored'] & object), rows: def.register ? [] : [], ...(def.matrix ? { criteria: [] } : {}) } } };
    } else if (input.tool === 'board') {
      const def = boardByKey('maintenance-measures');
      if (!def) return { ok: false, why: 'The maintenance board is not on this copy.' };
      s = newBoardStudy(def, { name: base.name || def.title, workspaceId: input.lineId as string, ...(input.projectId ? { projectId: input.projectId } : {}), now: at });
    } else {
      const std = await standardFor(input.lineId as string, input.projectId, input.product as string, at, input.tool !== 'standard');
      if (input.tool === 'standard') {
        const ref: CapRef = { kind: 'page', id: std.id, label: `Line standard — ${std.product}`, href: `/w/${std.workspaceId}/standards/${std.id}` };
        return { ok: true, says: `The line standard for ${std.product} is ready — say who works on the line and what each does.`, data: { standardId: std.id }, refs: [ref], show: ref };
      }
      if (input.tool === 'capacity') {
        const t = num(setup.targetPerMin, 0);
        if (t !== undefined) await putStandard({ ...std, capacity: { ...(std.capacity ?? { stations: [] }), targetPerMin: t }, updatedAt: at });
        const ref: CapRef = { kind: 'page', id: std.id, label: `Line capacity — ${std.product}`, href: `/w/${std.workspaceId}/standards/${std.id}?at=capacity` };
        return { ok: true, says: `Line capacity for ${std.product} is ready${t !== undefined ? ` with its target of ${t} a minute` : ''} — say its stations in flow order, each with its speed.`, data: { standardId: std.id }, refs: [ref], show: ref };
      }
      s = balanceStudyFor(std, { id: uid(), at });
    }
    await putStudy(s);
    const ref = studyRef(s);
    return { ok: true, says: `Started ${ref.label} — open beside the conversation.`, data: { studyId: s.id }, refs: [ref], show: ref };
  },
};

/* ================================================================== count_shift */
interface CountIn { studyId: string; made?: number; rejects?: number; plannedMin?: number; plannedWhy?: string; ratePerMin?: number }
export const countShift: Capability = {
  name: 'count_shift', title: 'Count the shift', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    const c = checkObject(raw, { studyId: ID('the loss count', true), plannedWhy: { kind: 'string', label: 'why the planned minutes differ', max: 300 } } as Parameters<typeof checkObject>[1]);
    const r = isObj(raw) ? raw : {};
    const extra = { made: num(r.made, 0), rejects: num(r.rejects, 0), plannedMin: num(r.plannedMin, 0, 1440), ratePerMin: num(r.ratePerMin, 0) };
    if (!c.ok && !/fields it does not take|not one of/.test(c.why)) return c;
    if (Object.values(extra).every(v => v === undefined)) return { ok: false, why: 'Give what was counted — the good packs, the rejects, the planned minutes or the rate.' };
    if (extra.plannedMin !== undefined && !str(r.plannedWhy)) return { ok: false, why: 'The planned minutes are changed only with why — say it.' };
    return { ok: true, input: { studyId: String(r.studyId), ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)), ...(str(r.plannedWhy) ? { plannedWhy: str(r.plannedWhy, 300) } : {}) } };
  },
  allowed: allowedOn(i => i.studyId),
  async preview(_ctx, input: CountIn) { return `Put on the loss count: ${[input.made !== undefined ? `${input.made} good` : '', input.rejects !== undefined ? `${input.rejects} rejected` : '', input.plannedMin !== undefined ? `planned ${input.plannedMin} min (${input.plannedWhy})` : '', input.ratePerMin !== undefined ? `rate ${input.ratePerMin} a minute, typed` : ''].filter(Boolean).join(', ')}.`; },
  async run(ctx, input: CountIn): Promise<CapResult> {
    const r = await recordOf(ctx, input.studyId, s => s.tool === 'losses', 'a loss count');
    if (!r.ok) return r;
    await patchStudy(r.s.id, cur => {
      const l = cur.facts.losses;
      if (!l) return {};
      return { facts: { ...cur.facts, losses: { ...l, ...(input.made !== undefined ? { made: input.made } : {}), ...(input.rejects !== undefined ? { rejects: input.rejects } : {}),
        ...(input.plannedMin !== undefined ? { plannedMin: input.plannedMin, plannedWhy: input.plannedWhy } : {}), ...(input.ratePerMin !== undefined ? { ratePerMin: input.ratePerMin, rateFrom: 'typed' as const } : {}) } } };
    });
    const ref = studyRef(r.s);
    return { ok: true, says: `Counted on ${ref.label}. The loss count works out the rest from the line’s stops.`, refs: [ref], show: ref };
  },
};

/* ================================================================== fill_register */
const SCORE_FIELDS = ['production', 'safety', 'quality', 'repair', 'likelihood', 'impact', 'effort'] as const;
const NUM_FIELDS = ['worthGbp', 'hours', 'spendGbp', 'cost'] as const;
const CHECK_FIELDS = ['group', 'source', 'evidence', 'owner', 'due', 'status', 'note', 'severity', 'shift'] as const;
const FMEA_TEXT = ['step', 'effect', 'cause', 'prevention', 'detection', 'action', 'owner', 'due', 'done', 'reason', 'evidence'] as const;
const PLAN_TEXT = ['step', 'spec', 'method', 'sample', 'owner', 'record', 'reaction', 'event'] as const;
const SETTINGS = ['rate', 'target', 'dayCost', 'speed', 'packCost', 'shiftMin', 'costToDate', 'margin', 'carryPct', 'eventCost', 'reactiveHours'] as const;
interface RegIn { studyId: string; rows?: Record<string, unknown>[]; criteria?: { name: string; weight?: number; need?: number }[]; datum?: string; settings?: Record<string, number>; period?: string }
/** One row as said, made into the register's own row: its boxes for the register's kind, checked as its editor checks them. */
export function rowFor(key: string, x: Record<string, unknown>, had: ScoredRow | undefined, criteria: ScoredCriterion[], byName: (n: string) => string | undefined): ScoredRow | string {
  const name = str(x.name, 200);
  if (!name) return 'Each row needs its name, as said.';
  const r: ScoredRow = { ...(had ?? { id: uid() }), name };
  for (const f of SCORE_FIELDS) if (x[f] !== undefined) { const v = num(x[f], 1, 5); if (v === undefined || !Number.isInteger(v)) return `${name}: ${f} is a whole number 1–5.`; r[f] = v; }
  for (const f of NUM_FIELDS) if (x[f] !== undefined) { const v = num(x[f], 0); if (v === undefined) return `${name}: ${f} is a number.`; r[f] = v; }
  for (const f of ['ccp', 'standby', 'stopper'] as const) if (typeof x[f] === 'boolean') r[f] = x[f] as boolean;
  for (const f of CHECK_FIELDS) if (str(x[f])) (r as unknown as Record<string, string>)[f] = str(x[f], 600) as string;
  if (r.due && !ISO.test(r.due)) return `${name}: the day is YYYY-MM-DD.`;
  if (isObj(x.scores)) {
    /* a matrix's marks (Pugh: −1 · 0 · +1) or a skills matrix's levels (0–4), by the criterion's or task's NAME */
    const levels = key === 'skills';
    const scores: Record<string, number | undefined> = { ...(had?.scores ?? {}) };
    for (const [k, v] of Object.entries(x.scores)) {
      const cid = criteria.find(c => same(c.name, k))?.id;
      if (!cid) return `${name}: “${k}” is not one of its ${levels ? 'tasks' : 'criteria'} — add it first.`;
      const n = num(v, levels ? 0 : -1, levels ? 4 : 1);
      if (n === undefined || !Number.isInteger(n)) return `${name}: ${levels ? 'a level is 0–4' : 'a mark is −1, 0 or +1'}.`;
      scores[cid] = n;
    }
    r.scores = scores;
  }
  if (isObj(x.fmea)) {
    const f: NonNullable<ScoredRow['fmea']> = { ...(had?.fmea ?? {}) };
    for (const k of FMEA_TEXT) if (str(x.fmea[k])) (f as Record<string, unknown>)[k] = str(x.fmea[k], 600);
    for (const k of ['s', 'o', 'd'] as const) if (x.fmea[k] !== undefined) { const v = num(x.fmea[k], 1, 10); if (v === undefined || !Number.isInteger(v)) return `${name}: ${k.toUpperCase()} is a whole number 1–10.`; f[k] = v; }
    if (isObj(x.fmea.after)) { const a: Record<string, number> = {}; for (const k of ['s', 'o', 'd'] as const) { const v = num(x.fmea.after[k], 1, 10); if (v !== undefined) a[k] = v; } f.after = a; }
    if (['H', 'M', 'L'].includes(String(x.fmea.ap))) f.ap = x.fmea.ap as 'H' | 'M' | 'L';
    if (num(x.fmea.cost, 0) !== undefined) f.cost = num(x.fmea.cost, 0);
    if (typeof x.fmea.haccp === 'boolean') f.haccp = x.fmea.haccp;
    for (const k of ['due', 'done'] as const) if (f[k] && !ISO.test(f[k] as string)) return `${name}: the ${k} day is YYYY-MM-DD.`;
    r.fmea = f;
  }
  if (isObj(x.plan)) {
    const p: NonNullable<ScoredRow['plan']> = { ...(had?.plan ?? {}) };
    for (const k of PLAN_TEXT) if (str(x.plan[k])) (p as Record<string, unknown>)[k] = str(x.plan[k], 600);
    if (x.plan.kind === 'product' || x.plan.kind === 'process') p.kind = x.plan.kind;
    for (const k of ['n', 'everyMin', 'minutes'] as const) if (num(x.plan[k], 0) !== undefined) p[k] = num(x.plan[k], 0);
    if (typeof x.plan.haccp === 'boolean') p.haccp = x.plan.haccp;
    r.plan = p;
  }
  if (isObj(x.tree)) {
    const t: NonNullable<ScoredRow['tree']> = { ...(had?.tree ?? {}) };
    if (str(x.tree.under)) { const pid = byName(str(x.tree.under) as string); if (!pid) return `${name}: “${x.tree.under}” is not on the tree yet — say it first.`; t.parent = pid; }
    if (x.tree.gate === 'AND' || x.tree.gate === 'OR') t.gate = x.tree.gate;
    if (num(x.tree.p, 0, 1) !== undefined) t.p = num(x.tree.p, 0, 1);
    if (str(x.tree.sameAs)) { const sid = byName(str(x.tree.sameAs) as string); if (!sid) return `${name}: “${x.tree.sameAs}” is not on the tree.`; t.same = sid; }
    r.tree = t;
  }
  if (isObj(x.run) && key === 'rsm') {
    const y = num(x.run.response);
    if (y === undefined) return `${name}: a run's response is a number.`;
    r.run = { ...(had?.run ?? { x: [] }), y };
  }
  return r;
}
export const fillRegister: Capability = {
  name: 'fill_register', title: 'Fill the register', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const studyId = str(raw.studyId, 80);
    if (!studyId) return { ok: false, why: 'Say which register.' };
    const rows = Array.isArray(raw.rows) ? raw.rows : undefined;
    if (rows && (rows.length > 60 || rows.some(r => !isObj(r)))) return { ok: false, why: 'Rows are a list of at most 60, each its name and boxes.' };
    const criteria = Array.isArray(raw.criteria) ? raw.criteria.flatMap(c => (isObj(c) && str(c.name, 120) ? [{ name: str(c.name, 120) as string, ...(num(c.weight, 1, 5) !== undefined ? { weight: num(c.weight, 1, 5) } : {}), ...(num(c.need, 0, 50) !== undefined ? { need: num(c.need, 0, 50) } : {}) }] : [])) : undefined;
    const settings = isObj(raw.settings) ? Object.fromEntries(SETTINGS.flatMap(k => (num((raw.settings as Record<string, unknown>)[k], 0) !== undefined ? [[k, num((raw.settings as Record<string, unknown>)[k], 0) as number]] : []))) : undefined;
    if (!rows?.length && !criteria?.length && !settings && !str(raw.datum) && !str(raw.period)) return { ok: false, why: 'Give rows, criteria or settings to put in.' };
    return { ok: true, input: { studyId, ...(rows ? { rows } : {}), ...(criteria ? { criteria } : {}), ...(settings ? { settings } : {}), ...(str(raw.datum, 120) ? { datum: str(raw.datum, 120) } : {}), ...(str(raw.period, 60) ? { period: str(raw.period, 60) } : {}) } };
  },
  allowed: allowedOn(i => i.studyId),
  async preview(_ctx, input: RegIn) {
    const s = await getStudy(input.studyId);
    return `Put into ${s ? studyTitle(s) : 'the register'}: ${[input.rows?.length ? plural(input.rows.length, 'row') + ` (${input.rows.slice(0, 4).map(r => String(r.name ?? '')).join(', ')}${input.rows.length > 4 ? ' …' : ''})` : '', input.criteria?.length ? plural(input.criteria.length, 'criterion', 'criteria') : '', input.settings ? Object.keys(input.settings).join(', ') : '', input.datum ? `the datum ${input.datum}` : ''].filter(Boolean).join('; ')} — each as said; the register ranks and works it out.`;
  },
  async run(ctx, input: RegIn): Promise<CapResult> {
    const r = await recordOf(ctx, input.studyId, s => (s.tool === 'scored' && !!s.agreed?.scored) || s.tool === 'board', 'a register');
    if (!r.ok) return r;
    if (r.s.tool === 'board') {
      const h = input.settings?.reactiveHours;
      if (h === undefined) return { ok: false, why: 'The maintenance board takes its reactive hours (settings.reactiveHours) — the rest it reads from the line’s logs and studies.' };
      await patchStudy(r.s.id, cur => ({ agreed: { ...cur.agreed, board: { ...(cur.agreed?.board ?? { key: 'maintenance-measures' }), reactiveHours: h } } }));
      const ref = studyRef(r.s);
      return { ok: true, says: `Reactive hours set to ${h} on ${ref.label}.`, refs: [ref], show: ref };
    }
    const key = r.s.agreed?.scored?.key as string;
    let problem = '';
    const added: string[] = [], changed: string[] = [];
    await patchStudy(r.s.id, cur => {
      const a = cur.agreed?.scored;
      if (!a) return {};
      let criteria = [...(a.criteria ?? [])];
      for (const c of input.criteria ?? []) {
        const i = criteria.findIndex(x => same(x.name, c.name));
        if (i >= 0) criteria[i] = { ...criteria[i], ...(c.weight !== undefined ? { weight: c.weight } : {}), ...(c.need !== undefined ? { need: c.need } : {}) };
        else criteria = [...criteria, { id: uid(), name: c.name, ...(c.weight !== undefined ? { weight: c.weight } : {}), ...(c.need !== undefined ? { need: c.need } : {}) }];
      }
      let rows = [...a.rows];
      for (const x of input.rows ?? []) {
        const i = rows.findIndex(y => same(y.name, str(x.name)));
        const row = rowFor(key, x, i >= 0 ? rows[i] : undefined, criteria, n => rows.find(y => same(y.name, n))?.id);
        if (typeof row === 'string') { problem = row; return {}; }
        if (i >= 0) { rows[i] = row; changed.push(row.name); } else { rows = [...rows, row]; added.push(row.name); }
      }
      const settings = input.settings ?? {};
      const { reactiveHours: _r, ...rest } = settings; void _r;
      return { agreed: { ...cur.agreed, scored: { ...a, rows, ...(criteria.length ? { criteria } : {}), ...(input.datum ? { datum: input.datum } : {}), ...(input.period ? { period: input.period } : {}), ...rest } } };
    });
    if (problem) return { ok: false, why: `Nothing was put in: ${problem}` };
    const ref = studyRef(r.s);
    return { ok: true, says: `${ref.label}: ${[added.length ? `added ${added.join(', ')}` : '', changed.length ? `changed ${changed.join(', ')}` : '', input.criteria?.length ? `${plural(input.criteria.length, 'criterion', 'criteria')} set` : '', input.settings ? 'settings set' : ''].filter(Boolean).join('; ')}. The register ranks them — its page is open.`, data: { added, changed }, refs: [ref], show: ref };
  },
};

/* ================================================================== holds */
interface HoldIn { studyId: string; product: string; qty: number; unit: HoldUnit; reason: string; lot?: string; where?: string; owner?: string; decideBy?: string; costEach?: number; lifeDays?: number }
export const raiseHold: Capability = {
  name: 'raise_hold', title: 'Put product on hold', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const product = str(raw.product, 160), reason = str(raw.reason, 400), qty = num(raw.qty, 0.000001), unit = UNITS.find(u => u === raw.unit);
    if (!str(raw.studyId) || !product || !reason || qty === undefined || !unit) return { ok: false, why: `A hold needs the register, the product, how much (a number and its unit: ${UNITS.join(', ')}) and why.` };
    const decideBy = str(raw.decideBy, 10);
    if (decideBy && !ISO.test(decideBy)) return { ok: false, why: 'The decide-by day is YYYY-MM-DD.' };
    return { ok: true, input: { studyId: str(raw.studyId) as string, product, qty, unit, reason, ...(str(raw.lot, 80) ? { lot: str(raw.lot, 80) } : {}), ...(str(raw.where, 120) ? { where: str(raw.where, 120) } : {}),
      ...(str(raw.owner, 80) ? { owner: str(raw.owner, 80) } : {}), ...(decideBy ? { decideBy } : {}), ...(num(raw.costEach, 0) !== undefined ? { costEach: num(raw.costEach, 0) } : {}), ...(num(raw.lifeDays, 0) !== undefined ? { lifeDays: num(raw.lifeDays, 0) } : {}) } };
  },
  allowed: allowedOn(i => i.studyId),
  async preview(_ctx, i: HoldIn) { return `Put ${i.qty} ${i.unit} of ${i.product}${i.lot ? ` (lot ${i.lot})` : ''} on hold — ${i.reason}${i.owner ? `; ${i.owner} decides` : ''}${i.decideBy ? ` by ${i.decideBy}` : ''}.`; },
  async run(ctx, i: HoldIn): Promise<CapResult> {
    const r = await recordOf(ctx, i.studyId, s => s.tool === 'ledger' && !!s.agreed?.holds, 'a register of product on hold');
    if (!r.ok) return r;
    const no = (r.s.facts.holds ?? []).reduce((m: number, h: Hold) => Math.max(m, h.no), 0) + 1;
    const h: Hold = { id: uid(), no, product: i.product, qty: i.qty, unit: i.unit, reason: i.reason, raisedOn: todayIso(ctx.now), raisedAt: ctx.now, ...(ctx.me ? { raisedBy: ctx.me } : {}),
      ...(i.lot ? { lot: i.lot } : {}), ...(i.where ? { where: i.where } : {}), ...(i.owner ? { owner: i.owner } : {}), ...(i.decideBy ? { decideBy: i.decideBy } : {}), ...(i.costEach !== undefined ? { costEach: i.costEach } : {}), ...(i.lifeDays !== undefined ? { lifeDays: i.lifeDays } : {}) };
    await addHold(r.s.id, h);
    const ref = studyRef(r.s);
    return { ok: true, says: `H-${String(no).padStart(3, '0')}: ${i.qty} ${i.unit} of ${i.product} on hold.`, data: { hold: h.id, no }, refs: [ref], show: ref };
  },
};
interface DecideIn { studyId: string; hold: string; disposition: Disposition; qty?: number; grounds?: string; extra?: number }
export const decideHold: Capability = {
  name: 'decide_hold', title: 'Decide a hold', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const disposition = DISPOSITIONS.find(d => d.key === raw.disposition)?.key;
    if (!str(raw.studyId) || !str(raw.hold) || !disposition) return { ok: false, why: `Say the register, the hold (H-001 or its product) and its fate: ${DISPOSITIONS.map(d => d.key).join(', ')}.` };
    if (disposition === 'release' && !str(raw.grounds)) return { ok: false, why: 'A release needs its grounds — what shows it is safe.' };
    return { ok: true, input: { studyId: str(raw.studyId) as string, hold: str(raw.hold, 120) as string, disposition, ...(num(raw.qty, 0.000001) !== undefined ? { qty: num(raw.qty, 0.000001) } : {}), ...(str(raw.grounds, 400) ? { grounds: str(raw.grounds, 400) } : {}), ...(num(raw.extra, 0) !== undefined ? { extra: num(raw.extra, 0) } : {}) } };
  },
  allowed: allowedOn(i => i.studyId),
  async preview(_ctx, i: DecideIn) { return `${DISPOSITIONS.find(d => d.key === i.disposition)?.word ?? i.disposition} ${i.qty !== undefined ? `${i.qty} of ` : 'all of '}${i.hold}${i.grounds ? ` — ${i.grounds}` : ''}.`; },
  async run(ctx, i: DecideIn): Promise<CapResult> {
    const r = await recordOf(ctx, i.studyId, s => s.tool === 'ledger' && !!s.agreed?.holds, 'a register of product on hold');
    if (!r.ok) return r;
    const want = i.hold.trim().toLowerCase();
    const h = liveHolds(r.s.facts.holds).find(x => `h-${String(x.no).padStart(3, '0')}` === want || String(x.no) === want.replace(/^h-?0*/, '') || same(x.product, i.hold));
    if (!h) return { ok: false, why: `No hold “${i.hold}” on this register.` };
    const left = heldQty(h);
    const qty = i.qty ?? left;
    if (qty > left) return { ok: false, why: `Only ${left} ${h.unit} of it is still held.` };
    const auth = r.s.agreed?.holds?.authority ?? [];
    await addOutcome(r.s.id, h.id, { id: uid(), disposition: i.disposition, qty, on: todayIso(ctx.now), at: ctx.now, ...(ctx.me ? { by: ctx.me } : {}), ...(i.grounds ? { grounds: i.grounds } : {}), ...(i.extra !== undefined ? { extra: i.extra } : {}) });
    const ref = studyRef(r.s);
    const flag = auth.length && ctx.me && !auth.some(a => same(a, ctx.me)) ? ` ${ctx.me} is not on the register’s list of who may decide — it is recorded and flagged, as the page does.` : '';
    return { ok: true, says: `H-${String(h.no).padStart(3, '0')}: ${qty} ${h.unit} — ${DISPOSITIONS.find(d => d.key === i.disposition)?.done ?? i.disposition}.${flag}`, refs: [ref], show: ref };
  },
};

/* ================================================================== record_check */
interface CheckIn { studyId: string; check: string; outcome: 'pass' | 'fail' | 'value' | 'count'; value?: number; count?: number; note?: string; made?: number }
export const recordCheck: Capability = {
  name: 'record_check', title: 'Record the check', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    if (!isObj(raw)) return { ok: false, why: 'The request is not an object.' };
    const outcome = ['pass', 'fail', 'value', 'count'].find(o => o === raw.outcome) as CheckIn['outcome'] | undefined;
    if (!str(raw.studyId) || !str(raw.check) || !outcome) return { ok: false, why: 'Say the log, the check by its name, and what it was: pass, fail, a value or a count.' };
    if (outcome === 'value' && num(raw.value) === undefined) return { ok: false, why: 'A value check needs its reading.' };
    if (outcome === 'count' && num(raw.count, 0) === undefined) return { ok: false, why: 'A count needs its number.' };
    return { ok: true, input: { studyId: str(raw.studyId) as string, check: str(raw.check, 160) as string, outcome, ...(num(raw.value) !== undefined ? { value: num(raw.value) } : {}), ...(num(raw.count, 0) !== undefined ? { count: num(raw.count, 0) } : {}),
      ...(str(raw.note, 400) ? { note: str(raw.note, 400) } : {}), ...(num(raw.made, 0) !== undefined ? { made: num(raw.made, 0) } : {}) } };
  },
  allowed: allowedOn(i => i.studyId),
  async preview(_ctx, i: CheckIn) { return `Record ${i.check}: ${i.outcome === 'value' ? i.value : i.outcome === 'count' ? i.count : i.outcome === 'pass' ? 'passed' : 'failed — its problem is raised on the register, as the round does'}${i.note ? ` (${i.note})` : ''}.`; },
  async run(ctx, i: CheckIn): Promise<CapResult> {
    const r = await recordOf(ctx, i.studyId, s => s.tool === 'log', 'a check log');
    if (!r.ok) return r;
    const s = r.s, log = logOf(s), def = logDefOf(log.key);
    const c = log.checks.find(x => !x.removed && same(x.name, i.check)) ?? log.checks.find(x => !x.removed && x.name.toLowerCase().includes(i.check.toLowerCase()));
    if (!c || !def) return { ok: false, why: `This log has no check “${i.check}” — its checks: ${log.checks.filter(x => !x.removed).map(x => x.name).slice(0, 12).join(', ')}.` };
    const ref = studyRef(s);
    const fail = async (o: { value?: number; count?: number }) => {
      const [line, stds] = await Promise.all([s.workspaceId ? getWorkspace(s.workspaceId) : undefined, s.workspaceId ? listStandardsForLine(s.workspaceId) : []]);
      const got = await recordFailure(s, c, def, ctx.me, { ...(i.note ? { note: i.note } : {}), ...(i.made !== undefined ? { made: i.made } : {}), ...o }, ctxFrom(line, stds, s.workspaceId));
      return { ok: true as const, says: `${c.name} failed — kept, and ${got.problemId ? 'its problem is on the register' : 'added to the failure already open'}, as the round does.`, data: { result: got.result.id, ...(got.problemId ? { problemId: got.problemId } : {}) }, refs: [ref], show: ref };
    };
    if (i.outcome === 'fail') return fail({ ...(i.value !== undefined ? { value: i.value } : {}), ...(i.count !== undefined ? { count: i.count } : {}) });
    if (i.outcome === 'pass') {
      if (c.kind !== 'passfail') return { ok: false, why: `${c.name} takes a ${c.kind === 'count' ? 'count' : c.kind === 'scored' ? 'scored audit — done on its page' : 'reading'}, not a pass.` };
      const res = newResult(c, ctx.me, { outcome: 'pass', ...(i.note ? { note: i.note } : {}) });
      await addResult(s.id, res);
      return { ok: true, says: `${c.name} — passed.`, data: { result: res.id }, refs: [ref], show: ref };
    }
    const res: LogResult = newResult(c, ctx.me, i.outcome === 'count' ? { outcome: 'count', count: i.count as number } : { outcome: 'value', value: i.value as number });
    /* judged by the check's own verdict: a reading outside its limit is a failure, raised as the round raises it */
    if (verdictOf(c, res, def) === 'bad') return fail(i.outcome === 'count' ? { count: i.count } : { value: i.value });
    await addResult(s.id, { ...res, ...(i.note ? { note: i.note } : {}) });
    return { ok: true, says: `${c.name} — ${i.outcome === 'count' ? i.count : i.value}${c.unit ? ` ${c.unit}` : ''}, within what it allows.`, data: { result: res.id }, refs: [ref], show: ref };
  },
};

/* ================================================================== time_elements */
interface ElemIn { studyId: string; elements: { who: string; name: string; sec?: number; laps?: number[]; kind?: 'work' | 'walk' | 'wait' }[]; taktSec?: number }
export const timeElements: Capability = {
  name: 'time_elements', title: 'Time the work', kind: 'write',
  target: (i: { studyId?: string }) => i.studyId,
  validate: raw => {
    if (!isObj(raw) || !str(raw.studyId)) return { ok: false, why: 'Say which Line balance.' };
    const els = Array.isArray(raw.elements) ? raw.elements : [];
    if (els.length > 60) return { ok: false, why: 'At most 60 elements at once.' };
    const out: ElemIn['elements'] = [];
    for (const e of els) {
      if (!isObj(e) || !str(e.who, 60) || !str(e.name, 160)) return { ok: false, why: 'Each element needs who does it and what it is.' };
      const laps = Array.isArray(e.laps) ? e.laps.map(x => num(x, 0.01, 36000)) : undefined;
      if (laps && laps.some(x => x === undefined)) return { ok: false, why: 'Each lap is seconds, as timed.' };
      const kind = ['work', 'walk', 'wait'].find(k => k === e.kind) as 'work' | 'walk' | 'wait' | undefined;
      out.push({ who: str(e.who, 60) as string, name: str(e.name, 160) as string, ...(num(e.sec, 0.01, 36000) !== undefined ? { sec: num(e.sec, 0.01, 36000) } : {}), ...(laps?.length ? { laps: laps as number[] } : {}), ...(kind ? { kind } : {}) });
    }
    const takt = num(raw.taktSec, 0.1, 36000);
    if (!out.length && takt === undefined) return { ok: false, why: 'Give the elements, or the takt.' };
    return { ok: true, input: { studyId: str(raw.studyId) as string, elements: out, ...(takt !== undefined ? { taktSec: takt } : {}) } };
  },
  allowed: allowedOn(i => i.studyId),
  async preview(_ctx, i: ElemIn) { return `Put on the Line balance: ${i.elements.map(e => `${e.who} — ${e.name}${e.laps ? ` (${plural(e.laps.length, 'lap')})` : e.sec !== undefined ? ` (${e.sec} s typed)` : ''}`).slice(0, 6).join('; ')}${i.elements.length > 6 ? ' …' : ''}${i.taktSec !== undefined ? `; takt ${i.taktSec} s` : ''}.`; },
  async run(ctx, i: ElemIn): Promise<CapResult> {
    const r = await recordOf(ctx, i.studyId, s => s.tool === 'balance' && !s.facts?.video, 'a Line balance');
    if (!r.ok) return r;
    await patchStudy(r.s.id, cur => {
      let steps: BalanceStep[] = [...(cur.facts.steps ?? [])];
      for (const e of i.elements) {
        const k = steps.findIndex(x => same(x.who, e.who) && same(x.name, e.name));
        const laps = (e.laps ?? []).map((sec, n) => ({ id: uid(), sec, at: ctx.now + n, ...(ctx.me ? { who: ctx.me } : {}) }));
        const kind = e.kind && e.kind !== 'work' ? { kind: e.kind === 'walk' ? 'walk' as const : 'wait' as const } : {};
        if (k >= 0) steps[k] = { ...steps[k], ...(laps.length ? { laps: [...(steps[k].laps ?? []), ...laps] } : {}), ...(e.sec !== undefined ? { typedSec: e.sec } : {}), ...kind };
        else steps = [...steps, { id: uid(), order: steps.reduce((m, x) => Math.max(m, x.order), -1) + 1, who: e.who, name: e.name, ...(laps.length ? { laps } : {}), ...(e.sec !== undefined ? { typedSec: e.sec } : {}), ...kind } as BalanceStep];
      }
      return { facts: { ...cur.facts, steps }, ...(i.taktSec !== undefined ? { agreed: { ...cur.agreed, balance: { ...(cur.agreed?.balance ?? {}), taktSec: i.taktSec } } } : {}) };
    });
    const ref = studyRef(r.s);
    return { ok: true, says: `On ${ref.label}: ${plural(i.elements.length, 'element')}. The Line balance works out each person's load against the takt — its page is open.`, refs: [ref], show: ref };
  },
};

/* ================================================================== set_capacity */
interface CapIn { standardId: string; targetPerMin?: number; stations: Partial<Station>[] }
export const setCapacity: Capability = {
  name: 'set_capacity', title: 'Set the line’s capacity', kind: 'write',
  target: (i: { standardId?: string }) => i.standardId,
  validate: raw => {
    if (!isObj(raw) || !str(raw.standardId)) return { ok: false, why: 'Say which product’s Line capacity (its standardId, from start_study).' };
    const out: Partial<Station>[] = [];
    for (const x of Array.isArray(raw.stations) ? raw.stations : []) {
      if (!isObj(x) || !str(x.name, 80)) return { ok: false, why: 'Each station needs its name.' };
      const kind = x.kind === 'people' || x.kind === 'person' ? 'people' as const : x.kind === 'machine' || x.kind === undefined ? 'machine' as const : undefined;
      if (!kind) return { ok: false, why: 'A station is a machine or people.' };
      const per = ['sec', 'min', 'hour'].find(p => p === x.ratePer) as Station['ratePer'] | undefined;
      out.push({ name: str(x.name, 80), kind, ...(str(x.unit, 40) ? { unit: str(x.unit, 40) } : {}), ...(num(x.contains, 0.0001) !== undefined ? { contains: num(x.contains, 0.0001) } : {}),
        ...(num(x.rate, 0) !== undefined ? { rate: num(x.rate, 0), ratePer: per ?? 'min' } : {}), ...(num(x.cycleSec, 0.01) !== undefined ? { cycleSec: num(x.cycleSec, 0.01) } : {}), ...(num(x.perCycle, 0.0001) !== undefined ? { perCycle: num(x.perCycle, 0.0001) } : {}) });
    }
    const t = num(raw.targetPerMin, 0);
    if (!out.length && t === undefined) return { ok: false, why: 'Give the stations, or the target.' };
    return { ok: true, input: { standardId: str(raw.standardId) as string, ...(t !== undefined ? { targetPerMin: t } : {}), stations: out } };
  },
  allowed: async (ctx, i: CapIn) => { const s = await getStandard(i.standardId); return mayEdit(ctx, s?.projectId || undefined); },
  async preview(_ctx, i: CapIn) { return `Line capacity: ${i.stations.map(s => `${s.name} (${s.rate !== undefined ? `${s.rate} a ${s.ratePer}` : s.cycleSec !== undefined ? `${s.perCycle ?? 1} every ${s.cycleSec} s` : 'no speed yet'})`).join(' → ')}${i.targetPerMin !== undefined ? `; target ${i.targetPerMin} a minute` : ''} — each as said; it works out the bottleneck.`; },
  async run(ctx, i: CapIn): Promise<CapResult> {
    const std = await getStandard(i.standardId);
    if (!std || std.deletedAt) return notFound('product’s Line capacity');
    const cap = std.capacity ?? { stations: [] };
    let stations = [...cap.stations];
    const first = cap.stations[0]?.unit;
    for (const x of i.stations) {
      const k = stations.findIndex(y => same(y.name, x.name));
      if (k >= 0) stations[k] = { ...stations[k], ...x } as Station;
      else stations = [...stations, { id: uid(), name: x.name as string, kind: x.kind ?? 'machine', unit: x.unit ?? stations[stations.length - 1]?.unit ?? first ?? 'packs', contains: x.contains ?? 1, ...x } as Station];
    }
    await putStandard({ ...std, capacity: { ...cap, stations, ...(i.targetPerMin !== undefined ? { targetPerMin: i.targetPerMin } : {}) }, updatedAt: ctx.now });
    const ref: CapRef = { kind: 'page', id: std.id, label: `Line capacity — ${std.product}`, href: `/w/${std.workspaceId}/standards/${std.id}?at=capacity` };
    return { ok: true, says: `Line capacity for ${std.product}: ${plural(stations.length, 'station')}. It works out what holds the line and what it can make — its page is open.`, refs: [ref], show: ref };
  },
};

/* ================================================================== 6M causes and a problem's journey */
const SIX: SixM[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment'];
interface CauseIn { caseId: string; cause?: string; m?: SixM; text?: string; grade?: Grade; status?: 'suspected' | 'confirmed' | 'ruled_out'; likely?: 'unlikely' | 'possible' | 'likely'; explains?: 'little' | 'some' | 'most'; found?: string; check?: { what?: string; who?: string; by?: string } }
export const addCause: Capability = {
  name: 'add_cause', title: 'Put a cause on the fishbone', kind: 'write',
  target: (i: { caseId?: string }) => i.caseId,
  validate: raw => {
    if (!isObj(raw) || !str(raw.caseId)) return { ok: false, why: 'Say which 6M problem (its caseId, from fishbone_state).' };
    const m = SIX.find(x => x === raw.m), grade = ['measured', 'counted', 'observed', 'reported'].find(g => g === raw.grade) as Grade | undefined;
    const status = ['suspected', 'confirmed', 'ruled_out'].find(s => s === raw.status) as CauseIn['status'];
    const likely = ['unlikely', 'possible', 'likely'].find(s => s === raw.likely) as CauseIn['likely'];
    const explains = ['little', 'some', 'most'].find(s => s === raw.explains) as CauseIn['explains'];
    const cause = str(raw.cause, 200), text = str(raw.text, 400);
    if (!cause && (!m || !text || !grade)) return { ok: false, why: `A new cause needs its bone (${SIX.join(', ')}), its words and how it is known (measured, counted, observed, reported); to change one, name it.` };
    if (status === 'confirmed' && !str(raw.found)) return { ok: false, why: 'A cause is confirmed with what its check found — say it.' };
    const check = isObj(raw.check) ? { ...(str(raw.check.what, 300) ? { what: str(raw.check.what, 300) } : {}), ...(str(raw.check.who, 80) ? { who: str(raw.check.who, 80) } : {}), ...(str(raw.check.by, 10) && ISO.test(String(raw.check.by)) ? { by: str(raw.check.by, 10) } : {}) } : undefined;
    return { ok: true, input: { caseId: str(raw.caseId) as string, ...(cause ? { cause } : {}), ...(m ? { m } : {}), ...(text ? { text } : {}), ...(grade ? { grade } : {}), ...(status ? { status } : {}), ...(likely ? { likely } : {}), ...(explains ? { explains } : {}), ...(str(raw.found, 400) ? { found: str(raw.found, 400) } : {}), ...(check ? { check } : {}) } };
  },
  allowed: async (ctx, i: CauseIn) => { const c = await getCase(i.caseId); return mayEdit(ctx, c?.projectId); },
  async preview(_ctx, i: CauseIn) { return i.cause ? `On the cause “${i.cause}”: ${[i.status ? i.status.replace('_', ' ') : '', i.found ? `found — ${i.found}` : '', i.likely ? `${i.likely}` : '', i.check?.what ? `check: ${i.check.what}` : ''].filter(Boolean).join('; ')}.` : `Put “${i.text}” on the ${i.m} bone, ${i.grade}, suspected until checked.`; },
  async run(ctx, i: CauseIn): Promise<CapResult> {
    const k = await getCase(i.caseId);
    if (!k || k.deletedAt) return notFound('6M problem');
    let says = '';
    let bad = '';
    await patchCase(k.id, cur => {
      const causes = [...(cur.causes ?? [])];
      if (i.cause) {
        const j = causes.findIndex(c => same(c.text, i.cause) || c.text.toLowerCase().includes((i.cause as string).toLowerCase()));
        if (j < 0) { bad = `No cause “${i.cause}” on this fishbone.`; return cur; }
        causes[j] = { ...causes[j], ...(i.status ? { status: i.status } : {}), ...(i.likely ? { likely: i.likely } : {}), ...(i.explains ? { explains: i.explains } : {}), ...(i.found ? { found: i.found } : {}), ...(i.check ? { check: { ...(causes[j].check ?? {}), ...i.check }, tick: true } : {}) };
        says = `“${causes[j].text}” — ${causes[j].status.replace('_', ' ')}${i.found ? `: ${i.found}` : ''}.`;
      } else {
        const c: Cause = { id: uid(), m: i.m as SixM, text: i.text as string, grade: i.grade as Grade, status: i.status ?? 'suspected', whys: [], ...(i.likely ? { likely: i.likely } : {}), ...(i.explains ? { explains: i.explains } : {}), ...(i.check ? { check: i.check, tick: true } : {}), ...(ctx.me ? { by: ctx.me } : {}), at: ctx.now };
        causes.push(c);
        says = `“${c.text}” is on the ${c.m} bone, ${c.grade}, ${c.status}.`;
      }
      return { ...cur, causes, updatedAt: ctx.now };
    });
    if (bad) return { ok: false, why: bad };
    const ref: CapRef = { kind: 'page', id: k.id, label: 'The fishbone', href: k.projectId ? `/project/${k.projectId}/fishbone?problem=${k.id}` : `/w/${k.workspaceId}/pareto` };
    return { ok: true, says, refs: [ref], show: ref };
  },
};
export const fishboneState: Capability = {
  name: 'fishbone_state', title: 'Read the fishbone', kind: 'read',
  validate: raw => checkObject(raw, { lineId: ID('the line'), projectId: ID('the project') }),
  allowed: async () => ({ ok: true }),
  async run(_ctx, i: { lineId?: string; projectId?: string }): Promise<CapResult> {
    if (!i.lineId) return { ok: false, why: 'Say which line.' };
    const cases = (await listCases(i.lineId)).filter(c => !c.deletedAt && (!i.projectId || c.projectId === i.projectId));
    return {
      ok: true,
      says: cases.length ? cases.map(c => `${c.title || 'A problem'}: ${plural((c.causes ?? []).length, 'cause')} (${(c.causes ?? []).filter(x => x.status === 'confirmed').length} confirmed)`).join('; ') : 'No 6M problem on this line yet.',
      data: cases.map(c => ({ caseId: c.id, problem: c.title, status: c.status, projectId: c.projectId, causes: (c.causes ?? []).map(x => ({ text: x.text, m: x.m, grade: x.grade, status: x.status, ...(x.found ? { found: x.found } : {}), whys: x.whys.length })) })),
      refs: [],
    };
  },
};
interface JourneyIn { problemId: string; did: string; result?: string }
export const addJourneyStep: Capability = {
  name: 'add_journey_step', title: 'Add to the problem’s journey', kind: 'write',
  target: (i: { problemId?: string }) => i.problemId,
  validate: raw => checkObject(raw, { problemId: ID('the problem', true), did: { kind: 'string', label: 'what was done', required: true, max: 400 }, result: { kind: 'string', label: 'what came of it', max: 400 } }) as Checked<JourneyIn>,
  allowed: async (ctx, i: JourneyIn) => { const s = await getSnag(i.problemId); return mayEdit(ctx, s?.projectId); },
  async preview(_ctx, i: JourneyIn) { return `On the problem’s journey, today: ${i.did}${i.result ? ` — ${i.result}` : ''}.`; },
  async run(ctx, i: JourneyIn): Promise<CapResult> {
    const s = await getSnag(i.problemId);
    if (!s || s.deletedAt) return notFound('problem');
    await updateSnag({ ...s, journey: [...(s.journey ?? []), { id: uid(), at: ctx.now, did: i.did, ...(i.result ? { result: i.result } : {}) }], updatedAt: ctx.now });
    const ref: CapRef = { kind: 'problem', id: s.id, label: s.problem || 'The problem', href: `/snags?open=${encodeURIComponent(s.id)}` };
    return { ok: true, says: `On the journey of “${s.problem}”: ${i.did}.`, refs: [ref], show: ref };
  },
};


/* ================================================================== the line standard's people */
interface PeopleIn { standardId: string; people: { label: string; task?: string; labels?: string[]; bottleneck?: boolean }[] }
export const placePeople: Capability = {
  name: 'place_people', title: 'Put the people on the line standard', kind: 'write',
  target: (i: { standardId?: string }) => i.standardId,
  validate: raw => {
    if (!isObj(raw) || !str(raw.standardId)) return { ok: false, why: 'Say which product’s line standard (its standardId, from start_study).' };
    const people: PeopleIn['people'] = [];
    for (const p of Array.isArray(raw.people) ? raw.people : []) {
      if (!isObj(p) || !str(p.label, 40)) return { ok: false, why: 'Each person needs their label — a role or number (Op 1), never a name.' };
      people.push({ label: str(p.label, 40) as string, ...(str(p.task, 200) ? { task: str(p.task, 200) } : {}), ...(Array.isArray(p.labels) ? { labels: p.labels.map(x => str(x, 24)).filter((x): x is string => !!x).slice(0, 6) } : {}), ...(typeof p.bottleneck === 'boolean' ? { bottleneck: p.bottleneck } : {}) });
    }
    if (!people.length || people.length > 30) return { ok: false, why: 'Give one to thirty people.' };
    return { ok: true, input: { standardId: str(raw.standardId) as string, people } };
  },
  allowed: async (ctx, i: PeopleIn) => { const s = await getStandard(i.standardId); return mayEdit(ctx, s?.projectId || undefined); },
  async preview(_ctx, i: PeopleIn) { return `On the line standard: ${i.people.map(p => `${p.label}${p.task ? ` — ${p.task}` : ''}${p.bottleneck ? ' (the bottleneck)' : ''}`).join('; ')}. New people go in a row on the board, to be dragged to where they stand.`; },
  async run(ctx, i: PeopleIn): Promise<CapResult> {
    const std = await getStandard(i.standardId);
    if (!std || std.deletedAt) return notFound('line standard');
    const marks = [...std.marks];
    const fresh = i.people.filter(p => !marks.some(m => m.kind === 'person' && same(m.label, p.label)));
    let k = 0;
    for (const p of i.people) {
      const j = marks.findIndex(m => m.kind === 'person' && same(m.label, p.label));
      const add = { ...(p.task ? { task: p.task } : {}), ...(p.labels ? { labels: p.labels } : {}), ...(p.bottleneck !== undefined ? { bottleneck: p.bottleneck } : {}) };
      if (j >= 0) marks[j] = { ...marks[j], ...add };
      /* a row across the middle of the board, evenly spaced — where they stand is dragged on the board */
      else { k++; marks.push({ id: uid(), kind: 'person', x: Math.round((k / (fresh.length + 1)) * 100), y: 50, label: p.label, ...add }); }
    }
    await putStandard({ ...std, marks, updatedAt: ctx.now });
    const ref: CapRef = { kind: 'page', id: std.id, label: `Line standard — ${std.product}`, href: `/w/${std.workspaceId}/standards/${std.id}` };
    return { ok: true, says: `${std.product}'s line standard: ${plural(i.people.length, 'person', 'people')} — drag each to where they stand on its board.`, refs: [ref], show: ref };
  },
};

export const FILL: readonly Capability[] = [placePeople, startStudy, countShift, fillRegister, raiseHold, decideHold, recordCheck, timeElements, setCapacity, addCause, fishboneState, addJourneyStep];

export const _types = undefined as unknown as StudyReading;
