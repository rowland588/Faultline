/* THE WEIGHT A PERSON HANDLES, IN THE SAME TIME (4 November — Rowland: "with humans we want to convey the weight a human has to lift within the same amount of time. It highlights
 * the severity of the situation ... we can't measure a human's maximum capacity, so we have to illustrate the stress and the weight ... the rate coming at the human x a weight: 70
 * ppm, 6 in a tray, each unit weighs 1.25 kg — it reaches the human every so many seconds and weighs so much"). For a PERSON station: what reaches them (the arrival the page already
 * works out — one tray every 5.1 s), what one of it weighs (the units in it × what one unit weighs), and so how many kilos an hour. No limit is claimed: the app does not know a site's
 * lifting rule, so it says the weight and leaves the judgment to the person reading. Pure; nothing here changes a figure the page already says. */
import { chainFactor, type Capacity, type CapacityResult, type Station } from './capacity';
import { fmtBig, fmtDur, fmtN, oneOf } from './capacityWords';

/** A weight as the floor writes it — 1.25 kg, 7.5 kg, 5,250 kg: up to two decimals, thousands apart. */
export const kgSaid = (n: number): string => n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

export interface Load {
  stationId: string;
  /** Its own unit, singular — "tray". */
  one: string;
  /** What one of it weighs, kg — the line's units in it × what one unit weighs. */
  itemKg: number;
  /** How the weight is made — "6 × 1.25 kg", or "1.25 kg" when it is one unit. */
  made: string;
  /** One of it reaches them every this many seconds. */
  everySec: number;
  perMin: number;
  perHour: number;
  kgPerMin: number;
  kgPerHour: number;
  /** People it is shared between, when more than one. */
  crew: number;
}

/** What reaches a person, in weight — undefined for a machine, a station with nothing reaching it yet, or a line with no unit weight typed. */
export function loadOf(r: CapacityResult, cap: Pick<Capacity, 'unitKg' | 'stations'>, s: Station): Load | undefined {
  if (s.kind !== 'people') return undefined;
  const kg = cap.unitKg;
  if (kg == null || !(kg > 0)) return undefined;
  const a = r.arrivals[s.id];
  /* a person needs no speed for what reaches them — the chain of units is enough, so a packer not yet timed still has their load said */
  const factor = r.ok.find(x => x.station.id === s.id)?.factor ?? chainFactor(cap.stations, cap.stations.findIndex(x => x.id === s.id));
  if (!a || !(a.perMin > 0) || factor == null || !(factor > 0)) return undefined;
  const itemKg = factor * kg;
  const crew = s.crew != null && s.crew > 1 ? s.crew : 1;
  return {
    stationId: s.id, one: oneOf(s.unit), itemKg,
    made: Math.abs(factor - 1) > 1e-9 ? `${fmtN(factor)} × ${kgSaid(kg)} kg` : `${kgSaid(kg)} kg`,
    everySec: a.everySec, perMin: a.perMin, perHour: a.perMin * 60,
    kgPerMin: a.perMin * itemKg, kgPerHour: a.perMin * itemKg * 60, crew,
  };
}

/** "A tray weighs 7.5 kg (6 × 1.25 kg) and reaches them every 5.1 s — 700 trays and 5,250 kg an hour." */
export function loadSays(l: Load): string {
  const each = l.crew > 1 ? ` — ${kgSaid(l.kgPerHour / l.crew)} kg an hour each between ${l.crew}, if they share it evenly` : '';
  return `A ${l.one} weighs ${kgSaid(l.itemKg)} kg${l.made === `${kgSaid(l.itemKg)} kg` ? '' : ` (${l.made})`} and reaches them every ${fmtDur(l.everySec)} — ${fmtBig(l.perHour)} ${l.one}s and ${kgSaid(l.kgPerHour)} kg an hour${each}.`;
}

/** Every person station's load, in flow order. */
export function loadsOf(r: CapacityResult, cap: Pick<Capacity, 'unitKg' | 'stations'>): Load[] {
  return cap.stations.flatMap(s => { const l = loadOf(r, cap, s); return l ? [l] : []; });
}
