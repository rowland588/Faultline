/* WHAT HAPPENED TO THIS STAGE — the one panel the plan opens.
 *
 * Rowland: "There's the plan. Plans change. This is the reason why. This is
 * what happened. Look at the film. Look at the picture. It's now booked in as
 * a fix, and we've even agreed a date, or we haven't."
 *
 * Read off lib/story: each move with its reason, the film and the pictures;
 * anything else found on it; and each fix with its agreed date, or none. In the
 * order it happened. One door on from here — the step itself.
 */
import { useState } from 'react';
import type { MediaRef } from '../types';
import { live, plannedEnd, type Test, type TestItem } from '../lib/testing';
import { storyOf } from '../lib/story';
import { daysBetween, niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';
import { EvidenceThumb, EvidenceViewer } from './Evidence';
import { useTesting } from '../lib/useTesting';
import { DatesForm } from './InstallGrid';
import { ProblemForm, recordMove, recordProblem } from './WhyMoved';
import { offerUndo } from './Undo';

export function StagePanel({ stepId, title, tests, items, projectId, onClose }: {
  stepId: string; title: string; tests: Test[]; items: TestItem[]; projectId: string; onClose: () => void;
}) {
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  /* WHAT YOU DO FROM HERE, without leaving the plan: move its dates (asked why
     when it is later) or say it hit a problem (asked whether it moves the
     finish). Rowland: "how does the date move from this?" */
  const tt = useTesting(projectId);
  const [doing, setDoing] = useState<'dates' | 'problem' | null>(null);
  const step = live(tt.loading ? tests : tt.tests).find(t => t.id === stepId);
  if (!step) return null;
  const st = storyOf(stepId, tt.loading ? tests : tt.tests, tt.loading ? items : tt.items);
  const end = plannedEnd(step);
  const slip = st.original && end ? daysBetween(st.original, end) : 0;
  const fixWord = (f: Test) => f.outcome === 'passed' ? `done${f.ranOn ? ` ${niceDay(f.ranOn)}` : ''}`
    : f.plannedFor ? `date agreed ${niceDay(f.plannedFor)}${f.plannedTo && f.plannedTo > f.plannedFor ? ` – ${niceDay(f.plannedTo)}` : ''}`
      : 'no date agreed yet';

  type Line = { on: string; key: string; node: React.ReactNode };
  const lines: Line[] = [
    ...st.moves.map(m => ({ on: m.on, key: m.id, node: (
      <>
        <span className="sp-k is-move">Moved</span>
        <p className="sp-t"><b>{niceDay(m.from)} → {niceDay(m.to)}</b> · +{m.days} day{m.days === 1 ? '' : 's'}</p>
        <p className="sp-why">{m.why}</p>
        {m.media.length > 0 && <span className="sp-ev">{m.media.map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
      </>
    ) })),
    ...st.found.map(f => ({ on: f.on, key: f.id, node: (
      <>
        <span className="sp-k is-found">Found</span>
        <p className="sp-why">{f.what}</p>
        {f.media.length > 0 && <span className="sp-ev">{f.media.map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
      </>
    ) })),
    ...st.fixes.map(f => ({ on: niceIso(f.createdAt), key: f.id, node: (
      <>
        <span className={'sp-k is-fix' + (f.outcome === 'passed' ? ' is-done' : !f.plannedFor ? ' is-open' : '')}>Fix</span>
        <p className="sp-t"><b>{f.title}</b> · {fixWord(f)}{f.withWhom ? ` · ${f.withWhom}` : ''}</p>
        {(f.media ?? []).length > 0 && <span className="sp-ev">{(f.media ?? []).map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(f.id)}`)}>Open the fix ›</button>
      </>
    ) })),
  ].sort((a, b) => a.on.localeCompare(b.on));

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="sp">
        <p className="sp-dates">
          {step.plannedFor ? <>Planned {niceDay(step.plannedFor)}{end && end > step.plannedFor ? ` – ${niceDay(end)}` : ''}</> : 'No dates yet'}
          {slip > 0 && <> · <b className="sp-slip">+{slip} day{slip === 1 ? '' : 's'}</b> past the finish first planned ({niceDay(st.original)})</>}
        </p>
        {lines.length === 0
          ? <p className="sub">Nothing has happened to this one yet — it is running to plan.</p>
          : (
            <ol className="sp-list">
              {lines.map(l => <li key={l.key}><span className="sp-on">{niceDay(l.on, { weekday: 'short' })}</span><div className="sp-body">{l.node}</div></li>)}
            </ol>
          )}
        {doing === 'dates' && (
          <DatesForm start={step.plannedFor} finish={step.plannedTo} was={plannedEnd(step)}
            onSave={(from, to) => {
              const before = { plannedFor: step.plannedFor, plannedTo: step.plannedTo };
              void tt.patchTest(step.id, { plannedFor: from, plannedTo: to });
              offerUndo(`${title} — dates changed`, () => tt.patchTest(step.id, before));
              setDoing(null);
            }}
            onMove={(from, to, a) => void (async () => {
              const before = { plannedFor: step.plannedFor, plannedTo: step.plannedTo };
              const was = plannedEnd(step) as string;
              await tt.patchTest(step.id, { plannedFor: from, plannedTo: to });
              const back = await recordMove(tt, [{ step, from: was, to: to ?? from }], a);
              offerUndo(`${title} moved to ${niceDay(to ?? from)} — reason kept`, async () => { await tt.patchTest(step.id, before); await back(); });
              setDoing(null);
            })()} />
        )}
        {doing === 'problem' && (
          <ProblemForm step={step} onCancel={() => setDoing(null)}
            onSave={a => { void recordProblem(tt, step, a, `${title} hit a problem${a.fix ? ', fix booked' : ''}`); setDoing(null); }} />
        )}
        {!doing && (
          <span className="sp-acts">
            <button type="button" className="btn btn-primary" onClick={() => setDoing('dates')}>Change the dates</button>
            <button type="button" className="btn ig-bad" onClick={() => setDoing('problem')}>Hit a problem</button>
            <button type="button" className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(stepId)}`)}>Open the step ›</button>
          </span>
        )}
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}

const niceIso = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
