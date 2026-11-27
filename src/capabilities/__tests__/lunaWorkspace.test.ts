/* MOVE INTO A WORKSPACE — this customer's chat and files; never another customer's, never archived (27 November). */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';
import { newConversation } from '../../colleague/conversation';
import { folderIdOf, newLunaFolder } from '../../colleague/lunaFolder';
import { ASK_WORKSPACE_NAME } from '../../colleague/moveIntoWorkspace';
import { CLIENT_KEY } from '../../lib/activeClient';

vi.setConfig({ testTimeout: 15_000 });
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
  });
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines') });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.parse('2026-11-27T12:00:00'), conversationId: 'conv', me: 'Rowland', ...o });

const source = (id: string, name: string, extra: Record<string, unknown>, t: number, client?: string) => ({
  id, tool: 'source' as const, name,
  facts: { source: { name, named: 'file' as const, fileName: `${id}.xlsx`, kind: 'workbook' as const, bytes: 10, at: t, fileId: `wb-${id}`, status: 'ready' as const, ...(client ? { client } : {}), ...extra } },
  uses: [], startedAt: t, createdAt: t, updatedAt: t,
} as never);

describe('move_into_workspace — this customer’s chat and files', () => {
  it('is local — no confirm card', async () => {
    const { reg } = await fresh();
    expect(reg.capabilityByName('move_into_workspace')?.kind).toBe('local');
  });

  it('without a name, asks once and moves nothing', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy(newConversation({ id: 'conv', at: t, name: 'Inbox', client: 'Acme Foods' }));
    const r = await reg.runCall(ctx(), call('move_into_workspace', {}), { confirmed: false });
    expect(r.ok && r.says).toBe(ASK_WORKSPACE_NAME);
    expect(folderIdOf((await db.getStudy('conv'))!)).toBeUndefined();
  });

  it('creates this customer’s workspace and moves the chat and its file', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy(newConversation({ id: 'conv', at: t, name: 'Inbox', client: 'Acme Foods' }));
    await db.putStudy(source('f1', 'Inbox workbook', { conversationId: 'conv' }, t, 'Acme Foods'));
    const r = await reg.runCall(ctx(), call('move_into_workspace', { name: 'Night shift' }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/Chat and its files moved to Night shift/);
    const chat = await db.getStudy('conv');
    const folderId = folderIdOf(chat!);
    expect(folderId).toBeTruthy();
    const folder = await db.getStudy(folderId!);
    expect(folder && (folder.facts as { named?: string }).named).toBe('Night shift');
    expect((folder!.facts as { client?: string }).client).toBe('Acme Foods');
    const file = await db.getStudy('f1');
    expect((file!.facts as { source: { folderId?: string } }).source.folderId).toBe(folderId);
  });

  it('matches this customer’s existing workspace by name, never another customer’s', async () => {
    const { db, reg, lines } = await fresh();
    const t = Date.now();
    const a = await lines.addLineToFactory('Line A');
    const b = await lines.addLineToFactory('Line B');
    await db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
    await db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
    store.set(CLIENT_KEY, 'Acme Foods');
    await db.putStudy(newLunaFolder({ id: 'ws-brook', at: t, name: 'Night shift', client: 'Brook Dairy' }));
    await db.putStudy(newLunaFolder({ id: 'ws-acme', at: t, name: 'Night shift', client: 'Acme Foods' }));
    await db.putStudy(newConversation({ id: 'conv', at: t, name: 'Inbox', client: 'Acme Foods' }));
    const r = await reg.runCall(ctx(), call('move_into_workspace', { name: 'Night shift' }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/Night shift/);
    expect(folderIdOf((await db.getStudy('conv'))!)).toBe('ws-acme');
  });

  it('refuses another customer’s workspace and an attached file from another customer', async () => {
    const { db, reg, lines } = await fresh();
    const t = Date.now();
    const a = await lines.addLineToFactory('Line A');
    const b = await lines.addLineToFactory('Line B');
    await db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
    await db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
    store.set(CLIENT_KEY, 'Acme Foods');
    await db.putStudy(newLunaFolder({ id: 'ws-brook', at: t, name: 'Elsewhere', client: 'Brook Dairy' }));
    await db.putStudy(newConversation({ id: 'conv', at: t, name: 'Inbox', client: 'Acme Foods' }));
    const hidden = await reg.runCall(ctx(), call('move_into_workspace', { folderId: 'ws-brook' }), { confirmed: false });
    expect(hidden.ok).toBe(false);
    if (!hidden.ok) expect(hidden.why).toMatch(/not available for this customer/);
    await db.putStudy(source('f-foreign', 'Foreign workbook', { conversationId: 'conv', client: 'Brook Dairy' }, t, 'Brook Dairy'));
    await db.putStudy(newLunaFolder({ id: 'ws-acme', at: t, name: 'Packing week', client: 'Acme Foods' }));
    const blocked = await reg.runCall(ctx(), call('move_into_workspace', { folderId: 'ws-acme' }), { confirmed: false });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.why).toMatch(/attached file belongs to another customer/);
  });

  it('refuses an archived customer', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy({
      id: 'story-old', tool: 'story', name: 'Old Co',
      agreed: { story: { client: 'Old Co', brief: '', startedAt: t, archivedAt: t } },
      facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t,
    });
    await db.putStudy(newConversation({ id: 'conv', at: t, name: 'Old chat', client: 'Old Co' }));
    const r = await reg.runCall(ctx(), call('move_into_workspace', { name: 'Night shift' }), { confirmed: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/archived/);
  });
});
