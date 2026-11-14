/* 6M AS A TOOL (13 November — Rowland: "6M is still a window … it sits weird now, we need it in the tools. So do what we need.").
 *
 * Since 31 October 6M is a tool, not a method; since 4 November it has had a DOOR — one button on the Tools page that dropped the person
 * into a project's fishbone, one a line. This makes it a tool like every other: a card in the gallery and on a line's Tools, a list of
 * the 6Ms on a line (as many as there are problems worth one), New, and a page of its own INSIDE THE LINE — Pareto · Fishbone ·
 * Countermeasures · Report as its tabs — never the project's frame.
 *
 * THE RECORD DOES NOT CHANGE. A 6M is kept as it always was — a project of the 6M kind with its line, its problems, their causes on
 * six bones, the five whys, the countermeasures, the proof (docs/SIXM.md; lib/lineSixm: "its actions, proof and report are the
 * project's"). Nothing is copied, migrated or marked, and no database change is made: every 6M ever started — as a project, from a
 * problem, or through the door — is a 6M of this tool, and its project address still opens it as before. Only the way in, and the
 * frame it wears when opened as a tool, are new. Pure. */
import type { Project } from '../../types';
import { kindOf } from '../../project/projectKind';

export type SixmView = 'fishbone' | 'pareto' | 'board' | 'report';
export const SIXM_VIEWS: { key: SixmView; label: string }[] = [
  { key: 'pareto', label: 'Pareto' }, { key: 'fishbone', label: 'Fishbone' }, { key: 'board', label: 'Countermeasures' }, { key: 'report', label: 'Report' },
];
/** A 6M STARTS WITH THE PARETO (Rowland, 14 November: "6M should start with a pareto … not just a fishbone") — what costs the most first, then why. */
export const SIXM_START: SixmView = 'pareto';
export const viewOf = (v: string | null | undefined): SixmView => (SIXM_VIEWS.some(x => x.key === v) ? v as SixmView : SIXM_START);

/** The 6Ms: the projects of the 6M kind still in use. */
export const sixmsOf = (projects: readonly Project[]): Project[] => projects.filter(p => !p.archivedAt && kindOf(p) === 'sixm');
/** Those on one line — by the line rows that name the factory's line. */
export function sixmsOnLine(projects: readonly Project[], rows: readonly { projectId: string; workspaceId?: string }[], lineId: string): Project[] {
  const on = new Set(rows.filter(r => r.workspaceId === lineId).map(r => r.projectId));
  return sixmsOf(projects).filter(p => on.has(p.id));
}

/** The tool's own address for a 6M: on its line, at one of its four views, with whatever that view is asked. */
export function sixmHref(projectId: string, o: { line?: string; view?: SixmView; query?: Record<string, string | undefined> } = {}): string {
  const q = new URLSearchParams();
  if (o.line) q.set('line', o.line);
  if (o.view && o.view !== SIXM_START) q.set('view', o.view);
  for (const [k, v] of Object.entries(o.query ?? {})) if (v) q.set(k, v);
  const qs = q.toString();
  return `/sixm/${encodeURIComponent(projectId)}${qs ? `?${qs}` : ''}`;
}
export const sixmListHref = (line?: string): string => `/sixm${line ? `?line=${encodeURIComponent(line)}` : ''}`;

/* THE 6M OPEN AS A TOOL: while its page is up, the links INSIDE its own screens that go from one of its views to another (a cause back
   to the Pareto bar it came from, a bar to its fishbone) stay in the tool — they are asked here for their address. Anywhere else the
   same links go to the project's pages, exactly as before. */
let open: { projectId: string; line?: string } | null = null;
export const setSixmOpen = (o: { projectId: string; line?: string } | null): void => { open = o; };
export function sixmInTool(projectId: string, view: SixmView, query: Record<string, string | undefined> = {}): string | undefined {
  return open && open.projectId === projectId ? sixmHref(projectId, { line: open.line, view, query }) : undefined;
}
