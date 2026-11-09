/* THE SPAGHETTI DIAGRAM A TALK DRAWS — a spaghetti-set talk's walkers, live (docs/LINE-TALK-TOOLSETS.md §4.2; knowledge/specs/FC-242-spaghetti-walkers.md).
 *
 * The assistant only wrote down who went where; this is the spaghetti-walkers calculator's OWN page drawn from it — its sentence, tiles, picture and shared routes — so what
 * the person sees is what the tool will say and its paper will print. The walkers and places are editable here (the person's version is what the assistant builds on next);
 * nothing is kept as a tool record until Make it. No distance is ever supplied: a move with none is counted, and the picture says it is not to scale. */
import { useMemo } from 'react';
import { ResultView } from '../calc/CalcView';
import { runCalc } from '../calc/calc';
import spaghettiWalkers from '../calc/defs/spaghetti-walkers';
import { SPAG_STEPS_MAX, SPAG_WALKERS_MAX, type SpagCapture, type SpagCaptureStep, type SpagCaptureWalker } from './talkSets';
import { DraftNumber } from '../../ui/Draft';
import { MakeBar } from './TalkDiagram';

import { spagInputs } from './diagramRecord';
export { spagInputs };

export function TalkSpag({ capture, canEdit, madeId, busy, onEdit, onMake, onUpdate, onOpen }: {
  capture: SpagCapture;
  canEdit: boolean;
  madeId?: string;
  busy: boolean;
  onEdit: (c: SpagCapture) => void;
  onMake: () => void;
  onUpdate: () => void;
  onOpen: () => void;
}) {
  const { inputs } = useMemo(() => spagInputs(capture, 'this Line Talk'), [capture]);
  const run = useMemo(() => runCalc(spaghettiWalkers, inputs), [inputs]);
  const agreed = useMemo(() => ({ key: spaghettiWalkers.key, inputs }), [inputs]);
  const moves = capture.walkers.reduce((t, w) => t + Math.max(0, w.steps.length - 1), 0);
  const nW = capture.walkers.length;
  const setWalker = (k: number, f: (w: SpagCaptureWalker) => SpagCaptureWalker) => onEdit({ ...capture, walkers: capture.walkers.map((w, i) => (i === k ? f(w) : w)) });
  const setStep = (k: number, i: number, patch: Partial<SpagCaptureStep>, drop: (keyof SpagCaptureStep)[] = []) => setWalker(k, w => ({
    ...w,
    steps: w.steps.map((s, j) => {
      if (j !== i) return s;
      /* a person's edit is theirs: what was said beside it no longer describes it */
      const next: SpagCaptureStep = { ...s, ...patch };
      delete next.said;
      for (const d of drop) delete next[d];
      if (i === 0) delete next.m;
      return next;
    }),
  }));
  return (
    <section className="tk-diagram" data-diagram aria-label="The spaghetti diagram so far">
      <h2 className="ln-h">{capture.title || 'Spaghetti diagram'} <span className="sub">· {nW} walker{nW === 1 ? '' : 's'} · {moves} move{moves === 1 ? '' : 's'} so far</span></h2>
      {moves === 0
        ? <p className="sub tk-empty">Nothing to draw yet. Say who goes where — “Operator 1 goes to the film store, back to the line, to the case store” — one person at a time, place by place.</p>
        : <>
          <ResultView def={spaghettiWalkers} run={run} agreed={agreed} />
          <div className="tk-walkers" aria-label="The walkers, as said">
            {capture.walkers.map((w, k) => (
              <div key={k} className="tk-walker" data-walker={k}>
                {canEdit
                  ? <div className="tk-walker-h">
                    <input className="text-input tk-dstep-what" value={w.label} aria-label={`Walker ${k + 1} — who`} onChange={e => setWalker(k, x => ({ ...x, label: e.target.value }))} />
                    <button type="button" className="linkish" onClick={() => onEdit({ ...capture, walkers: capture.walkers.filter((_, j) => j !== k) })}>Take out</button>
                  </div>
                  : <b className="tk-walker-n">{w.label}</b>}
                <ol className="tk-dsteps" aria-label={`${w.label}'s places`}>
                  {w.steps.map((st, i) => (
                    <li key={i} className="tk-dstep" data-kind={i === 0 ? 'start' : 'move'}>
                      <span className="tk-dstep-n">{i + 1}</span>
                      {canEdit
                        ? <>
                          <input className="text-input tk-dstep-what" value={st.place} aria-label={`${w.label}: place ${i + 1}`} onChange={e => setStep(k, i, { place: e.target.value })} />
                          {i > 0 && <label className="tk-dstep-f">m <DraftNumber className="text-input cap-num" value={st.m} placeholder="—" label={`${w.label}: metres to place ${i + 1}`} onSave={v => setStep(k, i, v === undefined ? {} : { m: v }, v === undefined ? ['m'] : [])} /></label>}
                          <button type="button" className="linkish" onClick={() => setWalker(k, x => ({ ...x, steps: x.steps.filter((_, j) => j !== i) }))}>Take out</button>
                        </>
                        : <span>{st.place}{st.m !== undefined ? ` · ${st.m} m` : ''}</span>}
                      {st.said && <span className="sub tk-dstep-said"> said: {st.said}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          {(nW >= SPAG_WALKERS_MAX || capture.walkers.some(w => w.steps.length >= SPAG_STEPS_MAX)) && <p className="sub">A diagram holds {SPAG_WALKERS_MAX} walkers and {SPAG_STEPS_MAX} places each — more is a second diagram.</p>}
        </>}
      <MakeBar canEdit={canEdit && moves > 0} madeId={madeId} busy={busy} what="Spaghetti diagram" onMake={onMake} onUpdate={onUpdate} onOpen={onOpen} />
    </section>
  );
}
