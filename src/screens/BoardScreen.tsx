/* PEOPLE · PLANT · PROCESS — the project on three columns, kept in the app.
 *
 * Every improvement problem in a factory is one of three things: the people who
 * run the line, the machine itself, or the way the work is done. Three columns
 * is the whole design. It fits on a wall, it fits on a phone, and anybody can
 * read it without being taught what they are looking at.
 *
 * IT USED TO BE READ OFF AN UPLOADED WORKBOOK, and nothing on it could be
 * touched. Rowland: "There will be no Excel that needs to be uploaded ... this
 * is about now fully using the app to be able to do everything that we need to
 * do." So the board is where the actions are written now: add one in the
 * column it belongs to, tap one to change it. Each is a next step of the
 * project (see lib/actions.ts) — one list, read the same by the board, a
 * line's pack, the meeting and the client report.
 *
 * One block per line, then one for work that spans every line. Overdue and
 * waiting first in every column, because those are the ones that need
 * somebody in the room. Nothing is ever dropped: a step not yet given a column
 * is listed under the board with the three to choose from.
 */
import { useEffect, useMemo, useState } from 'react';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { ActionSheet, type Editing } from '../ui/ActionSheet';
import { Peers, methodPeers } from '../ui/Peers';
import { useMethodCounts } from '../lib/useMethodCounts';
import { useImpacts } from '../lib/useImpacts';
import { IMPACT_WORD, type Impact } from '../lib/impact';
import { useProject } from '../lib/useProjects';
import { planModel } from '../lib/planModel';
import { useActions, WHOLE_PROJECT, isLate } from '../lib/actions';
import { statusOfAction } from '../lib/treeBind';
import { PILLARS, actionTitle, meetingOrder, type PillarKey } from '../lib/pillars';
import { putPaceTodo } from '../db';
import { uid } from '../lib/ids';
import { todayISO } from '../lib/weeks';
import type { PaceAction } from '../lib/tracker';
import type { NodeStatus } from '../db';
import { Icon } from '../ui/Icon';

const STATUS: Record<NodeStatus, string> = {
  n: 'To do', w: 'In progress', a: 'Waiting', r: 'Overdue', g: 'Done',
};

function Card({ a, impact, onOpen }: { a: PaceAction; impact?: Impact; onOpen: () => void }) {
  const st = statusOfAction(a);
  const who = (a.owner || a.who || '').trim();
  return (
    <button className={'bd-act is-' + st} onClick={onOpen}>
      <span className="bd-act-t">{actionTitle(a)}</span>
      <span className="bd-act-f">
        <span className={'bd-chip is-' + st}>{STATUS[st]}</span>
        {who && <span className="bd-who">{who}</span>}
        {a.caseId && <span className="bd-meta" title="Raised from a Pareto, for a Case">from a Case</span>}
        {/* DID IT WORK? Once an action is closed, the line's own numbers either
            side of that day say whether they moved — the same proof the Wins use. */}
        {impact && impact.state !== 'none' && (
          <span className={'bd-proof is-' + impact.state} title={impact.words}>{IMPACT_WORD[impact.state]}</span>
        )}
        {a.due && <span className="bd-meta">{st === 'g' ? '' : 'due '}{a.due}</span>}
      </span>
    </button>
  );
}

export function BoardScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const ax = useActions(projectId);
  const counts = useMethodCounts(projectId);
  const { impacts } = useImpacts(projectId);
  const [hideDone, setHideDone] = useState(false);
  const [only, setOnly] = useState<string | null>(null);     // a line id, '' for every line's, null for all
  const [editing, setEditing] = useState<Editing | null>(null);
  const today = todayISO();

  const stepById = useMemo(() => new Map(ax.steps.map(s => [s.id, s])), [ax.steps]);
  /* ?a=<id> OPENS THAT ACTION. An action tapped on the project page, or under
     "Did it work?", lands on its own sheet — not on the whole board with the
     one you tapped somewhere in it. The address is put back to the board's
     own, so closing the sheet leaves you on the board. */
  const wanted = useRoute().query.get('a');
  useEffect(() => {
    if (!wanted || ax.loading) return;
    const s = stepById.get(wanted);
    if (s) setEditing({ step: s, isNew: false });
    navReplace(`/project/${projectId}/board`);
  }, [wanted, ax.loading, stepById, projectId]);
  const open = (a: PaceAction) => { const s = a.uid ? stepById.get(a.uid) : undefined; if (s) setEditing({ step: s, isNew: false }); };
  const add = (pillar: PillarKey, lineId?: string) => {
    const t = Date.now();
    setEditing({
      isNew: true,
      step: { id: uid(), projectId, lineId, what: '', where: '', why: '', who: '', when: '', state: 'todo', pillar, createdAt: t, updatedAt: t },
    });
  };

  /* Every line gets its block, even with nothing in it yet — the "+ Add" in
     its columns is how its first action is written. Work for no one line
     goes last, and only appears once there is some (or there are no lines). */
  const areas = useMemo(() => {
    const blocks: { id: string; name: string; lineId?: string }[] = ax.lines.map(l => ({ id: l.id, name: l.name, lineId: l.id }));
    const whole = ax.actions.some(a => !a.lineId);
    if (whole || ax.lines.length === 0) blocks.push({ id: '', name: WHOLE_PROJECT });
    return blocks.map(b => {
      const rows = ax.actions.filter(a => (a.lineId ?? '') === b.id && a.pillar);
      const shown = hideDone ? rows.filter(a => statusOfAction(a) !== 'g') : rows;
      return {
        ...b,
        total: rows.length,
        done: rows.filter(a => statusOfAction(a) === 'g').length,
        columns: PILLARS.map(p => ({ ...p, rows: shown.filter(a => a.pillar === p.label).sort(meetingOrder) })),
      };
    });
  }, [ax.actions, ax.lines, hideDone]);

  const unsorted = ax.steps.filter(s => !s.pillar);
  const late = ax.steps.filter(s => isLate(s, today)).length;
  const done = ax.steps.filter(s => s.state === 'done').length;
  const shownAreas = only == null ? areas : areas.filter(a => a.id === only);

  if (loading || ax.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
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
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Board' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          {/* "3P" is a method's name; on a lever tree job this board is where
              the tree's work is written, and the job is not a 3P job. */}
          <h1 className="pace-title">{planModel(project) === 'tree' ? 'Board' : '3P Board'}</h1>
          <p className="cw-handover">
            {ax.steps.length === 0
              ? <b>No actions yet</b>
              : <>
                <b>{ax.steps.length - done} open</b>
                {late > 0 && <span className="sub in-late">{late} late</span>}
                <span className="sub">{done} done</span>
              </>}
            {ax.steps.length > 0 && (
              <button className="cw-link" onClick={() => nav(`/project/${projectId}?view=next`)}>As a list, with photos</button>
            )}
          </p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost pd-print" onClick={() => window.print()}>Print</button>
        </div>
      </header>
      {/* THE ROW UNDER THE HEADER, on every page — see "THE PAGE FRAME" in
          styles.css. It sat above the title here and below it on the
          project's front page, so the tabs jumped as you moved between them. */}
      <Peers peers={methodPeers(projectId, project.leverTree ? 'tree' : 'board', 'board', counts)} />

      {areas.length > 1 && (
        <div className="bd-filters">
          <button className={'chip is-all' + (only == null ? ' on' : '')} onClick={() => setOnly(null)}>Every line</button>
          <span className="bd-filter-div" aria-hidden />
          {areas.map(a => (
            <button key={a.id || 'whole'} className={'chip' + (only === a.id ? ' on' : '')} onClick={() => setOnly(a.id)}>
              {a.name} <span className="bs-n">{a.total}</span>
            </button>
          ))}
          <button className={'chip' + (hideDone ? ' on' : '')} onClick={() => setHideDone(v => !v)}>
            {hideDone ? 'Hiding done' : 'Showing done'}
          </button>
        </div>
      )}

      {ax.steps.length === 0 && (
        <p className="sub bd-intro">
          Write each action in the column it belongs to — <b>People</b> (who runs it, and whether they can),
          {' '}<b>Plant</b> (the machine) or <b>Process</b> (the way of working) — with who has it and when it is due.
          This is the meeting: walk it line by line.
        </p>
      )}

      {shownAreas.map(a => (
        <section key={a.id || 'whole'} className="bd-area">
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
                  {c.rows.map(x => <Card key={x.uid} a={x} impact={x.uid ? impacts.get(x.uid) : undefined} onOpen={() => open(x)} />)}
                  <button className="bd-add" onClick={() => add(c.key, a.lineId)}><Icon name="plus" size="1.15em" /> Add</button>
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}

      {/* Never lose a row: a step written before the board, or on the Next
          steps list, is shown here until it is given its column. */}
      {unsorted.length > 0 && (
        <section className="bd-unsorted">
          <h2 className="bd-area-t">Not on the board yet</h2>
          <p className="sub">{unsorted.length} action{unsorted.length === 1 ? ' has' : 's have'} no column — say which it is.</p>
          <ul className="bd-un-list">
            {unsorted.map(s => (
              <li key={s.id} className="bd-un">
                <button className="bd-un-t" onClick={() => setEditing({ step: s, isNew: false })}>{s.what || 'Untitled'}</button>
                <span className="cw-seg">
                  {PILLARS.map(p => (
                    <button key={p.key} className="chip" onClick={() => void putPaceTodo({ ...s, pillar: p.key })}>{p.label}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && <ActionSheet editing={editing} lines={ax.lines} impact={impacts.get(editing.step.id)} onClose={() => setEditing(null)} />}
    </div>
  );
}
