import { describe, expect, it } from 'vitest';
import { coaching, currentRow, pulse, rowCount, rowKey, rowsOf, storyboard } from '../kataBoard';
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
