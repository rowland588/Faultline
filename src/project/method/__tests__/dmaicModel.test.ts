import { describe, expect, it } from 'vitest';
import { charterOf, currentGate, dayWords, gatesOf, gatesSay, waitingOn } from '../shapes/dmaicModel';
import { fieldsOf } from '../../../lib/methodSheet';

const all = (section: string) => Object.fromEntries(fieldsOf('dmaic', section).map(f => [f.id, 'x']));

describe('the DMAIC charter and phase gates', () => {
  it('the charter is Define’s questions, and names what is missing', () => {
    const empty = charterOf({});
    expect(empty.total).toBe(fieldsOf('dmaic', 'Define').length);
    expect(empty.says).toBe('The charter is not written yet.');
    const some = charterOf({ problem: 'Seal failures on Line 7', goal: '' });
    expect(some.written).toBe(1);
    expect(some.says).toContain('still to write');
    expect(charterOf(all('Define')).says).toContain('complete');
  });
  it('a phase is stated in words from its answers and its review', () => {
    expect(gatesOf({}).map(g => g.state)).toEqual(Array(5).fill('Not started'));
    expect(gatesOf({ problem: 'x' })[0]!.state).toBe('Under way');
    expect(gatesOf(all('Define'))[0]!.state).toBe('Ready for review');
    const g = gatesOf({ ...all('Define'), rv_define_result: 'conditions', rv_define_who: ' Tanya ', rv_define_when: '2026-11-14' });
    expect(g[0]!.state).toBe('Passed with conditions');
    expect(g[0]!.review.who).toBe('Tanya');
    expect(gatesOf({ rv_measure_result: 'held' })[1]!.state).toBe('Held');
    expect(gatesOf({ rv_measure_result: 'nonsense' })[1]!.review.result).toBeUndefined();
  });
  it('the current phase is the first not passed; a held review says what the next waits on', () => {
    const g = gatesOf({ rv_define_result: 'passed', rv_measure_result: 'held' });
    expect(currentGate(g)?.key).toBe('measure');
    expect(waitingOn(g, 'analyse')).toContain('Measure was held');
    expect(waitingOn(g, 'measure')).toBeUndefined();
    expect(gatesSay(g)).toContain('1 of 5 phase reviews passed');
    const done = gatesOf(Object.fromEntries(['define', 'measure', 'analyse', 'improve', 'control'].map(k => [`rv_${k}_result`, 'passed'])));
    expect(currentGate(done)).toBeUndefined();
    expect(gatesSay(done)).toBe('All five phases have passed their review.');
  });
  it('a day is said as a day', () => {
    expect(dayWords('2026-11-14')).toBe('14 Nov 2026');
    expect(dayWords('soon')).toBe('soon');
  });
});
