/* WHAT YOUR WORDS MEAN (10 November, docs/LUNA-NEXT.md L3 — the plan Rowland agreed: "She remembers what your words mean … downtime means
 * unplanned stops only, Celox is a line, the product master is costs and rates … She proposes an entry, you confirm it, and from then on
 * she uses it … one client's notebook is never seen in another's").
 *
 * A notebook a client — a study of tool 'notebook' (synced and guarded as every study is), its entries each a word or name and what it
 * means, how it came (the person's own words, confirmed on a card), when, and from which conversation. An entry taken off is struck,
 * never deleted, so what Luna was told stays traceable. The person's own notebook (no client) holds what is true wherever they work.
 * A meaning is words for Luna to read, never a classification of the data: it re-labels no record.
 * Pure, but for the read and write at the foot. */
import { listAllStudies, patchStudy, putStudy } from '../db';
import { uid } from '../lib/ids';
import type { ToolStudy } from '../lib/study';

export type MeaningKind = 'word' | 'name' | 'source' | 'rule';
export interface Meaning { id: string; term: string; means: string; kind: MeaningKind; at: number; conversationId?: string; struck?: number }
export interface NotebookFacts { notebook: { client: string; entries: Meaning[] } }
export type Notebook = ToolStudy & { facts: ToolStudy['facts'] & NotebookFacts };

export const KIND_WORD: Record<MeaningKind, string> = { word: 'a word', name: 'a name', source: 'a file or sheet', rule: 'how they count it' };
const clientKey = (c: string) => c.trim().toLowerCase();
const termKey = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

export const isNotebook = (s: Pick<ToolStudy, 'tool' | 'facts' | 'deletedAt'>): s is Notebook => s.tool === 'notebook' && !s.deletedAt && !!(s.facts as Partial<NotebookFacts>).notebook;
export const clientOf = (n: Notebook): string => n.facts.notebook.client;
export const liveEntries = (n: Notebook | undefined): Meaning[] => (n?.facts.notebook.entries ?? []).filter(e => !e.struck);

/** The notebook of a client ('' = the person's own) among the studies — never another client's. */
export function notebookOf(all: readonly ToolStudy[], client: string): Notebook | undefined {
  return all.filter(isNotebook).find(n => clientKey(clientOf(n)) === clientKey(client));
}

/** The entries with a new one: the same word again replaces its meaning (the old struck, kept). */
export function withMeaning(entries: readonly Meaning[], m: Meaning, now: number): { entries: Meaning[]; replaced?: Meaning } {
  const old = entries.find(e => !e.struck && termKey(e.term) === termKey(m.term));
  return { entries: [...entries.map(e => (e === old ? { ...e, struck: now } : e)), m], ...(old ? { replaced: old } : {}) };
}

/** What Luna is told with every turn: the person's own meanings, then the client's — confirmed by the person. */
export function notebookText(own: Notebook | undefined, client: Notebook | undefined): string {
  const say = (n: Notebook | undefined) => liveEntries(n).map(e => `  - “${e.term}”: ${e.means}`);
  const lines: string[] = [];
  if (liveEntries(client).length) lines.push(`What words mean for ${clientOf(client as Notebook)} (the notebook — confirmed by the person; use them, never another client's):`, ...say(client));
  if (liveEntries(own).length) lines.push('What words mean wherever they work (their own notebook):', ...say(own));
  return lines.join('\n');
}

/* ------------------------------------------------------------------ read and write */
export async function readNotebooks(client: string): Promise<{ own?: Notebook; client?: Notebook }> {
  const all = await listAllStudies();
  const own = notebookOf(all, '');
  const cl = client.trim() ? notebookOf(all, client) : undefined;
  return { ...(own ? { own } : {}), ...(cl ? { client: cl } : {}) };
}

export async function addMeaning(client: string, m: Omit<Meaning, 'id' | 'at'>, now: number): Promise<{ entry: Meaning; replaced?: Meaning; notebookId: string }> {
  const entry: Meaning = { ...m, id: uid(), at: now };
  const had = notebookOf(await listAllStudies(), client);
  if (!had) {
    const s: ToolStudy = { id: uid(), tool: 'notebook', name: client.trim() ? `${client.trim()} — what words mean` : 'What my words mean', facts: { notebook: { client: client.trim(), entries: [entry] } } as unknown as ToolStudy['facts'], uses: [], startedAt: now, createdAt: now, updatedAt: now };
    await putStudy(s);
    return { entry, notebookId: s.id };
  }
  let replaced: Meaning | undefined;
  await patchStudy(had.id, cur => {
    const nb = (cur.facts as unknown as NotebookFacts).notebook;
    const next = withMeaning(nb.entries, entry, now);
    replaced = next.replaced;
    return { facts: { ...cur.facts, notebook: { ...nb, entries: next.entries } } as unknown as ToolStudy['facts'] };
  });
  return { entry, ...(replaced ? { replaced } : {}), notebookId: had.id };
}

/** An entry taken off — struck, kept. */
export async function strikeMeaning(notebookId: string, entryId: string, now: number): Promise<void> {
  await patchStudy(notebookId, cur => {
    const nb = (cur.facts as unknown as NotebookFacts).notebook;
    return { facts: { ...cur.facts, notebook: { ...nb, entries: nb.entries.map(e => (e.id === entryId && !e.struck ? { ...e, struck: now } : e)) } } as unknown as ToolStudy['facts'] };
  });
}
