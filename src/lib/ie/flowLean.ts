/* THE VALUE STREAM AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 6) — its closing
 * line, read from lib/ie/steps (flowFigures). The map's seven cards are its
 * tiles already, coloured as the method colours value (VA green, NE amber,
 * NV red, with the words — Rowland's exception, 11 October), so they stay;
 * the band, the action plan and this line join them. What the waits cost is
 * not said yet (BLUEPRINT §6, Money in every tool): no figure is made up. */
import type { LeanTile, LeanTone } from '../lean';
import type { AgreedMap, FlowStep } from '../study';
import { dur, share, whereOf, whoOf, type FlowFigures } from './steps';

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
  return { text: `${lead}${first}${over}.`, tone: over ? 'r' : 'n' };
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
  ];
}
