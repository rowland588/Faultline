/* What the AI costs, read from assist_usage (src/colleague/usage), on rows built by hand. */
import { describe, expect, it } from 'vitest';
import { dayKey, moneyOf, perRequest, readUsage, todayAgainst, type UsageRow } from '../usage';

const NOW = Date.parse('2026-11-08T12:00:00Z');
const H = 3_600_000, D = 24 * H;
const row = (ago: number, task: string, micros: number, tin = 1000, tout = 200, ok = true): UsageRow =>
  ({ at: new Date(NOW - ago).toISOString(), task, model: 'claude-opus-5-5', input_tokens: tin, output_tokens: tout, cost_micros: micros, ok });

const rows: UsageRow[] = [
  row(H, 'colleague', 20_000), row(2 * H, 'colleague', 30_000), row(3 * H, 'colleague', 10_000, 1000, 200, false),
  row(D + H, 'talk', 50_000),
  row(3 * D, 'brief-read', 5_000), row(3 * D, 'brief-asks', 7_000),
  row(31 * D, 'story', 999_000),   // outside the 30 days
];

describe('readUsage', () => {
  const u = readUsage(rows, NOW);
  it('totals in the window, the old row left out', () => {
    expect([u.calls, u.failed, u.micros]).toEqual([6, 1, 122_000]);
    expect(u.tokensIn).toBe(6000);
    expect(u.perCallMicros).toBe(Math.round(122_000 / 6));
  });
  it('by task in the gateway\'s order, each with its cost per answer', () => {
    expect(u.byTask.map(t => t.task)).toEqual(['colleague', 'talk', 'brief-read', 'brief-asks']);
    expect(u.byTask[0]).toMatchObject({ calls: 3, failed: 1, micros: 60_000, perCallMicros: 20_000, words: 'AI Mode — Luna' });
  });
  it('by day: every day of the window, a quiet day at 0, the newest last', () => {
    expect(u.byDay).toHaveLength(30);
    expect(u.byDay[29]).toMatchObject({ day: dayKey(NOW), calls: 3, micros: 60_000, tokens: 3600 });
    expect(u.byDay.reduce((s, d) => s + d.calls, 0)).toBe(6);
  });
  it('nothing: zeroes, no division by zero', () => {
    const e = readUsage([], NOW);
    expect([e.calls, e.perCallMicros, e.byTask.length, e.byDay.length]).toEqual([0, 0, 0, 30]);
  });
});

describe('todayAgainst', () => {
  const $ = moneyOf().say;
  it('the last 24 hours against each allowance used, the two brief tasks sharing one', () => {
    const t = todayAgainst(rows, NOW, $);
    expect(t.map(a => a.words)).toEqual(['AI Mode — Luna']);
    expect(t[0].said).toBe('3 of 120 answers · $0.06 of $8.00');
    const all = todayAgainst(rows, NOW + 3 * D - 2 * H, $, true);
    expect(all.find(a => a.tasks.includes('brief-read'))?.calls).toBe(0);
  });
  it('near and spent said in words', () => {
    const many = Array.from({ length: 20 }, (_, i) => row(i * 60_000, 'story', 1000));
    expect(todayAgainst(many, NOW, $)[0]).toMatchObject({ spent: true });
    expect(todayAgainst(many, NOW, $)[0].said).toContain('spent until the 24 hours move on');
    expect(todayAgainst(many.slice(0, 17), NOW, $)[0].said).toContain('close to the allowance');
  });
});

describe('moneyOf', () => {
  it('dollars with no rate, saying none is guessed', () => {
    const m = moneyOf();
    expect(m.currency).toBe('$');
    expect(m.say(1_234_567)).toBe('$1.23');
    expect(m.say(3_000)).toBe('$0.0030');
    expect(m.say(0)).toBe('$0');
    expect(m.note).toContain('none is guessed');
  });
  it('pounds only when a rate is set', () => {
    const m = moneyOf(0.8);
    expect(m.say(1_000_000)).toBe('£0.80');
    expect(m.note).toContain('$1 = £0.8');
    expect(moneyOf(Number.NaN).currency).toBe('$');
    expect(moneyOf(0).currency).toBe('$');
  });
});

describe('perRequest', () => {
  it('per answer only when the device holds no requests', () => {
    expect(perRequest(60_000, 3, 0)).toEqual({ said: expect.stringContaining('Per answer only') });
  });
  it('an upper bound from the device\'s requests', () => {
    const p = perRequest(60_000, 3, 2);
    expect(p.perRequestMicros).toBe(30_000);
    expect(p.answersPerRequest).toBe(1.5);
    expect(p.said).toContain('at most');
  });
});
