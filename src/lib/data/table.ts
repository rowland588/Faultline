/* A DATASET AND ITS QUESTIONS (10 November, docs/CONVERSATIONAL-DATA.md — Rowland: "The source of information must not dictate how the user
 * interacts with Luna"; "The system must distinguish between zero, missing, unknown and not recorded").
 *
 * Faultline's own records (the line's stops, the programs' trials, a study's readings, the problems) are laid out as a TABLE — fields and
 * rows — and asked the same questions a workbook is (lib/workbook/query: filters, groups, a date by day · week · month · year, sum, avg,
 * min, max, count, distinct), answered in the same QueryResult shape, so a result, a chart and a report read either the same way.
 *
 * Honest by construction:
 *   - a cell is a value, or `null` — NOT RECORDED. Never 0: a stop counted with no minutes has minutes null, not 0.
 *   - a sum or an average of nothing recorded is null ("not recorded"), never 0; a count of rows is a count.
 *   - a group of rows with nothing recorded for the grouping field is "(not recorded)", named, never folded into another.
 *   - a field the dataset does not hold is refused with the fields it does hold (missingFields) — never guessed from a near name.
 *   - every group carries its rows' references ("stop:…", "test:…"), the way a workbook group carries its cells.
 * Pure. */
import type { Filter, Measure, Query, QueryResult, Group } from '../workbook/query';
import { DeriveError, deriveInto, orderable, planDerive, type DerivePlan } from '../workbook/derive';
import { PARTS_HOW, PARTS_MAX, PART_KINDS, PART_SAID, bucket, cmpGroupKeys, hasTime, partType, partValue, type Part } from '../workbook/parts';
import { GroupsError, LIMIT_MAX, TOP_HOW, TOP_MAX, keepHaving, planHaving, rankPositions, topWithin, wholeBlocks, type HavingPlan } from '../workbook/groups';

export type FieldType = 'number' | 'text' | 'date' | 'yes/no';
export type Cell = number | string | boolean | null;
export interface Field {
  name: string;
  type: FieldType;
  unit?: string;
  /** What it is, in a few words — "the minutes the stop lasted, by stopwatch or typed". */
  means: string;
  /** Worked out by Faultline from other fields, and how — "(packs − rejects) ÷ minutes". Absent: as recorded. */
  calc?: string;
}
export interface Dataset {
  /** 'stops:<line>' · 'tests:<line>' · 'readings:<study>' · 'problems:<line|all>' */
  id: string;
  name: string;
  kind: 'stops' | 'tests' | 'readings' | 'problems' | 'production';
  fields: Field[];
  rows: Cell[][];
  /** One reference a row — what the row is ("stop:…"). */
  refs: string[];
  /** What the dataset does not hold, said once — "No downtime reason classification is recorded on a stop: only the category tapped." */
  limits: string[];
}

export const NOT_RECORDED = '(not recorded)';
const GROUP_CAP = 5000;

const low = (v: unknown) => String(v ?? '').trim().toLowerCase();
const dateMs = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) { const t = Date.parse(v.trim().length === 10 ? `${v.trim()}T00:00:00Z` : v.trim()); return Number.isFinite(t) ? t : undefined; }
  return undefined;
};

/** The field of a name — exact, then any case and spacing. Undefined when the dataset does not hold it. */
export function fieldOf(d: Pick<Dataset, 'fields'>, name: string): { i: number; f: Field } | undefined {
  const want = low(name).replace(/\s+/g, ' ');
  const i = d.fields.findIndex(f => low(f.name).replace(/\s+/g, ' ') === want);
  return i < 0 ? undefined : { i, f: d.fields[i] };
}

/** The fields a question names that the dataset does not hold. A name the question MAKES ITSELF — a part of a date (`parts`) — is
 *  the question's own, never missing; the date it is taken from is named like any other. */
export function missingFields(d: Pick<Dataset, 'fields'>, q: Pick<Query, 'filters' | 'groupBy' | 'time' | 'measures'> & { parts?: readonly Part[]; lookups?: readonly { as: string }[]; calcs?: readonly { as: string }[] }): string[] {
  /* (a part of a date, a value looked up on another sheet, a sum worked on each row — each named by the question itself) */
  const made = new Set([...(q.parts ?? []), ...(q.lookups ?? []), ...(q.calcs ?? [])].map(p => low(p.as).replace(/\s+/g, ' ')));
  const named = [...(q.parts ?? []).map(p => p.column), ...(q.filters ?? []).map(f => f.column), ...(q.groupBy ?? []), ...(q.time ? [q.time.column] : []), ...q.measures.flatMap(m => (m.column ? [m.column] : []))];
  return [...new Set(named.filter(n => !made.has(low(n).replace(/\s+/g, ' ')) && !fieldOf(d, n)))];
}

export class TableError extends Error {}

const PART_TYPE = { date: 'date', number: 'number', text: 'text' } as const;
/** THE PARTS OF A DATE AS FIELDS (lib/workbook/parts — docs/LUNA-ANALYSIS.md A2): the dataset with one more field a part, worked on
 *  every row — a weekday, a month, a quarter, an hour — so the question reads it as it reads any field. A row with no date has no
 *  part (not recorded); an hour is refused where the field holds days with no time of day. */
function withParts(d: Dataset, parts: readonly Part[] | undefined): { d: Dataset; notes: string[] } {
  if (!parts?.length) return { d, notes: [] };
  if (parts.length > PARTS_MAX) throw new TableError(`At most ${PARTS_MAX} parts a question. ${PARTS_HOW}`);
  const fields = [...d.fields], cols: Cell[][] = [], notes: string[] = [];
  for (const pt of parts) {
    if (!PART_KINDS.includes(pt.part)) throw new TableError(`“${String(pt.part)}” is not a part of a date. ${PARTS_HOW}`);
    if (fieldOf({ fields }, pt.as)) throw new TableError(`“${pt.as}” is already a field — give the ${pt.part} another name.`);
    const src = fieldOf(d, pt.column);
    if (!src) throw new TableError(`${d.name} holds no “${pt.column}” — it holds ${d.fields.map(f => f.name).join(', ')}.`);
    if (src.f.type !== 'date') throw new TableError(`“${src.f.name}” is ${src.f.type}, not a date — a ${pt.part} cannot be taken from it.`);
    const type = partType(pt.part);
    let undated = 0, dated = 0, timed = 0;
    const col = d.rows.map((row): Cell => {
      const v = row[src.i], ms = dateMs(v);
      if (ms === undefined) { undated += 1; return null; }
      dated += 1;
      /* a day written as a day holds no time of day, whatever the hour of its midnight */
      if (!(typeof v === 'string' && v.trim().length === 10) && hasTime(ms)) timed += 1;
      const x = partValue(ms, pt.part);
      return type === 'date' ? new Date(x as number).toISOString().slice(0, 10) : x;
    });
    if (pt.part === 'hour' && dated > 1 && !timed) throw new TableError(`“${src.f.name}” holds days with no time of day — an hour cannot be taken from it${fieldOf(d, 'hour') ? '; this source holds “hour” itself' : ''}.`);
    fields.push({ name: pt.as, type: PART_TYPE[type], means: `the ${PART_SAID[pt.part]} of “${src.f.name}”`, calc: `the ${PART_SAID[pt.part]} of “${src.f.name}”, on each row` });
    cols.push(col);
    if (undated) notes.push(`${undated.toLocaleString('en-GB')} rows have no ${src.f.name} recorded — they have no “${pt.as}” (shown as “${NOT_RECORDED}” where it is grouped by), and are never put with another.`);
  }
  return { d: { ...d, fields, rows: d.rows.map((row, r) => [...row, ...cols.map(c => c[r])]) }, notes };
}

function predicate(f: Filter, fld: Field): (v: Cell) => boolean {
  const op = f.op;
  if (op === 'blank') return v => v === null || v === '';
  if (op === 'notblank') return v => v !== null && v !== '';
  const num = fld.type === 'number', date = fld.type === 'date';
  const asNum = (x: unknown) => (date ? dateMs(x) : typeof x === 'number' ? x : Number.isFinite(Number(x)) && String(x).trim() !== '' ? Number(x) : undefined);
  if (op === 'eq' || op === 'ne' || op === 'in') {
    const want = op === 'in' ? (f.values ?? []) : [f.value];
    const hit = (v: Cell) => v !== null && want.some(w => ((num || date) ? asNum(v) === asNum(w) : low(v) === low(w)));
    return op === 'ne' ? v => !hit(v) : hit;
  }
  if (op === 'contains') return v => v !== null && low(v).includes(low(f.value));
  const a = asNum(op === 'between' ? f.from : f.value), b = asNum(f.to);
  if (a === undefined || (op === 'between' && b === undefined)) throw new TableError(`The filter on “${fld.name}” needs ${date ? 'a date as YYYY-MM-DD' : 'a number'}.`);
  return v => {
    const x = asNum(v);
    if (x === undefined) return false;
    return op === 'gt' ? x > a : op === 'gte' ? x >= a : op === 'lt' ? x < a : op === 'lte' ? x <= a : x >= a && x <= (b as number);
  };
}

const keyWord = (v: Cell, f: Field): string => {
  if (v === null || v === '') return NOT_RECORDED;
  if (f.type === 'date') { const t = dateMs(v); return t === undefined ? String(v) : new Date(t).toISOString().slice(0, 10); }
  if (f.type === 'yes/no') return v ? 'yes' : 'no';
  return String(v).trim();
};

/** One question of a dataset, worked over every row — the workbook's QueryResult. */
export function runTable(d0: Dataset, q: Omit<Query, 'sheet'> & { sheet?: string }): QueryResult {
  /* (a value looked up on another sheet, and a sum worked on each row, are asked of a workbook's sheets — not of these tables yet) */
  if (q.lookups?.length || q.calcs?.length) throw new TableError(`${d0.name} is one of the app’s own tables — a lookup and a sum worked on each row are asked of a workbook’s sheets, not of it. Ask it by its own fields: ${d0.fields.map(f => f.name).join(', ')}.`);
  const miss = missingFields(d0, q);
  if (miss.length) throw new TableError(`${d0.name} holds no ${miss.map(m => `“${m}”`).join(', ')} — it holds ${d0.fields.map(f => f.name).join(', ')}.`);
  const { d, notes: partNotes } = withParts(d0, q.parts);
  const preds = (q.filters ?? []).map(f => { const x = fieldOf(d, f.column) as { i: number; f: Field }; return { i: x.i, p: predicate(f, x.f) }; });
  const groups = (q.groupBy ?? []).map(n => fieldOf(d, n) as { i: number; f: Field });
  const time = q.time ? { ...(fieldOf(d, q.time.column) as { i: number; f: Field }), by: q.time.by } : undefined;
  if (time && time.f.type !== 'date') throw new TableError(`“${time.f.name}” is not a date — it cannot be grouped by ${time.by}.`);
  const ms = q.measures.map(m => ({ m, x: m.column ? fieldOf(d, m.column) : undefined }));
  for (const { m, x } of ms) if ((m.op === 'sum' || m.op === 'avg' || m.op === 'min' || m.op === 'max') && x && x.f.type !== 'number' && x.f.type !== 'date') throw new TableError(`“${x.f.name}” is ${x.f.type}, not a number — it cannot be ${m.op === 'avg' ? 'averaged' : m.op === 'sum' ? 'added up' : `given a ${m.op}imum`}.`);
  /* the figures to work from the measures (lib/workbook/derive), checked before a row is read */
  const measureNames = ms.map(({ m, x }) => (m.op === 'count' ? (x ? `count of ${x.f.name}` : 'rows') : `${m.op} of ${x?.f.name ?? ''}`));
  let plan: DerivePlan;
  try { plan = planDerive(q.derive, measureNames); } catch (e) { if (e instanceof DeriveError) throw new TableError(e.message); throw e; }
  if (typeof q.order?.by === 'number') { const no = orderable(plan, q.order.by); if (no) throw new TableError(no); }
  /* WHICH GROUPS ARE SHOWN (lib/workbook/groups — A6): a condition on a figure, and the top few within each group */
  const figureNames = [...measureNames, ...plan.names];
  let hplan: HavingPlan[];
  try { hplan = planHaving(q.having, figureNames); } catch (e) { if (e instanceof GroupsError) throw new TableError(e.message); throw e; }
  /* a figure that is a DATE (the first or the last of a date field) is not a number to set a condition on, or to take the largest by */
  const isDate = (at: number): boolean => at < ms.length && (ms[at].m.op === 'min' || ms[at].m.op === 'max') && ms[at].x?.f.type === 'date';
  for (const h of hplan) if (isDate(h.at)) throw new TableError(`having: “${figureNames[h.at]}” is a date, not a number — a condition is set on a number.`);
  /* a condition on a figure worked ALONG THE ORDER (a running share — "the reasons that make up 80%") is looked at after the groups
     are in order and that figure is worked; the others before */
  const isLate = (at: number): boolean => at >= plan.base && !!plan.plans[at - plan.base]?.late;
  const hEarly = hplan.filter(h => !isLate(h.at)), hLate = hplan.filter(h => isLate(h.at));
  if (q.top) {
    const keys = groups.length + (time ? 1 : 0);
    if (keys !== 2) throw new TableError(`top needs exactly two things grouped by — this question has ${keys}. ${TOP_HOW}`);
    if (!Number.isInteger(q.top.n) || q.top.n < 1 || q.top.n > TOP_MAX) throw new TableError(TOP_HOW);
    if (hplan.length) throw new TableError('top and having cannot be asked together — ask the top few of each, or the groups that meet the condition.');
    if (plan.plans.some(x => x.late)) throw new TableError('A change or a running total follows the order of the groups, and with top the groups are in blocks — ask it without top.');
    const topBy = typeof q.order?.by === 'number' ? q.order.by : 0;
    if (isDate(topBy)) throw new TableError(`top takes the largest by a number — “${figureNames[topBy]}” is a date. Order by a measure that is a number.`);
  }

  interface Acc { key: string[]; rows: number; refs: string[]; sum: number[]; n: number[]; min: number[]; max: number[]; set: Set<string>[] }
  const mk = (key: string[]): Acc => ({ key, rows: 0, refs: [], sum: ms.map(() => 0), n: ms.map(() => 0), min: ms.map(() => Infinity), max: ms.map(() => -Infinity), set: ms.map(() => new Set<string>()) });
  const by = new Map<string, Acc>();
  const total = mk([]);
  const skipped = ms.map(() => ({ count: 0, refs: [] as string[] }));
  let matched = 0, timeSkipped = 0, capped = false;
  const add = (a: Acc, row: Cell[], ref: string, track: boolean) => {
    a.rows++; if (a.refs.length < 5) a.refs.push(ref);
    ms.forEach(({ m, x }, j) => {
      if (m.op === 'count') { if (!x) a.n[j]++; else if (row[x.i] !== null && row[x.i] !== '') a.n[j]++; return; }
      const v = x ? row[x.i] : null;
      if (v === null || v === '') return;   /* not recorded: neither a value nor a zero */
      if (m.op === 'distinct') { a.set[j].add(low(v)); return; }
      const num = typeof v === 'number' ? v : x?.f.type === 'date' ? dateMs(v) : undefined;
      if (num === undefined) { if (track) { skipped[j].count++; if (skipped[j].refs.length < 5) skipped[j].refs.push(ref); } return; }
      a.sum[j] += num; a.n[j]++; a.min[j] = Math.min(a.min[j], num); a.max[j] = Math.max(a.max[j], num);
    });
  };
  d.rows.forEach((row, r) => {
    if (!preds.every(p => p.p(row[p.i]))) return;
    matched++;
    const key = groups.map(g => keyWord(row[g.i], g.f));
    if (time) {
      const t = dateMs(row[time.i]);
      if (t === undefined) { timeSkipped++; add(total, row, d.refs[r], true); return; }
      /* (the time last, after the fields grouped by — the one order of the keys in both engines, 22 November) */
      key.push(bucket(t, time.by));
    }
    add(total, row, d.refs[r], true);
    if (!key.length) return;
    const k = key.join('\u0001');
    let a = by.get(k);
    if (!a) { if (by.size >= GROUP_CAP) { capped = true; return; } a = mk(key); by.set(k, a); }
    add(a, row, d.refs[r], false);
  });
  const valuesOf = (a: Acc): (number | string | null)[] => ms.map(({ m, x }, j) => {
    if (m.op === 'count') return a.n[j];
    if (m.op === 'distinct') return a.set[j].size;
    if (!a.n[j]) return null;
    if (m.op === 'sum') return a.sum[j];
    if (m.op === 'avg') return a.sum[j] / a.n[j];
    const v = m.op === 'min' ? a.min[j] : a.max[j];
    /* the first or the last of a DATE is said as the day it is, as a workbook's is — never as a count of milliseconds */
    return x?.f.type === 'date' ? new Date(v).toISOString().slice(0, 10) : v;
  });
  const toGroup = (a: Acc, key: string[] = a.key): Group => ({ key, values: valuesOf(a), rows: a.rows, refs: a.refs });
  /* several groups' running sums brought together exactly — for the “(others)” of a block, and a block's own whole (A6) */
  const mergeAcc = (as: Acc[]): Acc => {
    const m = mk([]);
    for (const a of as) {
      m.rows += a.rows;
      for (const ref of a.refs) if (m.refs.length < 5) m.refs.push(ref);
      ms.forEach((_x, j) => { m.sum[j] += a.sum[j]; m.n[j] += a.n[j]; m.min[j] = Math.min(m.min[j], a.min[j]); m.max[j] = Math.max(m.max[j], a.max[j]); for (const v of a.set[j]) m.set[j].add(v); });
    }
    return m;
  };
  const items = [...by.values()].map(a => ({ a, g: toGroup(a) }));
  let list: Group[] = items.map(x => x.g);
  /* THE DERIVED FIGURES: worked on EVERY group and on the totals, before the cut — those that do not depend on the order first (the
     groups may be ordered by one), then the ones worked along the order (a change, a running total) */
  const totals = valuesOf(total);
  deriveInto(plan, list, totals, 'early');
  const ord = q.order ?? (groups.length || time ? (time && !groups.length ? { by: 'group' as const } : { by: 0, desc: true }) : { by: 'group' as const });
  /* every group there is — before a condition takes some out of what is shown */
  const every = list.length;
  const had = keepHaving(hEarly, list);
  list = had.kept;
  let blocks: number[] | undefined, topNote: string | undefined;
  if (q.top) {
    const names = figureNames;
    const at = typeof ord.by === 'number' ? ord.by : 0, desc = ord.by === 'group' ? true : ord.desc !== false;
    const rankAt = rankPositions(plan.plans, plan.base);
    const t = topWithin(items, q.top.n, { by: at, desc, ...(ord.by === 'group' ? { blocksByLabel: ord.desc ? 'desc' as const : 'asc' as const } : {}) }, mergeAcc, toGroup, (others, wholes) => {
      deriveInto(plan, [...others, ...wholes], totals, 'early');
      /* (a rank is of the groups as they were asked for — the ones made here have none) */
      for (const g of [...others, ...wholes]) for (const i of rankAt) g.values[i] = null;
    });
    list = t.groups; blocks = t.blocks;
    const first = groups[0]?.f.name ?? '', second = groups[1]?.f.name ?? (time ? `${time.f.name} by ${time.by}` : '');
    topNote = t.others
      ? `Within each “${first}” the ${q.top.n} ${desc ? 'largest' : 'smallest'} “${second}” by “${names[at]}” are shown, and the rest of each are brought together as one “(… others)” group, worked from the rows — so every “${first}” is here, and its groups add back to its whole.`
      : `Within each “${first}” the ${q.top.n} ${desc ? 'largest' : 'smallest'} “${second}” by “${names[at]}” were asked for — none has more than ${q.top.n}, so every group is shown.`;
  } else list.sort((x, y) => {
    let c: number;
    /* (a day of the week in the order of the week; and the order asked for is kept — newest first when it is asked) */
    if (ord.by === 'group') c = ord.desc ? cmpGroupKeys(y.key, x.key, 'en-GB') : cmpGroupKeys(x.key, y.key, 'en-GB');
    else { const a = x.values[ord.by] ?? null, b = y.values[ord.by] ?? null; c = a === null ? (b === null ? 0 : 1) : b === null ? -1 : Number(a) - Number(b); if (ord.desc && a !== null && b !== null) c = -c; }
    return c;
  });
  deriveInto(plan, list, totals, 'late');
  const hadLate = keepHaving(hLate, list);
  list = hadLate.kept;
  /* how many groups there are in all: every one a condition was asked of — or, with top, every row of every block */
  const groupsTotal = q.top ? list.length : every;
  /* the cut: so many groups — or, with top, so many of the FIRST thing grouped by, each with its top few whole, never part of one */
  const limit = Math.min(LIMIT_MAX, q.limit ?? 50);
  list = list.slice(0, blocks ? wholeBlocks(blocks.slice(0, limit), LIMIT_MAX) : limit);
  const notes: string[] = [...partNotes];
  if (timeSkipped && time) notes.push(`${timeSkipped.toLocaleString('en-GB')} matching rows have no ${time.f.name} recorded and are left out of the ${time.by}s.`);
  if (capped) notes.push(`More than ${GROUP_CAP.toLocaleString('en-GB')} groups — the rest were not counted; group by fewer fields.`);
  for (const g of groups) { const n = list.find(x => x.key.includes(NOT_RECORDED)); if (n) notes.push(`Rows with no ${g.f.name} recorded are shown as “${NOT_RECORDED}” — never put into another group.`); }
  ms.forEach(({ m, x }) => {
    if (!x || m.op === 'count' || m.op === 'distinct') return;
    const blank = d.rows.filter(row => preds.every(p => p.p(row[p.i])) && (row[x.i] === null || row[x.i] === '')).length;
    if (blank) notes.push(`${blank.toLocaleString('en-GB')} of the ${matched.toLocaleString('en-GB')} matching rows have no ${x.f.name} recorded — they are not counted as zero.`);
    if (x.f.calc) notes.push(`“${x.f.name}” is worked out by Faultline: ${x.f.calc}.`);
  });
  for (const f of q.filters ?? []) if (f.op === 'contains') notes.push(`The filter on “${f.column}” matches words in the text — it is not a recorded classification.`);
  return {
    sheet: d.name, rowsScanned: d.rows.length, rowsMatched: matched,
    groups: list, groupsTotal, totals,
    measures: [...measureNames, ...plan.names], groupBy: [...groups.map(g => g.f.name), ...(time ? [`${time.f.name} by ${time.by}`] : [])],
    skipped: ms.map((_x, j) => ({ measure: measureNames[j], count: skipped[j].count, refs: skipped[j].refs })).filter(s => s.count),
    notes: [...new Set([...notes, ...plan.notes, ...(had.note ? [had.note] : []), ...(hadLate.note ? [hadLate.note] : []), ...(topNote ? [topNote] : [])])],
    ...(plan.derived.length ? { derived: plan.derived } : {}),
    ...(q.top ? { top: q.top.n } : {}),
    ...(had.said || hadLate.said ? { only: [had.said, hadLate.said].filter(Boolean).join(' and ') } : {}),
  };
}

/** A field's coverage — how many rows record it, its range or its commonest values — for saying what a dataset holds. */
export function fieldCoverage(d: Dataset): { name: string; type: FieldType; unit?: string; means: string; calc?: string; recorded: number; of: number; min?: number; max?: number; top?: [string, number][] }[] {
  return d.fields.map((f, i) => {
    const vals = d.rows.map(r => r[i]).filter(v => v !== null && v !== '');
    const out: ReturnType<typeof fieldCoverage>[number] = { name: f.name, type: f.type, ...(f.unit ? { unit: f.unit } : {}), means: f.means, ...(f.calc ? { calc: f.calc } : {}), recorded: vals.length, of: d.rows.length };
    if (f.type === 'number' && vals.length) { const ns = vals.map(Number); out.min = Math.min(...ns); out.max = Math.max(...ns); }
    if (f.type === 'text' || f.type === 'yes/no') {
      const c = new Map<string, number>();
      for (const v of vals) c.set(String(v), (c.get(String(v)) ?? 0) + 1);
      out.top = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    }
    return out;
  });
}

export type { Measure };
