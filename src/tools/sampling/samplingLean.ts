/* WORK SAMPLING AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 6) — the tiles and
 * the closing line its page (screens/SamplingScreen) and its paper say, read
 * from lib/ie/sampling: the taps, the moments answered and missed, and the
 * biggest share that is not the work (samplingWorst) — in money too: that
 * share of the shift × one person's rate (the line's wage × its on-costs,
 * lib/cost — the one cost model), what their time spent so costs a shift.
 * A bottleneck walk watches stations, not people: no labour figure is put on
 * it. Grey throughout, as the module says: what is too much waiting is the
 * team's to say on its fishbone. Nothing is worked out here but the share ×
 * the hours × the rate. */
import { burdenOf } from '../../lib/cost';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { AgreedSampling, Tap } from '../../lib/study';
import { missedPrompts, nextPrompt, roundsDone, samplingWorst, tapsOf, TOO_FEW_TAPS, worstWords } from './sampling';

const pct = (f: number): string => `${Math.round(f * 100)}%`;
const gbp = (n: number): string => `£${n >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(2)}`;

/** One person's rate an hour from the line's own facts, or nothing. */
export const personRate = (w?: { labourRatePerHour?: number; labourBurden?: number }): number | undefined =>
  w?.labourRatePerHour && w.labourRatePerHour > 0 ? w.labourRatePerHour * burdenOf(w) : undefined;

/** What the biggest share not the work costs a shift: share × the shift's hours × one person's rate. */
export function worstCost(a: AgreedSampling, taps: Tap[], rate?: number): { who: string; activity: string; share: number; hours: number; cost?: number } | undefined {
  const w = samplingWorst(a, taps);
  if (!w || a.walk) return undefined;
  const hours = Math.max(0, (a.to - a.from) / 3_600_000);
  return { who: w.who, activity: w.activity, share: w.share, hours, ...(rate !== undefined && hours > 0 ? { cost: w.share * hours * rate } : {}) };
}

/** Where the moments stand at `t` — answered, come, missed, the next — for the tiles. */
export function momentsAt(a: AgreedSampling, taps: Tap[], t: number): { done: number; come: number; missed: number; next?: string; over: boolean } {
  const next = nextPrompt(a.prompts, t);
  return { done: roundsDone(a.prompts, taps, a.who), come: a.prompts.filter(p => p <= t).length,
    missed: Math.max(0, ...a.who.map(w => missedPrompts(a.prompts, taps, w, t).length)),
    ...(next ? { next: new Date(next).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } : {}), over: t >= a.to };
}

export function samplingTiles(a: AgreedSampling, taps: Tap[], at: { done: number; come: number; missed: number; next?: string; over: boolean }, rate?: number): LeanTile[] {
  const n = tapsOf(taps).length;
  const w = samplingWorst(a, taps);
  const c = worstCost(a, taps, rate);
  const who = a.walk ? 'stations' : 'people';
  return [
    { k: 'Taps', v: String(n), of: `${at.done} of ${at.come} moment${at.come === 1 ? '' : 's'} so far answered${at.missed ? ` · ${at.missed} missed` : ''}`, ...(at.missed ? { tone: 'a' as LeanTone } : {}) },
    { k: a.walk ? 'Stations' : 'People', v: String(a.who.length), of: `${who} watched · ${a.prompts.length} moments in the shift` },
    w ? { k: 'Biggest share not the work', v: pct(w.share), of: `${w.who} ${w.activity} (±${Math.round(w.margin * 100)} points, from ${w.n} taps)` }
      : { k: 'Biggest share not the work', v: '—', of: `said once ${TOO_FEW_TAPS} taps a person are in` },
    a.walk ? { k: 'Next moment', v: at.next ?? '—', of: at.next ? 'the phone asks then' : at.over ? 'the shift is over' : 'no moments left' }
      : c?.cost !== undefined ? { k: 'What it costs', v: gbp(c.cost), of: `a shift — ${c.who} ${c.activity} ${pct(c.share)} of ${+c.hours.toFixed(2)} h at ${gbp(rate as number)} an hour` }
      : { k: 'What it costs', v: '—', of: c ? 'give the line its wage and on-costs on the Factory’s Lines page' : 'said once the biggest share is' },
    a.walk ? { k: 'Missed', v: String(at.missed), of: at.missed ? 'moments gone with no tap' : 'none', ...(at.missed ? { tone: 'a' as LeanTone } : {}) }
      : { k: 'Next moment', v: at.next ?? '—', of: at.next ? 'the phone asks then' : at.over ? 'the shift is over' : 'no moments left' },
  ];
}

/** THE CLOSING LINE — the biggest share not the work, and what it costs a shift. */
export function samplingClosing(a: AgreedSampling, taps: Tap[], said: { text: string }, rate?: number): { text: string; tone: LeanTone } {
  const w = samplingWorst(a, taps), c = worstCost(a, taps, rate);
  if (!w) return { text: said.text, tone: 'n' };
  return { text: `${worstWords(w)}${c?.cost !== undefined ? ` — ${gbp(c.cost)} of their time a shift` : ''}.`, tone: 'n' };
}
