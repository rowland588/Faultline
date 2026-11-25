import type { ActionSource } from './actionSources';
import type { ProjectMethod } from './methods';
import type { PaceLineRow } from '../db/rows';

export type ProjectActionLine = Pick<PaceLineRow, 'id' | 'name'> & { projectId: string; workspaceId: string };

export function selectedActionLine(projectId: string, workspaceId: string | null, lines: readonly PaceLineRow[]): ProjectActionLine | undefined {
  if (!workspaceId) return;
  const found = lines.filter(l => !l.deletedAt && l.projectId === projectId && l.workspaceId === workspaceId);
  if (found.length === 1) return { id: found[0].id, name: found[0].name, projectId, workspaceId };
}

/** Legacy actions may carry only one of the two IDs. Both must agree when both are present. */
export function onProjectActionLine(record: { workspaceId?: string; lineId?: string }, line: ProjectActionLine): boolean {
  if (record.workspaceId && record.workspaceId !== line.workspaceId) return false;
  if (record.lineId && record.lineId !== line.id) return false;
  return !!(record.workspaceId || record.lineId);
}

export function projectActionsHref(projectId: string, workspaceId?: string, phase?: string): string {
  const q = new URLSearchParams();
  if (workspaceId) q.set('line', workspaceId);
  if (phase) q.set('phase', phase);
  return '/project/' + encodeURIComponent(projectId) + '/actions' + (q.size ? '?' + q.toString() : '');
}

export function phaseActionSource(projectId: string, method: ProjectMethod, section: string, workspaceId?: string,
  finding = '', label = ''): ActionSource {
  const q = new URLSearchParams({ phase: section, finding });
  if (workspaceId) q.set('line', workspaceId);
  return { kind: 'method', id: projectId, part: method.key + ':' + section, how: 'record',
    href: '/project/' + encodeURIComponent(projectId) + '/method?' + q.toString(),
    label: [method.name, section, label].filter(Boolean).join(' · ') };
}
