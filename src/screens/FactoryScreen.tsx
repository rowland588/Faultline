/* YOUR FACTORY — the production lines, set up and edited in one place.
 *
 * Rowland, 13 October: "build a stronger backbone ... a factory setup before
 * the new projects ... your production lines. So then we were able to assign
 * everything to a production line ... Next time I go on, I should be able to
 * go and edit as well, of course, my factory. Build your factory, edit your
 * factory, let me put more lines, change the types, the names of the lines.
 * Again, always full edit control."
 *
 * WHICH RECORD: the line (a Workspace), the record every problem, study and
 * standard already hangs off — its name, its type and its place on the floor
 * (supabase/FACTORY.sql). Nothing new beside it. WHERE IT SHOWS: the control
 * room's Your factory (first, above the jobs), the rail's Your factory, each
 * line's own page (its type under its name, and on its paper), and the order
 * lines are listed in everywhere (lib/lines byFloor).
 *
 * The page answers: what the factory is (the lines in floor order, their
 * types, what is open on each), and lets every part of it be changed where it
 * sits — a name typed over, a type picked or typed, a line moved up or down,
 * several lines added one after another, a line put away and brought back. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Workspace } from '../types';
import { nav } from '../state/useRoute';
import {
  archiveWorkspace, deleteWorkspace, projectsOnWorkspace, listAllSnags, listArchivedWorkspaces,
  listWorkspaces, onDataChange, restoreWorkspace, updateWorkspace, workspaceContents,
} from '../db';
import { addLineToFactory, factorySays, lineTypesOffered, liveProductionLines, nextLineName, placeOnFloor, asked } from '../lib/lines';
import { snagRow } from '../lib/snagsReport';
import { Icon } from '../ui/Icon';
import { useCanStartProjects } from '../cloud/access';
import { fmtRelative } from '../lib/format';
import { useProjects } from '../lib/useProjects';
import type { Snag } from '../snag/types';
import { todayISO } from '../lib/weeks';

/** A box that keeps what is typed and saves it when the person is done —
 *  Enter or leaving the box; Escape puts the last saved words back. Never a
 *  write per keystroke. */
function CommitBox({ value, onCommit, label, list, placeholder, disabled }: {
  value: string; onCommit: (v: string) => void; label: string; list?: string; placeholder?: string; disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { if (draft.trim() !== value.trim()) onCommit(draft.trim()); };
  return (
    <input className="text-input fac-box" value={draft} aria-label={label} list={list} placeholder={placeholder} maxLength={80} disabled={disabled}
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur(); }
        if (e.key === 'Escape') { setDraft(value); }
      }} />
  );
}

export function FactoryScreen() {
  const may = useCanStartProjects();
  const [lines, setLines] = useState<Workspace[] | null>(null);
  const [shelved, setShelved] = useState<Workspace[]>([]);
  const [open, setOpen] = useState<Map<string, { open: number; late: number }>>(new Map());
  const [on, setOn] = useState<Map<string, string[]>>(new Map());
  const { projects } = useProjects();
  const [adding, setAdding] = useState(() => asked('add') === '1');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [showShelf, setShowShelf] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [snags, setSnags] = useState<Snag[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    const [ws, arch, snags] = await Promise.all([listWorkspaces(), listArchivedWorkspaces(), listAllSnags()]);
    setSnags(snags);
    const live = await liveProductionLines(ws);
    /* what is open on each line, counted as its own page counts it */
    const counts = new Map<string, { open: number; late: number }>();
    for (const s of snags) {
      if (s.deletedAt || s.archivedAt || s.status === 'closed') continue;
      const c = counts.get(s.workspaceId) ?? { open: 0, late: 0 };
      c.open++;
      if (snagRow(s, '').late) c.late++;
      counts.set(s.workspaceId, c);
    }
    /* every job each line is on — a line of the factory can be on several */
    const on = await Promise.all(live.map(async w => [w.id, await projectsOnWorkspace(w.id)] as const));
    setOn(new Map(on.filter(([, ids]) => ids.length).map(([id, ids]) => [id, ids])));
    setOpen(counts);
    setShelved([...arch].sort((a, b) => b.updatedAt - a.updatedAt));
    setLines(live);
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const said = (what: string) => {
    setSaved(what);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(null), 2600);
  };
  const types = useMemo(() => lineTypesOffered(lines ?? []), [lines]);
  const guess = useMemo(() => nextLineName(lines ?? []), [lines]);

  const put = async (w: Workspace, patch: Partial<Workspace>, what: string) => {
    await updateWorkspace({ ...w, ...patch });
    said(what);
  };
  const move = async (w: Workspace, to: number) => {
    for (const x of placeOnFloor(lines ?? [], w.id, to)) await updateWorkspace(x);
    said(`${w.name} moved`);
  };
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    /* the new line goes at the end of the floor, with the type typed (lib/lines) */
    await addLineToFactory(n, type);
    setAdded(a => [...a, n]);
    setName('');
    nameRef.current?.focus();
  };

  /* THE FACTORY ON PAPER — every line in floor order, its type, the jobs on
     it and what is open on it (lib/factoryReport, lib/factoryPdf). */
  const printFactory = async () => {
    if (!lines?.length || printing) return;
    setPrinting(true);
    try {
      const { loadPdfLib, deliverPdf, titlePdf } = await import('../lib/savePdf');
      const { factoryReading } = await import('../lib/factoryReport');
      const { drawFactoryReport } = await import('../lib/factoryPdf');
      const { pdfFileName } = await import('../lib/fileName');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      titlePdf(doc, 'Your factory');
      const names = new Map(projects.map(p => [p.id, p.name]));
      const jobsOn = new Map([...on.entries()].map(([id, ids]) => [id, ids.map(x => names.get(x)).filter((n): n is string => !!n)]));
      const today = todayISO();
      await drawFactoryReport(doc, factoryReading(lines, snags, jobsOn, new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })));
      await deliverPdf(doc, pdfFileName('Your factory', 'report', today));
    } catch (e) {
      console.error('factory pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setPrinting(false); }
  };

  if (lines === null) return <div className="wrap fac"><p className="sub">Opening…</p></div>;

  return (
    <div className="wrap fac">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">THE BACKBONE</p>
          <h1>Your factory</h1>
          <p className="pl-says">{factorySays(lines)}</p>
        </div>
        <div className="pace-head-actions">
          {may && !adding && <button type="button" className="btn btn-primary" onClick={() => { setAdding(true); setAdded([]); }}>Add lines</button>}
          <button type="button" className="btn" disabled={!lines.length || printing} onClick={() => void printFactory()}><Icon name="document" size="1.05em" />Factory report</button>
        </div>
      </header>
      <p className="sub fac-why">
        Your production lines, in the order they stand on the floor. Every project, problem and tool hangs off one of them
        — open a line to take a problem on it or use a tool on it, no project needed.
        {may ? ' Type over a name or a type to change it; move a line up or down; add as many as you have.' : ' Only someone invited to the app changes the factory.'}
      </p>
      {saved && <p className="fac-saved" role="status">Saved — {saved}</p>}

      <datalist id="fac-types">{types.map(t => <option key={t} value={t} />)}</datalist>

      {adding && may && (
        <form className="fac-add" aria-label="Add lines" onSubmit={e => { e.preventDefault(); void add(); }}>
          <h2>Add lines</h2>
          <p className="sub">One after another — add one, the box clears for the next. The type stays as you left it.</p>
          <div className="fac-add-row">
            <input ref={nameRef} className="text-input" autoFocus value={name} maxLength={80} placeholder={`e.g. ${guess}`}
              aria-label="The new line's name" onChange={e => setName(e.target.value)} />
            <input className="text-input" value={type} maxLength={80} list="fac-types" placeholder="Type — e.g. Packing"
              aria-label="The new line's type" onChange={e => setType(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={!name.trim()}>Add line</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setAdding(false); setName(''); setAdded([]); }}>Done</button>
          </div>
          {added.length > 0 && <p className="fac-added" role="status">Added {added.join(', ')}.</p>}
        </form>
      )}

      {lines.length === 0 && !adding && (
        <div className="fac-empty">
          <p>No lines yet. Set up your factory first — add your production lines, each with its name and its type. Then every project, problem and tool hangs off one.</p>
          {may && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>Add lines</button>}
        </div>
      )}

      {lines.length > 0 && (
        <ol className="fac-lines" aria-label="The lines, in floor order">
          {lines.map((w, i) => {
            const c = open.get(w.id);
            /* the live jobs it is on, by name; one archived job never holds a line */
            const job = (on.get(w.id) ?? []).map(id => projects.find(p => p.id === id)?.name).filter(Boolean).join(', ');
            return (
              <li key={w.id} className="fac-line" data-line={w.name}>
                {may && (
                  <span className="fac-move">
                    <button type="button" className="fac-mv" disabled={i === 0} aria-label={`Move ${w.name} up`} onClick={() => void move(w, i - 1)}>▲</button>
                    <button type="button" className="fac-mv" disabled={i === lines.length - 1} aria-label={`Move ${w.name} down`} onClick={() => void move(w, i + 1)}>▼</button>
                  </span>
                )}
                <span className="fac-n" aria-hidden>{i + 1}</span>
                <span className="fac-fields">
                  <CommitBox value={w.name} label={`${w.name}'s name`} disabled={!may}
                    onCommit={v => { if (v) void put(w, { name: v }, `${w.name} is now ${v}`); }} />
                  <CommitBox value={w.lineType ?? ''} label={`${w.name}'s type`} list="fac-types" placeholder="Type — e.g. Packing" disabled={!may}
                    onCommit={v => void put(w, { lineType: v || undefined }, v ? `${w.name} is a ${v} line` : `${w.name} has no type`)} />
                </span>
                <span className="fac-on">
                  {c?.open ? <>{c.open} problem{c.open === 1 ? '' : 's'} open{c.late ? <> · <b className="is-r">{c.late} late</b></> : null}</> : <span className="is-n">No problems open</span>}
                  {job && <span className="fac-job">on {job}</span>}
                </span>
                <span className="fac-acts">
                  <button type="button" className="btn btn-sm" onClick={() => nav(`/lines/${w.id}`)}>Open ›</button>
                  {may && !job && (
                    <button type="button" className="btn btn-ghost btn-sm" title={`Archive ${w.name}`}
                      onClick={() => {
                        if (!confirm(`Archive “${w.name}”?\n\nIt leaves the factory and loses nothing — its problems, captures, the walk and the evidence all stay. You can restore it whenever you like.`)) return;
                        void archiveWorkspace(w.id).then(() => said(`${w.name} archived`));
                      }}>Archive</button>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* THE ARCHIVE — lines put away, behind one tap, each brought back with one. */}
      {shelved.length > 0 && (
        <div className="proj-arch">
          <button className="proj-arch-h" onClick={() => setShowShelf(v => !v)} aria-expanded={showShelf}>
            <span>Archived lines</span>
            <span className="proj-arch-n">{shelved.length}</span>
            <span className="proj-arch-x" aria-hidden>{showShelf ? '−' : '+'}</span>
          </button>
          {showShelf && (
            <div className="proj-arch-list">
              {shelved.map(w => (
                <div key={w.id} className="proj-arch-row">
                  <span className="proj-arch-dot" style={{ background: w.color }} aria-hidden />
                  <span className="proj-arch-main">
                    <span className="proj-arch-t">{w.name}{w.lineType ? ` · ${w.lineType}` : ''}</span>
                    <span className="proj-arch-s">Archived · {fmtRelative(w.updatedAt)}</span>
                  </span>
                  {may && <button className="btn btn-ghost btn-sm" onClick={() => void restoreWorkspace(w.id).then(() => said(`${w.name} restored`))}>Restore</button>}
                  {/* DELETING A LINE DESTROYS FILM THAT EXISTS NOWHERE ELSE, so the confirm counts it out loud first. */}
                  {may && (
                    <button className="btn btn-sm proj-arch-del"
                      onClick={() => void (async () => {
                        const owned = await workspaceContents(w.id);
                        const what = owned.length ? owned.map(x => `${x.count} ${x.what}`).join('\n  ') : 'nothing — it is empty';
                        if (!confirm(`Delete “${w.name}” for ever?\n\nThis also deletes:\n  ${what}\n\nThe videos and photographs go with it, and they exist nowhere else.\n\nThis cannot be undone, on any device.`)) return;
                        await deleteWorkspace(w.id);
                        void load();
                      })()}>
                      Delete for ever
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
