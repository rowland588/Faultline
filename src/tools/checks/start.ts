/* STARTING A LOG FROM ITS STARTER LIST — the list a definition brings, copied into the log so that editing the
 * log's list never changes the definition (and the definition changing never changes a log). */
import type { AgreedLog, LogCheck, ToolStudy } from '../../lib/study';
import type { LogDef } from './def';
import { uid } from '../../lib/ids';

export interface StartOptions {
  since: number;
  /** Which of the starter checks to take (indexes); all when absent. */
  pick?: number[];
  /** Fills the "where" of each starter check that has none: the machine, the area. */
  where?: string;
  id?: () => string;
  shiftHours?: number;
  /** What the example agrees on a starter check, by starter index. */
  set?: Record<number, Partial<LogCheck>>;
}

export function starterLog(def: LogDef, o: StartOptions): AgreedLog {
  const id = o.id ?? uid;
  const take = o.pick ?? def.starterChecks.map((_, i) => i);
  const checks = take.filter(i => def.starterChecks[i]).map((i): LogCheck => {
    const c = def.starterChecks[i];
    return { ...c, ...(o.set?.[i] ?? {}), id: id(), where: c.where?.trim() ? c.where : o.where?.trim() || undefined, ...(c.items ? { items: c.items.map(x => ({ ...x })) } : {}), when: { ...c.when } } as LogCheck;
  });
  return { key: def.key, checks, since: o.since, ...(o.shiftHours ? { shiftHours: o.shiftHours } : {}) };
}

/** A new log's record: on a line (and a project, when it is started inside one). */
export function newLogStudy(def: LogDef, o: StartOptions & { name: string; workspaceId: string; projectId?: string; machine?: string; now?: number }): ToolStudy {
  const t = o.now ?? o.since;
  return {
    id: (o.id ?? uid)(), tool: 'log', name: o.name.trim(), workspaceId: o.workspaceId,
    ...(o.projectId ? { projectId: o.projectId } : {}), ...(o.machine?.trim() ? { machine: o.machine.trim() } : {}),
    agreed: { log: starterLog(def, o) }, facts: { results: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t,
  };
}
