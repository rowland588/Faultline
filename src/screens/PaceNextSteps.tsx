/* THE ACTIONS, AS A LIST — the same actions the 6M board holds, in rows.
 *
 * One record (lib/actions): every row here is a card on the board, on the
 * same bone and the same line, and the board's editor (ui/ActionSheet) is a
 * tap away on every row. The list is for what a board cannot show at a
 * glance — the why, the where, the photos and the write-up afterwards — and
 * for a meeting run down the page rather than across it. A row written here
 * is given its bone and its line here too, so it lands in its lane on the
 * board instead of under "Not on the board yet".
 *
 * WAITING FOR is its own state rather than a separate list, because an item
 * moves: you do the thing, then you wait on someone, then it lands. One row,
 * three states, moved with one tap.
 *
 * WHY is a column and not an afterthought. A trial nobody can justify in the
 * meeting is a trial that quietly gets dropped.
 *
 * WHEN has the due day the board judges "late" by, and the free words beside
 * it — "before the Tesco launch" is a real answer a date picker cannot hold.
 *
 * Access (lib/access): a client reads the rows; the team writes them; only
 * the owner deletes, with an Undo for a few seconds. */
import { DraftArea, DraftField } from '../ui/Draft';
import { useCallback, useEffect, useRef, useState } from 'react';
import { listPaceTodos, loadPaceLines, putPaceTodo, onDataChange, type PaceLineRow, type PaceTodoRow } from '../db';
import { uid } from '../lib/ids';
import { niceDay } from '../lib/weeks';
import { pickExistingMedia } from '../lib/media';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import type { MediaRef } from '../types';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { PILLARS, pillarOf } from '../lib/pillars';
import { sixmLabel } from '../lib/sixm';
import { WHOLE_PROJECT } from '../lib/actions';
import { useAccess } from '../cloud/access';
import { ActionSheet, CauseLine, removeActionWithUndo, type Editing } from '../ui/ActionSheet';

type State = PaceTodoRow['state'];

const GROUPS: { id: State; title: string; blurb: string }[] = [
  { id: 'todo', title: 'Needs doing', blurb: 'ours to move' },
  { id: 'waiting', title: 'Waiting for', blurb: 'on someone else' },
  { id: 'done', title: 'Done', blurb: '' },
];

/* ON A PHONE THE EDITOR OPENS ON THE ROW YOU TAP. Every action's boxes open
 * at once made the list four screens long for six actions; the row shows
 * what · who · when and its state, and the boxes come out when it is wanted —
 * the line-balance pattern. A new, empty row opens by itself. A laptop has
 * the room and keeps the table as it was. */
const phone = (): boolean => {
  try { return window.matchMedia('(max-width: 720px)').matches; } catch { return false; }
};

const COLS = 9;

function Row({ row, lines, showLine, onPatch, onDelete, onOpen, onEdit, focusOutcome, onFocused, compact, open, onToggle, edit, remove }: {
  row: PaceTodoRow; lines: PaceLineRow[]; showLine: boolean;
  onPatch: (p: Partial<PaceTodoRow>) => void; onDelete: () => void;
  onOpen: (m: MediaRef) => void; onEdit: () => void;
  focusOutcome: boolean; onFocused: () => void;
  compact: boolean; open: boolean; onToggle: () => void;
  /** May change it (team and owner) / may delete it (owner). */
  edit: boolean; remove: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const media = row.media ?? [];
  const done = row.state === 'done';
  const bone = pillarOf(row);
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
  const sum = [bone ? sixmLabel(bone) : 'no bone', row.who.trim(), row.due ? `due ${niceDay(row.due)}` : row.when.trim()].filter(Boolean).join(' · ');
  const summary = compact && (
    <tr className={'ns-sum is-' + row.state}>
      <td colSpan={COLS}>
        <button type="button" className="ns-sum-b" aria-expanded={open} onClick={onToggle}>
          <span className="ns-sum-t">{row.what.trim() || 'Untitled'}</span>
          {sum && <span className="ns-sum-s">{sum}</span>}
          <span className="ns-sum-st">{row.state === 'todo' ? 'To do' : row.state === 'waiting' ? 'Waiting' : 'Done'}</span>
        </button>
      </td>
    </tr>
  );
  if (compact && !open) return summary;
  const lineName = row.lineId ? lines.find(l => l.id === row.lineId)?.name ?? '' : WHOLE_PROJECT;
  const text = (v: string | undefined) => <span className="ns-ro">{(v ?? '').trim() || '—'}</span>;
  return (
    <>
    {summary}
    <tr className={'ns-row is-' + row.state}>
      <td data-h="What">{edit
        ? <DraftArea className="ns-in ns-grow" rows={2} better="other" value={row.what} ariaLabel="What"
            placeholder="e.g. test the Tesco Express trays" onSave={v => onPatch({ what: v })} />
        : text(row.what)}</td>
      {/* THE BONE, AND THE LINE — the two things that put it in its lane on
          the board. Without them a row written here went under "Not on the
          board yet" until somebody found it there. */}
      <td data-h={showLine ? 'Bone · line' : 'Bone'} className="ns-bone-cell">
        {edit ? <>
          <select className={'ns-in ns-sel' + (bone ? '' : ' is-unset')} value={bone ?? ''} aria-label="Which bone"
            onChange={e => onPatch({ pillar: (e.target.value || undefined) as PaceTodoRow['pillar'] })}>
            <option value="">Pick a bone…</option>
            {PILLARS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          {showLine && lines.length > 0 && (
            <select className="ns-in ns-sel" value={row.lineId ?? ''} aria-label="Which line"
              onChange={e => onPatch({ lineId: e.target.value || undefined })}>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              <option value="">{WHOLE_PROJECT}</option>
            </select>
          )}
        </> : <span className="ns-ro">{bone ? sixmLabel(bone) : 'no bone yet'}{showLine ? ` · ${lineName}` : ''}</span>}
      </td>
      {/* "e.g." on every example: bare, "Line 10 robot" and "w/c 22nd" sat in
          empty boxes on every row and read as what had been written. */}
      <td data-h="Where">{edit
        ? <DraftArea className="ns-in ns-grow" rows={1} value={row.where} ariaLabel="Where"
            placeholder="e.g. the infeed" onSave={v => onPatch({ where: v })} />
        : text(row.where)}</td>
      <td data-h="Why">{edit
        ? <DraftArea className="ns-in ns-grow" rows={2} value={row.why} ariaLabel="Why"
            placeholder="e.g. prove it can pack them at speed" onSave={v => onPatch({ why: v })} />
        : text(row.why)}</td>
      <td data-h="Who">{edit
        ? <DraftArea className="ns-in ns-grow" rows={1} value={row.who} ariaLabel="Who"
            placeholder="Name" onSave={v => onPatch({ who: v })} />
        : text(row.who)}</td>
      {/* THE DUE DATE THE BOARD KEEPS, here too. The words stay for an
          answer a date cannot hold. */}
      <td data-h="When">{edit ? <>
        <DateInput className="ns-in ns-due" value={row.due ?? ''} aria-label="Due"
          onCommit={v => onPatch({ due: v || undefined })} />
        <DraftField className="ns-in" value={row.when} ariaLabel="When, in words"
          placeholder={row.due ? 'or in words' : 'or in words — e.g. w/c 22nd'} onSave={v => onPatch({ when: v })} />
      </> : text([row.due ? niceDay(row.due) : '', row.when].filter(Boolean).join(' · '))}</td>
      <td data-h="Photos">
        <div className="ns-pics">
          {media.map(m => (
            <span key={m.id} className="ns-pic">
              {/* tap the picture to throw it up full screen in the meeting */}
              <EvidenceThumb media={m} size={46} onClick={() => onOpen(m)} />
              {edit && <button className="ns-pic-x" onClick={() => drop(m)} aria-label="Remove this"><Icon name="close" size="0.85em" /></button>}
            </span>
          ))}
          {edit && (
            <button className="ns-pic-add" onClick={() => void add()} disabled={busy}
              aria-label="Add a picture or video">{busy ? '…' : '+'}</button>
          )}
          {!edit && media.length === 0 && <span className="ns-ro">—</span>}
        </div>
      </td>
      <td data-h="Outcome" className="ns-outcome-cell">
        {done && edit ? (
          <DraftArea
            areaRef={outcomeRef}
            className="ns-in ns-grow ns-outcome" rows={2} value={row.outcome ?? ''} ariaLabel="Outcome"
            placeholder={row.expect?.trim() ? `It was to change: ${row.expect.trim()} — did it?` : 'How did it end? Worked / didn’t / needs another go'}
            onSave={v => onPatch({ outcome: v })}
          />
        ) : (
          <span className="ns-outcome-wait" title={edit ? 'Mark it Done to record the outcome' : undefined}>
            {row.outcome ? row.outcome : '—'}
          </span>
        )}
      </td>
      <td data-h="" className="ns-actions">
        {edit ? (
          <div className="ns-state" role="group" aria-label="State">
            {GROUPS.map(g => (
              <button key={g.id} className={'ns-sbtn' + (row.state === g.id ? ' on' : '')}
                aria-pressed={row.state === g.id} title={g.title}
                onClick={() => onPatch({ state: g.id })}>
                {g.id === 'todo' ? 'To do' : g.id === 'waiting' ? 'Waiting' : 'Done'}
              </button>
            ))}
          </div>
        ) : <span className="ns-ro">{row.state === 'todo' ? 'To do' : row.state === 'waiting' ? 'Waiting' : 'Done'}</span>}
        <button className="ns-open" onClick={onEdit}>{edit ? 'Every field ›' : 'Open ›'}</button>
        {remove && <button className="ns-del" onClick={onDelete} aria-label="Delete this action">Delete</button>}
      </td>
    </tr>
    {/* What it should change, said before; what happened, written after. Full
        width and always here rather than behind a toggle: a trial needs room
        for a paragraph, and a plain to-do simply leaves them empty. */}
    <tr className={'ns-noterow is-' + row.state}>
      <td colSpan={COLS}>
        <div className="ns6-notes">
          <CauseLine causeRef={row.causeRef} projectId={row.projectId} lineId={row.lineId} />
          {edit ? <>
            <DraftField className="ns-in ns6-expect" value={row.expect ?? ''} ariaLabel="What it should change"
              placeholder="What it should change — e.g. changeover 48 → 30 min" onSave={v => onPatch({ expect: v || undefined })} />
            {/* Its own draft, written as you pause and when you leave it — it
                wrote the whole action to the database on every keystroke. */}
            <DraftArea
              className="ns-in ns-notes" rows={1} value={row.notes ?? ''} ariaLabel="What happened"
              placeholder="What happened — how the run went, the numbers, what we do next"
              onSave={v => onPatch({ notes: v || undefined })}
            />
          </> : <>
            {row.expect && <p className="ns-ro">Should change: {row.expect}</p>}
            {row.notes && <p className="ns-ro">{row.notes}</p>}
          </>}
        </div>
      </td>
    </tr>
    </>
  );
}

/** `lineId` narrows the list to one line's own actions, which is what makes
 *  a line's pack a pack rather than a filtered view of the project's. Left off,
 *  the project sees everything — its lines' items and anything spanning them.
 *  `withWhole` keeps the ones written for every line in a line's list too, as
 *  a 6M line's board, KPIs and by-owner view already do. */
export function PaceNextSteps({ projectId, lineId, withWhole }: { projectId: string; lineId?: string; withWhole?: boolean }) {
  const [rows, setRows] = useState<PaceTodoRow[]>([]);
  const [lines, setLines] = useState<PaceLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Editing | null>(null);
  const can = useAccess(projectId);
  const compact = phone();
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [all, ls] = await Promise.all([listPaceTodos(projectId, withWhole ? undefined : lineId), loadPaceLines(projectId)]);
    setRows(withWhole && lineId ? all.filter(r => r.lineId === lineId || !r.lineId) : all);
    setLines(ls);
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
    if (!can.edit) return;
    if (p.state === 'done') setJustDone(id);      // land the cursor in Outcome
    const next = rows.map(r => (r.id === id ? { ...r, ...p } : r));
    setRows(next);                                   // optimistic: typing stays responsive
    const row = next.find(r => r.id === id);
    if (row) await putPaceTodo(row);
  };

  /* ADDING OPENS THE ONE EDITOR — every field, the six bones first among
     them, on this line when the list is a line's. */
  const add = () => {
    if (!can.edit) return;
    const t = Date.now();
    setSheet({
      isNew: true,
      step: { id: uid(), projectId, lineId, what: '', where: '', why: '', who: '', when: '', state: 'todo', createdAt: t, updatedAt: t },
    });
  };

  const remove = async (r: PaceTodoRow) => {
    if (!can.remove) return;
    setRows(rows.filter(x => x.id !== r.id));
    await removeActionWithUndo(r);
  };

  if (loading) return <p className="sub">Loading…</p>;

  const counts = {
    todo: rows.filter(r => r.state === 'todo').length,
    waiting: rows.filter(r => r.state === 'waiting').length,
    done: rows.filter(r => r.state === 'done').length,
  };
  const unboned = rows.filter(r => !pillarOf(r)).length;
  // The line is chosen on a project's list; a line's own list is that line's.
  const showLine = !lineId && lines.length > 0;

  return (
    <div className="ns" ref={root}>
      <div className="ns-bar">
        <div className="ns-bar-stats">
          <b>{counts.todo}</b> to do · <b>{counts.waiting}</b> waiting
          {counts.done > 0 && <> · {counts.done} done</>}
          {unboned > 0 && <> · {unboned} with no bone yet</>}
        </div>
        {can.edit && <button className="btn btn-primary" onClick={add}><Icon name="plus" /> Add an action</button>}
      </div>

      {rows.length === 0 ? (
        <div className="ns-empty">
          <p className="ns-empty-title">Nothing written down yet</p>
          <p className="ns-empty-sub">
            {can.edit
              ? 'A test to run, a quote to chase, an answer someone owes you. Say what it is, which bone it sits on, where, why it matters, who has it and when, then write up what happened and attach the pictures or video.'
              : 'The team writes the actions here — what, why, who and when, and what happened.'}
          </p>
          {can.edit && <button className="btn btn-primary btn-lg" onClick={add}><Icon name="plus" /> Add the first one</button>}
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
              <table className="ns-table ns6-table">
                <thead>
                  <tr>
                    <th scope="col">What</th><th scope="col">{showLine ? 'Bone · line' : 'Bone'}</th>
                    <th scope="col">Where</th><th scope="col">Why</th>
                    <th scope="col">Who</th><th scope="col">When</th><th scope="col">Photos</th>
                    <th scope="col">Outcome</th>
                    <th scope="col"><span className="sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map(r => (
                    <Row key={r.id} row={r} lines={lines} showLine={showLine}
                      onPatch={p => void patch(r.id, p)}
                      onDelete={() => void remove(r)}
                      onOpen={setViewing}
                      onEdit={() => setSheet({ step: r, isNew: false })}
                      focusOutcome={justDone === r.id}
                      onFocused={() => setJustDone(null)}
                      compact={compact}
                      open={editing === r.id || (can.edit && !r.what.trim())}
                      onToggle={() => setEditing(editing === r.id ? null : r.id)}
                      edit={can.edit} remove={can.remove} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
      {sheet && <ActionSheet editing={sheet} lines={lines} onClose={() => { setSheet(null); void load(); }} />}
    </div>
  );
}
