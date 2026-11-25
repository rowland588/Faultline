/* send_email is a write: confirm card, refuse without a recipient, a client cannot send, “this” is the conversation’s chart (docs/LUNA-MAIL.md). */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';
import { newMember } from '../../org/organisation';

vi.setConfig({ testTimeout: 30_000 });
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

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), org: await import('../../org/orgData') });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), conversationId: 'conv', ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

async function seed() {
  const f = await fresh();
  const a = await f.lines.addLineToFactory('Line A');
  const b = await f.lines.addLineToFactory('Line B');
  await f.db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
  await f.db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
  const t = Date.now();
  await f.db.addSnag({ id: 'pa1', workspaceId: a.id, problem: 'Wrapper film tears', status: 'open', priority: 'critical', raisedAt: t, updatedAt: t, owner: 'John' });
  await f.db.addSnag({ id: 'pb1', workspaceId: b.id, problem: 'Filler drips', status: 'open', priority: 'high', raisedAt: t, updatedAt: t, owner: 'John Brook' });
  const core = await import('../../db/core');
  const idb = await core.getDB();
  await idb.put('organisations', { id: 'local', name: 'Acme', createdAt: t, updatedAt: t });
  await idb.put('organisation_members', newMember('local', 'john.smith@acme.test', 'manager', {}, undefined, t));
  const result = {
    sheet: 'Log', rowsScanned: 2, rowsMatched: 2,
    groups: [{ key: ['Jam'], values: [15], rows: 1, refs: ['A1'] }, { key: ['Film'], values: [12], rows: 1, refs: ['A2'] }],
    groupsTotal: 2, totals: [27], measures: ['minutes'], groupBy: ['category'], skipped: [] as never[], notes: [] as string[],
  };
  await f.db.putStudy({
    id: 'conv', tool: 'talk', name: 'Talk',
    facts: {
      colleague: true,
      results: [{ id: 'R1', title: 'Downtime by category', source: { kind: 'workbook', id: 'w', name: 'shift.xlsx' }, query: {}, at: t, result }],
      charts: [{ id: 'C1', at: t, versions: [{ resultId: 'R1', type: 'column', measure: 0, title: 'Downtime by category' }] }],
      reports: [],
    } as never,
    uses: [], startedAt: t, createdAt: t, updatedAt: t,
  });
  return { ...f, a, b };
}

describe('find_person', () => {
  it('John in People is that address; several or none said so; Brook’s owner is not used with Acme in hand', async () => {
    const { reg } = await seed();
    const one = await reg.runCall(ctx(), call('find_person', { who: 'john smith' }), { confirmed: false });
    expect(one.ok && one.says).toMatch(/john\.smith@acme\.test/);
    const several = await reg.runCall(ctx(), call('find_person', { who: 'John' }), { confirmed: false });
    expect(several.ok && several.says).toMatch(/Several people match/);
    const { setActiveClient } = await import('../../lib/activeClient');
    setActiveClient('Acme Foods');
    const inHand = await reg.runCall(ctx(), call('find_person', { who: 'John Brook' }), { confirmed: false });
    expect(inHand.ok && inHand.says).toMatch(/Nobody in People/);
    expect(JSON.stringify(inHand)).not.toMatch(/Filler drips/);
  }, 30_000);
  it('hides archived and unassigned People addresses while keeping active, explicitly placed recipients', async () => {
    const { db, reg, a, b } = await seed();
    const { getDB } = await import('../../db/core');
    const { archiveCustomer, continueCustomer } = await import('../../lib/customers');
    const { setActiveClient } = await import('../../lib/activeClient');
    const idb = await getDB();
    await db.updateWorkspace({ ...a, orgId: 'local', clientName: 'Acme Foods', siteName: 'Hull' });
    await db.updateWorkspace({ ...b, orgId: 'local', clientName: 'Brook Dairy', siteName: 'York' });
    await idb.put('organisation_members', newMember('local', 'sam@brook.test', 'viewer', { sites: ['York'] }, undefined, Date.now()));
    await idb.put('organisation_members', newMember('local', 'ruth@acme.test', 'viewer', { sites: ['Hull'] }, undefined, Date.now()));
    await idb.put('organisation_members', newMember('other-org', 'visitor@other.test', 'viewer', {}, undefined, Date.now()));
    const who = async (name: string) => {
      const result = await reg.runCall(ctx(), call('find_person', { who: name }), { confirmed: false });
      return result.ok ? result.data : undefined;
    };
    expect(await who('visitor')).toMatchObject({ kind: 'none' });
    setActiveClient('Acme Foods');
    expect(await who('sam')).toMatchObject({ kind: 'none' });
    expect(await who('ruth')).toMatchObject({ to: 'ruth@acme.test' });
    expect((await archiveCustomer('Brook Dairy')).ok).toBe(true);
    setActiveClient('');
    expect(await who('sam')).toMatchObject({ kind: 'none' });
    expect(await who('john smith')).toMatchObject({ kind: 'none' });
    const owner = ctx({ userId: 'owner', email: 'rowland@example.test' });
    const lookup = (who: string, customer?: string) => reg.runCall(owner, call('find_person', { who, customer }), { confirmed: false });
    const review = vi.spyOn(await import('../ownerReview'), 'canReviewCustomers').mockResolvedValue(false);
    expect(await lookup('sam', 'Brook Dairy')).toMatchObject({ data: { kind: 'none' } });
    review.mockResolvedValue(true);
    expect(await lookup('sam', 'Brook Dairy')).toMatchObject({ data: { to: 'sam@brook.test' } });
    expect(await lookup('sam')).toMatchObject({ data: { kind: 'none' } });
    expect(await lookup('me')).toMatchObject({ data: { to: 'rowland@example.test' } });
    review.mockRestore();
    expect(await who('ruth')).toMatchObject({ to: 'ruth@acme.test' });
    expect(await who('new@outside.test')).toMatchObject({ to: 'new@outside.test' });
    expect((await continueCustomer('Brook Dairy')).ok).toBe(true);
    expect(await who('sam')).toMatchObject({ to: 'sam@brook.test' });
  }, 30_000);

});

describe('draft_email and send_email', () => {
  it('drafts the latest chart’s own figures — never a number invented', async () => {
    const { reg } = await seed();
    const d = await reg.runCall(ctx(), call('draft_email', { to: 'john.smith@acme.test' }), { confirmed: false });
    expect(d.ok && d.says).toMatch(/Downtime by category/);
    if (!d.ok) throw new Error(d.why);
    const body = (d.data as { body: string }).body;
    expect(body).toContain('Jam: 15');
    expect(body).toContain('Film: 12');
    expect(body).not.toMatch(/\b99\b/);
    expect(d.says).toMatch(/Outlook is not connected/);
  });

  it('refuses send_email without a recipient, and without confirm', async () => {
    const { reg } = await seed();
    const v = reg.capabilityByName('send_email')?.validate({});
    expect(v?.ok).toBe(false);
    if (v && !v.ok) expect(v.why).toMatch(/address/);
    const notAddr = reg.capabilityByName('send_email')?.validate({ to: 'John' });
    expect(notAddr?.ok).toBe(false);
    const wait = await reg.runCall(ctx(), call('send_email', { to: 'john.smith@acme.test' }), { confirmed: false });
    expect(wait.ok).toBe(false);
    if (!wait.ok) expect(wait.why).toMatch(/say yes/);
  });

  it('a client cannot send', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx({ level: 'client' }), call('send_email', { to: 'john.smith@acme.test' }), { confirmed: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/read/);
  });

  it('Do it with Outlook missing sends nothing; with a Mail.Send token it posts Graph /me/sendMail', async () => {
    const { reg } = await seed();
    const fetch = vi.fn(async () => ({ status: 202 }));
    vi.stubGlobal('fetch', fetch);
    const missing = await reg.runCall(ctx(), call('send_email', { to: 'john.smith@acme.test' }), { confirmed: true });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.why).toMatch(/Connect Outlook/);
    expect(fetch).not.toHaveBeenCalled();
    localStorage.setItem('faultline.ms.session', JSON.stringify({ access: 'tok', expiresAt: Date.now() + 3_600_000, mail: true }));
    const sent = await reg.runCall(ctx(), call('send_email', { to: 'john.smith@acme.test', who: 'John Smith' }), { confirmed: true });
    expect(sent.ok && sent.says).toMatch(/Sent to john\.smith@acme\.test/);
    expect(fetch).toHaveBeenCalledTimes(1);
    const posted = fetch.mock.calls[0] as unknown as [string, { body: string }];
    expect(posted[0]).toContain('/me/sendMail');
    const body = JSON.parse(posted[1].body) as { message: { body: { content: string } } };
    expect(body.message.body.content).toContain('Jam: 15');
    expect(body.message.body.content).not.toMatch(/\b99\b/);
  }, 30_000);
});

describe('Luna sender', () => {
  it('confirms a dictated message independently of the last chart and uses the same card ID at Resend', async () => {
    const { reg } = await seed();
    const relay = await import('../../lib/mail/luna');
    vi.spyOn(relay, 'lunaMailStatus').mockResolvedValue({ ready: true, allowed: true });
    const send = vi.spyOn(relay, 'sendWithLuna').mockResolvedValue({ ok: true });
    const command = call('send_email', { to: 'person@example.test', subject: 'Shift handover', message: 'Meet me on line A.' });
    const person = ctx({ userId: 'owner' });
    const preview = await reg.previewCall(person, command);
    expect(preview.ok && preview.says).toContain('Meet me on line A.');
    expect(send).not.toHaveBeenCalled();
    const sent = await reg.runCall(person, command, { confirmed: true });
    expect(sent.ok && sent.says).toContain('Resend accepted');
    expect(send).toHaveBeenCalledWith(command.id, expect.objectContaining({ to: 'person@example.test', body: 'Meet me on line A.' }));
  });

  it('saves a confirmed weekly customer schedule online without sending an immediate email', async () => {
    const { reg } = await seed();
    const { setActiveClient } = await import('../../lib/activeClient');
    setActiveClient('Acme Foods');
    const relay = await import('../../lib/mail/luna');
    vi.spyOn(relay, 'lunaMailStatus').mockResolvedValue({ ready: true, allowed: true });
    const save = vi.spyOn(relay, 'saveMailSchedule').mockResolvedValue(undefined);
    const send = vi.spyOn(relay, 'sendWithLuna');
    const command = call('send_email', { to: 'person@example.test', repeat: 'weekly', time: '08:30', weekday: 3 });
    const person = ctx({ userId: 'owner' });
    const preview = await reg.previewCall(person, command);
    expect(preview.ok && preview.says).toContain('every Wednesday at 08:30 London time for Acme Foods');
    expect(save).not.toHaveBeenCalled();
    const result = await reg.runCall(person, command, { confirmed: true });
    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ client: 'Acme Foods', ownerId: 'owner', hour: 8, minute: 30, weekday: 3, scope: { email: expect.objectContaining({ to: 'person@example.test' }) } }), 'owner');
    expect(send).not.toHaveBeenCalled();
  });
});
