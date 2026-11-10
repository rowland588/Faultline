/* THE LIVE EXAM, RUN (docs/LUNA-NEXT.md L6): each question asked of Luna in one exam conversation (a real one, kept and openable, named
 * "Luna's exam — <day>"), through the same loop AI Mode asks by (colleague/colleagueAsk colleagueLoop) — every write declined, so the
 * exam changes nothing — her reply kept as a turn, graded by code (exam/bank grade) against the answer the exam worked out from the
 * records. The score is kept on the conversation with the day. It spends the person's AI allowance, so it is only ever run by them. */
import { getStudy, patchStudy, putStudy } from '../../db';
import { uid } from '../../lib/ids';
import type { ToolStudy } from '../../lib/study';
import { capabilityByName, runCall } from '../../capabilities/registry';
import type { CapCtx } from '../../capabilities/types';
import { colleagueLoop, invokeColleague, type Prepared } from '../colleagueAsk';
import { appendTurn, changeTurn, factsOfConversation, focusText, gatewayTurns, newConversation, turnsOfConversation } from '../conversation';
import { outputsOfConversation, outputsText } from '../../capabilities/data';
import { grade, scoreSaid, type Exam, type Graded } from './bank';

export interface ExamRun { at: number; line: string; score: string; right: number; of: number; results: (Graded & { ask: string; worked: string; reply: string })[] }
export type ExamFacts = { exam?: ExamRun };

export async function runExam(exam: Exam, o: { ctx: () => Omit<CapCtx, 'conversationId'>; today: string; onProgress?: (done: number, of: number, last?: Graded) => void; stop?: () => boolean }): Promise<{ conversationId: string; run: ExamRun }> {
  const at = Date.now();
  const cid = uid();
  await putStudy(newConversation({ id: cid, at, name: `Luna’s exam — ${new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`, thread: { id: uid(), title: `The exam on ${exam.line.name}`, scope: { lineId: exam.line.id } } }));
  await patchStudy(cid, cur => ({ workspaceId: exam.line.id, facts: { ...cur.facts, named: `Luna’s exam — ${exam.line.name}` } as ToolStudy['facts'] }));
  const ctx = (): CapCtx => ({ ...o.ctx(), now: Date.now(), conversationId: cid });
  const results: ExamRun['results'] = [];
  for (const q of exam.questions) {
    if (o.stop?.()) break;
    await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: 'You', kind: 'typed', text: q.ask });
    const rid = uid();
    await appendTurn(patchStudy, cid, { id: rid, at: Date.now() + 1, who: 'Faultline', kind: 'reply', answering: 'waiting', used: [] });
    const turns = turnsOfConversation(factsOfConversation((await getStudy(cid)) as ToolStudy)).filter(t => t.id !== rid);
    const end = await colleagueLoop({
      turns: gatewayTurns(turns, new Map()),
      focus: async () => { const f = factsOfConversation((await getStudy(cid)) as ToolStudy); return focusText(f.threads ?? [], { outputs: outputsText(outputsOfConversation({ facts: f } as ToolStudy)) }); },
      today: o.today, conversationId: cid,
    }, {
      invoke: invokeColleague,
      describe: name => { const c = capabilityByName(name); return c ? { kind: c.kind, title: c.title } : undefined; },
      run: (call, confirmed) => runCall(ctx(), call, { confirmed }),
      prepare: async (call): Promise<Prepared> => { const c = capabilityByName(call.name); return c ? { ok: true, title: c.title, preview: 'The exam changes nothing — declined.', input: {} } : { ok: false, title: call.name, why: 'No such step.' }; },
      /* the exam writes nothing */
      confirm: async () => false,
      onStep: async () => undefined,
    });
    const reply = end.ok ? end.reply : end.reply ?? '';
    const g = end.ok ? grade(q, reply, { unsure: end.unsure }) : { id: q.id, pass: false, why: [end.why] };
    await changeTurn(patchStudy, cid, rid, t => { const { answering: _a, ...rest } = t; void _a; return { ...rest, text: reply || (end.ok ? 'Done.' : end.why), ...(end.ok && end.unsure.length ? { unsure: end.unsure } : {}), ...(end.ok && end.checked ? { checked: end.checked } : {}) }; });
    results.push({ ...g, ask: q.ask, worked: q.worked, reply });
    o.onProgress?.(results.length, exam.questions.length, g);
    if (!end.ok && end.off) break;
  }
  const run: ExamRun = { at, line: exam.line.name, score: scoreSaid(results), right: results.filter(r => r.pass).length, of: results.length, results };
  await patchStudy(cid, cur => ({ facts: { ...cur.facts, exam: run } as ToolStudy['facts'] }));
  return { conversationId: cid, run };
}
