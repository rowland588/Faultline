/* A STAGE-GATE JOB AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 3) — the tiles
 * and the closing line the job's front page (ui/Verdict), its one-page status
 * and its full client report (lib/clientReportPdf) all say, from the figures
 * the job already works out (lib/standing, lib/critical, lib/fixTone,
 * lib/onTarget). Nothing is worked out here.
 *
 * The tiles: the handover (days to it, or past it, or how it went), what is
 * late of what is still to do, the critical problems (and the high risks
 * under them), the fixes open (and how many are late), and the money — what
 * the slip costs: the days the handover has moved × a day of the job's lines
 * not making (lib/lineLoss linesDay), or, on time, what a day late would
 * cost. "Since you last looked" is the front page's own line (lib/since) — a
 * report is read by someone who has not looked. */
import type { LeanTile, LeanTone } from './lean';
import type { OnTarget } from './onTarget';
import { niceDay } from './weeks';
import { fmtGBP } from './cost';
import type { LinesDay } from './lineLoss';
import { daysLate } from './standing';

export interface JobFigures {
  daysToGo?: number;
  handedOver?: boolean;
  handedVs?: number;
  outstanding: number;
  late: number;
  /** The day the job is expected to be handed over. */
  handoverOn?: string;
  critical: number;
  risks: number;
  fixesOpen: number;
  fixesLate: number;
  /** How far the expected handover has moved from the agreed (lib/standing): positive is late. */
  slipDays?: number;
  /** A day of the job's lines not making (lib/lineLoss linesDay); absent
   *  when the job's lines were not read. */
  day?: LinesDay;
  /** THE REGISTER'S PROBLEMS FOR THE JOB, NOT ON IT YET (lib/clientReport
   *  assignedToJob) — open ones, how many critical. Walkthrough, 25 October:
   *  Line 2 A had five open problems filed to it (four high) and its band and
   *  both papers said "Critical 0 — none open" and "Fixes open 0", with no word
   *  of them. A critical one is counted with the critical; the rest are said
   *  under it. Absent when the register was not read. */
  assigned?: { open: number; critical: number };
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/** The Critical tile: the job's own critical problems with the register's
 *  critical ones for it; the high risks, and the register's other open
 *  problems for it, said beneath. */
function criticalTile(x: JobFigures): LeanTile {
  const crit = x.critical + (x.assigned?.critical ?? 0);
  const others = x.assigned ? x.assigned.open - x.assigned.critical : 0;
  const under = [
    x.risks ? `${x.risks} high ${plural(x.risks, 'risk')} as well` : '',
    others > 0 ? `${others} more ${plural(others, 'problem')} open for it` : '',
  ].filter(Boolean).join(' · ');
  return { k: 'Critical', v: String(crit), of: under || (crit ? 'problems that stop the project' : 'none open'),
    ...(crit ? { tone: 'r' as LeanTone } : x.risks || others > 0 ? { tone: 'a' as LeanTone } : {}) };
}

/** Drop the fifth tile when it only tells you to fill in the Factory’s Lines page (B4). */
export function omitPlaceholderMoney(tiles: LeanTile[]): LeanTile[] {
  const m = tiles[tiles.length - 1];
  if (m?.v === '—' && m.of?.includes('give ') && m.of.includes('Lines page')) return tiles.slice(0, -1);
  return tiles;
}

/** Tiles for a surface. On Now and gate pages, a placeholder money tile is omitted (B4). */
export function stageGateTiles(x: JobFigures, surface: 'now' | 'page' | 'full' = 'full'): LeanTile[] {
  const day = x.handoverOn ? niceDay(x.handoverOn) : '';
  const handover: LeanTile = x.handedOver
    ? x.handedVs != null
      ? { k: 'Handed over', v: String(Math.abs(x.handedVs)), of: `${plural(Math.abs(x.handedVs), 'day')} ${x.handedVs < 0 ? 'early' : 'late'}`, tone: x.handedVs > 0 ? 'r' : 'g' }
      : { k: 'Handed over', v: 'Done', of: 'every machine handed over', tone: 'g' }
    : x.daysToGo != null
      ? { k: 'Handover', v: String(Math.abs(x.daysToGo)), of: `${plural(Math.abs(x.daysToGo), 'day')} ${x.daysToGo < 0 ? 'past handover' : 'to handover'}${day ? ` · ${day}` : ''}`, ...(x.daysToGo < 0 ? { tone: 'r' as LeanTone } : {}) }
      : { k: 'Handover', v: '—', of: 'no handover date agreed yet' };
  const tiles: LeanTile[] = [
    handover,
    { k: 'Late', v: String(x.late), of: x.outstanding ? `of ${x.outstanding} still to do${x.late ? ' — past their day' : ', none past its day'}` : 'nothing left to do',
      ...(x.late ? { tone: 'r' as LeanTone } : x.outstanding ? { tone: 'n' as LeanTone } : { tone: 'g' as LeanTone }) },
    criticalTile(x),
    { k: 'Fixes open', v: String(x.fixesOpen), of: x.fixesLate ? `${x.fixesLate} late` : x.fixesOpen ? 'none late' : 'none open', ...(x.fixesLate ? { tone: 'r' as LeanTone } : {}) },
    moneyTile(x),
  ];
  return surface === 'full' ? tiles : omitPlaceholderMoney(tiles);
}

const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

/** The days late the money is counted on: handed over, the day against the
 *  day agreed; not yet, how far the expected day has moved plus every day
 *  since it passed (lib/standing daysLate). */
const lateBy = (x: JobFigures): number => (x.handedOver ? Math.max(0, x.handedVs ?? 0) : daysLate(x));

/** THE MONEY — what the slip costs, from the factory's own figures. */
export function moneyTile(x: JobFigures): LeanTile {
  const d = x.day;
  if (!d || !d.lines.length) return { k: 'A day late', v: '—', of: 'no line from the Factory on the project yet' };
  if (d.margin == null) return { k: 'A day late', v: '—', of: `give ${and(d.missing)} on the Factory’s Lines page` };
  const names = and(d.priced), late = lateBy(x);
  const rest = d.missing.length ? ` · ${and(d.missing.map(m => m.split(':')[0]))} not priced yet` : '';
  return late > 0
    ? { k: x.handedOver ? 'The late handover cost' : 'The slip costs', v: fmtGBP(late * d.margin), of: `${late} ${plural(late, 'day')} × ${fmtGBP(d.margin)} — a day of ${names} not making, in margin${rest}`, tone: 'r' }
    : { k: 'A day late', v: fmtGBP(d.margin), of: `would cost a day of ${names} not making, in margin${rest}` };
}

/** The closing line: the verdict and its one-line why. `brief` omits the headline word — it is already on the band (U2). */
export function stageGateClosing(v: OnTarget, x?: JobFigures, opts?: { brief?: boolean }): { text: string; tone: LeanTone } {
  const why = v.brief ?? v.reason;
  const late = x ? lateBy(x) : 0, m = x?.day?.margin;
  const cost = late > 0 && m != null ? ` — ${fmtGBP(late * m)} of margin, ${late} ${plural(late, 'day')} of ${and(x?.day?.priced ?? [])} not making` : '';
  const tone: LeanTone = v.tone === 'behind' ? 'r' : v.tone === 'risk' ? 'a' : v.tone === 'on' ? 'g' : 'n';
  if (opts?.brief) {
    const tail = [why, cost.replace(/^ — /, '')].filter(Boolean).join(' — ');
    return { text: tail ? `${tail}.` : '', tone };
  }
  return { text: `${v.word}${why ? ` — ${why}` : ''}${cost}.`.replace(/\.\.$/, '.'), tone };
}
