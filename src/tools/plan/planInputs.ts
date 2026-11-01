/* THE WEEK'S PLAN, READ FROM THE LINE (FC-179, FC-043) — the orders typed on each product, the speeds the line can be planned on, the
 * changeovers its SMEDs agreed, the way it runs, its cost model, put into tools/plan/schedule and tools/plan/dbr. One function the screen
 * (PlanPanel), the paper (lib/report/planPaper) and the acceptance script all read, so the three cannot say different things. Pure. */
import type { Standard } from '../linestandard/standard';
import type { Workspace } from '../../types';
import type { ToolStudy } from '../../lib/study';
import { labourPerHour } from '../../lib/cost';
import { analyse } from '../linebalance/capacity';
import { contributionOf } from '../losses/losses';
import { changeoverIn } from '../changeover/changeover';
import type { LineRead } from '../../lib/lineRead';
import { dbr, type Dbr } from './dbr';
import { runningDates, schedule, type ChangeIn, type RunIn, type Schedule } from './schedule';
import type { PlanOrder } from './types';

const norm = (s?: string) => (s ?? '').trim().toLowerCase();

export interface OrderOf { product: Standard; order: PlanOrder }
/** Every product's orders in the line's order (seq, then the order typed). */
export const ordersOf = (products: readonly Standard[]): OrderOf[] =>
  products.filter(p => !p.deletedAt).flatMap(product => (product.capacity?.orders ?? []).map(order => ({ product, order }))).sort((a, b) => a.order.seq - b.order.seq || a.order.id.localeCompare(b.order.id));

/** The buffer the line protects its constraint with: the longest any product says. */
export const bufferOf = (products: readonly Standard[]): number | undefined => {
  const hs = products.filter(p => !p.deletedAt).map(p => p.capacity?.bufferH).filter((h): h is number => h != null && h > 0);
  return hs.length ? Math.max(...hs) : undefined;
};

/** The changeover into a product from another, said how it is known: the SMED's agreed minutes for the product it is changed from, else
 *  one agreed with no "from", else the newest agreed from another product (said), else the SMED as timed — nothing when none is timed. */
export function changeoverFor(to: Standard, fromName: string, studies: readonly ToolStudy[]): ChangeIn | undefined {
  const agreed = to.capacity?.changeovers ?? [];
  const sorted = [...agreed].sort((a, b) => b.agreedAt - a.agreedAt);
  const same = sorted.find(a => a.from && norm(a.from) === norm(fromName));
  const generic = sorted.find(a => !a.from);
  const other = sorted[0];
  const pick = same ?? generic ?? other;
  const co = changeoverIn(pick ? [pick] : undefined, [...studies], to.id);
  if (!co) return undefined;
  const how = !co.agreed ? 'timed on the SMED, not yet the standard'
    : same ? `the standard from ${fromName}`
      : generic ? 'the standard, into this product from any' : `the standard from ${other?.from ?? 'another product'}, not from ${fromName}`;
  return { min: co.min, how };
}

export interface Plan {
  /** Why nothing is laid on the week, when it is not. */
  needs?: string;
  days: string[];
  sched?: Schedule;
  dbr?: Dbr;
  orders: OrderOf[];
  bufferH?: number;
  /** The rate the line is planned at, as a share of each product's worked-out speed, and where it came from. */
  planned: { eff?: number; says: string };
  unit: string;
}

export function planOf(x: { products: readonly Standard[]; studies: readonly ToolStudy[]; read: Pick<LineRead, 'run' | 'rates' | 'unit'>; ws?: Workspace; from: string }): Plan {
  const orders = ordersOf(x.products);
  const unit = x.read.unit;
  const eff = x.read.rates.plannable != null && x.read.rates.theoretical ? x.read.rates.plannable / x.read.rates.theoretical : undefined;
  const planned = { ...(eff != null ? { eff } : {}), says: eff != null ? `at ${Math.round(eff * 100)}% of each product’s speed — what four shifts in five proved` : 'at each product’s worked-out speed — no shifts counted to plan on yet' };
  const bufferH = bufferOf(x.products);
  const run = x.read.run;
  if (!run) return { needs: 'The line’s running pattern is not set — set how it runs (shifts a day, hours a shift, days a week) on its SMED to lay the orders on the week.', days: [], orders, ...(bufferH != null ? { bufferH } : {}), planned, unit };
  const days = runningDates(x.from, run.daysPerWeek);
  const runs: RunIn[] = orders.map(({ product, order }) => {
    const line = product.capacity?.stations.length ? analyse(product.capacity).line : undefined;
    return { order, productId: product.id, product: product.product, ...(line ? { ratePerMin: line * (eff ?? 1) } : {}) };
  });
  const byId = new Map(x.products.map(p => [p.id, p]));
  const cost = x.ws ? contributionOf(x.ws) : undefined;
  const labour = x.ws ? labourPerHour(x.ws) : 0;
  const sched = schedule(runs, {
    minutesPerDay: run.minutesPerDay, days, unit,
    changeover: (from, to) => { const t = byId.get(to), f = byId.get(from); return t && f ? changeoverFor(t, f.product, x.studies) : undefined; },
    ...(cost ? { contribution: cost.perPack } : {}), ...(labour > 0 ? { labourPerHour: labour } : {}),
  });
  const next = sched.rows.find(r => (orders.find(o => o.order.id === r.orderId)?.order.done ?? 0) < 100);
  const d = bufferH != null ? dbr(sched, orders.map(o => o.order), { bufferH, unit, ...(next?.ratePerMin ? { ratePerMin: next.ratePerMin } : {}), ...(cost ? { contribution: cost.perPack } : {}), ...(x.ws?.materialsPerPack != null ? { materialsPerPack: x.ws.materialsPerPack } : {}) }) : undefined;
  return { days, sched, ...(d ? { dbr: d } : {}), orders, ...(bufferH != null ? { bufferH } : {}), planned, unit };
}
