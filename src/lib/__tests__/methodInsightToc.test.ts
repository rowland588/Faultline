import { describe, expect, it } from 'vitest';
import { tocInsight } from '../methodInsights/toc';

const run = (answers: Record<string, string>) => tocInsight({ answers, studies: [], owed: [], today: '2026-11-01' });

describe('the Theory of Constraints reads its project', () => {
  it('says nothing when nothing is wrong', () => {
    expect(run({})).toEqual({});
    expect(run({ constraint: 'Packer', exploit: 'Fix the jam', rules: 'Pace the bagger', option: 'x' })).toEqual({});
  });
  it('the constraint moved and the next pass has not started: go again from there', () => {
    const r = run({ constraint: 'Packer', moved: 'Basketer', inertia: 'Retire the old buffer' });
    expect(r.attention).toHaveLength(1);
    expect(r.attention?.[0].text).toBe('The constraint has moved: pass 1 says it is now Basketer, and pass 2 has not been started — read the line again from there.');
    expect(r.next).toBe('Go again: start pass 2 at Basketer — read Line capacity afresh and find what limits the line now.');
  });
  it('the old rule is asked about on the first move only when not written', () => {
    expect(run({ constraint: 'Packer', moved: 'Basketer' }).attention).toHaveLength(2);
    expect(run({ constraint: 'Packer', moved: 'Basketer', 'constraint@2': 'Basketer' }).attention).toBeUndefined();
  });
  it('a later pass that moved asks for pass 3, from where it went', () => {
    const r = run({ constraint: 'Packer', moved: 'Basketer', 'constraint@2': 'Basketer', 'moved@2': 'Bagger' });
    expect(r.next).toBe('Go again: start pass 3 at Bagger — read Line capacity afresh and find what limits the line now.');
  });
  it('spending written before exploiting is amber; once exploit is written it is not', () => {
    expect(run({ option: 'A second packer' }).attention?.[0]).toMatchObject({ tone: 'a' });
    expect(run({ option: 'A second packer', exploit: 'Cut jams, 40 min' }).attention).toBeUndefined();
  });
  it('exploit with no rule for the rest is a note, not an alarm', () => {
    expect(run({ constraint: 'Packer', exploit: 'Fix jams' }).attention?.[0]).toMatchObject({ tone: 'n' });
    expect(run({ constraint: 'Packer', exploit: 'Fix jams', buffer: '2 h' }).attention).toBeUndefined();
  });
});
