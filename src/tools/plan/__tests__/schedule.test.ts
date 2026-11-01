/* FC-179 the week's schedule against capacity, with changeovers — proved on the case scripts/knowledge/cases-toc.py works by plain
 * arithmetic: a line that runs 2 × 7.5 h = 900 min a day, Monday to Friday from Mon 2 Nov 2026, a 42-minute changeover between products:
 *   Maris 2kg 54,000 at 100/min = 540 min, 0 → 540 (Mon, 540 in), due Tue — on time
 *   Tesco 1.25kg 49,500 at 110 = 450 min after a changeover: 582 → 1,032 (Tue, 132 in), due Wed — on time
 *   King Edward 2.5kg 150,000 at 90 = 1,666.7 min: 1,074 (Tue 174 in) → 2,740.7 (Thu, 40.7 in), due Wed — 1 day late
 *   Baby 1kg 72,000 at 120 = 600 min: 2,782.7 → 3,382.7 (Thu, 682.7 in), due Fri — on time
 *   used 3,382.7 of 4,500: 1,117.3 min (18.62 h) spare; three changeovers 126 min = 13,440 units at the next runs' rates = £4,704 at 35p
 * and with a 360,000 Baby order (3,000 min): it ends 5,782.7 — 1,282.7 min (21.38 h) over, 153,920 units not made, £53,872 at 35p,
 * £1,282.67 of crew at £60 an hour. */
import { describe, expect, it } from 'vitest';
import { runningDates, schedule, slotWords, type RunIn, type WeekIn } from '../schedule';

const order = (id: string, qty: number, due: string, seq: number) => ({ id, qty, due, seq });
const run = (id: string, name: string, qty: number, rate: number, due: string, seq: number): RunIn => ({ order: order(id, qty, due, seq), productId: name, product: name, ratePerMin: rate });
const RUNS: RunIn[] = [
  run('1', 'Maris 2kg', 54_000, 100, '2026-11-03', 1), run('2', 'Tesco 1.25kg', 49_500, 110, '2026-11-04', 2),
  run('3', 'King Edward 2.5kg', 150_000, 90, '2026-11-04', 3), run('4', 'Baby 1kg', 72_000, 120, '2026-11-06', 4),
];
const DAYS = runningDates('2026-11-02', 5);
const WEEK = (o: Partial<WeekIn> = {}): WeekIn => ({ minutesPerDay: 900, days: DAYS, changeover: () => ({ min: 42, how: 'agreed on the SMED' }), unit: 'packs', contribution: 0.35, labourPerHour: 60, ...o });
const r1 = (n: number) => Math.round(n * 10) / 10;

describe('the running days', () => {
  it('Monday to Friday for five days a week, to Saturday for six, every day for seven; never more than the line runs', () => {
    expect(runningDates('2026-11-02', 5)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
    expect(runningDates('2026-11-05', 5)).toEqual(['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11']);
    expect(runningDates('2026-11-02', 6)).toHaveLength(6);
    expect(runningDates('2026-11-02', 7)[6]).toBe('2026-11-08');
    expect(runningDates('2026-11-02', 1)).toEqual(['2026-11-02']);
  });
});

describe('the week laid on the constraint, in the order typed', () => {
  const s = schedule(RUNS, WEEK());
  it('each run starts and ends at the minute worked by hand, a changeover before each new product', () => {
    expect(s.rows.map(r => [r.product, r1(r.runMin), r.changeMin, r1(r.startMin), r1(r.endMin)])).toEqual([
      ['Maris 2kg', 540, 0, 0, 540], ['Tesco 1.25kg', 450, 42, 582, 1032], ['King Edward 2.5kg', 1666.7, 42, 1074, 2740.7], ['Baby 1kg', 600, 42, 2782.7, 3382.7]]);
  });
  it('and on the days: Mon, Tue, Tue → Thu, Thu', () => {
    expect(s.rows.map(r => ('date' in r.end ? [r.end.date, r1(r.end.atMin)] : null))).toEqual([['2026-11-02', 540], ['2026-11-03', 132], ['2026-11-05', 40.7], ['2026-11-05', 682.7]]);
    expect('date' in s.rows[2].start && s.rows[2].start.date).toBe('2026-11-03');
  });
  it('only King Edward is late — by one day against Wednesday', () => {
    expect(s.late.map(r => [r.product, r.lateDays])).toEqual([['King Edward 2.5kg', 1]]);
    expect(s.rows.map(r => r.lateDays)).toEqual([undefined, undefined, 1, undefined]);
    expect(s.tone).toBe('a');
  });
  it('3,382.7 of the 4,500 minutes: 1,117.3 spare; three changeovers of 126 minutes', () => {
    expect([r1(s.usedMin), s.weekMin, r1(s.spareMin), s.changeovers, s.changeMin]).toEqual([3382.7, 4500, 1117.3, 3, 126]);
    expect(r1(s.runMin)).toBe(3256.7);
  });
  it('the changeovers in money: 13,440 units at the next runs’ rates, £4,704 at 35p', () => {
    expect(s.money.changeUnits).toBe(42 * 110 + 42 * 90 + 42 * 120);
    expect(Math.round(s.money.changePounds ?? 0)).toBe(4704);
    expect(s.money.unmadePounds).toBeUndefined();
    expect(s.money.overtimePounds).toBeUndefined();
  });
  it('the words', () => {
    expect(s.says).toBe('4 orders need 54.3 h of running and 2.1 h of changeovers (3) — 56.4 h of the 75 h the line runs: it fits, with 18.6 h spare. One order is late against its day: King Edward 2.5kg.');
    expect(s.lines[2]).toBe('3. King Edward 2.5kg — 150,000 at 90 a minute = 27.8 h after a 42 min changeover (agreed on the SMED): starts Tue 3 Nov, 2.9 h in, ends Thu 5 Nov, 40.7 min in; due Wed 4 Nov — 1 day late.');
    expect(s.paper).toBe('4 orders: 54.3 h running + 2.1 h changeovers (3) of the 75 h week — 18.6 h spare; 1 late: King Edward 2.5kg.');
  });
});

describe('a week that does not fit', () => {
  const big = [...RUNS.slice(0, 3), run('4', 'Baby 1kg', 360_000, 120, '2026-11-06', 4)];
  const s = schedule(big, WEEK());
  it('ends 5,782.7 minutes in: 1,282.7 over the week — 153,920 units not made, £53,872 at 35p, £1,282.67 of crew', () => {
    expect([r1(s.rows[3].endMin), r1(s.spareMin)]).toEqual([5782.7, -1282.7]);
    expect(Math.round(s.unmade)).toBe(153_920);
    expect(Math.round(s.money.unmadePounds ?? 0)).toBe(53_872);
    expect(Math.round((s.money.overtimePounds ?? 0) * 100) / 100).toBe(1282.67);
    expect(s.rows[3].spills).toBe(true);
    expect('after' in s.rows[3].end && Math.round(s.rows[3].end.after * 10) / 10).toBe(1282.7);
    expect(s.tone).toBe('r');
  });
  it('the order that falls after the week is late, said so', () => {
    expect(s.late.map(r => r.product)).toEqual(['King Edward 2.5kg', 'Baby 1kg']);
    expect(s.says).toMatch(/it does not fit — 21\.4 h over, 153,920 packs not made in the week\. 2 orders are late against its day: King Edward 2\.5kg, Baby 1kg\.$/);
    expect(s.lines[3]).toContain('due Fri 6 Nov — falls after the week');
    expect(slotWords(s.rows[3].end)).toBe('21.4 h after the week\'s last running minute');
  });
  it('the money in words, apart and never summed', () => {
    expect(s.moneyLines).toEqual([
      'The 3 changeovers take 2.1 h off the constraint — 13,440 packs, £4,704 of contribution, if it cannot be made up.',
      '153,920 packs are not made in the week — £53,872 of contribution, if it cannot be made up.',
      'Making them all would take 21.4 h more — £1,283 of the crew’s time at its normal rate; an overtime premium would be more.']);
  });
});

describe('what it does not claim', () => {
  it('the same product twice in a row needs no changeover', () => {
    const s = schedule([run('1', 'Maris 2kg', 54_000, 100, '2026-11-03', 1), run('2', 'Maris 2kg', 27_000, 100, '2026-11-03', 2)], WEEK());
    expect([s.changeovers, s.rows[1].changeMin]).toEqual([0, 0]);
  });
  it('a changeover not timed: none comes off, and the missing one named', () => {
    const s = schedule(RUNS.slice(0, 2), WEEK({ changeover: () => undefined }));
    expect(s.changeovers).toBe(0);
    expect(s.missing[0]).toMatch(/^A changeover between two products is not timed/);
  });
  it('no margin and no crew: the packs and minutes said, the inputs named, nothing invented', () => {
    const s = schedule([...RUNS.slice(0, 3), run('4', 'Baby 1kg', 360_000, 120, '2026-11-06', 4)], WEEK({ contribution: undefined, labourPerHour: undefined }));
    expect(s.money.changePounds).toBeUndefined();
    expect(s.money.unmadePounds).toBeUndefined();
    expect(s.money.overtimePounds).toBeUndefined();
    expect(Math.round(s.money.changeUnits ?? 0)).toBe(13_440);
    expect(s.missing).toEqual(expect.arrayContaining(['Give the line a margin a pack (Set up the line) to say the changeovers and the packs short in money.', 'Give the line its crew and a wage (Set up the line) to say the overtime to make it all.']));
  });
  it('a product with no speed worked out is left out and named', () => {
    const s = schedule([RUNS[0], { ...RUNS[1], ratePerMin: undefined }], WEEK());
    expect(s.rows).toHaveLength(1);
    expect(s.unrated).toEqual(['Tesco 1.25kg']);
    expect(s.missing.some(m => m.startsWith('Tesco 1.25kg: no speed worked out'))).toBe(true);
  });
  it('no orders: the prompt; the order is the planner’s — seq decides, not the order typed', () => {
    expect(schedule([], WEEK()).says).toBe('Type the week’s orders — a product, a quantity and the day each is due — to lay them on the line.');
    const shuffled = [RUNS[2], RUNS[0], RUNS[3], RUNS[1]];
    expect(schedule(shuffled, WEEK()).rows.map(r => r.product)).toEqual(RUNS.map(r => r.product));
  });
  it('an order with no day due is never late', () => {
    const s = schedule([{ ...RUNS[0], order: { id: '1', qty: 54_000, seq: 1 } }], WEEK());
    expect(s.late).toEqual([]);
    expect(s.rows[0].lateDays).toBeUndefined();
  });
  it('a run that ends exactly at the end of a day belongs to that day', () => {
    const s = schedule([run('1', 'Maris 2kg', 90_000, 100, '2026-11-02', 1)], WEEK());   // 900 min = one whole day
    expect('date' in s.rows[0].end && s.rows[0].end.date).toBe('2026-11-02');
    expect(s.late).toEqual([]);
  });
});
