import { itemLines, type MethodReport } from '../methodReportModel';
import { capacitySays } from '../together';
import { isoDay, niceDay } from '../weeks';
import { peopleOf, type Standard } from '../../tools/linestandard/standard';
import { heading, label, SIZE, text } from './blocks';
import type { Block } from './flow';

export interface WorksheetEvidence { phase: string; title: string; at?: number; details: string[] }

/** The customer report has already selected the phase, numbered repeat runs and approved the Line Talk documents. */
export function worksheetEvidence(report: MethodReport, standards: readonly Standard[]): WorksheetEvidence[] {
  const items = report.sections.find(section => section.id === 'telling')?.items ?? [];
  const findings = new Map(report.dash.findings.map(f => [f.id, f]));
  const out: WorksheetEvidence[] = [];
  for (const item of items) {
    if (item.kind === 'tool') out.push({
      phase: item.section, title: [item.title, item.run].filter(Boolean).join(' · '), at: findings.get(item.id)?.at,
      details: [item.says, ...item.notes.map(note => note.text)],
    });
    if (item.kind === 'talkDocument') out.push({ phase: item.phase, title: item.report.doc.title, details: itemLines(item).slice(1) });
  }
  const byId = new Map(standards.map(s => [s.id, s]));
  for (const row of report.dash.standards) {
    const standard = byId.get(row.id);
    if (!standard) continue;
    out.push({ phase: row.section, title: row.tool + ' — ' + row.title, at: standard.updatedAt, details: [
      ...(standard.capacity?.stations.length ? [capacitySays(standard.capacity).text] : []),
      ...peopleOf(standard).map(person => (person.label || 'Operator') + ' — ' + (person.task?.trim() || 'Task unrecorded')),
      ...(standard.note?.trim() ? [standard.note] : []),
    ] });
  }
  return out;
}

/** Each cycle or experiment retains its own written result. The shared tool evidence follows those rows. */
export function phaseEvidenceBlocks(evidence: readonly WorksheetEvidence[] = []): Block[] {
  if (!evidence.length) return [];
  const blocks = [heading('Tool evidence by phase')];
  const groups = new Map<string, WorksheetEvidence[]>();
  for (const record of evidence) {
    const group = groups.get(record.phase) ?? [];
    group.push(record);
    groups.set(record.phase, group);
  }
  for (const [phase, records] of groups) {
    blocks.push(label(phase));
    for (const record of records) {
      const when = record.at ? ' · ' + niceDay(isoDay(record.at), { year: true }) : '';
      blocks.push(text({ text: record.title + when, size: SIZE.small, style: 'bold', after: 2 }));
      for (const detail of record.details) blocks.push(text({ text: detail, size: SIZE.small, after: 4 }));
    }
  }
  return blocks;
}
