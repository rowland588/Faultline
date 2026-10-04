/* A DATE BOX THAT WRITES A DATE, NOT EVERY KEY ON THE WAY TO ONE.
 *
 * Every date box wrote on each change, and a browser's date box changes as a
 * year is typed digit by digit: 0002, 0020, 0202, 2026 — four writes, four
 * syncs, and three of them dates nobody meant (HUNT 25). Where the box asks
 * why a date moved later (DateWhy), the first of them saved the job as due in
 * the year 2, and the last asked why it had moved from 0202 to 2026.
 *
 * So a date is written when it is a whole one — a picked day, or a typed year
 * from 1900 on — and anything else waits for the box to be left: cleared is
 * written then, and a half-typed year is put back to what it was.
 */
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

/** A date worth writing: empty (cleared), or a day with a four-digit year
 *  from 1900 to 2199 — never the 0002 a half-typed year passes through. */
export const isWholeDate = (v: string): boolean => v === '' || /^(19|2[01])\d\d-\d\d-\d\d$/.test(v);

type Rest = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'>;

export function DateInput({ value, onCommit, onBlur, ...rest }: Rest & {
  value?: string;
  /** Called once per real date: '' when cleared. */
  onCommit: (v: string) => void;
}) {
  const saved = value ?? '';
  /* What the box shows while it differs from what is saved — typing, or a
     date written and not yet back from the store. */
  const [draft, setDraft] = useState<string | null>(null);
  const sent = useRef<string | null>(null);
  const focused = useRef(false);

  /* The store caught up, or the date was changed elsewhere while this box was
     not being typed in: show the saved date. */
  useEffect(() => {
    if (draft !== null && (draft === saved || !focused.current)) { setDraft(null); sent.current = null; }
    // Only when the saved value moves — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const send = (v: string) => {
    if (v === saved || v === sent.current) return;
    sent.current = v;
    onCommit(v);
  };

  return (
    <input {...rest} type="date" value={draft ?? saved}
      onFocus={e => { focused.current = true; rest.onFocus?.(e); }}
      onChange={e => {
        const v = e.target.value;
        setDraft(v);
        // A whole date goes now; '' is often a date half-typed, so it waits.
        if (v && isWholeDate(v)) send(v);
      }}
      onBlur={e => {
        focused.current = false;
        if (draft !== null) {
          if (isWholeDate(draft)) send(draft);
          else setDraft(null);
        }
        onBlur?.(e);
      }} />
  );
}
