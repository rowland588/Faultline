/* describe_connection — abilities from code truth (docs/LUNA-ABILITIES.md P1). */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), data: await import('../data') });
const ctx = (o: { conversationId?: string; now?: number } = {}) => ({ now: Date.now(), ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

describe('describe_connection', () => {
  it('by kind: workbook lists real abilities and limits — nothing invented', async () => {
    const { reg } = await fresh();
    const r = await reg.runCall(ctx(), call('describe_connection', { kind: 'workbook' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    const data = r.data as { can: { label: string; cap?: string }[]; cannot: string[] };
    expect(data.can.map(x => x.label)).toContain('Ask figures over every row');
    expect(data.can.some(x => x.cap === 'query_workbook')).toBe(true);
    expect(data.cannot).toContain('Change cells in the Excel file');
    expect(r.says).toMatch(/Luna can:/);
    expect(JSON.stringify(r)).not.toContain('edit cells live');
  }, 60_000);

  it('by kind: manual names document capabilities only', async () => {
    const { reg } = await fresh();
    const r = await reg.runCall(ctx(), call('describe_connection', { kind: 'manual' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    const data = r.data as { can: { cap?: string }[] };
    expect(data.can.map(x => x.cap)).toEqual(expect.arrayContaining(['find_in_document', 'list_procedures', 'make_procedure']));
  }, 60_000);

  it('by sourceId: uses the file’s kind and refuses when not in hand', async () => {
    const { reg, db, lines, data } = await fresh();
    const { setActiveClient } = await import('../../lib/activeClient');
    const a = await lines.addLineToFactory('Line A');
    const b = await lines.addLineToFactory('Line B');
    await db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
    await db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
    const src = await data.registerFile(ctx({ conversationId: 'c1' }), {
      fileId: 'wb-t', fileName: 'trial.xlsx', kind: 'workbook', bytes: 10, status: 'ready',
      sheets: [{ name: 'Data', rows: 1, columns: [{ name: 'x', type: 'number' }] }],
      client: 'Acme Foods',
    });
    expect(src?.id).toBeTruthy();
    await setActiveClient('Brook Dairy');
    const r = await reg.runCall(ctx(), call('describe_connection', { sourceId: src!.id }), { confirmed: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/customer in hand/);
    await setActiveClient('Acme Foods');
    const ok = await reg.runCall(ctx(), call('describe_connection', { sourceId: src!.id }), { confirmed: false });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.says).toContain('Trial');
  }, 60_000);
});