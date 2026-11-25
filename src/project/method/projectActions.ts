import { actionSourceSummary } from '../../lib/actionSources';
import type { PaceTodoRow } from '../../db/rows';
import type { TestItem } from '../../lib/testing';
import type { ReportOwed } from '../../lib/methodReportModel';

/** Method notes include field/phase attribution. Board actions carry the actual owner and outcome. */
export function methodProjectRows(items: readonly TestItem[], actions: readonly PaceTodoRow[]): ReportOwed[] {
  return [
    ...items.filter(i => !i.deletedAt),
    ...actions.map((a): ReportOwed => ({
      kind: 'next', what: a.what, owner: a.who, due: a.due, state: a.state, outcome: a.outcome,
      doneAt: a.state === 'done' ? (a.updatedAt || a.createdAt || 1) : null, doneOn: a.doneOn,
      createdAt: a.createdAt, expected: a.expect, source: actionSourceSummary(a.sources),
    })),
  ];
}
