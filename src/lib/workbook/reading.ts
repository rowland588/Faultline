/* THE READING — WHAT A PERSON TELLS LUNA ABOUT A WORKBOOK, KEPT FOR THAT CUSTOMER'S REPORT (15 November, docs/WORKBOOKS.md).
 * A workbook is one site's habit: which column they manage by, which rows do not count, that "Score" is a percentage. No reader can
 * know that from the cells. What is said once is kept as DATA — never a note in words — applied in code over what the reader found
 * (lib/workbook/firstLook layReading), kept on the file's record for that customer, and used again when the same report is read:
 *   sheet · result · date · everyRow     where to start, the lead figure, what dates the rows, the reports' basis (13–14 November);
 *   heads                                the row a sheet's headings are on, columns called by another name (lib/workbook/amend);
 *   columns                              a column added up, averaged, never added, or said to be time lost, money or output;
 *   ignore                               a column that is neither a figure nor something to split by;
 *   rows                                 rows left out, or the only rows read, by what one column holds.
 * It is the person's instruction on how to read a report: not a record of the factory, not evidence, never a figure. Pure. */
import type { Filter } from './query';
import type { SheetProfile, WorkbookProfile } from './read';
import type { LookSnap } from './sinceLast';

/** What a column is, as the person said it. */
export type ColumnSay = 'add' | 'average' | 'never' | 'lost' | 'money' | 'volume';
export const COLUMN_SAYS: readonly ColumnSay[] = ['add', 'average', 'never', 'lost', 'money', 'volume'];
/** Rows by what one column holds: `ne` leaves them out, `eq` reads only them. */
export interface RowRule { column: string; op: 'eq' | 'ne'; value: string | number }
export interface Heads { sheet: string; row?: number; names?: { column: string; name: string }[] }
export interface Reading {
  /** When it was last added to. */
  at: number;
  sheet?: string; result?: string; date?: string; everyRow?: boolean;
  heads?: Heads[];
  columns?: Record<string, ColumnSay>;
  ignore?: string[];
  rows?: RowRule[];
  /** Put away by the person: kept, never applied again. */
  forgotten?: number;
  /** The file it was first said about, when this one carries it on from an earlier month. */
  from?: { name: string; at: number; sheet?: { was: string; now: string } };
}
/** A reading as it is kept beside a snapshot on a file's record. */
export interface KeptReading { reading: Reading; snap: LookSnap; client: string }

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
const q = (x: string | number): string => (typeof x === 'number' ? String(x) : `“${x}”`);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayOf = (at: number): string => { const d = new Date(at); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

/** Does it say anything at all? */
export function hasReading(r: Reading | undefined): r is Reading {
  return !!r && !r.forgotten && !!(r.sheet || r.result || r.date || r.everyRow || r.heads?.length || Object.keys(r.columns ?? {}).length || r.ignore?.length || r.rows?.length);
}

/** One reading laid over another: what is said now wins, column by column; the rest stands. */
export function mergeReading(was: Reading | undefined, now: Partial<Reading>, at: number): Reading {
  const base: Reading = was && !was.forgotten ? { ...was } : { at };
  const out: Reading = { ...base, at };
  for (const k of ['sheet', 'result', 'date'] as const) if (now[k]) out[k] = now[k];
  if (now.everyRow !== undefined) { if (now.everyRow) out.everyRow = true; else delete out.everyRow; }
  if (now.heads?.length) {
    const heads = (base.heads ?? []).map(h => ({ ...h, ...(h.names ? { names: [...h.names] } : {}) }));
    for (const h of now.heads) {
      const mine = heads.find(x => norm(x.sheet) === norm(h.sheet));
      if (!mine) { heads.push({ ...h }); continue; }
      if (h.row !== undefined) mine.row = h.row;
      if (h.names?.length) mine.names = [...(mine.names ?? []).filter(n => !h.names?.some(x => norm(x.column) === norm(n.column))), ...h.names];
    }
    out.heads = heads;
  }
  if (now.columns && Object.keys(now.columns).length) {
    const cols: Record<string, ColumnSay> = {};
    for (const [k, v] of Object.entries(base.columns ?? {})) if (!Object.keys(now.columns).some(n => norm(n) === norm(k))) cols[k] = v;
    out.columns = { ...cols, ...now.columns };
    /* a column now said to be a figure is no longer ignored */
    if (out.ignore) out.ignore = out.ignore.filter(i => !Object.keys(now.columns ?? {}).some(n => norm(n) === norm(i)));
  }
  if (now.ignore?.length) {
    out.ignore = [...new Map([...(base.ignore ?? []), ...now.ignore].map(i => [norm(i), i])).values()];
    if (out.columns) out.columns = Object.fromEntries(Object.entries(out.columns).filter(([k]) => !now.ignore?.some(i => norm(i) === norm(k))));
  }
  if (now.rows?.length) {
    /* one rule a column and a value; "only" of a column replaces an earlier "only" of it */
    const kept = (base.rows ?? []).filter(r => !now.rows?.some(n => norm(n.column) === norm(r.column) && (n.op === 'eq' || r.op === 'eq' || norm(String(n.value)) === norm(String(r.value)))));
    out.rows = [...kept, ...now.rows];
  }
  if (out.ignore && !out.ignore.length) delete out.ignore;
  if (out.columns && !Object.keys(out.columns).length) delete out.columns;
  return out;
}

const COLUMN_WORDS: Record<ColumnSay, string> = { add: 'added up', average: 'averaged, never added', never: 'never added up', lost: 'read as time lost', money: 'read as money', volume: 'read as output' };
/** A row rule in words. */
export const ruleSaid = (r: RowRule): string => (r.op === 'ne' ? `rows where ${q(r.column)} is ${q(r.value)} left out` : `only the rows where ${q(r.column)} is ${q(r.value)}`);
/** Each thing a reading says, in words — in the order they bear on the look. */
export function readingSaid(r: Reading): string[] {
  const out: string[] = [];
  if (r.sheet) out.push(`started with ${q(r.sheet)}`);
  for (const h of r.heads ?? []) {
    if (h.row !== undefined) out.push(`the headings of ${q(h.sheet)} taken from row ${h.row}`);
    for (const n of h.names ?? []) out.push(`${/^[a-z]{1,3}$/i.test(n.column.trim()) ? `column ${n.column.trim().toUpperCase()}` : q(n.column)} of ${q(h.sheet)} called ${q(n.name)}`);
  }
  if (r.result) out.push(`${q(r.result)} taken as the result`);
  if (r.date) out.push(`${q(r.date)} taken as the date`);
  for (const [c, say] of Object.entries(r.columns ?? {})) out.push(`${q(c)} ${COLUMN_WORDS[say]}`);
  for (const c of r.ignore ?? []) out.push(`${q(c)} ignored`);
  for (const x of r.rows ?? []) out.push(ruleSaid(x));
  if (r.everyRow) out.push('every row read, the ones the workbook’s own reports leave out included');
  return out;
}

/** The row rules as the query engine's filters. */
export const ruleFilters = (r: Reading | undefined): Filter[] => (r?.rows ?? []).map(x => ({ column: x.column, op: x.op, value: x.value }));

const headingsOf = (s: SheetProfile): string[] => s.columns.filter(c => c.named && !c.colour).map(c => c.name);
/** Four in five of the headings the same — of the smaller side when the sheet keeps its name; of BOTH sides when it is renamed (`both`),
 *  since the name no longer vouches for it: a sheet holding only some of the report's headings is not the report. */
const sameHeadings = (kept: Pick<KeptReading, 'snap'>, s: SheetProfile, both = false): boolean => {
  const a = new Set(kept.snap.headings.map(norm)), b = headingsOf(s).map(norm);
  if (a.size < 3 || b.length < 3) return false;
  return b.filter(x => a.has(x)).length >= (both ? Math.max(a.size, b.length) : Math.min(a.size, b.length)) * 0.8;
};
/** THE SHEET IN THIS FILE a kept reading's sheet is: by its name; else — a report whose sheet is renamed each month, "March" then
 *  "April" (20 November, docs/CONNECTED-LUNA.md X3) — the ONE sheet whose headings are four in five the same. Two that would fit, none:
 *  never guessed between. */
export function sheetFor(kept: Pick<KeptReading, 'snap'>, p: WorkbookProfile): SheetProfile | undefined {
  const byName = p.sheets.find(x => norm(x.name) === norm(kept.snap.sheet));
  if (byName) return byName;
  const same = p.sheets.filter(s => sameHeadings(kept, s, true));
  return same.length === 1 ? same[0] : undefined;
}
/** IS THIS THE SAME REPORT a reading was said about? Its sheet here (by name, or renamed — sheetFor), and four in five of the headings
 *  the same — `p` as it stands once the heading row the reading names has been taken (the caller tries that first). */
export function fits(kept: Pick<KeptReading, 'snap'>, p: WorkbookProfile): boolean {
  const s = sheetFor(kept, p);
  return !!s && sameHeadings(kept, s, norm(s.name) !== norm(kept.snap.sheet));
}
/** A reading said about one sheet, said again for the name that sheet has in this file — every place it names the old one. */
export function renamed(r: Reading, was: string, now: string): Reading {
  if (norm(was) === norm(now)) return r;
  const to = (x: string) => (norm(x) === norm(was) ? now : x);
  return { ...r, ...(r.sheet ? { sheet: to(r.sheet) } : {}), ...(r.heads ? { heads: r.heads.map(h => ({ ...h, sheet: to(h.sheet) })) } : {}) };
}
/** The newest reading that is not forgotten, of those kept for this customer — the caller tests each for fit in this order. */
export const newestFirst = (all: readonly KeptReading[]): KeptReading[] => [...all].filter(k => hasReading(k.reading)).sort((x, y) => y.reading.at - x.reading.at);

/** A READING HELD TO THE FILE IN HAND: every column is named as this file spells it; the parts that name a column or a sheet the
 *  workbook no longer has are taken out, and said. */
export function heldTo(r: Reading, p: WorkbookProfile, lead: string): { reading: Reading; dropped: string[] } {
  const s = p.sheets.find(x => norm(x.name) === norm(r.sheet ?? lead)) ?? p.sheets.find(x => norm(x.name) === norm(lead));
  const col = (name: string): string | undefined => (s?.columns.find(c => c.name === name) ?? s?.columns.find(c => norm(c.name) === norm(name)) ?? s?.columns.find(c => c.letter === name.trim().toUpperCase()))?.name;
  const out: Reading = { ...r }, dropped: string[] = [];
  if (r.sheet) { const there = p.sheets.find(x => norm(x.name) === norm(r.sheet as string)); if (there) out.sheet = there.name; else { delete out.sheet; dropped.push(`the sheet ${q(r.sheet)}`); } }
  for (const k of ['result', 'date'] as const) if (r[k]) { const c = col(r[k] as string); if (c) out[k] = c; else { dropped.push(`${q(r[k] as string)} as the ${k}`); delete out[k]; } }
  if (r.columns) {
    out.columns = {};
    for (const [name, say] of Object.entries(r.columns)) { const c = col(name); if (c) out.columns[c] = say; else dropped.push(q(name)); }
    if (!Object.keys(out.columns).length) delete out.columns;
  }
  if (r.ignore) { out.ignore = r.ignore.flatMap(name => { const c = col(name); if (!c) dropped.push(q(name)); return c ? [c] : []; }); if (!out.ignore.length) delete out.ignore; }
  if (r.rows) { out.rows = r.rows.flatMap(x => { const c = col(x.column); if (!c) dropped.push(`the rule on ${q(x.column)}`); return c ? [{ ...x, column: c }] : []; }); if (!out.rows.length) delete out.rows; }
  if (out.heads && !out.heads.length) delete out.heads;
  return { reading: out, dropped };
}

/** How the look opens what it was told: "Read the way you told me (14 November, on “March.xlsx”): …". */
export function toldSaid(r: Reading, o: { dropped?: readonly string[]; notes?: readonly string[] } = {}): string | undefined {
  const said = readingSaid(r), dropped = o.dropped ?? [];
  if (!said.length && !dropped.length) return undefined;
  const when = r.from ? ` (${dayOf(r.from.at)}, on ${q(r.from.name)}${r.from.sheet ? `; its sheet ${q(r.from.sheet.was)} is ${q(r.from.sheet.now)} in this file` : ''})` : '';
  const lost = dropped.length ? ` I could not apply ${dropped.join(', ')} — ${dropped.length === 1 ? 'it is' : 'they are'} not in this file.` : '';
  return `${said.length ? `Read the way you told me${when}: ${said.join('; ')}.` : `You told me how to read this report${when}, but none of it fits this file.`}${lost}${(o.notes ?? []).map(n => ` ${n}`).join('')} Say “forget what I told you” to have it read as I would by myself.`;
}
