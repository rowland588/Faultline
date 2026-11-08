/* THE RECORDS THE ASKS ARE MATCHED AGAINST — gathered from what the Story page already reads (8 November, docs/STORY.md §7, S8): the
 * client's lines with their machines (Workspace.assets) and the products made on them (their line standards, the problems' products),
 * the snapshot's findings and proved fixes (the Factory page's readers), every action (lib/useProjectActions — with the problem it
 * answers), and every tool record on the lines: a study by its frame key and title (lib/studyLinks), a product's Line capacity by its
 * line standard. One builder, so the page and the AI colleague's capability (lib/storyAsks storyAsksState) read the same records. */
import type { Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { ProjectAction } from './projectActions';
import type { StorySnapshot, ToolStudy } from './study';
import type { Standard } from '../tools/linestandard/standard';
import type { AskRecord, AskRecords } from './storyAsks';
import { studyHref, studyTitle } from './studyLinks';

/** A study's tool, as the frame's registry keys it (lib/catalogue registry) — a calculator by its own key where it has a page. */
const CALC_KEYS: Record<string, string> = { spaghetti: 'spaghetti', 'process-flow': 'processflow', 'workstation-stops': 'workstops', 'micro-movements': 'micro' };
const STUDY_KEYS: Partial<Record<ToolStudy['tool'], string>> = { map: 'valuestream', balance: 'linework', log: 'logs' };
export function frameKeyOf(s: Pick<ToolStudy, 'tool' | 'agreed' | 'facts'>): string {
  if (s.tool === 'calc') return CALC_KEYS[s.agreed?.calc?.key ?? ''] ?? 'calc';
  if (s.tool === 'scored') return s.agreed?.scored?.key ?? 'scored';
  if (s.tool === 'balance' && s.facts?.video) return 'video';
  return STUDY_KEYS[s.tool] ?? s.tool;
}

export interface AskRecordInputs {
  lines: readonly Workspace[];
  snapshot: StorySnapshot;
  actions: readonly ProjectAction[];
  snags: readonly Snag[];
  studies: readonly ToolStudy[];
  standards: readonly Standard[];
}

export function askRecordsOf(i: AskRecordInputs): AskRecords {
  const ids = new Set(i.lines.map(l => l.id));
  const products = new Map<string, Set<string>>();
  const addProduct = (lineId: string | undefined, p: string | undefined) => { if (!lineId || !p?.trim()) return; const set = products.get(lineId) ?? new Set<string>(); set.add(p.trim()); products.set(lineId, set); };
  const live = i.standards.filter(s => !(s as { deletedAt?: number }).deletedAt && s.workspaceId && ids.has(s.workspaceId));
  for (const s of live) addProduct(s.workspaceId, s.product);
  const snagProducts = new Map(i.snags.map(s => [s.id, s.products ?? []]));
  for (const s of i.snags) if (ids.has(s.workspaceId)) for (const p of s.products ?? []) addProduct(s.workspaceId, p);

  const records: AskRecord[] = [];
  for (const s of i.studies) {
    if (s.deletedAt || s.tool === 'story' || !s.workspaceId || !ids.has(s.workspaceId)) continue;
    records.push({ id: s.id, tool: frameKeyOf(s), title: studyTitle(s), lineId: s.workspaceId, ...(s.machine ? { machine: s.machine } : {}), ...(s.product ? { product: s.product } : {}), href: studyHref(s) });
  }
  for (const s of live) if (s.capacity?.stations.length) records.push({ id: s.id, tool: 'linebalance', title: `Line capacity — ${s.product}`, lineId: s.workspaceId, product: s.product, href: `/w/${s.workspaceId}/standards/${s.id}?at=balance` });

  return {
    lines: i.lines.map(l => ({ id: l.id, name: l.name, machines: (l.assets ?? []).filter(a => a.trim() && a.trim().toLowerCase() !== 'whole line'), products: [...(products.get(l.id) ?? [])] })),
    findings: i.snapshot.findings.map(f => ({ ...f, ...(snagProducts.get(f.id)?.length ? { products: snagProducts.get(f.id) } : {}) })),
    actions: i.actions.map(a => ({ what: a.what, who: a.who, ...(a.due ? { due: a.due } : {}), late: a.late, ...(a.where ? { where: a.where } : {}), kind: a.kind, ...(a.snagId ? { snagId: a.snagId } : {}) })),
    proved: i.snapshot.provedFixes,
    records,
  };
}
