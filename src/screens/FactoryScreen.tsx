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
  archiveWorkspace, deleteWorkspace, mergeLinesUndoable, projectsOnWorkspace, listAllSnags, listArchivedWorkspaces,
  listStandardsForLine, listStudiesForLine, listWorkspaces, onDataChange, restoreWorkspace, updateWorkspace, workspaceContents,
} from '../db';
import { addLineToFactory, factorySays, lineFacts, lineTypesOffered, liveProductionLines, nextLineName, placeOnFloor, asked, dualOf, dualSaid } from '../lib/lines';
import { useLineRecords } from '../lib/useLineRecords';
import { lineKit } from '../lib/lineRecords';
import { snagRow } from '../lib/snagsReport';
import { PageHeader } from '../ui/parts';
import { useCanStartProjects } from '../cloud/access';
import { useSession } from '../cloud/session';
import { useProfile } from '../cloud/admin';
import { offerUndo } from '../ui/Undo';
import { fmtRelative } from '../lib/format';
import { useProjects } from '../lib/useProjects';
import type { Snag } from '../snag/types';
import { todayISO } from '../lib/weeks';
import { factoryReading } from '../lib/factoryReport';
import { factoryClosing, factoryTiles } from '../lib/factoryLean';
import { lineDay } from '../lib/lineLoss';
import { fmtGBP } from '../lib/cost';
import { LeanClosing, LeanTiles } from '../ui/Lean';

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
  /* A LINE'S DELETE AND MERGE STAY WITH ITS OWNER (supabase/LINE_AND_STANDARD_RULES.sql;
     docs/UPGRADE-AUDIT.md S1, S7): the database keeps deleted_at for anyone
     else, so the button is not offered to them — a button the database would
     refuse is a button that lies. A line not yet synced has no owner: it is
     this device's own. */
  const { session } = useSession();
  const { profile } = useProfile();
  const owns = (w: Workspace) => !w.ownerId || (!!session && w.ownerId === session.user.id) || !!profile?.is_super;
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
  /* MERGE TWO LINES (BLUEPRINT §6.7): the line being merged, the line it goes into, and what moves, counted out loud */
  const [merging, setMerging] = useState<{ from: Workspace; to: string; what: string } | null>(null);
  /* what a merge moves, counted out loud — the line's own records and its standards and studies too */
  const mergeWhat = async (id: string) => {
    const [own, std, st] = await Promise.all([workspaceContents(id), listStandardsForLine(id), listStudiesForLine(id)]);
    const parts = [...own.map(x => `${x.count} ${x.what}`),
      ...(std.length ? [`${std.length} line standard${std.length === 1 ? '' : 's'}`] : []),
      ...(st.filter(x => !x.deletedAt).length ? [`${st.filter(x => !x.deletedAt).length} stud${st.filter(x => !x.deletedAt).length === 1 ? 'y' : 'ies'}`] : [])];
    return parts.length ? parts.join(', ') : 'nothing — it is empty';
  };
  const [showShelf, setShowShelf] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [snags, setSnags] = useState<Snag[]>([]);
  /* each line's machines and programs (docs/BLUEPRINT.md, Stage 2) */
  const rec = useLineRecords();
  const kitOf = (w: Workspace) => lineKit(w, rec.machines, rec.programs, rec.jobLines);
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
      const kit = new Map(lines.map(w => { const k = kitOf(w); return [w.id, [k.says, k.late ? `${k.late} program${k.late === 1 ? '' : 's'} late` : ''].filter(Boolean).join(' · ')]; }));
      await drawFactoryReport(doc, factoryReading(lines, snags, jobsOn, new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), Date.now(), kit));
      await deliverPdf(doc, pdfFileName('Your factory', 'report', today));
    } catch (e) {
      console.error('factory pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setPrinting(false); }
  };

  if (lines === null) return <div className="wrap fac"><p className="sub">Opening…</p></div>;
  /* THE LEAN PAGE (lib/factoryLean): the factory's own reading, as its paper
     reads it — the lines, what is open and late, what a day is worth. */
  const jobNames = new Map(projects.map(p => [p.id, p.name]));
  const reading = factoryReading(lines, snags, new Map([...on.entries()].map(([id, ids]) => [id, ids.map(x => jobNames.get(x)).filter((n): n is string => !!n)])), '');

  return (
    <div className="wrap fac">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3): what the page is, as a line's page says PRODUCTION
          LINE (it said THE BACKBONE, a word of the build's — FLOW-AUDIT #20); the way up is the bar's. */}
      <PageHeader
        eyebrow={<span className="pl-eyebrow">PRODUCTION LINES</span>}
        title="Your factory"
        says={<span className="pl-says">{factorySays(lines)}</span>}
        primary={may && !adding ? { label: 'Add lines', run: () => { setAdding(true); setAdded([]); } } : undefined}
        papers={[{ label: 'Factory report — 1 page', for: lines.length ? 'every line in floor order, with its type, its projects and what is open' : 'no line in the factory yet', disabled: !lines.length || printing, make: printFactory }]}
      />
      {lines.length > 0 && <LeanTiles tiles={factoryTiles(reading)} className="sg-tiles" />}
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
                {/* its machines in flow order, each with who made it (Stage 2) */}
                {kitOf(w).flow && <span className="fac-flow">{kitOf(w).flow}</span>}
                <span className="fac-on">
                  {c?.open ? <>{c.open} problem{c.open === 1 ? '' : 's'} open{c.late ? <> · <b className="is-r">{c.late} late</b></> : null}</> : <span className="is-n">No problems open</span>}
                  {job && <span className="fac-job">on {job}</span>}
                  {lineFacts(w).short && <span className="fac-job">{lineFacts(w).short}</span>}
                  {dualSaid(dualOf(w, lines)) && <span className="fac-job fac-dual">{dualSaid(dualOf(w, lines))}</span>}
                  {/* a day of it, in margin (lib/lineLoss lineDay) — the factory tile's share */}
                  {(m => m != null && <span className="fac-job fac-day">{fmtGBP(m)} of margin a day</span>)(lineDay(w).margin)}
                  {(() => { const k = kitOf(w); return k.says ? <span className="fac-job fac-kit">{k.says}{k.late ? <> · <b className="is-r">{k.late} program{k.late === 1 ? '' : 's'} late</b></> : null}</span> : null; })()}
                </span>
                <span className="fac-acts">
                  <button type="button" className="btn btn-sm" onClick={() => nav(`/lines/${w.id}`)}>Open ›</button>
                  {may && owns(w) && lines.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" title={`Merge ${w.name} into another line`}
                      onClick={() => void mergeWhat(w.id).then(what => setMerging({ from: w, to: '', what }))}>Merge…</button>
                  )}
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
      {/* THE CLOSING LINE — what is open and where, and what a day is worth */}
      {lines.length > 0 && <LeanClosing closing={factoryClosing(reading)} />}

      {merging && (
        <div className="fac-merge" role="group" aria-label="Merge a line">
          <h2>Merge {merging.from.name} into another line</h2>
          <p className="sub">Everything on {merging.from.name} moves to the line you pick — {merging.what} — and {merging.from.name} is archived, empty, so it can be brought back. For a line made twice.</p>
          <div className="fac-add-row">
            <select className="text-input" value={merging.to} aria-label="The line it goes into" onChange={e => setMerging({ ...merging, to: e.target.value })}>
              <option value="">Into which line…</option>
              {(lines ?? []).filter(x => x.id !== merging.from.id).map(x => <option key={x.id} value={x.id}>{x.name}{x.lineType ? ` · ${x.lineType}` : ''}</option>)}
            </select>
            <button type="button" className="btn btn-primary" disabled={!merging.to} onClick={() => {
              const into = (lines ?? []).find(x => x.id === merging.to);
              if (!into) return;
              void mergeLinesUndoable(merging.from.id, into.id).then(r => {
                setMerging(null);
                said(`${merging.from.name} merged into ${into.name} — ${r.moved} record${r.moved === 1 ? '' : 's'} moved; ${merging.from.name} archived, empty`);
                offerUndo(`${merging.from.name} merged into ${into.name}`, r.undo);
              });
            }}>Merge</button>
            <button type="button" className="btn btn-ghost" onClick={() => setMerging(null)}>Cancel</button>
          </div>
        </div>
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
                  {may && !owns(w) && <span className="sub">Only the line’s owner can delete it</span>}
                  {may && owns(w) && (
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
