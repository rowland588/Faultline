/* WHERE TO START ON THE PARETO (knowledge/specs/FC-148-why-tree.md, Part C — Rowland, 2 November: "build all three parts").
 *
 * The Pareto ranks the loss by the measure the person picks (count, time, cost — unchanged). Beside it, one mark: of the vital
 * few, the bar whose lost time sits ON THE LINE'S CONSTRAINT and costs the most — a minute lost there is a minute of the whole
 * line's output (Goldratt); a minute lost elsewhere is labour only. It is a pointer for where to begin, never a re-ranking.
 *
 * What it costs: the minutes of the bar's stops that sit on the constraint machine (lib/intelligence/constraint
 * constraintShare) × the line's rate a minute (Line capacity, in packs) × what a pack contributes (the one cost model,
 * tools/losses contributionOf). Any of the three missing, for a line that has stops among the vital few, and NO mark is drawn:
 * the sentence names the line and what it needs, and nothing is estimated. Pure: data in, plain object out. */
import type { Observation } from '../types';
import type { Standard } from '../tools/linestandard/standard';
import { analyse } from '../tools/linebalance/capacity';
import { contributionOf, type CostModel } from '../tools/losses/losses';
import { lineConstraint, constraintShare, type LineConstraint } from './intelligence/constraint';
import { norm } from './intelligence/stops';

/** One line, read for the mark: its constraint, rate and what a pack contributes — each undefined when the line lacks it. */
export interface StartLine {
  name: string;
  constraint?: string;
  /** Packs a minute the line makes (Line capacity's), only when the line counts in packs. */
  ratePerMin?: number;
  /** £ a pack the line contributes (price less materials, else margin). */
  perPack?: number;
  /** Why the rate is missing when the line has a constraint but no rate in packs. */
  rateNote?: string;
  /** The vital-few bars' stops on this line: minutes, and the part of them on the constraint. */
  bars: { category: string; mins: number; onMin: number }[];
}

export interface StartMark { category: string; line: string; constraint: string; onMin: number; packs: number; pounds: number }
export interface StartHere {
  /** The bar to start with; absent whenever an input is missing or no vital bar sits on the constraint. */
  mark?: StartMark;
  /** The other vital-few bars, in their rank order — still one tap each. */
  next: string[];
  /** What is missing, line by line, in the floor's words. */
  missing: string[];
  /** One sentence for the page. */
  says: string;
}

const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');

/** Read one line for the mark from its records. `categories` are the vital-few bars; the window is the Pareto's own. */
export function startLineOf(
  name: string, ws: CostModel | undefined, standards: readonly Standard[], obs: readonly Observation[],
  categories: readonly string[], from: number, to: number,
): StartLine {
  const products = standards.filter(s => !s.deletedAt).map(s => ({ product: s.product, capacity: s.capacity }));
  const constraint: LineConstraint | undefined = lineConstraint(products);
  let ratePerMin: number | undefined, rateNote: string | undefined;
  if (constraint) {
    for (const p of products) {
      if (!p.capacity?.stations.length) continue;
      const r = analyse(p.capacity);
      if (!r.limit || norm(r.limit.station.name) !== norm(constraint.name) || !(r.line && r.line > 0)) continue;
      if (/^packs?$/i.test(r.unit.trim())) { ratePerMin = r.line; rateNote = undefined; break; }
      rateNote = `its Line capacity counts in ${r.unit.trim() || 'another unit'}, not packs`;
    }
  }
  const perPack = contributionOf(ws)?.perPack;
  const live = obs.filter(o => !o.deletedAt && o.startedAt >= from && o.startedAt < to && o.durationMs > 0);
  const bars = categories.map(category => {
    const stops = live.filter(o => (o.category || 'Uncategorised').trim() === category);
    const mins = stops.reduce((a, o) => a + o.durationMs / 60_000, 0);
    return { category, mins, onMin: constraint ? constraintShare(stops, constraint).onMin : 0 };
  });
  return { name, ...(constraint ? { constraint: constraint.name } : {}), ...(ratePerMin !== undefined ? { ratePerMin } : {}), ...(perPack !== undefined ? { perPack } : {}), ...(rateNote ? { rateNote } : {}), bars };
}

/** The mark, from the lines read. `vital` are the vital-few categories in rank order. */
export function startHere(vital: readonly string[], lines: readonly StartLine[]): StartHere {
  const used = lines.filter(l => l.bars.some(b => b.mins > 0));
  const missing = used.flatMap(l => [
    ...(l.constraint ? [] : [`${l.name}: its constraint — build its Line capacity`]),
    ...(l.constraint && l.ratePerMin === undefined ? [`${l.name}: its rate in packs a minute${l.rateNote ? ` (${l.rateNote})` : ' — build its Line capacity'}`] : []),
    ...(l.perPack === undefined ? [`${l.name}: what a pack contributes — give its margin or price on Set up the line`] : []),
  ]);
  if (!used.length) return { next: [...vital], missing: [], says: '' };
  if (missing.length) {
    return { next: [...vital], missing, says: `Start here is not marked — ${missing.join('; ')}. Nothing is estimated.` };
  }
  const pounds = new Map<string, StartMark>();
  for (const l of used) for (const b of l.bars) {
    if (!(b.onMin > 0) || l.ratePerMin === undefined || l.perPack === undefined || !l.constraint) continue;
    const packs = b.onMin * l.ratePerMin, p = packs * l.perPack, cur = pounds.get(b.category);
    pounds.set(b.category, cur
      ? { ...cur, onMin: cur.onMin + b.onMin, packs: cur.packs + packs, pounds: cur.pounds + p, ...(p > cur.pounds ? { line: l.name, constraint: l.constraint } : {}) }
      : { category: b.category, line: l.name, constraint: l.constraint, onMin: b.onMin, packs, pounds: p });
  }
  /* the best by pounds; a tie goes to the minutes at the constraint, then to the higher rank */
  let best: StartMark | undefined;
  for (const c of vital) {
    const m = pounds.get(c);
    if (m && (!best || m.pounds > best.pounds || (m.pounds === best.pounds && m.onMin > best.onMin))) best = m;
  }
  if (!best || !(best.pounds > 0)) {
    const where = [...new Set(used.map(l => l.constraint).filter(Boolean))].join(' / ');
    return { next: [...vital], missing: [], says: `None of the vital few sits on the constraint${where ? ` (${where})` : ''} — fixing them will not make the line more. The prize is at the constraint’s own stops.` };
  }
  return {
    mark: best, next: vital.filter(c => c !== best.category), missing: [],
    says: `Start here: ${best.category} — ${n0(best.onMin)} min at the ${best.constraint}, about ${n0(best.packs)} packs and £${n0(best.pounds)} of contribution in the last four weeks. A minute lost there is a minute of the line.`,
  };
}
