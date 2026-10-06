/* THE ACTION, EDITED — the one editor, for the board, the list and a Case.
 *
 * An action is a next step of the project (lib/actions), and on a 6M job a
 * countermeasure: what, why, the bone it sits on (lib/sixm), which line, who,
 * by when, what it should change, the cause on the fishbone it is for, where,
 * photos, what happened, how it stands, how it ended, and — once closed —
 * whether the line's numbers moved. Every field an action has is here, so
 * there is one place to write it whichever screen it was tapped on, and the
 * board, the list, the fishbone and the client report all read what was
 * written here.
 *
 * Access (lib/access): a client reads it; the team changes it; only the owner
 * deletes, and a delete can be undone for a few seconds (ui/Undo). */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';
import { PILLARS, pillarOf, type PillarKey } from '../lib/pillars';
import { GONE_WORDS, WHOLE_PROJECT, isDueSoon, isLate, parseCauseRef, useCauseNames } from '../lib/actions';
import { putPaceTodo, deletePaceTodo, getBlob, putBlob, restoreRows, type PaceLineRow, type PaceTodoRow } from '../db';
import { IMPACT_WORD, type Impact } from '../lib/impact';
import { useAccess } from '../cloud/access';
import { offerUndo } from './Undo';
import { pickExistingMedia } from '../lib/media';
import { EvidenceThumb, EvidenceViewer } from './Evidence';
import { niceDay, todayISO } from '../lib/weeks';
import type { MediaRef } from '../types';
import { Icon } from './Icon';

/** What the sheet edits — a step, or the start of a new one. */
export type Editing = { step: PaceTodoRow; isNew: boolean };

/** DELETE, WITH UNDO. The row and the photos it pointed at are kept in memory
 *  for the seconds the Undo is on screen, then let go — the same promise every
 *  other delete in the app makes. Shared by the sheet and the list. */
export async function removeActionWithUndo(row: PaceTodoRow): Promise<void> {
  const keys = (row.media ?? []).flatMap(m => [m.blobKey, m.thumbKey]).filter((k): k is string => !!k);
  const blobs = new Map<string, Blob>();
  for (const k of keys) { const b = await getBlob(k); if (b) blobs.set(k, b); }
  await deletePaceTodo(row.id);
  const what = row.what.trim();
  offerUndo(what ? `Deleted “${what.length > 40 ? what.slice(0, 39) + '…' : what}”` : 'Action deleted', async () => {
    for (const [k, b] of blobs) await putBlob(k, b);
    await restoreRows('pace_todos', [row]);
  });
}

/** The cause an action is for, said in words — the cause's own text when its
 *  problem is on this device, "on the fishbone" when it is not (yet), and
 *  "its problem was removed" (no way to it) when the problem was taken away. */
export function CauseLine({ causeRef, projectId, lineId, onGo }: {
  causeRef?: string; projectId?: string; lineId?: string; onGo?: () => void;
}) {
  const names = useCauseNames([causeRef]);
  const p = parseCauseRef(causeRef);
  if (!p) return null;
  const n = causeRef ? names.get(causeRef) : undefined;
  return (
    <p className="ax-cause">
      <span className="ax-k">FOR THE CAUSE</span>
      <span className="ax-cause-t">
        {n?.gone ? <span className="sub">{n.gone === 'problem' ? `“${n.problem}” — ${GONE_WORDS.problem}` : GONE_WORDS.cause}</span>
          : n ? <><b>{n.text}</b> <span className="sub">— {n.problem}</span></> : <span className="sub">a cause on the fishbone</span>}
      </span>
      {projectId && n?.gone !== 'problem' && (
        <button type="button" className="cw-link" onClick={() => {
          onGo?.();
          nav(`/project/${projectId}/fishbone?problem=${encodeURIComponent(p.caseId)}${lineId ? `&line=${encodeURIComponent(lineId)}` : ''}`);
        }}>Open the fishbone ›</button>
      )}
    </p>
  );
}

export function ActionSheet({ editing, lines, impact, onClose }: {
  editing: Editing; lines: PaceLineRow[]; onClose: () => void;
  /** Did it work? — the line's numbers either side of the day it closed. */
  impact?: Impact;
}) {
  const [s, setS] = useState<PaceTodoRow>(editing.step);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [busy, setBusy] = useState(false);
  const can = useAccess(s.projectId ?? '');
  const ro = !can.edit;
  const set = (p: Partial<PaceTodoRow>) => setS(x => ({ ...x, ...p }));
  const save = async () => {
    if (ro || !s.what.trim()) return;
    await putPaceTodo({
      ...s, what: s.what.trim(), who: s.who.trim(), where: s.where.trim(), when: s.when.trim(),
      expect: s.expect?.trim() || undefined, notes: s.notes?.trim() || undefined, outcome: s.outcome?.trim() || undefined,
    });
    onClose();
  };
  // The walk of the line this was raised on, where its Case lives.
  const caseWs = s.caseId ? lines.find(l => l.id === s.lineId)?.workspaceId : undefined;
  /* NOT A DOOR TO ITSELF. Opened on the case it was raised for, the sheet
     offered "Open the Case it was raised for" — the page underneath (HUNT 24). */
  const onThatCase = !!s.caseId && window.location.hash.includes(`/case/${s.caseId}`);
  const remove = async () => {
    if (!can.remove) return;
    onClose();
    await removeActionWithUndo(editing.step);
  };
  const media = s.media ?? [];
  const addMedia = async () => {
    setBusy(true);
    try {
      const picked = await pickExistingMedia();
      if (picked.length) set({ media: [...media, ...picked] });
    } finally { setBusy(false); }
  };
  const bone = pillarOf(s);
  const late = isLate(s), soon = isDueSoon(s);

  return (
    <Sheet open onClose={onClose} title={editing.isNew ? 'A new action' : 'The action'}>
      <div className="ax-form">
        {ro && <p className="sub ax-ro">You can read this action. The team keeps it up to date.</p>}
        <fieldset className="ax-fs" disabled={ro}>
          <label className="cw-f cw-f-wide"><span>WHAT HAS TO BE DONE</span>
            <textarea rows={2} value={s.what} autoFocus={editing.isNew}
              placeholder="e.g. Train the night shift on the splice"
              onChange={e => set({ what: e.target.value })} /></label>
          <label className="cw-f cw-f-wide"><span>WHY — WHAT IT FIXES</span>
            <textarea rows={2} value={s.why} placeholder="e.g. Film breaks at the splice, 20 min a shift"
              onChange={e => set({ why: e.target.value })} /></label>
        </fieldset>

        <CauseLine causeRef={s.causeRef} projectId={s.projectId} lineId={s.lineId} onGo={onClose} />
        {s.caseId && caseWs && !onThatCase && !s.causeRef && (
          <button type="button" className="cw-link" style={{ alignSelf: 'flex-start' }}
            onClick={() => { onClose(); nav(`/w/${caseWs}/case/${s.caseId}`); }}>Open the Case it was raised for ›</button>
        )}

        <fieldset className="ax-fs" disabled={ro}>
          <div className="ax-row ax-bones">
            <span className="ax-k">BONE</span>
            <BoneChips value={bone} optional onChange={k => set({ pillar: k })} />
          </div>
          <div className="ax-grid">
            {lines.length > 0 && (
              <label className="cw-f"><span>LINE</span>
                <select value={s.lineId ?? ''} onChange={e => set({ lineId: e.target.value || undefined })}>
                  {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  <option value="">{WHOLE_PROJECT}</option>
                </select></label>
            )}
            <label className="cw-f"><span>WHO</span>
              <input value={s.who} placeholder="Name" onChange={e => set({ who: e.target.value })} /></label>
            <label className="cw-f"><span>DUE{late ? <b className="ax-late"> · past its day</b> : soon ? <b className="ax-soon"> · due soon</b> : null}</span>
              <input type="date" value={s.due ?? ''} onChange={e => set({ due: e.target.value || undefined })} /></label>
            <label className="cw-f"><span>WHEN, IN WORDS <i className="cw-f-opt">optional</i></span>
              <input value={s.when} placeholder="e.g. w/c 22nd" onChange={e => set({ when: e.target.value })} /></label>
          </div>
          <label className="cw-f cw-f-wide"><span>WHAT IT SHOULD CHANGE</span>
            <input value={s.expect ?? ''} placeholder="e.g. changeover 48 → 30 min"
              onChange={e => set({ expect: e.target.value })} /></label>
          <label className="cw-f cw-f-wide"><span>WHERE <i className="cw-f-opt">optional</i></span>
            <input value={s.where} placeholder="e.g. the infeed" onChange={e => set({ where: e.target.value })} /></label>
        </fieldset>

        {/* Photos sit outside the locked fields: a client opens them too. */}
        {(media.length > 0 || !ro) && (
          <div className="ax-row ax-pics">
            <span className="ax-k">PHOTOS</span>
            <div className="ns-pics">
              {media.map(m => (
                <span key={m.id} className="ns-pic">
                  <EvidenceThumb media={m} size={52} onClick={() => setViewing(m)} />
                  {!ro && (
                    <button type="button" className="ns-pic-x" aria-label="Remove this"
                      onClick={() => set({ media: media.filter(x => x.id !== m.id) })}><Icon name="close" size="0.85em" /></button>
                  )}
                </span>
              ))}
              {!ro && (
                <button type="button" className="ns-pic-add" onClick={() => void addMedia()} disabled={busy}
                  aria-label="Add a picture or video">{busy ? '…' : '+'}</button>
              )}
            </div>
          </div>
        )}

        <fieldset className="ax-fs" disabled={ro}>
          <label className="cw-f cw-f-wide"><span>WHAT HAPPENED <i className="cw-f-opt">optional</i></span>
            <textarea rows={2} value={s.notes ?? ''} placeholder="How the run went, the numbers, what we do next"
              onChange={e => set({ notes: e.target.value })} /></label>
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
          {(s.state === 'done' || !!s.outcome) && (
            <label className="cw-f cw-f-wide"><span>HOW IT ENDED</span>
              <textarea rows={2} value={s.outcome ?? ''}
                placeholder={s.expect?.trim() ? `It was to change: ${s.expect.trim()} — did it?` : 'Worked / didn’t / needs another go'}
                onChange={e => set({ outcome: e.target.value })} /></label>
          )}
          {/* THE DAY IT WAS DONE IS NOT LOCKED (Rowland, 6 October: "I make
              mistakes"). It was stamped on the save and only printed back;
              now it is a box, and "Did it work?" splits the line's numbers
              on whatever day it says. */}
          {s.state === 'done' && !ro && (
            <label className="cw-f ax-done-on"><span>DONE ON</span>
              <input type="date" value={s.doneOn ?? todayISO()}
                onChange={e => set({ doneOn: e.target.value || undefined })} /></label>
          )}
        </fieldset>
        {s.doneOn && s.state === 'done' && ro && <p className="sub ax-done-on">Done {niceDay(s.doneOn)}.</p>}
        {impact && impact.state !== 'none' && editing.step.state === 'done' && (
          <p className={'ax-proof is-' + impact.state}>
            <b>Did it work? {IMPACT_WORD[impact.state]}.</b> {impact.words}
            <span className="sub"> The line’s numbers either side of the day it closed — the evidence, not the cause.</span>
          </p>
        )}
        <div className="ax-foot">
          {!editing.isNew && can.remove && <button className="btn btn-ghost cw-del" onClick={() => void remove()}>Delete</button>}
          <span style={{ flex: 1 }} />
          {ro ? <button className="btn btn-primary" onClick={onClose}>Close</button> : <>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!s.what.trim()} onClick={() => void save()}>
              {editing.isNew ? 'Add it' : 'Save'}
            </button>
          </>}
        </div>
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}

/** The six bones as chips — the one control every place that raises an
 *  action uses to say which bone it sits on (the board's editor, a Pareto's
 *  composer, the line balance). `optional` lets a second tap clear it. */
export function BoneChips({ value, onChange, optional, label = 'Which bone of the fishbone it sits on' }: {
  value: PillarKey | null | undefined; onChange: (k: PillarKey | undefined) => void; optional?: boolean; label?: string;
}) {
  return (
    <div className="cw-seg ax-bone-seg" role="group" aria-label={label}>
      {PILLARS.map(p => (
        <button key={p.key} type="button" className={'chip' + (value === p.key ? ' on' : '')} title={p.blurb}
          aria-pressed={value === p.key} onClick={() => onChange(optional && value === p.key ? undefined : p.key)}>{p.label}</button>
      ))}
    </div>
  );
}
