/* A practical programme for an underperforming production line. One project can
 * cover several shared lines; each door opens the existing tool or record. */
import { useEffect, useMemo, useRef } from 'react';
import { useProject } from '../../lib/useProjects';
import { usePaceLines } from '../../lib/usePaceLines';
import { useFactoryLines } from '../../lib/useFactoryLines';
import { useAccess } from '../../cloud/access';
import { patchProject } from '../../db';
import { methodByKey } from '../../lib/methods';
import { nav, useRoute, withQuery } from '../../state/useRoute';
import { PageHeader } from '../../ui/parts';
import { methodPhaseOf } from '../../lib/methodPlacement';
import { dashboardOf, useProjectEvidence } from '../method/useDashboard';
import { recoverySteps } from './plan';
import { RecoveryStatement } from './RecoveryStatement';
import { PHASES } from '../method/shapes/dmaicModel';
import { otherLinesAtSite } from './siteLines';
import './recovery.css';

type RecoveryRecord = { id: string; title: string; href: string; phase?: string; tool: string; at: number; hasLine: boolean };
const stamp = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function SavedWork({ records, label, open }: { records: RecoveryRecord[]; label?: string; open?: boolean }) {
  if (!records.length) return null;
  return <details className="recovery-more recovery-saved-work" open={open}><summary>{label ?? 'Saved work'} ({records.length})</summary>
    <ul>{records.map(record => <li key={record.href}><a href={'#' + record.href}>
      <strong>{record.title}</strong><span className="sub">{[record.tool, 'Updated ' + stamp.format(record.at), !record.hasLine && 'Project-wide'].filter(Boolean).join(' · ')}</span>
    </a></li>)}</ul>
  </details>;
}

export function RecoveryProgramScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const { lines, loading: linesLoading } = usePaceLines(projectId);
  const factory = useFactoryLines();
  const can = useAccess(projectId);
  const { query } = useRoute();
  const picked = query.get('line');
  const phaseName = query.get('phase');
  const target = useRef<HTMLElement>(null);
  const factoryLines = lines.filter(l => !!l.workspaceId);
  const selected = factoryLines.find(l => l.workspaceId === picked) ?? factoryLines[0];
  const lineId = selected?.workspaceId;
  const current = factory.find(w => w.id === lineId);
  const nextAtSite = otherLinesAtSite(factory, current, factoryLines.map(l => l.workspaceId as string))[0];
  const evidence = useProjectEvidence(projectId);
  const records = useMemo((): RecoveryRecord[] => {
    const method = methodByKey('dmaic');
    if (!evidence || !method || project?.method !== 'dmaic') return [];
    const inLine = (record: { workspaceId?: string }) => !lineId || !record.workspaceId || record.workspaceId === lineId;
    const studies = evidence.studies.filter(inLine);
    const standards = evidence.standards.filter(inLine);
    const dash = dashboardOf(method, {}, studies, evidence.owed, { standards });
    const originals = new Map([...studies, ...standards].map(record => [record.id, record]));
    return [
      ...dash.findings.map(record => ({ ...record, kind: 'study' as const })),
      ...dash.standards.map(record => ({ ...record, kind: 'standard' as const })),
    ].flatMap(record => {
      const source = originals.get(record.id);
      if (!source) return [];
      return [{ id: record.id, title: record.title, href: record.href, tool: record.tool, at: source.updatedAt,
        hasLine: !!source.workspaceId, phase: methodPhaseOf(evidence.owed, 'dmaic', record.kind, record.id) }];
    }).sort((a, b) => b.at - a.at);
  }, [evidence, lineId, project?.method]);
  const ready = !!evidence && !loading && !linesLoading;
  useEffect(() => {
    if (ready && phaseName) target.current?.scrollIntoView({ block: 'start' });
  }, [ready, phaseName, lineId, projectId]);
  if (loading || linesLoading) return <div className="wrap" aria-busy="true"><p role="status">Opening line recovery…</p></div>;
  if (!project) return <div className="wrap"><p>This project is not on this device.</p><button className="btn" onClick={() => nav('/projects')}>Projects</button></div>;
  if (project.programKey !== 'line-recovery') return <div className="wrap"><p>Open this project to continue its work.</p><button className="btn" onClick={() => nav(`/project/${projectId}`)}>Open project</button></div>;
  const steps = recoverySteps(projectId, lineId, project.method);
  return <div className="wrap recovery-program">
    <PageHeader eyebrow={`LINE RECOVERY · ${project.name.toUpperCase()}`} title="DMAIC"
      {...(selected ? { primary: { label: 'Customer report', run: () => nav(`/pace-report?project=${encodeURIComponent(projectId)}`) } } : {})} />
    <div className="recovery-context">
      {factoryLines.length === 1 ? <strong>{selected?.name}</strong> : factoryLines.length > 1 ? <label><span className="field-label">Work on a line</span>
        <select className="text-input" value={lineId ?? ''} onChange={e => {
          const next = e.target.value;
          withQuery('line', next, true);
        }} aria-label="Line in this recovery program">
          {factoryLines.map(l => <option key={l.id} value={l.workspaceId}>{l.name}</option>)}
        </select>
      </label> : <p>No factory line is linked to this project yet. Add one to open its capacity, losses and problems from this program.</p>}
      <span className="sub"><a href={`#/project/${projectId}/setup`}>Change lines</a> · <a href="#/room">Shared control room</a>{factoryLines.length > 1 && selected && <> · <a href={`#/pace-report?project=${encodeURIComponent(projectId)}&line=${encodeURIComponent(selected.id)}`}>Report for {selected.name}</a></>}</span>
      {nextAtSite && <button type="button" className="linkish recovery-next" onClick={() => nav(`/projects?new=1&program=line-recovery&line=${encodeURIComponent(nextAtSite.id)}&site=${encodeURIComponent(nextAtSite.siteName ?? '')}&client=${encodeURIComponent(nextAtSite.clientName ?? '')}`)}>Start another line recovery at {current?.siteName} ›</button>}
    </div>
    {project.method && project.method !== 'dmaic' && <p className="sub">This recovery began with {methodByKey(project.method)?.name ?? project.method}. <a href={`#/project/${projectId}/method`}>Open that method and its saved work</a></p>}
    {!project.method && can.agree && <button type="button" className="btn btn-sm" onClick={() => void patchProject(projectId, { method: 'dmaic' })}>Use DMAIC for this recovery</button>}
    <div className="recovery-phases">
    {PHASES.map(phase => <section key={phase.name} ref={phase.name === phaseName ? target : undefined} className="recovery-phase" aria-label={`${phase.name} phase`}>
      <div className="recovery-phase-head"><h2>{phase.name}</h2></div>
      <ul className="recovery-steps">
        {phase.key === 'define' && <li data-recovery-step="1">
          <RecoveryStatement key={projectId} projectId={projectId} canEdit={can.edit} />
        </li>}
        {steps.map((step, i) => step.phase === phase.name && <li key={step.title} data-recovery-step={i + 2}>
        <div className="recovery-step-content">
          <h3>{step.title}</h3>
          <p className="sub">{step.gives}</p>
          {step.needsLine && !lineId
            ? <button type="button" className="btn btn-sm" onClick={() => nav(`/project/${projectId}/setup`)}>Add a line first</button>
            : <button type="button" className="btn btn-sm" onClick={() => nav(step.to)}>{step.action}{step.needsLine && selected ? ` · ${selected.name}` : ''}</button>}
          {!!step.also?.length && !!lineId && <details className="recovery-more"><summary>Other useful places</summary>
            {step.also.map(link => <a key={link.to} href={`#${link.to}`}>{link.label}</a>)}
          </details>}
        </div>
      </li>)}</ul>
      <SavedWork records={records.filter(record => record.phase === phase.name)} open={phase.name === phaseName || undefined} />
    </section>)}
    </div>
    <SavedWork label="Other project evidence" records={records.filter(record => !PHASES.some(phase => phase.name === record.phase))} />
    {project.method === 'dmaic' && <p className="sub recovery-foot"><a href={`#/project/${projectId}/method${lineId ? '?line=' + encodeURIComponent(lineId) : ''}`}>Phase reviews and more DMAIC tools ›</a></p>}
  </div>;
}
