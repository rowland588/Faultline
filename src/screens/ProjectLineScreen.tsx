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
import { useCallback, useMemo, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers } from '../ui/Peers';
import { MeasureChart } from '../charts/MeasureChart';
import { PaceMeeting } from './PaceMeeting';
import { PaceNextSteps } from './PaceNextSteps';
import { PaceSuccess } from './PaceSuccess';
import { PaceSnags } from './PaceSnags';
import { useAccess } from '../cloud/access';
import { LineNumbers } from './NumbersPanel';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useMeasures } from '../lib/useMeasures';
import { lineSeries, say, vsTarget } from '../lib/measures';
import { useActions, WHOLE_PROJECT } from '../lib/actions';
import { useLineWorkspace } from '../lib/usePaceWorkspace';
import { planModel } from '../lib/planModel';
import { useLinePackCounts } from '../lib/useLinePack';
import { CapacityPanel } from './CapacityPanel';
import { analyse } from '../lib/capacity';

type Lens = 'overview' | 'next' | 'wins' | 'snags' | 'data' | 'capacity';
const LENSES: { id: Lens; label: string; sub: string }[] = [
  { id: 'overview', label: 'Overview',   sub: 'this line' },
  /* ONE TAB FOR THE ACTIONS. "Actions" and "Next steps" sat side by side and
     showed the same records — a 3P action IS a next step (lib/actions.ts) —
     one grouped by owner, one as a list. One place now, with the grouping as
     a switch inside it. */
  { id: 'next',     label: 'Actions',    sub: 'to do, tests, by owner' },
  { id: 'wins',     label: 'Wins',       sub: 'what worked' },
  { id: 'snags',    label: 'Evidence',   sub: 'the line, filmed' },
  { id: 'data',     label: 'Numbers',    sub: 'record and chart' },
  { id: 'capacity', label: 'Line balance', sub: 'where it is limited' },
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
  const can = useAccess(projectId);
  const route = useRoute();
  const raw = route.query.get('view');
  /* A saved ?view=meeting link lands on the actions, grouped by owner. */
  const asked: Lens = raw === 'meeting' || raw === 'next' ? 'next'
    : raw === 'data' || raw === 'snags' || raw === 'wins' || raw === 'capacity' ? raw : 'overview';
  const [byOwner, setByOwner] = useState(raw === 'meeting');

  const { loading: projLoading, project } = useProject(projectId);
  const ppm = usePaceLines(projectId);
  const ax = useActions(projectId);
  const nums = useMeasures(projectId);
  const line = ppm.lines.find(l => l.id === lineId);

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

  if (projLoading || ppm.loading || ax.loading || nums.loading) {
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

  const capLine = line.capacity && line.capacity.stations.length > 0 ? analyse(line.capacity).sentence : undefined;

  const lensUrl = (l: Lens) => l === 'overview'
    ? `/project/${projectId}/line/${lineId}`
    : `/project/${projectId}/line/${lineId}?view=${l}`;
  const go = (l: Lens) => nav(lensUrl(l));

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
          {!paced && (
            <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/testing`)}>
              Testing
            </button>
          )}
        </div>
      </header>

      {/* THE ONE ROW OF TABS (ui/Peers), under the header like every page's.
          The line had its own — underlined tabs with a hint under each, and on
          a phone a 3-by-2 grid — so it was the one page whose tabs looked and
          moved differently. The hints stay, beside each name on a desk; a
          phone never showed them. On a phone the row scrolls sideways and
          fades where it carries on, as every other row of tabs does. */}
      <Peers label="View" peers={shownLenses.map(l => ({
        label: l.label, hint: l.sub, on: lens === l.id, to: lensUrl(l.id),
      }))} />

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
              <Kpi n={String(overdue)} label="overdue" sub="past their date" tone={overdue > 0 ? 'bad' : undefined} />
            </>}
            {/* On a 3P line the next steps ARE the actions — counted once, above. */}
            {!paced && <Kpi n={String(counts.openTodos)} label="next steps open" sub={`${counts.doneTodos} finished`} />}
            <Kpi n={String(counts.openSnags)} label="open evidence" sub="on this line’s walk" tone={counts.openSnags > 0 ? 'warn' : undefined} />
            {/* green only when there is something to be pleased about — a
                green nought reads as "all good" when it means "nothing yet" */}
            <Kpi n={String(counts.wins)} label="wins logged" sub="what worked" tone={counts.wins > 0 ? 'good' : undefined} />
          </div>

          {/* WHERE THE LINE IS LIMITED, one line on the overview — what the
              Pareto cannot say. Quiet until the stations are filled in. */}
          {paced && (
            <button className={'why-door cap-door' + (capLine ? ' is-set' : '')} onClick={() => go('capacity')}>
              <span className="why-door-t">{capLine ?? 'Where is this line limited?'}</span>
              <span className="why-door-s">
                {capLine
                  ? 'Open the line balance — each station at its own speed, in one unit.'
                  : 'List the machines and people in order, each at its own speed. The shortest one is what holds the line back.'}
              </span>
            </button>
          )}

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

      {lens === 'next' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Actions on {line.name}</h2>
            <p className="pace-sec-sub">
              {mine.length} action{mine.length === 1 ? '' : 's'} · what still needs doing here, what we are waiting on, and tests
              {' '}· the ones written for every line show here too
            </p>
            <span className="gt-seg pace-sec-seg" role="group" aria-label="Show as">
              <button type="button" className={byOwner ? '' : 'on'} onClick={() => setByOwner(false)}>List</button>
              <button type="button" className={byOwner ? 'on' : ''} onClick={() => setByOwner(true)}>By owner</button>
            </span>
          </div>
          {byOwner ? <PaceMeeting actions={mine} /> : <PaceNextSteps projectId={projectId} lineId={lineId} withWhole={paced} />}
        </section>
      )}

      {lens === 'wins' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">Wins on {line.name}</h2>
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
          <PaceSnags projectId={projectId} projectName={project.name} can={can}
            line={{ workspaceId: line.workspaceId, name: line.name, attach }} />
        </section>
      )}

      {lens === 'data' && (
        <section className="pace-sec">
          <div className="pace-sec-head">
            <h2 className="pace-sec-title">This line’s numbers</h2>
            <p className="pace-sec-sub">
              Every measure this project runs on · record each reading as it is taken · it shows on
              the project the moment it lands
            </p>
          </div>
          <LineNumbers projectId={projectId} line={line} />
        </section>
      )}

      {lens === 'capacity' && paced && (
        <CapacityPanel projectId={projectId} line={line} onSave={cap => ppm.editLine(lineId, { capacity: cap })} />
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
