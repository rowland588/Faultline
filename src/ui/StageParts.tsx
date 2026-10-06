/* PART OF THE PLAN — the lines a stage is made of, that are not problems.
 *
 * Rowland, 6 October: "Part of our issues is also pressing the stage 'hit a
 * problem' — perhaps write a note that it is part of the plan, for example
 * programs: write a subsection, 'Panels to run Express 1.25 kg'. This helps
 * tie in what are problems, fixes and subsections of a plan."
 *
 * "Hit a problem" was the only way to write anything on a stage, so planned
 * work went in as a problem and the stage turned red. These are the stage's
 * own parts: a line each, ticked when done, never a problem. No new record —
 * the item kind 'next' ("what we do next") already held exactly this: words,
 * an owner, a day, done. Everything here can be changed or taken off. */
import { useState } from 'react';
import type { Test, TestItem } from '../lib/testing';
import { partsOf } from '../lib/noted';
import { niceDay, todayISO } from '../lib/weeks';
import { offerUndo } from './Undo';
import { deleteTestItem } from '../db';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';

type TT = ReturnType<typeof useTesting>;

export function StageParts({ step, tt, can }: { step: Test; tt: Pick<TT, 'items' | 'addItem' | 'saveItem'>; can: Can }) {
  const parts = partsOf(step.id, tt.items);
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<{ id: string; what: string } | null>(null);
  if (!parts.length && !can.edit) return null;
  const done = parts.filter(p => p.doneAt != null).length;

  const add = () => {
    const what = adding.trim();
    if (!what) return;
    void tt.addItem(step.id, 'next', what);
    setAdding('');
  };
  const toggle = (p: TestItem) => {
    void tt.saveItem({ ...p, doneAt: p.doneAt != null ? undefined : Date.now() });
    offerUndo(p.doneAt != null ? `“${p.what}” — not done` : `“${p.what}” — done`, () => tt.saveItem(p));
  };
  const remove = async (p: TestItem) => offerUndo(`Took off “${p.what}”`, await deleteTestItem(p.id));

  return (
    <div className="rd-blk sp-parts">
      <small>Part of the plan{parts.length ? ` · ${done} of ${parts.length} done` : ''}</small>
      {parts.length > 0 && (
        <ul className="spp-list">
          {parts.map(p => (
            <li key={p.id} className={'spp-row' + (p.doneAt != null ? ' is-done' : '')}>
              {editing?.id === p.id ? (
                <form className="spp-edit" onSubmit={e => {
                  e.preventDefault();
                  const what = editing.what.trim();
                  if (what && what !== p.what) { void tt.saveItem({ ...p, what }); offerUndo('Changed', () => tt.saveItem(p)); }
                  setEditing(null);
                }}>
                  <input value={editing.what} autoFocus aria-label="The part" onChange={e => setEditing({ id: p.id, what: e.target.value })} />
                  <button type="submit" className="btn btn-sm btn-primary">Save</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <label className="spp-tick">
                    <input type="checkbox" checked={p.doneAt != null} disabled={!can.edit} onChange={() => toggle(p)} />
                    <span>{p.what}</span>
                  </label>
                  <span className="spp-state">{p.doneAt != null ? `done ${niceDay(todayISO(new Date(p.doneAt)))}` : 'to do'}</span>
                  {can.edit && (
                    <span className="sp-row-acts">
                      <button type="button" className="cw-link" onClick={() => setEditing({ id: p.id, what: p.what })}>Edit</button>
                      <button type="button" className="cw-link sp-rm" onClick={() => void remove(p)}>Delete</button>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {can.edit && (
        <form className="spp-add" onSubmit={e => { e.preventDefault(); add(); }}>
          <input value={adding} placeholder="Add a part — e.g. Panels to run Express 1.25 kg" aria-label="Add a part of the plan" onChange={e => setAdding(e.target.value)} />
          <button type="submit" className="btn btn-sm" disabled={!adding.trim()}>Add</button>
        </form>
      )}
      {!parts.length && can.edit && <p className="sub spp-why">Planned work inside this stage. Not a problem — a problem is for what went wrong.</p>}
    </div>
  );
}
