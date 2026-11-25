/* A practical programme for an underperforming production line. One project can
 * cover several shared lines; each door opens the existing tool or record. */
import { useState } from 'react';
import { useProject } from '../../lib/useProjects';
import { usePaceLines } from '../../lib/usePaceLines';
import { useFactoryLines } from '../../lib/useFactoryLines';
import { useAccess } from '../../cloud/access';
import { updateProject } from '../../db';
import { methodByKey } from '../../lib/methods';
import { nav } from '../../state/useRoute';
import { PageHeader } from '../../ui/parts';
import { recoverySteps } from './plan';
import { otherLinesAtSite } from './siteLines';
import './recovery.css';

const PHASES = [
  { name: 'Define', says: 'Name the performance gap and record what is going wrong.' },
  { name: 'Measure', says: 'Establish the real capacity and count the losses.' },
  { name: 'Analyse', says: 'Test the causes against evidence.' },
  { name: 'Improve', says: 'Try changes with an owner and a date.' },
  { name: 'Control', says: 'Check the same measure again and hold the gain.' },
] as const;

export function RecoveryProgramScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const { lines, loading: linesLoading } = usePaceLines(projectId);
  const factory = useFactoryLines();
  const can = useAccess(projectId);
  const [picked, setPicked] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('line') ?? '');
  const factoryLines = lines.filter(l => !!l.workspaceId);
  const selected = factoryLines.find(l => l.workspaceId === picked) ?? factoryLines[0];
  const lineId = selected?.workspaceId;
  const current = factory.find(w => w.id === lineId);
  const nextAtSite = otherLinesAtSite(factory, current, factoryLines.map(l => l.workspaceId as string))[0];
  if (loading || linesLoading) return <div className="wrap" aria-busy="true"><p role="status">Opening the line recovery program…</p></div>;
  if (!project) return <div className="wrap"><p>This project is not on this device.</p><button className="btn" onClick={() => nav('/projects')}>Projects</button></div>;
  if (project.programKey !== 'line-recovery') return <div className="wrap"><p>This project has no line recovery program.</p><button className="btn" onClick={() => nav(`/project/${projectId}`)}>Open project</button></div>;
  const steps = recoverySteps(projectId, lineId, !!project.method);
  return <div className="wrap recovery-program">
    <PageHeader eyebrow={`LINE RECOVERY · ${project.name.toUpperCase()}`} title="DMAIC"
      says="Define the gap. Measure the line. Prove the cause. Improve it. Check that the result holds."
      {...(selected ? { primary: { label: 'Customer report', run: () => nav(`/pace-report?project=${encodeURIComponent(projectId)}`) } } : {})} />
    <div className="recovery-context">
      {factoryLines.length ? <label><span className="field-label">Work on a line</span>
        <select className="text-input" value={lineId ?? ''} onChange={e => {
          const next = e.target.value;
          setPicked(next);
          window.history.replaceState(window.history.state, '', `#/project/${projectId}/recovery?line=${encodeURIComponent(next)}`);
        }} aria-label="Line in this recovery program">
          {factoryLines.map(l => <option key={l.id} value={l.workspaceId}>{l.name}</option>)}
        </select>
      </label> : <p>No factory line is linked to this project yet. Add one to open its capacity, losses and problems from this program.</p>}
      <span className="sub">{lines.length} {lines.length === 1 ? 'line' : 'lines'} in this project · <a href={`#/project/${projectId}/setup`}>Change lines</a> · <a href="#/room">Shared control room</a>{factoryLines.length > 1 && selected && <> · <a href={`#/pace-report?project=${encodeURIComponent(projectId)}&line=${encodeURIComponent(selected.id)}`}>Report for {selected.name}</a></>}</span>
      {nextAtSite && <button type="button" className="linkish recovery-next" onClick={() => nav(`/projects?new=1&program=line-recovery&line=${encodeURIComponent(nextAtSite.id)}&site=${encodeURIComponent(nextAtSite.siteName ?? '')}&client=${encodeURIComponent(nextAtSite.clientName ?? '')}`)}>Start another line recovery at {current?.siteName} ›</button>}
    </div>
    {project.method && project.method !== 'dmaic' && <p className="sub">This older recovery uses {methodByKey(project.method)?.name ?? project.method}; its saved work remains available.</p>}
    {!project.method && can.agree && <button type="button" className="btn btn-sm" onClick={() => void updateProject({ ...project, method: 'dmaic' })}>Use DMAIC for this recovery</button>}
    <div className="recovery-phases">
    {PHASES.map((phase, phaseIndex) => <section key={phase.name} className="recovery-phase" aria-label={`${phase.name} phase`}>
      <div className="recovery-phase-head"><span className="recovery-phase-n">{phaseIndex + 1}</span><div><h2>{phase.name}</h2><p>{phase.says}</p></div></div>
      <ol className="recovery-steps">{steps.map((step, i) => step.phase === phase.name && <li key={step.title} data-recovery-step={i + 1}>
        <div className="recovery-step-number" aria-hidden>{i + 1}</div>
        <div className="recovery-step-content">
          <h3>{step.title}</h3>
          <p>{step.question}</p>
          <p className="sub">Result: {step.gives}</p>
          {step.needsLine && !lineId
            ? <button type="button" className="btn btn-sm" onClick={() => nav(`/project/${projectId}/setup`)}>Add a line first</button>
            : <button type="button" className="btn btn-sm" onClick={() => nav(step.to)}>{step.action}{step.needsLine && selected ? ` · ${selected.name}` : ''}</button>}
          {!!step.also?.length && !!lineId && <details className="recovery-more"><summary>Other useful places</summary>
            {step.also.map(link => <a key={link.to} href={`#${link.to}`}>{link.label}</a>)}
          </details>}
        </div>
      </li>)}</ol>
    </section>)}
    </div>
    {project.method && <p className="sub recovery-foot"><a href={`#/project/${projectId}/method`}>Phase reviews and more DMAIC tools ›</a> · The work counts only when its evidence and outcome are recorded.</p>}
  </div>;
}
