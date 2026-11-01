/* ACCUMULATION BETWEEN MACHINES — how long a buffer holds, how fast it comes back, what a stop longer than it costs
 * (FC-046; knowledge/specs/FC-046-accumulation.md; knowledge/methods/capacity/accumulation-buffer.md; docs/CAPACITY.md §4).
 *
 * A buffer adds no speed; it buys time. Three numbers say whether it is the right size for the stops the line really has:
 *
 *   cover      what can collect between a neighbour and the bottleneck ÷ the bottleneck's own speed — a stop SHORTER than
 *              this is absorbed and costs the bottleneck nothing
 *   recovery   the same units ÷ how much faster the neighbour runs than the bottleneck — how long until the buffer is
 *              back, ready for the next stop (a stop in a part-empty buffer meets less cover)
 *   a longer stop   (t − cover) minutes of the bottleneck not running = (t − cover) × its speed in packs, × what a pack
 *              earns (the one cost model — knowledge/MONEY.md, T: a minute lost AT the bottleneck is a minute of the line)
 *
 * and the buffer the neighbour's USUAL LONG stop would need: its 90th percentile (nearest rank, 5 stops wanted) × the
 * bottleneck's speed. The weakest link is the smallest cover against its neighbour's stops.
 *
 * This reads what Line capacity keeps — each station's "can collect after" (Station.bufferAfter), the speeds, the V — and the
 * stops the floor timed in Capture on each machine. It changes nothing (Line capacity's own `accumulation` sentence about the
 * TYPICAL stop is left as it was) and asks nothing new. Changeovers are planned stops of the whole line, not a neighbour's:
 * a buffer does not absorb them, so they are left out of the stops here. Nothing reads a machine.
 *
 * Approximations said on the page: the refill runs at the slowest speed the product meets between the stopped station and
 * the bottleneck, less the bottleneck's own; one stopped station, every other running (a second stop in a part-empty
 * buffer is the recovery's reason, not worked out). Pure. */
import type { Observation } from '../../types';
import { isChangeoverStop, isWaiting, ownSpeed, type CapacityResult, type Station } from './capacity';
import { fmtN } from './capacityWords';

/** Stops wanted before a buffer is sized from their 90th percentile — fewer is a guess. */
export const MIN_STOPS = 5;

const norm = (s: string) => s.trim().toLowerCase();

/** Each station's OWN stops over a window, one length (minutes) per stop, longest last — waiting (starved or blocked by a
 *  neighbour) and changeovers left out. A row that counts several stops (a tally with its minutes) is that many stops of its mean. */
export function stopLengths(obs: readonly Observation[], stations: readonly Station[], from: number, to: number): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const s of stations) out[s.id] = [];
  const key = (s: Station) => norm(s.asset?.trim() || s.name);
  for (const o of obs) {
    if (o.deletedAt || !(o.durationMs > 0) || o.startedAt < from || o.startedAt >= to) continue;
    if (isWaiting(o) || isChangeoverStop(o)) continue;
    const st = stations.find(s => key(s) && key(s) === norm(o.asset || ''));
    if (!st) continue;
    const n = Math.min(500, Math.max(1, Math.round(o.count || 1)));
    const each = o.durationMs / 60_000 / n;
    for (let i = 0; i < n; i++) out[st.id].push(each);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a - b);
  return out;
}

/** The 90th percentile by nearest rank: the ⌈0.9 n⌉-th of the stops sorted. Undefined for none. */
export function p90(sorted: readonly number[]): number | undefined {
  if (!sorted.length) return undefined;
  return sorted[Math.min(sorted.length, Math.max(1, Math.ceil(0.9 * sorted.length))) - 1];
}

export interface BufferIn {
  /** Each station's own stop lengths in the window (stopLengths), by station id. */
  lengths?: Record<string, number[]>;
  /** What a pack earns at the bottleneck (the line's contribution a pack) — absent: the money is named as missing. */
  contributionPerPack?: number;
  /** The planned running minutes in the same window — for the usual gap between a station's stops. Absent: not said. */
  plannedMin?: number;
}

export interface BufferRow {
  id: string;
  index: number;
  name: string;
  side: 'before' | 'after';
  /** What can collect between it and the bottleneck, in the line's unit (0: nothing written). */
  units: number;
  /** Minutes of the bottleneck's work that covers. */
  coverMin: number;
  /** How much faster than the bottleneck the stopped station runs on refilling, line unit a minute. */
  gapPerMin?: number;
  /** Minutes until the buffer is back; undefined when it is no faster than the bottleneck. */
  recoveryMin?: number;
  /** Its own stops in the window (changeovers and waiting left out). */
  stops: number;
  typicalMin?: number;
  /** The 90th percentile of its stops, when MIN_STOPS or more. */
  p90Min?: number;
  absorbed: number;
  passed: number;
  /** Minutes the bottleneck was starved or blocked by the stops that ran past the cover. */
  lostMin: number;
  lostUnits: number;
  lostPounds?: number;
  /** What the buffer would hold to cover the 90th percentile, line unit. */
  needUnits?: number;
  /** About how often it stops: minutes between its stops. */
  betweenMin?: number;
  /** Back before the next stop? Undefined when not both known. */
  refills?: boolean;
  tone: 'n' | 'a';
  /** This row in words, for the page. */
  says: string;
}

export interface BufferView {
  unit: string;
  bottleneck: string;
  /** The bottleneck's own speed, line unit a minute. */
  pace: number;
  /** Any "can collect after" is written. */
  written: boolean;
  rows: BufferRow[];
  /** The whole in a few sentences — what to read first. */
  sentence: string;
  /** The money, or the one thing to give for it. */
  money?: string;
  /** What to give to say more. */
  missing: string[];
  /** One line for the paper, from the same rows. */
  paper?: string;
  tone: 'n' | 'a';
}

const mins = (m: number) => `${fmtN(Math.round(m * 10) / 10)} min`;
const big = (n: number) => Math.round(n).toLocaleString('en-GB');
const gbp = (n: number) => `£${n >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(2)}`;
const lower = (s: string) => (/^op\s/i.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const nameOf = (x: { station: Station; index: number }) => x.station.name.trim() || `Station ${x.index + 1}`;

/** Every station beside the bottleneck that has stops logged or something written to collect after it, as a buffer reads it.
 *  Undefined when the line has no bottleneck or no speed to cover against. */
export function bufferView(r: CapacityResult, input: BufferIn = {}): BufferView | undefined {
  const lim = r.limit;
  if (!lim || !r.ok.length) return undefined;
  const pace = ownSpeed(lim);
  if (!(pace > 0)) return undefined;
  const at = r.ok.findIndex(x => x.station.id === lim.station.id);
  const unit = r.unit;
  const ln = nameOf(lim);
  const written = r.ok.some(x => (x.station.bufferAfter ?? 0) > 0);
  const between = (a: number, b: number) => r.ok.slice(a, b).reduce((u, x) => u + (x.station.bufferAfter ?? 0) * x.factor, 0);
  const cost = input.contributionPerPack;
  const rows: BufferRow[] = [];
  r.ok.forEach((x, i) => {
    if (i === at) return;
    const list = input.lengths?.[x.station.id] ?? [];
    const side: BufferRow['side'] = i < at ? 'before' : 'after';
    const units = side === 'before' ? between(i, at) : between(at, i);
    if (!written ? list.length === 0 : units <= 0 && list.length === 0) return;
    const name = nameOf(x);
    const coverMin = units / pace;
    /* the refill runs at the slowest speed the product meets from the stopped station to the bottleneck (before), or at the
       stopped station's own (after: it drains what the bottleneck sent while it stood), less the bottleneck's */
    const speeds = side === 'before' ? r.ok.slice(i, at).map(ownSpeed) : [ownSpeed(x)];
    const gap = Math.min(...speeds) - pace;
    const recoveryMin = units > 0 && gap > 1e-9 ? units / gap : undefined;
    const stops = list.length;
    const typicalMin = stops ? list.reduce((a, b) => a + b, 0) / stops : undefined;
    const q = stops >= MIN_STOPS ? p90(list) : undefined;
    const absorbed = list.filter(t => t <= coverMin + 1e-9).length;
    const passed = stops - absorbed;
    const lostMin = written ? list.reduce((a, t) => a + Math.max(0, t - coverMin), 0) : 0;
    const lostUnits = lostMin * pace;
    const lostPounds = cost != null && lostUnits > 0 ? lostUnits * cost : undefined;
    const needUnits = q != null ? q * pace : undefined;
    const planned = input.plannedMin;
    const betweenMin = planned != null && planned > 0 && stops > 0 ? Math.max(0, planned - list.reduce((a, b) => a + b, 0)) / stops : undefined;
    const refills = recoveryMin != null && betweenMin != null ? recoveryMin <= betweenMin : undefined;
    const word = side === 'before' ? 'starves' : 'blocks';
    const parts: string[] = [];
    if (!written) parts.push(`Nothing is written down as collecting between the ${lower(name)} and ${ln}, so a stop of the ${lower(name)} ${word} ${ln} at once.`);
    else if (units <= 0) parts.push(`Nothing can collect between the ${lower(name)} and ${ln} — a stop of the ${lower(name)} ${word} ${ln} at once.`);
    else {
      parts.push(`What can collect between the ${lower(name)} and ${ln} (${big(units)} ${unit}) holds ${mins(coverMin)} of ${ln}’s work — a stop of the ${lower(name)} shorter than that costs ${ln} nothing.`);
      parts.push(recoveryMin != null
        ? `After a stop it takes ${mins(recoveryMin)} to ${side === 'before' ? 'refill' : 'clear'}, the ${lower(name)} running ${fmtN(Math.round(gap * 10) / 10)} ${unit} a minute faster than ${ln}.`
        : `The ${lower(name)} runs no faster than ${ln}, so once run down the buffer does not come back.`);
    }
    if (stops > 0 && written && units > 0) {
      parts.push(passed === 0
        ? `All ${stops} of its logged stops (longest ${mins(list[stops - 1])}) were absorbed.`
        : `Of its ${stops} logged stops ${absorbed} were absorbed and ${passed} ran past the cover: ${ln} was ${side === 'before' ? 'starved' : 'blocked'} for ${mins(lostMin)} — ${big(lostUnits)} ${unit}${lostPounds != null ? `, ${gbp(lostPounds)}` : ''}.`);
    } else if (stops > 0 && written) {
      parts.push(`Its ${stops} logged stops took ${mins(list.reduce((a, b) => a + b, 0))} off ${ln} — ${big(list.reduce((a, b) => a + b, 0) * pace)} ${unit}${cost != null ? `, ${gbp(list.reduce((a, b) => a + b, 0) * pace * cost)}` : ''}.`);
    }
    if (needUnits != null && q != null && written) parts.push(`To cover its usual long stop (${mins(q)}, the 90th percentile of ${stops}) the buffer would hold ${big(needUnits)} ${unit}${needUnits > units + 1e-9 ? ` — ${big(needUnits - units)} more than it does` : ' — it already does'}.`);
    else if (stops > 0 && stops < MIN_STOPS && written) parts.push(`Only ${stops} stop${stops === 1 ? '' : 's'} logged — ${MIN_STOPS} are wanted before a buffer is sized from them.`);
    if (refills === false && betweenMin != null && recoveryMin != null) parts.push(`It stops about every ${mins(betweenMin)} and the buffer takes ${mins(recoveryMin)} to come back: it is never full again before the next stop. The margin, not the buffer, is the fix.`);
    else if (refills === true && betweenMin != null) parts.push(`It stops about every ${mins(betweenMin)}, so the buffer is back before the next stop.`);
    const tone: 'n' | 'a' = written && (passed > 0 || refills === false) ? 'a' : 'n';
    rows.push({
      id: x.station.id, index: x.index, name, side, units, coverMin,
      ...(gap > 1e-9 ? { gapPerMin: gap } : {}), ...(recoveryMin != null ? { recoveryMin } : {}),
      stops, ...(typicalMin != null ? { typicalMin } : {}), ...(q != null ? { p90Min: q } : {}),
      absorbed, passed, lostMin, lostUnits, ...(lostPounds != null ? { lostPounds } : {}),
      ...(needUnits != null ? { needUnits } : {}), ...(betweenMin != null ? { betweenMin } : {}), ...(refills != null ? { refills } : {}),
      tone, says: parts.join(' '),
    });
  });

  const totalLostMin = rows.reduce((a, b) => a + b.lostMin, 0), totalLostUnits = rows.reduce((a, b) => a + b.lostUnits, 0);
  const totalPounds = cost != null && rows.some(x => x.lostPounds != null) ? rows.reduce((a, b) => a + (b.lostPounds ?? 0), 0) : undefined;
  const logged = rows.reduce((a, b) => a + b.stops, 0), passedAll = rows.reduce((a, b) => a + b.passed, 0);
  const weakest = [...rows].filter(x => x.stops > 0 || x.units > 0).sort((a, b) => a.coverMin - b.coverMin)[0];
  let sentence = '';
  if (!rows.length) sentence = '';
  else if (!written) sentence = `Nothing is written down as collecting between the stations — a stop next to ${ln} stops ${ln}. Write down what can collect after each (a conveyor, a table) to see how long it holds, how fast it comes back and which stops it absorbs.`;
  else {
    const head = logged
      ? passedAll === 0 ? `Every logged stop beside ${ln} (${logged}) is absorbed by what can collect.`
        : `${passedAll} of the ${logged} logged stops beside ${ln} ran past what can collect: ${ln} was starved or blocked for ${mins(totalLostMin)} — ${big(totalLostUnits)} ${unit}${totalPounds != null ? `, ${gbp(totalPounds)}` : ''}.`
      : `No stops are logged on the machines beside ${ln} in the window — the cover and the recovery below are the buffer's alone.`;
    const cov = weakest ? ` The weakest link is the ${lower(weakest.name)}: it holds ${mins(weakest.coverMin)}${weakest.recoveryMin != null ? ` and takes ${mins(weakest.recoveryMin)} to come back` : ''}.` : '';
    sentence = head + cov;
  }
  const missing: string[] = [];
  if (written && totalLostUnits > 0 && cost == null) missing.push('Give the line a margin a pack (Set up the line) to say what the starved minutes cost.');
  if (written && rows.some(x => x.stops > 0) && input.plannedMin == null) missing.push('Give the planned hours a week on the sheet to say whether the buffer is back before the next stop.');
  const money = written && totalLostUnits > 0
    ? totalPounds != null ? `A minute lost at ${ln} is a minute of the line: ${big(totalLostUnits)} ${unit} not made, ${gbp(totalPounds)} of contribution if it cannot be made up.` : undefined
    : undefined;
  const tone: 'n' | 'a' = rows.some(x => x.tone === 'a') ? 'a' : 'n';
  const paper = rows.length && written
    ? `${weakest ? `weakest link the ${lower(weakest.name)}: holds ${mins(weakest.coverMin)}${weakest.recoveryMin != null ? `, back in ${mins(weakest.recoveryMin)}` : ''}` : ''}${logged ? `; ${passedAll} of ${logged} logged stops ran past it${totalLostUnits > 0 ? ` — ${big(totalLostUnits)} ${unit}${totalPounds != null ? `, ${gbp(totalPounds)}` : ''}` : ''}` : ''}`.replace(/^; /, '')
    : undefined;
  return { unit, bottleneck: ln, pace, written, rows, sentence, ...(money ? { money } : {}), missing, ...(paper ? { paper } : {}), tone };
}
