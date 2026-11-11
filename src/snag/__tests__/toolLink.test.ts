import { describe, expect, it } from 'vitest';
import type { Snag } from '../types';
import { linkedTo, partOn, problemsOn, raisedFromTool, toolLinksOf, toolLinksOfTags, toolLinksToTags, withToolLink, withoutToolLink } from '../toolLink';

const base: Snag = { id: 'p1', workspaceId: 'ws', problem: 'Sealer jaw sticking', status: 'open', raisedAt: 1000, updatedAt: 1000, linkedObsIds: ['o1'] };

describe('a problem held by a tool record (docs/TOOL-PROBLEMS.md)', () => {
  it('writes and reads the four tag shapes, the part after the first colon', () => {
    const links = [{ studyId: 'st-1', part: 'w03', raised: true as const }, { studyId: 'st-2' }, { studyId: 'st-3', part: 'step:4' }, { studyId: 'st-4', raised: true as const }];
    const tags = toolLinksToTags(links);
    expect(tags).toEqual(['raised:st-1:w03', 'study:st-2', 'study:st-3:step:4', 'raised:st-4']);
    expect(toolLinksOfTags(tags).tools).toEqual(links);
    expect(toolLinksOfTags(['o1', 'waste:motion', 'after:p9'])).toEqual({});
    expect(toolLinksOfTags(['study:', 'raised:'])).toEqual({});
    expect(toolLinksOfTags(['study:a', 'study:a'])).toEqual({ tools: [{ studyId: 'a' }] });
    expect(toolLinksOfTags(undefined)).toEqual({});
  });

  it('round-trips through the cloud row beside the Pareto links, the waste tag and the after: links — none of them disturbed', async () => {
    const { MAPS } = await import('../../cloud/mappers');
    const s: Snag = { ...base, waste: 'motion', after: ['p9'], tools: [{ studyId: 'st-1', part: 'w03', raised: true }, { studyId: 'st-2' }] };
    const row = MAPS.snags.toRow(s, 'u');
    expect(row.linked_obs_ids).toEqual(['o1', 'waste:motion', 'after:p9', 'raised:st-1:w03', 'study:st-2']);
    const back = MAPS.snags.fromRow(row) as unknown as Snag;
    expect(back.linkedObsIds).toEqual(['o1']);
    expect(back.waste).toBe('motion');
    expect(back.after).toEqual(['p9']);
    expect(back.tools).toEqual([{ studyId: 'st-1', part: 'w03', raised: true }, { studyId: 'st-2' }]);
    const plain = MAPS.snags.fromRow(MAPS.snags.toRow(base, 'u')) as unknown as Snag;
    expect(plain.tools).toBeUndefined();
    expect(plain.linkedObsIds).toEqual(['o1']);
  });

  it('adds, keeps raised, removes, and reads which part', () => {
    let l = withToolLink(undefined, { studyId: 'st-1', part: 'w03', raised: true });
    l = withToolLink(l, { studyId: 'st-1', part: 'w03' });
    expect(l).toEqual([{ studyId: 'st-1', part: 'w03', raised: true }]);
    l = withToolLink(l, { studyId: 'st-2' });
    expect(toolLinksOf({ tools: [...l].reverse() })[0].raised).toBe(true);
    expect(raisedFromTool({ tools: l })).toEqual({ studyId: 'st-1', part: 'w03', raised: true });
    expect(raisedFromTool({ tools: [{ studyId: 'x' }] })).toBeUndefined();
    expect(withoutToolLink(l, 'st-1')).toEqual(l);                 // the whole record is not the part
    expect(withoutToolLink(l, 'st-1', 'w03')).toEqual([{ studyId: 'st-2' }]);
    expect(withoutToolLink([{ studyId: 'st-2' }], 'st-2')).toBeUndefined();
    expect(linkedTo({ tools: l }, 'st-1')).toBe(true);
    expect(linkedTo({ tools: l }, 'st-1', 'w03')).toBe(true);
    expect(linkedTo({ tools: l }, 'st-1', '')).toBe(false);
    expect(linkedTo({ tools: l }, 'st-2', '')).toBe(true);
    expect(partOn({ tools: l }, 'st-1')).toBe('w03');
    expect(partOn({ tools: l }, 'st-2')).toBe('');
  });

  it('lists a record’s problems open first then newest, the deleted left out, a part asked narrowing it', () => {
    const on = (id: string, status: Snag['status'], at: number, part?: string, gone?: boolean): Snag => ({ ...base, id, status, raisedAt: at, tools: [{ studyId: 'st-1', ...(part ? { part } : {}) }], ...(gone ? { deletedAt: 5 } : {}) });
    const list = [on('a', 'closed', 3000, 'w01'), on('b', 'open', 1000, 'w02'), on('c', 'open', 2000), on('d', 'open', 4000, 'w01', true), { ...base, id: 'e' }];
    expect(problemsOn(list, 'st-1').map(s => s.id)).toEqual(['c', 'b', 'a']);
    expect(problemsOn(list, 'st-1', 'w01').map(s => s.id)).toEqual(['a']);
    expect(problemsOn(list, 'st-1', '').map(s => s.id)).toEqual(['c']);
  });
});
