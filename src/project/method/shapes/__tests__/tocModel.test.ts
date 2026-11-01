import { describe, expect, it } from 'vitest';
import { nextPass, readToc, tocPasses, tocSteps } from '../tocModel';
import type { Standard } from '../../../../tools/linestandard/standard';
import type { Station } from '../../../../tools/linebalance/capacity';

/* the worked line: a bagger at 70 a minute, a basketer of 12 at 5 a minute (so 60 bags), a person (15 s a basket → 4 a minute, 48 bags, less the ILO 9% rest = 44) */
const st = (o: Partial<Station> & { id: string; name: string }): Station => ({ kind: 'machine', unit: 'bags', contains: 1, ...o } as Station);
const std: Standard = {
  id: 's1', projectId: 'p', product: 'Maris', marks: [], sort: 0, createdAt: 1, updatedAt: 2,
  capacity: { targetPerMin: 60, bufferH: 2, stations: [
    st({ id: 'a', name: 'Bagger', rate: 70, ratePer: 'min' }),
    st({ id: 'b', name: 'Basketer', unit: 'baskets', contains: 12, rate: 5, ratePer: 'min' }),
    st({ id: 'c', name: 'Packer', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 15, perCycle: 1 }),
  ] },
} as unknown as Standard;

describe('the five focusing steps read from the line', () => {
  it('names the constraint, the gap and the next station from Line capacity', () => {
    const s = tocSteps({}, { standards: [std], studies: [] });
    expect(s).toHaveLength(5);
    expect(s[0].says).toBe('Packer limits the line: it makes 44 bags a minute against 60 wanted, 16 short.');
    expect(s[0].lines.join(' ')).toContain('The next to limit it is Basketer');
    expect(s[4].says).toContain('moves to Basketer');
  });
  it('names a missing input and invents nothing', () => {
    const s = tocSteps({}, { standards: [], studies: [] });
    expect(s[0].says).toBe('The constraint is not read yet.');
    expect(s[0].missing[0]).toMatch(/no Line capacity/);
    expect(s[1].missing[0]).toMatch(/Count a shift/);
    expect(s[2].says).toBe('No buffer is set in front of the constraint.');
  });
  it('reads the buffer the line protects its constraint with', () => {
    expect(tocSteps({}, { standards: [std], studies: [] })[2].says).toBe('A buffer of 2 hours of the constraint’s running time is set in front of Packer.');
  });
  it('counts what is written, with the person’s words beside the reading', () => {
    const s = tocSteps({ constraint: 'Packer', real: 'A queue in front of it' }, { standards: [std], studies: [] });
    expect(s[0].state.written).toBe(2);
    expect(s[0].answers.find(a => a.id === 'constraint')?.value).toBe('Packer');
    expect(readToc({ standards: [std], studies: [] }).capacity?.r.limit?.station.name).toBe('Packer');
  });
});

describe('going again', () => {
  it('passes round the loop, the next starting where the last said the constraint moved', () => {
    expect(tocPasses({ constraint: 'Packer' })).toEqual([{ n: 1, constraint: 'Packer', moved: '' }]);
    expect(nextPass({ constraint: 'Packer' })).toBeUndefined();
    expect(nextPass({ constraint: 'Packer', moved: 'Basketer' })).toEqual({ n: 2, constraint: 'Basketer' });
    const a = { constraint: 'Packer', moved: 'Basketer', 'constraint@2': 'Basketer', 'moved@2': 'Bagger' };
    expect(tocPasses(a).map(p => p.constraint)).toEqual(['Packer', 'Basketer']);
    expect(nextPass(a)).toEqual({ n: 3, constraint: 'Bagger' });
  });
});
