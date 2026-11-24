/* Who “John” is and what “this” attaches (24 November 2026, docs/LUNA-MAIL.md) — pure: no send, no AI, no figure invented. */
import { describe, expect, it } from 'vitest';
import { matchPerson, nameFromEmail, uniquePeople, type Person } from '../people';
import { emailBody, emailSubject, thisOf, type MailOutputs } from '../draft';
import type { Chart, ConvReport, DataResult } from '../../data/outputs';

const people: Person[] = [
  { name: 'john smith', email: 'john.smith@acme.test', how: 'People' },
  { name: 'John Patel', email: 'john.patel@acme.test', how: 'People' },
  { name: 'Sam', how: 'Line A · owner' },
];

const result = (id: string, groups: { key: string; v: number }[]): DataResult => ({
  id, title: 'Downtime by category', source: { kind: 'workbook', id: 'w', name: 'shift.xlsx' },
  query: {}, at: 1,
  result: {
    sheet: 'Log', rowsScanned: groups.length, rowsMatched: groups.length,
    groups: groups.map(g => ({ key: [g.key], values: [g.v], rows: 1, refs: ['A1'] })),
    groupsTotal: groups.length, totals: [groups.reduce((s, g) => s + g.v, 0)], measures: ['minutes'], groupBy: ['category'], skipped: [], notes: [],
  },
});
const chart = (id: string, resultId: string, title = 'Downtime by category'): Chart => ({
  id, at: 1, versions: [{ resultId, type: 'column', measure: 0, title }],
});
const report = (id: string, title: string, text: string): ConvReport => ({
  id, title, form: 'report', at: 1, updated: 1, version: 1,
  sections: [{ id: 's1', kind: 'finding', heading: 'Where the time goes', text, evidence: ['R1'] }],
});

describe('who John is', () => {
  it('an address typed is that address, even when they are not in the list', () => {
    const m = matchPerson('pat@site.test', people);
    expect(m.kind).toBe('one');
    if (m.kind === 'one') expect(m.hits[0]).toMatchObject({ email: 'pat@site.test', how: 'typed' });
  });
  it('one John with an address is that person; several Johns are named, never picked', () => {
    expect(matchPerson('john smith', people).kind).toBe('one');
    const several = matchPerson('John', people);
    expect(several.kind).toBe('several');
    if (several.kind === 'several') expect(several.hits.map(p => p.email)).toEqual(['john.smith@acme.test', 'john.patel@acme.test']);
  });
  it('a name with no address is said so; nobody is none; never a guessed address', () => {
    expect(matchPerson('Sam', people)).toMatchObject({ kind: 'no-email' });
    expect(matchPerson('Rowland', people).kind).toBe('none');
    expect(nameFromEmail('john.smith@acme.test')).toBe('john smith');
  });
  it('the same person once', () => {
    expect(uniquePeople([...people, people[0]]).map(p => p.email ?? p.name)).toEqual(['john.smith@acme.test', 'john.patel@acme.test', 'Sam']);
  });
});

describe('what this attaches', () => {
  const jam = result('R1', [{ key: 'Jam', v: 15 }, { key: 'Film', v: 12 }]);
  const c = chart('C1', 'R1');
  const r = report('D1', 'Line 2 downtime', 'Jams cost 15 minutes.');
  const o: MailOutputs = { results: [jam], charts: [c], reports: [r] };

  it('this is the latest chart, with the chart’s own figures — never a number invented', () => {
    const t = thisOf(o);
    expect('why' in t).toBe(false);
    if ('why' in t) return;
    expect(t.kind).toBe('chart');
    expect(t.body).toContain('Jam: 15');
    expect(t.body).toContain('Film: 12');
    expect(t.body).not.toMatch(/\b99\b/);
    expect(t.file?.contentType).toBe('image/svg+xml');
    expect(t.file?.name).toMatch(/\.svg$/);
  });
  it('with no chart, this is the latest report’s own sections', () => {
    const t = thisOf({ results: [jam], charts: [], reports: [r] });
    expect('why' in t).toBe(false);
    if ('why' in t) return;
    expect(t.kind).toBe('report');
    expect(t.body).toContain('Jams cost 15 minutes.');
    expect(t.file).toBeUndefined();
  });
  it('nothing to send is said; a covering line sits above and does not replace the figures', () => {
    expect(thisOf({ results: [], charts: [], reports: [] })).toEqual({ why: expect.stringMatching(/nothing in this conversation/i) });
    const t = thisOf(o);
    if ('why' in t) throw new Error(t.why);
    expect(emailSubject(t)).toBe('Downtime by category');
    expect(emailBody(t, 'Please see this.')).toMatch(/^Please see this\.\n\nDowntime by category/);
    expect(emailBody(t, 'Please see this.')).toContain('Jam: 15');
  });
});
