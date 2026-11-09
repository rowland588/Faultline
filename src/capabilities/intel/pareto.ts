/* THE PARETO, FROM WHATEVER EVIDENCE THERE IS — the reference implementation of tool intelligence (docs/AI-TOOL-INTELLIGENCE.md §4).
 * Rowland, 10 November: "We keep losing time because bags aren't presenting properly on Line 3 … the AI must not simply create a Pareto
 * from the user's statement … a Pareto requires categories and a quantified value … frequency is not the same as duration … indicate
 * whether the dataset is sufficient … flag conflicting figures."
 *
 * Pure. Evidence comes in SOURCES, each of one kind and never merged with another:
 *   measured   stops timed by a stopwatch (the line's own records, live or on the stops screen)
 *   reported   stops typed after the fact, and figures said in the conversation
 *   counted    stops tapped as instants — how often, no minutes
 *   imported   a downtime file read in code
 * Each source is ranked on its own; the one that leads is the best there is (measured, then imported, then reported; counted only for
 * how often). Where two sources disagree it is said, never averaged away. Every figure here is a sum or a share of what was given —
 * nothing is estimated. */
import { confidenceOf, type Confidence } from '../../lib/intelligence/confidence';
import type { Observation } from '../../types';

export type Basis = 'measured' | 'reported' | 'counted' | 'imported';
export const BASIS_WORD: Record<Basis, string> = {
  measured: 'timed by stopwatch', reported: 'reported (typed or said, not timed)', counted: 'counted (how often, no minutes)', imported: 'imported from a file',
};
const LEAD_ORDER: readonly Basis[] = ['measured', 'imported', 'reported', 'counted'];

export interface SourceRow { category: string; mins?: number; events?: number; line?: string; at?: number }
export interface Source { basis: Basis; label: string; rows: SourceRow[]; from?: number; to?: number }

export interface Ranked { category: string; mins?: number; events?: number; share: number; cum: number; minPerEvent?: number }
export interface SourcePareto {
  basis: Basis; label: string;
  /** Ranked by minutes lost — only when every row with a reason carries its minutes. */
  byTime?: Ranked[];
  /** Ranked by how often — when the rows carry counts (or each is one stop). */
  byCount?: Ranked[];
  totalMins?: number; totalEvents?: number;
  lines: string[];
  confidence: Confidence & { basis: Basis };
  from?: number; to?: number;
}

export interface ParetoEvidence {
  sources: SourcePareto[];
  /** The source the ranking is said from, and by what. */
  lead?: { basis: Basis; by: 'time' | 'count' };
  conflicts: string[];
  gaps: string[];
  /** One line a line, when the lead covers more than one. */
  byLine: { line: string; top: string; mins?: number; events?: number }[];
  /** How sure, and what would make it enough. */
  enough: { level: Confidence['level'] | 'reported'; says: string; more?: string };
  says: string;
}

/* ---- the same reason in different words: case, spaces, a trailing s ---- */
export const sameReason = (s: string): string => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/s$/, '');

const r1 = (n: number) => Math.round(n * 10) / 10;
const minsSaid = (m: number) => `${m >= 100 ? Math.round(m).toLocaleString('en-GB') : r1(m)} min`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const DAY = 86_400_000;

/* ---------------------------------------------------------------- observations into sources */

/** The line's stops as up to three sources — timed, typed and tapped — never one. `lineOf` names an observation's line. */
export function sourcesFromObservations(obs: readonly Observation[], from: number, to: number, lineOf: (o: Observation) => string): Source[] {
  const inside = obs.filter(o => !o.deletedAt && o.startedAt >= from && o.startedAt < to);
  const of = (basis: Basis, pick: (o: Observation) => boolean, row: (o: Observation) => SourceRow): Source | undefined => {
    const rows = inside.filter(pick).map(row);
    return rows.length ? { basis, label: BASIS_WORD[basis], rows, from, to } : undefined;
  };
  const cat = (o: Observation) => (o.category ?? '').trim() || 'No reason given';
  return [
    of('measured', o => o.timing === 'stopwatch' && o.durationMs > 0, o => ({ category: cat(o), mins: o.durationMs / 60_000, events: Math.max(1, o.count || 1), line: lineOf(o), at: o.startedAt })),
    of('reported', o => o.timing === 'typed' && o.durationMs > 0, o => ({ category: cat(o), mins: o.durationMs / 60_000, events: Math.max(1, o.count || 1), line: lineOf(o), at: o.startedAt })),
    /* a tap is a stop with no minutes — and a stopwatch stop still running has none yet either */
    of('counted', o => o.timing === 'instant' || (o.durationMs <= 0 && (o.count ?? 0) >= 0 && o.timing !== 'typed'), o => ({ category: cat(o), events: Math.max(1, o.count || 1), line: lineOf(o), at: o.startedAt })),
  ].filter((s): s is Source => !!s);
}

/* ---------------------------------------------------------------- one source ranked */

function rank(rows: { category: string; v: number; mins?: number; events?: number }[]): Ranked[] {
  const total = rows.reduce((n, r) => n + r.v, 0);
  let cum = 0;
  return rows.sort((a, b) => b.v - a.v || a.category.localeCompare(b.category)).map(r => {
    cum += r.v;
    return { category: r.category, ...(r.mins !== undefined ? { mins: r1(r.mins) } : {}), ...(r.events !== undefined ? { events: r.events } : {}),
      share: total ? r.v / total : 0, cum: total ? cum / total : 0, ...(r.mins !== undefined && r.events ? { minPerEvent: r1(r.mins / r.events) } : {}) };
  });
}

export function paretoOfSource(src: Source): SourcePareto {
  const groups = new Map<string, { category: string; mins?: number; events?: number; anyNoMins: boolean; anyNoEvents: boolean }>();
  for (const r of src.rows) {
    const k = sameReason(r.category);
    if (!k) continue;
    const g = groups.get(k) ?? { category: r.category.trim(), anyNoMins: false, anyNoEvents: false };
    if (r.mins !== undefined && Number.isFinite(r.mins)) g.mins = (g.mins ?? 0) + r.mins; else g.anyNoMins = true;
    if (r.events !== undefined && Number.isFinite(r.events)) g.events = (g.events ?? 0) + r.events; else g.anyNoEvents = true;
    groups.set(k, g);
  }
  const gs = [...groups.values()];
  /* ranked by time only when every reason carries its minutes — a reason with none would sit last for want of a figure */
  const timed = gs.length > 0 && gs.every(g => !g.anyNoMins && g.mins !== undefined);
  const counted = gs.length > 0 && gs.every(g => !g.anyNoEvents && g.events !== undefined);
  const byTime = timed ? rank(gs.map(g => ({ category: g.category, v: g.mins as number, mins: g.mins, ...(counted ? { events: g.events } : {}) }))) : undefined;
  const byCount = counted ? rank(gs.map(g => ({ category: g.category, v: g.events as number, events: g.events, ...(timed ? { mins: g.mins } : {}) }))) : undefined;
  const lines = [...new Set(src.rows.map(r => r.line).filter((l): l is string => !!l))];
  const at = src.rows.flatMap(r => (r.at !== undefined ? Array.from({ length: Math.max(1, Math.round(r.events ?? 1)) }, () => r.at as number) : []));
  const events = gs.reduce((n, g) => n + (g.events ?? 0), 0);
  const conf: Confidence = at.length ? confidenceOf(at, 'stop')
    : { level: events >= 60 ? 'fair' : events ? 'thin' : 'none', days: 0, events, says: events ? `${plural(events, 'stop')}, the days not known` : 'no stops counted in it' };
  return { basis: src.basis, label: src.label, ...(byTime ? { byTime } : {}), ...(byCount ? { byCount } : {}),
    ...(timed ? { totalMins: r1(gs.reduce((n, g) => n + (g.mins ?? 0), 0)) } : {}), ...(counted ? { totalEvents: events } : {}),
    lines, confidence: { ...conf, basis: src.basis }, ...(src.from !== undefined ? { from: src.from } : {}), ...(src.to !== undefined ? { to: src.to } : {}) };
}

/* ---------------------------------------------------------------- the evidence, said */

const dayWord = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const periodSaid = (p: SourcePareto): string => {
  if (p.from === undefined || p.to === undefined) return '';
  const end = Math.min(p.to, Date.now());
  return `${dayWord(p.from)}–${dayWord(end - 1)}`;
};
const topOf = (p: SourcePareto, by: 'time' | 'count') => (by === 'time' ? p.byTime : p.byCount)?.[0];

/** The Pareto from every source there is. `previous` — the same line's measured stops in the window before, for movement. */
export function paretoEvidence(sources: readonly Source[], opts: { where?: string; previous?: Source } = {}): ParetoEvidence {
  const ps = sources.map(paretoOfSource).filter(p => p.byTime || p.byCount);
  const gaps: string[] = [], conflicts: string[] = [];
  const where = opts.where ? ` on ${opts.where}` : '';
  if (!ps.length) {
    return { sources: [], conflicts, gaps, byLine: [],
      enough: { level: 'none', says: 'nothing to rank', more: 'stops timed, a downtime file, or figures said — each reason with its minutes or how often' },
      says: `There is nothing to rank yet${where}: no stops timed or typed in the period, no downtime file read, and no figures said. A Pareto needs reasons with a quantity — minutes lost, or how many times.` };
  }
  /* which source leads: the best kind with minutes, else the best with counts */
  const withTime = LEAD_ORDER.map(b => ps.find(p => p.basis === b && p.byTime)).find(Boolean);
  const withCount = LEAD_ORDER.map(b => ps.find(p => p.basis === b && p.byCount)).find(Boolean);
  const lead = withTime ?? withCount;
  const by: 'time' | 'count' = withTime ? 'time' : 'count';
  const L = lead as SourcePareto;

  /* frequency without duration, duration without frequency */
  if (by === 'count') gaps.push('Only how often is known, not the minutes each cost — this ranks by count, and a frequent short stop can cost less time than a rare long one. Time the stops to rank by time lost.');
  if (by === 'time' && !L.byCount) gaps.push('The minutes lost are known but not how many stops made them — whether a reason is many short stops or a few long ones cannot be said.');
  if (by === 'time' && L.byCount) {
    const tTop = L.byTime?.[0]?.category, cTop = L.byCount[0]?.category;
    if (tTop && cTop && sameReason(tTop) !== sameReason(cTop)) gaps.push(`By time lost ${tTop} leads; by how often ${cTop} does — they are different questions, and the time lost is what costs the line.`);
  }

  /* conflicts: two kinds of evidence that do not agree on the same reasons */
  for (const p of ps) {
    if (p === L) continue;
    const pBy = p.byTime && L.byTime ? 'time' : p.byCount && L.byCount ? 'count' : undefined;
    if (!pBy) continue;
    const a = topOf(L, pBy), b = topOf(p, pBy);
    if (a && b && sameReason(a.category) !== sameReason(b.category)) conflicts.push(`What is ${L.label} puts ${a.category} first; what is ${p.label} puts ${b.category} first.`);
    const mine = (pBy === 'time' ? L.byTime : L.byCount) ?? [];
    for (const r of (pBy === 'time' ? p.byTime : p.byCount) ?? []) {
      const m = mine.find(x => sameReason(x.category) === sameReason(r.category));
      if (m && Math.abs(m.share - r.share) >= 0.2) conflicts.push(`${r.category}: ${pct(m.share)} of the ${pBy === 'time' ? 'time lost' : 'stops'} ${L.label}, but ${pct(r.share)} ${p.label}.`);
    }
  }
  /* the same reason given twice in one source with different figures (said twice, or a file listing it twice) */
  for (const s of sources) {
    const seen = new Map<string, number[]>();
    if (s.basis !== 'reported' || s.rows.some(r => r.at !== undefined)) continue;
    for (const r of s.rows) if (r.mins !== undefined) seen.set(sameReason(r.category), [...(seen.get(sameReason(r.category)) ?? []), r.mins]);
    for (const [k, ms] of seen) if (ms.length > 1 && new Set(ms.map(r1)).size > 1) conflicts.push(`${s.rows.find(r => sameReason(r.category) === k)?.category} was said with different figures: ${ms.map(minsSaid).join(' and ')} — both kept; which is right?`);
  }

  /* more than one line: each line's own leader, never one blended ranking said as one line's */
  const byLine: ParetoEvidence['byLine'] = [];
  if (L.lines.length > 1) {
    const src = sources.find(s => s.basis === L.basis) as Source;
    for (const line of L.lines) {
      const one = paretoOfSource({ ...src, rows: src.rows.filter(r => r.line === line) });
      const top = (by === 'time' ? one.byTime : one.byCount)?.[0];
      if (top) byLine.push({ line, top: top.category, ...(top.mins !== undefined ? { mins: top.mins } : {}), ...(top.events !== undefined ? { events: top.events } : {}) });
    }
  }

  /* how sure */
  const c = L.confidence;
  const enough: ParetoEvidence['enough'] = L.basis === 'reported'
    ? { level: 'reported', says: 'reported, not measured — it shows where people think the time goes; time it before relying on the ranking', more: 'time the stops — at least 20 over a week' }
    : L.basis === 'counted'
      ? { level: c.level, says: `${c.says} — counted, so it ranks how often, never time`, more: 'time each stop so the minutes are known' }
      : { level: c.level, says: c.says,
        ...(c.level === 'thin' ? { more: `at least 20 stops over 7 days${c.events < 20 ? ` (${20 - c.events} more stops` : ' ('}${c.days < 7 ? `${c.events < 20 ? ', ' : ''}${7 - c.days} more days` : ''})`.replace('( ', '(').replace('()', '') }
          : c.level === 'fair' ? { more: `60 stops over 21 days for a ranking to rely on` } : {}) };

  /* movement against the window before */
  let moved = '';
  if (opts.previous && by === 'time' && L.basis === 'measured') {
    const before = paretoOfSource(opts.previous).byTime ?? [];
    const top = L.byTime?.[0];
    const was = top && before.find(x => sameReason(x.category) === sameReason(top.category));
    if (top?.mins !== undefined) moved = was?.mins !== undefined ? ` (${minsSaid(was.mins)} the period before)` : before.length ? ' (none the period before)' : '';
  }

  /* the defensible statement */
  const rows = (by === 'time' ? L.byTime : L.byCount) ?? [];
  const top = rows[0], second = rows[1];
  const vital = rows.filter((_r, i) => i === 0 || (rows[i - 1]?.cum ?? 0) < 0.8).map(r => r.category);
  const period = periodSaid(L);
  const head = `${L.basis === 'measured' ? 'Timed' : L.basis === 'imported' ? 'From the file' : L.basis === 'counted' ? 'Counted' : 'As reported'}${where}${period ? `, ${period}` : ''}: `;
  const total = by === 'time' ? `${minsSaid(L.totalMins ?? 0)} lost${L.totalEvents ? ` in ${plural(L.totalEvents, 'stop')}` : ''}` : `${plural(L.totalEvents ?? 0, 'stop')}`;
  const lead1 = top ? ` ${top.category} leads — ${by === 'time' ? `${minsSaid(top.mins ?? 0)}${top.events ? ` in ${plural(top.events, 'stop')}` : ''}, ${pct(top.share)} of the time lost${top.minPerEvent !== undefined ? `, ${top.minPerEvent} min a stop` : ''}` : `${plural(top.events ?? 0, 'stop')}, ${pct(top.share)} of them`}${moved}.` : '';
  const lead2 = second ? ` Then ${second.category}, ${by === 'time' ? minsSaid(second.mins ?? 0) : plural(second.events ?? 0, 'stop')} (${pct(second.share)}).` : '';
  const vitalSaid = vital.length > 1 && vital.length < rows.length ? ` ${vital.length} of ${rows.length} reasons make ${pct(rows[vital.length - 1].cum)} of it.` : '';
  const sure = ` How sure: ${enough.says}${enough.more ? `; to rely on it: ${enough.more}` : ''}.`;
  const lineSaid = byLine.length ? ` By line: ${byLine.map(b => `${b.line} — ${b.top}`).join('; ')}.` : '';
  const others = ps.filter(p => p !== L).map(p => `${p.label}: ${(p.byTime ?? p.byCount)?.slice(0, 2).map(r => `${r.category} ${p.byTime ? minsSaid(r.mins ?? 0) : plural(r.events ?? 0, 'stop')}`).join(', ')}`);
  const apart = others.length ? ` Kept apart, not added in: ${others.join('; ')}.` : '';
  const says = `${head}${total}.${lead1}${lead2}${vitalSaid}${lineSaid}${sure}${gaps.length ? ` ${gaps.join(' ')}` : ''}${apart}${conflicts.length ? ` Not agreeing: ${conflicts.join(' ')}` : ''}`;
  return { sources: ps, lead: { basis: L.basis, by }, conflicts, gaps, byLine, enough, says };
}

/* ---------------------------------------------------------------- a downtime file, read in code */

export interface DowntimeTable {
  columns: { reason: string; minutes?: string; count?: string; line?: string; date?: string };
  rows: SourceRow[];
  skipped: string[];
}

const HEAD = {
  reason: /^(stop |downtime |fault |loss )?(reason|category|cause|fault|description|code|issue|problem)s?$/,
  minutes: /(min|mins|minutes|duration|downtime|time lost|lost time|hours|hrs|secs|seconds)/,
  count: /^(no\.? of |number of )?(count|stops|occurrences|events|frequency|qty|quantity|times|number)$/,
  line: /^(production )?line$/,
  date: /^(date|day|start|started|when|shift date)$/,
};

/** A downtime table from its rows (the first holding the headings): the reason column, and minutes and/or a count. Undefined when the
 *  rows are not one — no reason column, or nothing to quantify it by. Times "h:mm:ss" are read; a value that is not a number is skipped
 *  and named, never guessed. */
export function downtimeTable(rows: readonly (readonly unknown[])[]): DowntimeTable | undefined {
  const headAt = rows.findIndex(r => r.some(c => typeof c === 'string' && HEAD.reason.test(c.trim().toLowerCase())));
  if (headAt < 0 || headAt > 5) return undefined;
  const heads = rows[headAt].map(c => String(c ?? '').trim());
  const low = heads.map(h => h.toLowerCase());
  const find = (re: RegExp, not: number[] = []) => low.findIndex((h, i) => !not.includes(i) && re.test(h));
  const ri = find(HEAD.reason);
  const mi = find(HEAD.minutes, [ri]);
  const ci = find(HEAD.count, [ri, mi]);
  const li = find(HEAD.line, [ri, mi, ci]);
  const di = find(HEAD.date, [ri, mi, ci, li]);
  if (mi < 0 && ci < 0) return undefined;
  const unitOf = (h: string) => (/hour|hrs/.test(h) ? 60 : /sec/.test(h) ? 1 / 60 : 1);
  const mUnit = mi >= 0 ? unitOf(low[mi]) : 1;
  const out: SourceRow[] = [], skipped: string[] = [];
  const num = (v: unknown, unit: number): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v * unit;
    if (typeof v !== 'string' || !v.trim()) return undefined;
    const t = v.trim();
    const hms = /^(\d+):(\d{1,2}):(\d{1,2})$/.exec(t);
    if (hms) return Number(hms[1]) * 60 + Number(hms[2]) + Number(hms[3]) / 60;
    const n = Number(t.replace(/,/g, ''));
    return Number.isFinite(n) ? n * unit : NaN;
  };
  for (let i = headAt + 1; i < rows.length && out.length < 5000; i += 1) {
    const r = rows[i];
    const reason = String(r[ri] ?? '').trim();
    if (!reason) continue;
    const m = mi >= 0 ? num(r[mi], mUnit) : undefined;
    const c = ci >= 0 ? num(r[ci], 1) : undefined;
    if (Number.isNaN(m) || Number.isNaN(c) || (m !== undefined && m < 0) || (c !== undefined && c < 0)) { skipped.push(`row ${i + 1} (“${reason}”) — “${String(r[Number.isNaN(m) ? mi : ci])}” is not a number`); continue; }
    if (m === undefined && c === undefined) { skipped.push(`row ${i + 1} (“${reason}”) — no figure`); continue; }
    const d = di >= 0 ? r[di] : undefined;
    const at = d instanceof Date ? d.getTime() : typeof d === 'string' && !Number.isNaN(Date.parse(d)) ? Date.parse(d) : undefined;
    out.push({ category: reason, ...(m !== undefined ? { mins: m } : {}), ...(c !== undefined ? { events: c } : mi >= 0 && ci < 0 ? {} : {}),
      ...(li >= 0 && String(r[li] ?? '').trim() ? { line: String(r[li]).trim() } : {}), ...(at !== undefined ? { at } : {}) });
  }
  /* a file of one stop a row with a duration and no count: each row is one stop */
  if (mi >= 0 && ci < 0 && di >= 0) for (const r of out) r.events = 1;
  return { columns: { reason: heads[ri], ...(mi >= 0 ? { minutes: heads[mi] } : {}), ...(ci >= 0 ? { count: heads[ci] } : {}), ...(li >= 0 ? { line: heads[li] } : {}), ...(di >= 0 ? { date: heads[di] } : {}) }, rows: out, skipped };
}

/** CSV text into rows — quoted fields with commas and doubled quotes. */
export function csvRows(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i += 1; row.push(cell); out.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.filter(r => r.some(c => c.trim()));
}

export const PARETO_DAY = DAY;
