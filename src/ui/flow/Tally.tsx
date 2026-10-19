/* A COUNT TAKEN WITH A TAP — a box counted one at a time on the floor
 * (lib/flow/definition 'tally'; docs/BLUEPRINT.md §3, the new product).
 *
 * Measured by people, not by sensors (CLAUDE.md): packs rejected as they
 * come off, people waiting at the station, trays short — counted by the
 * person watching, +1 at a time, −1 for a mistap, or typed. The count is a
 * number like any other box, so every analysis, gate, decision and measure
 * reads it the same; only the taking of it differs. */
import { fmtNumber } from '../../lib/flow/analysis';
import type { FlowField } from '../../lib/flow/definition';
import { Num } from './MethodParts';

export function TallyBox({ f, value, onCount, disabled }: {
  f: FlowField; value: number | undefined; onCount: (v: number | undefined) => void; disabled?: boolean;
}) {
  const n = value ?? 0;
  const what = f.unit ? ` ${f.unit}` : '';
  return (
    <div className="fw-tally" data-tally={f.key}>
      <b className="fw-tally-n" aria-live="polite" aria-label={`${f.label}: ${fmtNumber(n)}${what}`}>{fmtNumber(n)}<span className="fw-tally-u">{what}</span></b>
      <div className="fw-acts">
        <button type="button" className="btn btn-primary fw-tally-b" disabled={disabled} aria-label={`Count one more — ${f.label.toLowerCase()}`} onClick={() => onCount(n + 1)}>+1</button>
        <button type="button" className="btn btn-ghost fw-tally-b" disabled={disabled || n <= 0} aria-label={`One fewer — ${f.label.toLowerCase()}`} onClick={() => onCount(Math.max(0, n - 1))}>−1</button>
        <Num value={value} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`} placeholder="or type it" disabled={disabled} onSave={onCount} />
      </div>
    </div>
  );
}
