/* LUNA'S HAMBURGER DRAWER (24 November — ChatGPT Android ☰). New chat at the foot, Chats, Projects (Luna work
 * folders — not Faultline 6M/PDCA), Library. Live heading is Projects; the product word is workspace
 * (docs/LUNA-PRODUCT.md) — rename being built. A folder is started from Luna: its chats and its document
 * library. Back to Faultline at the foot, out of the way. */
import { useEffect, useMemo, useState } from 'react';
import { deleteStudy, onDataChange, patchStudy, putStudy } from '../db';
import { niceDay, todayISO } from '../lib/weeks';
import { newestFiles } from '../lib/data/sources';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';
import type { ToolStudy } from '../lib/study';
import { conversationTitle, factsOfConversation } from './conversation';
import { filesInHand } from './filesInHand';
import type { InHand } from './keepUp';
import { activeClientNow, useClientScope } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { uid } from '../lib/ids';
import {
  chatsInFolder, chatsNotInFolder, customerOfChat, customerOfFolder, folderSaid, folderTitle, newLunaFolder,
  standingOfNamed,
} from './lunaFolder';

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fileWhere = (s: InHand): string => {
  const o = s.facts.origin;
  return !o ? 'Uploaded' : o.kind === 'link' ? 'From a link' : 'SharePoint or OneDrive';
};

export function LunaDrawer({ all, folders, openId, viewFolder, onPick, onOpenFolder, onGone, exit = false }: {
  all: ToolStudy[] | null;
  folders: ToolStudy[] | null;
  openId?: string;
  /** The Luna work folder the drawer is showing — undefined is the root. */
  viewFolder?: string;
  onPick: (id?: string) => void;
  onOpenFolder: (id?: string) => void;
  onGone: (id: string) => void;
  /** Env only: Back to Faultline at the foot, never in the thin bar. */
  exit?: boolean;
}) {
  const cs = useClientScope();
  const [menu, setMenu] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ id: string; text: string } | null>(null);
  const [newProject, setNewProject] = useState<string | null>(null);
  const [files, setFiles] = useState<InHand[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void filesInHand().then(mine => { if (live) setFiles(newestFiles(mine, 12, 0)); }).catch(() => { if (live) setFiles([]); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  const ac = useMemo(() => ({
    client: cs.filtering ? cs.client : '',
    archived: new Set(cs.archived.map(c => customerKey(c.name))),
    clients: cs.clients,
  }), [cs.filtering, cs.client, cs.archived, cs.clients]);
  const inHand = (customer: string): boolean => standingOfNamed(customer, ac, customerKey).in;
  const chats = (all ?? []).filter(s => inHand(customerOfChat(s, cs.lineClient)));
  const projects = (folders ?? []).filter(s => inHand(customerOfFolder(s)));
  const open = viewFolder ? projects.find(p => p.id === viewFolder) : undefined;
  const projectChats = open ? chatsInFolder(chats, open.id) : [];
  const looseChats = chatsNotInFolder(chats);
  /* a project's library is that project's files; at the root, only files not in a project — never another project's */
  const library = (files ?? []).filter(s => (open ? s.facts.folderId === open.id : !s.facts.folderId));
  const fileCount = (id: string) => (files ?? []).filter(s => s.facts.folderId === id).length;
  const rename = async (id: string, text: string) => {
    setNaming(null);
    const name = text.trim().slice(0, 80);
    await patchStudy(id, cur => ({ name: name || cur.name, facts: { ...cur.facts, named: name || undefined } as ToolStudy['facts'] }));
  };
  const remove = async (s: ToolStudy, title: string) => {
    setMenu(null);
    if (!window.confirm(`Delete the conversation “${title}”? What was said in it goes with it — anything it made (problems, studies, reports) stays where it is.`)) return;
    const undo = await deleteStudy(s.id);
    onGone(s.id);
    offerUndo(`Conversation “${title}” deleted`, undo);
  };
  const startProject = async (text: string) => {
    const name = text.trim().slice(0, 80);
    setNewProject(null);
    if (!name) return;
    const acNow = await activeClientNow();
    const client = acNow.client || (acNow.clients.length === 1 ? acNow.clients[0] : '');
    const s = newLunaFolder({ id: uid(), at: Date.now(), name, ...(client ? { client } : {}) });
    await putStudy(s);
    onOpenFolder(s.id);
  };
  const chatRow = (s: ToolStudy) => {
    const f = factsOfConversation(s);
    const title = conversationTitle(f, s.name);
    if (naming?.id === s.id) {
      return (
        <li key={s.id} className="ai-conv-row">
          <form className="ai-conv-name" onSubmit={e => { e.preventDefault(); void rename(s.id, naming.text); }}>
            <input autoFocus aria-label="The conversation's name" value={naming.text} maxLength={80} onChange={e => setNaming({ id: s.id, text: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') setNaming(null); }} />
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn" onClick={() => setNaming(null)}>Cancel</button>
          </form>
        </li>
      );
    }
    return (
      <li key={s.id} className="ai-conv-row">
        <button type="button" className={'ai-conv' + (s.id === openId ? ' is-on' : '')} aria-current={s.id === openId ? 'true' : undefined} data-conv={s.id} onClick={() => onPick(s.id)}>
          <b>{title}</b>
          <span>{niceDay(todayISO(new Date(s.updatedAt)))} · {hhmm(s.updatedAt)}</span>
        </button>
        <button type="button" className="ai-conv-more" aria-label={`Options for “${title}”`} aria-haspopup="menu" aria-expanded={menu === s.id} data-conv-more={s.id} onClick={() => setMenu(m => (m === s.id ? null : s.id))}>⋯</button>
        {menu === s.id && (
          <div className="ai-conv-menu" role="menu" aria-label={`Options for “${title}”`} onKeyDown={e => { if (e.key === 'Escape') setMenu(null); }}>
            <button type="button" role="menuitem" onClick={() => { setMenu(null); onPick(s.id); }}>Open</button>
            <button type="button" role="menuitem" onClick={() => { setMenu(null); setNaming({ id: s.id, text: title }); }}>Rename</button>
            <button type="button" role="menuitem" className="is-danger" data-conv-delete={s.id} onClick={() => void remove(s, title)}>Delete</button>
          </div>
        )}
      </li>
    );
  };
  const fileRow = (s: InHand) => (
    <li key={s.id} className="ai-conv-row">
      <button type="button" className="ai-conv" data-luna-file={s.facts.name} onClick={() => { if (s.facts.conversationId) onPick(s.facts.conversationId); }}>
        <b>{s.facts.name}</b>
        <span>{fileWhere(s)}{s.whose ? ` · ${s.whose}` : ''}</span>
      </button>
    </li>
  );
  return (
    <div className="ai-drawer" data-luna-drawer>
      <div className="ai-drawer-body">
        {open ? (
          <>
            <button type="button" className="ai-drawer-back" data-luna-folder-back onClick={() => onOpenFolder()}>‹ Projects</button>
            <p className="ai-drawer-h" data-luna-folder-name>{folderTitle(open)}</p>
            <section className="ai-drawer-sec" data-luna-chats aria-label="Chats">
              <p className="ai-list-h">Chats</p>
              {all === null ? <p className="sub ai-list-none">Reading…</p> : projectChats.length === 0 ? (
                <p className="sub ai-list-none">None yet — New chat in this project.</p>
              ) : <ul className="ai-convs">{projectChats.map(chatRow)}</ul>}
            </section>
            <section className="ai-drawer-sec" data-luna-library aria-label="Library">
              <p className="ai-list-h">Library</p>
              {files === null ? <p className="sub ai-list-none">Reading…</p> : library.length === 0 ? (
                <p className="sub ai-list-none">None yet — attach a file in a chat in this project.</p>
              ) : <ul className="ai-convs">{library.map(fileRow)}</ul>}
            </section>
          </>
        ) : (
          <>
            <section className="ai-drawer-sec" data-luna-projects aria-label="Projects">
              <p className="ai-list-h">Projects</p>
              {folders === null && all === null ? <p className="sub ai-list-none">Reading…</p> : projects.length === 0 && newProject === null ? (
                <p className="sub ai-list-none">None yet — a work folder for chats and files.</p>
              ) : (
                <ul className="ai-convs">
                  {projects.map(p => (
                    <li key={p.id} className="ai-conv-row">
                      <button type="button" className={'ai-conv' + (p.id === viewFolder ? ' is-on' : '')} data-luna-project={folderTitle(p)} onClick={() => onOpenFolder(p.id)}>
                        <b>{folderTitle(p)}</b>
                        <span>{folderSaid(chatsInFolder(chats, p.id).length, fileCount(p.id))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {newProject !== null ? (
                <form className="ai-conv-name" data-luna-new-project-form onSubmit={e => { e.preventDefault(); void startProject(newProject); }}>
                  <input autoFocus aria-label="The project's name" placeholder="Name this project" value={newProject} maxLength={80} onChange={e => setNewProject(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setNewProject(null); }} />
                  <button type="submit" className="btn btn-primary">Start</button>
                  <button type="button" className="btn" onClick={() => setNewProject(null)}>Cancel</button>
                </form>
              ) : (
                <button type="button" className="btn ai-drawer-add" data-luna-new-project onClick={() => setNewProject('')}><Icon name="plus" size="1.05em" />New project</button>
              )}
            </section>
            <section className="ai-drawer-sec" data-luna-library aria-label="Library">
              <p className="ai-list-h">Library</p>
              {files === null ? <p className="sub ai-list-none">Reading…</p> : library.length === 0 ? (
                <p className="sub ai-list-none">None yet — Luna’s ＋ connects a workbook, a link or Microsoft.</p>
              ) : <ul className="ai-convs">{library.map(fileRow)}</ul>}
            </section>
            <section className="ai-drawer-sec" data-luna-chats aria-label="Chats">
              <p className="ai-list-h">Chats</p>
              {all === null ? <p className="sub ai-list-none">Reading…</p> : looseChats.length === 0 ? <p className="sub ai-list-none">None yet — what you ask is kept here.</p> : (
                <ul className="ai-convs">{looseChats.map(chatRow)}</ul>
              )}
            </section>
          </>
        )}
      </div>
      <div className="ai-drawer-foot">
        <button type="button" className="btn ai-new" data-ai-new onClick={() => onPick()}><Icon name="plus" size="1.05em" />New chat</button>
        {exit && <a className="nv-env-exit ai-drawer-exit" href="#/room" data-env-lines aria-label="Back to Faultline — Manual Mode"><span className="nv-env-factory-l">Back to Faultline</span></a>}
      </div>
    </div>
  );
}
