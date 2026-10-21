/* THE JOB'S NAME, RENAMED WHERE IT IS READ. Rowland, 12 October: "add edit
 * project name ... now." The name could only be changed on Details, inside
 * The project's fold, where nobody looking at the job's front page would
 * think to go. So the name on the front page carries its own Rename, for
 * whoever may change what was agreed (lib/access can.agree — the owner, as on
 * Details: the database's trigger keeps the agreed fields for anyone else).
 * Details keeps its box too: the same record, two ways to it. The new name is
 * the job's everywhere at once — the top bar, the rail, Home, every report
 * (lib/useProjects rename redraws the live list). */
import { useEffect, useState } from 'react';
import { useProjects } from '../lib/useProjects';
import { Icon } from './Icon';
import { offerUndo } from './Undo';
import type { Project } from '../types';

export function ProjectTitle({ project, canRename }: { project: Project; canRename: boolean }) {
  const { rename } = useProjects();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  /* The new name at once, while the job's live list catches up (a moment). */
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { if (pending != null && project.name === pending) setPending(null); }, [project.name, pending]);
  const shown = pending ?? project.name;
  const save = async () => {
    const name = draft.trim();
    setEditing(false);
    if (!name || name === project.name) return;
    const before = project.name;
    setPending(name);
    await rename(project, { name, updatedAt: Date.now() });
    offerUndo(`Renamed to “${name}”`, async () => { await rename({ ...project, name }, { name: before, updatedAt: Date.now() }); });
  };
  if (editing) {
    return (
      <form className="ptitle-form" onSubmit={e => { e.preventDefault(); void save(); }}>
        <input className="text-input ptitle-input" value={draft} autoFocus maxLength={120} aria-label="The project's name"
          onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setDraft(project.name); setEditing(false); } }} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraft(project.name); setEditing(false); }}>Cancel</button>
      </form>
    );
  }
  return (
    <h1 className="pace-title ptitle">
      <span>{shown}</span>
      {canRename && (
        <button type="button" className="btn btn-ghost btn-sm ptitle-edit" aria-label={`Rename ${shown}`} onClick={() => { setDraft(shown); setEditing(true); }}>
          <Icon name="pencil" size="0.95em" />Rename
        </button>
      )}
    </h1>
  );
}
