/* THE VERDICT — the answer to "are you in control of this?", on one card.
 *
 * Rowland: "this software has to have the ability for me to show the business a
 * formal process, to show that I am in control of the project."
 *
 * Every number here already existed in the app, on five separate screens. What
 * it never had was a place that says them together, which is why a project's
 * front page read as a menu — a list of doors — rather than as an answer.
 *
 * IT IS DARK ON PURPOSE. A spreadsheet is edge-to-edge light with hairlines;
 * putting the weight at the top and the verdict in ink reverses the read, and
 * the eye lands on the sentence before anything else. That is the whole job of
 * the card. See :root in styles.css for why green appears on it nowhere — the
 * only colour is the two numbers that mean something.
 */
import type { Standing } from '../lib/standing';

/** One number and its word. Charcoal, with colour only where colour is a fact. */
function Tile({ n, label, tone }: { n: string; label: string; tone?: 'warn' | 'bad' }) {
  return (
    <span className="vd-tile">
      <span className={'vd-n' + (tone ? ' is-' + tone : '')}>{n}</span>
      <span className="vd-l">{label}</span>
    </span>
  );
}

export function Verdict({ st, eyebrow = 'Where the job is' }: { st: Standing; eyebrow?: string }) {
  /* A job with nothing on any list has nothing to be in control OF, and a
     verdict card over an empty project is theatre. The caller shows its own
     empty state instead. */
  if (!st.sentence) return null;

  const late = st.daysToGo != null && st.daysToGo < 0;

  return (
    <section className="vd">
      <div className="vd-said">
        <span className="vd-eyebrow">{eyebrow}</span>
        <h2 className="vd-sentence">{st.sentence}</h2>
        {st.slipDays != null && st.slipDays !== 0 && (
          <p className="vd-slip">
            {st.slipDays > 0
              ? `The date has moved ${st.slipDays} day${st.slipDays === 1 ? '' : 's'} from what was agreed.`
              : `${-st.slipDays} day${st.slipDays === -1 ? '' : 's'} ahead of what was agreed.`}
          </p>
        )}
      </div>

      <div className="vd-tiles">
        {st.daysToGo != null && (
          <Tile
            n={String(Math.abs(st.daysToGo))}
            label={late ? 'days past' : 'days to go'}
            tone={late ? 'bad' : undefined}
          />
        )}
        <Tile n={String(st.outstanding)} label="outstanding" tone={st.outstanding ? 'warn' : undefined} />
        <Tile n={String(st.late)} label="late" tone={st.late ? 'bad' : undefined} />
      </div>
    </section>
  );
}
