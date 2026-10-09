/* THE JOB'S FRONT PAGE — one screen that answers "am I in control?"
 *
 * Rowland, 5 October, of the page this replaces: "too much on a screen… this
 * is more about opening doors rather than keeping it linear and simple." It
 * ran to three screens: the band, then folds that drew every tab again — the
 * machines, a table of six rows each with an arrow to a tab already in the
 * row above, the whole Gantt; on a 6M job the fishbone, two alarm bars, the
 * entire board, the line balance, "Did it work?" and every line's chart.
 *
 * Now each method's front page is the band and two or three panels, and each
 * panel is a door:
 *
 *   Stage gate — the band · NEEDS YOU (everything past its day, then due
 *                soon, then the next booked — the late list lib/portfolio
 *                reads and the report prints) · WHERE EACH MACHINE IS (the
 *                strip) with the day's line and the plan's line under it.
 *   6M         — the band · the fishbone, small · NEEDS YOU (countermeasures,
 *                materials, programs) · LINES AT TARGET.
 *   Lever tree — the band · the tree's top · NEEDS YOU · LINES AT TARGET.
 *
 * What the folds held lives where its tab is: the plan at /plan, the board
 * on Board, the charts on Numbers, "Did it work?" on Wins, line balance on
 * Lines. The lenses (?view=) are pages under the project, as a gate is. */
import { useEffect, type ReactNode } from 'react';
import { Journey } from '../ui/Journey';
import { openFold } from '../ui/Fold';
import { live } from '../lib/testing';
import { machineAt, machinesWhere, journeyOf } from '../lib/install';
import { planHref, planSays } from '../lib/plan';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { PaceSnags } from './PaceSnags';
import { PaceNextSteps } from './PaceNextSteps';
import { PaceSuccess } from './PaceSuccess';
import { MeasureChart } from '../charts/MeasureChart';
import { usePaceLines } from '../lib/usePaceLines';
import { useMeasures } from '../lib/useMeasures';
import { useMaterials } from '../lib/useMaterials';
import { usePrograms } from '../lib/usePrograms';
import { gapOf, lineSeries, say, vsTarget, type LineSeries } from '../lib/measures';
import { ProjectNumbers } from './NumbersPanel';
import { DUE_SOON_DAYS, useActions } from '../lib/actions';
import { KIND_WORD, criticalItems, riskItems, jobItems, kindWord, lateWhen, needsYou, pacedOwed, pacedSays, type JobItem, type Urgency } from '../lib/portfolio';
import { openRecord } from '../ui/RecordDrawer';
import { CriticalTag } from '../ui/CriticalFields';
import { criticalCount } from '../lib/critical';
import { linesOnTarget, stageGateOnTarget } from '../lib/onTarget';
import { planCount, planFor } from '../lib/huddle';
import type { TestItem } from '../lib/testing';
import { useImpacts } from '../lib/useImpacts';
import { addDays, niceDay } from '../lib/weeks';
import { IMPACT_WORD } from '../lib/impact';
import { useProject } from '../lib/useProjects';
import { useAllLinePacks, emptyPack, type LinePack } from '../lib/useLinePack';
import { analyse, shortSays } from '../lib/capacity';
import { statusOfAction, treeStanding, withTrackerRows, bindSources, type TreeStanding } from '../lib/treeBind';
import { LABEL as TREE_WORD, useTreeNodes } from './TreeStatic';
import type { PaceLineRow } from '../db';
import type { Project } from '../types';
import { methodOf, planModel } from '../lib/planModel';
import { useTesting } from '../lib/useTesting';
import { useStanding } from '../lib/useStanding';
import { Verdict } from '../ui/Verdict';
import { StandardsCard } from '../ui/StandardsCard';
import { ProjectReminders } from '../ui/Reminders';
import { todayISO, type Standing } from '../lib/standing';
import { useAccess } from '../cloud/access';
import { AccessNote } from '../ui/AccessNote';
import { Fishbone } from '../ui/Fishbone';
import { useProblems } from '../lib/useProblems';
import { nextStep, readyToRun, startSteps, type StartStep, type StepKey } from '../lib/startHere';
import { Icon } from '../ui/Icon';
import { PHASE_WORD, type Phase } from '../lib/problems';
import type { Can } from '../lib/access';
import { fishboneUrl, isOpenProblem, mainProblem } from './FishboneScreen';

/* THE FISHBONE LEADS A 6M JOB'S FRONT PAGE (docs/SIXM.md), as the plan leads
 * a stage-gate job's: under the gap sentence, the main open problem drawn
 * small — its head, its six bones, its causes — with the way into the whole
 * journey. Nothing is edited here; a tap anywhere on it opens that problem on
 * its own screen, where the causes are worked. */
/* GETTING IT RUNNING — a new 6M or lever tree job's front page leads with the
 * steps, in order, each ticked by the record it reads (lib/startHere), each
 * with the one button that opens where it is done. Rowland, 6 October: "there
 * is no clear start here, do this, then ready to run." It stands in for the
 * front page's panels until the job is ready to run — they would all say
 * "nothing yet", and the fishbone's "Open a problem" would be offered before
 * there was a line or a number — and then it is gone and the panels are the
 * page. */
function StartHere({ projectId, steps }: { projectId: string; steps: StartStep[] }) {
  const next = nextStep(steps);
  const done = steps.filter(x => x.done).length;
  const go: Record<StepKey, { label: string; to: string }> = {
    line: { label: 'Add the line', to: `/project/${projectId}/setup?part=pset-lines` },
    measure: { label: 'Add the measure', to: `/project/${projectId}/setup?part=pset-measures` },
    target: { label: 'Set the target', to: `/project/${projectId}/setup?part=pset-measures` },
    now: { label: 'Add the first reading', to: `/project/${projectId}?view=data` },
    problem: { label: 'Open the problem', to: `${fishboneUrl(projectId)}?open=1` },
    outcome: { label: 'Open the tree', to: `/project/${projectId}/tree` },
  };
  return (
    <section className="fp-panel gr" aria-label="Getting it running">
      <header className="fp-panel-h">
        <h2 className="fp-panel-t">Getting it running</h2>
        <span className="fp-panel-s">{done} of {steps.length} done · then it is ready to run</span>
      </header>
      <ol className="gr-steps">
        {steps.map((st, i) => {
          const isNext = st === next;
          return (
            <li key={st.key} className={'gr-step' + (st.done ? ' is-done' : isNext ? ' is-next' : '')}>
              <span className="gr-n" aria-hidden>{st.done ? <Icon name="check" size="0.95em" /> : i + 1}</span>
              <span className="gr-m">
                <b>{st.title}{isNext && <span className="gr-next">Next</span>}</b>
                <span className="sub">{st.done ? 'Done.' : st.says}</span>
              </span>
              {!st.done && (
                <button type="button" className={'btn ' + (isNext ? 'btn-primary' : 'btn-ghost') + ' gr-go'}
                  onClick={() => nav(go[st.key].to)}>{go[st.key].label}</button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function FishboneLead({ projectId, can }: { projectId: string; can: Can }) {
  const api = useProblems(projectId);
  if (api.loading) return null;
  const v = mainProblem(api.problems);
  const open = api.problems.filter(isOpenProblem);
  const byPhase = new Map<Phase, number>();
  for (const p of open) byPhase.set(p.phase, (byPhase.get(p.phase) ?? 0) + 1);
  const says = open.length === 0
    ? (api.problems.length ? `${api.problems.length} closed · none open` : 'no problem opened yet')
    : [...byPhase].map(([ph, n]) => `${n} ${PHASE_WORD[ph].toLowerCase()}`).join(' · ');
  const go = (problem?: string) => nav(fishboneUrl(projectId, { line: v?.problem.lineId, problem }));
  /* The same box as every other panel on the front page — its name, its
     answer in words, the door — so the fish reads as one of the doors, not
     a section of its own above them. */
  return (
    <Panel title="The fishbone" says={says} className="fp-fish"
      door={{ label: v ? 'Open the fishbone' : 'Open the journey', to: fishboneUrl(projectId, { line: v?.problem.lineId, problem: v?.problem.id }) }}>
      {!v ? (
        <div className="fj-empty is-lead">
          <p className="fj-empty-t">No problem opened yet — open one from the gap or the Pareto</p>
          <p className="sub">The biggest loss becomes the head of the fish; the six bones fill themselves from what the line has timed, filmed and counted.</p>
          {can.edit && (
            <button className="btn btn-primary" onClick={() => nav(`${fishboneUrl(projectId)}?open=1`)}>Open a problem</button>
          )}
        </div>
      ) : (
        <>
          {/* The small fish is a picture of the problem, and the whole of it
              is the way in — the causes are worked on the full screen. */}
          <div className="fj-lead-fish" role="link" tabIndex={0} aria-label={`Open the fishbone of ${v.problem.title}`}
            onClick={() => go(v.problem.id)} onKeyDown={e => { if (e.key === 'Enter') go(v.problem.id); }}>
            <Fishbone view={v} can={can} compact
              onCause={() => go(v.problem.id)}
              onSuggestion={() => go(v.problem.id)}
              onAdd={() => go(v.problem.id)} />
          </div>
          {/* The small fish carries the title, the number and the phase; the
              sentence is the one thing it has no room for, so it is the
              picture's caption — under it, not above the title it explains
              (on a phone it read before the problem it was about). */}
          {v.says && <p className="fj-lead-says">{v.says}</p>}
        </>
      )}
    </Panel>
  );
}

/* ------------------------------- the panels -------------------------------
 *
 * Every panel on a front page is the same box: its name, its answer in a few
 * words, a handful of rows, and the door to the page that holds the rest. A
 * row is a door too — it opens the record it is about. Nothing is edited on
 * the front page; it says where the job is and which door to open. */
function Panel({ title, says, door, className, children }: {
  title: string;
  /** The panel's answer, in words — what it says before a row is read. */
  says?: ReactNode;
  /** The page that holds the whole of what the panel shows the top of. */
  door?: { label: string; to: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={'fp-panel' + (className ? ' ' + className : '')} aria-label={title}>
      <header className="fp-panel-h">
        <h2 className="fp-panel-t">{title}</h2>
        {says != null && <span className="fp-panel-s">{says}</span>}
        {door && <button className="cw-link fp-panel-go" onClick={() => nav(door.to)}>{door.label} ›</button>}
      </header>
      {children}
    </section>
  );
}

/* The five states (CLAUDE.md, visual management), as a row's stripe: late is
   red, due soon amber, the next booked indigo. */
const URGENCY_TONE: Record<Urgency, 'crit' | 'r' | 'a' | 'w'> = { critical: 'crit', late: 'r', soon: 'a', next: 'w' };
/** What opens in the record's drawer (ui/RecordDrawer) rather than on a page. */
const IN_DRAWER = new Set<JobItem['kind']>(['test', 'fix', 'install', 'setup', 'handover']);

/** When a row on "Needs you" is due, in words beside its colour — so the
 *  state survives a black-and-white print. */
function whenSaid(x: JobItem, urgency: Urgency, today: string): string {
  /* A stage late by the hours its problems lost says so, not "was" a day still to come. */
  if (urgency === 'critical') return x.critical?.state ?? 'open';
  if (urgency === 'late') return lateWhen(x, today);
  if (urgency === 'soon') {
    return x.on === today ? 'due today' : x.on === addDays(today, 1) ? 'due tomorrow' : `due ${niceDay(x.on, { weekday: 'short' })}`;
  }
  return niceDay(x.on);
}

/** NEEDS YOU — the late list, in the order you would deal with it: everything
 *  past its day (the oldest first), then what falls due within a few days,
 *  then the next thing booked (lib/portfolio needsYou). The same items the
 *  control room's week is made of, so the front page and the board above it
 *  cannot disagree; each row opens its own record (lib/plan planHref). */
function NeedsYouPanel({ items, today, door, split, max }: {
  items: JobItem[]; today: string;
  /** How many rows before the rest becomes a count — fewer under the fishbone
   *  or the tree, so the page stays one screen. */
  max?: number;
  /** Where the rest is: the plan on a stage-gate job, the board on the others. */
  door: { label: string; to: string };
  /** Say what the late ones are, by kind. A 6M job's band counts the board's
   *  actions alone (the control room's sentence), and "5 past the day" under
   *  "2 late" read as a contradiction until it said "2 actions, 3 materials". */
  split?: boolean;
}) {
  const n = needsYou(items, today, { max });
  const lateShown = n.rows.filter(r => r.urgency === 'late').length;
  /* "1 critical" leads the panel's answer, solid red — a zero is not said. */
  const crit = <>{n.critical > 0 && <><b className="fp-n-crit">{criticalCount(n.critical)}</b> · </>}{n.risk > 0 && <><b className="fp-n-crit is-risk">{n.risk} high risk</b> · </>}</>;
  const lateHidden = n.late - lateShown;
  const byKind = new Map<JobItem['kind'], number>();
  for (const x of items) if (x.late) byKind.set(x.kind, (byKind.get(x.kind) ?? 0) + 1);
  const kinds = split && byKind.size > 1
    ? ` — ${[...byKind].map(([k, c]) => `${c} ${KIND_WORD[k].toLowerCase()}${c === 1 ? '' : 's'}`).join(', ')}` : '';
  const owedSays = items.length === n.critical + n.risk ? 'nothing owed'
    /* "late", as the band and the reports say it: a stage is late when its
       day has gone or its problems lost hours (lib/install lateOrProblem). */
    : n.late > 0 ? <><b className="fp-n-r">{n.late} late</b>{kinds} · late first</>
    : n.soon > 0 ? `nothing late · ${n.soon} due within ${DUE_SOON_DAYS} days`
    : 'nothing late';
  const says = <>{crit}{owedSays}</>;
  const foot = [
    lateHidden > 0 && <b key="l" className="fp-n-r">{lateHidden} more late</b>,
    n.more - lateHidden > 0 && <span key="m">{n.more - lateHidden} more booked</span>,
    n.undated > 0 && <span key="u">{n.undated} with no date agreed</span>,
  ].filter(Boolean);
  return (
    <Panel title="Needs you" says={says} door={door} className="fp-needs">
      {n.rows.length === 0 && n.undated === 0 ? (
        <p className="fp-empty">Nothing is owed on any list.</p>
      ) : n.rows.length > 0 && (
        <ol className="fp-rows">
          {n.rows.map(({ item, urgency }, i) => item.critical ? (
            /* A CRITICAL PROBLEM (lib/critical) — what it is, where, what it
               means for the business and how it stands; the row opens the
               problem itself, with the ways round it (ui/ProblemRecord). */
            <li key={`crit:${item.id ?? ''}:${i}`}>
              <button className={'fp-row is-crit' + (item.critical.risk ? ' is-risk' : '')}
                onClick={() => (item.id ? openRecord(item.jobId, item.id) : nav(`/project/${item.jobId}/fixes`))}>
                <span className="fp-row-m">
                  <span className="fp-crit-h"><CriticalTag risk={item.critical.risk} /><b>{item.what}</b></span>
                  <small>{item.critical.where}{item.who.trim() ? ` · ${item.who.trim()}` : ''}</small>
                  {item.critical.impact && <span className="fp-crit-impact">{item.critical.impact}</span>}
                  {/* How it stands, under what it means — the ways round it
                      are a sentence, not a date for the right-hand column. */}
                  <em className="fp-crit-state">{item.critical.state}</em>
                </span>
              </button>
            </li>
          ) : (
            <li key={item.part ?? item.id ?? `${item.kind}:${item.what}:${i}`}>
              {/* ONE DOOR PER RECORD (5 October): a step, a test or a fix — and
                  a part, which is its stage's — opens in the drawer over this
                  page, as it does from the control room and the plan. */}
              <button className={'fp-row is-' + URGENCY_TONE[urgency]}
                onClick={() => (item.id && IN_DRAWER.has(item.kind) ? openRecord(item.jobId, item.id) : nav(planHref(item.jobId, item)))}>
                <span className="fp-row-m">
                  <b>{item.what}</b>
                  <small>{kindWord(item)} · {item.who.trim() || 'nobody yet'}</small>
                </span>
                <em className="fp-row-when">{whenSaid(item, urgency, today)}</em>
              </button>
            </li>
          ))}
        </ol>
      )}
      {foot.length > 0 && (
        <p className="fp-foot">{foot.map((x, i) => <span key={i}>{i > 0 && ' · '}{x}</span>)}</p>
      )}
    </Panel>
  );
}

/** LINES AT TARGET — one row a line: the latest reading against the target
 *  in play, and whose line it is. The gap's words are lib/measures gapOf's,
 *  the same the 6M client report leads with; the row opens the line. */
function LinesPanel({ projectId, lines, standing, can, project }: {
  projectId: string; lines: PaceLineRow[]; standing: Map<string, LineSeries | undefined>; can: Can; project: Project;
}) {
  const judged = lines.filter(l => standing.get(l.id)?.meeting != null);
  const at = judged.filter(l => standing.get(l.id)?.meeting === true).length;
  const short = judged.length - at;
  const headline = lines.map(l => standing.get(l.id)?.measure).find(Boolean);
  const says = lines.length === 0 ? 'no lines yet'
    : !headline ? 'no measure set yet'
    : judged.length === 0 ? 'nothing measured against a target yet'
    : <>{at} of {judged.length} at target{short > 0 && <> · <b className="fp-n-r">{short} short</b></>}</>;
  return (
    <Panel title={headline ? `Lines at target · ${headline.name}` : 'Lines at target'} says={says}
      door={lines.length ? { label: 'All lines', to: `/project/${projectId}?view=lines` } : undefined} className="fp-lines">
      {lines.length === 0 ? (
        <div className="fp-empty">
          <p>No lines on this project yet.</p>
          {can.edit && <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/setup`)}>Add the first line</button>}
        </div>
      ) : (
        <>
          <ol className="fp-rows">
            {lines.map(l => {
              const s = standing.get(l.id);
              const gap = gapOf(l.name, s);
              const tone = s?.meeting === true ? 'g' : s?.meeting === false ? 'r' : 'n';
              return (
                <li key={l.id}>
                  <button className={'fp-row is-' + tone} title={gap.says} onClick={() => nav(`/project/${projectId}/line/${l.id}`)}>
                    <span className="fp-row-m">
                      <b>{l.name}</b>
                      <small>
                        {l.owner ? <>Owner {l.owner}</> : 'No owner yet'}
                        {s?.target != null && <> · {s.period ? `${s.period.name} target` : 'target'} {say(s.target, s.measure.unit)}</>}
                      </small>
                    </span>
                    <span className="fp-row-num">
                      <b>{s?.latest != null ? say(s.latest, s.measure.unit) : '—'}</b>
                      <em className={gap.short ? 'fp-n-r' : undefined}>
                        {!s ? 'no measure set' : gap.short ?? (s.meeting ? 'at target' : s.target == null ? 'no target set' : 'nothing measured yet')}
                      </em>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {/* What the lines are judged on is agreed, so it is the owner's to
              set (lib/access) — and nobody else is told to. */}
          {!headline && (can.agree
            ? <p className="fp-foot"><button className="cw-link" onClick={() => nav(`/project/${projectId}/setup`)}>Set the measures up ›</button></p>
            : <p className="fp-foot">{project.lead || 'The owner'} hasn’t said what this project measures yet.</p>)}
        </>
      )}
    </Panel>
  );
}

/** THE TREE'S TOP, on a lever tree job's front page: the outcome and what was
 *  written directly under it, each in its state — and the whole of it opens
 *  the tree, where it is worked. Read from the same rows the tree and the
 *  report draw (lib/treeBind treeStanding). */
function TreeTopPanel({ projectId, tree }: { projectId: string; tree?: TreeStanding }) {
  const open = () => nav(`/project/${projectId}/tree`);
  return (
    <Panel title="The tree" says={tree ? tree.says : 'nothing written on it yet'}
      door={{ label: 'Open the tree', to: `/project/${projectId}/tree` }} className="fp-tree">
      {!tree ? (
        <p className="fp-empty">The tree starts with the outcome — the one number this job has to hit — and what has to be true for it.</p>
      ) : (
        <>
          <button className={'fp-out is-' + tree.outcome.rag} onClick={open}>
            <small>The outcome</small>
            <b>{tree.outcome.text}</b>
            <em>{tree.outcome.word}</em>
          </button>
          {tree.top.length > 0 && (
            <ol className="fp-rows fp-top">
              {tree.top.map(c => (
                <li key={c.id}>
                  <button className={'fp-row is-' + c.rag} onClick={open}>
                    <span className="fp-row-m"><b>{c.text}</b></span>
                    <em className="fp-row-when">{TREE_WORD[c.rag]}</em>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Panel>
  );
}

/* THERE IS NO UPLOAD. The tracker workbook this read every week is gone:
   Rowland — "there will be no Excel that needs to be uploaded ... this is about
   now fully using the app." The actions are written on the board (see
   lib/actions.ts); the numbers are typed or pasted on the Data lens. */

/* Who is against a line, under its chart. A chart with nobody's name on it is
 * a number; with a name on it, it is somebody's number — which is the whole
 * point of putting owners and sponsors on the project in the first place. */
function LinePeople({ line, projectId }: { line: PaceLineRow; projectId: string }) {
  return (
    <div className="pace-line-people">
      {line.owner && <span className="pace-who"><span className="pace-who-role">Owner</span> {line.owner}</span>}
      {line.sponsor && <span className="pace-who"><span className="pace-who-role">Sponsor</span> {line.sponsor}</span>}
      <button className="pace-who-go" onClick={() => nav(`/project/${projectId}/line/${line.id}`)}>
        Its pack ›
      </button>
    </div>
  );
}

/* One line, as the project sees it: whose it is, how it is doing, and how much
 * is sitting in its pack. The whole card is the way in — the owner's pack is
 * where the work actually happens, so getting there should not need aiming at
 * a small link. */
function LineCard({ line, pack, projectId, series, balance }: {
  line: PaceLineRow; pack: LinePack; projectId: string;
  /** What the line's balance says, once its stations are in; absent until then. */
  balance?: string;
  /** Where this line stands on the measure the project leads on — the first one
   *  its own list names. Absent on a project that has not named one yet, and the
   *  card then simply carries no number rather than a dash meaning nothing. */
  series?: LineSeries;
}) {
  const open = pack.openTodos + pack.waitingTodos;

  return (
    <article className="lc">
      <button className="lc-open" onClick={() => nav(`/project/${projectId}/line/${line.id}`)}>
        <header className="lc-head">
          <span className="lc-key">{line.key}</span>
          <span className="lc-name">{line.name}</span>
          {series && (
            <span className={'lc-ppm' + (series.meeting == null ? '' : series.meeting ? ' is-good' : ' is-bad')}>
              {series.latest == null ? '—' : say(series.latest)}
              {series.measure.unit && <span className="lc-ppm-u">{series.measure.unit}</span>}
            </span>
          )}
        </header>
        <p className="lc-people">
          {line.owner
            ? <><span className="lc-role">Owner</span> {line.owner}</>
            : <span className="sub">No owner yet</span>}
          {line.sponsor && <> <span className="lc-role">Sponsor</span> {line.sponsor}</>}
        </p>
        {series && (
          <p className="lc-target">{series.measure.name} · {vsTarget(series)}</p>
        )}
        <div className="lc-pips">
          <span className="lc-pip">{open}<span className="lc-pip-l">next steps open</span></span>
          <span className="lc-pip">{pack.doneTodos}<span className="lc-pip-l">finished</span></span>
          <span className={'lc-pip' + (pack.openSnags > 0 ? ' is-warn' : '')}>{pack.openSnags}<span className="lc-pip-l">open evidence</span></span>
          <span className="lc-pip is-good">{pack.wins}<span className="lc-pip-l">wins</span></span>
        </div>
      </button>
      {/* LINE BALANCE, on the card of the line it is about — where each machine
          and person runs at its own speed and the slowest is the limit. */}
      <button className={'lc-bal' + (balance ? ' is-set' : '')} onClick={() => nav(`/project/${projectId}/line/${line.id}?view=capacity`)}>
        <span className="lc-bal-k">Line balance</span>
        <span className="lc-bal-t">{balance ?? 'Not counted yet — add the machines and people, each at its own speed'}</span>
        <span className="lc-bal-go" aria-hidden>›</span>
      </button>
      <footer className="lc-foot">
        <span className="sub">{line.workspaceId ? 'Has its own workspace' : 'Workspace made on first walk'}</span>
        <button className="btn btn-ghost" onClick={() => nav(`/pace-report?project=${projectId}&line=${line.id}`)}>Client report</button>
      </footer>
    </article>
  );
}

/* THE MEETING IS THE BOARD NOW.
 *
 * There used to be a 'meeting' lens here — the tracker by owner, a roster down
 * the side, one name on the floor at a time. It was a good screen and it was
 * the wrong one twice over: it asked "whose is it" when the meeting's question
 * is "what is the state of the work", and it meant the project had two things
 * both calling themselves the meeting. Every action on the board carries its
 * owner, so nothing about a go-round is lost by walking the areas instead.
 *
 * The lens row is now the running order, not a drawer: where we are, the board
 * we walk, then what came out of it. */
type Lens = 'overview' | 'lines' | 'next' | 'wins' | 'snags' | 'data';
const LENSES: { id: Lens; label: string; sub: string }[] = [
  { id: 'overview', label: 'Overview',   sub: 'the picture' },
  { id: 'lines',    label: 'Lines',      sub: 'each owner\u2019s pack' },
  { id: 'next',     label: 'Actions, as a list', sub: 'to do & waiting' },
  { id: 'wins',     label: 'Wins',       sub: 'what worked' },
  { id: 'snags',    label: 'Evidence',   sub: 'the line, filmed' },
  { id: 'data',     label: 'Numbers',    sub: 'readings against target' },
];

/** Today's huddle plan, in words — "plan for today: 1 of 3 done". */
function todaysPlan(items: TestItem[], today: string): string {
  const plan = planFor(items, today);
  return plan.length ? `plan for today: ${planCount(plan)}` : 'nothing planned for today yet';
}


/* ("Meeting notes · 3", the header button, is the rail's Meeting notes line
   now, with the same count — ui/Frame useOpenNotes.) */

function TestingOverview({ projectId, project, edit }: { projectId: string; project: Project; edit: boolean }) {
  const tt = useTesting(projectId);
  /* THE WHOLE JOB, not just the testing. See lib/standing.ts — this page used
     to form its own opinion from the trials alone, which meant it could say
     "nothing outstanding" while four materials were late and two programs were
     past their test date. Same call the client report makes. */
  const all = useStanding(projectId);
  const progs = usePrograms(projectId);
  /* READ ONCE, DRAWN TOGETHER. The day's line and "Needs you" each need the
     whole job; they are handed these lists, and the page is drawn when all of
     it is in, so nothing arrives a second late and pushes the rest down. */
  const mats = useMaterials(projectId);
  if (tt.loading || all.loading || mats.loading || progs.loading) return <p className="sub">Loading…</p>;

  const today = todayISO();
  const st = all.standing;
  /* EMPTY MEANS NOTHING ON ANY LIST — not "no tests and no machines". A job
     with only materials said "Nothing planned on this line yet" over a
     material three days late, with no verdict, no alarm and no plan. */
  const empty = tt.tests.length === 0 && tt.assets.length === 0 && st.outstanding === 0 && st.plan.length === 0;

  const machines = live(tt.assets);
  /* "due on site" for a machine not here yet, never "at Install" (machineAt). */
  const wheres = machines.map(a => machineAt(a, journeyOf(a, tt.tests, tt.items, today, progs.programs)));
  const whereSays = machines.length === 1 ? wheres[0].says : machinesWhere(wheres.map(w => w.short));
  /* Every thing owed on the job, one row each — the control room's week reads
     the same list (lib/portfolio jobItems), by the rules the band counts by. */
  const owed = [
    /* An open critical problem leads Needs you (lib/portfolio criticalItems). */
    ...criticalItems({ project, tests: tt.tests, items: tt.items, assets: tt.assets }),
    /* Then each high risk, amber — not happened yet (lib/critical). */
    ...riskItems({ project, tests: tt.tests, items: tt.items, assets: tt.assets }),
    ...jobItems({ project, tests: tt.tests, items: tt.items, materials: mats.materials, programs: progs.programs, assets: tt.assets }, today),
  ];

  return (
    <section className="pace-sec">
      {/* (The row of gates that sat here is the rail now — ui/Frame — with
          the same counts, on an empty job too: Install is where a job starts.) */}
      {empty ? (
        <div className="pace-empty">
          {/* A JOB, AND ITS FIRST GATE. It said "on this line" of a job, and
              its one button planned a test — Commission, the third gate —
              when a stage-gate job starts at Install with the machines
              (HUNT 5). */}
          <p className="sub">Nothing planned on this job yet. It starts at Install, with the machines it is putting in.</p>
          {/* A client reads the job and adds nothing (lib/access). */}
          {edit && (
            <button className="btn btn-primary" style={{ marginTop: 10 }}
              onClick={() => nav(`/project/${projectId}/install`)}>Add the first machine</button>
          )}
        </div>
      ) : (
        <>
          {/* ONE SCREEN, NOT THREE. Rowland, 5 October: "too much on a
              screen… this is more about opening doors rather than keeping it
              linear and simple." The band; then what needs you beside where
              each machine is; then the day and the plan, each a door.
              WHAT WENT, AND WHERE IT IS NOW: "What we're waiting on" was six
              rows each arrowing to a tab already in the row above, with the
              same counts — the row carries them. The two alarm bars (a
              material late, a program past its test) are rows on "Needs you"
              with their day. The plan — the longest thing on the page — is a
              page of its own (/plan), one line and a door here. */}
          {/* ARE WE ON TARGET? leads the band (lib/onTarget). */}
          <Verdict st={st} brief report={`/project/${projectId}/report`}
            onTarget={stageGateOnTarget({ project, tests: tt.tests, items: tt.items, assets: tt.assets, materials: mats.materials, programs: progs.programs, today }, st)} />
          {/* What the notes asked to be reminded of, while it is due. */}
          <ProjectReminders projectId={projectId} />
          <div className="fp-grid">
            <NeedsYouPanel items={owed} today={today} door={{ label: 'The plan', to: `/project/${projectId}/plan` }} />
            <div className="fp-col">
              {machines.length > 0 && (
                <Panel title="Where each machine is" says={whereSays} className="fp-where">
                  <Journey projectId={projectId} assets={tt.assets} tests={tt.tests} items={tt.items} bare />
                </Panel>
              )}
              {/* TWO DOORS, NOT TWO PARAGRAPHS. The day's headline and the
                  plan's sentence repeated the band and Needs you (critical,
                  late, gates done); each door says only what is not already
                  on this page — today's huddle plan, and how many dates. */}
              <span className="fp-doors">
                <button className="fp-door" onClick={() => nav(`/project/${projectId}/day`)}>
                  <b>The day ›</b><span className="sub">{todaysPlan(tt.items, today)}</span>
                </button>
                <button className="fp-door" onClick={() => nav(`/project/${projectId}/plan`)}>
                  <b>The plan ›</b><span className="sub">{planSays(st.plan, today)}</span>
                </button>
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ToInstallFilmed({ projectId }: { projectId: string }) {
  useEffect(() => { openFold('filmed'); navReplace(`/project/${projectId}/install`); }, [projectId]);
  return null;
}

export function ProjectDashboardScreen({ projectId }: { projectId: string }) {
  /* Which lenses this project even has. A commissioning job keeps the evidence
     (the walk is how a defect gets proved) and drops the measures, the
     per-line packs and the weekly tracker upload, none of which a handover has. */
  const route = useRoute();
  const raw = route.query.get('view');
  const asked: Lens = raw === 'data' || raw === 'snags' || raw === 'next'
    || raw === 'wins' || raw === 'lines' ? raw : 'overview';

  /* A link somebody saved to the meeting still opens the meeting — it is the
     board now. Dropping them on the overview instead would look like the app
     had forgotten the page rather than moved it. */
  useEffect(() => {
    if (raw === 'meeting') navReplace(`/project/${projectId}/board`);
    /* The plan was a fold on this page; it is a page of its own now, and a
       link saved to it lands there. */
    if (raw === 'plan') navReplace(`/project/${projectId}/plan`);
  }, [raw, projectId]);

  const { loading: projLoading, project } = useProject(projectId);
  /* What this person may do here (lib/access). Nothing on this page deletes
     or changes what was agreed, so only a client's view differs: no door that
     leads to adding something. */
  const can = useAccess(projectId);
  const ax = useActions(projectId);
  const { impacts } = useImpacts(projectId);
  const ppm = usePaceLines(projectId);
  const nums = useMeasures(projectId);
  const treeRows = useTreeNodes(projectId);
  const stand = useStanding(projectId);
  /* Getting a new 6M or tree job running (lib/startHere): read here so the
     front page can lead with the steps until every one is done. */
  const probs = useProblems(projectId);
  /* A 6M or tree job's materials and programs are owed like its actions are,
     so a late one is a row on "Needs you" beside the countermeasures. */
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  const { actions } = ax;
  // Every line's own pack, counted. This is the roll-up: each number below was
  // typed by a line owner into their own pack, not entered again here.
  const packs = useAllLinePacks(projectId, ppm.lines);

  const done = actions.filter(a => statusOfAction(a) === 'g').length;
  const overdue = actions.filter(a => statusOfAction(a) === 'r').length;

  /* WHERE EVERY LINE STANDS on the measure this project leads on — worked out
     once, read by the cards, the charts and the count above them. A line with no
     reading yet is not "at target": `meeting` is only true when there is both a
     reading and a target to judge it against. */
  const standing = new Map(ppm.lines.map(l => [
    l.id, lineSeries(nums.measures, nums.periods, nums.targets, nums.readings, l.id),
  ]));
  const headline = nums.measures[0];
  const limited = ppm.lines.map(l => ({ line: l, says: l.capacity ? shortSays(analyse(l.capacity)) : undefined }));
  const atTarget = ppm.lines.filter(l => standing.get(l.id)?.meeting === true).length;

  /* WHERE A 3P JOB IS, in one sentence — the lines against their target and
     the actions still open. The same Verdict card a stage-gate job leads with,
     so the two methods' front pages read alike. */
  const openActions = actions.length - done;
  const judged = ppm.lines.filter(l => standing.get(l.id)?.meeting != null).length;
  /* EVERYTHING THE JOB OWES (lib/portfolio pacedOwed) — its board's actions
     and the materials and programs not in yet. Its counts are the job's:
     "late" here, on its header, on the control room and in the rail is the
     same number, and is what its Needs you lists (docs/CONTROLROOM.md). */
  const owedNow = project ? pacedOwed({ project, steps: ax.steps, lines: ppm.lines, atTarget, judged, materials: mats.materials, programs: progs.programs }, todayISO()) : [];
  const owedLate = owedNow.filter(x => x.late).length;
  const verdict: Standing = {
    // The same sentence the Home control room says of this job — about its board.
    sentence: pacedSays({ atTarget, judged, open: openActions, late: overdue, any: actions.length > 0 }),
    outstanding: owedNow.length, late: owedLate, rows: [], plan: [], lateThings: [],
  };
  /* The actions closed on a known day, newest first, and what the numbers say. */
  const closed = ax.steps.filter(s => s.state === 'done' && !!s.doneOn)
    .sort((a, b) => (b.doneOn as string).localeCompare(a.doneOn as string)).slice(0, 8);
  const tally = (st: string) => closed.filter(s => impacts.get(s.id)?.state === st).length;
  const provenSays = [
    tally('proven') && `${tally('proven')} proven`,
    (tally('better') + tally('flat')) && `${tally('better') + tally('flat')} not yet`,
    tally('worse') && `${tally('worse')} worse`,
    tally('soon') && `${tally('soon')} too soon`,
  ].filter(Boolean).join(' · ') || `${closed.length} closed`;

  if (ax.loading || ppm.loading || projLoading || nums.loading || mats.loading || progs.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  // A link to a project that has since been deleted is a dead end, not a crash.
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  // "Line 2A · 2B · 7 · 10" — read off the project's own lines rather than
  // written into the page, so adding a line changes what the page says it covers.
  const lineList = ppm.lines.map(l => l.key).join(' · ');
  const model = project ? planModel(project) : 'board';
  const shownLenses = model === 'commissioning'
    ? LENSES.filter(l => l.id === 'overview' || l.id === 'snags')
    : LENSES;
  /* A LENS THIS PROJECT HAS NOT GOT FALLS BACK TO THE OVERVIEW.
     Hiding a lens from the row was never enough on its own: ?view=data still
     rendered the weekly-tracker upload and the ppm grid on a handover, because
     the body below reads the URL rather than the row. Resolve it once, here. */
  const lens: Lens = shownLenses.some(l => l.id === asked) ? asked : 'overview';
  /* ONE PLACE FOR A STAGE-GATE JOB'S FILMED LINE. ?view=snags was a second
     route to the same walk Install holds, with the project's header on top —
     two pages for one thing. The address is replaced, so Back is not caught in
     a loop, and Install opens with that card open. */
  if (model === 'commissioning' && lens === 'snags') return <ToInstallFilmed projectId={projectId} />;
  /* What is past its day, said in red on the header's one line — the
     verdict's own late count on a stage-gate job, the board's late actions on
     the others (the same numbers the rail's lines carry). */
  const pastDay = model === 'commissioning' ? stand.standing.late : owedLate;
  const start = model === 'board' || model === 'tree'
    ? startSteps({ model, lines: ppm.lines.length, measures: nums.measures.length, targets: nums.targets.length,
      readings: nums.readings.length, problems: probs.problems.length, treeNodes: (treeRows ?? []).length })
    : [];
  /* A client reads the job as it stands; the list is for whoever sets it up. */
  const starting = can.edit && !probs.loading && !nums.loading && !ppm.loading && !readyToRun(start);
  const tree = model === 'tree' && treeRows
    ? treeStanding(withTrackerRows(treeRows, bindSources(ax.actions, ax.steps, ppm.lines,
      { measures: nums.measures, periods: nums.periods, targets: nums.targets, readings: nums.readings })))
    : undefined;

  return (
    <div className={'wrap pace is-' + lens}>
      {/* THE PAGE'S NAME AND ONE LINE OF WHERE IT STANDS. The spine, the
          eyebrow, the gear and the three header doors (Meeting notes,
          Reports, Pareto / Lever tree) are the frame now: the top bar names
          the job, and the rail (ui/Frame) holds the gates or the method's
          lenses, the work, the lines, Reports, Meeting notes and Details —
          once, with their counts. A lens of a 6M or tree job is a page under
          the job, as a gate is, and wears the same header. */}
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">{lens === 'overview' ? project.name : LENSES.find(l => l.id === lens)?.label}</h1>
          {lens === 'overview' && (
            <p className="cw-handover">
              <span className="sub">
                {methodOf(project).label}
                {project.lead && <> · led by <b>{project.lead}</b></>}
                {/* No "4 late" here: the band's tile says it, once. A 6M or
                    tree job has no band, so it still says it here. */}
                {pastDay > 0 && model !== 'commissioning' && <> · <span className="in-late">{pastDay} late</span></>}
              </span>
            </p>
          )}
        </div>
      </header>
      {(lens === 'overview' || model === 'commissioning') && <AccessNote can={can} owner={project.lead} />}


      {/* THE OVERVIEW OF A COMMISSIONING JOB IS THE COMMISSIONING JOB.
          It used to be the tracker's: lines at target against Q1, the 3P board
          asking for a weekly workbook upload, and a "Line pace" chart per line.
          None of it belongs to a handover, and every one of them was the first
          thing somebody saw on opening the project. */}
      {lens === 'overview' && model === 'commissioning' && (
        <TestingOverview projectId={projectId} project={project} edit={can.edit} />
      )}

      {/* THE SAME SHAPE AS A STAGE-GATE JOB'S FRONT PAGE, and one screen
          like it. Rowland, 5 October: "too much on a screen… this is more
          about opening doors rather than keeping it linear and simple." Every
          lens was drawn again here as a fold — the board, line balance, "Did
          it work?", every line's chart — so the page ran to three screens.
          Now: the band; the fishbone small (6M) or the tree's top (tree);
          then what needs you beside where each line is against its target.
          Each of the rest has its one place, a tab in the row: the board on
          Board, line balance on each line's card under Lines, "Did it work?"
          on Wins, the charts on Numbers. The two alarm bars (a material late,
          a program past its test) are rows on "Needs you" with their day. */}
      {lens === 'overview' && model !== 'commissioning' && (() => {
        const today = todayISO();
        /* Everything owed on the job, one row each: the board's open actions
           (the control room reads the same, lib/portfolio pacedItems), and
           the materials and programs not in yet (jobItems). */
        const owed = pacedOwed({ project, steps: ax.steps, lines: ppm.lines, atTarget, judged, materials: mats.materials, programs: progs.programs }, today);
        return (
          <>
            <Verdict st={verdict} eyebrow={ppm.lines.length === 1 ? 'Where the line is' : 'Where the lines are'}
              onTarget={linesOnTarget(ppm.lines.map(l => ({ name: l.name, series: standing.get(l.id) })))} />
            <ProjectReminders projectId={projectId} />
            {/* THE METHOD'S OWN PICTURE LEADS, the list that needs you beside
                it, and the lines under the picture — so the page is one
                laptop screen, and on a phone it reads picture, owed, lines. */}
            {starting ? <StartHere projectId={projectId} steps={start} /> : (
            <div className="fp-grid is-lead">
              {model === 'board' && <FishboneLead projectId={projectId} can={can} />}
              {/* THE TREE'S TOP, ON A TREE JOB. The outcome and the conditions
                  under it are what this job is run against; a manager could
                  not tell how the outcome stood without opening the tree. */}
              {model === 'tree' && treeRows && <TreeTopPanel projectId={projectId} tree={tree} />}
              <NeedsYouPanel items={owed} today={today} split max={5} door={{ label: 'The board', to: `/project/${projectId}/board` }} />
              <LinesPanel projectId={projectId} lines={ppm.lines} standing={standing} can={can} project={project} />
            </div>
            )}
          </>
        );
      })()}

      {lens === 'lines' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            {/* Said while there are no lines; once there are, the cards show it. */}
            {ppm.lines.length === 0 && <p className="pace-sec-sub">
              Each line has an owner and a pack of its own — its pace, its actions, its next steps, its wins and its
              filmed walk. Open one to work in it; everything in it rolls up into the client report.
            </p>}
          </div>
          {ppm.lines.length === 0 ? (
            <div className="pace-empty">
              <p className="sub">No lines on this project yet.</p>
              {can.edit && (
                <button className="btn btn-primary" style={{ marginTop: 10 }}
                  onClick={() => nav(`/project/${projectId}/setup`)}>Add the first line</button>
              )}
            </div>
          ) : (
            <>
              <div className="lc-grid">
                {ppm.lines.map(l => (
                  <LineCard key={l.id} line={l} pack={packs.get(l.id) ?? emptyPack} projectId={projectId}
              series={standing.get(l.id)} balance={limited.find(x => x.line.id === l.id)?.says} />
                ))}
              </div>
              {can.edit && (
                <div className="pace-lines-foot">
                  <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/setup`)}>
                    Add or change lines
                  </button>
                </div>
              )}
            </>
          )}
          {/* WHO STANDS WHERE, product by product — held with the lines it is
              about, the way Hand over holds it on a stage-gate job. It was a
              lens of its own beside them. */}
          <StandardsCard projectId={projectId} can={can} />
        </section>
      )}

      {lens === 'next' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            {/* The board's actions as rows — the view with room for the photos
                and the write-up of a trial. Reached from the board, not the row:
                one list, two ways of looking at it. */}
            
            <p className="pace-sec-sub">
              The same actions the board sorts onto its six bones — here with the where, the
              photos and the write-up.{' '}
              <button className="cw-link" onClick={() => nav(`/project/${projectId}/board`)}>Back to the board</button>
            </p>
          </div>
          <PaceNextSteps projectId={projectId} />
        </section>
      )}

      {lens === 'wins' && (
        <>
          {/* DID IT WORK? Each closed action, judged by the line's own numbers
              either side of the day it closed — the same proof a Win carries,
              so it is kept with the wins. It was a fold on the front page.
              Only the ones with a day they closed. */}
          {closed.length > 0 && (
            <Panel title="Did it work?" says={provenSays} className="fp-proof">
              <ul className="dw-list">
                {closed.map(s => {
                  const im = impacts.get(s.id);
                  return (
                    <li key={s.id} className="dw-row">
                      {/* THE WHOLE ROW OPENS THAT ACTION — the title alone was
                          the button, 20 px tall on a phone, and it dropped you
                          on the board to find the action again. */}
                      <button className="dw-go" onClick={() => nav(`/project/${projectId}/board?a=${s.id}`)}>
                        <b>{s.what}</b>
                        <span className="dw-w">
                          {[s.who, s.doneOn && `closed ${niceDay(s.doneOn)}`].filter(Boolean).join(' · ')}
                          {im && im.state !== 'none' && <> <span className={'bd-proof is-' + im.state}>{IMPACT_WORD[im.state]}</span></>}
                        </span>
                        {im?.words && <span className="dw-w">{im.words}</span>}
                        <span className="dw-go-c" aria-hidden>›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
          <section className="pace-sec">
            <div className="pace-sec-head">
              <p className="pace-sec-sub">What we did and what worked · the wins to show the team</p>
            </div>
            <PaceSuccess projectId={projectId} />
          </section>
        </>
      )}

      {lens === 'snags' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            {model === 'commissioning' && <h2 className="pace-sec-title">Evidence</h2>}
            <p className="pace-sec-sub">Film the line, mark the frames, pin what you see · play it back in the meeting</p>
          </div>
          {/* every line's walk as well as the project's own, so a snag filmed
              inside a line's pack is not invisible from here */}
          <PaceSnags projectId={projectId} projectName={project.name} can={can}
            alsoFrom={ppm.lines.filter(l => l.workspaceId).map(l => ({ wsId: l.workspaceId!, label: l.name }))} />
        </section>
      )}

      {lens === 'data' && (
        <>
          {/* EVERY LINE'S CHART, over the numbers it is drawn from. The charts
              were a fold on the front page, and this lens only took readings
              in; now the readings and what they draw are one page. With no
              measure or no line, the panel below says so and how to start. */}
          {headline && ppm.lines.length > 0 && (
            <section className="pace-sec">
              <div className="pace-sec-head">
                <h2 className="pace-sec-title">{headline.name}</h2>
                <p className="pace-sec-sub">
                  Every line’s readings against the target for the period they fall in
                  {headline.unit && <> · {headline.unit}</>}
                  {' · '}{headline.direction === 'up' ? 'higher is better' : 'lower is better'}
                </p>
              </div>
              <div className="pace-charts">
                {ppm.lines.map(l => {
                  const series = standing.get(l.id);
                  return series ? (
                    <div key={l.key} className="pace-chart-cell">
                      <MeasureChart series={series} who={{ name: l.name, owner: l.owner, sponsor: l.sponsor, variant: l.variant }} />
                      <LinePeople line={l} projectId={projectId} />
                    </div>
                  ) : null;
                })}
              </div>
            </section>
          )}
          <section className="pace-sec">
            <div className="pace-sec-head">
              
              <p className="pace-sec-sub">
                {/* A client records nothing (lib/access), so is not told to. */}
                {can.edit ? 'Your own measures · record each reading as it is taken · saves as you go' : 'This project’s measures · each reading as it was taken'}
              </p>
            </div>
            <ProjectNumbers projectId={projectId} lines={ppm.lines} />
          </section>
        </>
      )}

      <footer className="pace-foot">
        <p>
          {project.name}
          {lineList && <> · {lineList}</>}
          {project.lead && <> · led by {project.lead}</>}
          {model === 'commissioning'
            ? <> · what we planned, what happened, what we found, what we do next</>
            : <> · actions kept on the board · the line walk filmed in the app</>}
        </p>
      </footer>
    </div>
  );
}
