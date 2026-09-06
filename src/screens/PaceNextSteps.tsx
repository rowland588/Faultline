/* NEXT STEPS — what still needs doing, and what we are waiting on.
 *
 * These are not tracker actions. A tracker action has an owner, a due date and
 * a category; this is the stuff before that — "trial the Tesco Express trays and
 * see whether the robot can pack them at speed". Half-formed on purpose, and
 * kept out of the workbook so it does not have to be.
 *
 * WAITING FOR is its own state rather than a separate list, because an item
 * moves: you do the thing, then you wait on someone, then it lands. One row,
 * three states, moved with one tap.
 *
 * WHY is a column and not an afterthought. A trial nobody can justify in the
 * meeting is a trial that quietly gets dropped.
 *
 * WHEN is free text. "Before the Tesco launch" and "w/c 22nd" are real answers
 * that a date picker cannot hold, and forcing a date would make people invent
 * one. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { listPaceTodos, putPaceTodo, deletePaceTodo, onDataChange, type PaceTodoRow } from '../db';
import { uid } from '../lib/ids';

type State = PaceTodoRow['state'];

const GROUPS: { id: State; title: string; blurb: string }[] = [
  { id: 'todo', title: 'Needs doing', blurb: 'ours to move' },
  { id: 'waiting', title: 'Waiting for', blurb: 'on someone else' },
  { id: 'done', title: 'Done', blurb: '' },
];

/** Grows with what is typed, so a long "why" is never a one-line slot. */
function Grow({ value, onChange, placeholder, label }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string;
}) {
  return (
    <textarea
      className="ns-in ns-grow" rows={2} value={value} placeholder={placeholder} aria-label={label}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function Row({ row, onPatch, onDelete }: {
  row: PaceTodoRow; onPatch: (p: Partial<PaceTodoRow>) => void; onDelete: () => void;
}) {
  return (
    <tr className={'ns-row is-' + row.state}>
      <td data-h="What"><Grow value={row.what} label="What" placeholder="Trial the Tesco Express trays"
        onChange={v => onPatch({ what: v })} /></td>
      <td data-h="Where"><textarea className="ns-in ns-grow" rows={1} value={row.where} aria-label="Where" placeholder="Line 10 robot"
        onChange={e => onPatch({ where: e.target.value })} /></td>
      <td data-h="Why"><Grow value={row.why} label="Why" placeholder="Prove the robot can pack them at speed"
        onChange={v => onPatch({ why: v })} /></td>
      <td data-h="Who"><textarea className="ns-in ns-grow" rows={1} value={row.who} aria-label="Who" placeholder="Name"
        onChange={e => onPatch({ who: e.target.value })} /></td>
      <td data-h="When"><input className="ns-in" value={row.when} aria-label="When" placeholder="w/c 22nd"
        onChange={e => onPatch({ when: e.target.value })} /></td>
      <td data-h="" className="ns-actions">
        <div className="ns-state" role="group" aria-label="State">
          {GROUPS.map(g => (
            <button key={g.id} className={'ns-sbtn' + (row.state === g.id ? ' on' : '')}
              aria-pressed={row.state === g.id} title={g.title}
              onClick={() => onPatch({ state: g.id })}>
              {g.id === 'todo' ? 'To do' : g.id === 'waiting' ? 'Waiting' : 'Done'}
            </button>
          ))}
        </div>
        <button className="ns-del" onClick={onDelete} aria-label="Delete this line">Delete</button>
      </td>
    </tr>
  );
}

export function PaceNextSteps() {
  const [rows, setRows] = useState<PaceTodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => { setRows(await listPaceTodos()); setLoading(false); }, []);

  // A line added on the laptop appears here without a reload — that is the
  // point of syncing it. Held back while somebody is typing in this table,
  // because re-reading mid-keystroke would flick a half-typed word back.
  useEffect(() => {
    void load();
    return onDataChange(() => {
      if (root.current?.contains(document.activeElement)) return;
      void load();
    });
  }, [load]);

  const patch = async (id: string, p: Partial<PaceTodoRow>) => {
    const next = rows.map(r => (r.id === id ? { ...r, ...p } : r));
    setRows(next);                                   // optimistic: typing stays responsive
    const row = next.find(r => r.id === id);
    if (row) await putPaceTodo(row);
  };

  const add = async () => {
    const row: PaceTodoRow = {
      id: uid(), what: '', where: '', why: '', who: '', when: '',
      state: 'todo', createdAt: Date.now(), updatedAt: Date.now(),
    };
    setRows([...rows, row]);
    await putPaceTodo(row);
  };

  const remove = async (r: PaceTodoRow) => {
    // An empty line was a mis-tap, not a decision — no dialog for that.
    const filled = [r.what, r.where, r.why, r.who, r.when].some(v => v.trim());
    if (filled && !window.confirm(`Delete this line?\n\n"${r.what || '(no description)'}"`)) return;
    setRows(rows.filter(x => x.id !== r.id));
    await deletePaceTodo(r.id);
  };

  if (loading) return <p className="sub">Loading…</p>;

  const counts = {
    todo: rows.filter(r => r.state === 'todo').length,
    waiting: rows.filter(r => r.state === 'waiting').length,
    done: rows.filter(r => r.state === 'done').length,
  };

  return (
    <div className="ns" ref={root}>
      <div className="ns-bar">
        <div className="ns-bar-stats">
          <b>{counts.todo}</b> to do · <b>{counts.waiting}</b> waiting
          {counts.done > 0 && <> · {counts.done} done</>}
        </div>
        <button className="btn btn-primary" onClick={() => void add()}>+ Add a line</button>
      </div>

      {rows.length === 0 ? (
        <div className="ns-empty">
          <p className="ns-empty-title">Nothing written down yet</p>
          <p className="ns-empty-sub">
            The things that are not tracker actions yet — a trial to run, a quote to chase,
            an answer someone owes you. Say what it is, where, why it matters, who has it and when.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => void add()}>+ Add the first one</button>
        </div>
      ) : GROUPS.map(g => {
        const mine = rows.filter(r => r.state === g.id);
        if (!mine.length) return null;
        return (
          <section key={g.id} className={'ns-group is-' + g.id}>
            <h3 className="ns-group-h">
              {g.title} <span className="ns-n">{mine.length}</span>
              {g.blurb && <span className="ns-blurb">{g.blurb}</span>}
            </h3>
            <div className="ns-scroll">
              <table className="ns-table">
                <thead>
                  <tr>
                    <th scope="col">What</th><th scope="col">Where</th><th scope="col">Why</th>
                    <th scope="col">Who</th><th scope="col">When</th><th scope="col"><span className="sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map(r => (
                    <Row key={r.id} row={r}
                      onPatch={p => void patch(r.id, p)}
                      onDelete={() => void remove(r)} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
