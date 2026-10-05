/* THE PARETO, AS A PANE — the left of the fishbone page on a laptop
 * (docs/SIXM.md, the working method). The bars ranked, the 80% line marked,
 * the vital few first; each bar opens its own problem, or starts one. Built
 * by the Pareto slice; this is the contract the fishbone page lays out.
 *
 * The sentence it lets the lead say to the sponsor: "these are the losses
 * that make most of the lost time, each has its own problem, and this is
 * where each one is" — and, for a small loss, "that one we just did".
 *
 * Read from the same place the Pareto screen reads (lib/paretoFromLog
 * useProjectPareto, lib/paretoView) and acting through the same rules
 * (lib/paretoPicks), so the screen and the pane never disagree about which
 * bars are the vital few or what a bar does. Writes nothing of its own: a
 * problem is a Case (useProblems().create), a "Just do it" is an action on
 * the board (ui/ActionSheet). */
import { useMemo, useState } from 'react';
import type { Case } from '../types';
import { useAccess } from '../cloud/access';
import { useProjectPareto } from '../lib/paretoFromLog';
import { paretoView, moveSentence, type ParetoMove } from '../lib/paretoView';
import { useProblems } from '../lib/useProblems';
import { usePaceLines } from '../lib/usePaceLines';
import { PHASE_WORD } from '../lib/problems';
import { WHY_CHOICES, WHY_QUESTION, justDoItStep, lineOfBar, openBarProblem, pickOf, problemOfBar, vitalWords } from '../lib/paretoPicks';
import { phaseTone, problemTitleOfBar, sameSource } from '../screens/FishboneScreen';
import { uid } from '../lib/ids';
import { Sheet, SheetRow } from './Sheet';
import { ActionSheet, type Editing } from './ActionSheet';

export interface ParetoPaneProps {
  projectId: string;
  /** The line the page is on; undefined = the whole project. */
  lineId?: string;
  /** The problem open on the page — its bar is drawn as the one selected. */
  selected?: Case;
  /** A bar's problem, opened or just created: the page shows it. */
  onOpen: (problemId: string) => void;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const mins = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-GB') : String(Math.round(n * 10) / 10));

/** "WHY DOES THIS ONE EARN A ROOT CAUSE?" — asked before a bar outside the
 *  vital few is opened as a problem. Quick choices, or typed; the answer is
 *  kept on the problem as Case.source.why. Shared with the Pareto screen. */
export function RootReasonSheet({ category, onPick, onClose }: {
  category: string; onPick: (why: string) => void; onClose: () => void;
}) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const go = () => { if (text.trim()) onPick(text.trim()); };
  return (
    <Sheet open onClose={onClose} title={WHY_QUESTION}>
      <p className="sub prp-why-lede">
        <b>{category}</b> is outside the vital few — a small loss usually wants doing, not a fishbone.
        Say what makes it worth one; the reason is kept on the problem.
      </p>
      {WHY_CHOICES.map(w => <SheetRow key={w} label={w} onClick={() => onPick(w)} />)}
      {!typing
        ? <SheetRow label="Something else: type it" onClick={() => setTyping(true)} />
        : (
          <div className="prp-why-type">
            <label className="cw-f cw-f-wide"><span>THE REASON</span>
              <input autoFocus value={text} placeholder="e.g. the customer complained"
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') go(); }} /></label>
            <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={go}>Find the root cause</button>
          </div>
        )}
    </Sheet>
  );
}

export function ParetoPane({ projectId, lineId, selected, onOpen }: ParetoPaneProps) {
  const pareto = useProjectPareto(projectId, undefined, lineId);
  const view = useMemo(() => (pareto.now ? paretoView(pareto.now, pareto.before) : null), [pareto.now, pareto.before]);
  const { lines } = usePaceLines(projectId);
  const problems = useProblems(projectId);
  const can = useAccess(projectId);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<ParetoMove | null>(null);
  const [action, setAction] = useState<Editing | null>(null);

  const fixedLine = lineId ? lines.find(l => l.id === lineId) : undefined;
  const lineFor = (m: ParetoMove) => fixedLine ?? (lineId ? undefined : lineOfBar(m, lines));
  const problemFor = (m: ParetoMove) => problemOfBar(problems.problems, m.category, lineFor(m)?.id ?? lineId);
  const isSelected = (m: ParetoMove) => !!selected && selected.source?.kind === 'pareto'
    && selected.source.category === m.category && (selected.lineId ?? '') === (lineFor(m)?.id ?? lineId ?? '');

  const start = async (m: ParetoMove, why?: string) => {
    if (busy || !can.edit) return;
    setBusy(true);
    try {
      const c = await openBarProblem({
        category: m.category, line: lineFor(m), problems: problems.problems, create: problems.create,
        why, title: problemTitleOfBar, same: sameSource,
      });
      onOpen(c.id);
    } finally { setBusy(false); }
  };
  const justDoIt = (m: ParetoMove) => {
    if (!can.edit) return;
    setAction({ isNew: true, step: justDoItStep(m, { projectId, lineId: lineFor(m)?.id ?? lineId, id: uid(), now: Date.now() }) });
  };

  if (pareto.loading) return <section className="prp" aria-label="Pareto"><p className="sub">Loading…</p></section>;

  const where = fixedLine?.name ?? (lineId ? 'This line' : 'Every line');
  if (!view) {
    return (
      <section className="prp" aria-label="Pareto">
        <h2 className="prp-t">Where the time goes</h2>
        <p className="sub prp-empty">Nothing timed on {fixedLine?.name ?? 'the line'} in the last four weeks — the stops timed on the floor rank themselves here.</p>
      </section>
    );
  }

  const live = view.rows.filter(r => r.verdict !== 'gone');
  const gone = view.rows.filter(r => r.verdict === 'gone');
  const vital = live.filter(r => r.vital);
  const rest = live.filter(r => !r.vital);
  const max = live[0]?.mins ?? 0;
  const w = vitalWords(view, true);

  const bar = (m: ParetoMove) => (
    <>
      <span className="prp-row1">
        <span className="prp-cat">{m.category}</span>
        <span className="prp-min"><b>{mins(m.mins)}</b> min · {pct(m.share)}</span>
      </span>
      <span className="prp-track" aria-hidden><span className="prp-fill" style={{ width: `${max > 0 ? (m.mins / max) * 100 : 0}%` }} /></span>
    </>
  );
  const phase = (p: ReturnType<typeof problemFor>) =>
    p && <span className={'fj-phase is-' + phaseTone(p.phase)}>{PHASE_WORD[p.phase]}</span>;

  return (
    <section className="prp" aria-label="Pareto">
      <header className="prp-h">
        <h2 className="prp-t">Where the time goes</h2>
        <p className="prp-sub">{where} · last four weeks · {mins(view.totalMins)} min over {view.totalStops} stops</p>
      </header>
      <p className="prp-vital"><b>{w.count}</b>{w.of}<b>{w.share}</b>{w.tail}</p>

      <ol className="prp-bars">
        {vital.map(m => {
          const p = problemFor(m);
          const sel = isSelected(m);
          const go = p ? () => onOpen(p.problem.id) : can.edit && pickOf(m) ? () => void start(m) : undefined;
          return (
            <li key={m.category} className={'prp-bar is-vital' + (sel ? ' is-sel' : '')} aria-current={sel ? 'true' : undefined}>
              {go
                ? <button type="button" className="prp-go" onClick={go} disabled={busy && !p}>
                    {bar(m)}
                    <span className="prp-state"><span className="prp-tag">Vital few</span>
                      {p ? <>{phase(p)}<span className="prp-open">{sel ? 'Open now' : 'Open it ›'}</span></>
                        : <span className="prp-press">Find the root cause ›</span>}</span>
                  </button>
                : <div className="prp-go is-still">
                    {bar(m)}
                    <span className="prp-state"><span className="prp-tag">Vital few</span><span className="sub">no problem opened yet</span></span>
                  </div>}
            </li>
          );
        })}
        <li className="prp-cut" role="presentation"><span>80% of the lost time — the vital few above, each its own problem</span></li>
        {rest.map(m => {
          const p = problemFor(m);
          const sel = isSelected(m);
          return (
            <li key={m.category} className={'prp-bar' + (sel ? ' is-sel' : '')} aria-current={sel ? 'true' : undefined}>
              {p
                ? <button type="button" className="prp-go" onClick={() => onOpen(p.problem.id)}>
                    {bar(m)}
                    <span className="prp-state">{phase(p)}
                      {p.problem.source?.why && <span className="sub">Why a root cause: {p.problem.source.why}</span>}
                      <span className="prp-open">{sel ? 'Open now' : 'Open it ›'}</span></span>
                  </button>
                : <div className="prp-go is-still">
                    {bar(m)}
                    {can.edit && pickOf(m) && (
                      <span className="prp-acts">
                        <button type="button" className="prp-just" onClick={() => justDoIt(m)}>Just do it ›</button>
                        <button type="button" className="prp-quiet" disabled={busy} onClick={() => setAsking(m)}>Find the root cause</button>
                      </span>
                    )}
                  </div>}
            </li>
          );
        })}
        {gone.map(m => (
          <li key={m.category} className="prp-bar is-gone">
            <div className="prp-go is-still"><span className="prp-row1"><span className="prp-cat">{m.category}</span><span className="prp-min">{moveSentence(m)}</span></span></div>
          </li>
        ))}
      </ol>

      {asking && (
        <RootReasonSheet category={asking.category} onClose={() => setAsking(null)}
          onPick={why => { const m = asking; setAsking(null); void start(m, why); }} />
      )}
      {action && <ActionSheet editing={action} lines={lines} onClose={() => setAction(null)} />}
    </section>
  );
}
