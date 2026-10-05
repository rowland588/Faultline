/* ONE LINE, ONE PAGE — everything a line is, top to bottom.
 *
 * The whole point of giving a line an owner is that the owner then has
 * something to own. So a line gets the same surface the project has, scoped to
 * itself: its problem, its numbers against target, its actions out of the
 * board, its wins, where it is limited, its own filmed walk — and its own
 * client report to send.
 *
 * Nothing here is a new implementation. Every part is the component the
 * project already uses, handed a line instead of a project, which is what makes
 * "each line has a full pack" true rather than approximately true.
 *
 * WHY ONE PAGE (the audit of 5 October, "What's home? There are four"): the
 * line was a third home — its own row of seven tabs under the job's own row,
 * and under it the line study with a fourth. Rowland: "what's home is home?
 * really home, or was it the home of the project home? it's just messy." So
 * the tabs are gone and each lens is a SECTION of this page, in the order the
 * work runs: the problem leads on a 6M line (the fishbone, as built), then the
 * numbers, the actions, the wins, the line balance, the filmed line. On a
 * stage-gate line: where each machine is, then the actions, wins and the
 * walk. Each section says its count in its own line and folds (ui/Fold) —
 * on a phone they start shut, so the page is the problem and one line per
 * section. Every old ?view= link still works: it lands on its section.
 * The line study (Capture · Analyse · Evidence · Meeting) is one line at the
 * foot, not a home of its own.
 *
 * What rolls upward: the project's client report reads every line's next steps,
 * wins and snags, so the owners filling these in ARE what the client ends up
 * reading. One source at the top, fed from underneath. */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Fold, openFold } from '../ui/Fold';
import { Journey } from '../ui/Journey';
import { PaceMeeting } from './PaceMeeting';
import { ActionSheet, type Editing } from '../ui/ActionSheet';
import { useImpacts } from '../lib/useImpacts';
import type { PaceAction } from '../lib/tracker';
import type { PaceLineRow } from '../db';
import { PaceNextSteps } from './PaceNextSteps';
import { PaceSuccess } from './PaceSuccess';
import { PaceSnags } from './PaceSnags';
import { useAccess } from '../cloud/access';
import { LineNumbers } from './NumbersPanel';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { lineOf } from '../lib/fishbone';
import { useMeasures } from '../lib/useMeasures';
import { lineSeries, say, vsTarget } from '../lib/measures';
import { useActions, WHOLE_PROJECT } from '../lib/actions';
import { useLineWorkspace } from '../lib/usePaceWorkspace';
import { planModel } from '../lib/planModel';
import { useLinePackCounts } from '../lib/useLinePack';
import { CapacityPanel } from './CapacityPanel';
import { FishboneJourney } from './FishboneScreen';
import { SawSheet } from '../ui/SawSheet';
import { AccessNote } from '../ui/AccessNote';
import { useProblems } from '../lib/useProblems';
import { PHASE_WORD, type Phase } from '../lib/problems';
import { analyse, shortSays } from '../lib/capacity';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { journeyOf, machineAt, machinesWhere } from '../lib/install';
import { live } from '../lib/testing';
import { todayISO } from '../lib/weeks';

/* THE SECTIONS, by the name each had as a tab. 'overview' is the top of the
   page: an old ?view=overview link lands there. */
type Lens = 'fishbone' | 'overview' | 'next' | 'wins' | 'snags' | 'data' | 'capacity';

/* What a link may call a section: the tab's old id (?view=next, ?view=data,
   ?view=snags, ?view=capacity — the ones every door in the app uses) and the
   section's own name. ?view=meeting is the actions, grouped by owner. */
const SECTION: Record<string, Lens> = {
  fishbone: 'fishbone', problem: 'fishbone',
  overview: 'overview',
  next: 'next', actions: 'next', meeting: 'next',
  wins: 'wins',
  snags: 'snags', evidence: 'snags', filmed: 'snags',
  data: 'data', numbers: 'data',
  capacity: 'capacity', balance: 'capacity',
};

/* The fold each section lives in — ui/Fold's id, which is how this device
   remembers it open or shut. The problem is never folded: it leads the page. */
const FOLD: Partial<Record<Lens, string>> = {
  next: 'line.actions', wins: 'line.wins', snags: 'line.filmed', data: 'line.numbers', capacity: 'line.balance',
};

/* WHAT A LINE ON A STAGE-GATE JOB HAS.
 *
 * No numbers and no line balance. A handover has no period target to measure
 * against and no reading to record: the rate is agreed once, per pack, and
 * either proved or not, in Testing. What it does have is its machines going
 * through the gates, the walk — filming is how a defect gets proved — and the
 * things somebody writes down while doing it. */
const PACED: Lens[] = ['data', 'next', 'wins', 'capacity', 'snags'];
const STAGE_GATE: Lens[] = ['next', 'wins', 'snags'];

/* The line study's four, in the order a study runs (ui/Peers studyPeers says
   the same four; this is the door to them from the line, which may not have a
   study yet — it is made on the way in). */
const STUDY: { path: string; label: string }[] = [
  { path: 'capture', label: 'Capture' }, { path: 'analyse', label: 'Analyse' },
  { path: 'snaglist', label: 'Evidence' }, { path: 'meeting', label: 'Meeting' },
];

/** The abnormal part of a count, red — "1 past due". Everything else in the
 *  line stays neutral (CLAUDE.md, visual management rule 3). */
const Late = ({ n, word }: { n: number; word: string }) => (n > 0 ? <> · <span className="ln-late">{n} {word}</span></> : null);

/** The board's editor, opened from a by-owner card — with "did it work?" read
 *  the way the board reads it. Its own component so the impacts are worked out
 *  only while a sheet is open. Access is the sheet's own (useAccess): a client
 *  reads it, the team changes it, the owner deletes. */
function LineActionSheet({ projectId, editing, lines, onClose }: {
  projectId: string; editing: Editing; lines: PaceLineRow[]; onClose: () => void;
}) {
  const { impacts } = useImpacts(projectId);
  return <ActionSheet editing={editing} lines={lines} impact={impacts.get(editing.step.id)} onClose={onClose} />;
}

/** WHERE EACH MACHINE IS — the first section of a line on a stage-gate job:
 *  the job's machines and their four gates, read off lib/install (the same
 *  reading the job's front page and the client report draw), tap a gate to
 *  open it. Its own component so the machines, their steps and their programs
 *  are read only on a stage-gate line. */
function LineMachines({ projectId }: { projectId: string }) {
  const tt = useTesting(projectId);
  const { programs } = usePrograms(projectId);
  const today = todayISO();
  const machines = live(tt.assets);
  const journeys = machines.map(a => journeyOf(a, tt.tests, tt.items, today, programs));
  const late = journeys.filter(j => j.some(g => g.tone === 'late')).length;
  const says = tt.loading ? undefined
    : machines.length === 0 ? 'no machines on the job yet'
      : <>{machinesWhere(machines.map((a, i) => machineAt(a, journeys[i]).short))}<Late n={late} word="late or a problem" /></>;
  return (
    <div id="line-machines" className="ln-sec">
      <Fold id="line.machines" title="Where each machine is" says={says} need>
        {!tt.loading && machines.length === 0 && (
          <p className="sub ln-none">The job’s machines are added on Install — each one is then taken through its gates here.</p>
        )}
        <Journey projectId={projectId} assets={tt.assets} tests={tt.tests} items={tt.items} />
      </Fold>
    </div>
  );
}

export function ProjectLineScreen({ projectId, lineId }: { projectId: string; lineId: string }) {
  const can = useAccess(projectId);
  const route = useRoute();
  const raw = route.query.get('view');
  const asked: Lens | null = raw ? SECTION[raw] ?? null : null;
  /* A saved ?view=meeting link lands on the actions, grouped by owner. */
  const [byOwner, setByOwner] = useState(raw === 'meeting');

  const { loading: projLoading, project } = useProject(projectId);
  const ppm = usePaceLines(projectId);
  const ax = useActions(projectId);
  const nums = useMeasures(projectId);
  const line = ppm.lines.find(l => l.id === lineId);
  /* "I saw…" from anywhere on the line — onto a bone of one of its problems. */
  const problems = useProblems(projectId);
  const [saw, setSaw] = useState(false);
  /* The by-owner card's door: the board's own editor, for the step behind it. */
  const [sheet, setSheet] = useState<Editing | null>(null);
  const openAction = (a: PaceAction) => {
    const s = a.uid ? ax.steps.find(x => x.id === a.uid) : undefined;
    if (s) setSheet({ step: s, isNew: false });
  };
  /* A problem with no line on its row (one written before the fishbone)
     belongs to the line whose study it lives in (lib/fishbone lineOf) — not to
     every line, which put Line 7's old problem on Line 2A's fishbone. */
  const lineProblems = useMemo(
    () => problems.problems.filter(p => lineOf(p.problem, ppm.lines)?.id === lineId),
    [problems.problems, lineId, ppm.lines],
  );

  const counts = useLinePackCounts(projectId, lineId, line?.workspaceId);

  // The workspace is remembered ON the line, so attaching one is an edit to the
  // line row — which is also what makes it appear on the owner's other device.
  const attach = useCallback(async (wsId: string) => {
    await ppm.editLine(lineId, { workspaceId: wsId });
  }, [ppm, lineId]);

  // This line's actions, and the ones written for every line — by id, not by
  // guessing from the name (lib/actions.ts).
  const mine = useMemo(() => ax.actions.filter(a => a.lineId === line?.id || a.line === WHOLE_PROJECT), [ax.actions, line?.id]);

  /* The Pareto used to be a top-level mode you had to already know about, and
   * nothing in the project ever pointed at it — so on the one screen that says
   * "this line is behind", the tool that answers WHY was unreachable. It is a
   * door off the line now, not a place you navigate to. The workspace is made
   * on the way in, the same as the filmed walk's. */
  const ws = useLineWorkspace(line?.workspaceId, line?.name ?? '', attach);
  const findOutWhy = async () => { nav(`/w/${await ws.ensure()}/analyse`); };
  const goStudy = async (path: string) => { nav(`/w/${await ws.ensure()}/${path}`); };

  const ready = !(projLoading || ppm.loading || ax.loading || nums.loading) && !!project && !!line;

  /* A LINK TO ONE SECTION. ?view=actions (or the old ?view=next) opens that
     fold, whatever this device remembered, and the page scrolls to it once it
     is drawn — and once more a moment later, after the lists above it have
     loaded and moved it down. Opened before the fold mounts, so its first
     paint is already open; a later change of address remounts just that fold
     (and a ?view=meeting arriving on a page already open turns By owner on,
     as it does on a fresh load). */
  const askedFold = asked ? FOLD[asked] : undefined;
  const [jump, setJump] = useState(() => { if (askedFold) openFold(askedFold); return 0; });
  const last = useRef(raw);
  useEffect(() => {
    if (raw === last.current) return;
    last.current = raw;
    if (raw === 'meeting') setByOwner(true);
    if (askedFold) { openFold(askedFold); setJump(j => j + 1); }
  }, [raw, askedFold]);
  useEffect(() => {
    if (!ready || !asked || asked === 'overview') return;
    const go = () => document.getElementById('line-' + asked)?.scrollIntoView({ block: 'start' });
    go();
    const t = window.setTimeout(go, 400);
    return () => window.clearTimeout(t);
  }, [ready, asked, jump]);

  if (!ready) {
    if (projLoading || ppm.loading || ax.loading || nums.loading) {
      return <div className="wrap pace"><p className="sub">Loading…</p></div>;
    }
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That line isn’t on this project any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    );
  }

  const paced = planModel(project) !== 'commissioning';
  const sixM = planModel(project) === 'board';
  const sections: Lens[] = sixM ? ['fishbone', ...PACED] : paced ? PACED : STAGE_GATE;
  /* The section a link names, when this line has it; else the top of the
     page. Kept as `lens` for the header, which offers "I saw…" only where the
     fishbone does not — and on a 6M line the fishbone is now always on the
     page, with its own "I saw…" beside "Time a stop", so there the lens is
     always the fishbone: one thing, one place, whichever section a link
     scrolled to. */
  const first: Lens = sixM ? 'fishbone' : 'overview';
  const lens: Lens = sixM ? 'fishbone'
    : asked && (asked === 'overview' || sections.includes(asked)) ? asked : first;
  const has = (l: Lens) => sections.includes(l);
  /* The fold the address names is remounted on a change of address, so it
     opens; every other fold keeps its own state. */
  const foldKey = (l: Lens) => (FOLD[l] === askedFold ? `${FOLD[l]}:${jump}` : FOLD[l]);

  /* The words the actions list itself uses (lib/actions.ts): To do, Waiting,
     Done — and Overdue as the flag — so the section's line and the bar under
     it count the same things by the same names. */
  const isDone = (s: string) => /^done$/i.test(s.trim());
  const done = mine.filter(a => isDone(a.status)).length;
  const waiting = mine.filter(a => /^waiting$/i.test(a.status.trim())).length;
  const overdue = mine.filter(a => /overdue/i.test(a.flag ?? '') && !isDone(a.status)).length;
  /* THE HEADLINE MEASURE — the first one this business listed. One number has to
     stand for the line in a section's count and in a door's wording, and the
     project's own order is the only honest way to pick which. */
  const head = lineSeries(nums.measures, nums.periods, nums.targets, nums.readings, line.id);
  /* How far off it is, in its own units — only when there is a margin to quote.
     `meeting === false` and a missing margin cannot both happen, but saying so
     with a number rather than an assertion is what keeps it that way. */
  const off = head?.meeting === false && head.margin != null
    ? say(Math.abs(head.margin), head.measure.unit) : null;

  /* Where the line is limited, in the words that fit a row (lib/capacity
     shortSays) — the full sentence is the section's own verdict card. */
  const capLine = line.capacity && line.capacity.stations.length > 0 ? shortSays(analyse(line.capacity)) : undefined;

  /* WHAT EACH SECTION SAYS IN ITS OWN LINE — the counts the tabs and the
     overview's tiles carried, beside the thing they count. Only the abnormal
     number wears a colour. */
  const byPhase = new Map<Phase, number>();
  for (const p of lineProblems) byPhase.set(p.phase, (byPhase.get(p.phase) ?? 0) + 1);
  const problemSays: ReactNode = lineProblems.length === 0 ? 'none opened yet'
    : (Object.keys(PHASE_WORD) as Phase[]).filter(ph => byPhase.has(ph)).map((ph, i) => (
      <span key={ph}>{i > 0 && ' · '}
        <span className={ph === 'slipped' ? 'ln-late' : undefined}>{byPhase.get(ph)} {PHASE_WORD[ph].toLowerCase()}</span>
      </span>
    ));
  const numbersSays: ReactNode = !head
    ? (nums.measures.length ? 'nothing recorded for this line yet' : 'no measures set yet')
    : <>{head.measure.name} {head.latest == null ? '—' : say(head.latest, head.measure.unit)} · {head.meeting === false ? <span className="ln-late">{vsTarget(head)}</span> : vsTarget(head)}</>;
  const actionsSays: ReactNode = paced
    ? (mine.length === 0 ? 'none yet'
      : <>{mine.length - done - waiting} to do{waiting > 0 && <> · <span className="ln-wait">{waiting} waiting</span></>}<Late n={overdue} word="past due" /> · {done} done</>)
    : (counts.openTodos + counts.waitingTodos + counts.doneTodos === 0 ? 'none yet'
      : <>{counts.openTodos} open{counts.waitingTodos > 0 && <> · <span className="ln-wait">{counts.waitingTodos} waiting</span></>} · {counts.doneTodos} done</>);
  const winsSays = counts.wins === 0 ? 'none yet' : `${counts.wins} logged`;
  const balanceSays = capLine ?? 'not counted yet';
  const filmedSays: ReactNode = !line.workspaceId ? 'not filmed yet'
    : counts.openSnags > 0 ? <><span className="ln-wait">{counts.openSnags} open</span> on the walk</> : 'nothing pinned open';

  return (
    <div className={'wrap pace is-' + lens}>
      <Crumbs trail={[
        { label: 'Control room', to: '/' },
        { label: project.name, to: `/project/${projectId}?view=lines` },
        { label: line.name },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">
            {project.name}
            {line.owner && <> · owned by <b>{line.owner}</b></>}
            {line.sponsor && <> · sponsor {line.sponsor}</>}
          </p>
          <h1 className="pace-title">{line.name}</h1>
          <p className="pace-lede">{paced ? `This line’s numbers, actions, wins and walk — all of it rolls up into the ${project.name} report.` : 'This line’s actions, wins and walk — its rate is agreed and proved in Testing.'}</p>
        </div>
        <div className="pace-head-actions">
          {/* The line's client report is drawn from the plan — the measures,
              their targets and the board's actions. A handover has none of
              them, and its own A3 is printed from testing. It is the same
              document the project's Reports door lists, so it carries the
              same name. */}
          {paced && (
            <button className="btn btn-primary" onClick={() => nav(`/pace-report?project=${projectId}&line=${lineId}`)}>
              Client report
            </button>
          )}
          {/* One thing, one place: the fishbone lens carries its own "I saw…"
              beside "Time a stop", so here it is for the other lenses. */}
          {sixM && can.edit && lens !== 'fishbone' && (
            <button className="btn" onClick={() => setSaw(true)}>I saw…</button>
          )}
          {!paced && (
            <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/testing`)}>
              Testing
            </button>
          )}
        </div>
      </header>

      <AccessNote can={can} owner={project.lead} />

      {/* THE PROBLEM LEADS A 6M LINE (docs/SIXM.md) — the fishbone as built:
          the problem card's four parts (Problem · Why · Fix · Did it work)
          over the fish, with the problems and the Pareto beside it on a
          laptop. The one section that never folds: it is the journey, as the
          Gantt is a stage-gate job's. */}
      {has('fishbone') && (
        <section id="line-fishbone" className="ln-sec ln-lead" aria-labelledby="ln-problem-t">
          <div className="ln-h">
            <h2 id="ln-problem-t" className="ln-t">The problem</h2>
            <span className="ln-s">{problemSays}</span>
          </div>
          <FishboneJourney projectId={projectId} lineId={lineId} can={can} />
        </section>
      )}

      {saw && (
        <SawSheet open projectId={projectId} line={line} problems={lineProblems} api={problems}
          problemId={route.query.get('problem') ?? undefined} short={head?.meeting === false}
          onClose={() => setSaw(false)}
          onSaved={id => { setSaw(false); nav(`/project/${projectId}/line/${lineId}?problem=${id}`); }} />
      )}

      {/* A STAGE-GATE LINE LEADS WITH ITS MACHINES — what the line is for. */}
      {!paced && <LineMachines projectId={projectId} />}

      {/* THE NUMBERS: every measure this project runs on, each reading as it
          was taken and the chart against target — and, under them, the door
          to WHY: the number says whether the line is where it should be, and
          never why; that needs the losses timed on the floor. Offered loudly
          when the line is behind, quietly when it is not, because "why are we
          winning" is a fair question too. */}
      {has('data') && (
        <div id="line-data" className="ln-sec">
          <Fold key={foldKey('data')} id="line.numbers" title="Numbers" says={numbersSays}>
            <LineNumbers projectId={projectId} line={line} />
            {head && (line.workspaceId || can.edit) && (
              <button className={'why-door' + (off ? ' is-behind' : '')}
                onClick={() => void findOutWhy()}>
                <span className="why-door-t">
                  {off
                    ? `${line.name} is ${off} off its ${head.period?.name ?? ''} target — find out why`.replace('  ', ' ')
                    : 'Where is this line’s time going?'}
                </span>
                <span className="why-door-s">
                  Time the losses on the floor and they rank themselves by what they cost —
                  the board that tells you which problem to spend the week on.
                </span>
              </button>
            )}
          </Fold>
        </div>
      )}

      {/* THE ACTIONS on this line — what still needs doing, what we are
          waiting on, and tests; the ones written for every line show too.
          "Actions" and "Next steps" were two tabs showing the same records
          (a 3P action IS a next step, lib/actions.ts): one place, with the
          grouping as a switch inside it. */}
      {has('next') && (
        <div id="line-next" className="ln-sec">
          <Fold key={foldKey('next')} id="line.actions" title="Actions" says={actionsSays}>
            <div className="ln-tools">
              <span className="gt-seg" role="group" aria-label="Show as">
                <button type="button" className={byOwner ? '' : 'on'} onClick={() => setByOwner(false)}>List</button>
                <button type="button" className={byOwner ? 'on' : ''} onClick={() => setByOwner(true)}>By owner</button>
              </span>
            </div>
            {byOwner ? <PaceMeeting actions={mine} onOpen={openAction} /> : <PaceNextSteps projectId={projectId} lineId={lineId} withWhole={paced} />}
            {sheet && <LineActionSheet projectId={projectId} editing={sheet} lines={ax.lines} onClose={() => setSheet(null)} />}
          </Fold>
        </div>
      )}

      {has('wins') && (
        <div id="line-wins" className="ln-sec">
          <Fold key={foldKey('wins')} id="line.wins" title="Wins" says={winsSays}>
            <PaceSuccess projectId={projectId} lineId={lineId} />
          </Fold>
        </div>
      )}

      {/* WHERE THE LINE IS LIMITED — what the Pareto cannot say. Its sentence
          is the section's own line, so it reads shut as well as open. */}
      {has('capacity') && (
        <div id="line-capacity" className="ln-sec">
          <Fold key={foldKey('capacity')} id="line.balance" title="Line balance" says={balanceSays}>
            <CapacityPanel projectId={projectId} line={line} onSave={cap => ppm.editLine(lineId, { capacity: cap })} />
          </Fold>
        </div>
      )}

      {/* THE LINE, FILMED — its own walk: film it, mark the frames, pin what
          you see, play it back in the meeting. */}
      {has('snags') && (
        <div id="line-snags" className="ln-sec">
          <Fold key={foldKey('snags')} id="line.filmed" title="The line, filmed" says={filmedSays}>
            <PaceSnags projectId={projectId} projectName={project.name} can={can}
              line={{ workspaceId: line.workspaceId, name: line.name, attach }} />
          </Fold>
        </div>
      )}

      {/* TIME AND FILM THE LINE — the line study, which was a fourth home with
          its own four tabs. One line here, the four as doors; the study is made
          the first time one is opened. A client with no study to read has no
          door, because the database would refuse the making of one. */}
      {(line.workspaceId || can.edit) && (
        <nav className="ln-study" aria-label={`Time and film ${line.name}`}>
          <span className="ln-study-t">Time and film {line.name}</span>
          <span className="ln-study-links">
            {STUDY.map((s, i) => (
              <span key={s.path}>{i > 0 && <span className="ln-study-dot" aria-hidden>·</span>}
                <button type="button" className="ln-study-go" onClick={() => void goStudy(s.path)}>{s.label}</button>
              </span>
            ))}
          </span>
        </nav>
      )}

      <footer className="pace-foot">
        <p>
          {line.name} · part of {project.name}
          {line.owner && <> · owned by {line.owner}</>}
          {line.sponsor && <> · sponsored by {line.sponsor}</>}
        </p>
      </footer>
    </div>
  );
}
