/* A DOCUMENT'S READING — the live answer beside its boxes (knowledge/specs/FC-240-documents.md): how much is filled in and what is still
 * needed, the lean tiles, the one sentence and what else it says, what to put right, the tables worked out from what was typed, how they
 * were worked out, the money (or the sentence saying why there is none), what it does not say — and the agreement. Everything comes from
 * the run; nothing is worked out here. */
import { useState } from 'react';
import { LeanTiles } from '../../ui/Lean';
import { Fold } from '../../ui/Fold';
import { niceDay, isoDay } from '../../lib/weeks';
import type { DocRun } from './doc';
import type { DocDef } from './types';

/** THE AGREEMENT — who has agreed it and when, or what stops it being agreed, or the one button that agrees it. */
export function SignBox({ def, run, canAgree, canEdit, me, onSign, onUnsign }: { def: DocDef; run: DocRun; canAgree: boolean; canEdit: boolean; me?: string; onSign: (by: string) => void; onUnsign: () => void }) {
  const so = def.signoff;
  const [who, setWho] = useState('');
  if (!so) return null;
  const name = who || me || '';
  return (
    <section className={'doc-sign is-' + run.status.key} aria-label="Agreement" data-doc="sign">
      {run.signed ? (
        <>
          <p className="doc-sign-h" data-doc="signed"><b>{so.word} by {run.signed.by}</b> on {niceDay(isoDay(run.signed.at), { year: true })}.</p>
          <p className="sub">It is locked while it is agreed; {so.by} can reopen it to change it.</p>
          {canAgree && <button type="button" className="btn" data-doc-unsign onClick={onUnsign}>{so.back}</button>}
        </>
      ) : run.need.length ? (
        <>
          <p className="doc-sign-h"><b>Draft</b> — {run.filled} of {run.total} needed boxes filled in.</p>
          <p className="sub" data-doc="needs">To be ready for {so.by} to agree it: {run.need.join('; ')}.</p>
        </>
      ) : canAgree ? (
        <>
          <p className="doc-sign-h"><b>{run.status.word}</b> — everything needed is filled in.</p>
          <label className="field"><span className="field-label">Agreed by</span>
            <input className="text-input" value={name} maxLength={80} aria-label="Agreed by" data-doc-signer onChange={e => setWho(e.target.value)} /></label>
          <button type="button" className="btn btn-primary" data-doc-sign disabled={!name.trim()} onClick={() => onSign(name.trim())}>{so.ask}</button>
        </>
      ) : (
        <p className="doc-sign-h"><b>{run.status.word}</b> — everything needed is filled in; {so.by} agrees it.</p>
      )}
      {!canEdit && !run.signed && <p className="sub doc-ro" role="status">You can read this and take its paper; the words are changed by the people doing the work.</p>}
    </section>
  );
}

export function ReadingView({ run }: { run: DocRun }) {
  const r = run.result;
  const to = run.problems;
  return (
    <div className="doc-result" aria-label="What it says" data-doc="reading">
      <LeanTiles tiles={run.tiles} className="ie-strip doc-tiles" />
      <div className="ie-says">
        {r.sentence
          ? <p className={'ie-say is-' + r.tone} data-doc="sentence">{r.sentence}</p>
          : <p className="sub ie-say" data-doc="waiting">Not said yet — {run.need.length ? `still to fill in: ${run.need.slice(0, 4).join(', ')}${run.need.length > 4 ? ` and ${run.need.length - 4} more` : ''}.` : run.def.question}</p>}
        {(r.more ?? []).map((m, i) => <p key={i} className="sub ie-more">{m}</p>)}
      </div>
      {to.length > 0 && (
        <div className="ie-checks" aria-label="To put right" data-doc="checks">
          <span className="ie-checks-h">To put right</span>
          {to.map(w => <p key={w.say} className="ie-check is-a">{w.say}</p>)}
        </div>
      )}
      {(r.tables ?? []).map(t => (
        /* a table worked out from the boxes: open at a desk, one line on a phone until it is wanted (docs/DESIGN.md) */
        <section key={t.title} className="doc-table doc-later" data-doc-table={t.title} aria-label={t.title}>
          <Fold id={`doc.table.${run.def.key}.${t.title}`} title={t.title} says={`${t.rows.length} row${t.rows.length === 1 ? '' : 's'}`}>
            {t.note && <p className="sub">{t.note}</p>}
            <div className="doc-table-scroll">
              <table className="ie-tbl">
                <thead><tr>{t.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>{t.rows.map((row, i) => <tr key={i}>{row.map((c, k) => (k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>))}</tr>)}</tbody>
              </table>
            </div>
          </Fold>
        </section>
      ))}
      {(r.working ?? []).length > 0 && (
        /* the working is for whoever checks the sums — one line until it is wanted (docs/DESIGN.md, progressive disclosure) */
        <div className="calc-working doc-working doc-later">
          <Fold id="doc.working" title="How it is worked out" says={`${(r.working ?? []).length} step${(r.working ?? []).length === 1 ? '' : 's'} of the sum`} start={false}>
            <table className="ie-tbl calc-working-t doc-working-t">
              <tbody>{(r.working ?? []).map(w => <tr key={w.label}><th scope="row">{w.label}</th><td>{w.value}{w.note ? <small>{w.note}</small> : null}</td></tr>)}</tbody>
            </table>
          </Fold>
        </div>
      )}
      <div className="calc-money-out doc-money" aria-label="In money">
        <span className="ie-checks-h">In money</span>
        {r.money.text && <p className="calc-money-say" data-doc="money">{r.money.text}</p>}
        {r.money.none && <p className="sub" data-doc="money-none">{r.money.none}</p>}
        {r.money.missing.map(m => <p key={m} className="sub calc-money-missing" data-doc="money-missing">{m}</p>)}
      </div>
      {/* the limits of the reading — for whoever checks it, one line until it is wanted (docs/DESIGN.md, progressive disclosure) */}
      <div className="calc-caveats doc-caveats doc-later">
        <Fold id="doc.caveats" title="What this does not say" says={`${r.caveats.length} limit${r.caveats.length === 1 ? '' : 's'} of this reading`} start={false}>
          <ul>{r.caveats.map(c => <li key={c} className="sub">{c}</li>)}</ul>
        </Fold>
      </div>
    </div>
  );
}
