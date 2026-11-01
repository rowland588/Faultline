/* FC-043 drum–buffer–rope on the plan the schedule tests use (scripts/knowledge/cases-toc.py, FC-043): the drum is the week's schedule —
 * Maris 0 → 540, Tesco 582 → 1,032, King Edward 1,074 → 2,740.7, Baby 2,782.7 → 3,382.7 running minutes — and the buffer 6 h = 360 min.
 *   Maris done, Tesco 70% through: the drum is at 582 + 0.7 × 450 = 897; King Edward is due in (1,074 − 897) ÷ 60 = 2.95 h →
 *     (6 − 2.95) ÷ 6 = 50.8% of the buffer gone: watch; Baby is due in 31.4 h: outside the buffer
 *   Tesco 90% through: the drum is at 987; King Edward is due in 1.45 h → 75.8% gone: expedite
 *   the rope: King Edward is released when the drum is 1,074 − 360 = 714 minutes in — Tesco 29% done; Baby at 2,422.7 — King Edward 81% done
 *   the stock: the constraint's 100 a minute × 60 × 6 h = 36,000 units, £14,400 at 40p materials
 *   tuning: ten arrivals, none red, nine with plenty of time → 15% shorter, 5.1 h; three of ten red → 20% longer, 7.2 h. */
import { describe, expect, it } from 'vitest';
import { dbr, driveWords, MIN_ARRIVALS } from '../dbr';
import { runningDates, schedule, type RunIn } from '../schedule';
import type { PlanOrder } from '../types';

const mk = (id: string, name: string, qty: number, rate: number, due: string, seq: number): RunIn => ({ order: { id, qty, due, seq }, productId: name, product: name, ratePerMin: rate });
const RUNS: RunIn[] = [mk('1', 'Maris 2kg', 54_000, 100, '2026-11-03', 1), mk('2', 'Tesco 1.25kg', 49_500, 110, '2026-11-04', 2), mk('3', 'King Edward 2.5kg', 150_000, 90, '2026-11-04', 3), mk('4', 'Baby 1kg', 72_000, 120, '2026-11-06', 4)];
const S = schedule(RUNS, { minutesPerDay: 900, days: runningDates('2026-11-02', 5), changeover: () => ({ min: 42, how: 'agreed' }) });
const orders = (o: Record<string, Partial<PlanOrder>>): PlanOrder[] => RUNS.map(r => ({ ...r.order, ...(o[r.order.id] ?? {}) }));
const at = (d: Record<string, Partial<PlanOrder>>, B = 6, extra: Partial<Parameters<typeof dbr>[2]> = {}) => dbr(S, orders(d), { bufferH: B, ratePerMin: 100, contribution: 0.35, materialsPerPack: 0.4, ...extra });
const r1 = (n?: number) => Math.round((n ?? 0) * 10) / 10;

describe('the buffer zones', () => {
  const d = at({ 1: { done: 100 }, 2: { done: 70 } });
  it('the drum is where the orders done and part-done leave it', () => {
    expect(r1(d?.drumMin)).toBe(897);
    expect(d?.rows.map(r => r.zone)).toEqual(['done', 'here', 'watch', 'outside']);
  });
  it('King Edward is 50.8% consumed — watch; Baby is outside the buffer', () => {
    const k = d?.rows[2];
    expect([Math.round((k?.consumed ?? 0) * 1000) / 1000, r1(k?.timeLeftH ? k.timeLeftH * 60 : 0)]).toEqual([0.508, 177]);
    expect([k?.word, k?.tone]).toEqual(['Watch', 'a']);
    expect(k?.says).toBe('King Edward 2.5kg: 51% of the buffer is gone — due at the constraint in 3 h of running. Watch it; do not expedite yet.');
    expect([d?.rows[3].word, d?.rows[3].tone]).toEqual(['Not due yet', 'n']);
  });
  it('Tesco 90% through: King Edward 75.8% consumed — expedite, the red list, a hole in the drum', () => {
    const e = at({ 1: { done: 100 }, 2: { done: 90 } });
    expect(r1(e?.drumMin)).toBe(987);
    expect(Math.round((e?.rows[2].consumed ?? 0) * 1000) / 1000).toBe(0.758);
    expect(e?.expedite.map(r => r.product)).toEqual(['King Edward 2.5kg']);
    expect(e?.tone).toBe('r');
    expect(Math.round(e?.hole?.pounds ?? 0)).toBe(52_500);      // its 150,000 × 35p — what the drum cannot make
    expect(r1(e?.hole?.min)).toBe(1666.7);
    expect(e?.says).toBe('One order is in the red for the drum: King Edward 2.5kg — expedite it; if it does not arrive the drum cannot make its run — 27.8 h, £52,500 of contribution if it cannot be made up.');
  });
  it('plenty of time under a third: Tesco 50% through with a 3 h buffer is King Edward 2.2 h away — 26% gone', () => {
    const p = at({ 1: { done: 100 }, 2: { done: 50 } }, 6);   // drum 807: King Edward in 4.45 h → (6 − 4.45) ÷ 6 = 25.8%
    expect([p?.rows[2].zone, Math.round((p?.rows[2].consumed ?? 0) * 1000) / 1000, p?.rows[2].word, p?.rows[2].tone]).toEqual(['plenty', 0.258, 'Plenty of time', 'g']);
  });
  it('an order that has arrived is at the constraint, said with how much of the buffer was left', () => {
    const a = at({ 1: { done: 100 }, 2: { done: 70 }, 3: { arrived: { at: 1, consumed: 0.8 } } });
    expect([a?.rows[2].zone, a?.rows[2].word]).toEqual(['here', 'Arrived']);
    expect(a?.rows[2].says).toBe('King Edward 2.5kg has arrived at the constraint — it came in the red (80% of the buffer gone).');
    expect(a?.expedite).toEqual([]);
  });
  it('the first run on the drum before anything is done: nothing in the red, the drum 0% of the way', () => {
    const n = at({});
    expect(n?.drumMin).toBe(0);
    expect(n?.rows[0].zone).toBe('here');
    expect(n?.says).toBe('No order is in the red. The drum is 0% of the way through the week’s running time; the buffer is 6 h of running.');
  });
});

describe('the rope', () => {
  it('release an order when the drum is B hours from starting it — in the drum’s own words', () => {
    const d = at({});
    expect(d?.rows[2].release).toBe('when Tesco 1.25kg is 29% done');       // 1,074 − 360 = 714
    expect(d?.rows[3].release).toBe('when King Edward 2.5kg is 81% done');  // 2,782.7 − 360 = 2,422.7
    expect(driveWords(560, S.rows)).toBe('during the changeover into Tesco 1.25kg');
    expect(driveWords(-10, S.rows)).toMatch(/^now/);
    expect(driveWords(9_999, S.rows)).toBe('after the week’s last run');
  });
});

describe('the stock the buffer holds and what a hole costs', () => {
  it('the constraint’s rate × B: 36,000 units, £14,400 at 40p', () => {
    const d = at({});
    expect([d?.wip?.units, Math.round(d?.wip?.pounds ?? 0)]).toEqual([36_000, 14_400]);
    expect(d?.lines.find(l => l.startsWith('The buffer holds'))).toBe('The buffer holds about 36,000 packs in front of the constraint (its rate × 6 h) — £14,400 at the materials; on a packing line that is mostly material staged, not product queued.');
  });
  it('no speed or materials: the inputs named, nothing invented', () => {
    const d = at({}, 6, { ratePerMin: undefined, materialsPerPack: undefined, contribution: undefined });
    expect(d?.wip).toBeUndefined();
    expect(d?.missing).toEqual(['The stock the buffer holds needs the speed of the order next on the drum — work out its Line capacity.']);
    const e = at({ 1: { done: 100 }, 2: { done: 90 } }, 6, { materialsPerPack: undefined, contribution: undefined });
    expect(e?.missing).toEqual(['Give the line what a pack’s materials cost (Set up the line) to say the stock the buffer holds in money.', 'Give the line a margin a pack (Set up the line) to say what a hole in the drum would cost.']);
    expect(e?.hole?.pounds).toBeUndefined();
  });
});

describe('tuning the buffer from the arrivals', () => {
  const arrivals = (xs: number[]): Record<string, Partial<PlanOrder>> => Object.fromEntries(xs.map((c, i) => [String(i + 1), { arrived: { at: i, consumed: c } }]));
  const many = (xs: number[]) => {
    const list: PlanOrder[] = xs.map((c, i) => ({ id: `o${i}`, qty: 1, seq: 100 + i, arrived: { at: i, consumed: c } }));
    return dbr(S, [...orders({}), ...list], { bufferH: 6, ratePerMin: 100 })?.tune;
  };
  it('under ten arrivals it is premature, said', () => {
    expect(at(arrivals([0.1, 0.2]))?.tune.says).toBe(`2 arrivals recorded — about ${MIN_ARRIVALS} are wanted before the buffer is tuned from them; a week of them is premature.`);
  });
  it('ten arrivals, none red, nine with plenty of time: shorten by 15% — 5.1 h', () => {
    const t = many([0.1, 0.2, 0.15, 0.3, 0.25, 0.1, 0.2, 0.35, 0.2, 0.12]);
    expect([t?.arrivals, t?.red, t?.green, Math.round((t?.suggestH ?? 0) * 100) / 100]).toEqual([10, 0, 9, 5.1]);
    expect(t?.says).toBe('Of 10 arrivals 0 came in the red and 9 with plenty of time: the buffer is longer than it needs to be — try 5.1 h (15% shorter), which also cuts the stock it holds.');
  });
  it('three of ten red: lengthen by 20% — 7.2 h', () => {
    const t = many([0.7, 0.9, 1.1, 0.3, 0.4, 0.5, 0.2, 0.45, 0.5, 0.35]);
    expect([t?.red, Math.round((t?.suggestH ?? 0) * 100) / 100]).toEqual([3, 7.2]);
    expect(t?.says).toMatch(/^Of 10 arrivals 3 came in the red: the buffer is too short or something upstream is chronically late — try 7\.2 h \(20% longer\)/);
  });
  it('one red in ten and few in plenty of time: about right, no change suggested', () => {
    const t = many([0.7, 0.4, 0.5, 0.45, 0.5, 0.35, 0.4, 0.5, 0.4, 0.45]);
    expect([t?.red, t?.suggestH]).toEqual([1, undefined]);
    expect(t?.says).toBe('Of 10 arrivals 1 came in the red and 0 with plenty of time: the buffer is about right.');
  });
});

describe('what it does not claim', () => {
  it('no buffer length or no schedule: nothing', () => {
    expect(dbr(S, orders({}), { bufferH: 0 })).toBeUndefined();
    expect(dbr(schedule([], { minutesPerDay: 900, days: ['2026-11-02'], changeover: () => undefined }), [], { bufferH: 6 })).toBeUndefined();
  });
  it('every order done: the drum is at the end of the week and nothing to release', () => {
    const d = at({ 1: { done: 100 }, 2: { done: 100 }, 3: { done: 100 }, 4: { done: 100 } });
    expect(r1(d?.drumMin)).toBe(3382.7);
    expect(d?.rows.every(r => r.zone === 'done')).toBe(true);
  });
});
