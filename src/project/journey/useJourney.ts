/* THE JOURNEY, READ — from the one project reader (lib/projectRead, docs/STEADY.md S2): the
 * method's records as the control room reads them, plus the project's own actions, the register's
 * problems taken for it, its notes, its studies and its lines. Kept for the pages that read the
 * journey by this name; nothing is read twice. */
import type { PaceLineRow, PaceTodoRow } from '../../db';
import type { Project } from '../../types';
import type { ToolStudy } from '../../lib/study';
import type { JourneyInput } from './journey';
import { useProjectRead } from '../projectRead';

export interface JourneyRead {
  /** What lib/journey reads the range from. */
  input: JourneyInput;
  today: string;
  /** The project's first day — where "since the start" starts. */
  started: string;
  /** Its actions, for the tick list and the sheet. */
  steps: PaceTodoRow[];
  /** Its lines, for the action sheet's Line box. */
  lines: PaceLineRow[];
  studies: ToolStudy[];
}

export function useJourney(project: Project | undefined): JourneyRead | null {
  const read = useProjectRead(project);
  return read ? { input: read.journey, today: read.today, started: read.started, steps: read.steps, lines: read.lines, studies: read.studies } : null;
}
