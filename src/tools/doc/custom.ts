/* A CUSTOM SHEET — a document whose structure lives on its own record (AI Mode, 8 November; docs/AI-MODE.md, Building tools in
 * conversation, C).
 *
 * Rowland, 8 November: "Create new tools and documentation — construct new working studies, documentation, data capture
 * structures, metric definitions and reports based on what I describe." So a sheet described in conversation is a DOCUMENT
 * (a `doc` study, `agreed.doc.def = 'custom'`) whose sections, boxes and metrics are kept on the record itself
 * (`facts.customDef`) — never a new definition file, never a change to another record, never a second data model. The
 * document shape's page, list, paper, rename and delete read it unchanged: `docDefOf` turns the record's own structure into
 * the DocDef they read, the one additive step (a definition can come from the record as well as from ./defs).
 *
 * THE METRICS ARE CODE'S. A metric is one of five kinds — sum, average, ratio, difference, count — over named boxes (a number
 * box by its id, a list's number column as `list.column`). No expression string, no eval, and never a figure from the AI: the
 * evaluator below reads the numbers typed and says the result, or names what it waits on.
 *
 * Pure. */
import type { ToolStudy } from '../../lib/study';
import { docByKey } from './registry';
import { fmt } from './figures/words';
import type { CustomDef, CustomField, CustomMetric, DocDef, DocItem, DocRow, DocTable, DocValues, DocWorking } from './types';

export const CUSTOM_KEY = 'custom';

/** The words of each kind of metric — on the page, the paper and the colleague's card. */
export const METRIC_WORDS: Record<CustomMetric['kind'], string> = {
  sum: 'the total of', average: 'the average of', ratio: 'the first divided by the second —', difference: 'the first less the second —', count: 'how many are given of',
};

/* ------------------------------------------------------------------ the numbers a metric reads */

const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
const rowsAt = (v: DocValues, id: string): DocRow[] => (Array.isArray(v[id]) ? (v[id] as DocRow[]) : []);

/** Every box of a structure, by id — a list's columns as `list.column`. */
export function boxesOf(c: Pick<CustomDef, 'sections'>): { ref: string; label: string; type: CustomField['type'] | 'text' | 'number' | 'choice'; unit?: string }[] {
  return c.sections.flatMap(s => s.fields.flatMap(f => [
    { ref: f.id, label: f.label, type: f.type, ...(f.unit ? { unit: f.unit } : {}) },
    ...(f.type === 'list' ? (f.columns ?? []).map(col => ({ ref: `${f.id}.${col.id}`, label: `${f.label} — ${col.label}`, type: col.type, ...(col.unit ? { unit: col.unit } : {}) })) : []),
  ]));
}

/** What one source of a metric holds: its numbers (a list column gives one a row), how many things are given, and its words. */
function source(ref: string, v: DocValues, c: Pick<CustomDef, 'sections'>): { nums: number[]; given: number; label: string } {
  const box = boxesOf(c).find(b => b.ref === ref);
  const label = box?.label ?? ref;
  const dot = ref.indexOf('.');
  if (dot > 0) {
    const rows = rowsAt(v, ref.slice(0, dot)), col = ref.slice(dot + 1);
    const cells = rows.map(r => r.c[col]).filter(x => x !== undefined && x !== '');
    return { nums: cells.map(num).filter((x): x is number => x !== undefined), given: cells.length, label };
  }
  if (box?.type === 'list') { const rows = rowsAt(v, ref); return { nums: [], given: rows.length, label }; }
  const x = v[ref];
  const n = num(x);
  return { nums: n !== undefined ? [n] : [], given: x !== undefined && x !== '' ? 1 : 0, label };
}

export interface MetricValue {
  metric: CustomMetric;
  /** The figure, when the boxes it reads are given. */
  value?: number;
  /** "12.5%", "45 min", or "—". */
  said: string;
  /** How it was worked out, with the numbers in: "45 ÷ 360 × 100". */
  working: string;
  /** The boxes it still waits on, by their words. */
  missing: string[];
}

const total = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const sayValue = (n: number, unit?: string): string => (unit ? (unit.startsWith('%') ? `${fmt(n, 2)}${unit}` : unit.startsWith('£') ? `£${fmt(n, 2)}${unit.slice(1)}` : `${fmt(n, 2)} ${unit}`) : fmt(n, 2));

/** A METRIC WORKED OUT — by code, from the numbers typed. A ratio whose unit is "%" is said as a percentage (× 100). */
export function metricValue(m: CustomMetric, v: DocValues, c: Pick<CustomDef, 'sections'>): MetricValue {
  const srcs = m.of.map(ref => source(ref, v, c));
  const none = (why: string[]): MetricValue => ({ metric: m, said: '—', working: `${METRIC_WORDS[m.kind]} ${srcs.map(s => s.label).join(', ')}`, missing: why });
  if (m.kind === 'count') {
    const n = total(srcs.map(s => s.given));
    return { metric: m, value: n, said: sayValue(n, m.unit), working: `${srcs.map(s => `${s.label}: ${s.given}`).join(' + ')} = ${n}`, missing: [] };
  }
  const empty = srcs.filter(s => !s.nums.length).map(s => s.label);
  if (m.kind === 'sum' || m.kind === 'average') {
    const all = srcs.flatMap(s => s.nums);
    if (!all.length) return none(empty);
    const n = m.kind === 'sum' ? total(all) : total(all) / all.length;
    const working = m.kind === 'sum' ? `${all.map(x => fmt(x, 6)).join(' + ')} = ${fmt(n, 6)}` : `(${all.map(x => fmt(x, 6)).join(' + ')}) ÷ ${all.length} = ${fmt(n, 6)}`;
    return { metric: m, value: n, said: sayValue(n, m.unit), working, missing: empty };
  }
  /* ratio and difference: the first source against the second, each the total of what it holds */
  if (srcs.length !== 2) return none([`a ${m.kind} needs exactly two boxes`]);
  if (empty.length) return none(empty);
  const a = total(srcs[0].nums), b = total(srcs[1].nums);
  if (m.kind === 'difference') return { metric: m, value: a - b, said: sayValue(a - b, m.unit), working: `${fmt(a, 6)} − ${fmt(b, 6)} = ${fmt(a - b, 6)}`, missing: [] };
  if (b === 0) return none([`${srcs[1].label} is 0 — nothing can be divided by it`]);
  const pctOut = !!m.unit?.startsWith('%');
  const n = (a / b) * (pctOut ? 100 : 1);
  return { metric: m, value: n, said: sayValue(n, m.unit), working: `${fmt(a, 6)} ÷ ${fmt(b, 6)}${pctOut ? ' × 100' : ''} = ${fmt(n, 6)}`, missing: [] };
}

/* ------------------------------------------------------------------ a structure checked */

/** What is wrong with a structure, in sentences — none when it can be kept. Ids unique; a metric reads boxes that exist and,
 *  but for a count, hold numbers; a ratio or a difference reads exactly two. */
export function customProblems(c: CustomDef): string[] {
  const out: string[] = [];
  if (!c.title.trim()) out.push('The sheet needs a title.');
  if (!c.sections.length || !c.sections.some(s => s.fields.length)) out.push('The sheet needs at least one section with a box in it.');
  const ids = c.sections.flatMap(s => s.fields.map(f => f.id));
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) out.push(`Two boxes share a name: ${[...new Set(dup)].join(', ')}.`);
  for (const s of c.sections) for (const f of s.fields) {
    if (f.type === 'choice' && !(f.options ?? []).length) out.push(`“${f.label}” is a choice but has no options.`);
    if (f.type === 'list' && !(f.columns ?? []).length) out.push(`“${f.label}” is a list but has no columns.`);
  }
  const boxes = boxesOf(c);
  for (const m of c.metrics ?? []) {
    if (!m.of.length) { out.push(`The metric “${m.name}” reads no box.`); continue; }
    for (const ref of m.of) {
      const b = boxes.find(x => x.ref === ref);
      if (!b) out.push(`The metric “${m.name}” reads “${ref}”, which is not a box on the sheet.`);
      else if (m.kind !== 'count' && b.type !== 'number') out.push(`The metric “${m.name}” reads “${b.label}”, which is not a number — only a count can read words.`);
    }
    if ((m.kind === 'ratio' || m.kind === 'difference') && m.of.length !== 2) out.push(`The metric “${m.name}” is a ${m.kind}, so it reads exactly two boxes.`);
  }
  return out;
}

/* ------------------------------------------------------------------ the structure as a definition the document shape reads */

function itemOf(f: CustomField): DocItem {
  if (f.type === 'list') {
    return { id: f.id, kind: 'list', label: f.label, rowWord: 'row', ...(f.required ? { required: true } : {}),
      columns: (f.columns ?? []).map(col => ({ id: col.id, label: col.label, kind: col.type === 'choice' ? 'choice' as const : col.type === 'number' ? 'number' as const : 'text' as const,
        ...(col.unit ? { unit: col.unit } : {}), ...(col.type === 'choice' ? { options: (col.options ?? []).map(o => ({ value: o, label: o })) } : {}) })) };
  }
  return { id: f.id, kind: f.type === 'choice' ? 'choice' : f.type === 'number' ? 'number' : 'text', label: f.label,
    ...(f.unit ? { unit: f.unit } : {}), ...(f.required ? { required: true } : {}),
    ...(f.type === 'choice' ? { options: (f.options ?? []).map(o => ({ value: o, label: o })) } : {}) };
}

/** THE SHEET AS A DEFINITION — its sections and boxes as the document shape draws them, its reading the metrics as code works them. */
export function customDocDef(c: CustomDef): DocDef {
  return {
    key: CUSTOM_KEY, fc: 'FC-240', title: c.title.trim() || 'Custom sheet', noun: 'sheet', group: 'Custom sheets',
    says: c.purpose.trim() || 'A sheet built in conversation', question: c.purpose.trim() || 'What is this sheet for?',
    sections: c.sections.map(s => ({ id: s.id, title: s.title, items: s.fields.map(itemOf) })),
    examples: [],
    read: v => {
      const ms = (c.metrics ?? []).map(m => metricValue(m, v, c));
      const known = ms.filter(x => x.value !== undefined);
      const table: DocTable | undefined = ms.length
        ? { title: 'Metrics — worked out by Luna', head: ['Metric', 'Value', 'How it is worked out'], rows: ms.map(x => [x.metric.name, x.said, x.value !== undefined ? x.working : `Waits on ${x.missing.join(', ')}`]) }
        : undefined;
      const working: DocWorking[] = known.map(x => ({ label: x.metric.name, value: x.working, note: `${METRIC_WORDS[x.metric.kind]} ${x.metric.of.length} box${x.metric.of.length === 1 ? '' : 'es'}` }));
      const sentence = known.length ? `${known.map(x => `${x.metric.name}: ${x.said}`).join('; ')}.` : '';
      return {
        sentence, tone: 'n',
        tiles: ms.map(x => ({ k: x.metric.name, v: x.said, of: x.value !== undefined ? `${METRIC_WORDS[x.metric.kind]} ${x.metric.of.length} box${x.metric.of.length === 1 ? '' : 'es'}` : `waits on ${x.missing.join(', ')}` })),
        ...(table ? { tables: [table] } : {}), ...(working.length ? { working } : {}),
        money: { missing: [], none: 'A custom sheet prices nothing of its own — it holds the figures it is given, and its metrics are only totals, averages, ratios, differences or counts of them.' },
        caveats: ['Built in a conversation in AI Mode for this record only: its boxes are the ones described, and its metrics are worked out by Luna from what is typed — never estimated, never by the AI.'],
        checks: [],
        closing: ms.length ? (known.length === ms.length ? sentence : `${known.length} of ${ms.length} metrics can be worked out from what is typed so far.`) : 'A sheet of what was described — its boxes hold what is typed.',
      };
    },
  };
}

/** The list page of the custom sheets (#/doc/custom): no boxes of its own — each sheet carries its own. */
export const CUSTOM_LIST_DEF: DocDef = {
  key: CUSTOM_KEY, fc: 'FC-240', title: 'Custom sheets', noun: 'custom sheet', group: 'Custom sheets',
  says: 'Sheets built in a conversation in AI Mode — each with its own sections, boxes and metrics',
  question: 'Started from AI Mode: describe what you want to capture and the colleague builds it with you.',
  sections: [], examples: [],
  read: () => ({ sentence: '', tone: 'n', tiles: [], money: { missing: [] }, caveats: [], checks: [], closing: '' }),
};

/** The definition a document record is read by: its kind's file — or, for a custom sheet, its own structure. */
export function docDefOf(s: Pick<ToolStudy, 'agreed'> & Partial<Pick<ToolStudy, 'facts'>>): DocDef | undefined {
  const key = s.agreed?.doc?.def;
  if (key === CUSTOM_KEY) return s.facts?.customDef ? customDocDef(s.facts.customDef) : undefined;
  return docByKey(key);
}
