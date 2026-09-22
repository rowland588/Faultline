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
import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';

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

/* ---------------------------------------------------------------------------
 * THE SAME IDEA, FOR A FIELD THAT LIVES IN A FORM ROW.
 *
 * These exist because the test screen wrote every keystroke straight to
 * IndexedDB and read the row back — which on a phone is the bug Rowland hit:
 * you cannot put the cursor in the middle of a sentence, because the write
 * round-trips, the value comes back a beat later, and React puts the caret at
 * the end of the new value. The only way to correct a word was to delete back
 * to it.
 *
 * It was also a database write per keystroke, which is the same defect the
 * commissioning number box had.
 *
 * So the field owns what you are typing until you leave it. Nothing else
 * changed: it still saves without a Save button.
 */

/** A one-line field. Commits on blur or Enter, abandons on Escape. */
export function DraftField({
  value, onSave, placeholder, type, inputMode, max = 200, autoFocus, id, ariaLabel, className,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** `date` and the like still write immediately — a picker has no caret to lose. */
  type?: 'text' | 'date';
  inputMode?: 'text' | 'decimal' | 'numeric';
  max?: number;
  autoFocus?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const live = type === 'date';

  return (
    <input
      id={id} className={className} aria-label={ariaLabel} type={type ?? 'text'} inputMode={inputMode}
      value={draft ?? value} placeholder={placeholder} maxLength={max} autoFocus={autoFocus}
      onChange={e => { if (live) onSave(e.target.value); else setDraft(e.target.value); }}
      onBlur={() => { if (draft != null && draft !== value) onSave(draft); setDraft(null); }}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setDraft(null); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

/** Several lines, growing to fit what is in it.
 *
 *  A fixed two-row box is the other half of the phone complaint: you cannot see
 *  what you have written, so you cannot tell whether it needs correcting. It
 *  grows instead of scrolling, up to a height that still leaves the screen
 *  usable, and only then scrolls.
 *
 *  Enter is a newline here, not a save — this is prose. Blur saves it. */
export function DraftArea({
  value, onSave, placeholder, rows = 3, maxPx = 420, id, ariaLabel, className, areaRef,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** For a caller that needs to put the cursor in this box itself. */
  areaRef?: RefObject<HTMLTextAreaElement>;
  rows?: number;
  maxPx?: number;
  id?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const own = useRef<HTMLTextAreaElement>(null);
  const box = areaRef ?? own;

  /* Measure after the value is on screen, not before: the scroll height of a
     textarea is only true once the text is in it. Reset to auto first or it
     can only ever grow. */
  const grow = useCallback(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, maxPx)}px`;
  }, [box, maxPx]);

  useLayoutEffect(grow, [grow, draft, value]);

  return (
    <textarea
      ref={box} id={id} className={className} aria-label={ariaLabel} rows={rows}
      value={draft ?? value} placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft != null && draft !== value) onSave(draft); setDraft(null); }}
      onKeyDown={e => { if (e.key === 'Escape') { setDraft(null); (e.target as HTMLTextAreaElement).blur(); } }}
    />
  );
}
