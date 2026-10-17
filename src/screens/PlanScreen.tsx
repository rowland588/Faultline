/* THE PLAN — the job's dated work as a Gantt, on a page of its own.
 *
 * It was the last fold on the job's front page, and the longest thing on it:
 * open, it pushed what needs doing off the screen; shut, it was a line of
 * text under two other folds. Rowland, 5 October: "too much on a screen… this
 * is more about opening doors rather than keeping it linear and simple." So
 * the front page keeps one line about the plan and a door, and this is the
 * room the door opens — the same Gantt (ui/Gantt), the same marks
 * (lib/standing), the same controls and the same PDF button. Nothing was lost
 * in the move; a saved ?view=plan link lands here too.
 *
 * It wears the frame every page wears (ui/Frame): "The plan" is a line in
 * the rail under Work, so this reads as one more page under the job. */
import { useMemo } from 'react';
import { AccessNote } from '../ui/AccessNote';
import { useJobMoney } from '../lib/useJobMoney';
import { MONEY_WAIT, planClosing, planCounts, planTiles } from '../lib/stageGatePages';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { Gantt } from '../ui/Gantt';
import { nav } from '../state/useRoute';
import { useProjects } from '../lib/useProjects';
import { usualStages } from '../lib/install';
import { useTesting } from '../lib/useTesting';
import { useStanding } from '../lib/useStanding';
import { usePrograms } from '../lib/usePrograms';
import { useWalkSnags } from '../lib/useWalkSnags';
import { useAccess } from '../cloud/access';
import { planGaps } from '../lib/onTarget';
import { paceOf } from '../lib/pace';
import { todayISO } from '../lib/standing';
import { PlanTabs } from '../ui/PlanTabs';

export function PlanScreen({ projectId }: { projectId: string }) {
  /* All the jobs, for each gate's list as the Install grid finds it (lib/install usualStages). */
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  /* By stage, the stages run in the order the Install grid runs them. */
  const stages = useMemo(() => (project
    ? { install: usualStages(project, projects, 'install').stages, setup: usualStages(project, projects, 'setup').stages, handover: usualStages(project, projects, 'handover').stages }
    : undefined), [project, projects]);
  const tt = useTesting(projectId);
  const all = useStanding(projectId);
  const progs = usePrograms(projectId);
  /* What the filmed walk found — one lane on the plan. */
  const walk = useWalkSnags(projectId);
  const can = useAccess(projectId);
  /* the job's money — what the slip costs, or what a day late would (lib/useJobMoney) */
  const money = useJobMoney(projectId);

  if (loading || tt.loading || all.loading || progs.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  /* A link to a project that has gone is a dead end, not a crash — and it
     says where to go, the way the other pages under a job do. */
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  const today = todayISO();
  const st = all.standing;
  /* THE LEAN PAGE (lib/stageGatePages): the plan's dated marks, as its
     sentence counted them, in tiles; the job's money last */
  const counts = planCounts(st.plan, today);
  const gaps = planGaps(tt.tests, tt.assets);

  return (
    <div className="wrap pace cm-screen">
      <PlanTabs projectId={projectId} on={'timeline'} />
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">The plan</h1>
          {/* The plan's counts are its tiles now (the lean page, 17 October:
              the header's count line moved into them, one place, as on the
              gates' tabs); what is not on it yet stays said here (lib/onTarget
              planGaps, docs/JOBSTART.md): the plan only draws what has a date. */}
          {gaps && <p className="cw-handover"><span className="sub">Not on it yet: {gaps}</span></p>}
        </div>
      </header>
      <AccessNote can={can} owner={project.lead} />
      {st.plan.length > 0 && <LeanTiles tiles={planTiles(counts, money ?? MONEY_WAIT)} className="sg-tiles" />}

      {st.plan.length === 0 ? (
        <p className="sub tw-note">
          Nothing on any list carries a date yet. Book a step, a test, a material or a program with a day and it appears here.
        </p>
      ) : (
        /* A GANTT, NOT A TIMELINE. Rowland: "build a proper Gantt chart view
           with dates across the top, showing easily on a calendar." The days
           are the columns and a bar sits on the days it means. Same marks —
           the control room's drawer and the client report draw the timeline. */
        <Gantt marks={st.plan} today={today} expectedAt={all.expectedAt} plannedAt={all.plannedAt} projectId={projectId}
          paceAt={paceOf({ tests: tt.tests, assets: tt.assets, today, expectedAt: all.expectedAt, plannedAt: all.plannedAt })?.at}
          name={project.name} tests={tt.tests} items={tt.items} walk={walk ?? undefined} assets={tt.assets} programs={progs.programs}
          dayHours={project.dayHours} stages={stages} />
      )}
      {/* THE CLOSING LINE — the plan in one sentence, the slip in money */}
      <LeanClosing closing={planClosing(counts, money ?? MONEY_WAIT, gaps || undefined)} />
    </div>
  );
}
