/* BUSINESS_SUMMARY (docs/ORGANISATION.md O4b): the database's functions called as the person when the cloud answers, the device's own
 * sum when it does not — said which, with the scope and the period; a team leader's device sum narrowed to their area. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

vi.setConfig({ testTimeout: 30_000 });
const store = new Map<string, string>();
const fakeStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear() };
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('localStorage', fakeStorage); store.clear(); vi.resetModules(); });
const call = (input: unknown) => ({ id: 'c-b', name: 'business_summary', input });
const run = async (reg: typeof import('../registry'), input: unknown, ctx: Record<string, unknown>) => reg.runCall({ now: Date.now(), ...ctx } as never, call(input), { confirmed: false });

async function seed() {
  const db = await import('../../db');
  const lines = await import('../../lib/lines');
  const org = await import('../../org/orgData');
  const cap = await import('../business');
  const reg = await import('../registry');
  const a = await lines.addLineToFactory('Line 7');
  const b = await lines.addLineToFactory('Line 2A');
  await db.updateWorkspace({ ...a, siteName: 'Hull', areaName: 'Packing hall', crew: 4, labourRatePerHour: 15 });
  await db.updateWorkspace({ ...b, siteName: 'Hull', areaName: 'Despatch' });
  const now = Date.now();
  const add = (ws: string, min: number) => db.addObservation({ id: Math.random().toString(36).slice(2), workspaceId: ws, category: 'Jam', asset: 'Bagger', startedAt: now - 60_000, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: now, updatedAt: now } as never);
  await add(a.id, 30); await add(b.id, 12);
  return { db, org, cap, reg, a, b, now };
}

describe('business_summary', () => {
  it('offline: the device’s own sum, said so, every line on the device when there is no business', async () => {
    const { cap, reg, now } = await seed();
    cap.setBusinessRpc(async () => undefined);
    const r = await run(reg, { about: 'losses' }, { now });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toMatch(/^Worked out on this device from the records it holds — every line you may read\. Stops this week/);
    expect(r.says).toMatch(/Line 7 \(Hull › Packing hall\) 1 stop · 30 min · £30 of idle labour/);
    expect(r.says).toMatch(/Line 2A \(Hull › Despatch\) 1 stop · 12 min · no crew and wage on the line to price it/);
    expect(r.says).toMatch(/\(Not from the database: the cloud is not connected\.\)$/);
    expect((r.data as { source: string }).source).toBe('device');
  });

  it('a team leader in Packing hall: the device’s sum narrowed to their area, and output never estimated offline', async () => {
    const { cap, reg, org, now } = await seed();
    const me = { id: 'u-sam', email: 'sam@x.co' };
    const o = await org.ensureBusiness({ id: 'u-boss', email: 'boss@x.co' }, 'Acme Foods');
    await org.inviteToBusiness(o, 'sam@x.co', 'team', { areas: ['Packing hall'] }, { id: 'u-boss', email: 'boss@x.co' });
    localStorage.setItem('faultline.org.role', 'team');
    cap.setBusinessRpc(async () => undefined);
    const r = await run(reg, {}, { now, email: me.email });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toMatch(/— as Team in Packing hall\./);
    expect(r.says).toMatch(/Line 7/);
    expect(r.says).not.toMatch(/Line 2A/);
    expect(r.says).toMatch(/Output against target is worked out only in the database/);
  });

  it('online: the database’s functions, called with the period and the business; its rows said as the source', async () => {
    const { cap, reg, org, now } = await seed();
    const o = await org.ensureBusiness({ id: 'u-boss', email: 'boss@x.co' }, 'Acme Foods');
    localStorage.setItem('faultline.org.role', 'leader');
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    cap.setBusinessRpc(async () => async (fn, args) => {
      calls.push({ fn, args });
      if (fn === 'luna_losses_by_line') return { data: [{ workspace_id: 'w9', line: 'Line 9', site: 'Leeds', area: 'Bakery', stops: 4, timed: 4, minutes: 95.5, labour: 120 }], error: null };
      if (fn === 'luna_output_by_line') return { data: null, error: { message: 'Could not find the function', code: 'PGRST202' } };
      return { data: [], error: null };
    });
    const r = await run(reg, { period: 'last_week' }, { now });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(calls.map(c => c.fn)).toEqual(['luna_losses_by_line', 'luna_problems_by_area', 'luna_actions_late', 'luna_output_by_line']);
    expect(calls[0].args.p_org).toBe(o.id);
    expect(typeof calls[0].args.p_from).toBe('number');
    expect(r.says).toMatch(/^Worked out in the database over every line you may read \(your access decides which\) — as Leader across Acme Foods\. Stops last week/);
    expect(r.says).toMatch(/Line 9 \(Leeds › Bakery\) 4 stops · 95\.5 min · £120 of idle labour/);
    expect(r.says).toMatch(/Open problems now: none\. Owed past its day now: nothing\. Output against target cannot be said: no production records are imported/);
    expect((r.data as { source: string }).source).toBe('database');
  });

  it('the database refusing: the device’s sum, with the reason', async () => {
    const { cap, reg, now } = await seed();
    cap.setBusinessRpc(async () => async () => ({ data: null, error: { message: 'permission denied for function luna_losses_by_line' } }));
    const r = await run(reg, { about: 'losses' }, { now });
    expect(r.ok && r.says).toMatch(/\(Not from the database: permission denied for function luna_losses_by_line\.\)$/);
  });

  it('refuses what it does not take', async () => {
    const { reg, now } = await seed();
    const r = await run(reg, { about: 'everything' }, { now });
    expect(r.ok).toBe(false);
  });
});
