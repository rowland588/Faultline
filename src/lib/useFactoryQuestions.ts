/* THE FOUR QUESTIONS, READ LIVE (lib/factoryQuestions; docs/LOOK.md §1) — from the one factory reading (lib/useFactoryRead, shared
 * with the Story since 8 November): the register's open problems priced by each line's own cost model, every project's actions and
 * every line's own problems, and the fixes proved on the lines. */
import { useMemo } from 'react';
import type { Project, Workspace } from '../types';
import { useFactoryRead } from './useFactoryRead';
import { fourQuestions, type FourQuestions } from './factoryQuestions';
import type { RegisterProblem } from './projectActions';
import { isAreaPlace } from './lines';

export function useFactoryQuestions(projects: Project[], lines: readonly Workspace[], keep?: (r: RegisterProblem) => boolean): FourQuestions | null {
  const read = useFactoryRead(projects, lines, keep);
  /* an area's own place (lib/areaPlace) is read with the lines and never counted as one */
  const n = lines.filter(w => !isAreaPlace(w)).length;
  return useMemo(() => (read ? fourQuestions({ wrong: read.wrong, actions: read.actions, proved: read.proved, lines: n, today: read.today }) : null), [read, n]);
}
