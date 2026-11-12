/* THE FIRST LOOK AT A WORKBOOK — WORKED IN CODE THE MOMENT IT IS ATTACHED, NO AI ASKED (12 November; docs/WORKBOOKS.md; the cost plan's
 * step 0 — Rowland: "if we can nail the excel analysis thats a significant achievement"; "how much can we take into code").
 *
 * On 10 November the first question asked of a real workbook was "understand the entire work book", and the answer cost three rounds of
 * the AI service to say what the workbook's own shape already holds. This reads that shape in code, from the profile the reader made and
 * a handful of sums over every row (the same query engine every later answer uses):
 *   THE TABLE     the sheet worth analysing — the most rows with a date, a number and something to split by;
 *   THE ROLES     its date, its figures (money · time lost · volume, told by their own headings — never by guessing a meaning) and what
 *                 it can be split by (the text columns that repeat: a line, a product, a shift, a reason);
 *   THE PERIOD    month by month, with how many days each month holds — a month with far fewer days than the others is said to be
 *                 PART of a month and compared a day, never as a whole month;
 *   WHERE         the headline figure by each thing it can be split by — the worst and the best, where one stands out;
 *   WHAT MOVED    the last two whole months, where the change sits (lib/data/change — the same sums explain_change uses);
 *   THE GAPS      what would mislead: a filter hiding rows, a reason left blank with the minutes on it, formulas with no saved value,
 *                 a name written two ways, a sheet not read.
 * Everything said is a sum over rows, with the column's own heading; which column is "the headline" is a CHOICE made from the headings
 * and said as one ("I have taken … as the figure that matters — say if it is another"). Nothing is interpreted: why a line loses money
 * is Luna's work and the person's. Pure but for `run`, the query runner it is handed. */
import type { ColumnProfile, SheetProfile, WorkbookProfile } from './read';
import type { Group, Query, QueryResult } from './query';
import { changeOf, type Change } from '../data/change';

export type Run = (q: Query) => Promise<QueryResult>;
export type MeasureKind = 'outcome' | 'money' | 'lost' | 'volume' | 'other';
export interface Roles {
  sheet: string; rows: number;
  date?: string;
  measures: { column: string; kind: MeasureKind }[];
  dims: string[];
  /** The figure taken as the one that matters, and why it was taken. */
  headline?: { column: string; kind: MeasureKind };
  /** A column of reasons beside a column of time lost — "Downtime reason" beside "Unplanned DT (mins)". */
  reason?: { dim: string; lost: string };
}
export interface Month { key: string; label: string; days: number; part: boolean; values: (number | null)[] }
export interface Split { dim: string; worst: { key: string; value: number }[]; best?: { key: string; value: number }; groups: number; blank?: number }
export interface FirstLook {
  roles: Roles;
  months: Month[];
  splits: Split[];
  moved?: { before: Month; after: Month; change: Change };
  gaps: string[];
  /** The whole look in words — the paragraphs of Luna's turn, in order. */
  says: string[];
  /** Questions worth asking next, in the columns' own words. */
  suggestions: string[];
}

const OUTCOME = /p\s*&\s*l|profit|variance|margin|contribution|\bfav\b|surplus|deficit/i;
const MONEY = /£|\bcost\b|\bvalue\b|spend|price|sales|revenue|wage|labour cost|\bgbp\b/i;
const LOST = /down\s*time|\bdt\b|lost|stoppage|\bstops?\b|delay|waiting|idle/i;
const VOLUME = /tonnes?|\bkg\b|kilos?|units?|packs?|cases?|trays?|pallets?|output|produced|packed|quantity|\bqty\b/i;
const RATE = /%|percent|\brate\b|efficiency|ratio|\bavg\b|average|per\s/i;
const ID = /\b(id|code|ref|no\.?|number|week|year|month|day|hour|period|quarter)\b/i;
const REASON = /reason|cause|why|category|fault|type/i;

const kindOf = (name: string): MeasureKind => (OUTCOME.test(name) ? 'outcome' : LOST.test(name) ? 'lost' : MONEY.test(name) ? 'money' : VOLUME.test(name) ? 'volume' : 'other');
const filled = (c: ColumnProfile): number => c.counts.number + c.counts.text + c.counts.date + c.counts.bool;
const isMeasure = (c: ColumnProfile, rows: number): boolean => c.named && !c.hidden && (c.type === 'number' || c.type === 'mixed') && c.counts.number >= Math.max(3, rows * 0.05) && !RATE.test(c.name) && !(ID.test(c.name) && kindOf(c.name) === 'other');
const isDim = (c: ColumnProfile, rows: number): boolean => c.named && !c.hidden && c.type === 'text' && !c.unique && (c.distinct ?? 0) >= 2 && (c.distinct ?? 0) <= Math.max(12, Math.min(400, rows / 4)) && filled(c) >= rows * 0.02;

function rolesOfSheet(s: SheetProfile): Roles | undefined {
  if (!s.read || s.state !== 'visible' || s.rows < 8) return undefined;
  const dates = s.columns.filter(c => c.named && c.type === 'date' && c.counts.date >= s.rows * 0.5).sort((a, b) => b.counts.date - a.counts.date);
  const order: MeasureKind[] = ['outcome', 'lost', 'money', 'volume', 'other'];
  const measures = s.columns.filter(c => isMeasure(c, s.rows)).map(c => ({ column: c.name, kind: kindOf(c.name) })).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const dims = s.columns.filter(c => isDim(c, s.rows)).sort((a, b) => (a.distinct ?? 0) - (b.distinct ?? 0)).map(c => c.name);
  if (!measures.length || !dims.length) return undefined;
  const headline = measures.find(m => m.kind === 'outcome') ?? measures.find(m => m.kind === 'money') ?? measures.find(m => m.kind === 'lost') ?? measures[0];
  const lost = measures.find(m => m.kind === 'lost');
  const rdim = lost ? dims.find(d => REASON.test(d)) : undefined;
  return { sheet: s.name, rows: s.rows, ...(dates[0] ? { date: dates[0].name } : {}), measures, dims, headline, ...(lost && rdim ? { reason: { dim: rdim, lost: lost.column } } : {}) };
}

/** The sheet worth analysing and what its columns are — or nothing, when no sheet has a figure and something to split it by. */
export function rolesOf(p: WorkbookProfile): Roles | undefined {
  return p.sheets.map(rolesOfSheet).filter((r): r is Roles => !!r)
    .sort((a, b) => Number(!!b.date) - Number(!!a.date) || b.rows - a.rows)[0];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = (key: string): string => { const m = /^(\d{4})-(\d{2})/.exec(key); return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : key; };
const isMoney = (col: string, kind: MeasureKind): boolean => kind === 'money' || kind === 'outcome' || /£/.test(col);
/** A figure as it is said: money to the pound, everything else to a sensible place. */
export function figure(v: number, col: string, kind: MeasureKind): string {
  const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const n = Math.abs(r).toLocaleString('en-GB');
  return isMoney(col, kind) ? `${r < 0 ? '−' : ''}£${n}` : `${r < 0 ? '−' : ''}${n}`;
}
const num = (v: number | string | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** The first look, or nothing when the workbook has no table a figure can be read from. */
export async function firstLook(p: WorkbookProfile, run: Run): Promise<FirstLook | undefined> {
  const roles = rolesOf(p);
  if (!roles?.headline) return undefined;
  const s = p.sheets.find(x => x.name === roles.sheet) as SheetProfile;
  const H = roles.headline, shown = roles.measures.slice(0, 4);
  const says: string[] = [], gaps: string[] = [];

  /* ---- what it is ---- */
  const others = p.sheets.filter(x => x.name !== s.name);
  says.push(`“${p.name}” has ${plural(p.sheets.length, 'sheet')}. The one worth analysing is “${s.name}” — ${plural(s.rows, 'row')}${roles.date ? `, each dated (“${roles.date}”)` : ''}, with ${shown.map(m => `“${m.column}”`).join(', ')}${roles.measures.length > shown.length ? ` and ${plural(roles.measures.length - shown.length, 'more figure')}` : ''}, and it can be split by ${roles.dims.slice(0, 5).map(d => `“${d}”`).join(', ')}.${others.length ? ` The others: ${others.slice(0, 6).map(x => `${x.name} (${x.rows.toLocaleString('en-GB')})`).join(', ')}${others.length > 6 ? '…' : ''}.` : ''}`);
  says.push(`I have taken “${H.column}” as the figure that matters${H.kind === 'outcome' ? ' — it reads as a result, where below zero is a loss' : ''}. Say if it is another.`);

  /* ---- the period, month by month ---- */
  let months: Month[] = [];
  if (roles.date) {
    const r = await run({ sheet: s.name, time: { column: roles.date, by: 'month' }, measures: [{ op: 'distinct', column: roles.date }, ...shown.map(m => ({ op: 'sum' as const, column: m.column }))], order: { by: 'group' }, limit: 200 });
    const raw = r.groups.map(g => ({ key: g.key[g.key.length - 1], days: num(g.values[0]) ?? 0, values: g.values.slice(1).map(num) }));
    const typical = median(raw.map(x => x.days));
    months = raw.map((x, i) => ({ key: x.key, label: monthLabel(x.key), days: x.days, part: (i === 0 || i === raw.length - 1) && x.days < typical * 0.75, values: x.values }));
    if (months.length) {
      const hi = shown.findIndex(m => m.column === H.column);
      says.push(`${months[0].label} to ${months[months.length - 1].label}. ${months.map(m => `${m.label.split(' ')[0]}${m.part ? ` (part — ${plural(m.days, 'day')})` : ''}: ${m.values[hi] === null ? 'nothing recorded' : figure(m.values[hi] as number, H.column, H.kind)}`).join(' · ')}.`);
      const last = months[months.length - 1], whole = [...months].reverse().find(m => !m.part && m !== last);
      const lv = last.values[hi], wv = whole?.values[hi];
      if (last.part && whole && lv !== null && wv !== null && wv !== undefined && last.days > 0 && whole.days > 0)
        says.push(`${last.label.split(' ')[0]} is only ${plural(last.days, 'day')} in, so it is compared a day: ${figure(lv / last.days, H.column, H.kind)} a day so far, against ${figure(wv / whole.days, H.column, H.kind)} a day in ${whole.label.split(' ')[0]}.`);
    }
    if (r.notes.length) gaps.push(...r.notes.filter(n => /no date/.test(n)));
  }

  /* ---- where it sits: only a split that STANDS OUT is said — a line losing while the whole earns, or a spread a quarter of the total ---- */
  const all: (Split & { spread: number })[] = [];
  const lostLike = H.kind === 'lost' || H.kind === 'money';
  for (const dim of roles.dims.slice(0, 6)) {
    const r = await run({ sheet: s.name, groupBy: [dim], measures: [{ op: 'sum', column: H.column }], order: { by: 0, desc: false }, limit: 200 });
    const rows = r.groups.map(g => ({ key: g.key[0], value: num(g.values[0]) })).filter((x): x is { key: string; value: number } => x.value !== null);
    const named = rows.filter(x => x.key !== '(blank)');
    if (named.length < 2) continue;
    const asc = [...named].sort((a, b) => a.value - b.value);
    const total = Math.abs(named.reduce((t, x) => t + x.value, 0)) || 1;
    const mixed = asc[0].value < 0 && asc[asc.length - 1].value > 0;
    const spread = (asc[asc.length - 1].value - asc[0].value) / total;
    if (!mixed && spread < 0.25) continue;
    const losing = asc.filter(x => x.value < 0);
    const worst = (lostLike ? [...asc].reverse() : H.kind === 'outcome' && losing.length ? losing : asc).slice(0, 3);
    const best = (lostLike ? asc : [...asc].reverse())[0];
    const blank = rows.find(x => x.key === '(blank)')?.value;
    all.push({ dim, worst, ...(best && !worst.includes(best) ? { best } : {}), groups: r.groupsTotal, ...(blank !== undefined ? { blank } : {}), spread: mixed ? spread + 10 : spread });
  }
  const splits: Split[] = all.sort((a, b) => b.spread - a.spread).slice(0, 3).map(({ spread: _s, ...x }) => { void _s; return x; });
  for (const sp of splits) {
    const said = (x: { key: string; value: number }) => `${x.key} ${figure(x.value, H.column, H.kind)}`;
    const head = lostLike ? 'most' : H.kind === 'outcome' && sp.worst.every(w => w.value < 0) ? 'losing' : 'lowest';
    says.push(`By “${sp.dim}” (${sp.groups}): ${head} ${sp.worst.map(said).join(', ')}${sp.best ? `; ${lostLike ? 'least' : H.kind === 'outcome' ? 'best' : 'highest'} ${said(sp.best)}` : ''}.`);
  }

  /* ---- what moved between the last two whole months ---- */
  let moved: FirstLook['moved'];
  const whole = months.filter(m => !m.part);
  if (roles.date && whole.length >= 2) {
    const before = whole[whole.length - 2], after = whole[whole.length - 1];
    const hi = shown.findIndex(m => m.column === H.column);
    const bv = before.values[hi], av = after.values[hi];
    if (bv !== null && av !== null) {
      const fields: { field: string; before: Group[]; after: Group[] }[] = [];
      for (const dim of roles.dims.slice(0, 4)) {
        const r = await run({ sheet: s.name, groupBy: [dim], time: { column: roles.date, by: 'month' }, measures: [{ op: 'sum', column: H.column }], limit: 200, order: { by: 'group' } });
        const of = (key: string): Group[] => r.groups.filter(g => g.key[g.key.length - 1] === key).map(g => ({ ...g, key: g.key.slice(0, -1) }));
        fields.push({ field: dim, before: of(before.key), after: of(after.key) });
      }
      const change = changeOf({ before: bv, after: av }, fields);
      moved = { before, after, change };
      const top = change.best?.movers[0];
      if (change.change !== 0 && top)
        says.push(`${before.label.split(' ')[0]} to ${after.label.split(' ')[0]}, “${H.column}” moved by ${figure(change.change, H.column, H.kind)} (${figure(bv, H.column, H.kind)} to ${figure(av, H.column, H.kind)}). The biggest single mover is ${top.key} on “${change.best?.field}”: ${figure(top.change, H.column, H.kind)}${top.share === null ? '' : Math.abs(top.share) > 1 ? ' — more than the whole change, so the rest moved the other way' : `, ${Math.round(Math.abs(top.share) * 100)}% of the change`}.`);
    }
  }

  /* ---- the gaps: what would mislead ---- */
  if (s.filter?.hiddenRows) gaps.push(`A filter is on “${s.name}” (${s.filter.on.join(', ') || s.filter.ref}), hiding ${s.filter.hiddenRows.toLocaleString('en-GB')} of its ${s.rows.toLocaleString('en-GB')} rows. Every figure here counts ALL rows — say if you want only what the filter shows.`);
  if (roles.reason) {
    const r = await run({ sheet: s.name, filters: [{ column: roles.reason.dim, op: 'blank' }, { column: roles.reason.lost, op: 'gt', value: 0 }], measures: [{ op: 'sum', column: roles.reason.lost }, { op: 'count' }] });
    const t = await run({ sheet: s.name, measures: [{ op: 'sum', column: roles.reason.lost }] });
    const blank = num(r.totals[0]), all = num(t.totals[0]);
    if (blank && all) gaps.push(`${figure(blank, roles.reason.lost, 'lost')} of “${roles.reason.lost}” (${Math.round((blank / all) * 100)}% of ${figure(all, roles.reason.lost, 'lost')}) has no “${roles.reason.dim}” given, on ${plural(r.rowsMatched, 'row')} — it cannot be put against a cause.`);
  }
  for (const c of s.columns.filter(x => roles.measures.some(m => m.column === x.name) && x.formulasNoValue > 0).slice(0, 3)) gaps.push(`“${c.name}” has ${plural(c.formulasNoValue, 'formula')} with no saved value — those cells are left out; Excel’s own sums are never recalculated here.`);
  for (const c of s.columns.filter(x => roles.dims.includes(x.name) && x.variants?.length).slice(0, 3)) gaps.push(`“${c.name}” writes the same thing more than one way (${(c.variants ?? []).slice(0, 2).map(v => v.map(([t]) => `“${t}”`).join(' · ')).join('; ')}) — they are counted apart until you say they are one.`);
  for (const x of p.sheets.filter(q => !q.read).slice(0, 3)) gaps.push(`“${x.name}” was not read${x.why ? `: ${x.why}` : ''}.`);
  if (p.status === 'partial') gaps.push('Only PART of this workbook was read — every figure is of the part read.');
  if (gaps.length) says.push(`To know before trusting any of it: ${gaps.join(' ')}`);
  says.push(`Every figure above is a sum over the rows of “${s.name}”, worked in the app — no AI was asked. What it MEANS is the next question.`);

  const d0 = splits[0]?.dim ?? roles.dims[0], d1 = splits[1]?.dim ?? roles.dims.find(d => d !== d0);
  const suggestions = [
    moved && moved.change.best ? `Why did “${H.column}” move from ${moved.before.label.split(' ')[0]} to ${moved.after.label.split(' ')[0]}?` : '',
    d0 ? `Chart “${H.column}” by “${d0}”` : '',
    d0 && d1 ? `Which “${d1}” on which “${d0}” is worst for “${H.column}”?` : '',
    roles.reason ? `Rank “${roles.reason.lost}” by “${roles.reason.dim}”` : '',
  ].filter(Boolean).slice(0, 4);
  return { roles, months, splits, ...(moved ? { moved } : {}), gaps, says, suggestions };
}
