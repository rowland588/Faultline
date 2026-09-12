/* PEOPLE · PROCESS · PLANT — the project on three columns.
 *
 * Every improvement problem in a factory is one of three things: the people who
 * run the line, the way the work is done, or the machine itself. Three columns
 * is the whole design. It fits on a wall, it fits on a phone, and anybody can
 * read it without being taught what they are looking at.
 *
 * THE WORKBOOK IS THE TRUTH AND THIS IS THE VIEW. Nothing here is stored and
 * nothing here is editable: the cards are derived from the latest upload every
 * time the board is drawn. That is the whole reason the weekly cycle works —
 * next week's file simply appears, a closed action goes green on its own, and
 * nothing anybody did in the app can be quietly overwritten, because there is
 * nothing in the app to overwrite. Status is changed where status lives, which
 * is the spreadsheet the business already runs on.
 *
 * The counterpart of that promise is that the board must never lose a row. Any
 * action the workbook has not placed in a column is counted and named, rather
 * than dropped — a board you cannot trust to be complete is worse than no
 * board at all.
 */
import { useMemo, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { Sweep } from '../ui/Sweep';
import { useProject } from '../lib/useProjects';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';
import { statusOfAction } from '../lib/treeBind';
import { board, cardTitle } from '../lib/pillars';
import { fmtRelative } from '../lib/format';
import type { PaceAction } from '../lib/projectPaceData';
import type { NodeStatus } from '../db';

const STATUS: Record<NodeStatus, string> = {
  n: 'Not started', w: 'In progress', a: 'Overdue', r: 'Blocked', g: 'Done',
};

function Card({ a }: { a: PaceAction }) {
  const st = statusOfAction(a);
  const who = (a.owner || a.who || '').trim();
  return (
    <article className={'bd-card is-' + st}>
      <p className="bd-card-t">{cardTitle(a)}</p>
      <div className="bd-card-f">
        <span className={'bd-chip is-' + st}>{STATUS[st]}</span>
        {who && <span className="bd-who">{who}</span>}
        {a.line && <span className="bd-meta">{a.line}</span>}
        {a.due && <span className="bd-meta">due {a.due}</span>}
      </div>
    </article>
  );
}

export function BoardScreen({ projectId }: { projectId: string }) {
  const route = useRoute();
  const { loading, project } = useProject(projectId);
  const pace = usePaceSnapshots(projectId);
  const [hideDone, setHideDone] = useState(false);

  const source = pace.snapshots[0];
  const baseline = !!source?.fileName?.includes('(baseline)');

  const [area, setArea] = useState('');

  const full = useMemo(() => board(pace.actions), [pace.actions]);

  /* Filtering narrows what is SHOWN, never what is counted as missing — the
   * "not on the board" line has to keep telling the truth about the whole
   * workbook whatever is on screen. */
  const shown = useMemo(() => {
    let rows = pace.actions;
    if (area) rows = rows.filter(a => (a.line ?? '').trim() === area);
    if (hideDone) rows = rows.filter(a => statusOfAction(a) !== 'g');
    return board(rows);
  }, [pace.actions, area, hideDone]);

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
    <div className="wrap pace bd-screen">
      <Sweep id={'board:' + projectId} />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Board' },
      ]} />

      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">People · Process · Plant</h1>
          <p className="pace-lede">
            Every card comes off the weekly workbook — nothing here is typed, and nothing here is
            stored. Change a status in the tracker and it changes here on the next upload.
          </p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}?view=data`)}>Upload</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
          <AccountMenu />
        </div>
      </header>

      {/* WHICH workbook, and how old. The same rule as everywhere else: a count
          without a source is how somebody decides the app is broken. */}
      <p className={'bs-src bd-src' + (baseline ? ' is-base' : '')}>
        {baseline
          ? <><b>Your tracker as at 6 Aug</b> — the snapshot the app shipped with, not this week’s. Upload the current workbook and the board becomes live.</>
          : source
            ? <>From <b>{source.fileName}</b> · read {fmtRelative(source.takenAt)} · {full.total} card{full.total === 1 ? '' : 's'} across {full.areas.length} area{full.areas.length === 1 ? '' : 's'}</>
            : <>No tracker uploaded to this project yet.</>}
      </p>

      {full.areas.length > 1 && (
        <div className="bd-filters">
          <button className={'chip' + (area === '' ? ' on' : '')} onClick={() => setArea('')}>Every area</button>
          {full.areas.map(a => (
            <button key={a.name} className={'chip' + (area === a.name ? ' on' : '')} onClick={() => setArea(a.name)}>
              {a.name} <span className="bs-n">{a.total}</span>
            </button>
          ))}
          <button className={'chip' + (hideDone ? ' on' : '')} onClick={() => setHideDone(v => !v)}>
            {hideDone ? 'Hiding done' : 'Showing done'}
          </button>
        </div>
      )}

      {!full.hasPillarColumn ? (
        /* The column is missing rather than blank — a different job from a
           blank cell, and worth saying separately so nobody goes hunting
           through rows for something that was never there. */
        <div className="bd-empty">
          <p className="bd-empty-t">The workbook hasn’t got a <b>3P</b> column yet</p>
          <p className="sub">
            Add one column to the Tracker sheet, headed <b>3P</b> (or <b>Pillar</b>), and put
            <b> People</b>, <b>Plant</b> or <b>Process</b> against each row. Upload it and this board
            builds itself. Nothing else in the workbook needs to change — every other screen keeps
            reading it exactly as it does now.
          </p>
        </div>
      ) : shown.areas.length === 0 ? (
        <p className="sub">Nothing matches that filter.</p>
      ) : (
        /* One block per area, three columns inside it — the workbook's own 3P
           Board sheet, drawn from the Tracker rows it is itself a view of. */
        shown.areas.map(a => (
          <section key={a.name} className="bd-area">
            <header className="bd-area-h">
              <h2 className="bd-area-t">{a.name}</h2>
              <span className="bd-area-n">{a.total} action{a.total === 1 ? '' : 's'} · {a.done} done</span>
            </header>
            <div className="bd-cols">
              {a.columns.map(c => (
                <section key={c.key} className={'bd-col is-' + c.key}>
                  <header className="bd-col-h">
                    <h3 className="bd-col-t">{c.label}</h3>
                    <span className="bd-col-n">{c.rows.length}</span>
                    <span className="bd-col-s">{c.blurb}</span>
                  </header>
                  <div className="bd-col-b">
                    {c.rows.length === 0
                      ? <p className="sub bd-none">—</p>
                      : c.rows.map((x, i) => <Card key={x.uid || x.ref || i} a={x} />)}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Never lose a row. Same promise the lever tree makes. */}
      {full.unplaced.length > 0 && (
        <div className="lt-gap bd-gap">
          <span className="lt-gap-t">
            <b>{full.unplaced.length}</b> action{full.unplaced.length === 1 ? '' : 's'} {full.unplaced.length === 1 ? 'is' : 'are'} not on the board —
            {full.hasPillarColumn ? ' the 3P cell is blank or says something else.' : ' there is no 3P column yet.'}
          </span>
          <details className="bd-det">
            <summary>Which ones?</summary>
            <ul className="lt-gap-list">
              {full.unplaced.slice(0, 20).map((a, i) => (
                <li key={a.uid || a.ref || i}>
                  <span className="lt-gap-w">{cardTitle(a)}</span>
                  <span className="lt-gap-y">
                    {(a.pillar ?? '').trim()
                      ? `3P says “${a.pillar}” — not People, Plant or Process`
                      : 'no 3P value on the tracker row'}
                  </span>
                </li>
              ))}
              {full.unplaced.length > 20 && <li className="sub">and {full.unplaced.length - 20} more</li>}
            </ul>
          </details>
        </div>
      )}

      <footer className="pace-foot">
        <p>
          {project.name} · People · Process · Plant · derived from the weekly workbook, never stored
          {route.query.get('view') ? '' : ''}
        </p>
      </footer>
    </div>
  );
}
