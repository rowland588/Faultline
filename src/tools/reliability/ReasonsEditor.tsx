/* THE REASONS FOR A STOP — added one at a time, never in a comma list to get right (Rowland, 26 October: "I do like it a bit
 * simple. Add, add, add, add ... it needs to be flexible, because I might not capture everything").
 *
 * A row of chips, each taken off with its ×; a box and Add (Enter adds too, and a comma list typed or pasted adds each);
 * the usual ones a press away. The same list is the stopwatch's buttons, and the same editor is on the stopwatch itself, so
 * a reason met mid-test is added where it is met. The value is the list as the study keeps it — a comma list — so nothing
 * stored changes. */
import { useState } from 'react';
import { reasonList } from './lineWatch';
import { MAX_REASONS } from './repair';

export function ReasonsEditor({ value, onChange, usual, label }: { value: string; onChange: (v: string) => void; usual: readonly string[]; label: string }) {
  const [v, setV] = useState('');
  const list = reasonList(value);
  const has = (x: string) => list.some(y => y.toLowerCase() === x.toLowerCase());
  const add = (text: string) => {
    const next = [...list];
    for (const r of reasonList(text.replace(/\n/g, ','))) if (!next.some(y => y.toLowerCase() === r.toLowerCase()) && next.length < MAX_REASONS) next.push(r);
    onChange(next.join(', '));
  };
  const full = list.length >= MAX_REASONS;
  return (
    <div className="rl-reasons-ed">
      <span className="chip-row rl-rlist" role="list" aria-label={`The reasons for ${label}`}>
        {list.length === 0 && <span className="sub">No reasons yet — add the first.</span>}
        {list.map(r => (
          <span key={r} className="chip rl-rchip" role="listitem">{r}
            <button type="button" className="rl-rx" aria-label={`Take ${r} off`} onClick={() => onChange(list.filter(y => y !== r).join(', '))}>×</button>
          </span>
        ))}
      </span>
      {/* not a <form>: this sits inside the set-up's own form, and a submit here would save the whole set-up */}
      <div className="rl-radd">
        <input className="text-input" value={v} maxLength={60} placeholder={full ? `${MAX_REASONS} is the most` : 'Add a reason — e.g. bottle down'} disabled={full} aria-label={`Add a reason for ${label}`} onChange={e => setV(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (v.trim()) { add(v); setV(''); } } }} />
        <button type="button" className="btn" disabled={full || !v.trim()} onClick={() => { add(v); setV(''); }}>Add</button>
      </div>
      <span className="chip-row rl-usual" role="group" aria-label={`Usual reasons for ${label}`}>
        {usual.filter(x => !has(x)).map(x => <button key={x} type="button" className="chip" disabled={full} onClick={() => add(x)}>+ {x}</button>)}
      </span>
    </div>
  );
}
