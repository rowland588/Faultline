/* CALL A WIN — or find out you can't.
 *
 * A win used to be a title, a story, and a number somebody typed into a box.
 * That is the exact shape of the thing this product exists to refuse: a benefit
 * declared rather than measured. The fix is not to ban the story — the story is
 * how a win reads in a meeting — it is to let the NUMBER come from the readings.
 *
 * You say which line it was, which measure, and when the change landed.
 * Everything after that is derived: the readings before, the readings after,
 * both means, and whether the difference survives a significance test. Then you
 * call it, and the numbers freeze — because readings keep arriving, and a receipt
 * that drifts after it has been read out in a room is not a receipt.
 *
 * WHICH WAY IS GOOD COMES FROM THE MEASURE. Waste falling by 0.6 is a win of
 * +0.6 here; the sheet used to assume up was good, which would have called that
 * a loss.
 *
 * It is allowed to say no. "Not yet proven" and "worse" are shown in the same
 * type as "proven", in the same place, with the same weight. That is the whole
 * point: a verdict that can only ever be yes is not a verdict. */
import { useMemo, useState } from 'react';
import type { PaceLineRow } from '../db';
import { numberProof, makeWinProof, proofSentence, verdictLabel, type WinProof } from '../lib/measureProof';
import { useMeasures } from '../lib/useMeasures';
import { seriesFor } from '../lib/measures';

/* "about 0 times in 100" is what rounding does to a strong result, and it reads
 * as a broken number rather than a good one. Anything under half a percent is
 * said as the floor instead. */
function inHundred(p: number): string {
  if (p < 0.005) return 'fewer than 1 time in 100';
  const n = Math.round(p * 100);
  return `about ${n} time${n === 1 ? '' : 's'} in 100`;
}

const day = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** A reading is only worth offering as the moment of change if there are at
 *  least two either side of it — anything less can only produce an anecdote. */
const MIN_SIDE = 2;

export function WinProofSheet({ projectId, lines, initial, onCall, onClose }: {
  projectId: string;
  lines: PaceLineRow[];
  /** Re-opening a called win starts from the line it was called on. */
  initial?: WinProof;
  onCall: (p: WinProof) => void;
  onClose: () => void;
}) {
  const state = useMeasures(projectId);
  const [lineId, setLineId] = useState('');
  const [measureId, setMeasureId] = useState('');
  const [from, setFrom] = useState<number | null>(null);

  /* Only a line and measure with enough readings on it can produce a proof, so
     only those are offered — better than letting somebody pick one and hit a
     wall. A pair needs 2 either side of at least one split, so 4 in total. */
  const pairs = useMemo(() => {
    const out: { line: PaceLineRow; measureId: string; name: string; unit?: string; values: number[]; dates: string[] }[] = [];
    for (const line of lines) {
      for (const m of state.measures) {
        const rows = seriesFor(state.readings, line.id, m.id);
        if (rows.length < MIN_SIDE * 2) continue;
        out.push({
          line, measureId: m.id, name: m.name, unit: m.unit,
          values: rows.map(r => r.value), dates: rows.map(r => r.at),
        });
      }
    }
    return out;
  }, [lines, state.measures, state.readings]);

  const chosen = pairs.find(p => p.line.id === lineId && p.measureId === measureId)
    ?? pairs.find(p => p.line.id === (initial ? lines.find(l => l.key === initial.lineKey)?.id : undefined))
    ?? pairs[0];

  /** Every split that has enough readings on both sides. */
  const splits = useMemo(() => {
    if (!chosen) return [];
    const out: number[] = [];
    for (let i = MIN_SIDE; i <= chosen.values.length - MIN_SIDE; i++) out.push(i);
    return out;
  }, [chosen]);

  const at = from != null && splits.includes(from) ? from : splits[Math.floor(splits.length / 2)] ?? null;
  const measure = state.measures.find(m => m.id === chosen?.measureId);
  const live = chosen && at != null && measure
    ? numberProof(chosen.values, at, measure.direction)
    : null;

  /* Everything below reads the chosen pair, so it is proved here rather than
     asserted at each use. A pair needs four readings to exist at all, so a pair
     with no usable split cannot happen — and saying that with a guard is what
     keeps it true. */
  if (!chosen || at == null) {
    return (
      <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Prove this win">
        <div className="wp">
          {state.loading ? <p className="sub">Loading the readings…</p> : (
            <>
              <h2 className="lt-paste-t">Not enough readings yet</h2>
              <p className="sub">
                A proof needs at least two readings before the change and two after it, on one measure.
                Put the numbers in under <b>Numbers</b>, and this opens up on its own.
              </p>
            </>
          )}
          <div className="wp-foot"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Prove this win">
      <div className="wp">
        <h2 className="lt-paste-t">Prove it from the readings</h2>
        <p className="sub wp-lede">
          Say which line and measure it was, and when the change landed. The numbers come from that
          line’s own readings — nothing here is typed.
        </p>

        {pairs.length > 1 && (
          <>
            <p className="wp-lbl">Which line and measure</p>
            <div className="wp-chips">
              {pairs.map(p => (
                <button key={p.line.id + p.measureId}
                  className={'chip' + (p === chosen ? ' on' : '')}
                  onClick={() => { setLineId(p.line.id); setMeasureId(p.measureId); setFrom(null); }}>
                  {p.line.name || p.line.key} · {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="wp-lbl">When the change landed</p>
        <div className="wp-chips">
          {splits.map(i => (
            <button key={i} className={'chip' + (i === at ? ' on' : '')} onClick={() => setFrom(i)}>
              {day(chosen.dates[i])}
            </button>
          ))}
        </div>

        {/* The verdict, in the same type whichever way it goes. */}
        <div className={'wp-verdict is-' + (live ? live.verdict : 'none')}>
          {live ? (
            <>
              <span className="wp-badge">{verdictLabel(live.verdict)}</span>
              <span className="wp-sentence">{proofSentence(live, chosen.unit)}</span>
              <span className="wp-note">
                {live.pValue == null
                  ? 'Fewer than three readings one side — the difference is real arithmetic, but too few to test.'
                  : live.verdict === 'proven'
                    ? `A change this size across these readings would come up by chance ${inHundred(live.pValue)}.`
                    : live.verdict === 'better'
                      ? `Could be chance — ${inHundred(live.pValue)} at this spread. More readings would settle it.`
                      : `The readings after are not on the better side of the ones before${measure ? ` (${measure.direction === 'up' ? 'higher' : 'lower'} is better here)` : ''}.`}
              </span>
            </>
          ) : (
            <span className="wp-sentence">Not enough readings either side of that date.</span>
          )}
        </div>

        <div className="wp-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" disabled={!live}
            onClick={() => live && onCall(makeWinProof(live, {
              lineKey: chosen.line.key,
              lineName: chosen.line.name || chosen.line.key,
              measureName: chosen.name, unit: chosen.unit,
              direction: measure?.direction, fromAt: chosen.dates[at],
            }, Date.now()))}>
            {live && live.verdict === 'worse' ? 'Record it anyway' : 'Call it'}
          </button>
        </div>
        <p className="sub wp-fine">
          Calling freezes these numbers onto the win. Later readings won’t change them.
        </p>
      </div>
    </div>
  );
}
