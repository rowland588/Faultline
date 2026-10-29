/* A STAGE-GATE PROJECT'S MACHINES, SIMPLY — its Machines tab (#/project/:id/machines).
 *
 * Rowland, 27 October: "Projects, I go in, I go to machines ... I see machines, install, setup, commissioning,
 * handover, timeline, programs. I don't understand why I don't see machines, simply enough." So Machines opens on
 * the machines: a row each — its name and who made it, its status (Not here yet · On site · Installed · Running ·
 * Handed over), where it is up to in the project, its programs, what it owes and what is next — read by
 * project/machines (Now's reading), each opening its own page. The project's gates, timeline and Programs are the
 * project's own views, from its front page. A machine is added here as at Install (the same Add a machine, the
 * line's own machines offered first).
 *
 * Its paper (the same day: "projects, machines shows the page I have been wanting .. but still no report
 * abilities"): Report ▾ — the Machines report (these rows, then a page a machine as its own page says it) and the
 * commissioning report. Nothing here decides a word. */
import { useMemo, useState } from 'react';
import { useProject } from '../../lib/useProjects';
import { useProjectRead } from '../projectRead';
import { niceDay } from '../../lib/weeks';
import { useTesting } from '../../lib/useTesting';
import { useMachinesToTakeOn } from '../../lib/useLineRecords';
import { useAccess } from '../../cloud/access';
import { PageHeader } from '../../ui/parts';
import { AddAsset } from '../../screens/TestsScreen';
import { withoutCommissioningNarrativePapers } from '../../lib/productStory';
import { nav } from '../../state/useRoute';
import { projectMachineRows, projectMachinesPaper, projectMachinesSays, rowSays } from './machines';

export function ProjectMachinesScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const read = useProjectRead(project);
  const tt = useTesting(projectId);
  const takeOn = useMachinesToTakeOn(projectId);
  const can = useAccess(projectId);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const machines = useMemo(() => (read?.gate ? projectMachineRows(read.gate, read.owed, read.today) : null), [read]);

  if (loading || (project && !read)) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project || !machines || !read?.gate) return <div className="wrap pace"><p className="sub">That project is not on this device.</p></div>;
  const gate = read.gate;

  /* THE MACHINES REPORT — these rows, then a page a machine (lib/machinePaperPdf) */
  const print = async () => {
    if (busy) return;
    setBusy(true); setSaid(null);
    try {
      /* the rows as this page says them, then every machine in full (27 October — "all you've done is headlines") */
      const { projectMachinesFullPaper } = await import('../../lib/machineDossier');
      const { saveMachinesPaper } = await import('../../lib/machinePaperPdf');
      const paper = await projectMachinesFullPaper(projectId, projectMachinesPaper(gate, read.owed, read.today));
      const how = await saveMachinesPaper(paper, [project.name, 'machines report']);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('machines report failed', e);
      setSaid('The paper could not be made — try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace pms">
      <PageHeader eyebrow={<span className="pl-eyebrow">MACHINES · {project.name}</span>} title="Machines"
        says={projectMachinesSays(machines)}
        papers={withoutCommissioningNarrativePapers([
          { label: 'Machines report', for: machines.length ? 'every machine as this page says it, then each in full — what is open and who has it, every test and every attempt, every program and its tests, every step, its problems and what was done' : 'no machines yet', disabled: !machines.length || busy, make: print },
          { label: 'Commissioning report', for: 'where each machine has got to, and a card a machine', make: () => nav(`/project/${projectId}/report?doc=commissioning`) },
          { label: 'Programs report', for: 'every program, machine by machine — where each stands and what was seen', make: () => nav(`/project/${projectId}/report?doc=programs`) },
        ])} />
      {said && <p className="tc-ok" role="status">{said}</p>}
      {machines.length > 0
        ? (
          <ul className="lt-rows">
            {machines.map(m => (
              <li key={m.id} className={'lt-li now-m' + (m.critical || m.late ? ' is-late' : '')} data-now-machine={m.name}>
                <button type="button" className="lt-row" onClick={() => nav(`/project/${projectId}/machine/${encodeURIComponent(m.id)}`)}>
                  <b className="lt-what">{m.name}{m.oem && <span className="sub now-oem"> · {m.oem}</span>} <span className={'pms-status is-' + m.statusTone}>{m.status}</span></b>
                  <span className="lt-says">{rowSays(m, project.name)}</span>
                  <span className="lt-where">{m.next ? <>{m.next.late ? 'Late' : 'Next'}: {m.next.what} · <span className={m.next.late ? 'act-late' : ''}>{niceDay(m.next.on)}</span></> : 'nothing dated'}</span>
                </button>
              </li>
            ))}
          </ul>
        )
        : <p className="qsl-empty">{can.edit ? 'Add the first machine below — or take one of the line’s own on.' : 'No machines here yet.'}</p>}
      {can.edit && (
        <div className="cx-assets pms-add">
          <AddAsset add={tt.addAsset} onLine={takeOn} />
        </div>
      )}
    </div>
  );
}
