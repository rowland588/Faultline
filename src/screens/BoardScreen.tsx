/* THE 6M BOARD — the countermeasures, on the six bones, line by line.
 *
 * A running line's problems are traced on the fishbone (docs/SIXM.md); what is
 * being DONE about them is written here, on the same six bones — People,
 * Machine, Method, Material, Measurement, Environment (lib/sixm). The board
 * and the fishbone sort the same work the same way, so a cause on the Machine
 * bone has its countermeasures in the Machine lane, and a card says which
 * cause it is for and what it should change.
 *
 * The lanes are told apart by place and name, never colour (CLAUDE.md, visual
 * management): colour on a card is its state — red late, amber waiting, indigo
 * under way, green done, grey not started.
 *
 * Each action is a next step of the project (lib/actions) — one list, read the
 * same by the board, the list view, a line's pack, the meeting, the fishbone
 * and the client report. A small obvious fix needs no fishbone: it is just
 * written in its lane.
 *
 * One block per line, then one for work that spans every line. Overdue and
 * waiting first in every lane, then the soonest due. Nothing is ever dropped:
 * an action not yet on a bone is listed under the board with the six to pick
 * from. Access (lib/access): a client reads it; the team adds and changes;
 * only the owner deletes. */
import { useEffect, useMemo, useState } from 'react';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { ActionSheet, type Editing } from '../ui/ActionSheet';
import { useImpacts } from '../lib/useImpacts';
import { IMPACT_WORD, type Impact } from '../lib/impact';
import { useProject } from '../lib/useProjects';
import { methodOf } from '../lib/planModel';
import { GONE_WORDS, useActions, useCauseNames, WHOLE_PROJECT, isLate, parseCauseRef, type CauseName } from '../lib/actions';
import { statusOfAction } from '../lib/treeBind';
import { PILLARS, actionTitle, boardName, lanes, pillarOf, type PillarKey } from '../lib/pillars';
import { useAccess } from '../cloud/access';
import { putPaceTodo } from '../db';
import { uid } from '../lib/ids';
import { todayISO } from '../lib/weeks';
import type { PaceAction } from '../lib/tracker';
import type { NodeStatus } from '../db';
import { Icon } from '../ui/Icon';

const STATUS: Record<NodeStatus, string> = {
  n: 'To do', w: 'In progress', a: 'Waiting', r: 'Late', g: 'Done',
};

const NOBODY = '__nobody__';

function Card({ a, impact, cause, onOpen }: { a: PaceAction; impact?: Impact; cause?: CauseName; onOpen: () => void }) {
  const st = statusOfAction(a);
  const who = (a.owner || a.who || '').trim();
  const soon = st !== 'g' && st !== 'r' && /due soon/i.test(a.flag);
  return (
    <button className={'bd-act is-' + st} onClick={onOpen}>
      <span className="bd-act-t">{actionTitle(a)}</span>
      {/* THE CAUSE IT IS FOR, AND WHAT IT SHOULD CHANGE — what makes it a
          countermeasure rather than a to-do (docs/SIXM.md). */}
      {parseCauseRef(a.causeRef) && (
        <span className="bd-for">{cause?.gone ? GONE_WORDS[cause.gone] : cause ? <>for: <b>{cause.text}</b></> : 'on the fishbone'}</span>
      )}
      {a.expect && <span className="bd-expect">should change: {a.expect}</span>}
      <span className="bd-act-f">
        <span className={'bd-chip is-' + st}>{STATUS[st]}</span>
        {who && <span className="bd-who">{who}</span>}
        {a.caseId && !a.causeRef && <span className="bd-meta" title="Raised from a Pareto, for a Case">from a Case</span>}
        {/* DID IT WORK? Once an action is closed, the line's own numbers either
            side of that day say whether they moved — the same proof the Wins use. */}
        {impact && impact.state !== 'none' && (
          <span className={'bd-proof is-' + impact.state} title={impact.words}>{IMPACT_WORD[impact.state]}</span>
        )}
        {a.due && <span className={'bd-meta' + (soon ? ' is-soon' : '')}>{st === 'g' ? '' : 'due '}{a.due}{soon ? ' · soon' : ''}</span>}
      </span>
    </button>
  );
}

export function BoardScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const ax = useActions(projectId);
  const { impacts } = useImpacts(projectId);
  const can = useAccess(projectId);
  const causes = useCauseNames(useMemo(() => ax.steps.map(s => s.causeRef), [ax.steps]));
  const [hideDone, setHideDone] = useState(false);
  const [only, setOnly] = useState<string | null>(null);       // a line id, '' for every line's, null for all
  const [bone, setBone] = useState<PillarKey | null>(null);    // one bone, or all six
  const [owner, setOwner] = useState<string | null>(null);     // a name, NOBODY, or everyone
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
    if (!can.edit) return;
    const t = Date.now();
    setEditing({
      isNew: true,
      step: { id: uid(), projectId, lineId, what: '', where: '', why: '', who: '', when: '', state: 'todo', pillar, createdAt: t, updatedAt: t },
    });
  };

  /* WHO HAS SOMETHING — the owner filter's names, as typed, most work first. */
  const owners = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of ax.steps) {
      const k = s.who.trim() || NOBODY;
      n.set(k, (n.get(k) ?? 0) + (s.state === 'done' ? 0 : 1));
    }
    return [...n.entries()].sort((a, b) => (a[0] === NOBODY ? 1 : 0) - (b[0] === NOBODY ? 1 : 0) || b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [ax.steps]);

  /* Every line gets its block, even with nothing in it yet — the "+ Add" in
     its lanes is how its first action is written. Work for no one line goes
     last, and only appears once there is some (or there are no lines). */
  const areas = useMemo(() => {
    const ownerOk = (a: PaceAction) => owner == null || ((a.owner ?? '').trim() || NOBODY) === owner;
    const blocks: { id: string; name: string; lineId?: string }[] = ax.lines.map(l => ({ id: l.id, name: l.name, lineId: l.id }));
    const whole = ax.actions.some(a => !a.lineId);
    if (whole || ax.lines.length === 0) blocks.push({ id: '', name: WHOLE_PROJECT });
    return blocks.map(b => {
      const rows = ax.actions.filter(a => (a.lineId ?? '') === b.id && pillarOf(a));
      const shown = rows.filter(a => (!hideDone || statusOfAction(a) !== 'g') && ownerOk(a));
      return {
        ...b,
        total: rows.length,
        done: rows.filter(a => statusOfAction(a) === 'g').length,
        late: rows.filter(a => statusOfAction(a) === 'r').length,
        columns: lanes(shown).filter(c => bone == null || c.key === bone),
      };
    });
  }, [ax.actions, ax.lines, hideDone, bone, owner]);

  const unsorted = ax.steps.filter(s => !pillarOf(s));
  const late = ax.steps.filter(s => isLate(s, today)).length;
  const done = ax.steps.filter(s => s.state === 'done').length;
  const shownAreas = only == null ? areas : areas.filter(a => a.id === only);
  const filtered = bone != null || owner != null || hideDone;

  if (loading || ax.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  return (
    <div className="wrap pace bd-screen bd6">
      <header className="pace-head">
        <div className="pace-head-main">
          {/* "6M" is a method's name; on a lever tree job this board is where
              the tree's work is written, and the job is not a 6M job. */}
          <h1 className="pace-title">{boardName(methodOf(project).label)}</h1>
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

      {ax.steps.length > 0 && (
        <div className="bd-filters bd6-filters">
          {areas.length > 1 && (
            <div className="bd6-frow" role="group" aria-label="Line">
              <span className="bd6-fk">Line</span>
              <button className={'chip is-all' + (only == null ? ' on' : '')} aria-pressed={only == null} onClick={() => setOnly(null)}>Every line</button>
              {areas.map(a => (
                <button key={a.id || 'whole'} className={'chip' + (only === a.id ? ' on' : '')} aria-pressed={only === a.id} onClick={() => setOnly(only === a.id ? null : a.id)}>
                  {a.name} <span className="bs-n">{a.total}</span>
                </button>
              ))}
            </div>
          )}
          <div className="bd6-frow" role="group" aria-label="Bone">
            <span className="bd6-fk">Bone</span>
            <button className={'chip is-all' + (bone == null ? ' on' : '')} aria-pressed={bone == null} onClick={() => setBone(null)}>All six</button>
            {PILLARS.map(p => (
              <button key={p.key} className={'chip' + (bone === p.key ? ' on' : '')} aria-pressed={bone === p.key}
                onClick={() => setBone(bone === p.key ? null : p.key)}>{p.label}</button>
            ))}
          </div>
          <div className="bd6-frow">
            <label className="bd6-owner">
              <span className="bd6-fk">Who</span>
              <select value={owner ?? ''} onChange={e => setOwner(e.target.value || null)} aria-label="Whose actions">
                <option value="">Everyone</option>
                {owners.map(([name, n]) => (
                  <option key={name} value={name}>{name === NOBODY ? 'Nobody named' : name}{n ? ` · ${n} open` : ''}</option>
                ))}
              </select>
            </label>
            <button className={'chip' + (hideDone ? ' on' : '')} aria-pressed={hideDone} onClick={() => setHideDone(v => !v)}>
              {hideDone ? 'Hiding done' : 'Showing done'}
            </button>
            {filtered && (
              <button className="cw-link" onClick={() => { setBone(null); setOwner(null); setHideDone(false); }}>Show everything</button>
            )}
          </div>
        </div>
      )}

      {ax.steps.length === 0 && (
        <p className="sub bd-intro">
          {can.edit
            ? <>Write each countermeasure on the bone it belongs to — <b>People</b>, <b>Machine</b>, <b>Method</b>,
              {' '}<b>Material</b>, <b>Measurement</b> or <b>Environment</b> — with who has it, when it is due and what it should change.
              The causes behind them are traced on the fishbone. This is the meeting: walk it line by line.</>
            : <>Nothing on the board yet. The team writes each countermeasure here, on the bone it belongs to.</>}
        </p>
      )}

      {shownAreas.map(a => (
        <section key={a.id || 'whole'} className="bd-area">
          <header className="bd-area-h">
            <h2 className="bd-area-t">{a.name}</h2>
            <span className="bd-area-n">
              {a.total} action{a.total === 1 ? '' : 's'} · {a.done} done{a.late > 0 && <> · <b className="in-late">{a.late} late</b></>}
            </span>
          </header>
          <div className={'bd6-lanes' + (bone != null ? ' is-one' : '')}>
            {a.columns.map(c => (
              <section key={c.key} className={'bd6-lane' + (c.rows.length === 0 ? ' is-empty' : '')} aria-label={`${a.name} — ${c.label}`}>
                <header className="bd6-lane-h">
                  <h3 className="bd6-lane-t">{c.label}</h3>
                  <span className="bd6-lane-n">{c.rows.length}</span>
                  <span className="bd6-lane-s">{c.blurb}</span>
                </header>
                <div className="bd6-lane-b">
                  {c.rows.map(x => (
                    <Card key={x.uid} a={x} impact={x.uid ? impacts.get(x.uid) : undefined}
                      cause={x.causeRef ? causes.get(x.causeRef) : undefined} onOpen={() => open(x)} />
                  ))}
                  {can.edit && (
                    <button className="bd-add" onClick={() => add(c.key, a.lineId)} aria-label={`Add an action — ${a.name}, ${c.label}`}>
                      <Icon name="plus" size="1.15em" /> Add
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}

      {/* Never lose a row: an action written before the board, or on the list
          without a bone, is shown here until it is given one. */}
      {unsorted.length > 0 && (
        <section className="bd-unsorted">
          <h2 className="bd-area-t">Not on the board yet</h2>
          <p className="sub">
            {unsorted.length} action{unsorted.length === 1 ? ' has' : 's have'} no bone{can.edit ? ' — say which it is.' : '.'}
          </p>
          <ul className="bd-un-list">
            {unsorted.map(s => (
              <li key={s.id} className="bd-un">
                <button className="bd-un-t" onClick={() => setEditing({ step: s, isNew: false })}>{s.what || 'Untitled'}</button>
                {can.edit && (
                  <span className="cw-seg bd6-un-seg" role="group" aria-label={`Which bone — ${s.what || 'this action'}`}>
                    {PILLARS.map(p => (
                      <button key={p.key} className="chip" title={p.blurb} onClick={() => void putPaceTodo({ ...s, pillar: p.key })}>{p.label}</button>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && <ActionSheet editing={editing} lines={ax.lines} impact={impacts.get(editing.step.id)} onClose={() => setEditing(null)} />}
    </div>
  );
}
