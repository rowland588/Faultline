import { problemMachine } from '../snag/place';
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
import { calcToolOf, isCalcTool } from '../catalogue/calcTools';
import { openProblem } from '../snag/ProblemPanel';
import { Icon } from '../ui/Icon';
import { lineHref } from '../ui/rail';
import { LineActions } from '../line/actions/LineActions';
import { APP_TOOLS } from '../catalogue/registry';
import { MoreMenu, PageHeader, ViewTabs } from '../ui/parts';
import { LineReports } from '../line/report/LineReports';
import { EmptyState } from '../ui/EmptyState';
import { Fold } from '../ui/Fold';
import { StartLineTool } from '../line/StartLineTool';
import { EvidenceCard } from '../ui/EvidenceCard';
import { glanceOfStudy, glanceOfCapacity } from '../line/glance/glance';
import { LineUseList } from '../line/LineUseList';
import { machineDocOf, DOC_KIND_WORD, type MachineDoc } from '../lib/manual/store';
import { docRowSaid } from '../ui/MachineDocs';
import { docTitle } from '../tools/doc/doc';
import { LineFindings } from '../line/brain/LineFindings';
import { LineTour } from '../ui/LineTour';
import { LineLooking } from '../tools/gemba/LookedAt';
import { WalkPhotos } from '../ui/WalkPhotos';
import { SpreadFixes } from '../tools/yokoten/Spread';
import { spreadSentences, useYokoten } from '../tools/yokoten/useYokoten';
import { useLooking } from '../tools/gemba/useLooking';
import { lookingReading } from '../tools/gemba/looking';
import { LinesLogs } from '../tools/checks/LogsScreens';
import { scopeCounts } from '../tools/checks/owed';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nav, navReplace } from '../state/useRoute';
import { StartTogether } from '../line/StartTogether';
import { canStartTogether } from '../lib/startStudy';
import { getWorkspace, listAllSnags, listObservations, listSnagAssets, listStandardsForLine, listStudiesForLine, listWorkspaces, onDataChange, projectsOnWorkspace, patchWorkspaceRecord } from '../db';
import { methodOf } from '../lib/planModel';
import { useCanStartProjects } from '../cloud/access';
import { dualOf, lineFacts, linesSaid, productionLines } from '../lib/lines';
import { WorkspaceProvider } from '../state/WorkspaceProvider';
import { WorkspaceSettings } from './WorkspaceSettings';
import { PRIORITY_WORD, type Priority, type SnagRow, type SnagTone } from '../lib/snagsReport';
import { headcount, inCapacityTool, inMapTool, thingsOf, type Standard } from '../tools/linestandard/standard';
import { lineProblems, lineProblemsSaid } from '../lib/lineWork';
import { lineClosing, lineTiles, type LineReading } from '../lib/lineLean';
import { lineDay, neckOf } from '../lib/lineLoss';
import { problemCost } from '../lib/problemCost';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { QuestionCards, QuestionPanels } from '../ui/FactoryQuestions';
import { loadScopeQuestions, useScopeQuestions } from '../lib/useScopeQuestions';
import { areaOfPlace, isAreaPlace } from '../lib/areaPlace';
import { areaHref } from '../lib/areas';
import { balanceSays, openOf } from './LineToolsScreen';
import { studyLine } from './StudiesScreen';
import { currentLosses, studyHref } from '../lib/studyLinks';
import { useJobInputs } from '../lib/useJobInputs';
import { portfolio, type JobView } from '../lib/portfolio';
import type { Observation } from '../types';
import { between, stopMinutes, WEEK } from '../lib/intelligence';
import type { ToolStudy, StudyTool } from '../lib/study';
import type { Workspace } from '../types';
import { useProjects } from '../lib/useProjects';
import { useSixmsOnLine } from '../tools/sixm/SixMToolScreen';
import { sixmHref, sixmListHref } from '../tools/sixm/sixmTool';
import { MachinePicture } from '../ui/MachinePicture';
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
import { isRegisterKey, registerKeyOf, type RegisterKey } from '../tools/registers/kinds';

const TONE_CLASS: Record<SnagTone, string> = { g: 'is-g', r: 'is-r', w: 'is-w', a: 'is-a', n: 'is-n' };
/* PRIORITY, RAG (Rowland, 12 October) — always with its word. */
const PRIO_CLASS: Record<Priority, string> = { critical: 'is-r', high: 'is-a', low: 'is-g' };

/** The tools, as the rail names them, each opened on this line — the catalogue's
 *  (src/catalogue/registry), those it lists on a line, in the floor's order. A video study is a line
 *  balance read from footage (lib/video/record): it has its own row since 23 October (Rowland: "I add a
 *  tool to a line it doesn't go there" — it went, counted under Line balance, with no row of its own). */
export const TOOLS: { key: string; label: string; to: string; study?: StudyTool | 'video' | `calc:${string}`; standard?: true; what: string }[] = APP_TOOLS
  .filter(t => t.onLine && t.reads)
  .map(t => ({ key: t.key, label: t.label, to: t.to, ...(t.reads === 'standard' ? { standard: true as const } : { study: t.reads as StudyTool | 'video' | `calc:${string}` }), what: t.onLine as string }));

/** A tool's own uses among a line's or a project's studies — a video study is a balance study with
 *  footage, so it is the video's and never the line balance's. */
export const usesOfTool = (study: StudyTool | 'video' | RegisterKey | `calc:${string}`, studies: ToolStudy[]): ToolStudy[] =>
  studies.filter(s => !s.deletedAt && (study === 'video' ? !!s.facts?.video : isRegisterKey(study) ? registerKeyOf(s) === study
    /* a calculator that is a tool of its own reads only its own records; Calculators the rest (catalogue/calcTools) */
    : isCalcTool(study) || study === 'calc' ? s.tool === 'calc' && calcToolOf(s) === study : s.tool === study && !s.facts?.video));

export type LineTool = typeof TOOLS[number];

/** WHAT A TOOL'S LATEST FOUND ON A LINE, in its own words — the line's page
 *  tile and its report (FLOW-AUDIT.md, 10), and what Line Talk's assistant is
 *  told the line's tools found (screens/useTalkContext). */
/** What a tool's latest found, and — for Carry on (10 November) — the record it speaks of: its name, the finding
 *  apart from the name, where that record itself opens and when it was last changed. One reader for both. */
export type ToolSaid = { n: number; says?: string; tone?: string; name?: string; finding?: string; href?: string; at?: number;
  /** the record itself — its card reads its figures and picture from it (line/glance) */ study?: ToolStudy; standard?: Standard };

export function toolSaysOf(t: LineTool, d: { standards: Standard[]; studies: ToolStudy[]; obs: Observation[]; line: Workspace | null | undefined; wsId: string }): ToolSaid {
  const { standards, studies, obs, line, wsId } = d;
  if (t.standard) {
    const own = standards.filter(t.key === 'linebalance' ? inCapacityTool : inMapTool).sort((a, b) => b.updatedAt - a.updatedAt);
    const s = own[0];
    if (!s) return { n: 0 };
    const rec = { name: s.product, href: openOf(s, t.key === 'linebalance' ? 'balance' : 'map'), at: s.updatedAt, standard: s };
    if (t.key === 'linebalance') { const b = balanceSays(s); return { n: own.length, says: `${s.product}: ${b.text}`, tone: b.short ? 'r' : 'n', finding: b.text, ...rec }; }
    const people = headcount(s), things = thingsOf(s);
    const placed = people || things ? [`${people} ${people === 1 ? 'person' : 'people'}`, things].filter(Boolean).join(' · ') : 'nothing placed yet';
    return { n: own.length, says: `${s.product}: ${placed}`, finding: placed, ...rec };
  }
  const own = t.study ? usesOfTool(t.study, studies).sort((a, b) => b.startedAt - a.startedAt) : [];
  /* a loss count: the latest shift counted, as the line's card says it */
  const s = (t.study === 'losses' ? currentLosses(own, wsId) : undefined) ?? own[0];
  if (!s) return { n: 0 };
  const rec = { name: s.name, href: studyHref(s), at: s.updatedAt, study: s };
  /* a Line Talk is said as its conversation stands (lib/talk) */
  if (t.study === 'talk') { const talked = talkSaid(turnsOf(s.facts)); return { n: own.length, says: `${s.name}: ${talked}`, finding: talked, ...rec }; }
  const said = studyLine(s, t.study === 'losses' && line ? { observations: obs, workspaces: [line] } : undefined);
  /* a loss count's sentence names its shift itself */
  return { n: own.length, says: t.study === 'losses' ? said.text : `${s.name}: ${said.text}`, finding: said.text, tone: said.tone, ...rec };
}

/** Every saved use has its own identity; never replace earlier uses with the latest of a tool. */
export function toolUsesOf(t: LineTool, d: Parameters<typeof toolSaysOf>[1]) {
  const records = t.standard
    ? d.standards.filter(t.key === 'linebalance' ? inCapacityTool : inMapTool).filter(s => !s.deletedAt).map(s => ({ id: s.id, ...toolSaysOf(t, { ...d, standards: [s] }) }))
    : (t.study ? usesOfTool(t.study, d.studies) : []).map(s => ({ id: s.id, ...toolSaysOf(t, { ...d, studies: [s] }) }));
  return records.map(s => ({ ...s, key: `${t.key}:${s.id}`, tool: t.label, toolKey: t.key,
    place: s.study?.machine || 'Whole line',
    product: s.study?.product, newHref: `${t.to}?line=${encodeURIComponent(d.wsId)}&add=1` }));
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
export type LineView = 'overview' | 'machines' | 'actions' | 'tools' | 'reports' | 'logs' | 'projects' | 'setup';
export const LINE_VIEWS: readonly LineView[] = ['overview', 'machines', 'actions', 'tools', 'reports', 'logs', 'projects', 'setup'];

export function ProductionLineScreen({ wsId, view = 'overview' }: { wsId: string; view?: LineView }) {
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [mine, setMine] = useState<Snag[]>([]);
  const [busy, setBusy] = useState(false);
  const { projects } = useProjects();
  /* the 6Ms on this line, for its Tools (13 November, src/tools/sixm) */
  const sixms = useSixmsOnLine(wsId);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  /* the line's stops — a loss count's sentence reads the ones in its window */
  const [obs, setObs] = useState<Observation[]>([]);
  const [walkAssets, setWalkAssets] = useState<SnagAsset[]>([]);
  /* the factory's other lines — a dual line is made of some of them (lib/lines dualOf) */
  const [lines, setLines] = useState<Workspace[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [startingTool, setStartingTool] = useState(false);

  const [saved, setSaved] = useState<string | null>(null);
  /* the factory is changed by someone invited to the app, as on Your factory */
  const may = useCanStartProjects();

  /* TOOLS TICKED on the Tools page: a line report from them, or those that start with a name started together */
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [together, setTogether] = useState(false);
  const [togetherSaid, setTogetherSaid] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [w, every, std, ss, ws, on, o, wa] = await Promise.all([getWorkspace(wsId), listAllSnags(), listStandardsForLine(wsId), listStudiesForLine(wsId), listWorkspaces(), projectsOnWorkspace(wsId), listObservations(wsId), listSnagAssets(wsId)]);
    setLine(w ?? null);
    setJobIds(on);
    setLines(productionLines(ws));
    const mine = every.filter(s => s.workspaceId === wsId && !s.deletedAt && !s.archivedAt && s.status !== 'closed');
    setMine(mine);
    setStandards(std); setStudies(ss.filter(s => !s.deletedAt)); setObs(o); setWalkAssets(wa);
  }, [wsId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* its problems as rows, in priority order — the project each is for
     named; read by the one rule the control room's card and its numbers
     use (lib/lineWork lineProblems), so the three cannot disagree */
  /* priced as the register prices them (lib/problemCost): the minutes typed on the problem, the line's own cost model, its bottleneck — what's going wrong, by what it costs (look E, L2) */
  const probs = useMemo(() => lineProblems(mine, { id: wsId, name: line?.name ?? 'This line' }, { jobName: id => projects.find(p => p.id === id)?.name, assetName: s => walkAssets.find(a => a.id === s.assetId)?.name,
    costOf: s => problemCost(s, problemMachine(s, walkAssets.find(a => a.id === s.assetId)?.name), line ?? undefined, neckOf(standards, wsId)) }), [mine, projects, line, wsId, walkAssets, standards]);
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
  const allUses = useMemo(() => TOOLS.flatMap(t => toolUsesOf(t, { standards, studies, obs, line, wsId })).sort((a, b) => (b.at ?? 0) - (a.at ?? 0)), [standards, studies, obs, line, wsId]);
  const toolSays = useMemo(() => (t: LineTool) => toolSaysOf(t, { standards, studies, obs, line, wsId }), [standards, studies, obs, line, wsId]);
  /* ITS STOPS, the last four weeks — the count, the minutes (overlaps on one
     machine counted once, as every Pareto counts them) and the machine that
     stopped the most; the words the Stops timed row says. */
  const stops = useMemo(() => stopsOf(obs), [obs]);
  const openTool = (t: LineTool) => {
    if (t.standard && (t.to === '/balances' || t.to === '/standards')) {
      const own = standards.filter(t.to === '/balances' ? inCapacityTool : inMapTool);
      if (own.length === 1) { nav(openOf(own[0], t.to === '/balances' ? 'balance' : 'map')); return; }
    }
    if (t.study) {
      const own = usesOfTool(t.study, studies);
      if (own.length === 1) { nav(studyHref(own[0])); return; }
    }
    nav(`${t.to}?line=${encodeURIComponent(wsId)}`);
  };

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
  const checkCounts = useMemo(() => scopeCounts(studies, Date.now()), [studies]);
  /* how fresh the looking is (FC-199) — said on the line's papers beside its page */
  const looked = useLooking(useMemo(() => [wsId], [wsId]))?.[0];
  /* AN AREA'S OWN PLACE IS NOT A LINE (docs/AREAS.md A4): its address goes to the area's page, where its work is drawn */
  useEffect(() => { if (line && isAreaPlace(line)) { const a = areaOfPlace(line); if (a) navReplace(areaHref(a)); } }, [line]);
  const questions = useScopeQuestions(useMemo(() => (line ? [line] : null), [line]), { wrong: '#pl-problems', doing: '#fq-doing', who: '#fq-doing', worked: '#fq-worked' });
  const spread = spreadSentences(useYokoten(wsId) ?? undefined);
  const reading: LineReading | undefined = line ? {
    name: line.name, problems: probs, programs: { n: kit?.programs.length ?? 0, proved: kit?.proved ?? 0, late: kit?.late ?? 0, onStage: onStage.length },
    stops: { n: stops.n, minutes: stops.minutes, ...(stops.worst ? { worst: stops.worst } : {}) }, day: lineDay(line), jobs: jobIds.length,
    /* the line's check logs (src/tools/checks): a tile once it has one */
    ...(checkCounts.logs ? { checks: checkCounts } : {}),
    ...(looked ? { looking: lookingReading(line.name, looked.looking) } : {}),
    ...(spread.length ? { spread } : {}),
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
      titlePdf(doc, `${named} — summary`);
      const late = (p: Program) => standingOf(p, today) === 'overdue';
      const scope = await loadScopeQuestions([line]);
      await drawLineReport(doc, {
        client: line.clientName, site: line.siteName,
        result: scope.worked.proved.length ? { text: scope.worked.proved.slice(0, 2).map(f => `${f.what} — ${f.proof}`).join(' · '), tone: 'g' } : { text: 'No improvement verified by a before-and-after measurement yet.', tone: 'n' },
        actions: scope.doing.all.map(a => ({ what: a.what, meta: [a.who || 'Owner not assigned', a.where].filter(Boolean).join(' · '), right: a.due ? `${a.late ? 'Overdue · ' : ''}${niceDay(a.due)}` : 'No due date', tone: a.late ? 'r' : 'n' })),
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
          ...allUses.filter(x => x.says).map(x => ({ label: `${x.tool} · ${x.place}`, says: x.says as string, ...(x.tone ? { tone: x.tone } : {}) }))],
        jobs: jobs.map(p => { const v = jobViews?.get(p.id); return { name: p.name, method: methodOf(p).label, ...(v?.onTarget ? { verdict: v.onTarget.word, tone: v.onTarget.tone } : {}) }; }),
      });
      await deliverPdf(doc, pdfFileName(line.name, 'line report', today));
    } catch (e) {
      console.error('line report failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setBusy(false); }
  };
  /* EVERY MACHINE ON THE LINE, IN FULL (27 October — Rowland: "where are we on line 2A? I should be able to go to line
     2A ... and then print off a report that says, there you go. There's everything that's happening on that line
     currently"): the line's machines as the Factory's Machines says them, then each in full — every test and attempt,
     every program and its tests, every step, its problems and what was done, the studies (lib/machineDossier). */
  const printMachines = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { lineMachinesPaper } = await import('../lib/machineDossier');
      const { saveMachinesPaper } = await import('../lib/machinePaperPdf');
      const paper = await lineMachinesPaper(wsId);
      if (paper) await saveMachinesPaper(paper, [line.name, 'machines report']);
    } catch (e) {
      console.error('machines report failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setBusy(false); }
  };
  /* THE LINE, EDITED WHERE IT IS — its name and its type (Rowland, 13
     October: "change the types, the names of the lines. Again, always full
     edit control"), the same two boxes as Your factory; the Rename prompt it
     replaces asked only the name, in a box over the page. */
  const archive = async () => {
    if (!window.confirm(`Archive “${line.name}”?\n\nIt leaves the factory and loses nothing — its problems, captures, the walk and the evidence all stay. The factory’s Lines page restores it whenever you like.\n\nUndo brings it back now.`)) return;
    await archiveWorkspace(line.id);
    nav('/factory');
    offerUndo(`${line.name} archived`, async () => { await restoreWorkspace(line.id); });
  };
  const save = async (patch: Partial<Workspace>, what: string) => {
    /* the page answers at once — a tick is ticked as it is pressed — and the record follows */
    setLine(l => (l ? { ...l, ...patch } : l));
    await patchWorkspaceRecord(line.id, patch);
    setSaved(what);
    window.setTimeout(() => setSaved(null), 2600);
  };

  /* Stops timed — the line's first log; in Tools as before, and first under Logs */
  const stopsRow = (
    <li className="pl-stops-li">
      <button type="button" className="pl-tool is-stops" onClick={() => nav(`/w/${wsId}/${stops.n ? 'analyse' : 'capture'}`)}>
        <b>Stops timed</b>
        {stops.says && <span className={'pl-tool-says ie-tone is-' + stops.tone}>{stops.says}</span>}
        <span className="sub">{stops.n ? `The last four weeks — where the time goes, ranked by ${line.packsPerMin ? 'what it costs' : 'minutes lost'}` : 'None yet — the stopwatch, and the Pareto of what the stops cost'}</span>
        <span className="pl-tool-go" aria-hidden>›</span>
      </button>
      {/* THE STOPWATCH, BESIDE WHAT IT RECORDS (27 October: off the line's header) */}
      <button type="button" className="btn btn-sm pl-time" onClick={() => nav(`/w/${wsId}/capture`)}>Time a stop</button>
    </li>
  );
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
        primary={may && view === 'tools' ? { label: 'Start a tool', run: () => setStartingTool(true) } : undefined}
        papers={[
          /* THE LINE'S REPORTS ARE ITS REPORTS TAB (16 November, docs/NAV.md — Rowland: "multiple doors … I want this fixed"): the Summary and
             Everything stand there, nowhere else. A page of the line keeps only the paper of what it shows — the action tracker, the machines. */
          ...(view === 'actions' ? [{ label: 'Action tracker', for: 'every action open on the line — what, who, by when, late in red — and what was done in the last 30 days', disabled: busy, make: () => void import('../line/actions/lineActionsPaper').then(m => m.saveLineActionsPdf(wsId, line.name)) },
            { label: 'Action tracker — Excel', for: 'the same rows as a workbook to sort, filter and add to — who, the days, what each waits for', disabled: busy, make: () => void import('../line/actions/lineActionsPaper').then(m => m.saveLineActionsXlsx(wsId, line.name)) }] : []),
          ...(view === 'machines' ? [{ label: 'Machines report — every machine in full', for: 'each machine on the line: where it is up to, every test and every attempt, every program and its tests, every step, its problems and what was done, the studies', disabled: busy, make: printMachines }] : []),
        ]}
        more={[
          /* THE FILMED WALK, FROM THE LINE (20 October, docs/DIRECTION.md): film the line, freeze a
             frame, mark what is wrong on it — no job needed. */
          /* LINE TALK FROM THE LINE (5 November — Rowland: "I can only get to Line Talk from the main factory page"): on every page of the line */
          ...(may ? [{ label: 'Talk on this line — Line Talk', run: () => nav(`/talk?line=${encodeURIComponent(wsId)}`) }] : []),
          { label: 'Film the line', run: () => nav(`/w/${wsId}/snags?manage=1`) },
          ...(may ? [{ label: 'Line settings', run: () => nav(lineHref(wsId, 'setup')) }] : []),
        ]}
      />
      {(dual.madeOf.length > 0 || dual.partOf.length > 0) && (
        <p className="pl-dual sub" aria-label={dualWords ? `${dualWords[0]} ${dualWords[1]}` : undefined}>
          {dual.madeOf.length > 0 && <>Made of {dual.madeOf.map((w, i) => <span key={w.id}>{i > 0 ? ' + ' : ''}<a href={`#/lines/${w.id}`}>{w.name}</a></span>)}</>}
          {dual.madeOf.length > 0 && dual.partOf.length > 0 && ' · '}
          {dual.partOf.length > 0 && <>Part of {dual.partOf.map((w, i) => <span key={w.id}>{i > 0 ? ' and ' : ''}<a href={`#/lines/${w.id}`}>{w.name}</a></span>)}</>}
        </p>
      )}
      {view === 'setup' && may && <WorkspaceProvider wsId={wsId}><WorkspaceSettings bare direct linePage /></WorkspaceProvider>}
      {view === 'setup' && may && (
        <div className="pl-edit" role="group" aria-label="Edit the line">
          <Fold id="line-structure" title="Combined lines and archive" says="Connect this line to other lines, or put it away" start={false}>
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
          </Fold>
        </div>
      )}


      {/* THE LINE'S DOORS, AT THE TOP (7 November, docs/ENTERPRISE-UX.md X2 — Rowland: "why we need buttons at the top of the page not
          long card taking up large sections of the page"): how the line is seen — time a stop, walk it, film the work, talk it — a row of
          buttons under the header, each saying what it does in its title; the sums stay in the tools (docs/ADVANCED-TOOLS.md §5A). */}
      {show('overview') && (
        <section className="pl-sec pl-see pl-doorbar" aria-label="How this line is seen">
          <h2 className="pl-doorbar-h">See it on the line</h2>
          <ul className="pl-see-doors">
            <li>
              <button type="button" className="pl-see-door is-first" title="The stopwatch and its Pareto — every stop timed on the line" onClick={() => nav(`/w/${wsId}/capture`)}>
                <Icon name="time" size={16} /><b>Time a stop</b>
              </button>
            </li>
            <li>
              <button type="button" className="pl-see-door" title="You mark the frame; nothing is sent to a model." onClick={() => nav(walkAssets.length ? `/w/${wsId}/line` : `/w/${wsId}/snags?manage=1`)}>
                <Icon name="route" size={16} /><b>Walk the line</b><span className="sr-only">You mark the frame; nothing is sent to a model.</span>
              </button>
            </li>
            <li>
              <button type="button" className="pl-see-door" title="Times are read on the phone; naming the work from the frames is optional Claude, off until ticked." onClick={() => nav(`/video?line=${encodeURIComponent(wsId)}`)}>
                <Icon name="video" size={16} /><b>Film the work</b><span className="sr-only">Times are read on the phone; naming the work from the frames is optional Claude, off until ticked.</span>
              </button>
            </li>
            <li>
              <button type="button" className="pl-see-door" title="Luna, Faultline’s AI colleague, answers through the app; what you said is kept either way." onClick={() => nav(`/talk?line=${encodeURIComponent(wsId)}`)}>
                <Icon name="mic" size={16} /><b>Talk it</b><span className="sr-only">Luna, Faultline’s AI colleague, answers through the app; what you said is kept either way.</span>
              </button>
            </li>
            <li>
              <button type="button" className="pl-see-door" title="Every problem on the line, who and by when, and its Gantt" onClick={() => nav(lineHref(wsId, 'actions'))}>
                <Icon name="list" size={16} /><b>Action tracker</b>
              </button>
            </li>
          </ul>
        </section>
      )}
      {/* THE FOUR ANSWERS FOR THE LINE (15 November — agreed with Rowland 14 November: "the Factory's four answers shown for an area
          and for a line"): the Factory's cards counted from this line alone (lib/useScopeQuestions) — what's going wrong opens the
          Problems below, what needs doing and who the answer under them, did it work the fixes proved here. The tiles its report prints
          (lib/lineLean) moved into More about this line as "The line in figures" — nothing taken off the page. */}
      {show('overview') && <div className="pl-four"><QuestionCards q={questions} /></div>}
      {/* THE JOURNEY (docs/LOOK.md §0–1, look E — L2, 6 November): what's going wrong (the problems by what they cost, where on the line), what needs doing
          (the programs to prove, each with its day), did it work (the fixes proved here by their own before → after), then how the line is seen and its facts. */}
      {show('overview') && <p className="pl-q" aria-hidden>What’s going wrong</p>}
      {show('overview') && (<section className="pl-sec" id="pl-problems" aria-label="Problems on this line">
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
                  <button type="button" className={'pl-row' + (r.late ? ' is-late' : '')} onClick={() => openProblem(r.id)}>
                    <span className="pl-row-main">
                      <span className="qsl-what"><span className={'status-pill qsl-prio ' + PRIO_CLASS[r.priority]}>{PRIORITY_WORD[r.priority]}</span>{r.what}</span>
                      <span className="qsl-meta">{[r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="preg-right">
                      <span className={'status-pill qsl-state ' + TONE_CLASS[r.tone]}>{r.word}</span>
                      {r.due && <span className={'qsl-dueword ' + TONE_CLASS[r.dueTone ?? 'n']}>{r.due}</span>}
                      {/* what it costs the line a day, as the register's row says it (FC-154) — the money that says which problem first */}
                      <span className={'pl-row-cost' + (r.cost?.labour || r.cost?.contribution || r.cost?.materials ? ' is-r' : ' is-n')}>{r.cost ? r.cost.short : 'not priced'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>)}
      {/* WHAT NEEDS DOING ON THE LINE — every action owed on it (its own problems and its projects' actions) with who and by when, the
          fixes proved here under it when there are any; the four cards' doors land here */}
      {/* in a fold, shut on arrival (docs/DESIGN.md — the page no busier): its one line says how many, how many late and who has most */}
      {show('overview') && questions && (
        <section className="pl-work" aria-label="Work on this line"><QuestionPanels records={rec} q={questions} lines={null} scope={{ lineId: line.id, only: questions.worked.proved.length ? ['doing', 'worked'] : ['doing'], all: { doing: null }, limit: 5 }} /></section>
      )}
      {/* WHAT WE FOUND (13 November, the line-page brief — Rowland: "each card already showing its tool's own result, the headline figure
          and the graph the tool produced, so the page reads as evidence. Tapping a card expands it in place, and a button then takes me to
          the full tool"): the records in use on this line, newest first — each tool's record the one Tools on this line speaks of
          (toolSaysOf, one reader), now with its own figures and picture (line/glance — the tool's own functions; nothing worked out here).
          It replaces Carry on's thin rows (10 November): the same records in the same order, said with their evidence. */}
      {show('overview') && <section className="pl-sec pl-found" aria-label="What we found" data-carry-on data-found>
        <div className="pl-sec-h"><h2>Recent tool uses</h2><button type="button" className="btn btn-sm" data-all-tools onClick={() => nav(lineHref(wsId, 'tools'))}>All saved uses ›</button></div>
        <LineUseList uses={allUses.filter(x => x.study?.tool !== 'doc').slice(0, 5)} />
        {allUses.length > 0 && <Fold id="line-evidence" title="Results and charts" says="A visual review of the latest result from each tool; all individual uses are listed above" start={false}>
          <div className="ev-grid">{TOOLS.map(t => ({ t, said: toolSays(t) })).filter(x => x.said.href && x.t.study !== 'doc').map(({ t, said }) => <EvidenceCard key={t.key} id={t.key} tool={t.label} name={said.name} says={said.finding} tone={said.tone}
            glance={said.study ? glanceOfStudy(said.study) : said.standard && t.key === 'linebalance' ? glanceOfCapacity(said.standard, line) : { tiles: [] }} openLabel={`Open ${t.label}`} onOpen={() => nav(said.href as string)} />)}</div>
        </Fold>}
      </section>}
      {/* WHAT WE PRODUCED (the same brief — "Documents belong on the line too, as things of their own: an SOP built from a manual is just
          another thing on the line … group by what things are"): the documents written on this line (SOPs, work instructions, one-point
          lessons and the rest of the document tools), its planned-maintenance lists, and the manuals kept on its machines. Each row is the
          record's own sentence and opens the record. Shown only when there is one. */}
      {show('overview') && (() => {
        const docs = studies.filter(x => x.tool === 'doc').map(x => ({ id: x.id, kind: docTitle(x), name: x.name, says: studyLine(x).text, at: x.updatedAt, href: studyHref(x) }));
        const pms = studies.filter(x => x.tool === 'log' && x.agreed?.log?.key === 'planned-maintenance').map(x => ({ id: x.id, kind: 'Planned maintenance list', name: x.name, says: `${x.agreed?.log?.checks.length ?? 0} task${(x.agreed?.log?.checks.length ?? 0) === 1 ? '' : 's'}${x.machine ? ` · ${x.machine}` : ''}`, at: x.updatedAt, href: studyHref(x) }));
        const manuals = studies.map(machineDocOf).filter((d): d is MachineDoc => !!d).map(d => ({ id: d.id, kind: DOC_KIND_WORD[d.docKind], name: d.name, says: `${d.machine ? `${d.machine} · ` : ''}${docRowSaid(d)}`, at: d.at, href: d.machine ? `/lines/${wsId}/machine/${encodeURIComponent(d.machine)}` : lineHref(wsId, 'machines') }));
        const all = [...docs, ...pms, ...manuals].sort((a, b) => b.at - a.at);
        if (!all.length) return null;
        return (
          <section className="pl-sec pl-made" aria-label="What we produced" data-produced>
            <div className="pl-sec-h"><h2>What we produced</h2><span className="sub">{all.length}</span></div>
            <ul className="pl-made-rows">
              {all.map(x => (
                <li key={x.id}>
                  <button type="button" className="pl-made-row" data-made={x.id} onClick={() => nav(x.href)}>
                    <span className="pl-made-kind">{x.kind}</span>
                    <b className="pl-made-name">{x.name}</b>
                    <span className="pl-made-says">{x.says}</span>
                    <span className="pl-carry-go" aria-hidden>›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* THE LINE, MACHINE BY MACHINE — the tour, read in seconds (ui/LineTour) */}
      {show('overview') && kit && <LineTour line={line} machines={kit.machines.map(m => m.name)} records={kit.machines.map(m => m.record)} rows={rows} snags={mine} obs={obs} standards={standards} />}
      {/* MORE ABOUT THIS LINE (10 November — Rowland: "too busy … Things need to be simplified"): on the Overview everything after the
          machines — Programs, Spread what works, Eyes on the line, Photos from walks, Tools on this line, Logs, Projects, The line — in one
          fold, shut until opened (ui/Fold), each part unchanged inside it; on the line's other tabs they stand as before */}
      {(() => { const body = (<>
      {show('overview') && reading && <section className="pl-sec pl-figures" aria-label="The line in figures"><h2>The line in figures</h2><LeanTiles tiles={lineTiles(reading)} className="pl-tiles" /></section>}
      {show('overview') && <LineFindings line={line} />}
      {show('overview') && <p className="pl-q" aria-hidden>What needs doing</p>}
      {/* ITS MACHINES, IN FLOW ORDER (Stage 2) — the line's list, the one every
          picker reads (the stopwatch, the walk, a problem), each with who made it
          and its programs; a machine a job brought in says which job. Named here
          or in Set up the line, where the order and the names are changed. Its own tab since 27 October
          (Rowland: "I don't see your machine page") — each name opens the machine's page; the Overview's
          machine cards open it too. */}
      {(view === 'machines' || (view === 'setup' && !may)) && (<section className="pl-sec" aria-label="Machines on this line">
        <div className="pl-sec-h">
          <h2>Machines</h2>
        </div>
        {!kit?.machines.length
          ? (
            <EmptyState className="blank-list" title="No machines listed yet">
              {may ? 'Name them below, in flow order.' : null}
            </EmptyState>
          )
          : (
            <>
              {/* the Planner table head, as Set up's lines table says its columns (docs/ENTERPRISE-UI.md E2) */}
              <div className="pl-machines-head" aria-hidden>
                <span>Order</span><span>Machine</span><span>Who made it</span><span>Programs</span><span>Actions</span>
              </div>
              <ol className="pl-machines">
                {kit.machines.map(m => (
                  <MachineRow key={m.name} line={line} m={m} machineOrder={kit.machines.map(x => x.name)} may={may} programs={kit.programs.filter(p => p.assetId && p.assetId === m.record?.id)}
                    job={m.jobId ? projects.find(p => p.id === m.jobId)?.name : undefined} />
                ))}
              </ol>
            </>
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

      {show('overview') && <p className="pl-q" aria-hidden>Did it work</p>}
      {/* A PROVED FIX OFFERED TO EVERY LINE WITH THE SAME MACHINE (FC-155, tools/yokoten) — what this line proved, and what was offered to it */}
      {/* side by side at a desk (X2): what this line proved and how fresh the looking is — two short panels, not two long ones */}
      {show('overview') && (
        <div className="pl-duo">
          <SpreadFixes wsId={wsId} />
          {/* HOW FRESH THE LOOKING IS (FC-199, tools/gemba) — days since anyone looked at the line and at each machine, and what the looking found */}
          <LineLooking wsId={wsId} />
        </div>
      )}
      {/* PHOTOS FROM WALKS (10 November, docs/FACTORY-WALK.md) — filed to this line or a machine on it on a confirmed card, the one photograph */}
      {show('overview') && <WalkPhotos query={{ lineId: wsId }} />}
      {/* THE LINE'S ACTION TRACKER (7 November — line/actions): its problems as a classic tracker with the Gantt drawn from it */}
      {view === 'actions' && <>
        {/* PROBLEMS · ACTION TRACKER — one tab, two views (16 November, docs/NAV.md) */}
        <ViewTabs label="Problems on this line" value="actions" onChange={k => { if (k === 'problems') nav(`/snags?line=${encodeURIComponent(wsId)}`); }}
          views={[{ key: 'problems', label: 'Problems' }, { key: 'actions', label: 'Action tracker' }]} />
        <LineActions wsId={wsId} lineName={line.name} />
      </>}
      {view === 'reports' && <LineReports wsId={wsId} disabled={busy || !reading} summary={printLine} />}
      {show('tools') && (<section className={'pl-sec' + (view === 'tools' ? '' : ' is-glance')} aria-label="Tools on this line">
        <div className="pl-sec-h"><h2>Tools on this line</h2>
          {may && <button type="button" className="btn btn-ghost btn-sm pl-talk" onClick={() => nav(`/talk?line=${encodeURIComponent(wsId)}`)}>Talk on this line ›</button>}
          {/* NEW ▾ — a tool started here is this line's (src/catalogue/registry, docs/STRUCTURE.md §5.2) */}
        </div>
        {view === 'tools' && <LineUseList uses={allUses} searchable extra={sixms.map(s => ({ key: `sixm:${s.id}`, id: s.id, tool: '6M', toolKey: 'sixm', name: s.name, place: 'Whole line', href: sixmHref(s.id, { line: wsId }) }))} />}
        <Fold id="line-tool-library" title="Start a tool or combine reports" says="Choose a tool to use again, or select tools for a combined report" start={false}>
        {/* WHAT IS IN USE STANDS OUT (Rowland, 5 November: "tools used on this line — you can hardly see it, nothing really stands out"):
            the tools with records on this line first, each with what it found; the rest a quiet list to start from */}
        {(() => {
          const rows = TOOLS.map(t => ({ t, ...toolSays(t) }));
          const used = rows.filter(x => x.n > 0), unused = rows.filter(x => !(x.n > 0));
          const tick = (key: string, label: string) => view === 'tools' && (
            <label className="pl-tick"><input type="checkbox" checked={ticked.has(key)} aria-label={`Tick ${label}`}
              onChange={() => setTicked(s0 => { const n2 = new Set(s0); if (n2.has(key)) n2.delete(key); else n2.add(key); return n2; })} /></label>
          );
          return (
            <>
              <h3 className="pl-tools-h">In use on this line <span className="sub">{used.length}</span></h3>
              <ul className="pl-tools is-used">
                {/* THE STOPWATCH AND ITS PARETO — the floor's own tool, read from the line's stops: with stops it opens the ranking; with none, the stopwatch. */}
                {stopsRow}
                {/* 6M — a tool like the others (13 November, src/tools/sixm): the 6Ms on this line, the newest named; one opens itself */}
                {sixms.length > 0 && (
                  <li className="pl-tool-li">
                    <button type="button" className="pl-tool is-used is-n" data-sixm-tool onClick={() => nav(sixms.length === 1 ? sixmHref(sixms[0].id, { line: wsId }) : sixmListHref(wsId))}>
                      <b>6M</b>
                      <span className="pl-tool-says ie-tone is-n">{sixms[0].name}{sixms.length > 1 ? ` — and ${sixms.length - 1} more` : ''}</span>
                      <span className="sub">{sixms.length} on this line</span>
                      <span className="pl-tool-go" aria-hidden>›</span>
                    </button>
                  </li>
                )}
                {used.map(({ t, n, says, tone }) => (
                  <li key={t.key} className={'pl-tool-li' + (view === 'tools' ? ' has-tick' : '')}>
                    {tick(t.key, t.label)}
                    <button type="button" className={'pl-tool is-used is-' + (tone ?? 'n')} onClick={() => openTool(t)}>
                      <b>{t.label}</b>
                      {says && <span className={'pl-tool-says ie-tone is-' + (tone ?? 'n')}>{says}</span>}
                      <span className="sub">{n} on this line</span>
                      <span className="pl-tool-go" aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ul>
              {(unused.length > 0 || sixms.length === 0) && (
                <>
                  <h3 className="pl-tools-h">Not used on this line yet <span className="sub">{unused.length}</span></h3>
                  <ul className="pl-tools pl-tools-more">
                    {sixms.length === 0 && (
                      <li className="pl-tool-li">
                        <button type="button" className="pl-tool pl-tool-more" data-sixm-tool onClick={() => nav(sixmListHref(wsId))}>
                          <b>6M</b><span className="sub">the problem, its causes and what is being done</span><span className="pl-tool-go" aria-hidden>›</span>
                        </button>
                      </li>
                    )}
                    {unused.map(({ t }) => (
                      <li key={t.key} className={'pl-tool-li' + (view === 'tools' ? ' has-tick' : '')}>
                        {tick(t.key, t.label)}
                        <button type="button" className="pl-tool pl-tool-more" onClick={() => openTool(t)}>
                          <b>{t.label}</b><span className="sub">{t.what}</span><span className="pl-tool-go" aria-hidden>›</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          );
        })()}
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
        </Fold>
      </section>)}

      {/* LOGS (knowledge/specs/FC-236-check-logs.md): Stops timed, the line's first log, and every check log on the line */}
      {show('logs') && <LinesLogs wsId={wsId} studies={studies} stops={view === 'logs' ? stopsRow : null} may={may} view={view === 'logs'} />}


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
      {(show('overview') || (view === 'setup' && !may)) && (<section className="pl-sec" aria-label="The line">
        <div className="pl-sec-h">
          <h2>The line</h2>
          {may && <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(lineHref(wsId, 'setup'))}>Line settings ›</button>}
        </div>
        <dl className="pl-facts">
          <dt>Shifts</dt><dd className={facts.shifts ? '' : 'is-n'}>{facts.shifts ?? 'Not said yet — the loss count and capacity a shift need them'}</dd>
          <dt>Crew and cost</dt><dd className={facts.crew || facts.cost ? '' : 'is-n'}>{[facts.crew, facts.cost].filter(Boolean).join(' · ') || 'Not said yet — what a stop costs needs them'}</dd>
        </dl>
        {/* THE HOURLY RATE, WHERE THE LINE IS SET UP (Rowland, 4 November: "nowhere for me to put the cost of labour per hour ... how are we generating costs on anything?").
            It was only in a study's setup sheet; here it is typed in place — every cost in the app (a stop, a problem, a pack) is worked from it. */}
        {may && (
          <div className="pl-rate" data-line-rate>
            <label className="pl-rate-f"><span className="pe-k">PEOPLE ON THE LINE</span>
              <input className="text-input" type="number" inputMode="decimal" min={0} step="1" defaultValue={line.crew ?? ''} key={`crew-${line.crew ?? ''}`} placeholder="e.g. 6" aria-label="People on the line"
                onBlur={e => { const raw = e.target.value.trim(), v = parseFloat(raw); void patchWorkspaceRecord(line.id, { crew: raw && Number.isFinite(v) && v > 0 ? v : undefined }); }} /></label>
            <label className="pl-rate-f"><span className="pe-k">£ AN HOUR EACH</span>
              <input className="text-input" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={line.labourRatePerHour ?? ''} key={`rate-${line.labourRatePerHour ?? ''}`} placeholder="e.g. 18.50" aria-label="Labour rate, pounds an hour each"
                onBlur={e => { const raw = e.target.value.trim(), v = parseFloat(raw); void patchWorkspaceRecord(line.id, { labourRatePerHour: raw && Number.isFinite(v) && v > 0 ? v : undefined }); }} /></label>
          </div>
        )}
      </section>)}

      </>);
      return view === 'overview'
        ? <Fold id="line-more" title="More about this line" says="The line in figures, what Faultline has found, programs, spread what works, eyes on the line, all tools, logs, projects, set-up" start={false}>{body}</Fold>
        : body; })()}
      {show('overview') && reading && <LeanClosing closing={lineClosing(reading)} />}
      {startingTool && <StartLineTool line={wsId} open onClose={() => setStartingTool(false)} />}
    </div>
  );
}

/** ONE MACHINE ON THE LINE'S LIST — who made it typed in place, as before; and
 *  now renamed and taken off where it sits (the audit's bar 2), the same as
 *  Set up the line's chips: a rename carries its stops and its record with it
 *  (db/lineRecords renameLineMachine); taken off, its stops keep its name and
 *  its record waits for it, so Undo puts it back where it stood in the flow.
 *  A machine a job brought in is changed on its job. */
function MachineRow({ line, m, machineOrder, may, programs, job }: { machineOrder: string[]; line: Workspace; m: LineMachine; may: boolean; programs: Program[]; job?: string }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(m.name);
  const onList = (line.assets ?? []).some(a => a.trim() === m.name);
  const orderedMachines = machineOrder;
  const clash = orderedMachines.find(a => a.trim() !== m.name && a.trim().toLowerCase() === name.trim().toLowerCase());
  const rename = async () => {
    const to = name.trim();
    if (!to || clash) return;
    if (to !== m.name) {
      const current = await getWorkspace(line.id); if (!current) return; const assets = current.assets.some(a => a.trim() === m.name) ? current.assets.map(a => a.trim() === m.name ? to : a) : [...current.assets, to]; await patchWorkspaceRecord(line.id, { assets });
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
    await patchWorkspaceRecord(line.id, { assets: line.assets.filter(a => a.trim() !== m.name) });
    offerUndo(`Took “${m.name}” off ${line.name}`, async () => {
      const cur = await getWorkspace(line.id);
      if (!cur || cur.assets.some(a => a.trim() === m.name)) return;
      const next = [...cur.assets]; next.splice(Math.min(at, next.length), 0, m.name);
      await patchWorkspaceRecord(cur.id, { assets: next });
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
      {/* ITS OWN PAGE — everything ever done to it, every project's (slice 4, line/LineMachineScreen) */}
      <a className="pl-machine-name" href={`#/lines/${encodeURIComponent(line.id)}/machine/${encodeURIComponent(m.name)}`} aria-label={`${m.name} — its page`}><b>{m.name}</b> ›</a>
      {may
        ? <input className="text-input pl-oem" defaultValue={m.record?.oem ?? ''} key={m.record?.oem ?? ''} maxLength={80} placeholder="Who made it" aria-label={`Who made the ${m.name}`}
            onBlur={e => { const v = e.target.value.trim(); if (v !== (m.record?.oem ?? '')) void setMachineFacts(line.id, m.name, { oem: v }); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        : m.record?.oem ? <span className="sub pl-oem-said">{m.record.oem}</span> : null}
      {/* ITS PICTURE, here as on its page (Rowland, 3 November: "you can have it in both places") */}
      <MachinePicture wsId={line.id} name={m.name} record={m.record} compact previewOnly />
      <span className="sub pl-machine-on">{[programs.length ? `${programs.length} program${programs.length === 1 ? '' : 's'}, ${programs.filter(isProved).length} proved` : 'no programs', job ? `brought in by ${job}` : ''].filter(Boolean).join(' · ')}</span>
      {may && <label className="pl-machine-position"><span className="sub">Position</span><select className="text-input" aria-label={`Position of ${m.name}`} value={orderedMachines.findIndex(a => a.trim() === m.name)} onChange={e => { const position = Number(e.target.value); void (async () => { const current = await getWorkspace(line.id); if (!current) return; const items = [...new Set([...orderedMachines, ...current.assets.filter(a => a.trim().toLowerCase() !== 'whole line')])].filter(a => a.trim() !== m.name); items.splice(Math.min(position, items.length), 0, m.name); const placeholders = current.assets.filter(a => a.trim().toLowerCase() === 'whole line'); const assets = [...placeholders, ...items]; await patchWorkspaceRecord(line.id, { assets }); })(); }}>{orderedMachines.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label>}
      {may && (
        <span className="lt-acts pl-machine-acts" role="group" aria-label={`Actions for ${m.name}`}>
          <MoreMenu label="More" items={[{ label: 'Rename', run: () => { setName(m.name); setNaming(true); } }, ...(onList && !m.record?.projectId ? [{ label: 'Remove', danger: true, run: () => void takeOff() }] : [])]} />
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
