/* PROJECT PACE — the A3.
 *
 * One page that answers the four questions a weekly stand-up actually asks:
 * are we at pace, where is the time going, who owes what, and what did we see
 * on the floor. Everything here is the team's own data; nothing is entered on
 * this screen, so there is no empty state to design around.
 *
 * The Pareto is single-hue bars, not a stacked split: its job is ranking
 * magnitude, and the per-line numbers read better as figures than as three
 * colours competing inside one bar. */
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { PaceLineChart } from '../charts/PaceLineChart';
import {
  PACE_LINES, PACE_PARETO, PACE_ACTIONS, PACE_OBSERVATIONS,
  PACE_PERIOD, PACE_TOTAL_MINS, PACE_TOTAL_STOPS,
} from '../lib/projectPaceData';
import type { PaceAction } from '../lib/projectPaceData';

/* Status colours are reserved and always ride with their label — never colour
 * alone. Validated as a set: worst adjacent pair dE 17.3 normal / 14.9 CVD. */
const FLAG_STYLE: Record<string, { bg: string; fg: string; mark: string }> = {
  'OVERDUE':   { bg: '#fbeae8', fg: '#a51f2d', mark: '●' },
  'Due soon':  { bg: '#fdf0e0', fg: '#c26a0a', mark: '◐' },
  'On track':  { bg: '#e7f1fb', fg: '#196bb3', mark: '○' },
  'Done':      { bg: '#e6f4ec', fg: '#1f8a4c', mark: '✓' },
};

function FlagChip({ flag }: { flag: string }) {
  const s = FLAG_STYLE[flag] ?? { bg: 'var(--surface-2)', fg: 'var(--ink-2)', mark: '·' };
  return (
    <span className="pace-flag" style={{ background: s.bg, color: s.fg }}>
      <span aria-hidden>{s.mark}</span>{flag || '—'}
    </span>
  );
}

function Kpi({ n, label, sub, tone }: { n: string; label: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className={'pace-kpi' + (tone ? ' is-' + tone : '')}>
      <span className="pace-kpi-n">{n}</span>
      <span className="pace-kpi-l">{label}</span>
      {sub && <span className="pace-kpi-s">{sub}</span>}
    </div>
  );
}

/* ---------- Pareto: ranking by magnitude, single hue ---------- */
function ParetoPanel() {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? PACE_PARETO : PACE_PARETO.slice(0, 10);
  const max = PACE_PARETO[0]?.mins ?? 1;

  // where the running total crosses 80% — the line that separates the vital few
  const cutIdx = useMemo(() => {
    let run = 0;
    for (let i = 0; i < PACE_PARETO.length; i++) {
      run += PACE_PARETO[i].mins;
      if (run / PACE_TOTAL_MINS >= 0.8) return i;
    }
    return PACE_PARETO.length - 1;
  }, []);

  let running = 0;
  return (
    <section className="pace-sec">
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">Where the time is going</h2>
        <p className="pace-sec-sub">{PACE_TOTAL_MINS.toLocaleString()} minutes lost across {PACE_TOTAL_STOPS} stops · {PACE_PERIOD}</p>
      </div>
      <div className="pace-pareto">
        {rows.map((r, i) => {
          running += r.mins;
          const cum = running / PACE_TOTAL_MINS;
          const isCut = i === cutIdx;
          return (
            <div key={r.category} className={'pace-bar-row' + (isCut ? ' is-cut' : '')}>
              <div className="pace-bar-lbl">
                <span className="pace-bar-name">{r.category}</span>
                <span className="pace-bar-meta">
                  {r.events} stop{r.events === 1 ? '' : 's'} · {r.minPerEvent} min each
                  <span className={'pace-profile pace-profile-' + r.profile.toLowerCase().replace(/[^a-z]/g, '')}>{r.profile}</span>
                </span>
              </div>
              <div className="pace-bar-track">
                <div className="pace-bar-fill" style={{ width: `${(r.mins / max) * 100}%` }} />
              </div>
              <div className="pace-bar-nums">
                <span className="pace-bar-mins">{Math.round(r.mins)}<i>min</i></span>
                <span className="pace-bar-cum">{Math.round(cum * 100)}% cum</span>
              </div>
              <div className="pace-bar-split">
                {r.l2 > 0 && <span>L2 <b>{Math.round(r.l2)}</b></span>}
                {r.l7 > 0 && <span>L7 <b>{Math.round(r.l7)}</b></span>}
                {r.l10 > 0 && <span>L10 <b>{Math.round(r.l10)}</b></span>}
              </div>
            </div>
          );
        })}
      </div>
      <button className="pace-more" onClick={() => setShowAll(s => !s)}>
        {showAll ? 'Show top 10 only' : `Show all ${PACE_PARETO.length} categories ›`}
      </button>
    </section>
  );
}

/* ---------- the tracker ---------- */
function ActionsPanel() {
  const [line, setLine] = useState('All');
  const [flag, setFlag] = useState('All');

  const lines = useMemo(() => ['All', ...Array.from(new Set(PACE_ACTIONS.map(a => a.line)))], []);
  const flags = ['All', 'OVERDUE', 'Due soon', 'On track', 'Done'];

  const shown = PACE_ACTIONS.filter(a =>
    (line === 'All' || a.line === line) && (flag === 'All' || a.flag === flag));

  // The source workbook reuses a couple of Ref numbers across distinct rows
  // (T-010, T-011), so the ref alone is not a key.
  const rank = (a: PaceAction) =>
    (a.flag === 'OVERDUE' ? 0 : a.flag === 'Due soon' ? 1 : a.flag === 'On track' ? 2 : 3) * 10 + (a.priority || 3);
  const sorted = shown.map((a, i) => ({ a, k: `${a.ref}#${i}` })).sort((x, y) => rank(x.a) - rank(y.a));

  return (
    <section className="pace-sec">
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">Action tracker</h2>
        <p className="pace-sec-sub">{PACE_ACTIONS.length} actions · overdue first, then by priority</p>
      </div>

      {/* filters in one row above the content */}
      <div className="pace-filters">
        <div className="pace-filter-grp">
          {lines.map(l => (
            <button key={l} className={'pace-fbtn' + (line === l ? ' on' : '')} onClick={() => setLine(l)}>{l}</button>
          ))}
        </div>
        <div className="pace-filter-grp">
          {flags.map(f => (
            <button key={f} className={'pace-fbtn' + (flag === f ? ' on' : '')} onClick={() => setFlag(f)}>{f}</button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="pace-none">No actions match that filter.</p>
      ) : (
        <div className="pace-actions">
          {sorted.map(({ a, k }) => (
            <article key={k} className="pace-action">
              <header className="pace-action-top">
                <span className="pace-ref">{a.ref}</span>
                <span className="pace-pri" title={`Priority ${a.priority}`}>P{a.priority}</span>
                <span className="pace-line-tag">{a.line}</span>
                <span className="pace-cat-tag">{a.category}</span>
                <FlagChip flag={a.flag} />
              </header>
              {a.problem && <p className="pace-problem">{a.problem}</p>}
              {a.action && <p className="pace-do"><b>Action</b> {a.action}</p>}
              <footer className="pace-action-foot">
                {a.owner && <span className="pace-owner">{a.owner}</span>}
                {a.who && <span className="pace-who">{a.who}</span>}
                {a.due && <span className="pace-due">due {a.due}</span>}
                <span className="pace-status">{a.status}</span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- gemba: what people actually saw ---------- */
function ObservationsPanel() {
  const lenses = ['People', 'Plant', 'Process', 'Material'];
  return (
    <section className="pace-sec">
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">On the floor</h2>
        <p className="pace-sec-sub">{PACE_OBSERVATIONS.length} observations from the walk · grouped People / Plant / Process / Material</p>
      </div>
      <div className="pace-4m">
        {lenses.map(l => {
          const items = PACE_OBSERVATIONS.filter(o => o.lens === l);
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
      </div>
    </section>
  );
}

export function ProjectDashboardScreen({ projectId: _projectId }: { projectId: string }) {
  const done = PACE_ACTIONS.filter(a => a.status === 'Done').length;
  const overdue = PACE_ACTIONS.filter(a => a.flag === 'OVERDUE').length;
  const live = PACE_ACTIONS.length - done;

  return (
    <div className="wrap pace">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">Improvement initiative</p>
          <h1 className="pace-title">Project Pace</h1>
          <p className="pace-lede">Line 2A · 2B · 7 · 10 — packs per minute against quarterly targets, the loss Pareto behind them, and every action in flight.</p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>Print A3</button>
          <button className="btn btn-ghost" onClick={() => nav('/')}>Home</button>
        </div>
      </header>

      <div className="pace-kpis">
        <Kpi n={PACE_TOTAL_MINS.toLocaleString()} label="minutes lost" sub={PACE_PERIOD} />
        <Kpi n={String(PACE_TOTAL_STOPS)} label="stops recorded" sub="three measured lines" />
        <Kpi n={String(done)} label="actions closed" sub={`of ${PACE_ACTIONS.length}`} tone="good" />
        <Kpi n={String(live)} label="still live" sub="open or in progress" />
        <Kpi n={String(overdue)} label="overdue" sub="past their due date" tone={overdue > 0 ? 'bad' : 'good'} />
      </div>

      <section className="pace-sec">
        <div className="pace-sec-head">
          <h2 className="pace-sec-title">Line pace</h2>
          <p className="pace-sec-sub">Weekly packs per minute against the Q1 target · six weeks from w/c 3 Aug 2026</p>
        </div>
        <div className="pace-charts">
          {PACE_LINES.map(l => <PaceLineChart key={l.key} line={l} />)}
        </div>
      </section>

      <ParetoPanel />
      <ActionsPanel />
      <ObservationsPanel />

      <footer className="pace-foot">
        <p>Project Pace · data from the team's action tracker · Pareto snapshot {PACE_PERIOD}</p>
      </footer>
    </div>
  );
}
