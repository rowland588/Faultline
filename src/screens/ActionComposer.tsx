/* Raise an action straight from the Pareto board. The drill just told you
 * where the pain is ("size changes, on the filler") — this records the
 * countermeasure right there, tagged with that target, before it can escape
 * into a notebook. The action is an ordinary snag with no photo pin: same
 * lifecycle, same owners, same snag list, report and trend flags. */
import { useState } from 'react';
import { addSnag } from '../db';
import { uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { useTeam } from '../cloud/team';
import type { DrillPath } from '../types';

const fromPath = (path: DrillPath, dim: string): string | undefined =>
  path.find(s => s.dimension === dim)?.value;

export function ActionComposer({ wsId, path }: { wsId: string; path: DrillPath }) {
  const { members } = useTeam();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState('');
  const [owner, setOwner] = useState('');
  const [raised, setRaised] = useState<string | null>(null);

  const target = {
    targetCategory: fromPath(path, 'category'),
    targetSubcategory: fromPath(path, 'subcategory'),
    targetAsset: fromPath(path, 'asset'),
  };
  const targetLabel = [target.targetCategory, target.targetSubcategory, target.targetAsset].filter(Boolean).join(' · ');

  const raise = async () => {
    const p = problem.trim();
    if (!p) return;
    await addSnag({
      id: uid(), workspaceId: wsId, ...target,
      problem: p, owner: owner.trim() || undefined,
      status: 'open', raisedAt: Date.now(), updatedAt: Date.now(),
    });
    setRaised(p); setProblem(''); setOwner(''); setOpen(false);
  };

  if (raised) return (
    <div className="action-raised">
      ⚑ Action raised{targetLabel ? <> on <b>{targetLabel}</b></> : null} — it's on the snag list with an owner and an age.
      <button className="linkish" onClick={() => nav(`/w/${wsId}/snaglist`)}>See it ›</button>
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
      <p className="sub" style={{ margin: '4px 0 8px' }}>What's the fix? It joins the snag list — same owners, same report, same "is it getting better".</p>
      <textarea className="text-area" autoFocus rows={2} maxLength={300} value={problem}
        placeholder="e.g. Run a SMED workshop on the size change…"
        onChange={e => setProblem(e.target.value)} />
      <div className="row-inline" style={{ marginTop: 8 }}>
        <input className="text-input" list="team-members" value={owner} placeholder="Owner (who drives it)"
          maxLength={80} onChange={e => setOwner(e.target.value)} />
        <datalist id="team-members">{members.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}</datalist>
        <button className="btn btn-primary" onClick={() => void raise()} disabled={!problem.trim()}>Raise</button>
        <button className="btn btn-ghost" onClick={() => { setOpen(false); setProblem(''); }}>Cancel</button>
      </div>
    </div>
  );
}
