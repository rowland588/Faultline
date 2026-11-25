/* THE FISHBONE AS THE A3 READS IT — the causes of the project's lines, read the way the document shape reads them (tools/doc/context),
 * so a cause is kept once (on the fishbone) and the sheet only says what it holds. */
import { listProjectCases } from '../../../db';
import type { CauseRead } from './a3Model';

export async function loadCauses(projectId: string): Promise<CauseRead[]> {
  const cases = await listProjectCases(projectId, []);
  return cases.flatMap(c => (c.causes ?? []).map((k): CauseRead => ({ text: k.text, root: !!k.root, whys: k.whys.length })));
}
