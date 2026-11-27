/* MOVE THAT INTO A WORKSPACE — the chat's upload or connector starts in the chat; the person names a workspace and this
 * chat and its files move into it (27 November, docs/LUNA-PRODUCT.md §3). The drawer uses the same path. Never another
 * customer's, never an archived customer's. */
import { allSources } from '../capabilities/data';
import { listAllStudies, listWorkspaces, patchStudy, putStudy } from '../db';
import { activeClientNow } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { uid } from '../lib/ids';
import type { SourceFacts } from '../lib/data/sources';
import type { ToolStudy } from '../lib/study';
import { customerOfChat, customerOfFolder, folderIdOf, folderTitle, isLunaFolder, lunaFoldersOf, newLunaFolder, standingOfNamed } from './lunaFolder';
import { isConversation } from './conversation';

export const ASK_WORKSPACE_NAME = 'What shall I call the workspace?';

export type MoveIntoWorkspace = {
  conversationId?: string;
  sourceId?: string;
  folderId?: string;
  name?: string;
  out?: boolean;
  now: number;
  ownerId?: string;
};

export type MoveIntoResult =
  | { ok: true; says: string; folderId?: string; created?: boolean }
  | { ok: false; why: string };

const sourceFacts = (s: Pick<ToolStudy, 'facts'>): SourceFacts => (s.facts as { source: SourceFacts }).source;

export async function applyMoveIntoWorkspace(o: MoveIntoWorkspace): Promise<MoveIntoResult> {
  const [studies, sources, ac, lines] = await Promise.all([listAllStudies(), allSources(), activeClientNow(), listWorkspaces()]);
  const byLine = new Map(lines.map(w => [w.id, w.clientName?.trim() ?? '']));
  const lineClient = (id?: string) => (id ? byLine.get(id) ?? '' : '');
  const inHand = (customer: string) => standingOfNamed(customer, ac, customerKey).in;
  const folders = lunaFoldersOf(studies).filter(f => inHand(customerOfFolder(f)));

  if (o.sourceId) return moveFile(o, { studies, sources, folders, ac, lineClient });
  if (!o.conversationId) return { ok: false, why: 'This needs a conversation to keep it in, and there is none open.' };
  const chat = studies.find(s => s.id === o.conversationId && !s.deletedAt);
  if (!chat || !isConversation(chat)) return { ok: false, why: 'The conversation is not on this device any more.' };
  const from = customerOfChat(chat, lineClient);
  const fromStand = standingOfNamed(from, ac, customerKey);
  if (from && !fromStand.in) {
    return { ok: false, why: fromStand.why === 'archived'
      ? 'This chat belongs to an archived customer — nothing is moved from an archived customer.'
      : 'This chat belongs to another customer.' };
  }

  const target = await resolveTarget(o, { folders, from, ac, studies });
  if (!target.ok) return target;
  if (target.kind === 'ask') return { ok: true, says: ASK_WORKSPACE_NAME };
  const folder = target.folder;
  const to = folder ? customerOfFolder(folder) : from;
  if (from && to && customerKey(from) !== customerKey(to)) return { ok: false, why: 'This chat belongs to another customer.' };
  const attached = sources.filter(f => f.facts.conversationId === chat.id);
  if (folder && attached.some(f => f.facts.client && (!to || customerKey(f.facts.client) !== customerKey(to)))) {
    return { ok: false, why: 'An attached file belongs to another customer. Move cannot continue.' };
  }
  const folderId = folder?.id;
  await patchStudy(chat.id, cur => ({ facts: { ...cur.facts, folderId: folderId || undefined, client: from || to || undefined } }));
  await Promise.all(attached.map(f => patchStudy(f.id, cur => {
    const src = sourceFacts(cur);
    return { facts: { ...cur.facts, source: { ...src, folderId: folderId || undefined, client: src.client || from || to || undefined } } };
  })));
  return {
    ok: true,
    says: folder ? `Chat and its files moved to ${folderTitle(folder)}.` : 'Chat and its files moved out of the workspace.',
    ...(folderId ? { folderId } : {}),
    ...(target.created ? { created: true } : {}),
  };
}

async function moveFile(o: MoveIntoWorkspace, d: {
  studies: ToolStudy[];
  sources: Awaited<ReturnType<typeof allSources>>;
  folders: ToolStudy[];
  ac: Awaited<ReturnType<typeof activeClientNow>>;
  lineClient: (id?: string) => string;
}): Promise<MoveIntoResult> {
  const file = d.sources.find(s => s.id === o.sourceId);
  if (!file) return { ok: false, why: 'That file is not on this device any more.' };
  const target = await resolveTarget(o, { folders: d.folders, from: file.facts.client || d.lineClient(file.lineId) || '', ac: d.ac, studies: d.studies });
  if (!target.ok) return target;
  if (target.kind === 'ask') return { ok: true, says: ASK_WORKSPACE_NAME };
  const folder = target.folder;
  const from = file.facts.client || d.lineClient(file.lineId) || '';
  const to = folder ? customerOfFolder(folder) : from;
  if (from && folder && (!to || customerKey(from) !== customerKey(to))) return { ok: false, why: 'This file belongs to another customer.' };
  const fromStand = standingOfNamed(from, d.ac, customerKey);
  if (from && !fromStand.in) {
    return { ok: false, why: fromStand.why === 'archived'
      ? 'This file belongs to an archived customer — nothing is moved from an archived customer.'
      : 'This file belongs to another customer.' };
  }
  const folderId = folder?.id;
  const owner = d.studies.find(c => c.id === file.facts.conversationId);
  if (owner && folderIdOf(owner) !== (folderId || undefined)) return { ok: false, why: 'Move its chat first, so its files stay with it.' };
  await patchStudy(file.id, cur => {
    const src = sourceFacts(cur);
    return { facts: { ...cur.facts, source: { ...src, folderId: folderId || undefined, client: src.client || from || to || undefined } } };
  });
  return {
    ok: true,
    says: folder ? `File moved to ${folderTitle(folder)}.` : 'File moved out of the workspace.',
    ...(folderId ? { folderId } : {}),
  };
}

type Resolved =
  | { ok: true; kind: 'ask' }
  | { ok: true; kind: 'target'; folder?: ToolStudy; created?: boolean }
  | { ok: false; why: string };

async function resolveTarget(o: MoveIntoWorkspace, d: {
  folders: ToolStudy[];
  from: string;
  ac: Awaited<ReturnType<typeof activeClientNow>>;
  studies: ToolStudy[];
}): Promise<Resolved> {
  if (o.out) return { ok: true, kind: 'target' };
  if (o.folderId) {
    const folder = d.studies.find(s => s.id === o.folderId && isLunaFolder(s) && !s.deletedAt);
    if (!folder || !standingOfNamed(customerOfFolder(folder), d.ac, customerKey).in) {
      return { ok: false, why: 'That workspace is not available for this customer.' };
    }
    return { ok: true, kind: 'target', folder };
  }
  const named = o.name?.trim();
  if (!named) return { ok: true, kind: 'ask' };
  const want = named.toLowerCase();
  const match = d.folders.find(f => {
    if (folderTitle(f).trim().toLowerCase() !== want) return false;
    const c = customerOfFolder(f);
    if (d.from && c && customerKey(c) !== customerKey(d.from)) return false;
    return true;
  });
  if (match) return { ok: true, kind: 'target', folder: match };
  const client = d.from.trim() || d.ac.client || (d.ac.clients.length === 1 ? d.ac.clients[0] : '');
  if (client) {
    const stand = standingOfNamed(client, d.ac, customerKey);
    if (!stand.in) {
      return { ok: false, why: stand.why === 'archived'
        ? 'That customer is archived — nothing is moved into a workspace from an archived customer.'
        : 'That workspace is not available for this customer.' };
    }
  }
  const folder = newLunaFolder({
    id: uid(), at: o.now, name: named.slice(0, 80),
    ...(client ? { client } : {}),
    ...(o.ownerId ? { ownerId: o.ownerId } : {}),
  });
  await putStudy(folder);
  return { ok: true, kind: 'target', folder, created: true };
}
