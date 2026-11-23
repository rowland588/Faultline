/* Hand a parked job to the server when the app goes out of sight (23 November 2026, docs/LUNA-G6-SERVER.md). */
import { getStudy, patchStudy } from '../db/studies';
import type { ToolStudy } from '../lib/study';
import { jobOpen } from './job';
import { factsOfConversation, gatewayTurns, type Thread } from './conversation';
import { enqueueServerJob } from './serverJobClient';

/** Mark the thread parked with handToServer and queue a row — only when the job is still open. */
export async function handOpenJobToServer(
  studyId: string,
  thread: Thread | undefined,
  focus: string,
  today: string,
  client: string,
  preferences: string | undefined,
  labels: ReadonlyMap<string, string>,
): Promise<string | undefined> {
  if (!thread?.job || !jobOpen(thread.job)) return undefined;
  const study = await getStudy(studyId) as ToolStudy | undefined;
  if (!study) return undefined;
  const facts = factsOfConversation(study);
  const parked = (facts.threads ?? []).map(t =>
    t.id === thread.id
      ? { ...t, status: 'parked' as const, handToServer: true, at: Date.now() }
      : t.status === 'current' && t.id !== thread.id
        ? { ...t, status: 'parked' as const, at: Date.now() }
        : t);
  await patchStudy(studyId, cur => {
    const f = factsOfConversation(cur);
    return { facts: { ...cur.facts, ...f, threads: parked }, updatedAt: Date.now() };
  });
  const handed = parked.find(t => t.id === thread.id);
  if (!handed) return undefined;
  return enqueueServerJob({
    turns: gatewayTurns(facts.turns ?? [], labels),
    focus,
    today,
    conversationId: studyId,
    thread: handed,
    client,
    preferences,
  });
}