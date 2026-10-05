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
 * The frame is the one every gate wears (Crumbs, the small heading, the row
 * of peers, the access note), so this reads as one more page under the job. */
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { AccessNote } from '../ui/AccessNote';
import { Gantt } from '../ui/Gantt';
import { nav } from '../state/useRoute';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { useStanding } from '../lib/useStanding';
import { usePrograms } from '../lib/usePrograms';
import { useWalkSnags } from '../lib/useWalkSnags';
import { useAccess } from '../cloud/access';
import { planSays } from '../lib/plan';
import { todayISO } from '../lib/standing';

export function PlanScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const tt = useTesting(projectId);
  const all = useStanding(projectId);
  const progs = usePrograms(projectId);
  /* What the filmed walk found — one lane on the plan. */
  const walk = useWalkSnags(projectId);
  const can = useAccess(projectId);

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

  return (
    <div className="wrap pace cm-screen">
      <Crumbs trail={[
        { label: 'Control room', to: '/' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'The plan' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow is-said">{project.name}</p>
          <h1 className="pace-title is-said">The plan</h1>
          {/* The same sentence the front page's line says of the plan — one
              reading (lib/plan planSays), two places. */}
          <p className="cw-handover"><b>{planSays(st.plan, today)}</b></p>
        </div>
      </header>
      {/* The row under the header — see "THE PAGE FRAME" in styles.css. */}
      <Peers peers={projectPeers(projectId, 'plan', all.counts)} />
      <AccessNote can={can} owner={project.lead} />

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
          name={project.name} tests={tt.tests} items={tt.items} walk={walk ?? undefined} assets={tt.assets} programs={progs.programs} />
      )}
    </div>
  );
}
