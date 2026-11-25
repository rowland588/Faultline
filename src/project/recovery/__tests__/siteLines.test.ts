import { describe, expect, it } from 'vitest';
import type { Workspace } from '../../../types';
import { linesAtSite, otherLinesAtSite } from '../siteLines';

const line = (id: string, clientName: string, siteName: string): Workspace => ({ id, name: id, clientName, siteName } as Workspace);

describe('another recovery at the same site', () => {
  const all = [line('packing', 'Acme', 'Hull'), line('filling', 'Acme', 'Hull'), line('other-site', 'Acme', 'Leeds'), line('other-client', 'Beta', 'Hull')];

  it('offers another line at this client and site only', () => {
    expect(otherLinesAtSite(all, all[0], ['packing']).map(l => l.id)).toEqual(['filling']);
    expect(linesAtSite(all, ' hull ', 'ACME').map(l => l.id)).toEqual(['packing', 'filling']);
  });

  it('does not claim a shared site when none was named', () => {
    expect(otherLinesAtSite(all, line('unknown', 'Acme', ''), ['unknown'])).toEqual([]);
  });
});
