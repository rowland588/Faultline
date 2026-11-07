import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { actionsSheet, trackerSheet } from '../listXlsx';
import { writeXlsx } from '../xlsxWrite';
import type { TrackerRow } from '../../line/actions/lineActions';
import type { ProjectAction } from '../projectActions';

const T0 = new Date(2026, 10, 9).getTime();
const row = (o: Partial<TrackerRow>): TrackerRow => ({ id: 'a', what: 'Fit the reel holder', owner: 'Sam', priority: 'high', status: 'open', start: T0, state: 'open', lateBy: 0, after: [], waiting: 0, ...o });

describe('a list to Excel', () => {
  it('the tracker: a row an action, the days as dates, what it waits for in words', () => {
    const sh = trackerSheet([row({ due: T0 + 3 * 864e5, after: ['b'], clash: 'Due 12 Nov, but it waits for “B”, due 14 Nov.' }), row({ id: 'c', what: 'Nobody yet', owner: '', state: 'nodate', priority: 'low' })], id => (id === 'b' ? 'Order the holder' : ''));
    expect(sh.rows[0]).toEqual(['Action', 'Machine', 'Who', 'Priority', 'Status', 'Raised', 'Due', 'Where it stands', 'Days late', 'Waits for', 'Its day']);
    expect(sh.rows[1]).toEqual(['Fit the reel holder', '', 'Sam', 'High', 'To do', { date: '2026-11-09' }, { date: '2026-11-12' }, 'On time', '', 'Order the holder', 'Due 12 Nov, but it waits for “B”, due 14 Nov.']);
    expect(sh.rows[2]?.[2]).toBe('Nobody yet');
    expect(sh.rows[2]?.[7]).toBe('No day');
  });
  it('actions: the project column only on the factory\'s, and a workbook Excel can open', () => {
    const a: ProjectAction = { key: 'k', kind: 'Problem', what: 'Send the regulator', who: '', due: '2026-11-08', late: true, soon: false, priority: 'critical', project: { id: 'p', name: 'Line 2 commissioning' } } as ProjectAction;
    expect(actionsSheet([a], true).rows[1]).toEqual(['Send the regulator', 'Line 2 commissioning', 'Problem', 'Critical', '', '', 'Nobody yet', { date: '2026-11-08' }, 'Late']);
    expect(actionsSheet([a], false).rows[0]).not.toContain('Project');
    const files = unzipSync(writeXlsx([actionsSheet([a], true)]));
    expect(strFromU8(files['xl/worksheets/sheet1.xml'] as Uint8Array)).toContain('Send the regulator');
  });
});
