import { uid } from '../../lib/ids';
import type { LeanTone } from '../../lib/lean';
import type { AgreedBoard, ToolStudy } from '../../lib/study';
import { boardByKey } from './registry';
import type { BoardDef } from './types';

export function studyBoard(s: Pick<ToolStudy, 'agreed' | 'workspaceId' | 'projectId'>, siblings: ToolStudy[], now: number) {
  const agreed = s.agreed?.board;
  const def = boardByKey(agreed?.key);
  if (!agreed || !def) return undefined;
  const gather = def.gather({ ...s, agreed: { board: agreed } } as ToolStudy, siblings, now);
  const result = def.summarize(gather);
  return { def, gather, result };
}

export const boardTitle = (s: Pick<ToolStudy, 'agreed'>): string => boardByKey(s.agreed?.board?.key)?.title ?? 'Board';

export function boardSays(s: Pick<ToolStudy, 'agreed' | 'workspaceId' | 'projectId'>, siblings: ToolStudy[], now: number): { text: string; verdict: string; tone: LeanTone } {
  const x = studyBoard(s, siblings, now);
  if (!x) return { text: 'Not a board.', verdict: '—', tone: 'n' };
  const r = x.result;
  return { text: r.sentence, verdict: r.verdict, tone: r.tone };
}

export function newBoardStudy(def: BoardDef, o: { name: string; workspaceId: string; projectId?: string; now: number }): ToolStudy {
  const board: AgreedBoard = { key: def.key, reactiveHours: undefined };
  return {
    id: uid(),
    tool: 'board',
    name: o.name,
    workspaceId: o.workspaceId,
    projectId: o.projectId,
    agreed: { board },
    facts: {},
    uses: [],
    startedAt: o.now,
    createdAt: o.now,
    updatedAt: o.now,
  };
}
