/* THE LEAN PAGE (docs/LEAN-PAGE.md) — the model's helpers, and a loss count
 * read into it, worked on paper first:
 *
 *   Line 7, Shift 1, Sat 10 Oct: 450 planned at 100 a minute = 45,000
 *   expected; made 36,500, rejects 600 → 85 min lost; stops 32 + 12 + 8 = 52,
 *   one changeover 18 = 70 min stopped. Idle labour 4 × £14.50 × 1.3 =
 *   £75.40 an hour × 85 ÷ 60 = £106.82; contribution 8,500 × £0.04 = £340 →
 *   £446.82.
 *
 *   Shift 1, Sun 11 Oct, the count after: made 40,000, rejects 300 →
 *   5,000 short = 50 min lost; stops: a Breakdown of 10 and a changeover of
 *   18 = 28 min stopped; rejects 3 min; the rest 50 − 31 = 19 min (38%, over
 *   a tenth — amber). Labour £75.40 × 50 ÷ 60 = £62.83; contribution
 *   5,000 × £0.04 = £200 → £262.83 → "£263", £183.99 less than 10 Oct.
 *     Good packs 40,000 of 45,000 = 88.9%, 3,500 more than 10 Oct.
 *     Lost 50 of 450 = 11.1%, 35 min less.  Stopped 28 against 70, 42 less.
 *     Rejects 300 of 40,300 run = 0.7%, 300 fewer.
 *     The most: the rest, 19 min = 38% of 50 — labour £75.40 × 19 ÷ 60 =
 *     £23.88 + contribution 1,900 × £0.04 = £76 → £99.88 → "£100". */
import { describe, expect, it } from 'vitest';
import { actionOf, fixOf, planOrder, since } from '../lean';
import { lossFigures, lossSays } from '../ie/losses';
import { lossLean, lossPart, raisedFrom } from '../ie/lossLean';
import type { LossCount, ToolStudy } from '../study';
import type { Observation } from '../../types';

describe('since — a change against the record before', () => {
  it('says the size, more or less (fewer for things counted), and whether it is better', () => {
    expect(since(40_000, 36_500, { fmt: n => n.toLocaleString('en-GB'), higher: true, against: '10 Oct', counted: true }))
      .toEqual({ dir: 'up', text: '3,500 more than 10 Oct', better: true });
    expect(since(300, 600, { fmt: String, higher: false, against: '10 Oct', counted: true })).toEqual({ dir: 'down', text: '300 fewer than 10 Oct', better: true });
    expect(since(50, 30, { fmt: n => `${n} min`, higher: false, against: '10 Oct' })).toEqual({ dir: 'up', text: '20 min more than 10 Oct', better: false });
    expect(since(50.3, 50, { fmt: String, higher: false, against: '10 Oct', same: 0.5 })).toEqual({ dir: 'same', text: 'the same as 10 Oct' });
    expect(since(50, undefined, { fmt: String, higher: false, against: '10 Oct' })).toBeUndefined();
  });
});

describe('the action plan — action · owner · due', () => {
  const today = '2026-10-14';
  it('late in red when its day has gone, waiting amber, done green with its day, open plain', () => {
    expect(actionOf({ what: 'Fit the guard', who: 'Lee', due: '2026-10-12', state: 'todo' }, today)).toEqual({ what: 'Fit the guard', who: 'Lee', due: '12 Oct', state: 'Late', tone: 'r' });
    expect(actionOf({ what: 'Order the rail', due: '2026-10-20', state: 'waiting' }, today)).toMatchObject({ state: 'Waiting', tone: 'a', due: '20 Oct' });
    expect(actionOf({ what: 'Train shift 2', who: 'Rob', state: 'done', doneOn: '2026-10-13' }, today)).toMatchObject({ state: 'Done', tone: 'g', due: 'done 13 Oct' });
    expect(fixOf({ title: 'Reset the jaw heater', withWhom: 'OEM', plannedFor: '2026-10-15' }, today)).toEqual({ what: 'Reset the jaw heater', who: 'OEM', due: '15 Oct', state: 'Open', tone: 'n' });
    expect(fixOf({ title: 'Reset the jaw heater', plannedFor: '2026-10-10', ranOn: '2026-10-12' }, today)).toMatchObject({ state: 'Done', due: 'done 12 Oct' });
  });
  it('late first, then open and waiting in their order, the done last', () => {
    const rows = [
      actionOf({ what: 'a', state: 'done' }, today), actionOf({ what: 'b', due: '2026-10-20', state: 'todo' }, today),
      actionOf({ what: 'c', due: '2026-10-01', state: 'todo' }, today), actionOf({ what: 'd', state: 'waiting' }, today),
    ];
    expect(planOrder(rows).map(r => r.what)).toEqual(['c', 'b', 'd', 'a']);
  });
});

describe('a loss count, read into the lean page', () => {
  const H = 3_600_000, MIN = 60_000;
  const D1 = new Date(2026, 9, 10, 6, 0).getTime(), D2 = D1 + 24 * H;
  const c1: LossCount = { shift: 'Shift 1', from: D1, to: D1 + 8 * H, breakMin: 30, plannedMin: 450, made: 36_500, rejects: 600, ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger' };
  const c2: LossCount = { ...c1, from: D2, to: D2 + 8 * H, made: 40_000, rejects: 300 };
  let n = 0;
  const stop = (at: number, mins: number, o: Partial<Observation> = {}): Observation => ({ id: `o${n++}`, workspaceId: 'w1', category: 'Breakdown', asset: 'Bagger', startedAt: at, endedAt: at + mins * MIN,
    durationMs: mins * MIN, timing: 'stopwatch', count: 1, media: [], createdAt: at, updatedAt: at, ...o });
  const obs = [
    stop(D1 + H, 32), stop(D1 + 3 * H, 12, { category: 'Minor stop', asset: 'Checkweigher' }), stop(D1 + 5 * H, 8, { category: 'Minor stop', asset: 'Checkweigher' }),
    stop(D1 + 6 * H, 18, { category: 'Changeover' }),
    stop(D2 + H, 10), stop(D2 + 6 * H, 18, { category: 'Changeover' }),
  ];
  const cost = { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, marginPerPack: 0.04 };
  const study = (id: string, c: LossCount, uses: ToolStudy['uses'] = []): ToolStudy => ({ id, tool: 'losses', name: `Shift 1, ${new Date(c.from).getDate()} Oct`, workspaceId: 'w1', projectId: 'p1',
    facts: { losses: c }, uses, startedAt: c.to, createdAt: c.to, updatedAt: c.to });
  const s1 = study('s1', c1);
  const s2 = study('s2', c2, [
    { id: 'u1', kind: 'action', ref: 'a1', role: 'evidence', at: D2 + 9 * H, step: 'cause:Breakdown' },
    { id: 'u2', kind: 'fix', ref: 'f1', role: 'evidence', at: D2 + 9 * H },
    { id: 'u3', kind: 'action', ref: 'a2', role: 'proof', at: D2 + 9 * H },
  ]);
  const f1 = lossFigures(c1, obs, cost), f2 = lossFigures(c2, obs, cost);
  const actions = raisedFrom(s2, [{ id: 'a1', what: 'Fit a jaw heater guard', who: 'Lee', due: '2026-10-12', state: 'todo' }, { id: 'a2', what: 'Not raised from it', state: 'todo' }],
    [{ id: 'f1', title: 'Reset the heater', withWhom: 'OEM', ranOn: '2026-10-13' }], lossPart(f2), '2026-10-14');
  const page = lossLean({ s: s2, f: f2, said: lossSays(f2, c2), line: 'Line 7', history: [{ s: s1, f: f1 }, { s: s2, f: f2 }], actions });

  it('the tiles: counted figures, each of what it should be and since the count before — no OEE', () => {
    expect(page.tiles.map(t => [t.k, t.v, t.of, t.change?.text, t.change?.better])).toEqual([
      ['Good packs', '40,000', 'of 45,000 expected · 88.9%', '3,500 more than 10 Oct', true],
      ['Lost', '50 min', 'of 450 min planned · 11.1%', '35 min less than 10 Oct', true],
      ['Stops timed', '2', '28 min stopped · 1 changeover', '42 min less than 10 Oct', true],
      ['Rejects', '300', 'packs · 0.7% of 40,300 run', '300 fewer than 10 Oct', true],
      ['What it cost', '£263', '£63 idle labour · £200 contribution', '£184 less than 10 Oct', true],
    ]);
  });
  it('the band, the trend over the line’s counts, and the plan from what was raised (not what it proves)', () => {
    expect([page.eyebrow, page.title, page.sub, page.verdict]).toEqual(['Loss count', 'Shift 1, 11 Oct', 'Line 7', { text: '19 min slow running and short stops', tone: 'a' }]);
    expect(page.facts).toEqual([['Day', 'Sun 11 Oct'], ['Shift', 'Shift 1 · 06:00–14:00'], ['Rate', '100 a minute']]);
    expect(page.trend?.points).toEqual([{ label: '10 Oct', v: 36_500, target: 45_000 }, { label: '11 Oct', v: 40_000, target: 45_000, now: true }]);
    expect(page.actions.map(a => [a.what, a.who, a.due, a.state, a.from])).toEqual([
      ['Fit a jaw heater guard', 'Lee', '12 Oct', 'Late', 'Breakdown on the Bagger'],
      ['Reset the heater', 'OEM', 'done 13 Oct', 'Done', undefined],
    ]);
  });
  it('what it means: the change first, then the biggest loss in minutes, share and pounds; the closing line', () => {
    expect(page.insights[0]).toEqual({ text: "Against 10 Oct: Lost 85 min → 50 min a shift; slow running and short stops 9 min → 19 min. The number moved; what moved it is the fix's to say.", tone: 'g' });
    expect(page.insights[1]).toEqual({ text: 'Slow running and short stops took the most: 19 min, 38% of the 50 min lost — £100.', tone: 'a' });
    expect(page.closing).toEqual({ text: 'Shift 1 made 40,000 of the 45,000 expected at 100 a minute (88.9%) — 50 min lost, the most to slow running and short stops (19 min), £263 in the shift. 1 action open.', tone: 'a' });
  });
  it('a count not yet counted says so on every tile, and has no trend of its own', () => {
    const c3: LossCount = { ...c2, made: undefined, rejects: undefined };
    const f3 = lossFigures(c3, obs, cost);
    const p3 = lossLean({ s: study('s3', c3), f: f3, said: lossSays(f3, c3), history: [{ s: s1, f: f1 }], actions: [] });
    expect(p3.tiles.map(t => t.v)).toEqual(['—', '—', '2', '—', '—']);
    expect(p3.trend).toBeUndefined();
    expect(p3.closing.text).toMatch(/^Count the shift: the packs made still to put in/);
  });
});
