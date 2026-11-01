/* SPEED LOSS — on a loss count, under Top causes (FC-056; knowledge/specs/FC-056-speed-loss.md).
 *
 * The loss count tells slow running from short stops once the running speed is timed; this panel says what the person acts on —
 * each in minutes, packs and money, which is the bigger and what to do about it, and how often the short stops come and how long
 * each lasts, once they are counted over a watched stretch. The counting is typed here (how many, in how many minutes of
 * running) or taken from a reliability study's count of them with one tap, said where it came from. The arithmetic and the
 * sentences are tools/losses/speedLoss — the paper prints the same. */
import { useEffect, useMemo, useState } from 'react';
import { listStudiesForLine, onDataChange, patchStudy } from '../../db';
import { offerUndo } from '../../ui/Undo';
import { LeanPanel } from '../../ui/Lean';
import type { ShortStopTally, ToolStudy } from '../../lib/study';
import type { LossFigures } from './losses';
import { shortStopOffers, speedLoss } from './speedLoss';
import './speedLoss.css';

const numOr = (t: string): number | undefined => { const n = Number(t.replace(/,/g, '').trim()); return t.trim() !== '' && Number.isFinite(n) ? n : undefined; };

export function SpeedLossPanel({ s, f, editable }: { s: ToolStudy; f: LossFigures; editable: boolean }) {
  const c = s.facts.losses;
  const tally = c?.shortStops;
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  const [n, setN] = useState('');
  const [min, setMin] = useState('');
  useEffect(() => {
    if (!s.workspaceId) return;
    let live = true;
    const load = async () => { const all = await listStudiesForLine(s.workspaceId as string); if (live) setStudies(all); };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, [s.workspaceId]);
  const sl = useMemo(() => speedLoss(f, tally), [f, tally]);
  const offers = useMemo(() => shortStopOffers(studies, Date.now(), c?.rateMachine), [studies, c?.rateMachine]);
  if (!sl || sl.verdict === 'No speed loss') return null;
  const save = (t: ShortStopTally | undefined, say: string) => {
    const before = tally;
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, losses: { ...(cur.facts.losses as NonNullable<typeof cur.facts.losses>), ...(t ? { shortStops: t } : { shortStops: undefined }) } } }));
    offerUndo(say, async () => { await patchStudy(s.id, cur => ({ facts: { ...cur.facts, losses: { ...(cur.facts.losses as NonNullable<typeof cur.facts.losses>), shortStops: before } } })); });
  };
  const nn = numOr(n), mm = numOr(min);
  const ok = nn !== undefined && nn > 0 && Number.isInteger(nn) && mm !== undefined && mm > 0;
  const showForm = editable && sl.told && (sl.shortMin ?? 0) > 0.5;
  return (
    <LeanPanel title="Speed loss" className="ln-solo">
      <div className={'slp is-' + sl.tone} aria-label="Speed loss">
        <p className="slp-says"><b>{sl.says}</b></p>
        {sl.lines.length > 0 && <ul className="slp-lines">{sl.lines.map(l => <li key={l}>{l}</li>)}</ul>}
        {sl.money && <p className="slp-money">{sl.money[0].toUpperCase() + sl.money.slice(1)}</p>}
        {sl.missing.map(m => <p key={m} className="sub slp-missing">{m}</p>)}
        {showForm && (
          <div className="slp-count">
            {offers.length > 0 && (
              <ul className="slp-offers" aria-label="Reliability studies that counted short stops">
                {offers.map(o => (
                  <li key={`${o.studyId}:${o.count}`}>
                    <span><b>{o.study}</b> — {o.says}</span>
                    <button type="button" className="btn btn-sm" onClick={() => save(o.tally, `Short stops taken from “${o.study}”: ${o.says}`)}>Use these</button>
                  </li>
                ))}
              </ul>
            )}
            <form className="slp-form" onSubmit={e => { e.preventDefault(); if (!ok) return; save({ n: nn as number, watchedMin: mm as number }, `Short stops counted: ${nn} in ${mm} min`); setN(''); setMin(''); }}>
              <label className="field"><span className="field-label">Short stops counted</span>
                <input className="text-input" inputMode="numeric" value={n} placeholder={tally ? String(tally.n) : 'e.g. 41'} aria-label="Short stops counted" onChange={e => setN(e.target.value)} /></label>
              <label className="field"><span className="field-label">In how many minutes of running</span>
                <input className="text-input" inputMode="numeric" value={min} placeholder={tally ? String(Math.round(tally.watchedMin)) : String(Math.round(sl.runMin))} aria-label="Minutes of running watched" onChange={e => setMin(e.target.value)} /></label>
              <button type="submit" className="btn" disabled={!ok}>{tally ? 'Change the short stops' : 'Save the short stops'}</button>
              {tally && <button type="button" className="linkish" onClick={() => save(undefined, 'Short-stop count cleared')}>Clear it</button>}
            </form>
          </div>
        )}
      </div>
    </LeanPanel>
  );
}
