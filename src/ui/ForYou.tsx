/* THE BELL — For you (lib/forYou says why and what). In the top bar beside Problem and you: a count of what is yours that is late
 * or due by tomorrow, red when any is late; pressed, a panel from the right (ui/DrawerShell) with them in three groups, each row
 * opening its record where it is kept (screens/ActionsScreen openAction — the problem panel, the record's drawer, the plan). The
 * first time, it asks which name is yours on the actions, offering the names already used. */
import { useState } from 'react';
import { useProjects } from '../lib/useProjects';
import { actionClient, useClientEveryAction } from '../lib/useProjectActions';
import type { ClientScope } from '../lib/activeClient';
import { forYou, myName, namesOnActions, setMyName } from '../lib/forYou';
import type { ProjectAction } from '../lib/projectActions';
import { openAction } from '../screens/ActionsScreen';
import { PriorityPill, WhenPill } from './ActionPills';
import { DrawerShell } from './DrawerShell';
import { Icon } from './Icon';
import { nav } from '../state/useRoute';

export function ForYouButton() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(myName);
  const { projects } = useProjects();
  /* the active client's only (lib/activeClient, C1) — the bell never counts another business's actions */
  const { read, cs } = useClientEveryAction(projects);
  const f = read && me ? forYou(read.rows, me, read.today) : null;
  const late = f?.late.length ?? 0;
  return (
    <>
      <button type="button" className={'nv-bell' + (late ? ' is-late' : '')} onClick={() => setOpen(true)}
        aria-label={f ? `For you — ${f.count ? `${f.count} need you${late ? `, ${late} late` : ''}` : 'nothing late or due'}` : 'For you'} data-for-you={f?.count ?? ''}>
        <Icon name="bell" size="1.15em" />
        {f && f.count > 0 && <span className="nv-bell-n" aria-hidden>{f.count > 99 ? '99+' : f.count}</span>}
      </button>
      {open && (
        <DrawerShell label="For you" onClose={() => setOpen(false)} back>
          <div className="fy" data-for-you-panel>
            <p className="pp-eyebrow">For you{me ? ` · ${me}` : ''}</p>
            {!me ? <WhoAmI names={read ? namesOnActions(read.rows) : []} onPick={n => { setMyName(n); setMe(n); }} />
              : !read ? <p className="sub">Reading what is yours…</p>
                : (
                  <>
                    <h2 className="fy-h">{f?.count ? `${f.count} need${f.count === 1 ? 's' : ''} you${late ? ` — ${late} late` : ''}` : 'Nothing of yours is late or due by tomorrow'}</h2>
                    <Group title="Late" rows={f?.late ?? []} tone="late" cs={cs} close={() => setOpen(false)} />
                    <Group title="Due today or tomorrow" rows={f?.soon ?? []} tone="soon" cs={cs} close={() => setOpen(false)} />
                    <Group title="The rest of this week" rows={f?.week ?? []} cs={cs} close={() => setOpen(false)} />
                    <div className="fy-foot">
                      <button type="button" className="linkish" onClick={() => { setOpen(false); nav('/actions'); }}>Every action ›</button>
                      <button type="button" className="linkish" onClick={() => { setMyName(''); setMe(''); }}>Not {me}? Change the name</button>
                    </div>
                  </>
                )}
          </div>
        </DrawerShell>
      )}
    </>
  );
}

function Group({ title, rows, tone, close, cs }: { title: string; rows: ProjectAction[]; tone?: 'late' | 'soon'; close: () => void; cs: ClientScope }) {
  if (!rows.length) return null;
  return (
    <section className={'fy-g' + (tone ? ` is-${tone}` : '')} aria-label={title}>
      <h3 className="fy-gh">{title} <span className="act-col-n">{rows.length}</span></h3>
      <ul className="fy-list">
        {rows.map(a => (
          <li key={a.key}>
            <button type="button" className="fy-row" data-for-you-row={a.key} onClick={() => { close(); window.setTimeout(() => openAction(a), 80); }}>
              <b>{a.what}</b>
              <span className="fy-m">{a.priority && <PriorityPill priority={a.priority} />}{[cs.all ? actionClient(cs, a) : '', a.project?.name ?? 'On the line', a.where].filter(Boolean).join(' · ')}</span>
              <WhenPill a={a} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WhoAmI({ names, onPick }: { names: string[]; onPick: (n: string) => void }) {
  const [typed, setTyped] = useState('');
  return (
    <div className="fy-who">
      <h2 className="fy-h">Which name are you on the actions?</h2>
      <p className="sub">The actions name people as they were typed in Who. Say yours once and this device shows what is yours — kept on this device only.</p>
      {names.length > 0 && <div className="pp-seg" role="group" aria-label="Names on the actions">{names.slice(0, 16).map(n => <button key={n} type="button" className="pp-chip" onClick={() => onPick(n)}>{n}</button>)}</div>}
      <form className="fy-type" onSubmit={e => { e.preventDefault(); if (typed.trim()) onPick(typed.trim()); }}>
        <input className="text-input" value={typed} onChange={e => setTyped(e.target.value)} placeholder="Or type your name" aria-label="Your name on the actions" maxLength={60} />
        <button type="submit" className="btn btn-primary" disabled={!typed.trim()}>That's me</button>
      </form>
    </div>
  );
}
