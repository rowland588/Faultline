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
import { PaceLineChart } from '../charts/PaceLineChart';
import { usePaceLines } from '../lib/usePaceLines';
import { PpmEditor } from './PpmEditor';
import { usePaceSnapshots, type PaceState } from '../lib/usePaceSnapshots';

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
            This page is showing <b>{state.snapshots[0].fileName}</b> · read {when(state.snapshots[0].takenAt)}
            {state.snapshots.length > 1 && ` · ${state.snapshots.length - 1} earlier upload${state.snapshots.length === 2 ? '' : 's'}`}
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

type Lens = 'overview' | 'meeting' | 'next' | 'snags' | 'data';
const LENSES: { id: Lens; label: string; sub: string }[] = [
  { id: 'overview', label: 'Overview',   sub: 'the picture' },
  { id: 'meeting',  label: 'Meeting',    sub: 'by owner' },
  { id: 'next',     label: 'Next steps', sub: 'to do & waiting' },
  { id: 'snags',    label: 'Snag list',  sub: 'the line, filmed' },
  { id: 'data',     label: 'Data',       sub: 'upload & ppm' },
];

export function ProjectDashboardScreen({ projectId: _projectId }: { projectId: string }) {
  const route = useRoute();
  const raw = route.query.get('view');
  const lens: Lens = raw === 'meeting' || raw === 'data' || raw === 'snags' || raw === 'next' ? raw : 'overview';

  const pace = usePaceSnapshots();
  const ppm = usePaceLines();
  const { actions } = pace;

  const done = actions.filter(a => /^done$/i.test(a.status.trim())).length;
  const overdue = actions.filter(a => /overdue/i.test(a.flag ?? '')).length;
  const live = actions.length - done;
  // "at target" = the most recent week actually measured on that line
  const atTarget = ppm.lines.filter(l => {
    const seen = l.weekly.filter((v): v is number => v != null);
    return seen.length > 0 && seen[seen.length - 1] >= l.q1;
  }).length;

  if (pace.loading || ppm.loading) return <div className="wrap pace"><p className="sub">Loading Project Pace…</p></div>;

  return (
    <div className={'wrap pace is-' + lens}>
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">Improvement initiative</p>
          <h1 className="pace-title">Project Pace</h1>
          <p className="pace-lede">Line 2A · 2B · 7 · 10 — packs per minute against quarterly targets, every action in flight, and the snag walk of the line.</p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>Print A3</button>
          <button className="btn btn-ghost" onClick={() => nav('/')}>Home</button>
        </div>
      </header>

      {/* the lens picker — always visible, so no view is ever buried */}
      <nav className="pace-lenses" aria-label="View">
        {LENSES.map(l => (
          <button
            key={l.id}
            className={'pace-lens' + (lens === l.id ? ' on' : '')}
            aria-current={lens === l.id ? 'page' : undefined}
            onClick={() => nav(l.id === 'overview' ? '/projects' : `/projects?view=${l.id}`)}
          >
            <span className="pace-lens-l">{l.label}</span>
            <span className="pace-lens-s">{l.sub}</span>
          </button>
        ))}
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
              <p className="pace-sec-sub">Weekly packs per minute against the Q1 target · {ppm.weeks} week{ppm.weeks === 1 ? '' : 's'} from w/c 3 Aug 2026</p>
            </div>
            <div className="pace-charts">
              {ppm.lines.map(l => <PaceLineChart key={l.key} line={l} />)}
            </div>
          </section>

        </>
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
            <p className="pace-sec-sub">What still needs doing, and what we are waiting on · not in the workbook, typed here</p>
          </div>
          <PaceNextSteps />
        </section>
      )}

      {lens === 'snags' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Snag list</h2>
            <p className="pace-sec-sub">Film the line, mark the frames, pin what is wrong · play it back in the meeting</p>
          </div>
          <PaceSnags />
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
        <p>Project Pace · Line 2A · 2B · 7 · 10 · actions from the team’s tracker · the line walk filmed in the app</p>
      </footer>
    </div>
  );
}
