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

import { actionState, dayOf, isOnlyRetraining, isStoppingPlace } from '../eightD';
import { eightDInsight } from '../methodInsights/eight-d';
import { eightDReport } from '../../project/method/report/eight-d';

describe('8D reading against today (hand-worked)', () => {
  it('reads a typed day, or says it cannot', () => {
    expect(dayOf('2026-11-07', '2026-11-01')).toBe('2026-11-07');
    expect(dayOf('7 Nov', '2026-11-01')).toBe('2026-11-07');
    expect(dayOf('7th November 2027', '2026-11-01')).toBe('2027-11-07');
    expect(dayOf('7/11/2026', '2026-11-01')).toBe('2026-11-07');
    expect(dayOf('31 Feb', '2026-11-01')).toBe('');
    expect(dayOf('next Friday', '2026-11-01')).toBe('');
  });
  it('an action is done, late (open, day before today) or open; an unreadable day is never late', () => {
    const r = (due: string, done = false) => ({ n: 1, what: 'x', who: '', due, done });
    expect(actionState(r('30 Oct'), '2026-11-01')).toBe('late');
    expect(actionState(r('1 Nov'), '2026-11-01')).toBe('open');
    expect(actionState(r('30 Oct', true), '2026-11-01')).toBe('done');
    expect(actionState(r('soon'), '2026-11-01')).toBe('open');
  });
  it('stopping places and retraining', () => {
    expect(isStoppingPlace('Operator error on the night shift')).toBe(true);
    expect(isStoppingPlace('Heater read 12 °C low after the jaw change')).toBe(false);
    expect(isOnlyRetraining('Retrain the operators')).toBe(true);
    expect(isOnlyRetraining('Heater calibration at every jaw change')).toBe(false);
  });
});

describe('8D insight', () => {
  const run = (answers: Record<string, string>) => eightDInsight({ answers, studies: [], owed: [], today: '2026-11-01' });
  it('says nothing on an empty project', () => expect(run({})).toEqual({ attention: [] }));
  it('a late action is red, names who, and is the next thing', () => {
    const r = run({ 'act@1': 'Fit new jaw', 'actwho@1': 'Sam', 'actdue@1': '30 Oct' });
    expect(r.attention?.[0]).toMatchObject({ tone: 'r', text: 'Corrective action 1 (Fit new jaw) was due 30 Oct and is not done — Sam has it.' });
    expect(r.next).toBe('Chase corrective action 1: Fit new jaw (Sam).');
  });
  it('a cause with no containment, no escape point, and a stopping place', () => {
    const r = run({ why: 'Operator error' });
    const t = r.attention?.map(a => a.text) ?? [];
    expect(t.some(x => x.startsWith('A cause is written but D3 containment is not'))).toBe(true);
    expect(t.some(x => x.startsWith('The cause is written but not the escape point'))).toBe(true);
    expect(t.some(x => x.includes('stopping place'))).toBe(true);
    expect(r.next).toBe('Write D4’s escape point: the check that should have found it.');
  });
  it('all actions done, nothing validated', () => {
    const r = run({ 'act@1': 'Calibrate heater', 'actwho@1': 'Sam', 'actdue@1': '2026-10-20', 'actdone@1': 'yes' });
    expect(r.attention?.map(a => a.tone)).toEqual(['a']);
    expect(r.next).toBe('Write “Validated on the number”: the measure after the action.');
  });
  it('retraining alone is amber; open actions without owner or day are named', () => {
    expect(run({ 'act@1': 'Retrain operators', 'actwho@1': 'Sam', 'actdue@1': '9 Nov' }).attention?.[0].text).toMatch(/retraining/);
    expect(run({ 'act@1': 'Fit jaw' }).attention?.[0].text).toBe('1 corrective action has no owner or day yet — an action nobody owns by a day does not get done.');
  });
});

describe('8D report sections', () => {
  const ctx = (answers: Record<string, string>) => ({ answers, today: '2026-11-01' }) as never;
  it('four sections in order; the actions table says Late, Open, Done', () => {
    const s = eightDReport(ctx({ 'act@1': 'A', 'actdue@1': '30 Oct', 'act@2': 'B', 'actdue@2': '9 Nov', 'actwho@2': 'Pat', 'act@3': 'C', 'actdone@3': 'yes' }));
    expect(s.map(x => x.id)).toEqual(['disciplines', 'isnot', 'cause', 'actions']);
    const t = s[3].items.find(i => i.kind === 'table');
    expect(t && t.kind === 'table' && t.rows.map(r => r[4])).toEqual(['Late', 'Open', 'Done']);
    expect(s[3].lead).toBe('3 listed: 1 done, 2 open, 1 late.');
    expect(t && t.kind === 'table' && t.rows[1].slice(2, 4)).toEqual(['Pat', '9 Nov']);
  });
  it('half-written pairs are named', () => {
    const s = eightDReport(ctx({ is_what: 'Leakers' }));
    expect(s[1].items.some(i => i.kind === 'paragraph' && i.text.startsWith('1 of the 4 pairs'))).toBe(true);
  });
});
