/* A MACHINE IN ITS PROJECT — the project's part of the one machine page (27 October).
 *
 * Rowland, 27 October: "If I go to machine, I want to be able to see everything associated to my machine. For
 * example, it will say that this machine is going through a stage gate process and it's up to these things. It has
 * these tests on them, these programs on them, and this is where we are." Then, the same evening, walking Factory ›
 * Machines › Pick and place › "Everything on Line 2a" into a second page of the same machine: one machine has one
 * page, the line's (line/LineMachineScreen), and while a stage-gate project is working on it this is the top of it —
 * its status in plain words, the project it is going through and where it is up to, its four gates one strip, the
 * tiles, what is open on it (most pressing first), its tests, its programs (the same rows and form as Programs), the
 * machine itself, and the closing line. Each row opens its record in the drawer over the page, as it did on the
 * project's own page of it (screens/MachineScreen, which now opens the line's page).
 *
 * No new record: the machine (lib/testing Asset), read by lib/machineRecord — the same reading the drawer and the
 * gates make. */
import { PageHeader } from '../../ui/parts';
import { useTesting } from '../../lib/useTesting';
import { usePrograms } from '../../lib/usePrograms';
import { useProject } from '../../lib/useProjects';
import { useAccess } from '../../cloud/access';
import { live, assetStateOf, ASSET_STATE_WORD, type Asset } from '../../lib/testing';
import { machineRecord, machineTests, openOnMachine, type MachineGate } from '../../lib/machineRecord';
import { todayISO } from '../../lib/weeks';
import { withoutCommissioningNarrativePapers } from '../../lib/productStory';
import { nav } from '../../state/useRoute';
import { openRecord } from '../../ui/RecordDrawer';
import { AccessNote } from '../../ui/AccessNote';
import { MachineItself } from '../../ui/MachinePanel';
import { ProgramsPage } from '../../screens/ProgramsPage';
import { useJobMoney } from '../../lib/useJobMoney';
import { MONEY_WAIT, machineClosing, machineCounts, machineTiles } from '../../lib/stageGatePages';
import { LeanClosing, LeanTiles } from '../../ui/Lean';

/* The house's five colours, one meaning each (CLAUDE.md). */
const GATE_SQ: Record<MachineGate['tone'], 'r' | 'a' | 'w' | 'g' | 'n'> = { done: 'g', going: 'w', late: 'r', problem: 'a', failed: 'r', ahead: 'n', none: 'n' };

/** Its status in plain words — handed over, else where the machine itself is. */
export const machineStatus = (asset: Asset, at: string): string => (at.startsWith('Handed over') ? 'Handed over' : ASSET_STATE_WORD[assetStateOf(asset)]);
export const statusTone = (status: string): 'g' | 'n' | 'w' => (status === 'Handed over' ? 'g' : status === 'Not here yet' ? 'n' : 'w');

/** The project's part of a machine's page — everything the project is doing to it. `onRemoved` is where the page
 *  goes when the machine is taken off the project (MachineItself's remove).
 *  On a line's machine page (`tail="afterLine"`), the project body comes first; itself and the closing line sit
 *  after the line's own sections (STAGEGATE-AESTHETIC C3 / U4). */
export function MachineInProject({ projectId, assetId, onRemoved, tail = 'inline' }: {
  projectId: string; assetId: string; onRemoved: () => void;
  tail?: 'inline' | 'afterLine' | 'only';
}) {
  const tt = useTesting(projectId);
  const progs = usePrograms(projectId);
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  /* the project's money — what the slip costs, or what a day late would (lib/useJobMoney) */
  const money = useJobMoney(projectId);

  if (tt.loading || progs.loading || !project) return <p className="sub">Reading where it is up to in its project…</p>;
  const asset = live(tt.assets).find(a => a.id === assetId);
  if (!asset) return null;
  const m = machineRecord(asset, { tests: tt.tests, items: tt.items, programs: progs.programs, today: todayISO() });
  const status = machineStatus(asset, m.at);
  const open = openOnMachine(m);
  const tests = machineTests(m);
  const moneyReady = money ?? MONEY_WAIT;
  const itself = <MachineItself asset={asset} projectId={projectId} tt={tt} can={can} onClose={onRemoved} />;
  const closing = <LeanClosing closing={machineClosing(machineCounts(m), moneyReady)} />;
  if (tail === 'only') return <div className="mpg mpg-project-tail">{itself}{closing}</div>;
  const row = (l: { id: string; title: string; word: string; tone: string; who?: string }, where?: string) => (
    <li key={l.id} className={'lt-li mpg-l is-' + l.tone}>
      <button type="button" className="lt-row" onClick={() => openRecord(projectId, l.id)}>
        <b className="lt-what">{l.title}</b>
        <span className="lt-says">{[where, l.who].filter(Boolean).join(' · ')}</span>
        <span className={'lt-where' + (l.tone === 'late' || l.tone === 'failed' ? ' act-late' : '')}>{l.word}</span>
      </button>
    </li>
  );

  return (
    <div className="mpg mpg-in-project">
      <p className="cw-handover">
        <b className={'mpg-at is-' + statusTone(status)}>{status}</b>
        {m.oem && <span className="sub">{m.oem}</span>}
        <span className={'sub' + (m.arrivalLate ? ' in-late' : '')}>{m.arrival}</span>
      </p>
      <AccessNote can={can} owner={project.lead} />

      {/* WHERE IT IS UP TO IN ITS PROJECT: one sentence, then its four gates in a row, each in its colour and its words.
          The gates are the project's; the stages under them are worked on the project's own gate pages. */}
      <section className="pl-sec mpg-project" aria-label="Its project">
        <p className="mpg-in">Going through <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}`)}>{project.name}</button> — an installation project — {m.at.startsWith('Handed over') ? <b>{m.at.toLowerCase()}</b> : m.at.startsWith('at ') ? <>up to <b>{m.at.slice(3)}</b></> : <b>{m.at}</b>}.</p>
        <ol className="mpg-steps" aria-label={`${m.name}: its gates`}>
          {m.gates.map(g => (
            <li key={g.gate} className={'mpg-step is-' + GATE_SQ[g.tone]}>
              <b>{g.label}</b>
              <span>{g.says}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* THE LEAN PAGE (lib/stageGatePages): its gates through, what is late, its fixes, the problems on it with no fix,
          and the project's money */}
      <LeanTiles tiles={machineTiles(machineCounts(m), moneyReady)} className="sg-tiles" />

      <div className="mpg-cols">
        <div className="mpg-main">
          {/* WHAT IS OPEN ON IT — the most pressing first, each opening its record (lib/machineRecord openOnMachine) */}
          <section className="pl-sec mpg-open" aria-label="What is open on it">
            <div className="pl-sec-h"><h2>What is open on it</h2><span className="sub">{open.length ? `${open.length}` : 'nothing'}</span></div>
            {open.length ? <ul className="lt-rows">{open.map(l => row(l, l.where))}</ul> : <p className="sub">Nothing open on it — no stage, fix or problem waiting.</p>}
          </section>
          {/* ITS TESTS — every one as it stands, each opening its record to run or record it */}
          <section className="pl-sec mpg-tests" aria-label="Its tests">
            <div className="pl-sec-h"><h2>Its tests</h2><span className="sub">{tests.length ? `${tests.filter(t => t.tone === 'done').length} of ${tests.length} passed` : 'none yet'}</span></div>
            {tests.length ? <ul className="lt-rows">{tests.map(l => row(l))}</ul> : <p className="sub">No tests on it yet — they are planned on the project’s Commission.</p>}
          </section>
        </div>
        {/* ITS PROGRAMS — the same rows and form as Programs */}
        <section className="mpg-side" aria-label="Its programs">
          <ProgramsPage projectId={projectId} only={asset.id} />
        </section>
      </div>
      {tail === 'inline' && <>
        {itself}
        {closing}
      </>}
    </div>
  );
}

/** A machine with no line — a project's machine on a project with no line yet: the project's part, on its own page,
 *  as it was before the one machine page (it has no line page to open). */
export function MachineOffLine({ projectId, assetId, name }: { projectId: string; assetId: string; name: string }) {
  const { project } = useProject(projectId);
  const print = async () => {
    const { machinePaper } = await import('../../lib/machineDossier');
    const paper = await machinePaper({ projectId, assetId });
    if (!paper) return;
    const { saveMachinesPaper } = await import('../../lib/machinePaperPdf');
    await saveMachinesPaper(paper, [project?.name ?? 'project', `${name} machine report`]);
  };
  return (
    <div className="wrap pace mpg">
      <PageHeader eyebrow={<span className="pl-eyebrow">MACHINE · {project?.name ?? ''}</span>} title={name}
        papers={withoutCommissioningNarrativePapers([
          { label: 'Machine report', for: 'this machine in full — where it is up to, what is open and who has it, every test and every attempt, every program and its tests, every step, its problems and what was done', make: print },
          { label: 'Commissioning report', for: 'every machine in the project, a card each', make: () => nav(`/project/${projectId}/report?doc=commissioning`) },
        ])} />
      <MachineInProject projectId={projectId} assetId={assetId} onRemoved={() => nav(`/project/${projectId}/machines`)} />
    </div>
  );
}
