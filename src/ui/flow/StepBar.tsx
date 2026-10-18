/* THE STEP A TOOL'S PAGE IS ANSWERING, ON TOP OF IT (docs/BLUEPRINT.md §3,
 * the new product's workspace: "stages, tasks, specialist tools, evidence,
 * measurements, decisions and reports" in one place).
 *
 * A specialist tool — SMED, the line balance, Line capacity, a video study —
 * keeps its own page, proven and the same on its own. Opened from a
 * project's step (the address carries ?for=, ui/flow/Asking), it opens
 * inside the project: the frame wears the project's navigation (ui/Frame),
 * and this bar says which step of which stage it answers, that what it
 * finds comes into the step, and takes the person back to the step, open.
 * Nothing here writes. */
import { componentOf } from '../../lib/flow/components';
import type { StepRef } from '../../lib/flow/operations';
import { useFlowProject } from '../../lib/flow/useFlow';
import { nav } from '../../state/useRoute';
import { stepHref } from './Asking';

export function StepBar({ r }: { r: StepRef }) {
  const { fp } = useFlowProject(r.projectId);
  if (!fp) return null;
  const st = fp.method.definition.stages.find(x => x.key === r.stageKey);
  const step = st?.steps.find(x => x.key === r.stepKey);
  if (!st || !step) return null;
  const machine = r.assetId ? fp.machines.find(m => m.id === r.assetId)?.name : undefined;
  const tool = componentOf(step.component?.tool);
  /* the step as it stands — its latest record (a step keeps its history) */
  const rec = fp.records
    .filter(x => !x.deletedAt && x.kind === 'step' && x.stageKey === r.stageKey && x.stepKey === r.stepKey && (x.assetId ?? '') === (r.assetId ?? ''))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const figures = tool?.figures.map(f => f.label.toLowerCase()) ?? [];
  const said = rec?.studyId
    ? `Attached to this step${figures.length ? ` — its ${figures.join(', ')} come into it` : ''}.`
    : `Made here, it is attached to this step${figures.length ? ` and its ${figures.join(', ')} come into it` : ''}.`;
  return (
    <div className="fw-stepbar" role="region" aria-label="The step this answers" data-for={`${r.stageKey}/${r.stepKey}`}>
      <div className="fw-stepbar-b">
        <span className="fw-stepbar-w"><b>{fp.project.name}</b><span aria-hidden> › </span>{st.name}<span aria-hidden> › </span><b>{step.title}</b>{machine ? ` — ${machine}` : ''}</span>
        <span className="sub">{said}</span>
      </div>
      <button type="button" className="btn btn-sm" onClick={() => nav(stepHref(r))}>Back to the step ›</button>
    </div>
  );
}
