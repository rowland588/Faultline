/* THE FOUR QUESTIONS, READ LIVE (lib/factoryQuestions; docs/LOOK.md §1) — from the one factory reading (lib/useFactoryRead, shared
 * with the Story since 8 November): the register's open problems priced by each line's own cost model, every project's actions and
 * every line's own problems, and the fixes proved on the lines. */
import { useMemo } from 'react';
import type { Project, Workspace } from '../types';
import { useFactoryRead } from './useFactoryRead';
import { fourQuestions, type FourQuestions } from './factoryQuestions';
import type { RegisterProblem } from './projectActions';

export function useFactoryQuestions(projects: Project[], lines: readonly Workspace[], keep?: (r: RegisterProblem) => boolean): FourQuestions | null {
  const read = useFactoryRead(projects, lines, keep);
  return useMemo(() => (read ? fourQuestions({ wrong: read.wrong, actions: read.actions, proved: read.proved, lines: lines.length, today: read.today }) : null), [read, lines.length]);
}
