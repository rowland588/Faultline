/* THE ACTION, EDITED — one sheet for the board and for a Case.
 *
 * An action is a next step of the project (lib/actions): what, why, which of
 * People · Plant · Process, which line, who, by when, and how it stands. The
 * 3P board writes it here, and so does the Case a Pareto opened — the same
 * record in the same sheet, so there is one list to be in control of. */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';
import { PILLARS } from '../lib/pillars';
import { WHOLE_PROJECT } from '../lib/actions';
import { putPaceTodo, deletePaceTodo, type PaceLineRow, type PaceTodoRow } from '../db';
import { IMPACT_WORD, type Impact } from '../lib/impact';

/** What the sheet edits — a step, or the start of a new one. */
export type Editing = { step: PaceTodoRow; isNew: boolean };

export function ActionSheet({ editing, lines, impact, onClose }: {
  editing: Editing; lines: PaceLineRow[]; onClose: () => void;
  /** Did it work? — the line's numbers either side of the day it closed. */
  impact?: Impact;
}) {
  const [s, setS] = useState<PaceTodoRow>(editing.step);
  const set = (p: Partial<PaceTodoRow>) => setS(x => ({ ...x, ...p }));
  const save = async () => {
    if (!s.what.trim()) return;
    await putPaceTodo({ ...s, what: s.what.trim(), who: s.who.trim() });
    onClose();
  };
  // The walk of the line this was raised on, where its Case lives.
  const caseWs = s.caseId ? lines.find(l => l.id === s.lineId)?.workspaceId : undefined;
  const remove = async () => {
    if (!window.confirm(`Delete this action?\n\n"${s.what}"`)) return;
    await deletePaceTodo(s.id);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={editing.isNew ? 'A new action' : 'The action'}>
      <div className="ax-form">
        <label className="cw-f cw-f-wide"><span>WHAT HAS TO BE DONE</span>
          <textarea rows={2} value={s.what} autoFocus={editing.isNew}
            placeholder="e.g. Train the night shift on the splice"
            onChange={e => set({ what: e.target.value })} /></label>
        <label className="cw-f cw-f-wide"><span>WHY — WHAT IT FIXES</span>
          <textarea rows={2} value={s.why} placeholder="Film breaks at the splice, 20 min a shift"
            onChange={e => set({ why: e.target.value })} /></label>
        {s.caseId && caseWs && (
          <button type="button" className="cw-link" style={{ alignSelf: 'flex-start' }}
            onClick={() => { onClose(); nav(`/w/${caseWs}/case/${s.caseId}`); }}>Open the Case it was raised for ›</button>
        )}
        <div className="ax-row">
          <span className="ax-k">3P</span>
          <div className="cw-seg" role="group" aria-label="People, Plant or Process">
            {PILLARS.map(p => (
              <button key={p.key} type="button" className={'chip' + (s.pillar === p.key ? ' on' : '')}
                aria-pressed={s.pillar === p.key} onClick={() => set({ pillar: p.key })}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="ax-grid">
          <label className="cw-f"><span>LINE</span>
            <select value={s.lineId ?? ''} onChange={e => set({ lineId: e.target.value || undefined })}>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              <option value="">{WHOLE_PROJECT}</option>
            </select></label>
          <label className="cw-f"><span>WHO</span>
            <input value={s.who} placeholder="Name" onChange={e => set({ who: e.target.value })} /></label>
          <label className="cw-f"><span>DUE</span>
            <input type="date" value={s.due ?? ''} onChange={e => set({ due: e.target.value || undefined })} /></label>
        </div>
        <div className="ax-row">
          <span className="ax-k">STATE</span>
          <div className="cw-seg" role="group" aria-label="State">
            {(['todo', 'waiting', 'done'] as const).map(k => (
              <button key={k} type="button" className={'chip' + (s.state === k ? ' on' : '')}
                aria-pressed={s.state === k} onClick={() => set({ state: k })}>
                {k === 'todo' ? 'To do' : k === 'waiting' ? 'Waiting on someone' : 'Done'}
              </button>
            ))}
          </div>
        </div>
        {s.state === 'done' && (
          <label className="cw-f cw-f-wide"><span>HOW IT ENDED</span>
            <textarea rows={2} value={s.outcome ?? ''} placeholder="Worked / didn't / needs another go"
              onChange={e => set({ outcome: e.target.value })} /></label>
        )}
        {impact && impact.state !== 'none' && editing.step.state === 'done' && (
          <p className={'ax-proof is-' + impact.state}>
            <b>Did it work? {IMPACT_WORD[impact.state]}.</b> {impact.words}
            <span className="sub"> The line’s numbers either side of the day it closed — the evidence, not the cause.</span>
          </p>
        )}
        <div className="ax-foot">
          {!editing.isNew && <button className="btn btn-ghost cw-del" onClick={() => void remove()}>Delete</button>}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!s.what.trim()} onClick={() => void save()}>
            {editing.isNew ? 'Add it' : 'Save'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

