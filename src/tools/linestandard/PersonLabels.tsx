/* WHAT ELSE A PERSON IS — three words in one tap (Overburdened · Product issue · Extra labour) and any he types (4 November — Rowland: "add overburdening of a person ... and product
 * issues ... let me add what I want as a label for what the person is, not just the bottleneck ... keep the UI simple"). Beside the bottleneck tick, never instead of it. Used in Who does
 * what and in the person's sheet, so the two say the same. */
import { useState } from 'react';
import { LABEL_MAX, QUICK_LABELS, labelsOf, toggleLabel, type StandardMark } from './standard';

export function PersonLabels({ mark, who, onChange }: { mark: Pick<StandardMark, 'labels'>; who: string; onChange: (next: string[] | undefined) => void }) {
  const [typed, setTyped] = useState('');
  const has = labelsOf(mark);
  const own = has.filter(l => !QUICK_LABELS.some(q => q.toLowerCase() === l.toLowerCase()));
  const add = () => { const t = typed.trim(); if (t) onChange(toggleLabel(mark, t) ?? undefined); setTyped(''); };
  return (
    <div className="ls-labels" role="group" aria-label={`What ${who} is, besides the bottleneck`}>
      {QUICK_LABELS.map(q => {
        const on = has.some(l => l.toLowerCase() === q.toLowerCase());
        return <button key={q} type="button" className={'chip ls-lab-b' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onChange(toggleLabel(mark, q))}>{on ? `${q} ✓` : q}</button>;
      })}
      {own.map(l => (
        <button key={l} type="button" className="chip on ls-lab-b" aria-label={`Take off the label ${l}`} onClick={() => onChange(toggleLabel(mark, l))}>{l} ✕</button>
      ))}
      <input className="text-input ls-lab-in" value={typed} maxLength={LABEL_MAX} placeholder="Another label…" aria-label={`Add a label to ${who}`}
        onChange={e => setTyped(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}
