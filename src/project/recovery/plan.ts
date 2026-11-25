/* One underperforming-line engagement across one or several shared factory lines.
 * The pack opens existing records; it does not create a second tracker or mark work done. */
import { inProject } from '../../lib/inProject';

export interface RecoveryStep {
  phase: 'Define' | 'Measure' | 'Analyse' | 'Improve' | 'Control';
  title: string;
  gives: string;
  action: string;
  to: string;
  also?: { label: string; to: string }[];
  needsLine?: boolean;
}

export function recoverySteps(projectId: string, lineId?: string, hasMethod = false): RecoveryStep[] {
  const line = lineId ? `line=${encodeURIComponent(lineId)}` : '';
  const tool = (path: string) => inProject(`${path}${line ? `${path.includes('?') ? '&' : '?'}${line}` : ''}`, projectId);
  return [
    { phase: 'Define', title: 'Record the problems', gives: 'Record what operators see and where it happens.', action: 'Open Problems', to: tool('/snags'), also: lineId ? [{ label: 'Walk this line with Line Talk', to: tool('/talk') }] : [], needsLine: true },
    { phase: 'Measure', title: 'Measure the line', gives: 'Compare measured station rates to find what limits output.', action: 'Open Line capacity', to: tool('/balances?add=1'), also: [{ label: 'Set the project measure and target', to: `/project/${projectId}/setup?part=pset-measures` }], needsLine: true },
    { phase: 'Measure', title: 'Count the losses', gives: 'Count lost minutes and rejects over a shift, then rank the losses.', action: 'Start a loss count', to: tool('/losses?add=1'), also: lineId ? [{ label: 'Time stops on the line', to: `/w/${encodeURIComponent(lineId)}/capture` }, { label: 'Stops Pareto', to: `/w/${encodeURIComponent(lineId)}/analyse` }] : [], needsLine: true },
    { phase: 'Analyse', title: 'Prove the causes', gives: 'Test possible causes against the evidence for each problem.', action: 'Open 6M', to: tool('/sixm?add=1'), needsLine: true },
    { phase: 'Improve', title: 'Make the changes', gives: 'Agree what to try, who owns the action and when to check it.', action: 'Open Actions', to: `/project/${projectId}/actions` },
    { phase: 'Control', title: 'Check and hold', gives: 'Compare the same measure before and after the change. Track whether the gain holds.', action: 'Open Analysis', to: tool('/analysis?add=1'), also: [{ label: 'Control chart', to: tool('/chart') }, ...(hasMethod ? [{ label: 'Project report', to: `/project/${projectId}/method-report` }] : [])] },
  ];
}
