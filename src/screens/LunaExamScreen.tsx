/* LUNA'S EXAM (10 November, docs/LUNA-NEXT.md L6 — "'Smarter' should be measured, not claimed"): the questions the exam would ask of
 * the line with most to ask about, each with the answer the exam worked out from the records; Run the exam (it spends the person's AI
 * allowance, so only they start it) asks each of Luna in an exam conversation and marks her answer by code; the scores so far with
 * their day. Nothing is written but the exam conversation itself. Reached from How AI Mode is used (#/ai/usage) and at #/ai/exam. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listAllSnags, listAllStudies, listObservations, onDataChange } from '../db';
import { useSession } from '../cloud/session';
import { useFactoryLines } from '../lib/useFactoryLines';
import { nav } from '../state/useRoute';
import { PageHeader } from '../ui/parts';
import { buildExam, examLine, type Exam, type Graded } from '../colleague/exam/bank';
import { runExam, type ExamFacts, type ExamRun } from '../colleague/exam/run';
import type { Observation } from '../types';
import type { Snag } from '../snag/types';
import { InvestigationExam } from '../colleague/exam/InvestigationExam';

const longDay = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function LunaExamScreen() {
  const { session } = useSession();
  const lines = useFactoryLines();
  const [obs, setObs] = useState<Observation[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [runs, setRuns] = useState<{ id: string; run: ExamRun }[]>([]);
  const [busy, setBusy] = useState<{ done: number; of: number; last?: Graded } | null>(null);
  const [last, setLast] = useState<{ conversationId: string; run: ExamRun } | null>(null);
  const stop = useRef(false);
  const load = useCallback(async () => {
    const all = (await Promise.all(lines.map(l => listObservations(l.id)))).flat();
    setObs(all);
    setSnags(await listAllSnags() as unknown as Snag[]);
    setRuns((await listAllStudies()).filter(s => !s.deletedAt && (s.facts as ExamFacts).exam).map(s => ({ id: s.id, run: (s.facts as ExamFacts).exam as ExamRun })).sort((a, b) => b.run.at - a.run.at));
  }, [lines]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const line = useMemo(() => examLine(lines, obs), [lines, obs]);
  const exam: Exam | undefined = useMemo(() => (line ? buildExam(line, obs, snags) : undefined), [line, obs, snags]);
  const start = async () => {
    if (!exam) return;
    stop.current = false;
    setBusy({ done: 0, of: exam.questions.length });
    try {
      const r = await runExam(exam, { ctx: () => ({ now: Date.now(), ...(session?.user.email ? { email: session.user.email } : {}), ...(session?.user.id ? { userId: session.user.id } : {}) }), today: longDay(), onProgress: (done, of, g) => setBusy({ done, of, ...(g ? { last: g } : {}) }), stop: () => stop.current });
      setLast(r);
    } finally { setBusy(null); }
  };
  const says = exam
    ? `${exam.questions.length} questions about ${exam.line.name}, the week ${exam.from} to ${exam.to} and the week before — each answer worked out from the records, never by Luna. Her answers are marked by code: the right figure, the right words, and no figure resting on nothing.`
    : 'The exam needs a line with at least two timed stops to ask about — time some stops on a line first.';
  return (
    <main className="page exam-page" data-exam>
      <PageHeader eyebrow="AI MODE" title="Luna’s exam" says={says} back={{ label: 'AI Mode', to: '/ai' }}
        more={[{ label: 'How AI Mode is used', run: () => nav('/ai/usage') }]} />
      {exam && (
        <section className="card exam-run" data-exam-run>
          <p className="sub">Running it asks Luna {exam.questions.length} questions, one after another, and spends your AI allowance for the day. It changes nothing: every change she proposes is declined, and the exam is kept as a conversation of its own.</p>
          {busy
            ? <p data-exam-busy>Asking question {Math.min(busy.done + 1, busy.of)} of {busy.of}…{busy.last ? ` The last was ${busy.last.pass ? 'right' : 'wrong'}.` : ''} <button type="button" className="linkish" onClick={() => { stop.current = true; }}>Stop after this one</button></p>
            : <button type="button" className="b" data-exam-start onClick={() => void start()}>Run the exam</button>}
          <ol className="exam-qs">
            {exam.questions.map(q => <li key={q.id} data-exam-q={q.id}><b>{q.ask}</b><span className="sub"> The answer: {q.worked}</span></li>)}
          </ol>
        </section>
      )}
      {last && (
        <section className="card" data-exam-result>
          <h2 className="h3">{last.run.score} — {last.run.line}</h2>
          <ul className="exam-res">
            {last.run.results.map(r => (
              <li key={r.id} className={r.pass ? 'is-g' : 'is-r'} data-exam-mark={r.pass ? 'right' : 'wrong'}>
                <b>{r.pass ? 'Right' : 'Wrong'}</b> — {r.ask}
                {!r.pass && <span className="sub"> {r.why.join(' ')}</span>}
              </li>
            ))}
          </ul>
          <button type="button" className="b ghost" onClick={() => nav(`/ai?c=${encodeURIComponent(last.conversationId)}`)}>Open the exam conversation</button>
        </section>
      )}
      <InvestigationExam />
      <section className="card" data-exam-history>
        <h2 className="h3">Scores so far</h2>
        {runs.length
          ? <ul className="exam-hist">{runs.map(x => <li key={x.id}><b>{x.run.score}</b> on {x.run.line} · {new Date(x.run.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</li>)}</ul>
          : <p className="sub">No exam run yet. A score kept here with its day is how a change to Luna is shown to be better, never just said.</p>}
      </section>
    </main>
  );
}
