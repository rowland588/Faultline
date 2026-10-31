/* A NUMBER TYPED ON A STUDY AS WHAT IT IS JUDGED AGAINST (30 October, a program's criteria — docs/PROGRAM-GOAL.md): the work share
 * a sampling must reach, the most a counted shift may lose, the results in a row a check log needs. Written when the box is left,
 * never on every keystroke (CLAUDE.md: a number box that turned 12 into 102); empty takes it off. `onSet` gets the number or
 * undefined. A box nobody may agree is words, not a box. */
import { useEffect, useState } from 'react';

export function TargetNumber({ label, value, unit, hint, editable, min = 0, max, integer, onSet }: {
  label: string; value: number | undefined; unit?: string; hint?: string; editable: boolean;
  min?: number; max?: number; integer?: boolean; onSet: (n: number | undefined) => void;
}) {
  const shown = value !== undefined ? String(value) : '';
  const [t, setT] = useState(shown);
  useEffect(() => { setT(shown); }, [shown]);
  const n = t.trim() ? Number(t.replace(',', '.')) : undefined;
  const bad = n !== undefined && (!Number.isFinite(n) || n < min || (max !== undefined && n > max) || (!!integer && !Number.isInteger(n)));
  if (!editable) return value === undefined ? null : <p className="sub ie-where tn-read"><b>{label}:</b> {value}{unit ? ` ${unit}` : ''}</p>;
  return (
    <p className="sub ie-where tn">
      <label className="co-target-box">{label}{' '}
        <input className="text-input tn-input" value={t} inputMode="decimal" aria-label={label}
          onChange={e => setT(e.target.value)} onBlur={() => { if (!t.trim()) { if (value !== undefined) onSet(undefined); } else if (!bad && n !== value) onSet(n); }} />
        {unit ? ` ${unit}` : ''}
      </label>
      {bad && <span className="vs-bad"> {integer ? 'a whole number' : 'a number'}{max !== undefined ? ` from ${min} to ${max}` : ` of ${min} or more`}</span>}
      {hint && <span className="tn-hint"> {hint}</span>}
    </p>
  );
}
