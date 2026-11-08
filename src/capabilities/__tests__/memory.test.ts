/* AI MODE'S MEMORY (docs/AI-MODE.md, Memory; src/capabilities/memory) — remember_preference is a write: checked, previewed
 * in exactly the words it will add, refused until confirmed, then kept in How I work; recall searches the earlier
 * conversations in code — the best match first and the newest first among equals — and never across clients. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx, ColleagueThread } from '../types';
import type { ToolStudy } from '../../lib/study';

const store = new Map<string, string>();
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), mem: await import('../memory'), prefs: await import('../../lib/preferences'), lines: await import('../../lib/lines') });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const DAY = 86_400_000;

describe('remember_preference', () => {
  it('validates, says exactly what it will add, waits for yes, then keeps it', async () => {
    const { reg, prefs } = await fresh();
    const cap = reg.capabilityByName('remember_preference');
    expect(cap?.kind).toBe('write');
    expect(cap?.validate({}).ok).toBe(false);
    expect(cap?.validate({ text: 'x', about: 'everything' }).ok).toBe(false);
    expect(cap?.validate({ text: 'x', extra: 1 }).ok).toBe(false);
    const c = call('remember_preference', { text: 'I call the checkweigher the CW', about: 'words' });
    const p = await reg.previewCall(ctx(), c);
    expect(p).toEqual({ ok: true, title: 'Remember how you work', says: 'Add to How I work, under “The words I use”: “I call the checkweigher the CW”. AI Mode reads it with every question from now; change it any time under How I work.' });
    expect((await reg.runCall(ctx(), c, { confirmed: false })).ok).toBe(false);
    expect(prefs.readPreferences()).toBeNull();
    const r = await reg.runCall(ctx(), c, { confirmed: true });
    expect(r).toMatchObject({ ok: true, says: 'Kept in How I work, under “The words I use”: “I call the checkweigher the CW”.' });
    expect(prefs.readPreferences()).toEqual({ words: 'I call the checkweigher the CW' });
    /* kept on the device (the cloud's half is lib/preferences' own test) */
    expect(JSON.parse(store.get('faultline.preferences') ?? 'null')).toEqual({ words: 'I call the checkweigher the CW' });
  }, 60_000);

  it('goes under Always remember by default, says when it is already there, and the card says so first', async () => {
    const { reg, prefs } = await fresh();
    await reg.runCall(ctx(), call('remember_preference', { text: 'Money first in every answer' }), { confirmed: true });
    expect(prefs.readPreferences()).toEqual({ always: 'Money first in every answer' });
    const again = call('remember_preference', { text: 'money first in every answer' });
    const p = await reg.previewCall(ctx(), again);
    expect(p.ok && p.says).toMatch(/already says .* Nothing will be added\./);
    const r = await reg.runCall(ctx(), again, { confirmed: true });
    expect(r.ok).toBe(false);
  }, 30_000);
});

/* ── recall ── */
const conv = (o: { id: string; at: number; threads?: ColleagueThread[]; turns?: { id: string; at: number; kind: string; text: string }[]; workspaceId?: string }): ToolStudy =>
  ({ id: o.id, tool: 'talk', name: `AI Mode — ${o.id}`, ...(o.workspaceId ? { workspaceId: o.workspaceId } : {}), facts: { colleague: true, turns: o.turns ?? [], threads: o.threads ?? [], actions: [] }, uses: [], startedAt: o.at, createdAt: o.at, updatedAt: o.at } as unknown as ToolStudy);
const thread = (id: string, title: string, at: number, scope: ColleagueThread['scope'], notes: { text: string; how: ColleagueThread['notes'][number]['how'] }[] = [], status: ColleagueThread['status'] = 'parked'): ColleagueThread =>
  ({ id, title, status, scope, notes: notes.map((n, i) => ({ id: `${id}-n${i}`, at: at + i, ...n })), refs: [], at });

describe('recallScore', () => {
  it('scores a real match, never scattered letters, and the words that matter when the question has others', async () => {
    const { mem } = await fresh();
    expect(mem.recallScore('wrapper film', 'Wrapper film tears on the splice')).toBe(80);
    expect(mem.recallScore('film', 'The wrapper film tears')).toBe(60);
    expect(mem.recallScore('wpf', 'wrapper film')).toBe(0);
    expect(mem.recallScore('what did we say about the wrapper film', 'Wrapper film tears on the splice')).toBe(35);
    expect(mem.recallScore('what did we say about the wrapper seal', 'Wrapper film tears on the splice')).toBe(18);
    expect(mem.recallScore('what did we say about the labeller seal', 'Wrapper film tears on the splice')).toBe(0);
    expect(mem.recallScore('', 'x')).toBe(0);
  });
});

describe('recall', () => {
  async function seed() {
    const f = await fresh();
    const a = await f.lines.addLineToFactory('Line A');
    const b = await f.lines.addLineToFactory('Line B');
    await f.db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
    await f.db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
    const t = Date.now() - 10 * DAY;
    /* Acme: an older and a newer conversation about the wrapper's film */
    await f.db.putStudy(conv({ id: 'acme-old', at: t, threads: [thread('t1', 'Wrapper film on Line A', t, { lineId: a.id }, [{ text: 'The film tears at the splice', how: 'observed' }])], turns: [{ id: 'u1', at: t, kind: 'typed', text: 'The wrapper film keeps tearing' }] }));
    await f.db.putStudy(conv({ id: 'acme-new', at: t + 5 * DAY, threads: [thread('t2', 'Wrapper film again', t + 5 * DAY, { lineId: a.id }, [{ text: 'Operators say the film tears after a reel change', how: 'reported' }])] }));
    /* Brook: the same words — never to come back while on Acme */
    await f.db.putStudy(conv({ id: 'brook', at: t + 6 * DAY, threads: [thread('t3', 'Wrapper film at Brook', t + 6 * DAY, { lineId: b.id }, [{ text: 'Brook’s film tears too', how: 'measured' }])], turns: [{ id: 'u3', at: t + 6 * DAY, kind: 'typed', text: 'Brook wrapper film is awful' }] }));
    /* the person's own: no line */
    await f.db.putStudy(conv({ id: 'own', at: t + 2 * DAY, threads: [thread('t4', 'How I run a wrapper film trial', t + 2 * DAY, {})] }));
    /* a Line Talk on Line A and one on Line B */
    await f.db.putStudy({ id: 'talk-a', tool: 'talk', name: 'Line A — Tuesday', workspaceId: a.id, facts: { turns: [{ id: 'x1', at: t + DAY, kind: 'typed', text: 'Film snapped twice on the wrapper' }, { id: 'x2', at: t + DAY + 1, kind: 'reply', text: 'Watch the splice on the wrapper film' }] }, uses: [], startedAt: t, createdAt: t, updatedAt: t } as unknown as ToolStudy);
    await f.db.putStudy({ id: 'talk-b', tool: 'talk', name: 'Line B — Wednesday', workspaceId: b.id, facts: { turns: [{ id: 'y1', at: t + DAY, kind: 'typed', text: 'Brook wrapper film snapped' }] }, uses: [], startedAt: t, createdAt: t, updatedAt: t } as unknown as ToolStudy);
    /* the conversation in hand: on Line A */
    await f.db.putStudy(conv({ id: 'here', at: Date.now(), threads: [thread('th', 'Line A today', Date.now(), { lineId: a.id }, [], 'current')], turns: [{ id: 'h1', at: Date.now(), kind: 'typed', text: 'what did we say about the wrapper film?' }] }));
    return { ...f, a, b };
  }

  it('finds Acme’s and the person’s own, never Brook’s, never the conversation in hand; best first, newest among equals', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx({ conversationId: 'here' }), call('recall', { words: 'wrapper film' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    const data = r.data as { conversation: string; what: string; text: string; how?: string; open: string; where: string }[];
    const ids = r.refs.map(x => x.id);
    expect(ids).not.toContain('brook');
    expect(ids).not.toContain('talk-b');
    expect(ids).not.toContain('here');
    expect(ids).toEqual(expect.arrayContaining(['acme-old', 'acme-new', 'own', 'talk-a']));
    expect(JSON.stringify(data)).not.toMatch(/Brook/);
    /* "Wrapper film again" and "Wrapper film on Line A" both start with the words (80): the newer first */
    expect(data[0]).toMatchObject({ conversation: 'AI Mode — acme-new', what: 'subject', text: 'Wrapper film again', open: '/ai?c=acme-new', where: 'AI Mode' });
    expect(data[1]).toMatchObject({ text: 'Wrapper film on Line A' });
    const scores = data.map(d => d.text);
    expect(scores.indexOf('The wrapper film keeps tearing')).toBeGreaterThan(1);
    expect(data.find(d => d.where === 'Line Talk')).toMatchObject({ open: '/talk/talk-a' });
    expect(r.says).toMatch(/found about “wrapper film” in 4 earlier conversations/);
  }, 60_000);

  it('a note keeps how it was known; the limit holds', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx({ conversationId: 'here' }), call('recall', { words: 'reel change', limit: 1 }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    expect(r.data).toEqual([expect.objectContaining({ what: 'note', how: 'reported', text: 'Operators say the film tears after a reel change' })]);
  }, 30_000);

  it('on Brook’s line it finds Brook’s and the person’s own, never Acme’s', async () => {
    const { reg, db, b } = await seed();
    await db.putStudy(conv({ id: 'here-b', at: Date.now(), threads: [thread('tb', 'Line B today', Date.now(), { lineId: b.id }, [], 'current')] }));
    const r = await reg.runCall(ctx({ conversationId: 'here-b' }), call('recall', { words: 'wrapper film' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    expect(r.refs.map(x => x.id).sort()).toEqual(['brook', 'own', 'talk-b']);
  }, 30_000);

  it('a conversation touching two clients gives only its threads on this client’s lines', async () => {
    const { mem, a, b } = await seed();
    const t = Date.now();
    const mixed = conv({ id: 'mixed', at: t, threads: [thread('m1', 'Wrapper film A', t, { lineId: a.id }), thread('m2', 'Wrapper film B', t, { lineId: b.id })], turns: [{ id: 'm', at: t, kind: 'typed', text: 'wrapper film at both' }] });
    const here = conv({ id: 'h', at: t, threads: [thread('h', 'here', t, { lineId: a.id }, [], 'current')] });
    const clientOf = (id: string) => (id === a.id ? 'Acme Foods' : id === b.id ? 'Brook Dairy' : undefined);
    const hits = mem.recallFrom('wrapper film', { studies: [mixed], clientOf, projectLines: () => [], here });
    expect(hits.map(h => h.text)).toEqual(['Wrapper film A']);
    /* with no line in hand, everything is the person's */
    expect(mem.recallFrom('wrapper film', { studies: [mixed], clientOf, projectLines: () => [] }).map(h => h.text).sort()).toEqual(['Wrapper film A', 'Wrapper film B', 'wrapper film at both'].sort());
  }, 30_000);

  it('nothing found is said, and a question with no words is refused', async () => {
    const { reg } = await seed();
    const r = await reg.runCall(ctx({ conversationId: 'here' }), call('recall', { words: 'pasteuriser' }), { confirmed: false });
    expect(r).toMatchObject({ ok: true, says: 'Nothing in the earlier conversations about “pasteuriser”.' });
    expect((await reg.runCall(ctx(), call('recall', {}), { confirmed: false })).ok).toBe(false);
  }, 30_000);
});
