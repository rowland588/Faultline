/* CRITICAL — the boxes a problem grows when it is one, and how it reads.
 *
 * Rowland, 6 October: "the ability to say that this is critical, and to write
 * more narrative behind it — potential solutions, what it means for the
 * business ... put a production belt there to bypass the robot."
 *
 * The same three things, written when the problem is (ui/WhyMoved
 * ProblemForm) or later (ui/StageStory ProblemEdit), and read back the same
 * way on the stage, the front page and the client report (lib/critical):
 * it is critical; what it means for the business; the ways round it, one of
 * them agreed. Everything stays changeable — a way can be reworded, agreed,
 * un-agreed or taken off. */
import type { WayRound } from '../lib/testing';
import { uid } from '../lib/ids';
import { BetterWords } from './BetterWords';
import { Icon } from './Icon';

export interface CriticalDraft { critical: boolean; impact: string; ways: WayRound[] }

export const criticalDraftOf = (i?: { critical?: boolean; impact?: string; ways?: WayRound[] }): CriticalDraft =>
  ({ critical: !!i?.critical, impact: i?.impact ?? '', ways: (i?.ways ?? []).map(w => ({ ...w })) });

/** The draft as the problem keeps it: only what was written, blanks dropped.
 *  Unticking critical keeps the words (ticked again, they are still there)
 *  but nothing reads them while it is not critical. */
export function criticalPatch(d: CriticalDraft): { critical?: boolean; impact?: string; ways?: WayRound[] } {
  const ways = d.ways.map(w => ({ ...w, what: w.what.trim() })).filter(w => w.what);
  return {
    ...(d.critical ? { critical: true } : {}),
    ...(d.impact.trim() ? { impact: d.impact.trim() } : {}),
    ...(ways.length ? { ways } : {}),
  };
}

export function CriticalFields({ value, onChange, names }: {
  value: CriticalDraft; onChange: (d: CriticalDraft) => void;
  /** Machine and stage names, kept as spelled by Better wording. */
  names?: string[];
}) {
  const set = (p: Partial<CriticalDraft>) => onChange({ ...value, ...p });
  const setWay = (id: string, p: Partial<WayRound>) => set({ ways: value.ways.map(w => (w.id === id ? { ...w, ...p } : w)) });
  /* One way is the one agreed: agreeing another moves the mark to it. */
  const agree = (id: string) => set({ ways: value.ways.map(w => (w.id === id ? { ...w, agreed: !w.agreed } : { ...w, agreed: false })) });
  return (
    <div className={'crit-f' + (value.critical ? ' is-on' : '')}>
      <label className="crit-tick">
        <input type="checkbox" checked={value.critical} onChange={e => set({ critical: e.target.checked })} />
        <span><b>Critical</b> — it puts the agreed date or the business at risk</span>
      </label>
      {value.critical && (
        <>
          <label className="cw-f cw-f-wide"><span>What it means for the business</span>
            <textarea className="text-area" rows={3} value={value.impact}
              placeholder="The line cannot go back to production on the agreed day — the launch on 2 November is at risk."
              onChange={e => set({ impact: e.target.value })} /></label>
          <BetterWords text={value.impact} field="other" onUse={v => set({ impact: v })} names={names} />
          <div className="crit-ways">
            <span className="crit-ways-h">Ways round it <span className="cw-f-opt">tick the one agreed</span></span>
            {value.ways.map((w, i) => (
              <span key={w.id} className={'crit-way' + (w.agreed ? ' is-agreed' : '')}>
                <input type="checkbox" checked={!!w.agreed} aria-label={`Agreed: ${w.what || `way ${i + 1}`}`} onChange={() => agree(w.id)} />
                <input className="text-input" value={w.what} placeholder="Put a belt in to bypass the robot"
                  aria-label={`Way round it ${i + 1}`} autoFocus={!w.what && i === value.ways.length - 1}
                  onChange={e => setWay(w.id, { what: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" aria-label={`Take off ${w.what || `way ${i + 1}`}`}
                  onClick={() => set({ ways: value.ways.filter(x => x.id !== w.id) })}><Icon name="close" size="1em" /></button>
              </span>
            ))}
            <button type="button" className="cw-link" onClick={() => set({ ways: [...value.ways, { id: uid(), what: '' }] })}>+ Add a way round it</button>
          </div>
        </>
      )}
    </div>
  );
}

/** HOW A CRITICAL PROBLEM READS under its words — on the stage's story and
 *  the job's front page: what it means for the business, then the ways round
 *  it with the agreed one said so. */
export function CriticalStory({ impact, ways }: { impact?: string; ways?: WayRound[] }) {
  if (!impact && !ways?.length) return <p className="crit-none sub">Not written yet: what it means for the business, and the ways round it.</p>;
  return (
    <div className="crit-story">
      {impact && <p className="crit-impact"><b>What it means for the business.</b> {impact}</p>}
      {!!ways?.length && (
        <div className="crit-ways-r">
          <b>Ways round it.</b>
          <ul>
            {ways.map(w => <li key={w.id} className={w.agreed ? 'is-agreed' : ''}>{w.what}{w.agreed && <span className="crit-agreed"> · agreed</span>}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The solid red tag — "Critical", or "Critical · sorted" in the quiet grey
 *  once it is (normal recedes). */
export function CriticalTag({ sorted }: { sorted?: boolean }) {
  return <span className={'crit-tag' + (sorted ? ' is-sorted' : '')}>Critical{sorted ? ' · sorted' : ''}</span>;
}
