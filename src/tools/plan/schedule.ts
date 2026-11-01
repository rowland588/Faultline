/* THE WEEK'S SCHEDULE AGAINST CAPACITY, WITH CHANGEOVERS (FC-179; knowledge/specs/FC-179-week-schedule.md;
 * knowledge/methods/planning/scheduling-rules.md).
 *
 * The orders typed for the week are laid on the line's constraint in the order given: each run is its quantity at the rate the line
 * can be PLANNED on (Line capacity's speed × the share four shifts in five proved — never the plate), a changeover between two different
 * products (the SMED's agreed minutes for the product it is changed from, else the one agreed, else the one timed), the runs end to end
 * through the line's running days (the minutes a day its running pattern gives, the days it runs). What it says: when each run starts
 * and ends, which orders are late against their day, what does not fit the week, the changeover time in the week — and in money where
 * the line has it: the changeovers and the packs short at the constraint (contribution — a minute lost there is a minute of the line)
 * and the overtime to make it all (the crew's wage). The order is the planner's: choosing it by a rule (earliest due date, shortest
 * first, Johnson's) is FC-180's, and the best changeover order FC-070's — not here. Pure. */
import type { PlanOrder } from './types';

export interface RunIn {
  order: PlanOrder;
  productId: string;
  product: string;
  /** The rate the line can be planned on, units a minute — undefined: no speed worked out for the product. */
  ratePerMin?: number;
}
export interface ChangeIn { min: number; how: string }
export interface WeekIn {
  /** The minutes the line runs a day, and the dates of its running days from the week's start — the week is as long as they are. */
  minutesPerDay: number;
  days: string[];
  /** The changeover into `to` from `from` (product ids) — undefined when none is timed. */
  changeover: (from: string, to: string) => ChangeIn | undefined;
  unit?: string;
  /** What a pack earns at the constraint (the line's contribution), and what the crew costs an hour. */
  contribution?: number;
  labourPerHour?: number;
}
export type Slot = { date: string; atMin: number } | { after: number };
export interface RunRow {
  orderId: string;
  product: string;
  qty: number;
  ratePerMin?: number;
  /** Minutes the run takes, and the changeover before it. */
  runMin: number;
  changeMin: number;
  change?: ChangeIn;
  /** Running minutes from the week's start. */
  startMin: number;
  endMin: number;
  start: Slot;
  end: Slot;
  due?: string;
  /** Days after its due day it ends (calendar); undefined: not late, or no due day. */
  lateDays?: number;
  /** It ends after the week's last running minute. */
  spills: boolean;
  /** Minutes of the run and its changeover beyond the week. */
  spillMin: number;
}
export interface Schedule {
  rows: RunRow[];
  weekMin: number;
  /** Runs and changeovers end to end. */
  usedMin: number;
  runMin: number;
  changeMin: number;
  changeovers: number;
  /** Minutes left in the week (negative: over). */
  spareMin: number;
  late: RunRow[];
  spilled: RunRow[];
  /** Units beyond the week, and what they are worth at the constraint. */
  unmade: number;
  money: { changeUnits?: number; changePounds?: number; unmadePounds?: number; overtimePounds?: number };
  /** The money in words, one sentence a part — the two kinds of loss at the constraint and the crew apart, never summed. */
  moneyLines: string[];
  /** Orders left out: no speed worked out for their product. */
  unrated: string[];
  says: string;
  /** What to give to say more. */
  missing: string[];
  /** Each run as a line, and the paper's one line. */
  lines: string[];
  paper: string;
  tone: 'n' | 'a' | 'r';
}

const gb = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 1 });
const int = (n: number) => Math.round(n).toLocaleString('en-GB');
const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
export const hoursWords = (m: number): string => (Math.abs(m) >= 120 ? `${gb(m / 60)} h` : `${gb(m)} min`);
const dayWord = (iso: string): string => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const daysBetween = (a: string, b: string): number => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** The dates of the days a line runs, from a start day: Monday to Friday for five days a week, to Saturday for six, every day for seven
 *  — never more than it runs. */
export function runningDates(from: string, daysPerWeek: number): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  for (let guard = 0; out.length < Math.min(7, Math.max(1, Math.round(daysPerWeek))) && guard < 21; guard++, d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = (d.getUTCDay() + 6) % 7;   // Monday 0 … Sunday 6
    if (wd < daysPerWeek) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const slotOf = (w: number, x: { minutesPerDay: number; days: string[] }, end = false): Slot => {
  const week = x.minutesPerDay * x.days.length;
  if (w > week + 1e-9 || (!end && w >= week - 1e-9)) return { after: Math.max(0, w - week) };
  const k = Math.min(x.days.length - 1, Math.max(0, Math.floor((w - (end ? 1e-9 : 0)) / x.minutesPerDay)));
  return { date: x.days[k], atMin: w - k * x.minutesPerDay };
};
export const slotWords = (s: Slot): string => ('after' in s ? (s.after > 0.05 ? `${hoursWords(s.after)} after the week's last running minute` : 'at the week’s end') : `${dayWord(s.date)}, ${hoursWords(s.atMin)} in`);

/** The orders laid on the constraint, in the order given. */
export function schedule(runs: readonly RunIn[], x: WeekIn): Schedule {
  const unit = x.unit ?? 'packs';
  const weekMin = x.minutesPerDay * x.days.length;
  const rows: RunRow[] = [];
  const unrated: string[] = [];
  let t = 0, prev: RunIn | undefined, changeovers = 0, changeMin = 0, runMin = 0, changeUnits = 0, unknownChange = false;
  for (const r of [...runs].sort((a, b) => a.order.seq - b.order.seq)) {
    if (!(r.ratePerMin && r.ratePerMin > 0) || !(r.order.qty > 0)) { if (!(r.ratePerMin && r.ratePerMin > 0)) unrated.push(r.product); continue; }
    const change = prev && prev.productId !== r.productId ? x.changeover(prev.productId, r.productId) : undefined;
    if (prev && prev.productId !== r.productId && !change) unknownChange = true;
    const c = change?.min ?? 0;
    const run = r.order.qty / r.ratePerMin;
    const start = t + c, end = start + run;
    const endSlot = slotOf(end, x, true);
    const endDate = 'date' in endSlot ? endSlot.date : undefined;
    const lateDays = r.order.due && endDate && endDate > r.order.due ? daysBetween(r.order.due, endDate) : r.order.due && !endDate ? 0 : undefined;
    const spillMin = Math.max(0, end - Math.max(weekMin, t));
    rows.push({ orderId: r.order.id, product: r.product, qty: r.order.qty, ratePerMin: r.ratePerMin, runMin: run, changeMin: c, ...(change ? { change } : {}), startMin: start, endMin: end,
      start: slotOf(start, x), end: endSlot, ...(r.order.due ? { due: r.order.due } : {}), ...(lateDays !== undefined ? { lateDays } : {}), spills: end > weekMin + 1e-9, spillMin });
    if (change) { changeovers++; changeMin += c; changeUnits += c * r.ratePerMin; }
    runMin += run; t = end; prev = r;
  }
  const spareMin = weekMin - t;
  const late = rows.filter(r => (r.lateDays ?? 0) > 0 || (r.spills && r.due));
  const spilled = rows.filter(r => r.spills);
  const overMin = Math.max(0, -spareMin);
  /* units not made in the week: what each spilled run makes beyond the week's last minute, at its own rate */
  const unmade = rows.reduce((n, r) => n + (r.spills ? Math.min(r.spillMin, r.runMin) * (r.ratePerMin ?? 0) : 0), 0);
  const money: Schedule['money'] = {
    ...(x.contribution != null && changeUnits > 0 ? { changeUnits, changePounds: changeUnits * x.contribution } : changeUnits > 0 ? { changeUnits } : {}),
    ...(x.contribution != null && unmade > 0 ? { unmadePounds: unmade * x.contribution } : {}),
    ...(x.labourPerHour != null && overMin > 0 ? { overtimePounds: (overMin / 60) * x.labourPerHour } : {}),
  };
  const missing: string[] = [];
  if (unknownChange) missing.push('A changeover between two products is not timed — time it on a SMED and agree it as the standard; until then none comes off the week for it.');
  if (changeovers > 0 && x.contribution == null) missing.push('Give the line a margin a pack (Set up the line) to say the changeovers and the packs short in money.');
  if (overMin > 0 && x.labourPerHour == null) missing.push('Give the line its crew and a wage (Set up the line) to say the overtime to make it all.');
  if (unrated.length) missing.push(`${[...new Set(unrated)].join(', ')}: no speed worked out on its Line capacity, so its orders are left out of the week.`);

  const names = (l: RunRow[]) => l.map(r => r.product).join(', ');
  const n = rows.length;
  const says = !n ? (unrated.length ? 'No order can be laid on the week — none of the products ordered has a speed worked out on its Line capacity.' : 'Type the week’s orders — a product, a quantity and the day each is due — to lay them on the line.')
    : `${n} order${n === 1 ? '' : 's'} need ${hoursWords(runMin)} of running${changeovers ? ` and ${hoursWords(changeMin)} of changeovers (${changeovers})` : ''} — ${hoursWords(t)} of the ${hoursWords(weekMin)} the line runs: ${spareMin >= -1e-9 ? `it fits, with ${hoursWords(spareMin)} spare` : `it does not fit — ${hoursWords(overMin)} over, ${int(unmade)} ${unit} not made in the week`}. ${late.length ? `${late.length === 1 ? 'One order is' : `${late.length} orders are`} late against its day: ${names(late)}.` : 'Every order makes its day.'}`;
  const lines = rows.map((r, i) => `${i + 1}. ${r.product} — ${int(r.qty)} at ${gb(r.ratePerMin ?? 0)} a minute = ${hoursWords(r.runMin)}${r.changeMin ? ` after a ${hoursWords(r.changeMin)} changeover (${r.change?.how})` : ''}: starts ${slotWords(r.start)}, ends ${slotWords(r.end)}${r.due ? `; due ${dayWord(r.due)} — ${r.spills ? 'falls after the week' : (r.lateDays ?? 0) > 0 ? `${r.lateDays} day${r.lateDays === 1 ? '' : 's'} late` : 'on time'}` : ''}.`);
  const moneyLines = [
    changeovers && money.changeUnits ? `The ${changeovers} changeover${changeovers === 1 ? '' : 's'} take ${hoursWords(changeMin)} off the constraint — ${int(money.changeUnits)} ${unit}${money.changePounds != null ? `, ${gbp(money.changePounds)} of contribution` : ''}, if it cannot be made up.` : '',
    unmade > 0 ? `${int(unmade)} ${unit} are not made in the week${money.unmadePounds != null ? ` — ${gbp(money.unmadePounds)} of contribution` : ''}, if it cannot be made up.` : '',
    money.overtimePounds != null ? `Making them all would take ${hoursWords(overMin)} more — ${gbp(money.overtimePounds)} of the crew’s time at its normal rate; an overtime premium would be more.` : '',
  ].filter(Boolean);
  const tone: Schedule['tone'] = spareMin < -1e-9 ? 'r' : late.length ? 'a' : 'n';
  const paper = n ? `${n} order${n === 1 ? '' : 's'}: ${hoursWords(runMin)} running${changeovers ? ` + ${hoursWords(changeMin)} changeovers (${changeovers})` : ''} of the ${hoursWords(weekMin)} week — ${spareMin >= -1e-9 ? `${hoursWords(spareMin)} spare` : `${hoursWords(overMin)} over, ${int(unmade)} ${unit} not made`}; ${late.length ? `${late.length} late: ${names(late)}` : 'every order on its day'}.` : '';
  return { rows, weekMin, usedMin: t, runMin, changeMin, changeovers, spareMin, late, spilled, unmade, money, moneyLines, unrated, says, missing, lines, paper, tone };
}
