/* THE UNIT OF A STUDY — typed, or one tap, and empty until it is said.
 *
 * Three tools (the Analysis, the Capability study, the Control chart) used to start with "g" in the box, and a fill
 * time came back on screen and on paper as "12.31 g" (the tools audit, 30 October: "X3. A "g" unit is silently
 * pre-filled"). A unit is now never assumed: the box starts empty, the usual ones are chips (one tap puts one in,
 * a second tap takes it out), anything else is typed, and a study with none says its figures with no unit —
 * on the screen and on paper. A record that already holds a unit keeps it. No source of a study's unit exists in the app yet (a
 * program's criterion carries a name, not a unit; a line's products carry no weight), so none is offered first. */
import { useId } from 'react';

export const USUAL_UNITS = ['g', 'kg', 'mm', 's', 'min', '°C', 'ppm', '%', 'pack/min'] as const;

export function UnitField({ value, onChange, placeholder, hint }: { value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  const hid = useId();
  return (
    <div className="ie-unitpick ie-wide">
      <label className="field"><span className="field-label">Unit</span>
        <input className="text-input" value={value} maxLength={16} onChange={e => onChange(e.target.value)} aria-describedby={hid} placeholder={placeholder ?? 'none yet — tap one, or type'} /></label>
      <p id={hid} className="sub ie-unit-hint">{hint ?? 'what the figures are in — leave empty if they have none'}</p>
      <div className="chip-row ie-unit-chips" role="group" aria-label="Usual ones">
        {USUAL_UNITS.map(u => (
          <button key={u} type="button" className={'chip' + (value.trim() === u ? ' on' : '')} aria-pressed={value.trim() === u} onClick={() => onChange(value.trim() === u ? '' : u)}>{u}</button>
        ))}
      </div>
    </div>
  );
}
