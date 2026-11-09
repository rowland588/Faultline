/* THE DIAGRAM A TALK DRAWS — a flow-diagram talk's chart, live (docs/LINE-TALK-TOOLSETS.md; knowledge/specs/FC-202-toolsets.md).
 *
 * The assistant only wrote down what was said; this is the process flow chart's OWN page drawn from it — the calculator's result,
 * its chart, its tiles and sentence — so what the person sees is what the tool will say and what its paper will print. The steps are
 * editable here (the person's version is what the assistant builds on next); nothing is kept as a tool record until Make it. */
import { useMemo } from 'react';
import { ResultView } from '../calc/CalcView';
import { runCalc } from '../calc/calc';
import processFlow from '../calc/defs/process-flow';
import { FLOW_KINDS, FLOW_WORD } from '../flow/processFlow';
import { FLOW_STEPS_MAX, type FlowCapture, type FlowCaptureStep } from './talkSets';
import { DraftNumber } from '../../ui/Draft';

import { flowInputs } from './diagramRecord';
export { flowInputs };

export function TalkDiagram({ capture, canEdit, madeId, busy, onEdit, onMake, onUpdate, onOpen }: {
  capture: FlowCapture;
  canEdit: boolean;
  /** The tool record this talk already made, if any. */
  madeId?: string;
  busy: boolean;
  onEdit: (c: FlowCapture) => void;
  onMake: () => void;
  onUpdate: () => void;
  onOpen: () => void;
}) {
  const { inputs } = useMemo(() => flowInputs(capture, 'this Line Talk'), [capture]);
  const run = useMemo(() => runCalc(processFlow, inputs), [inputs]);
  const agreed = useMemo(() => ({ key: processFlow.key, inputs }), [inputs]);
  const set = (i: number, patch: Partial<FlowCaptureStep>, drop: (keyof FlowCaptureStep)[] = []) => onEdit({
    ...capture,
    steps: capture.steps.map((s, k) => {
      if (k !== i) return s;
      const next: FlowCaptureStep = { ...s, ...patch };
      /* a person's edit is theirs: what was said beside it no longer describes it */
      delete next.said;
      for (const d of drop) delete next[d];
      if (next.kind !== 'transport') delete next.m;
      return next;
    }),
  });
  const n = capture.steps.length;
  return (
    <section className="tk-diagram" data-diagram aria-label="The flow diagram so far">
      <h2 className="ln-h">{capture.title || 'Flow diagram'} <span className="sub">· {n} step{n === 1 ? '' : 's'} so far</span></h2>
      {n === 0
        ? <p className="sub tk-empty">Nothing to draw yet. Say the first step of the path — what happens, and whether it changes the thing, moves it, checks it, makes it wait or stores it.</p>
        : <>
          <ResultView def={processFlow} run={run} agreed={agreed} />
          <ol className="tk-dsteps" aria-label="The steps, as said">
            {capture.steps.map((st, i) => (
              <li key={i} className="tk-dstep" data-kind={st.kind}>
                <span className="tk-dstep-n">{i + 1}</span>
                {canEdit
                  ? <>
                    <input className="text-input tk-dstep-what" value={st.what} aria-label={`Step ${i + 1} — what happens`} onChange={e => set(i, { what: e.target.value })} />
                    <select className="text-input" value={st.kind} aria-label={`Step ${i + 1} is a`} onChange={e => set(i, { kind: e.target.value as FlowCaptureStep['kind'] })}>
                      {FLOW_KINDS.map(k => <option key={k} value={k}>{FLOW_WORD[k].name}</option>)}
                    </select>
                    <label className="tk-dstep-f">min <DraftNumber className="text-input cap-num" value={st.min} placeholder="—" label={`Step ${i + 1} minutes`} onSave={v => set(i, v === undefined ? {} : { min: v }, v === undefined ? ['min'] : [])} /></label>
                    {st.kind === 'transport' && <label className="tk-dstep-f">m <DraftNumber className="text-input cap-num" value={st.m} placeholder="—" label={`Step ${i + 1} metres`} onSave={v => set(i, v === undefined ? {} : { m: v }, v === undefined ? ['m'] : [])} /></label>}
                    <button type="button" className="linkish" onClick={() => onEdit({ ...capture, steps: capture.steps.filter((_, k) => k !== i) })}>Take out</button>
                  </>
                  : <span>{st.what} · {FLOW_WORD[st.kind].name}{st.min !== undefined ? ` · ${st.min} min` : ''}{st.m !== undefined ? ` · ${st.m} m` : ''}</span>}
                {st.said && <span className="sub tk-dstep-said"> said: {st.said}</span>}
              </li>
            ))}
          </ol>
          {n >= FLOW_STEPS_MAX && <p className="sub">A chart holds {FLOW_STEPS_MAX} steps — a longer path is a second chart.</p>}
        </>}
      <MakeBar canEdit={canEdit && n > 0} madeId={madeId} busy={busy} what="Process flow chart" onMake={onMake} onUpdate={onUpdate} onOpen={onOpen} />
    </section>
  );
}

/** Make it / Update it / Open it — the same three taps under every set's diagram (the tool's record is made on the talk's line, and one talk makes one). */
export function MakeBar({ canEdit, madeId, busy, what, onMake, onUpdate, onOpen }: { canEdit: boolean; madeId?: string; busy: boolean; what: string; onMake: () => void; onUpdate: () => void; onOpen: () => void }) {
  if (!canEdit) return null;
  return (
    <div className="tk-dmake" role="group" aria-label={`Make the ${what.toLowerCase()}`}>
      {madeId
        ? <>
          <button type="button" className="btn btn-primary" data-update disabled={busy} onClick={onUpdate}>Update it</button>
          <button type="button" className="btn btn-ghost" data-open-made onClick={onOpen}>Open it</button>
          <span className="sub">The {what} on this line is made from this talk — Update it carries your changes into that one record.</span>
        </>
        : <>
          <button type="button" className="btn btn-primary" data-make disabled={busy} onClick={onMake}>Make it</button>
          <span className="sub">Makes a {what} on this line from this diagram — with its figures, its page and its paper. You can keep talking and Update it.</span>
        </>}
    </div>
  );
}
