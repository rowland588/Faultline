/* PULL, STOCK AND FLOW — the sums three calculators share (knowledge/specs/FC-009-kanban.md,
 * FC-183-safety-stock.md, FC-044-littles-law.md). Pure, units explicit, every function proved against
 * worked cases from the textbook or SciPy in __tests__/pull.test.ts (scripts/knowledge/cases-calc.py) —
 * never against its own output.
 *
 *   kanbanLoop     Monden's N = D × L × (1 + α) ÷ C, rounded up (knowledge/methods/lean/kanban-supermarket.md)
 *   reorderPoint   safety stock z × √(L σd² + d̄² σL²) and the reorder point d̄ L + SS
 *                  (knowledge/methods/planning/safety-stock.md — Silver, Pyke & Thomas 2017; Factory Physics' VRTD)
 *   littlesLaw     WIP = throughput × lead time, solved for the one that is not known
 *                  (knowledge/methods/capacity/littles-law.md — Little 1961)
 */
import { normalQuantile } from './dist';

/** The tolerance below which a quotient that is a whole number "plus dust" is that whole number —
 *  360 ÷ 60 must be 6 kanbans, never 7 because 1.2 × 300 left 6.000000000000001. */
const DUST = 1e-9;
/** A whole number of containers: the next whole one up, except for floating-point dust. */
export const wholeUp = (x: number): number => Math.ceil(x - DUST);

export interface KanbanIn {
  /** Units used, and the hours they are used over: 1,500 in 7.5 hours. */
  qty: number; hours: number;
  /** Replenishment lead time, hours: from the card freed to the container back on the shelf. */
  leadHours: number;
  /** The safety factor α as a fraction: 0.15 is 15%. */
  alpha: number;
  /** Units in one container. */
  container: number;
}
export interface KanbanOut {
  /** D, units an hour. */
  perHour: number;
  /** D × L — what the loop holds before any safety (Little's law). */
  inLoop: number;
  /** The unrounded N. */
  raw: number;
  /** N, whole containers (at least one). */
  kanbans: number;
  /** The most the supermarket holds: N × C units. */
  supermarket: number;
  /** Hours of use a full supermarket covers. */
  coverHours: number;
  /** What the loop holds above D × L: the safety factor and the rounding up, in units. */
  above: number;
}

export function kanbanLoop(i: KanbanIn): KanbanOut {
  const perHour = i.qty / i.hours;
  const inLoop = perHour * i.leadHours;
  const raw = inLoop * (1 + i.alpha) / i.container;
  const kanbans = Math.max(1, wholeUp(raw));
  const supermarket = kanbans * i.container;
  return { perHour, inLoop, raw, kanbans, supermarket, coverHours: supermarket / perHour, above: supermarket - inLoop };
}

export interface StockIn {
  /** d̄ and σd — units used a day, and its day-to-day spread. */
  mean: number; sdDay: number;
  /** L and σL — days from order to delivery, and its spread (0 when it always arrives on the day). */
  lead: number; sdLead: number;
  /** The chance an order arrives before the stock runs out, as a fraction: 0.98. */
  service: number;
}
export interface StockOut {
  z: number;
  /** Units used over the lead time, on average: d̄ × L. */
  meanLead: number;
  /** The standard deviation of the demand over the lead time: √(L σd² + d̄² σL²). */
  sdLead: number;
  /** Safety stock, units (unrounded). */
  safety: number;
  /** Reorder point, units (unrounded). */
  reorder: number;
  /** The part of the spread the supplier's lead-time variation makes: 0 to 1. */
  fromSupplier: number;
}

export function reorderPoint(i: StockIn): StockOut {
  const z = normalQuantile(i.service);
  const fromDemand = i.lead * i.sdDay ** 2, fromLead = i.mean ** 2 * i.sdLead ** 2;
  const sdLead = Math.sqrt(fromDemand + fromLead);
  const safety = z * sdLead;
  const meanLead = i.mean * i.lead;
  return { z, meanLead, sdLead, safety, reorder: meanLead + safety, fromSupplier: fromDemand + fromLead > 0 ? fromLead / (fromDemand + fromLead) : 0 };
}

/** The stock-outs a year: the orders placed a year (usage a year ÷ the order quantity) × the share that run short. */
export const cyclesShort = (mean: number, days: number, orderQty: number, service: number): { cycles: number; short: number } => {
  const cycles = (mean * days) / orderQty;
  return { cycles, short: (1 - service) * cycles };
};

export type LittleSolve = 'leadTime' | 'wip' | 'throughput';
export interface LittleOut {
  /** Work in progress, units. */
  wip: number;
  /** Throughput, units an hour. */
  perHour: number;
  /** Lead time, hours. */
  leadHours: number;
}

/** Little's law, L = λW: the one asked for from the other two (units an hour, hours). */
export function littlesLaw(solve: LittleSolve, v: { wip?: number; perHour?: number; leadHours?: number }): LittleOut | undefined {
  const { wip, perHour, leadHours } = v;
  if (solve === 'leadTime' && wip !== undefined && perHour) return { wip, perHour, leadHours: wip / perHour };
  if (solve === 'wip' && perHour !== undefined && leadHours !== undefined) return { wip: perHour * leadHours, perHour, leadHours };
  if (solve === 'throughput' && wip !== undefined && leadHours) return { wip, perHour: wip / leadHours, leadHours };
  return undefined;
}
