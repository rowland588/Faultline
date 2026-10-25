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
import { APP_TOOLS } from '../catalogue/registry';
import { MoreMenu, PageHeader } from '../ui/parts';
import { savingAt } from '../lib/useSaveOnArrival';
import { LineTour } from '../ui/LineTour';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { StartTogether } from '../line/StartTogether';
import { canStartTogether } from '../lib/startStudy';
import { getWorkspace, listAllSnags, listObservations, listSnagAssets, listStandardsForLine, listStudiesForLine, listWorkspaces, onDataChange, projectsOnWorkspace, updateWorkspace } from '../db';
import { methodOf } from '../lib/planModel';
import { useCanStartProjects } from '../cloud/access';
import { dualOf, lineFacts, lineTypesOffered, linesSaid, productionLines } from '../lib/lines';
import { WorkspaceProvider } from '../state/WorkspaceProvider';
import { StudySetupSheet } from '../ui/StudySetupSheet';
import { PRIORITY_WORD, type Priority, type SnagRow, type SnagTone } from '../lib/snagsReport';
import { headcount, inCapacityTool, inMapTool, thingsOf, type Standard } from '../tools/linestandard/standard';
import { lineProblems, lineProblemsSaid } from '../lib/lineWork';
import { lineClosing, lineTiles, type LineReading } from '../lib/lineLean';
import { lineDay } from '../lib/lineLoss';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { balanceSays } from './LineToolsScreen';
import { studyLine } from './StudiesScreen';
import { currentLosses } from '../lib/studyLinks';
import { useJobInputs } from '../lib/useJobInputs';
import { portfolio, type JobView } from '../lib/portfolio';
import type { Observation } from '../types';
import { between, stopMinutes, WEEK } from '../lib/intelligence';
import type { ToolStudy, StudyTool } from '../lib/study';
import type { Workspace } from '../types';
import { useProjects } from '../lib/useProjects';
import { saveProblemCardsFor, saveProblemsReportFor } from '../lib/problemsPdf';
import { useLineRecords } from '../lib/useLineRecords';
import { projectsOnLines, stageOnlyByLine, useJobFloor } from '../lib/useJobFloor';
import { lineKit } from '../lib/lineRecords';
import { STATE_WORD, isProved, standingOf, stateOf, todayISO } from '../lib/programs';
import { niceDay } from '../lib/weeks';
import { addMachineToLine, archiveWorkspace, renameLineMachine, restoreWorkspace, setMachineFacts } from '../db';
import { offerUndo } from '../ui/Undo';
import type { LineMachine } from '../lib/lineRecords';
import type { Program } from '../lib/programs';
import type { Snag, SnagAsset } from '../snag/types';
import { talkSaid, turnsOf } from '../tools/talk/talk';

const TONE_CLASS: Record<SnagTone, string> = { g: 'is-g', r: 'is-r', w: 'is-w', a: 'is-a', n: 'is-n' };
/* PRIORITY, RAG (Rowland, 12 October) — always with its word. */
const PRIO_CLASS: Record<Priority, string> = { critical: 'is-r', high: 'is-a', low: 'is-g' };

/** The tools, as the rail names them, each opened on this line — the catalogue's
 *  (src/catalogue/registry), those it lists on a line, in the floor's order. A video study is a line
 *  balance read from footage (lib/video/record): it has its own row since 23 October (Rowland: "I add a
 *  tool to a line it doesn't go there" — it went, counted under Line balance, with no row of its own). */
export const TOOLS: { key: string; label: string; to: string; study?: StudyTool | 'video'; standard?: true; what: string }[] = APP_TOOLS
  .filter(t => t.onLine && t.reads)
  .map(t => ({ key: t.key, label: t.label, to: t.to, ...(t.reads === 'standard' ? { standard: true as const } : { study: t.reads as StudyTool | 'video' }), what: t.onLine as string }));

/** A tool's own uses among a line's or a project's studies — a video study is a balance study with
 *  footage, so it is the video's and never the line balance's. */
export const usesOfTool = (study: StudyTool | 'video', studies: ToolStudy[]): ToolStudy[] =>
  studies.filter(s => !s.deletedAt && (study === 'video' ? !!s.facts?.video : s.tool === study && !s.facts?.video));

export type LineTool = typeof TOOLS[number];

/** WHAT A TOOL'S LATEST FOUND ON A LINE, in its own words — the line's page
 *  tile and its report (FLOW-AUDIT.md, 10), and what Line Talk's assistant is
 *  told the line's tools found (screens/useTalkContext). */
export function toolSaysOf(t: LineTool, d: { standards: Standard[]; studies: ToolStudy[]; obs: Observation[]; line: Workspace | null | undefined; wsId: string }): { n: number; says?: string; tone?: string } {
  const { standards, studies, obs, line, wsId } = d;
  if (t.standard) {
    const own = standards.filter(t.key === 'linebalance' ? inCapacityTool : inMapTool).sort((a, b) => b.updatedAt - a.updatedAt);
    const s = own[0];
    if (!s) return { n: 0 };
    if (t.key === 'linebalance') { const b = balanceSays(s); return { n: own.length, says: `${s.product}: ${b.text}`, tone: b.short ? 'r' : 'n' }; }
    const people = headcount(s), things = thingsOf(s);
    return { n: own.length, says: `${s.product}: ${people || things ? [`${people} ${people === 1 ? 'person' : 'people'}`, things].filter(Boolean).join(' · ') : 'nothing placed yet'}` };
  }
  const own = t.study ? usesOfTool(t.study, studies).sort((a, b) => b.startedAt - a.startedAt) : [];
  /* a loss count: the latest shift counted, as the line's card says it */
  const s = (t.study === 'losses' ? currentLosses(own, wsId) : undefined) ?? own[0];
  if (!s) return { n: 0 };
  /* a Line Talk is said as its conversation stands (lib/talk) */
  if (t.study === 'talk') return { n: own.length, says: `${s.name}: ${talkSaid(turnsOf(s.facts))}` };
  const said = studyLine(s, t.study === 'losses' && line ? { observations: obs, workspaces: [line] } : undefined);
  /* a loss count's sentence names its shift itself */
  return { n: own.length, says: t.study === 'losses' ? said.text : `${s.name}: ${said.text}`, tone: said.tone };
}

/** A LINE'S STOPS, the last four weeks — the count, the minutes (overlaps on
 *  one machine counted once, as every Pareto counts them) and the machine
 *  that stopped the most; the words the Stops timed row says. */
export function stopsOf(obs: Observation[]): { n: number; minutes: number; worst?: string; says?: string; tone: 'n' } {
  const now = Date.now();
  const recent = between(obs, now - 4 * WEEK, now).filter(o => o.durationMs > 0 || o.timing === 'instant');
  const n = recent.length;
  if (!n) return { n: 0, minutes: 0, tone: 'n' as const };
  const byMachine = new Map<string, Observation[]>();
  for (const o of recent) byMachine.set(o.asset, [...(byMachine.get(o.asset) ?? []), o]);
  const worst = [...byMachine.entries()].map(([asset, os]) => ({ asset, min: stopMinutes(os) })).sort((a, b) => b.min - a.min)[0];
  const mins = Math.round(stopMinutes(recent));
  return { n, minutes: mins, ...(worst && worst.min >= 1 ? { worst: worst.asset.trim() || 'whole line' } : {}), tone: 'n' as const, says: `${mins} min lost in ${n} stop${n === 1 ? '' : 's'}${worst && worst.min >= 1 ? ` — the ${worst.asset.trim() || 'whole line'} most, ${Math.round(worst.min)} min` : ''}` };
}

/** A LINE'S PAGES (docs/STRUCTURE.md §5.1, B2): its overview — everything, as before — and, on
 *  ?view=, one of its pages alone: the tools used on it, its projects, its set-up. */
export type LineView = 'overview' | 'tools' | 'projects' | 'setup';
export const LINE_VIEWS: readonly LineView[] = ['overview', 'tools', 'projects', 'setup'];

export function ProductionLineScreen({ wsId, view = 'overview' }: { wsId: string; view?: LineView }) {
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [mine, setMine] = useState<Snag[]>([]);
  const [busy, setBusy] = useState(false);
  const { projects } = useProjects();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  /* the line's stops — a loss count's sentence reads the ones in its window */
  const [obs, setObs] = useState<Observation[]>([]);
  const [walkAssets, setWalkAssets] = useState<SnagAsset[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  /* the factory's other lines — a dual line is made of some of them (lib/lines dualOf) */
  const [lines, setLines] = useState<Workspace[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  /* the factory is changed by someone invited to the app, as on Your factory */
  const may = useCanStartProjects();
  const [settingUp, setSettingUp] = useState(false);
  /* TOOLS TICKED on the Tools page: a line report from them, or those that start with a name started together */
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [together, setTogether] = useState(false);
  const [togetherSaid, setTogetherSaid] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [w, every, std, ss, ws, on, o, wa] = await Promise.all([getWorkspace(wsId), listAllSnags(), listStandardsForLine(wsId), listStudiesForLine(wsId), listWorkspaces(), projectsOnWorkspace(wsId), listObservations(wsId), listSnagAssets(wsId)]);
    setLine(w ?? null);
    setJobIds(on);
    setTypes(lineTypesOffered(productionLines(ws)));
    setLines(productionLines(ws));
    const mine = every.filter(s => s.workspaceId === wsId && !s.deletedAt && !s.archivedAt && s.status !== 'closed');
    setMine(mine);
    setStandards(std); setStudies(ss.filter(s => !s.deletedAt)); setObs(o); setWalkAssets(wa);
  }, [wsId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* its problems as rows, in priority order — the project each is for
     named; read by the one rule the control room's card and its numbers
     use (lib/lineWork lineProblems), so the three cannot disagree */
  const probs = useMemo(() => lineProblems(mine, { id: wsId, name: line?.name ?? 'This line' }, { jobName: id => projects.find(p => p.id === id)?.name, assetName: s => walkAssets.find(a => a.id === s.assetId)?.name }), [mine, projects, line, wsId, walkAssets]);
  const rows: SnagRow[] = probs.rows;
  const jobs = projects.filter(p => jobIds.includes(p.id));
  const facts = line ? lineFacts(line) : {};
  /* A DUAL LINE (supabase/DUAL_LINES.sql — Rowland, 23 October: "2a 2b are 2 lines but they happen
     to be a dual line"): the lines this one is made of, and the dual lines it is part of — said under
     the name, set on Edit the line, and on the band of its paper. */
  const dual = dualOf(line ?? { id: wsId }, lines);
  const dualWords: [string, string] | undefined = dual.madeOf.length ? ['Made of', linesSaid(dual.madeOf)] : dual.partOf.length ? ['Part of', dual.partOf.map(w => w.name).join(' and ')] : undefined;
  /* THE JOBS ON THIS LINE, read as the control room reads them (lib/useJobInputs,
     lib/portfolio) — each says its verdict and its late in the control
     room's own words (FLOW-AUDIT.md, 10). */
  const jobInputs = useJobInputs(jobs);
  const jobViews = useMemo(() => (jobInputs ? new Map(portfolio(jobInputs.gate, todayISO(), jobInputs.paced).jobs.map(v => [v.id, v])) : null), [jobInputs]);
  /* EACH TOOL SAYS WHAT ITS LATEST FOUND (FLOW-AUDIT.md, 10) — "Loss count ·
     2 on this line" counted records; the tile carries the sentence the
     tool's own list shows for its newest record on this line, then the
     count. Each tool counts its own products (lib/standard inCapacityTool) —
     a map is not a capacity. */
  const toolSays = useMemo(() => (t: LineTool) => toolSaysOf(t, { standards, studies, obs, line, wsId }), [standards, studies, obs, line, wsId]);
  /* ITS STOPS, the last four weeks — the count, the minutes (overlaps on one
     machine counted once, as every Pareto counts them) and the machine that
     stopped the most; the words the Stops timed row says. */
  const stops = useMemo(() => stopsOf(obs), [obs]);
  /* ITS MACHINES AND PROGRAMS (docs/BLUEPRINT.md, Stage 2) — the line's own
     and those a job brought in, read as the control room's Programs reads them. */
  const rec = useLineRecords();
  const today = todayISO();
  const kit = useMemo(() => (line ? lineKit(line, rec.machines, rec.programs, rec.jobLines, today) : undefined), [line, rec, today]);
  /* programs typed only on a project's Commission, on this line (23 October: "it's like you don't have any programs") */
  const floor = useJobFloor(useMemo(() => (line ? projectsOnLines([line.id], rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt)) : []), [line, rec.jobLines, rec.jobs]));
  const onStage = useMemo(() => (line ? stageOnlyByLine(floor.stageOnly ?? [], rec.machines, rec.jobLines).get(line.id) ?? [] : []), [line, floor, rec.machines, rec.jobLines]);
  /* THE LINE AS A LEAN PAGE (lib/lineLean) — the tiles and the closing line
     its page and its report both say */
  const reading: LineReading | undefined = line ? {
    name: line.name, problems: probs, programs: { n: kit?.programs.length ?? 0, proved: kit?.proved ?? 0, late: kit?.late ?? 0, onStage: onStage.length },
    stops: { n: stops.n, minutes: stops.minutes, ...(stops.worst ? { worst: stops.worst } : {}) }, day: lineDay(line), jobs: jobIds.length,
  } : undefined;
  const [mName, setMName] = useState('');
  const [mOem, setMOem] = useState('');

  if (line === undefined) return <div className="wrap pl"><p className="sub">Opening…</p></div>;
  if (line === null) {
    return (
      <div className="wrap pl">
        <h1>No such line</h1>
        <p className="sub">This line is not on this device — it may have been archived. The control room lists every line.</p>
        <button type="button" className="btn" onClick={() => nav('/room')}>Control room</button>
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
  /* THE LINE REPORT, ONE PAGE (BLUEPRINT §3, Stage 3) — the lean page on
     paper: the tiles and closing line this page says,
     what is open, its machines and programs to prove, what its tools found
     and its jobs' verdicts (lib/lineReportPdf). */
  const printLine = async () => {
    if (busy || !reading || !kit) return;
    setBusy(true);
    try {
      const { loadPdfLib, deliverPdf, titlePdf } = await import('../lib/savePdf');
      const { drawLineReport } = await import('../lib/lineReportPdf');
      const { pdfFileName } = await import('../lib/fileName');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      titlePdf(doc, `${named} — the line report`);
      const late = (p: Program) => standingOf(p, today) === 'overdue';
      await drawLineReport(doc, {
        name: line.name, ...(line.lineType ? { type: line.lineType } : {}), ...(dualWords ? { dual: dualWords } : {}),
        printed: new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        reading,
        problems: rows.map(r => ({ what: `${PRIORITY_WORD[r.priority]} · ${r.what}`, meta: [r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · '),
          right: r.late && r.due ? r.due : r.word, tone: r.late || r.priority === 'critical' ? 'r' : 'n' })),
        machines: kit.flow,
        programs: kit.programs.filter(p => !isProved(p)).sort((a, b) => Number(late(b)) - Number(late(a)) || (a.testOn ?? '9').localeCompare(b.testOn ?? '9')).map(p => ({
          what: p.what, meta: [kit.machines.find(x => x.record?.id === p.assetId)?.name ?? 'the line itself', p.runs ? `runs ${p.runs}` : '', p.projectId ? `on ${projects.find(j => j.id === p.projectId)?.name ?? 'a project'}` : ''].filter(Boolean).join(' · '),
          right: p.testOn ? `${late(p) ? 'test was ' : 'test '}${niceDay(p.testOn)}` : 'no test day', tone: late(p) ? 'r' : p.testOn ? 'w' : 'a' })),
        tools: [...(stops.says ? [{ label: 'Stops timed', says: stops.says }] : []),
          ...TOOLS.map(t => ({ t, said: toolSays(t) })).filter(x => x.said.says).map(x => ({ label: x.t.label, says: x.said.says as string, ...(x.said.tone ? { tone: x.said.tone } : {}) }))],
        jobs: jobs.map(p => { const v = jobViews?.get(p.id); return { name: p.name, method: methodOf(p).label, ...(v?.onTarget ? { verdict: v.onTarget.word, tone: v.onTarget.tone } : {}) }; }),
      });
      await deliverPdf(doc, pdfFileName(line.name, 'line report', today));
    } catch (e) {
      console.error('line report failed', e);
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
    /* the page answers at once — a tick is ticked as it is pressed — and the record follows */
    setLine(l => (l ? { ...l, ...patch } : l));
    await updateWorkspace({ ...line, ...patch });
    setSaved(what);
    window.setTimeout(() => setSaved(null), 2600);
  };

  /* the overview is the whole page; a page of the line shows its own part alone */
  const show = (k: LineView) => view === 'overview' || view === k;

  return (
    <div className="wrap pl">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3): the line, where it is in words, Time a stop the
          one thing to do; its papers in Report ▾ and the rest in More ▾. Seven buttons stood here and
          squeezed the line's name into a column 50 px wide (F6). Problem left the header: the bar's
          Problem (＋ on a phone) takes it on this line, the same sheet — it stood here twice. */}
      <PageHeader
        eyebrow={<span className="pl-eyebrow">PRODUCTION LINE{line.lineType ? ` · ${line.lineType.toUpperCase()}` : ''}</span>}
        title={line.name}
        /* where the line is, in words — only the abnormal carries colour; the words the control
           room's card for it says (lib/lineWork) */
        says={<span className="pl-says">{lineProblemsSaid(probs).map((x, i) => (x.red ? <b key={i} className="is-r">{x.text}</b> : x.text))}{rows.length === 0 ? '.' : ''}</span>}
        /* THE FLOOR'S ACT, FIRST: time a stop. The stopwatch had no door from the line (docs/UPGRADE-AUDIT.md F1). */
        primary={{ label: 'Time a stop', icon: 'time', className: 'pl-time', run: () => nav(`/w/${wsId}/capture`) }}
        papers={[
          { label: 'Line report — 1 page', for: 'the line, its tiles, problems, machines, programs and what its tools found', disabled: busy || !reading, make: printLine },
          /* EVERYTHING ON THE LINE (23 October, lib/lineBundle) — drawn on its own report page, made on arrival */
          { label: 'Line report — everything on the line', for: dual.madeOf.length ? 'each line it is made of, then both together — every tool used, programs, problems, who owes what' : 'every tool used on the line, its programs, its problems, where on the line, who owes what — tick what goes in', make: () => nav(savingAt(`/lines/${wsId}/report`)) },
          { label: 'Problems report', for: rows.length ? 'every problem open on the line, with its plan and journey' : 'no problem open on the line yet', disabled: busy || !rows.length, make: () => pdf('report') },
          { label: 'Problem cards', for: rows.length ? 'a card for each problem open, for the board' : 'no problem open on the line yet', disabled: busy || !rows.length, make: () => pdf('cards') },
        ]}
        more={[
          /* THE FILMED WALK, FROM THE LINE (20 October, docs/DIRECTION.md): film the line, freeze a
             frame, mark what is wrong on it — no job needed. */
          { label: 'Film the line', run: () => nav(`/w/${wsId}/snags?manage=1`) },
          ...(may ? [{ label: editing ? 'Done editing the line' : 'Edit the line', run: () => setEditing(v => !v) }] : []),
        ]}
      />
      {(dual.madeOf.length > 0 || dual.partOf.length > 0) && (
        <p className="pl-dual sub" aria-label={dualWords ? `${dualWords[0]} ${dualWords[1]}` : undefined}>
          {dual.madeOf.length > 0 && <>Made of {dual.madeOf.map((w, i) => <span key={w.id}>{i > 0 ? ' + ' : ''}<a href={`#/lines/${w.id}`}>{w.name}</a></span>)}</>}
          {dual.madeOf.length > 0 && dual.partOf.length > 0 && ' · '}
          {dual.partOf.length > 0 && <>Part of {dual.partOf.map((w, i) => <span key={w.id}>{i > 0 ? ' and ' : ''}<a href={`#/lines/${w.id}`}>{w.name}</a></span>)}</>}
        </p>
      )}
      {(editing || view === 'setup') && may && (
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
          {/* MADE OF — the connector (23 October): tick the lines this one is made of; untick to undo. */}
          <fieldset className="pl-edit-f pl-madeof">
            <legend>Made of</legend>
            {lines.filter(w => w.id !== line.id).length === 0
              ? <span className="sub">No other line in the factory yet</span>
              : lines.filter(w => w.id !== line.id).map(w => {
                const on = (line.madeOf ?? []).includes(w.id);
                return (
                  <label key={w.id} className="pl-madeof-l">
                    <input type="checkbox" checked={on} aria-label={`Made of ${w.name}`}
                      onChange={() => { const next = on ? (line.madeOf ?? []).filter(x => x !== w.id) : [...(line.madeOf ?? []), w.id]; void save({ madeOf: next.length ? next : undefined }, next.length ? `${line.name} is made of ${linesSaid(lines.filter(x => next.includes(x.id)))}` : `${line.name} is a line on its own`); }} />
                    {w.name}
                  </label>
                );
              })}
          </fieldset>
          {saved && <span className="pe-saved" role="status">Saved — {saved}</span>}
          {/* PUT AWAY FROM WHERE IT IS (the audit's bar 2) — the same archive as
              Your factory's, with Undo: it loses nothing, and Your factory's
              archive restores it or deletes it for ever. */}
          <button type="button" className="btn btn-ghost btn-sm pl-archive" onClick={() => void archive()}>Archive this line</button>
          {editing && view !== 'setup' && <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>Done</button>}
        </div>
      )}


      {/* WHERE IT STANDS, COUNTED (lib/lineLean) — the tiles its report prints */}
      {show('overview') && reading && <LeanTiles tiles={lineTiles(reading)} className="pl-tiles" />}

      {/* THE LINE, MACHINE BY MACHINE — the tour, read in seconds (ui/LineTour) */}
      {show('overview') && kit && <LineTour line={line} machines={kit.machines.map(m => m.name)} rows={rows} snags={mine} obs={obs} standards={standards} />}

      {show('overview') && (<section className="pl-sec" aria-label="Problems on this line">
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
      </section>)}

      {/* ITS MACHINES, IN FLOW ORDER (Stage 2) — the line's list, the one every
          picker reads (the stopwatch, the walk, a problem), each with who made it
          and its programs; a machine a job brought in says which job. Named here
          or in Set up the line, where the order and the names are changed. */}
      {(show('overview') || view === 'setup') && (<section className="pl-sec" aria-label="Machines on this line">
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
      </section>)}

      {/* ITS PROGRAMS (Stage 2) — planned and proved, the line's own and its
          jobs', no job needed: the late first, then what is coming. Planned and
          changed on Programs, which opens on this line. */}
      {show('overview') && (<section className="pl-sec" aria-label="Programs on this line">
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
      </section>)}

      {show('tools') && (<section className="pl-sec" aria-label="Tools on this line">
        <div className="pl-sec-h"><h2>Tools on this line</h2>
          {/* NEW ▾ — a tool started here is this line's (src/catalogue/registry, docs/STRUCTURE.md §5.2) */}
          {view === 'tools' && may && <MoreMenu label="New" items={APP_TOOLS.filter(t => t.kind === 'study' || t.kind === 'document').map(t => ({ label: t.label, run: () => nav(`${t.to}?line=${encodeURIComponent(wsId)}`) }))} />}
        </div>
        <ul className="pl-tools">
          {/* THE STOPWATCH AND ITS PARETO, FIRST — the floor's own tool, read
              from the line's stops as the tour reads them (lib/intelligence
              stops): the last four weeks, the machine that stopped the most.
              With stops it opens the ranking; with none, the stopwatch. */}
          <li>
            <button type="button" className="pl-tool is-stops" onClick={() => nav(`/w/${wsId}/${stops.n ? 'analyse' : 'capture'}`)}>
              <b>Stops timed</b>
              {stops.says && <span className={'pl-tool-says ie-tone is-' + stops.tone}>{stops.says}</span>}
              <span className="sub">{stops.n ? `The last four weeks — where the time goes, ranked by ${line.packsPerMin ? 'what it costs' : 'minutes lost'}` : 'None yet — the stopwatch, and the Pareto of what the stops cost'}</span>
              <span className="pl-tool-go" aria-hidden>›</span>
            </button>
          </li>
          {TOOLS.map(t => {
            const { n, says, tone } = toolSays(t);
            return (
              <li key={t.key} className={view === 'tools' ? 'pl-tool-li has-tick' : undefined}>
                {view === 'tools' && (
                  <label className="pl-tick"><input type="checkbox" checked={ticked.has(t.key)} aria-label={`Tick ${t.label}`}
                    onChange={() => setTicked(s => { const n2 = new Set(s); if (n2.has(t.key)) n2.delete(t.key); else n2.add(t.key); return n2; })} /></label>
                )}
                <button type="button" className="pl-tool" onClick={() => nav(`${t.to}?line=${encodeURIComponent(wsId)}`)}>
                  <b>{t.label}</b>
                  {/* what its latest found — the abnormal part alone in its colour */}
                  {says && <span className={'pl-tool-says ie-tone is-' + (tone ?? 'n')}>{says}</span>}
                  <span className="sub">{n ? `${n} on this line` : `None yet — ${t.what}`}</span>
                  <span className="pl-tool-go" aria-hidden>›</span>
                </button>
              </li>
            );
          })}
        </ul>
        {view === 'tools' && (() => {
          const chosen = TOOLS.filter(x => ticked.has(x.key));
          const startable = chosen.filter(x => canStartTogether(x.study as string | undefined)).map(x => ({ tool: x.study as StudyTool, label: x.label }));
          return (
            <>
              {togetherSaid && <p className="tc-ok" role="status">{togetherSaid}</p>}
              {chosen.length > 0 && (
                <div className="pl-pick" role="group" aria-label="Ticked tools">
                  <span className="pl-says"><b>{chosen.length}</b> tool{chosen.length === 1 ? '' : 's'} ticked — {chosen.map(x => x.label).join(', ')}</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => nav(`/lines/${wsId}/report?tools=${chosen.map(x => x.key).join(',')}`)}>Line report from these ›</button>
                  {may && startable.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTogether(true)}>Start {startable.length === 1 ? startable[0].label : `these ${startable.length}`} here ›</button>}
                  <button type="button" className="cw-link" onClick={() => setTicked(new Set())}>Clear</button>
                  {may && chosen.length > startable.length && <span className="sub">{chosen.filter(x => !canStartTogether(x.study as string | undefined)).map(x => x.label).join(', ')} {chosen.length - startable.length === 1 ? 'starts' : 'start'} from {chosen.length - startable.length === 1 ? 'its' : 'their'} own row — it asks more first.</span>}
                </div>
              )}
              {chosen.length === 0 && <p className="sub pl-pick-hint">Tick tools to read them together in one line report{may ? ', or to start several here at once' : ''}.</p>}
              <StartTogether open={together} onClose={() => setTogether(false)} line={wsId} lineName={line.name} tools={startable} onDone={said => { setTogetherSaid(said); setTicked(new Set()); }} />
            </>
          );
        })()}
      </section>)}


      {/* THE JOBS ON THIS LINE (13 October: "assign everything to a
          production line") — every live project whose lines name it, each
          one tap to its own page; a job is started on this line from here. */}
      {show('projects') && (<section className="pl-sec" aria-label="Projects on this line">
        <div className="pl-sec-h">
          <h2>Projects on this line</h2>
          {may && <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/projects?new=1&line=${encodeURIComponent(wsId)}`)}>Start a project on this line ›</button>}
        </div>
        {jobs.length === 0
          ? <p className="sub">No project on this line now. Its problems and its tools need none.</p>
          : (
            <ul className="pl-jobs">
              {jobs.map(p => (
                <li key={p.id}>
                  <button type="button" className="pl-job" onClick={() => nav(`/project/${p.id}`)}>
                    <b>{p.name}</b><span className="sub">{methodOf(p).label}</span><span className="pl-tool-go" aria-hidden>›</span>
                    <JobVerdict v={jobViews?.get(p.id)} />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>)}
      {/* THE LINE — its facts, held by the factory (BLUEPRINT Stage 1: "the factory
          holds the line's facts"): its shifts and breaks, its crew and what it costs
          while it is down (its machines have a section of their own below). Set up the line opens the one
          editor for them (ui/StudySetupSheet) — the same the stopwatch's Set up opens,
          never a second copy. Read by the loss count (planned time, the £), capacity
          a shift and work sampling. */}
      {(show('overview') || view === 'setup') && (<section className="pl-sec" aria-label="The line">
        <div className="pl-sec-h">
          <h2>The line</h2>
          {may && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSettingUp(true)}>Set up the line ›</button>}
        </div>
        <dl className="pl-facts">
          <dt>Shifts</dt><dd className={facts.shifts ? '' : 'is-n'}>{facts.shifts ?? 'Not said yet — the loss count and capacity a shift need them'}</dd>
          <dt>Crew and cost</dt><dd className={facts.crew || facts.cost ? '' : 'is-n'}>{[facts.crew, facts.cost].filter(Boolean).join(' · ') || 'Not said yet — what a stop costs needs them'}</dd>
        </dl>
      </section>)}

      {show('overview') && reading && <LeanClosing closing={lineClosing(reading)} />}
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

/** A JOB'S VERDICT ON ITS LINE'S PAGE — the control room's own answer for it
 *  (lib/onTarget, through lib/portfolio): the word in its colour, why in one
 *  line, and what is late and critical in red with their words. */
function JobVerdict({ v }: { v?: JobView }) {
  if (!v) return <span className="pl-job-ot sub">Reading…</span>;
  return (
    <span className="pl-job-ot">
      {v.onTarget && <b className={'pl-ot is-' + v.onTarget.tone}>{v.onTarget.word}</b>}
      {v.onTarget && <span className="sub"> {v.onTarget.brief ?? v.onTarget.reason}</span>}
      {/* a stage-gate job's reason already counts its late; a 6M or tree job's is about its lines */}
      {v.late > 0 && v.method !== 'commissioning' && <> · <b className="is-r">{v.late} late</b></>}
      {v.critical.length > 0 && <> · <b className="is-r">{v.critical.length} critical</b></>}
    </span>
  );
}
