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
    { phase: 'Measure', title: 'Find the limit', question: 'Which machine or station really holds the line back?', gives: 'A capacity sheet, V-curve and named bottleneck.', action: 'Open Line capacity', to: tool('/balances?add=1'), needsLine: true },
    { phase: 'Measure', title: 'Find the problems', question: 'What do the operators see, and what is going wrong on this line?', gives: 'Problems with place, priority and evidence.', action: 'Open Problems', to: tool('/snags'), also: lineId ? [{ label: 'Walk this line', to: `/lines/${encodeURIComponent(lineId)}` }] : [], needsLine: true },
    { phase: 'Measure', title: 'Count the losses', question: 'Where do lost minutes, slow running and rejects go over real shifts?', gives: 'A shift loss count and ranked stop reasons.', action: 'Start a loss count', to: tool('/losses?add=1'), also: lineId ? [{ label: 'Time stops on the line', to: `/w/${encodeURIComponent(lineId)}/capture` }, { label: 'Stops Pareto', to: `/w/${encodeURIComponent(lineId)}/analyse` }] : [], needsLine: true },
    { phase: 'Analyse', title: 'Prove the causes', question: 'Why do the largest losses happen, and which causes have evidence?', gives: 'A 6M with checked causes and countermeasures.', action: 'Open 6M', to: tool('/sixm?add=1'), needsLine: true },
    { phase: 'Improve', title: 'Make the changes', question: 'Who will change what, by when, and which machine settings need a test?', gives: 'Owned actions and, where needed, a line program or test.', action: 'Open Actions', to: `/project/${projectId}/actions`, also: lineId ? [{ label: 'Line programs and tests', to: `/programs?line=${encodeURIComponent(lineId)}` }] : [] },
    { phase: 'Control', title: 'Check and hold', question: 'Did the same number move, and has the improvement lasted?', gives: 'Before/after evidence and a holding chart. The project report records the DMAIC phases and the line report covers this line.', action: 'Open Analysis', to: tool('/analysis?add=1'), also: [{ label: 'Control chart', to: tool('/chart') }, ...(hasMethod ? [{ label: 'Project report', to: `/project/${projectId}/method-report` }] : [])] },
  ];
}
