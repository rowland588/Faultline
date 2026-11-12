/* A RECORD'S KIND, IN WORDS — what a study is, said the way its tool is named (the registry's label first). Used where records from every
 * tool are listed together: the environment's work in context and Everything (docs/LUNAR-ENVIRONMENT.md). */
import { toolByKey } from '../catalogue/registry';

const NAMES: Record<string, string> = {
  map: 'Value stream', time: 'Time study', balance: 'Line balance', cycle: 'Cycle time', changeover: 'SMED', losses: 'Loss count',
  sampling: 'Work sampling', ergonomics: 'Ergonomics', layout: 'Layout', reliability: 'Reliability', chart: 'Control chart', analysis: 'Analysis',
  calc: 'Calculator', log: 'Check log', ledger: 'Ledger', doc: 'Document', scored: 'Register', board: 'Board', run: 'Run', capability: 'Capability',
  video: 'Video study', department: 'Department', source: 'Source', notebook: 'Notebook',
};

export function kindOfRecord(tool: string, video = false): string {
  if (video) return 'Video study';
  return NAMES[tool] ?? toolByKey(tool)?.label ?? 'Record';
}
