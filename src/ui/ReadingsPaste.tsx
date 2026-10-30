/* A BOX TO PASTE READINGS — the one every tool that takes readings shares (the Analysis, the Capability study, the Control chart).
 *
 * A number to a line, or several on a line separated by spaces, commas or semicolons (lib/pasteReadings parsePasted).
 * What is not a number is listed and left out, never silently dropped; the numbers go in — a wild one too: the tool flags it,
 * nothing here removes it. A paste is ONE step: the page's Add gives back how to take that paste out again, and one Undo does
 * it. Typed readings on the pad are unchanged; this is the same readings by another way in (Rowland, 30 October: "we must have
 * tools that are ready and functional" — thirty readings were 180 taps on a pad). */
import { useState } from 'react';
import { MAX_PASTED, parsePasted, type Pasted } from '../lib/pasteReadings';
import { offerUndo } from './Undo';

/** The page's Add: what to do with the pasted readings. Gives back how to take them out again (the one Undo), if it can. */
export type PasteAdd = (p: Pasted) => (() => void) | void;

export function ReadingsPaste({ cols = 1, label, hint, onAdd, disabled }: { cols?: 1 | 2; label: string; hint?: string; onAdd: PasteAdd; disabled?: string }) {
  const [t, setT] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [said, setSaid] = useState('');
  const add = () => {
    const raw = parsePasted(t, cols);
    const made = cols === 2 ? raw.pairs.length : raw.values.length;
    const p: Pasted = made > MAX_PASTED ? { ...raw, values: raw.values.slice(0, MAX_PASTED), pairs: raw.pairs.slice(0, MAX_PASTED) } : raw;
    const n = cols === 2 ? p.pairs.length : p.values.length;
    setSkipped(raw.skipped);
    if (!n) { setSaid(raw.skipped.length ? 'Nothing added — none of it was a number.' : 'Nothing to add.'); return; }
    const undo = onAdd(p);
    const one = cols === 2 ? 'pair' : 'reading';
    setSaid(`Added ${n} ${one}${n === 1 ? '' : 's'}${made > n ? `; the first ${MAX_PASTED} only` : ''}.`);
    if (undo) offerUndo(`Added ${n} ${one}${n === 1 ? '' : 's'}`, async () => { undo(); setSaid(''); });
    setT('');
  };
  return (
    <div className="ie-paste">
      <label className="field"><span className="field-label">{label}</span>
        <textarea className="text-input" rows={3} value={t} onChange={e => setT(e.target.value)} aria-label={label} disabled={!!disabled}
          placeholder={cols === 2 ? '401.2 401.6\n400.8 401.1' : '401.2\n401.6\n400.8'} /></label>
      {hint && <p className="sub ie-pad-hint">{hint}</p>}
      {disabled && <p className="sub ie-pad-hint">{disabled}</p>}
      <button type="button" className="btn" disabled={!t.trim() || !!disabled} onClick={add}>Add these</button>
      {said && <p className="sub ie-pasted" role="status">{said}</p>}
      {skipped.length > 0 && <p className="ie-problem" role="status">Left out — not numbers: {skipped.slice(0, 6).join(', ')}{skipped.length > 6 ? `, and ${skipped.length - 6} more` : ''}.</p>}
    </div>
  );
}
