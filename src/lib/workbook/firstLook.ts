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
import type { Calc, Filter, Group, Lookup, Measure, Query, QueryResult } from './query';
import { WEEKDAYS, weekKeyEnd } from './week';
import { UNIT, textDate } from './textCells';
import { checksOf, checksSheet, checkRows, type Checks, type CheckTable } from './checks';
import { changeOf, type Change } from '../data/change';
import { lastOf, sinceLast, type LookSnap } from './sinceLast';
import { ruleFilters, toldSaid, type ColumnSay, type Reading } from './reading';

export type Run = (q: Query) => Promise<QueryResult>;
/** What a column of numbers is. The first five are ADDED UP; a `reading` (a weight, a temperature) and a `rate` (a percentage) are
 *  averaged, never added; `count` is a register's figure — its rows, counted. */
export type MeasureKind = 'outcome' | 'money' | 'lost' | 'volume' | 'other' | 'reading' | 'rate' | 'count';
/** A figure of the look: its column (or the name of a sum worked row by row), what it is, and how it is brought together when it is
 *  not a sum — averaged, or its rows counted. */
export interface Figure { column: string; kind: MeasureKind; agg?: 'avg' | 'count'; calc?: Calc }
/** Something a figure can be split by: the column, and — when another sheet names its codes — the lookup that says them. */
export interface Dim { column: string; said: string; lookup?: Lookup }
export interface Roles {
  sheet: string; rows: number;
  date?: string;
  measures: Figure[];
  flags: string[];
  dims: Dim[];
  /** The figure taken as the one that matters; `also` the other results it could have been. */
  headline?: Figure;
  also: string[];
  /** Columns of numbers that are NOT added up, and why — a number that only counts the rows, a limit, a price for one. */
  notSummed?: { column: string; why: string }[];
  /** Quantities counted in more than one unit — a column says which (UoM): never added across them, said unit by unit. */
  byUnit?: { unit: string; units: string[]; columns: string[] };
  /** Columns right of a gap, filled on few rows: a small table beside this one, not part of it. */
  aside?: string[];
  /** The limits a measurement is judged against, when they are on the same rows. */
  limits?: { lower?: string; upper?: string };
  /** A register of words: its due date, and the column and words that say a row is closed. */
  register?: { due?: string; status?: string; closed?: string[] };
  /** A column of reasons beside a column of time lost — "Downtime reason" beside "Unplanned DT (mins)". */
  reason?: { dim: string; lost: string };
}
export interface Month { key: string; label: string; days: number; part: boolean; /** The first and last day of the month that has rows. */ from?: number; to?: number; values: (number | null)[] }
export interface Candidate { column: string; total: number; rows: number; /** A flag it is only filled under — "only where Wrong line flag is 1". */ onlyWhere?: string;
  /** Where the workbook's own reports use it: the formulas on other sheets that draw on the column, those sheets, and the pivots that add it up. */
  usedBy?: { formulas: number; sheets: string[]; pivots: number } }
export interface LookOptions {
  /** What the person has already said the business manages by (the notebook of meanings) — a column named in it leads. */
  told?: readonly string[];
  /** The sheet to read, as the person named it — read even when it does not look like a table of data. */
  sheet?: string;
  /** The column that is the result, as the person named it (its heading, or its letter). */
  result?: string;
  /** The column that dates each row, as the person named it. */
  date?: string;
  /** Read every row, the ones the workbook's own reports leave out included (said by the person — "read every row"). */
  everyRow?: boolean;
  /** THE READING (lib/workbook/reading): what the person has said about this report — laid over what the reader found, and said. Its
   *  sheet, result, date and everyRow stand in where the four above are not given. */
  reading?: Reading;
  /** The parts of a carried reading that this file has no column or sheet for — said, never applied. */
  dropped?: readonly string[];
  /** The snapshots of workbooks read before, this customer's only (lib/workbook/sinceLast) — the same report read again is compared. */
  earlier?: readonly LookSnap[];
  /** When this look is worked (for its snapshot). */
  now?: number;
}
/** A paragraph of the look and what it is about — the pack lays them out by this. */
export type LookPart = 'what' | 'told' | 'figure' | 'basis' | 'period' | 'week' | 'since' | 'where' | 'flags' | 'moved' | 'beside' | 'checks' | 'colours' | 'gaps' | 'foot';
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
  chosen: 'only' | 'told' | 'reports' | 'most rows';
  /** The whole look in words — the paragraphs of Luna's turn, in order. */
  says: string[];
  /** The same paragraphs, each with what it is about. */
  parts: { part: LookPart; text: string }[];
  /** What it was split by, the ones that stand out first — with the lookups that say a code by its description. */
  splitDims: Dim[];
  /** The rows the workbook's own reports leave out: the rule read from their formulas, the rows kept and left out, and whether this
   *  look was read that way (it is unless the person asked for every row). */
  basis?: Basis;
  /** The workbook's own week: the latest whole one against the week before and the average of the weeks before it. */
  week?: { ends: number; latest: WeekSaid; before?: WeekSaid; average?: number; over?: number; part?: WeekSaid };
  /** The workbook's own checks, each tested against the rows. */
  checks?: Checks;
  /** The few numbers kept of this look, to compare the same report with next time. */
  snap: LookSnap;
  /** The earlier reading this one was compared with, when there was one. */
  comparedWith?: { name: string; at: number };
  /** Questions worth asking next, in the columns' own words. */
  suggestions: string[];
}

export interface WeekSaid { key: string; end: number; days: number; value: number | null; name?: string }
export interface Basis {
  /** The rule, as filters every question of the lead sheet takes, and in words ("“Recharge flag” is 0"). */
  filters: Filter[]; rule: string;
  /** How many formulas hold it, of how many that sum the sheet under any condition, and the sheets they are on. */
  formulas: number; of: number; sheets: string[];
  kept: number; out: number;
  applied: boolean;
}

/* A result: read from the heading, best first — a profit and loss, a financial variance, any variance, a saving. */
const OUTCOMES = [/p\s*&\s*l|profit|\bfav\b|surplus|deficit|contribution|margin/i, /fin\w*\s*var|financial/i, /var(iance)?\b|\bvar\s*£|var£/i, /sav(ed|ing)|gain|loss\b/i];
const MONEY = /£|\bcost\b|\bvalue\b|spend|price|sales|revenue|wage|\bgbp\b/i;
const LOST = /down\s*time|\bdt\b|lost|stoppage|\bstops?\b|delay|waiting|idle/i;
const TIME = /\bmin(ute)?s?\b|\bmins\b/i;
const VOLUME = /tonnes?|\bkg\b|kilos?|units?|packs?|cases?|trays?|pallets?|output|produced|packed|quantity|\bqty\b/i;
const RATE = /%|percent|\brate\b|efficiency|\bratio\b|\bavg\b|average|\bper\b|ppm\b|\b(cpp|cpt|cpk|kgpm|upm|oee|pplh|ppmh|target|std|standard)\b|\/\s*(hr|hour|min|pack|kg|unit|tonne|head)/i;
/** A heading the reader had to number because the sheet has it twice — "TONNES (2)": the copy is never a figure of its own. */
const COPY = /\(\d+\)\s*$/;
const ID = /\b(id|code|ref|no\.?|number|week|year|month|day|hour|period|quarter)\b/i;
const PERIOD = /week|month|year|period|quarter|\bdate\b|\bday\b/i;
const REASON = /reason|cause|why|category|fault|type/i;
/** A value that says nothing was said: a zero where a name should be, a dash, "unclassified". */
export const NOT_SAID = /^(\(blank\)|0|-+|n\/?a|none|null|unknown|unclassified|unassigned|not\s+(set|known|given|said)|tbc|tba|\?+)$/i;

/* What is never added up: a limit or a level; a price for one; and what is averaged instead: a measured property, a rate. */
/* "min" and "max" are a limit when they name one ("Min weight", "Max"), never as a unit in brackets: "Downtime (min)" is MINUTES lost
   (20 November, docs/CONNECTED-LUNA.md X4 — it was taken for a limit, and the sheet's Packs for a measurement against it) */
const REFERENCE = /\b(limits?|spec|tolerance|nominal|lsl|usl|reorder|minimum|maximum)\b|\b(min|max)\b(?!\s*\))/i;
const UNIT_PRICE = /\bunit\s+(cost|price|value|rate)\b|\b(cost|price|value)\s+(per|each|a|an)\b|\bprice\b|\beach\b|£\s*\/|\/\s*(unit|pack|kg|each|tonne)\b/i;
const PROPERTY = /\b(weight|temp(erature)?|length|width|height|thickness|diameter|ph|moisture|pressure|torque|viscosity|brix|density|fill|gauge|humidity|hardness)\b/i;
const RATEISH = /%|percent|efficiency|\boee\b|availability|performance|utili[sz]ation|\byield\b|\bratio\b|\brate\b/i;
const UNIT_COLUMN = /^(uom|u\/m|u\.o\.m\.?|units?|unit of measure(ment)?|measure(d in)?)$/i;
const QUANTITY = /\bqty\b|quantity|on hand|in stock|\bstock\b|\bunits?\b|\bpacks?\b|\bcases?\b/i;
const CLOSED = /^(closed|done|completed?|finished|resolved|shut|signed off|cancelled|canceled)$/i;
const DUE = /\bdue\b|deadline|target date|by when|required by|expir(y|es)|complete by/i;
const outcomeRank = (name: string): number => OUTCOMES.findIndex(r => r.test(name));
const signed = (c: ColumnProfile): boolean => (c.min ?? 0) < 0 && (c.max ?? 0) > 0;
function kindOf(c: ColumnProfile, sheet: string): MeasureKind {
  const n = c.name;
  if (outcomeRank(n) >= 0 && (signed(c) || outcomeRank(n) <= 1)) return 'outcome';
  if (MONEY.test(n) && signed(c)) return 'outcome';
  if (LOST.test(n) || (TIME.test(n) && LOST.test(sheet)) || c.duration) return 'lost';
  if (MONEY.test(n)) return 'money';
  if (VOLUME.test(n)) return 'volume';
  return 'other';
}
const filled = (c: ColumnProfile): number => c.counts.number + c.counts.text + c.counts.date + c.counts.bool;
const isFlag = (c: ColumnProfile): boolean => c.type === 'number' && (/flag/i.test(c.name) || (c.min === 0 && c.max === 1));
/** A column of numbers a figure could be read from — whatever it turns out to be. */
const isNumeric = (c: ColumnProfile, rows: number): boolean => c.named && !c.hidden && !c.colour && (c.type === 'number' || c.type === 'mixed') && !isFlag(c) && !COPY.test(c.name) && c.counts.number >= Math.max(Math.min(3, rows), rows * 0.05);
/** The same one or two values down twenty rows or more: a level, not a figure. */
const isConstant = (c: ColumnProfile): boolean => c.few !== undefined && c.few <= 2 && c.counts.number >= 20;
const isReference = (c: ColumnProfile): boolean => (REFERENCE.test(c.name) && !LOST.test(c.name) && !c.duration) || isConstant(c);
const isRate = (c: ColumnProfile): boolean => !!c.percent || RATEISH.test(c.name);
/** A measurement: values close round one level (spread under a quarter of the average), beside limits or under a heading that names a property. */
const isReading = (c: ColumnProfile, limits: boolean): boolean => c.mean !== undefined && c.sd !== undefined && c.mean !== 0 && c.counts.number >= 8 && c.sd / Math.abs(c.mean) < 0.25 && !c.duration
  && (limits || (PROPERTY.test(c.name) && (!VOLUME.test(c.name) || c.sd / Math.abs(c.mean) < 0.1)));
const isMeasure = (c: ColumnProfile, rows: number, sheet: string): boolean => isNumeric(c, rows) && !c.seq && !isReference(c) && !UNIT_PRICE.test(c.name) && !c.percent && !RATE.test(c.name) && !(ID.test(c.name) && kindOf(c, sheet) === 'other');
const isDim = (c: ColumnProfile, rows: number, label = false): boolean => c.named && !c.hidden && c.type === 'text' && (!c.unique || label) && !PERIOD.test(c.name) && (c.distinct ?? 0) >= 2 && (c.distinct ?? 0) <= Math.max(12, Math.min(400, rows / 4)) && filled(c) >= rows * 0.02;

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

/** A figure as a question's measure: its rows counted, its values averaged, or added up. */
export const measureOf = (f: Figure): Measure => (f.agg === 'count' ? { op: 'count' } : { op: f.agg ?? 'sum', column: f.column });
/** A question asked AS THE FIGURE IS BROUGHT TOGETHER: where the look's figure is an average or a count, a sum of it is asked as that;
 *  and a figure worked row by row (a quantity × a price) is made first wherever the question names it. */
export function asFigure(h: Figure, calcs: readonly Calc[], qq: Query): Query {
  const measures = qq.measures.map(m => (m.op === 'sum' && m.column === h.column && h.agg ? measureOf(h) : m));
  const text = JSON.stringify(qq);
  const need = calcs.filter(c => text.includes(JSON.stringify(c.as)) && !(qq.calcs ?? []).some(x => x.as === c.as));
  return { ...qq, measures, ...(need.length ? { calcs: [...(qq.calcs ?? []), ...need] } : {}) };
}

function rolesOfSheet(p: WorkbookProfile, s: SheetProfile, force = false, small = false): Roles | undefined {
  /* a sheet read through a table made from it, or a form, is not a table of its own; a table made from sheets, or one of several on a
     sheet, may be small */
  if (!s.read || s.readAs || s.form) return undefined;
  const part = !!s.derived || !!s.partOf || p.sheets.some(x => x.partOf === s.name);
  if (!force && (s.state !== 'visible' || s.rows < (part || small ? 2 : 8))) return undefined;
  /* a sheet of rows, not a dashboard: nearly every column under a heading, and few of its CELLS in error. (Errors were once held against
     the number of ROWS — and a table of 87,000 rows with a few cost-per-pack columns dividing by zero was thrown out whole, 12 November.) */
  const named = s.columns.filter(c => c.named).length;
  if (!force && (named < s.columns.length * 0.75 || s.errors > s.rows * Math.max(1, named) * 0.2)) return undefined;
  /* A REPORT, NOT DATA (14 November, found on a real workbook): a small sheet whose own formulas add up another sheet — three or more,
     and half its rows or more — is built on that sheet's rows. Its figures are that table's, summed; read beside it they would be
     counted twice, so it is never a table of its own unless the person points at it. */
  const sums = (s.sumsFrom ?? []).reduce((t, x) => Math.max(t, x.formulas), 0);
  if (!force && s.rows <= 500 && sums >= Math.max(3, s.rows * 0.5)) return undefined;
  const dates = s.columns.filter(c => c.named && c.type === 'date' && c.counts.date >= s.rows * 0.5).sort((a, b) => b.counts.date - a.counts.date);
  const order: MeasureKind[] = ['outcome', 'lost', 'money', 'volume', 'other'];
  /* WHAT IS ADDED UP AND WHAT IS NOT (14 November): a number that only counts the rows, a limit or a level, a price for one, a
     measurement and a rate are never added up */
  /* A SMALL TABLE BESIDE THIS ONE: columns to the right of a gap that are filled on under half the rows are not this table's */
  const laid = s.columns.filter(c => !c.colour && c.slot < 16_000).sort((a, b) => a.slot - b.slot);
  const gapAt = laid.findIndex((c, i) => i > 1 && c.slot > laid[i - 1].slot + 1);
  const aside = gapAt < 0 ? [] : laid.slice(gapAt).filter(c => filled(c) < s.rows * 0.5);
  const beside = new Set(aside.length === laid.length - Math.max(0, gapAt) ? aside : []);
  const numeric = s.columns.filter(c => isNumeric(c, s.rows) && !beside.has(c));
  const refs = numeric.filter(c => !c.seq && isReference(c));
  const lower = refs.find(c => /lower|\bmin|lsl|\blo\b/i.test(c.name)), upper = refs.find(c => /upper|\bmax|usl|\bhi\b/i.test(c.name));
  const rates = numeric.filter(c => !c.seq && !refs.includes(c) && isRate(c));
  const readings = numeric.filter(c => !c.seq && !refs.includes(c) && !rates.includes(c) && !UNIT_PRICE.test(c.name) && isReading(c, !!lower || !!upper));
  const prices = numeric.filter(c => !c.seq && !refs.includes(c) && !rates.includes(c) && UNIT_PRICE.test(c.name));
  /* of two columns that read as time lost, the minutes lead a count of stops */
  const timed = (n: string): number => (/min|hour|\bhrs?\b|duration|time/i.test(n) ? 0 : 1);
  let ms = s.columns.filter(c => isMeasure(c, s.rows, s.name) && !beside.has(c) && !readings.includes(c) && !rates.includes(c)).map(c => ({ column: c.name, kind: kindOf(c, s.name), rank: outcomeRank(c.name) }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.rank < 0 ? 9 : a.rank) - (b.rank < 0 ? 9 : b.rank) || (a.kind === 'lost' ? timed(a.column) - timed(b.column) : 0));
  /* QUANTITIES IN MIXED UNITS: a column that says what each row is counted in (named for it, or holding nothing but units), with two
     units or more — a quantity beside it is never added across them */
  const unitCol = s.columns.find(c => c.named && c.type === 'text' && !beside.has(c) && (c.distinct ?? 0) >= 2 && (c.distinct ?? 0) <= 12 && (c.top ?? []).length >= 2
    && (UNIT_COLUMN.test(c.name.trim()) || (c.top ?? []).every(([t]) => UNIT.test(t.trim()))) && (c.top ?? []).every(([t]) => t.trim().length <= 12));
  const mixed = unitCol ? ms.filter(m => m.kind === 'volume' || m.kind === 'other') : [];
  if (unitCol && mixed.length) ms = ms.filter(m => !mixed.includes(m));
  /* beside a count of stops, a column named only for time is the time those stops lost */
  if (ms.some(m => m.kind === 'lost' && timed(m.column) === 1)) ms = ms.map(m => (m.kind === 'other' && /^(mins?|minutes|hours?|hrs?|duration|time)$/i.test(m.column.trim()) ? { ...m, kind: 'lost' as MeasureKind } : m))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.rank < 0 ? 9 : a.rank) - (b.rank < 0 ? 9 : b.rank) || (a.kind === 'lost' ? timed(a.column) - timed(b.column) : 0));
  let measures: Figure[] = ms.map(({ column, kind }) => ({ column, kind }));
  /* a quantity and a price for one on the same row, and no money to add up: the two MULTIPLIED row by row are the value */
  /* — a COUNT of things (a quantity, a stock) and a price in MONEY: a weight times a standard time a pack is not a value (found on a
     real product master, 14 November) */
  const qty = ms.find(m => QUANTITY.test(m.column) && !PROPERTY.test(m.column));
  const price = prices.find(c => MONEY.test(c.name));
  if (qty && price && !ms.some(m => m.kind === 'outcome' || m.kind === 'money' || m.kind === 'lost')) {
    const as = `${qty.column} × ${price.name}`;
    measures = [{ column: as, kind: 'money', calc: { as, a: qty.column, op: '*', b: price.name } }, ...measures];
  }
  /* a sheet the person pointed at: any column of numbers under a heading will do for a figure, a rate included */
  if (force && !measures.length && !readings.length && !rates.length) measures = s.columns.filter(c => c.named && !c.hidden && (c.type === 'number' || c.type === 'mixed') && !isFlag(c) && c.counts.number >= 1).map(c => ({ column: c.name, kind: kindOf(c, s.name) }));
  /* in a small table every name is written once — the first column of names is what it is read by */
  const label = s.rows <= 50 && measures.length > 0 ? s.columns.find(c => c.named && c.type === 'text') : undefined;
  const dims: Dim[] = s.columns.filter(c => !beside.has(c) && isDim(c, s.rows, c === label)).sort((a, b) => (a.distinct ?? 0) - (b.distinct ?? 0)).map(c => { const l = lookupFor(p, s, c); return l ? { column: c.name, said: l.said, lookup: l.lookup } : { column: c.name, said: c.name }; });
  if (!dims.length && !dates.length) return undefined;
  const best = rates.find(c => /\boee\b|overall|efficiency|\byield\b/i.test(c.name)) ?? rates[rates.length - 1];
  const headline: Figure | undefined = measures.find(m => m.kind === 'outcome') ?? measures.find(m => m.kind === 'lost') ?? measures.find(m => m.kind === 'money') ?? measures[0]
    ?? (readings[0] ? { column: readings[0].name, kind: 'reading', agg: 'avg' } : best ? { column: best.name, kind: 'rate', agg: 'avg' } : dims.length ? { column: ROWS, kind: 'count', agg: 'count' } : undefined);
  if (!headline) return undefined;
  const lost = measures.find(m => m.kind === 'lost');
  const rcol = lost ? s.columns.find(c => c.named && c.type === 'text' && REASON.test(c.name)) : undefined;
  const notSummed = [...numeric.filter(c => c.seq).map(c => ({ column: c.name, why: 'it only numbers the rows' })), ...refs.map(c => ({ column: c.name, why: REFERENCE.test(c.name) ? 'a limit or a level' : 'the same value all the way down' })),
    ...prices.map(c => ({ column: c.name, why: MONEY.test(c.name) ? 'a price for one' : 'a figure for one, not a total' })), ...mixed.map(m => ({ column: m.column, why: `counted in ${(unitCol as ColumnProfile).distinct} units — added within a unit only` })), ...readings.filter(c => c.name !== headline.column).map(c => ({ column: c.name, why: 'a measurement' })), ...rates.filter(c => c.name !== headline.column).map(c => ({ column: c.name, why: 'a rate' }))];
  /* a register: the date things are due by, and the words that say a row is closed */
  const due = headline.kind === 'count' ? s.columns.find(c => c.named && c.type === 'date' && DUE.test(c.name)) : undefined;
  const status = headline.kind === 'count' ? s.columns.find(c => c.named && c.type === 'text' && (c.top ?? []).some(([t]) => CLOSED.test(t.trim()))) : undefined;
  return { sheet: s.name, rows: s.rows, ...(dates[0] ? { date: dates[0].name } : {}), measures, flags: s.columns.filter(c => c.named && isFlag(c) && (c.max ?? 0) > 0).map(c => c.name), dims, headline,
    also: measures.filter(m => m.kind === headline.kind && m.column !== headline.column && headline.kind === 'outcome').map(m => m.column), ...(lost && rcol ? { reason: { dim: rcol.name, lost: lost.column } } : {}),
    ...(notSummed.length ? { notSummed } : {}), ...(unitCol && mixed.length ? { byUnit: { unit: unitCol.name, units: (unitCol.top ?? []).map(([t]) => t), columns: mixed.map(m => m.column) } } : {}), ...(beside.size ? { aside: [...beside].map(c => c.name) } : {}), ...(headline.kind === 'reading' && (lower || upper) ? { limits: { ...(lower ? { lower: lower.name } : {}), ...(upper ? { upper: upper.name } : {}) } } : {}),
    ...(headline.kind === 'count' ? { register: { ...(due ? { due: due.name } : {}), ...(status ? { status: status.name, closed: (status.top ?? []).map(([t]) => t).filter(t => CLOSED.test(t.trim())) } : {}) } } : {}) };
}

/** What a register's figure is called: its rows, counted. */
export const ROWS = 'Rows';

/** Every sheet that is rows of data, the one to lead with first. */
export function tablesOf(p: WorkbookProfile): Roles[] {
  const of = (small: boolean) => p.sheets.map(s => rolesOfSheet(p, s, false, small)).filter((r): r is Roles => !!r);
  /* a workbook whose only tables are small ones is still read; a table with a figure before a register of words */
  let all = of(false);
  if (!all.some(r => r.headline?.kind !== 'count')) all = of(true);
  return all.sort((a, b) => Number(a.headline?.kind === 'count') - Number(b.headline?.kind === 'count') || Number(!!b.date && b.dims.length > 0) - Number(!!a.date && a.dims.length > 0) || b.rows - a.rows);
}
/** The sheet worth analysing and what its columns are — or nothing, when no sheet has a figure and something to read it by. */
export const rolesOf = (p: WorkbookProfile): Roles | undefined => tablesOf(p)[0];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = (key: string): string => { const m = /^(\d{4})-(\d{2})/.exec(key); return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : key; };
const mon = (m: Month): string => m.label.split(' ')[0];
const isMoney = (col: string, kind: MeasureKind): boolean => kind === 'money' || kind === 'outcome' || /£|cost/i.test(col);
/** A figure as it is said: money to the pound, everything else to a sensible place. */
export function figure(v: number, col: string, kind: MeasureKind): string {
  if (kind === 'rate') { const pc = Math.abs(v) <= 1.5 ? v * 100 : v; return `${(Math.round(pc * 10) / 10).toLocaleString('en-GB')}%`; }
  if (kind === 'reading') return `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: Math.abs(v) >= 100 ? 1 : 2 })}`;
  if (kind === 'count') return Math.round(v).toLocaleString('en-GB');
  const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const n = Math.abs(r).toLocaleString('en-GB');
  return isMoney(col, kind) ? `${r < 0 ? '−' : ''}£${n}` : `${r < 0 ? '−' : ''}${n}`;
}
const num = (v: number | string | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const q = (x: string) => `“${x}”`;
export const by = (d: Dim): Pick<Query, 'groupBy' | 'lookups'> => (d.lookup ? { lookups: [d.lookup], groupBy: [d.lookup.as] } : { groupBy: [d.column] });
export const dimSaid = (d: Dim): string => (d.lookup ? `${q(d.said)} (from ${q(d.lookup.sheet)}, by ${q(d.column)})` : q(d.column));

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
  const shown: Figure[] = ms.length ? ms : r.measures.length ? r.measures.slice(0, 1) : r.headline ? [r.headline] : [];
  const t = await run({ sheet: r.sheet, ...(shown.some(m => m.calc) ? { calcs: shown.map(m => m.calc).filter((c): c is Calc => !!c) } : {}), measures: shown.map(measureOf) });
  const totals = shown.filter(m => m.kind !== 'count').map((m, i) => `${q(m.column)} ${m.agg === 'avg' ? 'averages ' : ''}${figure(num(t.totals[i]) ?? 0, m.column, m.kind)}`).join(', ') || 'no figure to add up';
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
  return `${lead}${big.length ? ` Its biggest sheets are ${big.map(x => `${q(x.name)} (${plural(x.rows, 'row')})`).join(', ')}.` : ''} Tell me which sheet to start with and which column is the result — and, if a sheet’s headings are not where I looked, the row they are on — and I will read it from there. Nothing was sent to the AI service.`;
}

/** A WORKBOOK OF FORMS, with no table to lead with: each form said answer by answer — labels down one column, the answers beside them.
 *  Nothing is added up in one form; several of the same form (a tab each) are read together as a table (lib/workbook/shapes). */
export async function formLook(p: WorkbookProfile, run: Run): Promise<string | undefined> {
  const forms = p.sheets.filter(s => s.read && s.form && !s.readAs).slice(0, 3);
  const shown = (v: string): string => {
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v).toLocaleString('en-GB', { maximumFractionDigits: 4 });
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return d ? `${Number(d[3])} ${MONTHS[Number(d[2]) - 1]} ${d[1]}` : v;
  };
  const said: string[] = [];
  for (const s of forms) {
    let rows: Awaited<ReturnType<typeof checkRows>> = [];
    try { rows = await checkRows(run, s); } catch { continue; }
    if (rows.length < 2) continue;
    /* a form in pairs of columns: label, answer, label, answer across a row — every pair is an answer */
    const wide = (r: { cells: string[] }): boolean => r.cells.length >= 3 && r.cells.length % 2 === 1 && r.cells.every((c, i) => i % 2 === 0 || !/^-?[\d.]+$/.test(c));
    const paired = rows.filter(wide).length >= 2;
    const answers = rows.flatMap(r => (paired && wide(r) ? [{ label: r.label, value: shown(r.cells[0]) }, ...r.cells.slice(1).flatMap((c, i, all) => (i % 2 === 0 ? [{ label: c, value: shown(all[i + 1]) }] : []))] : [{ label: r.label, value: r.cells.map(shown).join(' · ') }]));
    said.push(`${q(s.name)} reads as a filled-in form, not a table — ${paired ? 'labels with their answers beside them, in pairs across each row' : 'labels down one column with their answers beside them'}. ${plural(answers.length, 'answer')}: ${answers.slice(0, 30).map(a => `${a.label.replace(/[:?\s]+$/, '')}: ${a.value}`).join('; ')}${answers.length > 30 ? `; and ${answers.length - 30} more` : ''}.`);
  }
  if (!said.length) return undefined;
  const sheets = p.sheets.filter(x => !x.derived && !x.partOf);
  return `${q(p.name)} has ${plural(sheets.length, 'sheet')}. ${said.join('\n\n')}\n\nThere is nothing to add up in one form — ask me about any answer in it. Several of the same form, a tab each, I read together as a table: a row a form. Nothing was sent to the AI service.`;
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

/** THE ROWS THE REPORTS LEAVE OUT (14 November): a column of the lead sheet that the workbook's own formulas hold to one constant —
 *  three formulas or more, and half or more of those that sum the sheet under any condition — where holding it both keeps rows and
 *  leaves rows out. Read from the formulas (lib/workbook/criteria); why the rows are left out, the file does not say. */
async function basisOf(p: WorkbookProfile, s: SheetProfile, run: Run, of0?: number): Promise<Omit<Basis, 'applied'> | undefined> {
  const others = p.sheets.filter(x => x.name !== s.name);
  const of = others.reduce((t, x) => t + ((x.sumsFrom ?? []).find(f => f.sheet === s.name)?.formulas ?? 0), 0);
  if (of < 3) return undefined;
  const held = new Map<string, { column: string; op: 'eq' | 'ne'; value: string | number; formulas: number; sheets: Set<string> }>();
  for (const x of others) for (const h of x.holds ?? []) {
    if (h.sheet !== s.name || !s.columns.some(c => c.name === h.column)) continue;
    const k = `${h.column}\u0000${h.op}\u0000${String(h.value).toLowerCase()}`;
    const was = held.get(k) ?? { column: h.column, op: h.op, value: h.value, formulas: 0, sheets: new Set<string>() };
    was.formulas += h.formulas; was.sheets.add(x.name); held.set(k, was);
  }
  const rules: typeof held extends Map<string, infer V> ? V[] : never = [];
  for (const h of [...held.values()].filter(x => x.formulas >= 3 && x.formulas >= of * 0.5).sort((a, b) => b.formulas - a.formulas).slice(0, 2)) {
    const r = await run({ sheet: s.name, filters: [{ column: h.column, op: h.op, value: h.value }], measures: [{ op: 'count' }] });
    if (r.rowsMatched > 0 && r.rowsMatched < (of0 ?? r.rowsScanned)) rules.push(h);
  }
  if (!rules.length) return undefined;
  const filters: Filter[] = rules.map(h => ({ column: h.column, op: h.op, value: h.value }));
  const r = await run({ sheet: s.name, filters, measures: [{ op: 'count' }] });
  if (!r.rowsMatched) return undefined;
  const said = (v: string | number) => (typeof v === 'number' ? String(v) : q(v));
  return { filters, rule: rules.map(h => `${q(h.column)} is ${h.op === 'ne' ? 'not ' : ''}${said(h.value)}`).join(' and '), formulas: rules[0].formulas, of, sheets: [...new Set(rules.flatMap(h => [...h.sheets]))].slice(0, 3), kept: r.rowsMatched, out: (of0 ?? r.rowsScanned) - r.rowsMatched };
}

/** The first look, or nothing when the workbook has no table a figure can be read from (the screen then says `noLook`). */
export async function firstLook(p: WorkbookProfile, asked: Run, opts: LookOptions = {}): Promise<FirstLook | undefined> {
  const tables = tablesOf(p);
  const lc = (x: string) => x.trim().replace(/\s+/g, ' ').toLowerCase();
  /* THE PERSON'S WORD FIRST: the sheet they named is read even when it does not look like a table; the column they named is the
     result, whatever its heading; the column they named dates the rows */
  const R = opts.reading;
  const o = { sheet: opts.sheet ?? R?.sheet, result: opts.result ?? R?.result, date: opts.date ?? R?.date, everyRow: opts.everyRow ?? R?.everyRow };
  const named = o.sheet ? p.sheets.find(x => x.name === o.sheet) ?? p.sheets.find(x => lc(x.name) === lc(o.sheet as string)) : undefined;
  const roles = named ? tables.find(t => t.sheet === named.name) ?? rolesOfSheet(p, named, true) : tables[0];
  if (!roles?.headline) return undefined;
  if (named) { tables.splice(0, tables.length, roles, ...tables.filter(t => t !== roles)); }
  const s = p.sheets.find(x => x.name === roles.sheet) as SheetProfile;
  const colNamed = (n: string | undefined) => (n ? s.columns.find(c => c.name === n) ?? s.columns.find(c => lc(c.name) === lc(n)) ?? s.columns.find(c => c.letter === n.trim().toUpperCase()) : undefined);
  /* THE ROWS THE PERSON SAID TO LEAVE OUT, OR THE ONLY ROWS TO READ: a filter on every question of the lead sheet */
  const rules: Filter[] = ruleFilters(R).map(f => ({ ...f, column: colNamed(f.column)?.name ?? f.column })).filter(f => s.columns.some(c => c.name === f.column));
  /* every question of the lead sheet is asked as its figure is BROUGHT TOGETHER — averaged or counted where it is not a sum — and with
     any figure worked row by row (a quantity × a price) made first. `everyRowOf` asks every row of the sheet; `every` the rows left once
     the person's own rules are applied */
  const everyRowOf: Run = qq => asked(qq.sheet === s.name && roles.headline ? asFigure(roles.headline, roles.measures.map(m => m.calc).filter((c): c is Calc => !!c), qq) : qq);
  const every: Run = rules.length ? qq => everyRowOf(qq.sheet === s.name ? { ...qq, filters: [...rules, ...(qq.filters ?? [])] } : qq) : everyRowOf;
  const rc = colNamed(o.result), dc = colNamed(o.date);
  /* WHAT THE PERSON SAID EACH COLUMN IS, laid over what the reader found (15 November): added up, averaged, never added, a kind */
  const mineAdd: string[] = [], mineNot: string[] = [], gone = new Set<string>(), averaged: string[] = [];
  let avgTold: Figure | undefined;
  if (R && (R.columns || R.ignore)) {
    const order: MeasureKind[] = ['outcome', 'lost', 'money', 'volume', 'other'];
    for (const [k, said] of Object.entries(R.columns ?? {}) as [string, ColumnSay][]) {
      const c = colNamed(k);
      if (!c) continue;
      const wasM = roles.measures.find(m => m.column === c.name), wasN = roles.notSummed?.find(x => x.column === c.name);
      roles.measures = roles.measures.filter(m => m.column !== c.name);
      roles.notSummed = (roles.notSummed ?? []).filter(x => x.column !== c.name);
      if (said === 'average' || said === 'never') {
        if (wasM && !wasM.calc) mineAdd.push(q(c.name));
        if (said === 'average') averaged.push(c.name);
        roles.notSummed.push({ column: c.name, why: said === 'average' ? 'averaged, as you said' : 'you said not to add it' });
        gone.add(c.name);
        if (said === 'average' && !avgTold) avgTold = { column: c.name, kind: isRate(c) ? 'rate' : 'reading', agg: 'avg' };
      } else {
        if (!wasM && wasN) mineNot.push(`${q(c.name)} (${wasN.why})`);
        roles.measures.push({ column: c.name, kind: said === 'add' ? wasM?.kind ?? kindOf(c, s.name) : said });
      }
    }
    for (const k of R.ignore ?? []) {
      const c = colNamed(k);
      if (!c) continue;
      gone.add(c.name);
      roles.measures = roles.measures.filter(m => m.column !== c.name && m.calc?.a !== c.name && m.calc?.b !== c.name);
      roles.notSummed = (roles.notSummed ?? []).filter(x => x.column !== c.name);
      roles.dims = roles.dims.filter(d => d.column !== c.name);
      roles.flags = roles.flags.filter(f => f !== c.name);
      if (roles.reason && (roles.reason.dim === c.name || roles.reason.lost === c.name)) delete roles.reason;
      if (avgTold?.column === c.name) avgTold = undefined;
      if (averaged.includes(c.name)) averaged.splice(averaged.indexOf(c.name), 1);
    }
    roles.measures = roles.measures.map((m, i) => ({ m, i })).sort((x, y) => order.indexOf(x.m.kind) - order.indexOf(y.m.kind) || x.i - y.i).map(x => x.m);
    const first = roles.measures.find(m => m.kind === 'outcome') ?? roles.measures.find(m => m.kind === 'lost') ?? roles.measures.find(m => m.kind === 'money') ?? roles.measures[0];
    const stands = roles.headline.agg === 'avg' && !gone.has(roles.headline.column) ? roles.headline : undefined;
    const next = first ?? stands ?? avgTold ?? (roles.dims.length || roles.date ? { column: ROWS, kind: 'count' as const, agg: 'count' as const } : undefined);
    if (!next) return undefined;
    roles.headline = next;
  }
  if (rc) {
    /* the column they named is the result, whatever its heading — AVERAGED where they said so, or where it is a rate or a measurement */
    const wasN = roles.notSummed?.find(x => x.column === rc.name);
    const told = (Object.entries(R?.columns ?? {}) as [string, ColumnSay][]).find(([k]) => colNamed(k)?.name === rc.name)?.[1];
    if (told === 'average' || (!told && wasN && (wasN.why === 'a rate' || wasN.why === 'a measurement'))) roles.headline = { column: rc.name, kind: wasN?.why === 'a measurement' || !isRate(rc) ? 'reading' : 'rate', agg: 'avg' };
    else { const kind = kindOf(rc, s.name); const m = roles.measures.find(x => x.column === rc.name) ?? { column: rc.name, kind: kind === 'other' ? 'outcome' as const : kind }; roles.measures = [m, ...roles.measures.filter(x => x.column !== rc.name)]; roles.headline = m; roles.notSummed = (roles.notSummed ?? []).filter(x => x.column !== rc.name); }
  }
  if (roles.notSummed) { roles.notSummed = roles.notSummed.filter(x => x.column !== roles.headline?.column); if (!roles.notSummed.length) delete roles.notSummed; }
  if (roles.headline.kind !== 'count') delete roles.register;
  if (roles.headline.kind !== 'reading') delete roles.limits;
  if (dc) roles.date = dc.name;
  const says: string[] = [], gaps: string[] = [];
  const parts: FirstLook['parts'] = [];
  const say = (part: LookPart, text: string): void => { says.push(text); parts.push({ part, text }); };
  /* THE BASIS: where the workbook's own reports leave rows out, every question of the lead sheet is asked the same way — unless the
     person asked for every row. `every` always asks all of them. */
  let found: Omit<Basis, 'applied'> | undefined;
  /* the rows read once the person's own rules are applied — what every count of rows below is of */
  let rowsRead = s.rows;
  if (rules.length) rowsRead = (await every({ sheet: s.name, measures: [{ op: 'count' }] })).rowsMatched;
  await soft('the rows the reports leave out', async () => { found = await basisOf(p, s, every, rules.length ? rowsRead : undefined); });
  const basis: Basis | undefined = found ? { ...(found as Omit<Basis, 'applied'>), applied: !o.everyRow } : undefined;
  const run: Run = basis?.applied ? qq => every(qq.sheet === s.name ? { ...qq, filters: [...basis.filters, ...(qq.filters ?? [])] } : qq) : every;

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
  const told = rc ? cands.find(c => c.column === rc.name) : cands.find(c => (opts.told ?? []).some(t => t.toLowerCase().includes(c.column.trim().toLowerCase())));
  /* WHERE THE WORKBOOK'S OWN REPORTS GET THEIR NUMBERS (12 November — Rowland: "you'll find … the business is using this as its main
     metric because I can see the way everything flows towards it"): the formulas on OTHER sheets that draw on each candidate, and the
     pivot tables that add it up. A candidate the reports plainly rest on — three uses or more, and twice the next one's — leads. It is
     evidence, said as such; the person still confirms. */
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  for (const c of cands) {
    const from = p.sheets.filter(x => x.name !== s.name).map(x => ({ sheet: x.name, n: (x.drawsOn ?? []).filter(d => d.sheet === s.name && same(d.column, c.column)).reduce((t, d) => t + d.formulas, 0) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    const pivots = (p.pivotSums ?? []).filter(x => same(x.field, c.column)).reduce((t, x) => t + x.pivots, 0);
    if (from.length || pivots) c.usedBy = { formulas: from.reduce((t, x) => t + x.n, 0), sheets: from.slice(0, 3).map(x => x.sheet), pivots };
  }
  const drawnOn = (c: Candidate): number => (c.usedBy ? c.usedBy.formulas + c.usedBy.pivots * 25 : 0);
  const byUse = [...cands].sort((a, b) => drawnOn(b) - drawnOn(a));
  const most1 = byUse[0] ? drawnOn(byUse[0]) : 0, most2 = byUse[1] ? drawnOn(byUse[1]) : 0;
  const reports = byUse[0] && most1 >= 3 && most1 >= 2 * most2 ? byUse[0] : undefined;
  /* a column filled only under a flag is never the lead by itself, however many rows the flag marks */
  const lead = rc ? told : told ?? reports ?? dense.find(c => !c.onlyWhere) ?? dense[0];
  const chosen: FirstLook['chosen'] = rc ? 'told' : !cands.length ? 'only' : told ? 'told' : reports ? 'reports' : 'most rows';
  if (lead && lead.column !== roles.headline.column) {
    roles.headline = { column: lead.column, kind: 'outcome' };
    roles.measures = [roles.measures.find(m => m.column === lead.column) as Roles['measures'][number], ...roles.measures.filter(m => m.column !== lead.column)];
  }
  roles.also = cands.filter(c => c.column !== roles.headline?.column).map(c => c.column);
  const H: Figure = roles.headline, shown: Figure[] = [H, ...roles.measures.filter(m => m.column !== H.column)].slice(0, 4);
  /* a figure that is added up (or counted) can be split, shared out and compared a day; an average cannot */
  const additive = !H.agg || H.agg === 'count', counted = H.kind === 'count';
  const HQ = counted ? 'the rows' : q(H.column);

  /* ---- what it is: the sheets that are rows of data told from the reports, lists and grids around them ---- */
  /* the other tables of the SAME sheet are said however small — they are part of what the sheet holds */
  const root = s.partOf ?? s.name;
  const sameSheet = (t: Roles): boolean => { const a = p.sheets.find(x => x.name === t.sheet); return !!a && (a.partOf ?? a.name) === root && (!!a.partOf || !!s.partOf); };
  const beside = tables.slice(1).filter(t => (t.rows >= 20 && t.measures.some(m => m.kind !== 'other')) || sameSheet(t));
  const copies = beside.map(t => ({ t, extra: copyOf(p, roles, t) })).filter((x): x is { t: Roles; extra: string[] } => !!x.extra);
  const side = beside.filter(t => (sameSheet(t) || (!!t.date && t.dims.length > 0)) && !copies.some(c => c.t === t)).slice(0, sameSheet(beside[0] ?? roles) ? 5 : 3);
  const data = [s.name, ...side.map(t => t.sheet), ...copies.map(c => c.t.sheet)];
  /* the sheets as the FILE has them; a table made from sheets, and a later table on a sheet, are not sheets */
  const sheets = p.sheets.filter(x => !x.derived && !x.partOf), plain = sheets.length === p.sheets.length;
  const others = p.sheets.filter(x => !data.includes(x.name) && !x.readAs && !x.derived && x.name !== root);
  const more = roles.measures.filter(m => !shown.some(x => x.column === m.column)).length;
  const opening = s.derived ? `${s.derived.said} It holds ${plural(s.rows, 'row')}` : `${s.partOf ? `The table worth analysing is ${q(s.name)} (on ${q(s.partOf)}, from row ${s.fromRow})` : `The one worth analysing is ${q(s.name)}`} — ${plural(s.rows, 'row')}`;
  say('what', `${q(p.name)} has ${plural(sheets.length, 'sheet')}${plain && sheets.length > 3 ? ` — ${data.length === 1 ? 'one holds' : `${data.length} hold`} rows of data, the other ${others.length} read as reports, lists or grids` : ''}. ${opening}${roles.date ? `, each dated (${q(roles.date)})` : ''}${counted && roles.byUnit ? `, with ${roles.byUnit.columns.map(q).join(', ')} in ${roles.byUnit.units.length} different units` : counted ? ' — words, with no figure to add up' : `, with ${shown.map(m => q(m.column)).join(', ')}${more ? ` and ${plural(more, 'more figure')}` : ''}`}${roles.dims.length ? `, and it can be split by ${roles.dims.slice(0, 5).map(dimSaid).join(', ')}` : ''}.${side.length ? ` Beside it: ${side.map(t => `${t.sheet} (${t.rows.toLocaleString('en-GB')})`).join(', ')}.` : ''}${others.length ? ` The rest: ${others.slice(0, 6).map(x => x.name).join(', ')}${others.length > 6 ? ` and ${others.length - 6} more` : ''}.` : ''}`);
  for (const x of p.sheets.filter(y => y.derived && y.name !== s.name).slice(0, 2)) say('what', (x.derived as { said: string }).said);
  /* how the sheet was READ, where that is not how it is written: its own totals left out, words read as numbers, times as minutes, names filled down */
  const readAs: string[] = [];
  if (s.headingsRepeated) readAs.push(`the headings are said again ${s.headingsRepeated === 1 ? 'once' : `${s.headingsRepeated} times`} down the sheet, as a printed report repeats them — passed over, so it is one table`);
  if (s.unitsRow) readAs.push(`row ${s.unitsRow}, straight under the headings, gives the units — taken into the headings, not read as a row`);
  if (s.totals) readAs.push(`${plural(s.totals.count, 'row')} ${s.totals.count === 1 ? 'is' : 'are'} the sheet’s own totals (${s.totals.examples.map(q).join(', ')}${s.totals.count > s.totals.examples.length ? ' …' : ''}) — left out, so nothing is counted twice`);
  for (const c of s.columns.filter(x => x.typed).slice(0, 4)) readAs.push(`${q(c.name)} is typed as words${c.typed?.unit ? ` (with ${q(c.typed.unit)})` : ''} — read as ${c.typed?.as === 'date' ? 'dates' : 'numbers'}${c.typed?.left ? `; ${plural(c.typed.left, 'cell')} did not read and stay words` : ''}`);
  for (const c of s.columns.filter(x => x.duration).slice(0, 2)) readAs.push(`${q(c.name)} is kept as a time (0:45) — read as minutes`);
  for (const c of s.columns.filter(x => x.filledDown).slice(0, 3)) readAs.push(`${q(c.name)} is written once and left blank (or merged) down its rows — filled down, so every row carries it`);
  if (roles.aside?.length) readAs.push(`${roles.aside.slice(0, 4).map(q).join(', ')} — to the right of a gap, on only a few of its rows — ${roles.aside.length === 1 ? 'reads' : 'read'} as a small table of its own beside this one, and ${roles.aside.length === 1 ? 'is' : 'are'} left out of it`);
  if (readAs.length) say('what', `How I read ${q(s.name)}: ${readAs.join('; ')}.`);
  /* several tables on the one sheet, each under its own headings */
  const under = p.sheets.filter(x => x.partOf === root);
  if (under.length) say('what', `${q(root)} holds ${under.length + 1} tables one under another, each under its own headings: the first from row ${(p.sheets.find(x => x.name === root) as SheetProfile).headerRow}, ${under.slice(0, 5).map(x => `${q(x.name.replace(`${root} › `, ''))} from row ${x.fromRow}`).join(', ')}${under.length > 5 ? ` and ${under.length - 5} more` : ''}. Each is read as a table of its own.`);
  for (const c of copies.slice(0, 2)) say('what', `${q(c.t.sheet)} (${plural(c.t.rows, 'row')}) has the same headings as ${q(s.name)}${c.extra.length ? ` with ${c.extra.slice(0, 4).map(q).join(', ')} added` : ''} — it reads as a working copy of the same rows, so it is not added to them. Say if it is the one to use.`);
  /* WHAT THE FIGURE IS, said by its kind: something to add up; a value worked row by row; a measurement; a rate; a register's rows */
  const figureSaid = async (): Promise<string> => {
    const not = roles.notSummed?.length ? ` Not added up: ${roles.notSummed.slice(0, 6).map(x => `${q(x.column)} (${x.why})`).join(', ')}.` : '';
    /* THE NUMBER ITSELF, said with the figure: its sum (or its average) over the rows it was read on */
    let over = '';
    if (!counted && H.kind !== 'reading') await soft('the figure over every row', async () => {
      const r = await run({ sheet: s.name, measures: [{ op: 'sum', column: H.column }] });
      const v = num(r.totals[0]);
      if (v !== null) over = `${figure(v, H.column, H.kind)}${s.columns.find(c => c.name === H.column)?.duration ? ' min' : ''} over ${plural(r.rowsMatched, 'row')}`;
    });
    if (H.calc) return `${q(H.calc.a)} × ${q(String(H.calc.b))} on each row gives a value, and I have led with that${over ? `: ${over}` : ''} — a sum of the prices alone would mean nothing. Say if the value is something else.${not}`;
    if (H.kind === 'rate') return `${q(H.column)} is a rate, so I have AVERAGED it over the rows and never added it${over ? `: ${over}` : ''} — a plain average, in which every row counts the same whatever it made. Say if another figure matters more.${not}`;
    if (counted) {
      let late = '';
      const g = roles.register;
      if (g?.due) await soft('what is overdue', async () => {
        const now = new Date(opts.now ?? Date.now()), today = now.toISOString().slice(0, 10);
        const r = await run({ sheet: s.name, filters: [{ column: g.due as string, op: 'lt', value: today }, ...(g.status ? (g.closed ?? []).map(w => ({ column: g.status as string, op: 'ne' as const, value: w })) : [])], measures: [{ op: 'count' }] });
        late = ` ${r.rowsMatched ? `${plural(r.rowsMatched, 'row')} ${r.rowsMatched === 1 ? 'is' : 'are'}` : 'None is'} past ${r.rowsMatched === 1 ? 'its' : 'their'} ${q(g.due as string)} date${g.status && g.closed?.length ? ` and not ${g.closed.map(w => q(w)).join(' or ')}` : ''}, as of ${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}.`;
      });
      const U = roles.byUnit;
      if (U) {
        const per: string[] = [];
        for (const col of U.columns.slice(0, 3)) await soft('unit by unit', async () => {
          const r = await run({ sheet: s.name, groupBy: [U.unit], measures: [{ op: 'sum', column: col }], limit: 12 });
          per.push(`${q(col)}: ${r.groups.map(g => `${figure(num(g.values[0]) ?? 0, col, 'volume')} ${g.key[0]}`).join(' · ')}`);
        });
        const others = roles.notSummed?.filter(x => !U.columns.includes(x.column)) ?? [];
        return `${U.columns.length === 1 ? `${q(U.columns[0])} is` : `${U.columns.map(q).join(', ')} are`} counted in ${U.units.length} different units (${q(U.unit)}: ${U.units.join(', ')}), so ${U.columns.length === 1 ? 'it is' : 'they are'} never added across them — unit by unit, ${per.join('; ')}. Everything else below is a count of rows (${plural(s.rows, 'row')}).${late}${others.length ? ` Not added up: ${others.slice(0, 6).map(x => `${q(x.column)} (${x.why})`).join(', ')}.` : ''}`;
      }
      return `${q(s.name)} has no figure to add up — it reads as a register, a row a thing — so I have counted its rows: ${plural(rowsRead, 'row')}.${late}${not}`;
    }
    if (H.kind === 'reading') {
      const c = s.columns.find(x => x.name === H.column);
      let against = '';
      const L = roles.limits;
      if (L && (L.lower || L.upper)) await soft('the limits', async () => {
        const out = async (limit: string | undefined, below: boolean): Promise<number> => (!limit ? 0 : (await run({ sheet: s.name, calcs: [{ as: '@gap', a: below ? H.column : limit, op: '-', b: below ? limit : H.column }], filters: [{ column: '@gap', op: 'lt', value: 0 }], measures: [{ op: 'count' }] })).rowsMatched);
        const [lo, hi] = [await out(L.lower, true), await out(L.upper, false)];
        const n = c?.counts.number ?? s.rows;
        against = ` Against ${[L.lower, L.upper].filter((x): x is string => !!x).map(q).join(' and ')} on the same rows, ${lo + hi ? `${plural(lo + hi, 'row')} of ${n.toLocaleString('en-GB')} ${lo + hi === 1 ? 'is' : 'are'} outside (${[L.lower ? `${lo} below` : '', L.upper ? `${hi} above` : ''].filter(Boolean).join(', ')}) — ${figure((lo + hi) / n, '', 'rate')}` : 'none is outside'}.`;
      });
      const r = await run({ sheet: s.name, measures: [{ op: 'avg', column: H.column }, { op: 'min', column: H.column }, { op: 'max', column: H.column }] });
      const f = (v: number | string | null) => figure(num(v) ?? 0, H.column, 'reading');
      return `${avgTold?.column === H.column || (Object.entries(R?.columns ?? {}).some(([k, v]) => v === 'average' && colNamed(k)?.name === H.column)) ? `${q(H.column)} is averaged, as you said, never added` : `${q(H.column)} is a measurement, not something to add up`}: over ${plural(rules.length ? r.rowsMatched : c?.counts.number ?? s.rows, 'row')} it averages ${f(r.totals[0])}, from ${f(r.totals[1])} to ${f(r.totals[2])}${c?.sd !== undefined && !rules.length ? ` (spread — standard deviation — ${figure(c.sd, H.column, 'reading')})` : ''}.${against}${not}`;
    }
    return `I have taken ${q(H.column)} as the figure that matters${over ? `: ${over}` : ''}${H.kind === 'outcome' ? ' — it reads as a result, where below zero is a loss' : ''}. Say if it is another.${not}`;
  };
  /* WHAT THE PERSON SAID ABOUT THIS REPORT, said before the figure it changes — and what the rows they left out carry */
  if (R || opts.dropped?.length) await soft('what was told', async () => {
    const notes: string[] = [];
    const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
    if ((mineAdd.length || mineNot.length) && !R?.from) notes.push(`By myself I ${[mineAdd.length ? `would have added ${list(mineAdd)} up` : '', mineNot.length ? `would not have added up ${list(mineNot)}` : ''].filter(Boolean).join(', and ')}.`);
    /* what was said to be averaged is said as its average — over the rows read */
    const avs = averaged.filter(c => c !== H.column).slice(0, 4);
    if (avs.length) {
      const r = await asked({ sheet: s.name, ...(rules.length ? { filters: rules } : {}), measures: avs.map(c => ({ op: 'avg' as const, column: c })) });
      const said = avs.map((c, i) => ({ c, v: num(r.totals[i]) })).filter((x): x is { c: string; v: number } => x.v !== null);
      if (said.length) notes.push(`${said.map(x => `${q(x.c)} averages ${figure(x.v, x.c, 'reading')}`).join('; ')}${rules.length ? ' over the rows read' : ''}.`);
    }
    if (rules.length) {
      const all = await everyRowOf({ sheet: s.name, measures: [{ op: 'count' }, ...(additive && !counted ? [{ op: 'sum' as const, column: H.column }] : [])] });
      const on = await every({ sheet: s.name, measures: [{ op: 'count' }, ...(additive && !counted ? [{ op: 'sum' as const, column: H.column }] : [])] });
      const out = all.rowsMatched - on.rowsMatched;
      const carried = additive && !counted ? figure((num(all.totals[1]) ?? 0) - (num(on.totals[1]) ?? 0), H.column, H.kind) : '';
      notes.push(`That reads ${on.rowsMatched.toLocaleString('en-GB')} of ${plural(all.rowsMatched, 'row')}; the ${out.toLocaleString('en-GB')} left out ${carried ? `carry ${carried} of ${q(H.column)}` : 'are not counted'}.`);
    }
    const text = toldSaid(R ?? { at: 0 }, { dropped: opts.dropped ?? [], notes });
    if (text) say('told', text);
  });
  if (cands.length > 1) {
    const used = (c: Candidate): string => (!c.usedBy ? '' : `; ${[c.usedBy.formulas ? `${plural(c.usedBy.formulas, 'formula')} on ${c.usedBy.sheets.map(q).join(', ')} ${c.usedBy.formulas === 1 ? 'draws' : 'draw'} on it` : '', c.usedBy.pivots ? `${plural(c.usedBy.pivots, 'pivot table')} ${c.usedBy.pivots === 1 ? 'adds' : 'add'} it up` : ''].filter(Boolean).join(' and ')}`);
    const one = (c: Candidate) => `${q(c.column)} ${figure(c.total, c.column, 'outcome')} (filled on ${plural(c.rows, 'row')}${c.onlyWhere ? ` — only where ${q(c.onlyWhere)} is 1` : ''}${used(c)})`;
    const why = rc ? 'you said that is the one' : chosen === 'told' ? 'your notebook says that is the one' : chosen === 'reports' ? 'it is the one this workbook’s own reports are built on' : 'it is filled on the most rows';
    const ask = chosen === 'told' ? '' : chosen === 'reports' ? ' Is that the one the business manages by? Say yes and I will remember it, or name another.' : `${cands.some(c => c.usedBy) ? '' : ' None of the workbook’s own formulas or pivot tables points at one of them.'} Which one does the business manage by? Tell me and I will read it again by that one, and remember it.`;
    say('figure', `${cands.length} columns read as a result: ${cands.map(one).join('; ')}. I have led with ${q(H.column)} — ${why}.${ask}`);
  } else say('figure', rc && additive && !counted ? `${q(H.column)} is the figure that matters, as you said.` : await figureSaid());

  if (basis) await soft('the basis in words', async () => {
    const [all, on] = await Promise.all([every({ sheet: s.name, measures: [{ op: 'sum', column: H.column }] }), every({ sheet: s.name, filters: basis.filters, measures: [{ op: 'sum', column: H.column }] })]);
    const a = num(all.totals[0]) ?? 0, b = num(on.totals[0]) ?? 0;
    const lead = `The workbook’s own reports leave rows out: ${plural(basis.formulas, 'formula')} on ${basis.sheets.map(q).join(', ')} — of the ${basis.of.toLocaleString('en-GB')} that add up ${q(s.name)} under a condition — take only the rows where ${basis.rule}.`;
    say('basis', !additive || counted ? `${lead} ${basis.applied ? `I have read it the same way: ${basis.kept.toLocaleString('en-GB')} of ${rowsRead.toLocaleString('en-GB')} rows. Say “read every row” to have them in.` : `You asked for every row, so the ${plural(basis.out, 'row')} they leave out are in. Say “leave them out” to read it as the reports do.`}` : basis.applied
      ? `${lead} I have read it the same way: ${basis.kept.toLocaleString('en-GB')} of ${rowsRead.toLocaleString('en-GB')} rows. The ${basis.out.toLocaleString('en-GB')} left out carry ${figure(a - b, H.column, H.kind)} of ${q(H.column)}; with them it is ${figure(a, H.column, H.kind)}. Why they are left out, the file does not say. Say “read every row” to have them in.`
      : `${lead} You asked for every row, so they are in: the ${plural(basis.out, 'row')} the reports leave out carry ${figure(a - b, H.column, H.kind)} of ${q(H.column)}; without them it is ${figure(b, H.column, H.kind)}. Say “leave them out” to read it as the reports do.`);
  });

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
      say('period', `${months.length === 1 ? months[0].label : `${months[0].label} to ${months[months.length - 1].label}`}. ${months.map((m, i) => `${mon(m)}${m.part ? ` (${partSaid(m, i)})` : ''}: ${m.values[hi] === null ? 'nothing recorded' : figure(m.values[hi] as number, H.column, H.kind)}`).join(' · ')}.`);
      const last = months[months.length - 1], whole = [...months].reverse().find(m => !m.part && m !== last);
      const lv = last.values[hi], wv = whole?.values[hi];
      if (additive && last.part && whole && lv !== null && wv !== null && wv !== undefined && last.days > 0 && whole.days > 0)
        say('period', `${mon(last)} is only ${plural(last.days, 'day')} in, so it is compared a day: ${figure(lv / last.days, H.column, H.kind)} a day so far, against ${figure(wv / whole.days, H.column, H.kind)} a day in ${mon(whole)}.`);
    }
    gaps.push(...r.notes.filter(n => /no date/.test(n)));
  }

  /* ---- the workbook's own week (lib/workbook/week): the latest WHOLE one against the week before and the weeks before it ---- */
  let week: FirstLook['week'];
  if (roles.date && p.week) await soft('the week', async () => {
    const W = p.week as NonNullable<WorkbookProfile['week']>, date = roles.date as string;
    const r = await run({ sheet: s.name, time: { column: date, by: 'week' }, measures: [{ op: 'distinct', column: date }, { op: 'max', column: date }, { op: 'sum', column: H.column }], order: { by: 'group', desc: true }, limit: 60 });
    const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const weeks = r.groups.map((g): (WeekSaid & { last?: number }) | undefined => {
      const key = g.key[g.key.length - 1], end = weekKeyEnd(key);
      if (end === undefined) return undefined;
      const last = typeof g.values[1] === 'string' ? Date.parse(g.values[1].slice(0, 10)) : undefined, name = W.names?.[iso(end)];
      return { key, end, days: num(g.values[0]) ?? 0, value: num(g.values[2]), ...(name ? { name } : {}), ...(last !== undefined && Number.isFinite(last) ? { last } : {}) };
    }).filter((x): x is WeekSaid & { last?: number } => !!x).reverse();
    if (weeks.length < 2) return;
    const typical = median(weeks.slice(0, -1).map(x => x.days));
    const whole = (x: WeekSaid & { last?: number }) => x.days >= typical || (x.last !== undefined && x.last >= x.end);
    const tail = weeks[weeks.length - 1], part = whole(tail) ? undefined : tail;
    const done = part ? weeks.slice(0, -1) : weeks;
    const latest = done[done.length - 1], before = done[done.length - 2];
    if (!latest) return;
    const earlier = done.slice(0, -1).filter(x => x.days >= typical && x.value !== null).slice(-12);
    const average = earlier.length >= 3 ? earlier.reduce((t, x) => t + (x.value as number), 0) / earlier.length : undefined;
    const strip = ({ last: _l, ...x }: WeekSaid & { last?: number }): WeekSaid => { void _l; return x; };
    week = { ends: W.ends, latest: strip(latest), ...(before ? { before: strip(before) } : {}), ...(average !== undefined ? { average, over: earlier.length } : {}), ...(part ? { part: strip(part) } : {}) };
    const dm = (ms: number) => `${WEEKDAYS[new Date(ms).getUTCDay()]} ${new Date(ms).getUTCDate()} ${MONTHS[new Date(ms).getUTCMonth()]}`;
    const fig = (v: number | null) => (v === null ? 'nothing recorded' : figure(v, H.column, H.kind));
    /* a heading that is a row of data the reader took for one (a date's serial, a week's own name) is not said as a heading */
    /* a column 'headed' by a number, a date or a week's own name is a row of data the reader took for headings — it has no name to quote */
    const heading = (c: string) => !/^\d+(\.\d+)?$/.test(c.trim()) && textDate(c) === null && !Object.values(W.names ?? {}).includes(c.trim());
    const from = W.from.slice(0, 2).map(f => (heading(f.column) ? `${q(f.column)} on ${q(f.sheet)}` : `the dates on ${q(f.sheet)}`)).join(' and ');
    say('week', `The workbook’s own weeks end on a ${WEEKDAYS[W.ends]} — read from ${from}${W.namedBy ? `, and it names them itself (${heading(W.namedBy.column) ? `${q(W.namedBy.column)} on ` : 'on '}${q(W.namedBy.sheet)})` : ''}. The latest whole week, to ${dm(latest.end)}${latest.name ? ` — ${q(latest.name)}` : ''}: ${counted ? `${fig(latest.value)} rows` : `${q(H.column)} ${fig(latest.value)}`}${before ? `, against ${fig(before.value)} the week before` : ''}${average !== undefined ? ` and ${fig(average)} a week on average over the ${earlier.length} weeks before it` : ''}.${part ? ` The week to ${dm(part.end)} is only ${plural(part.days, 'day')} in: ${fig(part.value)} so far.` : ''} Say if your week runs differently.`);
  });

  /* ---- where it sits: only a split that STANDS OUT is said — one losing while the whole earns, or a spread a quarter of the total ---- */
  const lostLike = H.kind === 'lost' || H.kind === 'money' || counted;
  /* an average is not shared out between its groups: how far apart they sit is said against the average over everything */
  let overall = 0;
  if (!additive) await soft('the average over everything', async () => { overall = num((await run({ sheet: s.name, measures: [{ op: 'sum', column: H.column }] })).totals[0]) ?? 0; });
  /* a register's counts are said in full, by each thing it splits by — there is nothing to stand out from */
  const tallies: { d: Dim; rows: { key: string; value: number }[] }[] = [];
  const all: (Split & { spread: number; d: Dim })[] = [];
  /* a small grouping that does not stand out — the shifts, the crews — is still said, in a line: "nothing stands out" is an answer */
  const even: { d: Dim; rows: { key: string; value: number }[] }[] = [];
  const meant = (d: Dim): boolean => { const c = s.columns.find(x => x.name === d.column); return !!c && c.counts.blank < s.rows * 0.3; };
  const splitDims = roles.dims.filter(d => meant(d) && (d.column !== roles.reason?.dim || H.column === roles.reason?.lost));
  const snapSplits: LookSnap['splits'] = [];
  for (const d of splitDims.slice(0, 6)) {
    const sp = await splitOf(run, s.name, d, H.column);
    if (snapSplits.length < 4 && sp.named.length >= 2) snapSplits.push({ dim: d.said, groups: sp.named.slice(0, 60) });
    if (counted) { if (sp.notSaid >= 1) gaps.push(`${plural(sp.notSaid, 'row')} of ${q(s.name)} ${sp.notSaid === 1 ? 'has' : 'have'} no ${q(d.column)} (blank, or 0).`); }
    else if (additive && Math.abs(sp.notSaid) >= 0.5) gaps.push(`${figure(sp.notSaid, H.column, H.kind)} of ${q(H.column)} sits on rows where ${q(d.column)} is not said (blank, or 0) — it is left out of the ranking by ${q(d.said)}.`);
    if (sp.named.length < 2) continue;
    if (counted) { if (sp.named.length <= 40) tallies.push({ d, rows: [...sp.named].sort((a, b) => b.value - a.value) }); continue; }
    const asc = [...sp.named].sort((a, b) => a.value - b.value);
    const total = (additive ? Math.abs(sp.named.reduce((t, x) => t + x.value, 0)) : Math.abs(overall)) || 1;
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
    say('where', `By ${dimSaid(sp.d)} (${sp.groups}): ${head} ${sp.worst.map(said).join(', ')}${sp.best ? `; ${lostLike ? 'least' : H.kind === 'outcome' ? 'best' : 'highest'} ${said(sp.best)}` : ''}.`);
  }

  const small = [...all.filter(x => !top.includes(x) && x.groups <= 6).map(x => ({ d: x.d, rows: [...x.worst, ...(x.best ? [x.best] : [])] })), ...even].slice(0, 3);
  for (const e of small) say('where', `By ${dimSaid(e.d)} (${e.rows.length}): ${[...e.rows].sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })).map(x => `${x.key} ${figure(x.value, H.column, H.kind)}`).join(', ')}${even.includes(e as typeof even[number]) ? ' — none stands out' : ''}.`);

  for (const t of tallies.slice(0, 4)) say('where', `By ${dimSaid(t.d)} (${t.rows.length}): ${t.rows.slice(0, 8).map(x => `${x.key} ${figure(x.value, H.column, H.kind)}`).join(', ')}${t.rows.length > 8 ? ` and ${t.rows.length - 8} more` : ''}.`);

  /* ---- the flags: how many rows each marks, and what of the headline sits on them ---- */
  for (const f of roles.flags.filter(x => !(basis?.applied && basis.filters.some(b => b.column === x))).slice(0, 3)) await soft(`the flag ${f}`, async () => {
    const r = await run({ sheet: s.name, filters: [{ column: f, op: 'eq', value: 1 }], measures: [{ op: 'sum', column: H.column }] });
    if (r.rowsMatched && (counted || Math.abs(num(r.totals[0]) ?? 0) >= 0.5 || !additive)) say('flags', `${q(f)} marks ${plural(r.rowsMatched, 'row')} of ${rowsRead.toLocaleString('en-GB')} (${Math.max(1, Math.round((r.rowsMatched / s.rows) * 100))}%)${counted ? '' : additive ? `, carrying ${figure(num(r.totals[0]) ?? 0, H.column, H.kind)} of ${q(H.column)}` : `, where ${q(H.column)} averages ${figure(num(r.totals[0]) ?? 0, H.column, H.kind)}`}.`);
  });

  /* ---- what moved between the last two whole months ---- */
  let moved: FirstLook['moved'];
  const whole = months.filter(m => !m.part);
  if (additive && roles.date && whole.length >= 2 && splitDims.length) await soft('what moved', async () => {
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
        say('moved', `${mon(before)} to ${mon(after)}, ${HQ} moved by ${figure(change.change, H.column, H.kind)} (${figure(bv, H.column, H.kind)} to ${figure(av, H.column, H.kind)}). The biggest single mover is ${m1.key} on ${q(change.best?.field ?? '')}: ${figure(m1.change, H.column, H.kind)}${m1.share === null ? '' : Math.abs(m1.share) > 1 ? ' — more than the whole change, so the rest moved the other way' : `, ${Math.round(Math.abs(m1.share) * 100)}% of the change`}.`);
    }
  });

  /* ---- the tables beside it ---- */
  for (const t of side) await soft(`the table ${t.sheet}`, async () => { say('beside', await sideSaid(run, t)); });

  /* ---- the workbook's own checks, each tested against the rows (lib/workbook/checks) ---- */
  let checks: Checks | undefined;
  const cs = checksSheet(p, data);
  if (cs) await soft('the workbook’s own checks', async () => {
    const table = (t: Roles, own: boolean): CheckTable => ({ sheet: t.sheet, rows: t.rows, ...(t.date ? { date: t.date } : {}), columns: (own ? t.measures.slice(0, 12) : t.measures.filter(m => m.kind !== 'other').slice(0, 3)).filter(m => !m.calc).map(m => m.column), ...(own ? { flags: t.flags } : {}), ...(t.reason ? { reason: t.reason.dim } : {}) });
    checks = await checksOf(p, run, every, cs, { lead: table(roles, true), side: tables.slice(1).filter(t => t.sheet !== cs.name && !copies.some(c => c.t === t)).slice(0, 4).map(t => table(t, false)), basis: !!basis?.applied, ...(week ? { latestWeekEnd: week.latest.end } : {}), fig: (v, col) => figure(v, col, /£|cost|var|value/i.test(col) ? 'money' : 'other') });
    if (checks) say('checks', checks.said);
  });

  /* ---- the colours painted by hand, each kept as a column (lib/workbook/colours) ---- */
  if (s.colours?.length) say('colours', `Cells on ${q(s.name)} are coloured by hand, and each colour is kept as a column you can split by: ${s.colours.slice(0, 4).map(c => `${q(c.column)} — ${c.counts.map(([w, n]) => `${n.toLocaleString('en-GB')} ${w}`).join(', ')}`).join('; ')}${s.colours.length > 4 ? `; and ${s.colours.length - 4} more` : ''}. What a colour MEANS is not written in the file — tell me (“red is a missed hour”) and I will remember it.`);
  if (s.colourRules) gaps.push(`${q(s.name)} has ${plural(s.colourRules, 'colour rule')} (conditional formatting) — those colours follow a rule on the values and are not read as colours; ask for the rule’s own condition instead.`);

  /* ---- the same report, read before: what changed (lib/workbook/sinceLast) ---- */
  let total: number | null = months.length ? months.reduce<number | null>((t, m) => (m.values[hi] === null ? t : (t ?? 0) + (m.values[hi] as number)), null) : null;
  if (!additive) total = null;
  if (total === null) await soft('the total', async () => { total = num((await run({ sheet: s.name, measures: [{ op: 'sum', column: H.column }] })).totals[0]); });
  const snap: LookSnap = { at: opts.now ?? Date.now(), name: p.name, fileId: p.id, sheet: s.name, rows: rowsRead, headings: s.columns.filter(c => c.named && !c.colour).map(c => c.name).slice(0, 200), headline: H.column, total, ...(basis?.applied || rules.length ? { basis: [basis?.applied ? basis.rule : '', ...rules.map(f => `${q(f.column)} is ${f.op === 'ne' ? 'not ' : ''}${typeof f.value === 'number' ? f.value : q(String(f.value))}`)].filter(Boolean).join(' and ') } : {}),
    months: months.map(m => ({ key: m.key, label: m.label, days: m.days, part: m.part, value: m.values[hi] ?? null })), splits: snapSplits };
  const prev = lastOf(opts.earlier ?? [], snap);
  if (prev) {
    const since = sinceLast(prev, snap, v => figure(v, H.column, H.kind));
    /* said straight after the period, where a person reading it again looks first */
    const at = Math.max(parts.map(x => x.part).lastIndexOf('period'), parts.map(x => x.part).lastIndexOf('figure')) + 1;
    says.splice(at, 0, ...since); parts.splice(at, 0, ...since.map(text => ({ part: 'since' as const, text })));
  }

  /* ---- the gaps: what would mislead ---- */
  if (s.filter?.hiddenRows) gaps.unshift(`A filter is on ${q(s.name)} (${s.filter.on.join(', ') || s.filter.ref}), hiding ${s.filter.hiddenRows.toLocaleString('en-GB')} of its ${s.rows.toLocaleString('en-GB')} rows. Every figure here counts ALL rows — say if you want only what the filter shows.`);
  for (const t of [roles, ...side]) await soft('the reasons', async () => { const g = await reasonGap(run, t); if (g) gaps.push(g); });
  for (const c of s.columns.filter(x => roles.measures.some(m => m.column === x.name) && x.formulasNoValue > 0).slice(0, 3)) gaps.push(`${q(c.name)} has ${plural(c.formulasNoValue, 'formula')} with no saved value — those cells are left out; Excel’s own sums are never recalculated here.`);
  for (const c of s.columns.filter(x => roles.dims.some(d => d.column === x.name) && x.variants?.length).slice(0, 3)) gaps.push(`${q(c.name)} writes the same thing more than one way (${(c.variants ?? []).slice(0, 2).map(v => v.map(([t]) => q(t)).join(' · ')).join('; ')}) — they are counted apart until you say they are one.`);
  const broken = p.sheets.filter(x => x.read && x.errors > 0 && !tables.some(t => t.sheet === x.name)).sort((a, b) => b.errors - a.errors).slice(0, 2);
  const onPurpose = (name: string) => checks?.intended.find(i => i.sheet === name);
  const wrong = broken.filter(x => !onPurpose(x.name));
  if (wrong.length) gaps.push(`${wrong.map(x => `${q(x.name)} shows ${plural(x.errors, 'error cell')}`).join(' and ')} — the workbook’s own summary sheets may be wrong or out of date; the figures here come from the rows of data, not from them.`);
  for (const x of broken.filter(y => onPurpose(y.name))) gaps.push(`${q(x.name)} shows ${plural(x.errors, 'error cell')} — the workbook’s own checks (${q(checks?.sheet ?? '')}) say that is intended: ${q((onPurpose(x.name) as { words: string }).words)}.`);
  for (const x of p.sheets.filter(y => !y.read).slice(0, 3)) gaps.push(`${q(x.name)} was not read${x.why ? `: ${x.why}` : ''}.`);
  if (p.status === 'partial') gaps.push('Only PART of this workbook was read — every figure is of the part read.');
  if (gaps.length) say('gaps', `To know before trusting any of it: ${gaps.join(' ')}`);
  say('foot', `Every figure above is ${counted ? 'a count of' : additive ? 'a sum over' : 'worked from'} the rows of ${[s.name, ...side.map(t => t.sheet)].map(q).join(', ')}${basis?.applied ? ` (of ${q(s.name)}, the rows its own reports take)` : ''}${rules.length ? ` (of ${q(s.name)}, the rows you said to read)` : ''}, worked in the app — no AI was asked. What it MEANS is the next question.`);

  const d0 = top[0]?.d ?? splitDims[0], d1 = top[1]?.d ?? splitDims.find(d => d !== d0);
  const rt = [roles, ...side].find(t => t.reason);
  const suggestions = [
    moved && moved.change.best ? `Why did ${HQ} move from ${mon(moved.before)} to ${mon(moved.after)}?` : '',
    H.kind === 'reading' && roles.limits ? `Is ${q(H.column)} capable against its limits?` : '',
    week ? `Show ${HQ} week by week` : '',
    d0 ? (counted ? `Chart the rows of ${q(s.name)} by ${q(d0.said)}` : `Chart ${q(H.column)} by ${q(d0.said)}`) : '',
    d0 && d1 ? (counted ? `How many rows for each ${q(d1.said)} in each ${q(d0.said)}?` : `Which ${q(d1.said)} on which ${q(d0.said)} is ${H.kind === 'reading' || H.kind === 'rate' ? 'furthest out' : 'worst'} for ${q(H.column)}?`) : '',
    rt?.reason ? `Rank ${q(rt.reason.lost)} by ${q(rt.reason.dim)}` : '',
  ].filter(Boolean).slice(0, 4);
  return { roles, months, splits, ...(moved ? { moved } : {}), ...(basis ? { basis } : {}), ...(week ? { week } : {}), ...(checks ? { checks } : {}), gaps, candidates: cands, chosen, says, parts, splitDims: [...top.map(x => x.d), ...splitDims.filter(d => !top.some(x => x.d === d))].slice(0, 4), snap, ...(prev ? { comparedWith: { name: prev.name, at: prev.at } } : {}), suggestions };
}
