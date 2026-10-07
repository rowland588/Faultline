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

/* THE LEVEL — not flagged, HIGH RISK (amber: it has not happened yet) or
   CRITICAL (red). Rowland, 7 October: "I have critical, and I need like a
   high risk ... I need to flag a metric, and a risk of consequence." Both
   flagged levels carry the same story: the consequence, what it could cost
   (an estimate, never counted as lost) and the ways round it. */
export type Flag = 'none' | 'risk' | 'critical';
export interface CriticalDraft { critical: boolean; risk: boolean; impact: string; ways: WayRound[]; could: string }

export const flagOf = (d: Pick<CriticalDraft, 'critical' | 'risk'>): Flag => (d.critical ? 'critical' : d.risk ? 'risk' : 'none');

export const criticalDraftOf = (i?: { critical?: boolean; risk?: boolean; impact?: string; ways?: WayRound[]; couldLose?: number }): CriticalDraft =>
  ({ critical: !!i?.critical, risk: !!i?.risk && !i?.critical, impact: i?.impact ?? '', ways: (i?.ways ?? []).map(w => ({ ...w })), could: i?.couldLose ? String(i.couldLose) : '' });

/** The draft as the problem keeps it: only what was written, blanks dropped.
 *  Unticking critical keeps the words (ticked again, they are still there)
 *  but nothing reads them while it is not critical. */
export function criticalPatch(d: CriticalDraft): { critical?: boolean; risk?: boolean; impact?: string; ways?: WayRound[]; couldLose?: number } {
  const ways = d.ways.map(w => ({ ...w, what: w.what.trim() })).filter(w => w.what);
  const could = Number(d.could.replace(',', '.'));
  return {
    ...(d.critical ? { critical: true } : {}),
    ...(d.risk && !d.critical ? { risk: true } : {}),
    ...(could > 0 ? { couldLose: Math.min(could, 100000) } : {}),
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
    <div className={'crit-f' + (value.critical ? ' is-on' : value.risk ? ' is-risk' : '')}>
      <span className="crit-level">
        <span className="crit-level-h">Flag it</span>
        <span className="cw-seg" role="group" aria-label="How serious is it?">
          {([['none', 'Not flagged'], ['risk', 'High risk'], ['critical', 'Critical']] as const).map(([k, w]) => (
            <button key={k} type="button" className={'chip crit-chip is-' + k + (flagOf(value) === k ? ' on' : '')} aria-pressed={flagOf(value) === k}
              onClick={() => set({ critical: k === 'critical', risk: k === 'risk' })}>{w}</button>
          ))}
        </span>
        <span className="sub crit-level-s">{value.critical ? 'It puts the agreed date or the business at risk now.' : value.risk ? 'It has not happened yet — it could. Watch it.' : ''}</span>
      </span>
      {(value.critical || value.risk) && (
        <>
          <label className="cw-f crit-could"><span>Could cost <span className="cw-f-opt">hours — an estimate, not counted as lost</span></span>
            <input inputMode="decimal" className="text-input" value={value.could} placeholder="100" onChange={e => set({ could: e.target.value })} /></label>
          <label className="cw-f cw-f-wide"><span>{value.critical ? 'What it means for the business' : 'The consequence if it happens'}</span>
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
export function CriticalStory({ impact, ways, couldLose, risk }: { impact?: string; ways?: WayRound[]; couldLose?: number;
  /** A high risk: its story is "the consequence if it happens". */
  risk?: boolean }) {
  if (!impact && !ways?.length && !couldLose) return <p className="crit-none sub">Not written yet: {risk ? 'the consequence' : 'what it means for the business'}, and the ways round it.</p>;
  return (
    <div className="crit-story">
      {/* Each heading in the item's colour — red under a critical, amber under
          a high risk — the words under it in ink (Rowland, 7 October: "they
          need to stand out as well"). */}
      {!!couldLose && <p className="crit-impact"><b className="crit-label">Could cost</b> <b>{couldLose % 1 ? couldLose : Math.round(couldLose)} h</b> — an estimate, not counted as lost.</p>}
      {impact && <p className="crit-impact"><b className="crit-label">{risk ? 'The consequence if it happens' : 'What it means for the business'}</b> {impact}</p>}
      {!!ways?.length && (
        <div className="crit-ways-r">
          <b className="crit-label">Ways round it</b>
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
export function CriticalTag({ sorted, risk }: { sorted?: boolean; risk?: boolean }) {
  return <span className={'crit-tag' + (risk ? ' is-risk' : '') + (sorted ? ' is-sorted' : '')}>{risk ? 'High risk' : 'Critical'}{sorted ? ' · sorted' : ''}</span>;
}
