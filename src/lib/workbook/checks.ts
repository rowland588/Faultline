/* THE WORKBOOK'S OWN CHECKS, TESTED AGAINST ITS ROWS (14 November, docs/WORKBOOKS.md — "reading a checks sheet as the workbook's own
 * tests"). A well-kept workbook carries a sheet that checks itself: how many rows each table holds, whether the data is fresh, a figure
 * or two it expects the reports to show, and what is wrong on purpose. Luna read it as a small table with odd headings. This reads it
 * as what it is — a list of  label → value  lines — and tests every line it can against sums over the rows:
 *   NOT FINE   a line whose own word says so (FAIL, STALE, ERROR, WARNING, MISMATCH …) — said first;
 *   AGREES     a number the rows give too (to 0.005%, a count exactly): a table's rows, the rows a flag marks, the rows with no reason,
 *              a sum of a column — over everything, the latest whole week, the four weeks to it, or a week the line itself dates — on
 *              the reports' basis and on every row; the latest date in a table;
 *   CLOSE      within 0.5% — said with both figures;
 *   A RATIO    a percentage that is one column over another (to 0.006 of a point), tried only where another figure on the line agreed;
 *   CANNOT     a figure the rows do not give as they stand — the workbook works it by its own formulas; said, and asked about;
 *   FINE · NOTED   counted, not listed.
 * A line that names a sheet and says it is intended ("the trend sheet shows #N/A on purpose") answers the first look's own warning about that
 * sheet's error cells. Agreeing is not being right: it says the rows add up to what the workbook's own check says, and what it was
 * matched with is always said. A match is by value, so only counts of 10 or more and sums of 100 or more are matched. Pure but for `run`. */
import type { SheetProfile, WorkbookProfile } from './read';
import type { Filter, Query, QueryResult } from './query';
import { WEEKDAYS, weekEnd } from './week';

type Run = (q: Query) => Promise<QueryResult>;
export type Verdict = 'bad' | 'agrees' | 'close' | 'ratio' | 'cannot' | 'fine' | 'noted';
export interface CheckLine {
  /** What the line (or the figure on it) is called, and the line it is on when that is another name. */
  label: string; of?: string;
  /** As the workbook writes it. */
  value: string;
  verdict: Verdict;
  /** What it agreed with, or was close to, in words — and that figure. */
  with?: string; mine?: number;
}
export interface Checks {
  sheet: string; lines: CheckLine[];
  /** What the workbook says is on purpose, by the sheet it names. */
  intended: { sheet: string; words: string }[];
  said: string;
}
/** A table of rows the checks can be tested against: its sheet, its date, the columns to add up. */
export interface CheckTable { sheet: string; rows: number; date?: string; columns: string[]; flags?: string[]; reason?: string; filters?: Filter[] }
export interface CheckContext {
  lead: CheckTable; side: CheckTable[];
  /** Every figure of the lead table is also tried on every row, when its reports leave rows out. */
  basis?: boolean;
  /** The last day of the latest whole week, when the workbook has a week. */
  latestWeekEnd?: number;
  /** A figure as the look writes it. */
  fig: (v: number, column: string) => string;
}

const NAME = /health|check|validat|reconcil|control\s*totals?|integrity|sanity|audit|assur/i;
const BAD = /\b(fail(ed|s|ure)?|stale|errors?|warning|mismatch|broken|missing|out of date|not ok|overdue)\b/i;
const GOOD = /\b(pass(ed|es)?|ok|okay|fresh|good|green|balanced|sane|clean)\b/i;
const INTENDED = /intentional|intended|by design|on purpose|deliberate|expected|known/i;
const HEADING = /^(checks?|tests?|items?|metrics?|measures?|descriptions?|names?|what|rules?|controls?|values?|results?|status|outcome|actual|expected)$/i;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = 86_400_000;
const q = (x: string) => `“${x}”`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const dayMonth = (ms: number): string => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const real = (s: SheetProfile) => s.columns.filter(c => !c.colour && c.type !== 'empty');

/** The sheet that reads as the workbook's own checks — small, a list, and named for it or carrying status words. */
export function checksSheet(p: WorkbookProfile, data: readonly string[]): SheetProfile | undefined {
  const scored = p.sheets.filter(s => s.read && !data.includes(s.name) && s.rows >= 2 && s.rows <= 120 && real(s).length >= 2 && real(s).length <= 8 && real(s).some(c => c.counts.text >= 2)).map(s => {
    const words = [...s.above, ...real(s).flatMap(c => [c.named ? c.name : '', ...(c.top ?? []).map(([t]) => t)])];
    const status = words.filter(w => /^\s*(pass(ed)?|fail(ed)?|ok|stale|fresh)\b/i.test(w)).length;
    return { s, score: (NAME.test(s.name) ? 3 : 0) + Math.min(2, status) };
  }).filter(x => x.score >= 2).sort((a, b) => b.score - a.score);
  return scored[0]?.s;
}

interface Row { label: string; cells: string[]; section?: string; row: number }
/** The sheet's lines in sheet order — the first put back when the reader took it for headings; a line with a label and nothing beside
 *  it is a section heading for the lines under it. */
export async function checkRows(run: Run, s: SheetProfile): Promise<Row[]> {
  const cols = real(s).slice(0, 6);
  const lc = [...cols].sort((a, b) => b.counts.text - a.counts.text || a.slot - b.slot)[0];
  const li = cols.indexOf(lc);
  const r = await run({ sheet: s.name, groupBy: cols.map(c => c.name), measures: [{ op: 'count' }], order: { by: 'group' }, limit: 200 });
  const raw = r.groups.map(g => ({ key: g.key.map(k => (k === '(blank)' ? '' : k.trim())), row: Number(/(\d+)$/.exec(g.refs[0] ?? '')?.[1] ?? 0) })).sort((a, b) => a.row - b.row);
  const head = cols.map(c => (c.named ? c.name.trim() : ''));
  const others = head.filter((_, i) => i !== li).filter(Boolean);
  if (s.headerRow > 0 && head[li] && others.length && !HEADING.test(head[li]) && !others.every(o => HEADING.test(o))) raw.unshift({ key: head, row: s.headerRow });
  const out: Row[] = [];
  let section = [...s.above].reverse().find(a => a.length <= 60 && !a.includes(' · ') && a === a.toUpperCase());
  for (const x of raw.slice(0, 50)) {
    const label = x.key[li], cells = x.key.filter((_, i) => i !== li).filter(Boolean);
    if (!label) continue;
    if (!cells.length) { section = label; continue; }
    out.push({ label, cells, ...(section ? { section } : {}), row: x.row });
  }
  return out;
}

interface Fig { name: string; value: number; text: string; pct: boolean }
const DATE_IN = /\b(\d{1,2})[-\s/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s/,]+(\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/i;
/** A date written in words or as the engine writes one — its day, in UTC. */
export function dateIn(text: string): number | undefined {
  const m = DATE_IN.exec(text);
  if (!m) return undefined;
  if (m[4]) return Date.UTC(Number(m[4]), Number(m[5]) - 1, Number(m[6]));
  return Date.UTC(Number(m[3]), ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].toLowerCase()), Number(m[1]));
}
const NUM = /(-|−)?\s?[£$€]?\s?(-|−)?(\d[\d,]*(?:\.\d+)?)\s*(%)?/;
const SEP = /\s+[·|;]\s+|\s+\/\s+/;
/** The figures a line holds: a cell that is a number, or the named numbers of a sentence ("Efficiency 92.5% · Packs 412,300"). */
export function figuresOf(label: string, cells: readonly string[]): Fig[] {
  const out: Fig[] = [];
  for (const cell of cells) {
    if (dateIn(cell) !== undefined) continue;
    const segs = cell.split(SEP).map(x => x.trim()).filter(Boolean);
    const got: (Fig & { at: number })[] = [];
    for (const [at, whole] of segs.entries()) {
      /* a note after the number — "−£1,200.50 (all re-worked)" — is not part of it */
      const seg = whole.replace(/(\d%?)\s*\([^()]*\)\s*$/, '$1');
      const m = new RegExp(`^(.*?)[\\s:=]*(${NUM.source})\\s*$`).exec(seg);
      if (!m) continue;
      const value = Number(m[5].replace(/,/g, '')) * (m[3] || m[4] ? -1 : 1);
      if (!Number.isFinite(value)) continue;
      const name = m[1].replace(/[\s:=(-]+$/, '').trim();
      /* a number at the end of words that are not its name ("check entries 3 of 4") is left alone */
      if (name.length > 40 || /\d/.test(name.slice(-3))) continue;
      got.push({ name, value, text: m[2].trim().replace(/\s+/g, ''), pct: !!m[6], at });
    }
    if (got.length && got.every(g => !g.name) && segs.length > 1) {
      /* unnamed figures side by side take their names from the label, place for place: "All time / Last 4 wks / This period", or the
         bracket of "Capacity used (production / labour / downtime)" */
      const br = /^(.*?)\(([^()]*)\)\s*$/.exec(label);
      const inner = br ? br[2].split(SEP).map(x => x.trim()).filter(Boolean) : [];
      const names = inner.length === segs.length ? inner.map(x => `${br?.[1].trim()} — ${x}`) : label.split(SEP).map(x => x.replace(/^.*:\s*/, '').trim()).filter(Boolean);
      if (names.length === segs.length) for (const g of got) g.name = names[g.at];
    }
    out.push(...got.map(({ at: _a, ...g }) => { void _a; return g; }));
  }
  return out;
}

interface Known { value: number; what: string; count?: boolean; basis?: boolean }
interface Window { name: string; cols: { column: string; value: number }[]; basis: boolean }

/** The workbook's own checks, each tested against the rows — or nothing when no sheet reads as its checks. */
export async function checksOf(p: WorkbookProfile, run: Run, raw: Run, s: SheetProfile, ctx: CheckContext): Promise<Checks | undefined> {
  const rows = await checkRows(run, s);
  if (rows.length < 2) return undefined;
  const num = (v: number | string | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  /* ---- what the rows give: counts, sums over each window, the latest dates ---- */
  const known: Known[] = [];
  const windows: Window[] = [];
  for (const x of p.sheets) if (x.read && x.rows >= 10 && x.name !== s.name) known.push({ value: x.rows, what: `the rows of ${q(x.name)}`, count: true });
  for (const f of (ctx.lead.flags ?? []).slice(0, 4)) {
    const r = await raw({ sheet: ctx.lead.sheet, filters: [{ column: f, op: 'eq', value: 1 }], measures: [{ op: 'count' }] });
    known.push({ value: r.rowsMatched, what: `the rows ${q(f)} marks on ${q(ctx.lead.sheet)}`, count: true });
  }
  for (const t of [ctx.lead, ...ctx.side]) if (t.reason) {
    const r = await raw({ sheet: t.sheet, groupBy: [t.reason], measures: [{ op: 'count' }], limit: 200 });
    const none = r.groups.filter(g => /^(\(blank\)|0|-+|n\/?a|none|unknown|unclassified|unassigned)$/i.test(g.key[0].trim())).reduce((n, g) => n + g.rows, 0);
    if (none) known.push({ value: none, what: `the rows of ${q(t.sheet)} with no reason given`, count: true });
  }
  const spans: { name: string; from?: number; to?: number }[] = [{ name: 'over everything' }];
  const wk = ctx.latestWeekEnd;
  if (wk !== undefined) spans.push({ name: `over the week to ${dayMonth(wk)}`, from: wk - 6 * DAY, to: wk }, { name: `over the four weeks to ${dayMonth(wk)}`, from: wk - 27 * DAY, to: wk });
  if (p.week) for (const r of rows) {
    const d = dateIn(`${r.label} ${r.cells.join(' ')}`);
    if (d === undefined || !/week|\bw\/?[ce]\b|\bwc\b|window|period/i.test(`${r.label} ${r.section ?? ''}`)) continue;
    const end = weekEnd(d, p.week.ends);
    if (!spans.some(x => x.to === end && x.from === end - 6 * DAY) && spans.length < 6) spans.push({ name: `over the week to ${dayMonth(end)}`, from: end - 6 * DAY, to: end });
  }
  const between = (t: CheckTable, sp: { from?: number; to?: number }): Filter[] | null => (sp.from === undefined ? [] : t.date ? [{ column: t.date, op: 'between', from: isoDay(sp.from), to: isoDay(sp.to as number) }] : null);
  for (const sp of spans) {
    for (const [t, variants] of [[ctx.lead, ctx.basis ? ['basis', 'every'] : ['']] as const, ...ctx.side.map(x => [x, ['']] as const)]) {
      const when = between(t, sp);
      if (!when || !t.columns.length) continue;
      for (const v of variants) {
        const ask = v === 'every' ? raw : run;
        const r = await ask({ sheet: t.sheet, filters: when, measures: t.columns.map(c => ({ op: 'sum' as const, column: c })) });
        const tail = `${sp.name}${v === 'basis' ? ', on the reports’ basis' : v === 'every' ? ', on every row' : ''}`;
        const cols = t.columns.map((c, i) => ({ column: c, value: num(r.totals[i]) })).filter((x): x is { column: string; value: number } => x.value !== null);
        for (const c of cols) known.push({ value: c.value, what: `${q(c.column)} on ${q(t.sheet)} ${tail}`, basis: v !== 'every' });
        if (sp.from !== undefined || v) known.push({ value: r.rowsMatched, what: `the rows of ${q(t.sheet)} ${tail}`, count: true, basis: v !== 'every' });
        if (t === ctx.lead && v !== 'every') windows.push({ name: tail, cols, basis: true });
      }
    }
  }
  const latest: { ms: number; what: string }[] = [];
  for (const t of [ctx.lead, ...ctx.side]) if (t.date) {
    const r = await raw({ sheet: t.sheet, measures: [{ op: 'max', column: t.date }] });
    const ms = typeof r.totals[0] === 'string' ? dateIn(r.totals[0]) : undefined;
    if (ms !== undefined) latest.push({ ms, what: `the latest ${q(t.date)} on ${q(t.sheet)}` });
  }

  /* ---- each line judged ---- */
  const shown = (f: Fig): string => (/[£$€%,]/.test(f.text) ? f.text.replace(/^-/, '−') : `${f.value < 0 ? '−' : ''}${Math.abs(f.value).toLocaleString('en-GB', { maximumFractionDigits: 4 })}${f.pct ? '%' : ''}`);
  const words = (name: string): string[] => name.toLowerCase().split(/[^a-z0-9£]+/).filter(w => w.length >= 3);
  const shares = (label: string, what: string): number => { const w = what.toLowerCase(); return words(label).filter(x => w.includes(x) || w.includes(x.replace(/s$/, ''))).length; };
  const match = (f: Fig, label: string): { verdict: 'agrees' | 'close'; k: Known; d: number } | null => {
    const v = Math.abs(f.value), whole = Number.isInteger(f.value);
    let best: { verdict: 'agrees' | 'close'; k: Known; rank: number; d: number } | null = null;
    for (const k of known) {
      const kv = Math.abs(k.value);
      let verdict: 'agrees' | 'close' | null = null;
      const d = Math.abs(v - kv);
      if (k.count) { if (whole && v >= 10 && v === kv) verdict = 'agrees'; }
      else if (v >= 100 && kv >= 100) verdict = d <= Math.max(0.01, kv * 5e-5) ? 'agrees' : d <= kv * 5e-3 ? 'close' : null;
      if (!verdict) continue;
      /* an exact match before a near one; the reports' basis before every row; a name the line shares with the column */
      const rank = (verdict === 'agrees' ? 0 : 100) + (k.basis === false ? 10 : 0) - 3 * Math.min(3, shares(label, k.what)) + (k.count ? 1 : 0) + (verdict === 'close' ? d / kv : 0);
      if (!best || rank < best.rank) best = { verdict, k, rank, d };
    }
    return best;
  };
  const ratio = (pct: number, where: Window[]): { a: string; b: string; w: Window; av: number; bv: number } | null => {
    for (const w of where) for (const a of w.cols) for (const b of w.cols) {
      if (a === b || b.value <= 0 || a.value <= 0) continue;
      if (Math.abs((a.value / b.value) * 100 - pct) <= 0.006) return { a: a.column, b: b.column, w, av: a.value, bv: b.value };
    }
    return null;
  };
  const lines: CheckLine[] = [], intended: Checks['intended'] = [];
  for (const r of rows) {
    const text = `${r.label} ${r.cells.join(' ')}`;
    if (INTENDED.test(`${text} ${r.section ?? ''}`)) {
      const sheet = p.sheets.find(x => x.name.length >= 3 && x.name !== s.name && new RegExp(`(^|[^A-Za-z0-9_])${x.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`, 'i').test(text));
      if (sheet) { intended.push({ sheet: sheet.name, words: text.slice(0, 180) }); lines.push({ label: r.label, value: r.cells.join(' · ').slice(0, 120), verdict: 'noted' }); continue; }
    }
    const status = r.cells.join(' ');
    if (BAD.test(status)) { lines.push({ label: r.label, value: status.slice(0, 80), verdict: 'bad' }); continue; }
    const date = r.cells.map(dateIn).find(d => d !== undefined);
    if (date !== undefined && !figuresOf(r.label, r.cells).length) {
      const hit = latest.filter(l => l.ms === date).sort((a, b) => shares(r.label, b.what) - shares(r.label, a.what))[0];
      lines.push({ label: r.label, value: r.cells.join(' ').slice(0, 60), verdict: hit ? 'agrees' : 'noted', ...(hit ? { with: hit.what } : {}) });
      continue;
    }
    const figs = figuresOf(r.label, r.cells);
    if (!figs.length) { lines.push({ label: r.label, value: status.slice(0, 80), verdict: GOOD.test(status) ? 'fine' : 'noted' }); continue; }
    const judged = figs.map(f => ({ f, m: f.pct ? null : match(f, f.name || r.label) }));
    /* TWO PARTS OF ONE FIGURE: neighbours on a line that neither agree alone but add up nearer to something the rows give than either
       does (a variance written as its two halves) are said together */
    for (let i = 0; i + 1 < judged.length; i += 1) {
      const a = judged[i], b = judged[i + 1];
      if (a.f.pct || b.f.pct || a.m?.verdict === 'agrees' || b.m?.verdict === 'agrees' || !a.f.name || !b.f.name) continue;
      const sum: Fig = { name: `${a.f.name} + ${b.f.name}`, value: a.f.value + b.f.value, pct: false, text: '' };
      const m = match(sum, `${a.f.name} ${b.f.name} ${r.label}`);
      if (!m || [a.m, b.m].some(x => x && x.d <= m.d)) continue;
      sum.text = /£/.test(a.f.text) ? `${sum.value < 0 ? '-' : ''}£${Math.abs(sum.value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
      judged.splice(i, 2, { f: sum, m });
    }
    /* a percentage is tried as one column over another — first over the window another figure on the line agreed in */
    const agreedIn = windows.filter(w => judged.some(j => j.m?.k.what.endsWith(w.name)));
    const tryIn = agreedIn.length ? agreedIn : windows.filter(w => /over everything|over the week to/.test(w.name)).slice(0, 2);
    for (const j of judged) {
      const f = j.f, label = f.name || r.label, of = f.name ? { of: r.label } : {};
      const pct = f.pct ? f.value : !Number.isInteger(f.value) && f.value > 0 && f.value < 1.5 && !j.m ? f.value * 100 : null;
      if (j.m) lines.push({ label, ...of, value: shown(f), verdict: j.m.verdict, with: j.m.k.what, mine: j.m.k.value });
      else if (pct !== null) {
        const hit = ratio(pct, tryIn);
        lines.push(hit ? { label, ...of, value: shown(f), verdict: 'ratio', with: `${q(hit.a)} ÷ ${q(hit.b)} ${hit.w.name}`, mine: (hit.av / hit.bv) * 100 } : { label, ...of, value: shown(f), verdict: f.pct ? 'cannot' : 'noted' });
      } else lines.push({ label, ...of, value: shown(f), verdict: Math.abs(f.value) >= 100 ? 'cannot' : 'noted' });
      const last = lines[lines.length - 1];
      if (last.verdict === 'cannot' && f.pct && Math.abs(f.value) < 1) last.verdict = 'noted';
    }
  }

  /* ---- in words ---- */
  const one = (l: CheckLine): string => `${q(l.label)} ${l.value}`;
  const of = (v: Verdict) => lines.filter(l => l.verdict === v);
  const bad = of('bad'), agree = [...of('agrees'), ...of('ratio')], close = of('close'), cannot = of('cannot'), rest = of('fine').length + of('noted').length;
  const pence = (l: CheckLine): string => { const v = l.mine as number; return `${v < 0 ? '−' : ''}${/£/.test(l.value) ? '£' : ''}${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
  const more = (n: number, cap: number) => (n > cap ? ` and ${n - cap} more` : '');
  const parts = [`${q(s.name)} reads as the workbook’s own checks — ${plural(lines.length, 'line')}.`];
  if (bad.length) parts.push(`By its own word, not fine: ${bad.slice(0, 5).map(l => `${q(l.label)} — ${q(l.value)}`).join('; ')}${more(bad.length, 5)}.`);
  if (agree.length) parts.push(`Tested against the rows, ${agree.length === 1 ? 'one agrees' : `${agree.length} agree`}: ${agree.slice(0, 8).map(l => `${one(l)} (${l.verdict === 'ratio' ? 'the same as ' : ''}${l.with})`).join('; ')}${more(agree.length, 8)}.`);
  if (close.length) parts.push(`Close, not equal: ${close.slice(0, 4).map(l => `${one(l)} against ${pence(l)} (${l.with})`).join('; ')}${more(close.length, 4)}.`);
  if (cannot.length) parts.push(`${cannot.length === 1 ? 'One figure' : `${cannot.length} figures`} I cannot make from the rows as they stand: ${cannot.slice(0, 8).map(one).join('; ')}${more(cannot.length, 8)} — the workbook works ${cannot.length === 1 ? 'it' : 'them'} by its own formulas. Tell me how one is made and I will work it the same way.`);
  if (rest) parts.push(`${plural(rest, 'more line')} ${agree.length || cannot.length || close.length ? 'I did not test' : 'could not be tested against the rows'}${of('fine').length ? ` (${of('fine').length} say${of('fine').length === 1 ? 's' : ''} all is well)` : ''}.`);
  if (agree.length) parts.push('Agreeing means the rows add up to what the workbook’s own check says — not that either is right.');
  return { sheet: s.name, lines, intended, said: parts.join(' ') };
}

export { WEEKDAYS };
