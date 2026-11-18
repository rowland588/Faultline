import { MachineRow } from '../line/LineMachineRow';
import { areasOf, areaKey, areaTitle } from '../lib/areas';
import { departmentsOf } from '../lib/departments';
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
import { productionDataOn } from '../lib/production/switch';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Workspace } from '../types';
import { nav } from '../state/useRoute';
import {
  archiveWorkspace, deleteWorkspace, mergeLinesUndoable, projectsOnWorkspace, listAllSnags, listArchivedWorkspaces,
  listStandardsForLine, listStudiesForLine, listWorkspaces, onDataChange, restoreWorkspace, patchWorkspaceRecord, workspaceContents,
} from '../db';
import { addLineToFactory, factorySays, lineTypesOffered, liveProductionLines, nextLineName, placeOnFloor, asked, dualOf, dualSaid, placeWordsOffered } from '../lib/lines';
import { useLineRecords } from '../lib/useLineRecords';
import { lineKit } from '../lib/lineRecords';
import { MoreMenu, PageHeader } from '../ui/parts';
import { CustomersPanel } from '../ui/CustomersPanel';
import { CustomerBrief } from '../ui/CustomerBrief';
import { BusinessPanel } from '../ui/BusinessPanel';
import { useClientScope } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { EmptyState } from '../ui/EmptyState';
import { useCanStartProjects } from '../cloud/access';
import { useSession } from '../cloud/session';
import { useProfile } from '../cloud/admin';
import { offerUndo } from '../ui/Undo';
import { fmtRelative } from '../lib/format';
import { useProjects } from '../lib/useProjects';
import type { Snag } from '../snag/types';
import { todayISO } from '../lib/weeks';
import { LineDetailsForm } from '../ui/LineDetailsForm';
import { Fold, showFold } from '../ui/Fold';

export function FactoryScreen() {
  const may = useCanStartProjects();
  useEffect(() => {
    const reveal = () => { if (asked('customer') === 'new') showFold('setup-business'); };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  /* the departments' names, offered in every line's Area box beside the lines' own words (docs/AREAS.md A4) */
  const [deptNames, setDeptNames] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    const read = () => void import('../db/departments').then(m => m.listDepartments()).then(l => { if (live) setDeptNames(l.map(d => d.facts.area)); });
    read();
    const off = onDataChange(read);
    return () => { live = false; off(); };
  }, []);
  /* A LINE'S DELETE AND MERGE STAY WITH ITS OWNER (supabase/LINE_AND_STANDARD_RULES.sql;
     docs/UPGRADE-AUDIT.md S1, S7): the database keeps deleted_at for anyone
     else, so the button is not offered to them — a button the database would
     refuse is a button that lies. A line not yet synced has no owner: it is
     this device's own. */
  const { session } = useSession();
  const { profile } = useProfile();
  const owns = (w: Workspace) => !w.ownerId || (!!session && w.ownerId === session.user.id) || !!profile?.is_super;
  const [allLines, setLines] = useState<Workspace[] | null>(null);
  /* an ARCHIVED CUSTOMER's lines are not set up here (lib/customers, C2a) — kept exactly as they were, back when it is continued */
  const cs = useClientScope();
  const lines = useMemo(() => { const gone = new Set(cs.archived.map(c => customerKey(c.name))); return allLines && allLines.filter(w => !gone.has(customerKey(w.clientName)) && cs.line(w.id)); }, [allLines, cs]);
  const [shelved, setShelved] = useState<Workspace[]>([]);
  const [on, setOn] = useState<Map<string, string[]>>(new Map());
  const { projects } = useProjects();
  const [adding, setAdding] = useState(() => asked('add') === '1');
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [dirtyLine, setDirtyLine] = useState<string | null>(null);
  const editLine = (id: string) => {
    if (editingLine && dirtyLine === editingLine && !window.confirm('Discard unsaved line changes?')) return;
    setDirtyLine(null);
    setEditingLine(editingLine === id ? null : id);
  };
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
    /* every job each line is on — a line of the factory can be on several */
    const on = await Promise.all(live.map(async w => [w.id, await projectsOnWorkspace(w.id)] as const));
    setOn(new Map(on.filter(([, ids]) => ids.length).map(([id, ids]) => [id, ids])));
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

  const move = async (w: Workspace, to: number, within = lines ?? []) => {
    const target = within[to];
    if (!target) return;
    for (const x of placeOnFloor(allLines ?? [], w.id, (allLines ?? []).findIndex(l => l.id === target.id))) await patchWorkspaceRecord(x.id, { floorOrder: x.floorOrder });
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
      titlePdf(doc, 'Factory report');
      const names = new Map(projects.map(p => [p.id, p.name]));
      const jobsOn = new Map([...on.entries()].map(([id, ids]) => [id, ids.map(x => names.get(x)).filter((n): n is string => !!n)]));
      const today = todayISO();
      const kit = new Map(lines.map(w => { const k = kitOf(w); return [w.id, [k.says, k.late ? `${k.late} program${k.late === 1 ? '' : 's'} late` : ''].filter(Boolean).join(' · ')]; }));
      await drawFactoryReport(doc, factoryReading(lines, snags, jobsOn, new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), Date.now(), kit));
      await deliverPdf(doc, pdfFileName('Factory', 'report', today));
    } catch (e) {
      console.error('factory pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setPrinting(false); }
  };

  const grouped = areasOf(lines ?? [], true);
  const setupGroups = [
    ...grouped.areas.map(g=>({...g,key:areaKey(g.id)})),
    ...departmentsOf(rec.studies).filter(d=>(!cs.client || d.facts.client===cs.client) && !grouped.areas.some(g=>areaKey(g.id)===areaKey(d.area))).map(d=>({key:areaKey(d.area),id:d.area,title:areaTitle(d.area),lines:[] as Workspace[]})),
    ...(grouped.noArea.length ? [{key:'unassigned',id:undefined,title:'Lines without an area',lines:grouped.noArea}] : []),
  ];
  if (lines === null || !cs.ready) return <div className="wrap fac"><p className="sub">Opening…</p></div>;
  /* THE LEAN PAGE (lib/factoryLean): the factory's own reading, as its paper
     reads it — the lines, what is open and late, what a day is worth. */

  return (
    <div className="wrap fac">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3): what the page is, as a line's page says PRODUCTION
          LINE (it said THE BACKBONE, a word of the build's — FLOW-AUDIT #20); the way up is the bar's. */}
      <PageHeader
        eyebrow={<span className="pl-eyebrow">FACTORY</span>}
        /* the lines are set up here (27 October — Rowland: "put the lines in the setup because it's factory setup") */
        title="Set up"
        says={<span className="pl-says">{factorySays(lines)}</span>}
        primary={may && !adding ? { label: 'Add lines', run: () => { setAdding(true); setAdded([]); } } : undefined}
        papers={[{ label: 'Factory report — 1 page', for: lines.length ? 'every line in floor order, with its type, its projects and what is open' : 'no line in the factory yet', disabled: !lines.length || printing, make: printFactory }]}
      />
      <p className="sub fac-why">Areas contain lines; each line contains its machines. Edit names and order where they sit.</p>
      {saved && <p className="fac-saved" role="status">Saved — {saved}</p>}
      <datalist id="fac-types">{types.map(t => <option key={t} value={t} />)}</datalist>
      <datalist id="fac-clients">{placeWordsOffered(lines ?? [], 'clientName').map(t => <option key={t} value={t} />)}</datalist>
      <datalist id="fac-sites">{placeWordsOffered(lines ?? [], 'siteName').map(t => <option key={t} value={t} />)}</datalist>
      {/* every area the factory has — its lines' words and its departments (docs/AREAS.md A4: one area, one name) */}
      <datalist id="fac-areas">{[...new Set([...placeWordsOffered(lines ?? [], 'areaName'), ...deptNames])].map(t => <option key={t} value={t} />)}</datalist>

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
        <EmptyState className="blank-list" title="No lines yet"
          action={may ? <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>Add lines</button> : undefined}>
          Set up your factory first — add your production lines, each with its name and its type. Then every project, problem and tool hangs off one.
        </EmptyState>
      )}

      {setupGroups.length > 0 && (
        <div className="ep-panel fac-plan" aria-label="Lines on the floor">
          {setupGroups.map(group=><section key={group.key} className="fac-setup-area" data-setup-area={group.title}>
            <h2>{group.title}</h2>
            {group.id?.client && !cs.client && <p className="sub">{group.id.client}</p>}
            {!group.lines.length && <p className="sub">No lines in this area yet.</p>}
        <ol className="fac-lines" aria-label="The lines, in floor order">
          {group.lines.map((w, i) => {
            /* the live jobs it is on, by name; one archived job never holds a line */
            const job = (on.get(w.id) ?? []).map(id => projects.find(p => p.id === id)?.name).filter(Boolean).join(', ');
            return (
              <li key={w.id} className="fac-line" data-line={w.name} data-type={w.lineType ?? ''}>
                <span className="fac-n" aria-label={`Line ${i + 1} in ${group.title}`}>{i + 1}</span>
                <div className="fac-fields">
                  <a className="fac-line-name" href={`#/lines/${w.id}`}><b>{w.name}</b> ›</a>
                  {[w.lineType, w.siteName, w.areaName].filter(Boolean).length > 0 && <span className="sub">{[w.lineType, w.siteName, w.areaName].filter(Boolean).join(' · ')}</span>}
                  {editingLine === w.id && <div className="fac-edit-fields">
                    <LineDetailsForm key={w.id} compact line={w} onSaved={() => said(`${w.name} details`)} onDirtyChange={dirty=>setDirtyLine(dirty?w.id:null)} offered={{ lineType: types, clientName: placeWordsOffered(lines, 'clientName'), siteName: placeWordsOffered(lines, 'siteName'), areaName: [...new Set([...placeWordsOffered(lines, 'areaName'), ...deptNames])] }} />
                    {may && <label className="fac-position"><span className="sub">Order in {group.title}</span><select className="text-input" aria-label={`Position of ${w.name}`} value={i} onChange={e => void move(w, Number(e.target.value), group.lines)}>{group.lines.map((_, n) => <option key={n} value={n}>{n + 1}</option>)}</select></label>}
                  </div>}
                  {dualSaid(dualOf(w, lines)) && <span className="sub fac-dual">{dualSaid(dualOf(w, lines))}</span>}
                </div>
                {(() => {
                  const k=kitOf(w),named=k.machines.filter(m=>m.name.trim() && m.name.trim().toLowerCase()!=='whole line');
                  return <div className="fac-machines" aria-label={`Machines on ${w.name}`}>
                    <span className="sub">{named.length ? `${named.length} machine${named.length === 1 ? '' : 's'}` : 'No machines yet'}</span>
                    {editingLine !== w.id && named.slice(0,3).map(m=><a key={m.name} href={`#/lines/${encodeURIComponent(w.id)}/machine/${encodeURIComponent(m.name)}`}>{m.name}</a>)}
                    {editingLine !== w.id && named.length>3 && <span className="sub">+{named.length-3} more</span>}
                    {editingLine === w.id && <>
                      {named.length>0 && <ul className="pl-machines">{named.map(m=><MachineRow key={m.name} line={w} m={m} machineOrder={named.map(x=>x.name)} may={may} programs={k.programs.filter(p=>p.assetId && p.assetId===m.record?.id)} />)}</ul>}
                      <button type="button" className="cw-link" onClick={()=>nav(`/lines/${w.id}?view=machines`)}>Add machine ›</button>
                    </>}
                  </div>;
                })()}
                <div className="fac-acts">
                  {may && <button type="button" className="cw-link fac-edit-button" aria-expanded={editingLine === w.id} onClick={()=>editLine(w.id)}>{editingLine === w.id ? 'Done' : 'Edit line'}</button>}
                  {may && editingLine === w.id && <MoreMenu label="Line options" items={[
                    ...(owns(w) && lines.length > 1 ? [{ label: 'Merge…', run: () => void mergeWhat(w.id).then(what => setMerging({ from: w, to: '', what })) }] : []),
                    ...(!job ? [{ label: 'Archive', danger: true, run: () => {
                      if (!confirm(`Archive “${w.name}”? Its work is kept and can be restored from Archived lines.`)) return;
                      void archiveWorkspace(w.id).then(() => said(`${w.name} archived`));
                    } }] : []),
                  ]} />}
                </div>
              </li>
            );
          })}
        </ol>
          </section>)}
        </div>
      )}
      {/* THE CLOSING LINE — what is open and where, and what a day is worth */}
      <Fold id="setup-business" title="Business and clients" says="Your business details, clients and their briefs" start={false}>
        <BusinessPanel /><CustomersPanel may={may} /><CustomerBrief may={may} />
      </Fold>
      <Fold id="setup-connections" title="Data connections" says="Optional connections to production systems" start={false}><DataConnectionsDoor /></Fold>

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

/** The door to Set up › Data connections — how many, and the worst health, in one line. */
function DataConnectionsDoor() {
  const [said, setSaid] = useState<string>('');
  useEffect(() => {
    const read = async () => {
      const [{ listConnections }, { healthSaid }] = await Promise.all([import('../db/production'), import('../lib/production/production')]);
      const c = await listConnections();
      const failing = c.filter(x => healthSaid(x).word === 'Failing').length;
      if (!productionDataOn()) { setSaid('Not switched on yet'); return; }
      setSaid(c.length ? `${c.length} connection${c.length === 1 ? '' : 's'} to your own systems${failing ? ` — ${failing} failing` : ''}` : 'Connect your MES, ERP or monitoring system — its production figures land on your lines');
    };
    void read();
    return onDataChange(() => void read());
  }, []);
  return (
    <a className="fac-door dc-door" href="#/factory/data" data-dc-door>
      <b>Data connections</b> <span className="sub">{said}</span> <span aria-hidden>›</span>
    </a>
  );
}
