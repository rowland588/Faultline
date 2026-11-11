/* THE PLACES JUMP TO OFFERS, made from the records — lifted out of ui/JumpTo (8 November) so AI Mode's `find` capability
 * (src/capabilities) builds them the very same way the search box does: the factory's lines, the projects, the products on each
 * line, the machines on each line in flow order (lib/lineRecords machinesOnLine), the problems on the factory's lines, and the
 * tools and pages (lib/jumpTo TOOL_PLACES). Pure. */
import type { Project, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { Asset } from './testing';
import type { Standard } from '../tools/linestandard/standard';
import { machinesOnLine, type JobLine } from './lineRecords';
import { productionLines } from './lines';
import { TOOL_PLACES, type Place } from './jumpTo';

export interface PlacesIn {
  ws: readonly Workspace[];
  std: readonly Standard[];
  snags: readonly Snag[];
  assets: readonly Asset[];
  jobLines: readonly JobLine[];
  projects: readonly Pick<Project, 'id' | 'name'>[];
  /** Under All clients (lib/activeClient, C1): whose a line, or a project, is — said first under its name. */
  whose?: { line: (id: string) => string; project: (id: string) => string };
}

export function placesOf({ ws, std, snags, assets, jobLines, projects, whose }: PlacesIn): Place[] {
  const lines = productionLines(ws);
  const name = new Map(ws.map(w => [w.id, w.name]));
  const sub = (...p: (string | undefined)[]) => { const s = p.filter(Boolean).join(' · '); return s ? { sub: s } : {}; };
  const of = (id: string) => whose?.line(id) || undefined;
  /* the machines on each line, as the line's page lists them (lib/lineRecords machinesOnLine) */
  const machines = lines.flatMap(w => machinesOnLine(w, assets, jobLines).map(a => ({ a, w })));
  return [
    ...lines.map(w => ({ kind: 'line' as const, label: w.name, ...sub(of(w.id), w.lineType), href: `#/lines/${w.id}` })),
    ...projects.map(p => ({ kind: 'job' as const, label: p.name, ...sub(whose?.project(p.id) || undefined), href: `#/project/${p.id}` })),
    ...std.filter(s => !s.deletedAt && s.workspaceId && name.has(s.workspaceId)).map(s => ({ kind: 'product' as const, label: s.product, ...sub(of(s.workspaceId as string), name.get(s.workspaceId as string)), href: s.capacity?.stations.length ? `#/w/${s.workspaceId}/standards/${s.id}?at=balance` : `#/w/${s.workspaceId}/standards/${s.id}` })),
    ...machines.map(({ a, w }) => ({ kind: 'machine' as const, label: a.name, ...sub(of(w.id), w.name), href: `#/lines/${encodeURIComponent(w.id)}/machine/${encodeURIComponent(a.name)}` })),
    /* the problems on the factory's lines — found by their words, opened in the panel over the page */
    ...snags.filter(s => !s.deletedAt && !s.archivedAt && name.has(s.workspaceId)).map(s => ({
      kind: 'problem' as const, label: s.problem, problemId: s.id, href: `#/snags?open=${encodeURIComponent(s.id)}`,
      sub: [of(s.workspaceId), name.get(s.workspaceId), s.targetAsset, s.status === 'closed' ? 'done' : s.owner || 'nobody on it'].filter(Boolean).join(' · '),
    })),
    ...TOOL_PLACES,
  ];
}
