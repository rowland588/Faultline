/* LUNA'S HAMBURGER DRAWER (24 November — ChatGPT Android ☰). New chat at the foot, Chats, Workspaces (Luna work
 * folders — not Faultline 6M/PDCA), Library, Artifacts and Schedules. A folder is started from Luna: its chats and its document
 * library. Back to Faultline at the foot, out of the way. */
import { useEffect, useMemo, useState } from 'react';
import { deleteStudy, onDataChange, patchStudy, putStudy } from '../db';
import { outputsOfConversation } from '../capabilities/data';
import { chartNow, seriesOf } from '../lib/data/outputs';
import { StandingJobsPanel } from '../ui/StandingJobsPanel';
import { niceDay, todayISO } from '../lib/weeks';
import { newestFiles } from '../lib/data/sources';
import { allSources } from '../capabilities/data';
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
  chatsInFolder, chatsNotInFolder, customerOfChat, customerOfFolder, folderIdOf, folderSaid, folderTitle, newLunaFolder,
  standingOfNamed,
} from './lunaFolder';

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fileWhere = (s: InHand): string => {
  const o = s.facts.origin;
  return !o ? 'Uploaded' : o.kind === 'link' ? 'From a link' : 'SharePoint or OneDrive';
};

export function LunaDrawer({ all, folders, openId, viewFolder, onPick, onOpenFolder, onGone, onArtifact, exit = false }: {
  all: ToolStudy[] | null;
  folders: ToolStudy[] | null;
  openId?: string;
  /** The Luna work folder the drawer is showing — undefined is the root. */
  viewFolder?: string;
  onPick: (id?: string) => void;
  onOpenFolder: (id?: string) => void;
  onGone: (id: string) => void;
  onArtifact: (conversationId: string, kind: 'chart' | 'convreport', id: string) => void;
  /** Env only: Back to Faultline at the foot, never in the thin bar. */
  exit?: boolean;
}) {
  const cs = useClientScope();
  const [menu, setMenu] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ id: string; text: string } | null>(null);
  const [newProject, setNewProject] = useState<string | null>(null);
  const [files, setFiles] = useState<InHand[] | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let live = true;
    let request = 0;
    const load = () => {
      const thisRequest = ++request;
      void filesInHand().then(mine => { if (live && thisRequest === request) setFiles(newestFiles(mine, mine.length, 0)); })
        .catch(() => { if (live && thisRequest === request) setFiles([]); });
    };
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
  const listedChats = chats.filter(s => (s.facts as { archivedChat?: boolean }).archivedChat !== true);
  const projects = (folders ?? []).filter(s => inHand(customerOfFolder(s)));
  const open = viewFolder ? projects.find(p => p.id === viewFolder) : undefined;
  const projectChats = open ? chatsInFolder(listedChats, open.id) : [];
  const looseChats = chatsNotInFolder(listedChats);
  const artifacts = (open ? chatsInFolder(chats, open.id) : chats).filter(s => {
    const home = (folders ?? []).find(f => f.id === folderIdOf(s));
    const customer = customerOfChat(s, cs.lineClient) || (home ? customerOfFolder(home) : '');
    return !!customer || cs.clients.length <= 1;
  }).flatMap(s => {
    const outs = outputsOfConversation(s);
    const results = new Map(outs.results.map(r => [r.id, r] as const));
    return [
      ...outs.reports.map(r => ({ id: r.id, conversationId: s.id, kind: 'convreport' as const, title: r.title, detail: `${r.form === 'presentation' ? 'Presentation' : 'Report'} · ${r.sections.length} sections · v${r.version}`, preview: r.sections.find(sec => (sec.kind === 'summary' || sec.kind === 'finding') && !sec.unbacked?.length)?.text?.slice(0, 110) ?? '', at: r.updated || r.at })),
      ...outs.charts.map(c => {
        const series = seriesOf(chartNow(c), results);
        return { id: c.id, conversationId: s.id, kind: 'chart' as const, title: chartNow(c).title, detail: `Chart · v${c.versions.length}`, preview: 'why' in series ? '' : series.finding ?? `${series.labels.length} categories`, at: c.at };
      }),
    ];
  }).sort((a, b) => b.at - a.at);
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
    const outs = outputsOfConversation(s);
    const hasArtifacts = outs.charts.length + outs.reports.length > 0;
    if (!window.confirm(hasArtifacts
      ? `Remove “${title}” from Chats? Its reports and charts remain in Artifacts, with this conversation available from each one.`
      : `Delete the conversation “${title}”? What was said in it goes with it — any separate Faultline records stay where they are.`)) return;
    if (hasArtifacts) {
      await patchStudy(s.id, cur => ({ facts: { ...cur.facts, archivedChat: true } }));
      onGone(s.id);
      setNotice('Chat removed from the list. Its reports and charts remain in Artifacts.');
      return;
    }
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
  const moveChat = async (s: ToolStudy, folderId: string) => {
    const target = folderId ? projects.find(p => p.id === folderId) : undefined;
    if (folderId && !target) { setNotice('That workspace is not available for this customer.'); return; }
    const from = customerOfChat(s, cs.lineClient);
    const to = target ? customerOfFolder(target) : from;
    if (from && to && customerKey(from) !== customerKey(to)) { setNotice('This chat belongs to another customer.'); return; }
    const attached = (await allSources()).filter(f => f.facts.conversationId === s.id);
    if (target && attached.some(f => f.facts.client && (!to || customerKey(f.facts.client) !== customerKey(to)))) {
      setNotice('An attached file belongs to another customer. Move cannot continue.'); return;
    }
    await patchStudy(s.id, cur => ({ facts: { ...cur.facts, folderId: folderId || undefined, client: from || to || undefined } }));
    await Promise.all(attached.map(f => patchStudy(f.id, cur => ({ facts: { ...cur.facts, source: { ...(cur.facts as { source: typeof f.facts }).source, folderId: folderId || undefined, client: f.facts.client || from || to || undefined } } }))));
    setMenu(null); setNotice(target ? `Chat and its files moved to ${folderTitle(target)}.` : 'Chat and its files moved out of the workspace.');
    onOpenFolder(folderId || undefined);
  };
  const moveFile = async (s: InHand, folderId: string) => {
    const target = folderId ? projects.find(p => p.id === folderId) : undefined;
    if (folderId && !target) { setNotice('That workspace is not available for this customer.'); return; }
    const from = s.whose || s.facts.client || '';
    const to = target ? customerOfFolder(target) : from;
    if (from && target && (!to || customerKey(from) !== customerKey(to))) { setNotice('This file belongs to another customer.'); return; }
    const owner = (all ?? []).find(c => c.id === s.facts.conversationId);
    if (owner && folderIdOf(owner) !== (folderId || undefined)) { setNotice('Move its chat first, so its files stay with it.'); return; }
    await patchStudy(s.id, cur => ({ facts: { ...cur.facts, source: { ...(cur.facts as { source: typeof s.facts }).source, folderId: folderId || undefined, client: from || to || undefined } } }));
    setMenu(null); setNotice(target ? `File moved to ${folderTitle(target)}.` : 'File moved out of the workspace.');
    onOpenFolder(folderId || undefined);
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
            <label className="ai-conv-move">Move to workspace<select aria-label={`Move “${title}” to workspace`} value={folderIdOf(s) ?? ''} onChange={e => void moveChat(s, e.target.value)}>
              <option value="">No workspace</option>{projects.map(p => <option key={p.id} value={p.id}>{folderTitle(p)}</option>)}
            </select></label>
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
      <button type="button" className="ai-conv-more" aria-label={`Options for file “${s.facts.name}”`} aria-expanded={menu === s.id} onClick={() => setMenu(m => m === s.id ? null : s.id)}>⋯</button>
      {menu === s.id && <div className="ai-conv-menu" role="menu" aria-label={`Options for file “${s.facts.name}”`}>
        <label className="ai-conv-move">Move to workspace<select aria-label={`Move file “${s.facts.name}” to workspace`} value={s.facts.folderId ?? ''} onChange={e => void moveFile(s, e.target.value)}>
          <option value="">No workspace</option>{projects.map(p => <option key={p.id} value={p.id}>{folderTitle(p)}</option>)}
        </select></label>
      </div>}
    </li>
  );
  const artifactSection = <section className="ai-drawer-sec" data-luna-artifacts aria-label="Artifacts">
    <details><summary className="ai-list-h">Artifacts <span className="sub">{artifacts.length}</span></summary>
      {artifacts.length ? <ul className="ai-convs">{artifacts.map(a => <li key={`${a.conversationId}:${a.kind}:${a.id}`} className="ai-conv-row">
        <button type="button" className="ai-conv" onClick={() => onArtifact(a.conversationId, a.kind, a.id)}><b>{a.title}</b><span>{a.detail} · {niceDay(todayISO(new Date(a.at)))}</span>{a.preview && <span>{a.preview}</span>}</button>
      </li>)}</ul> : <p className="sub ai-list-none">Reports and charts Luna makes appear here.</p>}
    </details>
  </section>;
  return (
    <div className="ai-drawer" data-luna-drawer>
      <div className="ai-drawer-body">
        {open ? (
          <>
            <button type="button" className="ai-drawer-back" data-luna-folder-back onClick={() => onOpenFolder()}>‹ Workspaces</button>
            <p className="ai-drawer-h" data-luna-folder-name>{folderTitle(open)}</p>
            <section className="ai-drawer-sec" data-luna-chats aria-label="Chats">
              <p className="ai-list-h">Chats</p>
              {all === null ? <p className="sub ai-list-none">Reading…</p> : projectChats.length === 0 ? (
                <p className="sub ai-list-none">None yet — start a chat in this workspace.</p>
              ) : <ul className="ai-convs">{projectChats.map(chatRow)}</ul>}
            </section>
            <section className="ai-drawer-sec" data-luna-library aria-label="Library">
              <p className="ai-list-h">Library</p>
              {files === null ? <p className="sub ai-list-none">Reading…</p> : library.length === 0 ? (
                <p className="sub ai-list-none">None yet — attach a file in a chat here.</p>
              ) : <ul className="ai-convs">{library.map(fileRow)}</ul>}
            </section>
            {artifactSection}
          </>
        ) : (
          <>
            <section className="ai-drawer-sec" data-luna-projects aria-label="Workspaces">
              <p className="ai-list-h">Workspaces</p>
              {folders === null && all === null ? <p className="sub ai-list-none">Reading…</p> : projects.length === 0 && newProject === null ? (
                <p className="sub ai-list-none">None yet — a work folder for chats and files.</p>
              ) : (
                <ul className="ai-convs">
                  {projects.map(p => (
                    <li key={p.id} className="ai-conv-row">
                      <button type="button" className={'ai-conv' + (p.id === viewFolder ? ' is-on' : '')} data-luna-project={folderTitle(p)} onClick={() => onOpenFolder(p.id)}>
                        <b>{folderTitle(p)}</b>
                        <span>{folderSaid(chatsInFolder(listedChats, p.id).length, fileCount(p.id))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {newProject !== null ? (
                <form className="ai-conv-name" data-luna-new-project-form onSubmit={e => { e.preventDefault(); void startProject(newProject); }}>
                  <input autoFocus aria-label="The workspace's name" placeholder="Name this workspace" value={newProject} maxLength={80} onChange={e => setNewProject(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setNewProject(null); }} />
                  <button type="submit" className="btn btn-primary">Start</button>
                  <button type="button" className="btn" onClick={() => setNewProject(null)}>Cancel</button>
                </form>
              ) : (
                <button type="button" className="btn ai-drawer-add" data-luna-new-project onClick={() => setNewProject('')}><Icon name="plus" size="1.05em" />New workspace</button>
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
            {artifactSection}
            <section className="ai-drawer-sec" data-luna-schedules aria-label="Schedules"><details><summary className="ai-list-h">Schedules</summary><StandingJobsPanel /></details></section>
          </>
        )}
      </div>
      {notice && <p className="sub ai-drawer-notice" role="status">{notice}</p>}
      <div className="ai-drawer-foot">
        <button type="button" className="btn ai-new" data-ai-new onClick={() => onPick()}><Icon name="plus" size="1.05em" />New chat</button>
        {exit && <a className="nv-env-exit ai-drawer-exit" href="#/room" data-env-lines aria-label="Back to Faultline — Manual Mode"><span className="nv-env-factory-l">Back to Faultline</span></a>}
      </div>
    </div>
  );
}
