import { describe, expect, it } from 'vitest';
import { ABANDON_REASONS, abandonReady, callReady, abandonedRemark, abandonedSays, callOf, callRemark, callSays } from '../abandon';
import { studySays } from '../studyLinks';
import type { ToolStudy } from '../study';

const a = { at: 1, reason: 'Machine fault', why: 'left jaw heater tripped', taken: 11 };

describe('abandoning a test', () => {
  it('needs a chosen reason, and words for “Something else”', () => {
    expect(abandonReady('', '')).toBe(false);
    expect(abandonReady('Machine fault', '')).toBe(true);
    expect(abandonReady('Something else', '  ')).toBe(false);
    expect(abandonReady('Something else', 'ran out of film')).toBe(true);
    expect(abandonReady('Not a reason', 'x')).toBe(false);
    expect(ABANDON_REASONS).toHaveLength(6);
  });
  it('says the same sentence everywhere', () => {
    expect(abandonedSays(a)).toBe('Abandoned — machine fault: left jaw heater tripped. It had 11 readings when it stopped; nothing is judged from them.');
    expect(abandonedSays({ ...a, why: undefined, taken: 1 })).toBe('Abandoned — machine fault. It had 1 reading when it stopped; nothing is judged from them.');
    expect(abandonedRemark(a)).toBe('Test abandoned — machine fault: left jaw heater tripped (11 readings taken).');
  });
  it('is neither passed nor failed to a program’s criterion', () => {
    const s = { id: 's', tool: 'capability', name: 'x', uses: [], facts: { abandoned: a }, agreed: { readings: { kind: 'ticks', count: 20 } }, startedAt: 0, createdAt: 0, updatedAt: 0 } as unknown as ToolStudy;
    const said = studySays(s);
    expect(said.verdict).toBe('Abandoned');
    expect(said.tone).toBe('a');
  });
  it('is one call — failed, passed or abandoned — read the same everywhere', () => {
    const readings = { text: '11 of 20 checked — all good so far.', tone: 'w', verdict: '11 of 20 in' } as never;
    const over = { verdict: 'Didn’t pass', why: 'machine fault: left jaw heater tripped', at: 5, by: 'Rowland' };
    expect(callOf({ facts: {}, overrule: undefined })).toBeUndefined();
    expect(callOf({ facts: {}, overrule: over })).toMatchObject({ call: 'failed', by: 'Rowland' });
    expect(callOf({ facts: {}, overrule: { ...over, verdict: 'Passed' } })?.call).toBe('passed');
    expect(callOf({ facts: { abandoned: a }, overrule: undefined })?.call).toBe('abandoned');
    const failed = callSays({ facts: {}, overrule: over }, readings);
    expect(failed).toMatchObject({ verdict: 'Failed', tone: 'r' });
    expect(failed.text).toBe('Failed — called by Rowland: machine fault: left jaw heater tripped. The readings said: 11 of 20 in.');
    expect(callSays({ facts: {}, overrule: undefined }, readings)).toBe(readings);
    expect(callSays({ facts: { abandoned: a }, overrule: undefined }, readings).verdict).toBe('Abandoned');
    expect(callRemark('failed', 'Machine fault', 'jaw', 11)).toBe('Test called failed — machine fault: jaw.');
    expect(callRemark('abandoned', 'Machine fault', '', 1)).toBe('Test abandoned — machine fault (1 reading taken).');
  });
});

describe('failing or passing a test needs no reason (Rowland, 3 November)', () => {
  it('fail and pass are ready with nothing said; abandon still asks why; Something else needs words', () => {
    expect(callReady('failed', '', '')).toBe(true);
    expect(callReady('passed', '', '')).toBe(true);
    expect(callReady('abandoned', '', '')).toBe(false);
    expect(callReady('abandoned', 'Machine fault', '')).toBe(true);
    expect(callReady('failed', 'Something else', '')).toBe(false);
    expect(callReady('failed', 'Something else', 'film jammed')).toBe(true);
  });
  it('says no reason given rather than a blank', () => {
    expect(callRemark('failed', '', '', 5)).toBe('Test called failed — no reason given.');
  });
});
