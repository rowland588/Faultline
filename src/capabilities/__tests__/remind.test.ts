import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';
import { REMINDERS_KEY } from '../types';
import { addDays, todayISO } from '../../lib/weeks';

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

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry') });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.parse('2026-11-24T12:00:00'), conversationId: 'conv', me: 'Rowland', ...o });

describe('remind_me — a kept Luna reminder, not a forgotten chat line', () => {
  it('keeps tomorrow on this device and says they will see it on her page', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy({ id: 'conv', tool: 'talk', name: 'Talk', facts: { colleague: true, turns: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    const when = addDays(todayISO(new Date(ctx().now)), 1);
    const r = await reg.runCall(ctx(), call('remind_me', { when, what: 'look at the wrapper' }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/I'll remind you tomorrow/);
    expect(r.ok && r.says).toMatch(/look at the wrapper/);
    expect(r.ok && r.says).toMatch(/this page/);
    expect(r.ok && r.says).toMatch(/does not fire while the app is shut/);
    const kept = JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? '[]') as { what: string; due: string }[];
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ what: 'look at the wrapper', due: when });
  });
  it('refuses a day already gone, and a day more than 90 days ahead', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy({ id: 'conv', tool: 'talk', name: 'Talk', facts: { colleague: true, turns: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    const past = await reg.runCall(ctx(), call('remind_me', { when: '2026-11-01', what: 'x' }), { confirmed: false });
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.why).toMatch(/already gone/);
    const far = await reg.runCall(ctx(), call('remind_me', { when: '2027-11-24', what: 'x' }), { confirmed: false });
    expect(far.ok).toBe(false);
    if (!far.ok) expect(far.why).toMatch(/90 days/);
  });
  it('is local — no confirm card', async () => {
    const { reg } = await fresh();
    expect(reg.capabilityByName('remind_me')?.kind).toBe('local');
  });
  it('belongs to the signed-in person — Jennifer is not shown Rowland’s reminder', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy({ id: 'conv', tool: 'talk', name: 'Talk', facts: { colleague: true, turns: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    const when = addDays(todayISO(new Date(ctx().now)), 1);
    await reg.runCall(ctx({ userId: 'rowland' }), call('remind_me', { when, what: 'look at the wrapper' }), { confirmed: false });
    const { remindersFor, readReminders } = await import('../../colleague/reminders');
    const all = readReminders(localStorage.getItem(REMINDERS_KEY));
    expect(remindersFor(all, 'rowland')).toHaveLength(1);
    expect(remindersFor(all, 'jennifer')).toHaveLength(0);
    expect(remindersFor(all, 'jennifer').some(r => r.what.includes('wrapper'))).toBe(false);
  });
});
