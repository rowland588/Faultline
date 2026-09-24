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
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/* ---------------------------------------------------------------------------
 * WHAT IS TYPED IS WRITTEN WITHIN A SECOND, AND WRITTEN BEFORE THE PHONE SLEEPS.
 *
 * Rowland: "I never get asked to save any data in the app when I'm on my
 * phone." He is right that nothing asks — and on a phone nothing was written
 * either, unless the box lost focus. iOS and Android do not fire blur when the
 * screen locks, the app is swiped away, or another app comes to the front; a
 * result typed on the floor and then pocketed sat in React state, still visible
 * in the box, and never reached IndexedDB — so it never reached the cloud, and
 * a reload lost it. "Saves as you type" was true on a laptop only.
 *
 * The draft stays the draft — that is what keeps the caret where it was put,
 * which is the whole reason these fields exist. What changes is WHEN the row is
 * written: a beat after the last keystroke, when the tab is hidden, and when
 * the field unmounts. (pagehide is listened to as well, but a write started
 * there is not guaranteed to land — the hidden flush that precedes it is what
 * actually saves the day.) Blur still lets the draft go.
 */
function useDraft(value: string, onSave: (v: string) => void, norm: (s: string) => string = s => s) {
  const [draft, setDraft] = useState<string | null>(null);
  const latest = useRef({ draft, value, onSave, norm });
  latest.current = { draft, value, onSave, norm };
  /* The last thing this field wrote. `value` catches up a render later, and in
     between the hidden flush and the pagehide flush would both write. */
  const lastSaved = useRef<string | null>(null);
  /* Escape: the draft is dropped BEFORE the blur that follows, or the blur's
     own commit writes the very text that was being abandoned. */
  const abandoned = useRef(false);

  /** Write what is typed if it differs from what is stored. Keeps the draft. */
  const commit = useCallback(() => {
    const cur = latest.current;
    if (cur.draft == null || abandoned.current) return;
    const v = cur.norm(cur.draft);
    if (v === cur.value || v === lastSaved.current) return;
    lastSaved.current = v;
    cur.onSave(v);
  }, []);

  useEffect(() => {
    if (draft == null) return;
    const t = window.setTimeout(commit, 700);
    return () => window.clearTimeout(t);
  }, [draft, commit]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') commit(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', commit);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', commit);
      commit();                                   // leaving the screen writes too
    };
  }, [commit]);

  const blur = useCallback(() => { commit(); setDraft(null); abandoned.current = false; }, [commit]);
  /** Drop the draft without writing it — Escape. */
  const abandon = useCallback(() => { abandoned.current = true; setDraft(null); }, []);
  return { draft, setDraft, blur, abandon };
}

/** The same four moments, for a field whose commit is its own (the number box). */
function useFlush(commit: () => void) {
  const ref = useRef(commit);
  ref.current = commit;
  useEffect(() => {
    const run = () => ref.current();
    const hide = () => { if (document.visibilityState === 'hidden') run(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', run);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', run);
      run();
    };
  }, []);
}


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
  const { draft, setDraft, blur, abandon } = useDraft(value, onSave, v => v.trim());
  return (
    <input
      className={className + (wide ? ' is-wide' : '')}
      value={draft ?? value}
      placeholder={placeholder}
      maxLength={max}
      autoFocus={autoFocus}
      onChange={e => setDraft(e.target.value)}
      onBlur={blur}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { abandon(); (e.target as HTMLInputElement).blur(); }
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

  const abandoned = useRef(false);
  const commit = () => {
    if (draft == null || abandoned.current) return;
    const t = draft.trim();
    if (t === '') { if (value != null) onSave(undefined); setDraft(null); return; }
    const n = Number(t);
    // A number that isn't one is discarded rather than stored as 0 or NaN.
    if (Number.isFinite(n) && n !== value) onSave(n);
    setDraft(null);
  };
  useFlush(commit);
  /* A number half-typed when the phone locks is still a number typed. */
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    if (draft == null) return;
    const t = window.setTimeout(() => {
      /* The timer writes but keeps the draft, like the text fields do. */
      const cur = commitRef.current;
      const keep = draft;
      cur();
      setDraft(keep);
    }, 700);
    return () => window.clearTimeout(t);
  }, [draft]);

  return (
    <input
      className={className} inputMode="decimal" aria-label={label}
      value={shown} placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { commit(); abandoned.current = false; }}
      onKeyDown={e => {
        if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
        if (e.key === 'Escape') { abandoned.current = true; setDraft(null); (e.target as HTMLInputElement).blur(); }
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
  const { draft, setDraft, blur, abandon } = useDraft(value, onSave, v => v.trim());
  const live = type === 'date';

  return (
    <input
      id={id} className={className} aria-label={ariaLabel} type={type ?? 'text'} inputMode={inputMode}
      value={draft ?? value} placeholder={placeholder} maxLength={max} autoFocus={autoFocus}
      onChange={e => { if (live) onSave(e.target.value); else setDraft(e.target.value); }}
      onBlur={blur}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { abandon(); (e.target as HTMLInputElement).blur(); }
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
  const { draft, setDraft, blur, abandon } = useDraft(value, onSave, v => v.trim());
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
      onBlur={blur}
      onKeyDown={e => { if (e.key === 'Escape') { abandon(); (e.target as HTMLTextAreaElement).blur(); } }}
    />
  );
}
