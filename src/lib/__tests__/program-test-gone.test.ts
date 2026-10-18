/* A TEST DELETED, ITS PROGRAM FORGETS IT (lib/programs programAfterTestGone).
 * Rowland, 18 October: a test deleted on the job, and its program still read
 * "on the machine · test 20 Oct" — the record held the memory of a test that
 * was gone. */
import { describe, expect, it } from 'vitest';
import { programAfterTest, programAfterTestGone, type Program, type ProvingTest } from '../programs';

const prog = (o: Partial<Program> = {}): Program => ({ id: 'p1', projectId: '', workspaceId: 'w', what: 'Tesco Finest 2kg — 8 in a tray', state: 'onMachine', sort: 0, createdAt: 0, updatedAt: 0, ...o });
const booked: ProvingTest = { id: 't1', programId: 'p1', outcome: 'planned', plannedFor: '2026-10-20' };

describe('a deleted test leaves its program', () => {
  it('the booked day and the link come off', () => {
    const p = programAfterTest(prog(), booked) as Program;
    expect([p.testOn, p.testId]).toEqual(['2026-10-20', 't1']);
    expect(programAfterTestGone(p, booked)).toMatchObject({ testOn: undefined, testId: undefined, state: 'onMachine' });
  });
  it('a proof that was its pass comes off — back on the machine', () => {
    const pass: ProvingTest = { id: 't2', programId: 'p1', outcome: 'passed', ranOn: '2026-10-15' };
    const p = programAfterTest(prog(), pass) as Program;
    expect(p.provedOn).toBe('2026-10-15');
    expect(programAfterTestGone(p, pass)).toMatchObject({ state: 'onMachine', provedOn: undefined, testId: undefined });
  });
  it('a day typed by hand that is not the test\'s day stays', () => {
    const p = prog({ testOn: '2026-10-25', testId: 't1' });
    expect(programAfterTestGone(p, booked)).toMatchObject({ testOn: '2026-10-25', testId: undefined });
  });
  it('the program follows the test it still has — an earlier attempt that passed proves it again', () => {
    const first: ProvingTest & { createdAt: number } = { id: 't0', programId: 'p1', outcome: 'passed', ranOn: '2026-10-10', createdAt: 1 };
    const retest: ProvingTest = { id: 't3', programId: 'p1', outcome: 'planned', plannedFor: '2026-10-20' };
    const p = prog({ testOn: '2026-10-20', testId: 't3' });
    expect(programAfterTestGone(p, retest, [first])).toMatchObject({ state: 'proved', provedOn: '2026-10-10', testId: 't0' });
  });
  it('a test about another program changes nothing', () => {
    expect(programAfterTestGone(prog({ testOn: '2026-10-20' }), { ...booked, id: 'tx', programId: 'other' })).toBeUndefined();
  });
});
