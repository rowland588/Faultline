/* A PROJECT'S ACTIONS — the team's action tracker (docs/PROJECTS.md, P3).
 * Rowland, 21 October: "who's doing what and when, why ... can we see who
 * the owner is ... it will pull the risks critical high low etc".
 *
 * Every thing the project owes, from wherever it was raised — a stage, a
 * test, a fix, a part of the plan, the board's actions, a check that keeps
 * a gain, what it waits on, the open critical problems and high risks, and
 * the register's problems taken for it — read the way its Needs you reads
 * them (lib/useProjectActions), so late here is late everywhere. Seen by
 * person, by when or by where; filtered to the late, the critical and high,
 * or the ones nobody has. A row opens its own record, where it is changed
 * (one door per record). Paper: the list for the meeting, and each person's
 * own (lib/projectActionsPdf). */
import { useMemo, useState } from 'react';
import { useProject, useProjects } from '../lib/useProjects';
import { useEveryAction, useProjectActions, type ProjectActionsRead } from '../lib/useProjectActions';
import { actionTiles, actionsClosing, byDate, byPerson, byProject, byWhere, PRIORITY_WORD, type ActionGroup, type ProjectAction } from '../lib/projectActions';
import { whenWord } from '../lib/projectActionsPdf';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { openRecord } from '../ui/RecordDrawer';
import { planHref } from '../lib/plan';
import { nav } from '../state/useRoute';

type View = 'person' | 'date' | 'where' | 'project';
type Only = 'all' | 'late' | 'priority' | 'nobody';
const VIEW_WORD: Record<View, string> = { person: 'Who', date: 'When', where: 'Where', project: 'Project' };
const ONLY_WORD: Record<Only, string> = { all: 'Everything', late: 'Late', priority: 'Critical and high', nobody: 'Nobody yet' };
/* what opens in the record's drawer, as on Needs you (screens/ProjectDashboardScreen) */
const IN_DRAWER = new Set(['test', 'fix', 'install', 'setup', 'handover']);

function open(a: ProjectAction) {
  if (a.snagId) { nav(`/snags?open=${encodeURIComponent(a.snagId)}`); return; }
  const x = a.item;
  if (!x) return;
  const projectId = x.jobId;
  if (x.id && (x.critical || IN_DRAWER.has(x.kind))) openRecord(projectId, x.id);
  else nav(planHref(projectId, x));
}

/** A PROJECT'S ACTIONS (P3). */
export function ActionsScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const read = useProjectActions(project);
  if (loading || (project && !read)) return <p className="sub wrap">Reading the project’s actions…</p>;
  if (!project || !read) return <p className="sub wrap">That project is not on this device.</p>;
  return <ActionsPage read={read} name={project.name} />;
}

/** EVERY PROJECT'S ACTIONS AND EVERY LINE'S OWN PROBLEMS — the control room's
 *  (docs/PROJECTS.md, P4): the same page, a row marked with its project, seen
 *  by project too. */
export function EveryActionScreen() {
  const { projects, loading } = useProjects();
  const read = useEveryAction(projects);
  if (loading || !read) return <p className="sub wrap">Reading every project’s actions…</p>;
  return <ActionsPage read={read} />;
}

function ActionsPage({ read, name }: { read: ProjectActionsRead; name?: string }) {
  const every = !name;
  const [view, setView] = useState<View>('person');
  const [only, setOnly] = useState<Only>('all');
  const [printing, setPrinting] = useState('');

  const shown = useMemo(() => (read?.rows ?? []).filter(a =>
    only === 'late' ? a.late : only === 'priority' ? a.priority === 'critical' || a.priority === 'high' : only === 'nobody' ? !a.who : true), [read, only]);
  const groups: ActionGroup[] = useMemo(() => (view === 'person' ? byPerson(shown) : view === 'date' ? byDate(shown, read.today) : view === 'project' ? byProject(shown) : byWhere(shown)), [view, shown, read]);
  const closing = actionsClosing(read.rows);
  const title = name ?? 'Every project and line';

  const paper = async (person?: string) => {
    if (printing) return;
    setPrinting(person ?? 'all');
    try {
      const { saveActionsPdf } = await import('../lib/projectActionsPdf');
      await saveActionsPdf({ project: title, printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), today: read.today, rows: read.rows, done: read.done, ...(person ? { person } : {}) });
    } catch (e) {
      console.error('actions pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setPrinting(''); }
  };

  return (
    <div className="wrap act">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">{every ? 'CONTROL ROOM · EVERY PROJECT AND LINE' : 'ACTIONS · WHO IS DOING WHAT'}</p>
          <h1>{every ? 'Every action' : 'Actions'}</h1>
          <p className="sub">{every ? 'Everything every project owes, and every problem on a line with no project — what, why, where, who and by when. Tap one to change it where it is kept.' : 'Everything the project owes, from wherever it was raised — what, why, where, who and by when. Tap one to change it where it is kept.'}</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-ghost" disabled={!!printing} onClick={() => void paper()} aria-label="The action list on paper (PDF)">{printing === 'all' ? 'Making…' : 'PDF'}</button>
        </div>
      </header>
      <LeanTiles tiles={actionTiles(read.rows, read.done, read.today)} className="act-tiles" />
      <div className="chip-row qsl-f" role="group" aria-label="Seen by">
        {(Object.keys(VIEW_WORD) as View[]).filter(v => every || v !== 'project').map(v => (
          <button key={v} type="button" className={'chip' + (view === v ? ' on' : '')} aria-pressed={view === v} onClick={() => setView(v)}>{VIEW_WORD[v]}</button>
        ))}
      </div>
      <div className="chip-row qsl-f" role="group" aria-label="Which">
        {(Object.keys(ONLY_WORD) as Only[]).map(o => (
          <button key={o} type="button" className={'chip' + (only === o ? ' on' : '')} aria-pressed={only === o} onClick={() => setOnly(o)}>{ONLY_WORD[o]}</button>
        ))}
      </div>
      {!shown.length && <p className="qsl-empty">{read.rows.length ? `None ${only === 'late' ? 'late' : only === 'nobody' ? 'without a name' : 'critical or high'}.` : every ? 'Nothing owed on any project or line.' : 'Nothing owed on the project.'}</p>}
      {groups.map(g => (
        <section key={g.key || 'none'} className="qsl-g act-g" aria-label={g.label}>
          <div className="qsl-gh">
            <h2>{g.label}</h2>
            <span className="sub">{g.rows.length} open{g.late ? <> · <b className="act-late">{g.late} late</b></> : null}</span>
            {view === 'person' && g.key && (
              <button type="button" className="cw-link act-own" disabled={!!printing} onClick={() => void paper(g.label)} aria-label={`${g.label}’s actions on paper (PDF)`}>{printing === g.label ? 'Making…' : 'Their list'}</button>
            )}
          </div>
          <ul className="lt-rows">
            {g.rows.map(a => (
              <li key={a.key} className={'lt-li act-li' + (a.late ? ' is-late' : a.soon ? ' is-soon' : '')} data-action={a.key}>
                <button type="button" className="lt-row" onClick={() => open(a)}>
                  <b className="lt-what">{a.what}</b>
                  <span className="lt-says act-meta">
                    {a.priority && <span className={'act-pri is-' + a.priority}>{PRIORITY_WORD[a.priority]}</span>}
                    {[every && view !== 'project' ? a.project?.name ?? 'On the line' : '', a.kind, a.where, a.why].filter(Boolean).join(' · ')}
                  </span>
                  <span className="lt-where act-when">{view !== 'person' && <>{a.who || 'nobody yet'} · </>}<span className={a.late ? 'act-late' : a.soon ? 'act-soon' : ''}>{whenWord(a)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <LeanClosing closing={closing} />
    </div>
  );
}
