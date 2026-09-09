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
import { listPaceTodos, putPaceTodo, deletePaceTodo, onDataChange, DEFAULT_PROJECT_ID, type PaceTodoRow } from '../db';
import { uid } from '../lib/ids';
import { pickExistingMedia } from '../lib/media';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import type { MediaRef } from '../types';

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

function Row({ row, onPatch, onDelete, onOpen, focusOutcome, onFocused }: {
  row: PaceTodoRow; onPatch: (p: Partial<PaceTodoRow>) => void; onDelete: () => void;
  onOpen: (m: MediaRef) => void;
  focusOutcome: boolean; onFocused: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const media = row.media ?? [];
  const done = row.state === 'done';
  /* Marking a line Done should land you straight in the Outcome box — that is
   * the moment you know what to write, and it is why the field exists.
   *
   * The parent holds the intent rather than this component: clicking Done moves
   * the row from "Needs doing" into "Done", which unmounts it and mounts a new
   * one, so a local "was it done a moment ago?" flag never survives to see it. */
  const outcomeRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusOutcome && done) { outcomeRef.current?.focus(); onFocused(); }
  }, [focusOutcome, done, onFocused]);

  const add = async () => {
    setBusy(true);
    try {
      const picked = await pickExistingMedia();
      if (picked.length) onPatch({ media: [...media, ...picked] });
    } finally { setBusy(false); }
  };
  const drop = (m: MediaRef) => {
    if (!window.confirm('Remove this?')) return;
    onPatch({ media: media.filter(x => x.id !== m.id) });
  };
  return (
    <>
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
      <td data-h="Evidence">
        <div className="ns-pics">
          {media.map(m => (
            <span key={m.id} className="ns-pic">
              {/* tap the picture to throw it up full screen in the meeting */}
              <EvidenceThumb media={m} size={46} onClick={() => onOpen(m)} />
              <button className="ns-pic-x" onClick={() => drop(m)} aria-label="Remove this">×</button>
            </span>
          ))}
          <button className="ns-pic-add" onClick={() => void add()} disabled={busy}
            aria-label="Add a picture or video">{busy ? '…' : '+'}</button>
        </div>
      </td>
      <td data-h="Outcome" className="ns-outcome-cell">
        {done ? (
          <textarea
            ref={outcomeRef}
            className="ns-in ns-grow ns-outcome" rows={2} value={row.outcome ?? ''} aria-label="Outcome"
            placeholder="How did it end? Worked / didn't / needs another go"
            onChange={e => onPatch({ outcome: e.target.value })}
          />
        ) : (
          <span className="ns-outcome-wait" title="Mark this line Done to record the outcome">
            {row.outcome ? row.outcome : '—'}
          </span>
        )}
      </td>
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
    {/* What happened, written up afterwards. Full width and always here rather
        than behind a toggle: a trial needs room for a paragraph, and a plain
        to-do simply leaves it empty, where it takes one line. */}
    <tr className={'ns-noterow is-' + row.state}>
      <td colSpan={8}>
        <textarea
          className="ns-in ns-notes" rows={1} value={row.notes ?? ''} aria-label="What happened"
          placeholder="What happened — how the run went, the numbers, what we do next"
          onChange={e => onPatch({ notes: e.target.value })}
        />
      </td>
    </tr>
    </>
  );
}

export function PaceNextSteps({ projectId = DEFAULT_PROJECT_ID }: { projectId?: string } = {}) {
  const [rows, setRows] = useState<PaceTodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => { setRows(await listPaceTodos(projectId)); setLoading(false); }, [projectId]);

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
    if (p.state === 'done') setJustDone(id);      // land the cursor in Outcome
    const next = rows.map(r => (r.id === id ? { ...r, ...p } : r));
    setRows(next);                                   // optimistic: typing stays responsive
    const row = next.find(r => r.id === id);
    if (row) await putPaceTodo(row);
  };

  const add = async () => {
    const row: PaceTodoRow = {
      id: uid(), projectId, what: '', where: '', why: '', who: '', when: '',
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
            an answer someone owes you. Say what it is, where, why it matters, who has it and when,
            then write up what happened and attach the pictures or video.
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
                    <th scope="col">Who</th><th scope="col">When</th><th scope="col">Evidence</th>
                    <th scope="col">Outcome</th>
                    <th scope="col"><span className="sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map(r => (
                    <Row key={r.id} row={r}
                      onPatch={p => void patch(r.id, p)}
                      onDelete={() => void remove(r)}
                      onOpen={setViewing}
                      focusOutcome={justDone === r.id}
                      onFocused={() => setJustDone(null)} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
