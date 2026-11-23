import { describe, expect, it } from 'vitest';
import { periodKey, scheduleDue, londonWeekday } from '../standingJob/schedule';
import { buildWeeklyDigest } from '../standingJob/digest';
import type { ClientScope } from '../activeClient';

const cs = (client: string): ClientScope => ({
  clients: [client], client, several: false, filtering: true, all: false,
  lineClient: () => client, projectClients: () => [client], whose: () => client,
  line: () => true, project: () => true, record: () => true, projectOf: () => true, recordOf: () => true,
  customers: [], archived: [],
});

describe('standing job schedule', () => {
  it('weekly is due on Monday when last period differs', () => {
    const mon = new Date('2026-11-23T12:00:00Z'); // Monday in London
    expect(londonWeekday(mon.getTime())).toBe(1);
    expect(scheduleDue('weekly', '2026-W46', 1, mon.getTime())).toBe(true);
    expect(scheduleDue('weekly', periodKey('weekly', mon.getTime()), 1, mon.getTime())).toBe(false);
  });
});

describe('weekly digest', () => {
  it('names problems and does not invent figures', () => {
    const built = buildWeeklyDigest({
      client: 'Branston', cs: cs('Branston'), lines: [{ id: 'l1', name: 'Line 3', open: 2, critical: 1 }],
      brief: [], open: [{ id: 'p1', problem: 'Jam on Bagger', workspaceId: 'l1', status: 'open', priority: 'critical' } as never],
      sources: [], studies: [], scope: { picture: false, files: false, problems: true, variance: false },
    });
    expect(built.text).toMatch(/Jam on Bagger/);
    expect(built.sections.some(s => s.title === 'Problems open')).toBe(true);
  });
});