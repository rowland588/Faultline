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
import { PaceLineChart } from '../charts/PaceLineChart';
import { usePaceLines } from '../lib/usePaceLines';
import { PpmEditor } from './PpmEditor';
import type { PaceObservation } from '../lib/projectPaceData';
import { usePaceSnapshots, type PaceState } from '../lib/usePaceSnapshots';
import type { ActionChange, PaceDiff } from '../lib/paceDiff';

function Kpi({ n, label, sub, tone }: { n: string; label: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className={'pace-kpi' + (tone ? ' is-' + tone : '')}>
      <span className="pace-kpi-n">{n}</span>
      <span className="pace-kpi-l">{label}</span>
      {sub && <span className="pace-kpi-s">{sub}</span>}
    </div>
  );
}

/* ---------- gemba: what people actually saw ---------- */
function ObservationsPanel({ observations }: { observations: PaceObservation[] }) {
  const lenses = ['People', 'Plant', 'Process', 'Material'];
  // Notes from a walk, not the agenda — folded away unless asked for.
  const [open, setOpen] = useState(false);
  return (
    <section className="pace-sec">
      <button className="pace-fold" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="pace-fold-ic" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="pace-sec-title">On the floor</span>
        <span className="pace-fold-sub">{observations.length} notes from the walk</span>
      </button>
      {!open ? null : <div className="pace-4m">
        {lenses.map(l => {
          const items = observations.filter(o => o.lens === l);
          return (
            <div key={l} className="pace-4m-col">
              <h4 className="pace-4m-head">{l} <span>{items.length}</span></h4>
              {items.length === 0 ? <p className="pace-4m-none">Nothing logged.</p> : items.map((o, i) => (
                <div key={i} className="pace-4m-item">
                  <p>{o.text}</p>
                  <span className="pace-4m-who">{o.observer}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>}
    </section>
  );
}

/* ---------- what moved since last week ---------- */
const CHANGE_META: Record<ActionChange['kind'], { label: string; tone: string }> = {
  closed:   { label: 'Closed',        tone: 'good' },
  added:    { label: 'New action',    tone: 'info' },
  reopened: { label: 'Re-opened',     tone: 'bad'  },
  flag:     { label: 'Flag changed',  tone: 'warn' },
  status:   { label: 'Status moved',  tone: 'info' },
  due:      { label: 'Due date moved',tone: 'warn' },
  owner:    { label: 'Owner changed', tone: 'info' },
  text:     { label: 'Action reworded', tone: 'muted' },
  removed:  { label: 'Removed',       tone: 'bad'  },
};

const when = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function Movement({ n, label }: { n: number; label: string }) {
  const sign = n > 0 ? '+' : '';
  return (
    <span className="pace-move">
      <b className={n === 0 ? '' : n > 0 ? 'up' : 'down'}>{sign}{n}</b> {label}
    </span>
  );
}

function ChangesPanel({ diff }: { diff: PaceDiff }) {
  const [open, setOpen] = useState(true);
  const t = diff.totals;
  const closed = diff.changes.filter(c => c.kind === 'closed').length;
  const added = diff.changes.filter(c => c.kind === 'added').length;

  if (!diff.changes.length && !diff.obsAdded.length) {
    return (
      <section className="pace-sec pace-changes">
        <div className="pace-sec-head">
          <h2 className="pace-sec-title">What changed</h2>
          <p className="pace-sec-sub">Compared with {when(diff.from.at)} — nothing moved between these two uploads.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pace-sec pace-changes">
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">What changed</h2>
        <p className="pace-sec-sub">
          {when(diff.from.at)} → {when(diff.to.at)} · {diff.changes.length} change{diff.changes.length === 1 ? '' : 's'}
          {diff.obsAdded.length > 0 && ` · ${diff.obsAdded.length} new observation${diff.obsAdded.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="pace-move-row">
        <Movement n={closed} label="closed this week" />
        <Movement n={added} label="new actions" />
        <Movement n={t.doneNow - t.doneThen} label="net done" />
        <Movement n={t.overdueNow - t.overdueThen} label="overdue" />
        <Movement n={t.actionsNow - t.actionsThen} label="tracker size" />
      </div>

      <button className="pace-more" onClick={() => setOpen(o => !o)}>
        {open ? 'Hide the detail' : `Show all ${diff.changes.length} changes ›`}
      </button>

      {open && (
        <div className="pace-change-list">
          {diff.changes.map(c => {
            const m = CHANGE_META[c.kind];
            return (
              <div key={c.key + c.kind + (c.field ?? '')} className={'pace-change is-' + m.tone}>
                <div className="pace-change-top">
                  <span className="pace-change-kind">{m.label}</span>
                  <span className="pace-ref">{c.action.ref}</span>
                  <span className="pace-line-tag">{c.action.line}</span>
                  {c.action.owner && <span className="pace-change-owner">{c.action.owner}</span>}
                </div>
                {c.action.problem && <p className="pace-change-what">{c.action.problem}</p>}
                {c.field && (
                  <p className="pace-change-delta">
                    <span className="pace-change-field">{c.field}</span>
                    <span className="pace-was">{c.from}</span>
                    <span className="pace-arrow" aria-label="changed to">→</span>
                    <span className="pace-now">{c.to}</span>
                  </p>
                )}
              </div>
            );
          })}
          {diff.obsAdded.map((o, i) => (
            <div key={'obs' + i} className="pace-change is-info">
              <div className="pace-change-top">
                <span className="pace-change-kind">New observation</span>
                <span className="pace-cat-tag">{o.lens}</span>
                <span className="pace-change-owner">{o.observer}</span>
              </div>
              <p className="pace-change-what">{o.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- weekly upload ---------- */
function UploadPanel({ state }: { state: PaceState }) {
  const input = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <section className="pace-upload">
      <div className="pace-upload-main">
        <div>
          <h3 className="pace-upload-title">Weekly update</h3>
          <p className="pace-upload-sub">
            Showing <b>{state.snapshots[0].fileName}</b> · {when(state.snapshots[0].takenAt)}
            {state.snapshots.length > 1 && ` · ${state.snapshots.length - 1} earlier upload${state.snapshots.length === 2 ? '' : 's'}`}
          </p>
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

type Lens = 'overview' | 'meeting' | 'data';
const LENSES: { id: Lens; label: string; sub: string }[] = [
  { id: 'overview', label: 'Overview', sub: 'the picture' },
  { id: 'meeting',  label: 'Meeting',  sub: 'by owner' },
  { id: 'data',     label: 'Data',     sub: 'upload & ppm' },
];

export function ProjectDashboardScreen({ projectId: _projectId }: { projectId: string }) {
  const route = useRoute();
  const raw = route.query.get('view');
  const lens: Lens = raw === 'meeting' || raw === 'data' ? raw : 'overview';

  const pace = usePaceSnapshots();
  const ppm = usePaceLines();
  const { actions, observations } = pace;

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
          <p className="pace-lede">Line 2A · 2B · 7 · 10 — packs per minute against quarterly targets, every action in flight, and what the walk found on the floor.</p>
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

          {pace.diff && <ChangesPanel diff={pace.diff} />}

          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">Line pace</h2>
              <p className="pace-sec-sub">Weekly packs per minute against the Q1 target · {ppm.weeks} week{ppm.weeks === 1 ? '' : 's'} from w/c 3 Aug 2026</p>
            </div>
            <div className="pace-charts">
              {ppm.lines.map(l => <PaceLineChart key={l.key} line={l} />)}
            </div>
          </section>

          <ObservationsPanel observations={observations} />
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

      {lens === 'data' && (
        <>
          <UploadPanel state={pace} />
          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">Packs per minute</h2>
              <p className="pace-sec-sub">Type the weekly readings · saves as you go</p>
            </div>
            <PpmEditor state={ppm} startOpen />
          </section>
        </>
      )}

      <footer className="pace-foot">
        <p>Project Pace · Line 2A · 2B · 7 · 10 · actions and observations from the team’s tracker</p>
      </footer>
    </div>
  );
}
