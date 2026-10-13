/* A PRODUCTION LINE, ITS OWN PAGE — its problems and its tools, no project
 * needed.
 *
 * Rowland, 12 October: "I have to open one of the projects to get access to
 * the tools ... I want to just be able to open a production line and use
 * these tools inside the production line ... There's a production line,
 * there's a problem, take the picture and move forward with it." Commissioning
 * done, the line running, the problems still come.
 *
 * WHICH RECORD: the line (a Workspace) — the record every problem
 * (snags.workspace_id) and every tool (a standard's or a study's
 * workspaceId) already hangs off. Nothing new is stored. WHERE IT SHOWS: the
 * control room's Production lines, the rail's Lines, and each problem and
 * tool it lists opens where it lives, already on this line.
 *
 * The page answers, in order: where the line is (its problems, the late in
 * red), and what to do next (take a problem; open a tool on this line). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { getWorkspace, listAllSnags, listStandardsForLine, listStudiesForLine, listWorkspaces, onDataChange, projectsOnWorkspace, updateWorkspace } from '../db';
import { methodOf } from '../lib/planModel';
import { useCanStartProjects } from '../cloud/access';
import { lineFacts, lineTypesOffered, productionLines } from '../lib/lines';
import { WorkspaceProvider } from '../state/WorkspaceProvider';
import { StudySetupSheet } from '../ui/StudySetupSheet';
import { openQuickSnag } from '../snag/QuickSnag';
import { PRIORITY_WORD, type Priority, type SnagRow, type SnagTone, snagRow } from '../lib/snagsReport';
import { inCapacityTool, inMapTool, type Standard } from '../lib/standard';
import type { ToolStudy, StudyTool } from '../lib/study';
import type { Workspace } from '../types';
import { Icon } from '../ui/Icon';
import { useProjects } from '../lib/useProjects';
import { saveProblemCardsFor, saveProblemsReportFor } from '../lib/problemsPdf';
import { useLineRecords } from '../lib/useLineRecords';
import { lineKit } from '../lib/lineRecords';
import { STATE_WORD, isProved, standingOf, stateOf, todayISO } from '../lib/programs';
import { niceDay } from '../lib/weeks';
import { addMachineToLine, archiveWorkspace, listObservations, renameLineMachine, restoreWorkspace, setMachineFacts } from '../db';
import { offerUndo } from '../ui/Undo';
import type { LineMachine } from '../lib/lineRecords';
import type { Program } from '../lib/programs';
import type { Snag } from '../snag/types';

const TONE_CLASS: Record<SnagTone, string> = { g: 'is-g', r: 'is-r', w: 'is-w', a: 'is-a', n: 'is-n' };
/* PRIORITY, RAG (Rowland, 12 October) — always with its word. */
const PRIO_CLASS: Record<Priority, string> = { critical: 'is-r', high: 'is-a', low: 'is-g' };
const RANK: Record<Priority, number> = { critical: 0, high: 1, low: 2 };

/** The tools, as the rail names them, each opened on this line. */
const TOOLS: { key: string; label: string; to: string; study?: StudyTool; standard?: true; what: string }[] = [
  { key: 'linestandard', label: 'Line standard', to: '/standards', standard: true, what: 'who stands where, product by product' },
  { key: 'linebalance', label: 'Line capacity', to: '/balances', standard: true, what: 'where the line is limited, and the V-curve' },
  { key: 'capability', label: 'Capability', to: '/capability', study: 'capability', what: 'readings against the limits agreed' },
  { key: 'valuestream', label: 'Value stream', to: '/value-stream', study: 'map', what: 'every step, who does it, the waits' },
  { key: 'changeover', label: 'SMED', to: '/smed', study: 'changeover', what: 'a changeover timed and cut down' },
  { key: 'sampling', label: 'Work sampling', to: '/sampling', study: 'sampling', what: 'what people are doing, at random moments' },
  { key: 'losses', label: 'Loss count', to: '/losses', study: 'losses', what: 'a shift’s losses, in minutes and pounds' },
];

export function ProductionLineScreen({ wsId }: { wsId: string }) {
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [mine, setMine] = useState<Snag[]>([]);
  const [busy, setBusy] = useState(false);
  const { projects } = useProjects();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  /* the factory is changed by someone invited to the app, as on Your factory */
  const may = useCanStartProjects();
  const [settingUp, setSettingUp] = useState(false);

  const load = useCallback(async () => {
    const [w, every, std, ss, ws, on] = await Promise.all([getWorkspace(wsId), listAllSnags(), listStandardsForLine(wsId), listStudiesForLine(wsId), listWorkspaces(), projectsOnWorkspace(wsId)]);
    setLine(w ?? null);
    setJobIds(on);
    setTypes(lineTypesOffered(productionLines(ws)));
    const mine = every.filter(s => s.workspaceId === wsId && !s.deletedAt && !s.archivedAt && s.status !== 'closed');
    setMine(mine);
    setStandards(std); setStudies(ss.filter(s => !s.deletedAt));
  }, [wsId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* its problems as rows, in priority order — the project each is for named */
  const rows: SnagRow[] = useMemo(() => mine.map(s => snagRow(s, line?.name ?? 'This line', undefined, projects.find(p => p.id === s.projectId)?.name))
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || Number(b.late) - Number(a.late) || b.raisedAt - a.raisedAt), [mine, projects, line]);
  const jobs = projects.filter(p => jobIds.includes(p.id));
  const facts = line ? lineFacts(line) : {};
  const late = rows.filter(r => r.late).length;
  const crit = rows.filter(r => r.priority === 'critical').length;
  /* each tool counts its own products (lib/standard inCapacityTool) — a map is not a capacity */
  const count = useMemo(() => (t: typeof TOOLS[number]) => (t.standard ? standards.filter(t.key === 'linebalance' ? inCapacityTool : inMapTool).length : studies.filter(s => s.tool === t.study).length), [standards, studies]);
  /* ITS MACHINES AND PROGRAMS (docs/BLUEPRINT.md, Stage 2) — the line's own
     and those a job brought in, read as the control room's Programs reads them. */
  const rec = useLineRecords();
  const today = todayISO();
  const kit = useMemo(() => (line ? lineKit(line, rec.machines, rec.programs, rec.jobLines, today) : undefined), [line, rec, today]);
  const [mName, setMName] = useState('');
  const [mOem, setMOem] = useState('');

  if (line === undefined) return <div className="wrap pl"><p className="sub">Opening…</p></div>;
  if (line === null) {
    return (
      <div className="wrap pl">
        <h1>No such line</h1>
        <p className="sub">This line is not on this device — it may have been archived. The control room lists every line.</p>
        <button type="button" className="btn" onClick={() => nav('/')}>Control room</button>
      </div>
    );
  }

  /* the line as its paper names it — with its type, as the page does */
  const named = line.lineType ? `${line.name} (${line.lineType})` : line.name;
  /* THE LINE ON PAPER (12 October: "if it's attached to a line, every group
     I can send from that") — its report, or a card for each problem open. */
  const pdf = async (kind: 'report' | 'cards') => {
    if (busy || !mine.length) return;
    setBusy(true);
    try {
      if (kind === 'report') await saveProblemsReportFor({ title: `${named} — problems`, snags: mine, jobs: [], lineName: () => line.name, jobName: id => projects.find(p => p.id === id)?.name });
      else await saveProblemCardsFor({ name: named, lineRows: mine.map(snag => ({ snag, assetName: snag.targetAsset?.trim() || 'No machine named' })), jobRows: [] });
    } catch (e) {
      console.error('line pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setBusy(false); }
  };
  /* THE LINE, EDITED WHERE IT IS — its name and its type (Rowland, 13
     October: "change the types, the names of the lines. Again, always full
     edit control"), the same two boxes as Your factory; the Rename prompt it
     replaces asked only the name, in a box over the page. */
  const archive = async () => {
    if (!window.confirm(`Archive “${line.name}”?\n\nIt leaves the factory and loses nothing — its problems, captures, the walk and the evidence all stay. Your factory's archive restores it whenever you like.\n\nUndo brings it back now.`)) return;
    await archiveWorkspace(line.id);
    nav('/factory');
    offerUndo(`${line.name} archived`, async () => { await restoreWorkspace(line.id); });
  };
  const save = async (patch: Partial<Workspace>, what: string) => {
    await updateWorkspace({ ...line, ...patch });
    setSaved(what);
    window.setTimeout(() => setSaved(null), 2600);
  };

  return (
    <div className="wrap pl">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">PRODUCTION LINE{line.lineType ? ` · ${line.lineType.toUpperCase()}` : ''} · <a href="#/factory" className="pl-fac">Your factory ›</a></p>
          <h1>{line.name}</h1>
          {/* where the line is, in words — only the abnormal carries colour */}
          <p className="pl-says">
            {rows.length === 0 ? 'No problems open.' : <>
              {rows.length} problem{rows.length === 1 ? '' : 's'} open
              {crit > 0 && <> · <b className="is-r">{crit} critical</b></>}
              {late > 0 && <> · <b className="is-r">{late} late</b></>}
            </>}
          </p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Problem</button>
          <button type="button" className="btn" disabled={busy || !rows.length} onClick={() => void pdf('report')}><Icon name="document" size="1.05em" />Problems report</button>
          <button type="button" className="btn" disabled={busy || !rows.length} onClick={() => void pdf('cards')}>Report cards</button>
          {may && <button type="button" className="btn btn-ghost" aria-expanded={editing} onClick={() => setEditing(v => !v)}>{editing ? 'Done' : 'Edit the line'}</button>}
        </div>
      </header>
      {editing && may && (
        <div className="pl-edit" role="group" aria-label="Edit the line">
          <label className="pl-edit-f"><span>Name</span>
            <input className="text-input" defaultValue={line.name} maxLength={80} aria-label="The line's name"
              onBlur={e => { const v = e.target.value.trim(); if (v && v !== line.name) void save({ name: v }, `the line is now ${v}`); }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          </label>
          <label className="pl-edit-f"><span>Type</span>
            <input className="text-input" defaultValue={line.lineType ?? ''} maxLength={80} list="pl-types" placeholder="e.g. Packing" aria-label="The line's type"
              onBlur={e => { const v = e.target.value.trim(); if (v !== (line.lineType ?? '')) void save({ lineType: v || undefined }, v ? `a ${v} line` : 'no type'); }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          </label>
          <datalist id="pl-types">{types.map(t => <option key={t} value={t} />)}</datalist>
          {saved && <span className="pe-saved" role="status">Saved — {saved}</span>}
          {/* PUT AWAY FROM WHERE IT IS (the audit's bar 2) — the same archive as
              Your factory's, with Undo: it loses nothing, and Your factory's
              archive restores it or deletes it for ever. */}
          <button type="button" className="btn btn-ghost btn-sm pl-archive" onClick={() => void archive()}>Archive this line</button>
        </div>
      )}


      <section className="pl-sec" aria-label="Problems on this line">
        <div className="pl-sec-h">
          <h2>Problems</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/snags?line=${encodeURIComponent(wsId)}`)}>Every problem on this line ›</button>
        </div>
        {rows.length === 0
          ? <p className="sub">Nothing open on this line. Press Problem to take one — a picture and a few words, on this line, no project needed.</p>
          : (
            <ul className="pl-rows">
              {rows.map(r => (
                <li key={r.id}>
                  <button type="button" className={'pl-row' + (r.late ? ' is-late' : '')} onClick={() => nav(`/snags?line=${encodeURIComponent(wsId)}&open=${encodeURIComponent(r.id)}`)}>
                    <span className="pl-row-main">
                      <span className="qsl-what"><span className={'qsl-prio ' + PRIO_CLASS[r.priority]}>{PRIORITY_WORD[r.priority]}</span>{r.what}</span>
                      <span className="qsl-meta">{[r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="preg-right">
                      <span className={'qsl-state ' + TONE_CLASS[r.tone]}>{r.word}</span>
                      {r.due && <span className={'qsl-dueword ' + TONE_CLASS[r.dueTone ?? 'n']}>{r.due}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>

      {/* THE LINE — its facts, held by the factory (BLUEPRINT Stage 1: "the factory
          holds the line's facts"): its shifts and breaks, its crew and what it costs
          while it is down (its machines have a section of their own below). Set up the line opens the one
          editor for them (ui/StudySetupSheet) — the same the stopwatch's Set up opens,
          never a second copy. Read by the loss count (planned time, the £), capacity
          a shift and work sampling. */}
      <section className="pl-sec" aria-label="The line">
        <div className="pl-sec-h">
          <h2>The line</h2>
          {may && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSettingUp(true)}>Set up the line ›</button>}
        </div>
        <dl className="pl-facts">
          <dt>Shifts</dt><dd className={facts.shifts ? '' : 'is-n'}>{facts.shifts ?? 'Not said yet — the loss count and capacity a shift need them'}</dd>
          <dt>Crew and cost</dt><dd className={facts.crew || facts.cost ? '' : 'is-n'}>{[facts.crew, facts.cost].filter(Boolean).join(' · ') || 'Not said yet — what a stop costs needs them'}</dd>
        </dl>
      </section>

      {/* ITS MACHINES, IN FLOW ORDER (Stage 2) — the line's list, the one every
          picker reads (the stopwatch, the walk, a problem), each with who made it
          and its programs; a machine a job brought in says which job. Named here
          or in Set up the line, where the order and the names are changed. */}
      <section className="pl-sec" aria-label="Machines on this line">
        <div className="pl-sec-h">
          <h2>Machines</h2>
          {may && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSettingUp(true)}>Order and names ›</button>}
        </div>
        {!kit?.machines.length
          ? <p className="sub">No machines listed yet{may ? ' — name them below, in flow order.' : '.'}</p>
          : (
            <ol className="pl-machines">
              {kit.machines.map(m => (
                <MachineRow key={m.name} line={line} m={m} may={may} programs={kit.programs.filter(p => p.assetId && p.assetId === m.record?.id)}
                  job={m.jobId ? projects.find(p => p.id === m.jobId)?.name : undefined} />
              ))}
            </ol>
          )}
        {may && (
          <div className="pl-new" role="group" aria-label="Add a machine">
            <input className="text-input" value={mName} maxLength={80} placeholder="A machine — e.g. Checkweigher" aria-label="The machine's name"
              onChange={e => setMName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && mName.trim()) { void addMachineToLine(line.id, mName, mOem).then(() => { setMName(''); setMOem(''); }); } }} />
            <input className="text-input" value={mOem} maxLength={80} placeholder="Who made it (optional)" aria-label="Who made the new machine" onChange={e => setMOem(e.target.value)} />
            <button type="button" className="btn" disabled={!mName.trim()} onClick={() => void addMachineToLine(line.id, mName, mOem).then(() => { setMName(''); setMOem(''); })}>Add the machine</button>
          </div>
        )}
      </section>

      {/* ITS PROGRAMS (Stage 2) — planned and proved, the line's own and its
          jobs', no job needed: the late first, then what is coming. Planned and
          changed on Programs, which opens on this line. */}
      <section className="pl-sec" aria-label="Programs on this line">
        <div className="pl-sec-h">
          <h2>Programs</h2>
          <span className="pl-sec-acts">
            {may && <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/programs?line=${encodeURIComponent(wsId)}&add=1`)}>Plan a program ›</button>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/programs?line=${encodeURIComponent(wsId)}`)}>Every program on this line ›</button>
          </span>
        </div>
        {!kit?.programs.length
          ? <p className="sub">No programs on this line yet. Plan one here — no project needed.</p>
          : (
            <>
              <p className="pl-says">{kit.programs.length} program{kit.programs.length === 1 ? '' : 's'} · {kit.proved} proved{kit.late ? <> · <b className="is-r">{kit.late} late</b></> : null}</p>
              <ul className="pl-rows">
                {kit.programs.filter(p => !isProved(p)).sort((a, b) => Number(standingOf(b, today) === 'overdue') - Number(standingOf(a, today) === 'overdue') || (a.testOn ?? '9').localeCompare(b.testOn ?? '9')).slice(0, 6).map(p => {
                  const late = standingOf(p, today) === 'overdue';
                  const m = kit.machines.find(x => x.record?.id === p.assetId);
                  const job = p.projectId ? projects.find(j => j.id === p.projectId) : undefined;
                  return (
                    <li key={p.id}>
                      <button type="button" className={'pl-row' + (late ? ' is-late' : '')} onClick={() => nav(`/programs?line=${encodeURIComponent(wsId)}`)}>
                        <span className="pl-row-main">
                          <span className="qsl-what">{p.what}</span>
                          <span className="qsl-meta">{[m?.name ?? 'the line itself', p.runs ? `runs ${p.runs}` : '', job ? `on ${job.name}` : ''].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="preg-right">
                          <span className={'qsl-state ' + (stateOf(p) === 'onMachine' ? 'is-a' : 'is-n')}>{STATE_WORD[stateOf(p)]}</span>
                          <span className={'qsl-dueword ' + (late ? 'is-r' : p.testOn ? 'is-w' : 'is-n')}>{p.testOn ? `${late ? 'test was ' : 'test '}${niceDay(p.testOn)}` : 'no test day'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
      </section>

      <section className="pl-sec" aria-label="Tools on this line">
        <div className="pl-sec-h"><h2>Tools on this line</h2></div>
        <ul className="pl-tools">
          {TOOLS.map(t => {
            const n = count(t);
            return (
              <li key={t.key}>
                <button type="button" className="pl-tool" onClick={() => nav(`${t.to}?line=${encodeURIComponent(wsId)}`)}>
                  <b>{t.label}</b>
                  <span className="sub">{n ? `${n} on this line` : `None yet — ${t.what}`}</span>
                  <span className="pl-tool-go" aria-hidden>›</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>


      {/* THE JOBS ON THIS LINE (13 October: "assign everything to a
          production line") — every live project whose lines name it, each
          one tap to its own page; a job is started on this line from here. */}
      <section className="pl-sec" aria-label="Jobs on this line">
        <div className="pl-sec-h">
          <h2>Jobs on this line</h2>
          {may && <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/projects?new=1&line=${encodeURIComponent(wsId)}`)}>Start a project on this line ›</button>}
        </div>
        {jobs.length === 0
          ? <p className="sub">No job on this line now. Its problems and its tools need none.</p>
          : (
            <ul className="pl-jobs">
              {jobs.map(p => (
                <li key={p.id}>
                  <button type="button" className="pl-job" onClick={() => nav(`/project/${p.id}`)}>
                    <b>{p.name}</b><span className="sub">{methodOf(p).label}</span><span className="pl-tool-go" aria-hidden>›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>
      {settingUp && <WorkspaceProvider wsId={wsId}><StudySetupSheet onClose={() => setSettingUp(false)} /></WorkspaceProvider>}
    </div>
  );
}

/** ONE MACHINE ON THE LINE'S LIST — who made it typed in place, as before; and
 *  now renamed and taken off where it sits (the audit's bar 2), the same as
 *  Set up the line's chips: a rename carries its stops and its record with it
 *  (db/lineRecords renameLineMachine); taken off, its stops keep its name and
 *  its record waits for it, so Undo puts it back where it stood in the flow.
 *  A machine a job brought in is changed on its job. */
function MachineRow({ line, m, may, programs, job }: { line: Workspace; m: LineMachine; may: boolean; programs: Program[]; job?: string }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(m.name);
  const onList = (line.assets ?? []).some(a => a.trim() === m.name);
  const clash = (line.assets ?? []).find(a => a.trim() !== m.name && a.trim().toLowerCase() === name.trim().toLowerCase());
  const rename = async () => {
    const to = name.trim();
    if (!to || clash) return;
    if (to !== m.name) {
      await updateWorkspace({ ...line, assets: line.assets.map(a => (a.trim() === m.name ? to : a)) });
      await renameLineMachine(line.id, m.name, to);
    }
    setNaming(false);
  };
  const takeOff = async () => {
    const stops = (await listObservations(line.id)).filter(o => o.asset === m.name).length;
    const p = programs.length;
    if (!window.confirm([`Take “${m.name}” off ${line.name}?`,
      [stops ? `Its ${stops === 1 ? 'stop keeps' : `${stops} stops keep`} its name.` : '', p ? `Its ${p === 1 ? 'program stays' : `${p} programs stay`} on the line, on no machine.` : '', m.record?.oem ? 'Who made it is kept, and comes back with it.' : ''].filter(Boolean).join(' '),
      'Undo puts it back where it stood.'].filter(Boolean).join('\n\n'))) return;
    const at = line.assets.findIndex(a => a.trim() === m.name);
    await updateWorkspace({ ...line, assets: line.assets.filter(a => a.trim() !== m.name) });
    offerUndo(`Took “${m.name}” off ${line.name}`, async () => {
      const cur = await getWorkspace(line.id);
      if (!cur || cur.assets.some(a => a.trim() === m.name)) return;
      const next = [...cur.assets]; next.splice(Math.min(at, next.length), 0, m.name);
      await updateWorkspace({ ...cur, assets: next });
    });
  };
  if (naming) return (
    <li className="pl-machine is-naming" data-machine={m.name}>
      <form className="lt-name" onSubmit={e => { e.preventDefault(); void rename(); }}>
        <input className="text-input" autoFocus value={name} maxLength={48} aria-label={`The machine's name — ${m.name}`} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setName(m.name); setNaming(false); } }} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim() || !!clash}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setName(m.name); setNaming(false); }}>Cancel</button>
        {clash && <span className="sub lt-clash">{clash} is already on this line — pick another name.</span>}
      </form>
    </li>
  );
  return (
    <li className="pl-machine" data-machine={m.name}>
      <b>{m.name}</b>
      {may
        ? <input className="text-input pl-oem" defaultValue={m.record?.oem ?? ''} key={m.record?.oem ?? ''} maxLength={80} placeholder="Who made it" aria-label={`Who made the ${m.name}`}
            onBlur={e => { const v = e.target.value.trim(); if (v !== (m.record?.oem ?? '')) void setMachineFacts(line.id, m.name, { oem: v }); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        : m.record?.oem ? <span className="sub">{m.record.oem}</span> : null}
      <span className="sub">{[programs.length ? `${programs.length} program${programs.length === 1 ? '' : 's'}, ${programs.filter(isProved).length} proved` : 'no programs', job ? `brought in by ${job}` : ''].filter(Boolean).join(' · ')}</span>
      {may && onList && (
        <span className="lt-acts pl-machine-acts">
          <button type="button" className="cw-link" onClick={() => { setName(m.name); setNaming(true); }} aria-label={`Rename ${m.name}`}>Rename</button>
          <button type="button" className="cw-link sp-rm" onClick={() => void takeOff()} aria-label={`Take ${m.name} off the line`}>Remove</button>
        </span>
      )}
    </li>
  );
}
