/* WORKBOOKS IN THE CONVERSATION (docs/WORKBOOKS.md). A workbook attached in AI Mode is read on this device (lib/workbook); these let the
 * colleague ask of it without the workbook ever going to the model:
 *   workbook_profile  what it contains and what is wrong with it — sheets, columns and their types, blanks, words in number columns,
 *                     formulas with no saved value, errors, repeated rows, a name written two ways, what could not be read
 *   query_workbook    a question as filters, groups and measures — worked by Faultline's code over every row, with the cells it came from
 *   workbook_rows     the source rows behind a finding, each cell with its reference
 * The model reasons and explains; every figure is the code's. The summary of each workbook is kept on the conversation; its cells are not. */
import { patchStudy } from '../db';
import type { ToolStudy } from '../lib/study';
import { workbooks } from '../lib/workbook/client';
import type { Query, QueryResult, Filter, Measure } from '../lib/workbook/query';
import type { WorkbookProfile, SheetProfile, ColumnProfile } from '../lib/workbook/read';
import { anyone } from './access';
import { conversation } from './draftStore';
import type { CapCtx, CapResult, Capability, Checked, ColleagueWorkbook } from './types';

const workbooksOf = (s: Pick<ToolStudy, 'facts'>): ColleagueWorkbook[] => { const w = (s.facts as { workbooks?: unknown }).workbooks; return Array.isArray(w) ? w as ColleagueWorkbook[] : []; };

/** The workbook's summary put on the conversation, or changed there (its status as it is read). */
export async function noteWorkbook(ctx: CapCtx, w: ColleagueWorkbook): Promise<void> {
  const c = await conversation(ctx);
  if (!c.ok) return;
  await patchStudy(c.s.id, s => ({ facts: { ...s.facts, workbooks: [...workbooksOf(s).filter(x => x.id !== w.id), w] } as ToolStudy['facts'] }));
}
/** A read that was under way when the page was left can never finish: said so, never left looking as if it were still reading. */
export async function settleWorkbooks(ctx: CapCtx, running: ReadonlySet<string>): Promise<void> {
  const c = await conversation(ctx);
  if (!c.ok) return;
  const stale = workbooksOf(c.s).filter(w => w.status === 'reading' && !running.has(w.id));
  if (!stale.length) return;
  await patchStudy(c.s.id, s => ({ facts: { ...s.facts, workbooks: workbooksOf(s).map(w => (w.status === 'reading' && !running.has(w.id) ? { ...w, status: 'interrupted' as const, why: 'The read stopped when the page was left — attach the workbook again to read it.' } : w)) } as ToolStudy['facts'] }));
}

const n = (x: number): string => x.toLocaleString('en-GB', { maximumFractionDigits: 2 });
const plural = (k: number, w: string): string => `${n(k)} ${w}${k === 1 ? '' : 's'}`;

/** A workbook in the register read in another conversation, its cells on this device. */
async function reachable(fileId: string): Promise<ColleagueWorkbook | undefined> {
  const s = (await (await import('./data')).allSources()).find(x => x.facts.fileId === fileId);
  return s && s.facts.kind === 'workbook' ? { id: s.facts.fileId, name: s.facts.name, bytes: s.facts.bytes, at: s.at, status: s.facts.status === 'reading' ? 'interrupted' : s.facts.status } : undefined;
}

/** Which workbook: the one named (its id, or its register id), else the only one read in this conversation — never the newest of several. */
async function pick(ctx: CapCtx, id?: string): Promise<{ ok: true; w: ColleagueWorkbook; p: WorkbookProfile } | { ok: false; why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return { ok: false, why: c.why };
  const all = workbooksOf(c.s);
  /* an id may be the register's (lib/data/sources) — the file's own id is under it */
  const key = id ? ((await import('./data')).allSources().then(l => l.find(s => s.id === id || s.id === id.replace(/^file:/, ''))?.facts.fileId ?? id)) : undefined;
  const want = key ? await key : undefined;
  /* NEVER THE NEWEST BECAUSE IT IS NEWEST (10 November, docs/CONVERSATIONAL-DATA.md — "It must not silently select an arbitrary
     file"): with no workbook named, only a conversation holding one usable workbook has an answer; with several, the colleague asks */
  const usable = all.filter(x => x.status === 'ready' || x.status === 'partial');
  if (!want && usable.length > 1) return { ok: false, why: `This conversation has ${usable.length} workbooks — ${usable.map(x => `“${x.name}” [${x.id}]`).join(', ')}. Ask the person which, naming each; never pick one.` };
  const w = want ? (all.find(x => x.id === want) ?? (await reachable(want))) : usable[0] ?? all[all.length - 1];
  if (!w) return { ok: false, why: id ? `No workbook ${id} in this conversation.` : 'No workbook has been attached in this conversation. The person attaches one (.xlsx) with the + button.' };
  if (w.status === 'reading') return { ok: false, why: `“${w.name}” is still being read — wait for it to finish (its progress is shown in the conversation).` };
  if (w.status === 'failed' || w.status === 'interrupted') return { ok: false, why: `“${w.name}” was not read: ${w.why ?? 'it failed'}.` };
  try { return { ok: true, w, p: await workbooks().profile(w.id) }; } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
}

const colSaid = (c: ColumnProfile, rows: number): string => {
  const bits: string[] = [c.type];
  if (c.counts.blank) bits.push(`${n(c.counts.blank)} blank`);
  if (c.type === 'number' && c.counts.text) bits.push(`${n(c.counts.text)} not numbers`);
  if (c.type === 'mixed') bits.push(`numbers ${n(c.counts.number)}, text ${n(c.counts.text)}, dates ${n(c.counts.date)}`);
  if (c.counts.error) bits.push(`${n(c.counts.error)} errors (${Object.keys(c.errors ?? {}).join(', ')})`);
  if (c.min !== undefined && c.max !== undefined) bits.push(c.type === 'date' ? `${new Date(c.min).toISOString().slice(0, 10)} to ${new Date(c.max).toISOString().slice(0, 10)}` : `${n(c.min)} to ${n(c.max)}`);
  if (c.distinct !== undefined && c.type === 'text') bits.push(`${n(c.distinct)} different${c.distinct <= 12 && c.top ? `: ${c.top.map(t => t[0]).join(', ')}` : ''}`);
  /* how many cells are worked out by a formula — never the formula's text: it is the workbook's working, not its data, and read out it buries the answer */
  if (c.formulas) bits.push(`${n(c.formulas)} worked out by formulas${c.formulasNoValue ? ` (${n(c.formulasNoValue)} with no saved value)` : ''}`);
  if (c.variants?.length) bits.push(`written more than one way: ${c.variants.map(v => v.map(x => `“${x[0]}” ×${n(x[1])}`).join(' / ')).join('; ')}`);
  if (c.hidden) bits.push('hidden');
  if (!c.named) bits.push('no header');
  return `${c.letter} “${c.name}” — ${bits.join(', ')}${rows ? '' : ''}`;
};
/** One sheet in a line, for the map — what it holds, by its own columns, so what it IS can be read from it: a list naming each thing
 *  once (a master), dated rows (a log), months or periods (a plan). */
export function sheetLine(s: SheetProfile): string {
  if (!s.read && !s.rows) return `“${s.name}” — not read: ${s.why ?? ''}`;
  const real = s.columns.filter(c => c.type !== 'empty' && c.name !== 'Shown by the filter');
  const once = real.filter(c => c.unique).map(c => c.name);
  const dates = real.filter(c => c.type === 'date' && c.min !== undefined && c.max !== undefined);
  const span = dates.length ? `${new Date(Math.min(...dates.map(d => d.min ?? 0))).toISOString().slice(0, 10)} to ${new Date(Math.max(...dates.map(d => d.max ?? 0))).toISOString().slice(0, 10)}` : '';
  const shown = real.slice(0, 14).map(c => c.name).join(', ');
  return [
    `“${s.name}”${s.state !== 'visible' ? ` (${s.state === 'veryHidden' ? 'very hidden' : 'hidden'})` : ''}: ${plural(s.rows, 'row')}${s.headerRow ? `, header row ${s.headerRow}` : ', no header found'}`,
    `columns (${real.length}): ${shown}${real.length > 14 ? ` +${real.length - 14} more` : ''}`,
    once.length ? `each value once in: ${once.slice(0, 4).join(', ')}` : '',
    span ? `dates ${span}` : '',
    s.filter ? `a filter on ${s.filter.on.join(', ') || 'it'} hides ${n(s.filter.hiddenRows)} rows` : '',
    !s.read ? `PARTIAL: ${s.why}` : '',
  ].filter(Boolean).join('; ');
}
/** A connection in words — which column on which sheet holds the same values as which on the other, and which is the master. */
export const linkSaid = (l: { a: string; b: string; column: string; bColumn?: string; shared: number; overlap: number; key?: string }): string =>
  `“${l.a}”.${l.column} ↔ “${l.b}”.${l.bColumn ?? l.column} (${n(l.shared)} values shared, ${Math.round(l.overlap * 100)}% of the smaller list${l.key ? `; “${l.key}” lists each once — the master` : ''})`;

/** One sheet as Luna is told it — its rows, header, what is wrong and each column (exported for its test). */
export function sheetSaid(s: SheetProfile, full: boolean): string {
  if (!s.read && !s.rows) return `“${s.name}” (${s.state}) — not read: ${s.why ?? ''}`;
  const head = `“${s.name}”${s.state !== 'visible' ? ` (${s.state === 'veryHidden' ? 'very hidden' : 'hidden'})` : ''} — ${plural(s.rows, 'row')} of data under the header in row ${s.headerRow}${s.above.length ? ` (above it: ${s.above.join(' / ')})` : ''}${s.read ? '' : ` — PARTIAL: ${s.why}`}`;
  const issues = [
    s.filter ? `A filter is on (${s.filter.ref}${s.filter.on.length ? `, on ${s.filter.on.join(', ')}` : ''}): ${s.filter.hiddenRows ? `${n(s.filter.hiddenRows)} of the ${n(s.rows)} rows are hidden by it` : 'it hides no rows'} — every figure counts all rows unless filtered on “Shown by the filter” = yes; ask whether they want only what the filter shows` : '',
    s.duplicateRows ? `${plural(s.duplicateRows, 'row')} repeated exactly${s.duplicatesChecked < s.rows ? ` (in the first ${n(s.duplicatesChecked)} checked)` : ''}` : '',
    s.formulasNoValue ? `${plural(s.formulasNoValue, 'formula')} with no saved value (Faultline does not recalculate Excel)` : '',
    s.blankRows ? `${plural(s.blankRows, 'blank row')} skipped${s.formulaRows ? ` (${n(s.formulaRows)} of them hold only formulas showing nothing)` : ''}` : '',
    s.merged ? `${plural(s.merged, 'merged range')}` : '',
    s.refersTo.length ? `formulas refer to ${s.refersTo.map(x => `“${x}”`).join(', ')}` : '',
    s.tables.length ? `tables: ${s.tables.join(', ')}` : '',
  ].filter(Boolean);
  const cols = full ? s.columns.map(c => `  ${colSaid(c, s.rows)}`) : [`  columns: ${s.columns.map(c => `${c.name} (${c.type}${c.counts.blank ? `, ${n(c.counts.blank)} blank` : ''})`).join('; ')}`];
  return [head, ...(issues.length ? [`  ${issues.join('; ')}`] : []), ...cols].join('\n');
}

const workbookProfile: Capability = {
  name: 'workbook_profile', title: 'What the workbook holds', kind: 'read',
  validate: raw => {
    const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    if (o.workbookId !== undefined && typeof o.workbookId !== 'string') return { ok: false, why: 'workbookId is the workbook’s id' } as Checked;
    if (o.sheet !== undefined && typeof o.sheet !== 'string') return { ok: false, why: 'sheet is a sheet’s name' } as Checked;
    return { ok: true, input: { ...(o.workbookId ? { workbookId: o.workbookId } : {}), ...(o.sheet ? { sheet: o.sheet } : {}) } } as Checked;
  },
  allowed: anyone,
  async run(ctx, input: { workbookId?: string; sheet?: string }): Promise<CapResult> {
    const k = await pick(ctx, input.workbookId);
    if (!k.ok) return { ok: false, why: k.why };
    const { w, p } = k;
    const want = input.sheet?.toLowerCase();
    const sheets = want ? p.sheets.filter(s => s.name.toLowerCase() === want) : p.sheets;
    if (input.sheet && !sheets.length) return { ok: false, why: `No sheet “${input.sheet}” — the sheets are ${p.sheets.map(s => `“${s.name}”`).join(', ')}.` };
    const lines = [
      `“${p.name}” [${w.id}] — ${(p.bytes / 1e6).toFixed(1)} MB, every sheet and row read on this device in ${n(p.seconds)} s${p.status === 'partial' ? ' — PARTIAL: not every sheet was read in full; say so before any figure' : ''}. Dates: ${p.date1904 ? '1904 system' : '1900 system'}.`,
      ...(input.sheet ? sheets.map(s => sheetSaid(s, true)) : [`THE MAP — ${plural(p.sheets.length, 'sheet')}, each in a line (ask for one by name for every column):`, ...sheets.map(s => `- ${sheetLine(s)}`)]),
      ...(p.links.length ? [`CONNECTIONS found from the values (not from formulas): ${p.links.map(linkSaid).join('; ')}.`] : ['CONNECTIONS: no two sheets share a column of values — any link between them is the person’s to say.']),
      ...(p.names.length ? [`Defined names: ${p.names.slice(0, 12).map(x => `${x.name} = ${x.ref}`).join('; ')}.`] : []),
      ...(p.notRead.length ? [`In the file but NOT read: ${p.notRead.map(x => `${x.what} — ${x.detail}`).join(' · ')}`] : []),
      'Every figure comes from query_workbook. The header row and each column’s meaning are Faultline’s reading — where a meaning, unit or definition is not plain, ask the person.',
    ];
    let says = lines.join('\n');
    if (says.length > 3900) says = `${says.slice(0, 3800)}\n… (more — ask workbook_profile for one sheet by name; every sheet is in the data below)`;
    const data = { id: w.id, name: p.name, status: p.status, sheets: sheets.map(s => ({ name: s.name, state: s.state, rows: s.rows, headerRow: s.headerRow, read: s.read, columns: s.columns.map(c => ({ name: c.name, letter: c.letter, type: c.type, blank: c.counts.blank, ...(c.unique ? { eachOnce: true } : {}) })) })), links: p.links };
    /* the data carries every sheet's columns — trimmed to names, then to the first 40 a sheet, never a sheet left out */
    const names = { id: w.id, name: p.name, status: p.status, sheets: data.sheets.map(s => ({ name: s.name, rows: s.rows, columns: s.columns.map(c => c.name) })), links: p.links };
    const short = { ...names, sheets: names.sheets.map(s => ({ ...s, columns: s.columns.slice(0, 40), ...(s.columns.length > 40 ? { more: s.columns.length - 40 } : {}) })) };
    return { ok: true, says, data: JSON.stringify(data).length < 11_000 ? data : JSON.stringify(names).length < 11_000 ? names : short, refs: [] };
  },
};

/* ---- query_workbook: checked by hand — its shape is nested */
const OPS = ['eq', 'ne', 'in', 'gt', 'gte', 'lt', 'lte', 'between', 'contains', 'blank', 'notblank'];
const MEAS = ['sum', 'avg', 'min', 'max', 'count', 'distinct'];
const scalar = (v: unknown): v is string | number => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
function readFilters(v: unknown): Filter[] | string {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 8) return 'filters is a list of at most eight';
  const out: Filter[] = [];
  for (const f of v) {
    const o = f && typeof f === 'object' ? f as Record<string, unknown> : null;
    if (!o || typeof o.column !== 'string' || !OPS.includes(String(o.op))) return `each filter needs a column and an op (${OPS.join(', ')})`;
    const x: Filter = { column: o.column, op: o.op as Filter['op'] };
    if (scalar(o.value)) x.value = o.value;
    if (Array.isArray(o.values)) { if (!o.values.every(scalar) || o.values.length > 50) return 'values is a list of words or numbers'; x.values = o.values as (string | number)[]; }
    if (scalar(o.from)) x.from = o.from;
    if (scalar(o.to)) x.to = o.to;
    if (['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'].includes(x.op) && x.value === undefined) return `the filter on “${x.column}” needs a value`;
    if (x.op === 'in' && !x.values?.length) return `the filter on “${x.column}” needs values`;
    if (x.op === 'between' && (x.from === undefined || x.to === undefined)) return `the filter on “${x.column}” needs from and to`;
    out.push(x);
  }
  return out;
}
function readLookups(v: unknown): NonNullable<Query['lookups']> | string {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 4) return 'lookups is a list of at most four';
  const out: NonNullable<Query['lookups']> = [];
  for (const l of v) {
    const o = l && typeof l === 'object' ? l as Record<string, unknown> : {};
    if (!['as', 'sheet', 'match', 'on', 'take'].every(k => typeof o[k] === 'string' && (o[k] as string).trim())) return 'each lookup needs as, sheet, match (this sheet’s column), on (that sheet’s column) and take (that sheet’s column to bring back)';
    out.push({ as: String(o.as), sheet: String(o.sheet), match: String(o.match), on: String(o.on), take: String(o.take) });
  }
  return out;
}
function readCalcs(v: unknown): NonNullable<Query['calcs']> | string {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 4) return 'calcs is a list of at most four';
  const out: NonNullable<Query['calcs']> = [];
  for (const c of v) {
    const o = c && typeof c === 'object' ? c as Record<string, unknown> : {};
    if (typeof o.as !== 'string' || typeof o.a !== 'string' || !['*', '/', '+', '-'].includes(String(o.op)) || !(typeof o.b === 'string' || (typeof o.b === 'number' && Number.isFinite(o.b)))) return 'each calc needs as, a (a column), op (* / + -) and b (a column or a number)';
    out.push({ as: o.as, a: o.a, op: o.op as '*', b: o.b as string | number });
  }
  return out;
}
type QIn = Query & { workbookId?: string };
function readQuery(raw: unknown): { ok: true; input: QIn } | { ok: false; why: string } {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  if (typeof o.sheet !== 'string' || !o.sheet) return { ok: false, why: 'sheet is needed — its name' };
  const filters = readFilters(o.filters);
  if (typeof filters === 'string') return { ok: false, why: filters };
  const lookups = readLookups(o.lookups);
  if (typeof lookups === 'string') return { ok: false, why: lookups };
  const calcs = readCalcs(o.calcs);
  if (typeof calcs === 'string') return { ok: false, why: calcs };
  const groupBy = o.groupBy === undefined ? [] : o.groupBy;
  if (!Array.isArray(groupBy) || groupBy.length > 3 || !groupBy.every(g => typeof g === 'string')) return { ok: false, why: 'groupBy is up to three column names' };
  const ms = Array.isArray(o.measures) ? o.measures : [];
  if (!ms.length || ms.length > 6) return { ok: false, why: 'measures is one to six of sum, avg, min, max, count, distinct — each with a column (count may have none)' };
  const measures: Measure[] = [];
  for (const m of ms) {
    const x = m && typeof m === 'object' ? m as Record<string, unknown> : {};
    if (!MEAS.includes(String(x.op))) return { ok: false, why: `a measure’s op is one of ${MEAS.join(', ')}` };
    if (x.op !== 'count' && typeof x.column !== 'string') return { ok: false, why: `${String(x.op)} needs a column` };
    measures.push(x.op === 'count' ? { op: 'count', ...(typeof x.column === 'string' ? { column: x.column } : {}) } : { op: x.op as 'sum', column: x.column as string });
  }
  let time: Query['time'];
  if (o.time !== undefined) {
    const t = o.time as Record<string, unknown>;
    if (!t || typeof t.column !== 'string' || !['day', 'week', 'month', 'year'].includes(String(t.by))) return { ok: false, why: 'time is { column, by: day | week | month | year }' };
    time = { column: t.column, by: t.by as 'month' };
  }
  let order: Query['order'];
  if (o.order !== undefined) {
    const r = o.order as Record<string, unknown>;
    if (!r || !(r.by === 'group' || (typeof r.by === 'number' && Number.isInteger(r.by) && r.by >= 0 && r.by < measures.length))) return { ok: false, why: 'order.by is "group" or a measure’s position (0 for the first)' };
    order = { by: r.by as 'group', ...(typeof r.desc === 'boolean' ? { desc: r.desc } : {}) };
  }
  const limit = o.limit === undefined ? 25 : Number(o.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return { ok: false, why: 'limit is 1 to 50' };
  return { ok: true, input: { sheet: o.sheet, ...(lookups.length ? { lookups } : {}), ...(calcs.length ? { calcs } : {}), filters, groupBy: groupBy as string[], ...(time ? { time } : {}), measures, ...(order ? { order } : {}), limit, ...(typeof o.workbookId === 'string' ? { workbookId: o.workbookId } : {}) } };
}

const fmt = (v: number | string | null): string => (v === null ? '—' : typeof v === 'number' ? n(v) : v);
export function querySaid(r: QueryResult, partial: boolean): string {
  const head = `${r.sheet}: ${n(r.rowsMatched)} of ${n(r.rowsScanned)} rows matched${r.groupBy.length ? `, in ${n(r.groupsTotal)} group${r.groupsTotal === 1 ? '' : 's'} of ${r.groupBy.join(' and ')}` : ''}. Worked by Faultline over every row${partial ? ' — but the workbook was only PARTLY read' : ''}.`;
  const cols = [...r.groupBy, ...r.measures];
  const table = r.groupBy.length ? [cols.join(' | '), ...r.groups.map(g => [...g.key, ...g.values.map(fmt)].join(' | ') + `   (e.g. ${g.refs[0] ?? ''})`)] : [];
  const tot = `All ${r.groupBy.length ? 'matched rows' : ''}: ${r.measures.map((m, i) => `${m} ${fmt(r.totals[i])}`).join('; ')}.`;
  const more = r.groupsTotal > r.groups.length ? [`(${n(r.groupsTotal - r.groups.length)} more groups not shown.)`] : [];
  const skipped = r.skipped.map(s => `${s.measure}: ${plural(s.count, 'cell')} not used — not a number (e.g. ${s.refs.join(', ')}).`);
  return [head, ...table, ...more, tot, ...skipped, ...r.notes].join('\n');
}

const queryWorkbook: Capability = {
  name: 'query_workbook', title: 'Ask the workbook', kind: 'read',
  validate: raw => readQuery(raw) as Checked,
  allowed: anyone,
  async run(ctx, input: QIn): Promise<CapResult> {
    const k = await pick(ctx, input.workbookId);
    if (!k.ok) return { ok: false, why: k.why };
    const { workbookId: _w, ...q } = input;
    try {
      const r = await workbooks().query(k.w.id, q);
      let says = querySaid(r, k.p.status === 'partial');
      if (says.length > 3900) says = `${says.slice(0, 3800)}\n… (shortened — ask with a smaller limit)`;
      const data = { sheet: r.sheet, rowsScanned: r.rowsScanned, rowsMatched: r.rowsMatched, groupBy: r.groupBy, measures: r.measures, groups: r.groups.slice(0, 50), totals: r.totals, skipped: r.skipped, notes: r.notes };
      while (JSON.stringify(data).length > 11_000 && data.groups.length > 5) data.groups = data.groups.slice(0, Math.floor(data.groups.length / 2));
      return { ok: true, says, data, refs: [] };
    } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
  },
};

const workbookRows: Capability = {
  name: 'workbook_rows', title: 'The rows behind it', kind: 'read',
  validate: raw => {
    const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    if (typeof o.sheet !== 'string' || !o.sheet) return { ok: false, why: 'sheet is needed — its name' } as Checked;
    const filters = readFilters(o.filters);
    if (typeof filters === 'string') return { ok: false, why: filters } as Checked;
    if (o.columns !== undefined && (!Array.isArray(o.columns) || o.columns.length > 12 || !o.columns.every(c => typeof c === 'string'))) return { ok: false, why: 'columns is up to twelve column names' } as Checked;
    const limit = o.limit === undefined ? 10 : Number(o.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) return { ok: false, why: 'limit is 1 to 20' } as Checked;
    return { ok: true, input: { sheet: o.sheet, filters, ...(o.columns ? { columns: o.columns } : {}), limit, ...(typeof o.workbookId === 'string' ? { workbookId: o.workbookId } : {}) } } as Checked;
  },
  allowed: anyone,
  async run(ctx, input: { workbookId?: string; sheet: string; filters: Filter[]; columns?: string[]; limit: number }): Promise<CapResult> {
    const k = await pick(ctx, input.workbookId);
    if (!k.ok) return { ok: false, why: k.why };
    const { workbookId: _w, ...q } = input;
    try {
      const r = await workbooks().rows(k.w.id, q);
      const lines = r.rows.map(x => `row ${x.row}: ${r.columns.map(c => `${c} ${fmt(x.cells[c]?.value === undefined || typeof x.cells[c]?.value === 'boolean' ? String(x.cells[c]?.value ?? '') : (x.cells[c]?.value as number | string | null))}`).join(' · ')}`);
      const says = [`${r.sheet}: ${n(r.matched)} matching rows; the first ${r.rows.length}, each with its row (cells are ${r.sheet}!<column><row>):`, ...lines].join('\n').slice(0, 3900);
      return { ok: true, says, data: r, refs: [] };
    } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
  },
};

export const WORKBOOK = [workbookProfile, queryWorkbook, workbookRows];
