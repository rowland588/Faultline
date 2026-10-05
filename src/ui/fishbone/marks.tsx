/* THE SMALL MARKS THE FISHBONE IS DRAWN WITH — one family, used on the drawn
 * fish, the phone's lanes, the cause sheet and the key, so a mark means the
 * same thing wherever it is seen.
 *
 * None of them wears a state colour. Confirmed, suspected and the root are
 * not "done" or "late" — they are how sure we are — so they are told apart by
 * ink: solid, outline, struck. The grade is a three-step meter: measured
 * fills it, reported leaves it empty. Every mark sits beside its words.
 *
 * The one mark that does wear a state colour is a cause's fixes tag: a fix is
 * work with an owner and a day, so it is late, waiting, under way or done —
 * the board's states, in the board's colours. */
import type { CauseStatus, Grade } from '../../lib/sixm';
import { GRADE_LEVEL, type FixTag } from './layout';

/** Confirmed: a solid dot. Suspected: a ring. Ruled out: a ring with a stroke through. */
export function StatusGlyph({ status, root, suggestion }: { status?: CauseStatus; root?: boolean; suggestion?: boolean }) {
  const cls = 'fb-g' + (suggestion ? ' is-sugg' : status ? ` is-${status}` : '') + (root ? ' is-root' : '');
  return (
    <svg className={cls} width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {suggestion
        ? <><circle cx="7" cy="7" r="5.6" className="fb-g-ring" strokeDasharray="2.2 1.8" /><path d="M7 4.4v5.2M4.4 7h5.2" className="fb-g-plus" /></>
        : status === 'confirmed'
          ? <circle cx="7" cy="7" r={root ? 5.6 : 4.6} className="fb-g-fill" />
          : status === 'ruled_out'
            ? <><circle cx="7" cy="7" r="4.6" className="fb-g-ring" /><path d="M3.2 10.8l7.6-7.6" className="fb-g-ring" /></>
            : <circle cx="7" cy="7" r="4.6" className="fb-g-ring" />}
    </svg>
  );
}

/** How sure — three steps, measured full, reported empty. */
export function GradeMeter({ grade }: { grade: Grade }) {
  const n = GRADE_LEVEL[grade];
  return (
    <svg className="fb-meter" width="13" height="11" viewBox="0 0 13 11" aria-hidden focusable="false">
      {[0, 1, 2].map(i => (
        <rect key={i} x={i * 4.5} y={7 - i * 3} width="3.2" height={4 + i * 3} rx="0.8" className={i < n ? 'is-on' : ''} />
      ))}
    </svg>
  );
}

export function RootTag() {
  return <span className="fb-root">Root</span>;
}

/** A cause's fixes, as one small tag beside it — "1 fix · past due" — in the
 *  house state colours (ui/fishbone/layout fixTag): past due solid red, the
 *  loudest thing on a bone; waiting amber; under way indigo; not started
 *  grey; done a quiet green that recedes. The words carry it too, so it
 *  survives a black-and-white print and colour-blind eyes. */
export function FixTagMark({ tag }: { tag: FixTag }) {
  return <span className={'fb-fix is-' + tag.tone}>{tag.words}</span>;
}
