import { describe, expect, it } from 'vitest';
import { placesOf } from '../jumpPlaces';
import { jumpTo } from '../jumpTo';
import type { Workspace } from '../../types';
import type { ToolStudy } from '../study';
const line = { id: 'line-a', name: 'Packing A', assets: [] } as unknown as Workspace;
const study = (id: string, name: string, machine: string, workspaceId = line.id): ToolStudy => ({ id, name, machine, workspaceId, tool: 'capability', facts: {}, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 });

describe('saved uses in record search', () => {
  it('finds individual uses by name or machine, with a direct link and line context', () => {
    const places = placesOf({ ws: [line], std: [], snags: [], assets: [], jobLines: [], projects: [], studies: [study('one', 'Fill weight morning', 'Filler'), study('two', 'Seal weight afternoon', 'Sealer')] });
    const first = jumpTo('Fill weight morning', places)[0];
    expect(first.href).toBe('#/capability/one'); expect(first.sub).toContain('Packing A'); expect(first.sub).toContain('Filler');
    expect(jumpTo('Sealer', places)[0].href).toBe('#/capability/two');
  });
  it('omits deleted uses and uses on lines outside the supplied scope', () => {
    const gone = { ...study('gone', 'Deleted use', 'Filler'), deletedAt: 2 };
    const places = placesOf({ ws: [line], std: [], snags: [], assets: [], jobLines: [], projects: [], studies: [gone, study('foreign', 'Other client use', 'Sealer', 'line-b')] });
    expect(places.some(p => p.href.includes('/gone') || p.href.includes('/foreign'))).toBe(false);
  });
});
