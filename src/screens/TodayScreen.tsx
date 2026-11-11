/* TODAY (10 November, docs/LUNA-WORKSPACE.md W7, docs/LUNA-FIRST.md A — Rowland: "one coherent Faultline application, with Luna
 * available wherever the user is working").
 *
 * The person's day in one page: a greeting, the briefing (lib/today — at most three things that want them, worked out by the app's own
 * code from the rows the Actions page reads, each a door), Luna's box (with AI Mode on — the words sent to her beside this page, her
 * panel opening; with it off the box is not drawn and the page is whole), the factory in a few lines (each line's state in a colour with
 * its word), Carry on where you were (this device's places) and the projects under way by method. It reads; it writes nothing.
 *
 * BY ROLE (11 November, docs/ORGANISATION.md O4 — org/roleHome): with a business on the device, the same parts are filled for the
 * person's role and scope — a team leader's area (what they owe today first, the problems on their lines), a manager's lines with what
 * each lost this week and what their people owe, a leader's business as one row an area with its worst line and its money. No
 * business: as it was. */
import { useEffect, useMemo, useState } from 'react';
import { allProjects } from '../db/projects';
import { listWorkspaces } from '../db/workspaces';
import { listAllSnags } from '../db/walk';
import { allPaceLines } from '../db/pace';
import { listObservations } from '../db/observations';
import { liveProductionLines } from '../lib/lines';
import { loadActionParts, useClientEveryAction } from '../lib/useProjectActions';
import { placeInClient, useClientScope } from '../lib/activeClient';
import { firstName } from '../lib/brand';
import { briefing, greeting, lastSeenAndMark, lineState, suggestionsFor } from '../lib/today';
import { recentPlaces, lastOpen } from '../lib/recentPlaces';
import { methodByKey, methodOfProject } from '../lib/methods';
import { niceDay, todayISO } from '../lib/weeks';
import { onDataChange } from '../db';
import { useAiMode } from '../colleague/aiMode';
import { askLuna, talkToLuna } from '../colleague/lunaPanel';
import { PageHeader, StateTag } from '../ui/parts';
import { Icon } from '../ui/Icon';
import type { Project, Workspace } from '../types';
import type { RegisterProblem } from '../lib/projectActions';
import type { Snag } from '../snag/types';
import { useBusiness } from '../org/orgStore';
import { actionInScope, businessRows, homeSays, isWhole, lensOf, linesInScope, lossShort, myScope, owedToday, peopleOwing, problemInScope, projectsInScope } from '../org/roleHome';
import { lossesOnDevice, weekStart, type LossRow } from '../org/businessFigures';
import { myName } from '../lib/forYou';

const TONE = { r: 'r', a: 'a', w: 'w', g: 'g', n: 'n' } as const;

export function TodayScreen() {
  const ai = useAiMode();
  const [since] = useState(() => lastSeenAndMark(Date.now()));
  const [projects, setProjects] = useState<Project[]>([]);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [register, setRegister] = useState<RegisterProblem[]>([]);
  const [box, setBox] = useState('');
  const [jobLines, setJobLines] = useState<{ projectId?: string; workspaceId?: string; deletedAt?: number }[]>([]);
  const [losses, setLosses] = useState<LossRow[]>([]);
  /* WHAT EACH ROLE SEES FIRST (O4): the lens from the role in the business; none without a business */
  const biz = useBusiness();
  const lens = biz.org ? lensOf(biz.role) : undefined;
  const scope = useMemo(() => myScope(biz.members, biz.me.email), [biz.members, biz.me.email]);
  /* THE ACTIVE CLIENT (lib/activeClient, docs/CONSULTANT-WORKSPACE.md C1): its lines, problems and projects only; under All clients each
     line and project says whose */
  const cs = useClientScope();
  useEffect(() => {
    let live = true;
    const load = async () => {
      const ps = (await allProjects()).filter(p => !p.archivedAt && !(p as { deletedAt?: number }).deletedAt);
      const [ws, sn, parts, jl] = await Promise.all([listWorkspaces(), listAllSnags(), loadActionParts(ps), allPaceLines()]);
      const ls = await liveProductionLines(ws);
      /* the stops this week, summed as the database sums them (org/businessFigures — one number on Today and in Luna's answer) */
      const now = Date.now();
      const obs = (await Promise.all(ls.map(l => listObservations(l.id)))).flat();
      if (!live) return;
      setProjects(ps); setLines(ls); setSnags(sn.filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed')); setRegister(parts.register);
      setJobLines(jl); setLosses(lossesOnDevice(ls, obs, weekStart(now), now + 1));
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, []);
  /* the lines and projects in my scope (all of them with no lens, or a scope of the whole business) */
  const scopedLines = useMemo(() => (lens ? linesInScope(lines, scope) : lines), [lines, lens, scope]);
  const scopedIds = useMemo(() => new Set(scopedLines.map(l => l.id)), [scopedLines]);
  const scopedProjects = useMemo(() => (lens ? projectsInScope(projects, jobLines, scopedIds, scope) : projects), [projects, jobLines, scopedIds, lens, scope]);
  const projectIds = useMemo(() => new Set(scopedProjects.map(p => p.id)), [scopedProjects]);
  const { read: every } = useClientEveryAction(scopedProjects);
  const rows = useMemo(() => (every ? (lens ? every.rows.filter(a => actionInScope(a, scopedIds, projectIds, scope)) : every.rows) : null), [every, lens, scopedIds, projectIds, scope]);
  const mineProjects = useMemo(() => scopedProjects.filter(p => cs.project(p.id)), [scopedProjects, cs]);
  const mineRegister = useMemo(() => register.filter(r => cs.record(r) && (!lens || problemInScope(r, scopedIds, projectIds, scope))), [register, cs, lens, scopedIds, projectIds, scope]);
  const brief = useMemo(() => {
    if (!rows) return null;
    const b = briefing(rows, mineRegister, since);
    /* the floor's first row: what I owe today (lib/forYou's name for me on the actions) */
    const owe = lens === 'floor' ? owedToday(rows, myName(), todayISO()) : undefined;
    return owe ? [owe, ...b.filter(x => x.key !== 'clear')].slice(0, 3) : b;
  }, [rows, mineRegister, since, lens]);
  const lossOf = useMemo(() => { const m = new Map(losses.map(l => [l.workspaceId, l])); return (id: string) => m.get(id); }, [losses]);
  const openOf = useMemo(() => (id: string) => { const m = snags.filter(s => s.workspaceId === id); return { open: m.length, critical: m.filter(s => s.priority === 'critical').length }; }, [snags]);
  const areaRows = useMemo(() => (lens === 'business' ? businessRows(scopedLines.filter(l => cs.line(l.id)), openOf, lossOf) : []), [lens, scopedLines, cs, openOf, lossOf]);
  const people = useMemo(() => (lens === 'lines' && rows ? peopleOwing(rows).slice(0, 5) : []), [lens, rows]);
  const lineRows = useMemo(() => scopedLines.filter(l => cs.line(l.id)).map(l => {
    const mine = snags.filter(s => s.workspaceId === l.id);
    return { l, ...lineState(mine.length, mine.filter(s => s.priority === 'critical').length) };
  }).sort((a, b) => 'ragwn'.indexOf(a.state) - 'ragwn'.indexOf(b.state)), [scopedLines, snags, cs]);
  const byMethod = useMemo(() => {
    const m = new Map<string, Project[]>();
    for (const p of mineProjects) { const k = methodByKey(methodOfProject(p))?.name ?? 'Other'; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()];
  }, [mineProjects]);
  const places = useMemo(() => recentPlaces().filter(p => placeInClient(cs, p.to)).slice(0, 4), [cs]);
  /* what to ask Luna first — from the real state (lib/today suggestionsFor): the oldest late action, the line in the worst state, the
     project furthest behind; made up to three with the general ones */
  const suggestions = useMemo(() => suggestionsFor(every?.rows ?? [], lineRows.map(r => ({ name: r.l.name, state: r.state }))), [every, lineRows]);
  const send = (w: string) => { if (w.trim()) { askLuna(w); setBox(''); } };

  return (
    <div className="wrap today" data-today>
      <PageHeader eyebrow={niceDay(todayISO(), { weekday: 'short' })} title={`${greeting(new Date().getHours())}${firstName() ? `, ${firstName()}` : ''}`}
        says={homeSays(lens, scope, biz.org?.name)} />

      {/* LUNA IS THE FRONT DOOR (11 November, F1): her box first — the question, the box, voice beside it, suggestions from the real state */}
      {ai && (
        <section className="today-luna" aria-label="Ask Luna" data-today-luna>
          <form className="today-luna-box" onSubmit={e => { e.preventDefault(); send(box); }}>
            <span className="today-luna-orb" aria-hidden><Icon name="spark" size={14} /></span>
            <input className="today-luna-in" value={box} onChange={e => setBox(e.target.value)} placeholder="Ask Luna — a line, a problem, a project, anything…" aria-label="Ask Luna" data-today-ask />
            <button type="button" className="today-luna-voice" onClick={talkToLuna} aria-label="Talk to Luna" title="Talk to Luna — she listens, answers out loud and listens again" data-today-voice><Icon name="wave" size={18} /></button>
            <button type="submit" className="btn btn-primary" disabled={!box.trim()} data-today-send>Ask</button>
          </form>
          <div className="today-luna-sugg" role="group" aria-label="Try one">
            {suggestions.map(s => <button key={s} type="button" className="chip" onClick={() => send(s)} data-today-sugg>{s}</button>)}
          </div>
        </section>
      )}

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


      <div className="today-grid">
        {lens === 'business' ? (
        <section className="today-card" aria-label="The business" data-today-business>
          <h2 className="today-h">{biz.org?.name ?? 'The business'}{isWhole(scope) ? '' : ` · ${scope.sites.concat(scope.areas).join(', ')}`}</h2>
          {!areaRows.length ? <p className="sub">No lines yet — <a href="#/factory">set up the factory</a>.</p> : (
            <ul className="today-list">
              {areaRows.map(r => (
                <li key={r.key}><a className="today-row" href={`#${r.href ?? '/room'}`} data-today-area={r.title}>
                  <span className="today-row-text"><b>{r.title}</b><span className="sub" data-today-area-says>{r.says}</span></span><StateTag tone={TONE[r.state]}>{r.word}</StateTag>
                </a></li>
              ))}
            </ul>
          )}
        </section>
        ) : (
        <section className="today-card" aria-label="The lines" data-today-lines>
          <h2 className="today-h">{lens === 'floor' ? (isWhole(scope) ? 'Your lines' : 'Your area') : lens === 'lines' ? 'Your lines this week' : 'The lines'}</h2>
          {!lineRows.length ? <p className="sub">No lines yet — <a href="#/factory">set up the factory</a>.</p> : (
            <ul className="today-list">
              {lineRows.slice(0, 8).map(r => (
                <li key={r.l.id}><a className="today-row" href={`#/lines/${encodeURIComponent(r.l.id)}`} data-today-line={r.l.id}>
                  {lens === 'lines'
                    ? <span className="today-row-text"><b>{r.l.name}</b><span className="sub" data-today-loss>{lossShort(lossOf(r.l.id)) ?? 'no stop timed this week'}</span></span>
                    : <b>{r.l.name}</b>}
                  {cs.all && r.l.clientName && <span className="sub" data-client-of>{r.l.clientName}</span>}<StateTag tone={TONE[r.state]}>{r.word}</StateTag>
                </a></li>
              ))}
              {lineRows.length > 8 && <li><a className="today-row is-more" href="#/room">All {lineRows.length} lines</a></li>}
            </ul>
          )}
          {people.length > 0 && (
            <div className="today-method" data-today-people>
              <p className="today-method-h">What your people owe</p>
              <ul className="today-list">
                {people.map(p => <li key={p.who}><a className="today-row" href="#/actions" data-today-person={p.who}><b>{p.who}</b>{p.late ? <StateTag tone="r">{p.late} late</StateTag> : <span className="sub">{p.open} open</span>}</a></li>)}
              </ul>
            </div>
          )}
        </section>
        )}

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
                  const late = rows?.filter(a => a.late && a.project?.id === p.id).length ?? 0;
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
