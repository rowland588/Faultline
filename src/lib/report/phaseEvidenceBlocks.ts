import type { DashFinding } from '../methodDashboard';
import { isoDay, niceDay } from '../weeks';
import { heading, label, SIZE, text } from './blocks';
import type { Block } from './flow';

/** A tool run belongs to a phase or to the project. Cycles and experiment rows have their own written results. */
export function phaseEvidenceBlocks(findings: readonly DashFinding[] = []): Block[] {
  if (!findings.length) return [];
  const blocks = [heading('Tool evidence by phase')];
  const groups = new Map<string, DashFinding[]>();
  for (const finding of findings) {
    const group = groups.get(finding.section) ?? [];
    group.push(finding);
    groups.set(finding.section, group);
  }
  for (const [section, group] of groups) {
    blocks.push(label(section));
    for (const finding of group) {
      const when = finding.at ? ' · ' + niceDay(isoDay(finding.at), { year: true }) : '';
      blocks.push(text({ text: finding.title + when, size: SIZE.small, style: 'bold', after: 2 }));
      blocks.push(text({ text: finding.tool + ' — ' + finding.says, size: SIZE.small, after: 4 }));
      for (const note of finding.notes) blocks.push(text({ text: note.text, size: SIZE.small, indent: 10, after: 2 }));
    }
  }
  return blocks;
}
