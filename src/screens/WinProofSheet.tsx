/* CALL A WIN — or find out you can't.
 *
 * A win used to be a title, a story, and a number somebody typed into a box.
 * That is the exact shape of the thing this product exists to refuse: a benefit
 * declared rather than measured. The fix is not to ban the story — the story is
 * how a win reads in a meeting — it is to let the NUMBER come from the weeks.
 *
 * You say which line it was and which week the change landed. Everything after
 * that is derived: the weeks before, the weeks after, both means, and whether
 * the difference survives a significance test. Then you call it, and the
 * numbers freeze — because the weeks keep arriving, and a receipt that drifts
 * after it has been read out in a room is not a receipt.
 *
 * It is allowed to say no. "Not yet proven" and "worse" are shown in the same
 * type as "proven", in the same place, with the same weight. That is the whole
 * point: a verdict that can only ever be yes is not a verdict.
 */
import { useMemo, useState } from 'react';
import type { PaceLineRow } from '../db';
import { ppmProof, makeWinProof, proofSentence, verdictLabel, type WinProof } from '../lib/ppmProof';
import { weekLabel, currentWeekIndex } from '../lib/usePaceLines';

/* "about 0 times in 100" is what rounding does to a strong result, and it reads
 * as a broken number rather than a good one. Anything under half a percent is
 * said as the floor instead. */
function inHundred(p: number): string {
  if (p < 0.005) return 'fewer than 1 time in 100';
  const n = Math.round(p * 100);
  return `about ${n} time${n === 1 ? '' : 's'} in 100`;
}

export function WinProofSheet({ lines, initial, onCall, onClose }: {
  lines: PaceLineRow[];
  /** Re-opening a called win starts from the line and week it was called on. */
  initial?: WinProof;
  onCall: (p: WinProof) => void;
  onClose: () => void;
}) {
  // Lines with fewer than four weeks in them can never produce a proof, so they
  // are not offered — better than letting somebody pick one and hit a wall.
  const usable = useMemo(
    () => lines.filter(l => l.weekly.filter(v => v != null).length >= 4),
    [lines],
  );
  const [key, setKey] = useState(initial?.lineKey ?? usable[0]?.key ?? '');
  const line = usable.find(l => l.key === key) ?? usable[0];

  /** Only weeks that actually have a reading on both sides are worth offering. */
  const weeks = useMemo(() => {
    if (!line) return [];
    const measured = line.weekly.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0);
    const last = currentWeekIndex();
    return measured.filter(i => i >= 1 && i <= last).filter(i => {
      const before = line.weekly.slice(0, i).filter(v => v != null).length;
      const after = line.weekly.slice(i).filter(v => v != null).length;
      return before >= 2 && after >= 2;
    });
  }, [line]);

  const [from, setFrom] = useState<number>(initial?.fromWeek ?? weeks[Math.floor(weeks.length / 2)] ?? 1);
  const live = line ? ppmProof(line.weekly, from) : null;

  if (!line) {
    return (
      <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Prove this win">
        <div className="wp">
          <h2 className="lt-paste-t">Not enough weeks yet</h2>
          <p className="sub">
            A proof needs at least two measured weeks before the change and two after it. Put this
            project’s weekly ppm in under <b>Data</b>, and this opens up on its own.
          </p>
          <div className="wp-foot"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Prove this win">
      <div className="wp">
        <h2 className="lt-paste-t">Prove it from the weeks</h2>
        <p className="sub wp-lede">
          Say which line it was and which week the change landed. The numbers come from that line’s
          own weekly ppm — nothing here is typed.
        </p>

        {usable.length > 1 && (
          <>
            <p className="wp-lbl">Which line</p>
            <div className="wp-chips">
              {usable.map(l => (
                <button key={l.key} className={'chip' + (l.key === key ? ' on' : '')}
                  onClick={() => setKey(l.key)}>{l.name || l.key}</button>
              ))}
            </div>
          </>
        )}

        <p className="wp-lbl">The week the change landed</p>
        {weeks.length === 0 ? (
          <p className="sub">
            This line hasn’t got two measured weeks either side of any week yet.
          </p>
        ) : (
          <div className="wp-chips">
            {weeks.map(i => (
              <button key={i} className={'chip' + (i === from ? ' on' : '')} onClick={() => setFrom(i)}>
                {weekLabel(i)}
              </button>
            ))}
          </div>
        )}

        {/* The verdict, in the same type whichever way it goes. */}
        <div className={'wp-verdict is-' + (live ? live.verdict : 'none')}>
          {live ? (
            <>
              <span className="wp-badge">{verdictLabel(live.verdict)}</span>
              <span className="wp-sentence">{proofSentence(live)}</span>
              <span className="wp-note">
                {live.pValue == null
                  ? 'Fewer than three weeks one side — the difference is real arithmetic, but too few weeks to test.'
                  : live.verdict === 'proven'
                    ? `A rise this size across these weeks would come up by chance ${inHundred(live.pValue)}.`
                    : live.verdict === 'better'
                      ? `Could be chance — ${inHundred(live.pValue)} at this spread. More weeks would settle it.`
                      : 'The weeks after are not above the weeks before.'}
              </span>
            </>
          ) : (
            <span className="wp-sentence">Not enough measured weeks either side of that week.</span>
          )}
        </div>

        <div className="wp-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" disabled={!live}
            onClick={() => live && onCall(makeWinProof(live, line.key, line.name || line.key, Date.now()))}>
            {live && live.verdict === 'worse' ? 'Record it anyway' : 'Call it'}
          </button>
        </div>
        <p className="sub wp-fine">
          Calling freezes these numbers onto the win. Later weeks won’t change them.
        </p>
      </div>
    </div>
  );
}
