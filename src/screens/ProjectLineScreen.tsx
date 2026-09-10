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
 * What rolls upward: the project's GM report reads every line's next steps,
 * wins and snags, so the owners filling these in ARE what the GM ends up
 * reading. One source at the top, fed from underneath. */
import { useCallback, useMemo } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { PaceLineChart } from '../charts/PaceLineChart';
import { PaceMeeting } from './PaceMeeting';
import { PaceNextSteps } from './PaceNextSteps';
import { PaceSuccess } from './PaceSuccess';
import { PaceSnags } from './PaceSnags';
import { PpmEditor } from './PpmEditor';
import { useProject } from '../lib/useProjects';
import { usePaceLines, type PaceLinesState } from '../lib/usePaceLines';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';
import { actionsForLine } from '../lib/paceLineMatch';
import { useLinePackCounts } from '../lib/useLinePack';
import type { PaceLineRow } from '../db';

type Lens = 'overview' | 'meeting' | 'next' | 'wins' | 'snags' | 'data';
const LENSES: { id: Lens; label: string; sub: string }[] = [
  { id: 'overview', label: 'Overview',   sub: 'this line' },
  { id: 'meeting',  label: 'Actions',    sub: 'from the tracker' },
  { id: 'next',     label: 'Next steps', sub: 'to do & trials' },
  { id: 'wins',     label: 'Success',    sub: 'what worked' },
  { id: 'snags',    label: 'Evidence',   sub: 'the line, filmed' },
  { id: 'data',     label: 'Data',       sub: 'the ppm numbers' },
];

function Kpi({ n, label, sub, tone }: { n: string; label: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className={'pace-kpi' + (tone ? ' is-' + tone : '')}>
      <span className="pace-kpi-n">{n}</span>
      <span className="pace-kpi-l">{label}</span>
      {sub && <span className="pace-kpi-s">{sub}</span>}
    </div>
  );
}

/** The ppm grid, showing this line's row alone. The editor takes the whole
 *  lines state, so narrowing the list is all it needs — the grid, the week
 *  headings and the saving are the project's, unchanged. */
function oneLine(state: PaceLinesState, line: PaceLineRow): PaceLinesState {
  return { ...state, lines: state.lines.filter(l => l.id === line.id) };
}

export function ProjectLineScreen({ projectId, lineId }: { projectId: string; lineId: string }) {
  const route = useRoute();
  const raw = route.query.get('view');
  const lens: Lens = raw === 'meeting' || raw === 'data' || raw === 'snags' || raw === 'next' || raw === 'wins' ? raw : 'overview';

  const { loading: projLoading, project } = useProject(projectId);
  const ppm = usePaceLines(projectId);
  const pace = usePaceSnapshots(projectId);
  const line = ppm.lines.find(l => l.id === lineId);

  const counts = useLinePackCounts(projectId, lineId, line?.workspaceId);

  // The workspace is remembered ON the line, so attaching one is an edit to the
  // line row — which is also what makes it appear on the owner's other device.
  const attach = useCallback(async (wsId: string) => {
    await ppm.editLine(lineId, { workspaceId: wsId });
  }, [ppm, lineId]);

  const mine = useMemo(() => actionsForLine(pace.actions, line?.key ?? ''), [pace.actions, line?.key]);

  if (projLoading || ppm.loading || pace.loading) {
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

  const isDone = (s: string) => /^done$/i.test(s.trim());
  const done = mine.filter(a => isDone(a.status)).length;
  const overdue = mine.filter(a => /overdue/i.test(a.flag ?? '') && !isDone(a.status)).length;
  const seen = line.weekly.filter((v): v is number => v != null);
  const last = seen.length ? seen[seen.length - 1] : null;
  const delta = last == null ? null : last - line.q1;

  const go = (l: Lens) => nav(l === 'overview'
    ? `/project/${projectId}/line/${lineId}`
    : `/project/${projectId}/line/${lineId}?view=${l}`);

  return (
    <div className={'wrap pace is-' + lens}>
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">
            {project.name}
            {line.owner && <> · owned by <b>{line.owner}</b></>}
            {line.sponsor && <> · sponsor {line.sponsor}</>}
          </p>
          <h1 className="pace-title">{line.name}</h1>
          <p className="pace-lede">
            This line’s own pack — its pace, its actions, what is next, what worked and what the walk found.
            Everything here rolls up into the {project.name} report.
          </p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost pace-out" onClick={() => nav(`/project/${projectId}?view=lines`)}>‹ Lines</button>
          <button className="btn btn-primary" onClick={() => nav(`/pace-report?project=${projectId}&line=${lineId}`)}>
            This line’s deck
          </button>
          <AccountMenu />
        </div>
      </header>

      <nav className="pace-lenses" aria-label="View">
        {LENSES.map(l => (
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
            <Kpi n={last == null ? '—' : String(last)} label="ppm latest"
              sub={delta == null ? `Q1 target ${line.q1}` : `${delta >= 0 ? '+' : ''}${delta} vs Q1 target ${line.q1}`}
              tone={delta == null ? undefined : delta >= 0 ? 'good' : 'bad'} />
            <Kpi n={String(mine.length - done)} label="actions live" sub={`${done} of ${mine.length} closed`} />
            <Kpi n={String(overdue)} label="overdue" sub="past their date" tone={overdue > 0 ? 'bad' : 'good'} />
            <Kpi n={String(counts.openTodos)} label="next steps open" sub={`${counts.doneTodos} finished`} />
            <Kpi n={String(counts.openSnags)} label="open evidence" sub="on this line’s walk" tone={counts.openSnags > 0 ? 'warn' : 'good'} />
            {/* green only when there is something to be pleased about — a
                green nought reads as "all good" when it means "nothing yet" */}
            <Kpi n={String(counts.wins)} label="wins logged" sub="what worked" tone={counts.wins > 0 ? 'good' : undefined} />
          </div>

          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">Pace</h2>
              <p className="pace-sec-sub">Weekly packs per minute against the Q1 target</p>
            </div>
            <div className="pace-charts is-one">
              <PaceLineChart line={line} />
            </div>
          </section>
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
            <p className="pace-sec-sub">What still needs doing here, what we are waiting on, and trials — with the write-up and the evidence</p>
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
            <h2 className="pace-sec-title">Packs per minute</h2>
            <p className="pace-sec-sub">Type this line’s weekly reading · saves as you go, and shows on the project the moment it lands</p>
          </div>
          <PpmEditor state={oneLine(ppm, line)} startOpen />
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
