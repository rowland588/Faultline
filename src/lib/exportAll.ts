/* THE "EXPORT TO EXCEL" BUTTON'S WORK — read everything this device holds and
 * hand it over as one workbook. Loaded only when the button is pressed. See
 * lib/exportWorkbook for the shape and why. */
import {
  ensureProjects, listAssets, listTests, listTestItems, listMaterials, listPrograms,
  projectWorkspaceIds, listWorkspaces, snagsForWorkspace, listSnagAssets,
} from '../db';
import { exportSheets, type ProjectData, type WalkData } from './exportWorkbook';
import { writeXlsx } from './xlsxWrite';
import { deliverBlob } from './savePdf';
import { todayISO } from './weeks';

export async function exportEverything(): Promise<{ how: 'shared' | 'downloaded' | 'opened'; name: string }> {
  const projects = await ensureProjects();
  const data: ProjectData[] = [];
  const walks: WalkData[] = [];
  const claimed = new Set<string>();

  for (const project of projects) {
    const [assets, tests, items, materials, programs] = await Promise.all([
      listAssets(project.id), listTests(project.id), listTestItems(project.id),
      listMaterials(project.id), listPrograms(project.id),
    ]);
    data.push({ project, assets, tests, items, materials, programs });
    for (const ws of await projectWorkspaceIds(project.id)) {
      if (claimed.has(ws)) continue;
      claimed.add(ws);
      walks.push({ projectName: project.name, snags: await snagsForWorkspace(ws), assets: await listSnagAssets(ws) });
    }
  }
  /* A snag list that belongs to no project still comes out, under its own name. */
  for (const ws of await listWorkspaces()) {
    if (claimed.has(ws.id)) continue;
    const snags = await snagsForWorkspace(ws.id);
    if (snags.length) walks.push({ projectName: ws.name, snags, assets: await listSnagAssets(ws.id) });
  }

  const today = todayISO();
  const bytes = writeXlsx(exportSheets(data, walks, today));
  const name = `Faultline export ${today}.xlsx`;
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { how: await deliverBlob(blob, name), name };
}
