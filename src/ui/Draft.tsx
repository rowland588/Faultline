/* INPUTS THAT KEEP THEIR OWN DRAFT AND WRITE ON BLUR.
 *
 * Every editable cell in this app saves as you type rather than behind a Save
 * button — which only works if the keystroke and the write are separated. A
 * controlled input fed straight from the database eats a keystroke the moment a
 * save takes longer than the next key, and reorders two of them if the write
 * round-trips. So the field owns a draft while it has focus, and the row is
 * written once, on blur or Enter.
 *
 * Escape abandons the draft. That is the only way to get out of a half-typed
 * cell without writing it. */
import { useState } from 'react';

export function DraftText({ value, placeholder, onSave, className = 'pset-cell', max = 120, autoFocus, wide }: {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  className?: string;
  max?: number;
  autoFocus?: boolean;
  /** A field holding a name or a sentence rather than a code — wider, in the
   *  table it sits in. */
  wide?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className={className + (wide ? ' is-wide' : '')}
      value={draft ?? value}
      placeholder={placeholder}
      maxLength={max}
      autoFocus={autoFocus}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft != null && draft.trim() !== value) onSave(draft.trim()); setDraft(null); }}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setDraft(null); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

/** A number, or nothing. `undefined` is a real value here — "no target set" is
 *  not the same as a target of zero, and a cell cleared to blank has to be able
 *  to say so. Decimals are kept: a waste figure of 2.4 is not 2. */
export function DraftNumber({ value, onSave, className = 'pset-cell is-num', placeholder = '—', label }: {
  value?: number;
  onSave: (v: number | undefined) => void;
  className?: string;
  placeholder?: string;
  label?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? '' : String(value));

  const commit = () => {
    if (draft == null) return;
    const t = draft.trim();
    if (t === '') { if (value != null) onSave(undefined); setDraft(null); return; }
    const n = Number(t);
    // A number that isn't one is discarded rather than stored as 0 or NaN.
    if (Number.isFinite(n) && n !== value) onSave(n);
    setDraft(null);
  };

  return (
    <input
      className={className} inputMode="decimal" aria-label={label}
      value={shown} placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
        if (e.key === 'Escape') { setDraft(null); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}
