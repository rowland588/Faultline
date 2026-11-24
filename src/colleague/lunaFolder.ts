/* A LUNA PROJECT — a work folder you start from Luna (24 November 2026).
 *
 * Rowland: keep Luna as simple as ChatGPT/Claude. In a chat, everything that was in that chat is available in that chat
 * (messages, uploads, graphs, papers she made, attachments). A Luna Project is a work folder: its chats and its document
 * library. Chats in the project can use the project's library. Nothing from another chat or project leaks in. These are
 * Luna work folders, never Faultline 6M/PDCA/catalogue tools.
 *
 * Stored as a talk study marked `facts.lunaFolder` (no new table — conversations are already talk studies marked
 * `facts.colleague`). A conversation in a folder keeps `facts.folderId`. A file in a chat keeps `facts.source.conversationId`;
 * a file in a project's library keeps `facts.source.folderId`. The customer in hand owns the folder; archived customers
 * are out. Pure. */
import type { ToolStudy } from '../lib/study';
import type { Source } from '../lib/data/sources';
import { currentThread, factsOfConversation, isConversation, type ColleagueFacts } from './conversation';

export type LunaFolderFacts = ColleagueFacts & { lunaFolder: true; named?: string; client?: string };
export type ChatScope = { conversationId: string; folderId?: string };

/** A talk study that is a Luna work folder — never a Faultline project, never a conversation. */
export const isLunaFolder = (s: Pick<ToolStudy, 'tool' | 'facts'>): boolean =>
  s.tool === 'talk' && (s.facts as { lunaFolder?: unknown }).lunaFolder === true;

export const folderTitle = (s: Pick<ToolStudy, 'name' | 'facts'>): string => {
  const named = typeof (s.facts as { named?: unknown }).named === 'string' ? (s.facts as { named: string }).named.trim() : '';
  return named || s.name.trim() || 'Project';
};

export const folderIdOf = (s: Pick<ToolStudy, 'facts'>): string | undefined => {
  const id = (factsOfConversation(s) as { folderId?: unknown }).folderId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
};

export const customerOfFolder = (s: Pick<ToolStudy, 'facts'>): string =>
  (typeof (s.facts as { client?: unknown }).client === 'string' ? (s.facts as { client: string }).client : '').trim();

/** Whose a conversation is: the customer stamped on it, else its subject's line. */
export function customerOfChat(s: Pick<ToolStudy, 'facts'>, lineClient: (id?: string) => string = () => ''): string {
  const f = factsOfConversation(s);
  const own = (typeof (f as { client?: unknown }).client === 'string' ? (f as { client: string }).client : '').trim();
  if (own) return own;
  const line = currentThread(f.threads ?? [])?.scope.lineId;
  return line ? lineClient(line).trim() : '';
}

export type FolderStanding = { in: true; customer: string } | { in: false; why: 'archived' | 'other'; customer: string };

export function standingOfNamed(customer: string, ac: { client: string; archived: ReadonlySet<string>; clients: readonly string[] }, key: (c: string) => string): FolderStanding {
  const name = customer.trim();
  if (!name) return { in: true, customer: '' };
  if (ac.archived.has(key(name))) return { in: false, why: 'archived', customer: name };
  if (ac.client && key(name) !== key(ac.client)) return { in: false, why: 'other', customer: name };
  return { in: true, customer: name };
}

export function newLunaFolder(o: { id: string; at: number; name: string; client?: string; ownerId?: string }): ToolStudy {
  const name = o.name.trim().slice(0, 80) || 'Project';
  const facts: LunaFolderFacts = { lunaFolder: true, named: name, ...(o.client?.trim() ? { client: o.client.trim() } : {}) };
  return {
    id: o.id, tool: 'talk', name, ...(o.ownerId ? { ownerId: o.ownerId } : {}),
    facts, uses: [], startedAt: o.at, createdAt: o.at, updatedAt: o.at,
  } as ToolStudy;
}

export const chatsInFolder = (studies: readonly ToolStudy[], folderId: string): ToolStudy[] =>
  studies.filter(s => isConversation(s) && folderIdOf(s) === folderId).sort((a, b) => b.updatedAt - a.updatedAt);

export const chatsNotInFolder = (studies: readonly ToolStudy[]): ToolStudy[] =>
  studies.filter(s => isConversation(s) && !folderIdOf(s)).sort((a, b) => b.updatedAt - a.updatedAt);

export const lunaFoldersOf = (studies: readonly ToolStudy[]): ToolStudy[] =>
  studies.filter(s => isLunaFolder(s) && !s.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);

/** A file this chat may use: attached in it, or in its project's library. Never another chat's, never another project's. */
export function fileInScope(s: Pick<Source, 'facts'>, scope: ChatScope): boolean {
  if (s.facts.conversationId === scope.conversationId) return true;
  return !!scope.folderId && s.facts.folderId === scope.folderId;
}

export const filesInScope = <T extends Pick<Source, 'facts'>>(list: readonly T[], scope: ChatScope): T[] =>
  list.filter(s => fileInScope(s, scope));

export function scopeOfChat(s: Pick<ToolStudy, 'id' | 'facts'>): ChatScope {
  const folderId = folderIdOf(s);
  return { conversationId: s.id, ...(folderId ? { folderId } : {}) };
}

/** What the drawer says under a folder — its chats, never Faultline tools. */
export function folderSaid(chats: number, files: number): string {
  const c = chats === 1 ? '1 chat' : `${chats} chats`;
  const f = files === 1 ? '1 file' : `${files} files`;
  return `${c} · ${f}`;
}
