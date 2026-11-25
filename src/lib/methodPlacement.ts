import { methodByKey, type MethodKey, type ProjectMethod } from './methods';
import type { ToolStudy } from './study';
import type { TestItem } from './testing';

export interface MethodPlacement { projectId: string; method: MethodKey; section: string; standardView?: 'balance' | 'work' | 'map' }
export type EvidenceKind = 'study' | 'standard';
type Note = { testId?: string; what: string; note?: string };

export function methodToolHref(to: string, projectId: string, placement?: Pick<MethodPlacement, 'method' | 'section'>, add = false, line?: string): string {
  const [path, query] = to.split('?');
  const q = new URLSearchParams(query);
  q.set('project', projectId);
  if (placement) {
    q.set('method', placement.method);
    q.set('phase', placement.section);
  }
  if (line) q.set('line', line);
  if (add) q.set('add', '1');
  return path + '?' + q.toString();
}

/** A launch only belongs to the project on its address. Background writes never inherit it. */
export function launchPlacement(projectId?: string, hash = typeof location === 'undefined' ? '' : location.hash): MethodPlacement | undefined {
  const q = new URLSearchParams(hash.split('?')[1]);
  if (!projectId || q.get('project') !== projectId) return undefined;
  const method = methodByKey(q.get('method') ?? undefined);
  const section = q.get('phase');
  return method && section && method.sections.some(s => s.name === section) ? { projectId, method: method.key, section } : undefined;
}

export function toolScopeQuery(project?: string, line?: string): string {
  if (project) return methodToolHref('', project, launchPlacement(project), false, line);
  return line ? '?' + new URLSearchParams({ line }).toString() : '';
}

const scope = (method: MethodKey, kind: EvidenceKind, id: string) => `method:tool:${method}:${kind}:${id}`;

/** An ordinary synced method note, keyed by the exact project and tool record. */
export function placementNote(p: MethodPlacement, kind: EvidenceKind, id: string, at: number): TestItem {
  const testId = scope(p.method, kind, id);
  return { id: `${p.projectId}:${testId}`, projectId: p.projectId, testId, kind: 'note', what: p.section, ...(kind === 'standard' && p.standardView ? { note: p.standardView } : {}), sort: at, createdAt: at, updatedAt: at };
}

export function methodPhaseOf(items: readonly Note[], method: MethodKey, kind: EvidenceKind, id: string): string | undefined {
  return items.find(i => i.testId === scope(method, kind, id))?.what;
}

export function methodStandardView(items: readonly Note[], method: MethodKey, id: string): MethodPlacement['standardView'] {
  const view = items.find(i => i.testId === scope(method, 'standard', id))?.note;
  return view === 'balance' || view === 'map' || view === 'work' ? view : undefined;
}

/** An explicit assignment wins. A historical run fits a phase only when exactly one phase lists that tool. */
export function studyPhase(method: ProjectMethod, study: ToolStudy, notes: readonly Note[], matches: (id: string, study: ToolStudy) => boolean): string {
  const placed = methodPhaseOf(notes, method.key, 'study', study.id);
  if (placed) return method.sections.find(section => section.name === placed)?.name ?? 'Project evidence';
  if (method.key === 'dmaic') return 'Project evidence';
  const possible = method.sections.filter(section => section.tools.some(id => matches(id, study)));
  return possible.length === 1 ? possible[0].name : 'Project evidence';
}
