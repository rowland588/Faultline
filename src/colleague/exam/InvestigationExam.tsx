/* THE BAGGER INVESTIGATION EXAM, ON ITS PAGE (10 November, docs/LUNA-EXAM.md) — on Luna's exam page (#/ai/exam): what it asks turn by
 * turn and which hard scenario each is, Run it (the real Luna, the person's allowance — only they start it), each turn's marks as she
 * goes, the run kept with its score, and the scores so far. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { listAllStudies, onDataChange } from '../../db';
import { useSession } from '../../cloud/session';
import { nav } from '../../state/useRoute';
import { INVESTIGATION, runInvestigation, type InvestigationFacts, type InvestigationRun, type TurnRun } from './investigation';

const longDay = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function InvestigationExam() {
  const { session } = useSession();
  const [busy, setBusy] = useState<{ done: number; of: number; turns: TurnRun[] } | null>(null);
  const [last, setLast] = useState<{ conversationId: string; run: InvestigationRun } | null>(null);
  const [runs, setRuns] = useState<{ id: string; run: InvestigationRun }[]>([]);
  const stop = useRef(false);
  const load = useCallback(async () => {
    setRuns((await listAllStudies()).filter(s => !s.deletedAt && (s.facts as InvestigationFacts).investigationExam).map(s => ({ id: s.id, run: (s.facts as InvestigationFacts).investigationExam as InvestigationRun })).sort((a, b) => b.run.at - a.run.at));
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const start = async () => {
    stop.current = false;
    setBusy({ done: 0, of: INVESTIGATION.length, turns: [] });
    try {
      const r = await runInvestigation({ ctx: () => ({ now: Date.now(), ...(session?.user.email ? { email: session.user.email } : {}), ...(session?.user.id ? { userId: session.user.id } : {}) }), today: longDay(), stop: () => stop.current,
        onProgress: (done, of, t) => setBusy(b => ({ done, of, turns: [...(b?.turns ?? []), ...(t ? [t] : [])] })) });
      setLast(r);
    } finally { setBusy(null); }
  };
  const shown = busy?.turns ?? last?.run.turns ?? [];
  return (
    <section className="card exam-run inv-exam" data-inv-exam>
      <h2 className="h3">The bagger investigation</h2>
      <p className="sub">One investigation said to the real Luna, turn by turn — the deployed Luna, the same steps and rules as AI Mode, on two practice lines of its own (Exam Line A and Exam Line B, client “Exam practice”). It says yes to the cards a person would and no to every other, then marks what she actually did by code. It spends your AI allowance and writes on the practice lines only.</p>
      {busy
        ? <p data-inv-busy>Turn {Math.min(busy.done + 1, busy.of)} of {busy.of}… <button type="button" className="linkish" onClick={() => { stop.current = true; }}>Stop after this one</button></p>
        : <button type="button" className="btn btn-primary" data-inv-start onClick={() => void start()}>Run the investigation</button>}
      {!shown.length && (
        <ol className="exam-qs" data-inv-plan>
          {INVESTIGATION.map(t => <li key={t.id} data-inv-turn={t.id}><span className="sub">{t.scenario}{t.nextDay ? ' — a new conversation' : ''}</span><br /><b>“{t.say}”</b></li>)}
        </ol>
      )}
      {shown.length > 0 && (
        <ol className="exam-res inv-res" data-inv-result>
          {shown.map(t => (
            <li key={t.id} className={t.pass ? 'is-g' : 'is-r'} data-inv-mark={t.pass ? 'right' : 'wrong'} data-inv-id={t.id}>
              <span className="sub">{t.scenario}</span><br /><b>“{t.say}”</b>
              <p className="inv-reply">{t.reply || '(no reply)'}</p>
              <p className="sub">Steps: {t.steps.length ? t.steps.map(s => `${s.name} — ${s.status}${s.auto ? ', no card' : ''}`).join(' · ') : 'none'}</p>
              <ul className="inv-marks">{t.marks.map((m, i) => <li key={i} className={m.pass ? 'is-g' : 'is-r'}><b>{m.pass ? 'Right' : 'Wrong'}</b> — {m.what}: <span className="sub">{m.said}</span></li>)}</ul>
            </li>
          ))}
        </ol>
      )}
      {last && <p><b data-inv-score>{last.run.score}</b> <button type="button" className="b ghost" onClick={() => nav(`/ai?c=${encodeURIComponent(last.conversationId)}`)}>Open the exam conversation</button></p>}
      <h3 className="h3">Scores so far</h3>
      {runs.length
        ? <ul className="exam-hist" data-inv-history>{runs.map(x => <li key={x.id}><b>{x.run.score}</b> · {new Date(x.run.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</li>)}</ul>
        : <p className="sub">Not run yet.</p>}
    </section>
  );
}
