import { describe, expect, it } from 'vitest';
import { coaching, currentRow, predictedAfter, pulse, rowCount, rowKey, rowsOf, storyboard, writtenAtOf } from '../kataBoard';
import { fieldsOf } from '../methodSheet';

describe('the Kata storyboard', () => {
  it('keeps row 1 on the plain ids and later rows on @n', () => {
    expect(rowKey(1, 'step')).toBe('step');
    expect(rowKey(3, 'prediction')).toBe('prediction@3');
  });
  it('counts the rows from the answers, at least one', () => {
    expect(rowCount({})).toBe(1);
    expect(rowCount({ step: 'a', 'result@4': 'x', 'step@2': '' })).toBe(4);
    const r = rowsOf({ step: 'a', 'step@2': 'b', 'result@2': 'c' });
    expect(r.map(x => x.step)).toEqual(['a', 'b']);
    expect(r[1].result).toBe('c');
  });
  it('the current row is the first step with no result, else the last written', () => {
    expect(currentRow({ step: 'a', result: 'r', 'step@2': 'b' })?.n).toBe(2);
    expect(currentRow({ step: 'a', result: 'r', 'step@2': 'b', 'result@2': 'r2' })?.n).toBe(2);
    expect(currentRow({})).toBeUndefined();
  });
  it('the pulse: experiments run, open, days since the last step, stopped at three', () => {
    const a = { step: 'a', result: 'r', ran: '2026-10-28', 'step@2': 'b', 'ran@2': '2026-10-29' };
    const p = pulse(a, '2026-11-01');
    expect(p.run).toBe(1); expect(p.open).toBe(1); expect(p.sinceDays).toBe(3); expect(p.stopped).toBe(true);
    expect(p.says).toContain('1 experiment run');
    expect(p.says).toContain('last step 3 days ago');
    expect(pulse(a, '2026-10-30').stopped).toBe(false);
    expect(pulse({}, '2026-11-01').says).toBe('0 experiments run · none open.');
  });
  it('the five coaching questions are answered from the board and name what is missing', () => {
    const c = coaching({ target: '52 a minute by 20 Nov', current: '46 to 49', measure: 'packs a minute', obstacles: 'film tension', obstacle_now: 'film tension', step: 'Re-set the dancer', prediction: '50', see_by: 'Tomorrow 9:00' });
    expect(c).toHaveLength(5);
    expect(c[0].said).toEqual(['52 a minute by 20 Nov']);
    expect(c[1].said).toEqual(['Measure: packs a minute', '46 to 49']);
    expect(c[3].said).toEqual(['Next step: Re-set the dancer', 'We expect: 50']);
    expect(c[4].said).toEqual(['Tomorrow 9:00']);
    expect(coaching({})[2].missing).toBe('No obstacle is written yet.');
  });
  it('every field it reads is a question of the method', () => {
    const ids = new Set(['Understand the direction', 'Grasp the current condition', 'Establish the next target condition', 'Experiment toward it'].flatMap(s => fieldsOf('kata', s).map(f => f.id)));
    for (const id of ['challenge', 'coach', 'measure', 'current', 'target', 'obstacles', 'obstacle_now', 'step', 'prediction', 'result', 'learning', 'ran', 'see_by']) expect(ids.has(id)).toBe(true);
    expect(storyboard({}, '2026-11-01').cells.map(c => c.title)).toEqual(['Challenge', 'Current condition', 'Target condition', 'Obstacles']);
  });
});

/* knowledge/specs/FC-017-improvement-kata.md, criterion 4 — "predictions written after the result are the common fraud against oneself; the
 * record carries the time of each" (knowledge/methods/lean/toyota-kata.md). Hand-worked moments, in ms. */
describe('a prediction written after its result', () => {
  const T0 = Date.UTC(2026, 10, 18, 10, 0);   // 10:00
  const note = (field: string, at: number, extra: Record<string, unknown> = {}) => ({ testId: `method:kata:${field}`, kind: 'note', createdAt: at, ...extra });
  const a = { step: 'Re-set the dancer', prediction: '50', result: '47', 'step@2': 'Lighter reel', 'prediction@2': '49', 'result@2': '49', 'step@3': 'Splice by two', 'prediction@3': '30', 'result@3': '45' };
  it('reads each answer’s first-written moment by field id, from the Kata’s own notes only', () => {
    const at = writtenAtOf([note('prediction', T0), note('result', T0 + 60_000), note('prediction@2', T0 + 300_000), note('result@2', T0 + 300_000),
      note('prediction@3', T0 + 600_000), note('result@3', T0 + 300_000), note('step', T0, { deletedAt: 5 }), { testId: 'method:pdca:prediction', kind: 'note', createdAt: 1 },
      { testId: 'method:kata:ran', kind: 'next', createdAt: 9 }, { testId: 'method:kata:learning' }]);
    expect(at).toEqual({ prediction: T0, result: T0 + 60_000, 'prediction@2': T0 + 300_000, 'result@2': T0 + 300_000, 'prediction@3': T0 + 600_000, 'result@3': T0 + 300_000 });
  });
  it('experiment 3’s prediction (10:10) came after its result (10:05) — said; one written first (1) or at the same moment (2) is not', () => {
    const at = { prediction: T0, result: T0 + 60_000, 'prediction@2': T0 + 300_000, 'result@2': T0 + 300_000, 'prediction@3': T0 + 600_000, 'result@3': T0 + 300_000 };
    expect(predictedAfter(a, at)).toEqual([3]);
  });
  it('an answer with no moment is never judged; a step with no result or no prediction is not this check’s', () => {
    expect(predictedAfter(a, { 'prediction@3': T0 + 600_000 })).toEqual([]);
    expect(predictedAfter(a, {})).toEqual([]);
    expect(predictedAfter({ 'step@3': 'x', 'prediction@3': '30' }, { 'prediction@3': 2, 'result@3': 1 })).toEqual([]);
  });
});
