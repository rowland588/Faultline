import { describe, expect, it } from 'vitest';
import { ABANDON_REASONS, abandonReady, abandonedRemark, abandonedSays } from '../abandon';
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
});
