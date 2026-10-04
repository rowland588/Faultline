/* PROJECT PACE — three lenses on one set of data.
 *
 *   Overview — the arc, for the client: are we at pace, what moved, what the walk
 *              found. Compact enough to take in at a glance, and what prints.
 *   Meeting  — the tracker by OWNER, because that is how the meeting is run:
 *              each person reports their own workload. Sections fold, so one
 *              person is on screen at a time.
 *   Data     — the mechanics: upload this week's tracker, record the readings. Its own
 *              tab so it is never buried inside a page you have to scroll.
 *
 * The lens lives in the URL (?view=), so a bookmark opens the meeting straight
 * into the meeting. */
import { useEffect, useState } from 'react';
import { Peers, projectPeers, methodPeers } from '../ui/Peers';
import { Journey } from '../ui/Journey';
import { Fold, openFold } from '../ui/Fold';
import { live } from '../lib/testing';
import { journeyNow, journeyOf } from '../lib/install';
import { planSays } from '../lib/plan';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { PaceSnags } from './PaceSnags';
import { useWalkSnags } from '../lib/useWalkSnags';
import { PaceNextSteps } from './PaceNextSteps';
import { PaceSuccess } from './PaceSuccess';
import { Crumbs } from '../ui/Crumbs';
import { MeasureChart } from '../charts/MeasureChart';
import { usePaceLines } from '../lib/usePaceLines';
import { useMeasures } from '../lib/useMeasures';
import { useMaterials } from '../lib/useMaterials';
import { daysLate } from '../lib/materials';
import { usePrograms } from '../lib/usePrograms';
import { daysOverdue } from '../lib/programs';
import { lineSeries, say, vsTarget, type LineSeries } from '../lib/measures';
import { ProjectNumbers } from './NumbersPanel';
import { useActions } from '../lib/actions';
import { pacedSays } from '../lib/portfolio';
import { useMethodCounts } from '../lib/useMethodCounts';
import { useImpacts } from '../lib/useImpacts';
import { niceDay } from '../lib/weeks';
import { IMPACT_WORD } from '../lib/impact';
import { useProject } from '../lib/useProjects';
import { useAllLinePacks, emptyPack, type LinePack } from '../lib/useLinePack';
import { analyse, shortSays } from '../lib/capacity';
import { board as buildBoard, actionTitle } from '../lib/pillars';
import { statusOfAction, treeStanding, withTrackerRows, bindSources } from '../lib/treeBind';
import { useTreeNodes } from './TreeStatic';
import type { PaceAction } from '../lib/tracker';
import type { PaceLineRow } from '../db';
import { listTestItems, onDataChange } from '../db';
import { methodOf, planModel } from '../lib/planModel';
import { useTesting } from '../lib/useTesting';
import { useStanding } from '../lib/useStanding';
import { Verdict } from '../ui/Verdict';
import { ReportsSheet } from '../ui/ReportsSheet';
import { StandardsCard } from '../ui/StandardsCard';
import { Outstanding } from '../ui/Outstanding';
import { Gantt } from '../ui/Gantt';
import { ProjectReminders } from '../ui/Reminders';
import { todayISO, type Standing } from '../lib/standing';
import { activeDays, dayOf } from '../lib/day';
import { Icon } from '../ui/Icon';
import { useAccess } from '../cloud/access';
import { AccessNote } from '../ui/AccessNote';
import { Fishbone } from '../ui/Fishbone';
import { useProblems } from '../lib/useProblems';
import { PHASE_WORD, type Phase } from '../lib/problems';
import { SIXM } from '../lib/sixm';
import type { Can } from '../lib/access';
import { fishboneUrl, isOpenProblem, mainProblem } from './FishboneScreen';

/* THE 3P BOARD, ON THE PAGE ITSELF.
 *
 * A tab is not a presence. The lever tree lived its whole life behind a button
 * in the corner, and the result was a surface that existed in the code and not
 * in anybody's week — you had to already know it was there to go and look at
 * it. The board is the heart of this project now, so it is ON the overview,
 * showing the real thing, in the shape it has everywhere else: one CARD per
 * area — Line 2, Line 7, Line 10, Cellox, All lines — with its actions in three
 * columns inside it.
 *
 * Compact, not partial. Each column shows its first few and says how many more
 * there are, and the whole thing opens full size in one tap. What it never does
 * is imply it is showing everything when it is not. */
const AREA_PEEK = 3;

/* THE FISHBONE LEADS A 6M JOB'S FRONT PAGE (docs/SIXM.md), as the plan leads
 * a stage-gate job's: under the gap sentence, the main open problem drawn
 * small — its head, its six bones, its causes — with the way into the whole
 * journey. Nothing is edited here; a tap anywhere on it opens that problem on
 * its own screen, where the causes are worked. */
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
  return (
    <section className="pace-sec fj-lead" aria-label="The fishbone">
      <header className="fj-lead-h">
        <h2 className="fj-lead-t">The fishbone</h2>
        <span className="fj-lead-s">{says}</span>
        <button className="cw-link fj-lead-go" onClick={() => go(v?.problem.id)}>
          {v ? 'Open the fishbone ›' : 'Open the journey ›'}
        </button>
      </header>
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
    </section>
  );
}

function BoardPanel({ projectId, actions, bare, edit = true }: { projectId: string; actions: PaceAction[]; bare?: boolean; edit?: boolean }) {
  const b = buildBoard(actions);
  const open = () => nav(`/project/${projectId}/board`);

  return (
    <section className="pace-sec pb-sec">
      {!bare && (
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">The board</h2>
        <p className="pace-sec-sub">
          {b.total > 0
            ? <>The meeting agenda · {b.areas.length} card{b.areas.length === 1 ? '' : 's'} · {b.total} action{b.total === 1 ? '' : 's'} inside them, {b.done} done — overdue and blocked first in every column</>
            : <>The meeting agenda — one card per area, its actions on the six bones inside each</>}
        </p>
      </div>
      )}

      {b.total === 0 ? (
        /* Nothing on the board yet — and the board is where it is written,
           so the one button goes there. */
        <div className="pace-empty">
          <p className="sub">
            {actions.length === 0
              ? (edit
                ? <>No actions yet. Write each one on its bone — {SIXM.map(x => x.label).join(', ')} — with who has it and when it is due.</>
                : <>No actions on the board yet.</>)
              : <>{actions.length} action{actions.length === 1 ? ' is' : 's are'} waiting to be given a column.</>}
          </p>
          <div className="pb-foot" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={open}>Open the board</button>
          </div>
        </div>
      ) : (
        <>
          {b.areas.map(a => (
            <div key={a.name} className="pb-area">
              <p className="pb-area-h">
                <b>{a.name}</b>
                <span>{a.total} action{a.total === 1 ? '' : 's'} · {a.done} done</span>
              </p>
              {/* THE SIX BONES (lib/sixm.ts) — the board's columns, as many
                  as lib/pillars says, laid out to fit: six across on a desk,
                  three by two or two by three on a phone. */}
              <div className={'pb-cols' + (a.columns.length > 3 ? ' is-six' : '')}>
                {a.columns.map(c => (
                  <section key={c.key} className={'pb-col is-' + c.key}>
                    <header className="pb-col-h">
                      <span className="pb-col-t">{c.label}</span>
                      <span className="pb-col-n">{c.rows.length}</span>
                    </header>
                    {c.rows.length === 0
                      ? <p className="pb-none">—</p>
                      : <>
                          {c.rows.slice(0, AREA_PEEK).map((x, i) => (
                            <button key={x.uid || x.ref || i} className={'pb-act is-' + statusOfAction(x)}
                              onClick={() => nav(`/project/${projectId}/board${x.uid ? `?a=${x.uid}` : ''}`)}>
                              {/* the text is clamped on a span of its own: a line
                                  clamp applied to the button itself is unreliable,
                                  and an action cut through the middle of a word reads
                                  as a rendering fault rather than as "there is more
                                  of this on the board". */}
                              <span className="pb-act-t">{actionTitle(x)}</span>
                            </button>
                          ))}
                          {c.rows.length > AREA_PEEK && (
                            <button className="pb-more" onClick={open}>
                              +{c.rows.length - AREA_PEEK} more
                            </button>
                          )}
                        </>}
                  </section>
                ))}
              </div>
            </div>
          ))}
          <div className="pb-foot">
            <button className="btn btn-primary" onClick={open}>Open the board</button>
            {b.unplaced.length > 0 && (
              <span className="sub pb-gap">
                {b.unplaced.length} action{b.unplaced.length === 1 ? '' : 's'} not given a column yet
              </span>
            )}
          </div>
        </>
      )}
    </section>
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

/** WHERE THE TESTING STANDS, on the project's own front page.
 *
 *  The same sentence the testing screen leads with and the same sentence the A3
 *  prints — composed once in lib/testing, so this page cannot form a second
 *  opinion about a job it is only summarising. */
/* WHAT IS HOLDING THE JOB UP, named — and ONLY when something actually is. A
 * banner that is always there is furniture; this one appearing means news, so
 * it earns being read.
 *
 * IT USED TO BE THE FIRST THING ON THE PAGE, and that was right when it was the
 * only thing on the page that knew anything was late. The verdict card now says
 * how much is late, whose it is, and what it does to the date — so the page
 * opens on the position rather than on an alarm, and these follow it carrying
 * the one thing the verdict cannot: WHICH ONE, and HOW MANY DAYS.
 *
 * The two are kept apart rather than merged into one "things are late" line:
 * they are owed by different people and fixed in different ways, and a merged
 * count tells you neither.
 */
function LateAlarms({ projectId }: { projectId: string }) {
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  return <LateAlarmsOf projectId={projectId} mats={mats} progs={progs} />;
}

/* The alarms drawn from lists already read. On a stage-gate job the overview
   reads them once and hands them down — see TestingOverview. */
function LateAlarmsOf({ projectId, mats, progs }: {
  projectId: string; mats: ReturnType<typeof useMaterials>; progs: ReturnType<typeof usePrograms>;
}) {
  return (
    <>
      {mats.tally.late > 0 && (
        <button className="mt-alarm" onClick={() => nav(`/project/${projectId}/materials`)}>
          <span className="mt-alarm-t">
            {mats.tally.late === 1 ? '1 material is late' : `${mats.tally.late} materials are late`}
          </span>
          <span className="mt-alarm-s">
            {mats.materials.filter(m => daysLate(m) != null).slice(0, 3)
              .map(m => `${m.what} — ${daysLate(m)} day${daysLate(m) === 1 ? '' : 's'}`).join('  ·  ')}
            {mats.tally.late > 3 && `  ·  and ${mats.tally.late - 3} more`}
          </span>
          <span className="mt-alarm-go" aria-hidden>›</span>
        </button>
      )}

      {progs.tally.overdue > 0 && (
        <button className="mt-alarm" onClick={() => nav(`/project/${projectId}/programs`)}>
          <span className="mt-alarm-t">
            {progs.tally.overdue === 1
              ? '1 program is past its test date'
              : `${progs.tally.overdue} programs are past their test date`}
          </span>
          <span className="mt-alarm-s">
            {progs.programs.filter(p => daysOverdue(p) != null).slice(0, 3)
              .map(p => `${p.what} — ${daysOverdue(p)} day${daysOverdue(p) === 1 ? '' : 's'}`).join('  ·  ')}
            {progs.tally.overdue > 3 && `  ·  and ${progs.tally.overdue - 3} more`}
          </span>
          <span className="mt-alarm-go" aria-hidden>›</span>
        </button>
      )}
    </>
  );
}

/** THE DAY, one line under the verdict: today's story if there is one yet,
 *  otherwise the last day that has one — and a tap reads it whole. */
function DayLink({ projectId, tt, mats, progs }: {
  projectId: string; tt: ReturnType<typeof useTesting>;
  mats: ReturnType<typeof useMaterials>; progs: ReturnType<typeof usePrograms>;
}) {
  const input = { tests: tt.tests, items: tt.items, assets: tt.assets, materials: mats.materials, programs: progs.programs };
  const today = todayISO();
  const now = dayOf(input, today, today);
  /* Every day the job has a story on is only needed when today has none. */
  const last = now.empty ? activeDays(input).filter(d => d < today).pop() : undefined;
  const shown = !now.empty || !last ? now : dayOf(input, last, today);
  return (
    <button className="dy-link" onClick={() => nav(`/project/${projectId}/day${shown.date === today ? '' : `?d=${shown.date}`}`)}>
      <span className="cmp-h-n">{shown.date === today ? 'TODAY' : `LAST LOGGED · ${shown.label.toUpperCase()}`}</span>
      <span className="dy-link-t">{shown.headline}</span>
      <span className="dy-link-go">Read the day ›</span>
    </button>
  );
}

/** "Meeting notes · 3" — the notes still to raise, one tap from the project. */
function NotesButton({ projectId }: { projectId: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    const load = () => void listTestItems(projectId).then(rows => {
      if (live) setN(rows.filter(i => i.kind === 'note' && !i.deletedAt && i.doneAt == null).length);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return (
    <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/notes`)}>
      Meeting notes{n > 0 && <span className="nt-badge">{n}</span>}
    </button>
  );
}

function TestingOverview({ projectId, name, edit }: { projectId: string; name: string; edit: boolean }) {
  const tt = useTesting(projectId);
  /* What the filmed walk found — one lane on the plan. */
  const walk = useWalkSnags(projectId);
  /* THE WHOLE JOB, not just the testing. See lib/standing.ts — this page used
     to form its own opinion from the trials alone, which meant it could say
     "nothing outstanding" while four materials were late and two programs were
     past their test date. Same call the client report makes. */
  const all = useStanding(projectId);
  const progs = usePrograms(projectId);
  /* READ ONCE, DRAWN TOGETHER. The day's line and the late alarms each read
     the whole job again for themselves, so on a big job they arrived a second
     after the rest of the page and pushed every card under them down — under
     a thumb already on its way to "Where each machine is". They are handed
     these lists, and the page is drawn when all of it is in. */
  const mats = useMaterials(projectId);
  if (tt.loading || all.loading || mats.loading || progs.loading) return <p className="sub">Loading…</p>;

  const today = todayISO();
  const st = all.standing;
  /* EMPTY MEANS NOTHING ON ANY LIST — not "no tests and no machines". A job
     with only materials said "Nothing planned on this line yet" over a
     material three days late, with no verdict, no alarm and no plan. */
  const empty = tt.tests.length === 0 && tt.assets.length === 0 && st.outstanding === 0 && st.plan.length === 0;

  /* WHAT EACH FOLDED CARD SAYS — the answer, so closing a card hides the
     detail and never the news. */
  const machines = live(tt.assets);
  const atCount = new Map<string, number>();
  for (const a of machines) {
    const at = journeyNow(journeyOf(a, tt.tests, tt.items, today, progs.programs));
    atCount.set(at, (atCount.get(at) ?? 0) + 1);
  }
  const whereSays = machines.length === 1
    ? `at ${[...atCount.keys()][0]}`
    : [...atCount].map(([at, n]) => `${n} at ${at}`).join(' · ');
  const waitSays = st.outstanding === 0 ? 'nothing waiting'
    : `${st.outstanding} open${st.late ? ` · ${st.late} late` : ' · none late'}`;

  return (
    <section className="pace-sec">
      {/* The same row every screen under this project carries, with the same
          counts — one way around, not a second one for the front page. */}
      {/* On an empty job too: the gates are where a job is started — Install
          first — and without the row the only way off this page was a test. */}
      <Peers peers={projectPeers(projectId, 'overview', all.counts)} />
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
          {/* THE VERDICT, then where each machine is, then what is waiting on
              somebody, then the dates. Every card below the verdict folds —
              Rowland: "very busy, hard to see, nothing collapses" — and folded
              each still says its answer in a line. */}
          <Verdict st={st} />
          {/* What the notes asked to be reminded of, while it is due. */}
          <ProjectReminders projectId={projectId} />
          <DayLink projectId={projectId} tt={tt} mats={mats} progs={progs} />
          <LateAlarmsOf projectId={projectId} mats={mats} progs={progs} />
          {machines.length > 0 && (
            <Fold id="where" title="Where each machine is" says={whereSays}>
              <Journey projectId={projectId} assets={tt.assets} tests={tt.tests} items={tt.items} />
            </Fold>
          )}
          {st.rows.length > 0 && (
            <Fold id="waiting" title="What we’re waiting on" says={waitSays}>
              <Outstanding rows={st.rows} projectId={projectId} />
            </Fold>
          )}
          {/* THE PLAN LAST, AND SHUT TO START WITH. It used to sit above the
              table, so the table could be read against the days left; but it
              is the longest thing on the page, and open it pushed what needs
              doing off the screen. Folded, it still says how much is done. */}
          {st.plan.length > 0 && (
            <Fold id="plan" title="The plan" says={planSays(st.plan, today)}>
              {/* A GANTT, NOT A TIMELINE. Rowland: "build a proper Gantt chart
                  view with dates across the top, showing easily on a calendar."
                  The timeline wrote each date beside its mark; here the days are
                  the columns and a bar sits on the days it means. Same marks —
                  the Home drawer and the client report still draw the timeline. */}
              <Gantt marks={st.plan} today={today} expectedAt={all.expectedAt} plannedAt={all.plannedAt} projectId={projectId} name={name} tests={tt.tests} items={tt.items} walk={walk ?? undefined} />
            </Fold>
          )}

          {/* WHAT USED TO FOLLOW — a "tests and fixes" bar, a "next up" card and
              the list of machines — each said again what the table above
              already says, off a smaller part of the job. The machines live on
              Install; the next test is the top of Testing. */}
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
  }, [raw, projectId]);

  const { loading: projLoading, project } = useProject(projectId);
  /* What this person may do here (lib/access). Nothing on this page deletes
     or changes what was agreed, so only a client's view differs: no door that
     leads to adding something. */
  const can = useAccess(projectId);
  const [reports, setReports] = useState(false);
  const ax = useActions(projectId);
  const methodCounts = useMethodCounts(projectId);
  const { impacts } = useImpacts(projectId);
  const ppm = usePaceLines(projectId);
  const nums = useMeasures(projectId);
  const treeRows = useTreeNodes(projectId);
  const stand = useStanding(projectId);
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
  const counted = limited.filter(x => x.says);
  const atTarget = ppm.lines.filter(l => standing.get(l.id)?.meeting === true).length;

  /* WHERE A 3P JOB IS, in one sentence — the lines against their target and
     the actions still open. The same Verdict card a stage-gate job leads with,
     so the two methods' front pages read alike. */
  const openActions = actions.length - done;
  const judged = ppm.lines.filter(l => standing.get(l.id)?.meeting != null).length;
  const verdict: Standing = {
    // The same sentence the Home control room says of this job.
    sentence: pacedSays({ atTarget, judged, open: openActions, late: overdue, any: actions.length > 0 }),
    outstanding: openActions, late: overdue, rows: [], plan: [],
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
  const boardSays = actions.length === 0 ? 'nothing on it yet'
    : `${openActions} open${overdue ? ` · ${overdue} late` : ''} · ${done} done`;
  const numbersSays = !headline ? 'no measures set yet'
    : ppm.lines.length === 0 ? 'no lines yet'
    : `${atTarget} of ${judged || ppm.lines.length} at target`;


  if (ax.loading || ppm.loading || projLoading || nums.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

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
  const tree = model === 'tree' && treeRows
    ? treeStanding(withTrackerRows(treeRows, bindSources(ax.actions, ax.steps, ppm.lines,
      { measures: nums.measures, periods: nums.periods, targets: nums.targets, readings: nums.readings })))
    : undefined;

  return (
    <div className={'wrap pace is-' + lens}>
      <Crumbs trail={lens === 'snags' && model === 'commissioning'
        ? [{ label: 'Control room', to: '/' }, { label: project.name, to: `/project/${projectId}` }, { label: 'Install', to: `/project/${projectId}/install` }, { label: 'The line, filmed' }]
        : lens === 'overview'
          ? [{ label: 'Control room', to: '/' }, { label: project.name }]
          // A lens is a page of its own now, reached from the row — so the trail
          // says which, and the project's name is the way back.
          : [{ label: 'Control room', to: '/' }, { label: project.name, to: `/project/${projectId}` },
            { label: LENSES.find(l => l.id === lens)?.label ?? '' }]} />
      {/* A 3P or tree job's lens is a page under the project, like a gate is
          on a stage-gate job: the project's own header stays on its front
          page, and the lens wears the small heading the gates do. */}
      {(lens === 'overview' || model === 'commissioning') && (
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">
            {methodOf(project).label}
            {project.lead && <> · led by <b>{project.lead}</b></>}
          </p>
          <div className="pace-title-row">
            <h1 className="pace-title">{project.name}</h1>
            {/* Details — name, dates, the client, the stages — is set once and
                left, so it is a gear beside the name rather than a tab beside
                the lists that are worked every day. */}
            {/* On every method: a 3P job's lines, people and measures are set
                here, once — they were a header button, "Lines & people". */}
            <button className="btn btn-ghost pace-gear" aria-label="Details" title="Details"
              onClick={() => nav(`/project/${projectId}/setup`)}><Icon name="gear" size={20} /></button>
          </div>
          {/* No method's page explains itself in a paragraph any more: the
              verdict card under this says what the job is, in its own numbers. */}
        </div>
        <div className="pace-head-actions">
          {/* TWO DOORS IN THE HEADER, ON EVERY METHOD: what to raise at the next
              meeting, and the report that goes to the client. Everything worked
              day to day is the row below. A 3P job's header carried six —
              Materials, Meeting notes, Programs, Lines & people, Client report,
              Print A3 — over a second row of eight lenses. Rowland: "make it
              just like the other one." Materials is in the row; Programs inside
              it; Lines & people is the gear; Print A3 printed the screen, and
              the client report is the document. */}
          <NotesButton projectId={projectId} />
          {/* Tools some projects opt into — see Project.pareto / leverTree. A
              tree-model job has its tree in the row already. */}
          {project.pareto && (
            <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/pareto`)}>Pareto</button>
          )}
          {project.leverTree && model !== 'tree' && (
            <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/tree`)}>Lever tree</button>
          )}
          {/* ONE DOOR TO PAPER — everything printable, with a line each. */}
          <button className="btn btn-ghost" onClick={() => setReports(true)}>Reports</button>
        </div>
      </header>
      )}
      {reports && <ReportsSheet project={project} onClose={() => setReports(false)} />}
      {(lens === 'overview' || model === 'commissioning') && <AccessNote can={can} owner={project.lead} />}

      {/* The row is the running order, left to right: where we are, the board
          we walk, then everything that comes out of walking it.
          ON A COMMISSIONING PROJECT IT IS A DIFFERENT ROW. A handover has no 3P
          board and no quarterly ppm — the rate is agreed once and either proven
          or not — so offering those lenses was the whole reason commissioning
          read as the tracker wearing a different hat. */}
      {/* ONE ROW OF TABS on a commissioning job: Evidence is in the peers row
          with the other lists, and the project's name in the trail is the way
          back to this front page. */}
      {model === 'commissioning' && lens === 'snags' && (
        <Peers peers={projectPeers(projectId, 'install', stand.counts)} />
      )}
      {model !== 'commissioning' && lens !== 'overview' && (
        <header className="pace-head">
          <div className="pace-head-main">
            <p className="pace-eyebrow">{project.name}</p>
            <h1 className="pace-title">{LENSES.find(l => l.id === lens)?.label}</h1>
          </div>
        </header>
      )}
      {/* Under the header on the front page and on a lens alike — see "THE
          PAGE FRAME" in styles.css. */}
      {model !== 'commissioning' && (
        <Peers peers={methodPeers(projectId, model === 'tree' ? 'tree' : 'board', lens, methodCounts)} />
      )}


      {/* THE OVERVIEW OF A COMMISSIONING JOB IS THE COMMISSIONING JOB.
          It used to be the tracker's: lines at target against Q1, the 3P board
          asking for a weekly workbook upload, and a "Line pace" chart per line.
          None of it belongs to a handover, and every one of them was the first
          thing somebody saw on opening the project. */}
      {lens === 'overview' && model === 'commissioning' && (
        <TestingOverview projectId={projectId} name={project.name} edit={can.edit} />
      )}

      {/* THE SAME SHAPE AS A STAGE-GATE JOB'S FRONT PAGE: the verdict in one
          sentence, what is late under it, then cards that fold — each saying
          its answer while shut. It was four number cards, a board panel asking
          for a workbook upload, and a chart per line, all open at once. */}
      {lens === 'overview' && model !== 'commissioning' && (
        <>
          <Verdict st={verdict} eyebrow={ppm.lines.length === 1 ? 'Where the line is' : 'Where the lines are'} />
          {model === 'board' && <FishboneLead projectId={projectId} can={can} />}
          <ProjectReminders projectId={projectId} />
          <LateAlarms projectId={projectId} />

          {/* THE TREE, ON THE FRONT PAGE OF A TREE JOB. The outcome and the
              conditions under it are what this job is run against, and the
              page said only lines and the board: a manager could not tell how
              the outcome stood without opening the tree. Drawn from the same
              rows the tree and the report draw. */}
          {tree && (
            <Fold id="p3-tree" title="The tree" says={tree.says}>
              <ul className="dw-list">
                <li className="dw-row">
                  <button className="dw-go" onClick={() => nav(`/project/${projectId}/tree`)}>
                    <b>{tree.outcome.text}</b>
                    <span className="dw-w">The outcome — <span className={'lt-word is-' + tree.outcome.rag}>{tree.outcome.word}</span></span>
                    <span className="dw-go-c" aria-hidden>›</span>
                  </button>
                </li>
                {tree.off.map(c => (
                  <li key={c.id} className="dw-row">
                    <button className="dw-go" onClick={() => nav(`/project/${projectId}/tree`)}>
                      <b>{c.text}</b>
                      <span className="dw-w"><span className={'lt-word is-' + c.rag}>{c.rag === 'r' ? 'Overdue' : 'At risk'}</span></span>
                      <span className="dw-go-c" aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Fold>
          )}

          <Fold id="p3-board" title="The board" says={boardSays}>
            <BoardPanel projectId={projectId} actions={actions} bare edit={can.edit} />
          </Fold>

          {/* WHERE EACH LINE IS BALANCED — what the Pareto cannot say. Always
              here, because a card that only appears once the work is done
              cannot be found to start it (Rowland: "I can't see it anywhere").
              A line not yet counted says so and opens straight to where its
              stations go. */}
          {ppm.lines.length > 0 && (
            <Fold id="p3-capacity" title="Line balance — where each line is limited"
              says={counted.length === 0 ? 'not counted yet — open a line to start'
                : counted.length === 1 && ppm.lines.length === 1 ? counted[0].says
                  : `${counted.length} of ${ppm.lines.length} lines counted`}>
              <ul className="dw-list">
                {/* THE WHOLE ROW IS THE WAY IN. The name alone was the button
                    — 45 by 20 pixels on a phone — and the sentence under it,
                    ending in a chevron, read as the thing to press and did
                    nothing (Rowland: "press line balancing, doesn't open"). */}
                {limited.map(x => (
                  <li key={x.line.id} className="dw-row">
                    <button className="dw-go" onClick={() => nav(`/project/${projectId}/line/${x.line.id}?view=capacity`)}>
                      <b>{x.line.name}</b>
                      <span className="dw-w">{x.says ?? 'Not counted yet — list the machines and people, each at its own speed'}</span>
                      <span className="dw-go-c" aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Fold>
          )}

          {/* DID IT WORK? Each closed action, judged by the line's own numbers
              either side of the day it closed — the same proof a Win carries.
              Only the ones with a day they closed and something to judge by. */}
          {closed.length > 0 && (
            <Fold id="p3-proof" title="Did it work?" says={provenSays}>
              <ul className="dw-list">
                {closed.map(s => {
                  const im = impacts.get(s.id);
                  /* THE WHOLE ROW IS THE WAY IN, as the Line balance rows are:
                     the action's name alone was the button, 20px tall, and the
                     verdict and the sentence beside it pressed nothing. */
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
            </Fold>
          )}

          <Fold id="p3-numbers" title={headline ? headline.name : 'The numbers'} says={numbersSays}>


          <section className="pace-sec">
            <div className="pace-sec-head">
              <p className="pace-sec-sub">
                {headline
                  ? <>Every line’s readings against the target for the period they fall in
                      {headline.unit && <> · {headline.unit}</>}
                      {' · '}{headline.direction === 'up' ? 'higher is better' : 'lower is better'}</>
                  : <>This project hasn’t said what it measures yet</>}
              </p>
            </div>
            {ppm.lines.length === 0 ? (
              <div className="pace-empty">
                <p className="sub">No lines on this project yet.</p>
                {can.edit && (
                  <button className="btn btn-primary" style={{ marginTop: 10 }}
                    onClick={() => nav(`/project/${projectId}/setup`)}>Add the first line</button>
                )}
              </div>
            ) : !headline ? (
              <div className="pace-empty">
                {/* The measures are agreed, so set by the owner (Details). */}
                {can.agree ? <>
                  <p className="sub">
                    Say what this project measures — a name, a unit and which way is good — and every
                    line’s chart draws itself from the readings.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: 10 }}
                    onClick={() => nav(`/project/${projectId}/setup`)}>Set the measures up</button>
                </> : (
                  <p className="sub">
                    {project.lead || 'The owner'} hasn’t said what this project measures yet. When they do, every
                    line’s chart draws itself from the readings.
                  </p>
                )}
              </div>
            ) : (
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
            )}
          </section>
          </Fold>
        </>
      )}

      {lens === 'lines' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            
            <p className="pace-sec-sub">
              Each line has an owner and a pack of its own — its pace, its actions, its next steps, its wins and its
              filmed walk. Open one to work in it; everything in it rolls up into the client report.
            </p>
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
        <section className="pace-sec">
          <div className="pace-sec-head">
            
            <p className="pace-sec-sub">What we did and what worked · the wins to show the team</p>
          </div>
          <PaceSuccess projectId={projectId} />
        </section>
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
