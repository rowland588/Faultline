/* A LUNA PROJECT is a work folder: its chats and its library. Nothing from another chat or project leaks in.
 * Never a Faultline 6M/PDCA project (24 November 2026). */
import { describe, expect, it } from 'vitest';
import { customerKey } from '../../lib/customers';
import type { Source } from '../../lib/data/sources';
import { isConversation, newConversation } from '../conversation';
import {
  chatsInFolder, chatsNotInFolder, customerOfChat, customerOfFolder, fileInScope, filesInScope, folderIdOf,
  folderSaid, folderTitle, isLunaFolder, lunaFoldersOf, newLunaFolder, scopeOfChat, standingOfNamed,
} from '../lunaFolder';

const src = (id: string, o: { conversationId?: string; folderId?: string; client?: string } = {}): Source => ({
  id, at: 1, facts: { name: id, named: 'file', fileName: `${id}.xlsx`, kind: 'workbook', bytes: 1, at: 1, fileId: `wb-${id}`, status: 'ready', ...o },
});

describe('a Luna Project is a work folder, not a Faultline project', () => {
  it('is a talk study marked lunaFolder, never a conversation', () => {
    const p = newLunaFolder({ id: 'p', at: 10, name: 'Line 7 downtime', client: 'Acme Foods' });
    expect(isLunaFolder(p)).toBe(true);
    expect(isConversation(p)).toBe(false);
    expect(folderTitle(p)).toBe('Line 7 downtime');
    expect(customerOfFolder(p)).toBe('Acme Foods');
    expect(p.tool).toBe('talk');
    expect((p.facts as { colleague?: boolean }).colleague).toBeUndefined();
  });
  it('a chat in the folder keeps folderId; a chat not in a folder has none', () => {
    const inP = newConversation({ id: 'a', at: 1, name: 'n', folderId: 'p', client: 'Acme Foods' });
    const alone = newConversation({ id: 'b', at: 2, name: 'n' });
    expect(isConversation(inP)).toBe(true);
    expect(isLunaFolder(inP)).toBe(false);
    expect(folderIdOf(inP)).toBe('p');
    expect(folderIdOf(alone)).toBeUndefined();
    expect(chatsInFolder([inP, alone], 'p').map(s => s.id)).toEqual(['a']);
    expect(chatsNotInFolder([inP, alone]).map(s => s.id)).toEqual(['b']);
    expect(lunaFoldersOf([inP, newLunaFolder({ id: 'p', at: 1, name: 'P' })]).map(s => s.id)).toEqual(['p']);
  });
});

describe('nothing from another chat or project leaks in', () => {
  it('a chat not in a project sees only its own files', () => {
    const mine = src('mine', { conversationId: 'c1' });
    const otherChat = src('other-chat', { conversationId: 'c2' });
    const otherProject = src('other-project', { folderId: 'p2' });
    const customerWide = src('customer');
    const scope = { conversationId: 'c1' };
    expect(filesInScope([mine, otherChat, otherProject, customerWide], scope).map(s => s.id)).toEqual(['mine']);
    expect(fileInScope(otherChat, scope)).toBe(false);
    expect(fileInScope(customerWide, scope)).toBe(false);
  });
  it('a chat in a project sees that library plus its own chat files — never another project, never another chat', () => {
    const chatFile = src('chat', { conversationId: 'c1' });
    const library = src('lib', { folderId: 'p1' });
    const otherChatInProject = src('sib', { conversationId: 'c2', folderId: 'p1' });
    const otherProject = src('p2', { folderId: 'p2' });
    const otherChat = src('c3', { conversationId: 'c3' });
    const scope = { conversationId: 'c1', folderId: 'p1' };
    expect(filesInScope([chatFile, library, otherChatInProject, otherProject, otherChat], scope).map(s => s.id).sort()).toEqual(['chat', 'lib', 'sib']);
    expect(fileInScope(otherProject, scope)).toBe(false);
    expect(fileInScope(otherChat, scope)).toBe(false);
    /* a sibling chat's upload that was also put in the library (folderId) is the project's — that is the library, not a leak */
    expect(fileInScope(otherChatInProject, scope)).toBe(true);
  });
  it('scopeOfChat reads the folder off the conversation', () => {
    const inP = newConversation({ id: 'c', at: 1, name: 'n', folderId: 'p' });
    expect(scopeOfChat(inP)).toEqual({ conversationId: 'c', folderId: 'p' });
    expect(scopeOfChat(newConversation({ id: 'd', at: 1, name: 'n' }))).toEqual({ conversationId: 'd' });
  });
});

describe('the customer in hand owns the folder — never mix, archived out', () => {
  const ac = (o: { client?: string; archived?: string[]; clients?: string[] } = {}) => ({
    client: o.client ?? '', archived: new Set((o.archived ?? []).map(customerKey)), clients: o.clients ?? ['Acme Foods', 'Brook Dairy'],
  });
  it('a folder of the customer in hand is in; another customer\'s is out; archived is out', () => {
    expect(standingOfNamed('Acme Foods', ac({ client: 'Acme Foods' }), customerKey)).toEqual({ in: true, customer: 'Acme Foods' });
    expect(standingOfNamed('Brook Dairy', ac({ client: 'Acme Foods' }), customerKey)).toEqual({ in: false, why: 'other', customer: 'Brook Dairy' });
    expect(standingOfNamed('Acme Foods', ac({ archived: ['Acme Foods'] }), customerKey)).toEqual({ in: false, why: 'archived', customer: 'Acme Foods' });
    expect(standingOfNamed('', ac({ client: 'Acme Foods' }), customerKey)).toEqual({ in: true, customer: '' });
  });
  it('a chat stamped for a customer, else its line', () => {
    const stamped = newConversation({ id: 'a', at: 1, name: 'n', client: 'Acme Foods' });
    expect(customerOfChat(stamped)).toBe('Acme Foods');
    const onLine = newConversation({ id: 'b', at: 1, name: 'n', thread: { id: 't', title: 'L', scope: { lineId: 'L7' } } });
    expect(customerOfChat(onLine, id => (id === 'L7' ? 'Brook Dairy' : ''))).toBe('Brook Dairy');
  });
});

describe('the drawer\'s words', () => {
  it('says chats and files, never a Faultline method', () => {
    expect(folderSaid(0, 0)).toBe('0 chats · 0 files');
    expect(folderSaid(1, 1)).toBe('1 chat · 1 file');
    expect(folderSaid(2, 3)).toBe('2 chats · 3 files');
  });
});
