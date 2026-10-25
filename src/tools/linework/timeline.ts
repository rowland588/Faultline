/* THE COMBINATION TABLE AND THE PERSON–MACHINE CHART (FC-007, FC-026;
 * knowledge/specs/FC-032-line-balance.md §3, §6.3–6.4).
 *
 * A person's steps in order, on one time scale, with the machine's own run
 * beside them: manual time solid, walking hatched, waiting hollow, the
 * machine dotted — Toyota's standard work combination table and the ILO's
 * multiple activity chart. A MACHINE step starts when the step before it
 * ends and goes on alongside the person's next steps; two machine steps in a
 * row run one after the other. The cycle is the longer of the person's end
 * and the machine's end, and the gap is somebody waiting — said, not hidden.
 *
 * HOW MANY MACHINES CAN ONE PERSON TEND (synchronous servicing, Freivalds &
 * Niebel ch. 2; Kanawaty): with l the person's load and unload, m the
 * machine's run on its own, w the walk between machines,
 *   N′ = (l + m) ÷ (l + w)
 *   n machines: cycle = max(l + m, n(l + w)); the person idles
 *   cycle − n(l + w); each machine waits cycle − (l + m);
 *   machine-cycles an hour 3,600·n ÷ cycle.
 * It assumes identical machines and a fixed cycle; stops at random are a
 * queueing problem and are NOT claimed (the page says so).
 *
 * Pure: the figures in, the figures and the sentences out; the independent
 * cases are scripts/knowledge/cases-time.py §3–4. */
import type { ElementFigures, PersonFigures } from './balance';
import type { Tone } from '../capability/sample';

export interface Seg { id: string; name: string; kind: ElementFigures['kind']; start: number; end: number; sec: number; source: ElementFigures['source'] }

export interface Timeline {
  segs: Seg[];
  /** When the person's own last step ends, and when the machine's last run ends. */
  personEnd: number;
  machineEnd: number;
  /** The longer of the two — the cycle. */
  cycle: number;
  /** What the person waits for the machine at the end of their steps. */
  personWaits: number;
  /** What the machine waits for the person (it finished before they did). */
  machineWaits: number;
  /** The machine's own run in the cycle. */
  auto: number;
}

/** One person's steps laid on the clock. A step with no time counts as nothing here — the balance says
 *  it is not timed, and claims nothing. */
export function runTimeline(els: readonly Pick<ElementFigures, 'id' | 'name' | 'kind' | 'standard' | 'source'>[]): Timeline {
  let c = 0, free = 0, auto = 0;
  const segs: Seg[] = [];
  for (const e of els) {
    const d = e.standard ?? 0;
    if (e.kind === 'machine') {
      const start = Math.max(c, free);
      segs.push({ id: e.id, name: e.name, kind: e.kind, start, end: start + d, sec: d, source: e.source });
      free = start + d; auto += d;
    } else {
      segs.push({ id: e.id, name: e.name, kind: e.kind, start: c, end: c + d, sec: d, source: e.source });
      c += d;
    }
  }
  const cycle = Math.max(c, free);
  return { segs, personEnd: c, machineEnd: free, cycle, personWaits: cycle - c, machineWaits: Math.max(0, c - free), auto };
}

/* ------------------------------------------------------- the combination table */

/** Seconds as the floor says them (one decimal under a minute, else minutes) — the balance's own. */
const secs = (s: number): string => (s < 60 ? `${s.toFixed(1)} s` : `${(s / 60).toFixed(2)} min`);

export interface CombinationRow {
  who: string;
  station?: string;
  tl: Timeline;
  takt?: number;
  /** Over takt by, on the cycle. */
  overBy: number;
  work: number; walk: number;
  says: string;
  tone: Tone;
}

/** Each person who has a machine step, as the combination table draws them. */
export function combination(people: readonly PersonFigures[]): CombinationRow[] {
  return people.filter(p => p.elements.some(e => e.kind === 'machine')).map(p => {
    const tl = runTimeline(p.elements);
    const manual = p.elements.filter(e => e.kind === 'work').reduce((t, e) => t + (e.standard ?? 0), 0);
    const walk = p.elements.filter(e => e.kind === 'walk').reduce((t, e) => t + (e.standard ?? 0), 0);
    const takt = p.takt;
    const over = takt ? Math.max(0, tl.cycle - takt) : 0;
    const machine = p.elements.find(e => e.kind === 'machine')?.name ?? 'the machine';
    const parts: string[] = [`${p.who}: ${secs(tl.cycle)} a cycle${takt ? ` against a ${secs(takt)} takt${over > 0 ? ` — over by ${secs(over)}` : ''}` : ''}`];
    parts.push(`${secs(manual)} of their own work${walk > 0 ? ` and ${secs(walk)} walking` : ''}, and ${machine.toLowerCase()} running ${secs(tl.auto)}${tl.cycle > 0 ? ` (${Math.round((tl.auto / tl.cycle) * 100)}% of the cycle)` : ''}`);
    if (tl.personWaits > 0.05) parts.push(`${p.who} waits ${secs(tl.personWaits)} for the machine`);
    else if (tl.machineWaits > 0.05) parts.push(`the machine is done at ${secs(tl.machineEnd)} and waits ${secs(tl.machineWaits)} for ${p.who}`);
    else parts.push('neither waits for the other');
    const says = parts[0] + ' — ' + parts.slice(1).join('; ') + '.';
    const tone: Tone = over > 0 ? 'r' : tl.personWaits > 0.05 || tl.machineWaits > 0.05 || p.source === 'none' ? 'a' : p.source === 'typed' ? 'n' : 'g';
    return { who: p.who, ...(p.station ? { station: p.station } : {}), tl, ...(takt ? { takt } : {}), overBy: over, work: manual, walk, says, tone };
  });
}

/** What a person's waiting for the machine is in money (MONEY.md, FC-007: L a pack): the seconds × the
 *  rate, and the share of their pay it is. Or the one input it needs. */
export function waitMoney(row: CombinationRow, ratePerHour: number | undefined): { text: string; missing?: string } {
  const w = row.tl.personWaits;
  if (w <= 0.05) return { text: '' };
  if (!(ratePerHour != null && ratePerHour > 0)) return { text: '', missing: 'Give the line an hourly rate in Line capacity to say the waiting in money.' };
  const cost = (w * ratePerHour) / 3600;
  const share = row.tl.cycle > 0 ? w / row.tl.cycle : 0;
  const money = (v: number) => `£${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;
  return { text: `${row.who}’s ${secs(w)} waiting for the machine costs ${money(cost)} a cycle — ${Math.round(share * 100)}% of their pay, ${money(share * ratePerHour)} an hour.` };
}

/* ----------------------------------------------------- how many machines to tend */

export interface TendInput { l: number; m: number; w: number }

export interface TendRow {
  n: number;
  cycle: number;
  perHour: number;
  idle: number;
  machineWaits: number;
  /** £ a machine-cycle: the operator alone, and with the machines when their rate is given. */
  operatorCost?: number;
  allCost?: number;
}

export interface Tend {
  l: number; m: number; w: number;
  nPrime: number;
  rows: TendRow[];
  /** The integers either side of N′. */
  lo: number; hi: number;
  who: string;
}

/** l, m, w from a person's steps: work, machine, walk. Explicit waiting is left out. */
export function tendInput(p: Pick<PersonFigures, 'elements'>): TendInput | undefined {
  const sum = (k: ElementFigures['kind']) => p.elements.filter(e => e.kind === k).reduce((t, e) => t + (e.standard ?? 0), 0);
  const l = sum('work'), m = sum('machine'), w = sum('walk');
  return l > 0 && m > 0 ? { l, m, w } : undefined;
}

export function tend(who: string, i: TendInput, o: { operatorRate?: number; machineRate?: number } = {}): Tend {
  const { l, m, w } = i;
  const nPrime = (l + m) / (l + w);
  const rowOf = (n: number): TendRow => {
    const cycle = Math.max(l + m, n * (l + w));
    return {
      n, cycle, perHour: (3600 * n) / cycle,
      idle: Math.max(0, cycle - n * (l + w)),
      machineWaits: Math.max(0, cycle - (l + m)),
      ...(o.operatorRate != null && o.operatorRate > 0 ? { operatorCost: ((o.operatorRate / 3600) * cycle) / n } : {}),
      ...(o.operatorRate != null && o.operatorRate > 0 && o.machineRate != null && o.machineRate > 0 ? { allCost: (((o.operatorRate + n * o.machineRate) / 3600) * cycle) / n } : {}),
    };
  };
  const hiN = Math.max(2, Math.ceil(nPrime - 1e-9) + 1);
  const rows = Array.from({ length: Math.min(hiN, 8) }, (_, k) => rowOf(k + 1));
  const lo = Math.max(1, Math.floor(nPrime + 1e-9)), hi = Math.max(1, Math.ceil(nPrime - 1e-9));
  return { l, m, w, nPrime, rows: rows.some(r => r.n === hi) ? rows : [...rows, rowOf(hi)], lo, hi, who };
}

const pc = (v: number) => `${Math.round(v * 100)}%`;
const money = (v: number) => `£${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;

/** The reading: how many can be tended, who waits at each integer either side, the output and the money. */
export function tendSays(t: Tend, o: { packsPerCycle?: number; contributionPerPack?: number; } = {}): { text: string; lines: string[]; tone: Tone } {
  const at = (n: number) => t.rows.find(r => r.n === n) ?? tend(t.who, t, {}).rows.find(r => r.n === n);
  const lo = at(t.lo), hi = at(t.hi);
  const head = `${t.who} can tend ${t.nPrime.toFixed(1)} of these machines (${secs(t.l)} loading, ${secs(t.m)} running on its own, ${secs(t.w)} walking).`;
  if (!lo || !hi) return { text: head, lines: [], tone: 'n' };
  const lines: string[] = [];
  const side = (r: TendRow) => r.idle > 0.05 ? `with ${r.n} the machines never wait and ${t.who} is idle ${secs(r.idle)} a cycle`
    : r.machineWaits > 0.05 ? `with ${r.n} ${t.who} is never idle and each machine waits ${secs(r.machineWaits)} a cycle`
      : `with ${r.n} neither waits`;
  if (t.lo === t.hi) lines.push(`${side(lo)}.`);
  else {
    const gain = lo.perHour > 0 ? hi.perHour / lo.perHour - 1 : 0;
    lines.push(`${side(lo)}; ${side(hi)} and they make ${pc(gain)} more (${hi.perHour.toFixed(1)} against ${lo.perHour.toFixed(1)} machine-cycles an hour).`);
  }
  if (lo.operatorCost != null && hi.operatorCost != null && t.lo !== t.hi) lines.push(`${t.who}’s labour a machine-cycle: ${money(lo.operatorCost)} with ${t.lo}, ${money(hi.operatorCost)} with ${t.hi}.`);
  if (lo.allCost != null && hi.allCost != null && t.lo !== t.hi) {
    const cheaper = lo.allCost <= hi.allCost ? t.lo : t.hi;
    lines.push(`With the machines’ cost: ${money(lo.allCost)} a machine-cycle with ${t.lo}, ${money(hi.allCost)} with ${t.hi} — ${cheaper} is cheaper a cycle; if the machines are what holds the line, the output decides it.`);
  }
  if (t.lo !== t.hi && o.packsPerCycle && o.packsPerCycle > 0 && o.contributionPerPack && o.contributionPerPack > 0) {
    const extra = (hi.perHour - lo.perHour) * o.packsPerCycle * o.contributionPerPack;
    lines.push(`If these machines hold the line, ${t.hi} instead of ${t.lo} is ${money(extra)} an hour more contribution (${((hi.perHour - lo.perHour) * o.packsPerCycle).toFixed(0)} more packs an hour).`);
  }
  return { text: head, lines, tone: 'n' };
}
