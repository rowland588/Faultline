/* A MACHINE, A PAGE OF ITS OWN (docs/STAGEGATE-UX.md slice 3).
 *
 * Rowland, 16 October: "when i show peole the app, i get losst in it, find
 * dorrs that open othe rthings". One machine's story was spread over five
 * pages — its four gates and Programs — and its name opened a drawer over
 * whichever page it was named on. Here it is in one place, the page to show
 * someone "where is the wrapper": where it is and its four gates in order,
 * the stages and tests that need something, its programs (the same rows and
 * form as Programs), its problems, its label and its details.
 *
 * No new record: the machine (lib/testing Asset), read by lib/machineRecord —
 * the same reading the drawer and the gates make. In the rail under Machines;
 * every machine name opens it (ui/MachinePanel openMachine). */
import { PageHeader } from '../ui/parts';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { useProject } from '../lib/useProjects';
import { useAccess } from '../cloud/access';
import { live } from '../lib/testing';
import { machineRecord, type MachineGate } from '../lib/machineRecord';
import { todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { openRecord } from '../ui/RecordDrawer';
import { MachinePanel } from '../ui/MachinePanel';
import { AccessNote } from '../ui/AccessNote';
import { ProgramsPage } from './ProgramsPage';
import { useJobMoney } from '../lib/useJobMoney';
import { MONEY_WAIT, machineClosing, machineCounts, machineTiles } from '../lib/stageGatePages';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { useLineRecords } from '../lib/useLineRecords';
import { lineOfMachine } from '../lib/lineRecords';

/* The house's five colours, one meaning each (CLAUDE.md). */
const GATE_SQ: Record<MachineGate['tone'], 'r' | 'a' | 'w' | 'g' | 'n'> = { done: 'g', going: 'w', late: 'r', problem: 'a', failed: 'r', ahead: 'n', none: 'n' };

export function MachineScreen({ projectId, assetId }: { projectId: string; assetId: string }) {
  const tt = useTesting(projectId);
  const progs = usePrograms(projectId);
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  /* the job's money — what the slip costs, or what a day late would (lib/useJobMoney) */
  const money = useJobMoney(projectId);
  /* ITS LINE — the machine's page there reads everything ever done to it, every project's (one record of a
     machine, docs/STAGEGATE-RESEARCH.md §5 slice 4): one tap from here, where a project looks for it */
  const rec = useLineRecords();

  if (tt.loading || progs.loading || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  const asset = live(tt.assets).find(a => a.id === assetId);
  if (!asset) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That machine is not on this project any more.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    );
  }
  const m = machineRecord(asset, { tests: tt.tests, items: tt.items, programs: progs.programs, today: todayISO() });
  const tone = m.at.startsWith('Handed over') ? 'g' : m.arrivalLate || m.gates.some(g => g.tone === 'late' || g.tone === 'failed') ? 'r' : 'w';

  return (
    <div className="wrap pace mpg">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3): the machine, where it is at, its maker and when it lands */}
      <PageHeader eyebrow={<span className="pl-eyebrow">MACHINE · {project.name}</span>} title={m.name}>
        <p className="cw-handover">
          <b className={'mpg-at is-' + tone}>{m.at}</b>
          {m.oem && <span className="sub">{m.oem}</span>}
          <span className={'sub' + (m.arrivalLate ? ' in-late' : '')}>On site: {m.arrival}</span>
        </p>
        {(() => {
          const wsId = lineOfMachine(asset, rec.jobLines);
          const line = wsId ? rec.all.find(w => w.id === wsId) : undefined;
          return line ? (
            <p className="mpg-line">
              <button type="button" className="cw-link" onClick={() => nav(`/lines/${encodeURIComponent(line.id)}/machine/${encodeURIComponent(asset.name.trim())}`)}>
                Everything on {line.name} — every project’s work on it ›
              </button>
            </p>
          ) : null;
        })()}
      </PageHeader>
      <AccessNote can={can} owner={project.lead} />
      {/* THE LEAN PAGE (lib/stageGatePages): its gates through, what is late,
          its fixes, the problems on it with no fix, and the job's money */}
      <LeanTiles tiles={machineTiles(machineCounts(m), money ?? MONEY_WAIT)} className="sg-tiles" />

      {/* ITS FOUR GATES, IN ORDER — where it is at a glance, each in its colour
          and its words; the stages and tests are under them below. */}
      <ol className="mpg-steps" aria-label={`${m.name}: its gates`}>
        {m.gates.map(g => (
          <li key={g.gate} className={'mpg-step is-' + GATE_SQ[g.tone]}>
            <b>{g.label}</b>
            <span>{g.says}</span>
          </li>
        ))}
      </ol>

      <div className="mpg-cols">
        <section className="mpg-main" aria-label="Its gates, stages and tests">
          <MachinePanel asset={asset} projectId={projectId} tt={tt} programs={progs.programs} can={can} page
            onOpen={id => openRecord(projectId, id)} onClose={() => nav(`/project/${projectId}`)} />
        </section>
        <section className="mpg-side" aria-label="Its programs">
          <ProgramsPage projectId={projectId} only={asset.id} />
        </section>
      </div>
      {/* THE CLOSING LINE — the machine in one sentence, the slip in money */}
      <LeanClosing closing={machineClosing(machineCounts(m), money ?? MONEY_WAIT)} />
    </div>
  );
}
