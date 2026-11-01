/* THE WEEK'S ORDERS ON A LINE — the record (FC-179, FC-043; knowledge/specs/FC-179-week-schedule.md).
 *
 * An order is typed against a PRODUCT of the line and kept inside that product's line standard (Standard.capacity.orders — the standard's
 * one jsonb, as the orders' weekly quantity and the agreed changeovers already are: no column, no migration). The line's week is every
 * product's orders put in `seq` order. The buffer a line protects its constraint with is the line's: kept on each of its products'
 * capacities (Capacity.bufferH) as the planned hours a week already is, and read as the longest any says. Nothing is derived and stored:
 * the timeline, the lateness and the buffer zones are worked out each time from these (tools/plan/schedule, tools/plan/dbr). */
export interface PlanOrder {
  id: string;
  /** Units, in the line's unit. */
  qty: number;
  /** The day it is due, YYYY-MM-DD — the end of that running day. */
  due?: string;
  /** Its place in the line's week: the lower, the earlier on the constraint. */
  seq: number;
  note?: string;
  /** DBR: how far the run is done, percent — the drum's position is the first order not done. */
  done?: number;
  /** DBR: when it reached the constraint's buffer, and how much of the buffer was gone then (0 to 1, over 1 when late). */
  arrived?: { at: number; consumed: number };
}
