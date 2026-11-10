/* THE NOTEBOOK OF MEANINGS (10 November, docs/LUNA-NEXT.md L3).
 *   note_meaning    write  a word, a name, a file or how they count something, and what it means — a card; kept in the client's notebook
 *                          (the person's own when no client is in hand). The same word again replaces its meaning, the old one struck.
 *   notebook        read   what the notebook holds for the client in hand, and the person's own
 *   forget_meaning  write  an entry taken off — a card; struck, never deleted
 * The client is the line's (the one named, else the subject's), or one named that a line of the factory carries — never a client
 * made up from a typing slip, never another client's notebook read. */
import { getWorkspace, listWorkspaces, getStudy } from '../db';
import { addMeaning, clientOf, isNotebook, KIND_WORD, liveEntries, readNotebooks, strikeMeaning, type MeaningKind, type Notebook } from '../colleague/notebook';
import { currentThread, factsOfConversation } from '../colleague/conversation';
import { anyone } from './access';
import { checkObject } from './check';
import type { CapCtx, CapResult, Capability } from './types';

/** The client in hand: the line named, else the client named (only one a line carries), else the subject's line's. '' = none. */
async function clientIn(ctx: CapCtx, input: { lineId?: string; client?: string; own?: boolean }): Promise<{ ok: true; client: string } | { ok: false; why: string }> {
  if (input.own) return { ok: true, client: '' };
  if (input.lineId) {
    const w = await getWorkspace(input.lineId);
    if (!w) return { ok: false, why: 'There is no line with that id — find it first.' };
    return { ok: true, client: w.clientName?.trim() ?? '' };
  }
  const known = [...new Set((await listWorkspaces()).map(w => w.clientName?.trim()).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'en-GB'));
  if (input.client?.trim()) {
    const hit = known.find(c => c.toLowerCase() === input.client?.trim().toLowerCase());
    return hit ? { ok: true, client: hit } : { ok: false, why: `No line of the factory is for a client called “${input.client.trim()}”${known.length ? ` — the clients are ${known.join(', ')}` : ''}. Ask which, or keep it in the person's own notebook (own).` };
  }
  if (ctx.conversationId) {
    const s = await getStudy(ctx.conversationId);
    const line = s ? currentThread(factsOfConversation(s).threads ?? [])?.scope.lineId : undefined;
    const w = line ? await getWorkspace(line) : undefined;
    if (w?.clientName?.trim()) return { ok: true, client: w.clientName.trim() };
  }
  return { ok: true, client: '' };
}
const whose = (client: string) => (client ? `${client}’s notebook` : 'your own notebook (no client)');

interface NoteIn { term: string; means: string; kind?: MeaningKind; lineId?: string; client?: string; own?: boolean }
const NOTE_FIELDS = {
  term: { kind: 'string' as const, label: 'the word, name or file as they say it', required: true, max: 80 },
  means: { kind: 'string' as const, label: 'what it means, in their words', required: true, max: 300 },
  kind: { kind: 'enum' as const, label: 'what it is', values: ['word', 'name', 'source', 'rule'] },
  lineId: { kind: 'string' as const, label: 'a line of the client', max: 80 },
  client: { kind: 'string' as const, label: 'the client', max: 120 },
  own: { kind: 'bool' as const, label: 'their own notebook, true wherever they work' },
};

export const noteMeaning: Capability = {
  name: 'note_meaning', title: 'Remember what a word means', kind: 'write',
  validate: raw => checkObject(raw, NOTE_FIELDS),
  /* their own words, kept for their own work — anybody signed in, as How I work */
  allowed: anyone,
  async preview(ctx, input: NoteIn) {
    const c = await clientIn(ctx, input);
    if (!c.ok) return `${c.why} Nothing will be kept.`;
    const { own, client } = await readNotebooks(c.client);
    const nb = c.client ? client : own;
    const old = liveEntries(nb).find(e => e.term.trim().toLowerCase() === input.term.trim().toLowerCase());
    return `Keep in ${whose(c.client)}: “${input.term.trim()}” means ${input.means.trim()}${input.kind ? ` (${KIND_WORD[input.kind]})` : ''}.${old ? ` It replaces “${old.means}”, which is kept struck.` : ''} Every conversation${c.client ? ` about ${c.client}` : ''} is told it from now; take it off any time.`;
  },
  async run(ctx, input: NoteIn): Promise<CapResult> {
    const c = await clientIn(ctx, input);
    if (!c.ok) return c;
    const r = await addMeaning(c.client, { term: input.term.trim(), means: input.means.trim(), kind: input.kind ?? 'word', ...(ctx.conversationId ? { conversationId: ctx.conversationId } : {}) }, ctx.now);
    return { ok: true, says: `Kept in ${whose(c.client)}: “${r.entry.term}” means ${r.entry.means}.${r.replaced ? ` (It replaced “${r.replaced.means}”.)` : ''}`, refs: [], data: { notebookId: r.notebookId, entryId: r.entry.id, client: c.client } };
  },
};

export const readNotebook: Capability = {
  name: 'notebook', title: 'What their words mean', kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lineId: NOTE_FIELDS.lineId, client: NOTE_FIELDS.client }),
  allowed: anyone,
  async run(ctx, input: { lineId?: string; client?: string }): Promise<CapResult> {
    const c = await clientIn(ctx, input);
    if (!c.ok) return c;
    const { own, client } = await readNotebooks(c.client);
    const say = (n: Notebook | undefined) => liveEntries(n).map(e => `“${e.term}” [${e.id}]: ${e.means}`).join('; ');
    const parts = [c.client ? (liveEntries(client).length ? `${whose(c.client)}: ${say(client)}.` : `${whose(c.client)} holds nothing yet.`) : 'No client is in hand.', liveEntries(own).length ? `Their own: ${say(own)}.` : ''];
    return { ok: true, says: parts.filter(Boolean).join(' '), refs: [], data: { client: c.client, entries: [...liveEntries(client), ...liveEntries(own)].map(e => ({ id: e.id, term: e.term, means: e.means })) } };
  },
};

interface ForgetIn { entryId: string }
async function entryAnywhere(id: string): Promise<{ nb: Notebook; term: string; means: string } | undefined> {
  const { listAllStudies } = await import('../db');
  for (const s of await listAllStudies()) {
    if (!isNotebook(s)) continue;
    const e = liveEntries(s).find(x => x.id === id);
    if (e) return { nb: s, term: e.term, means: e.means };
  }
  return undefined;
}
export const forgetMeaning: Capability = {
  name: 'forget_meaning', title: 'Take a meaning off', kind: 'write',
  validate: raw => checkObject(raw, { entryId: { kind: 'string', label: 'the entry (its id from notebook)', required: true, max: 80 } }),
  allowed: anyone,
  async preview(_ctx, input: ForgetIn) {
    const e = await entryAnywhere(input.entryId);
    return e ? `Take “${e.term}” (${e.means}) off ${whose(clientOf(e.nb))}. It is kept struck, so what Luna was told stays traceable.` : 'There is no such entry — nothing will change.';
  },
  async run(ctx, input: ForgetIn): Promise<CapResult> {
    const e = await entryAnywhere(input.entryId);
    if (!e) return { ok: false, why: 'There is no such entry in any notebook.' };
    await strikeMeaning(e.nb.id, input.entryId, ctx.now);
    return { ok: true, says: `Taken off ${whose(clientOf(e.nb))}: “${e.term}”.`, refs: [] };
  },
};

export const NOTEBOOK: readonly Capability[] = [noteMeaning, readNotebook, forgetMeaning];
