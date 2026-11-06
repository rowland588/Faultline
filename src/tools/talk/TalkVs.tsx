/* THE VALUE STREAM A TALK FILLS IN — a value-stream-set talk's map, live (docs/LINE-TALK-TOOLSETS.md §4.3; knowledge/specs/FC-202-toolsets.md criterion 10).
 *
 * The assistant only wrote down what was said; this is the Value stream tool's OWN grid and figures drawn from it — the swimlane grid, the value shares, the lead
 * time, the sentence — so what the person sees is what the tool will say and its paper will print. The steps are editable here (the person's version is what the
 * assistant builds on next); a step is classed VA · NE · NV only by the person, here or on the map; nothing is kept as a record until Make it. */
import { useMemo } from 'react';
import { ValueStreamGrid, KIND_WORD, VALUE_CODE, VALUE_WORD } from '../valuestream/ValueStream';
import { dur, flowFigures, flowSays, share, tapValue, valuesFor, withValue } from '../valuestream/steps';
import { DraftNumber } from '../../ui/Draft';
import { vsAgreed, vsFlow } from './vsMap';
import { VS_KINDS, VS_STEPS_MAX, type VsCapture, type VsCaptureStep } from './talkSets';
import { MakeBar } from './TalkDiagram';
import type { FlowStep } from '../../lib/study';

export function TalkVs({ capture, canEdit, madeId, busy, onEdit, onMake, onUpdate, onOpen }: {
  capture: VsCapture;
  canEdit: boolean;
  madeId?: string;
  busy: boolean;
  onEdit: (c: VsCapture) => void;
  onMake: () => void;
  onUpdate: () => void;
  onOpen: () => void;
}) {
  const a = useMemo(() => vsAgreed(capture), [capture]);
  const flow = useMemo(() => vsFlow(capture, [], true), [capture]);
  const f = useMemo(() => flowFigures(flow, a), [flow, a]);
  const said = useMemo(() => flowSays(f, a), [f, a]);
  const n = capture.steps.length;
  const setStep = (i: number, patch: Partial<VsCaptureStep>, drop: (keyof VsCaptureStep)[] = []) => onEdit({
    ...capture,
    steps: capture.steps.map((s, k) => {
      if (k !== i) return s;
      /* a person's edit is theirs: what was said beside it no longer describes it */
      const next: VsCaptureStep = { ...s, ...patch };
      delete next.said;
      for (const d of drop) delete next[d];
      /* a kind that cannot be marked as the value it was takes the mark off */
      if (next.value && !valuesFor(next.kind).includes(next.value)) delete next.value;
      return next;
    }),
  });
  const mark = (i: number, st: FlowStep, v: 'adds' | 'needed' | 'waste') => {
    const after = withValue(st, tapValue(st, v));
    setStep(i, {}, after.value ? [] : ['value']);
    if (after.value) setStep(i, { value: after.value });
  };
  return (
    <section className="tk-diagram" data-diagram aria-label="The value stream so far">
      <h2 className="ln-h">{capture.title || 'Value stream'} <span className="sub">· {n} step{n === 1 ? '' : 's'} so far{capture.supplier || capture.customer ? ` · ${capture.supplier || '…'} → ${capture.customer || '…'}` : ''}</span></h2>
      {n === 0
        ? <p className="sub tk-empty">Nothing on the map yet. Say the first step of the work — what is done, who does it, how long it takes and what it waits for — and the value stream map fills in.</p>
        : <>
          <div className="vs-cards" role="group" aria-label="Where the stream stands">
            <div className="vs-card2 is-adds"><span>Adds value</span><b>{dur(f.addsSec)}</b></div>
            <div className="vs-card2 is-needed"><span>Necessary</span><b>{dur(f.neededSec)}</b></div>
            <div className="vs-card2 is-waste"><span>Non-value adding</span><b>{dur(f.wasteSec)}</b></div>
            <div className="vs-card2"><span>% value added</span><b>{share(f.pce ?? 0)}</b></div>
            <div className="vs-card2 is-lead"><span>Lead time</span><b>{f.untimed ? '≥ ' : ''}{dur(f.leadSec)}</b></div>
            {f.unmarked > 0 && <div className="vs-card2 is-unmarked"><span>Not classified</span><b>{f.unmarked} step{f.unmarked === 1 ? '' : 's'}</b></div>}
          </div>
          <div className="ie-says">
            <p className="ie-say" data-vs-says>{said.text}</p>
            {said.lines.map(l => <p key={l} className="ie-say ie-cap is-n">{l}</p>)}
          </div>
          <ValueStreamGrid flow={flow} f={f} a={a} by="who" onOpen={() => undefined} />
          <ol className="tk-dsteps" aria-label="The steps, as said">
            {capture.steps.map((st, i) => {
              const fl = flow[i];
              return (
                <li key={i} className="tk-dstep tk-vstep" data-kind={st.kind} data-vstep={i}>
                  <span className="tk-dstep-n">{i + 1}</span>
                  {canEdit
                    ? <>
                      <input className="text-input tk-dstep-what" value={st.name} aria-label={`Step ${i + 1} — what is done`} onChange={e => setStep(i, { name: e.target.value })} />
                      <select className="text-input" value={st.kind} aria-label={`Step ${i + 1} is a`} onChange={e => setStep(i, { kind: e.target.value as VsCaptureStep['kind'] })}>
                        {VS_KINDS.map(k => <option key={k} value={k}>{KIND_WORD[k]}</option>)}
                      </select>
                      <input className="text-input" value={st.who.join(', ')} placeholder="Who" aria-label={`Step ${i + 1} — who`} onChange={e => setStep(i, { who: e.target.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 4) })} />
                      <input className="text-input" value={st.where} placeholder="Where" aria-label={`Step ${i + 1} — where`} onChange={e => setStep(i, { where: e.target.value })} />
                      <label className="tk-dstep-f">cycle s <DraftNumber className="text-input cap-num" value={st.cycleSec} placeholder="—" label={`Step ${i + 1} cycle seconds`} onSave={v => setStep(i, v === undefined ? {} : { cycleSec: v }, v === undefined ? ['cycleSec'] : [])} /></label>
                      <label className="tk-dstep-f">waits s <DraftNumber className="text-input cap-num" value={st.waitSec} placeholder="—" label={`Step ${i + 1} wait seconds`} onSave={v => setStep(i, v === undefined ? {} : { waitSec: v }, v === undefined ? ['waitSec'] : [])} /></label>
                      <span className="tk-vvalue" role="group" aria-label={`Step ${i + 1} value`}>
                        {valuesFor(st.kind).map(v => (
                          <button key={v} type="button" className={'chip' + (st.value === v ? ' on' : '')} aria-pressed={st.value === v} data-value={v} title={VALUE_WORD[v]} onClick={() => mark(i, fl, v)}>{VALUE_CODE[v]}</button>
                        ))}
                      </span>
                      <button type="button" className="linkish" onClick={() => onEdit({ ...capture, steps: capture.steps.filter((_, k) => k !== i) })}>Take out</button>
                    </>
                    : <span>{st.name} · {KIND_WORD[st.kind]}{st.who.length ? ` · ${st.who.join(', ')}` : ''}{st.where ? ` · ${st.where}` : ''}{st.cycleSec !== undefined ? ` · ${dur(st.cycleSec)}` : ''}{st.waitSec ? ` · waits ${dur(st.waitSec)}` : ''}{st.value ? ` · ${VALUE_CODE[st.value]}` : ''}</span>}
                  {st.said && <span className="sub tk-dstep-said"> said: {st.said}</span>}
                </li>
              );
            })}
          </ol>
          {n >= VS_STEPS_MAX && <p className="sub">A map holds {VS_STEPS_MAX} steps — a longer stream is a second map.</p>}
        </>}
      <MakeBar canEdit={canEdit && n > 0} madeId={madeId} busy={busy} what="Value stream map" onMake={onMake} onUpdate={onUpdate} onOpen={onOpen} />
    </section>
  );
}
