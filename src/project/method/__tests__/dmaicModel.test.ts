import { dmaicEvidence } from '../dmaicEvidence';
import { placementNote } from '../../../lib/methodPlacement';
import { describe, expect, it } from 'vitest';
import { charterOf, currentGate, dayWords, gatesOf, gatesSay, insertionsOf, waitingOn } from '../shapes/dmaicModel';
import { fieldsOf } from '../../../lib/methodSheet';
import { studyLine } from '../../../lib/studyLinks';
import { newScoredStudy } from '../../../tools/scored/scored';
import controlPlan from '../../../tools/scored/defs/control-plan';
import fmea from '../../../tools/scored/defs/fmea';

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
  it('keeps the chosen phase, original dates and separate runs when repeated tool records are later edited', () => {
    const first = newScoredStudy(controlPlan, { name: 'First run', projectId: 'P', workspaceId: 'Line 1', now: Date.UTC(2026, 10, 5, 12), id: 'a' });
    const second = newScoredStudy(controlPlan, { name: 'Pilot', projectId: 'P', workspaceId: 'Line 1', now: Date.UTC(2026, 10, 19, 12), id: 'b' });
    const legacy = { ...first, id: 'legacy' };
    const notes = [
      placementNote({ projectId: 'P', method: 'dmaic', section: 'Measure' }, 'study', first.id, 1),
      placementNote({ projectId: 'P', method: 'dmaic', section: 'Improve' }, 'study', second.id, 2),
      placementNote({ projectId: 'sister', method: 'dmaic', section: 'Analyse' }, 'study', legacy.id, 3),
    ];
    const records = dmaicEvidence('P', notes, [second, legacy, { ...first, updatedAt: second.updatedAt + 3000 }]);
    expect(Object.fromEntries(records.map(r => [r.id, r.phase]))).toEqual({ legacy: 'Other project evidence', a: 'Measure', b: 'Improve' });
    expect(records[records.length - 1]?.id).toBe('b');
    expect(records.find(r => r.id === 'a')?.value).toContain('5 Nov 2026');
    expect(records.find(r => r.id === 'b')?.value).toContain('19 Nov 2026');
    expect(insertionsOf(records).find(s => s.id === 'cplan')?.records).toEqual([]);
  });
  /* knowledge/specs/FC-138-dmaic.md, criterion 7 — Control reads the chart AND the control plan row (ISO 13053-1; FC-133) */
  it('Control reads the control chart and the control plan, each in its own words; an FMEA is not taken for the plan', () => {
    const cp = newScoredStudy(controlPlan, { name: 'Line 7 sealer — control plan', workspaceId: 'L7', projectId: 'P', now: 2000, id: 'cp' });
    const fm = newScoredStudy(fmea, { name: 'Line 7 sealer — FMEA', workspaceId: 'L7', projectId: 'P', now: 3000, id: 'fm' });
    const none = insertionsOf([]).filter(i => i.phase === 'control');
    expect(none.map(i => [i.id, i.fc, i.records.length])).toEqual([['hold', 'FC-086', 0], ['cplan', 'FC-133', 0]]);
    const notes = [fm, cp].map(v => placementNote({ projectId: 'P', method: 'dmaic', section: 'Control' }, 'study', v.id, 10));
    const got = insertionsOf(dmaicEvidence('P', notes, [fm, cp])).find(i => i.id === 'cplan')!;
    expect(got.records.length).toBe(1);
    expect(got.records[0]?.study?.name).toBe('Line 7 sealer — control plan');
    expect(got.records[0]?.value).toContain(studyLine(cp).text);
    expect(got.at).toBe('/scored/control-plan');
    expect(insertionsOf(dmaicEvidence('P', notes, [{ ...cp, deletedAt: 4000 }])).find(i => i.id === 'cplan')!.records.length).toBe(0);
    /* every slot is at a phase, once, and the charter is the only one opened as "the charter" */
    expect(insertionsOf([]).map(i => i.id)).toEqual(['charter', 'baseline', 'gauge', 'evidence', 'pilot', 'hold', 'cplan']);
  });
});
