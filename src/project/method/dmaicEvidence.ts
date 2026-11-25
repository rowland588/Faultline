import { methodPhaseOf, methodStandardView, type EvidenceKind } from '../../lib/methodPlacement';
import type { ToolStudy } from '../../lib/study';
import { studyHref, studyLine, studyTitle, TOOL_NAME, type StudyContext } from '../../lib/studyLinks';
import { capacitySays } from '../../lib/together';
import { isoDay, niceDay } from '../../lib/weeks';
import { standardHref } from '../../tools/linestandard/standard';
import { savedTalkReports } from '../../tools/talk/reportDocuments';
import { PHASES } from './shapes/dmaicModel';

export interface DmaicRecord { id: string; phase: string; label: string; value: string; href: string; at: number; study?: ToolStudy }
export const OTHER_DMAIC_EVIDENCE = 'Other project evidence';

/** Starting the same tool in different phases creates distinct runs. Unplaced records remain project evidence. */
export function dmaicEvidence(projectId: string, rows: readonly {testId?: string; what: string; note?: string; deletedAt?: number; projectId?: string}[],
  studies: readonly ToolStudy[], ctx: StudyContext = {}, workspaceId?: string): DmaicRecord[] {
  const notes = rows.filter(row => row.projectId === projectId && !row.deletedAt);
  const records: DmaicRecord[] = [];
  function add(kind: EvidenceKind, id: string, label: string, value: string, at: number, dateLabel: string, href: string, workspace?: string, study?: ToolStudy) {
    const saved = methodPhaseOf(notes, 'dmaic', kind, id);
    const phase = PHASES.find(p => p.name === saved)?.name ?? OTHER_DMAIC_EVIDENCE;
    const date = Number.isFinite(at) && at > 0 ? dateLabel + ' ' + niceDay(isoDay(at), { year: true }) : 'Date unrecorded';
    const line = workspace && ctx.workspaces?.find(w => w.id === workspace)?.name;
    records.push({ id, phase, label, value: [date, line, value].filter(Boolean).join(' · '), href, at: at > 0 ? at : Infinity, study });
  }
  const ownStudies = studies.filter(s => s.projectId === projectId && !s.deletedAt && !s.facts.template
    && (!workspaceId || s.workspaceId === workspaceId));
  const ownStandards = (ctx.standards ?? []).filter(s => s.projectId === projectId && !s.deletedAt && (!workspaceId || s.workspaceId === workspaceId));
  const studyContext = { ...ctx, studies: ownStudies, standards: ownStandards };
  for (const study of ownStudies) {
    if (!TOOL_NAME[study.tool] || study.tool === 'story') continue;
    let value: string;
    if (study.tool === 'talk') {
      const docs = savedTalkReports(study);
      if (!docs.length) continue;
      value = docs.map(report => report.doc.title).join(' · ');
    } else {
      value = studyLine(study, studyContext).text;
    }
    add('study', study.id, studyTitle(study), value, study.startedAt || study.createdAt, study.startedAt ? 'Started' : 'Saved', studyHref(study), study.workspaceId, study);
  }
  for (const standard of ownStandards) {
    const value = [standard.capacity && capacitySays(standard.capacity).text, standard.note?.trim()].filter(Boolean).join(' · ');
    add('standard', standard.id, standard.product || 'Line standard', value || 'Line standard saved.', standard.createdAt, 'Saved',
      standardHref(standard, methodStandardView(notes, 'dmaic', standard.id) ?? (standard.capacity ? 'balance' : 'map')), standard.workspaceId);
  }
  return records.sort((a, b) => a.at - b.at || a.label.localeCompare(b.label));
}
