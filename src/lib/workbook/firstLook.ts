/* THE FIRST LOOK AT A WORKBOOK — WORKED IN CODE THE MOMENT IT IS ATTACHED, NO AI ASKED (12 November; docs/WORKBOOKS.md; the cost plan's
 * step 0 — Rowland: "if we can nail the excel analysis thats a significant achievement"; "how much can we take into code").
 *
 * On 10 November the first question asked of a real workbook was "understand the entire work book", and the answer cost three rounds of
 * the AI service to say what the workbook's own shape already holds. This reads that shape in code, from the profile the reader made and
 * a handful of sums over every row (the same query engine every later answer uses):
 *   THE TABLES    the sheets that are rows of data — a date or something to split by, and a figure; the one with the most rows leads,
 *                 the others (a downtime log, a labour log beside the production rows) each get a line of their own;
 *   THE ROLES     the date, the figures (a RESULT — money that runs below and above zero — then time lost, money, volume; told by their
 *                 own headings and the range of their values, never by guessing a meaning), the flags (a column of 0 and 1), and what it
 *                 can be split by (the text columns that repeat). A code that another sheet lists once with its description (found by the
 *                 reader from the values) is said by that description;
 *   THE PERIOD    month by month, with how many days each month holds — a month with far fewer days than the others is said to be
 *                 PART of a month and compared a day, never as a whole month;
 *   WHERE         the headline figure by each thing it can be split by — only a split that stands out is said;
 *   WHAT MOVED    the last two whole months, where the change sits (lib/data/change — the same sums explain_change uses);
 *   THE GAPS      what would mislead: a filter hiding rows; a figure sitting on rows where the line or product is not said ("0", blank);
 *                 time lost with no reason, or with every reason "Unclassified"; formulas with no saved value; error cells on the
 *                 workbook's own summary sheets; a name written two ways; a sheet not read.
 * Everything said is a sum over rows, with the column's own heading; which column is "the headline" is a CHOICE made from the headings
 * and said as one, with the other candidates named ("I have taken … — say if it is another"). Nothing is interpreted: why a line loses
 * money is Luna's work and the person's. Pure but for `run`, the query runner it is handed. */
import type { ColumnProfile, SheetProfile, WorkbookProfile } from './read';
import type { Group, Lookup, Query, QueryResult } from './query';
import { changeOf, type Change } from '../data/change';

export type Run = (q: Query) => Promise<QueryResult>;
export type MeasureKind = 'outcome' | 'money' | 'lost' | 'volume' | 'other';
/** Something a figure can be split by: the column, and — when another sheet names its codes — the lookup that says them. */
export interface Dim { column: string; said: string; lookup?: Lookup }
export interface Roles {
  sheet: string; rows: number;
  date?: string;
  measures: { column: string; kind: MeasureKind }[];
  flags: string[];
  dims: Dim[];
  /** The figure taken as the one that matters; `also` the other results it could have been. */
  headline?: { column: string; kind: MeasureKind };
  also: string[];
  /** A column of reasons beside a column of time lost — "Downtime reason" beside "Unplanned DT (mins)". */
  reason?: { dim: string; lost: string };
}
export interface Month { key: string; label: string; days: number; part: boolean; /** The first and last day of the month that has rows. */ from?: number; to?: number; values: (number | null)[] }
export interface Candidate { column: string; total: number; rows: number; /** A flag it is only filled under — "only where Wrong line flag is 1". */ onlyWhere?: string }
export interface LookOptions { /** What the person has already said the business manages by (the notebook of meanings) — a column named in it leads. */ told?: readonly string[] }
export interface Split { dim: string; worst: { key: string; value: number }[]; best?: { key: string; value: number }; groups: number; notSaid?: number }
export interface FirstLook {
  roles: Roles;
  months: Month[];
  splits: Split[];
  moved?: { before: Month; after: Month; change: Change };
  gaps: string[];
  /** Every column that reads as a result, with its total and the rows it is filled on — said when there is more than one. */
  candidates: Candidate[];
  /** How the lead figure was chosen. */
  chosen: 'only' | 'told' | 'most rows';
  /** The whole look in words — the paragraphs of Luna's turn, in order. */
  says: string[];
  /** Questions worth asking next, in the columns' own words. */
  suggestions: string[];
}

/* A result: read from the heading, best first — a profit and loss, a financial variance, any variance, a saving. */
const OUTCOMES = [/p\s*&\s*l|profit|\bfav\b|surplus|deficit|contribution|margin/i, /fin\w*\s*var|financial/i, /var(iance)?\b|\bvar\s*£|var£/i, /sav(ed|ing)|gain|loss\b/i];
const MONEY = /£|\bcost\b|\bvalue\b|spend|price|sales|revenue|wage|\bgbp\b/i;
const LOST = /down\s*time|\bdt\b|lost|stoppage|\bstops?\b|delay|waiting|idle/i;
const TIME = /\bmin(ute)?s?\b|\bmins\b/i;
const VOLUME = /tonnes?|\bkg\b|kilos?|units?|packs?|cases?|trays?|pallets?|output|produced|packed|quantity|\bqty\b/i;
const RATE = /%|percent|\brate\b|efficiency|ratio|\bavg\b|average|\bper\b|ppm\b|\b(cpp|cpt|cpk|kgpm|upm|oee|pplh|ppmh|target|std|standard)\b|\/\s*(hr|hour|min|pack|kg|unit|tonne|head)/i;
/** A heading the reader had to number because the sheet has it twice — "TONNES (2)": the copy is never a figure of its own. */
const COPY = /\(\d+\)\s*$/;
const ID = /\b(id|code|ref|no\.?|number|week|year|month|day|hour|period|quarter)\b/i;
const PERIOD = /week|month|year|period|quarter|\bdate\b|\bday\b/i;
const REASON = /reason|cause|why|category|fault|type/i;
/** A value that says nothing was said: a zero where a name should be, a dash, "unclassified". */
const NOT_SAID = /^(\(blank\)|0|-+|n\/?a|none|null|unknown|unclassified|unassigned|not\s+(set|known|given|said)|tbc|tba|\?+)$/i;

const outcomeRank = (name: string): number => OUTCOMES.findIndex(r => r.test(name));
const signed = (c: ColumnProfile): boolean => (c.min ?? 0) < 0 && (c.max ?? 0) > 0;
function kindOf(c: ColumnProfile, sheet: string): MeasureKind {
  const n = c.name;
  if (outcomeRank(n) >= 0 && (signed(c) || outcomeRank(n) <= 1)) return 'outcome';
  if (MONEY.test(n) && signed(c)) return 'outcome';
  if (LOST.test(n) || (TIME.test(n) && LOST.test(sheet))) return 'lost';
  if (MONEY.test(n)) return 'money';
  if (VOLUME.test(n)) return 'volume';
  return 'other';
}
const filled = (c: ColumnProfile): number => c.counts.number + c.counts.text + c.counts.date + c.counts.bool;
const isFlag = (c: ColumnProfile): boolean => c.type === 'number' && (/flag/i.test(c.name) || (c.min === 0 && c.max === 1));
const isMeasure = (c: ColumnProfile, rows: number, sheet: string): boolean => c.named && !c.hidden && (c.type === 'number' || c.type === 'mixed') && !isFlag(c) && !COPY.test(c.name) && c.counts.number >= Math.max(3, rows * 0.05) && !RATE.test(c.name) && !(ID.test(c.name) && kindOf(c, sheet) === 'other');
const isDim = (c: ColumnProfile, rows: number): boolean => c.named && !c.hidden && c.type === 'text' && !c.unique && !PERIOD.test(c.name) && (c.distinct ?? 0) >= 2 && (c.distinct ?? 0) <= Math.max(12, Math.min(400, rows / 4)) && filled(c) >= rows * 0.02;

/** The description a code is said by: another sheet that lists each code once, and a column there that names it. */
function lookupFor(p: WorkbookProfile, sheet: SheetProfile, col: ColumnProfile): { said: string; lookup: Lookup } | undefined {
  /* only a CODE is said by its description: values with no space and a run of digits ("S11081") — a name ("LINE 2A") says itself */
  const tops = (col.top ?? []).map(([t]) => t).filter(t => !NOT_SAID.test(t.trim()));
  if (!tops.length || !tops.every(t => /^\S*\d{3,}\S*$/.test(t.trim()))) return undefined;
  for (const l of p.links) {
    const mine = l.a === sheet.name ? { other: l.b, on: l.bColumn ?? l.column, match: l.column } : l.b === sheet.name ? { other: l.a, on: l.column, match: l.bColumn ?? l.column } : undefined;
    if (!mine || mine.match !== col.name || l.key !== mine.other || l.overlap < 0.8) continue;
    const master = p.sheets.find(s => s.name === mine.other);
    if (!master?.columns.find(c => c.name === mine.on)?.unique) continue;
    const names = master?.columns.filter(c => c.named && c.type === 'text' && c.name !== mine.on && (c.distinct ?? 0) >= (master.rows * 0.8)) ?? [];
    const take = names.find(c => /desc|name|title|product/i.test(c.name)) ?? names[0];
    if (master && take) return { said: take.name, lookup: { as: `${take.name} (${col.name})`, sheet: master.name, match: col.name, on: mine.on, take: take.name } };
  }
  return undefined;
}

function rolesOfSheet(p: WorkbookProfile, s: SheetProfile): Roles | undefined {
  if (!s.read || s.state !== 'visible' || s.rows < 8) return undefined;
  /* a sheet of rows, not a dashboard: nearly every column under a heading, and few of its CELLS in error. (Errors were once held against
     the number of ROWS — and a table of 87,000 rows with a few cost-per-pack columns dividing by zero was thrown out whole, 12 November.) */
  const named = s.columns.filter(c => c.named).length;
  if (named < s.columns.length * 0.75 || s.errors > s.rows * Math.max(1, named) * 0.2) return undefined;
  const dates = s.columns.filter(c => c.named && c.type === 'date' && c.counts.date >= s.rows * 0.5).sort((a, b) => b.counts.date - a.counts.date);
  const order: MeasureKind[] = ['outcome', 'lost', 'money', 'volume', 'other'];
  const ms = s.columns.filter(c => isMeasure(c, s.rows, s.name)).map(c => ({ column: c.name, kind: kindOf(c, s.name), rank: outcomeRank(c.name) }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.rank < 0 ? 9 : a.rank) - (b.rank < 0 ? 9 : b.rank));
  const measures = ms.map(({ column, kind }) => ({ column, kind }));
  const dims: Dim[] = s.columns.filter(c => isDim(c, s.rows)).sort((a, b) => (a.distinct ?? 0) - (b.distinct ?? 0)).map(c => { const l = lookupFor(p, s, c); return l ? { column: c.name, said: l.said, lookup: l.lookup } : { column: c.name, said: c.name }; });
  if (!measures.length || (!dims.length && !dates.length)) return undefined;
  const headline = measures.find(m => m.kind === 'outcome') ?? measures.find(m => m.kind === 'lost') ?? measures.find(m => m.kind === 'money') ?? measures[0];
  const lost = measures.find(m => m.kind === 'lost');
  const rcol = lost ? s.columns.find(c => c.named && c.type === 'text' && REASON.test(c.name)) : undefined;
  return { sheet: s.name, rows: s.rows, ...(dates[0] ? { date: dates[0].name } : {}), measures, flags: s.columns.filter(c => c.named && isFlag(c) && (c.max ?? 0) > 0).map(c => c.name), dims, headline,
    also: measures.filter(m => m.kind === headline.kind && m.column !== headline.column && headline.kind === 'outcome').map(m => m.column), ...(lost && rcol ? { reason: { dim: rcol.name, lost: lost.column } } : {}) };
}

/** Every sheet that is rows of data, the one to lead with first. */
export function tablesOf(p: WorkbookProfile): Roles[] {
  return p.sheets.map(s => rolesOfSheet(p, s)).filter((r): r is Roles => !!r)
    .sort((a, b) => Number(!!b.date && b.dims.length > 0) - Number(!!a.date && a.dims.length > 0) || b.rows - a.rows);
}
/** The sheet worth analysing and what its columns are — or nothing, when no sheet has a figure and something to read it by. */
export const rolesOf = (p: WorkbookProfile): Roles | undefined => tablesOf(p)[0];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = (key: string): string => { const m = /^(\d{4})-(\d{2})/.exec(key); return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : key; };
const mon = (m: Month): string => m.label.split(' ')[0];
const isMoney = (col: string, kind: MeasureKind): boolean => kind === 'money' || kind === 'outcome' || /£|cost/i.test(col);
/** A figure as it is said: money to the pound, everything else to a sensible place. */
export function figure(v: number, col: string, kind: MeasureKind): string {
  const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const n = Math.abs(r).toLocaleString('en-GB');
  return isMoney(col, kind) ? `${r < 0 ? '−' : ''}£${n}` : `${r < 0 ? '−' : ''}${n}`;
}
const num = (v: number | string | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const q = (x: string) => `“${x}”`;
const by = (d: Dim): Pick<Query, 'groupBy' | 'lookups'> => (d.lookup ? { lookups: [d.lookup], groupBy: [d.lookup.as] } : { groupBy: [d.column] });
const dimSaid = (d: Dim): string => (d.lookup ? `${q(d.said)} (from ${q(d.lookup.sheet)}, by ${q(d.column)})` : q(d.column));

/** The groups of one split: the named ones worst first, and what sits on the rows where nothing is said. */
async function splitOf(run: Run, sheet: string, d: Dim, column: string): Promise<{ named: { key: string; value: number }[]; notSaid: number; groups: number }> {
  const r = await run({ sheet, ...by(d), measures: [{ op: 'sum', column }], order: { by: 0, desc: false }, limit: 200 });
  const rows = r.groups.map(g => ({ key: g.key[0], value: num(g.values[0]) })).filter((x): x is { key: string; value: number } => x.value !== null);
  const named = rows.filter(x => !NOT_SAID.test(x.key.trim()));
  return { named, notSaid: rows.filter(x => NOT_SAID.test(x.key.trim())).reduce((t, x) => t + x.value, 0), groups: named.length };
}

/** The reasons of a table of time lost: how much has none — blank, or a word that says nothing ("Unclassified"). */
async function reasonGap(run: Run, r: Roles): Promise<string | undefined> {
  if (!r.reason) return undefined;
  const g = await run({ sheet: r.sheet, groupBy: [r.reason.dim], filters: [{ column: r.reason.lost, op: 'gt', value: 0 }], measures: [{ op: 'sum', column: r.reason.lost }, { op: 'count' }], limit: 200 });
  const all = num(g.totals[0]);
  const none = g.groups.filter(x => NOT_SAID.test(x.key[0].trim()));
  const blank = none.reduce((t, x) => t + (num(x.values[0]) ?? 0), 0), rows = none.reduce((t, x) => t + x.rows, 0);
  if (!all || !blank) return undefined;
  const words = [...new Set(none.map(x => (x.key[0] === '(blank)' ? 'blank' : q(x.key[0]))))].join(' or ');
  if (blank >= all * 0.999) return `None of the ${figure(all, r.reason.lost, 'lost')} of ${q(r.reason.lost)} on ${q(r.sheet)} has a reason: every row’s ${q(r.reason.dim)} is ${words}. It cannot be ranked by cause until the reasons are recorded.`;
  return `${figure(blank, r.reason.lost, 'lost')} of ${q(r.reason.lost)} on ${q(r.sheet)} (${Math.round((blank / all) * 100)}% of ${figure(all, r.reason.lost, 'lost')}) has no reason — ${q(r.reason.dim)} is ${words} on ${plural(rows, 'row')}. It cannot be put against a cause.`;
}

/** A table beside the main one, in a line: its rows, its period, its totals and where the first of them sits. */
async function sideSaid(run: Run, r: Roles): Promise<string> {
  const ms = r.measures.filter(m => m.kind !== 'other').slice(0, 2);
  const shown = ms.length ? ms : r.measures.slice(0, 1);
  const t = await run({ sheet: r.sheet, measures: shown.map(m => ({ op: 'sum' as const, column: m.column })) });
  const totals = shown.map((m, i) => `${q(m.column)} ${figure(num(t.totals[i]) ?? 0, m.column, m.kind)}`).join(', ');
  let most = '';
  const d = r.dims[0];
  if (d && shown[0]) {
    const sp = await splitOf(run, r.sheet, d, shown[0].column);
    const top = [...sp.named].sort((a, b) => b.value - a.value).slice(0, 3);
    if (top.length >= 2) most = ` Most by ${dimSaid(d)}: ${top.map(x => `${x.key} ${figure(x.value, shown[0].column, shown[0].kind)}`).join(', ')}.`;
  }
  return `${q(r.sheet)} — ${plural(r.rows, 'row')}: ${totals}.${most}`;
}

/** What is said when a workbook was read and no first look can be made — never silence: the biggest sheets, and the question. */
export function noLook(p: WorkbookProfile, why?: string): string {
  const big = [...p.sheets].filter(x => x.read && x.rows > 0).sort((a, b) => b.rows - a.rows).slice(0, 4);
  const lead = why ? `I read ${q(p.name)} but the first look could not be worked (${why}).` : `I read ${q(p.name)}, but I cannot tell by myself which sheet holds the figures to lead with — no sheet has both a figure under a heading and a date or a name to split it by.`;
  return `${lead}${big.length ? ` Its biggest sheets are ${big.map(x => `${q(x.name)} (${plural(x.rows, 'row')})`).join(', ')}.` : ''} Tell me which sheet to start with and which column is the result, and I will read it from there. Nothing was sent to the AI service.`;
}

/** A table that is another one again: the same headings, give or take a few — a working copy kept beside the data. */
function copyOf(p: WorkbookProfile, lead: Roles, t: Roles): string[] | undefined {
  const cols = (name: string) => (p.sheets.find(x => x.name === name)?.columns ?? []).filter(c => c.named).map(c => c.name.trim().toLowerCase());
  const a = new Set(cols(lead.sheet)), b = cols(t.sheet);
  if (b.length < 4 || b.filter(x => a.has(x)).length < Math.min(a.size, b.length) * 0.8) return undefined;
  return (p.sheets.find(x => x.name === t.sheet)?.columns ?? []).filter(c => c.named && !a.has(c.name.trim().toLowerCase())).map(c => c.name);
}

const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const dayOf = (v: number | string | null | undefined): number | undefined => { const m = typeof v === 'string' ? /^\d{4}-\d{2}-(\d{2})/.exec(v) : null; return m ? Number(m[1]) : undefined; };
const daysIn = (key: string): number => { const m = /^(\d{4})-(\d{2})/.exec(key); return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate() : 31; };
/** One section that fails leaves the rest of the look standing. */
async function soft(what: string, fn: () => Promise<void>): Promise<void> { try { await fn(); } catch (e) { console.warn(`the first look: ${what} could not be worked`, e); } }

/** The first look, or nothing when the workbook has no table a figure can be read from (the screen then says `noLook`). */
export async function firstLook(p: WorkbookProfile, run: Run, opts: LookOptions = {}): Promise<FirstLook | undefined> {
  const tables = tablesOf(p);
  const roles = tables[0];
  if (!roles?.headline) return undefined;
  const s = p.sheets.find(x => x.name === roles.sheet) as SheetProfile;
  const says: string[] = [], gaps: string[] = [];

  /* ---- which figure leads. Several columns can read as a result ("FinVar £", "OpVar £", "Direct P&L £"): each is summed and the rows
     it is filled on counted. A column filled on a fraction of the rows — only where a flag is set — is a special case, not the figure
     the business is run by; the lead is what the person has already said, else the best-named of those filled on most rows. It is said
     as a choice, with every candidate and its total, and the question asked. ---- */
  const cands: Candidate[] = [];
  const outcome = roles.measures.filter(m => m.kind === 'outcome').slice(0, 6);
  if (outcome.length > 1) for (const m of outcome) {
    const r = await run({ sheet: s.name, filters: [{ column: m.column, op: 'ne', value: 0 }], measures: [{ op: 'sum', column: m.column }] });
    cands.push({ column: m.column, total: num(r.totals[0]) ?? 0, rows: r.rowsMatched });
  }
  const most = Math.max(0, ...cands.map(c => c.rows));
  const dense = cands.filter(c => c.rows >= most * 0.5);
  for (const c of cands.filter(x => x.rows > 0 && x.rows < most * 0.9)) for (const f of roles.flags.slice(0, 3)) {
    const r = await run({ sheet: s.name, filters: [{ column: f, op: 'eq', value: 1 }, { column: c.column, op: 'ne', value: 0 }], measures: [{ op: 'count' }] });
    if (r.rowsMatched >= c.rows * 0.98) { c.onlyWhere = f; break; }
  }
  const told = cands.find(c => (opts.told ?? []).some(t => t.toLowerCase().includes(c.column.trim().toLowerCase())));
  /* a column filled only under a flag is never the lead by itself, however many rows the flag marks */
  const lead = told ?? dense.find(c => !c.onlyWhere) ?? dense[0];
  const chosen: FirstLook['chosen'] = !cands.length ? 'only' : told ? 'told' : 'most rows';
  if (lead && lead.column !== roles.headline.column) {
    roles.headline = { column: lead.column, kind: 'outcome' };
    roles.measures = [roles.measures.find(m => m.column === lead.column) as Roles['measures'][number], ...roles.measures.filter(m => m.column !== lead.column)];
  }
  roles.also = cands.filter(c => c.column !== roles.headline?.column).map(c => c.column);
  const H = roles.headline, shown = roles.measures.slice(0, 4);

  /* ---- what it is: the sheets that are rows of data told from the reports, lists and grids around them ---- */
  const beside = tables.slice(1).filter(t => t.rows >= 20 && t.measures.some(m => m.kind !== 'other'));
  const copies = beside.map(t => ({ t, extra: copyOf(p, roles, t) })).filter((x): x is { t: Roles; extra: string[] } => !!x.extra);
  const side = beside.filter(t => !!t.date && t.dims.length > 0 && !copies.some(c => c.t === t)).slice(0, 3);
  const data = [s.name, ...side.map(t => t.sheet), ...copies.map(c => c.t.sheet)];
  const others = p.sheets.filter(x => !data.includes(x.name));
  says.push(`${q(p.name)} has ${plural(p.sheets.length, 'sheet')}${p.sheets.length > 3 ? ` — ${data.length === 1 ? 'one holds' : `${data.length} hold`} rows of data, the other ${others.length} read as reports, lists or grids` : ''}. The one worth analysing is ${q(s.name)} — ${plural(s.rows, 'row')}${roles.date ? `, each dated (${q(roles.date)})` : ''}, with ${shown.map(m => q(m.column)).join(', ')}${roles.measures.length > shown.length ? ` and ${plural(roles.measures.length - shown.length, 'more figure')}` : ''}${roles.dims.length ? `, and it can be split by ${roles.dims.slice(0, 5).map(dimSaid).join(', ')}` : ''}.${side.length ? ` Beside it: ${side.map(t => `${t.sheet} (${t.rows.toLocaleString('en-GB')})`).join(', ')}.` : ''}${others.length ? ` The rest: ${others.slice(0, 6).map(x => x.name).join(', ')}${others.length > 6 ? ` and ${others.length - 6} more` : ''}.` : ''}`);
  for (const c of copies.slice(0, 2)) says.push(`${q(c.t.sheet)} (${plural(c.t.rows, 'row')}) has the same headings as ${q(s.name)}${c.extra.length ? ` with ${c.extra.slice(0, 4).map(q).join(', ')} added` : ''} — it reads as a working copy of the same rows, so it is not added to them. Say if it is the one to use.`);
  if (cands.length > 1) {
    const one = (c: Candidate) => `${q(c.column)} ${figure(c.total, c.column, 'outcome')} (filled on ${plural(c.rows, 'row')}${c.onlyWhere ? ` — only where ${q(c.onlyWhere)} is 1` : ''})`;
    says.push(`${cands.length} columns read as a result: ${cands.map(one).join('; ')}. I have led with ${q(H.column)} — ${chosen === 'told' ? 'your notebook says that is the one' : 'it is filled on the most rows'}.${chosen === 'told' ? '' : ' Which one does the business manage by? Tell me and I will read it again by that one, and remember it.'}`);
  } else says.push(`I have taken ${q(H.column)} as the figure that matters${H.kind === 'outcome' ? ' — it reads as a result, where below zero is a loss' : ''}. Say if it is another.`);

  /* ---- the period, month by month ---- */
  let months: Month[] = [];
  const hi = shown.findIndex(m => m.column === H.column);
  if (roles.date) {
    const r = await run({ sheet: s.name, time: { column: roles.date, by: 'month' }, measures: [{ op: 'distinct', column: roles.date }, { op: 'min', column: roles.date }, { op: 'max', column: roles.date }, ...shown.map(m => ({ op: 'sum' as const, column: m.column }))], order: { by: 'group' }, limit: 200 });
    const raw = r.groups.map(g => ({ key: g.key[g.key.length - 1], days: num(g.values[0]) ?? 0, from: dayOf(g.values[1]), to: dayOf(g.values[2]), values: g.values.slice(3).map(num) }));
    const typical = median(raw.map(x => x.days));
    /* PART of a month: the first month when its rows start after the 3rd, the last when they stop more than three days short of its
       end — read from the dates themselves (a November that starts on the 7th holds 24 days and is still not a whole month); and, as
       before, an end month with far fewer days than the others */
    months = raw.map((x, i) => {
      const first = i === 0, last = i === raw.length - 1 && raw.length > 1;
      const late = first && (x.from ?? 1) > 3, early = (last || (first && raw.length === 1)) && (x.to ?? 31) < daysIn(x.key) - 3;
      return { key: x.key, label: monthLabel(x.key), days: x.days, part: late || early || ((first || last) && x.days < typical * 0.75), ...(x.from ? { from: x.from } : {}), ...(x.to ? { to: x.to } : {}), values: x.values };
    });
    const partSaid = (m: Month, i: number): string => `part — ${i === 0 && (m.from ?? 1) > 3 ? `from the ${ordinal(m.from as number)}, ` : i > 0 && m.to && m.to < daysIn(m.key) - 3 ? `to the ${ordinal(m.to)}, ` : ''}${plural(m.days, 'day')}`;
    if (months.length) {
      says.push(`${months[0].label} to ${months[months.length - 1].label}. ${months.map((m, i) => `${mon(m)}${m.part ? ` (${partSaid(m, i)})` : ''}: ${m.values[hi] === null ? 'nothing recorded' : figure(m.values[hi] as number, H.column, H.kind)}`).join(' · ')}.`);
      const last = months[months.length - 1], whole = [...months].reverse().find(m => !m.part && m !== last);
      const lv = last.values[hi], wv = whole?.values[hi];
      if (last.part && whole && lv !== null && wv !== null && wv !== undefined && last.days > 0 && whole.days > 0)
        says.push(`${mon(last)} is only ${plural(last.days, 'day')} in, so it is compared a day: ${figure(lv / last.days, H.column, H.kind)} a day so far, against ${figure(wv / whole.days, H.column, H.kind)} a day in ${mon(whole)}.`);
    }
    gaps.push(...r.notes.filter(n => /no date/.test(n)));
  }

  /* ---- where it sits: only a split that STANDS OUT is said — one losing while the whole earns, or a spread a quarter of the total ---- */
  const lostLike = H.kind === 'lost' || H.kind === 'money';
  const all: (Split & { spread: number; d: Dim })[] = [];
  /* a small grouping that does not stand out — the shifts, the crews — is still said, in a line: "nothing stands out" is an answer */
  const even: { d: Dim; rows: { key: string; value: number }[] }[] = [];
  const meant = (d: Dim): boolean => { const c = s.columns.find(x => x.name === d.column); return !!c && c.counts.blank < s.rows * 0.3; };
  const splitDims = roles.dims.filter(d => meant(d) && (d.column !== roles.reason?.dim || H.column === roles.reason?.lost));
  for (const d of splitDims.slice(0, 6)) {
    const sp = await splitOf(run, s.name, d, H.column);
    if (Math.abs(sp.notSaid) >= 0.5) gaps.push(`${figure(sp.notSaid, H.column, H.kind)} of ${q(H.column)} sits on rows where ${q(d.column)} is not said (blank, or 0) — it is left out of the ranking by ${q(d.said)}.`);
    if (sp.named.length < 2) continue;
    const asc = [...sp.named].sort((a, b) => a.value - b.value);
    const total = Math.abs(sp.named.reduce((t, x) => t + x.value, 0)) || 1;
    const mixed = asc[0].value < 0 && asc[asc.length - 1].value > 0;
    const spread = (asc[asc.length - 1].value - asc[0].value) / total;
    if (!mixed && spread < 0.25) { if (asc.length <= 6 && !d.lookup) even.push({ d, rows: sp.named }); continue; }
    const losing = asc.filter(x => x.value < 0);
    const worst = (lostLike ? [...asc].reverse() : H.kind === 'outcome' && losing.length ? losing : asc).slice(0, 3);
    const best = (lostLike ? asc : [...asc].reverse())[0];
    all.push({ dim: d.said, d, worst, ...(best && !worst.includes(best) ? { best } : {}), groups: sp.groups, ...(sp.notSaid ? { notSaid: sp.notSaid } : {}), spread: mixed ? spread + 10 : spread });
  }
  const top = all.sort((a, b) => b.spread - a.spread).slice(0, 3);
  const splits: Split[] = top.map(({ spread: _s, d: _d, ...x }) => { void _s; void _d; return x; });
  for (const sp of top) {
    const said = (x: { key: string; value: number }) => `${x.key} ${figure(x.value, H.column, H.kind)}`;
    const head = lostLike ? 'most' : H.kind === 'outcome' && sp.worst.every(w => w.value < 0) ? 'losing most' : 'lowest';
    says.push(`By ${dimSaid(sp.d)} (${sp.groups}): ${head} ${sp.worst.map(said).join(', ')}${sp.best ? `; ${lostLike ? 'least' : H.kind === 'outcome' ? 'best' : 'highest'} ${said(sp.best)}` : ''}.`);
  }

  const small = [...all.filter(x => !top.includes(x) && x.groups <= 6).map(x => ({ d: x.d, rows: [...x.worst, ...(x.best ? [x.best] : [])] })), ...even].slice(0, 3);
  for (const e of small) says.push(`By ${dimSaid(e.d)} (${e.rows.length}): ${[...e.rows].sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })).map(x => `${x.key} ${figure(x.value, H.column, H.kind)}`).join(', ')}${even.includes(e as typeof even[number]) ? ' — none stands out' : ''}.`);

  /* ---- the flags: how many rows each marks, and what of the headline sits on them ---- */
  for (const f of roles.flags.slice(0, 3)) await soft(`the flag ${f}`, async () => {
    const r = await run({ sheet: s.name, filters: [{ column: f, op: 'eq', value: 1 }], measures: [{ op: 'sum', column: H.column }] });
    if (r.rowsMatched && Math.abs(num(r.totals[0]) ?? 0) >= 0.5) says.push(`${q(f)} marks ${plural(r.rowsMatched, 'row')} of ${s.rows.toLocaleString('en-GB')} (${Math.max(1, Math.round((r.rowsMatched / s.rows) * 100))}%), carrying ${figure(num(r.totals[0]) ?? 0, H.column, H.kind)} of ${q(H.column)}.`);
  });

  /* ---- what moved between the last two whole months ---- */
  let moved: FirstLook['moved'];
  const whole = months.filter(m => !m.part);
  if (roles.date && whole.length >= 2 && splitDims.length) await soft('what moved', async () => {
    const date = roles.date as string;
    const before = whole[whole.length - 2], after = whole[whole.length - 1];
    const bv = before.values[hi], av = after.values[hi];
    if (bv !== null && av !== null) {
      const fields: { field: string; before: Group[]; after: Group[] }[] = [];
      for (const d of splitDims.slice(0, 4)) {
        const r = await run({ sheet: s.name, ...by(d), time: { column: date, by: 'month' }, filters: [{ column: date, op: 'notblank' }], measures: [{ op: 'sum', column: H.column }], limit: 200, order: { by: 'group' } });
        const of = (key: string): Group[] => r.groups.filter(g => g.key[g.key.length - 1] === key && !NOT_SAID.test(g.key[0].trim())).map(g => ({ ...g, key: g.key.slice(0, -1) }));
        fields.push({ field: d.said, before: of(before.key), after: of(after.key) });
      }
      const change = changeOf({ before: bv, after: av }, fields);
      moved = { before, after, change };
      const m1 = change.best?.movers[0];
      if (change.change !== 0 && m1)
        says.push(`${mon(before)} to ${mon(after)}, ${q(H.column)} moved by ${figure(change.change, H.column, H.kind)} (${figure(bv, H.column, H.kind)} to ${figure(av, H.column, H.kind)}). The biggest single mover is ${m1.key} on ${q(change.best?.field ?? '')}: ${figure(m1.change, H.column, H.kind)}${m1.share === null ? '' : Math.abs(m1.share) > 1 ? ' — more than the whole change, so the rest moved the other way' : `, ${Math.round(Math.abs(m1.share) * 100)}% of the change`}.`);
    }
  });

  /* ---- the tables beside it ---- */
  for (const t of side) await soft(`the table ${t.sheet}`, async () => { says.push(await sideSaid(run, t)); });

  /* ---- the gaps: what would mislead ---- */
  if (s.filter?.hiddenRows) gaps.unshift(`A filter is on ${q(s.name)} (${s.filter.on.join(', ') || s.filter.ref}), hiding ${s.filter.hiddenRows.toLocaleString('en-GB')} of its ${s.rows.toLocaleString('en-GB')} rows. Every figure here counts ALL rows — say if you want only what the filter shows.`);
  for (const t of [roles, ...side]) await soft('the reasons', async () => { const g = await reasonGap(run, t); if (g) gaps.push(g); });
  for (const c of s.columns.filter(x => roles.measures.some(m => m.column === x.name) && x.formulasNoValue > 0).slice(0, 3)) gaps.push(`${q(c.name)} has ${plural(c.formulasNoValue, 'formula')} with no saved value — those cells are left out; Excel’s own sums are never recalculated here.`);
  for (const c of s.columns.filter(x => roles.dims.some(d => d.column === x.name) && x.variants?.length).slice(0, 3)) gaps.push(`${q(c.name)} writes the same thing more than one way (${(c.variants ?? []).slice(0, 2).map(v => v.map(([t]) => q(t)).join(' · ')).join('; ')}) — they are counted apart until you say they are one.`);
  const broken = p.sheets.filter(x => x.read && x.errors > 0 && !tables.some(t => t.sheet === x.name)).sort((a, b) => b.errors - a.errors).slice(0, 2);
  if (broken.length) gaps.push(`${broken.map(x => `${q(x.name)} shows ${plural(x.errors, 'error cell')}`).join(' and ')} — the workbook’s own summary sheets may be wrong or out of date; the figures here come from the rows of data, not from them.`);
  for (const x of p.sheets.filter(y => !y.read).slice(0, 3)) gaps.push(`${q(x.name)} was not read${x.why ? `: ${x.why}` : ''}.`);
  if (p.status === 'partial') gaps.push('Only PART of this workbook was read — every figure is of the part read.');
  if (gaps.length) says.push(`To know before trusting any of it: ${gaps.join(' ')}`);
  says.push(`Every figure above is a sum over the rows of ${[s.name, ...side.map(t => t.sheet)].map(q).join(', ')}, worked in the app — no AI was asked. What it MEANS is the next question.`);

  const d0 = top[0]?.d ?? splitDims[0], d1 = top[1]?.d ?? splitDims.find(d => d !== d0);
  const rt = [roles, ...side].find(t => t.reason);
  const suggestions = [
    moved && moved.change.best ? `Why did ${q(H.column)} move from ${mon(moved.before)} to ${mon(moved.after)}?` : '',
    d0 ? `Chart ${q(H.column)} by ${q(d0.said)}` : '',
    d0 && d1 ? `Which ${q(d1.said)} on which ${q(d0.said)} is worst for ${q(H.column)}?` : '',
    rt?.reason ? `Rank ${q(rt.reason.lost)} by ${q(rt.reason.dim)}` : '',
  ].filter(Boolean).slice(0, 4);
  return { roles, months, splits, ...(moved ? { moved } : {}), gaps, candidates: cands, chosen, says, suggestions };
}
