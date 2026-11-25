import { answerOf, fieldsOf, methodAnswerItems } from '../../lib/methodSheet';
import type { ToolStudy } from '../../lib/study';
import type { StudyContext } from '../../lib/studyLinks';
import type { TestItem } from '../../lib/testing';
import { dmaicEvidence, OTHER_DMAIC_EVIDENCE } from '../method/dmaicEvidence';
import { dayWords, gatesOf } from '../method/shapes/dmaicModel';

interface Entry { label: string; value: string }
export interface RecoveryStory {
  statement: string;
  phases: { name: string; entries: Entry[]; records: number }[];
}

export function recoveryRecordCount(n: number): string {
  return `${n} saved tool record${n === 1 ? '' : 's'}`;
}

/** Per-line papers include that line's records. Project-wide answers and reviews belong on the whole-project paper. */
export function recoveryStory(projectId: string, notes: readonly TestItem[], studies: readonly ToolStudy[],
  ctx: StudyContext = {}, workspaceId?: string): RecoveryStory {
  const ownNotes = notes.filter(note => note.projectId === projectId && !note.deletedAt);
  const answers: Record<string, string> = {};
  if (!workspaceId) for (const note of methodAnswerItems(ownNotes, projectId, 'dmaic').values()) {
    const field = answerOf(note.testId);
    if (field?.method === 'dmaic') answers[field.field] = note.what.trim();
  }

  const records = dmaicEvidence(projectId, ownNotes, studies, ctx, workspaceId);
  const phases = gatesOf(answers).flatMap(phase => {
    const entries = fieldsOf('dmaic', phase.name).flatMap(field => {
      const value = answers[field.id];
      return value ? [{ label: field.label, value }] : [];
    });
    const saved = records.filter(record => record.phase === phase.name);
    entries.push(...saved.map(({ label, value }) => ({ label, value })));
    const review = phase.review;
    const detail = [review.result && phase.state, review.who, review.when && dayWords(review.when), review.note].filter(Boolean).join(' · ');
    if (detail) entries.push({ label: 'Phase review', value: detail });
    return entries.length ? [{ name: phase.name as string, entries, records: saved.length }] : [];
  });
  const unplaced = records.filter(record => record.phase === OTHER_DMAIC_EVIDENCE);
  if (unplaced?.length) phases.push({ name: OTHER_DMAIC_EVIDENCE, entries: unplaced.map(({ label, value }) => ({ label, value })), records: unplaced.length });
  return { statement: answers.problem || '', phases };
}
