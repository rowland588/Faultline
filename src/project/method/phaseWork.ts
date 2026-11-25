import { methodPhaseOf, studyPhase } from '../../lib/methodPlacement';
import type { ProjectMethod } from '../../lib/methods';
import type { ToolStudy } from '../../lib/study';
import type { Standard } from '../../tools/linestandard/standard';
import { matchesMethodTool } from './methodTools';

export interface PhaseWork { studies: ToolStudy[]; standards: Standard[] }

/** Read originals for a worksheet or its paper using the same placement as the project dashboard. */
export function workInMethodSection(method: ProjectMethod, section: string, notes: readonly { testId?: string; what: string }[],
  studies: readonly ToolStudy[], standards: readonly Standard[] = []): PhaseWork {
  return {
    studies: studies.filter(s => !s.deletedAt && !s.facts.template && studyPhase(method, s, notes, matchesMethodTool) === section),
    standards: standards.filter(s => !s.deletedAt && (methodPhaseOf(notes, method.key, 'standard', s.id) ?? 'Project evidence') === section),
  };
}
