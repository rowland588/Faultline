/* THE LINE BALANCE AND LINE CAPACITY, LINKED.
 *
 * Rowland, 17 October: "line balance is about a more manual people process
 * flow analysis visual of what is happening where and what people are doing.
 * ... I input people, what they do, and should be able to time them ... it
 * can be linked directly to the capacity because that has all of the
 * timings — what's the correct link?"
 *
 * Toyota's three forms of standardised work, one product each:
 *   Line capacity   the process capacity sheet — the stations in flow order,
 *                   machines at their plate speed, the target; what the line
 *                   can make and where it is held
 *   Line balance    the combination table — each person's work, walking and
 *                   waiting, timed at the line, against takt
 *   Line standard   the standardised work chart — who stands where
 *
 * ONE NUMBER, ONE HOME. The target is Line capacity's, and the takt follows
 * it. A person's time is the line balance's, and a people station's speed in
 * Line capacity follows it. A person is linked to the station they work at,
 * by name of record, never by matching words: their cycle is one piece of
 * that station's unit (a tray), so their takt is the line's × the packs in
 * a tray. Pure: the capacity and the balance in, what each should now hold
 * out; the balance's page writes it. */
import { stepsFromEvents, taktOf } from '../video/study';
import { chainFactor, fmtMoney as m, labourInputs, syncWhatIfs, type Capacity, type Station, type StationKind } from '../linebalance/capacity';
import type { Workspace } from '../../types';
import type { AgreedBalance, BalanceCrew, ToolStudy } from '../../lib/study';
import { balance, type BalanceFigures } from './balance';

/** A work balance's figures as every reader takes them — its elements, the
 *  takt it holds to and where each person is on the line, all on the study
 *  (the balance's page keeps the takt and the stations up with Line capacity). */
export const studyBalance = (s: Pick<ToolStudy, 'facts' | 'agreed'>): BalanceFigures => {
  /* READ FROM FOOTAGE (lib/video): the elements are the stations' accepted
     events, timed by their lengths; the takt the agreed one, else the
     demand the study was given */
  const v = s.facts.video;
  if (v) {
    const takt = s.agreed?.balance ?? (taktOf(v.demand) ? { taktSec: taktOf(v.demand) as number } : undefined);
    return balance(stepsFromEvents(v.job.config.zones, s.facts.vevents ?? [], 'verified', v.facts.durationSec, v.job.config.sampleSec), takt, s.facts.crew);
  }
  return balance(s.facts.steps, s.agreed?.balance, s.facts.crew);
};

/** A station a person can be at, in the order the product flows. */
export interface StationPick {
  id: string;
  name: string;
  unit: string;
  kind: StationKind;
  /** How many of the line's unit are in one of its — undefined while the chain of units is not whole. */
  per?: number;
  /** Which of several lines it is on, when the product's capacity has them. */
  lane?: string;
}

const nameOf = (s: Station, i: number) => s.name.trim() || `Station ${i + 1}`;

/** Every station of the product's Line capacity, in flow order, with the
 *  line's units in one of its own (lib/capacity chainFactor) — on several
 *  lines each line's own chain, and the shared stations after them carrying
 *  on from the first line's last unit, as the capacity works them out. */
export function stationsOf(cap?: Capacity): StationPick[] {
  if (!cap?.stations.length) return [];
  const st = cap.stations;
  const lanes = cap.lanes?.length ? cap.lanes : undefined;
  const pick = (s: Station, i: number, per: number | undefined, lane?: string): StationPick =>
    ({ id: s.id, name: nameOf(s, st.indexOf(s) >= 0 ? st.indexOf(s) : i), unit: s.unit.trim(), kind: s.kind, ...(per != null ? { per } : {}), ...(lane ? { lane } : {}) });
  if (!lanes) return st.map((s, i) => pick(s, i, chainFactor(st, i)));
  const out: StationPick[] = [];
  for (const l of lanes) {
    const mine = st.filter(s => s.lane === l.id);
    mine.forEach((s, i) => out.push(pick(s, i, chainFactor(mine, i), l.name)));
  }
  const ids = new Set(lanes.map(l => l.id));
  const shared = st.filter(s => !s.lane || !ids.has(s.lane));
  const first = st.filter(s => s.lane === lanes[0].id);
  const lf = first.length ? chainFactor(first, first.length - 1) : 1;
  const c0 = shared[0]?.contains;
  shared.forEach((s, i) => {
    const f = chainFactor(shared, i);
    out.push(pick(s, i, lf != null && f != null && c0 != null && c0 > 0 ? lf * c0 * f : undefined));
  });
  return out;
}

/** The takt Line capacity's target gives: 60 ÷ the target a minute, seconds
 *  a piece of the line's unit. Nothing when it has no target. */
export function taktFromTarget(cap?: Capacity): { taktSec: number; perMin: number; unit: string } | undefined {
  const t = cap?.targetPerMin;
  if (!(t != null && t > 0)) return undefined;
  return { taktSec: Math.round((60 / t) * 1000) / 1000, perMin: t, unit: cap?.stations[0]?.unit.trim() || 'units' };
}

/** The takt and allowance the balance holds to. A balance that takes its
 *  takt from Line capacity (new ones do, when it has a target) follows the
 *  target as it changes; one whose takt was agreed here by hand keeps it —
 *  the target is offered beside it (`targetOffer`), never put over it, so a
 *  balance read against a number nobody chose cannot appear. A closed
 *  balance is a receipt and keeps what it closed on. The allowance is always
 *  the balance's own. */
export function agreedFor(agreed: AgreedBalance | undefined, cap: Capacity | undefined, closed = false): AgreedBalance | undefined {
  if (closed || (agreed && agreed.from !== 'target')) return agreed;
  const t = taktFromTarget(cap);
  if (t) return { taktSec: t.taktSec, from: 'target', ...(agreed?.allowance ? { allowance: agreed.allowance } : {}) };
  return agreed;
}

/** Line capacity's target, offered beside a takt agreed here by hand when
 *  the two differ — "Line capacity's target of 60 bags a minute makes the
 *  takt 1.0 s a bag". */
export function targetOffer(agreed: AgreedBalance | undefined, cap: Capacity | undefined): { taktSec: number; perMin: number; unit: string } | undefined {
  const t = taktFromTarget(cap);
  if (!t || !agreed || agreed.from === 'target' || Math.abs(agreed.taktSec - t.taktSec) < 0.0005) return undefined;
  return t;
}

/** Each person's station kept up with the capacity: its name, its unit and
 *  the line's units in one of its own. A person whose station has gone from
 *  the capacity is on no station again — counted in the line's unit. */
export function crewKept(crew: readonly BalanceCrew[], cap?: Capacity): BalanceCrew[] {
  const picks = new Map(stationsOf(cap).map(p => [p.id, p]));
  return crew.map(c => {
    if (!c.stationId) return c;
    const p = picks.get(c.stationId);
    if (!p) return { id: c.id, who: c.who };
    return { id: c.id, who: c.who, stationId: p.id, station: p.name, ...(p.per != null ? { per: p.per } : {}), ...(p.unit ? { unit: p.unit } : {}) };
  });
}

/** Who in the line balance works at a station. */
export const atStation = (crew: readonly BalanceCrew[] | undefined, stationId: string): string[] =>
  (crew ?? []).filter(c => c.stationId === stationId).map(c => c.who);

/** The note a people station carries when its speed is the line balance's. */
export const balanceNote = (who: readonly string[]): string => `timed in the line balance — ${who.join(' and ')}`;

/** WHAT THE PEOPLE'S TIMES MAKE OF LINE CAPACITY: each PEOPLE station a
 *  person is linked to takes their timed cycle — one piece of its unit every
 *  so many seconds, the mean when more than one stands there (its crew is
 *  still the capacity's to say), its allowance carried in (a standard time).
 *  Only a person with every element timed or typed gives one; a machine
 *  station keeps its plate speed. Undefined when nothing would change. */
export function capacityTaking(cap: Capacity, f: BalanceFigures, crew: readonly BalanceCrew[]): Capacity | undefined {
  let changed = false;
  const stations = cap.stations.map(s => {
    if (s.kind !== 'people') return s;
    const who = atStation(crew, s.id);
    const people = who.map(w => f.people.find(p => p.who === w));
    if (!who.length || people.some(p => !p || p.source === 'none' || !(p.work > 0))) return s;
    const cycle = Math.round((people.reduce((t, p) => t + (p?.work ?? 0), 0) / people.length) * 100) / 100;
    const note = balanceNote(who);
    const same = s.source === 'standard' && Math.abs((s.cycleSec ?? 0) - cycle) < 0.005 && s.perCycle === 1 && s.rate == null && !s.speedIn && !s.cycleIn && s.note === note;
    if (same) return s;
    changed = true;
    const { rate: _r, ratePer: _p, speedIn: _s, cycleIn: _c, ...rest } = s;
    return { ...rest, cycleSec: cycle, perCycle: 1, source: 'standard' as const, note };
  });
  return changed ? syncWhatIfs(cap, { ...cap, stations }) : undefined;
}

/* ============================ what the bottleneck costs ===================
 * Rowland, 17 October: "Line balance must have costs ... like capacity we
 * want to show client cost of loss because of bottleneck presented in a cost
 * per pack per min". The same money as Line capacity's (lib/capacity
 * labourCost): the people × one's rate an hour, over the packs they make.
 * Here the packs are the PEOPLE's: the slowest person's load (seconds a
 * pack, their own time put back into the line's unit) sets the pace when it
 * is over takt —
 *   packs a minute now      60 ÷ the constraint's load
 *   packs a minute at takt  60 ÷ takt (the target)
 *   lost a minute           at takt − now
 *   labour a pack           the people's £ a minute ÷ packs a minute, now and at takt
 *   paid for packs not made £ a minute × (1 − now ÷ at takt) — the shortfall
 *   the others waiting      each other person's time held to the constraint's
 *                           pace with no work: (1 − their load ÷ its load) × £ a
 *                           minute each — a second cost, beside the first
 *   contribution lost       lost a minute × contribution a pack, when the line has one
 * Within takt nothing is lost to the people; what the spare time costs is
 * said instead (time paid with no work at takt — the balance's own waste). */
export interface BalanceCost {
  people: number;
  ratePerHour: number;
  /** £ a minute, all of them. */
  perMin: number;
  /** Packs a minute the people's pace allows, and at takt. */
  packsNow: number;
  packsAtTakt: number;
  /** Packs a minute lost to the constraint — 0 within takt. */
  lost: number;
  /** Labour £ a pack as it runs, and at takt. */
  perPackNow: number;
  perPackAtTakt: number;
  /** £ a minute paid for packs not made; and, beside it, the others' time waiting on the constraint. */
  paidNotMade: number;
  waiting: number;
  /** £ a minute of contribution lost, when the line's contribution a pack is known. */
  contributionLost?: number;
  /** Within takt: £ a minute paid for time with no work (each person's spare at takt). */
  spare?: number;
  constraint?: string;
}

export function balanceCost(f: BalanceFigures, o: { people?: number; ratePerHour?: number; contributionPerPack?: number }): BalanceCost | undefined {
  const takt = f.taktSec, c = f.constraint;
  const rate = o.ratePerHour;
  const people = o.people ?? f.people.length;
  if (!takt || !c || f.untimed || !(rate != null && rate > 0) || !(people > 0)) return undefined;
  const load = (p: { work: number; per: number }) => p.work / p.per;
  const cLoad = load(c);
  if (!(cLoad > 0)) return undefined;
  const perMin = (people * rate) / 60;
  const packsAtTakt = 60 / takt;
  const over = cLoad > takt + 1e-9;
  const packsNow = over ? 60 / cLoad : packsAtTakt;
  const lost = Math.max(0, packsAtTakt - packsNow);
  const each = rate / 60;
  const waiting = over ? f.people.filter(p => p !== c).reduce((t, p) => t + Math.max(0, 1 - load(p) / cLoad) * each, 0) : 0;
  const spare = over ? undefined : f.people.reduce((t, p) => t + Math.max(0, 1 - load(p) / takt) * each, 0);
  return {
    people, ratePerHour: rate, perMin, packsNow, packsAtTakt, lost,
    perPackNow: perMin / packsNow, perPackAtTakt: perMin / packsAtTakt,
    paidNotMade: perMin * (1 - packsNow / packsAtTakt), waiting,
    ...(o.contributionPerPack != null && o.contributionPerPack > 0 ? { contributionLost: lost * o.contributionPerPack } : {}),
    ...(spare !== undefined ? { spare } : {}),
    ...(over ? { constraint: c.who } : {}),
  };
}

/** What it costs, in the words a client reads: the abnormal first. `unit`
 *  the line's ("bags"); money as Line capacity says it. */
export function balanceCostSays(k: BalanceCost, unit = 'packs'): { lines: string[]; tone: 'r' | 'n' } {
  const one = unit.replace(/s$/, '');
  const n = (v: number) => String(Number(v.toFixed(v < 10 ? 2 : 1)));
  const who = `${k.people} ${k.people === 1 ? 'person' : 'people'} at ${m(k.ratePerHour)} an hour`;
  if (k.constraint) return { tone: 'r', lines: [
    `${k.constraint} holds the line to ${n(k.packsNow)} ${unit} a minute against the ${n(k.packsAtTakt)} takt asks — ${n(k.lost)} ${unit} a minute lost.`,
    `Labour: ${who} — ${m(k.perPackNow)} a ${one} as it runs, ${m(k.perPackAtTakt)} at takt: ${m(k.perPackNow - k.perPackAtTakt)} a ${one} more because of ${k.constraint}.`,
    /* two costs, side by side — the shortfall against takt, and the others' time held to its pace — never one inside the other */
    `Each minute ${m(k.paidNotMade)} of labour is paid for ${unit} not made${k.waiting > 0 ? `, and ${m(k.waiting)} for the others’ time waiting on ${k.constraint}` : ''}${k.contributionLost != null ? `; ${m(k.contributionLost)} of contribution lost` : ''}.`,
  ] };
  return { tone: 'n', lines: [
    `The people keep up with takt: labour ${m(k.perPackAtTakt)} a ${one} (${who}).`,
    ...(k.spare && k.spare > 0 ? [`Each minute ${m(k.spare)} of their time is paid with no work in it — the balance’s spare, to be taken up or taken out.`] : []),
  ] };
}

/** WHAT THE COST IS READ FROM — the same as Line capacity's: the rate typed
 *  on its labour, else the line's own (its wage × its on-costs); the
 *  contribution a pack the line's margin. Said where each came from. */
export function costInputs(cap: Capacity | undefined, line?: Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'marginPerPack'>):
  { ratePerHour?: number; rateFrom?: 'typed' | 'line'; contributionPerPack?: number } {
  const li = labourInputs(cap, undefined, line);
  const c = line?.marginPerPack != null && line.marginPerPack > 0 ? line.marginPerPack : undefined;
  return { ...(li.rate ? { ratePerHour: li.rate, ...(li.rateFrom ? { rateFrom: li.rateFrom } : {}) } : {}), ...(c ? { contributionPerPack: c } : {}) };
}
