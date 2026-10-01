/* Raise an action straight from the Pareto board. The drill just told you
 * where the pain is ("size changes, on the filler") — this records the
 * countermeasure right there, tagged with that target, before it can escape
 * into a notebook.
 *
 * WHERE IT LANDS: on the project's board, when this line belongs to a 3P or
 * lever tree project — an ordinary next step (lib/actions) carrying the loss
 * that raised it, the Case it was raised for, and People / Plant / Process.
 * It used to become a snag, a second list beside the board's, and the control
 * room could only count one of them. A walk that belongs to no project, or to
 * a stage-gate job (which has no board), still raises a snag as before. */
import { useEffect, useState } from 'react';
import { addSnag, chainForWorkspace, putPaceTodo } from '../db';
import { uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { useTeam } from '../cloud/team';
import { useWorkspace } from '../state/WorkspaceProvider';
import { dueFromInput } from '../snag/types';
import { PILLARS, type PillarKey } from '../lib/pillars';
import { lossContext } from '../lib/lossContext';
import type { DrillPath } from '../types';

const fromPath = (path: DrillPath, dim: string): string | undefined =>
  path.find(s => s.dimension === dim)?.value;

export function ActionComposer({ wsId, path, caseId, onRaised }: { wsId: string; path: DrillPath; caseId?: string; onRaised?: () => void }) {
  const { members } = useTeam();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState('');
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [raised, setRaised] = useState<{ what: string; board?: string } | null>(null);
  const [pillar, setPillar] = useState<PillarKey | undefined>();
  const { observations } = useWorkspace();
  // The project this line's walk belongs to, if it has a board to put the action on.
  const [home, setHome] = useState<{ projectId: string; lineId?: string } | null>(null);
  useEffect(() => {
    let alive = true;
    void chainForWorkspace(wsId).then(c => { if (alive) setHome(c && !c.stageGate ? { projectId: c.projectId, lineId: c.lineId } : null); });
    return () => { alive = false; };
  }, [wsId]);

  const target = {
    targetCategory: fromPath(path, 'category'),
    targetSubcategory: fromPath(path, 'subcategory'),
    targetAsset: fromPath(path, 'asset'),
  };
  const targetLabel = [target.targetCategory, target.targetSubcategory, target.targetAsset].filter(Boolean).join(' · ');

  const raise = async () => {
    const p = problem.trim();
    if (!p) return;
    if (home) {
      const t = Date.now();
      await putPaceTodo({
        id: uid(), projectId: home.projectId, lineId: home.lineId, caseId,
        what: p, where: target.targetAsset ?? '',
        // The loss that made it matter, said once, now — also its "before".
        why: lossContext(observations, wsId, path, t),
        who: owner.trim(), when: '', due: due || undefined, pillar,
        state: 'todo', createdAt: t, updatedAt: t,
      });
      setRaised({ what: p, board: `/project/${home.projectId}/board` });
    } else {
      await addSnag({
        id: uid(), workspaceId: wsId, ...target, caseId,
        problem: p, owner: owner.trim() || undefined, dueAt: dueFromInput(due),
        status: 'open', raisedAt: Date.now(), updatedAt: Date.now(),
      });
      setRaised({ what: p });
    }
    setProblem(''); setOwner(''); setDue(''); setPillar(undefined); setOpen(false);
    onRaised?.();
  };

  if (raised) return (
    <div className="action-raised" role="status">
      ⚑ Action raised{targetLabel ? <> on <b>{targetLabel}</b></> : null} — {raised.board
        ? 'it is on the project’s board, with the loss that raised it.'
        : 'it is on the snag list with an owner and an age.'}
      <button className="linkish" onClick={() => nav(raised.board ?? `/w/${wsId}/snaglist`)}>{raised.board ? 'See it on the board ›' : 'See it ›'}</button>
      <button className="linkish" onClick={() => setRaised(null)}>Raise another</button>
    </div>
  );

  if (!open) return (
    <button className="board-cta" onClick={() => setOpen(true)}>
      <span className="board-cta-ic" aria-hidden>⚑</span>
      <span className="board-cta-main">Raise an action{targetLabel ? ` on ${targetLabel}` : ' from this'}</span>
      <span className="board-cta-go" aria-hidden>›</span>
    </button>
  );

  return (
    <div className="card action-form">
      <div className="field-label">⚑ Action{targetLabel ? <> on <b>{targetLabel}</b></> : null}</div>
      <p className="sub" style={{ margin: '4px 0 8px' }}>{home
        ? 'What’s the fix? It goes on the project’s board with the loss that raised it — same owners, same report, same “is it getting better”.'
        : 'What’s the fix? It joins the snag list — same owners, same report, same “is it getting better”.'}</p>
      <textarea className="text-area" autoFocus rows={2} maxLength={300} value={problem}
        placeholder="e.g. Run a SMED workshop on the size change…"
        onChange={e => setProblem(e.target.value)} />
      {home && (
        <div className="cw-seg" role="group" aria-label="People, Plant or Process" style={{ marginTop: 8 }}>
          {PILLARS.map(x => (
            <button key={x.key} type="button" className={'chip' + (pillar === x.key ? ' on' : '')}
              aria-pressed={pillar === x.key} onClick={() => setPillar(pillar === x.key ? undefined : x.key)}>{x.label}</button>
          ))}
        </div>
      )}
      <div className="row-inline" style={{ marginTop: 8 }}>
        <input className="text-input" list="team-members" value={owner} placeholder="Owner (who drives it)"
          maxLength={80} onChange={e => setOwner(e.target.value)} />
        <datalist id="team-members">{members.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}</datalist>
        {/* the promise — optional, but it's what gives the review its teeth */}
        <input className="text-input due-input" type="date" value={due} aria-label="Due date"
          title="Due date (optional)" onChange={e => setDue(e.target.value)} />
        <button className="btn btn-primary" onClick={() => void raise()} disabled={!problem.trim()}>Raise</button>
        <button className="btn btn-ghost" onClick={() => { setOpen(false); setProblem(''); }}>Cancel</button>
      </div>
    </div>
  );
}
