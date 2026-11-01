import { describe, expect, it } from 'vitest';
import { DISCIPLINES, actionRows, allStates, closingLine, disciplineState, isNotPairs, nextActionN } from '../eightD';
import { fieldsOf } from '../methodSheet';
import { methodByKey } from '../methods';

describe('8D form', () => {
  it('has nine disciplines, none written on an empty project', () => {
    expect(DISCIPLINES.map(d => d.key)).toEqual(['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']);
    expect(allStates({}).every(s => s.word === 'Not started')).toBe(true);
    expect(closingLine({})).toBe('0 of 9 disciplines written; D0 Symptom and emergency response is next.');
  });
  it('every sheet field named by a discipline exists, and every discipline sits under a method section', () => {
    const m = methodByKey('eight-d')!;
    for (const d of DISCIPLINES) {
      expect(m.sections.map(s => s.name)).toContain(d.section);
      for (const f of d.fields.filter(x => !/^is(not)?_/.test(x.id))) expect(fieldsOf('eight-d', d.section).map(x => x.id)).toContain(f.id);
    }
  });
  it('states read in words', () => {
    const d1 = DISCIPLINES[1];
    expect(disciplineState(d1, { team: 'Sam leads' }).word).toBe('All written');
    expect(disciplineState(DISCIPLINES[0], { symptom: 'Leakers' })).toMatchObject({ word: 'Under way', written: 1, of: 4 });
    expect(disciplineState(DISCIPLINES[0], { symptom: 'x' }).says).toBe('Under way — 1 of 4');
  });
  it('D2: the matrix pairs, or the two sentences', () => {
    const a = { is_what: 'a', isnot_what: 'b', is_where: 'c', isnot_where: 'd', is_when: 'e', isnot_when: 'f', is_much: 'g', isnot_much: 'h' };
    expect(disciplineState(DISCIPLINES[2], a).word).toBe('All written');
    expect(disciplineState(DISCIPLINES[2], { is_what: 'a' }).word).toBe('Under way');
    expect(disciplineState(DISCIPLINES[2], { is: 'x', isnot: 'y' }).word).toBe('All written');
    expect(isNotPairs({ is_when: 'Mondays' })[2]).toEqual({ q: 'When', is: 'Mondays', isnot: '' });
  });
  it('D6 is not written while an action is open', () => {
    const base = { validated: 'Ppk 1.6' };
    expect(disciplineState(DISCIPLINES[6], { ...base, 'act@1': 'New jaw', 'actdone@1': '' }).says).toBe('Under way — 1 of 2 · 1 action open');
    expect(disciplineState(DISCIPLINES[6], { ...base, 'act@1': 'New jaw', 'actdone@1': 'yes' }).word).toBe('All written');
  });
  it('the action list keeps order and the next number', () => {
    const a = { 'act@2': 'B', 'act@1': 'A', 'actwho@1': 'Sam', 'actdue@1': '3 Nov' };
    expect(actionRows(a).map(r => r.what)).toEqual(['A', 'B']);
    expect(actionRows(a)[0]).toMatchObject({ who: 'Sam', due: '3 Nov', done: false });
    expect(nextActionN(a)).toBe(3);
  });
});
