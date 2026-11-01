import { describe, expect, it } from 'vitest';
import { tocReport, sameStation } from '../toc';
import type { MethodReportCtx } from '../../../../lib/methodReportModel';
import { methodByKey } from '../../../../lib/methods';
import type { Standard } from '../../../../tools/linestandard/standard';
import type { Station } from '../../../../tools/linebalance/capacity';

/* The worked line of shapes/__tests__/tocModel.test.ts: Bagger 70 a minute; Basketer 5 baskets of 12 = 60 bags; Packer 15 s a basket =
 * 4 a minute = 48 bags, less the ILO's 9% rest = 44. Target 60, a 2 h buffer. Constraint Packer, 16 short, next Basketer (60). */
const st = (o: Partial<Station> & { id: string; name: string }): Station => ({ kind: 'machine', unit: 'bags', contains: 1, ...o } as Station);
const std = (buffer = true): Standard => ({
  id: 's1', projectId: 'p', product: 'Maris', marks: [], sort: 0, createdAt: 1, updatedAt: 2,
  capacity: { targetPerMin: 60, ...(buffer ? { bufferH: 2 } : {}), stations: [
    st({ id: 'a', name: 'Bagger', rate: 70, ratePer: 'min' }),
    st({ id: 'b', name: 'Basketer', unit: 'baskets', contains: 12, rate: 5, ratePer: 'min' }),
    st({ id: 'c', name: 'Packer', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 15, perCycle: 1 }),
  ] },
}) as unknown as Standard;

const ctxOf = (answers: Record<string, string>, standards: Standard[]): MethodReportCtx => {
  const method = methodByKey('toc');
  if (!method) throw new Error('no toc');
  return { method, project: { name: 'P' }, line: 'Line 1', answers, studies: [], findings: [], dash: {} as never, owed: [], today: '2026-11-01', answer: id => (answers[id] ?? '').trim(), ctx: { standards } };
};
const text = (s: ReturnType<typeof tocReport>) => JSON.stringify(s);

describe('the Theory of Constraints sections of the project report', () => {
  it('has the five parts of the loop, in order', () => {
    expect(tocReport(ctxOf({}, [std()])).map(s => s.id)).toEqual(['toc-constraint', 'toc-exploit', 'toc-subordinate', 'toc-elevate', 'toc-again']);
  });
  it('says the constraint, the gap and every station by hand', () => {
    const s = tocReport(ctxOf({}, [std()]))[0];
    expect(s.items[0]).toMatchObject({ kind: 'callout', tone: 'a', word: 'Watch', text: 'Packer limits the line: it makes 44 bags a minute against 60 wanted, 16 short.' });
    const t = s.items.find(i => i.kind === 'table');
    expect(t && t.kind === 'table' ? t.rows.map(r => [r[0], r[3]]) : []).toEqual([['Packer', 'Constraint'], ['Basketer', 'Next to limit'], ['Bagger', '']]);
    expect(t && t.kind === 'table' ? t.rows[0][1] : '').toBe('44');
  });
  it('flags a written constraint that is not the one the line reads, and one that matches is not flagged', () => {
    expect(tocReport(ctxOf({ constraint: 'Bagger' }, [std()]))[0].flags?.[0].text).toMatch(/wrote “Bagger” .* reads Packer/);
    expect(tocReport(ctxOf({ constraint: 'the packer', real: 'queue in front' }, [std()]))[0].flags).toEqual([]);
    expect(sameStation('The Packer', 'Packer')).toBe(true);
    expect(sameStation('', 'Packer')).toBe(false);
  });
  it('names the missing loss count, the missing buffer and the missing money — and invents none', () => {
    const all = tocReport(ctxOf({}, [std(false)]));
    expect(all[1].items[0]).toMatchObject({ kind: 'callout', text: 'No loss count in the project yet.' });
    expect(all[2].flags?.[0].text).toMatch(/No buffer is set in front of Packer/);
    expect(text(all)).toContain('Give the people and a rate an hour');
    expect(all[3].items.some(i => i.kind === 'money' && i.missing)).toBe(true);
  });
  it('does not flag a buffer that is set, and says the buffer in hours', () => {
    const s = tocReport(ctxOf({}, [std()]))[2];
    expect(s.flags).toEqual([]);
    expect(s.items[0]).toMatchObject({ text: 'A buffer of 2 hours of the constraint’s running time is set in front of Packer.' });
  });
  it('lists every pass with where it moved', () => {
    const s = tocReport(ctxOf({ constraint: 'Packer', moved: 'Basketer', 'constraint@2': 'Basketer' }, [std()]))[4];
    const t = s.items.find(i => i.kind === 'table');
    expect(t && t.kind === 'table' ? t.rows : []).toEqual([['Pass 1', 'Packer', 'Basketer', 'Moved on'], ['Pass 2', 'Basketer', 'Not moved yet', 'Current']]);
  });
  it('with no Line capacity at all says what is missing and where, with nothing invented', () => {
    const s = tocReport(ctxOf({}, []));
    expect(s[0].items[0]).toMatchObject({ tone: 'n', text: 'The constraint is not read yet.' });
    expect(text(s)).toContain('The project has no Line capacity with stations yet');
  });
});
