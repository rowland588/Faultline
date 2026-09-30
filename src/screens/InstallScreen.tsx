/* INSTALL — the weeks between a machine landing and it running.
 *
 * Rowland: "an installing section — the ability to understand the issues and
 * stages that are taking place on a day to day basis, telling a story."
 *
 * A machine already went Not here yet → On site → Installed → Running, and the
 * installation was one date. This is that gap, drawn: each machine, its steps
 * in the order they happen, which are done, which one it is waiting on and
 * whose it is, and what stopped it.
 *
 * ONE VIEW. Rowland, after using it: "the user interface just seems a bit
 * overlapped, a bit complex — let's have everything streamlined and together
 * rather than separate." It had grown three views of the same steps: the
 * grid, a card per machine underneath it repeating every step as a list, and
 * a box of "the usual stages" above both, each with its own buttons for the
 * same things. The grid is the one that stays, because it is the only one that
 * shows every machine at once and acts on a stage across all of them; what
 * only the others did now lives in it — each machine's sentence under its
 * row, "mark it installed" beside that, the stages edited from the grid's own
 * corner, a machine's first stages added from its row. A step's full story —
 * pictures, what was found, its fixes — is still its own page, one tap away.
 *
 * SAME RECORD, THIRD DOOR. An install step is a Test wearing `kind: 'install'`
 * — see lib/testing — so it already had a page, a card, a verdict, pictures,
 * "what we found" and fixes that can be for it. What the machine reads as is
 * lib/install's, one call, so the sentence here is the sentence on paper.
 */
import { nav } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { InstallGrid } from '../ui/InstallGrid';
import { todayISO } from '../lib/weeks';
import { useStanding } from '../lib/useStanding';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { installGrid, installOf, usualStages } from '../lib/install';
import { AddAsset } from './TestsScreen';

export function InstallScreen({ projectId }: { projectId: string }) {
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const stand = useStanding(projectId);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  const today = todayISO();
  const stages = usualStages(project, projects);
  const steps = tt.tests.filter(t => t.kind === 'install' && !t.deletedAt);
  const machines = tt.assets.filter(a => !a.deletedAt).map(a => installOf(a, tt.tests, tt.items, today));
  const line = installOf(undefined, tt.tests, tt.items, today);
  const done = steps.filter(t => t.outcome === 'passed').length;
  const late = [...machines, line].reduce((n, m) => n + m.late, 0);
  const installing = machines.filter(m => m.total > 0 && m.done < m.total).length;
  const onGrid = installGrid(tt.assets, tt.tests, tt.items, today, stages.stages).rows.length > 0;

  return (
    <div className="wrap pace cm-screen">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Install' },
      ]} />
      <Peers peers={projectPeers(projectId, 'install', stand.counts)} />

      <header className="cm-head">
        <div>
          <p className="cm-eyebrow">{project.name}</p>
          <h1>Install</h1>
          <p className="cw-handover">
            {steps.length === 0
              ? <b>Nothing planned yet</b>
              : <>
                <b>{done} of {steps.length} steps done</b>
                {installing > 0 && <span className="sub">{installing} machine{installing === 1 ? '' : 's'} installing</span>}
                {late > 0 && <span className="sub in-late">{late} late</span>}
              </>}
            <button className="cw-link" onClick={() => nav(`/project/${projectId}/day`)}>Read the day</button>
          </p>
        </div>
      </header>

      {onGrid
        ? <InstallGrid tt={tt} project={project} stages={stages}
            otherName={projects.find(p => p.id === stages.otherId)?.name} />
        : (
          <p className="sub tw-note">
            {tt.assets.length === 0
              ? 'Add the machines being installed. Each gets the job’s stages — positioned, air and power, electrics, sensors and controls, dry run — and you tick them off as they happen.'
              : 'Every machine here is already installed. Add the next one to install it step by step.'}
          </p>
        )}

      <div className="cx-assets in-add-machine">
        <AddAsset add={tt.addAsset} />
      </div>
    </div>
  );
}
