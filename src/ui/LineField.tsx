/* THE LINE PICKER THAT CAN MAKE THE LINE (lib/lineChoice) — "Which line?" with the factory's lines in floor order and
 * "＋ A new line…" last. Chosen, it asks for the name and the type (Your factory's own words) and the sheet's Start
 * makes the line with lib/lines addLineToFactory — the one function. On a device with no line yet it opens on the new
 * line already (a name guessed, editable), under a plain sentence, so the first tap of a first-time person is Start.
 * A person who may not add lines (a client of a project, somebody only invited to one) is shown the lines and no add,
 * and told in words when there are none. */
import { useEffect, useMemo } from 'react';
import type { Workspace } from '../types';
import { lineTypesOffered } from '../lib/lines';
import { guessLineName, NEW_LINE, noLineWords, type LineChoice } from '../lib/lineChoice';

export function LineField({ lines, read, choice, onChange, canAdd, belongs, hint, label = 'Which line?' }: {
  lines: Workspace[];
  /** The lines have been read (lib/useFactoryLines useFactoryLinesRead). */
  read: boolean;
  choice: LineChoice;
  onChange: (c: LineChoice) => void;
  canAdd: boolean;
  /** "A count", "A study", "A log" — what belongs to a line. */
  belongs: string;
  /** What the line is for, under the picker. */
  hint?: string;
  label?: string;
}) {
  const none = read && lines.length === 0;
  const types = useMemo(() => lineTypesOffered(lines), [lines]);
  /* the first line of a factory: open on "a new line" with a name guessed, so Start is one tap away */
  useEffect(() => {
    if (none && canAdd && choice.value === '') onChange({ ...choice, value: NEW_LINE, newName: choice.newName || guessLineName(lines) });
  }, [none, canAdd, choice, lines, onChange]);
  const making = choice.value === NEW_LINE;
  return (
    <>
      <label className="field"><span className="field-label">{label}</span>
        <select className="text-input" value={choice.value} aria-label="Which line" data-line-field
          onChange={e => onChange({ ...choice, value: e.target.value, newName: e.target.value === NEW_LINE ? choice.newName || guessLineName(lines) : choice.newName })}>
          <option value="">Pick the line…</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          {canAdd && <option value={NEW_LINE}>＋ A new line…</option>}
        </select>
        {none ? <span className="sub" data-no-line>{noLineWords(belongs, canAdd)}</span> : hint ? <span className="sub">{hint}</span> : null}
      </label>
      {making && canAdd && (
        <div className="lt-newline" data-new-line>
          <label className="field"><span className="field-label">The new line’s name</span>
            <input className="text-input" value={choice.newName} maxLength={80} placeholder="e.g. Line 4" aria-label="The new line’s name" onChange={e => onChange({ ...choice, newName: e.target.value })} />
          </label>
          <label className="field"><span className="field-label">What kind of line <i className="sub">optional</i></span>
            <select className="text-input" value={choice.newType} aria-label="The new line’s type" onChange={e => onChange({ ...choice, newType: e.target.value })}>
              <option value="">No type yet</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <span className="sub">It goes at the end of your factory, and is a line like any other — set it up further under Factory.</span>
        </div>
      )}
    </>
  );
}
