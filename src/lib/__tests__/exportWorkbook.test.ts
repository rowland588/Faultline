/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { exportSheets, HEADS, type ProjectData } from '../exportWorkbook';
import { writeXlsx, excelDate } from '../xlsxWrite';
import { readXlsx } from '../xlsxRead';
import type { Test } from '../testing';
import type { Project } from '../../types';

/* Rowland: "I don't want to lose what I have just done — everything in the app
   data I want." These go through the real writer AND the app's own reader, so
   what is asserted is what Excel will open. */

const T = (o: Partial<Test> & { id: string; title: string }): Test =>
  ({ projectId: 'p', kind: 'test', outcome: 'planned', sort: 0, createdAt: 1, updatedAt: 1, ...o });

const project: Project = {
  id: 'p', name: 'Line 2 commissioning', color: '#000', workspaceIds: [], lead: 'Rowland',
  commissioning: true, plannedAt: '2026-10-13', expectedAt: '2026-10-21', createdAt: 1, updatedAt: 1,
} as Project;

const data: ProjectData = {
  project,
  assets: [{ id: 'a1', projectId: 'p', name: 'Ilapak flow wrapper', oem: 'Ilapak UK', state: 'running',
    dueOn: '2026-09-08', onSiteOn: '2026-09-08', runningOn: '2026-09-14', sort: 1, updatedAt: 1 }],
  tests: [
    T({ id: 's1', title: 'Seal integrity', assetId: 'a1', plannedFor: '2026-09-21', ranOn: '2026-09-21',
      outcome: 'failed', result: '3 leaked in 20', passesIf: 'Zero leaks in twenty' }),
    T({ id: 'f1', kind: 'fix', title: 'Re-cut the jaw', fromTestId: 's1', withWhom: 'Ilapak UK',
      plannedFor: '2026-09-24', ranOn: '2026-09-24', outcome: 'passed' }),
    /* A re-test planned from the FIX — an old chain. It must name the test. */
    T({ id: 's2', title: 'Seal integrity', fromTestId: 'f1', plannedFor: '2026-09-29' }),
    T({ id: 'g1', kind: 'fix', title: 'Guard on the infeed', outcome: 'passed' }),
  ],
  items: [{ id: 'i1', projectId: 'p', testId: 's1', kind: 'found', what: 'Jaw temperature drifting',
    owner: 'Ilapak UK', sort: 1, createdAt: 1, updatedAt: 1 }],
  materials: [{ id: 'm1', projectId: 'p', what: 'Finest Red film', from: 'Sealed Air', due: '2026-09-20',
    inOn: '2026-09-19', sort: 1, createdAt: 1, updatedAt: 1 }],
  programs: [{ id: 'pr1', projectId: 'p', what: 'P-104', assetId: 'a1', state: 'onMachine', testOn: '2026-10-02',
    from: 'Ilapak UK', sort: 1, createdAt: 1, updatedAt: 1 }],
};

const walk = {
  projectName: 'Line 2 commissioning',
  snags: [{ id: 'sn1', workspaceId: 'w', problem: 'Guard missing on the outfeed', status: 'open' as const,
    owner: 'Dave', raisedAt: Date.UTC(2026, 8, 20), updatedAt: 1 }],
  assets: [],
};

const book = () => {
  const bytes = writeXlsx(exportSheets([data], [walk], '2026-09-24'));
  const sheets = readXlsx(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const get = (name: string) => sheets.find(s => s.name === name)!;
  const col = (name: string, head: string) => {
    const s = get(name); const i = s.rows[0]!.indexOf(head);
    return s.rows.slice(1).map(r => r[i]);
  };
  return { sheets, get, col };
};

describe('everything in the app, as a workbook', () => {
  it('has a sheet for every list, headed exactly as the Excel tool expects', () => {
    const { sheets, get } = book();
    expect(sheets.map(s => s.name)).toEqual(['Read me', ...Object.keys(HEADS)]);
    for (const [name, heads] of Object.entries(HEADS)) expect(get(name).rows[0]).toEqual([...heads]);
  });

  it('writes dates as real dates Excel can compare, not text', () => {
    const { col } = book();
    const planned = col('Tests', 'Planned for')[0];
    expect(planned).toBeInstanceOf(Date);
    expect((planned as Date).toISOString().slice(0, 10)).toBe('2026-09-21');
    expect(excelDate('2026-09-24')).toBe(46289);
  });

  it('names a re-test by its ORIGINAL test, even when it was planned from a fix', () => {
    const { col } = book();
    expect(col('Tests', 'Test')).toEqual(['Seal integrity', 'Seal integrity (2)']);
    expect(col('Tests', 'Re-test of')[1]).toBe('Seal integrity');
  });

  it('puts fixes and snags in one Issues list, each saying which it is and which test', () => {
    const { col } = book();
    expect(col('Issues', 'Type')).toEqual(['Fix', 'Fix', 'Snag']);
    expect(col('Issues', 'For test').slice(0, 2)).toEqual(['Seal integrity', 'Not from a test']);
    expect(col('Issues', 'Status')).toEqual(['Done', 'Done', 'Open']);
    expect(col('Issues', 'Who')[2]).toBe('Dave');
  });

  it('keeps what was found, the materials and the programs', () => {
    const { col } = book();
    expect(col('Notes', 'What we saw')).toEqual(['Jaw temperature drifting']);
    expect(col('Materials', 'Here')).toEqual(['Yes']);
    expect(col('Programs', 'Written?')).toEqual(['On the machine']);
    expect(col('Programs', 'Machine')).toEqual(['Ilapak flow wrapper']);
  });

  it('carries the project and its two handover dates', () => {
    const { get } = book();
    expect(get('Projects').rows[1]!.slice(0, 3)).toEqual(['Line 2 commissioning', 'Commissioning', 'Rowland']);
  });
});
