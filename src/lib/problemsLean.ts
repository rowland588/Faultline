/* THE PROBLEMS REGISTER AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 4) — the
 * tiles and the closing line the register's paper prints and its page closes
 * on, read from lib/snagsReport's reading (its counts, its rows), so the
 * page, its chips and its paper say one thing. Nothing is worked out here.
 *
 * The tiles are the register's own counts: open by priority — Critical red,
 * High amber, Low green, always with the word (Rowland's own RAG exception,
 * 12 October, CLAUDE.md) — what is late, and what is done. On the page they
 * are its chips, each a filter, so the page grows no second row; the paper
 * prints them as tiles. Money since 24 October (FC-154): the closing line
 * carries what the open problems that say their minutes cost the line a day
 * (lib/problemCost registerCost) — never a tile with an invented figure.
 *
 * The closing line names the worst open problem — the first critical, else
 * the first late — and where it is: what one side can say to the other. */
import type { LeanTile, LeanTone } from './lean';
import type { SnagsReading } from './snagsReport';

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export function registerTiles(r: SnagsReading): LeanTile[] {
  const c = r.counts, late = c.late + c.jobLate, done = c.closed + c.jobDone;
  return [
    { k: 'Critical', v: String(c.critical), of: c.critical ? `open — stopping a line or a project` : 'none open', tone: c.critical ? 'r' : 'n' },
    { k: 'High', v: String(c.high), of: c.high ? 'open — to put right soon' : 'none open', tone: c.high ? 'a' : 'n' },
    { k: 'Low', v: String(c.low), of: c.low ? 'open' : 'none open', ...(c.low ? { tone: 'g' as LeanTone } : { tone: 'n' as LeanTone }) },
    { k: 'Late', v: String(late), of: late ? 'past the day they were due' : 'nothing past its day', tone: late ? 'r' : 'n' },
    { k: 'Done', v: String(done), of: done ? 'closed or fixed' : 'none closed yet', tone: 'n' },
  ];
}

/** The worst open problem, by the register's own order: critical first, then late. */
function worst(r: SnagsReading): { what: string; where: string; late: boolean; critical: boolean } | undefined {
  const lineRows = r.lines.flatMap(l => l.rows.filter(x => x.status !== 'closed').map(x => ({ what: x.what, where: x.line, late: x.late, critical: x.priority === 'critical' })));
  const jobRows = r.jobs.flatMap(g => g.rows.filter(x => x.open).map(x => ({ what: x.what, where: g.job, late: x.late, critical: x.priority === 'critical' || x.flag === 'critical' })));
  const all = [...lineRows, ...jobRows];
  return all.find(x => x.critical) ?? all.find(x => x.late);
}

export function registerClosing(r: SnagsReading): { text: string; tone: LeanTone } {
  const c = r.counts, open = c.critical + c.high + c.low, late = c.late + c.jobLate;
  if (!open) return { text: c.closed + c.jobDone ? `No problem open — ${c.closed + c.jobDone} put right.` : 'No problems written down yet.', tone: c.closed + c.jobDone ? 'g' : 'n' };
  const w = worst(r);
  const lead = `${open} ${plural(open, 'problem')} open${c.critical ? ` — ${c.critical} critical` : ''}${late ? `${c.critical ? ',' : ' —'} ${late} late` : ''}`;
  /* what the open ones that say their minutes cost the line a day (lib/problemCost, FC-154) — one output after the worst, never the lead */
  const money = r.cost?.words ? ` ${r.cost.words}` : '';
  return {
    text: (w ? `${lead}; the first to put right: “${w.what}” on ${w.where}${w.late ? ', past its day' : ''}.` : `${lead}, none critical or late.`) + money,
    tone: c.critical || late ? 'r' : c.high ? 'a' : 'n',
  };
}
