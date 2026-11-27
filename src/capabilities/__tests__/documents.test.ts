/* document_look — classify and extract in code; customer in hand; archived never. */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CapCtx } from '../types';

const PAGES = [
  `Invitation to Tender (ITT)
Contracting authority: Northfield Foods Ltd
Tender ref: ITT-2026-014`,
  `Submission deadline: 14 January 2027
Total contract value: £48,000`,
];
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.UTC(2026, 10, 27, 9), isSuper: true, ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

async function seed() {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new (await import('fake-indexeddb')).IDBFactory());
  const db = await import('../../db');
  const reg = await import('../registry');
  const lines = await import('../../lib/lines');
  const made = await lines.addLineToFactory('Line 1');
  await db.updateWorkspace({ ...made, clientName: 'Acme Foods' });
  await db.putStudy({
    id: 'tender1', tool: 'source', name: 'ITT-2026-014.pdf', workspaceId: made.id,
    facts: {
      source: { name: 'ITT-2026-014.pdf', named: 'file', fileName: 'ITT-2026-014.pdf', kind: 'document', bytes: 1000, at: 5, fileId: 'tender1', status: 'ready', client: 'Acme Foods' },
      documentPages: { pages: PAGES, pageCount: 2, blank: 0 },
    } as never,
    uses: [], startedAt: 5, createdAt: 5, updatedAt: 5,
  });
  return { db, reg, line: made };
}

describe('document_look', { timeout: 30_000 }, () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('classifies a tender and extracts the labelled amount — never invents the supplier', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx(), call('document_look', { sourceId: 'tender1' }), { confirmed: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toMatch(/is a tender/);
    expect(r.says).toMatch(/£48,000/);
    expect(r.says).toMatch(/Not in the file: supplier/);
    expect(r.says).toMatch(/no AI used/);
    const data = r.data as { kind: string; missing: string[]; facts: { field: string; pounds?: number }[] };
    expect(data.kind).toBe('tender');
    expect(data.facts.find(f => f.field === 'amount')?.pounds).toBe(48000);
    expect(data.missing).toContain('supplier');
  });

  it('refuses another customer’s file, and an archived customer’s file', async () => {
    const { reg, db, line } = await seed();
    const { setActiveClient } = await import('../../lib/activeClient');
    const other = await (await import('../../lib/lines')).addLineToFactory('Line B');
    await db.updateWorkspace({ ...other, clientName: 'Brook Dairy' });
    await db.putStudy({
      id: 'brook-doc', tool: 'source', name: 'brook.pdf', workspaceId: other.id,
      facts: {
        source: { name: 'brook.pdf', named: 'file', fileName: 'brook.pdf', kind: 'document', bytes: 10, at: 5, fileId: 'brook-doc', status: 'ready', client: 'Brook Dairy' },
        documentPages: { pages: PAGES, pageCount: 2, blank: 0 },
      } as never,
      uses: [], startedAt: 5, createdAt: 5, updatedAt: 5,
    });
    await setActiveClient('Acme Foods');
    const r = await reg.runCall(ctx(), call('document_look', { sourceId: 'brook-doc' }), { confirmed: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/customer in hand/);
    const { archiveCustomer } = await import('../../lib/customers');
    expect((await archiveCustomer('Brook Dairy')).ok).toBe(true);
    const gone = await reg.runCall(ctx(), call('document_look', { sourceId: 'brook-doc' }), { confirmed: false });
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.why).toMatch(/archived/);
    expect((await reg.runCall(ctx(), call('document_look', { sourceId: 'tender1' }), { confirmed: false })).ok).toBe(true);
    expect(line.id).toBeTruthy();
  });
});
