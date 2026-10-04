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
import { DraftArea, DraftField } from '../ui/Draft';
import { useCallback, useEffect, useRef, useState } from 'react';
import { listPaceTodos, putPaceTodo, deletePaceTodo, onDataChange, type PaceTodoRow } from '../db';
import { uid } from '../lib/ids';
import { niceDay } from '../lib/weeks';
import { pickExistingMedia } from '../lib/media';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import type { MediaRef } from '../types';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';

type State = PaceTodoRow['state'];

const GROUPS: { id: State; title: string; blurb: string }[] = [
  { id: 'todo', title: 'Needs doing', blurb: 'ours to move' },
  { id: 'waiting', title: 'Waiting for', blurb: 'on someone else' },
  { id: 'done', title: 'Done', blurb: '' },
];

/* ON A PHONE THE EDITOR OPENS ON THE ROW YOU TAP. Every action's eight boxes
 * open at once made the list four screens long for six actions; the row shows
 * what · who · when and its state, and the boxes come out when it is wanted —
 * the line-balance pattern. A new, empty row opens by itself. A laptop has
 * the room and keeps the table as it was. */
const phone = (): boolean => {
  try { return window.matchMedia('(max-width: 720px)').matches; } catch { return false; }
};

function Row({ row, onPatch, onDelete, onOpen, focusOutcome, onFocused, compact, open, onToggle }: {
  row: PaceTodoRow; onPatch: (p: Partial<PaceTodoRow>) => void; onDelete: () => void;
  onOpen: (m: MediaRef) => void;
  focusOutcome: boolean; onFocused: () => void;
  compact: boolean; open: boolean; onToggle: () => void;
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
  /* The day it is due is the board's — the one "late" is judged by — so it
     is what the shut row says; the words in When only stand in without one. */
  const sum = [row.who.trim(), row.due ? `due ${niceDay(row.due)}` : row.when.trim()].filter(Boolean).join(' · ');
  const summary = compact && (
    <tr className={'ns-sum is-' + row.state}>
      <td colSpan={8}>
        <button type="button" className="ns-sum-b" aria-expanded={open} onClick={onToggle}>
          <span className="ns-sum-t">{row.what.trim() || 'Untitled'}</span>
          {sum && <span className="ns-sum-s">{sum}</span>}
          <span className="ns-sum-st">{row.state === 'todo' ? 'To do' : row.state === 'waiting' ? 'Waiting' : 'Done'}</span>
        </button>
      </td>
    </tr>
  );
  if (compact && !open) return summary;
  return (
    <>
    {summary}
    <tr className={'ns-row is-' + row.state}>
      <td data-h="What"><DraftArea className="ns-in ns-grow" rows={2} value={row.what} ariaLabel="What"
        placeholder="e.g. test the Tesco Express trays" onSave={v => onPatch({ what: v })} /></td>
      {/* "e.g." on every example: bare, "Line 10 robot" and "w/c 22nd" sat in
          empty boxes on every row and read as what had been written. */}
      <td data-h="Where"><DraftArea className="ns-in ns-grow" rows={1} value={row.where} ariaLabel="Where"
        placeholder="e.g. the infeed" onSave={v => onPatch({ where: v })} /></td>
      <td data-h="Why"><DraftArea className="ns-in ns-grow" rows={2} value={row.why} ariaLabel="Why"
        placeholder="e.g. prove it can pack them at speed" onSave={v => onPatch({ why: v })} /></td>
      <td data-h="Who"><DraftArea className="ns-in ns-grow" rows={1} value={row.who} ariaLabel="Who"
        placeholder="Name" onSave={v => onPatch({ who: v })} /></td>
      {/* THE DUE DATE THE BOARD KEEPS, here too. This list only had the words,
          so an action due (and late) on the board showed an empty When — and
          could not be given a date from here. The words stay for an answer a
          date cannot hold. */}
      <td data-h="When">
        <DateInput className="ns-in ns-due" value={row.due ?? ''} aria-label="Due"
          onCommit={v => onPatch({ due: v || undefined })} />
        <DraftField className="ns-in" value={row.when} ariaLabel="When, in words"
          placeholder={row.due ? 'or in words' : 'or in words — e.g. w/c 22nd'} onSave={v => onPatch({ when: v })} />
      </td>
      <td data-h="Photos">
        <div className="ns-pics">
          {media.map(m => (
            <span key={m.id} className="ns-pic">
              {/* tap the picture to throw it up full screen in the meeting */}
              <EvidenceThumb media={m} size={46} onClick={() => onOpen(m)} />
              <button className="ns-pic-x" onClick={() => drop(m)} aria-label="Remove this"><Icon name="close" size="0.85em" /></button>
            </span>
          ))}
          <button className="ns-pic-add" onClick={() => void add()} disabled={busy}
            aria-label="Add a picture or video">{busy ? '…' : '+'}</button>
        </div>
      </td>
      <td data-h="Outcome" className="ns-outcome-cell">
        {done ? (
          <DraftArea
            areaRef={outcomeRef}
            className="ns-in ns-grow ns-outcome" rows={2} value={row.outcome ?? ''} ariaLabel="Outcome"
            placeholder="How did it end? Worked / didn't / needs another go"
            onSave={v => onPatch({ outcome: v })}
          />
        ) : (
          <span className="ns-outcome-wait" title="Mark it Done to record the outcome">
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
        <button className="ns-del" onClick={onDelete} aria-label="Delete this action">Delete</button>
      </td>
    </tr>
    {/* What happened, written up afterwards. Full width and always here rather
        than behind a toggle: a trial needs room for a paragraph, and a plain
        to-do simply leaves it empty, where it takes one line. */}
    <tr className={'ns-noterow is-' + row.state}>
      <td colSpan={8}>
        {/* Its own draft, written as you pause and when you leave it — it
            wrote the whole action to the database on every keystroke. */}
        <DraftArea
          className="ns-in ns-notes" rows={1} value={row.notes ?? ''} ariaLabel="What happened"
          placeholder="What happened — how the run went, the numbers, what we do next"
          onSave={v => onPatch({ notes: v || undefined })}
        />
      </td>
    </tr>
    </>
  );
}

/** `lineId` narrows the list to one line's own next steps, which is what makes
 *  a line's pack a pack rather than a filtered view of the project's. Left off,
 *  the project sees everything — its lines' items and anything spanning them.
 *  `withWhole` keeps the ones written for every line in a line's list too, as
 *  a 3P line's board, KPIs and by-owner view already do. */
export function PaceNextSteps({ projectId, lineId, withWhole }: { projectId: string; lineId?: string; withWhole?: boolean }) {
  const [rows, setRows] = useState<PaceTodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const compact = phone();
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const all = await listPaceTodos(projectId, withWhole ? undefined : lineId);
    setRows(withWhole && lineId ? all.filter(r => r.lineId === lineId || !r.lineId) : all);
    setLoading(false);
  }, [projectId, lineId, withWhole]);

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
      id: uid(), projectId, lineId, what: '', where: '', why: '', who: '', when: '',
      state: 'todo', createdAt: Date.now(), updatedAt: Date.now(),
    };
    setRows([...rows, row]);
    setEditing(row.id);   // on a phone the new row stays open while it is filled in
    await putPaceTodo(row);
  };

  const remove = async (r: PaceTodoRow) => {
    // An empty line was a mis-tap, not a decision — no dialog for that.
    const filled = [r.what, r.where, r.why, r.who, r.when].some(v => v.trim());
    if (filled && !window.confirm(`Delete this action?\n\n"${r.what || '(no description)'}"`)) return;
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
        <button className="btn btn-primary" onClick={() => void add()}><Icon name="plus" /> Add an action</button>
      </div>

      {rows.length === 0 ? (
        <div className="ns-empty">
          <p className="ns-empty-title">Nothing written down yet</p>
          <p className="ns-empty-sub">
            A test to run, a quote to chase, an answer someone owes you. Say what it is, where,
            why it matters, who has it and when, then write up what happened and attach the
            pictures or video.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => void add()}><Icon name="plus" /> Add the first one</button>
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
                    <th scope="col">Who</th><th scope="col">When</th><th scope="col">Photos</th>
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
                      onFocused={() => setJustDone(null)}
                      compact={compact}
                      open={editing === r.id || !r.what.trim()}
                      onToggle={() => setEditing(editing === r.id ? null : r.id)} />
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
