/* THE "EXPORT TO EXCEL" BUTTON'S WORK — read everything this device holds and
 * hand it over as one workbook. Loaded only when the button is pressed. See
 * lib/exportWorkbook for the shape and why. */
import {
  ensureProjects, listAssets, listTests, listTestItems, listMaterials, listPrograms,
  projectWorkspaceIds, listWorkspaces, snagsForWorkspace, listSnagAssets,
} from '../db';
import { listStandards } from '../db/standards';
import { exportSheets, type ProjectData, type WalkData } from './exportWorkbook';
import { writeXlsx } from './xlsxWrite';
import { deliverBlob, type Delivered } from './savePdf';
import { todayISO } from './weeks';

/** Everything on this device — or, given a job, that job alone (its walks
 *  with it): the Reports sheet of a 6M or lever tree job exports the job it
 *  is on (flow audit #17: "Spreadsheet is described as the start-up record
 *  of every project"). */
export async function exportEverything(onlyProjectId?: string): Promise<{ how: Delivered; name: string }> {
  const projects = (await ensureProjects()).filter(p => !onlyProjectId || p.id === onlyProjectId);
  const data: ProjectData[] = [];
  const walks: WalkData[] = [];
  const claimed = new Set<string>();

  for (const project of projects) {
    const [assets, tests, items, materials, programs, standards] = await Promise.all([
      listAssets(project.id), listTests(project.id), listTestItems(project.id),
      listMaterials(project.id), listPrograms(project.id), listStandards(project.id),
    ]);
    data.push({ project, assets, tests, items, materials, programs, standards });
    for (const ws of await projectWorkspaceIds(project.id)) {
      if (claimed.has(ws)) continue;
      claimed.add(ws);
      walks.push({ projectName: project.name, snags: await snagsForWorkspace(ws), assets: await listSnagAssets(ws) });
    }
  }
  /* A snag list that belongs to no project still comes out, under its own name
     — when everything is asked for, not one job. */
  for (const ws of onlyProjectId ? [] : await listWorkspaces()) {
    if (claimed.has(ws.id)) continue;
    const snags = await snagsForWorkspace(ws.id);
    if (snags.length) walks.push({ projectName: ws.name, snags, assets: await listSnagAssets(ws.id) });
  }

  const today = todayISO();
  const bytes = writeXlsx(exportSheets(data, walks, today));
  const one = onlyProjectId ? projects[0]?.name : undefined;
  const name = one ? `Faultline-${one.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}-${today}.xlsx` : `Faultline-export-${today}.xlsx`;
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { how: await deliverBlob(blob, name), name };
}
