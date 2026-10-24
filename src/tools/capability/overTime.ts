/* CAPABILITY ACROSS PRODUCTS AND OVER TIME (FC-101, W2; knowledge/specs/FC-086-charts.md §7): a line's
 * capability studies side by side — a row for each product (else the machine, else the study's name), a
 * column for each month, each cell the latest study's figure and verdict. Reads the studies that exist; it
 * adds no record and no arithmetic of its own — every cell is what `sample`/`sampleSays` says of that study. */
import type { ToolStudy } from '../../lib/study';
import { sample, sampleSays, CPK_FROM } from './sample';

export type CellTone = 'g' | 'a' | 'r' | 'n';
export interface OverTimeCell { text: string; verdict: string; tone: CellTone; studies: number; id: string }
export interface OverTimeRow { who: string; cells: Record<string, OverTimeCell>; latest: OverTimeCell }
export interface OverTime { months: { key: string; label: string }[]; rows: OverTimeRow[] }

const monthOf = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const labelOf = (key: string): string => new Date(`${key}-15T12:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
const big = (n: number): string => n.toLocaleString('en-GB');

/** The figure a cell shows for one study, by its kind — the same words the study's own page leads with. */
export function cellFigure(s: ToolStudy): { text: string; verdict: string; tone: CellTone } | undefined {
  const a = s.agreed?.readings;
  if (!a) return undefined;
  const f = sample(a, s.facts.readings ?? []), said = sampleSays(f, a);
  if (!f.n) return undefined;
  const tone = said.tone as CellTone;
  if (a.kind === 'rejects' && f.runs) return { text: `${(f.runs.p * 100).toFixed(2)}% rejected`, verdict: said.verdict, tone };
  if (a.kind === 'faults' && f.faults) return { text: `${(f.faults.dpu * 100).toFixed(1)} per 100`, verdict: said.verdict, tone };
  if (a.kind === 'rate' && f.rate) return { text: `${f.rate.met} of ${f.n} met`, verdict: said.verdict, tone };
  if (a.kind === 'ticks' && f.ticks) return { text: `${f.ticks.bad.length} failed in ${f.n}`, verdict: said.verdict, tone };
  if (f.n >= CPK_FROM && f.ppk !== undefined && Number.isFinite(f.ppk)) return { text: `Ppk ${f.ppk.toFixed(2)}`, verdict: said.verdict, tone };
  return { text: `${big(f.n)} reading${f.n === 1 ? '' : 's'}`, verdict: said.verdict, tone };
}

/** The table, or nothing when fewer than two capability studies say anything. */
export function overTime(studies: ToolStudy[]): OverTime | undefined {
  const done = studies.filter(s => s.tool === 'capability' && !s.deletedAt).flatMap(s => { const c = cellFigure(s); return c ? [{ s, c }] : []; });
  if (done.length < 2) return undefined;
  const keys = [...new Set(done.map(d => monthOf(d.s.startedAt)))].sort();
  const who = (s: ToolStudy) => s.product?.trim() || s.machine?.trim() || s.name.trim() || 'Not named';
  const names = [...new Set(done.map(d => who(d.s)))].sort((x, y) => x.localeCompare(y));
  const rows: OverTimeRow[] = names.map(name => {
    const mine = done.filter(d => who(d.s) === name).sort((x, y) => x.s.startedAt - y.s.startedAt);
    const cells: Record<string, OverTimeCell> = {};
    for (const k of keys) {
      const inMonth = mine.filter(d => monthOf(d.s.startedAt) === k);
      const last = inMonth[inMonth.length - 1];
      if (last) cells[k] = { ...last.c, studies: inMonth.length, id: last.s.id };
    }
    const last = mine[mine.length - 1];
    return { who: name, cells, latest: { ...last.c, studies: mine.length, id: last.s.id } };
  });
  return { months: keys.map(key => ({ key, label: labelOf(key) })), rows };
}

/** One sentence under the table: how many products, how many months, which are not capable now. */
export function overTimeSays(t: OverTime): string {
  const bad = t.rows.filter(r => r.latest.tone === 'r');
  const p = t.rows.length, m = t.months.length;
  return `${p} ${p === 1 ? 'product or machine' : 'products and machines'} over ${m} month${m === 1 ? '' : 's'} — ${bad.length ? `${bad.map(r => r.who).join(', ')} ${bad.length === 1 ? 'is' : 'are'} not capable in the latest study` : 'none is failing in the latest study'}.`;
}
