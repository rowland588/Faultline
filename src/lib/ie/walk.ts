/* THE BOTTLENECK WALK — docs/CAPACITY.md §3 (Roser, Lorentzen and Deuse,
 * 2015; in use at Bosch as "the bottleneck walk").
 *
 * Walk the line and note each station: working, STARVED (waiting for its
 * input), BLOCKED (cannot pass its output on), or down. A blocked station
 * points downstream — the bottleneck is after it; a starved one points
 * upstream — it is before it. The bottleneck is where the arrows meet. One
 * walk is the bottleneck of the moment; walked again and again at random
 * moments (a work sampling study whose "people" are the stations) the taps
 * give the picture over a shift — and the shifting bottleneck. No clock, no
 * calculation on the floor: the arithmetic is here.
 *
 * Its use beside the sums (lib/capacity): the walked bottleneck agreeing with
 * the calculated one is the proof; disagreeing says the speeds typed are
 * wrong, or stops — not speed — hold the line. */
import type { Tap } from '../study';
import { tapsOf } from './sampling';

export const WALK_STATES = ['working', 'starved', 'blocked', 'down'] as const;
/** Under this many walks the bottleneck is not yet said. */
export const TOO_FEW_WALKS = 5;

export interface WalkStation {
  name: string;
  walks: number;
  working: number;
  starved: number;
  blocked: number;
  down: number;
  /** Which way it points: the bottleneck is after it (blocked), before it
   *  (starved), or it points neither way. */
  points: 'after' | 'before' | 'neither';
}
export interface WalkVerdict {
  stations: WalkStation[];
  /** The walks counted — moments every station was tapped at. */
  walks: number;
  /** The walked bottleneck, when the arrows meet on one station. */
  bottleneck?: string;
  /** When the arrows meet between two stations with nothing between. */
  between?: [string, string];
  sentence: string;
  /** Against the sums: agree, disagree, or not yet said. */
  against?: 'agrees' | 'disagrees';
}

const share = (k: number, n: number) => (n ? Math.round((k / n) * 100) : 0);

export function walkVerdict(stations: string[], taps: Tap[], calculated?: string): WalkVerdict {
  const kept = tapsOf(taps);
  const moments = new Set(kept.map(t => t.at));
  const walks = [...moments].filter(m => stations.every(s => kept.some(t => t.at === m && t.who === s))).length;
  const rows: WalkStation[] = stations.map(name => {
    const mine = kept.filter(t => t.who === name);
    const c = (a: string) => mine.filter(t => t.activity === a).length;
    const r = { name, walks: mine.length, working: c('working'), starved: c('starved'), blocked: c('blocked'), down: c('down') };
    return { ...r, points: r.blocked > r.starved ? 'after' as const : r.starved > r.blocked ? 'before' as const : 'neither' as const };
  });
  if (walks < TOO_FEW_WALKS) {
    return { stations: rows, walks, sentence: walks ? `Too early — ${walks} walk${walks === 1 ? '' : 's'}, ${TOO_FEW_WALKS} before the bottleneck is said.` : 'Not walked yet.' };
  }
  /* Where the arrows meet: after the last station that points after (blocked)
     and before the first one after it that points before (starved). */
  let lastAfter = -1;
  for (let i = 0; i < rows.length; i++) if (rows[i]?.points === 'after') lastAfter = i;
  let firstBefore = rows.length;
  for (let i = rows.length - 1; i > lastAfter; i--) if (rows[i]?.points === 'before') firstBefore = i;
  const inside = rows.slice(lastAfter + 1, firstBefore);
  let bottleneck: string | undefined, between: [string, string] | undefined;
  if (inside.length === 1) bottleneck = inside[0]?.name;
  else if (inside.length > 1) {
    /* more than one station between the arrows: the one least often starved or blocked */
    const pick = [...inside].sort((a, b) => (a.starved + a.blocked) / Math.max(1, a.walks) - (b.starved + b.blocked) / Math.max(1, b.walks))[0];
    bottleneck = pick?.name;
  } else if (lastAfter >= 0 && firstBefore < rows.length) between = [rows[lastAfter]?.name ?? '', rows[firstBefore]?.name ?? ''];
  const b = rows.find(r => r.name === bottleneck);
  let sentence: string;
  if (b) {
    const before = rows.slice(0, rows.indexOf(b)), after = rows.slice(rows.indexOf(b) + 1);
    const why = [
      b.starved + b.blocked === 0 ? `${b.name} was never starved or blocked` : `${b.name} was starved or blocked ${share(b.starved + b.blocked, b.walks)}% of the time`,
      before.length ? `the stations before it were mostly blocked` : '',
      after.length ? `the stations after it mostly starved` : '',
    ].filter(Boolean).join(', ');
    sentence = `Walked ${walks} times: ${why} — the bottleneck is ${b.name}`;
  } else if (between) sentence = `Walked ${walks} times: the bottleneck is between ${between[0]} and ${between[1]} — walk again to see which`;
  else sentence = `Walked ${walks} times: no station points the way yet — every one is working or down as often as not; walk again`;
  let against: WalkVerdict['against'];
  if (calculated && bottleneck) {
    against = calculated === bottleneck ? 'agrees' : 'disagrees';
    sentence += against === 'agrees' ? ', as the sums say.' : `; the sums say ${calculated} — check the speeds typed, or stops not speed hold the line.`;
  } else sentence += '.';
  return { stations: rows, walks, ...(bottleneck ? { bottleneck } : {}), ...(between ? { between } : {}), sentence, ...(against ? { against } : {}) };
}
