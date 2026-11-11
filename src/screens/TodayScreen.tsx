/* TODAY (10 November, docs/LUNA-WORKSPACE.md W7, docs/LUNA-FIRST.md A — Rowland: "one coherent Faultline application, with Luna
 * available wherever the user is working").
 *
 * The person's day in one page: a greeting, the briefing (lib/today — at most three things that want them, worked out by the app's own
 * code from the rows the Actions page reads, each a door), Luna's box (with AI Mode on — the words sent to her beside this page, her
 * panel opening; with it off the box is not drawn and the page is whole), the factory in a few lines (each line's state in a colour with
 * its word), Carry on where you were (this device's places) and the projects under way by method. It reads; it writes nothing. */
import { useEffect, useMemo, useState } from 'react';
import { allProjects } from '../db/projects';
import { listWorkspaces } from '../db/workspaces';
import { listAllSnags } from '../db/walk';
import { liveProductionLines } from '../lib/lines';
import { loadActionParts, useClientEveryAction } from '../lib/useProjectActions';
import { placeInClient, useClientScope } from '../lib/activeClient';
import { firstName } from '../lib/brand';
import { briefing, greeting, lastSeenAndMark, lineState } from '../lib/today';
import { recentPlaces, lastOpen } from '../lib/recentPlaces';
import { methodByKey, methodOfProject } from '../lib/methods';
import { niceDay, todayISO } from '../lib/weeks';
import { onDataChange } from '../db';
import { useAiMode } from '../colleague/aiMode';
import { askLuna } from '../colleague/lunaPanel';
import { PageHeader, StateTag } from '../ui/parts';
import { Icon } from '../ui/Icon';
import type { Project, Workspace } from '../types';
import type { RegisterProblem } from '../lib/projectActions';
import type { Snag } from '../snag/types';

const TONE = { r: 'r', a: 'a', w: 'w', g: 'g', n: 'n' } as const;

export function TodayScreen() {
  const ai = useAiMode();
  const [since] = useState(() => lastSeenAndMark(Date.now()));
  const [projects, setProjects] = useState<Project[]>([]);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [register, setRegister] = useState<RegisterProblem[]>([]);
  const [box, setBox] = useState('');
  /* THE ACTIVE CLIENT (lib/activeClient, docs/CONSULTANT-WORKSPACE.md C1): its lines, problems and projects only; under All clients each
     line and project says whose */
  const cs = useClientScope();
  useEffect(() => {
    let live = true;
    const load = async () => {
      const ps = (await allProjects()).filter(p => !p.archivedAt && !(p as { deletedAt?: number }).deletedAt);
      const [ws, sn, parts] = await Promise.all([listWorkspaces(), listAllSnags(), loadActionParts(ps)]);
      const ls = await liveProductionLines(ws);
      if (!live) return;
      setProjects(ps); setLines(ls); setSnags(sn.filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed')); setRegister(parts.register);
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, []);
  const { read: every } = useClientEveryAction(projects);
  const mineProjects = useMemo(() => projects.filter(p => cs.project(p.id)), [projects, cs]);
  const mineRegister = useMemo(() => register.filter(r => cs.record(r)), [register, cs]);
  const brief = useMemo(() => (every ? briefing(every.rows, mineRegister, since) : null), [every, mineRegister, since]);
  const lineRows = useMemo(() => lines.filter(l => cs.line(l.id)).map(l => {
    const mine = snags.filter(s => s.workspaceId === l.id);
    return { l, ...lineState(mine.length, mine.filter(s => s.priority === 'critical').length) };
  }).sort((a, b) => 'ragwn'.indexOf(a.state) - 'ragwn'.indexOf(b.state)), [lines, snags, cs]);
  const byMethod = useMemo(() => {
    const m = new Map<string, Project[]>();
    for (const p of mineProjects) { const k = methodByKey(methodOfProject(p))?.name ?? 'Other'; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()];
  }, [mineProjects]);
  const places = useMemo(() => recentPlaces().filter(p => placeInClient(cs, p.to)).slice(0, 4), [cs]);
  const worst = lineRows.find(r => r.state === 'r' || r.state === 'a');
  const suggestions = [
    'What should I do first today?',
    worst ? `Why is ${worst.l.name} losing time?` : 'Where is the factory losing the most time?',
    'What has changed since yesterday?',
    brief?.find(b => b.key === 'behind') ? 'What is holding up the project furthest behind?' : 'Which problem is costing us the most?',
  ];
  const send = (w: string) => { if (w.trim()) { askLuna(w); setBox(''); } };

  return (
    <div className="wrap today" data-today>
      <PageHeader eyebrow={niceDay(todayISO(), { weekday: 'short' })} title={`${greeting(new Date().getHours())}${firstName() ? `, ${firstName()}` : ''}`}
        says="What wants you today, worked out from the actions and problems as they stand — then the lines, where you were and the projects." />

      <section className="today-brief" aria-label="What wants you" data-today-brief>
        {!brief ? <p className="sub">Reading the actions…</p> : (
          <ul className="today-brief-list">
            {brief.map(b => (
              <li key={b.key}>
                <a className={`today-brief-row is-${b.state}`} href={`#${b.to}`} data-brief={b.key}>
                  <StateTag tone={TONE[b.state]}>{b.word}</StateTag>
                  <span className="today-brief-says">{b.says}</span>
                  <Icon name="chevron" size={14} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ai && (
        <section className="today-luna" aria-label="Ask Luna" data-today-luna>
          <form className="today-luna-box" onSubmit={e => { e.preventDefault(); send(box); }}>
            <span className="today-luna-orb" aria-hidden><Icon name="spark" size={14} /></span>
            <input className="today-luna-in" value={box} onChange={e => setBox(e.target.value)} placeholder="Ask Luna about the factory, a line or a project…" aria-label="Ask Luna" data-today-ask />
            <button type="submit" className="btn btn-primary" disabled={!box.trim()} data-today-send>Ask</button>
          </form>
          <div className="today-luna-sugg">
            {suggestions.map(s => <button key={s} type="button" className="chip" onClick={() => send(s)} data-today-sugg>{s}</button>)}
          </div>
        </section>
      )}

      <div className="today-grid">
        <section className="today-card" aria-label="The lines" data-today-lines>
          <h2 className="today-h">The lines</h2>
          {!lineRows.length ? <p className="sub">No lines yet — <a href="#/factory">set up the factory</a>.</p> : (
            <ul className="today-list">
              {lineRows.slice(0, 8).map(r => (
                <li key={r.l.id}><a className="today-row" href={`#/lines/${encodeURIComponent(r.l.id)}`} data-today-line={r.l.id}>
                  <b>{r.l.name}</b>{cs.all && r.l.clientName && <span className="sub" data-client-of>{r.l.clientName}</span>}<StateTag tone={TONE[r.state]}>{r.word}</StateTag>
                </a></li>
              ))}
              {lineRows.length > 8 && <li><a className="today-row is-more" href="#/room">All {lineRows.length} lines</a></li>}
            </ul>
          )}
        </section>

        {places.length > 0 && (
          <section className="today-card" aria-label="Carry on where you were" data-today-carry>
            <h2 className="today-h">Carry on where you were</h2>
            <ul className="today-list">
              {places.map(p => (
                <li key={p.to}><a className="today-row" href={`#${p.to}`}>
                  <b>{p.scope}</b><span className="sub">{p.page ?? (p.kind === 'project' ? 'The project' : 'The line')} · {lastOpen(p.at, todayISO(), d => niceDay(d, { weekday: 'short' }))}</span>
                </a></li>
              ))}
            </ul>
          </section>
        )}

        <section className="today-card" aria-label="Projects under way" data-today-projects>
          <h2 className="today-h">Projects under way</h2>
          {!byMethod.length ? <p className="sub">None under way — <a href="#/projects">start a project</a>.</p> : byMethod.map(([m, ps]) => (
            <div key={m} className="today-method">
              <p className="today-method-h">{m} · {ps.length}</p>
              <ul className="today-list">
                {ps.slice(0, 5).map(p => {
                  const late = every?.rows.filter(a => a.late && a.project?.id === p.id).length ?? 0;
                  return <li key={p.id}><a className="today-row" href={`#/project/${p.id}`} data-today-project={p.id}><b>{p.name}</b>{cs.all && cs.whose({ projectId: p.id }) && <span className="sub" data-client-of>{cs.whose({ projectId: p.id })}</span>}{late ? <StateTag tone="r">{late} late</StateTag> : <span className="sub">nothing late</span>}</a></li>;
                })}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
