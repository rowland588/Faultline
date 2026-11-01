/* BUFFERS — under the V-curve on Line capacity (FC-046; knowledge/specs/FC-046-accumulation.md).
 *
 * For each machine beside the bottleneck: how many minutes of the bottleneck's work what can collect holds (the cover), how
 * long it takes to come back (the recovery), how many of the machine's logged stops it absorbed and how many ran past it —
 * and what those cost, in packs and in money where the line has a margin. Worked out in tools/linebalance/capacityBuffer from
 * what the sheet already keeps (each station's "can collect after", its speed) and the stops timed in Capture; it asks
 * nothing and writes nothing. Neutral: a buffer is a plan. Amber only where stops run past it, with the words. */
import { useMemo } from 'react';
import type { Observation, Workspace } from '../../types';
import { contributionOf } from '../losses/losses';
import { bufferView, stopLengths } from './capacityBuffer';
import type { Capacity, CapacityResult } from './capacity';
import { fmtN } from './capacityWords';
import './buffers.css';

const mins = (m?: number) => (m == null ? '—' : `${fmtN(Math.round(m * 10) / 10)} min`);
const big = (n?: number) => (n == null ? '—' : Math.round(n).toLocaleString('en-GB'));

export function CapacityBuffers({ r, cap, obs, from, to, weeks, ws }: {
  r: CapacityResult; cap: Capacity; obs: readonly Observation[]; from: number; to: number; weeks: number; ws?: Workspace;
}) {
  const view = useMemo(() => {
    const lengths = stopLengths(obs, r.ok.map(x => x.station), from, to);
    /* what a pack earns: this product's own price less materials when typed, else the line's margin — the one cost model */
    const cost = contributionOf({
      ...(ws ?? {}),
      ...(cap.pricePerPack != null ? { pricePerPack: cap.pricePerPack } : {}),
      ...(cap.materialsPerPack != null ? { materialsPerPack: cap.materialsPerPack } : {}),
    });
    const plannedMin = cap.plannedHoursPerWeek && cap.plannedHoursPerWeek > 0 ? cap.plannedHoursPerWeek * 60 * weeks : undefined;
    return bufferView(r, { lengths, ...(cost ? { contributionPerPack: cost.perPack } : {}), ...(plannedMin != null ? { plannedMin } : {}) });
  }, [r, cap.pricePerPack, cap.materialsPerPack, cap.plannedHoursPerWeek, obs, from, to, weeks, ws]);
  if (!view || !view.rows.length) return null;
  return (
    <section className={'bfr' + (view.tone === 'a' ? ' is-a' : '')} aria-label="Buffers between the machines">
      <h3 className="bfr-h">Buffers <span className="sub">how long what can collect holds, how fast it comes back, which stops it absorbs</span></h3>
      <p className="bfr-says"><b>{view.sentence}</b></p>
      {view.written && (
        <div className="cap-sheet-box">
          <table className="cap-sheet bfr-t">
            <thead><tr><th>Beside {view.bottleneck}</th><th className="n">Can collect</th><th className="n">Holds</th><th className="n">Back in</th><th className="n">Stops</th><th className="n">Ran past</th><th className="n">Lost</th><th className="n">Would hold</th></tr></thead>
            <tbody>
              {view.rows.map(x => (
                <tr key={x.id} className={x.tone === 'a' ? 'is-a' : ''}>
                  <td data-k="Beside">{x.name} <span className="sub">{x.side === 'before' ? 'before' : 'after'}</span></td>
                  <td data-k="Can collect" className="n">{x.units > 0 ? `${big(x.units)} ${view.unit}` : '—'}</td>
                  <td data-k="Holds" className="n">{mins(x.coverMin)}</td>
                  <td data-k="Back in" className="n">{x.recoveryMin != null ? mins(x.recoveryMin) : '—'}</td>
                  <td data-k="Stops" className="n">{x.stops || '—'}</td>
                  <td data-k="Ran past" className="n">{x.stops ? `${x.passed} of ${x.stops}` : '—'}</td>
                  <td data-k="Lost" className="n">{x.lostUnits > 0 ? `${big(x.lostUnits)} ${view.unit}${x.lostPounds != null ? ` · £${big(x.lostPounds)}` : ''}` : '—'}</td>
                  <td data-k="Would hold" className="n">{x.needUnits != null ? `${big(x.needUnits)} ${view.unit}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul className="bfr-rows">
        {view.rows.map(x => <li key={x.id} className={x.tone === 'a' ? 'is-a' : ''}><b>{x.name}.</b> {x.says}</li>)}
      </ul>
      {view.money && <p className="bfr-money">{view.money}</p>}
      {view.missing.map(m => <p key={m} className="sub bfr-missing">{m}</p>)}
      <p className="sub bfr-limit">Worked from the stops timed in Capture over the last {weeks} weeks (changeovers and waits left out). A buffer is worked for one stopped machine with the others running; the refill runs at the slowest speed the product meets on its way, less the bottleneck’s own.</p>
    </section>
  );
}
