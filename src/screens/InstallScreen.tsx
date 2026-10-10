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
import { InstallGrid, stageWord } from '../ui/InstallGrid';
import { Icon } from '../ui/Icon';
import { openRecord } from '../ui/RecordDrawer';
import { todayISO } from '../lib/weeks';
import { partsOf, resultNow } from '../lib/noted';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { GATE_WORD, doneTodayPatch, installGrid, installOf, isSignOff, usualHolder, usualStages } from '../lib/install';
import { changeTests } from '../ui/WhyMoved';
import { gateOf, type StepGate, type Test, type TestItem } from '../lib/testing';
import { usePrograms } from '../lib/usePrograms';
import { programsReading } from '../lib/programsReport';
import { AddAsset } from './TestsScreen';
import { useAccess } from '../cloud/access';
import { AccessNote } from '../ui/AccessNote';

/* THE GATES OF A STAGE-GATE JOB — Install, Set up and Hand over are one
   screen with three faces: machines down the side, that gate's stages across
   the top, each the job's own list. Rowland: "these are the gates to do
   install — next gate set up, programs; next commissioning; and after that
   handover ... always allow flexibility and full editing." Commission is the
   tests, on their own screen. Set up carries the programs under its grid. */
const FACE: Record<StepGate, { peer: string; doing: string; empty: string }> = {
  install: {
    peer: 'install', doing: 'installing',
    empty: 'Add the machines being installed — or paste a list of them. Then one tap gives them all the job’s stages — positioned, air and power, electrics, sensors and controls, dry run — and you tick them off as they happen.',
  },
  setup: {
    peer: 'setup', doing: 'being set up',
    empty: 'Add the machines first. Then one tap gives them all the job’s set-up stages — programs loaded, recipes set, change parts, HMI, guards — and you tick them off as they happen.',
  },
  handover: {
    peer: 'handover', doing: 'handing over',
    empty: 'Add the machines first. Then one tap gives them all the job’s hand-over check sheet — manuals, training, spares, safety sign-off, client signed — every line of it yours to change.',
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

const filmedSays = (f: { frames: number; open: number } | null, canFilm = true): string =>
  !f ? '' : f.frames === 0 ? (canFilm ? 'nothing filmed yet — film the line, then pin problems on it' : 'nothing filmed yet')
    : `${f.frames} frame${f.frames === 1 ? '' : 's'} · ${f.open} problem${f.open === 1 ? '' : 's'} pinned`;

export function InstallScreen({ projectId, gate = 'install' }: { projectId: string; gate?: StepGate }) {
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const face = FACE[gate];
  const filmed = useFilmed(projectId, tt.tests, tt.items);
  const can = useAccess(projectId);
  /* The job's programs — what a sign-off says was still open on its machine
     (lib/install doneTodayPatch). */
  const progs = usePrograms(projectId);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  /* A link to a project that has gone is a dead end, not a crash — and it
     says where to go, the way the project page and Materials do. It was the
     sentence alone, with nothing on the screen to press. */
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  const today = todayISO();
  const stages = usualStages(project, projects, gate);
  /* The job whose list it is — who each stage is usually with comes with it. */
  const holder = usualHolder(project, projects, gate);
  const steps = tt.tests.filter(t => t.kind === 'install' && gateOf(t) === gate && !t.deletedAt);
  const machines = tt.assets.filter(a => !a.deletedAt).map(a => installOf(a, tt.tests, tt.items, today, gate));
  const line = installOf(undefined, tt.tests, tt.items, today, gate);
  const done = steps.filter(t => t.outcome === 'passed').length;
  const late = [...machines, line].reduce((n, m) => n + m.late, 0);
  /* Machines with something started and not finished — "8 machines
     installing" was said with nothing done (docs/JOBSTART.md). */
  const going = machines.filter(m => m.done > 0 && m.done < m.total).length;
  const grid = installGrid(tt.assets, tt.tests, tt.items, today, stages.stages, gate);
  const onGrid = grid.rows.length > 0;
  /* Stages a machine has on the grid with nothing planned in them. "1 of 2
     steps done" over five stages read as nearly half way; it is one of five. */
  const unplanned = grid.rows.filter(r => r.view.total > 0).reduce((n, r) => n + r.cells.filter(c => !c).length, 0);

  return (
    <div className="wrap pace cm-screen">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">{GATE_WORD[gate]}</h1>
          <p className="cw-handover">
            {steps.length === 0
              ? <b>Nothing planned yet</b>
              : <>
                <b>{done} of {steps.length} {gate === 'handover' ? 'items' : 'steps'} done</b>
                {going > 0 && <span className="sub">{going} machine{going === 1 ? '' : 's'} {face.doing}</span>}
                {late > 0 && <span className="sub in-late">{late} late</span>}
                {/* A stage not on a machine's list — "not added yet", the one word the
                    grid, its key and the client report use for it. */}
                {unplanned > 0 && <span className="sub">{unplanned} not added yet</span>}
              </>}
            <button className="cw-link" onClick={() => nav(`/project/${projectId}/day`)}>Read the day</button>
            {/* THE HANDOVER REPORT — the line as it was really handed over
                (docs/HANDOVER.md), from the gate it is about. */}
            {gate === 'handover' && <button className="cw-link" onClick={() => nav(`/project/${projectId}/report?doc=handover`)}>Handover report ›</button>}
          </p>
        </div>
      </header>
      <AccessNote can={can} owner={project.lead} />

      {/* NEEDS YOU — first, as on Commission (docs/SIMPLE.md): only the
          stages that are late or hit a problem, machine and stage, in words;
          each opens its record. Everything on plan is a square below. */}
      {onGrid && (() => {
        const needs = grid.rows.flatMap(r => r.cells.filter((c): c is NonNullable<typeof c> => !!c && (c.tone === 'problem' || c.tone === 'late' || (c.late && c.tone !== 'done')))
          .map(c => ({ c, machine: r.asset?.name ?? 'The line' })))
          .sort((a, b) => Number(b.c.tone === 'problem') - Number(a.c.tone === 'problem'));
        /* A PART SAID TO HAVE FAILED — a program that did not pass (lib/noted
           resultNow), a branch of its stage: it opens the stage. */
        const failed = grid.rows.flatMap(r => r.cells.flatMap(c => (!c ? [] : partsOf(c.step.id, tt.items).flatMap(p => {
          const said = resultNow(p);
          return said?.is === 'failed' ? [{ c, p, note: said.note, machine: r.asset?.name ?? 'The line' }] : [];
        }))));
        const n = needs.length + failed.length;
        return (
          <section className="cmp-sec cg-needs" aria-label="Needs you">
            <div className="cw-sec-h"><h2 className="cmp-h">Needs you</h2>{n > 0 && <span className="cmp-h-n">{n}</span>}</div>
            {n === 0
              ? <p className="sub tw-note">Nothing — no stage is late or stuck on a problem.</p>
              : (
                <ul className="nd-list">
                  {needs.map(({ c, machine }) => (
                    <li key={c.step.id} className={'nd-row is-' + (c.tone === 'problem' ? 'failed' : 'late')}>
                      <button type="button" className="nd-main" onClick={() => openRecord(projectId, c.step.id)}>
                        <span className={'nd-tag is-' + (c.tone === 'problem' ? 'failed' : 'late')}>{stageWord(c)}</span>
                        <b>{machine} — {c.step.title}</b>
                      </button>
                      {/* THE STAGE'S OWN BUTTON, ON ITS ROW (docs/HANDOVER.md;
                          STAGEGATE.md flagged item 4) — Commission's place and
                          look, the drawer's own write: a late stage is done
                          today; one that hit a problem gets a fix planned. A
                          sign-off opens, to ask who signed. */}
                      {can.edit && (c.tone === 'problem' ? (
                        <span className="nd-acts">
                          <button type="button" className="btn btn-sm" onClick={() => nav(`/project/${projectId}/fixes?for=${encodeURIComponent(c.step.id)}`)}>Plan a fix</button>
                        </span>
                      ) : c.step.outcome !== 'passed' && (
                        <span className="nd-acts">
                          <button type="button" className="btn btn-sm" onClick={() => {
                            /* A sign-off opens, to ask who signed — every time (docs/PANELS.md). */
                            if (isSignOff(c.step)) { openRecord(projectId, c.step.id); return; }
                            void changeTests(tt, [c.step], doneTodayPatch(c.step, { tests: tt.tests, items: tt.items, assets: tt.assets, programs: progs.programs }, todayISO()),
                              `${c.step.title} done — ${machine}`);
                          }}>Done today</button>
                        </span>
                      ))}
                    </li>
                  ))}
                  {failed.map(({ c, p, note, machine }) => (
                    <li key={p.id} className="nd-row is-failed">
                      <button type="button" className="nd-main" onClick={() => openRecord(projectId, c.step.id)}>
                        <span className="nd-tag is-failed">Failed</span>
                        <b>{machine} — {c.step.title} — {p.what}</b>
                        {note && <span className="sub">{note}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        );
      })()}

      {onGrid
        ? <InstallGrid tt={tt} project={project} stages={stages} gate={gate} can={can} programs={progs.programs} holder={holder}
            otherName={projects.find(p => p.id === stages.otherId)?.name} />
        : (
          <p className="sub tw-note">
            {/* A client is never told to add what they cannot. */}
            {!can.edit
              ? (tt.assets.length === 0 || gate !== 'install' ? 'No machines here yet.' : 'Every machine here is already installed.')
              : tt.assets.length === 0 || gate !== 'install'
                ? face.empty
                : 'Every machine here is already installed. Add the next one to install it step by step.'}
          </p>
        )}

      {gate === 'install' && can.edit && (
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
        /* Folded until something is filmed (docs/STAGEGATE.md): open and
           empty, it took half the page under the board to say "No walk
           filmed yet". Its line says the same, and one tap opens it. */
        <Fold id="filmed" title="The line, filmed" says={filmedSays(filmed, can.edit)} start={!!filmed && filmed.frames > 0}>
          <PaceSnags projectId={projectId} projectName={project.name} can={can} />
        </Fold>
      )}

      {/* THE PROGRAMS have a page of their own now (screens/ProgramsPage) — the
          Programs list that sat here moved there, with every program's
          status. One line here says where they stand and opens it. */}
      {gate === 'setup' && <ProgramsLine projectId={projectId} tt={tt} />}

      {/* HOW THE LINE IS RUN, PRODUCT BY PRODUCT — handed over with the line.
          The line standard is a tool; Hand over is where a stage-gate job
          uses it. */}
      {gate === 'handover' && <StandardsCard projectId={projectId} can={can} />}
    </div>
  );
}

/** Set up's line about the programs — where they stand, and the door to
 *  their page. */
function ProgramsLine({ projectId, tt }: { projectId: string; tt: ReturnType<typeof useTesting> }) {
  const progs = usePrograms(projectId);
  if (progs.loading) return null;
  const r = programsReading({ tests: tt.tests, items: tt.items, assets: tt.assets, programs: progs.programs, today: todayISO() });
  return (
    /* THE ROW IS THE DOOR (docs/DOORS.md rule 1): where the programs stand,
       and a tap opens their page. It was a heading pressed against the
       board's edge and a big blue "Open Programs" — the press colour on a
       link (docs/STAGEGATE.md). */
    <section className="cmp-sec pp-door" aria-label="Programs">
      <button type="button" className="pp-door-row" onClick={() => nav(`/project/${projectId}/programs`)}>
        <b>Programs</b>
        <span className="sub">{r ? r.says : 'No programs yet — write each one the machines have to run.'}</span>
        <Icon name="chevron" size="1.1em" />
      </button>
    </section>
  );
}
