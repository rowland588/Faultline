/* THE PARETO — where the time is going, and whether it moved.
 *
 * An optional surface, ticked on per project under Lines & people, because a
 * Pareto is not every project's tool. When it is on, it reads the Pareto sheet
 * of the weekly upload exactly as the board reads the Tracker sheet: derived,
 * never stored, so next week's file simply appears.
 *
 * TWO JOBS ON ONE PAGE, AND THE SECOND IS THE POINT. At the start of a project
 * the ranking says where to aim. Run again during it, the same ranking is
 * EVIDENCE — did the category we went after actually get smaller? So every row
 * carries its movement against the last comparable upload, and the page refuses
 * to imply movement when there is none to claim.
 */
import { useMemo } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { Sweep } from '../ui/Sweep';
import { useProject } from '../lib/useProjects';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';
import { paretoView, moveSentence, type ParetoMove } from '../lib/paretoView';
import { fmtRelative } from '../lib/format';
import type { PaceParetoSheet } from '../lib/paceWorkbook';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const mins = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 10) / 10));

function Row({ m, max, showMove }: { m: ParetoMove; max: number; showMove: boolean }) {
  const w = max > 0 ? (m.mins / max) * 100 : 0;
  return (
    <tr className={(m.vital ? 'is-vital' : '') + (m.verdict ? ' has-move is-' + m.verdict : '')}>
      <th scope="row">
        <span className="pr-cat">{m.category}</span>
        {m.profile && <span className="pr-prof">{m.profile}</span>}
      </th>
      <td className="pr-bar-cell">
        {/* The bar is the ranking. Everything else on the row is detail. */}
        <span className="pr-bar" style={{ width: `${w}%` }} aria-hidden />
        <span className="pr-mins">{mins(m.mins)}</span>
      </td>
      <td className="pr-n">{pct(m.share)}</td>
      <td className="pr-n pr-cum">{pct(m.cum)}</td>
      <td className="pr-n">{m.events}</td>
      <td className="pr-n">{Math.round(m.minPerEvent * 10) / 10}</td>
      {showMove && (
        <td className={'pr-move is-' + (m.verdict ?? 'flat')}>
          {m.verdict ? moveSentence(m) : '—'}
        </td>
      )}
    </tr>
  );
}

export function ParetoScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const pace = usePaceSnapshots(projectId);

  /* The newest upload that CARRIES a Pareto, and the newest one before it that
     does too. Not simply the last two uploads: most weeks the tracker changes
     and the loss analysis does not, so the comparison has to skip past the
     uploads that brought no Pareto with them rather than report "nothing to
     compare" the moment one week's file lacks the sheet. */
  const withPareto = useMemo(
    () => pace.snapshots.filter(s => !!s.pareto) as (typeof pace.snapshots[number] & { pareto: PaceParetoSheet })[],
    [pace.snapshots],
  );
  const now = withPareto[0];
  const before = withPareto[1];
  const view = useMemo(
    () => (now ? paretoView(now.pareto, before?.pareto) : null),
    [now, before],
  );

  if (loading || pace.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  return (
    <div className="wrap pace pr-screen">
      <Sweep id={'pareto:' + projectId} />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Pareto' },
      ]} />

      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Pareto</h1>
          <p className="pace-lede">
            Where the time is actually going, ranked. Run at the start it says where to aim; run again
            during the work it is <b>evidence</b> — whether the category you went after got smaller.
            Read straight off the Pareto sheet of the weekly upload, never typed.
          </p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}?view=data`)}>Upload</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
          <AccountMenu />
        </div>
      </header>

      {!view ? (
        <div className="bd-empty">
          <p className="bd-empty-t">No <b>Pareto</b> sheet in the workbook yet</p>
          <p className="sub">
            {pace.snapshots.length === 0
              ? <>Nothing has been uploaded to this project yet.</>
              : <>The tracker the app has read carries no Pareto sheet. Add one — a table headed
                  <b> Category</b>, <b>Mins</b> and <b>Events</b>, with a line above it saying the period it
                  covers — and this page builds itself from it. Everything else in the workbook keeps
                  working exactly as it does now.</>}
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}
            onClick={() => nav(`/project/${projectId}?view=data`)}>Upload the workbook</button>
        </div>
      ) : (
        <>
          <p className="bs-src pr-src">
            From <b>{now.fileName}</b> · read {fmtRelative(now.takenAt)}
            {view.period && <> · covering <b>{view.period}</b></>}
            {' '}· {mins(view.totalMins)} minutes across {view.totalStops} stops
          </p>

          {/* THE FINDING, NOT THE TABLE. Somebody who reads one line should
              leave knowing where to aim. */}
          <div className="pr-vital">
            <p className="pr-vital-t">
              <b>{view.vitalCount}</b> of {view.rows.filter(r => r.verdict !== 'gone').length} categories
              carry <b>{pct(view.vitalShare)}</b> of the lost time
            </p>
            {view.headline && <p className="pr-vital-s">{view.headline}</p>}
          </div>

          {/* Whether this page is allowed to talk about movement at all. */}
          <p className={'pr-cmp' + (view.comparable ? ' is-on' : '')}>
            {view.comparable
              ? <>Measured against <b>{view.beforePeriod}</b> — the last Pareto uploaded before this one.
                  The right-hand column is the change.</>
              : view.whyNot}
          </p>

          <div className="pr-tablewrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Minutes lost</th>
                  <th scope="col">Share</th>
                  <th scope="col">Cum.</th>
                  <th scope="col">Stops</th>
                  <th scope="col">Min/stop</th>
                  {view.comparable && <th scope="col">Since {view.beforePeriod}</th>}
                </tr>
              </thead>
              <tbody>
                {view.rows.map(m => (
                  <Row key={m.category} m={m} max={view.rows[0]?.mins ?? 0} showMove={view.comparable} />
                ))}
              </tbody>
            </table>
          </div>

          <p className="sub pr-foot-note">
            Shaded rows are the vital few — the categories that make up the first 80% of the lost time.
            Minutes, stops and the profile are the workbook’s own; nothing on this page is recalculated.
          </p>
        </>
      )}

      <footer className="pace-foot">
        <p>{project.name} · Pareto · read from the weekly workbook, never stored</p>
      </footer>
    </div>
  );
}
