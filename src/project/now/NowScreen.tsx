/* NOW — A STAGE-GATE PROJECT'S CURRENT STATE ON ONE PAGE (docs/STAGEGATE-RESEARCH.md §4).
 *
 * Rowland, 26 October: "must have clear, simple understanding of the current state of anything."
 * Built beside the front page, the day, the journey and Needs you — none of them moves (CLAUDE.md,
 * rule 1). In the order a board is read (obeya, 1-3-10): are we on target (the front page's band and
 * tiles), what blocks handover, where each machine is, what is coming in the next two weeks, what
 * you owe. Every word from the module that already says it (project/now/now). A row opens its
 * record where it is kept. */
import { dayHref } from '../journey/journey';
import { useEffect, useMemo } from 'react';
import { useProject } from '../../lib/useProjects';
import { useProjectRead } from '../projectRead';
import { projectActions, PRIORITY_WORD, type ProjectAction } from '../../lib/projectActions';
import { whenWord } from '../../lib/projectActionsPdf';
import { journeyOf as daysOf, type JourneyLine } from '../journey/journey';
import { programsReading } from '../../lib/programsReport';
import { standing } from '../../lib/standing';
import { stageGateOnTarget } from '../../lib/onTarget';
import { stageGateClosing, stageGateTiles } from '../../lib/stageGateLean';
import { linesDay } from '../../lib/lineLoss';
import { live } from '../../lib/testing';
import { niceDay } from '../../lib/weeks';
import { planCount, planFor } from '../../lib/huddle';
import { useJobFactoryLines } from '../../lib/useFactoryLines';
import { useAssignedProblems } from '../../lib/useAssignedProblems';
import { Verdict } from '../../ui/Verdict';
import { LeanClosing } from '../../ui/Lean';
import { StateTag, type Tone } from '../../ui/parts';
import { openRecord } from '../../ui/RecordDrawer';
import { planHref } from '../../lib/plan';
import { nav, navReplace } from '../../state/useRoute';
import { blockers, jobFiguresOf, lookAhead, machinesOf, nowSays, owedFirst, type NowMachine } from './now';

/* what opens in the record's drawer, as on Needs you and Actions */
const IN_DRAWER = new Set(['test', 'fix', 'install', 'setup', 'handover']);
/* a day says its first few things; the rest are the journey's, one tap away */
const DAY_MOST = 5;
const MACHINES_MOST = 8;

function nowTiles(figures: Parameters<typeof stageGateTiles>[0]) {
  return stageGateTiles(figures, 'now');
}

function openAction(a: ProjectAction) {
  if (a.snagId) { nav(`/snags?open=${encodeURIComponent(a.snagId)}`); return; }
  const x = a.item;
  if (!x) return;
  if (x.id && (x.critical || IN_DRAWER.has(x.kind))) openRecord(x.jobId, x.id);
  else nav(planHref(x.jobId, x));
}

/** A ROW A MACHINE — its name and who made it, the gate it is at, its programs, what it owes, what is next; a tap
 *  opens its page in the project. */
export function MachineRows({ projectId, machines }: { projectId: string; machines: readonly NowMachine[] }) {
  return (
    <ul className="lt-rows">
      {machines.map(m => (
        <li key={m.id} className={'lt-li now-m' + (m.critical || m.late ? ' is-late' : '')} data-now-machine={m.name}>
          <button type="button" className="lt-row" onClick={() => nav(`/project/${projectId}/machine/${encodeURIComponent(m.id)}`)}>
            <b className="lt-what">{m.name}{m.oem && <span className="sub now-oem"> · {m.oem}</span>}{' '}<StateTag tone={m.gateTone as Tone}>{m.gate}</StateTag></b>
            <span className="lt-says">
              {[m.programs ? `Programs: ${m.programs}` : '', m.worstProgram ?? '',
                m.open ? `${m.open} open${m.late ? `, ${m.late} late` : ''}${m.critical ? `, ${m.critical} critical` : ''}` : 'nothing owed'].filter(Boolean).join(' · ')}
            </span>
            <span className="lt-where">{m.next ? <>{m.next.late ? 'Late' : 'Next'}: {m.next.what} · <span className={m.next.late ? 'act-late' : ''}>{niceDay(m.next.on)}</span></> : 'nothing dated'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** #/project/:id/now — an old link: Now is the project's front page since 26 October (four tabs). */
export function NowScreen({ projectId }: { projectId: string }) {
  useEffect(() => { navReplace(`/project/${projectId}`); }, [projectId]);
  return null;
}

/** NOW (docs/STAGEGATE-RESEARCH.md §4) — the body of a stage-gate project's front page (screens/
 *  ProjectDashboardScreen TestingOverview): the band, what blocks handover, the machines, the next two
 *  weeks, what you owe. Rowland, 26 October: "9 are still to many tabs" — the day, the journey and the
 *  actions are doors from here, not tabs. */
export function NowBody({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const read = useProjectRead(project);
  const factory = useJobFactoryLines(projectId);
  const assigned = useAssignedProblems(projectId);

  const page = useMemo(() => {
    if (!read?.gate) return null;
    const g = read.gate, today = read.today;
    const tests = live(g.tests), items = live(g.items), assets = live(g.assets);
    const st = standing({ tests, items, assets, materials: live(g.materials), programs: live(g.programs),
      ...(g.project.expectedAt ? { expectedAt: g.project.expectedAt } : {}), ...(g.project.plannedAt ? { plannedAt: g.project.plannedAt } : {}), today });
    const onTarget = stageGateOnTarget({ project: g.project, tests, items, assets, materials: g.materials, programs: g.programs, today }, st);
    const figures = jobFiguresOf(st, g.project, tests, items, assets, linesDay(factory.lines), assigned, today);
    const reading = programsReading({ tests, items, assets, programs: g.programs, today, holder: g.project, studies: read.studies });
    const rows = projectActions(read.owed, read.register, projectId, today);
    const machines = machinesOf(assets, tests, items, g.programs, reading, read.owed, today);
    const block = blockers(rows);
    const owe = owedFirst(rows);
    const ahead = daysOf(read.journey, lookAhead(today), today);
    /* the day's plan, counted the way the day counts it (lib/huddle) — on its door, as the front page's door said it */
    const plan = planFor(items, today, { tests, assets });
    const dayWord = plan.length ? `plan for today: ${planCount(plan)}` : 'today’s update';
    return { st, onTarget, figures, machines, block, owe, rows, ahead, today, dayWord };
  }, [read, factory.lines, assigned, projectId]);

  if (loading || (project && !read) || factory.loading) return <p className="sub wrap">Reading where the project is…</p>;
  if (!project || !read) return <p className="sub wrap">That project is not on this device.</p>;
  if (!page) return <p className="sub wrap">Now is a stage-gate project’s page — this project runs another method.</p>;

  const { st, onTarget, figures, machines, block, owe, rows, ahead, dayWord } = page;
  const openLine = (l: JourneyLine) => {
    if (l.snagId) { nav(`/snags?open=${encodeURIComponent(l.snagId)}`); return; }
    if (l.stepId) { nav(`/project/${projectId}/actions`); return; }
    if (l.href) { nav(l.href); return; }
    if (l.id) { openRecord(projectId, l.id); return; }
    if (l.go) nav(`/project/${projectId}/${l.go}`);
  };

  return (
    <div className="now">
      <p className="sub now-says">{nowSays(machines, block, rows)}</p>
      <nav className="now-doors" aria-label="Go straight to">
        <button type="button" className="now-door is-lead" onClick={() => nav(`/project/${projectId}/programs`)}>Programs</button>
        <span className="now-doors-sep" aria-hidden>·</span>
        <button type="button" className="now-door" onClick={() => nav(`/project/${projectId}/plan`)}>Timeline</button>
        <button type="button" className="now-door" onClick={() => nav(`/project/${projectId}/testing`)}>Commission</button>
        <button type="button" className="now-door" onClick={() => nav(`/project/${projectId}/machines`)}>Machines</button>
      </nav>

      {/* 1 · ARE WE ON TARGET — the front page's band and tiles, the same figures */}
      <Verdict st={st} brief onTarget={onTarget} tiles={nowTiles(figures)} />

      {/* 2 · WHAT BLOCKS HANDOVER — the critical problems, and nothing else */}
      <section className="qsl-g now-block" aria-label="Blocking handover">
        <div className="qsl-gh">
          <h2>Blocking handover</h2>
          <span className="sub">{block.length ? `${block.length} critical` : 'Nothing critical open'}</span>
        </div>
        {block.length > 0 && (
          <ul className="lt-rows">
            {block.map(a => (
              <li key={a.key} className="lt-li act-li is-late now-crit" data-now-block={a.key}>
                <button type="button" className="lt-row" onClick={() => openAction(a)}>
                  <b className="lt-what">{a.what}</b>
                  <span className="lt-says act-meta"><span className="act-pri is-critical">{PRIORITY_WORD.critical}</span>{[a.where, a.why].filter(Boolean).join(' · ')}</span>
                  <span className="lt-where act-when">{a.who || 'nobody yet'} · <span className={a.late ? 'act-late' : ''}>{whenWord(a)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3 · THE MACHINES — each at its gate, its programs, what it owes, what is next */}
      <section className="qsl-g now-machines" aria-label="The machines">
        <div className="qsl-gh">
          <h2>The machines</h2>
          <span className="sub">{machines.length ? `${machines.length} on the project` : 'None yet'}</span>
        </div>
        {!machines.length && <p className="qsl-empty">No machines on the project yet — they are added at Install.</p>}
        {machines.length > 0 && (
          <>
            <MachineRows projectId={projectId} machines={machines.slice(0, MACHINES_MOST)} />
            {machines.length > MACHINES_MOST && (
              <p className="sub now-more">{machines.length - MACHINES_MOST} more — <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/machines`)}>All machines ›</button></p>
            )}
          </>
        )}
      </section>

      {/* 4 · TODAY AND THE NEXT TWO WEEKS — what the day and the journey say ahead (project/journey) */}
      <section className="qsl-g now-ahead" aria-label="Today and the next two weeks">
        <div className="qsl-gh">
          <h2>Today and the next two weeks</h2>
          <span className="sub">{ahead.days.length ? `${ahead.days.reduce((n, d) => n + d.lines.length, 0)} things on ${ahead.days.length} day${ahead.days.length === 1 ? '' : 's'}` : 'Nothing dated in the next two weeks'}</span>
          <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/journey`)}>Journey ›</button>
          <button type="button" className="cw-link now-today" onClick={() => nav(dayHref(projectId))}>Today — {dayWord}</button>
        </div>
        {ahead.days.map(d => (
          <div key={d.date} className={'now-day' + (d.today ? ' is-today' : '')} data-now-day={d.date}>
            <h3 className="now-dh">{d.label}{d.today ? ' · today' : ''}</h3>
            <ul className="lt-rows">
              {d.lines.slice(0, DAY_MOST).map((l, i) => (
                <li key={i} className={'lt-li jn-li is-' + l.tone}>
                  <button type="button" className="lt-row" onClick={() => openLine(l)}>
                    <b className="lt-what">{l.text}</b>
                    {(l.kind || l.detail) && <span className="lt-says">{[l.kind, l.detail].filter(Boolean).join(' · ')}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {d.lines.length > DAY_MOST && <p className="sub now-more">{d.lines.length - DAY_MOST} more on this day — <button type="button" className="cw-link" onClick={() => nav(dayHref(projectId, d.date))}>open the day</button></p>}
          </div>
        ))}
      </section>

      {/* 5 · WHAT YOU OWE — late first; everything on Actions */}
      <section className="qsl-g now-owe" aria-label="What you owe">
        <div className="qsl-gh">
          <h2>What you owe</h2>
          <span className="sub">{owe.shown.length ? `${rows.filter(a => a.priority !== 'critical').length} open · ${rows.filter(a => a.late && a.priority !== 'critical').length} late` : 'Nothing owed'}</span>
          <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/actions`)}>All actions ›</button>
        </div>
        {owe.shown.length > 0 && (
          <ul className="lt-rows">
            {owe.shown.map(a => (
              <li key={a.key} className={'lt-li act-li' + (a.late ? ' is-late' : a.soon ? ' is-soon' : '')} data-now-owe={a.key}>
                <button type="button" className="lt-row" onClick={() => openAction(a)}>
                  <b className="lt-what">{a.what}</b>
                  <span className="lt-says act-meta">
                    {a.priority && <span className={'act-pri is-' + a.priority}>{PRIORITY_WORD[a.priority]}</span>}
                    {[a.kind, a.where].filter(Boolean).join(' · ')}
                  </span>
                  <span className="lt-where act-when">{a.who || 'nobody yet'} · <span className={a.late ? 'act-late' : a.soon ? 'act-soon' : ''}>{whenWord(a)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {owe.more > 0 && <p className="sub now-more">{owe.more} more on <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/actions`)}>Actions ›</button></p>}
      </section>

      {(() => {
        const closing = stageGateClosing(onTarget, figures, { brief: true });
        return closing.text ? <LeanClosing closing={closing} /> : null;
      })()}
    </div>
  );
}
