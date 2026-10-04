import { useLayoutEffect, useRef } from 'react';

/** A one-line answer that wraps instead of scrolling sideways: a sentence
 *  typed on a phone stays readable as it grows. Enter is "done with this
 *  line" (onEnter), as in any single-line box; nothing is written anywhere
 *  until the sheet's own button is pressed. */
export function LineField({ value, onChange, onEnter, placeholder, autoFocus, label, className }: {
  value: string; onChange: (v: string) => void; onEnter?: () => void;
  placeholder?: string; autoFocus?: boolean; label: string; className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea ref={ref} rows={1} className={'cs-line' + (className ? ' ' + className : '')} value={value}
      aria-label={label} placeholder={placeholder} autoFocus={autoFocus}
      onChange={e => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onEnter?.(); }
      }} />
  );
}
