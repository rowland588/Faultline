/* A STUDY STARTED ON A LINE WITHOUT THE LIST'S SHEET — what a line's Tools page does when several
 * tools are ticked and started together (docs/PAGES.md, A line — its tools). The tools whose New
 * asks only "what is it of?" and a machine: a capability study, a control chart, an analysis and a
 * reliability study. The others ask more (a changeover's two products, a map's product, a loss
 * count's shift), so they are started from their own lists and are left out of the together. */
import { putStudy } from '../db';
import { machineOntoLine } from './lines';
import { now, uid } from './ids';
import type { StudyTool, ToolStudy } from './study';

export const TOGETHER: readonly StudyTool[] = ['capability', 'chart', 'analysis', 'reliability'];

export const canStartTogether = (tool: string | undefined): tool is StudyTool => !!tool && (TOGETHER as readonly string[]).includes(tool);

/** The record, as the list's New makes it for these tools: on the line, nothing agreed yet — the
 *  tool asks what is agreed first when it is opened. */
export async function startStudyOn(tool: StudyTool, line: string, name: string, machine = ''): Promise<ToolStudy> {
  const t = now();
  const s: ToolStudy = { id: uid(), tool, name: name.trim(), ...(machine.trim() ? { machine: machine.trim() } : {}), workspaceId: line, facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t };
  await putStudy(s);
  if (machine.trim()) await machineOntoLine(line, machine);
  return s;
}
