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
    <PageHeader eyebrow={`PROJECT · ${project.name.toUpperCase()}`} title="Line recovery"
      says="Find the limit, understand the losses, fix the causes and prove the result. Start where the evidence takes you."
      {...(selected ? { primary: { label: 'Line report', run: () => nav(`/pace-report?project=${encodeURIComponent(projectId)}&line=${encodeURIComponent(selected.id)}`) } } : {})} />
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
      <span className="sub">{lines.length} {lines.length === 1 ? 'line' : 'lines'} in this project · <a href={`#/project/${projectId}/setup`}>Change lines</a> · <a href="#/room">Shared control room</a>{project.method && <> · <a href={`#/project/${projectId}/method`}>Open {methodByKey(project.method)?.name ?? project.method}</a></>}</span>
      {nextAtSite && <button type="button" className="linkish recovery-next" onClick={() => nav(`/projects?new=1&program=line-recovery&line=${encodeURIComponent(nextAtSite.id)}&site=${encodeURIComponent(nextAtSite.siteName ?? '')}&client=${encodeURIComponent(nextAtSite.clientName ?? '')}`)}>Start another line recovery at {current?.siteName} ›</button>}
    </div>
    <div className="recovery-method">
      <p><strong>{project.method === 'dmaic' ? 'DMAIC project' : project.method ? `${methodByKey(project.method)?.name ?? project.method} project` : 'Set up the DMAIC project'}</strong> · {project.method && project.method !== 'dmaic' ? 'This older recovery keeps its chosen method; the line guide remains available below.' : 'The work below follows Define, Measure, Analyse, Improve and Control. The full project keeps the phase evidence and report.'}</p>
      {project.method ? <a href={`#/project/${projectId}/method`}>Open project phases ›</a> : can.agree && <button type="button" className="btn btn-sm" onClick={() => void updateProject({ ...project, method: 'dmaic' })}>Use DMAIC for this recovery</button>}
    </div>
    <ol className="recovery-steps">
      {steps.map((step, i) => <li key={step.title} data-recovery-step={i + 1}>
        <div className="recovery-step-number" aria-hidden>{i + 1}</div>
        <div className="recovery-step-content">
          <p className="field-label">{step.phase} · step {i + 1}</p>
          <h2>{step.title}</h2>
          <p>{step.question}</p>
          <p className="sub">You get: {step.gives}</p>
          {step.needsLine && !lineId
            ? <button type="button" className="btn btn-sm" onClick={() => nav(`/project/${projectId}/setup`)}>Add a line first</button>
            : <button type="button" className="btn btn-sm" onClick={() => nav(step.to)}>{step.action}{step.needsLine && selected ? ` · ${selected.name}` : ''}</button>}
          {!!step.also?.length && !!lineId && <details className="recovery-more"><summary>Other useful places</summary>
            {step.also.map(link => <a key={link.to} href={`#${link.to}`}>{link.label}</a>)}
          </details>}
        </div>
      </li>)}
    </ol>
    <p className="sub recovery-foot">The program points to the project's and line's actual records. A step is only done when its evidence and outcome are recorded there.</p>
  </div>;
}
