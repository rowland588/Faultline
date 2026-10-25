/* THE LOGS THE APP HAS — found, not listed (knowledge/specs/FC-236-check-logs.md).
 *
 * Every file in ./defs that exports a LogDef is a log. A new log is that file (and its specification, tests and
 * catalogue entry); this registry, the Logs pages, the starter sheet, the paper and the acceptance script all read
 * the folder, so nothing else is edited. The hub's grouping and order are the definitions': group, then title. */
import type { LogDef } from './def';

const found = import.meta.glob('./defs/*.ts', { eager: true }) as Record<string, { default?: LogDef; def?: LogDef }>;

/** Every log, grouped then by title. */
export const LOG_DEFS: readonly LogDef[] = Object.values(found)
  .map(m => m.def ?? m.default)
  .filter((d): d is LogDef => !!d && typeof d.key === 'string')
  .sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));

export const defOf = (key: string | undefined): LogDef | undefined => LOG_DEFS.find(d => d.key === key);

/** The hub's headings, each with its logs, in order. */
export function defGroups(): { group: string; defs: LogDef[] }[] {
  const by = new Map<string, LogDef[]>();
  for (const d of LOG_DEFS) by.set(d.group, [...(by.get(d.group) ?? []), d]);
  return [...by.entries()].map(([group, defs]) => ({ group, defs }));
}

/** A log's address. */
export const logHref = (key: string, id?: string): string => `/log/${encodeURIComponent(key)}${id ? `/${encodeURIComponent(id)}` : ''}`;
