import { describe, expect, it } from 'vitest';
import { a3Sheet, cmField, cmRows, cmWritten, joinCm, latestOf, parseCm } from '../a3Model';

describe('the A3 sheet', () => {
  it('keeps a countermeasure as what | who | when | cause and reads an older answer as "what"', () => {
    expect(joinCm({ what: 'Calibrate the heater', who: 'Engineering', when: '7 Nov', cause: 'New jaw heater' })).toBe('Calibrate the heater | Engineering | 7 Nov | New jaw heater');
    expect(parseCm('Calibrate the heater | Engineering | 7 Nov | New jaw heater')).toEqual({ what: 'Calibrate the heater', who: 'Engineering', when: '7 Nov', cause: 'New jaw heater' });
    expect(parseCm('An older answer')).toEqual({ what: 'An older answer', who: '', when: '', cause: '' });
    expect(joinCm({ what: 'An older answer', who: '', when: '', cause: '' })).toBe('An older answer');
    expect(joinCm({ what: '', who: ' ', when: '', cause: '' })).toBe('');
  });
  it('lists countermeasures by row: counter, counter@2, counter@3', () => {
    expect([1, 2, 3].map(cmField)).toEqual(['counter', 'counter@2', 'counter@3']);
    expect(cmRows({}).length).toBe(1);
    const a = { counter: 'A | x | d | c1', 'counter@3': 'C | y | d | c2' };
    expect(cmRows(a).map(r => r.n)).toEqual([1, 2, 3]);
    expect(cmWritten(a).map(r => r.n)).toEqual([1, 3]);
  });
  it('puts three blocks left and four right, in Toyota’s order', () => {
    const s = a3Sheet({});
    expect(s.blocks.map(b => `${b.n}${b.side[0]}`)).toEqual(['1l', '2l', '3l', '4r', '5r', '6r', '7r']);
    expect(s.says).toBe('Nothing is written on the sheet yet.');
  });
  it('says what is missing: no follow-up, and countermeasures with no cause', () => {
    const s = a3Sheet({ why: 'Leakers cost £800 a week', target: '0.3% by 14 Nov', counter: 'Calibrate | Eng | 7 Nov | New jaw heater', 'counter@2': 'Checklist | Prod | 10 Nov' });
    expect(s.written).toBe(3);
    expect(s.noCause).toBe(1);
    expect(s.says).toBe('3 of 7 blocks written · the follow-up is not written — the page lives until it is · 1 countermeasure names no cause.');
    const done = a3Sheet({ followup: 'Four weeks of XmR', held: 'Held at 0.2%' });
    expect(done.says).not.toContain('follow-up is not written');
  });
  it('carries the tools’ own sentences to the current condition and the follow-up', () => {
    const s = a3Sheet({}, { current: { title: 'Capability study — Seal', says: 'It is capable.' } });
    expect(s.blocks[1].evidence?.says).toBe('It is capable.');
    expect(s.blocks[6].evidence).toBeUndefined();
  });
  it('picks the newest study of the named tools', () => {
    const st = [{ tool: 'capability', updatedAt: 5 }, { tool: 'chart', updatedAt: 9 }, { tool: 'losses', updatedAt: 99, deletedAt: 1 }, { tool: 'reliability', updatedAt: 100 }];
    expect(latestOf(st, ['capability', 'chart', 'losses'])?.tool).toBe('chart');
    expect(latestOf(st, ['analysis'])).toBeUndefined();
  });
});

describe('evidencePair', () => {
  it('never reads one study as both the number and its follow-up', async () => {
    const { evidencePair } = await import('../a3Model');
    const one = [{ id: 'a', tool: 'capability', updatedAt: 1 }];
    expect(evidencePair(one)).toEqual({ current: one[0] });
    const two = [...one, { id: 'b', tool: 'analysis', updatedAt: 2 }];
    expect(evidencePair(two).current?.id).toBe('a');
    expect(evidencePair(two).followup?.id).toBe('b');
  });
});
