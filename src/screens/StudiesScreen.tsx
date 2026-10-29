/* A TOOL'S PAGE — every study made with it, on every line and job, the
 * maker's unfiled ones first (docs/TOOLKIT.md, Part 0: "Tools, on the rail:
 * each tool's page lists its studies across every line and job, with Not
 * filed first for the maker").
 *
 * Rowland, 10 October: "Tools can be adjacent to do-one sessions, just to
 * allow quick use of the tool." So a new one asks only what it is of — no
 * line, no job. It is a quick session, its maker's alone, kept under "Not
 * filed": a calculator that remembers. Putting it on a line and attaching it
 * to a job come after, on the study itself.
 *
 * One tool today, the capability study (docs/BUILD.md, 2d). Every later tool
 * is one more entry in TOOL_WORDS and one more `tool` on the record. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { asked, machineOntoLine } from '../lib/lines';
import { listAllStudies, listObservations, listStandardsForLine, listWorkspaces, onDataChange, putStudy } from '../db';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useInProject } from '../lib/useInProject';
import { inScope, startLine, type ProjectScope } from '../lib/inProject';
import { ProjectScopeChips } from '../ui/ProjectScope';
import { useArchivedPlaces } from '../lib/useFactoryLines';
import type { Standard } from '../tools/linestandard/standard';
import { useProjects } from '../lib/useProjects';
import { useMachinesOf, useProjectMachines } from '../lib/useLineRecords';
import { countsFor, setupProblem, startingReasons } from '../tools/reliability/lineWatch';
import { DEFAULT_STOP_REASONS } from '../tools/reliability/repair';
import { ReasonsEditor } from '../tools/reliability/ReasonsEditor';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { PageHeader } from '../ui/parts';
import { Sheet } from '../ui/Sheet';
import { sample, sampleSays } from '../tools/capability/sample';
import { lossFiguresOf, studyHref, type StudyContext } from '../lib/studyLinks';
import { removeStudy, StudyRowName } from '../ui/StudyActs';
import { useAccess } from '../cloud/access';
import { can as canOf } from '../lib/access';
import { rateForCount } from '../ui/ShiftLosses';
import { dur, flowFigures, share } from '../tools/valuestream/steps';
import { changeoverFigures, changeoverSays, figuresOf, mins } from '../tools/changeover/changeover';
import { samplingSays } from '../tools/sampling/sampling';
import { plural, relAll, span, studyReliabilitySays } from '../tools/reliability/reliability';
import { chartFigures, chartSays } from '../tools/chart/chart';
import { analysisFigures, analysisSays } from '../tools/analysis/analysis';
import { calcSays } from '../tools/calc/calc';
import { overTime, overTimeSays } from '../tools/capability/overTime';
import { firstCount, lossLine, windowWords } from '../tools/losses/losses';
import type { StudyTool, ToolStudy } from '../lib/study';
import type { Observation, Workspace } from '../types';

type ToolWords = { title: string; one: string; lede: string; add: string; placeholder: string; none: string; second: { label: string; placeholder: string } };
const CAPABILITY: ToolWords = {
  title: 'Capability study',
  one: 'Capability study',
  lede: 'A measurement against one limit or two, or items that pass or fail — does it pass, would it keep passing all shift (Ppk, and how sure), and what does a pass prove? Use one on its own, then put it on a line or attach it to a project.',
  add: 'New capability study',
  placeholder: 'e.g. Weight accuracy 400 g',
  none: 'No capability studies yet. Say what it is of, agree what it is judged against and how many, then take them — on the phone at the machine.',
  second: { label: 'On which machine?', placeholder: 'e.g. Checkweigher' },
};
/* Rowland, 11 October: a swimlane grid of what, who and the value — and
   always a line's: "remove business-wide mapping ... but keep the line
   large, different departments can affect the line". */
const MAP: ToolWords = {
  title: 'Value stream map',
  one: 'Value stream map',
  lede: 'One line, end to end — from the material arriving to the pallet leaving — every step in the lane of whoever does it, the departments that touch the line included, coloured by its value, with how long it takes and how long it waits. Use one on its own, or attach it to a project.',
  add: 'New value stream map',
  placeholder: 'e.g. Film in to pallet away — Maris Piper 2kg',
  none: 'No value stream maps yet. Pick a line, start where its work starts, and add each thing done on it, in the lane of whoever does it, to the pallet leaving.',
  second: { label: 'Which product or family?', placeholder: 'e.g. Finest Red 2kg' },
};
/* SMED, quick changeover (tool 6): Shingo's stages — record, separate,
   convert, streamline, standardise — on a grid of who does what; the ladder
   to single-digit minutes; what the changeovers cost the line; how often
   each product can run. Stored as tool `changeover`. */
const CHANGEOVER: ToolWords = {
  title: 'SMED',
  one: 'SMED — quick changeover',
  lede: 'From the last good piece of one product to the first good piece of the next at full rate, element by element — lapped on the phone as it happens, with who does each. Then Shingo\'s stages: separate the internal (the line stopped) from the external, convert internal to external, streamline what is left — towards single-digit minutes — and what the changeovers cost a shift, a week, a year. Use one on its own, or on a line and a project.',
  add: 'New SMED',
  placeholder: 'e.g. Finest Red 2kg',
  none: 'No SMED yet. Say which product the line runs and which it changes to, then Lap each element as it ends — on the phone at the line.',
  second: { label: 'To which product?', placeholder: 'e.g. Express 1.25 kg' },
};
/* Work sampling (docs/TOOLKIT.md, tool 9): the shift's moments drawn at
   random, one tap per person at each — the shares, each with its margin. A
   line's people are the ones watched, its product's standard brings them. */
const SAMPLING: ToolWords = {
  title: 'Work sampling',
  one: 'Work sampling',
  lede: 'What people are doing across a shift — working, walking, waiting, searching, away — from one tap per person at random moments. Every share is said with the margin it carries; nobody follows anyone with a stopwatch.',
  add: 'New work sampling',
  placeholder: 'e.g. Packing hall, day shift',
  none: 'No work sampling yet. Pick a line and who is watched; the phone asks at random moments of the shift, and one tap per person says what each was doing.',
  second: { label: 'Which product?', placeholder: 'e.g. Maris Piper 2kg' },
};
/* A shift's losses by hand (docs/TOOLKIT.md, tool 7): two counts at the end
   of the shift, the stops already timed in Capture, the waterfall in minutes
   and pounds — never a percentage, never a sensor. Always a line's. */
const LOSSES: ToolWords = {
  title: 'Loss count',
  one: 'Loss count',
  lede: 'A shift\u2019s losses, by hand: of what the line should have made, where did the rest go — and how much do we not yet know? Two counts at the end of the shift and the stops already timed; the waterfall draws itself, in minutes and pounds.',
  add: 'New loss count',
  placeholder: 'e.g. Shift 1, 10 Oct',
  none: 'No loss counts yet. Pick a line; at the end of the shift, pick the shift and type the packs made and the rejects — the stops timed through the shift explain the rest.',
  second: { label: 'Which product?', placeholder: 'e.g. Maris Piper 2kg' },
};
/* A MACHINE'S RELIABILITY (docs/TOOLKIT.md, tool 13; Rowland, 21 October):
   a person at the machine, a watch started and stopped while it is watched
   running, and a tap for each event — MTBF and the failure rate, firming up
   as the watching builds. Stored as tool `reliability`. */
const RELIABILITY: ToolWords = {
  title: 'Reliability',
  one: 'Reliability study',
  lede: 'Stand at a machine: start the watch while you watch it run, stop it while it is down or you are away, and tap each event — a stop, a failure, a pick — as you see it. MTBF and the failure rate work themselves out, with how sure they are, the gaps, the trend and what it costs; come back another day and the figures build. Use one on its own, or on a line and a project.',
  add: 'New reliability study',
  placeholder: 'e.g. Filler 2 stops',
  none: 'No reliability studies yet. Say which machine, agree what counts as an event, then start the watch at the machine and tap each one you see.',
  second: { label: 'Which machine?', placeholder: 'e.g. Filler 2' },
};

/* AN ANALYSIS (knowledge/specs/FC-105-analysis.md, W3a): one question asked first — how sure, did it change, do two ways
   agree, how many readings — and the answer in words with its margin. Stored as tool `analysis`. */
const ANALYSIS: ToolWords = {
  title: 'Analysis',
  one: 'Analysis',
  lede: 'Is a figure sure enough to act on, did it really change, do two ways of measuring agree, do groups differ, are two things linked, what moves with what, how many readings does it take? Ask one question, type or paste the readings, and read the answer in words — “we can be 95% confident” — with the margin and what it does not say.',
  add: 'New analysis',
  placeholder: 'e.g. Fill weight before and after the re-calibration',
  none: 'No analyses yet. Say what you want to know, then type or paste the readings — on the phone at the machine, or at a desk.',
  second: { label: 'On which machine?', placeholder: 'e.g. Multihead weigher' },
};

/* A CONTROL CHART (knowledge/specs/FC-086-charts.md, W2): readings in order against limits set from a
   steady period and kept, the signals in words, the CUSUM saying since when. Stored as tool `chart`. */
const CHART: ToolWords = {
  title: 'Control chart',
  one: 'Control chart',
  lede: 'Readings in the order taken, against limits set from a steady period and kept — one at a time, or in subgroups — and what moved said in words: a point beyond a limit, a run on one side, and, for a drift too small for the limits, since when. Pre-control for approving a set-up. Use one on its own, then put it on a line or attach it to a project.',
  add: 'New control chart',
  placeholder: 'e.g. Fill weight 400 g',
  none: 'No control charts yet. Say what is measured, take the first twenty to set the limits, then keep taking them — on the phone at the machine.',
  second: { label: 'On which machine?', placeholder: 'e.g. Multihead weigher' },
};

const OWNER = canOf('owner');

export const TOOL_WORDS: Partial<Record<StudyTool, ToolWords>> = { capability: CAPABILITY, map: MAP, changeover: CHANGEOVER, sampling: SAMPLING, losses: LOSSES, reliability: RELIABILITY, chart: CHART, analysis: ANALYSIS };

export { studyHref } from '../lib/studyLinks';

/** What a study says in a line on a list: the verdict, from the module. A
 *  loss count reads the line's stops in its window (`ctx`) — without them
 *  it says the loss and not where it went. */
export function studyLine(s: ToolStudy, ctx?: StudyContext): { text: string; tone: string } {
  if (s.tool === 'changeover') {
    const said = changeoverSays(figuresOf(s.facts));
    return { text: said.verdict, tone: said.tone };
  }
  if (s.tool === 'map') {
    const f = flowFigures(s.facts.flow, s.agreed?.map);
    return { text: f.steps ? `lead time ${f.untimed ? 'at least ' : ''}${dur(f.leadSec)} · ${share(f.pce ?? 0)} adds value` : 'no steps yet', tone: 'n' };
  }
  if (s.tool === 'sampling') return { text: samplingSays(s.agreed?.sampling, s.facts.taps ?? []).verdict, tone: 'n' };
  if (s.tool === 'analysis') { const c = s.agreed?.analysis; if (!c) return { text: 'not set up yet', tone: 'n' }; const said = analysisSays(analysisFigures(c, s.facts.readings ?? []), c); return { text: said.verdict, tone: said.tone }; }
  if (s.tool === 'calc') { const said = calcSays(s); return { text: said.verdict, tone: said.tone }; }
  if (s.tool === 'chart') { const c = s.agreed?.chart; if (!c) return { text: 'not set up yet', tone: 'n' }; const said = chartSays(chartFigures(c, s.facts.readings ?? []), c); return { text: said.verdict, tone: said.tone }; }
  if (s.tool === 'reliability') { const said = studyReliabilitySays(s.agreed?.reliability, s.facts.watch, s.facts.events); return { text: said.verdict, tone: said.tone }; }
  if (s.tool === 'losses') {
    const c = s.facts.losses;
    if (!c) return { text: 'not yet counted', tone: 'n' };
    const l = lossLine(lossFiguresOf(s, ctx), c);
    return { text: l.text, tone: l.abnormal ? 'a' : 'n' };
  }
  const a = s.agreed?.readings;
  const said = sampleSays(sample(a, s.facts.readings ?? []), a);
  if (s.overrule) return { text: `${s.overrule.verdict} · overruled`, tone: 'n' };
  return { text: said.verdict, tone: said.tone };
}

/** Each tool's list of every study, every line — "Every line" from one line's list. */
const TOOL_HOME: Partial<Record<StudyTool, string>> = { capability: '/capability', map: '/value-stream', changeover: '/smed', sampling: '/sampling', losses: '/losses', reliability: '/reliability', chart: '/chart', analysis: '/analysis' };

export function StudiesScreen({ tool }: { tool: StudyTool }) {
  const w = TOOL_WORDS[tool] ?? CAPABILITY;
  const { projects } = useProjects();
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  /* A loss count's line reads its stops in the window: the lines' logs, for
     the loss counts listed — nothing read for the other tools. */
  const [obs, setObs] = useState<Observation[]>([]);
  /* ?add=1 — a link straight to New, open at once (lib/lines asked) */
  const [adding, setAdding] = useState(() => asked('add') === '1');
  /* opened from a line's own page: that line's only, and New starts on it */
  const onLine = useMemo(() => asked('line'), []);
  /* INSIDE A PROJECT (docs/PROJECTS.md, P2): its own first, everything on its
     lines or every line one tap away, and New made on it */
  const inP = useInProject();
  const [scope, setScope] = useState<ProjectScope>('project');
  const mayP = useAccess(inP.id ?? '');
  const mayAdd = !inP.id || mayP.edit;

  const load = useCallback(async () => {
    const [all, ws] = await Promise.all([listAllStudies(), listWorkspaces()]);
    const mine = all.filter(s => s.tool === tool);
    setList(mine); setLines(ws);
    if (tool === 'losses') {
      const ids = [...new Set(mine.flatMap(s => (s.workspaceId ? [s.workspaceId] : [])))];
      setObs((await Promise.all(ids.map(id => listObservations(id)))).flat());
    }
  }, [tool]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* Not filed first, then each line, then a job with no line of its own. */
  /* an archived job's own records — on no line, or on its own walk — go into the
     archive with it; a record on a line of the factory is the line's and stays */
  const put = useArchivedPlaces();
  const groups = useMemo(() => {
    const by = new Map<string, ToolStudy[]>();
    for (const s of inScope(list ?? [], scope, inP.id, inP.lineIds)) {
      const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none';
      if (put.has(k) && !(inP.id && s.projectId === inP.id)) continue;
      by.set(k, [...(by.get(k) ?? []), s]);
    }
    return [...by.entries()].sort(([a], [b]) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)));
  }, [list, put, scope, inP.id, inP.lineIds]);
  const shownGroups = onLine ? groups.filter(([k]) => k === `ws:${onLine}`) : groups;
  const onLineName = onLine ? (lines.find(l => l.id === onLine)?.name ?? 'this line') : undefined;
  const groupName = (k: string) => (k === 'none' ? 'Not filed'
    : k.startsWith('ws:') ? (lines.find(l => l.id === k.slice(3))?.name ?? 'A line')
    : `Project: ${projects.find(p => p.id === k.slice(4))?.name ?? 'a project'}`);

  /* EVERY ONE SHOWN, ON PAPER (lib/studiesPdf; docs/AUDIT.md, bar 3) — the
     studies in the order the page shows them, each said where it sits */
  const [printing, setPrinting] = useState(false);
  const shownCount = shownGroups.reduce((n, [, rows]) => n + rows.length, 0);
  const paper = async () => {
    if (printing || !shownCount) return;
    setPrinting(true);
    try {
      const [{ saveStudiesPdf }, { listAllStandards }] = await Promise.all([import('../lib/studiesPdf'), import('../db')]);
      const items = shownGroups.flatMap(([, rows]) => rows.map(s => {
        const line = lines.find(l => l.id === s.workspaceId), job = projects.find(p => p.id === s.projectId);
        return { s, where: `${line ? `On ${line.name}` : 'On no line'} · ${job ? `attached to ${job.name}` : 'on no project'}` };
      }));
      const title = onLineName ? `${w.title} — ${onLineName}` : inP.project && scope === 'project' ? `${w.title} — ${inP.project.name}` : w.title;
      await saveStudiesPdf({ title, printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        items, standards: await listAllStandards(), ctx: { observations: obs, workspaces: lines } }, title);
    } catch (e) {
      console.error('studies pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setPrinting(false); }
  };

  return (
    <div className="wrap qsl ie-list">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3): New the one thing to do; the list on paper in Report ▾,
          named for what it is (it was "PDF (all shown)") */}
      <PageHeader title={w.title} says={<span className="sub">{w.lede}</span>}
        primary={mayAdd ? { label: w.add, run: () => setAdding(true) } : undefined}
        papers={shownCount > 0 ? [{ label: `${w.title} — every one shown`, for: 'each with what it found, a page a study', disabled: printing, make: () => paper() }] : []} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {onLine && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className="chip on" aria-pressed>{onLineName}</button>
          <button type="button" className="chip" onClick={() => nav(TOOL_HOME[tool] ?? '/capability')}>All lines</button>
        </div>
      )}
      {list && shownGroups.length === 0 && (
        <div className="qsl-empty">
          <p>{onLine ? `None on ${onLineName} yet.` : inP.id && scope !== 'all' ? `None ${scope === 'project' ? 'on' : 'on the lines of'} ${inP.project?.name ?? 'this project'} yet.` : w.none}</p>
          {mayAdd && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>{w.add}</button>}
        </div>
      )}
      {tool === 'capability' && <OverTimeTable studies={shownGroups.flatMap(([, rows]) => rows)} />}
      {shownGroups.map(([k, rows]) => (
        <section key={k} className="qsl-g">
          <div className="qsl-gh">
            <h2>{groupName(k)}</h2>
            <span className="sub">{rows.length} {rows.length === 1 ? 'study' : 'studies'}{k === 'none' ? ' — yours alone until you put one on a line' : ''}</span>
          </div>
          <ul className="lt-rows">
            {rows.map(s => <StudyRow key={s.id} s={s} ctx={tool === 'losses' ? { observations: obs, workspaces: lines } : undefined} />)}
          </ul>
        </section>
      ))}
      <NewStudy open={adding} tool={tool} onClose={() => setAdding(false)} onLine={onLine} project={inP.project && mayAdd ? { id: inP.project.id, name: inP.project.name, lineIds: inP.lineIds } : undefined} />
    </div>
  );
}

/** CAPABILITY ACROSS PRODUCTS AND OVER TIME (FC-101): the studies shown, side by side — a row each product, a column each month. */
function OverTimeTable({ studies }: { studies: ToolStudy[] }) {
  const t = useMemo(() => overTime(studies), [studies]);
  if (!t) return null;
  return (
    <section className="ot" aria-label="Capability across products and over time">
      <div className="qsl-gh"><h2>Capability over time</h2><span className="sub">{overTimeSays(t)}</span></div>
      <div className="ot-wrap">
        <table className="ot-t">
          <thead><tr><th scope="col">Product or machine</th>{t.months.map(m => <th key={m.key} scope="col">{m.label}</th>)}<th scope="col">Latest</th></tr></thead>
          <tbody>
            {t.rows.map(r => (
              <tr key={r.who} data-who={r.who}>
                <th scope="row">{r.who}</th>
                {t.months.map(m => { const c = r.cells[m.key]; return <td key={m.key} className={c ? 'is-' + c.tone : 'is-none'}>{c ? <button type="button" className="linkish" onClick={() => nav(`/capability/${c.id}`)}>{c.text}{c.studies > 1 ? ` ×${c.studies}` : ''}</button> : '—'}</td>; })}
                <td className={'is-' + r.latest.tone}><b>{r.latest.verdict}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** An analysis on a list: the question, and what has been typed. */
function analysisWhere(s: ToolStudy): string {
  const c = s.agreed?.analysis;
  if (!c) return 'not set up yet';
  const n = (s.facts.readings ?? []).filter(r => !r.struck).length;
  const ask = { sure: 'how sure', change: 'did it change', paired: 'two ways', groups: 'do groups differ', table: 'counts in a table', relate: 'what moves with what', learn: 'how fast it is learned', gauge: 'is the gauge fit', grr: 'gauge R&R', shape: 'which shape fits', plan: 'how many readings' }[c.kind] ?? c.kind;
  const counts = c.kind === 'table' ? (s.facts.readings ?? []).filter(r => !r.struck && typeof r.made === 'number').reduce((t, r) => t + (r.made as number), 0) : n;
  const noun = c.kind === 'paired' || (c.kind === 'relate' && (c.drivers ?? []).length === 1) ? 'pair' : c.kind === 'relate' ? 'row' : c.kind === 'gauge' && c.gauge?.mode === 'drift' ? 'check' : c.kind === 'grr' ? 'cell' : c.kind === 'table' ? 'counted' : (c.kind === 'sure' && c.of !== 'mean') || (c.kind === 'change' && c.data === 'counted') || c.kind === 'learn' ? 'run' : 'reading';
  return c.kind === 'plan' && !n ? ask : c.kind === 'table' ? `${ask} · ${counts.toLocaleString('en-GB')} counted` : `${ask} · ${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** A control chart on a list: readings (or subgroups) and the signals. */
function chartWhere(s: ToolStudy): string {
  const c = s.agreed?.chart;
  if (!c) return 'not set up yet';
  const f = chartFigures(c, s.facts.readings ?? []);
  const n = c.kind === 'xbar' ? `${f.points.length} subgroup${f.points.length === 1 ? '' : 's'}` : `${f.n} reading${f.n === 1 ? '' : 's'}`;
  return `${n}${f.signals.length ? ` · ${f.signals.length} signal${f.signals.length === 1 ? '' : 's'}` : ''}${f.provisional && f.n ? ' · limits provisional' : ''}`;
}

/** A reliability study on a list: watched time and events, and running now. */
function relWhere(s: ToolStudy): string {
  const items = relAll(s.agreed?.reliability, s.facts.watch, s.facts.events);
  const f = items[0]?.f;
  if (!f) return 'not set up yet';
  return `${span(f.hours)} watched · ${items.map(i => `${i.f.n} ${plural(i.c.event, i.f.n)}`).join(' · ')}${f.runningSince ? ' · watching now' : ''}`;
}

/** ONE STUDY ON ITS TOOL'S LIST — opened with a tap; renamed and deleted where
 *  it sits (Rowland, 13 October: "always implement deletes and editing in
 *  everything"), the same two its own page has (ui/StudyActs). On a job the
 *  job's access says who may (the team renames, the owner deletes); a quick
 *  session or a line's, its people. */
function StudyRow({ s, ctx }: { s: ToolStudy; ctx?: StudyContext }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : OWNER;
  const [naming, setNaming] = useState(false);
  const said = studyLine(s, ctx);
  const n = (s.facts.readings ?? []).filter(r => !r.struck).length;
  const count = s.agreed?.readings?.count;
  const steps = (s.facts.flow ?? []).length;
  const lc = s.facts.losses;
  if (naming) return <li className="lt-li is-naming" data-study={s.id}><StudyRowName s={s} onDone={() => setNaming(false)} /></li>;
  return (
    <li className="lt-li" data-study={s.id}>
      <button type="button" className="lt-row" onClick={() => nav(studyHref(s))}>
        <b className="lt-what">{s.name || 'Not named'}{(s.machine || s.product) && s.tool !== 'changeover' ? <span className="ie-li-m"> · {s.machine ?? s.product}</span> : null}</b>
        <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
        <span className="lt-where">{s.tool === 'sampling' ? `${(s.agreed?.sampling?.who ?? []).length} watched · ${(s.facts.taps ?? []).filter(x => !x.struck).length} taps` : s.tool === 'map' ? `${steps} step${steps === 1 ? '' : 's'}${(s.facts.future ?? []).length ? ' · a future state' : ''}`
          : s.tool === 'changeover' ? `${(s.facts.sequence ?? []).length} element${(s.facts.sequence ?? []).length === 1 ? '' : 's'}${changeoverFigures(s.facts.sequence).enough ? ` · ${mins(changeoverFigures(s.facts.sequence).nowSec)}` : ''}`
          : s.tool === 'reliability' ? relWhere(s)
          : s.tool === 'chart' ? chartWhere(s)
          : s.tool === 'analysis' ? analysisWhere(s)
          : s.tool === 'losses' ? (lc ? `${windowWords(lc)} · ${new Date(lc.from).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : 'no shift picked yet')
            : count ? `${n} of ${count}` : `${n} reading${n === 1 ? '' : 's'}`}{s.closedAt ? ' · closed' : ''}</span>
      </button>
      {((may.edit && !s.closedAt) || may.remove) && (
        <span className="lt-acts">
          {may.edit && !s.closedAt && <button type="button" className="cw-link" onClick={() => setNaming(true)} aria-label={`Rename ${s.name || 'this study'}`}>Rename</button>}
          {may.remove && <button type="button" className="cw-link sp-rm" onClick={() => void removeStudy(s)} aria-label={`Delete ${s.name || 'this study'}`}>Delete</button>}
        </span>
      )}
    </li>
  );
}

/** A NEW ONE — what it is of, and the machine if it is one. Nothing else is
 *  asked first: it is a quick session until it is put somewhere. */
function NewStudy({ open, tool, onClose, onLine, project }: { open: boolean; tool: StudyTool; onClose: () => void; onLine?: string;
  /** Made inside a project: it is the project's, on its line when it has one (docs/PROJECTS.md, P2). */
  project?: { id: string; name: string; lineIds: string[] } }) {
  const w = TOOL_WORDS[tool] ?? CAPABILITY;
  const [name, setName] = useState('');
  const [machine, setMachine] = useState('');
  const [busy, setBusy] = useState(false);
  /* A VALUE STREAM is always a line's — what is done on it and who does it,
     the departments that touch it included (Rowland, 11 October: "remove
     business-wide mapping ... but keep the line large, different
     departments can affect the line"). */
  const [lineId, setLineId] = useState(onLine ?? '');
  /* inside a project, on the project's line when it has one — its lines offered first */
  const pLines = project?.lineIds;
  useEffect(() => { if (open && !lineId && pLines) setLineId(startLine(pLines)); }, [open, lineId, pLines]);
  /* the lines of Your factory, in floor order (lib/useFactoryLines) */
  const factoryLines = useFactoryLines(onLine);
  const lines = useMemo(() => (pLines?.length ? [...factoryLines.filter(l => pLines.includes(l.id)), ...factoryLines.filter(l => !pLines.includes(l.id))] : factoryLines), [factoryLines, pLines]);
  const [standards, setStandards] = useState<Standard[]>([]);
  useEffect(() => { if (lineId) void listStandardsForLine(lineId).then(setStandards); else setStandards([]); }, [lineId]);
  /* a map is always a line's; a sampling study watches a line's people; a
     LOSS COUNT is a line's too — its shifts, its stops and its cost model are
     the line's (tool 7), and it is named for its shift and day once counted */
  const isLine = tool === 'map' || tool === 'sampling' || tool === 'losses';
  const named = tool !== 'losses';
  /* A SMED is of a changeover from one product to the next: both are asked,
     the line when it is known (its standards offer the products and the
     plate speed, the interval needs it — but a quick session on its own
     still times a changeover and works it through the stages). */
  const isChange = tool === 'changeover';
  /* A RELIABILITY study is of a machine: the line is asked, optional — its
     machines are offered and its cost model prices the events — and a quick
     session on its own still watches a machine and counts. */
  const isRel = tool === 'reliability';
  /* A study of a machine started on a line offers the line's machines —
     the one list every "which machine" reads (lib/lineRecords machinesOf;
     flow audit #14: "A study's machine is typed"). */
  const onLineMachines = useMachinesOf(!isLine && !isChange ? lineId || undefined : undefined, project?.id);
  const ofProject = useProjectMachines(!isLine && !isChange ? project?.id : undefined);
  const lineMachines = useMemo(() => { const seen = new Set<string>(); return [...onLineMachines, ...ofProject].filter(m => { const k = m.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }); }, [onLineMachines, ofProject]);
  /* A RELIABILITY study picks its machine from a list (a real one, with the project's own machines in it), or
     the WHOLE LINE — the next screen is every machine, set up one by one and watched on one clock. */
  const WHOLE = '::whole-line', OTHER = '::other-machine';
  const [pick, setPick] = useState('');
  const [step, setStep] = useState<'one' | 'line'>('one');
  const [setup, setSetup] = useState<{ machine: string; on: boolean; counting: string; target: string; timed: boolean; reasons: string }[]>([]);
  const lineName = lines.find(l => l.id === lineId)?.name ?? project?.name ?? 'the line';
  const wholeLine = isRel && pick === WHOLE;
  useEffect(() => { if (!open) { setStep('one'); setPick(''); } }, [open]);
  const ready = (!named || !!name.trim() || wholeLine) && !busy && (!isLine || !!lineId) && (!isChange || !!machine.trim()) && (!wholeLine || lineMachines.length > 0);
  const toSetup = () => { setSetup(lineMachines.map(m => ({ machine: m, on: true, counting: 'stop', target: '', timed: true, reasons: DEFAULT_STOP_REASONS.join(', ') }))); setStep('line'); };
  const num = (v: string) => (v.trim() ? Number(v) : undefined);
  const lineProblem = setupProblem(setup.map(r => ({ machine: r.machine, on: r.on, counting: r.counting, targetMin: num(r.target), timed: r.timed, reasons: r.reasons })));
  /* every machine ticked becomes a reliability study of its own, all sharing one group — one clock for them all */
  const makeLine = async () => {
    if (lineProblem || busy) return;
    setBusy(true);
    try {
      const t = now(), group = uid();
      const picked = setup.filter(r => r.on);
      const made: ToolStudy[] = picked.map((r, i) => ({ id: uid(), tool: 'reliability' as const, name: name.trim() || `${lineName} — every machine`, machine: r.machine,
        ...(lineId ? { workspaceId: lineId } : {}), ...(project ? { projectId: project.id } : {}),
        agreed: { reliability: { group, counts: countsFor(r.counting, num(r.target), uid, r.timed ? { reasons: startingReasons(r.reasons) } : undefined) } }, facts: {}, uses: [], startedAt: t, createdAt: t + i, updatedAt: t + i }));
      for (const m of made) await putStudy(m);
      if (lineId) for (const m of made) if (m.machine) await machineOntoLine(lineId, m.machine);
      setName(''); setMachine(''); setPick(''); setStep('one'); onClose();
      nav(studyHref(made[0]));
    } finally { setBusy(false); }
  };
  const make = async () => {
    if (!ready) return;
    if (wholeLine) { toSetup(); return; }
    setBusy(true);
    try {
      const t = now();
      if (isChange) {
        const from = name.trim(), to = machine.trim();
        const std = standards.find(x => !x.deletedAt && x.product.trim().toLowerCase() === to.toLowerCase());
        const s: ToolStudy = { id: uid(), tool, name: `${from} → ${to}`, product: to,
          ...(lineId ? { workspaceId: lineId } : {}), ...(project ? { projectId: project.id } : {}), ...(std ? { standardId: std.id } : {}),
          facts: { fromProduct: from, toProduct: to, sequence: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t };
        await putStudy(s);
        setName(''); setMachine(''); onClose();
        nav(studyHref(s));
        return;
      }
      const second = machine.trim() ? (isLine ? { product: machine.trim() } : { machine: machine.trim() }) : {};
      /* A line's map sits on the line, and on its product's line standard when
         there is one — its people are the lanes; a loss count takes the
         ideal speed of the line's slowest station as its rate — a machine's
         plate speed, a person's standard time (the
         standard's capacity, else the job line's), the shift less its breaks
         as its planned minutes. */
      const std = isLine ? standards.find(x => !x.deletedAt && x.product.trim().toLowerCase() === machine.trim().toLowerCase()) : undefined;
      const s: ToolStudy = { id: uid(), tool, name: name.trim() || (tool === 'losses' ? 'Loss count' : ''), ...second,
        /* on its line — a line tool's always, any other's when started from the line's own page */
        ...(lineId ? { workspaceId: lineId } : {}), ...(project ? { projectId: project.id } : {}), ...(tool === 'map' ? { agreed: { map: { scope: 'line' as const } } } : {}), ...(std ? { standardId: std.id } : {}),
        facts: tool === 'losses' ? { losses: firstCount(lines.find(l => l.id === lineId)?.shifts ?? [], await rateForCount(lineId, std), t) } : {}, uses: [], startedAt: t, createdAt: t, updatedAt: t };
      await putStudy(s);
      /* a machine typed here joins its line's list — every machine is on a line (lib/lines) */
      if (!isLine && lineId) await machineOntoLine(lineId, machine);
      setName(''); setMachine(''); onClose();
      nav(studyHref(s));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={w.add}>
      {step === 'line' ? (
        <form className="lt-new rl-linesetup" onSubmit={e => { e.preventDefault(); void makeLine(); }}>
          <p className="sub">Every machine on <b>{lineName}</b>. Tick the ones you will watch and say what is counted at each — a stop, a jam, a pick, your own word (commas for more than one). One watch starts them all; you open each machine to tap its buttons.</p>
          <ul className="rl-linesetup-rows">
            {setup.map((r, i) => (
              <li key={r.machine} className="rl-linesetup-row" data-machine={r.machine}>
                <label className="rl-linesetup-on"><input type="checkbox" checked={r.on} aria-label={`Watch ${r.machine}`} onChange={e => setSetup(xs => xs.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} /> <b>{r.machine}</b></label>
                {r.on && (
                  <div className="rl-linesetup-in">
                    <label className="field"><span className="field-label">Counting</span>
                      <input className="text-input" value={r.counting} maxLength={60} aria-label={`What is counted at ${r.machine}`} onChange={e => setSetup(xs => xs.map((x, j) => (j === i ? { ...x, counting: e.target.value } : x)))} />
                    </label>
                    <label className="field"><span className="field-label">MTBF wanted, minutes</span>
                      <input className="text-input" inputMode="decimal" value={r.target} placeholder="no target" aria-label={`MTBF wanted at ${r.machine}, minutes`} onChange={e => setSetup(xs => xs.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} />
                    </label>
                    <label className="rl-tick rl-linesetup-timed"><input type="checkbox" checked={r.timed} aria-label={`Time each stop at ${r.machine} and press its reason`} onChange={e => setSetup(xs => xs.map((x, j) => (j === i ? { ...x, timed: e.target.checked } : x)))} /> <span>Time each stop and press its reason — help arrived, running again; the reason from the list</span></label>
                    {r.timed && (
                      <>
                        <div className="field"><span className="field-label">Reasons for a stop — add each one; they become the buttons on the stopwatch</span>
                          <ReasonsEditor value={r.reasons} onChange={v => setSetup(xs => xs.map((x, j) => (j === i ? { ...x, reasons: v } : x)))} usual={DEFAULT_STOP_REASONS} label={`a stop at ${r.machine}`} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {lineProblem && <p className="ie-note" role="status">{lineProblem}</p>}
          <div className="rl-linesetup-go">
            <button type="button" className="btn" onClick={() => setStep('one')}>Back</button>
            <button type="submit" className="btn btn-primary" disabled={!!lineProblem || busy}>Start the line watch — {setup.filter(r => r.on).length} machine{setup.filter(r => r.on).length === 1 ? '' : 's'}</button>
          </div>
        </form>
      ) : (
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        {project && <p className="sub ie-for" data-for-project={project.id}>For <b>{project.name}</b> — it is the project’s, with everything else in it.</p>}
        {(isChange || isRel) && (
          <label className="field"><span className="field-label">Which line? <i className="sub">{isRel ? 'leave as no line if it is on none — on a line, its machines are offered and what the stops cost is worked out' : 'optional — its products are offered, and the interval needs it'}</i></span>
            <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
              <option value="">No line yet — a quick session</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
        {isLine && (
          <label className="field"><span className="field-label">Which line?</span>
            <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
              <option value="">Pick the line…</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <span className="sub">{tool === 'losses' ? 'Its shifts, the stops timed on it and its cost model are what the count is read against.' : tool === 'map' ? 'A lane for each person or department whose work touches the line — Op 1, Op 2, the machine, the team leader, planning, stores, quality, maintenance.' : 'Its product’s line standard brings the people to watch; anyone else is added by name.'}</span>
          </label>
        )}
        {named && (
          <label className="field"><span className="field-label">{isChange ? 'From which product?' : 'What is it of?'}</span>
            <input className="text-input" value={name} maxLength={120} placeholder={w.placeholder} list={isChange ? 'new-co-products' : undefined} onChange={e => setName(e.target.value)} autoFocus />
          </label>
        )}
        {isRel && lineMachines.length > 0 && (
          <label className="field"><span className="field-label">{w.second.label} <i className="sub">one machine, or the whole line to watch every machine on one clock</i></span>
            <select className="text-input" value={pick} aria-label="Which machine" onChange={e => { const v = e.target.value; setPick(v); setMachine(v === WHOLE || v === OTHER ? '' : v); }}>
              <option value="">Pick a machine…</option>
              {lineMachines.map(m => <option key={m} value={m}>{m}</option>)}
              {lineMachines.length > 1 && <option value={WHOLE}>The whole line — all {lineMachines.length} machines</option>}
              <option value={OTHER}>Another machine — I’ll type it</option>
            </select>
          </label>
        )}
        {!(isRel && lineMachines.length > 0 && pick !== OTHER) && <label className="field"><span className="field-label">{w.second.label} {!isChange && <i className="sub">{isRel ? 'leave empty if you watch more than one' : 'optional'}</i>}</span>
          <input className="text-input" value={machine} maxLength={80} placeholder={w.second.placeholder} list={isLine ? 'new-map-products' : isChange ? 'new-co-products' : lineMachines.length ? 'new-study-machines' : undefined} onChange={e => setMachine(e.target.value)} />
          {!isLine && !isChange && lineMachines.length > 0 && <datalist id="new-study-machines">{lineMachines.map(m => <option key={m} value={m} />)}</datalist>}
          {(isLine || isChange) && <datalist id={isLine ? 'new-map-products' : 'new-co-products'}>{standards.filter(x => !x.deletedAt).map(x => <option key={x.id} value={x.product} />)}</datalist>}
          {isLine && standards.length > 0 && <span className="sub">{tool === 'map' ? 'A product with a line standard brings its people as the lanes.' : tool === 'losses' ? 'A product with a line standard brings its pace: the plate speed of its slowest machine, or a person’s standard time.' : 'A product with a line standard brings its people to watch.'}</span>}
          {isChange && standards.length > 0 && <span className="sub">A product with a line standard is where Set as the standard writes the agreed sequence.</span>}
        </label>}
        <button type="submit" className="btn btn-primary" disabled={!ready}>{wholeLine ? 'Next — the machines' : 'Start it'}</button>
      </form>
      )}
    </Sheet>
  );
}

