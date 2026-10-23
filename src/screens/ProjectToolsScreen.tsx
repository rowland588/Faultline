/* A PROJECT'S TOOLS — every use of a tool in the project, by tool (docs/STRUCTURE.md §5.1, B2).
 *
 * The eleven tools sat at the foot of every project's rail — 41% of its lines — each opening its
 * list on the project (P2, lib/inProject). Now the project has one page for them: each tool, how
 * many times it has been used here and the latest, opening its list in the project; New on its row
 * (and in More) starts one here at once — its list opened with New (?add=1) — and it is the
 * project's (no "For a project?" asked). Line Talk starts from its own list. Read from the catalogue's registry
 * (src/catalogue/registry); nothing new is stored. */
import { useEffect, useMemo, useState } from 'react';
import { listStandards, listStudies, onDataChange } from '../db';
import { useProject } from '../lib/useProjects';
import { useAccess } from '../cloud/access';
import { inProject } from '../lib/inProject';
import { inCapacityTool, inMapTool, type Standard } from '../lib/standard';
import type { ToolStudy } from '../lib/study';
import { nav } from '../state/useRoute';
import { APP_TOOLS, type AppTool } from '../catalogue/registry';
import { PageHeader, RecordRow, RecordRows } from '../ui/parts';

/** How many uses of a tool a project holds, and the latest's name. */
export function usesOf(t: AppTool, studies: ToolStudy[], standards: Standard[]): { n?: number; latest?: string } {
  if (t.reads === 'standard') {
    const mine = standards.filter(s => !s.deletedAt && (t.key === 'linebalance' ? inCapacityTool(s) : inMapTool(s)));
    return { n: mine.length, latest: mine.sort((a, b) => b.updatedAt - a.updatedAt)[0]?.product };
  }
  if (!t.reads) return {};
  const mine = studies.filter(s => !s.deletedAt && s.tool === t.reads).sort((a, b) => b.updatedAt - a.updatedAt);
  return { n: mine.length, latest: mine[0]?.name };
}

export function ProjectToolsScreen({ projectId }: { projectId: string }) {
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  const [got, setGot] = useState<{ studies: ToolStudy[]; standards: Standard[] } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([listStudies(projectId), listStandards(projectId)]).then(([studies, standards]) => { if (live) setGot({ studies, standards }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  const rows = useMemo(() => (got ? APP_TOOLS.map(t => ({ t, ...usesOf(t, got.studies, got.standards) })) : []), [got]);
  if (!project) return <p className="sub wrap">That project is not on this device.</p>;
  const total = rows.reduce((n, r) => n + (r.n ?? 0), 0);
  const used = rows.filter(r => r.n).length;
  return (
    <div className="wrap ptools">
      <PageHeader
        eyebrow={`TOOLS · IN ${project.name.toUpperCase()}`}
        title="Tools"
        says={!got ? 'Reading the project’s tools…' : total ? `${total} use${total === 1 ? '' : 's'} of ${used} tool${used === 1 ? '' : 's'} in this project — each opens its list here, and one started here is the project’s.` : 'No tool used in this project yet — one started here is the project’s.'}
        more={can.edit ? APP_TOOLS.map(t => ({ label: `New — ${t.label}`, run: () => nav(inProject(t.to, projectId)) })) : []}
      />
      <RecordRows label="The tools in this project">
        {rows.map(({ t, n, latest }) => (
          <RecordRow key={t.key} what={t.label}
            says={n ? `${n} in this project` : n === 0 ? 'None yet' : undefined}
            where={latest ? `Latest: ${latest}` : t.says}
            onOpen={() => nav(inProject(t.to, projectId))}
            aside={can.edit && t.key !== 'talk' ? <button type="button" className="btn btn-sm" aria-label={`New — ${t.label}`} onClick={() => nav(inProject(`${t.to}?add=1`, projectId))}>New</button> : undefined} />
        ))}
      </RecordRows>
    </div>
  );
}
