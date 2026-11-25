import { answerOf, fieldsOf, methodAnswerItems } from '../../lib/methodSheet';
import type { ToolStudy } from '../../lib/study';
import type { TestItem } from '../../lib/testing';
import { dayWords, gatesOf, insertionsOf } from '../method/shapes/dmaicModel';

export interface RecoveryStory {
  statement: string;
  phases: { name: string; entries: { label: string; value: string }[] }[];
}

/** Read the same project notes as the DMAIC sheet. A review is printed only when someone recorded it. */
export function recoveryStory(projectId: string, notes: readonly TestItem[], studies: readonly ToolStudy[]): RecoveryStory {
  const answers: Record<string, string> = {};
  for (const note of methodAnswerItems(notes, projectId, 'dmaic').values()) {
    const field = answerOf(note.testId);
    if (field?.method === 'dmaic') answers[field.field] = note.what.trim();
  }

  const findings = insertionsOf(studies.filter(study => study.projectId === projectId));
  const phases = gatesOf(answers).flatMap(phase => {
    const entries = fieldsOf('dmaic', phase.name).flatMap(field => {
      const value = answers[field.id];
      return value ? [{ label: field.label, value }] : [];
    });
    for (const finding of findings) {
      if (finding.phase === phase.key && finding.says) entries.push({ label: finding.name || finding.toolName, value: finding.says });
    }
    const review = phase.review;
    const detail = [review.result && phase.state, review.who, review.when && dayWords(review.when), review.note].filter(Boolean).join(' · ');
    if (detail) entries.push({ label: 'Phase review', value: detail });
    return entries.length ? [{ name: phase.name, entries }] : [];
  });
  return { statement: answers.problem || '', phases };
}
