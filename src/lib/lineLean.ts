/* A LINE AS A LEAN PAGE (docs/LEAN-PAGE.md; docs/BLUEPRINT.md Stage 3 — the
 * line is the hub) — the tiles and the closing line the line's page
 * (screens/ProductionLineScreen) and the line report (lib/lineReportPdf) both
 * say, read from the line's own readings: its problems (lib/lineWork
 * lineProblems), its programs (lib/lineRecords lineKit), its products
 * (lib/lineProducts), its stops timed the last four weeks, and a day of it in
 * margin (lib/lineLoss lineDay — the one cost model Your factory's tile and
 * the stage gate's money read). Nothing is worked out here.
 *
 * Only the abnormal carries colour: the late and the critical red, a product
 * failing red and one with gaps amber; the counts of work stay neutral. A
 * day of the line it cannot price says what to give, never a blank. */
import { fmtGBP } from './cost';
import type { LeanTile, LeanTone } from './lean';
import type { LineDay } from './lineLoss';
import type { LineProducts } from './lineProducts';
import { productsNext } from './lineProducts';

export interface LineReading {
  name: string;
  problems: { open: number; late: number; critical: number };
  programs: { n: number; proved: number; late: number };
  products: LineProducts;
  stops: { n: number; minutes: number; worst?: string };
  day: Pick<LineDay, 'margin' | 'missing'>;
  jobs: number;
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

export function lineTiles(r: LineReading): LeanTile[] {
  const { problems: p, programs: g, products: d, stops: s } = r;
  const red = [p.late ? `${p.late} late` : '', p.critical ? `${p.critical} critical` : ''].filter(Boolean);
  return [
    { k: 'Problems open', v: String(p.open), of: p.open ? (red.length ? and(red) : 'none late') : 'nothing open on the line', ...(red.length ? { tone: 'r' as LeanTone } : {}) },
    g.n
      ? { k: 'Programs proved', v: `${g.proved}`, of: `of ${g.n}${g.late ? ` · ${g.late} past its test day` : ''}`, ...(g.late ? { tone: 'r' as LeanTone } : {}) }
      : { k: 'Programs proved', v: '—', of: 'no program planned on the line' },
    d.rows.length
      ? { k: 'Products ready', v: String(d.ready), of: `of ${d.rows.length}${[d.failing ? ` · ${d.failing} failing` : '', d.withGaps ? ` · ${d.withGaps} with gaps` : ''].join('')}`, ...(d.failing ? { tone: 'r' as LeanTone } : d.withGaps ? { tone: 'a' as LeanTone } : {}) }
      : { k: 'Products ready', v: '—', of: 'no product yet — plan a program or a line standard for one' },
    s.n
      ? { k: 'Stops timed', v: `${Math.round(s.minutes)} min`, of: `lost in ${s.n} ${plural(s.n, 'stop')}, the last four weeks${s.worst ? ` — the ${s.worst} most` : ''}` }
      : { k: 'Stops timed', v: '0', of: 'none the last four weeks' },
    r.day.margin != null
      ? { k: 'A day of the line', v: fmtGBP(r.day.margin), of: `of margin — its speed × its shifts × its margin a pack${r.jobs ? ` · ${r.jobs} ${plural(r.jobs, 'project')} on it` : ''}` }
      : { k: 'A day of the line', v: '—', of: `give ${and(r.day.missing ?? [])} in Your factory` },
  ];
}

/** The closing line: what is open on it, its products and programs, the
 *  first thing to do for them, and what a day of it is worth. */
export function lineClosing(r: LineReading): { text: string; tone: LeanTone } {
  const { problems: p, programs: g, products: d } = r;
  const red = [p.late ? `${p.late} late` : '', p.critical ? `${p.critical} critical` : ''].filter(Boolean);
  const open = p.open ? `${p.open} ${plural(p.open, 'problem')} open${red.length ? ` — ${and(red)}` : ''}` : 'no problem open';
  const prods = d.rows.length ? `; ${d.ready} of ${d.rows.length} ${plural(d.rows.length, 'product')} ready` : '';
  const next = productsNext(d);
  const progs = g.n > g.proved ? `; ${g.n - g.proved} ${plural(g.n - g.proved, 'program')} to prove${g.late ? `, ${g.late} late` : ''}` : '';
  const worth = r.day.margin != null ? `; a day of it is worth ${fmtGBP(r.day.margin)} of margin` : '';
  return {
    text: `${r.name}: ${open}${prods}${next ? ` (${next})` : ''}${progs}${worth}.`,
    tone: p.late || p.critical || g.late || d.failing ? 'r' : d.withGaps || p.open ? 'a' : 'g',
  };
}
