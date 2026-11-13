/* Luna's doors onto a machine's manual (13 November, docs/ASSET-DOCUMENTS.md): the manual's words are on the record; she finds what it
 * says with its page, drafts the PM list the OEM states (rules first; her additions only if their words are on the page), and makes it a
 * Planned maintenance log on the person's word. The manual is the made-up bagger manual of lib/manual's tests. */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CapCtx } from '../types';

const PAGES = [
  `BX-200 Vertical bagger — Operating manual\n1 Technical data\nMaximum speed 120 bags per minute\nBag width 80 – 250 mm`,
  `7 Maintenance\nLubricate the main drive chain every 500 operating hours with ISO VG 68 oil.\n\n\nDaily\n• Clean the film path and the forming shoulder\nWeekly\n- Inspect the sealing jaw PTFE tape and replace if marked`,
  `7.3 Other\nThe vacuum pump filter is a wear part. Renew the filter element when the gauge reads below 0.6 bar or at twelve-week intervals at the latest.`,
];
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.UTC(2026, 10, 13, 9), isSuper: true, ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

async function seed() {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new (await import('fake-indexeddb')).IDBFactory());
  const db = await import('../../db');
  const reg = await import('../registry');
  const lines = await import('../../lib/lines');
  const made = await lines.addLineToFactory('Line 1');
  await db.updateWorkspace({ ...made, clientName: 'Acme', assets: ['Bagger'] });
  const L = made.id;
  await db.putStudy({ id: 'd1', tool: 'source', name: 'BX-200 manual', workspaceId: L, machine: 'Bagger',
    facts: { source: { name: 'BX-200 manual', named: 'file', fileName: 'BX-200.pdf', kind: 'document', bytes: 1000, at: 5, fileId: 'd1', status: 'ready', machine: 'Bagger', client: 'Acme' }, manual: { docKind: 'manual', pages: PAGES, pageCount: 3, blank: 0 } } as never,
    uses: [], startedAt: 5, createdAt: 5, updatedAt: 5 });
  return { db, reg, L };
}

describe('Luna and a machine’s manual', { timeout: 30_000 }, () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it('lists the documents on a machine', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx(), call('list_documents', { machine: 'bagger' }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/1 document kept: BX-200 manual \(manual, Bagger, 3 pages\) \[d1\]/);
  });
  it('says what the manual says about speed, with its page — and that it says nothing where it does not', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx(), call('find_in_document', { documentId: 'd1', topic: 'speed' }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/p\.1: .*Maximum speed 120 bags per minute/);
    const n = await reg.runCall(ctx(), call('find_in_document', { documentId: 'd1', words: 'servo drive firmware' }), { confirmed: false });
    expect(n.ok && n.says).toMatch(/says nothing a search finds about “servo drive firmware”/);
  });
  it('drafts the PM list by rule, takes an added task whose words are on its page, and drops one that is not in the manual', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx(), call('draft_pm_list', { documentId: 'd1', add: [
      { task: 'Renew the vacuum pump filter element', every: 12, unit: 'week', oem: 'twelve-week intervals', page: 3, quote: 'Renew the filter element when the gauge reads below 0.6 bar' },
      { task: 'Replace the knife', every: 2000, unit: 'hour', oem: 'every 2000 hours', page: 2, quote: 'Replace the knife every 2000 hours' },
    ] }), { confirmed: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = r.data as { tasks: { task: string; by: string; page: number }[]; dropped: string[] };
    expect(d.tasks.map(t => [t.task, t.by, t.page])).toEqual([
      ['Lubricate the main drive chain with ISO VG 68 oil', 'rules', 2], ['Clean the film path and the forming shoulder', 'rules', 2],
      ['Inspect the sealing jaw PTFE tape and replace if marked', 'rules', 2], ['Renew the vacuum pump filter element', 'luna', 3],
    ]);
    expect(d.dropped).toEqual(['“Replace the knife” — its words are not on page 2']);
    expect(r.says).toMatch(/every 500 hours \(the manual: “every 500 operating hours”\), p\.2/);
  });
  it('makes nothing without the person’s word, then a Planned maintenance log on the machine’s line with each task’s interval and page', async () => {
    const { reg, db, L } = await seed();
    const held = await reg.runCall(ctx(), call('make_pm_list', { documentId: 'd1' }), { confirmed: false });
    expect(held.ok).toBe(false);
    expect((await db.listAllStudies()).filter(s => s.tool === 'log')).toHaveLength(0);
    const r = await reg.runCall(ctx(), call('make_pm_list', { documentId: 'd1', leaveOut: ['Clean the film path and the forming shoulder'] }), { confirmed: true });
    expect(r.ok).toBe(true);
    const log = (await db.listAllStudies()).find(s => s.tool === 'log');
    expect(log).toMatchObject({ workspaceId: L, machine: 'Bagger', name: 'Bagger — PM from the manual' });
    const checks = log?.agreed?.log?.checks ?? [];
    expect(log?.agreed?.log?.key).toBe('planned-maintenance');
    expect(checks.map(c => [c.name, c.when, c.where, c.stdHours])).toEqual([
      ['Lubricate the main drive chain with ISO VG 68 oil', { every: 500, unit: 'hour' }, 'Bagger', undefined],
      ['Inspect the sealing jaw PTFE tape and replace if marked', { every: 1, unit: 'week' }, 'Bagger', undefined],
    ]);
    expect(checks[0].criterion).toBe('Done as the manual says — “Lubricate the main drive chain every 500 operating hours with ISO VG 68 oil.” (BX-200 manual, p.2; interval: “every 500 operating hours”)');
  });
  it('a client may read the manual and make nothing', async () => {
    const { reg } = await seed();
    expect((await reg.runCall(ctx({ isSuper: false, level: 'client' }), call('draft_pm_list', { documentId: 'd1' }), { confirmed: false })).ok).toBe(true);
    const w = await reg.runCall(ctx({ isSuper: false, level: 'client' }), call('make_pm_list', { documentId: 'd1' }), { confirmed: true });
    expect(w.ok).toBe(false);
  });
});
