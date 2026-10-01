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
import { useEffect, useState } from 'react';
import { Fold } from '../ui/Fold';
import { PaceSnags } from './PaceSnags';
import { framesForProject, getPaceWorkspaceId, onDataChange } from '../db';
import { StandardsCard } from '../ui/StandardsCard';
import { nav } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { InstallGrid } from '../ui/InstallGrid';
import { todayISO } from '../lib/weeks';
import { useStanding } from '../lib/useStanding';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { GATE_WORD, installGrid, installOf, usualStages } from '../lib/install';
import { gateOf, type StepGate, type Test, type TestItem } from '../lib/testing';
import { ProgramsScreen } from './ProgramsScreen';
import { AddAsset } from './TestsScreen';

/* THE GATES OF A STAGE-GATE JOB — Install, Set up and Hand over are one
   screen with three faces: machines down the side, that gate's stages across
   the top, each the job's own list. Rowland: "these are the gates to do
   install — next gate set up, programs; next commissioning; and after that
   handover ... always allow flexibility and full editing." Commission is the
   tests, on their own screen. Set up carries the programs under its grid. */
const FACE: Record<StepGate, { peer: string; doing: string; empty: string }> = {
  install: {
    peer: 'install', doing: 'installing',
    empty: 'Add the machines being installed. Each gets the job’s stages — positioned, air and power, electrics, sensors and controls, dry run — and you tick them off as they happen.',
  },
  setup: {
    peer: 'setup', doing: 'being set up',
    empty: 'Add the machines first. Each gets the job’s set-up stages — programs loaded, recipes set, change parts, HMI, guards — and you tick them off as they happen.',
  },
  handover: {
    peer: 'handover', doing: 'handing over',
    empty: 'Add the machines first. Each gets the job’s hand-over check sheet — manuals, training, spares, safety sign-off, client signed — every line of it yours to change.',
  },
};

/** What the filmed line holds, for its folded line: frames frozen, and the
 *  problems pinned on them that are still open. */
function useFilmed(projectId: string, tests: Test[], items: TestItem[]): { frames: number; open: number } | null {
  const [frames, setFrames] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    /* The frames of THIS walk — the one the fold opens onto. Counting every
       workspace on the project said "1 frame" over a body that said "No walk
       filmed yet", because the frame was on a line's own walk. */
    const load = () => void Promise.all([framesForProject(projectId), getPaceWorkspaceId(projectId)])
      .then(([f, walk]) => { if (live) setFrames(f.filter(x => x.wsId === walk).length); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  if (frames == null) return null;
  const open = tests.filter(t => !t.deletedAt && t.kind === 'fix' && t.pin && t.outcome !== 'passed').length
    + items.filter(i => !i.deletedAt && i.pin).length;
  return { frames, open };
}

const filmedSays = (f: { frames: number; open: number } | null): string =>
  !f ? '' : f.frames === 0 ? 'nothing filmed yet — film the line, then pin problems on it'
    : `${f.frames} frame${f.frames === 1 ? '' : 's'} · ${f.open} problem${f.open === 1 ? '' : 's'} pinned`;

export function InstallScreen({ projectId, gate = 'install' }: { projectId: string; gate?: StepGate }) {
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const stand = useStanding(projectId);
  const face = FACE[gate];
  const filmed = useFilmed(projectId, tt.tests, tt.items);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  const today = todayISO();
  const stages = usualStages(project, projects, gate);
  const steps = tt.tests.filter(t => t.kind === 'install' && gateOf(t) === gate && !t.deletedAt);
  const machines = tt.assets.filter(a => !a.deletedAt).map(a => installOf(a, tt.tests, tt.items, today, gate));
  const line = installOf(undefined, tt.tests, tt.items, today, gate);
  const done = steps.filter(t => t.outcome === 'passed').length;
  const late = [...machines, line].reduce((n, m) => n + m.late, 0);
  const going = machines.filter(m => m.total > 0 && m.done < m.total).length;
  const grid = installGrid(tt.assets, tt.tests, tt.items, today, stages.stages, gate);
  const onGrid = grid.rows.length > 0;
  /* Stages a machine has on the grid with nothing planned in them. "1 of 2
     steps done" over five stages read as nearly half way; it is one of five. */
  const unplanned = grid.rows.filter(r => r.view.total > 0).reduce((n, r) => n + r.cells.filter(c => !c).length, 0);

  return (
    <div className="wrap pace cm-screen">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: GATE_WORD[gate] },
      ]} />
      <Peers peers={projectPeers(projectId, face.peer, stand.counts)} />

      <header className="cm-head">
        <div>
          <p className="cm-eyebrow">{project.name}</p>
          <h1>{GATE_WORD[gate]}</h1>
          <p className="cw-handover">
            {steps.length === 0
              ? <b>Nothing planned yet</b>
              : <>
                <b>{done} of {steps.length} steps done</b>
                {going > 0 && <span className="sub">{going} machine{going === 1 ? '' : 's'} {face.doing}</span>}
                {late > 0 && <span className="sub in-late">{late} late</span>}
                {unplanned > 0 && <span className="sub">{unplanned} not planned yet</span>}
              </>}
            <button className="cw-link" onClick={() => nav(`/project/${projectId}/day`)}>Read the day</button>
          </p>
        </div>
      </header>

      {onGrid
        ? <InstallGrid tt={tt} project={project} stages={stages} gate={gate}
            otherName={projects.find(p => p.id === stages.otherId)?.name} />
        : (
          <p className="sub tw-note">
            {tt.assets.length === 0 || gate !== 'install'
              ? face.empty
              : 'Every machine here is already installed. Add the next one to install it step by step.'}
          </p>
        )}

      {gate === 'install' && (
        <div className="cx-assets in-add-machine">
          <AddAsset add={tt.addAsset} />
        </div>
      )}

      {/* THE LINE, FILMED — the evidence system, inside the gate it belongs to.
          Film the new line, freeze the frames, and every problem on every gate
          can be pinned on one of them. Rowland: "why can't the evidence system
          be inside what already exists, within the install section?"
          Below the grid, not above it: the grid is what this screen is for,
          and the film is what you reach for when the grid shows a problem. */}
      {gate === 'install' && (
        <Fold id="filmed" title="The line, filmed" says={filmedSays(filmed)}>
          <PaceSnags projectId={projectId} projectName={project.name} />
        </Fold>
      )}

      {gate === 'setup' && <ProgramsScreen projectId={projectId} embedded />}

      {/* HOW THE LINE IS RUN, PRODUCT BY PRODUCT — handed over with the line.
          The line standard is a tool; Hand over is where a stage-gate job
          uses it. */}
      {gate === 'handover' && <StandardsCard projectId={projectId} />}
    </div>
  );
}
