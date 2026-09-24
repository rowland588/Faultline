/* ONE LINE'S PACK — everything Project Pace is, for a single line.
 *
 * The whole point of giving a line an owner is that the owner then has
 * something to own. So a line gets the same surface the project has, scoped to
 * itself: its pace against target, its actions out of the tracker, its next
 * steps, its wins, its own filmed walk, its own numbers to type — and its own
 * A3 to send.
 *
 * Nothing here is a new implementation. Every panel is the component the
 * project already uses, handed a line instead of a project, which is what makes
 * "each line has a full pack" true rather than approximately true.
 *
 * What rolls upward: the project's client report reads every line's next steps,
 * wins and snags, so the owners filling these in ARE what the client ends up
 * reading. One source at the top, fed from underneath. */
import { useCallback, useMemo } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { MeasureChart } from '../charts/MeasureChart';
import { PaceMeeting } from './PaceMeeting';
import { PaceNextSteps } from './PaceNextSteps';
import { PaceSuccess } from './PaceSuccess';
import { PaceSnags } from './PaceSnags';
import { LineNumbers } from './NumbersPanel';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useMeasures } from '../lib/useMeasures';
import { lineSeries, say, vsTarget } from '../lib/measures';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';
import { useLineWorkspace } from '../lib/usePaceWorkspace';
import { actionsForLine } from '../lib/paceLineMatch';
import { planModel } from '../lib/planModel';
import { useLinePackCounts } from '../lib/useLinePack';

type Lens = 'overview' | 'meeting' | 'next' | 'wins' | 'snags' | 'data';
const LENSES: { id: Lens; label: string; sub: string }[] = [
  { id: 'overview', label: 'Overview',   sub: 'this line' },
  { id: 'meeting',  label: 'Actions',    sub: 'from the tracker' },
  { id: 'next',     label: 'Next steps', sub: 'to do & tests' },
  { id: 'wins',     label: 'Success',    sub: 'what worked' },
  { id: 'snags',    label: 'Evidence',   sub: 'the line, filmed' },
  { id: 'data',     label: 'Numbers',    sub: 'record and chart' },
];

/* WHAT A LINE ON A COMMISSIONING JOB HAS.
 *
 * Not this. A handover has no weekly tracker to slice, no period target to
 * measure against and no reading to record: the rate is agreed once, per pack,
 * and either proved or not. What it does have is the walk — filming is how a
 * defect gets proved — and the things somebody writes down while doing it.
 *
 * Leaving the rest on was the whole reason commissioning still read as the
 * tracker wearing a different hat. */
const COMMISSIONING_LENSES: Lens[] = ['overview', 'next', 'wins', 'snags'];

function Kpi({ n, label, sub, tone }: { n: string; label: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className={'pace-kpi' + (tone ? ' is-' + tone : '')}>
      <span className="pace-kpi-n">{n}</span>
      <span className="pace-kpi-l">{label}</span>
      {sub && <span className="pace-kpi-s">{sub}</span>}
    </div>
  );
}

export function ProjectLineScreen({ projectId, lineId }: { projectId: string; lineId: string }) {
  const route = useRoute();
  const raw = route.query.get('view');
  const asked: Lens = raw === 'meeting' || raw === 'data' || raw === 'snags' || raw === 'next' || raw === 'wins' ? raw : 'overview';

  const { loading: projLoading, project } = useProject(projectId);
  const ppm = usePaceLines(projectId);
  const pace = usePaceSnapshots(projectId);
  const nums = useMeasures(projectId);
  const line = ppm.lines.find(l => l.id === lineId);

  const counts = useLinePackCounts(projectId, lineId, line?.workspaceId);

  // The workspace is remembered ON the line, so attaching one is an edit to the
  // line row — which is also what makes it appear on the owner's other device.
  const attach = useCallback(async (wsId: string) => {
    await ppm.editLine(lineId, { workspaceId: wsId });
  }, [ppm, lineId]);

  const mine = useMemo(() => actionsForLine(pace.actions, line?.key ?? ''), [pace.actions, line?.key]);

  /* The Pareto used to be a top-level mode you had to already know about, and
   * nothing in the project ever pointed at it — so on the one screen that says
   * "this line is behind", the tool that answers WHY was unreachable. It is a
   * door off the line now, not a place you navigate to. The workspace is made
   * on the way in, the same as the filmed walk's. */
  const ws = useLineWorkspace(line?.workspaceId, line?.name ?? '', attach);
  const findOutWhy = async () => { nav(`/w/${await ws.ensure()}/analyse`); };

  if (projLoading || ppm.loading || pace.loading || nums.loading) {
    return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  }
  if (!project || !line) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That line isn’t on this project any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    );
  }

  const paced = planModel(project) !== 'commissioning';
  const shownLenses = paced ? LENSES : LENSES.filter(l => COMMISSIONING_LENSES.includes(l.id));
  /* A lens this line has not got lands on its overview rather than on a blank
     page — hiding it from the row never stopped the URL reaching the body. */
  const lens: Lens = shownLenses.some(l => l.id === asked) ? asked : 'overview';

  const isDone = (s: string) => /^done$/i.test(s.trim());
  const done = mine.filter(a => isDone(a.status)).length;
  const overdue = mine.filter(a => /overdue/i.test(a.flag ?? '') && !isDone(a.status)).length;
  /* THE HEADLINE MEASURE — the first one this business listed. One number has to
     stand for the line on a KPI and in a door's wording, and the project's own
     order is the only honest way to pick which. */
  const head = lineSeries(nums.measures, nums.periods, nums.targets, nums.readings, line.id);
  /* How far off it is, in its own units — only when there is a margin to quote.
     `meeting === false` and a missing margin cannot both happen, but saying so
     with a number rather than an assertion is what keeps it that way. */
  const off = head?.meeting === false && head.margin != null
    ? say(Math.abs(head.margin), head.measure.unit) : null;

  const go = (l: Lens) => nav(l === 'overview'
    ? `/project/${projectId}/line/${lineId}`
    : `/project/${projectId}/line/${lineId}?view=${l}`);

  return (
    <div className={'wrap pace is-' + lens}>
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
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
          <p className="pace-lede">
            {paced
              ? <>This line’s own pack — its numbers, its actions, what is next, what worked and what the walk found.
                  Everything here rolls up into the {project.name} report.</>
              : <>This line’s own pack — what is next, what worked, and what the walk found. The rate it has to
                  hit lives in Testing, agreed once and either proved or not.</>}
          </p>
        </div>
        <div className="pace-head-actions">
          {/* The deck is drawn from the plan — the measures, their targets and the
              tracker's actions. A handover has none of them, and its own A3 is
              printed from testing. */}
          {paced && (
            <button className="btn btn-primary" onClick={() => nav(`/pace-report?project=${projectId}&line=${lineId}`)}>
              This line’s deck
            </button>
          )}
          {!paced && (
            <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/testing`)}>
              Testing
            </button>
          )}
        </div>
      </header>

      <nav className="pace-lenses" aria-label="View">
        {shownLenses.map(l => (
          <button key={l.id} className={'pace-lens' + (lens === l.id ? ' on' : '')}
            aria-current={lens === l.id ? 'page' : undefined} onClick={() => go(l.id)}>
            <span className="pace-lens-l">{l.label}</span>
            <span className="pace-lens-s">{l.sub}</span>
          </button>
        ))}
      </nav>

      {lens === 'overview' && (
        <>
          <div className="pace-kpis">
            {paced && <>
              {/* The measure this project leads on, in its own words and units —
                  and nothing at all when the project has not named one yet. */}
              {head && (
                <Kpi n={head.latest == null ? '—' : say(head.latest)}
                  label={`${head.measure.name.toLowerCase()} latest`}
                  sub={vsTarget(head)}
                  tone={head.meeting == null ? undefined : head.meeting ? 'good' : 'bad'} />
              )}
              <Kpi n={String(mine.length - done)} label="actions live" sub={`${done} of ${mine.length} closed`} />
              <Kpi n={String(overdue)} label="overdue" sub="past their date" tone={overdue > 0 ? 'bad' : 'good'} />
            </>}
            <Kpi n={String(counts.openTodos)} label="next steps open" sub={`${counts.doneTodos} finished`} />
            <Kpi n={String(counts.openSnags)} label="open evidence" sub="on this line’s walk" tone={counts.openSnags > 0 ? 'warn' : 'good'} />
            {/* green only when there is something to be pleased about — a
                green nought reads as "all good" when it means "nothing yet" */}
            <Kpi n={String(counts.wins)} label="wins logged" sub="what worked" tone={counts.wins > 0 ? 'good' : undefined} />
          </div>

          {paced && head && (
          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">{head.measure.name}</h2>
              <p className="pace-sec-sub">
                Every reading, against {head.period ? `the ${head.period.name} target` : 'the target for the period it falls in'}
                {head.measure.unit && <> · {head.measure.unit}</>}
                {' · '}{head.measure.direction === 'up' ? 'higher is better' : 'lower is better'}
              </p>
            </div>
            <div className="pace-charts is-one">
              <MeasureChart series={head} who={{ name: line.name, owner: line.owner, sponsor: line.sponsor, variant: line.variant }} />
            </div>

            {/* The number says WHETHER the line is where it should be. It can
                never say why — that needs the losses timed on the floor. Offered
                loudly when the line is behind, and quietly when it is not,
                because "why are we winning" is a fair question too. */}
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
          </section>
          )}
        </>
      )}

      {lens === 'meeting' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Actions on {line.name}</h2>
            <p className="pace-sec-sub">
              This line’s slice of the tracker, by owner · {mine.length} action{mine.length === 1 ? '' : 's'}
              {' '}· actions the workbook marks as spanning every line show here too
            </p>
          </div>
          <PaceMeeting actions={mine} roster={pace.roster} />
        </section>
      )}

      {lens === 'next' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Next steps on {line.name}</h2>
            <p className="pace-sec-sub">What still needs doing here, what we are waiting on, and tests — with the write-up and the evidence</p>
          </div>
          <PaceNextSteps projectId={projectId} lineId={lineId} />
        </section>
      )}

      {lens === 'wins' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Success on {line.name}</h2>
            <p className="pace-sec-sub">What this line did and what worked · the wins to show the team</p>
          </div>
          <PaceSuccess projectId={projectId} lineId={lineId} />
        </section>
      )}

      {lens === 'snags' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">{line.name}, filmed</h2>
            <p className="pace-sec-sub">This line’s own walk — film it, mark the frames, pin what you see · play it back in the meeting</p>
          </div>
          <PaceSnags projectId={projectId} projectName={project.name}
            line={{ workspaceId: line.workspaceId, name: line.name, attach }} />
        </section>
      )}

      {lens === 'data' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">This line’s numbers</h2>
            <p className="pace-sec-sub">
              Every measure this project runs on · record one reading, or paste a block from a
              spreadsheet · it shows on the project the moment it lands
            </p>
          </div>
          <LineNumbers projectId={projectId} line={line} />
        </section>
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
