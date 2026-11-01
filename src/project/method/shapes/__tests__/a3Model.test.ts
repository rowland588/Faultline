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

describe('the A3 worked case and the fishbone it reads (cases-doc.py A1 — the record’s leaking seals on lane 3)', () => {
  const answers = {
    why: 'Leakers cost a retailer complaint and £800 a week', current: 'Lane 3 at 3.2% against 0.3% on the others', currentnum: '3.2%', target: '0.3% on lane 3 by 14 Nov',
    root: 'The new jaw’s heater reads low', plan: 'Calibrate 7 Nov, checklist 10 Nov',
    counter: 'Calibrate the heater at every jaw change | Engineering | 7 Nov | the new jaw’s heater', 'counter@2': 'Jaw-change checklist | Production | 10 Nov | the new jaw’s heater',
  };
  it('six of seven blocks written, two countermeasures that all name a cause, the follow-up still open', () => {
    const s = a3Sheet(answers);
    expect(s.written).toBe(6);
    expect(s.cms.length).toBe(2);
    expect(s.noCause).toBe(0);
    expect(s.says).toBe('6 of 7 blocks written · the follow-up is not written — the page lives until it is.');
  });
  it('says what the fishbone holds at the analysis, and which root no countermeasure names', () => {
    const one = a3Sheet(answers, { causes: [{ text: 'The new jaw’s heater reads low', root: true, whys: 3 }, { text: 'Film batch', root: false, whys: 1 }] });
    expect(one.blocks[3].evidence).toEqual({ title: 'The project’s fishbone', says: '2 causes on the fishbone, 1 marked as the root: “The new jaw’s heater reads low” (3 whys). Every root has a countermeasure that names it.' });
    const two = a3Sheet(answers, { causes: [{ text: 'The new jaw’s heater reads low', root: true, whys: 3 }, { text: 'Film tension', root: true, whys: 1 }] });
    expect(two.blocks[3].evidence?.says).toBe('2 causes on the fishbone, 2 marked as the root: “The new jaw’s heater reads low” (3 whys); “Film tension” (1 why). No countermeasure names “Film tension” yet.');
    expect(a3Sheet(answers, { causes: [{ text: 'x', root: false, whys: 0 }] }).blocks[3].evidence?.says).toBe('1 cause on the fishbone, none marked as the root yet.');
    expect(a3Sheet(answers, { causes: [] }).blocks[3].evidence).toBeUndefined();
  });
});
