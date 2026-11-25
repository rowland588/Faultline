/* One underperforming-line engagement across one or several shared factory lines.
 * The pack opens existing records; it does not create a second tracker or mark work done. */
import { inProject } from '../../lib/inProject';

export interface RecoveryStep {
  phase: 'Define' | 'Measure' | 'Analyse' | 'Improve' | 'Control';
  title: string;
  question: string;
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
    { phase: 'Define', title: 'Agree the gap', question: 'What output is needed, what is actually made, and over which period?', gives: 'A measure, target and baseline for each line.', action: 'Set the outcome', to: `/project/${projectId}/setup?part=pset-measures` },
    { phase: 'Define', title: 'Record the problems', question: 'What are people seeing on this line, and where does each problem occur?', gives: 'A clear problem list with place and evidence, without guessing the cause.', action: 'Open Problems', to: tool('/snags'), also: lineId ? [{ label: 'Walk this line', to: `/lines/${encodeURIComponent(lineId)}` }] : [], needsLine: true },
    { phase: 'Measure', title: 'Measure the line', question: 'What can the line make, and where does measured capacity limit output?', gives: 'A capacity sheet and the measured limit, if there is one.', action: 'Open Line capacity', to: tool('/balances?add=1'), needsLine: true },
    { phase: 'Measure', title: 'Count the losses', question: 'Where do lost minutes, slow running and rejects go over real shifts?', gives: 'A shift loss count and ranked stop reasons.', action: 'Start a loss count', to: tool('/losses?add=1'), also: lineId ? [{ label: 'Time stops on the line', to: `/w/${encodeURIComponent(lineId)}/capture` }, { label: 'Stops Pareto', to: `/w/${encodeURIComponent(lineId)}/analyse` }] : [], needsLine: true },
    { phase: 'Analyse', title: 'Prove the causes', question: 'Why do the largest losses happen, and which causes have evidence?', gives: 'A 6M with checked causes and countermeasures.', action: 'Open 6M', to: tool('/sixm?add=1'), needsLine: true },
    { phase: 'Improve', title: 'Make the changes', question: 'Which verified cause will be addressed, who owns the change, and when will it be tried?', gives: 'Owned actions linked to the evidence and their trial results.', action: 'Open Actions', to: `/project/${projectId}/actions` },
    { phase: 'Control', title: 'Check and hold', question: 'Did the same number move, and has the improvement lasted?', gives: 'Before/after evidence and a holding chart. The project report records the DMAIC phases and the line report covers this line.', action: 'Open Analysis', to: tool('/analysis?add=1'), also: [{ label: 'Control chart', to: tool('/chart') }, ...(hasMethod ? [{ label: 'Project report', to: `/project/${projectId}/method-report` }] : [])] },
  ];
}
