/* YOUR FACTORY AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 5b) — the tiles and
 * the closing line Your factory's page and its paper say, read from the
 * factory's own reading (lib/factoryReport), so the page and the paper say
 * one thing. Nothing about a line is worked out here.
 *
 * The tiles: the lines (and how many have a job on them), the problems open
 * on them (the work, neutral), the late (red), the critical (only when there
 * is one) — and the money: what a day of the factory is worth in margin,
 * every line's own speed × its shifts less their breaks × its margin a pack
 * (lib/lineLoss lineDay, the one cost model the stage gate's money reads),
 * so a day any line stands is said in pounds. A line with something unsaid
 * is named with what to give; never a blank, never a guess. */
import { fmtGBP } from './cost';
import type { FactoryReading } from './factoryReport';
import type { LeanTile, LeanTone } from './lean';

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
/* Two named, then how many more — a big factory's tile stays a tile. */
const named = (xs: string[]) => (xs.length > 2 ? `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more` : and(xs));

export function factoryTiles(r: FactoryReading): LeanTile[] {
  const n = r.rows.length, withJobs = r.rows.filter(x => x.jobs.length).length;
  const critical = r.rows.reduce((s, x) => s + x.critical, 0);
  const priced = r.rows.filter(x => x.margin != null);
  const margin = priced.reduce((s, x) => s + (x.margin as number), 0);
  const missing = r.rows.filter(x => x.margin == null).map(x => `${x.name}: ${and(x.missing ?? [])}`);
  return [
    { k: 'Lines', v: String(n), of: withJobs ? `${withJobs} with a job on ${withJobs === 1 ? 'it' : 'them'}` : 'none with a job on it yet' },
    { k: 'Problems open', v: String(r.open), of: r.open ? `on ${r.rows.filter(x => x.open).length} of the ${n} ${plural(n, 'line')}` : 'none on any line' },
    { k: 'Late', v: String(r.late), of: r.late ? 'problems past their day' : 'nothing past its day', tone: r.late ? 'r' : 'n' },
    ...(critical ? [{ k: 'Critical', v: String(critical), of: 'open — stopping a line', tone: 'r' as LeanTone }] : []),
    priced.length
      ? { k: 'A day of the factory', v: fmtGBP(margin), of: `of margin — every line’s speed × its shifts × its margin a pack${missing.length ? ` · ${named(missing.map(x => x.split(':')[0]))} not priced yet` : ''}` }
      : { k: 'A day of the factory', v: '—', of: n ? `give ${named(missing)} in Your factory` : 'no line yet' },
  ];
}

/** The closing line: what is open and where the worst of it is, and what a
 *  day of the factory is worth — what the floor can say to the business. */
export function factoryClosing(r: FactoryReading): { text: string; tone: LeanTone } {
  const n = r.rows.length;
  if (!n) return { text: 'No lines yet — add your production lines, each with its name and its type.', tone: 'n' };
  const critical = r.rows.reduce((s, x) => s + x.critical, 0);
  const worst = [...r.rows].filter(x => x.late || x.critical).sort((a, b) => b.critical - a.critical || b.late - a.late)[0];
  const priced = r.rows.filter(x => x.margin != null);
  const margin = priced.reduce((s, x) => s + (x.margin as number), 0);
  const open = r.open ? `${r.open} ${plural(r.open, 'problem')} open${[r.late ? `${r.late} late` : '', critical ? `${critical} critical` : ''].filter(Boolean).length ? ` — ${and([r.late ? `${r.late} late` : '', critical ? `${critical} critical` : ''].filter(Boolean))}` : ''}` : 'no problem open';
  const where = worst ? `, the most on ${worst.name}` : '';
  const worth = priced.length ? `; a day of ${priced.length === n ? 'the factory' : `${priced.length} of its ${n} lines`} is worth ${fmtGBP(margin)} of margin` : '';
  return {
    text: `${n} ${plural(n, 'line')}, ${open}${where}${worth}.`,
    tone: r.late || critical ? 'r' : r.open ? 'n' : 'g',
  };
}
