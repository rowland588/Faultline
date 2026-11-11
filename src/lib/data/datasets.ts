/* FAULTLINE'S OWN RECORDS AS TABLES (docs/CONVERSATIONAL-DATA.md) — the line's stops, the programs' trials, a study's readings and the
 * problems, each laid out field by field from the records the pages read, so Luna can ask any of them what she asks a workbook.
 * A field is filled only from what was recorded: a stop counted with no stopwatch has no minutes (not 0), a stop's shift is there only if
 * it was said, a trial's net rate is worked out only when its minutes, packs and rejects were all written. What a dataset cannot hold is
 * said in its `limits`. Pure: the records are handed in. */
import type { Observation, Workspace } from '../../types';
import type { Snag } from '../../snag/types';
import type { Asset, Test } from '../testing';
import type { Program } from '../programs';
import type { ToolStudy, StudyReading } from '../study';
import { productRuns } from '../run';
import type { Cell, Dataset, Field } from './table';
import type { DataConnectionRow } from '../../db/rows';
import type { ProductionRecord } from '../production/ingestCore';
import { delivered } from '../production/production';

const day = (ms?: number): string | null => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null);
const txt = (s?: string | null): string | null => (s && s.trim() ? s.trim() : null);
const num = (n?: number | null): number | null => (typeof n === 'number' && Number.isFinite(n) ? n : null);

const HOW: Record<Observation['timing'], string> = { stopwatch: 'measured', typed: 'reported', instant: 'counted' };

/* ------------------------------------------------------------------ stops */
export const STOP_FIELDS: Field[] = [
  { name: 'day', type: 'date', means: 'the day the stop began' },
  { name: 'hour', type: 'number', means: 'the hour of the day it began (0–23)' },
  { name: 'line', type: 'text', means: 'the line' },
  { name: 'machine', type: 'text', means: 'the machine or place it was on' },
  { name: 'category', type: 'text', means: 'what stopped it, as tapped or typed on the floor' },
  { name: 'detail', type: 'text', means: 'the detail under the category, when given' },
  { name: 'shift', type: 'text', means: 'the shift, only when the person said it' },
  { name: 'minutes', type: 'number', unit: 'min', means: 'how long it lasted — by stopwatch or typed; none for a stop only counted' },
  { name: 'count', type: 'number', means: 'how many stops the row stands for (a batch counts more than one)' },
  { name: 'how known', type: 'text', means: 'measured (stopwatch), reported (typed after) or counted (tapped, no minutes)' },
  { name: 'cause family', type: 'text', means: 'the 6M family the floor gave it, when given' },
  { name: 'note', type: 'text', means: 'the words written on it' },
];

export function stopsDataset(line: Pick<Workspace, 'id' | 'name'>, obs: readonly Observation[]): Dataset {
  const live = obs.filter(o => !o.deletedAt && o.workspaceId === line.id).sort((a, b) => a.startedAt - b.startedAt);
  const rows: Cell[][] = live.map(o => [
    day(o.startedAt), new Date(o.startedAt).getHours(), line.name, txt(o.asset), txt(o.category), txt(o.subcategory), txt(o.shift),
    o.timing !== 'instant' && o.durationMs > 0 ? Math.round((o.durationMs / 60_000) * 100) / 100 : null,
    num(o.count) ?? 1, HOW[o.timing], txt(o.causeM), txt(o.note),
  ]);
  const limits = ['A stop holds what stopped it as the floor tapped or typed it (category and detail) — there is no separate downtime classification such as mechanical, electrical or operator; grouping by such a class needs it recorded, or the person deciding which categories belong to it.'];
  if (!live.some(o => txt(o.shift))) limits.push('No stop on this line has its shift recorded — downtime by shift cannot be said from the stops; the hour each began is recorded.');
  const counted = live.filter(o => o.timing === 'instant').length;
  if (counted) limits.push(`${counted} of the ${live.length} stops were counted only (tapped) — they have no minutes, which is not the same as zero minutes.`);
  return { id: `stops:${line.id}`, name: `${line.name} — stops`, kind: 'stops', fields: STOP_FIELDS, rows, refs: live.map(o => `stop:${o.id}`), limits };
}

/* ------------------------------------------------------------------ program trials */
export const TEST_FIELDS: Field[] = [
  { name: 'program', type: 'text', means: 'the program the trial proves' },
  { name: 'machine', type: 'text', means: 'the machine it ran on' },
  { name: 'trial', type: 'text', means: 'the test, by its name' },
  { name: 'product', type: 'text', means: 'the product run' },
  { name: 'day', type: 'date', means: 'the day it ran' },
  { name: 'outcome', type: 'text', means: 'passed, failed, not run or planned, as recorded on the test' },
  { name: 'speed set', type: 'number', unit: 'a minute', means: 'the speed the machine was set at' },
  { name: 'aim', type: 'number', unit: 'a minute', means: 'the speed it aimed at, agreed before the run' },
  { name: 'minutes', type: 'number', unit: 'min', means: 'how long it ran' },
  { name: 'packs', type: 'number', means: 'packs made' },
  { name: 'rejects', type: 'number', means: 'packs rejected' },
  { name: 'stops', type: 'number', means: 'stops during the run, when written' },
  { name: 'net rate', type: 'number', unit: 'a minute', means: 'good packs a minute', calc: '(packs − rejects) ÷ minutes, only when all three were written' },
  { name: 'reject %', type: 'number', unit: '%', means: 'rejects as a share of packs', calc: 'rejects ÷ packs × 100, only when both were written' },
  { name: 'short of aim', type: 'number', unit: 'a minute', means: 'how far the net rate fell short of the aim', calc: 'aim − net rate, only when both are known' },
];

export function testsDataset(scope: { id: string; name: string }, tests: readonly Test[], programs: readonly Program[], assets: readonly Asset[], onScope: (p: Program) => boolean): Dataset {
  const progs = new Map(programs.filter(p => !p.deletedAt).map(p => [p.id, p]));
  const rows: Cell[][] = [], refs: string[] = [];
  for (const t of tests) {
    if (t.deletedAt || !t.programId) continue;
    const p = progs.get(t.programId);
    if (!p || !onScope(p)) continue;
    const machine = assets.find(a => a.id === (t.assetId ?? p.assetId))?.name ?? null;
    for (const r of productRuns(t)) {
      const d = r.day ?? {};
      const packs = num(d.packs), rejects = num(d.rejects), minutes = num(d.minutes);
      const net = packs !== null && rejects !== null && minutes ? Math.round(((packs - rejects) / minutes) * 100) / 100 : null;
      const aim = num(r.agreed?.rate);
      rows.push([
        p.what, machine, t.title, txt(r.product), r.ranOn ?? t.ranOn ?? null, t.outcome,
        num(d.speed), aim, minutes, packs, rejects, num(d.stops), net,
        packs && rejects !== null ? Math.round((rejects / packs) * 10000) / 100 : null,
        aim !== null && net !== null ? Math.round((aim - net) * 100) / 100 : null,
      ]);
      refs.push(`test:${t.id}:${r.id}`);
    }
  }
  const limits = ['A trial is one test of a program, one row a product run; its net rate is worked out only when minutes, packs and rejects were all written.'];
  return { id: `tests:${scope.id}`, name: `${scope.name} — program trials`, kind: 'tests', fields: TEST_FIELDS, rows, refs, limits };
}

/* ------------------------------------------------------------------ a study's readings */
const READING_FIELDS: { k: keyof StudyReading; f: Field }[] = [
  { k: 'at', f: { name: 'taken', type: 'date', means: 'when the reading was taken' } },
  { k: 'value', f: { name: 'value', type: 'number', means: 'the reading' } },
  { k: 'ok', f: { name: 'good', type: 'yes/no', means: 'passed or failed, on a pass-or-fail study' } },
  { k: 'made', f: { name: 'made', type: 'number', means: 'items made in the run' } },
  { k: 'rejected', f: { name: 'rejected', type: 'number', means: 'items rejected in the run' } },
  { k: 'faults', f: { name: 'faults', type: 'number', means: 'faults found' } },
  { k: 'product', f: { name: 'product', type: 'text', means: 'the product' } },
  { k: 'group', f: { name: 'group', type: 'number', means: 'the subgroup it belongs to' } },
  { k: 'head', f: { name: 'head', type: 'number', means: 'the head or lane' } },
  { k: 'arm', f: { name: 'arm', type: 'text', means: 'the arm or group named' } },
  { k: 'who', f: { name: 'who', type: 'text', means: 'who took it' } },
  { k: 'note', f: { name: 'note', type: 'text', means: 'a note on it' } },
];

export function readingsDataset(s: Pick<ToolStudy, 'id' | 'name' | 'facts'>): Dataset {
  const all = (Array.isArray(s.facts?.readings) ? s.facts.readings as StudyReading[] : []).filter(r => !r.struck);
  const used = READING_FIELDS.filter(x => x.k === 'value' || x.k === 'at' || all.some(r => r[x.k] !== undefined && r[x.k] !== null && r[x.k] !== ''));
  const rows: Cell[][] = all.map(r => used.map(({ k }) => {
    const v = r[k];
    if (v === undefined || v === null || v === '') return null;
    if (k === 'at') return day(v as number);
    return typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' ? v : null;
  }));
  const struck = (Array.isArray(s.facts?.readings) ? s.facts.readings as StudyReading[] : []).length - all.length;
  return {
    id: `readings:${s.id}`, name: `${s.name} — readings`, kind: 'readings', fields: used.map(x => x.f), rows, refs: all.map(r => `reading:${s.id}:${r.id}`),
    limits: [struck ? `${struck} struck reading${struck === 1 ? ' is' : 's are'} left out, as the study leaves them out.` : 'Every reading the study holds, none struck.'],
  };
}

/* ------------------------------------------------------------------ problems */
export const PROBLEM_FIELDS: Field[] = [
  { name: 'line', type: 'text', means: 'the line' },
  { name: 'machine', type: 'text', means: 'the machine it is on, when named' },
  { name: 'problem', type: 'text', means: 'the problem in words' },
  { name: 'priority', type: 'text', means: 'critical, high or low, when set' },
  { name: 'status', type: 'text', means: 'where it stands' },
  { name: 'owner', type: 'text', means: 'who has it' },
  { name: 'raised', type: 'date', means: 'the day it was raised' },
  { name: 'due', type: 'date', means: 'the day promised' },
  { name: 'closed', type: 'date', means: 'the day it was closed' },
  { name: 'minutes a day', type: 'number', unit: 'min', means: 'the minutes a day it costs the line, as typed on it' },
  { name: 'rejects a day', type: 'number', means: 'the rejects a day it causes, as typed' },
  { name: 'waste', type: 'text', means: 'the waste it was classed as, when classed' },
  { name: 'days open', type: 'number', unit: 'days', means: 'days from raised to closed, or to today', calc: '(closed, else today) − raised' },
];

export function problemsDataset(scope: { id: string; name: string }, snags: readonly Snag[], lines: readonly Pick<Workspace, 'id' | 'name'>[], today: number): Dataset {
  const name = new Map(lines.map(l => [l.id, l.name]));
  const live = snags.filter(s => !s.deletedAt).sort((a, b) => a.raisedAt - b.raisedAt);
  const rows: Cell[][] = live.map(s => [
    name.get(s.workspaceId) ?? null, txt(s.targetAsset), s.problem, s.priority ?? null, s.status, txt(s.owner),
    day(s.raisedAt), day(s.dueAt), day(s.closedAt), num(s.minutesPerDay), num(s.rejectsPerDay),
    s.waste && s.waste !== 'none' ? s.waste : null,
    Math.max(0, Math.round(((s.closedAt ?? today) - s.raisedAt) / 86_400_000)),
  ]);
  return { id: `problems:${scope.id}`, name: `${scope.name} — problems`, kind: 'problems', fields: PROBLEM_FIELDS, rows, refs: live.map(s => `problem:${s.id}`), limits: ['A problem’s minutes and rejects a day are what was typed on it — an estimate by the person, not a measurement.'] };
}

/* ------------------------------------------------------------------ production records from a business's system */
export const PRODUCTION_FIELDS_TABLE: Field[] = [
  { name: 'line', type: 'text', means: 'the line' },
  { name: 'day', type: 'date', means: 'the day, as the system sent it' },
  { name: 'shift', type: 'text', means: 'the shift, as the system names it' },
  { name: 'product', type: 'text', means: 'the product' },
  { name: 'planned minutes', type: 'number', unit: 'min', means: 'the time planned to run' },
  { name: 'run minutes', type: 'number', unit: 'min', means: 'the time it ran' },
  { name: 'output', type: 'number', means: 'units made' },
  { name: 'target', type: 'number', means: 'the units it should have made, as the system says' },
  { name: 'good', type: 'number', means: 'good units, as sent' },
  { name: 'rejects', type: 'number', means: 'units rejected' },
  { name: 'downtime minutes', type: 'number', unit: 'min', means: 'stop time on the row' },
  { name: 'downtime reason', type: 'text', means: 'the system’s reason for the downtime' },
  { name: 'delivered', type: 'number', means: 'good units toward the target', calc: 'good as sent; else output − rejects when both were sent; else output' },
  { name: 'short of target', type: 'number', means: 'how far the row fell short of its target, never below 0', calc: 'target − delivered, only where a target was sent' },
  { name: 'connection', type: 'text', means: 'the data connection that brought it' },
  { name: 'system id', type: 'text', means: 'the system’s own id for the row' },
  { name: 'how known', type: 'text', means: 'system — read from the business’s production system, not measured in the app' },
  { name: 'imported', type: 'date', means: 'when it came in' },
];

export function productionDataset(scope: { id: string; name: string }, rows: readonly ProductionRecord[], lines: readonly Pick<Workspace, 'id' | 'name'>[], connections: readonly Pick<DataConnectionRow, 'id' | 'name' | 'system' | 'lastSuccessAt'>[]): Dataset {
  const name = new Map(lines.map(l => [l.id, l.name]));
  const conn = new Map(connections.map(c => [c.id, c]));
  const live = rows.filter(r => !r.deletedAt).sort((a, b) => a.day.localeCompare(b.day) || (a.shift ?? '').localeCompare(b.shift ?? ''));
  const out: Cell[][] = live.map(r => {
    const d = delivered(r);
    return [
      name.get(r.workspaceId) ?? null, r.day, txt(r.shift), txt(r.product), num(r.plannedMinutes), num(r.runMinutes), num(r.output), num(r.target),
      num(r.good), num(r.rejects), num(r.downtimeMinutes), txt(r.downtimeReason), d ? d.units : null,
      r.target !== undefined && d ? Math.max(0, r.target - d.units) : null,
      conn.get(r.connectionId)?.name ?? null, r.sourceId, 'system', day(r.importedAt),
    ];
  });
  const used = [...new Set(live.map(r => r.connectionId))].map(id => conn.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const limits = [
    `System data — what the business’s production system recorded, sent through ${used.length ? used.map(c => `“${c.name}”${c.system ? ` (${c.system})` : ''}${c.lastSuccessAt ? `, last brought in ${new Date(c.lastSuccessAt).toISOString().slice(0, 10)}` : ''}`).join('; ') : 'a data connection'}; not measured in the app, and never to be added into reported or estimated figures.`,
    'A target is what the system sent on the row; a row with none has no shortfall, not a shortfall of zero.',
  ];
  const noGood = live.filter(r => r.good === undefined && r.output !== undefined).length;
  if (noGood) limits.push(`${noGood} of ${live.length} rows have no good units sent — delivered is worked out from output and rejects where both were sent, else it is output.`);
  return { id: `production:${scope.id}`, name: `${scope.name} — production from the system`, kind: 'production', fields: PRODUCTION_FIELDS_TABLE, rows: out, refs: live.map(r => `production:${r.id}`), limits };
}
