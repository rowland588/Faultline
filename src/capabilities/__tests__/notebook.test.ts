/* THE NOTEBOOK OF MEANINGS (docs/LUNA-NEXT.md L3): a meaning kept only on the person's yes, in the client's notebook (the line's client),
 * never read for another client; the same word replacing its meaning with the old one struck and kept; the person's own notebook beside
 * it; a client nobody's line carries refused; an entry taken off struck, kept; what Luna is told with each turn. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';

vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

async function seed() {
  const db = await import('../../db'); const reg = await import('../registry'); const lines = await import('../../lib/lines'); const nb = await import('../../colleague/notebook');
  const acme = await lines.addLineToFactory('Line 4'); await db.updateWorkspace({ ...acme, clientName: 'Acme Foods' });
  const brook = await lines.addLineToFactory('Line 7'); await db.updateWorkspace({ ...brook, clientName: 'Brook Dairy' });
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), me: 'Rowland', ...o });
  return { db, reg, nb, acme, brook, ctx };
}

describe('note_meaning', () => {
  it('waits for the yes, then keeps it in the line\'s client\'s notebook — never told to another client', async () => {
    const { reg, nb, acme, brook, ctx } = await seed();
    expect((await reg.runCall(ctx(), call('note_meaning', { term: 'downtime', means: 'unplanned stops only', lineId: acme.id }), { confirmed: false })).ok).toBe(false);
    const prev = await reg.capabilityByName('note_meaning')?.preview?.(ctx(), { term: 'downtime', means: 'unplanned stops only', lineId: acme.id });
    expect(prev).toBe('Keep in Acme Foods’s notebook: “downtime” means unplanned stops only. Every conversation about Acme Foods is told it from now; take it off any time.');
    const r = await reg.runCall(ctx(), call('note_meaning', { term: 'downtime', means: 'unplanned stops only', lineId: acme.id }), { confirmed: true });
    expect(r.ok && r.says).toBe('Kept in Acme Foods’s notebook: “downtime” means unplanned stops only.');
    const a = await nb.readNotebooks('Acme Foods'); const b = await nb.readNotebooks('Brook Dairy');
    expect(nb.notebookText(a.own, a.client)).toBe('What words mean for Acme Foods (the notebook — confirmed by the person; use them, never another client\'s):\n  - “downtime”: unplanned stops only');
    expect(nb.notebookText(b.own, b.client)).toBe('');
    const read = await reg.runCall(ctx(), call('notebook', { lineId: brook.id }), { confirmed: false });
    expect(read.ok && read.says).toBe('Brook Dairy’s notebook holds nothing yet.');
  });

  it('the same word replaces its meaning, the old one struck and kept; the person\'s own beside it; a made-up client refused', async () => {
    const { reg, nb, acme, ctx } = await seed();
    await reg.runCall(ctx(), call('note_meaning', { term: 'Celox', means: 'Line 3', lineId: acme.id, kind: 'name' }), { confirmed: true });
    const r = await reg.runCall(ctx(), call('note_meaning', { term: 'celox', means: 'Line 4, the fresh Celox area', client: 'acme foods', kind: 'name' }), { confirmed: true });
    expect(r.ok && r.says).toBe('Kept in Acme Foods’s notebook: “celox” means Line 4, the fresh Celox area. (It replaced “Line 3”.)');
    await reg.runCall(ctx(), call('note_meaning', { term: 'a shift', means: '7.5 hours of running', own: true, kind: 'rule' }), { confirmed: true });
    const a = await nb.readNotebooks('Acme Foods');
    expect(a.client?.facts.notebook.entries.map(e => [e.means, !!e.struck])).toEqual([['Line 3', true], ['Line 4, the fresh Celox area', false]]);
    expect(nb.notebookText(a.own, a.client)).toMatch(/“celox”: Line 4, the fresh Celox area\nWhat words mean wherever they work \(their own notebook\):\n {2}- “a shift”: 7.5 hours of running/);
    const no = await reg.runCall(ctx(), call('note_meaning', { term: 'x', means: 'y', client: 'Acne Foods' }), { confirmed: true });
    expect(no.ok).toBe(false);
    expect(!no.ok && no.why).toMatch(/No line of the factory is for a client called “Acne Foods” — the clients are Acme Foods, Brook Dairy/);
  });

  it('forget_meaning strikes an entry and keeps it', async () => {
    const { reg, nb, acme, ctx } = await seed();
    const r = await reg.runCall(ctx(), call('note_meaning', { term: 'downtime', means: 'unplanned stops only', lineId: acme.id }), { confirmed: true });
    const id = r.ok ? (r.data as { entryId: string }).entryId : '';
    const f = await reg.runCall(ctx(), call('forget_meaning', { entryId: id }), { confirmed: true });
    expect(f.ok && f.says).toBe('Taken off Acme Foods’s notebook: “downtime”.');
    const a = await nb.readNotebooks('Acme Foods');
    expect(nb.liveEntries(a.client)).toEqual([]);
    expect(a.client?.facts.notebook.entries[0].struck).toBeTruthy();
  });
});
