/* WHAT LINE CAPACITY SAYS — the sentences beside the sums (docs/STEADY.md,
 * S4). The arithmetic is in ./capacity and the formatting in ./capacityWords;
 * this file reads a result and says it: a rate that reads like a time
 * (rateAsTime), a person's pace and whether they keep up (paceSays), the line
 * in one short sentence (shortSays) and what it can make (canMakeWords).
 * Nothing here changes a figure. */
import { PER_MIN_WORD, allowanceOf, pct, perMinute, planPerMinute, type CapacityResult, type Station } from './capacity';
import { cycleWords, fmtBig, fmtDur, fmtN, oneOf } from './capacityWords';
/* ======================== a rate that reads like a time ======================
 * Rowland, 14 October: "counts in pallets, each pallet holds 36 baskets ...
 * 5 ... it says 5 pallets a minute ... well, it isn't ... it takes 5 minutes
 * to do one pallet." A rate many times what reaches the station whose
 * reading as "one every N" is close to it is the time typed in the rate's
 * box. Asked, with the time offered — never changed by itself. */
export interface RateAsTime {
  /** "5 pallets a minute is 1,800 units a minute — 26 times what reaches them." */
  says: string;
  /** "One pallet every 5 minutes?" */
  ask: string;
  /** What "Make it…" puts on the station. */
  cycleSec: number; cycleIn?: 'min';
  /** "a pallet every 5 min" — the button's words. */
  every: string;
}
export function rateAsTime(r: CapacityResult, s: Station, prevUnit?: string): RateAsTime | undefined {
  const a = r.arrivals[s.id];
  const per = s.ratePer ?? 'min';
  if (!a || !(a.perMin > 0) || s.rate == null || !(s.rate > 0) || per === 'hour') return undefined;
  const own = perMinute(s);
  if (own == null || own < a.perMin * 5) return undefined;
  const before = s.speedIn === 'before' && s.contains > 0 && !!prevUnit?.trim();
  const k = before ? s.contains : 1;
  const cycleSec = s.rate * (per === 'min' ? 60 : 1);
  const read = 60 / cycleSec / k;                       // read as one every N, in its own unit a minute
  if (read < a.perMin / 2 || read > a.perMin * 2) return undefined;
  const unit = (before ? (prevUnit as string) : s.unit).trim() || 'units';
  const factor = r.ok.find(x => x.station.id === s.id)?.factor;
  const atLine = factor != null && Math.abs(factor - 1) > 1e-9 ? ` is ${fmtBig(own * factor)} ${r.unit} a minute —` : ' —';
  const who = s.kind === 'people' ? 'them' : 'it';
  const time = per === 'min' ? `${fmtN(s.rate)} ${s.rate === 1 ? 'minute' : 'minutes'}` : `${fmtN(s.rate)} seconds`;
  return {
    says: `${fmtN(s.rate)} ${unit} ${PER_MIN_WORD[per]}${atLine} ${fmtBig(own / a.perMin)} times what reaches ${who}.`,
    ask: `One ${oneOf(unit)} every ${time}?`,
    cycleSec, ...(per === 'min' ? { cycleIn: 'min' as const } : {}),
    every: cycleWords(1, cycleSec, unit),
  };
}

export interface PaceSays {
  /** "A tray reaches them every 6.9 s — 8.75 a minute: Bagger does 70 bags a
   *  minute, 8 to a tray." Absent at the front of the line. */
  arrive?: string;
  /** Whether it keeps up, in seconds for a person: "They take 8 s a tray —
   *  1.1 s too slow: they hold the line back. It needs 2 people to keep up." */
  verdict?: string;
  /** Short of what reaches it. */
  short: boolean;
  /** People needed to keep up with what reaches them, when that is more than
   *  are there. */
  needed?: number;
  /** FED STRAIGHT BY A MACHINE OR A PERSON, nothing collecting between, and
   *  loaded past what a person sustains (docs/CAPACITY.md §1): "Fed straight
   *  by the Bagger with nothing collecting between — loaded to 95%: …". */
  paced?: string;
}

/** HOW FULL A PERSON FED STRAIGHT BY THE STEP BEFORE MAY BE LOADED — what
 *  reaches them over what they can do at their planning pace. A person's
 *  time varies piece to piece and person to person (one operator to another
 *  often 1 : 2 — Johnson, 1981), and fed cycle for cycle with nothing
 *  collecting between they lose the long cycles (machine pacing: Salvendy &
 *  Smith, 1981); the practice loads them to 80–90%, not 100. */
export const PACED_LOAD_MAX = 0.9;

/** WHAT A STATION IS ASKED TO DO, AND WHETHER IT DOES IT — worked out from the
 *  line before it (Rowland, 13 October: "70 a minute. How many go into a
 *  basket? 10. So one basket goes to a human every X"). A person is said in
 *  seconds a piece, the way they are timed; a machine in its rate. */
export function paceSays(r: CapacityResult, s: Station, prevUnit?: string,
  /** The station before it — whether a person is fed straight by it. */
  prev?: Pick<Station, 'name' | 'kind' | 'bufferAfter'>): PaceSays {
  const a = r.arrivals[s.id];
  /* TIMED PER THE UNIT BEFORE — a palletiser per basket: said per basket,
     the pallet beside it (Rowland, 14 October) */
  const before = s.speedIn === 'before' && s.contains > 0 && !!prevUnit?.trim();
  const k = before ? s.contains : 1;
  const one = oneOf(before ? (prevUnit as string) : s.unit);
  const whole = oneOf(s.unit);
  const people = s.kind === 'people';
  const who = people ? 'them' : 'it';
  const arrive = a
    ? (before
      ? `A ${one} reaches ${who} every ${fmtDur(a.everySec / k)} — ${fmtN(a.perMin * k)} a minute; a full ${whole} of ${fmtN(k)} every ${fmtDur(a.everySec)}: ${a.from.name} does ${fmtN(a.from.perMin)} ${a.from.unit} a minute.`
      : `A ${one} reaches ${who} every ${fmtDur(a.everySec)} — ${fmtN(a.perMin)} a minute: ${a.from.name} does ${fmtN(a.from.perMin)} ${a.from.unit} a minute${Math.abs(a.ratio - 1) > 1e-9 ? `, ${fmtN(a.ratio)} to a ${one}` : ''}.`)
    : undefined;
  /* the pace to plan on: a person's timed time with their rest allowance */
  const speed = planPerMinute(s);
  if (speed == null) {
    return { ...(arrive ? { arrive } : {}), verdict: people ? `Time how long one ${one} takes them.` : `Give it its speed to see whether it keeps up.`, short: false };
  }
  const crew = s.crew != null && s.crew > 0 ? s.crew : 1;
  const running = pct(s.runningPct, 1) || 1;
  const does = speed * crew * running;             // its own unit a minute
  const each = 60 / speed / k;                     // one of what it is timed per, one of them, rest in it
  const allow = allowanceOf(s);
  const timedEach = each / (1 + allow);            // as timed or typed
  const unitSaid = before ? (prevUnit as string).trim() : (s.unit.trim() || 'units');
  const takes = `They take ${fmtDur(allow > 0 ? timedEach : each)} a ${one}${crew > 1 ? ` each, ${crew} of them` : ''}${allow > 0 ? ` — ${fmtDur(each)} with ${fmtN(allow * 100)}% rest` : ''}`;
  if (!a) {
    return { verdict: people ? `${takes} — ${fmtN(does * k)} a minute.` : `It does ${fmtN(does * k)} ${unitSaid} a minute.`, short: false };
  }
  const slower = does < a.perMin - 1e-9;
  /* ONLY THE BOTTLENECK HOLDS THE LINE BACK (Rowland, 15 October: "the UI
     logic is massively bad"). A station a little slower than the one feeding
     it makes the one before wait — it is not what limits the line unless it
     is the slowest: the line's, or its own line's when several feed in.
     Red is kept for that one; the rest are said plainly, naming where the
     line is held. */
  const short = slower && r.limit?.station.id === s.id;
  const heldAt = r.limit?.station.name.trim();
  /* a line's own slowest, when several feed in: it holds its own line, not the whole */
  const ownLine = r.lanes?.sections.find(x => x.result.limit?.station.id === s.id && r.limit?.station.id !== s.id);
  const notIt = heldAt && r.limit?.station.id !== s.id
    ? ownLine ? ` — it sets ${ownLine.name}'s pace, but the line as a whole is held at the ${heldAt}` : ` — the line is held at the ${heldAt}, not here`
    : '';
  const needed = Math.ceil(a.perMin / (speed * running) - 1e-9);
  if (!people) {
    return { ...(arrive ? { arrive } : {}), verdict: short ? `It does ${fmtN(does * k)} a minute — holds the line back.`
      : slower ? `It does ${fmtN(does * k)} a minute — a little under what reaches it, so the one before waits${notIt}.`
        : `It does ${fmtN(does * k)} a minute — keeps up${does - a.perMin > 1e-9 ? `, ${fmtN((does - a.perMin) * k)} to spare` : ''}.`, short };
  }
  const gapSec = Math.abs(60 / does - a.everySec) / k;
  const verdict = short
    ? `${takes} — ${fmtDur(gapSec)} too slow: they hold the line back. It needs ${needed} ${needed === 1 ? 'person' : 'people'} to keep up.`
    : slower ? `${takes} — ${fmtDur(gapSec)} slower than what reaches them, so the one before waits${notIt}. To keep up on their own it needs ${needed} ${needed === 1 ? 'person' : 'people'}.`
      : `${takes} — they keep up${gapSec > 0.05 ? `, ${fmtDur(gapSec)} to spare a ${one}` : ''}.`;
  /* FED STRAIGHT, nothing collecting between, loaded past what a person sustains */
  const load = a.perMin / does;
  const paced = prev && !short && !(prev.bufferAfter != null && prev.bufferAfter > 0) && load > PACED_LOAD_MAX + 1e-9
    ? `Fed straight by ${prev.name.trim() || 'the step before'} with nothing collecting between — loaded to ${fmtN(Math.round(load * 100))}% of their pace. A person can’t match ${prev.kind === 'machine' ? 'a machine' : 'another person'} piece for piece: plan them at 80–90%, or let some collect before them.`
    : undefined;
  return { ...(arrive ? { arrive } : {}), verdict, short, ...(short && needed > crew ? { needed } : {}), ...(paced ? { paced } : {}) };
}

/** The finding in a few words, for a list of lines or a page header: "Basketer
 *  limits at 62 bags/min · 4 short of 66". Undefined until something can be
 *  counted. The full sentence is `sentence`; this is the part that fits a row. */
export function shortSays(r: CapacityResult): string | undefined {
  if (!r.limit || r.line == null) return undefined;
  const nm = r.limit.station.name.trim() || `Station ${r.limit.index + 1}`;
  const tgt = r.target == null ? '' : (r.gap as number) > 0 ? ` · ${fmtN(r.gap as number)} short of ${fmtN(r.target)}` : ` · target ${fmtN(r.target)} met`;
  /* several lines have no single "next": each is counted on its own */
  return r.next || r.lanes ? `${nm} limits at ${fmtN(r.line)} ${r.unit}/min${tgt}` : `${nm} runs ${fmtN(r.line)} ${r.unit}/min — add the rest of the line`;
}

/** WHAT THE LINE CAN MAKE, in the words a target sits beside — "can make
 *  100 bags a minute": its limit once stops are counted. A 6M job shows it
 *  under each line's target, so a target far below what the line can make
 *  is seen as one (flow audit #8). Undefined until the line can be worked out. */
export function canMakeWords(r: CapacityResult): string | undefined {
  if (!r.limit || r.line == null) return undefined;
  return `can make ${fmtN(r.line)} ${r.unit} a minute`;
}
