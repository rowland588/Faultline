/* A STUDY, RENAMED AND DELETED WHERE IT SITS — on its own page and on every
 * row of its tool's list (Rowland, 13 October: "always implement deletes and
 * editing in everything"; docs/AUDIT.md, bar 2).
 *
 * Until now no study could be deleted anywhere — db/studies deleteStudy had
 * no caller — and a value stream map or a work sampling study could not be
 * renamed even on its own page. One name-and-delete for all five tools'
 * pages, the three copies of the capability study's, SMED's and the loss
 * count's own Name merged into it, so a tool added later has both for free.
 *
 * Who may: on a job, the job's rule (lib/access — the team renames, the owner
 * deletes: the cloud keeps a study's deleted_at for anyone else, STUDIES.sql);
 * a quick session or a line's, its people, as on a problem (TOOLKIT 3.6).
 * The delete asks first, saying what goes with it (lib/studyLinks
 * studyRemovingSays), and Undo puts it back whole. */
import { useState } from 'react';
import { deleteStudy, patchStudy } from '../db';
import { nav } from '../state/useRoute';
import { offerUndo } from './Undo';
import { studyRemovingSays, toolListHref } from '../lib/studyLinks';
import type { ToolStudy } from '../lib/study';

/** Asked, deleted, and offered back. True when it went. */
export async function removeStudy(s: ToolStudy): Promise<boolean> {
  const said = studyRemovingSays(s);
  if (!window.confirm(said.ask)) return false;
  offerUndo(said.done, await deleteStudy(s.id));
  return true;
}

/** The study's name as its page's heading, with Rename and Delete beside it.
 *  Deleting from its own page goes back to the tool's list — on its line,
 *  when it is on one. */
export function StudyName({ s, canEdit, canRemove }: { s: ToolStudy; canEdit: boolean; canRemove: boolean }) {
  const [v, setV] = useState<string | null>(null);
  if (v === null) return (
    <h1 className="ie-name">{s.name || 'Not named'}
      {canEdit && <button type="button" className="linkish ie-rename" onClick={() => setV(s.name)}>Rename</button>}
      {canRemove && <button type="button" className="linkish ie-rename ie-del" aria-label={`Delete ${s.name || 'this study'}`}
        onClick={() => void removeStudy(s).then(gone => { if (gone) nav(toolListHref(s)); })}>Delete</button>}
    </h1>
  );
  const save = () => { if (v.trim() && v.trim() !== s.name) void patchStudy(s.id, { name: v.trim() }); setV(null); };
  return (
    <form className="ie-name-f" onSubmit={e => { e.preventDefault(); save(); }}>
      <input className="text-input" value={v} maxLength={120} autoFocus onChange={e => setV(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Escape') setV(null); }} aria-label="What it is of" />
    </form>
  );
}

/** The same two on a row of a tool's list: the name typed over in the row,
 *  Delete with Undo. `naming` is the row's own state, so the list draws the
 *  form in the row's place. */
export function StudyRowName({ s, onDone }: { s: ToolStudy; onDone: () => void }) {
  const [v, setV] = useState(s.name);
  const save = async () => {
    const t = v.trim();
    if (!t) return;
    if (t !== s.name) await patchStudy(s.id, { name: t });
    onDone();
  };
  return (
    <form className="lt-name" onSubmit={e => { e.preventDefault(); void save(); }}>
      <input className="text-input" autoFocus value={v} maxLength={120} aria-label={`The study's name — ${s.name || 'Not named'}`} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onDone(); }} />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!v.trim()}>Save</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
    </form>
  );
}
