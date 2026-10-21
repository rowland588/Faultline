/* INSIDE A PROJECT (docs/PROJECTS.md, P2) — Rowland, 21 October: "all of
 * them tools that you use are within that project automatically. If I create
 * another project, then the same tools are available, but only for that
 * project ... I don't have to think about, I'm going to use this tool, I'm
 * going to assign it to this project."
 *
 * A tool's page is one page for every project and every line; inside a
 * project its address carries the project (`?project=<id>`), so the frame
 * keeps the project's rail, the list shows the project's own, and a new one
 * is made on the project. A record opened (a study, a talk, a product's line
 * standard) wears its own project's rail — the project it is on, not the
 * address it was reached by. Nothing is stored: the project is the record's
 * `projectId`, as it always was. */

/** The query key a tool's address carries the project under. */
export const PROJECT_KEY = 'project';

/** A tool's address inside a project — the same path with `project=<id>`
 *  added to its query; unchanged outside one. */
export function inProject(to: string, projectId?: string): string {
  if (!projectId) return to;
  const at = to.indexOf('?');
  const path = at < 0 ? to : to.slice(0, at);
  const q = new URLSearchParams(at < 0 ? '' : to.slice(at + 1));
  q.set(PROJECT_KEY, projectId);
  return `${path}?${q.toString()}`;
}

/** WHICH OF A TOOL'S RECORDS A LIST SHOWS inside a project — its own; or,
 *  one tap away, everything on its lines (whoever's it is, or nobody's);
 *  or every line. Outside a project, every one. */
export type ProjectScope = 'project' | 'lines' | 'all';

export function inScope<T extends { projectId?: string; workspaceId?: string }>(
  rows: readonly T[], scope: ProjectScope, projectId: string | undefined, lineIds: readonly string[],
): T[] {
  if (!projectId || scope === 'all') return [...rows];
  if (scope === 'project') return rows.filter(r => r.projectId === projectId);
  return rows.filter(r => r.projectId === projectId || (!!r.workspaceId && lineIds.includes(r.workspaceId)));
}

/** The line a new one starts on inside a project: the one asked for, else
 *  the project's own when it has exactly one; '' when it has several (the
 *  picker offers them) or none. */
export function startLine(lineIds: readonly string[], asked?: string): string {
  if (asked) return asked;
  return lineIds.length === 1 ? lineIds[0] : '';
}
