/* PROJECT PACE — three lenses on one set of data.
 *
 *   Overview — the arc, for the GM: are we at pace, what moved, what the walk
 *              found. Compact enough to take in at a glance, and what prints.
 *   Meeting  — the tracker by OWNER, because that is how the meeting is run:
 *              each person reports their own workload. Sections fold, so one
 *              person is on screen at a time.
 *   Data     — the mechanics: upload this week's tracker, type the ppm. Its own
 *              tab so it is never buried inside a page you have to scroll.
 *
 * The lens lives in the URL (?view=), so a bookmark opens the meeting straight
 * into the meeting. */
import { useRef, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { PaceMeeting } from './PaceMeeting';
import { PaceSnags } from './PaceSnags';
import { PaceNextSteps } from './PaceNextSteps';
import { PaceSuccess } from './PaceSuccess';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { PaceLineChart } from '../charts/PaceLineChart';
import { usePaceLines } from '../lib/usePaceLines';
import { PpmEditor } from './PpmEditor';
import { usePaceSnapshots, type PaceState } from '../lib/usePaceSnapshots';
import { useProject } from '../lib/useProjects';
import { useAllLinePacks, emptyPack, type LinePack } from '../lib/useLinePack';
import type { PaceLineRow } from '../db';

function Kpi({ n, label, sub, tone }: { n: string; label: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className={'pace-kpi' + (tone ? ' is-' + tone : '')}>
      <span className="pace-kpi-n">{n}</span>
      <span className="pace-kpi-l">{label}</span>
      {sub && <span className="pace-kpi-s">{sub}</span>}
    </div>
  );
}

const when = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- weekly upload ---------- */
function UploadPanel({ state }: { state: PaceState }) {
  const input = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <section className="pace-upload">
      <div className="pace-upload-main">
        <div>
          <h3 className="pace-upload-title">The tracker</h3>
          <p className="pace-upload-sub">
            {state.snapshots.length === 0
              ? <>Nothing uploaded yet — the actions on this project come from the workbook.</>
              : <>
                  This page is showing <b>{state.snapshots[0].fileName}</b> · read {when(state.snapshots[0].takenAt)}
                  {state.snapshots.length > 1 && ` · ${state.snapshots.length - 1} earlier upload${state.snapshots.length === 2 ? '' : 's'}`}
                </>}
          </p>
          <p className="pace-upload-note">Upload the workbook and the whole page follows it. The sheet is the record; this just reads it.</p>
        </div>
        <div className="pace-upload-actions">
          <button className="btn btn-primary" disabled={state.busy} onClick={() => input.current?.click()}>
            {state.busy ? 'Reading…' : 'Upload this week\u2019s tracker'}
          </button>
          {state.snapshots.length > 1 && (
            <button className="btn btn-ghost" onClick={() => setShowHistory(h => !h)}>
              {showHistory ? 'Hide history' : 'History'}
            </button>
          )}
        </div>
        <input
          ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) void state.upload(f);
            e.target.value = ''; // same file twice in a row still fires
          }}
        />
      </div>

      {state.error && (
        <p className="pace-upload-err" role="alert">
          {state.error}
          <button className="pace-err-x" onClick={state.dismissError} aria-label="Dismiss">×</button>
        </p>
      )}
      {state.warnings.map((w, i) => <p key={i} className="pace-upload-warn">{w}</p>)}

      {showHistory && (
        <ul className="pace-history">
          {state.snapshots.map(sn => (
            <li key={sn.id}>
              <span className="pace-hist-when">{when(sn.takenAt)}</span>
              <span className="pace-hist-name">{sn.fileName}</span>
              <span className="pace-hist-n">{sn.actions.length} actions</span>
              {sn.id !== 'baseline' && (
                <button className="pace-hist-x" onClick={() => void state.remove(sn.id)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* Who is against a line, under its chart. A chart with nobody's name on it is
 * a number; with a name on it, it is somebody's number — which is the whole
 * point of putting owners and sponsors on the project in the first place. */
function LinePeople({ line, projectId }: { line: PaceLineRow; projectId: string }) {
  return (
    <div className="pace-line-people">
      {line.owner && <span className="pace-who"><span className="pace-who-role">Owner</span> {line.owner}</span>}
      {line.sponsor && <span className="pace-who"><span className="pace-who-role">Sponsor</span> {line.sponsor}</span>}
      <button className="pace-who-go" onClick={() => nav(`/project/${projectId}/line/${line.id}`)}>
        Its pack ›
      </button>
    </div>
  );
}

/* One line, as the project sees it: whose it is, how it is doing, and how much
 * is sitting in its pack. The whole card is the way in — the owner's pack is
 * where the work actually happens, so getting there should not need aiming at
 * a small link. */
function LineCard({ line, pack, projectId }: { line: PaceLineRow; pack: LinePack; projectId: string }) {
  const seen = line.weekly.filter((v): v is number => v != null);
  const last = seen.length ? seen[seen.length - 1] : null;
  const delta = last == null ? null : last - line.q1;
  const open = pack.openTodos + pack.waitingTodos;

  return (
    <article className="lc">
      <button className="lc-open" onClick={() => nav(`/project/${projectId}/line/${line.id}`)}>
        <header className="lc-head">
          <span className="lc-key">{line.key}</span>
          <span className="lc-name">{line.name}</span>
          <span className={'lc-ppm' + (delta == null ? '' : delta >= 0 ? ' is-good' : ' is-bad')}>
            {last == null ? '—' : last}
            <span className="lc-ppm-u">ppm</span>
          </span>
        </header>
        <p className="lc-people">
          {line.owner
            ? <><span className="lc-role">Owner</span> {line.owner}</>
            : <span className="sub">No owner yet</span>}
          {line.sponsor && <> <span className="lc-role">Sponsor</span> {line.sponsor}</>}
        </p>
        <p className="lc-target">
          {delta == null
            ? <>Q1 target {line.q1} ppm · nothing measured yet</>
            : <>{delta >= 0 ? '+' : ''}{delta} against the Q1 target of {line.q1} ppm</>}
        </p>
        <div className="lc-pips">
          <span className="lc-pip">{open}<span className="lc-pip-l">next steps open</span></span>
          <span className="lc-pip">{pack.doneTodos}<span className="lc-pip-l">finished</span></span>
          <span className={'lc-pip' + (pack.openSnags > 0 ? ' is-warn' : '')}>{pack.openSnags}<span className="lc-pip-l">open snags</span></span>
          <span className="lc-pip is-good">{pack.wins}<span className="lc-pip-l">wins</span></span>
        </div>
      </button>
      <footer className="lc-foot">
        <span className="sub">{line.workspaceId ? 'Has its own workspace' : 'Workspace made on first walk'}</span>
        <button className="btn btn-ghost" onClick={() => nav(`/pace-report?project=${projectId}&line=${line.id}`)}>Its deck</button>
      </footer>
    </article>
  );
}

type Lens = 'overview' | 'lines' | 'meeting' | 'next' | 'wins' | 'snags' | 'data';
const LENSES: { id: Lens; label: string; sub: string }[] = [
  { id: 'overview', label: 'Overview',   sub: 'the picture' },
  { id: 'lines',    label: 'Lines',      sub: 'each owner\u2019s pack' },
  { id: 'meeting',  label: 'Meeting',    sub: 'by owner' },
  { id: 'next',     label: 'Next steps', sub: 'to do & waiting' },
  { id: 'wins',     label: 'Success',    sub: 'what worked' },
  { id: 'snags',    label: 'Evidence',   sub: 'the line, filmed' },
  { id: 'data',     label: 'Data',       sub: 'upload & ppm' },
];

export function ProjectDashboardScreen({ projectId }: { projectId: string }) {
  const route = useRoute();
  const raw = route.query.get('view');
  const lens: Lens = raw === 'meeting' || raw === 'data' || raw === 'snags' || raw === 'next'
    || raw === 'wins' || raw === 'lines' ? raw : 'overview';

  const { loading: projLoading, project } = useProject(projectId);
  const pace = usePaceSnapshots(projectId);
  const ppm = usePaceLines(projectId);
  const { actions } = pace;
  // Every line's own pack, counted. This is the roll-up: each number below was
  // typed by a line owner into their own pack, not entered again here.
  const packs = useAllLinePacks(projectId, ppm.lines);

  const done = actions.filter(a => /^done$/i.test(a.status.trim())).length;
  const overdue = actions.filter(a => /overdue/i.test(a.flag ?? '')).length;
  const live = actions.length - done;
  // "at target" = the most recent week actually measured on that line
  const atTarget = ppm.lines.filter(l => {
    const seen = l.weekly.filter((v): v is number => v != null);
    return seen.length > 0 && seen[seen.length - 1] >= l.q1;
  }).length;

  if (pace.loading || ppm.loading || projLoading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  // A link to a project that has since been deleted is a dead end, not a crash.
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  // "Line 2A · 2B · 7 · 10" — read off the project's own lines rather than
  // written into the page, so adding a line changes what the page says it covers.
  const lineList = ppm.lines.map(l => l.key).join(' · ');

  return (
    <div className={'wrap pace is-' + lens}>
      <Crumbs trail={[{ label: 'Projects', to: '/projects' }, { label: project.name }]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">
            Improvement initiative
            {project.lead && <> · led by <b>{project.lead}</b></>}
          </p>
          <h1 className="pace-title">{project.name}</h1>
          <p className="pace-lede">
            {ppm.lines.length > 0 && <>{lineList} — </>}
            packs per minute against quarterly targets, every action in flight, and the snag walk of the line.
          </p>
        </div>
        <div className="pace-head-actions">
          {/* the way out reads as a way out — same '‹' the rest of the app uses */}
          {/* Offered only where the project asked for it — see Project.leverTree. */}
          {project.leverTree && (
            <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/tree`)}>Lever tree</button>
          )}
          <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/setup`)}>Lines &amp; people</button>
          <button className="btn btn-ghost" onClick={() => nav(`/pace-report?project=${projectId}`)}>GM report</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print A3</button>
          <AccountMenu />
        </div>
      </header>

      {/* the lens picker — always visible, so no view is ever buried */}
      <nav className="pace-lenses" aria-label="View">
        {LENSES.map(l => (
          <button
            key={l.id}
            className={'pace-lens' + (lens === l.id ? ' on' : '')}
            aria-current={lens === l.id ? 'page' : undefined}
            onClick={() => nav(l.id === 'overview' ? `/project/${projectId}` : `/project/${projectId}?view=${l.id}`)}
          >
            <span className="pace-lens-l">{l.label}</span>
            <span className="pace-lens-s">{l.sub}</span>
          </button>
        ))}
        {/* THE BOARD SITS IN THE ROW WITH EVERY OTHER VIEW, ALWAYS.
            It used to appear only once the uploaded workbook already carried a
            3P column — which hid the one screen that says what a 3P column is
            and how to add one behind having already added it. The board is
            reached from here whatever the workbook holds; if the column is not
            there yet the board says so, in words, with the upload one tap
            away. A view nobody can find is a view that does not exist. */}
        <button className="pace-lens" onClick={() => nav(`/project/${projectId}/board`)}>
          <span className="pace-lens-l">3P Board</span>
          <span className="pace-lens-s">people · plant · process</span>
        </button>
      </nav>

      {lens === 'overview' && (
        <>
          <div className="pace-kpis">
            <Kpi n={`${atTarget}/${ppm.lines.length}`} label="lines at target" sub="latest week vs Q1"
              tone={atTarget === ppm.lines.length ? 'good' : atTarget === 0 ? 'bad' : 'warn'} />
            <Kpi n={String(done)} label="actions closed" sub={`of ${actions.length}`} tone="good" />
            <Kpi n={String(live)} label="still live" sub="open or in progress" />
            <Kpi n={String(overdue)} label="overdue" sub="past their due date" tone={overdue > 0 ? 'bad' : 'good'} />
          </div>

              <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">Line pace</h2>
              <p className="pace-sec-sub">Weekly packs per minute against the Q1 target · {ppm.weeks} week{ppm.weeks === 1 ? '' : 's'} from w/c 27 Jul 2026</p>
            </div>
            {ppm.lines.length === 0 ? (
              <div className="pace-empty">
                <p className="sub">No lines on this project yet.</p>
                <button className="btn btn-primary" style={{ marginTop: 10 }}
                  onClick={() => nav(`/project/${projectId}/setup`)}>Add the first line</button>
              </div>
            ) : (
              <div className="pace-charts">
                {ppm.lines.map(l => (
                  <div key={l.key} className="pace-chart-cell">
                    <PaceLineChart line={l} />
                    <LinePeople line={l} projectId={projectId} />
                  </div>
                ))}
              </div>
            )}
          </section>

        </>
      )}

      {lens === 'lines' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Lines</h2>
            <p className="pace-sec-sub">
              Each line has an owner and a pack of its own — its pace, its actions, its next steps, its wins and its
              filmed walk. Open one to work in it; everything in it rolls up into the report above.
            </p>
          </div>
          {ppm.lines.length === 0 ? (
            <div className="pace-empty">
              <p className="sub">No lines on this project yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 10 }}
                onClick={() => nav(`/project/${projectId}/setup`)}>Add the first line</button>
            </div>
          ) : (
            <>
              <div className="lc-grid">
                {ppm.lines.map(l => (
                  <LineCard key={l.id} line={l} pack={packs.get(l.id) ?? emptyPack} projectId={projectId} />
                ))}
              </div>
              <div className="pace-lines-foot">
                <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/setup`)}>
                  Add or change lines
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {lens === 'meeting' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Round the table</h2>
            <p className="pace-sec-sub">Pick a name and work through their open actions · roster from the workbook's Lists sheet</p>
          </div>
          <PaceMeeting actions={actions} roster={pace.roster} />
        </section>
      )}

      {lens === 'next' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Next steps</h2>
            <p className="pace-sec-sub">What still needs doing, what we are waiting on, and trials — with the write-up and the evidence · not in the workbook, typed here</p>
          </div>
          <PaceNextSteps projectId={projectId} />
        </section>
      )}

      {lens === 'wins' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Success</h2>
            <p className="pace-sec-sub">What we did and what worked · the wins to show the team · not in the workbook, logged here</p>
          </div>
          <PaceSuccess projectId={projectId} />
        </section>
      )}

      {lens === 'snags' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Evidence</h2>
            <p className="pace-sec-sub">Film the line, mark the frames, pin what you see · play it back in the meeting</p>
          </div>
          {/* every line's walk as well as the project's own, so a snag filmed
              inside a line's pack is not invisible from here */}
          <PaceSnags projectId={projectId} projectName={project.name}
            alsoFrom={ppm.lines.filter(l => l.workspaceId).map(l => ({ wsId: l.workspaceId!, label: l.name }))} />
        </section>
      )}

      {lens === 'data' && (
        <>
          <UploadPanel state={pace} />
          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">Packs per minute</h2>
              <p className="pace-sec-sub">The one thing not in the workbook — type it here · saves as you go</p>
            </div>
            <PpmEditor state={ppm} startOpen />
          </section>
        </>
      )}

      <footer className="pace-foot">
        <p>
          {project.name}
          {lineList && <> · {lineList}</>}
          {project.lead && <> · led by {project.lead}</>}
          {' '}· actions from the team’s tracker · the line walk filmed in the app
        </p>
      </footer>
    </div>
  );
}
