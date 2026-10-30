/* THE VALUE STREAM AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 6) — its closing
 * line, read from lib/ie/steps (flowFigures). The map's seven cards are its
 * tiles already, coloured as the method colours value (VA green, NE amber,
 * NV red, with the words — Rowland's exception, 11 October), so they stay;
 * the band, the action plan and this line join them. Since 24 October the
 * money joins them too (FC-001's money, lib/tools/valuestream/steps flowMoney):
 * the labour on waste work a day, and the product waiting — tied up and
 * carried; a missing input named, never a figure made up. */
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { AgreedMap, FlowStep } from '../../lib/study';
import { dur, notClassifiedWords, share, whereOf, whoOf, type FlowFigures, type FlowMoney } from './steps';

/** THE CLOSING LINE — the lead time and its value-added share, and where to
 *  start: the biggest wait; a cycle over takt said in red, where the stream
 *  is limited. */
export function flowClosing(f: FlowFigures, a?: AgreedMap): { text: string; tone: LeanTone } {
  if (!f.steps) return { text: 'No steps yet — walk the line end to end, then the stream says where the time goes.', tone: 'n' };
  const lead = `${f.untimed ? 'At least ' : ''}${dur(f.leadSec)} lead time, ${share(f.pce ?? 0)} of it adding value`;
  const w = f.biggestWait;
  const at = w ? whereOf(w.step, a) ?? whoOf(w.step, a)[0] : undefined;
  const first = w ? ` — start with the biggest wait: ${w.step.name.trim() || 'a step'}${at ? ` (${at})` : ''}, ${dur(w.sec)}` : '';
  const c = f.longestCycle;
  const over = c?.overTakt && f.taktSec ? `; ${c.step.name.trim() || 'a step'} is over takt (${dur(c.sec)} against ${dur(f.taktSec)}) — where the stream is limited` : '';
  /* a step nobody has classified is said here as on the page and on paper — the share that adds value counts only the VA */
  const nudge = f.unmarked ? ` ${notClassifiedWords(f.unmarked)}` : '';
  return { text: `${lead}${first}${over}.${nudge}`, tone: over ? 'r' : 'n' };
}

/** The map's seven cards as the paper's tiles — the same labels and figures
 *  the page's cards say (screens/MapScreen), in the paper's neutral ink. */
export function flowTiles(f: FlowFigures, list: readonly FlowStep[]): LeanTile[] {
  const cycle = list.reduce((t, x) => t + (x.cycleSec ?? 0), 0);
  return [
    { k: 'Lead time', v: `${f.untimed ? '≥ ' : ''}${dur(f.leadSec)}`, of: 'start to customer — every cycle and every wait' },
    { k: 'Adds value', v: dur(f.addsSec), of: `${share(f.pce ?? 0)} of the lead time` },
    { k: 'Necessary', v: dur(f.neededSec), of: 'work that does not add value but must be done' },
    { k: 'Non-value adding', v: dur(f.wasteSec), of: 'wasteful work and every wait', ...(f.wasteSec > 0 ? { tone: 'r' as LeanTone } : {}) },
    { k: 'Cycle time', v: dur(cycle), of: f.taktSec ? `takt ${dur(f.taktSec)}` : 'no takt agreed yet' },
    ...(f.unmarked ? [{ k: 'Not classified', v: `${f.unmarked} step${f.unmarked === 1 ? '' : 's'}`, of: 'in none of VA · NE · NV — the % value added counts only the VA', tone: 'a' as LeanTone }] : []),
  ];
}

/* MONEY — two tiles beside the method's cards (knowledge/specs/FC-001-value-stream-money.md §7) */
const gbp = (n: number): string => (n >= 1000 ? `£${(Math.round(n / 100) / 10).toFixed(1)}k` : `£${Math.round(n).toLocaleString('en-GB')}`);
export function flowMoneyTiles(m: FlowMoney, a?: AgreedMap): LeanTile[] {
  const out: LeanTile[] = [];
  if (m.waste) {
    const w = m.waste, n = `${w.steps} non-value-adding step${w.steps === 1 ? '' : 's'}${w.untimed ? `, ${w.untimed} not timed` : ''}`;
    out.push(w.gbpPerDay !== undefined ? { k: 'Waste work', v: `${gbp(w.gbpPerDay)} a day`, of: `labour on ${n}`, tone: w.gbpPerDay > 0 ? 'a' : 'n' }
      : { k: 'Waste work', v: '—', of: `${n} · ${m.missing.labour ?? ''}`.replace(/ · $/, ''), tone: 'n' });
  }
  if (m.waits.length || m.unpriced) {
    out.push(m.tiedUp !== undefined
      ? { k: 'Waiting product', v: gbp(m.tiedUp), of: `tied up${m.carryPerDay !== undefined ? ` · ${gbp(m.carryPerDay)} a day to carry at ${a?.carryingRatePerYear}%` : ` · ${m.missing.carry ?? ''}`}${m.unpriced ? ` · ${m.unpriced} wait${m.unpriced === 1 ? '' : 's'} not counted` : ''}`, tone: (m.carryPerDay ?? 0) > 0 ? 'a' : 'n' }
      : { k: 'Waiting product', v: '—', of: `${m.waits.length + m.unpriced} wait${m.waits.length + m.unpriced === 1 ? '' : 's'} · ${m.missing.waits ?? ''}`, tone: 'n' });
  }
  return out;
}
