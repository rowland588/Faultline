/* THE SAME WORKBOOK, NEXT TIME (13 November, docs/WORKBOOKS.md — "the same workbook next month: what changed"). A production manager
 * opens the same report every week. What matters the second time is what MOVED since the first — and whether the figures already
 * read were quietly changed.
 *
 * Every first look leaves a SNAPSHOT (a few dozen numbers: the lead figure's total, each month, each split's groups) on the file's
 * record in the register. When a workbook is read whose lead sheet has the same name and nearly the same headings as one read before
 * — for the same customer, never another's — the two snapshots are compared:
 *   the rows       how many more (or fewer);
 *   new months     the months this one holds that the last did not, each with its figure;
 *   restated       a month both hold whole whose figure is not what it was — said with both figures (a late booking, a correction,
 *                  or a different extract; which, the file does not say);
 *   a part month   that is whole now, or further in;
 *   a replaced file (no month in common, or no dates): the totals against each other and, by the split both hold, who moved most.
 * It compares like with like only: when the lead figure is a different column this time, that is said and nothing is compared.
 * No cell of the earlier workbook is needed — it may be on another device, or gone. Pure. */
import { changeOf } from '../data/change';
import type { Group } from './query';

export interface SnapMonth { key: string; label: string; days: number; part: boolean; value: number | null }
export interface LookSnap {
  at: number; name: string; fileId: string;
  sheet: string; rows: number; headings: string[];
  headline: string; total: number | null;
  months: SnapMonth[];
  splits: { dim: string; groups: { key: string; value: number }[] }[];
}

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
const mon = (m: SnapMonth): string => m.label.split(' ')[0];
const plural = (n: number, one: string, many = `${one}s`) => `${Math.abs(n).toLocaleString('en-GB')} ${Math.abs(n) === 1 ? one : many}`;
const q = (x: string) => `“${x}”`;

/** Is `now` the same report as `prev`, read again: the lead sheet of the same name, and four in five of the headings the same. */
export function sameReport(prev: Pick<LookSnap, 'sheet' | 'headings' | 'fileId'>, now: Pick<LookSnap, 'sheet' | 'headings' | 'fileId'>): boolean {
  if (prev.fileId === now.fileId || norm(prev.sheet) !== norm(now.sheet)) return false;
  const a = new Set(prev.headings.map(norm)), b = now.headings.map(norm);
  if (b.length < 3 || a.size < 3) return false;
  return b.filter(x => a.has(x)).length >= Math.min(a.size, b.length) * 0.8;
}
/** The snapshot to compare with: the newest earlier one that is the same report. */
export const lastOf = (earlier: readonly LookSnap[], now: LookSnap): LookSnap | undefined =>
  [...earlier].filter(s => s.at < now.at && sameReport(s, now)).sort((a, b) => b.at - a.at)[0];

const dayOf = (at: number): string => { const d = new Date(at); return `${d.getUTCDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()]}`; };
const groups = (gs: { key: string; value: number }[]): Group[] => gs.map(g => ({ key: [g.key], values: [g.value], rows: 0, refs: [] }));

/** What changed since the last time this report was read — the paragraphs, in order; empty when nothing can be compared. `fig` writes a
 *  figure of the lead column as the first look writes it. */
export function sinceLast(prev: LookSnap, now: LookSnap, fig: (v: number) => string): string[] {
  const head = `Since ${q(prev.name)}, read on ${dayOf(prev.at)}`;
  if (norm(prev.headline) !== norm(now.headline)) return [`${head}: that time I led with ${q(prev.headline)} and this time with ${q(now.headline)}, so the two are not compared — say which one to use and I will read both by it.`];
  const out: string[] = [];
  const dr = now.rows - prev.rows;
  const was = new Map(prev.months.map(m => [m.key, m]));
  const fresh = now.months.filter(m => !was.has(m.key));
  const both = now.months.filter(m => was.has(m.key));
  const gone = prev.months.filter(m => !now.months.some(x => x.key === m.key));
  const first: string[] = [`${head}: ${dr === 0 ? 'the same number of rows' : `${plural(dr, 'row')} ${dr > 0 ? 'more' : 'fewer'}`} on ${q(now.sheet)} (${prev.rows.toLocaleString('en-GB')} then, ${now.rows.toLocaleString('en-GB')} now).`];
  if (fresh.length) first.push(`New: ${fresh.map(m => `${mon(m)}${m.part ? ` (part, ${plural(m.days, 'day')})` : ''} ${m.value === null ? 'nothing recorded' : fig(m.value)}`).join(', ')}.`);
  if (gone.length) first.push(`No longer in it: ${gone.map(mon).join(', ')}.`);
  out.push(first.join(' '));

  /* the months both hold: a part month that has filled in is expected to move; a WHOLE month that moved was restated */
  const filled: string[] = [], restated: string[] = [];
  for (const m of both) {
    const p = was.get(m.key) as SnapMonth;
    if (m.value === null || p.value === null) continue;
    const d = m.value - p.value;
    if (p.part) { if (m.days !== p.days || Math.abs(d) >= 0.5) filled.push(`${mon(m)} was ${plural(p.days, 'day')} in at ${fig(p.value)} and is ${m.part ? `${plural(m.days, 'day')} in` : 'whole'} now at ${fig(m.value)}`); }
    else if (Math.abs(d) >= 0.5) restated.push(`${mon(m)} was ${fig(p.value)} and is ${fig(m.value)} now (${d > 0 ? '+' : '−'}${fig(Math.abs(d))})`);
  }
  if (filled.length) out.push(`${filled.join('; ')}.`);
  if (restated.length) out.push(`Figures already read have CHANGED: ${restated.join('; ')}. A whole month does not move by itself — a late booking, a correction or a different extract; the file does not say which. Worth asking before either number is quoted.`);
  else if (both.some(m => !(was.get(m.key) as SnapMonth).part)) out.push(`The whole months both hold read the same as before — nothing already reported has been changed.`);

  /* a file that replaces the last one (no month in common, or no dates at all): the totals, and who moved most on a split both hold */
  if (!both.length && prev.total !== null && now.total !== null) {
    const fields = now.splits.map(s => ({ s, p: prev.splits.find(x => norm(x.dim) === norm(s.dim)) })).filter((x): x is { s: LookSnap['splits'][number]; p: LookSnap['splits'][number] } => !!x.p)
      .map(x => ({ field: x.s.dim, before: groups(x.p.groups), after: groups(x.s.groups) }));
    const c = changeOf({ before: prev.total, after: now.total }, fields);
    const m1 = c.best?.movers[0];
    out.push(`${q(now.headline)} was ${fig(prev.total)} in that file and is ${fig(now.total)} in this one${c.change ? ` — ${c.change > 0 ? '+' : '−'}${fig(Math.abs(c.change))}` : ' — no change'}.${c.change && m1 && c.best ? ` The biggest mover is ${m1.key} on ${q(c.best.field)}: ${m1.change > 0 ? '+' : '−'}${fig(Math.abs(m1.change))}${m1.onlyIn === 'after' ? ' (not in the last file)' : m1.onlyIn === 'before' ? ' (not in this file)' : ''}.` : ''}`);
  }
  return out;
}
