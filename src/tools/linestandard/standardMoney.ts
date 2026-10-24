/* WHAT THE PEOPLE PLACED COST — the line standard's one money line
 * (knowledge/specs/FC-006-line-standard-money.md; knowledge/MONEY.md §4,
 * FC-006, causation L: labour at the line's rate).
 *
 * Rowland, 17 October: "this is the cost per pack because of X, including
 * with the people"; 24 October: "the cost is merely one of the outputs ...
 * if the user doesn't have that information then the app must handle it
 * gracefully, don't block anything." So: the people counted off the map
 * (never typed), one person's rate from the line (its wage × on-costs) or
 * Line capacity's typed rate, the packs an hour from the product's Line
 * capacity where it has one, else the line's rated speed — the same
 * `labourInputs` and `labourCost` Line capacity reads, so the map, the card
 * and Line capacity never disagree. Every input optional; the missing one is
 * named in the sentence, and the heads and the £ an hour are still said when
 * only the speed is missing. Nothing on the page waits on any of it. */
import { analyse, fmtMoney, labourCost, labourInputs } from '../linebalance/capacity';
import { fmtN, oneOf } from '../linebalance/capacityWords';
import { headcount, type Standard } from './standard';

/** What the line knows that the money reads (Workspace, Set up the line). */
export interface LineCost { crew?: number; labourRatePerHour?: number; labourBurden?: number; packsPerMin?: number }

export interface StandardMoney {
  /** The people the money is for, and where the count came from. */
  people: number;
  peopleFrom?: 'map' | 'typed';
  /** One person's £ an hour, and where it came from. */
  rate?: number;
  rateFrom?: 'typed' | 'line';
  /** £ an hour for all of them. */
  perHour?: number;
  /** The packs (or the product's unit) a minute the labour is spread over, and where it came from. */
  perMin?: number;
  unit?: string;
  speedFrom?: 'capacity' | 'line';
  /** £ a pack. */
  perPack?: number;
  /** What is missing, in the order it is asked. */
  missing: ('people' | 'rate' | 'speed')[];
}

/** The money, from the map's people and what the line (or its Line capacity) knows. */
export function standardMoney(s: Pick<Standard, 'marks' | 'capacity'>, line?: LineCost): StandardMoney {
  const n = headcount(s);
  if (n === 0) return { people: 0, missing: ['people'] };
  const li = labourInputs(s.capacity, n, line);
  const people = li.peopleFrom === 'typed' && li.people ? li.people : n;
  const out: StandardMoney = { people, peopleFrom: li.peopleFrom === 'typed' ? 'typed' : 'map', missing: [] };
  if (li.rate == null || !(li.rate > 0)) { out.missing.push('rate'); return out; }
  out.rate = li.rate; out.rateFrom = li.rateFrom === 'typed' ? 'typed' : 'line';
  out.perHour = people * li.rate;
  /* the speed: the product's Line capacity where it can be counted, else the line's rated speed */
  if (s.capacity?.stations.length) {
    const r = analyse(s.capacity);
    const lc = labourCost(r, people, li.rate);
    if (lc) {
      out.perMin = lc.packsPerHour / 60; out.unit = r.unit || 'packs'; out.speedFrom = 'capacity'; out.perPack = lc.perPack;
      return out;
    }
  }
  if (line?.packsPerMin != null && line.packsPerMin > 0) {
    out.perMin = line.packsPerMin; out.unit = 'packs'; out.speedFrom = 'line'; out.perPack = out.perHour / (line.packsPerMin * 60);
    return out;
  }
  out.missing.push('speed');
  return out;
}

/** The sentence, the same on the page and the card — the count first, the money one output. */
export function standardMoneySays(m: StandardMoney): string {
  if (m.people === 0) return 'Place the people on the board to say what they cost.';
  const who = m.peopleFrom === 'typed'
    ? `${m.people} ${m.people === 1 ? 'person' : 'people'} as Line capacity has them`
    : `${m.people} ${m.people === 1 ? 'person' : 'people'} placed`;
  if (m.missing.includes('rate') || m.perHour == null) return `${who} — give the line a wage (Set up the line) to say what they cost an hour and a pack.`;
  const rate = m.rateFrom === 'typed' ? 'at Line capacity’s rate' : 'at the line’s rate';
  if (m.missing.includes('speed') || m.perPack == null || m.perMin == null) return `${who}: ${fmtMoney(m.perHour)} an hour ${rate}. Give the line a speed, or map its Line capacity, to say it a pack.`;
  const unit = m.unit || 'packs';
  const from = m.speedFrom === 'capacity' ? 'Line capacity' : 'the line’s rated speed';
  return `${who}: ${fmtMoney(m.perHour)} an hour ${rate} — ${fmtMoney(m.perPack)} a ${oneOf(unit)} at ${fmtN(m.perMin)} ${unit} a minute (${from}).`;
}
