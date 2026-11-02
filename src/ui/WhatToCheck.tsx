/* WHAT TO CHECK (knowledge/specs/FC-148-why-tree.md, part A) — between the fishbone and the whys: the causes thought of,
 * in the order the team's own rating gives (most likely first, then the share of the problem), each ticked if it is worth
 * checking, with the check (what, who, by when) and what it found. A cause is confirmed or ruled out here, and the whys
 * open only on a confirmed one. Nothing is written until Save — a write per keystroke is not how this app works. */
import { useState } from 'react';
import type { Can } from '../lib/access';
import type { ProblemView } from '../lib/problems';
import { sixmLabel, type Cause, type CauseStatus } from '../lib/sixm';
import { checkStateOf, orderForCheck, stepSays } from '../lib/causeCheck';
import { CauseCheckFields } from './CauseCheckFields';
import './whyTree.css';

function Card({ c, today, can, onSave, onOpen }: { c: Cause; today: string; can: Can; onSave: (c: Cause) => Promise<void>; onOpen: () => void }) {
  const [base, setBase] = useState(c);
  const [d, setD] = useState(c);
  const [busy, setBusy] = useState(false);
  if (c !== base) { setBase(c); setD(c); }
  const dirty = JSON.stringify(d) !== JSON.stringify(c);
  const st = checkStateOf(d, today);
  const save = async (next: Cause = d) => { setBusy(true); try { await onSave(next); } finally { setBusy(false); } };
  const decide = (status: CauseStatus) => void save({ ...d, status });
  return (
    <li className={'wc-card is-' + st.key + (st.late ? ' is-late' : '')} aria-label={`${d.text} — ${st.word}`}>
      <div className="wc-top">
        <button type="button" className="wc-text" onClick={onOpen}>{d.text}</button>
        <span className="wc-bone">{sixmLabel(d.m)}</span>
        <span className={'wc-state' + (st.late ? ' is-r' : '')}>{st.word}</span>
      </div>
      {can.edit && d.status === 'suspected' && <CauseCheckFields c={d} edit set={p => setD(x => ({ ...x, ...p }))} idKey={d.id} />}
      {(!can.edit || d.status !== 'suspected') && <CauseCheckFields c={d} edit={false} set={() => undefined} idKey={d.id} />}
      {can.edit && (
        <div className="cs-why-add">
          {dirty && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>}
          {d.status === 'suspected' && d.tick && !dirty && (
            <>
              <button type="button" className="btn" disabled={busy} onClick={() => decide('confirmed')}>The check shows it is real — confirm</button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => decide('ruled_out')}>The check does not hold — rule it out</button>
            </>
          )}
          {d.status !== 'suspected' && !dirty && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => decide('suspected')}>Back to suspected</button>
          )}
        </div>
      )}
    </li>
  );
}

export function WhatToCheck({ view, can, today, onSaveCause, onOpenCause }: {
  view: ProblemView; can: Can; today: string; onSaveCause: (c: Cause) => Promise<void>; onOpenCause: (c: Cause) => void;
}) {
  const causes = view.bones.flatMap(b => b.causes);
  if (!causes.length) return null;
  const ordered = orderForCheck(causes);
  return (
    <section className="pc-part wc" aria-label="What to check">
      <header className="pc-h"><span className="pc-n">2b</span><h3 className="pc-t">What to check</h3></header>
      <p className="wc-says" role="status">{stepSays(causes, today)}</p>
      <ul className="wc-list">
        {ordered.map(c => <Card key={c.id} c={c} today={today} can={can} onSave={onSaveCause} onOpen={() => onOpenCause(c)} />)}
      </ul>
    </section>
  );
}
