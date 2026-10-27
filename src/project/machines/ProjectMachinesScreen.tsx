/* A STAGE-GATE PROJECT'S MACHINES, SIMPLY — its Machines tab (#/project/:id/machines).
 *
 * Rowland, 27 October: "Projects, I go in, I go to machines ... I see machines, install, setup, commissioning,
 * handover, timeline, programs. I don't understand why I don't see machines, simply enough." So Machines opens on
 * the machines: a row each — its name and who made it, its status (Not here yet · On site · Installed · Running ·
 * Handed over), where it is up to in the project, its programs, what it owes and what is next — read as Now reads
 * them (project/now machinesOf), each opening its own page. The project's gates, timeline and Programs are the
 * project's own views, from its front page (27 October: "If I go to projects ... my project status ... If I go to
 * machine ... everything associated to my machine"). A machine is added here as at Install (the same Add a machine,
 * the line's own machines offered first). Nothing here decides a word. */
import { useMemo } from 'react';
import { useProject } from '../../lib/useProjects';
import { useProjectRead } from '../projectRead';
import { programsReading } from '../../lib/programsReport';
import { live, assetStateOf, ASSET_STATE_WORD } from '../../lib/testing';
import { niceDay } from '../../lib/weeks';
import { useTesting } from '../../lib/useTesting';
import { useMachinesToTakeOn } from '../../lib/useLineRecords';
import { useAccess } from '../../cloud/access';
import { PageHeader } from '../../ui/parts';
import { AddAsset } from '../../screens/TestsScreen';
import { nav } from '../../state/useRoute';
import { machinesOf } from '../now/NowScreen';

export function ProjectMachinesScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const read = useProjectRead(project);
  const tt = useTesting(projectId);
  const takeOn = useMachinesToTakeOn(projectId);
  const can = useAccess(projectId);

  const machines = useMemo(() => {
    if (!read?.gate) return null;
    const g = read.gate;
    const tests = live(g.tests), items = live(g.items);
    const reading = programsReading({ tests, items, assets: live(g.assets), programs: g.programs, today: read.today, holder: g.project, studies: read.studies });
    const assets = live(g.assets);
    /* its status in plain words — handed over, else where the machine itself is (lib/testing assetStateOf) */
    return machinesOf(assets, tests, items, g.programs, reading, read.owed, read.today).map(m => {
      const a = assets.find(x => x.id === m.id);
      return { ...m, status: m.gate === 'Handed over' ? 'Handed over' : a ? ASSET_STATE_WORD[assetStateOf(a)] : '' };
    });
  }, [read]);

  if (loading || (project && !read)) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project || !machines) return <div className="wrap pace"><p className="sub">That project is not on this device.</p></div>;

  const handed = machines.filter(m => m.gate === 'Handed over').length;
  const late = machines.filter(m => m.late || m.critical).length;
  const says = machines.length
    ? [`${machines.length} machine${machines.length === 1 ? '' : 's'}`, handed ? `${handed} handed over` : '', late ? `${late} with something late or critical` : 'nothing late'].filter(Boolean).join(' · ')
    : 'No machines on the project yet.';

  return (
    <div className="wrap pace pms">
      <PageHeader eyebrow={<span className="pl-eyebrow">MACHINES · {project.name}</span>} title="Machines"
        says={says}
        papers={[{ label: 'Commissioning report', for: 'where each machine has got to, and a card a machine', make: () => nav(`/project/${projectId}/report?doc=commissioning`) }]} />
      {machines.length > 0
        ? (
          <ul className="lt-rows">
            {machines.map(m => (
              <li key={m.id} className={'lt-li now-m' + (m.critical || m.late ? ' is-late' : '')} data-now-machine={m.name}>
                <button type="button" className="lt-row" onClick={() => nav(`/project/${projectId}/machine/${encodeURIComponent(m.id)}`)}>
                  <b className="lt-what">{m.name}{m.oem && <span className="sub now-oem"> · {m.oem}</span>} <span className={'pms-status is-' + (m.status === 'Handed over' ? 'g' : m.status === 'Not here yet' ? 'n' : 'w')}>{m.status}</span></b>
                  <span className="lt-says">
                    {[m.status === 'Handed over' ? '' : `In ${project.name}: ${m.gate === 'Due on site' ? 'due on site' : `at ${m.gate}`}`,
                      m.programs ? `Programs: ${m.programs}` : '',
                      m.open ? `${m.open} open${m.late ? `, ${m.late} late` : ''}${m.critical ? `, ${m.critical} critical` : ''}` : 'nothing owed'].filter(Boolean).join(' · ')}
                  </span>
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
