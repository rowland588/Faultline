/* A CALCULATOR'S RESULT — the live answer beside its inputs (knowledge/specs/FC-235-calculators.md): the lean tiles each with
 * what changed since the saved before, the sentence and what else it says, the picture where the method earns one, the working,
 * the money (or the sentence saying what to add), what it does not say, a what-if that moves one box, and the saved before.
 * Everything comes from the definition's result; nothing is worked out here. */
import { useMemo, useState } from 'react';
import { LeanTiles } from '../../ui/Lean';
import type { AgreedCalc } from '../../lib/study';
import { niceDay, isoDay } from '../../lib/weeks';
import { askedFields, beforeRun, tilesSince, whatIf, type Run } from './calc';
import { CalcPictureView } from './CalcPicture';
import type { CalcDef, Field, Inputs } from './types';

/** A choice's label, a number as the box takes it. */
const valueSaid = (f: Field, x: string): string => (f.kind === 'choice' ? (f.options ?? []).find(o => o.value === x)?.label ?? x : x);

export function ResultView({ def, run, agreed }: { def: CalcDef; run: Run; agreed: AgreedCalc }) {
  const r = run.result;
  const before = useMemo(() => beforeRun(def, agreed), [def, agreed]);
  const tiles = useMemo(() => (r ? tilesSince(r.tiles, before?.result?.tiles) : []), [r, before]);
  const warns = run.problems.filter(p => !p.block);
  if (!r) return null;
  return (
    <div className="calc-result" aria-label="The answer">
      <LeanTiles tiles={tiles} className="ie-strip calc-tiles" />
      <div className="ie-says">
        <p className={'ie-say is-' + r.tone} data-calc="sentence">{r.sentence}</p>
        {(r.more ?? []).map((m, i) => <p key={i} className="sub ie-more">{m}</p>)}
      </div>
      {warns.length > 0 && (
        <div className="ie-checks" aria-label="Checks on the figures">
          <span className="ie-checks-h">Check these</span>
          {warns.map(w => <p key={w.say} className="ie-check is-a">{w.say}</p>)}
        </div>
      )}
      {r.picture && <div className="ie-pic calc-picbox"><CalcPictureView pic={r.picture} /></div>}
      <details className="calc-working" open>
        <summary>How it is worked out</summary>
        <table className="ie-tbl calc-working-t">
          <tbody>
            {r.working.map(w => (
              <tr key={w.label}><th scope="row">{w.label}</th><td>{w.value}{w.note ? <small>{w.note}</small> : null}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
      <div className="calc-money-out" aria-label="In money">
        <span className="ie-checks-h">In money</span>
        {r.money?.text && <p className="calc-money-say" data-calc="money">{r.money.text}</p>}
        {(r.money?.missing ?? []).map(m => <p key={m} className="sub calc-money-missing">{m}</p>)}
      </div>
      <div className="calc-caveats">
        <span className="ie-checks-h">What this does not say</span>
        <ul>{r.caveats.map(c => <li key={c} className="sub">{c}</li>)}</ul>
      </div>
    </div>
  );
}

/** A WHAT-IF — one box changed, the answer and the money beside the one now; nothing is saved until Make it so. */
export function WhatIf({ def, draft, run, canEdit, onMakeIt }: { def: CalcDef; draft: Inputs; run: Run; canEdit: boolean; onMakeIt: (id: string, value: string) => void }) {
  const fields = askedFields(def, run.values).filter(f => f.kind !== 'text');
  const [id, setId] = useState('');
  const [val, setVal] = useState('');
  const f = fields.find(x => x.id === id);
  const wi = useMemo(() => (f && val !== '' ? whatIf(def, draft, f.id, val) : undefined), [def, draft, f, val]);
  const now = run.result;
  const diff = useMemo(() => (wi?.result && now ? tilesSince(wi.result.tiles, now.tiles, 'now') : []), [wi, now]);
  if (!now) return null;
  return (
    <section className="calc-whatif" aria-label="What if">
      <h2 className="ln-h">What if…</h2>
      <p className="sub">Change one figure and see the answer and the money move. Nothing is kept until you say so.</p>
      <div className="calc-wi-pick">
        <label className="field"><span className="field-label">Change</span>
          <select className="text-input" value={id} aria-label="What if: which figure" onChange={e => { setId(e.target.value); setVal(''); }}>
            <option value="">Pick a figure…</option>
            {fields.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        {f && (
          <label className="field"><span className="field-label">To{f.unit ? ` (${f.unit})` : ''}</span>
            {f.kind === 'choice'
              ? <select className="text-input" value={val} aria-label="What if: the new figure" onChange={e => setVal(e.target.value)}><option value="">Choose…</option>{(f.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : <input className="text-input" inputMode="decimal" value={val} aria-label="What if: the new figure" onChange={e => setVal(e.target.value)} placeholder={String(draft[f.id] ?? '')} />}
          </label>
        )}
      </div>
      {!f && <p className="sub">Pick a figure, then type another for it.</p>}
      {f && val === '' && <p className="sub">Now: {draft[f.id] === undefined ? 'not given' : valueSaid(f, String(draft[f.id]))}. Type or choose another.</p>}
      {wi && !wi.result && <p className="ie-problem" role="status" data-calc="whatif-blocked">{wi.problems.find(p => p.block)?.say ?? 'That cannot be worked out.'}</p>}
      {wi?.result && f && (
        <div className="calc-wi-out" data-calc="whatif">
          <p className="calc-wi-head">If <b>{f.label}</b> were <b>{valueSaid(f, val)}{f.kind === 'number' && f.unit ? ` ${f.unit}` : ''}</b>: <b className={'ie-tone is-' + wi.result.tone}>{wi.result.verdict}</b></p>
          <p className={'ie-say is-' + wi.result.tone}>{wi.result.sentence}</p>
          <table className="ie-tbl calc-wi-t">
            <thead><tr><th scope="col" className="ie-tbl-corner" /><th scope="col">Now</th><th scope="col">If</th><th scope="col">Change</th></tr></thead>
            <tbody>
              {wi.result.tiles.map((t, i) => {
                const was = now.tiles.find(x => x.k === t.k);
                return <tr key={t.k}><th scope="row">{t.k}</th><td>{was?.v ?? '—'}</td><td><b>{t.v}</b></td><td className="sub">{diff[i]?.change?.text.replace(/ than now$/, '') ?? ''}</td></tr>;
              })}
            </tbody>
          </table>
          {wi.result.money?.text && <p className="calc-money-say" data-calc="whatif-money">{wi.result.money.text}</p>}
          <div className="ie-agree-act">
            {canEdit && <button type="button" className="btn btn-primary" onClick={() => { onMakeIt(f.id, val); setId(''); setVal(''); }}>Make it so</button>}
            <button type="button" className="btn btn-ghost" onClick={() => { setId(''); setVal(''); }}>Clear</button>
          </div>
        </div>
      )}
    </section>
  );
}

/** THE SAVED BEFORE — the figures as they were, kept so a change reads as a before → after. */
export function BeforeBox({ def, agreed, canEdit, ready, onSave, onClear }: { def: CalcDef; agreed: AgreedCalc; canEdit: boolean; ready: boolean; onSave: () => void; onClear: () => void }) {
  const b = agreed.before;
  const was = useMemo(() => (b ? beforeRun(def, agreed) : undefined), [b, def, agreed]);
  return (
    <section className="calc-before" aria-label="Before and after">
      {b && was ? (
        <>
          <p className="calc-before-h"><b>Before → after.</b> The figures were saved on {niceDay(isoDay(b.at))}{b.by ? ` by ${b.by}` : ''}; each tile says what has moved since.</p>
          {was.result
            ? <p className="sub calc-before-was" data-calc="before">Before: {was.result.sentence}</p>
            : <p className="sub">The saved before cannot be worked out any more: {was.problems.find(p => p.block)?.say}</p>}
          {(() => {
            const changed = def.inputs.filter(f => String(b.inputs[f.id] ?? '') !== String(agreed.inputs[f.id] ?? ''));
            return changed.length
              ? <p className="sub calc-before-ch">Changed: {changed.map(f => `${f.label} ${b.inputs[f.id] === undefined ? 'not given' : valueSaid(f, String(b.inputs[f.id]))} → ${agreed.inputs[f.id] === undefined ? 'not given' : valueSaid(f, String(agreed.inputs[f.id]))}`).join(' · ')}</p>
              : <p className="sub calc-before-ch">Nothing changed since — change a figure to see what moves.</p>;
          })()}
          {canEdit && (
            <div className="ie-agree-act">
              <button type="button" className="btn" disabled={!ready} onClick={onSave}>Save these as the new before</button>
              <button type="button" className="btn btn-ghost" onClick={onClear}>Clear the before</button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="calc-before-h"><b>Before → after.</b> {ready ? 'Save the figures as they are now, then change one: every tile says what moved.' : 'Once the answer is worked out, the figures can be saved as the before.'}</p>
          {canEdit && <button type="button" className="btn" disabled={!ready} onClick={onSave}>Save as before</button>}
        </>
      )}
    </section>
  );
}
