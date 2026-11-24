/* LUNA'S HAMBURGER DRAWER (24 November — ChatGPT Android ☰). New chat, Chats, Projects (topic
 * threads — not Faultline 6M/PDCA), Library (the customer in hand's linked files). Back to Faultline
 * at the foot, out of the way. Presentation over existing records: conversations, threads, sources. */
import { useEffect, useState } from 'react';
import { deleteStudy, onDataChange, patchStudy } from '../db';
import { niceDay, todayISO } from '../lib/weeks';
import { newestFiles } from '../lib/data/sources';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';
import type { ToolStudy } from '../lib/study';
import { chatProjects, conversationTitle, factsOfConversation } from './conversation';
import { filesInHand } from './filesInHand';
import type { InHand } from './keepUp';

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fileWhere = (s: InHand): string => {
  const o = s.facts.origin;
  return !o ? 'Uploaded' : o.kind === 'link' ? 'From a link' : 'SharePoint or OneDrive';
};

export function LunaDrawer({ all, openId, onPick, onGone, exit = false }: {
  all: ToolStudy[] | null;
  openId?: string;
  onPick: (id?: string) => void;
  onGone: (id: string) => void;
  /** Env only: Back to Faultline at the foot, never in the thin bar. */
  exit?: boolean;
}) {
  const [menu, setMenu] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ id: string; text: string } | null>(null);
  const [files, setFiles] = useState<InHand[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void filesInHand().then(mine => { if (live) setFiles(newestFiles(mine, 12, 0)); }).catch(() => { if (live) setFiles([]); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
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
  const projects = all ? chatProjects(all) : [];
  const library = files ?? [];
  return (
    <div className="ai-drawer" data-luna-drawer>
      <div className="ai-drawer-body">
        <section className="ai-drawer-sec" data-luna-projects aria-label="Projects">
          <p className="ai-list-h">Projects</p>
          {all === null ? <p className="sub ai-list-none">Reading…</p> : projects.length === 0 ? (
            <p className="sub ai-list-none">None yet — a chat about one topic is listed here.</p>
          ) : (
            <ul className="ai-convs">
              {projects.map(p => (
                <li key={p.title.toLowerCase()} className="ai-conv-row">
                  <button type="button" className={'ai-conv' + (p.conversationId === openId ? ' is-on' : '')} data-luna-project={p.title} onClick={() => onPick(p.conversationId)}>
                    <b>{p.title}</b>
                    <span>{p.chats === 1 ? '1 chat' : `${p.chats} chats`} · {niceDay(todayISO(new Date(p.at)))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ai-drawer-sec" data-luna-library aria-label="Library">
          <p className="ai-list-h">Library</p>
          {files === null ? <p className="sub ai-list-none">Reading…</p> : library.length === 0 ? (
            <p className="sub ai-list-none">None yet — Luna’s ＋ connects a workbook, a link or Microsoft.</p>
          ) : (
            <ul className="ai-convs">
              {library.map(s => (
                <li key={s.id} className="ai-conv-row">
                  <button type="button" className="ai-conv" data-luna-file={s.facts.name} onClick={() => { if (s.facts.conversationId) onPick(s.facts.conversationId); }}>
                    <b>{s.facts.name}</b>
                    <span>{fileWhere(s)}{s.whose ? ` · ${s.whose}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ai-drawer-sec" data-luna-chats aria-label="Chats">
          <p className="ai-list-h">Chats</p>
          {all === null ? <p className="sub ai-list-none">Reading…</p> : all.length === 0 ? <p className="sub ai-list-none">None yet — what you ask is kept here.</p> : (
            <ul className="ai-convs">
              {all.map(s => {
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
              })}
            </ul>
          )}
        </section>
      </div>
      <div className="ai-drawer-foot">
        <button type="button" className="btn ai-new" data-ai-new onClick={() => onPick()}><Icon name="plus" size="1.05em" />New chat</button>
        {exit && <a className="nv-env-exit ai-drawer-exit" href="#/room" data-env-lines aria-label="Back to Faultline — Manual Mode"><span className="nv-env-factory-l">Back to Faultline</span></a>}
      </div>
    </div>
  );
}
